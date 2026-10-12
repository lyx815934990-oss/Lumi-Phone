import {
  COT_SYSTEM_PRESET_ID,
  type CoTEntry,
  type CotExportPayload,
  type CoTPreset,
  type CotPresetKind,
  type CotPresetScope,
  type CotStoreState,
} from './cotTypes'
import {
  buildPresetEffectiveText,
  estimateTextTokens,
  sortCotEntriesDisplay,
} from './cotTokens'

const LS_KEY = 'lumi-thinking-chain-presets:v1'
/** 预设套数仍封顶，避免整库膨胀；单套内条目不设上限 */
const MAX_PRESETS = 48
const MAX_NAME = 40
const MAX_TITLE = 64
const MAX_CONTENT = 100_000
const MAX_TAG = 16
const MAX_TAGS = 12

type Listener = () => void

let cache: CotStoreState | null = null
let snapshotForStore: CotStoreState | null = null
const listeners = new Set<Listener>()

function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function cloneState(s: CotStoreState): CotStoreState {
  return {
    activeReplyStyleOnlineId: s.activeReplyStyleOnlineId,
    activeReplyStyleOfflineId: s.activeReplyStyleOfflineId,
    activeThinkingOnlineId: s.activeThinkingOnlineId,
    activeThinkingOfflineId: s.activeThinkingOfflineId,
    presets: s.presets.map((p) => ({
      ...p,
      tags: [...p.tags],
      entries: p.entries.map((e) => ({
        ...e,
        tags: [...(e.tags ?? [])],
      })),
    })),
  }
}

function notify() {
  for (const l of listeners) l()
}

function normalizePresetScope(raw: unknown): CotPresetScope {
  const s = String(raw ?? '').trim()
  if (s === 'online' || s === 'offline' || s === 'both') return s
  return 'both'
}

function normalizePresetKind(raw: unknown): CotPresetKind {
  const s = String(raw ?? '').trim()
  if (s === 'replyStyle') return 'replyStyle'
  return 'thinkingChain'
}

function normalizeTags(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  const out: string[] = []
  const seen = new Set<string>()
  for (const row of raw) {
    const t = String(row ?? '').trim().slice(0, MAX_TAG)
    if (!t || seen.has(t)) continue
    seen.add(t)
    out.push(t)
    if (out.length >= MAX_TAGS) break
  }
  return out
}

function normalizeEntry(raw: unknown, index: number): CoTEntry | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const id = String(o.id ?? '').trim() || uid('cte')
  const title = String(o.title ?? '').trim().slice(0, MAX_TITLE) || `条目 ${index + 1}`
  const content = String(o.content ?? '').slice(0, MAX_CONTENT)
  const enabled = o.enabled !== false
  const order =
    typeof o.order === 'number' && Number.isFinite(o.order) ? Math.floor(o.order) : index + 1
  const tags = normalizeTags(o.tags)
  return { id, order, title, content, enabled, tags }
}

function normalizePreset(raw: unknown): CoTPreset | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const id = String(o.id ?? '').trim()
  if (!id || id === COT_SYSTEM_PRESET_ID) return null
  const name = String(o.name ?? '').trim().slice(0, MAX_NAME) || '未命名预设'
  const entriesRaw = Array.isArray(o.entries) ? o.entries : []
  const entries: CoTEntry[] = []
  for (let i = 0; i < entriesRaw.length; i++) {
    const e = normalizeEntry(entriesRaw[i], i)
    if (e) entries.push(e)
  }
  entries.sort((a, b) => a.order - b.order)
  const updatedAt =
    typeof o.updatedAt === 'number' && Number.isFinite(o.updatedAt) ? o.updatedAt : Date.now()
  const scope = normalizePresetScope(o.scope ?? o.defaultScope)
  const kind = normalizePresetKind(o.kind)
  const tags = normalizeTags(o.tags)
  return { id, name, entries, updatedAt, scope, kind, tags }
}

function resolveActiveId(
  raw: unknown,
  presets: CoTPreset[],
  kind: CotPresetKind,
  fallback: string,
): string {
  const id = String(raw ?? '').trim() || fallback
  if (id === COT_SYSTEM_PRESET_ID) return COT_SYSTEM_PRESET_ID
  const p = presets.find((x) => x.id === id)
  return p && p.kind === kind ? id : COT_SYSTEM_PRESET_ID
}

