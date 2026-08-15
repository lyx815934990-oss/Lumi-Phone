import { getAiPlotActiveTimelineDelta } from '../dating/plotTimelineDelta'
import type { PlotItem } from '../dating/types'
import { personaDb } from '../newFriendsPersona/idb'
import {
  composeStoryTimelineCalendarAnchorLabel,
  hasTimelineDeltaContent,
  parseStoryCalendarDayStartMs,
  STORY_TIMELINE_GREGORIAN_ANCHOR_RE,
  type StoryTimelineSummaryDelta,
} from './storyTimelineTypes'

export type StoryCalendarPlotRef = {
  type?: string
  timelineDelta?: StoryTimelineSummaryDelta
  timelineSnapshot?: string
}

/** 从已有剧情列表取**上一回合故事内**公历锚点（禁止 plot.timestamp / 落库时刻） */
export function resolveStoryCalendarAnchorFromPlots(
  plots: StoryCalendarPlotRef[] | null | undefined,
): string {
  const list = plots ?? []
  for (let i = list.length - 1; i >= 0; i--) {
    const p = list[i]
    if (p?.type !== 'ai') continue
    if (p.timelineDelta && hasTimelineDeltaContent(p.timelineDelta)) {
      const label = composeStoryTimelineCalendarAnchorLabel(p.timelineDelta)
      if (label) return label
    }
    const snap = String(p.timelineSnapshot ?? '').trim()
    const anchorMatch = snap.match(/【本轮锚点】([^\n]+)/)
    const anchorText = anchorMatch?.[1]?.trim() ?? ''
    if (anchorText) {
      const cal = anchorText.match(STORY_TIMELINE_GREGORIAN_ANCHOR_RE)
      if (cal?.[0]) return cal[0].trim()
      const first = anchorText.split(' · ')[0]?.trim()
      if (first && /^\d{4}年/.test(first)) return first
    }
  }
  return ''
}

export function resolveStoryCalendarAnchorFromPlotItems(plots: PlotItem[] | null | undefined): string {
  const list = plots ?? []
  return resolveStoryCalendarAnchorFromPlots(
    list.map((p) => ({
      type: p.type,
      timelineDelta: p.type === 'ai' ? getAiPlotActiveTimelineDelta(p) : undefined,
      timelineSnapshot: p.timelineSnapshot,
    })),
  )
}

/** 从锚点标签解析「上一回合故事内末尾」公历日 0 点（区间取 end 段） */
export function resolveStoryCalendarAnchorFloorMs(anchor: string | null | undefined): number | null {
  const raw = String(anchor ?? '').trim()
  if (!raw) return null
  const segments = raw.split(/\s*-\s*/)
  for (let i = segments.length - 1; i >= 0; i--) {
    const seg = segments[i]!.trim()
    const dayPart = seg.match(/^(\d{4}年\d{1,2}月\d{1,2}日)/)?.[1]
    if (dayPart) {
      const ms = parseStoryCalendarDayStartMs(dayPart)
      if (ms != null) return ms
    }
  }
  return null
}

const STORY_CAL_YMD_RE = /(\d{4})年(\d{1,2})月(\d{1,2})日/
const STORY_CAL_HM_RE = /(\d{1,2}):(\d{2})/

/** 取两条故事内日历标签中公历日较晚者（同日保留 a） */
export function pickLaterStoryCalendarLabel(a: string, b: string): string {
  const aT = String(a ?? '').trim()
  const bT = String(b ?? '').trim()
  if (!aT) return bT
  if (!bT) return aT
  const aMs = resolveStoryCalendarAnchorFloorMs(aT)
  const bMs = resolveStoryCalendarAnchorFloorMs(bT)
  if (aMs != null && bMs != null) return aMs >= bMs ? aT : bT
  if (aMs != null) return aT
  if (bMs != null) return bT
  return aT || bT
}

/**
 * 线上「现在」与线下末条对齐：
 * - 线上已不早于末条 → 用线上
 * - 线上年份偏早（如末条已是 2027 旅行、线上仍停在 2026-10-11）→ 把线上的月日迁到末条年份，得到 ≥ 末条的「现在」
 * - 否则取较晚者
 */
