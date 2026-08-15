/**
 * 双时间约定：
 * - 系统落库时间（systemRecordedAt / recordedAt / Date.now）：真实生成/落库钟点（卡片「生成」）
 * - 剧情时间（storyDay / storyTime / storyTimeLabel）：故事内时刻（卡片「剧情」结尾）
 */

import type { StoryTimelineSummaryDelta } from './storyTimelineTypes'
import {
  composeStoryTimelineCalendarAnchorLabel,
  formatGregorianStoryDayFromMs,
  parseStoryCalendarDayStartMs,
  STORY_TIMELINE_GREGORIAN_ANCHOR_RE,
} from './storyTimelineTypes'

export type StoryTimeEditMode = 'point' | 'range'

export type DualNarrativeStoryFields = {
  storyDay?: string
  storyTime?: string
  storyDayEnd?: string
  storyTimeEnd?: string
  /** 用户可见的剧情时间文案（单点或「开始 - 结束」） */
  storyTimeLabel?: string
  /** 编辑器模式：时间点 / 时间段 */
  editMode?: StoryTimeEditMode
}

/** 从 timeline delta 提取剧情时间字段（优先 end 锚点） */
export function dualNarrativeStoryFieldsFromDelta(
  delta: Pick<
    StoryTimelineSummaryDelta,
    'story_day' | 'story_time' | 'story_day_end' | 'story_time_end'
  > | null | undefined,
): DualNarrativeStoryFields {
  if (!delta) return {}
  const storyDay = (delta.story_day || '').trim() || undefined
  const storyTime = (delta.story_time || '').trim() || undefined
  const storyDayEnd = (delta.story_day_end || '').trim() || undefined
  const storyTimeEnd = (delta.story_time_end || '').trim() || undefined
  const storyTimeLabel = composeStoryTimelineCalendarAnchorLabel(delta).trim() || undefined
  const hasRange = Boolean(
    storyDayEnd ||
      (storyTimeEnd && storyDayEnd) ||
      (storyDay && storyDayEnd && storyDayEnd !== storyDay) ||
      (storyTime && storyTimeEnd && storyTimeEnd !== storyTime),
  )
  if (!storyDay && !storyTime && !storyDayEnd && !storyTimeEnd && !storyTimeLabel) return {}
  return {
    ...(storyDay ? { storyDay } : {}),
    ...(storyTime ? { storyTime } : {}),
    ...(storyDayEnd ? { storyDayEnd } : {}),
    ...(storyTimeEnd ? { storyTimeEnd } : {}),
    ...(storyTimeLabel ? { storyTimeLabel } : {}),
    editMode: hasRange ? 'range' : 'point',
  }
}

/** 从记忆/摘要正文中解析用户可见剧情时间（不含系统落库） */
export function extractStoryTimeLabelFromText(text: string): string | undefined {
  const raw = String(text ?? '')
  const patterns = [
    /【剧情时间】([^\n]+)/,
    /【本轮锚点】([^\n]+)/,
    /【当前锚点】([^\n]+)/,
    /发布时间：\s*(发表于剧情日[^\n]+)/,
    /发布时间：([^\n]+)/,
  ]
  for (const re of patterns) {
    const m = raw.match(re)
    const label = m?.[1]?.trim()
    if (!label) continue
    // 过滤误把系统落库行当成展示时间
    if (/系统落库|勿按系统公历/.test(label)) continue
    return label.slice(0, 160)
  }
  return undefined
}

/** 记忆卡片角标：优先剧情时间；无则不展示墙钟（避免泄漏系统时间） */
export function resolveMemoryDisplayTimeLabel(params: {
  storyTimeLabel?: string | null
  content?: string | null
  pulseStoryPublishLabel?: string | null
}): string {
  const direct = params.storyTimeLabel?.trim()
  if (direct) return direct
  const pulse = params.pulseStoryPublishLabel?.trim()
  if (pulse) return pulse
  const fromBody = extractStoryTimeLabelFromText(params.content || '')
  if (fromBody) return fromBody
  return ''
}

function parseOneEndpointLabel(part: string): { storyDay?: string; storyTime?: string } {
  const raw = String(part ?? '').trim()
  if (!raw) return {}
  const day = raw.match(/(\d{4}年\d{1,2}月\d{1,2}日)/)?.[1]
  const clock = raw.match(/(\d{1,2}):(\d{2})/)
  const storyTime = clock
    ? `${String(clock[1]).padStart(2, '0')}:${clock[2]}`
    : undefined
  return {
    ...(day ? { storyDay: day } : {}),
    ...(storyTime ? { storyTime } : {}),
  }
}

