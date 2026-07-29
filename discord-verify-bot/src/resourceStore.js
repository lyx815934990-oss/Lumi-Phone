import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomBytes } from 'node:crypto'

const __dirname = dirname(fileURLToPath(import.meta.url))
export const dataDir = join(__dirname, '..', 'data')
export const filesDir = join(dataDir, 'files')
const storePath = join(dataDir, 'resources.json')

/** @typedef {{
 *   id: string
 *   authorId: string
 *   guildId: string
 *   channelId: string
 *   panelMessageId: string
 *   starterMessageId: string
 *   title: string
 *   note: string
 *   link: string | null
 *   file: {
 *     url: string
 *     name: string
 *     contentType: string
 *     size: number
 *     localPath?: string
 *   } | null
 *   createdAt: number
 * }} ResourceRecord */

/** @typedef {{
 *   resourceId: string
 *   downloaderId: string
 *   downloaderTag: string
 *   downloadedAt: number
 * }} DownloadRecord */

/** @typedef {{ resources: Record<string, ResourceRecord>, downloads: DownloadRecord[] }} StoreData */

function emptyStore() {
  return /** @type {StoreData} */ ({ resources: {}, downloads: [] })
}

function ensureStore() {
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true })
  if (!existsSync(filesDir)) mkdirSync(filesDir, { recursive: true })
  if (!existsSync(storePath)) {
    writeFileSync(storePath, JSON.stringify(emptyStore(), null, 2), 'utf8')
  }
}

/**
 * 把 Discord 附件拉到本地，避免交互附件 URL 过期后无法下发。
 * @param {string} resourceId
 * @param {{ url: string, name: string }} attachment
 */
export async function cacheAttachmentLocally(resourceId, attachment) {
  ensureStore()
  const safeName = (attachment.name || 'file').replace(/[^\w.\u4e00-\u9fff()-]+/g, '_')
  const localPath = join(filesDir, `${resourceId}-${safeName}`)
  const res = await fetch(attachment.url)
  if (!res.ok) throw new Error(`下载附件失败：HTTP ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  writeFileSync(localPath, buf)
  return localPath
}

/** @returns {StoreData} */
export function loadStore() {
  ensureStore()
  try {
    const raw = JSON.parse(readFileSync(storePath, 'utf8'))
    return {
      resources: raw.resources && typeof raw.resources === 'object' ? raw.resources : {},
      downloads: Array.isArray(raw.downloads) ? raw.downloads : [],
    }
  } catch {
    return emptyStore()
  }
}

/** @param {StoreData} data */
function saveStore(data) {
  ensureStore()
  writeFileSync(storePath, JSON.stringify(data, null, 2), 'utf8')
}

export function createResourceId() {
  return randomBytes(6).toString('hex')
}

/** @param {Omit<ResourceRecord, never>} record */
export function upsertResource(record) {
  const data = loadStore()
  data.resources[record.id] = record
  saveStore(data)
  return record
}

/** @param {string} id */
export function getResource(id) {
  return loadStore().resources[id] ?? null
}

/** @param {string} authorId */
export function listResourcesByAuthor(authorId) {
  return Object.values(loadStore().resources)
    .filter((r) => r.authorId === authorId)
    .sort((a, b) => b.createdAt - a.createdAt)
}

/**
 * @param {{ resourceId: string, downloaderId: string, downloaderTag: string }} entry
 */
export function recordDownload(entry) {
  const data = loadStore()
  const existing = data.downloads.find(
    (d) => d.resourceId === entry.resourceId && d.downloaderId === entry.downloaderId,
  )
  if (existing) {
    existing.downloadedAt = Date.now()
    existing.downloaderTag = entry.downloaderTag
  } else {
    data.downloads.push({
      resourceId: entry.resourceId,
      downloaderId: entry.downloaderId,
      downloaderTag: entry.downloaderTag,
      downloadedAt: Date.now(),
    })
  }
  saveStore(data)
}

/** @param {string} resourceId */
export function listDownloadsForResource(resourceId) {
  return loadStore()
    .downloads.filter((d) => d.resourceId === resourceId)
    .sort((a, b) => b.downloadedAt - a.downloadedAt)
}

/** @param {string} authorId */
export function listDownloadsForAuthor(authorId) {
  const data = loadStore()
  const ownedIds = new Set(
    Object.values(data.resources)
      .filter((r) => r.authorId === authorId)
      .map((r) => r.id),
  )
  return data.downloads
    .filter((d) => ownedIds.has(d.resourceId))
    .sort((a, b) => b.downloadedAt - a.downloadedAt)
}
