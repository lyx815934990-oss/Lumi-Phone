import { personaDb } from '../../newFriendsPersona/idb'
import { emptyBingeDataset, hasBingeContent, type BingeDataset, type MediaKind } from './types'
import { MEDIA_KINDS } from './types'

const BINGE_KV_PREFIX = 'checkPhone.binge.v1:'

function bingeKey(characterId: string) {
  return `${BINGE_KV_PREFIX}${String(characterId || 'unknown').trim()}`
}

function normalizeShare(raw: unknown): Record<MediaKind, number> {
  const base = emptyBingeDataset().kindShare
  if (!raw || typeof raw !== 'object') return base
  const o = raw as Record<string, unknown>
  const next = { ...base }
  for (const k of MEDIA_KINDS) {
    const n = Number(o[k])
    if (Number.isFinite(n) && n >= 0) next[k] = n
  }
  const sum = MEDIA_KINDS.reduce((s, k) => s + next[k], 0)
  if (sum <= 0) return base
  for (const k of MEDIA_KINDS) next[k] = next[k] / sum
  return next
}

export function normalizeBingeDataset(raw: unknown): BingeDataset {
  if (!raw || typeof raw !== 'object') return emptyBingeDataset()
  const r = raw as Partial<BingeDataset>
  return {
    monthHours: typeof r.monthHours === 'number' && Number.isFinite(r.monthHours) ? Math.max(0, r.monthHours) : 0,
    kindShare: normalizeShare(r.kindShare),
    items: Array.isArray(r.items) ? r.items.filter((x) => x && typeof x === 'object' && typeof x.id === 'string') : [],
    sessions: Array.isArray(r.sessions)
      ? r.sessions.filter((x) => x && typeof x === 'object' && typeof x.id === 'string')
      : [],
    forums: Array.isArray(r.forums) ? r.forums.filter((x) => x && typeof x === 'object' && typeof x.id === 'string') : [],
    searches: Array.isArray(r.searches)
      ? r.searches.filter((x) => x && typeof x === 'object' && typeof x.id === 'string')
      : [],
  }
}

export async function loadBingeDataset(characterId: string): Promise<BingeDataset> {
  const raw = await personaDb.getPhoneKv(bingeKey(characterId))
  return normalizeBingeDataset(raw)
}

export async function saveBingeDataset(characterId: string, dataset: BingeDataset): Promise<void> {
  await personaDb.setPhoneKv(bingeKey(characterId), normalizeBingeDataset(dataset))
}

export async function clearBingeDataset(characterId: string): Promise<void> {
  await saveBingeDataset(characterId, emptyBingeDataset())
}

export { hasBingeContent }
