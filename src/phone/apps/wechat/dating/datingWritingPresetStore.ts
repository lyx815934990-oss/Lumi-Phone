/**
 * 约会剧情 · 写作预设持久化
 *
 * - 系统默认：走线下 must-inject（壳/沙盒/扮演核心/内置板块）
 * - 自定义预设：仅注入用户条目（已开启且有正文）；不注入内置线下提示词
 */

export const DATING_WRITING_SYSTEM_PRESET_ID = 'system'

export type DatingCustomWritingEntry = {
  id: string
  title: string
  content: string
  enabled: boolean
}

export type DatingCustomWritingPreset = {
  id: string
  name: string
  entries: DatingCustomWritingEntry[]
  updatedAt: number
}

export type DatingWritingPresetStoreState = {
  activeId: string
  presets: DatingCustomWritingPreset[]
}

const LS_KEY = 'wechat-dating-writing-presets:v3'
const MAX_PRESETS = 24
const MAX_ENTRIES = 40
const MAX_NAME = 32
const MAX_ENTRY_TITLE = 48
const MAX_ENTRY_CONTENT = 80_000

type Listener = () => void

let cache: DatingWritingPresetStoreState | null = null
/** useSyncExternalStore 要求 getSnapshot 在数据未变时返回同一引用 */
let snapshotForStore: DatingWritingPresetStoreState | null = null
const listeners = new Set<Listener>()

function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function cloneState(s: DatingWritingPresetStoreState): DatingWritingPresetStoreState {
  return {
    activeId: s.activeId,
    presets: s.presets.map((p) => ({
      ...p,
      entries: p.entries.map((e) => ({ ...e })),
    })),
  }
}

function notify() {
  for (const l of listeners) l()
}

function normalizeEntry(raw: unknown): DatingCustomWritingEntry | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const id = String(o.id ?? '').trim() || uid('dwe')
  const title = String(o.title ?? '').trim().slice(0, MAX_ENTRY_TITLE)
  const content = String(o.content ?? '').slice(0, MAX_ENTRY_CONTENT)
  const enabled = o.enabled !== false
  return { id, title, content, enabled }
}

function normalizePreset(raw: unknown): DatingCustomWritingPreset | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const id = String(o.id ?? '').trim()
  if (!id || id === DATING_WRITING_SYSTEM_PRESET_ID) return null
  const name = String(o.name ?? '').trim().slice(0, MAX_NAME) || '未命名预设'
  const entriesRaw = Array.isArray(o.entries) ? o.entries : []
  const entries: DatingCustomWritingEntry[] = []
  for (const row of entriesRaw) {
    const e = normalizeEntry(row)
    if (e) entries.push(e)
    if (entries.length >= MAX_ENTRIES) break
  }
  const updatedAt =
    typeof o.updatedAt === 'number' && Number.isFinite(o.updatedAt)
      ? o.updatedAt
      : Date.now()
  return { id, name, entries, updatedAt }
}

function readRaw(): DatingWritingPresetStoreState {
  if (typeof localStorage === 'undefined') {
    return { activeId: DATING_WRITING_SYSTEM_PRESET_ID, presets: [] }
  }
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return { activeId: DATING_WRITING_SYSTEM_PRESET_ID, presets: [] }
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object') {
      return { activeId: DATING_WRITING_SYSTEM_PRESET_ID, presets: [] }
    }
    const o = parsed as Record<string, unknown>
    const presets: DatingCustomWritingPreset[] = []
    if (Array.isArray(o.presets)) {
      for (const row of o.presets) {
        const p = normalizePreset(row)
        if (p) presets.push(p)
        if (presets.length >= MAX_PRESETS) break
      }
    }
    let activeId = String(o.activeId ?? DATING_WRITING_SYSTEM_PRESET_ID).trim()
    if (
      activeId !== DATING_WRITING_SYSTEM_PRESET_ID &&
      !presets.some((p) => p.id === activeId)
    ) {
      activeId = DATING_WRITING_SYSTEM_PRESET_ID
    }
    return { activeId, presets }
  } catch {
    return { activeId: DATING_WRITING_SYSTEM_PRESET_ID, presets: [] }
  }
}

function persist(next: DatingWritingPresetStoreState) {
  cache = next
  snapshotForStore = cloneState(next)
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(next))
    } catch {
      /* ignore quota */
    }
  }
  notify()
}

function ensureCache(): DatingWritingPresetStoreState {
  if (!cache) {
    cache = readRaw()
    snapshotForStore = cloneState(cache)
  }
  return cache
}

