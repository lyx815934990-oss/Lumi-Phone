import { personaDb } from '../newFriendsPersona/idb'

const KV_PREFIX = 'observation-notes-auto-update:v1:'

export const OBS_NOTES_AUTO_UPDATE_CHANGED_EVENT = 'observation-notes-auto-update-changed'

function autoUpdateKvKey(playerIdentityId: string): string {
  return `${KV_PREFIX}${playerIdentityId.trim() || '__default__'}`
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

/** 当前身份下：哪些角色会在主回复中自动判断/更新侧写 */
export async function loadObservationNotesAutoUpdateCharacterIds(
  playerIdentityId: string,
): Promise<Set<string>> {
  const pid = playerIdentityId.trim()
  if (!pid || pid === '__none__') return new Set()
  try {
    const raw = await personaDb.getPhoneKv(autoUpdateKvKey(pid))
    return normalizeIdSet(raw)
  } catch {
    return new Set()
  }
}

export async function isObservationNotesAutoUpdateEnabled(
  conversationCharacterId: string,
  playerIdentityId: string,
): Promise<boolean> {
  const cid = conversationCharacterId.trim()
  if (!cid) return false
  const set = await loadObservationNotesAutoUpdateCharacterIds(playerIdentityId)
  return set.has(cid)
}

export async function setObservationNotesAutoUpdateEnabled(params: {
  conversationCharacterId: string
  playerIdentityId: string
  enabled: boolean
}): Promise<void> {
  const cid = params.conversationCharacterId.trim()
  const pid = params.playerIdentityId.trim()
  if (!cid || !pid || pid === '__none__') return
  const set = await loadObservationNotesAutoUpdateCharacterIds(pid)
  if (params.enabled) set.add(cid)
  else set.delete(cid)
  await personaDb.setPhoneKv(autoUpdateKvKey(pid), Array.from(set))
  try {
    window.dispatchEvent(
      new CustomEvent(OBS_NOTES_AUTO_UPDATE_CHANGED_EVENT, {
        detail: { playerIdentityId: pid, characterId: cid, enabled: !!params.enabled },
      }),
    )
  } catch {
    /* ignore */
  }
}
