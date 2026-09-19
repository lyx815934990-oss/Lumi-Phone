import { buildOpenAiEmbeddingsEndpoint } from '../../api/openAiCompatibleEndpoints'
import { isBuiltinSiliconflowProxyUrl, readBuiltinSiliconflowProxyBase } from '../../api/builtinSiliconflow'
import type { ApiConfig } from '../../api/types'
import type { MemorySettingsRow } from '../newFriendsPersona/types'

/** 默认向量模型：BGE-M3 */
export const DEFAULT_MEMORY_EMBEDDING_MODEL = 'BAAI/bge-m3'

export const DEFAULT_MEMORY_EMBEDDING_API_URL = readBuiltinSiliconflowProxyBase()

/**
 * 记忆向量召回固定走内置代理（密钥在服务端，客户端不带 Key）。
 */
export function resolveEmbeddingApiCredentials(
  settings: MemorySettingsRow,
  _chatFallback: Pick<ApiConfig, 'apiUrl' | 'apiKey'> | null | undefined,
): { apiUrl: string; apiKey: string } {
  if (settings.memoryEmbeddingUseBuiltinKey !== false) {
    return {
      apiUrl: readBuiltinSiliconflowProxyBase(),
      apiKey: '',
    }
  }
  const url = settings.memoryEmbeddingApiUrl?.trim() || ''
  return {
    apiUrl: isBuiltinSiliconflowProxyUrl(url) ? '' : url,
    apiKey: settings.memoryEmbeddingApiKey?.trim() || '',
  }
}

function embeddingRequestHeaders(apiKey: string): HeadersInit {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const key = apiKey.trim()
  if (key) headers.Authorization = `Bearer ${key}`
  return headers
}

function normalizeEmbeddingArray(raw: unknown): number[] | null {
  if (!Array.isArray(raw) || !raw.length) return null
  const out: number[] = []
  for (const x of raw) {
    const n = typeof x === 'number' ? x : Number(x)
    if (!Number.isFinite(n)) return null
    out.push(n)
  }
  return out.length ? out : null
}

/** bge-m3 上下文约 8K token；按字符截断留余量 */
const EMBEDDING_INPUT_CHAR_LIMIT = 8000

/** 单条文本 → 向量（失败抛错，由调用方 try/catch） */
export async function fetchEmbeddingVector(
  cfg: Pick<ApiConfig, 'apiUrl' | 'apiKey'>,
  text: string,
  modelId: string,
): Promise<number[]> {
  const t = String(text ?? '').trim()
  if (!t) throw new Error('embedding_empty_text')
  const url = buildOpenAiEmbeddingsEndpoint(cfg.apiUrl)
  const resp = await fetch(url, {
    method: 'POST',
    headers: embeddingRequestHeaders(cfg.apiKey),
    body: JSON.stringify({
      model: modelId.trim() || DEFAULT_MEMORY_EMBEDDING_MODEL,
      input: t.slice(0, EMBEDDING_INPUT_CHAR_LIMIT),
    }),
  })
  const data = (await resp.json()) as {
    error?: { message?: string }
    message?: string
    data?: { embedding?: unknown; index?: number }[]
  }
  if (!resp.ok) {
    const msg = data?.error?.message ?? data?.message ?? `embedding HTTP ${resp.status}`
    throw new Error(typeof msg === 'string' ? msg : 'embedding_failed')
  }
  const emb = normalizeEmbeddingArray(data?.data?.[0]?.embedding)
  if (!emb) throw new Error('embedding_bad_response')
  return emb
}

/**
 * 批量请求 embedding（同一模型）；返回与 `texts` 同序的向量数组。
 * 单条失败则整批抛错。
 */
export async function fetchEmbeddingVectorsBatch(
  cfg: Pick<ApiConfig, 'apiUrl' | 'apiKey'>,
  texts: string[],
  modelId: string,
): Promise<number[][]> {
  const trimmed = texts.map((s) => String(s ?? '').trim().slice(0, EMBEDDING_INPUT_CHAR_LIMIT))
  if (!trimmed.length) return []
  const url = buildOpenAiEmbeddingsEndpoint(cfg.apiUrl)
  const resp = await fetch(url, {
    method: 'POST',
    headers: embeddingRequestHeaders(cfg.apiKey),
    body: JSON.stringify({
      model: modelId.trim() || DEFAULT_MEMORY_EMBEDDING_MODEL,
      input: trimmed.length === 1 ? trimmed[0] : trimmed,
    }),
  })
  const data = (await resp.json()) as {
    error?: { message?: string }
    message?: string
    data?: { embedding?: unknown; index?: number }[]
  }
  if (!resp.ok) {
    const msg = data?.error?.message ?? data?.message ?? `embedding HTTP ${resp.status}`
    throw new Error(typeof msg === 'string' ? msg : 'embedding_failed')
  }
  const rows = Array.isArray(data?.data) ? data.data : []
  const sorted = [...rows].sort((a, b) => (Number(a?.index) || 0) - (Number(b?.index) || 0))
  if (sorted.length !== trimmed.length) {
    // 部分代理只返回单条时兜底
    if (trimmed.length === 1 && sorted[0]) {
      const one = normalizeEmbeddingArray(sorted[0]?.embedding)
      if (one) return [one]
    }
    throw new Error('embedding_batch_length_mismatch')
  }
  return sorted.map((row) => {
    const v = normalizeEmbeddingArray(row?.embedding)
    if (!v) throw new Error('embedding_bad_row')
    return v
  })
}

/** 发一条最短文本探测 embeddings 是否可用，返回向量维度或错误信息 */
export async function testMemoryEmbeddingConnection(
  cfg: Pick<ApiConfig, 'apiUrl' | 'apiKey'>,
  modelId: string,
): Promise<{ ok: true; dimensions: number } | { ok: false; message: string }> {
  try {
    const vec = await fetchEmbeddingVector(cfg, 'ping', modelId)
    if (!vec.length) return { ok: false, message: '返回向量为空' }
    return { ok: true, dimensions: vec.length }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return { ok: false, message: msg }
  }
}
