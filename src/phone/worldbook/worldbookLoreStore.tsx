/* eslint-disable react-refresh/only-export-components */
import { useEffect, useMemo, useSyncExternalStore, type ReactNode } from 'react'
import {
  normalizeArchiveEntryPartial,
  normalizeLoreArchiveTag,
  normalizeLoreArchiveTagCatalog,
  normalizeTagIds,
  type LoreArchiveStoreShapeV2,
  type LoreArchiveStoreShapeV3,
  type LoreArchiveTag,
  type LoreArchiveTagColorKey,
  type LoreEntry,
  LORE_ARCHIVE_TAGS_CAP,
  LORE_ARCHIVE_TAG_NAME_MAX,
} from './loreArchiveTypes'
import {
  type LoreArchiveBuiltinPresetId,
  type LoreArchiveBuiltinPresetToggles,
  resolveLoreArchiveBuiltinPresetToggles,
} from './loreArchiveBuiltinPresets'
import { personaDb, pullPhoneKvWithLocalStorageLegacy } from '../apps/wechat/newFriendsPersona/idb'

export const LUMI_LORE_ARCHIVE_KV_KEY = 'lumi-lore-archive-v1'

type Snap = {
  entries: LoreEntry[]
  tags: LoreArchiveTag[]
  hydrated: boolean
  builtinPresets: Record<LoreArchiveBuiltinPresetId, boolean>
}

let snap: Snap = {
  entries: [],
  tags: [],
  hydrated: false,
  builtinPresets: resolveLoreArchiveBuiltinPresetToggles(null),
}
const listeners = new Set<() => void>()
let persistTimer: ReturnType<typeof setTimeout> | null = null

/** 启动时先从 localStorage 同步预热，避免异步 IDB 未完成前 AI 注入读到空档案室 */
;(function bootstrapLoreArchiveFromLocalStorage() {
  try {
    const raw = localStorage.getItem(LUMI_LORE_ARCHIVE_KV_KEY)
    if (!raw?.trim()) return
    const parsed = parseStore(JSON.parse(raw) as unknown)
    snap = {
      entries: parsed.entries,
      tags: parsed.tags,
      hydrated: false,
      builtinPresets: resolveLoreArchiveBuiltinPresetToggles(parsed.builtinPresets),
    }
  } catch {
    // ignore corrupt bootstrap
  }
})()

function emit() {
  listeners.forEach((l) => l())
}

/** v1 / 无 version 字段时的法则条目 */
function parseLegacyLoreFlat(raw: unknown): LoreEntry[] {
  if (!raw || typeof raw !== 'object') return []
  const arr = (raw as Record<string, unknown>).entries
  if (!Array.isArray(arr)) return []
  const out: LoreEntry[] = []
  for (const it of arr) {
    if (!it || typeof it !== 'object') continue
    const o = it as Record<string, unknown>
    const id = typeof o.id === 'string' ? o.id.trim() : ''
    if (!id) continue
    const hasNewShape = o.plateScope != null || o.characterScope != null
    if (hasNewShape) {
      const e = normalizeArchiveEntryPartial(o as Record<string, unknown>)
      if (e) out.push(e)
      continue
    }
    const isGlobal = o.isGlobal === true
    const targetIds = Array.isArray(o.targetIds)
      ? o.targetIds.map((x) => String(x ?? '').trim()).filter(Boolean)
      : []
    out.push({
      id,
      title: typeof o.title === 'string' ? o.title : '',
      content: typeof o.content === 'string' ? o.content : '',
      enabled: true,
      plateScope: { mode: 'all' },
      characterScope: isGlobal ? { mode: 'all' } : { mode: 'characters', ids: targetIds },
      updatedAt: typeof o.updatedAt === 'number' && Number.isFinite(o.updatedAt) ? o.updatedAt : Date.now(),
    })
  }
  return out
}

function parseArchiveEntriesArray(raw: unknown): LoreEntry[] {
  if (!Array.isArray(raw)) return []
  const out: LoreEntry[] = []
  for (const it of raw) {
    if (!it || typeof it !== 'object') continue
    const e = normalizeArchiveEntryPartial(it as Record<string, unknown>)
    if (e) out.push(e)
  }
  return out
}

