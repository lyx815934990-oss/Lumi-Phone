import { personaDb } from '../newFriendsPersona/idb'

/** v2：按角色开关（避免会话身份与人设绑定身份不一致导致「开了但不更新」） */
const CHAR_KV = 'life-ledger-inline-sync:v2:characters'
/** v1 兼容：按玩家身份 × 角色 */
const V1_PREFIX = 'life-ledger-inline-sync:v1:'

export const LIFE_LEDGER_INLINE_SYNC_CHANGED_EVENT = 'life-ledger-inline-sync-changed'

function v1KvKey(playerIdentityId: string): string {
  return `${V1_PREFIX}${playerIdentityId.trim() || '__default__'}`
}

function normalizeIdSet(raw: unknown): Set<string> {
  const out = new Set<string>()
  if (!Array.isArray(raw)) return out
  for (const x of raw) {
    const id = String(x ?? '').trim()
    if (id) out.add(id)
  }
  return out
}

async function loadCharacterInlineSyncSet(): Promise<Set<string>> {
  try {
    return normalizeIdSet(await personaDb.getPhoneKv(CHAR_KV))
  } catch {
    return new Set()
  }
}

/** @deprecated 兼容旧开关；新逻辑以角色集合为准 */
export async function loadLifeLedgerInlineSyncCharacterIds(
  playerIdentityId: string,
): Promise<Set<string>> {
  const pid = playerIdentityId.trim()
  const merged = await loadCharacterInlineSyncSet()
  if (!pid || pid === '__none__') return merged
  try {
    const legacy = normalizeIdSet(await personaDb.getPhoneKv(v1KvKey(pid)))
    for (const id of legacy) merged.add(id)
  } catch {
    /* ignore */
  }
  return merged
}

export async function isLifeLedgerInlineSyncEnabled(
  conversationCharacterId: string,
  playerIdentityId?: string,
): Promise<boolean> {
  const cid = conversationCharacterId.trim()
  if (!cid) return false
  const charSet = await loadCharacterInlineSyncSet()
  if (charSet.has(cid)) return true
  const pid = String(playerIdentityId ?? '').trim()
  if (!pid || pid === '__none__') return false
  try {
    const legacy = normalizeIdSet(await personaDb.getPhoneKv(v1KvKey(pid)))
    return legacy.has(cid)
  } catch {
    return false
  }
}

export async function setLifeLedgerInlineSyncEnabled(params: {
  conversationCharacterId: string
  /** 可选：同时写入旧版身份键，兼容旧逻辑 */
  playerIdentityId?: string
  enabled: boolean
}): Promise<void> {
  const cid = params.conversationCharacterId.trim()
  if (!cid) return
  const set = await loadCharacterInlineSyncSet()
  if (params.enabled) set.add(cid)
  else set.delete(cid)
  await personaDb.setPhoneKv(CHAR_KV, Array.from(set))

  const pid = String(params.playerIdentityId ?? '').trim()
  if (pid && pid !== '__none__') {
    try {
      const legacy = normalizeIdSet(await personaDb.getPhoneKv(v1KvKey(pid)))
      if (params.enabled) legacy.add(cid)
      else legacy.delete(cid)
      await personaDb.setPhoneKv(v1KvKey(pid), Array.from(legacy))
    } catch {
      /* ignore */
    }
  }

  try {
    window.dispatchEvent(
      new CustomEvent(LIFE_LEDGER_INLINE_SYNC_CHANGED_EVENT, {
        detail: { playerIdentityId: pid || undefined, characterId: cid, enabled: !!params.enabled },
      }),
    )
  } catch {
    /* ignore */
  }
}