/** 用结构化字段拼展示文案（点或段） */
export function composeDualNarrativeStoryTimeLabel(fields: DualNarrativeStoryFields): string {
  const mode = fields.editMode === 'range' || fields.storyDayEnd || fields.storyTimeEnd ? 'range' : 'point'
  if (mode === 'range') {
    return composeStoryTimelineCalendarAnchorLabel({
      story_day: fields.storyDay,
      story_time: fields.storyTime,
      story_day_end: fields.storyDayEnd || fields.storyDay,
      story_time_end: fields.storyTimeEnd || fields.storyTime,
    }).trim()
  }
  return composeStoryTimelineCalendarAnchorLabel({
    story_day: fields.storyDay,
    story_time: fields.storyTime,
  }).trim()
}

/** 规范化编辑草稿：补齐 storyTimeLabel / editMode */
export function normalizeDualNarrativeStoryFields(
  fields: DualNarrativeStoryFields,
): DualNarrativeStoryFields {
  const mode: StoryTimeEditMode =
    fields.editMode === 'range' || Boolean(fields.storyDayEnd?.trim() || fields.storyTimeEnd?.trim())
      ? 'range'
      : 'point'
  const next: DualNarrativeStoryFields = {
    ...fields,
    editMode: mode,
  }
  if (mode === 'point') {
    delete next.storyDayEnd
    delete next.storyTimeEnd
  }
  const label = composeDualNarrativeStoryTimeLabel(next)
  if (label) next.storyTimeLabel = label
  else delete next.storyTimeLabel
  return next
}

/** 从剧情时间文案解析 storyDay / storyTime（含时间段） */
export function parseDualNarrativeFieldsFromLabel(label: string | null | undefined): DualNarrativeStoryFields {
  const raw = String(label ?? '').trim()
  if (!raw) return {}
  const rangeHit = raw.match(STORY_TIMELINE_GREGORIAN_ANCHOR_RE)?.[0]?.trim()
  const source = rangeHit || raw
  if (/\s-\s/.test(source)) {
    const [startRaw, endRaw] = source.split(/\s-\s/).map((s) => s.trim())
    const start = parseOneEndpointLabel(startRaw || '')
    const end = parseOneEndpointLabel(endRaw || '')
    return normalizeDualNarrativeStoryFields({
      ...start,
      storyDayEnd: end.storyDay,
      storyTimeEnd: end.storyTime,
      editMode: 'range',
    })
  }
  const point = parseOneEndpointLabel(source)
  return normalizeDualNarrativeStoryFields({
    ...point,
    editMode: 'point',
  })
}