function migrateV2ToUnified(v2: LoreArchiveStoreShapeV2): LoreEntry[] {
  const out: LoreEntry[] = []
  for (const e of v2.entries) {
    out.push({
      id: e.id,
      title: e.title,
      content: e.content,
      enabled: true,
      plateScope: { mode: 'all' },
      characterScope: e.isGlobal ? { mode: 'all' } : { mode: 'characters', ids: e.targetIds ?? [] },
      updatedAt: e.updatedAt,
    })
  }
  for (const wb of v2.wechat?.worldBooks ?? []) {
    for (const it of wb.items ?? []) {
      out.push({
        id: `${wb.id}::${it.id}`,
        title: `${wb.name}｜${it.name}`,
        content: typeof it.content === 'string' ? it.content : '',
        enabled: wb.enabled !== false && it.enabled !== false,
        plateScope: wb.scope,
        characterScope: { mode: 'all' },
        updatedAt: Math.max(wb.updatedAt ?? 0, it.updatedAt ?? 0) || Date.now(),
      })
    }
  }
  return out
}

function pruneEntryTagIds(entries: LoreEntry[], validTagIds: Set<string>): LoreEntry[] {
  return entries.map((e) => {
    const nextIds = normalizeTagIds(e.tagIds).filter((id) => validTagIds.has(id))
    const prev = normalizeTagIds(e.tagIds)
    if (nextIds.length === prev.length && nextIds.every((id, i) => id === prev[i])) return e
    const next: LoreEntry = { ...e }
    if (nextIds.length) next.tagIds = nextIds
    else delete next.tagIds
    return next
  })
}

function parseStore(raw: unknown): {
  entries: LoreEntry[]
  tags: LoreArchiveTag[]
  builtinPresets: LoreArchiveBuiltinPresetToggles
} {
  if (!raw || typeof raw !== 'object') {
    return { entries: [], tags: [], builtinPresets: {} }
  }
  const rec = raw as Record<string, unknown>
  const ver = rec.version
  const builtinPresets =
    rec.builtinPresets && typeof rec.builtinPresets === 'object'
      ? (rec.builtinPresets as LoreArchiveBuiltinPresetToggles)
      : {}
  const tags = normalizeLoreArchiveTagCatalog(rec.tags)
  const validTagIds = new Set(tags.map((t) => t.id))

  if (ver === 3) {
    const v3 = rec as LoreArchiveStoreShapeV3
    return {
      entries: pruneEntryTagIds(parseArchiveEntriesArray(v3.entries), validTagIds),
      tags,
      builtinPresets,
    }
  }

  if (ver === 2) {
    return {
      entries: migrateV2ToUnified(rec as unknown as LoreArchiveStoreShapeV2),
      tags,
      builtinPresets,
    }
  }

  return { entries: parseLegacyLoreFlat(raw), tags, builtinPresets }
}

function schedulePersist() {
  if (persistTimer != null) clearTimeout(persistTimer)
  persistTimer = setTimeout(() => {
    persistTimer = null
    const payload: LoreArchiveStoreShapeV3 = {
      version: 3,
      entries: snap.entries,
      tags: snap.tags,
      builtinPresets: {
        lumiDoctrineOfLove: snap.builtinPresets.lumiDoctrineOfLove,
        activeConfession: snap.builtinPresets.activeConfession,
        pureRestrainLove: snap.builtinPresets.pureRestrainLove,
        offlineRichInnerOs: snap.builtinPresets.offlineRichInnerOs,
        offlineFashionStyling: snap.builtinPresets.offlineFashionStyling,
        offlineCoupleIntimacyPoses: snap.builtinPresets.offlineCoupleIntimacyPoses,
      },
      weibo: { _reserved: true },
    }
    void personaDb.setPhoneKv(LUMI_LORE_ARCHIVE_KV_KEY, payload).catch(() => {})
    try {
      localStorage.setItem(LUMI_LORE_ARCHIVE_KV_KEY, JSON.stringify(payload))
    } catch {
      // ignore
    }
  }, 520)
}

export function getWorldbookLoreEntriesSnapshot(): LoreEntry[] {
  return snap.entries
}

export function getLoreArchiveTagsSnapshot(): LoreArchiveTag[] {
  return snap.tags
}

