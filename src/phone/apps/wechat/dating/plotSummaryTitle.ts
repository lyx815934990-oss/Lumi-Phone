import type { StoryTimelinePlotRow } from '../memory/storyTimelineTypes'
import {
  extractStoryTimelineRowTitleFromRowText,
  formatStoryTimelineDeltaForDisplay,
  normalizeStoryTimelineRowTitle,
  resolveStoryTimelineRowTitle,
  stripStoryTimelineRowObligationSections,
  stripStoryTimelineTitleLine,
} from '../memory/storyTimelineTypes'
import { getAiPlotActiveTimelineDelta } from './plotTimelineDelta'
import { getAiPlotVersionSlices } from './plotVersions'
import type { PlotItem } from './types'

const SYNOPSIS_TAIL_RES = [
  /\n?【本节梗概】\s*([^\n]{1,80})\s*$/u,
  /\n?【剧情摘要】\s*([^\n]{1,80})\s*$/u,
] as const

export type PlotSummaryTitleOptions = {
  /** 记忆档案馆 storyTimelineRows：plotId → 摘要短标题 */
  timelineRowTitles?: ReadonlyMap<string, string>
  /** 记忆档案馆 storyTimelineRows：plotId → 摘要正文（无标题行） */
  timelineRowBodies?: ReadonlyMap<string, string>
}

/** 从 IndexedDB 行表构建 plotId → 摘要标题映射（与记忆管理页列表同源） */
export function buildTimelineRowTitleMapFromRows(rows: StoryTimelinePlotRow[]): Map<string, string> {
  const map = new Map<string, string>()
  for (const row of rows) {
    const plotId = row.plotId?.trim()
    if (!plotId) continue
    const title = resolveStoryTimelineRowTitle(row).trim()
    if (!title || title === '（无标题）') continue
    map.set(plotId, title)
  }
  return map
}

/** 从 IndexedDB 行表构建 plotId → 完整摘要正文（与记忆管理页展开区同源） */
export function buildTimelineRowBodyMapFromRows(rows: StoryTimelinePlotRow[]): Map<string, string> {
  const map = new Map<string, string>()
  for (const row of rows) {
    const plotId = row.plotId?.trim()
    if (!plotId) continue
    const raw = stripStoryTimelineTitleLine(row.rowText)
    const body = stripStoryTimelineRowObligationSections(raw) || raw
    const trimmed = body.trim()
    if (!trimmed) continue
    map.set(plotId, trimmed)
  }
  return map
}

/** 从正文尾部拆出摘要行（供 parse 时写入 planSummary） */
export function extractPlotSynopsisTail(text: string): { summary: string; content: string } {
  let body = String(text || '')
  let summary = ''
  for (const re of SYNOPSIS_TAIL_RES) {
    const m = body.match(re)
    if (m?.[1]?.trim() && m.index !== undefined) {
      summary = m[1].trim().slice(0, 48)
      body = body.slice(0, m.index).trimEnd()
      break
    }
  }
  return { summary, content: body }
}

function fallbackBodySnippet(plot: PlotItem): string {
  const raw = String(plot.content || '')
    .replace(/<thinking>[\s\S]*?<\/thinking>/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (!raw) return plot.type === 'player' ? '玩家输入' : '（空剧情）'
  const cut = raw.length > 48 ? `${raw.slice(0, 48)}…` : raw
  return plot.type === 'player' ? `玩家：${cut}` : cut
}

/** 记忆管理页 / plot.timelineDelta / timelineSnapshot 中的摘要短标题 */
function resolveMemoryArchivePlotSummaryTitle(
  plot: PlotItem,
  timelineRowTitles?: ReadonlyMap<string, string>,
): string {
  if (plot.type !== 'ai') return ''

  const fromRowTable = timelineRowTitles?.get(plot.id)?.trim()
  if (fromRowTable) return fromRowTable

  const delta = getAiPlotActiveTimelineDelta(plot)
  const fromDelta = normalizeStoryTimelineRowTitle(delta?.row_title)
  if (fromDelta) return fromDelta

  const snapshot = getAiPlotVersionSlices(plot).timelineSnapshot?.trim()
  if (snapshot) {
    const fromSnapshot = extractStoryTimelineRowTitleFromRowText(snapshot)
    if (fromSnapshot) return fromSnapshot
  }

  return ''
}

/**
 * 展示用摘要大标题（与记忆管理页「线下摘要」标题同源）：
 * 1. 记忆档案馆 rowTitle / timelineDelta.row_title / timelineSnapshot
 * 2. planSummary / 【本节梗概】仅作尚无记忆标题时的临时回落
 * 3. 短 CoT「互动主轴」
 * 不再用正文首句冒充摘要标题。
 */
export function resolvePlotSummaryTitle(plot: PlotItem, opts?: PlotSummaryTitleOptions): string {
  if (plot.type !== 'ai') return fallbackBodySnippet(plot)

  const memoryTitle = resolveMemoryArchivePlotSummaryTitle(plot, opts?.timelineRowTitles)
  if (memoryTitle) return memoryTitle

  const stored = plot.planSummary?.trim()
  if (stored) return stored

  const bodyRaw = String(plot.content || '')
    .replace(/<thinking>[\s\S]*?<\/thinking>/gi, '')
    .trim()
  const tailSynopsis = extractPlotSynopsisTail(bodyRaw).summary
  if (tailSynopsis) return tailSynopsis

  const cot = plot.logicPass?.trim()
  if (cot) {
    const axis = cot.match(/【互动主轴卡】[^\n]*?([^\n【]{4,20})/u)
    const axisText = axis?.[1]?.replace(/[。；;，,]+$/u, '').trim()
    if (axisText && axisText.length >= 4 && axisText.length <= 20) {
      return axisText
    }
  }

  return ''
}

/**
 * 折叠展开用完整摘要正文（与记忆管理页展开区同源）：
 * 1. 记忆档案馆 rowText（去标题）
 * 2. plot.timelineSnapshot / timelineDelta 可读正文
 * 无则空串（勿用直白 planSummary 冒充完整摘要）。
 */
export function resolvePlotSummaryBody(plot: PlotItem, opts?: PlotSummaryTitleOptions): string {
  if (plot.type !== 'ai') return ''

  const fromRowTable = opts?.timelineRowBodies?.get(plot.id)?.trim()
  if (fromRowTable) return fromRowTable

  const snapshot = getAiPlotVersionSlices(plot).timelineSnapshot?.trim()
  if (snapshot) {
    const raw = stripStoryTimelineTitleLine(snapshot)
    const body = stripStoryTimelineRowObligationSections(raw) || raw
    if (body.trim()) return body.trim()
  }

  const delta = getAiPlotActiveTimelineDelta(plot)
  if (delta) {
    const event = String(delta.event_summary ?? '').trim()
    if (event) {
      const formatted = formatStoryTimelineDeltaForDisplay(delta)
      const raw = stripStoryTimelineTitleLine(formatted)
      const body = stripStoryTimelineRowObligationSections(raw) || raw
      if (body.trim()) return body.trim()
      return event
    }
  }

  return ''
}

/** 是否为已写入的摘要（非正文推导） */
export function plotHasStoredSynopsis(plot: PlotItem, opts?: PlotSummaryTitleOptions): boolean {
  if (plot.type !== 'ai') return false
  if (resolveMemoryArchivePlotSummaryTitle(plot, opts?.timelineRowTitles)) return true
  if (plot.planSummary?.trim()) return true
  const body = String(plot.content || '')
    .replace(/<thinking>[\s\S]*?<\/thinking>/gi, '')
    .trim()
  return !!extractPlotSynopsisTail(body).summary
}
