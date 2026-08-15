import { personaDb, pullPhoneKvWithLocalStorageLegacy } from '../../phone/apps/wechat/newFriendsPersona/idb'
import type { SyncListeningProfile, SyncListeningState } from '../../stores/useMusicStore'

/** 一起听同伴：刷新后恢复，免去重新邀约 */
export const LISTEN_TOGETHER_SYNC_LISTENING_KV_KEY = 'listen-together-sync-listening-v1'

let cachedSync: SyncListeningState | null = null

function normalizeProfile(raw: unknown): SyncListeningProfile | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const name = typeof r.name === 'string' ? r.name.trim() : ''
  const avatar = typeof r.avatar === 'string' ? r.avatar.trim() : ''
  const characterId = typeof r.characterId === 'string' ? r.characterId.trim() : ''
  if (!name && !characterId) return null
  return {
    name: name || '对方',
    avatar,
    ...(characterId ? { characterId } : {}),
  }
}

export function normalizeSyncListeningState(raw: unknown): SyncListeningState | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const companion = normalizeProfile(r.companion)
  const user = normalizeProfile(r.user)
  if (!companion?.characterId?.trim() || !user) return null
  return {
    companion: {
      name: companion.name,
      avatar: companion.avatar,
      characterId: companion.characterId.trim(),
    },
    user: {
      name: user.name || '我',
      avatar: user.avatar,
      ...(user.characterId ? { characterId: user.characterId } : {}),
    },
  }
}

export function getSyncListeningPersistedSync(): SyncListeningState | null {
  return cachedSync
}

export async function hydrateSyncListeningPersisted(): Promise<SyncListeningState | null> {
  const raw = await pullPhoneKvWithLocalStorageLegacy(LISTEN_TOGETHER_SYNC_LISTENING_KV_KEY, [])
  cachedSync = normalizeSyncListeningState(raw)
  return cachedSync
}

export async function persistSyncListeningState(state: SyncListeningState | null): Promise<void> {
  const next = state ? normalizeSyncListeningState(state) : null
  cachedSync = next
  if (next) {
    await personaDb.setPhoneKv(LISTEN_TOGETHER_SYNC_LISTENING_KV_KEY, next)
  } else {
    await personaDb.deletePhoneKv(LISTEN_TOGETHER_SYNC_LISTENING_KV_KEY)
  }
}
