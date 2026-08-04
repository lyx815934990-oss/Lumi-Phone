import type { MutualFriendLinkedModeRow, MutualFriendRelayRecord } from './types'

const LINKED_MODE_PREFIX = 'lumi-mutual-friend-linked-v1:'
const RELAY_PREFIX = 'lumi-mutual-friend-relay-v1:'
const RELAY_MAX_PER_ROLE = 50

export function mutualFriendLinkedModeStorageId(
  networkRootId: string,
  playerIdentityId: string,
): string {
  const root = networkRootId.trim()
  const pid = playerIdentityId.trim() || '__none__'
  return `${root}::${pid}`
}

export function loadMutualFriendLinkedMode(
  networkRootId: string,
  playerIdentityId: string,
): boolean {
  const root = networkRootId.trim()
  if (!root || typeof localStorage === 'undefined') return false
  const id = mutualFriendLinkedModeStorageId(root, playerIdentityId)
  try {
    const raw = localStorage.getItem(`${LINKED_MODE_PREFIX}${id}`)
    if (!raw) return false
    const parsed = JSON.parse(raw) as Partial<MutualFriendLinkedModeRow>
    return parsed.enabled === true
  } catch {
    return false
  }
}

export function saveMutualFriendLinkedMode(params: {
  networkRootId: string
  playerIdentityId: string
  enabled: boolean
}): void {
  const root = params.networkRootId.trim()
  if (!root || typeof localStorage === 'undefined') return
  const id = mutualFriendLinkedModeStorageId(root, params.playerIdentityId)
  const row: MutualFriendLinkedModeRow = {
    id,
    networkRootId: root,
    playerIdentityId: params.playerIdentityId.trim() || '__none__',
    enabled: params.enabled === true,
    updatedAt: Date.now(),
  }
  try {
    localStorage.setItem(`${LINKED_MODE_PREFIX}${id}`, JSON.stringify(row))
  } catch {
    /* ignore */
  }
}

export function loadMutualFriendRelayRecords(roleId: string): MutualFriendRelayRecord[] {
  const rid = roleId.trim()
  if (!rid || typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(`${RELAY_PREFIX}${rid}`)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? (parsed as MutualFriendRelayRecord[]) : []
  } catch {
    return []
  }
}

function saveMutualFriendRelayRecords(roleId: string, records: MutualFriendRelayRecord[]): void {
  const rid = roleId.trim()
  if (!rid || typeof localStorage === 'undefined') return
  try {
    const clipped = records.slice(-RELAY_MAX_PER_ROLE)
    localStorage.setItem(`${RELAY_PREFIX}${rid}`, JSON.stringify(clipped))
  } catch {
    /* ignore */
  }
}

/** 双向写入传话记录（发起方与接收方各存一份） */
export function addMutualFriendRelayRecord(params: {
  fromRoleId: string
  toRoleId: string
  relayedMessage: string
  heardBack?: string
  chatId: string
}): MutualFriendRelayRecord | null {
  const from = params.fromRoleId.trim()
  const to = params.toRoleId.trim()
  const msg = params.relayedMessage.trim()
  const heard = String(params.heardBack ?? '').trim()
  if (!from || !to || (!msg && !heard)) return null
  const record: MutualFriendRelayRecord = {
    id: `relay-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    fromRoleId: from,
    toRoleId: to,
    relayedMessage: (msg || heard).slice(0, 500),
    ...(heard ? { heardBack: heard.slice(0, 500) } : {}),
    timestamp: Date.now(),
    chatId: params.chatId.trim(),
  }
  const fromRecords = loadMutualFriendRelayRecords(from)
  fromRecords.push(record)
  saveMutualFriendRelayRecords(from, fromRecords)
  const toRecords = loadMutualFriendRelayRecords(to)
  toRecords.push(record)
  saveMutualFriendRelayRecords(to, toRecords)
  return record
}

/**
 * 重新回复：撤回本会话在锚点用户消息之后写入的传话记录（双向）。
 * 否则提示词里的「已转达勿再出块」会让模型只口头宣称、不再写联动块。
 */
export function removeMutualFriendRelayRecordsForChatSince(params: {
  characterId: string
  chatId: string
  sinceTimestamp: number
}): { removedRecordIds: string[]; peerIds: string[] } {
  const cid = params.characterId.trim()
  const chatId = params.chatId.trim()
  const since = Number(params.sinceTimestamp)
  if (!cid || !chatId || !Number.isFinite(since)) {
    return { removedRecordIds: [], peerIds: [] }
  }

  const own = loadMutualFriendRelayRecords(cid)
  const doomed = own.filter(
    (r) =>
      String(r.chatId ?? '').trim() === chatId &&
      Number(r.timestamp) >= since &&
      (r.fromRoleId === cid || r.toRoleId === cid),
  )
  if (!doomed.length) return { removedRecordIds: [], peerIds: [] }

  const removeIds = new Set(doomed.map((r) => r.id))
  const peerIds = new Set<string>()
  for (const r of doomed) {
    const a = String(r.fromRoleId ?? '').trim()
    const b = String(r.toRoleId ?? '').trim()
    if (a && a !== cid) peerIds.add(a)
    if (b && b !== cid) peerIds.add(b)
  }

  saveMutualFriendRelayRecords(
    cid,
    own.filter((r) => !removeIds.has(r.id)),
  )
  for (const peerId of peerIds) {
    const peerRecs = loadMutualFriendRelayRecords(peerId)
    saveMutualFriendRelayRecords(
      peerId,
      peerRecs.filter((r) => !removeIds.has(r.id)),
    )
  }
  return { removedRecordIds: [...removeIds], peerIds: [...peerIds] }
}
