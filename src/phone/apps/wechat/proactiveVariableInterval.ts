import type { ChatConversationSettingsRow, WeChatChatMessage } from './newFriendsPersona/types'
import { personaDb } from './newFriendsPersona/idb'
import { resolveProactiveMessageIntervalSeconds } from './proactivePrivateMessageTypes'

/** 灵动间隔：非忙碌时随机下限（秒） */
export const PROACTIVE_VARIABLE_INTERVAL_MIN_SECONDS = 1
/** 灵动间隔：非忙碌时随机上限（秒）= 5 分钟 */
export const PROACTIVE_VARIABLE_INTERVAL_MAX_SECONDS = 5 * 60
/** 角色明确表示忙碌时的随机下限（秒）= 5 分钟 */
export const PROACTIVE_VARIABLE_BUSY_MIN_SECONDS = 5 * 60
/** 角色明确表示忙碌时的随机上限（秒）= 2 小时 */
export const PROACTIVE_VARIABLE_BUSY_MAX_SECONDS = 2 * 60 * 60
/** 自定义灵动区间允许的最小值（秒） */
export const PROACTIVE_VARIABLE_CUSTOM_MIN_FLOOR_SECONDS = 1
/** 自定义灵动区间允许的最大值（秒） */
export const PROACTIVE_VARIABLE_CUSTOM_MAX_CEILING_SECONDS = PROACTIVE_VARIABLE_BUSY_MAX_SECONDS

export const PROACTIVE_VARIABLE_IDLE_PRESETS = [
  { id: 'default', label: '默认', minSeconds: 1, maxSeconds: 5 * 60 },
  { id: 'quick', label: '较快', minSeconds: 30, maxSeconds: 2 * 60 },
  { id: 'relaxed', label: '悠闲', minSeconds: 2 * 60, maxSeconds: 15 * 60 },
  { id: 'sparse', label: '稀疏', minSeconds: 10 * 60, maxSeconds: 60 * 60 },
] as const

export type ProactiveVariableIdleBounds = {
  minSeconds: number
  maxSeconds: number
}

function randomIntInclusive(min: number, max: number): number {
  const lo = Math.min(min, max)
  const hi = Math.max(min, max)
  return lo + Math.floor(Math.random() * (hi - lo + 1))
}

export function clampProactiveVariableBoundSeconds(raw: number): number {
  if (!Number.isFinite(raw)) return PROACTIVE_VARIABLE_INTERVAL_MIN_SECONDS
  return Math.min(
    PROACTIVE_VARIABLE_CUSTOM_MAX_CEILING_SECONDS,
    Math.max(PROACTIVE_VARIABLE_CUSTOM_MIN_FLOOR_SECONDS, Math.round(raw)),
  )
}

export function normalizeProactiveVariableIdleBounds(
  minRaw: number,
  maxRaw: number,
): ProactiveVariableIdleBounds {
  const minSeconds = clampProactiveVariableBoundSeconds(minRaw)
  const maxSeconds = clampProactiveVariableBoundSeconds(maxRaw)
  return {
    minSeconds: Math.min(minSeconds, maxSeconds),
    maxSeconds: Math.max(minSeconds, maxSeconds),
  }
}

export function hasCustomProactiveVariableIdleBounds(
  row:
    | Pick<
        ChatConversationSettingsRow,
        'proactiveMessageVariableIntervalMinSeconds' | 'proactiveMessageVariableIntervalMaxSeconds'
      >
    | null
    | undefined,
): boolean {
  const min = row?.proactiveMessageVariableIntervalMinSeconds
  const max = row?.proactiveMessageVariableIntervalMaxSeconds
  return (
    (typeof min === 'number' && Number.isFinite(min) && min > 0) ||
    (typeof max === 'number' && Number.isFinite(max) && max > 0)
  )
}

