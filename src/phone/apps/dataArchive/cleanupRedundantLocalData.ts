/**
 * 本机压缩：删除可重建缓存 + 无人引用的约会剧情附图 / 字体侧存（不碰聊天/人设/仍在用的媒体）。
 */

import { utf8ByteLength } from './constants'
import {
  DATING_PLOT_IMAGE_KV_PREFIX,
  isRedundantLocalStorageKey,
  isRedundantPhoneKvCacheKey,
} from './archiveUserDataFilter'
import { DATING_PLOT_FONT_KV_PREFIX } from '../wechat/dating/datingPlotFontPersist'
import { WECHAT_BUBBLE_SIDE_FONT_KV_PREFIX } from '../wechat/wechatBubbleSideFontPersist'
import { PHONE_GLOBAL_FONT_KV_PREFIX } from '../../phoneGlobalFontPersist'
import { personaDb } from '../wechat/newFriendsPersona/idb'
import { normalizeDatingPlotFontSettings } from '../wechat/dating/datingPlotFontSettings'

const DATING_ARCHIVES_KV = 'wechat-dating-archives-v1'
const CUSTOMIZATION_KV_KEYS = [
  'lumi-phone-custom-v4',
  'lumi-phone-custom-v3',
  'lumi-phone-custom-v2',
  'lumi-phone-custom-v1',
] as const

export type LocalDataCleanupResult = {
  removedKeys: number
  approxFreedBytes: number
  orphanPlotImages: number
  orphanFonts: number
  cacheKeys: number
  localStorageKeys: number
}

function estimateValueBytes(value: unknown): number {
  if (value == null) return 0
  if (typeof value === 'string') return utf8ByteLength(value)
  try {
    return utf8ByteLength(JSON.stringify(value))
  } catch {
    return 64
  }
}

async function listPhoneKvEntries(): Promise<Array<{ key: string; value: unknown }>> {
  const dbName = 'wechat-personas-v1'
  return await new Promise((resolve, reject) => {
    const req = indexedDB.open(dbName)
    req.onerror = () => reject(req.error ?? new Error('open idb'))
    req.onsuccess = () => {
      const db = req.result
      if (!db.objectStoreNames.contains('phoneKv')) {
        db.close()
        resolve([])
        return
      }
      const tx = db.transaction('phoneKv', 'readonly')
      const store = tx.objectStore('phoneKv')
      const getAll = store.getAll()
      getAll.onsuccess = () => {
        const raw = (getAll.result as Array<{ key?: string; value?: unknown }>) ?? []
        db.close()
        resolve(
          raw
            .map((r) => ({ key: String(r.key ?? '').trim(), value: r.value }))
            .filter((r) => r.key),
        )
      }
      getAll.onerror = () => {
        db.close()
        reject(getAll.error ?? new Error('phoneKv getAll'))
      }
    }
  })
}

function collectReferencedPlotImageIds(archives: unknown): Set<string> {
  const ids = new Set<string>()
  if (!archives || typeof archives !== 'object') return ids
  for (const arch of Object.values(archives as Record<string, unknown>)) {
    if (!arch || typeof arch !== 'object') continue
    const plots = (arch as { plots?: unknown }).plots
    if (!Array.isArray(plots)) continue
    for (const plot of plots) {
      if (!plot || typeof plot !== 'object') continue
      const images = (plot as { plotImages?: unknown }).plotImages
      if (!Array.isArray(images)) continue
      for (const img of images) {
        if (!img || typeof img !== 'object') continue
        const id = String((img as { id?: unknown }).id ?? '').trim()
        if (id) ids.add(id)
      }
    }
  }
  return ids
}

/** 约会存档里仍引用的剧情字体 KV 键 */
function collectReferencedDatingPlotFontKeys(archives: unknown): Set<string> {
  const keys = new Set<string>()
  if (!archives || typeof archives !== 'object') return keys
  for (const [cidRaw, arch] of Object.entries(archives as Record<string, unknown>)) {
    const cid = cidRaw.trim()
    if (!cid || !arch || typeof arch !== 'object') continue
    const plotFonts = (arch as { plotFonts?: unknown }).plotFonts
    const normalized = normalizeDatingPlotFontSettings(
      plotFonts as import('../wechat/dating/datingPlotFontSettings').DatingPlotFontSettings | null | undefined,
    )
    for (const item of normalized.library) {
      const aid = item.id?.trim()
      if (aid) keys.add(`${DATING_PLOT_FONT_KV_PREFIX}${cid}::${aid}`)
    }
  }
  return keys
}