function emptyState(): CotStoreState {
  return {
    activeReplyStyleOnlineId: COT_SYSTEM_PRESET_ID,
    activeReplyStyleOfflineId: COT_SYSTEM_PRESET_ID,
    activeThinkingOnlineId: COT_SYSTEM_PRESET_ID,
    activeThinkingOfflineId: COT_SYSTEM_PRESET_ID,
    presets: [],
  }
}

function sanitizePair(
  presets: CoTPreset[],
  kind: CotPresetKind,
  onlineId: string,
  offlineId: string,
): { online: string; offline: string } {
  const byId = new Map(presets.filter((p) => p.kind === kind).map((p) => [p.id, p]))
  let online = onlineId
  let offline = offlineId
  const onlineP = online === COT_SYSTEM_PRESET_ID ? null : byId.get(online) ?? null
  const offlineP = offline === COT_SYSTEM_PRESET_ID ? null : byId.get(offline) ?? null

  if (online !== COT_SYSTEM_PRESET_ID && !onlineP) online = COT_SYSTEM_PRESET_ID
  if (offline !== COT_SYSTEM_PRESET_ID && !offlineP) offline = COT_SYSTEM_PRESET_ID

  if (onlineP?.scope === 'both') {
    offline = online
  } else if (offlineP?.scope === 'both') {
    online = offline
  } else {
    if (onlineP && onlineP.scope !== 'online') online = COT_SYSTEM_PRESET_ID
    if (offlineP && offlineP.scope !== 'offline') offline = COT_SYSTEM_PRESET_ID
  }
  return { online, offline }
}

function sanitizeActives(s: CotStoreState): CotStoreState {
  const style = sanitizePair(
    s.presets,
    'replyStyle',
    s.activeReplyStyleOnlineId,
    s.activeReplyStyleOfflineId,
  )
  const thinking = sanitizePair(
    s.presets,
    'thinkingChain',
    s.activeThinkingOnlineId,
    s.activeThinkingOfflineId,
  )
  return {
    presets: s.presets,
    activeReplyStyleOnlineId: style.online,
    activeReplyStyleOfflineId: style.offline,
    activeThinkingOnlineId: thinking.online,
    activeThinkingOfflineId: thinking.offline,
  }
}

function readRaw(): CotStoreState {
  if (typeof localStorage === 'undefined') return emptyState()
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return emptyState()
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object') return emptyState()
    const o = parsed as Record<string, unknown>
    const presets: CoTPreset[] = []
    if (Array.isArray(o.presets)) {
      for (const row of o.presets) {
        const p = normalizePreset(row)
        if (p) presets.push(p)
        if (presets.length >= MAX_PRESETS) break
      }
    }

    let thinkingOnline = resolveActiveId(
      o.activeThinkingOnlineId ?? o.activeOnlineId,
      presets,
      'thinkingChain',
      COT_SYSTEM_PRESET_ID,
    )
    let thinkingOffline = resolveActiveId(
      o.activeThinkingOfflineId ?? o.activeOfflineId,
      presets,
      'thinkingChain',
      COT_SYSTEM_PRESET_ID,
    )
    if (
      o.activeThinkingOnlineId == null &&
      o.activeThinkingOfflineId == null &&
      o.activeOnlineId == null &&
      o.activeOfflineId == null &&
      o.activeId != null
    ) {
      const legacy = resolveActiveId(o.activeId, presets, 'thinkingChain', COT_SYSTEM_PRESET_ID)
      thinkingOnline = legacy
      thinkingOffline = legacy
    }

    const replyOnline = resolveActiveId(
      o.activeReplyStyleOnlineId,
      presets,
      'replyStyle',
      COT_SYSTEM_PRESET_ID,
    )
    const replyOffline = resolveActiveId(
      o.activeReplyStyleOfflineId,
      presets,
      'replyStyle',
      COT_SYSTEM_PRESET_ID,
    )

    return sanitizeActives({
      presets,
      activeReplyStyleOnlineId: replyOnline,
      activeReplyStyleOfflineId: replyOffline,
      activeThinkingOnlineId: thinkingOnline,
      activeThinkingOfflineId: thinkingOffline,
    })
  } catch {
    return emptyState()
  }
}