export function resolveProactiveVariableIdleBounds(
  row:
    | Pick<
        ChatConversationSettingsRow,
        'proactiveMessageVariableIntervalMinSeconds' | 'proactiveMessageVariableIntervalMaxSeconds'
      >
    | null
    | undefined,
): ProactiveVariableIdleBounds {
  if (!hasCustomProactiveVariableIdleBounds(row)) {
    return {
      minSeconds: PROACTIVE_VARIABLE_INTERVAL_MIN_SECONDS,
      maxSeconds: PROACTIVE_VARIABLE_INTERVAL_MAX_SECONDS,
    }
  }
  return normalizeProactiveVariableIdleBounds(
    row?.proactiveMessageVariableIntervalMinSeconds ?? PROACTIVE_VARIABLE_INTERVAL_MIN_SECONDS,
    row?.proactiveMessageVariableIntervalMaxSeconds ?? PROACTIVE_VARIABLE_INTERVAL_MAX_SECONDS,
  )
}

export function clampProactiveVariableIntervalSeconds(raw: number): number {
  if (!Number.isFinite(raw)) return PROACTIVE_VARIABLE_INTERVAL_MIN_SECONDS
  return Math.min(
    PROACTIVE_VARIABLE_BUSY_MAX_SECONDS,
    Math.max(PROACTIVE_VARIABLE_INTERVAL_MIN_SECONDS, Math.round(raw)),
  )
}

export function drawProactiveVariableIntervalSeconds(
  characterExplicitlyBusy: boolean,
  row?:
    | Pick<
        ChatConversationSettingsRow,
        'proactiveMessageVariableIntervalMinSeconds' | 'proactiveMessageVariableIntervalMaxSeconds'
      >
    | null,
): number {
  if (characterExplicitlyBusy) {
    return randomIntInclusive(
      PROACTIVE_VARIABLE_BUSY_MIN_SECONDS,
      PROACTIVE_VARIABLE_BUSY_MAX_SECONDS,
    )
  }
  const bounds = resolveProactiveVariableIdleBounds(row)
  return randomIntInclusive(bounds.minSeconds, bounds.maxSeconds)
}

const EXPLICIT_BUSY_MESSAGE_WINDOW_MS = 45 * 60 * 1000

/**
 * 角色明确表示「现在在忙、过会儿再说」的硬信号。
 * 刻意收紧：勿用「晚点再说 / 有事要…」等日常口语，避免空闲灵动间隔被误拉到 5 分钟～2 小时。
 */
const EXPLICIT_BUSY_TEXT_RE =
  /(?:我(?:现在|这会儿|这会)?(?:在忙|忙着|没空)|去忙(?:了|啦|哦)?|先忙(?:了|啦|着)?|要忙(?:去|了)?|忙着(?:呢|啊|干)|暂时忙|忙一会(?:儿)?|手头(?:正)?忙|正(?:在)?(?:忙|开会|加班)|先不(?:聊|说)了|顾不上(?:你|这|聊)?|没空(?:聊|回|理))/

export function messageSignalsCharacterExplicitBusy(content: string): boolean {
  const t = String(content ?? '').trim()
  if (!t) return false
  if (/\[BUSY\]/i.test(t)) return true
  return EXPLICIT_BUSY_TEXT_RE.test(t)
}

export function detectCharacterExplicitBusyInMessages(
  messages: WeChatChatMessage[],
  now: number,
  windowMs = EXPLICIT_BUSY_MESSAGE_WINDOW_MS,
): boolean {
  const cutoff = now - windowMs
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const m = messages[i]
    if (!m || m.isRecalled || m.type !== 'character') continue
    if (m.timestamp < cutoff) break
    if (messageSignalsCharacterExplicitBusy(m.content ?? '')) return true
  }
  return false
}

export async function resolveCharacterExplicitBusyForProactive(params: {
  row: ChatConversationSettingsRow
  now: number
}): Promise<boolean> {
  const gs = await personaDb.getGlobalSettings()
  if (gs.busyMode === 'character') {
    const busyRow = await personaDb.getCharacterBusySettings(params.row.peerCharacterId)
    const busyFeatureOn = busyRow?.enabled !== false
    return (
      busyFeatureOn &&
      !!busyRow?.isBusy &&
      (busyRow.busyEndTime ?? 0) > params.now
    )
  }
  const kv = await personaDb.getPhoneKv(`busy-conv:${params.row.conversationKey.trim()}`)
  const busyFeatureOn = typeof kv === 'boolean' ? kv : true
  if (!busyFeatureOn) return false
  const busyRow = await personaDb.getCharacterBusySettings(params.row.peerCharacterId)
  return !!busyRow?.isBusy && (busyRow.busyEndTime ?? 0) > params.now
}

