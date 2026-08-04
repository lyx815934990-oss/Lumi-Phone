/**
 * 「信息」会话列表时间：剧情时间优先，系统时间兜底；必须始终有可读标签。
 * 列表排序键与展示标签分离：排序只用系统活跃时间，展示仍走剧情戳。
 */

import { storyDayTimeToMs } from '../memory/storyTimelineNetworkNowSync'
import { personaDb } from '../newFriendsPersona/idb'
import { parseStoryAnchorLabelToMs } from './applyOnlineChatTimeFusion'
import { formatWeChatMessagesTabTimestamp, resolveWeChatCurrentTimeMs } from './wechatTimeUtils'

export type MessagesTabStoryTimeFields = {
  timestamp: number
  systemRecordedAt?: number | null
  characterId?: string
  storyDay?: string | null
  storyTime?: string | null
  storyTimeLabel?: string | null
}

function pad2(n: number) {
  return String(n).padStart(2, '0')
}

/** 绝对时钟标签（无相对基准时的最后兜底） */
function formatAbsoluteClockLabel(ms: number): string {
  const d = new Date(ms)
  if (!Number.isFinite(d.getTime())) return '—'
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

const MS_DAY = 24 * 3600 * 1000

/** 列表排序：拒绝明显是「剧情未来钟」的毫秒（相对墙钟超前过多） */
export function isPlausibleWallClockActivityMs(ms: number, nowMs = Date.now()): boolean {
  if (!Number.isFinite(ms) || ms <= 0) return false
  const min = Date.UTC(2000, 0, 1)
  // 允许少量时钟误差，但不接受剧情拨到数年之后
  const max = nowMs + 30 * MS_DAY
  return ms >= min && ms <= max
}

/**
 * 信息列表排序用：真实活跃时间（系统落库）。
 * 禁止回退到可能是剧情时钟的 `timestamp`，否则剧情年份更靠后的旧会话会永远压在正在聊的会话上面。
 */
export function resolveMessageListActivityTs(msg: {
  timestamp?: number
  systemRecordedAt?: number | null
} | null | undefined): number {
  if (!msg) return 0
  const sys = msg.systemRecordedAt
  if (typeof sys === 'number' && isPlausibleWallClockActivityMs(sys)) return Math.floor(sys)
  // 仅当 timestamp 本身就像墙钟（非剧情未来）时才兜底，兼容极老数据
  const ts = msg.timestamp
  if (typeof ts === 'number' && isPlausibleWallClockActivityMs(ts)) return Math.floor(ts)
  return 0
}

/** 会话卡片排序键：系统活跃时间；忽略被剧情钟污染的 lastMessageTime */
export function resolveSessionListSortTs(params: {
  lastMessage?: { timestamp?: number; systemRecordedAt?: number | null } | null
  settingsLastMessageTime?: number | null
}): number {
  const fromMsg = resolveMessageListActivityTs(params.lastMessage)
  const rawSettings = params.settingsLastMessageTime
  const fromSettings =
    typeof rawSettings === 'number' && isPlausibleWallClockActivityMs(rawSettings)
      ? Math.floor(rawSettings)
      : 0
  return Math.max(fromMsg, fromSettings)
}

/**
 * 消息展示用时刻：
 * 1) 剧情日/时 2) storyTimeLabel 3) 会话时钟 timestamp 4) 系统落库时间
 */
export function resolveMessageStoryDisplayMs(msg: MessagesTabStoryTimeFields): number {
  const fromDayTime = storyDayTimeToMs(msg.storyDay, msg.storyTime)
  if (fromDayTime != null) return fromDayTime
  const fromLabel = parseStoryAnchorLabelToMs(msg.storyTimeLabel)
  if (fromLabel != null) return fromLabel
  const ts = Math.round(msg.timestamp)
  if (Number.isFinite(ts) && ts > 0) return ts
  const sys = msg.systemRecordedAt
  if (typeof sys === 'number' && Number.isFinite(sys) && sys > 0) return Math.floor(sys)
  return 0
}

/**
 * 角色侧「现在」：自定义剧情时钟优先，否则剧情轴 currentStoryDay/Time。
 * 都没有则返回 null（调用方再回退墙钟）。
 */
export async function resolveCharacterStoryNowMs(
  characterId: string | null | undefined,
): Promise<number | null> {
  const cid = String(characterId ?? '').trim()
  if (!cid) return null
  try {
    const [settings, state] = await Promise.all([
      personaDb.getCharacterTimeSettings(cid),
      personaDb.getStoryTimelineState(cid),
    ])
    if (settings?.config?.mode === 'custom') {
      const live = resolveWeChatCurrentTimeMs(settings.config)
      if (Number.isFinite(live) && live > 0) return live
    }
    const fromState = storyDayTimeToMs(state?.currentStoryDay, state?.currentStoryTime)
    if (fromState != null) return fromState
  } catch {
    /* ignore */
  }
  return null
}

/**
 * 信息 tab 右侧时间：
 * - 相对基准优先剧情「现在」，否则系统墙钟
 * - 消息时刻优先剧情戳，否则会话/系统时间
 * - 保证始终返回可读字符串（绝不空串）
 */
export async function formatMessagesTabTimeForThread(params: {
  lastMessage: MessagesTabStoryTimeFields
  /** 私聊对象 / 群内发言角色；用于取剧情「现在」 */
  storyClockCharacterId?: string | null
  /** @deprecated 始终允许系统时间兜底，保留参数以免调用方报错 */
  allowSystemWallClock?: boolean
}): Promise<string> {
  const msgMs = resolveMessageStoryDisplayMs(params.lastMessage)

  const storyNow = await resolveCharacterStoryNowMs(
    params.storyClockCharacterId || params.lastMessage.characterId,
  )

  // 有可解析的消息时刻：相对剧情「现在」或墙钟
  if (msgMs > 0) {
    if (storyNow != null) {
      const rel = formatWeChatMessagesTabTimestamp(msgMs, storyNow)
      if (rel.trim()) return rel
    }
    const wallRel = formatWeChatMessagesTabTimestamp(msgMs, Date.now())
    if (wallRel.trim()) return wallRel
    return formatAbsoluteClockLabel(msgMs)
  }

  // 无数字时刻：尽量展示剧情文案标签
  const label = String(params.lastMessage.storyTimeLabel ?? '').trim()
  if (label) return label.length > 18 ? label.slice(0, 18) : label
  const day = String(params.lastMessage.storyDay ?? '').trim()
  const time = String(params.lastMessage.storyTime ?? '').trim()
  if (day && time) return `${day} ${time}`.slice(0, 18)
  if (day) return day.slice(0, 18)
  if (time) return time

  // 最后兜底：当前墙钟 HH:mm（保证信息 tab 右侧永远有时间）
  return formatAbsoluteClockLabel(Date.now())
}