export function mergeOnlineStoryNowWithOfflineFloor(
  onlineOrStateLabel: string | null | undefined,
  offlineLastLabel: string | null | undefined,
): string {
  const online = String(onlineOrStateLabel ?? '').trim()
  const offline = String(offlineLastLabel ?? '').trim()
  if (!online) return offline
  if (!offline) return online
  const onlineMs = resolveStoryCalendarAnchorFloorMs(online)
  const offlineMs = resolveStoryCalendarAnchorFloorMs(offline)
  if (onlineMs != null && offlineMs != null && onlineMs >= offlineMs) return online

  const oYmd = online.match(STORY_CAL_YMD_RE)
  const fYmd = offline.match(STORY_CAL_YMD_RE)
  if (oYmd && fYmd) {
    const year = Number(fYmd[1])
    const month = Number(oYmd[2])
    const day = Number(oYmd[3])
    if (
      Number.isFinite(year) &&
      Number.isFinite(month) &&
      Number.isFinite(day) &&
      month >= 1 &&
      month <= 12 &&
      day >= 1 &&
      day <= 31
    ) {
      const hm = online.match(STORY_CAL_HM_RE)
      const storyDay = `${year}年${month}月${day}日`
      const storyTime = hm ? `${hm[1]!.padStart(2, '0')}:${hm[2]}` : undefined
      const merged = composeStoryTimelineCalendarAnchorLabel({
        story_day: storyDay,
        story_time: storyTime,
      }).trim()
      const mergedMs = resolveStoryCalendarAnchorFloorMs(merged)
      if (merged && mergedMs != null && offlineMs != null && mergedMs >= offlineMs) {
        return merged
      }
    }
  }
  return pickLaterStoryCalendarLabel(online, offline)
}

/** 取多条故事内日历标签中公历时刻最晚者（含钟点） */
export function pickLatestStoryCalendarLabel(
  ...labels: Array<string | null | undefined>
): string {
  let best = ''
  let bestMs = Number.NEGATIVE_INFINITY
  for (const raw of labels) {
    const t = String(raw ?? '').trim()
    if (!t) continue
    const dayMs = resolveStoryCalendarAnchorFloorMs(t)
    if (dayMs == null) continue
    // 有 HH:mm 时用当日偏移区分先后；无钟点视为当日 0 点
    const clock = t.match(/(\d{1,2}):(\d{2})/)
    const ms =
      clock != null
        ? dayMs +
          Math.min(23, Math.max(0, Number(clock[1]))) * 3_600_000 +
          Math.min(59, Math.max(0, Number(clock[2]))) * 60_000
        : dayMs
    if (ms >= bestMs) {
      bestMs = ms
      best = t
    }
  }
  return best
}

/** 线下剧情落库 chronology 底线：故事「现在」与线下末条取较晚 */
export function resolveDatingPlotChronologyFloorLabel(params: {
  storyNowLabel?: string | null
  offlineLastLabel?: string | null
}): string {
  return pickLaterStoryCalendarLabel(
    String(params.storyNowLabel ?? '').trim(),
    String(params.offlineLastLabel ?? '').trim(),
  )
}

/**
 * @deprecated 仅保留排序/游标用途；**禁止**作为剧情公历锚点展示或写入 prompt。
 * plot.timestamp 为落库时刻，不是故事内时间。
 */
export function resolveStoryTimeHintMsFromPlots(
  plots: Array<{ timestamp?: number }> | null | undefined,
): number {
  const list = plots ?? []
  for (let i = list.length - 1; i >= 0; i--) {
    const ts = list[i]?.timestamp
    if (typeof ts === 'number' && Number.isFinite(ts)) return ts
  }
  return Date.now()
}

