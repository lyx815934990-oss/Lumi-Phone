import { personaDb } from '../newFriendsPersona/idb'
import type { FriendPresence } from '../messagesPulse/types'

const STATUS_KV = 'wechat-peer-presence-thought:v1:'
const AUTO_UPDATE_KV = 'wechat-peer-presence-auto-update:v1:'

export const PEER_PRESENCE_THOUGHT_UPDATED_EVENT = 'wechat-peer-presence-thought-updated'
/** 想法文案真正变更时的柔和 toast */
export const PEER_PRESENCE_THOUGHT_TOAST_EVENT = 'wechat-peer-presence-thought-toast'

export type PeerPresenceThoughtToastDetail = {
  characterId: string
  displayName: string
  thoughtEmoji: string
  thoughtText: string
  presenceLabel: string
}

export function dispatchPeerPresenceThoughtToast(detail: PeerPresenceThoughtToastDetail) {
  if (typeof window === 'undefined') return
  const cid = detail.characterId.trim()
  if (!cid) return
  try {
    window.dispatchEvent(
      new CustomEvent<PeerPresenceThoughtToastDetail>(PEER_PRESENCE_THOUGHT_TOAST_EVENT, {
        detail: {
          characterId: cid,
          displayName: detail.displayName.trim() || '对方',
          thoughtEmoji: String(detail.thoughtEmoji ?? '').trim(),
          thoughtText: String(detail.thoughtText ?? '').trim(),
          presenceLabel: String(detail.presenceLabel ?? '').trim(),
        },
      }),
    )
  } catch {
    /* ignore */
  }
}

export type PeerPresenceThoughtStatus = {
  version: 1
  updatedAt: number
  /** 想法文案最近一次真正变更时间（与在线态更新解耦，用于冷却） */
  thoughtUpdatedAt?: number
  presence: FriendPresence
  /** 自定义活动文案，如「工作中」；空则 UI 用在线/离开/离线 */
  presenceLabel: string
  thoughtEmoji: string
  thoughtText: string
}

export const DEFAULT_PEER_PRESENCE_THOUGHT: PeerPresenceThoughtStatus = {
  version: 1,
  updatedAt: 0,
  presence: 'offline',
  presenceLabel: '',
  thoughtEmoji: '',
  thoughtText: '',
}

function normalizePresence(raw: unknown): FriendPresence {
  const s = String(raw ?? '')
    .trim()
    .toLowerCase()
  if (s === 'online' || s === '在线') return 'online'
  if (s === 'away' || s === '离开' || s === '忙碌') return 'away'
  if (s === 'offline' || s === '离线' || s === '隐身') return 'offline'
  return 'offline'
}

export function parsePeerPresenceThoughtStatus(raw: unknown): PeerPresenceThoughtStatus | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  return {
    version: 1,
    updatedAt: typeof o.updatedAt === 'number' && Number.isFinite(o.updatedAt) ? o.updatedAt : 0,
    thoughtUpdatedAt:
      typeof o.thoughtUpdatedAt === 'number' && Number.isFinite(o.thoughtUpdatedAt)
        ? o.thoughtUpdatedAt
        : undefined,
    presence: normalizePresence(o.presence),
    presenceLabel: String(o.presenceLabel ?? o.presence_label ?? '')
      .trim()
      .slice(0, 24),
    thoughtEmoji: String(o.thoughtEmoji ?? o.thought_emoji ?? o.statusEmoji ?? '')
      .trim()
      .slice(0, 16),
    thoughtText: String(o.thoughtText ?? o.thought_text ?? o.statusText ?? '')
      .trim()
      .slice(0, 12),
  }
}

export async function loadPeerPresenceThought(characterId: string): Promise<PeerPresenceThoughtStatus> {
  const cid = characterId.trim()
  if (!cid) return { ...DEFAULT_PEER_PRESENCE_THOUGHT }
  try {
    const raw = await personaDb.getPhoneKv(`${STATUS_KV}${cid}`)
    return parsePeerPresenceThoughtStatus(raw) ?? { ...DEFAULT_PEER_PRESENCE_THOUGHT }
  } catch {
    return { ...DEFAULT_PEER_PRESENCE_THOUGHT }
  }
}

export async function savePeerPresenceThought(
  characterId: string,
  status: Omit<PeerPresenceThoughtStatus, 'version'> & { version?: 1 },
): Promise<PeerPresenceThoughtStatus> {
  const cid = characterId.trim()
  if (!cid) return { ...DEFAULT_PEER_PRESENCE_THOUGHT }
  const next: PeerPresenceThoughtStatus = {
    version: 1,
    updatedAt: status.updatedAt > 0 ? status.updatedAt : Date.now(),
    ...(typeof status.thoughtUpdatedAt === 'number' && status.thoughtUpdatedAt > 0
      ? { thoughtUpdatedAt: status.thoughtUpdatedAt }
      : {}),
    presence: normalizePresence(status.presence),
    presenceLabel: String(status.presenceLabel ?? '')
      .trim()
      .slice(0, 24),
    thoughtEmoji: String(status.thoughtEmoji ?? '')
      .trim()
      .slice(0, 16),
    thoughtText: String(status.thoughtText ?? '')
      .trim()
      .slice(0, 12),
  }
  await personaDb.setPhoneKv(`${STATUS_KV}${cid}`, next)
  try {
    window.dispatchEvent(
      new CustomEvent(PEER_PRESENCE_THOUGHT_UPDATED_EVENT, {
        detail: { characterId: cid, status: next },
      }),
    )
  } catch {
    /* ignore */
  }
  return next
}

/** 会话级：角色是否根据聊天自行更新在线状态与想法 */
export async function loadPeerPresenceAutoUpdate(conversationKey: string): Promise<boolean> {
  const key = conversationKey.trim()
  if (!key) return false
  try {
    const raw = await personaDb.getPhoneKv(`${AUTO_UPDATE_KV}${key}`)
    return raw === true
  } catch {
    return false
  }
}

export async function savePeerPresenceAutoUpdate(conversationKey: string, on: boolean): Promise<void> {
  const key = conversationKey.trim()
  if (!key) return
  await personaDb.setPhoneKv(`${AUTO_UPDATE_KV}${key}`, !!on)
}

const PRESENCE_CN: Record<FriendPresence, string> = {
  online: '在线',
  away: '离开',
  offline: '离线',
}

/** 注入角色可见的「自己当前在线状态与想法」快照 */
export function formatPeerPresenceThoughtPromptBlock(
  status: PeerPresenceThoughtStatus,
): string {
  const presenceCn = PRESENCE_CN[status.presence] || '离线'
  const activity = status.presenceLabel.trim()
  const thought = [status.thoughtEmoji.trim(), status.thoughtText.trim()]
    .filter(Boolean)
    .join(' ')
    .trim()
  return [
    '【你的在线状态与想法 · 当前对外展示】',
    `- 在线档位：${presenceCn}`,
    `- 活动文案：${activity || `（未单独设置，好友侧显示「${presenceCn}」）`}`,
    `- 想法气泡：${thought || '（未设置）'}`,
    '说明：这是好友可见的对外状态（顶栏圆点 / 状态列表），不是私聊气泡。回聊时须自知当前挂着什么；被问到可按实情回应，勿否认已挂上的想法。用户点名改状态/想法时按要求更新。',
  ].join('\n')
}

export async function loadPeerPresenceThoughtPromptBlock(characterId: string): Promise<string> {
  const cid = characterId.trim()
  if (!cid) return ''
  const status = await loadPeerPresenceThought(cid)
  return formatPeerPresenceThoughtPromptBlock(status)
}