/**
 * 灵动间隔重抽：仅「系统忙碌态未结束」才用 5 分钟～2 小时。
 * 不因历史气泡里的「说忙」口语拉长——否则主动消息刚聊完下一轮就会抽到一两个小时。
 * `[BUSY]` 指令仍由 ChatRoom 解析后单独强制忙碌档。
 */
export async function resolveProactiveVariableBusyForIntervalDraw(params: {
  row: ChatConversationSettingsRow
  now: number
}): Promise<boolean> {
  return resolveCharacterExplicitBusyForProactive(params)
}

export function isProactiveVariableIntervalEnabled(
  row: Pick<ChatConversationSettingsRow, 'proactiveMessageVariableIntervalEnabled'> | null | undefined,
): boolean {
  return !!row?.proactiveMessageVariableIntervalEnabled
}

export function resolveProactiveMessageEffectiveIntervalSeconds(
  row: Pick<
    ChatConversationSettingsRow,
    | 'proactiveMessageVariableIntervalEnabled'
    | 'proactiveMessageNextIntervalSeconds'
    | 'proactiveMessageIntervalSeconds'
    | 'proactiveMessageIntervalMinutes'
    | 'proactiveMessageVariableIntervalMinSeconds'
    | 'proactiveMessageVariableIntervalMaxSeconds'
  >,
  options?: { characterExplicitlyBusy?: boolean },
): number {
  if (isProactiveVariableIntervalEnabled(row)) {
    const stored = row.proactiveMessageNextIntervalSeconds
    if (typeof stored === 'number' && Number.isFinite(stored) && stored > 0) {
      const busy = !!options?.characterExplicitlyBusy
      if (!busy) {
        const idleMax = resolveProactiveVariableIdleBounds(row).maxSeconds
        // 非忙碌却残留忙碌档抽签（可达 2 小时）：钳回空闲上限，避免倒计时卡在 1 小时+
        if (stored > idleMax) return idleMax
      }
      return clampProactiveVariableIntervalSeconds(stored)
    }
    return drawProactiveVariableIntervalSeconds(!!options?.characterExplicitlyBusy, row)
  }
  return resolveProactiveMessageIntervalSeconds(row)
}

export function formatProactiveVariableBoundLabel(seconds: number): string {
  const s = clampProactiveVariableBoundSeconds(seconds)
  if (s < 60) return `${s} 秒`
  if (s < 3600) {
    const m = Math.round(s / 60)
    return `${m} 分钟`
  }
  const h = Math.floor(s / 3600)
  const m = Math.round((s % 3600) / 60)
  return m > 0 ? `${h} 小时 ${m} 分钟` : `${h} 小时`
}

export function formatProactiveVariableIdleRangeLabel(
  row:
    | Pick<
        ChatConversationSettingsRow,
        'proactiveMessageVariableIntervalMinSeconds' | 'proactiveMessageVariableIntervalMaxSeconds'
      >
    | null
    | undefined,
): string {
  const bounds = resolveProactiveVariableIdleBounds(row)
  return `${formatProactiveVariableBoundLabel(bounds.minSeconds)}～${formatProactiveVariableBoundLabel(bounds.maxSeconds)}`
}

export function formatProactiveVariableIntervalRangeLabel(
  characterExplicitlyBusy: boolean,
  row?:
    | Pick<
        ChatConversationSettingsRow,
        'proactiveMessageVariableIntervalMinSeconds' | 'proactiveMessageVariableIntervalMaxSeconds'
      >
    | null,
): string {
  const idle = `约 ${formatProactiveVariableIdleRangeLabel(row)}`
  if (characterExplicitlyBusy) {
    return `${idle}（系统忙碌未结束时临时改为约 5 分钟～2 小时）`
  }
  return idle
}

export function formatProactiveVariableIntervalCountdownHint(seconds: number): string {
  const s = clampProactiveVariableIntervalSeconds(seconds)
  if (s < 60) return `本次随机 ${s} 秒`
  if (s < 3600) {
    const m = Math.round(s / 60)
    return `本次随机约 ${m} 分钟`
  }
  const h = Math.floor(s / 3600)
  const m = Math.round((s % 3600) / 60)
  return m > 0 ? `本次随机约 ${h} 小时 ${m} 分钟` : `本次随机约 ${h} 小时`
}