function collectFontIdFromMeta(meta: unknown, into: Set<string>): void {
  if (!meta || typeof meta !== 'object') return
  const id = String((meta as { id?: unknown }).id ?? '').trim()
  if (id) into.add(id)
}

/** 外观 / 气泡主题里仍在用的全局字体、气泡侧字体 id */
function collectReferencedUiFontIds(customization: unknown): {
  globalIds: Set<string>
  bubbleIds: Set<string>
} {
  const globalIds = new Set<string>()
  const bubbleIds = new Set<string>()
  if (!customization || typeof customization !== 'object') return { globalIds, bubbleIds }

  const theme = (customization as { theme?: unknown }).theme
  if (theme && typeof theme === 'object') {
    collectFontIdFromMeta((theme as { customFont?: unknown }).customFont, globalIds)
  }

  const walkBubble = (bubble: unknown) => {
    if (!bubble || typeof bubble !== 'object') return
    collectFontIdFromMeta((bubble as { selfFont?: unknown }).selfFont, bubbleIds)
    collectFontIdFromMeta((bubble as { otherFont?: unknown }).otherFont, bubbleIds)
  }

  const wechatTheme = (customization as { wechatTheme?: unknown }).wechatTheme
  if (wechatTheme && typeof wechatTheme === 'object') {
    walkBubble((wechatTheme as { bubble?: unknown }).bubble)
    const roleBubbles = (wechatTheme as { roleBubbles?: unknown }).roleBubbles
    if (roleBubbles && typeof roleBubbles === 'object') {
      for (const row of Object.values(roleBubbles as Record<string, unknown>)) {
        walkBubble(row)
      }
    }
  }

  return { globalIds, bubbleIds }
}

async function loadDatingArchives(): Promise<unknown> {
  try {
    const fromKv = await personaDb.getPhoneKv(DATING_ARCHIVES_KV)
    if (fromKv && typeof fromKv === 'object') return fromKv
  } catch {
    /* ignore */
  }
  try {
    const raw = localStorage.getItem(DATING_ARCHIVES_KV)
    if (raw) return JSON.parse(raw) as unknown
  } catch {
    /* ignore */
  }
  return null
}

async function loadCustomizationBlob(): Promise<unknown> {
  for (const key of CUSTOMIZATION_KV_KEYS) {
    try {
      const fromKv = await personaDb.getPhoneKv(key)
      if (fromKv && typeof fromKv === 'object') return fromKv
    } catch {
      /* ignore */
    }
    try {
      const raw = localStorage.getItem(key)
      if (raw) return JSON.parse(raw) as unknown
    } catch {
      /* ignore */
    }
  }
  return null
}

/**
 * 压缩本机冗余数据。返回删除统计；不删除聊天记录、人设、仍被剧情/外观引用的附图与字体。
 */
