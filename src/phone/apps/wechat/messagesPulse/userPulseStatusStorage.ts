import { personaDb } from '../newFriendsPersona/idb'
import { clampMoodLevel, MOOD_LABEL } from './moodFaces'
import type { DayScheduleSlot, FriendMoodLevel, FriendPresence } from './types'

export const USER_PULSE_STATUS_KV_PREFIX = 'wechat-user-pulse-status:v1:'

export type UserPulseStatus = {
  version: 1
  updatedAt: number
  /** 对外可见；关闭则动态页仍可编辑草稿，但不展示给好友/AI */
  published: boolean
  /** 圆点：在线 / 离开 / 离线 */
  presence: FriendPresence
  /** 自定义在线状态文案，如「工作中」「摸鱼中」；与想法气泡互不影响 */
  presenceLabel: string
  /** Unicode emoji 或微信经典表情 token，如 [吃瓜] —— 想法气泡 */
  statusEmoji: string
  /** 想法短文案（对标微信状态气泡） */
  statusText: string
  moodToday: FriendMoodLevel
  /** 用户当日公开行程（时间段） */
  slots: DayScheduleSlot[]
  /** 状态修改时间线（新→旧，最多 20 条） */
  history: UserPulseStatusHistoryEntry[]
}

export type UserPulseStatusHistoryEntry = {
  at: number
  presence: FriendPresence
  presenceLabel: string
  statusEmoji: string
  statusText: string
  moodToday: FriendMoodLevel
}

export const DEFAULT_USER_PULSE_STATUS: UserPulseStatus = {
  version: 1,
  updatedAt: 0,
  published: false,
  presence: 'online',
  presenceLabel: '',
  statusEmoji: '',
  statusText: '',
  moodToday: 2,
  slots: [],
  history: [],
}

/** 在线状态快捷预设（点选会顺带建议圆点颜色，可再改） */
export const USER_PULSE_ACTIVITY_PRESETS: ReadonlyArray<{
  label: string
  presence: FriendPresence
}> = [
  { label: '工作中', presence: 'away' },
  { label: '摸鱼中', presence: 'online' },
  { label: '热恋中', presence: 'online' },
  { label: '听歌中', presence: 'online' },
  { label: '学习中', presence: 'away' },
  { label: '游戏中', presence: 'online' },
  { label: '吃饭中', presence: 'online' },
  { label: '睡觉中', presence: 'offline' },
  { label: '忙碌中', presence: 'away' },
  { label: '发呆中', presence: 'online' },
  { label: '约会中', presence: 'away' },
  { label: '出门中', presence: 'away' },
  { label: '在线', presence: 'online' },
  { label: '离开', presence: 'away' },
  { label: '隐身', presence: 'offline' },
]

const PRESENCE_FALLBACK: Record<FriendPresence, string> = {
  online: '在线',
  away: '离开',
  offline: '离线',
}

/** 展示用：自定义文案优先，否则回退到在线/离开/离线 */
export function formatPresenceLabel(
  presence: FriendPresence,
  presenceLabel?: string | null,
): string {
  const custom = (presenceLabel || '').trim()
  if (custom) return custom.slice(0, 16)
  return PRESENCE_FALLBACK[presence]
}

function clampMood(n: unknown): FriendMoodLevel {
  return clampMoodLevel(n)
}

function normalizeSlot(raw: unknown): DayScheduleSlot | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const startMin = Number(o.startMin)
  const endMin = Number(o.endMin)
  const label = typeof o.label === 'string' ? o.label.trim() : ''
  const timeLabel = typeof o.timeLabel === 'string' ? o.timeLabel.trim() : ''
  if (!label || !Number.isFinite(startMin) || !Number.isFinite(endMin)) return null
  return {
    startMin,
    endMin: endMin <= startMin ? startMin + 60 : endMin,
    label: label.slice(0, 48),
    timeLabel: timeLabel.slice(0, 32) || `${Math.floor(startMin / 60)}:00`,
  }
}

function normalizePresence(raw: unknown): FriendPresence {
  return raw === 'online' || raw === 'away' || raw === 'offline' ? raw : 'online'
}

