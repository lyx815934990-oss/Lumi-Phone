/**
 * 本机压缩：删除可重建缓存 + 无人引用的约会剧情附图（不碰聊天/人设/用户上传正文）。
 */

import { utf8ByteLength } from './constants'
import {
  DATING_PLOT_IMAGE_KV_PREFIX,
  isRedundantLocalStorageKey,
  isRedundantPhoneKvCacheKey,
} from './archiveUserDataFilter'
import { personaDb } from '../wechat/newFriendsPersona/idb'

const DATING_ARCHIVES_KV = 'wechat-dating-archives-v1'

export type LocalDataCleanupResult = {
  removedKeys: number
  approxFreedBytes: number
  orphanPlotImages: number
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
  // 通过 getAll 遍历：personaDb 未暴露 list API，用底层 open 路径与 erase 一致
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

/**
 * 压缩本机冗余数据。返回删除统计；不删除聊天记录、人设、仍被剧情引用的附图。
 */
export async function cleanupRedundantLocalData(): Promise<LocalDataCleanupResult> {
  let removedKeys = 0
  let approxFreedBytes = 0
  let orphanPlotImages = 0
  let cacheKeys = 0
  let localStorageKeys = 0

  // 1) localStorage 教程/引导/会话态
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

  // 2) phoneKv 可重建缓存 + 孤儿剧情图
  const entries = await listPhoneKvEntries()
  const archives = await loadDatingArchives()
  const referencedPlotIds = collectReferencedPlotImageIds(archives)

  const keysToDelete: Array<{ key: string; bytes: number; kind: 'cache' | 'orphan' }> = []
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
    }
  }

  await personaDb.runWithIndexedTrashSuspended(async () => {
    for (const item of keysToDelete) {
      await personaDb.deletePhoneKv(item.key)
      approxFreedBytes += item.bytes
      removedKeys += 1
      if (item.kind === 'cache') cacheKeys += 1
      else orphanPlotImages += 1
    }
  })

  return {
    removedKeys,
    approxFreedBytes,
    orphanPlotImages,
    cacheKeys,
    localStorageKeys,
  }
}

export function formatFreedBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}
