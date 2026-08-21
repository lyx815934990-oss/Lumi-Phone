/**
 * 手改某段线下 AI 剧情的故事发生时间：同步 plot delta/snapshot、线下摘要【本轮锚点】、剧情轴「现在」。
 */

import type { ApiConfig } from '../../api/types'
import {
  dualNarrativeStoryFieldsFromDelta,
  normalizeDualNarrativeStoryFields,
  parseDualNarrativeFieldsFromLabel,
  type DualNarrativeStoryFields,
} from '../memory/dualNarrativeTime'
import {
  pickLatestStoryCalendarLabel,
  resolveStoryCalendarAnchorFromPlotItems,
} from '../memory/storyTimelineCalendarContext'
import { rebuildStoryTimelineFromDatingPlots } from '../memory/storyTimelinePersist'
import {
  computeStoryTimelineRowTextHash,
  formatStoryTimelineListTimeLabel,
  parseStoryCalendarDayStartMs,
  upsertStoryTimelineCalendarAnchorInRowText,
  type StoryTimelineState,
} from '../memory/storyTimelineTypes'
import { personaDb } from '../newFriendsPersona/idb'
import { getAiPlotActiveTimelineDelta } from './plotTimelineDelta'
import { plotWithEditedStoryTime } from './plotVersions'
import { resolvePlotStoryEndDisplayLabel } from './plotStoryTimeLabel'
import type { PlotItem } from './types'

export function seedPlotStoryTimeEditorFields(plot: PlotItem): DualNarrativeStoryFields {
  if (plot.type !== 'ai') return {}
  const fromDelta = dualNarrativeStoryFieldsFromDelta(getAiPlotActiveTimelineDelta(plot))
  if (fromDelta.storyDay || fromDelta.storyTimeLabel) {
    return normalizeDualNarrativeStoryFields(fromDelta)
  }
  const label = resolvePlotStoryEndDisplayLabel(plot)
  if (label) return normalizeDualNarrativeStoryFields(parseDualNarrativeFieldsFromLabel(label))
  if (plot.storyDay || plot.storyTime || plot.storyTimeLabel) {
    return normalizeDualNarrativeStoryFields({
      storyDay: plot.storyDay,
      storyTime: plot.storyTime,
      storyTimeLabel: plot.storyTimeLabel,
    })
  }
  return {}
}

async function syncOfflineSummaryRowCalendar(params: {
  characterId: string
  plotId: string
  calendarLabel: string
}): Promise<void> {
  const cid = params.characterId.trim()
  const pid = params.plotId.trim()
  const label = params.calendarLabel.trim()
  if (!cid || !pid || !label) return
  const rows = await personaDb.listStoryTimelinePlotRowsByCharacterId(cid)
  const targets = rows.filter((r) => r.plotId?.trim() === pid)
  for (const prev of targets) {
    const merged = upsertStoryTimelineCalendarAnchorInRowText(prev.rowText, label).slice(0, 4000)
    if (merged === prev.rowText.trim() && prev.userEdited === true) continue
    const textChanged = merged !== prev.rowText.trim()
    await personaDb.upsertStoryTimelinePlotRow({
      ...prev,
      rowText: merged,
      textHash: computeStoryTimelineRowTextHash(merged),
      userEdited: true,
      ...(textChanged
        ? {
            embedding: undefined,
            embeddingProvider: undefined,
            embeddingModelId: undefined,
            embeddingHash: undefined,
          }
        : {}),
    })
  }
}

/**
 * 按「当前剧情 + 摘要行」重算轴上「现在」。
 * 可下调（例如误写成 2029 后手改回 2028），不把旧的 state / 线上拨钟当不可逾越的上限。
 */