export function normalizeUserPulseStatus(raw: unknown): UserPulseStatus {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_USER_PULSE_STATUS }
  const o = raw as Record<string, unknown>
  const presence = normalizePresence(o.presence)
  const slots = Array.isArray(o.slots)
    ? o.slots.map(normalizeSlot).filter((x): x is DayScheduleSlot => !!x).slice(0, 16)
    : []
  const historyRaw = Array.isArray(o.history) ? o.history : []
  const history: UserPulseStatusHistoryEntry[] = []
  for (const h of historyRaw) {
    if (!h || typeof h !== 'object') continue
    const r = h as Record<string, unknown>
    const at = Number(r.at)
    if (!Number.isFinite(at) || at <= 0) continue
    history.push({
      at,
      presence: normalizePresence(r.presence),
      presenceLabel: typeof r.presenceLabel === 'string' ? r.presenceLabel.trim().slice(0, 16) : '',
      statusEmoji: typeof r.statusEmoji === 'string' ? r.statusEmoji.trim().slice(0, 32) : '',
      statusText: typeof r.statusText === 'string' ? r.statusText.trim().slice(0, 36) : '',
      moodToday: clampMood(r.moodToday),
    })
    if (history.length >= 20) break
  }
  return {
    version: 1,
    updatedAt: typeof o.updatedAt === 'number' ? o.updatedAt : 0,
    published: o.published !== false,
    presence,
    presenceLabel: typeof o.presenceLabel === 'string' ? o.presenceLabel.trim().slice(0, 16) : '',
    statusEmoji: typeof o.statusEmoji === 'string' ? o.statusEmoji.trim().slice(0, 32) : '',
    statusText: typeof o.statusText === 'string' ? o.statusText.trim().slice(0, 36) : '',
    moodToday: clampMood(o.moodToday),
    slots,
    history,
  }
}

export function userPulseStatusKvKey(playerIdentityId: string): string {
  return `${USER_PULSE_STATUS_KV_PREFIX}${playerIdentityId.trim() || '__none__'}`
}

export async function loadUserPulseStatus(playerIdentityId: string | null | undefined): Promise<UserPulseStatus> {
  const pid = (playerIdentityId || '').trim()
  if (!pid || pid === '__none__') return { ...DEFAULT_USER_PULSE_STATUS }
  try {
    const raw = await personaDb.getPhoneKv(userPulseStatusKvKey(pid))
    return normalizeUserPulseStatus(raw)
  } catch {
    return { ...DEFAULT_USER_PULSE_STATUS }
  }
}

export async function saveUserPulseStatus(
  playerIdentityId: string | null | undefined,
  next: UserPulseStatus,
): Promise<UserPulseStatus> {
  const pid = (playerIdentityId || '').trim()
  const now = Date.now()
  const prev = await loadUserPulseStatus(pid)
  const base = normalizeUserPulseStatus({
    ...next,
    version: 1,
    updatedAt: now,
  })
  const changed =
    prev.statusEmoji !== base.statusEmoji ||
    prev.statusText !== base.statusText ||
    prev.presence !== base.presence ||
    prev.presenceLabel !== base.presenceLabel ||
    prev.moodToday !== base.moodToday ||
    prev.published !== base.published
  const history = changed
    ? [
        {
          at: now,
          presence: base.presence,
          presenceLabel: base.presenceLabel,
          statusEmoji: base.statusEmoji,
          statusText: base.statusText,
          moodToday: base.moodToday,
        },
        ...prev.history,
      ].slice(0, 20)
    : base.history.length
      ? base.history
      : prev.history
  const normalized: UserPulseStatus = { ...base, history }
  if (!pid || pid === '__none__') return normalized
  await personaDb.setPhoneKv(userPulseStatusKvKey(pid), normalized)
  return normalized
}

/** 注入角色可见的「用户微信状态」块；未发布则返回空串 */
export function formatUserPulseStatusPromptBlock(status: UserPulseStatus, displayName?: string): string {
  if (!status.published) return ''
  const who = (displayName || '用户').trim() || '用户'
  const emoji = status.statusEmoji.trim()
  const text = status.statusText.trim()
  const hasBubble = !!(emoji || text)
  const activity = formatPresenceLabel(status.presence, status.presenceLabel)
  const slotLines = status.slots
    .slice()
    .sort((a, b) => a.startMin - b.startMin)
    .map((s) => `- ${s.timeLabel} ${s.label}`)
  if (status.updatedAt <= 0 && !hasBubble && !status.presenceLabel.trim() && slotLines.length === 0) return ''
  const lines = [
    `【用户微信状态·此刻】（在线状态与想法气泡分开；${who}主动发布，角色可见，可自然调侃/关心，禁止编造未写明的细节）`,
    `- 在线状态：${activity}（圆点：${PRESENCE_FALLBACK[status.presence]}）`,
    `- 心情：${MOOD_LABEL[status.moodToday]}`,
  ]
  if (hasBubble) {
    lines.push(`- 想法气泡：${[emoji, text].filter(Boolean).join(' ').trim()}`)
  } else {
    lines.push('- 想法气泡：（未设置）')
  }
  if (slotLines.length) {
    lines.push('- 今日公开行程：')
    lines.push(...slotLines)
  } else {
    lines.push('- 今日公开行程：（未填写）')
  }
  return lines.join('\n')
}

export async function loadUserPulseStatusPromptBlock(opts: {
  playerIdentityId?: string | null
  displayName?: string
}): Promise<string> {
  const status = await loadUserPulseStatus(opts.playerIdentityId)
  return formatUserPulseStatusPromptBlock(status, opts.displayName)
}