export function subscribeDatingWritingPresets(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getDatingWritingPresetStoreSnapshot(): DatingWritingPresetStoreState {
  ensureCache()
  return cloneState(cache!)
}

/** useSyncExternalStore：数据未变时必须返回同一引用，否则会 Maximum update depth */
export function getDatingWritingPresetsSnapshotForStore(): DatingWritingPresetStoreState {
  ensureCache()
  return snapshotForStore!
}

export function isDatingWritingUsingCustomPreset(): boolean {
  return ensureCache().activeId !== DATING_WRITING_SYSTEM_PRESET_ID
}

/**
 * 当前若为自定义预设，返回已开启条目拼接正文；系统默认返回 `null`。
 */
export function getActiveCustomWritingInjectBody(): string | null {
  const s = ensureCache()
  if (s.activeId === DATING_WRITING_SYSTEM_PRESET_ID) return null
  const preset = s.presets.find((p) => p.id === s.activeId)
  if (!preset) return null
  const parts: string[] = []
  for (const e of preset.entries) {
    if (!e.enabled) continue
    const body = String(e.content ?? '').trim()
    if (!body) continue
    const title = String(e.title ?? '').trim()
    parts.push(title ? `【${title}】\n${body}` : body)
  }
  return parts.join('\n\n')
}

export function setActiveDatingWritingPresetId(id: string): void {
  const tid = String(id ?? '').trim() || DATING_WRITING_SYSTEM_PRESET_ID
  const s = ensureCache()
  if (tid === DATING_WRITING_SYSTEM_PRESET_ID) {
    if (s.activeId === DATING_WRITING_SYSTEM_PRESET_ID) return
    persist({ ...s, activeId: DATING_WRITING_SYSTEM_PRESET_ID })
    return
  }
  if (!s.presets.some((p) => p.id === tid)) return
  if (s.activeId === tid) return
  persist({ ...s, activeId: tid })
}

export function createEmptyDatingCustomWritingPreset(
  name = '我的写作预设',
): DatingCustomWritingPreset {
  return {
    id: uid('dwp'),
    name: String(name).trim().slice(0, MAX_NAME) || '我的写作预设',
    entries: [
      {
        id: uid('dwe'),
        title: '写作规则',
        content: '',
        enabled: true,
      },
    ],
    updatedAt: Date.now(),
  }
}

export function createDatingCustomWritingEntry(
  partial?: Partial<DatingCustomWritingEntry>,
): DatingCustomWritingEntry {
  return {
    id: uid('dwe'),
    title: String(partial?.title ?? '新条目').trim().slice(0, MAX_ENTRY_TITLE) || '新条目',
    content: String(partial?.content ?? '').slice(0, MAX_ENTRY_CONTENT),
    enabled: partial?.enabled !== false,
  }
}

export function saveDatingCustomWritingPreset(
  preset: DatingCustomWritingPreset,
  opts?: { activate?: boolean },
): DatingCustomWritingPreset | null {
  const normalized = normalizePreset({
    ...preset,
    name: String(preset.name ?? '').trim().slice(0, MAX_NAME) || '未命名预设',
    updatedAt: Date.now(),
  })
  if (!normalized) return null
  const s = ensureCache()
  const idx = s.presets.findIndex((p) => p.id === normalized.id)
  let presets: DatingCustomWritingPreset[]
  if (idx >= 0) {
    presets = s.presets.map((p, i) => (i === idx ? normalized : p))
  } else {
    if (s.presets.length >= MAX_PRESETS) return null
    presets = [...s.presets, normalized]
  }
  const activeId = opts?.activate ? normalized.id : s.activeId
  persist({ activeId, presets })
  return normalized
}

export function deleteDatingCustomWritingPreset(id: string): void {
  const tid = String(id ?? '').trim()
  if (!tid || tid === DATING_WRITING_SYSTEM_PRESET_ID) return
  const s = ensureCache()
  const presets = s.presets.filter((p) => p.id !== tid)
  const activeId =
    s.activeId === tid ? DATING_WRITING_SYSTEM_PRESET_ID : s.activeId
  persist({ activeId, presets })
}

/** @deprecated 系统默认固定全开；保留空实现以免旧调用报错 */
export function getDatingWritingPresetTogglesSnapshot(): Record<string, boolean> {
  return {}
}

/** @deprecated */
export function setDatingWritingPresetEnabled(_id: string, _enabled: boolean): void {
  /* no-op：内置板块不再单独开关 */
}

/** @deprecated */
export function resetDatingWritingPresetsToDefault(): void {
  persist({
    activeId: DATING_WRITING_SYSTEM_PRESET_ID,
    presets: ensureCache().presets,
  })
}
