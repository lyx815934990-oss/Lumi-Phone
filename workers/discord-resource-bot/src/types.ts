export type Env = {
  DB: D1Database
  FILES: KVNamespace
  DISCORD_PUBLIC_KEY: string
  DISCORD_BOT_TOKEN: string
  DISCORD_APPLICATION_ID: string
  DISCORD_GUILD_ID: string
}

export type StoredFileMeta = {
  name: string
  contentType: string
  size: number
  kvKey: string
}

export type ResourceRow = {
  id: string
  author_id: string
  author_tag: string
  guild_id: string
  channel_id: string
  panel_message_id: string
  starter_message_id: string
  title: string
  note: string
  link: string | null
  file_name: string | null
  file_content_type: string | null
  file_r2_key: string | null
  file_size: number | null
  files_json: string | null
  created_at: number
}

export const MAX_FILES = 5
/** 单文件上限（Workers KV / Discord 附件都更稳） */
export const MAX_FILE_BYTES = 8 * 1024 * 1024

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.trim()
  const out = new Uint8Array(clean.length / 2)
  for (let i = 0; i < out.length; i += 1) {
    out[i] = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16)
  }
  return out
}

/** Discord Interactions 签名校验（必须用原始 body） */
export async function verifyDiscordRequest(
  request: Request,
  publicKeyHex: string,
): Promise<{ ok: true; body: string } | { ok: false }> {
  const signature = request.headers.get('X-Signature-Ed25519')
  const timestamp = request.headers.get('X-Signature-Timestamp')
  if (!signature || !timestamp || !publicKeyHex) return { ok: false }

  const body = await request.text()
  const key = await crypto.subtle.importKey(
    'raw',
    hexToBytes(publicKeyHex),
    { name: 'Ed25519' },
    false,
    ['verify'],
  )
  const valid = await crypto.subtle.verify(
    'Ed25519',
    key,
    hexToBytes(signature),
    new TextEncoder().encode(timestamp + body),
  )
  return valid ? { ok: true, body } : { ok: false }
}

export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

export function createResourceId(): string {
  const bytes = new Uint8Array(6)
  crypto.getRandomValues(bytes)
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export function parseStoredFiles(row: ResourceRow): StoredFileMeta[] {
  if (row.files_json) {
    try {
      const parsed = JSON.parse(row.files_json) as StoredFileMeta[]
      if (Array.isArray(parsed)) return parsed
    } catch {
      // ignore
    }
  }
  // 兼容旧单文件字段
  if (row.file_r2_key && row.file_name) {
    return [
      {
        name: row.file_name,
        contentType: row.file_content_type || 'application/octet-stream',
        size: row.file_size || 0,
        kvKey: row.file_r2_key,
      },
    ]
  }
  return []
}

export function describeResourceKinds(row: ResourceRow): string {
  const kinds: string[] = []
  if (row.link) kinds.push('链接')
  const files = parseStoredFiles(row)
  if (files.length === 1) kinds.push(`文件(${files[0].name})`)
  else if (files.length > 1) kinds.push(`${files.length} 个文件`)
  return kinds.join(' + ') || '未指定'
}

export function formatDiscordTime(ts: number): string {
  return `<t:${Math.floor(ts / 1000)}:f>`
}