/** 写入 timeline 摘要 prompt：剧情内公历锚点 + 生日/节日感知 */
export const STORY_TIMELINE_CALENDAR_AWARENESS_RULES = `
【剧情日历·公历锚点（timeline 必填语义）】
- **锚点是故事内时间，不是生成/落库时刻**：story_day / story_time 必须来自正文与已有剧情时间轴；**禁止**使用手机当前日期、消息发送时刻、plot.timestamp。
- story_day **须写含年份的公历日期**（本轮开始或单点之日），如 "2025年10月1日"；**禁止**仅写「第3天」「Day 12」（相对进度写 relative_time）。
- story_time **须写 24 小时制 HH:mm**（本轮开始或单点时刻）；仅有「傍晚/深夜」时须结合上下文推断。
- **跨时段剧情**：正文明确跨越时间（如闪回、多日旅行、从清晨写到深夜且跨日）时，须填写 story_day_end、story_time_end；展示形如「2025年5月1日 星期一 08:00 - 2025年6月29日 星期日 18:00」。同日跨度可只写 story_time + story_time_end（story_day_end 可省略或与 story_day 相同）。
- 写 event_summary / row_title 时须感知**季节与节日氛围**，并与 story_day（及 end）一致。
- **生日节点**：若下方提供了 {{user}} / {{char}} 的生日 MM-DD，须对照 story_day 判断是否临近或当日。
- **重要节日**：元旦、春节、清明、劳动节、端午、中秋、国庆、情人节、520、七夕、跨年夜等；命中或临近（±1～2 天）时在摘要中点明节日语境。
- **禁止无闪回的时间倒流**：若提供了【剧情时间锚点（上一回合故事内末尾）】，接续剧情的 story_day / story_day_end 须为锚点**同日或更晚**；**禁止**无回忆/闪回/插叙铺垫却写成更早年份。闪回须在 relative_time 或正文摘要中明示。
`.trim()

/** 约会正文生成用：接续上一回合锚点，禁止公历倒流 */
export const STORY_TIMELINE_CALENDAR_CHRONOLOGY_RULES = `
【剧情时间·接续铁律（高于自行编造年份）】
- 接续剧情时正文与 [TIMELINE] 的「故事日」须为【剧情时间锚点】**同日或更晚**；**禁止**无回忆/闪回/插叙铺垫却把公历写成更早年份（例：锚点已是 2026 年却写 2024）。
- 闪回/回忆须在正文与「相对时间」中明确标识（如「三年前」「闪回」），方可填写早于锚点的故事日。
`.trim()

export async function buildStoryTimelineCalendarContextBlock(params: {
  peerCharacterId?: string | null
  sessionPlayerIdentityId?: string | null
  /** 上一回合故事内公历锚点（优先） */
  storyCalendarAnchor?: string | null
  /** @deprecated 勿用于展示剧情时刻；仅兼容旧调用 */
  storyTimeHintMs?: number | null
}): Promise<string> {
  const lines: string[] = []
  const anchor = String(params.storyCalendarAnchor ?? '').trim()
  if (anchor) {
    lines.push(
      `【剧情时间锚点（上一回合故事内末尾·本轮须承接；禁止写成手机当前日期）】${anchor}`,
    )
  } else {
    lines.push(
      '【剧情时间锚点】尚无上一回合公历锚点：须**仅根据正文与大纲**推断 story_day/story_time；**禁止**使用生成当日、消息落库时刻或【当前时间】。',
    )
  }

  const cid = params.peerCharacterId?.trim()
  if (cid) {
    try {
      const ch = await personaDb.getCharacter(cid)
      if (ch?.birthdayMD?.trim()) {
        lines.push(`{{char}} 生日（MM-DD，对照 story_day 判断是否节点）：${ch.birthdayMD.trim()}`)
      }
    } catch {
      /* ignore */
    }
  }

  const playerId = params.sessionPlayerIdentityId?.trim()
  if (playerId) {
    try {
      const player = await personaDb.getPlayerIdentity(playerId)
      if (player?.birthdayMD?.trim()) {
        lines.push(`{{user}} 生日（MM-DD，对照 story_day 判断是否节点）：${player.birthdayMD.trim()}`)
      }
    } catch {
      /* ignore */
    }
  }

  if (!lines.length) return ''
  return `\n\n${lines.join('\n')}\n${STORY_TIMELINE_CALENDAR_AWARENESS_RULES}`
}