function ensureCache(): CotStoreState {
  if (!cache) cache = readRaw()
  return cache
}

function persist(next: CotStoreState) {
  const cleaned = sanitizeActives(next)
  cache = cleaned
  snapshotForStore = cloneState(cleaned)
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(LS_KEY, JSON.stringify(cleaned))
    }
  } catch {
    /* ignore */
  }
  notify()
}

export function subscribeCotStore(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getCotStoreSnapshot(): CotStoreState {
  const s = ensureCache()
  if (!snapshotForStore) snapshotForStore = cloneState(s)
  return snapshotForStore
}

export function getCotStoreSnapshotForStore(): CotStoreState {
  return getCotStoreSnapshot()
}

export function getKindActiveIds(
  s: CotStoreState,
  kind: CotPresetKind,
): { online: string; offline: string } {
  if (kind === 'replyStyle') {
    return {
      online: s.activeReplyStyleOnlineId,
      offline: s.activeReplyStyleOfflineId,
    }
  }
  return {
    online: s.activeThinkingOnlineId,
    offline: s.activeThinkingOfflineId,
  }
}

function activeIdsForKind(
  s: CotStoreState,
  kind: CotPresetKind,
): { online: string; offline: string } {
  return getKindActiveIds(s, kind)
}

function withActiveIds(
  s: CotStoreState,
  kind: CotPresetKind,
  online: string,
  offline: string,
): CotStoreState {
  if (kind === 'replyStyle') {
    return {
      ...s,
      activeReplyStyleOnlineId: online,
      activeReplyStyleOfflineId: offline,
    }
  }
  return {
    ...s,
    activeThinkingOnlineId: online,
    activeThinkingOfflineId: offline,
  }
}

/** 兼容旧调用 `isGeneralModeActive(store)`；也可 `isGeneralModeActive('replyStyle', store)` */
export function isGeneralModeActive(
  a?: CotStoreState | CotPresetKind,
  b?: CotStoreState,
): boolean {
  let kind: CotPresetKind = 'thinkingChain'
  let st: CotStoreState
  if (a === 'replyStyle' || a === 'thinkingChain') {
    kind = a
    st = b ?? ensureCache()
  } else {
    st = (a as CotStoreState | undefined) ?? ensureCache()
  }
  const { online, offline } = activeIdsForKind(st, kind)
  if (online === COT_SYSTEM_PRESET_ID) return false
  if (online !== offline) return false
  const p = st.presets.find((x) => x.id === online)
  return p?.kind === kind && p.scope === 'both'
}

/** 启用预设（按 kind + scope 写入对应通道） */
export function activateCotPreset(id: string): void {
  const s = ensureCache()
  const nextId = String(id || '').trim() || COT_SYSTEM_PRESET_ID
  if (nextId === COT_SYSTEM_PRESET_ID) return

  const preset = s.presets.find((p) => p.id === nextId)
  if (!preset) return
  const kind = preset.kind
  const cur = activeIdsForKind(s, kind)

  if (preset.scope === 'both') {
    persist(withActiveIds(s, kind, nextId, nextId))
    return
  }
  if (preset.scope === 'online') {
    const offline = isGeneralModeActive(kind, s)
      ? COT_SYSTEM_PRESET_ID
      : cur.offline
    persist(withActiveIds(s, kind, nextId, offline))
    return
  }
  if (preset.scope === 'offline') {
    const online = isGeneralModeActive(kind, s)
      ? COT_SYSTEM_PRESET_ID
      : cur.online
    persist(withActiveIds(s, kind, online, nextId))
  }
}

/** 将某一场景恢复为系统内置（指定 kind） */
export function activateSystemForScene(
  scene: 'online' | 'offline' | 'both',
  kind: CotPresetKind = 'thinkingChain',
): void {
  const s = ensureCache()
  const cur = activeIdsForKind(s, kind)
  if (scene === 'both') {
    persist(withActiveIds(s, kind, COT_SYSTEM_PRESET_ID, COT_SYSTEM_PRESET_ID))
    return
  }
  if (isGeneralModeActive(kind, s)) {
    persist(withActiveIds(s, kind, COT_SYSTEM_PRESET_ID, COT_SYSTEM_PRESET_ID))
    return
  }
  if (scene === 'online') {
    persist(withActiveIds(s, kind, COT_SYSTEM_PRESET_ID, cur.offline))
  } else {
    persist(withActiveIds(s, kind, cur.online, COT_SYSTEM_PRESET_ID))
  }
}

/** @deprecated */
export function setActiveCotPresetId(id: string): void {
  activateCotPreset(id)
}

export function createEmptyCotPreset(
  name = '新预设',
  scope: CotPresetScope = 'both',
  kind: CotPresetKind = 'thinkingChain',
): CoTPreset {
  const defaultName =
    kind === 'replyStyle'
      ? name === '新预设'
        ? '新提示词预设'
        : name
      : name === '新预设'
        ? '新思维链预设'
        : name
  return {
    id: uid('ctp'),
    name: defaultName.slice(0, MAX_NAME),
    entries: [],
    scope,
    kind,
    tags: [],
    updatedAt: Date.now(),
  }
}

export function createEmptyCotEntry(order: number): CoTEntry {
  return {
    id: uid('cte'),
    order,
    title: `条目 ${order}`,
    content: '',
    enabled: true,
    tags: [],
  }
}

export function saveCotPreset(
  preset: CoTPreset,
  opts?: { activate?: boolean },
): CoTPreset | null {
  const s = ensureCache()
  const normalized = normalizePreset({ ...preset, updatedAt: Date.now() })
  if (!normalized) return null
  const idx = s.presets.findIndex((p) => p.id === normalized.id)
  let presets: CoTPreset[]
  if (idx >= 0) {
    presets = s.presets.map((p, i) => (i === idx ? normalized : p))
  } else {
    if (s.presets.length >= MAX_PRESETS) return null
    presets = [...s.presets, normalized]
  }
  const next: CotStoreState = { ...s, presets }
  if (opts?.activate) {
    cache = next
    activateCotPreset(normalized.id)
    return normalized
  }
  persist(next)
  return normalized
}

export function duplicateCotPreset(id: string): CoTPreset | null {
  const s = ensureCache()
  const src = s.presets.find((p) => p.id === id)
  if (!src) return null
  if (s.presets.length >= MAX_PRESETS) return null
  const copy: CoTPreset = {
    ...src,
    id: uid('ctp'),
    name: `${src.name} 副本`.slice(0, MAX_NAME),
    kind: src.kind,
    tags: [...src.tags],
    entries: src.entries.map((e) => ({
      ...e,
      id: uid('cte'),
      tags: [...(e.tags ?? [])],
    })),
    updatedAt: Date.now(),
  }
  persist({ ...s, presets: [...s.presets, copy] })
  return copy
}

/** 思维链 ↔ 提示词：只改 kind，条目内容不变；若原已启用则转到新类型后继续启用 */
export function convertCotPresetKind(
  id: string,
): { ok: true; preset: CoTPreset; to: CotPresetKind } | { ok: false; error: string } {
  const s = ensureCache()
  const src = s.presets.find((p) => p.id === id)
  if (!src) return { ok: false, error: '预设不存在' }
  const from: CotPresetKind = src.kind ?? 'thinkingChain'
  const to: CotPresetKind = from === 'replyStyle' ? 'thinkingChain' : 'replyStyle'
  const oldActives = activeIdsForKind(s, from)
  const wasActive =
    oldActives.online === id || oldActives.offline === id

  let next: CotStoreState = {
    ...s,
    presets: s.presets.map((p) =>
      p.id === id
        ? {
            ...p,
            kind: to,
            tags: [...p.tags],
            entries: p.entries.map((e) => ({ ...e, tags: [...(e.tags ?? [])] })),
            updatedAt: Date.now(),
          }
        : p,
    ),
  }
  // 从旧类型启用位摘掉
  next = withActiveIds(
    next,
    from,
    oldActives.online === id ? COT_SYSTEM_PRESET_ID : oldActives.online,
    oldActives.offline === id ? COT_SYSTEM_PRESET_ID : oldActives.offline,
  )
  persist(next)
  if (wasActive) activateCotPreset(id)
  const preset = ensureCache().presets.find((p) => p.id === id)
  if (!preset) return { ok: false, error: '转换失败' }
  return { ok: true, preset, to }
}

export function deleteCotPreset(id: string): void {
  const s = ensureCache()
  const presets = s.presets.filter((p) => p.id !== id)
  persist({
    presets,
    activeReplyStyleOnlineId:
      s.activeReplyStyleOnlineId === id ? COT_SYSTEM_PRESET_ID : s.activeReplyStyleOnlineId,
    activeReplyStyleOfflineId:
      s.activeReplyStyleOfflineId === id ? COT_SYSTEM_PRESET_ID : s.activeReplyStyleOfflineId,
    activeThinkingOnlineId:
      s.activeThinkingOnlineId === id ? COT_SYSTEM_PRESET_ID : s.activeThinkingOnlineId,
    activeThinkingOfflineId:
      s.activeThinkingOfflineId === id ? COT_SYSTEM_PRESET_ID : s.activeThinkingOfflineId,
  })
}

export function getActiveCotEntriesForScene(
  scene: 'online' | 'offline',
  kind: CotPresetKind = 'thinkingChain',
): CoTEntry[] {
  const s = ensureCache()
  const { online, offline } = activeIdsForKind(s, kind)
  const activeId = scene === 'online' ? online : offline
  if (activeId === COT_SYSTEM_PRESET_ID) return []
  const preset = s.presets.find((p) => p.id === activeId && p.kind === kind)
  if (!preset) return []
  if (preset.scope !== 'both' && preset.scope !== scene) return []
  return sortCotEntriesDisplay(preset.entries).filter(
    (e) => e.enabled && e.content.trim(),
  )
}

export function getActivePresetForScene(
  scene: 'online' | 'offline',
  kind: CotPresetKind = 'thinkingChain',
): CoTPreset | null {
  const s = ensureCache()
  const { online, offline } = activeIdsForKind(s, kind)
  const activeId = scene === 'online' ? online : offline
  if (activeId === COT_SYSTEM_PRESET_ID) return null
  return s.presets.find((p) => p.id === activeId && p.kind === kind) ?? null
}

export function getEffectiveCotTokenStats(kind?: CotPresetKind): {
  tokens: number
  onlineTokens: number
  offlineTokens: number
  shared: boolean
} {
  const kinds: CotPresetKind[] = kind ? [kind] : ['replyStyle', 'thinkingChain']
  let onlineTokens = 0
  let offlineTokens = 0
  let tokens = 0
  let shared = false
  for (const k of kinds) {
    const onlineP = getActivePresetForScene('online', k)
    const offlineP = getActivePresetForScene('offline', k)
    const oTok = estimateTextTokens(onlineP ? buildPresetEffectiveText(onlineP) : '')
    const fTok = estimateTextTokens(offlineP ? buildPresetEffectiveText(offlineP) : '')
    const bothSame =
      !!onlineP &&
      !!offlineP &&
      onlineP.id === offlineP.id &&
      onlineP.scope === 'both'
    if (bothSame) {
      onlineTokens += oTok
      offlineTokens += oTok
      tokens += oTok
      if (kinds.length === 1) shared = true
    } else {
      onlineTokens += oTok
      offlineTokens += fTok
      tokens += oTok + fTok
    }
  }
  return { tokens, onlineTokens, offlineTokens, shared }
}

export function exportCotPresetsJson(): string {
  const s = ensureCache()
  const payload: CotExportPayload = {
    version: 2,
    kind: 'lumi-prompt-cot',
    exportedAt: Date.now(),
    activeReplyStyleOnlineId: s.activeReplyStyleOnlineId,
    activeReplyStyleOfflineId: s.activeReplyStyleOfflineId,
    activeThinkingOnlineId: s.activeThinkingOnlineId,
    activeThinkingOfflineId: s.activeThinkingOfflineId,
    presets: cloneState(s).presets,
  }
  return JSON.stringify(payload, null, 2)
}

export function importCotPresetsJson(
  raw: string,
  mode: 'merge' | 'replace' = 'merge',
): { ok: true; imported: number } | { ok: false; error: string } {
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object') {
      return { ok: false, error: '文件格式无效' }
    }
    const o = parsed as Record<string, unknown>
    if (
      o.kind != null &&
      o.kind !== 'lumi-thinking-chain' &&
      o.kind !== 'lumi-prompt-cot'
    ) {
      return { ok: false, error: '不是提示词/思维链导出文件' }
    }
    const listRaw = Array.isArray(o.presets)
      ? o.presets
      : Array.isArray(o)
        ? o
        : null
    if (!listRaw) return { ok: false, error: '未找到 presets 列表' }

    const incoming: CoTPreset[] = []
    for (const row of listRaw) {
      const p = normalizePreset(row)
      if (p) incoming.push(p)
    }
    if (!incoming.length) return { ok: false, error: '没有可导入的预设' }

    const s = ensureCache()
    let presets: CoTPreset[]
    if (mode === 'replace') {
      presets = incoming.slice(0, MAX_PRESETS)
    } else {
      const map = new Map(s.presets.map((p) => [p.id, p]))
      for (const p of incoming) {
        if (map.has(p.id)) {
          map.set(p.id, p)
        } else if (map.size < MAX_PRESETS) {
          map.set(p.id, p)
        }
      }
      presets = Array.from(map.values())
    }

    const next: CotStoreState = {
      presets,
      activeReplyStyleOnlineId: resolveActiveId(
        o.activeReplyStyleOnlineId,
        presets,
        'replyStyle',
        s.activeReplyStyleOnlineId,
      ),
      activeReplyStyleOfflineId: resolveActiveId(
        o.activeReplyStyleOfflineId,
        presets,
        'replyStyle',
        s.activeReplyStyleOfflineId,
      ),
      activeThinkingOnlineId: resolveActiveId(
        o.activeThinkingOnlineId ?? o.activeOnlineId,
        presets,
        'thinkingChain',
        s.activeThinkingOnlineId,
      ),
      activeThinkingOfflineId: resolveActiveId(
        o.activeThinkingOfflineId ?? o.activeOfflineId,
        presets,
        'thinkingChain',
        s.activeThinkingOfflineId,
      ),
    }
    if (
      o.activeThinkingOnlineId == null &&
      o.activeThinkingOfflineId == null &&
      o.activeOnlineId == null &&
      o.activeOfflineId == null &&
      o.activeId != null
    ) {
      const legacy = resolveActiveId(o.activeId, presets, 'thinkingChain', COT_SYSTEM_PRESET_ID)
      next.activeThinkingOnlineId = legacy
      next.activeThinkingOfflineId = legacy
    }
    persist(next)
    return { ok: true, imported: incoming.length }
  } catch {
    return { ok: false, error: '解析 JSON 失败' }
  }
}

