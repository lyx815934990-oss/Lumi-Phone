import type { GlobalWechatWorldBook, GlobalWechatWorldBookScope } from './globalWorldBookTypes'
import { normalizeGlobalWechatWorldBookScope } from './globalWorldBookTypes'

export type { GlobalWechatWorldBookScope } from './globalWorldBookTypes'

/** 作用角色：全员，或指定通讯录中的 NPC id */
export type ArchiveCharacterScope =
  | { mode: 'all' }
  | { mode: 'characters'; ids: string[] }

/** 档案室自定义标签（用于整理全局世界书） */
export type LoreArchiveTag = {
  id: string
  name: string
  /** 预置色板键；未写入时用默认色 */
  colorKey?: LoreArchiveTagColorKey
  updatedAt: number
}

export type LoreArchiveTagColorKey =
  | 'stone'
  | 'sand'
  | 'sage'
  | 'sky'
  | 'rose'
  | 'amber'
  | 'slate'

export const LORE_ARCHIVE_TAG_COLOR_KEYS: readonly LoreArchiveTagColorKey[] = [
  'stone',
  'sand',
  'sage',
  'sky',
  'rose',
  'amber',
  'slate',
] as const

export const LORE_ARCHIVE_TAG_COLORS: Record<
  LoreArchiveTagColorKey,
  { bg: string; border: string; text: string; swatch: string }
> = {
  stone: { bg: '#f5f5f4', border: '#e7e5e4', text: '#57534e', swatch: '#a8a29e' },
  sand: { bg: '#faf6f0', border: '#efe4d4', text: '#8a6d4b', swatch: '#c9a961' },
  sage: { bg: '#f3f6f2', border: '#dde8d8', text: '#4d6a4f', swatch: '#7d9a78' },
  sky: { bg: '#f2f6f9', border: '#d7e4ee', text: '#48687e', swatch: '#7aa0b8' },
  rose: { bg: '#f9f3f4', border: '#eddde0', text: '#8a5a63', swatch: '#c48993' },
  amber: { bg: '#faf6ee', border: '#f0e4c8', text: '#8a6b2f', swatch: '#d4a84b' },
  slate: { bg: '#f3f4f6', border: '#e5e7eb', text: '#4b5563', swatch: '#94a3b8' },
}

export const LORE_ARCHIVE_TAG_NAME_MAX = 12
export const LORE_ARCHIVE_TAGS_CAP = 40
export const LORE_ARCHIVE_ENTRY_TAGS_CAP = 8

/**
 * 档案室统一条目：原「档案法则」+ 原「微信全局世界书」条目合并为同一列表。
 * 每条可单独配置：生效板块、作用角色、标题与正文。
 */
export type ArchiveWorldbookEntry = {
  id: string
  title: string
  content: string
  /** 未写入时视为 true */
  enabled?: boolean
  /** 全部场景，或限定私聊/群聊/线下剧情/VN 等 */
  plateScope: GlobalWechatWorldBookScope
  characterScope: ArchiveCharacterScope
  /** 归属的自定义标签 id（可多选） */
  tagIds?: string[]
  updatedAt: number
}

/** 与 `ArchiveWorldbookEntry` 同形；保留旧名减少引用改动 */
export type LoreEntry = ArchiveWorldbookEntry

export function normalizeCharacterScope(raw: unknown): ArchiveCharacterScope {
  if (!raw || typeof raw !== 'object') return { mode: 'all' }
  const o = raw as Record<string, unknown>
  if (o.mode === 'characters' && Array.isArray(o.ids)) {
    const ids = o.ids.map((x) => String(x ?? '').trim()).filter(Boolean)
    return ids.length ? { mode: 'characters', ids: [...new Set(ids)] } : { mode: 'all' }
  }
  return { mode: 'all' }
}

export function normalizeLoreArchiveTagColorKey(raw: unknown): LoreArchiveTagColorKey {
  const k = String(raw ?? '').trim()
  if ((LORE_ARCHIVE_TAG_COLOR_KEYS as readonly string[]).includes(k)) {
    return k as LoreArchiveTagColorKey
  }
  return 'sand'
}

export function normalizeTagIds(raw: unknown, cap = LORE_ARCHIVE_ENTRY_TAGS_CAP): string[] {
  if (!Array.isArray(raw)) return []
  const out: string[] = []
  const seen = new Set<string>()
  for (const it of raw) {
    const id = String(it ?? '').trim()
    if (!id || seen.has(id)) continue
    seen.add(id)
    out.push(id)
    if (out.length >= cap) break
  }
  return out
}

export function normalizeLoreArchiveTag(raw: unknown): LoreArchiveTag | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const id = typeof o.id === 'string' ? o.id.trim() : ''
  if (!id) return null
  const name = String(o.name ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, LORE_ARCHIVE_TAG_NAME_MAX)
  if (!name) return null
  return {
    id,
    name,
    colorKey: normalizeLoreArchiveTagColorKey(o.colorKey),
    updatedAt: typeof o.updatedAt === 'number' && Number.isFinite(o.updatedAt) ? o.updatedAt : Date.now(),
  }
}

export function normalizeLoreArchiveTagCatalog(raw: unknown): LoreArchiveTag[] {
  if (!Array.isArray(raw)) return []
  const out: LoreArchiveTag[] = []
  const seen = new Set<string>()
  for (const it of raw) {
    const tag = normalizeLoreArchiveTag(it)
    if (!tag || seen.has(tag.id)) continue
    seen.add(tag.id)
    out.push(tag)
    if (out.length >= LORE_ARCHIVE_TAGS_CAP) break
  }
  return out
}

export function normalizeArchiveEntryPartial(raw: Record<string, unknown>): ArchiveWorldbookEntry | null {
  const id = typeof raw.id === 'string' ? raw.id.trim() : ''
  if (!id) return null
  const tagIds = normalizeTagIds(raw.tagIds)
  return {
    id,
    title: typeof raw.title === 'string' ? raw.title : '',
    content: typeof raw.content === 'string' ? raw.content : '',
    enabled: raw.enabled !== false,
    plateScope: normalizeGlobalWechatWorldBookScope(raw.plateScope),
    characterScope: normalizeCharacterScope(raw.characterScope),
    ...(tagIds.length ? { tagIds } : {}),
    updatedAt: typeof raw.updatedAt === 'number' && Number.isFinite(raw.updatedAt) ? raw.updatedAt : Date.now(),
  }
}

/** v1 仅法则条目 */
export type LoreArchiveStoreShape = {
  entries: LoreEntry[]
}

/** v2：法则条目 + 微信全局世界书（多本）；微博占位 */
export type LoreArchiveStoreShapeV2 = {
  version: 2
  entries: Array<{
    id: string
    title: string
    content: string
    isGlobal: boolean
    targetIds: string[]
    updatedAt: number
  }>
  wechat?: {
    worldBooks: GlobalWechatWorldBook[]
  }
  weibo?: { _reserved: true }
}

import type { LoreArchiveBuiltinPresetToggles } from './loreArchiveBuiltinPresets'

/** v3：统一条目（板块 + 角色） */
export type LoreArchiveStoreShapeV3 = {
  version: 3
  entries: ArchiveWorldbookEntry[]
  /** 系统内置预设开关；未写入时默认全部关闭，由用户自行打开 */
  builtinPresets?: LoreArchiveBuiltinPresetToggles
  /** 用户自定义标签目录 */
  tags?: LoreArchiveTag[]
  weibo?: { _reserved: true }
}