/** datetime-local 值（YYYY-MM-DDTHH:mm）→ 单端点字段 */
export function dualNarrativeEndpointFromDatetimeLocal(
  value: string | null | undefined,
): { storyDay?: string; storyTime?: string } {
  const raw = String(value ?? '').trim()
  if (!raw) return {}
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/)
  if (!m) {
    const parsed = parseOneEndpointLabel(raw)
    return parsed
  }
  const y = Number(m[1])
  const mo = Number(m[2])
  const d = Number(m[3])
  const hh = m[4] != null ? Number(m[4]) : null
  const mm = m[5] != null ? Number(m[5]) : null
  const storyDay = `${y}年${mo}月${d}日`
  const storyTime =
    hh != null && mm != null && Number.isFinite(hh) && Number.isFinite(mm)
      ? `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
      : undefined
  return {
    storyDay,
    ...(storyTime ? { storyTime } : {}),
  }
}

/** datetime-local 值 → 剧情字段（单点） */
export function dualNarrativeFieldsFromDatetimeLocal(
  value: string | null | undefined,
): DualNarrativeStoryFields {
  const endpoint = dualNarrativeEndpointFromDatetimeLocal(value)
  if (!endpoint.storyDay && !endpoint.storyTime) return {}
  return normalizeDualNarrativeStoryFields({
    ...endpoint,
    editMode: 'point',
  })
}

/** 起止 datetime-local → 时间段字段 */
export function dualNarrativeFieldsFromDatetimeLocalRange(
  startValue: string | null | undefined,
  endValue: string | null | undefined,
): DualNarrativeStoryFields {
  const start = dualNarrativeEndpointFromDatetimeLocal(startValue)
  const end = dualNarrativeEndpointFromDatetimeLocal(endValue)
  if (!start.storyDay && !end.storyDay) return {}
  return normalizeDualNarrativeStoryFields({
    storyDay: start.storyDay || end.storyDay,
    storyTime: start.storyTime,
    storyDayEnd: end.storyDay || start.storyDay,
    storyTimeEnd: end.storyTime || start.storyTime,
    editMode: 'range',
  })
}

function endpointToDatetimeLocal(day?: string, time?: string, labelFallback?: string): string {
  const dayRaw =
    day?.trim() ||
    labelFallback?.match(/(\d{4}年\d{1,2}月\d{1,2}日)/)?.[1] ||
    ''
  const dayMs = dayRaw ? parseStoryCalendarDayStartMs(dayRaw) : null
  if (dayMs == null) return ''
  const d = new Date(dayMs)
  const yyyy = d.getFullYear()
  const mo = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const clock =
    time?.match(/(\d{1,2}):(\d{2})/) ||
    labelFallback?.match(/(\d{1,2}):(\d{2})/)
  if (clock) {
    const hh = String(Number(clock[1])).padStart(2, '0')
    const mm = clock[2]
    return `${yyyy}-${mo}-${dd}T${hh}:${mm}`
  }
  return `${yyyy}-${mo}-${dd}T00:00`
}

/** 剧情字段 → datetime-local（开始 / 单点） */
export function dualNarrativeFieldsToDatetimeLocal(fields: DualNarrativeStoryFields): string {
  return endpointToDatetimeLocal(fields.storyDay, fields.storyTime, fields.storyTimeLabel)
}

/** 剧情字段 → 结束端 datetime-local（时间段） */
export function dualNarrativeFieldsToEndDatetimeLocal(fields: DualNarrativeStoryFields): string {
  const endLabel = fields.storyTimeLabel?.includes(' - ')
    ? fields.storyTimeLabel.split(/\s-\s/)[1]?.trim()
    : undefined
  return endpointToDatetimeLocal(
    fields.storyDayEnd || fields.storyDay,
    fields.storyTimeEnd || fields.storyTime,
    endLabel || fields.storyTimeLabel,
  )
}

/** 切换点/段模式，尽量保留已填时刻 */
export function switchDualNarrativeStoryEditMode(
  fields: DualNarrativeStoryFields,
  mode: StoryTimeEditMode,
): DualNarrativeStoryFields {
  if (mode === 'point') {
    return normalizeDualNarrativeStoryFields({
      storyDay: fields.storyDay,
      storyTime: fields.storyTime,
      editMode: 'point',
    })
  }
  return normalizeDualNarrativeStoryFields({
    storyDay: fields.storyDay,
    storyTime: fields.storyTime,
    storyDayEnd: fields.storyDayEnd || fields.storyDay,
    storyTimeEnd: fields.storyTimeEnd || fields.storyTime,
    editMode: 'range',
  })
}

/** 写入/更新记忆正文中的【剧情时间】行（与 structured storyTimeLabel 对齐） */
export function upsertOnlineMemoryStoryTimeInContent(
  content: string,
  storyTimeLabel: string | null | undefined,
): string {
  const label = String(storyTimeLabel ?? '').trim()
  const raw = String(content ?? '')
  const lines = raw.split('\n')
  let found = false
  const next: string[] = []
  for (const line of lines) {
    if (/^【剧情时间】/.test(line.trim())) {
      found = true
      if (label) next.push(`【剧情时间】${label}`)
      continue
    }
    next.push(line)
  }
  if (found) return next.join('\n').replace(/\n{3,}/g, '\n\n').trim()
  if (!label) return raw.trim()
  const titleIdx = next.findIndex((l) => /^【摘要标题】/.test(l.trim()))
  if (titleIdx >= 0) {
    next.splice(titleIdx + 1, 0, `【剧情时间】${label}`)
    return next.join('\n').trim()
  }
  return [`【剧情时间】${label}`, ...next].join('\n').trim()
}

/** 规范化手动设定的剧情日文案（保证带年份） */
export function normalizeManualStoryDayLabel(day: string): string {
  const t = String(day ?? '').trim()
  if (!t) return ''
  if (/^\d{4}年\d{1,2}月\d{1,2}日/.test(t)) return t.match(/^\d{4}年\d{1,2}月\d{1,2}日/)![0]!
  const iso = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (iso) return `${Number(iso[1])}年${Number(iso[2])}月${Number(iso[3])}日`
  const ms = parseStoryCalendarDayStartMs(t)
  if (ms != null) return formatGregorianStoryDayFromMs(ms)
  return t
}
