import { personaDb } from '../newFriendsPersona/idb'
import type { MurmurContactLite } from './murmurStorage'
import { publishCharacterMurmurFromAi } from './murmurAiPublish'
import {
  isMurmurAdaptivePublishDue,
  isMurmurPublishDue,
  loadMurmurPublishSettings,
} from './murmurSettings'

const TICK_MS = 45_000
let installed = false
let runningTick = false
const inFlight = new Set<string>()

async function resolveContactPool(): Promise<MurmurContactLite[]> {
  try {
    const chars = await personaDb.listCharacters()
    return chars
      .map((c) => ({
        characterId: String(c.id ?? '').trim(),
        remarkName: String(c.name ?? c.wechatNickname ?? '').trim() || '角色',
        avatarUrl: c.avatarUrl,
      }))
      .filter((c) => c.characterId)
  } catch {
    return []
  }
}

async function fireOne(characterId: string, contacts: MurmurContactLite[]): Promise<void> {
  const cid = characterId.trim()
  if (!cid || inFlight.has(cid)) return
  inFlight.add(cid)
  try {
    const settings = await loadMurmurPublishSettings(cid)
    if (!settings.enabled) return
    const due =
      settings.mode === 'adaptive'
        ? await isMurmurAdaptivePublishDue(cid, settings)
        : isMurmurPublishDue(settings)
    if (!due) return
    const row = await personaDb.getCharacter(cid)
    if (!row) return
    await publishCharacterMurmurFromAi({
      character: row,
      contacts,
    })
  } catch (err) {
    console.warn('[murmurProactive]', cid, err)
  } finally {
    inFlight.delete(cid)
  }
}

async function runTick(): Promise<void> {
  if (runningTick) return
  runningTick = true
  try {
    const contacts = await resolveContactPool()
    if (!contacts.length) return
    for (const c of contacts) {
      const settings = await loadMurmurPublishSettings(c.characterId)
      if (!settings.enabled) continue
      void fireOne(c.characterId, contacts)
    }
  } finally {
    runningTick = false
  }
}

export function installMurmurProactivePublishEngine(): void {
  if (installed) return
  installed = true
  const kick = () => void runTick()
  window.addEventListener('wechat-storage-changed', kick)
  window.addEventListener('wechat-murmur-published', kick)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') kick()
  })
  void runTick()
  window.setInterval(kick, TICK_MS)
}