export async function applyStoryTimelineNowFromLatestAnchors(params: {
  characterId: string
  plots: PlotItem[]
}): Promise<string | null> {
  const cid = params.characterId.trim()
  if (!cid) return null
  const rows = await personaDb.listStoryTimelinePlotRowsByCharacterId(cid)
  let latest = resolveStoryCalendarAnchorFromPlotItems(params.plots).trim()
  for (const r of rows) {
    const label = formatStoryTimelineListTimeLabel(r.rowText ?? '').trim()
    if (label) latest = pickLatestStoryCalendarLabel(latest, label)
  }
  if (!latest) return null
  const dayPart = latest.match(/(\d{4}年\d{1,2}月\d{1,2}日)/)?.[1]
  const timeMatch = latest.match(/(\d{1,2}):(\d{2})/)
  if (!dayPart) return latest
  const st =
    (await personaDb.getStoryTimelineState(cid)) ??
    ({
      characterId: cid,
      updatedAt: Date.now(),
      costumes: [],
      items: [],
      foreshadows: [],
      todos: [],
      recentEvents: [],
    } satisfies StoryTimelineState)
  const nextDayMs = parseStoryCalendarDayStartMs(dayPart)
  if (nextDayMs == null) return latest
  const curDay = st.currentStoryDay?.trim() || ''
  const curTime = st.currentStoryTime?.trim() || ''
  const nextTime = timeMatch
    ? `${String(timeMatch[1]).padStart(2, '0')}:${timeMatch[2]}`
    : curTime
  if (curDay === dayPart && (!timeMatch || curTime === nextTime)) return latest
  await personaDb.putStoryTimelineState({
    ...st,
    characterId: cid,
    updatedAt: Date.now(),
    currentStoryDay: dayPart,
    currentStoryTime: nextTime || st.currentStoryTime,
    todos: [],
  })
  return latest
}

export type PersistPlotStoryTimeEditResult =
  | { ok: true; plot: PlotItem }
  | { ok: false; reason: string }

/**
 * 改写 plot 发生时间并同步线下摘要锚点；调用方负责把返回的 plot 写入存档。
 */
export async function persistPlotStoryTimeEdit(params: {
  characterId: string
  plot: PlotItem
  fields: DualNarrativeStoryFields
  apiConfig?: ApiConfig | null
  /** 编辑后的完整 plots 列表（含已替换的本条），用于 rebuild */
  nextPlots: PlotItem[]
}): Promise<PersistPlotStoryTimeEditResult> {
  const cid = params.characterId.trim()
  if (!cid) return { ok: false, reason: '角色未就绪' }
  if (params.plot.type !== 'ai') return { ok: false, reason: '仅 AI 剧情可改发生时间' }

  const norm = normalizeDualNarrativeStoryFields(params.fields)
  const calendarLabel = norm.storyTimeLabel?.trim() || ''
  if (!calendarLabel) return { ok: false, reason: '请先选择剧情发生时间' }

  const nextPlot = plotWithEditedStoryTime(params.plot, norm)
  if (nextPlot === params.plot && !params.plot.storyTimeLabel) {
    return { ok: false, reason: '请先选择剧情发生时间' }
  }

  await syncOfflineSummaryRowCalendar({
    characterId: cid,
    plotId: params.plot.id,
    calendarLabel,
  })

  const plotsForRebuild = params.nextPlots.map((p) => (p.id === nextPlot.id ? nextPlot : p))
  try {
    await rebuildStoryTimelineFromDatingPlots(cid, plotsForRebuild, {
      apiConfig: params.apiConfig ?? null,
    })
  } catch (e) {
    console.warn('[dating] rebuild story timeline after plot time edit failed', e)
  }

  // rebuild / 旧 state 可能仍钉在错误的更晚年份；按当前剧情+摘要行重算「现在」（允许下调）
  try {
    await applyStoryTimelineNowFromLatestAnchors({
      characterId: cid,
      plots: plotsForRebuild,
    })
  } catch (e) {
    console.warn('[dating] resync story now after plot time edit failed', e)
  }

  return { ok: true, plot: nextPlot }
}