export function subscribeWorldbookLore(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnap(): Snap {
  return snap
}

export function upsertLoreEntry(entry: LoreEntry) {
  const validTagIds = new Set(snap.tags.map((t) => t.id))
  const tagIds = normalizeTagIds(entry.tagIds).filter((id) => validTagIds.has(id))
  const normalized =
    normalizeArchiveEntryPartial({
      id: entry.id,
      title: entry.title,
      content: entry.content,
      enabled: entry.enabled !== false,
      plateScope: entry.plateScope,
      characterScope: entry.characterScope,
      tagIds,
      updatedAt: entry.updatedAt,
    }) ?? entry
  const next = [...snap.entries.filter((e) => e.id !== normalized.id), normalized].sort(
    (a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0),
  )
  snap = { ...snap, entries: next }
  emit()
  schedulePersist()
}

export function removeLoreEntry(id: string) {
  const tid = String(id || '').trim()
  if (!tid) return
  const next = snap.entries.filter((e) => e.id !== tid)
  snap = { ...snap, entries: next }
  emit()
  schedulePersist()
}

export function upsertLoreArchiveTag(input: {
  id?: string
  name: string
  colorKey?: LoreArchiveTagColorKey
}): LoreArchiveTag | null {
  const name = String(input.name ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, LORE_ARCHIVE_TAG_NAME_MAX)
  if (!name) return null

  const now = Date.now()
  const existingId = String(input.id ?? '').trim()
  if (existingId) {
    const prev = snap.tags.find((t) => t.id === existingId)
    if (!prev) return null
    const dupName = snap.tags.some(
      (t) => t.id !== existingId && t.name.toLowerCase() === name.toLowerCase(),
    )
    if (dupName) return null
    const nextTag: LoreArchiveTag = {
      ...prev,
      name,
      colorKey: input.colorKey ?? prev.colorKey ?? 'sand',
      updatedAt: now,
    }
    snap = {
      ...snap,
      tags: snap.tags.map((t) => (t.id === existingId ? nextTag : t)),
    }
    emit()
    schedulePersist()
    return nextTag
  }

  if (snap.tags.length >= LORE_ARCHIVE_TAGS_CAP) return null
  const dupName = snap.tags.some((t) => t.name.toLowerCase() === name.toLowerCase())
  if (dupName) return null
  const created: LoreArchiveTag = {
    id: crypto.randomUUID(),
    name,
    colorKey: input.colorKey ?? 'sand',
    updatedAt: now,
  }
  const normalized = normalizeLoreArchiveTag(created)
  if (!normalized) return null
  snap = { ...snap, tags: [...snap.tags, normalized] }
  emit()
  schedulePersist()
  return normalized
}

export function removeLoreArchiveTag(id: string) {
  const tid = String(id || '').trim()
  if (!tid) return
  const nextTags = snap.tags.filter((t) => t.id !== tid)
  const valid = new Set(nextTags.map((t) => t.id))
  snap = {
    ...snap,
    tags: nextTags,
    entries: pruneEntryTagIds(snap.entries, valid),
  }
  emit()
  schedulePersist()
}

export function getLoreArchiveBuiltinPresetTogglesSnapshot(): Record<LoreArchiveBuiltinPresetId, boolean> {
  return { ...snap.builtinPresets }
}

export function setLoreArchiveBuiltinPresetEnabled(id: LoreArchiveBuiltinPresetId, enabled: boolean) {
  snap = {
    ...snap,
    builtinPresets: {
      ...snap.builtinPresets,
      [id]: enabled,
    },
  }
  emit()
  schedulePersist()
}

/** 微信深度注销：清空档案室内存并删除持久化键（由 {@link LUMI_LORE_ARCHIVE_KV_KEY} 承载） */
export function resetWorldbookLoreArchiveAfterWeChatErase(): void {
  snap = {
    entries: [],
    tags: [],
    hydrated: true,
    builtinPresets: resolveLoreArchiveBuiltinPresetToggles(null),
  }
  emit()
  void personaDb.deletePhoneKv(LUMI_LORE_ARCHIVE_KV_KEY).catch(() => {})
  try {
    localStorage.removeItem(LUMI_LORE_ARCHIVE_KV_KEY)
  } catch {
    // ignore
  }
}

export function WorldbookLoreProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const raw = await pullPhoneKvWithLocalStorageLegacy(LUMI_LORE_ARCHIVE_KV_KEY, [LUMI_LORE_ARCHIVE_KV_KEY])
        if (cancelled) return
        const parsed = parseStore(raw)
        snap = {
          entries: parsed.entries,
          tags: parsed.tags,
          hydrated: true,
          builtinPresets: resolveLoreArchiveBuiltinPresetToggles(parsed.builtinPresets),
        }
        emit()
        schedulePersist()
      } catch {
        if (!cancelled) {
          snap = { ...snap, hydrated: true }
          emit()
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])
  return children
}

export function useWorldbookStore() {
  const state = useSyncExternalStore(subscribeWorldbookLore, getSnap, getSnap)
  return useMemo(
    () => ({
      hydrated: state.hydrated,
      entries: state.entries,
      tags: state.tags,
      builtinPresets: state.builtinPresets,
      upsertEntry: upsertLoreEntry,
      removeEntry: removeLoreEntry,
      upsertTag: upsertLoreArchiveTag,
      removeTag: removeLoreArchiveTag,
      setBuiltinPresetEnabled: setLoreArchiveBuiltinPresetEnabled,
    }),
    [state.entries, state.tags, state.hydrated, state.builtinPresets],
  )
}