function triggerJsonDownload(json: string, filename: string): void {
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function cotExportFilename(label: string, kind: CotPresetKind = 'thinkingChain'): string {
  const safe = label.replace(/[\\/:*?"<>|]+/g, '_').trim().slice(0, 40) || '未命名'
  const prefix = kind === 'replyStyle' ? '【Lumi提示词】' : '【Lumi思维链】'
  return `${prefix}${safe}.json`
}

export function downloadCotExportFile(): void {
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
  triggerJsonDownload(exportCotPresetsJson(), cotExportFilename(`全部-${stamp}`, 'thinkingChain'))
}

export function downloadSingleCotPreset(presetId: string): boolean {
  const s = ensureCache()
  const preset = s.presets.find((p) => p.id === presetId)
  if (!preset) return false
  const payload: CotExportPayload = {
    version: 2,
    kind: 'lumi-prompt-cot',
    exportedAt: Date.now(),
    activeReplyStyleOnlineId: COT_SYSTEM_PRESET_ID,
    activeReplyStyleOfflineId: COT_SYSTEM_PRESET_ID,
    activeThinkingOnlineId: COT_SYSTEM_PRESET_ID,
    activeThinkingOfflineId: COT_SYSTEM_PRESET_ID,
    presets: [
      {
        ...preset,
        tags: [...preset.tags],
        entries: preset.entries.map((e) => ({
          ...e,
          enabled: e.enabled,
          tags: [...(e.tags ?? [])],
        })),
      },
    ],
  }
  triggerJsonDownload(
    JSON.stringify(payload, null, 2),
    cotExportFilename(preset.name || '未命名', preset.kind),
  )
  return true
}
