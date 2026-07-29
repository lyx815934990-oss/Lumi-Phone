import type { Env, ResourceRow, StoredFileMeta } from './types'

export async function insertResource(
  env: Env,
  row: Omit<ResourceRow, 'panel_message_id'> & { panel_message_id?: string },
) {
  await env.DB.prepare(
    `INSERT INTO resources (
      id, author_id, author_tag, guild_id, channel_id, panel_message_id, starter_message_id,
      title, note, link, file_name, file_content_type, file_r2_key, file_size, files_json, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      row.id,
      row.author_id,
      row.author_tag,
      row.guild_id,
      row.channel_id,
      row.panel_message_id || '',
      row.starter_message_id,
      row.title,
      row.note,
      row.link,
      row.file_name,
      row.file_content_type,
      row.file_r2_key,
      row.file_size,
      row.files_json,
      row.created_at,
    )
    .run()
}

export async function updatePanelMessageId(env: Env, id: string, panelMessageId: string) {
  await env.DB.prepare(`UPDATE resources SET panel_message_id = ? WHERE id = ?`)
    .bind(panelMessageId, id)
    .run()
}

export async function getResource(env: Env, id: string): Promise<ResourceRow | null> {
  return (
    (await env.DB.prepare(`SELECT * FROM resources WHERE id = ?`).bind(id).first<ResourceRow>()) ||
    null
  )
}

export async function listResourcesByAuthor(env: Env, authorId: string): Promise<ResourceRow[]> {
  const res = await env.DB.prepare(
    `SELECT * FROM resources WHERE author_id = ? ORDER BY created_at DESC LIMIT 50`,
  )
    .bind(authorId)
    .all<ResourceRow>()
  return res.results || []
}

export async function recordDownload(
  env: Env,
  entry: { resourceId: string; downloaderId: string; downloaderTag: string },
) {
  await env.DB.prepare(
    `INSERT INTO downloads (resource_id, downloader_id, downloader_tag, downloaded_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(resource_id, downloader_id) DO UPDATE SET
       downloader_tag = excluded.downloader_tag,
       downloaded_at = excluded.downloaded_at`,
  )
    .bind(entry.resourceId, entry.downloaderId, entry.downloaderTag, Date.now())
    .run()
}

export async function listDownloadsForResource(env: Env, resourceId: string) {
  const res = await env.DB.prepare(
    `SELECT * FROM downloads WHERE resource_id = ? ORDER BY downloaded_at DESC LIMIT 50`,
  )
    .bind(resourceId)
    .all<{
      resource_id: string
      downloader_id: string
      downloader_tag: string
      downloaded_at: number
    }>()
  return res.results || []
}

export async function listDownloadsForAuthor(env: Env, authorId: string) {
  const res = await env.DB.prepare(
    `SELECT d.* FROM downloads d
     INNER JOIN resources r ON r.id = d.resource_id
     WHERE r.author_id = ?
     ORDER BY d.downloaded_at DESC
     LIMIT 40`,
  )
    .bind(authorId)
    .all<{
      resource_id: string
      downloader_id: string
      downloader_tag: string
      downloaded_at: number
    }>()
  return res.results || []
}

export type DownloadQuery = {
  authorId: string
  resourceId?: string | null
  keyword?: string | null
  /** inclusive start ms */
  startAt?: number | null
  /** inclusive end ms */
  endAt?: number | null
  limit?: number
}

export async function queryDownloadsForAuthor(env: Env, q: DownloadQuery) {
  const limit = Math.min(Math.max(q.limit || 20, 1), 40)
  const clauses = ['r.author_id = ?']
  const binds: Array<string | number> = [q.authorId]

  if (q.resourceId) {
    clauses.push('d.resource_id = ?')
    binds.push(q.resourceId)
  }
  if (q.startAt != null) {
    clauses.push('d.downloaded_at >= ?')
    binds.push(q.startAt)
  }
  if (q.endAt != null) {
    clauses.push('d.downloaded_at <= ?')
    binds.push(q.endAt)
  }
  if (q.keyword) {
    clauses.push('(d.downloader_tag LIKE ? OR d.downloader_id LIKE ?)')
    const like = `%${q.keyword}%`
    binds.push(like, like)
  }

  binds.push(limit)
  const sql = `SELECT d.*, r.title AS resource_title FROM downloads d
     INNER JOIN resources r ON r.id = d.resource_id
     WHERE ${clauses.join(' AND ')}
     ORDER BY d.downloaded_at DESC
     LIMIT ?`

  const res = await env.DB.prepare(sql)
    .bind(...binds)
    .all<{
      resource_id: string
      downloader_id: string
      downloader_tag: string
      downloaded_at: number
      resource_title: string
    }>()
  return res.results || []
}

export async function countDownloads(env: Env, resourceId: string): Promise<number> {
  const row = await env.DB.prepare(
    `SELECT COUNT(*) AS c FROM downloads WHERE resource_id = ?`,
  )
    .bind(resourceId)
    .first<{ c: number }>()
  return row?.c || 0
}

export async function putFileBytes(
  env: Env,
  key: string,
  bytes: ArrayBuffer,
  contentType: string,
) {
  await env.FILES.put(key, bytes, {
    metadata: { contentType },
  })
}

export async function getFileBytes(env: Env, meta: StoredFileMeta) {
  const obj = await env.FILES.get(meta.kvKey, 'arrayBuffer')
  if (!obj) return null
  return {
    name: meta.name,
    contentType: meta.contentType,
    bytes: obj,
  }
}
