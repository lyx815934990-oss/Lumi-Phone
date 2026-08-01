import type { CharacterAppearanceRefImage } from './newFriendsPersona/types'
import { normalizeAppearanceRefNote, parseCharacterAppearanceRefImages } from './characterAppearanceRefImages'
import { emitWeChatStorageChanged, personaDb } from './newFriendsPersona/idb'

export type AppearanceRefContext = 'chat' | 'dating'

export type AppearanceRefSubject = 'character' | 'user'

export type AppearanceRefBundle = {
  images: CharacterAppearanceRefImage[]
  note?: string
}

export type AppearanceRefContextOverride = {
  playerIdentityId: string
  characterId: string
  context: AppearanceRefContext
  forked: boolean
  characterRefImages?: CharacterAppearanceRefImage[]
  characterRefNote?: string
  userRefImages?: CharacterAppearanceRefImage[]
  userRefNote?: string
  updatedAt: number
}

const KV_KEY = 'wechat-appearance-ref-context-v1'

function bindingKey(playerIdentityId: string, characterId: string, context: AppearanceRefContext): string {
  return `${context}::${playerIdentityId.trim()}::${characterId.trim()}`
}

function normalizeOverride(raw: unknown): AppearanceRefContextOverride | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const playerIdentityId = typeof o.playerIdentityId === 'string' ? o.playerIdentityId.trim() : ''
  const characterId = typeof o.characterId === 'string' ? o.characterId.trim() : ''
  const context = o.context === 'chat' || o.context === 'dating' ? o.context : null
  if (!playerIdentityId || !characterId || !context) return null
  return {
    playerIdentityId,
    characterId,
    context,
    forked: o.forked === true,
    characterRefImages: parseCharacterAppearanceRefImages(o.characterRefImages),
    characterRefNote: normalizeAppearanceRefNote(o.characterRefNote),
    userRefImages: parseCharacterAppearanceRefImages(o.userRefImages),
    userRefNote: normalizeAppearanceRefNote(o.userRefNote),
    updatedAt:
      typeof o.updatedAt === 'number' && Number.isFinite(o.updatedAt) ? Math.floor(o.updatedAt) : Date.now(),
  }
}

async function loadAllOverrides(): Promise<AppearanceRefContextOverride[]> {
  const raw = await personaDb.getPhoneKv(KV_KEY)
  if (!Array.isArray(raw)) return []
  const out: AppearanceRefContextOverride[] = []
  for (const row of raw) {
    const normalized = normalizeOverride(row)
    if (normalized) out.push(normalized)
  }
  return out
}

async function saveAllOverrides(rows: AppearanceRefContextOverride[]): Promise<void> {
  await personaDb.setPhoneKv(KV_KEY, rows)
  emitWeChatStorageChanged()
}

export async function getAppearanceRefContextOverride(
  playerIdentityId: string,
  characterId: string,
  context: AppearanceRefContext,
): Promise<AppearanceRefContextOverride | null> {
  const pid = normalizeAppearanceRefPlayerIdentityId(playerIdentityId)
  const cid = characterId.trim()
  if (!pid || !cid) return null
  const all = await loadAllOverrides()
  return all.find((r) => r.playerIdentityId === pid && r.characterId === cid && r.context === context) ?? null
}

/** 无有效玩家身份时，按角色+场景回退查找本页独立配置（含历史用 __none__ 存的 fork） */
export async function findAppearanceRefContextOverrideForCharacter(
  characterId: string,
  context: AppearanceRefContext,
  preferredPlayerIdentityId?: string | null,
): Promise<AppearanceRefContextOverride | null> {
  const cid = characterId.trim()
  if (!cid) return null
  const preferred = normalizeAppearanceRefPlayerIdentityId(preferredPlayerIdentityId)
  const all = await loadAllOverrides()
  const candidates = all.filter((r) => r.characterId === cid && r.context === context && r.forked === true)
  if (!candidates.length) return null
  const hasLocalContent = (r: AppearanceRefContextOverride) =>
    (r.characterRefImages?.length ?? 0) > 0 ||
    (r.userRefImages?.length ?? 0) > 0 ||
    !!r.characterRefNote?.trim() ||
    !!r.userRefNote?.trim()
  const withContent = candidates.filter(hasLocalContent)
  const pool = withContent.length ? withContent : candidates
  if (preferred) {
    const exact = pool.find((r) => r.playerIdentityId === preferred)
    if (exact) return exact
  }
  return [...pool].sort((a, b) => b.updatedAt - a.updatedAt)[0] ?? null
}

export function normalizeAppearanceRefPlayerIdentityId(raw?: string | null): string {
  const p = typeof raw === 'string' ? raw.trim() : ''
  if (!p || p === '__none__') return ''
  return p
}

export async function upsertAppearanceRefContextOverride(
  patch: Omit<AppearanceRefContextOverride, 'updatedAt'> & { updatedAt?: number },
): Promise<AppearanceRefContextOverride> {
  const pid = normalizeAppearanceRefPlayerIdentityId(patch.playerIdentityId)
  const cid = patch.characterId.trim()
  if (!pid || !cid) throw new Error('appearance_ref_binding_ids_required')
  const key = bindingKey(pid, cid, patch.context)
  const all = await loadAllOverrides()
  const idx = all.findIndex((r) => bindingKey(r.playerIdentityId, r.characterId, r.context) === key)
  const next: AppearanceRefContextOverride = {
    ...patch,
    playerIdentityId: pid,
    characterId: cid,
    forked: patch.forked === true,
    characterRefImages: parseCharacterAppearanceRefImages(patch.characterRefImages),
    characterRefNote: normalizeAppearanceRefNote(patch.characterRefNote),
    userRefImages: parseCharacterAppearanceRefImages(patch.userRefImages),
    userRefNote: normalizeAppearanceRefNote(patch.userRefNote),
    updatedAt: patch.updatedAt ?? Date.now(),
  }
  if (idx >= 0) all[idx] = next
  else all.push(next)
  await saveAllOverrides(all)
  return next
}

export async function clearAppearanceRefContextOverride(
  playerIdentityId: string,
  characterId: string,
  context: AppearanceRefContext,
): Promise<void> {
  const pid = normalizeAppearanceRefPlayerIdentityId(playerIdentityId)
  const cid = characterId.trim()
  if (!pid || !cid) return
  const key = bindingKey(pid, cid, context)
  const all = await loadAllOverrides()
  const filtered = all.filter((r) => bindingKey(r.playerIdentityId, r.characterId, r.context) !== key)
  if (filtered.length === all.length) return
  await saveAllOverrides(filtered)
}

export function bundleFromCharacterFields(
  imagesRaw: unknown,
  legacyUrl?: string,
  noteRaw?: string,
): AppearanceRefBundle {
  return {
    images: parseCharacterAppearanceRefImages(imagesRaw, legacyUrl),
    note: normalizeAppearanceRefNote(noteRaw),
  }
}