export async function cleanupRedundantLocalData(): Promise<LocalDataCleanupResult> {
  let removedKeys = 0
  let approxFreedBytes = 0
  let orphanPlotImages = 0
  let orphanFonts = 0
  let cacheKeys = 0
  let localStorageKeys = 0

  if (typeof localStorage !== 'undefined') {
    const toRemove: string[] = []
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i)
      if (key && isRedundantLocalStorageKey(key)) toRemove.push(key)
    }
    for (const key of toRemove) {
      const raw = localStorage.getItem(key)
      approxFreedBytes += utf8ByteLength(key) + utf8ByteLength(raw ?? '')
      localStorage.removeItem(key)
      localStorageKeys += 1
      removedKeys += 1
    }
  }

  const entries = await listPhoneKvEntries()
  const archives = await loadDatingArchives()
  const customization = await loadCustomizationBlob()
  const referencedPlotIds = collectReferencedPlotImageIds(archives)
  const referencedPlotFontKeys = collectReferencedDatingPlotFontKeys(archives)
  const { globalIds, bubbleIds } = collectReferencedUiFontIds(customization)

  const keysToDelete: Array<{
    key: string
    bytes: number
    kind: 'cache' | 'orphan' | 'orphan-font'
  }> = []

  for (const { key, value } of entries) {
    const bytes = estimateValueBytes(value) + utf8ByteLength(key)
    if (isRedundantPhoneKvCacheKey(key)) {
      keysToDelete.push({ key, bytes, kind: 'cache' })
      continue
    }
    if (key.startsWith(DATING_PLOT_IMAGE_KV_PREFIX)) {
      const imageId = key.slice(DATING_PLOT_IMAGE_KV_PREFIX.length).trim()
      if (imageId && !referencedPlotIds.has(imageId)) {
        keysToDelete.push({ key, bytes, kind: 'orphan' })
      }
      continue
    }
    if (key.startsWith(DATING_PLOT_FONT_KV_PREFIX)) {
      if (!referencedPlotFontKeys.has(key)) {
        keysToDelete.push({ key, bytes, kind: 'orphan-font' })
      }
      continue
    }
    if (key.startsWith(WECHAT_BUBBLE_SIDE_FONT_KV_PREFIX)) {
      const id = key.slice(WECHAT_BUBBLE_SIDE_FONT_KV_PREFIX.length).trim()
      if (id && !bubbleIds.has(id)) {
        keysToDelete.push({ key, bytes, kind: 'orphan-font' })
      }
      continue
    }
    if (key.startsWith(PHONE_GLOBAL_FONT_KV_PREFIX)) {
      const id = key.slice(PHONE_GLOBAL_FONT_KV_PREFIX.length).trim()
      if (id && !globalIds.has(id)) {
        keysToDelete.push({ key, bytes, kind: 'orphan-font' })
      }
    }
  }

  // 防止误删：若外观解析失败导致引用集为空，但库里仍有字体键，则跳过 UI 字体清理
  const hasAnyUiFontKey = entries.some(
    (e) =>
      e.key.startsWith(WECHAT_BUBBLE_SIDE_FONT_KV_PREFIX) ||
      e.key.startsWith(PHONE_GLOBAL_FONT_KV_PREFIX),
  )
  if (hasAnyUiFontKey && globalIds.size === 0 && bubbleIds.size === 0 && !customization) {
    for (let i = keysToDelete.length - 1; i >= 0; i -= 1) {
      const k = keysToDelete[i]?.key ?? ''
      if (k.startsWith(WECHAT_BUBBLE_SIDE_FONT_KV_PREFIX) || k.startsWith(PHONE_GLOBAL_FONT_KV_PREFIX)) {
        keysToDelete.splice(i, 1)
      }
    }
  }

  await personaDb.runWithIndexedTrashSuspended(async () => {
    for (const item of keysToDelete) {
      await personaDb.deletePhoneKv(item.key)
      approxFreedBytes += item.bytes
      removedKeys += 1
      if (item.kind === 'cache') cacheKeys += 1
      else if (item.kind === 'orphan-font') orphanFonts += 1
      else orphanPlotImages += 1
    }
  })

  // 约会档只留 IndexedDB；清掉 localStorage 旧镜像，避免再触发 QuotaExceeded 弹窗
  if (typeof localStorage !== 'undefined') {
    try {
      const lsRaw = localStorage.getItem(DATING_ARCHIVES_KV)
      if (lsRaw) {
        const idbArch = await personaDb.getPhoneKv(DATING_ARCHIVES_KV)
        if (idbArch != null) {
          approxFreedBytes += utf8ByteLength(lsRaw) + utf8ByteLength(DATING_ARCHIVES_KV)
          localStorage.removeItem(DATING_ARCHIVES_KV)
          localStorageKeys += 1
          removedKeys += 1
        }
      }
    } catch {
      /* ignore */
    }
  }

  return {
    removedKeys,
    approxFreedBytes,
    orphanPlotImages,
    orphanFonts,
    cacheKeys,
    localStorageKeys,
  }
}

export function formatFreedBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}
