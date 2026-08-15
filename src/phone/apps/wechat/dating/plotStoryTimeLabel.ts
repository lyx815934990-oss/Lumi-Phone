import type { DatingPlotSnapshotItem } from '../unifiedMemoryAutoSummary'
import {
  composeStoryTimelineCalendarAnchorLabel,
  hasTimelineDeltaContent,
  STORY_TIMELINE_GREGORIAN_ANCHOR_RE,
} from '../memory/storyTimelineTypes'
import { formatSystemRecordTime, resolvePlotSystemRecordedAtMs } from '../wechatCrossChannelTimeline'
import { getAiPlotActiveTimelineDelta } from './plotTimelineDelta'
import type { PlotItem } from './types'

type PlotStoryTimeRef = Pick<
  DatingPlotSnapshotItem,
  'type' | 'timelineDelta' | 'timelineSnapshot' | 'timestamp'
>

/** 从 AI 剧情 timeline 增量 / 快照解析故事内公历时刻（优先区间 end） */
export function resolvePlotStoryCalendarLabel(
  plot: PlotStoryTimeRef | PlotItem,
): string | null {
  if (plot.type !== 'ai') return null
  const delta =
    'versions' in plot && plot.type === 'ai'
      ? getAiPlotActiveTimelineDelta(plot as PlotItem)
      : plot.timelineDelta
  if (delta && hasTimelineDeltaContent(delta)) {
    const label = composeStoryTimelineCalendarAnchorLabel(delta)
    if (label) {
      const parts = label.split(/\s*-\s*/)
      return (parts[parts.length - 1] ?? parts[0] ?? '').trim() || null
    }
  }
  const snap = String(plot.timelineSnapshot ?? '').trim()
  const anchorMatch = snap.match(/【本轮锚点】([^\n]+)/)
  const anchorText = anchorMatch?.[1]?.trim() ?? ''
  if (anchorText) {
    const cal = anchorText.match(STORY_TIMELINE_GREGORIAN_ANCHOR_RE)
    if (cal?.[0]) {
      const parts = cal[0].split(/\s*-\s*/)
      return (parts[parts.length - 1] ?? parts[0] ?? '').trim() || null
    }
    const first = anchorText.split(' · ')[0]?.trim()
    if (first && /^\d{4}年/.test(first)) return first
  }
  return null
}

/**
 * 卡片展示用：本轮剧情**结尾**的故事内时间。
 * 优先当前版本 timeline；否则回落落库时的 storyDay/storyTime / storyTimeLabel。
 */
export function resolvePlotStoryEndDisplayLabel(plot: PlotItem): string | null {
  if (plot.type !== 'ai') return null
  const fromDelta = resolvePlotStoryCalendarLabel(plot)
  if (fromDelta) return fromDelta
  const day = String(plot.storyDay ?? '').trim()
  const time = String(plot.storyTime ?? '').trim()
  if (day) return time ? `${day} ${time}` : day
  const label = String(plot.storyTimeLabel ?? '').trim()
  if (!label) return null
  const parts = label.split(/\s*-\s*/)
  return (parts[parts.length - 1] ?? parts[0] ?? '').trim() || null
}

/** 卡片展示用：本条系统生成/落库时刻（完整公历） */
export function formatPlotGenerationTimeLabel(plot: PlotItem): string {
  return formatSystemRecordTime(resolvePlotSystemRecordedAtMs(plot))
}

/** 卡片脚注：更短的生成时间，如 `8/15 02:27` */
export function formatPlotGenerationTimeCompact(plot: PlotItem): string {
  const ts = resolvePlotSystemRecordedAtMs(plot)
  const d = new Date(ts)
  if (!Number.isFinite(d.getTime())) return '—'
  const m = d.getMonth() + 1
  const day = d.getDate()
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${m}/${day} ${hh}:${mm}`
}

/** prompt / 思维溯源前缀：优先故事内公历，无锚点则回退系统落库时刻 */
export function formatPlotPromptTimeBracket(
  plot: PlotStoryTimeRef | PlotItem,
  opts?: { storyCalendarFallback?: string | null; markSystemFallback?: boolean },
): string {
  const story =
    plot.type === 'ai'
      ? resolvePlotStoryCalendarLabel(plot)
      : opts?.storyCalendarFallback?.trim() || null
  if (story) return `[${story}]`
  const ts = resolvePlotSystemRecordedAtMs(plot)
  const sys = formatSystemRecordTime(ts)
  return opts?.markSystemFallback !== false ? `[${sys}·落库]` : `[${sys}]`
}
