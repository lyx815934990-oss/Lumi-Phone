import type { CharacterMemory, MemorySettingsRow } from '../newFriendsPersona/types'
import type { ApiConfig } from '../../api/types'
import { DEFAULT_MEMORY_EMBEDDING_MODEL } from './memoryEmbeddingApi'
import {
  fetchEmbeddingVectorUnified,
  fetchEmbeddingVectorsUnified,
  isMemoryEmbeddingAvailable,
} from './memoryEmbeddingProvider'
import { flattenMemoryTriggerKeywords, isMemoryAlwaysTrigger } from './memoryTriggerUtils'

const MAX_EMBED_CHARS = 8000
/** 每轮补算 embedding 上限：优先喂给召回，避免库大时绝大多数无向量 → ⑥空⑦爆 */
const STALE_EMBED_CAP_PER_CALL = 48
const EMBEDDING_BATCH = 16
/** 与剧情摘要向量一致：多轮补齐，避免一轮补不完导致⑥长期为 0 */
const MEMORY_EMBED_MAX_ROUNDS = 6

function djb2Hash(s: string): string {
  let h = 5381
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(33, h) ^ s.charCodeAt(i)
  }
  return (h >>> 0).toString(16)
}

/** 写入向量用的正文（记忆正文 + 触发词） */
export function buildMemoryEmbedText(m: CharacterMemory): string {
  const body = String(m.content ?? '').trim().slice(0, MAX_EMBED_CHARS)
  const kws = flattenMemoryTriggerKeywords(m)
  const tail = kws.length ? `\n【触发词】${kws.join('、')}` : ''
  return `${body}${tail}`.slice(0, MAX_EMBED_CHARS)
}

export function computeMemoryEmbeddingHash(m: CharacterMemory): string {
  return djb2Hash(buildMemoryEmbedText(m))
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (!a.length || a.length !== b.length) return -1
  let dot = 0
  let na = 0
  let nb = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    na += a[i] * a[i]
    nb += b[i] * b[i]
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb)
  if (!Number.isFinite(denom) || denom <= 0) return -1
  return dot / denom
}

export function memoryNeedsReembed(m: CharacterMemory, queryDim: number): boolean {
  const body = String(m.content ?? '').trim()
  if (!body) return false
  const h = computeMemoryEmbeddingHash(m)
  const emb = m.memoryEmbedding
  if (!Array.isArray(emb) || emb.length < 8) return true
  if (emb.length !== queryDim) return true
  if (m.memoryEmbeddingHash !== h) return true
  return false
}

/**
 * 线上长期记忆向量 query：不要把整段超长 hay（未总结+线下+32轮）整坨 embed。
 * 与剧情摘要一致——用短切片，否则余弦会被稀释，⑥ 容易恒为 0。
 */
export function buildMemoryRecallQuerySlices(
  hay: string,
  opts?: { userText?: string; maxChars?: number },
): string[] {
  const maxChars = Math.max(240, Math.floor(opts?.maxChars ?? 1800))
  const slices: string[] = []
  const user = String(opts?.userText ?? '').trim()
  if (user.length >= 4) {
    slices.push(user.length <= maxChars ? user : user.slice(-maxChars))
  }
  const h = String(hay ?? '').trim()
  if (h.length >= 10) {
    // 取尾部（最近上下文），必要时再加头部一点
    const focused =
      h.length <= maxChars
        ? h
        : `${h.slice(0, Math.min(480, Math.floor(maxChars * 0.28)))}\n${h.slice(-(maxChars - Math.min(480, Math.floor(maxChars * 0.28))))}`.trim()
    if (!slices.includes(focused)) slices.push(focused)
  }
  return slices
}

/** 触发词 / 正文开头与 query 的字面重合（0～0.72），作向量召回软增强 */
export function scoreMemoryLexicalOverlap(m: CharacterMemory, queryText: string): number {
  const q = String(queryText ?? '').trim().toLowerCase()
  if (q.length < 2) return 0
  let score = 0
  for (const kw of flattenMemoryTriggerKeywords(m)) {
    const t = String(kw ?? '').trim().toLowerCase()
    if (t.length < 2) continue
    if (q.includes(t)) score += t.length >= 4 ? 0.14 : 0.09
  }
  const head = String(m.content ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 36)
    .toLowerCase()
  if (head.length >= 4 && q.includes(head)) score += 0.18
  return Math.min(0.72, score)
}

function resolveMemoryRecallScore(vectorSim: number, lexicalSim: number): number {
  const v = Number.isFinite(vectorSim) && vectorSim > 0 ? vectorSim : -1
  const lex = Number.isFinite(lexicalSim) && lexicalSim > 0 ? lexicalSim : 0
  if (lex >= 0.24) {
    if (v > 0) return Math.min(0.95, v + lex * 0.22)
    return Math.min(0.88, 0.48 + lex)
  }
  return v > 0 ? v : 0
}

/**
 * 为一批记忆补算 embedding 并写库（每轮上限）。
 */
export async function backfillMemoryEmbeddingsBestEffort(params: {
  memories: CharacterMemory[]
  upsert: (m: CharacterMemory) => Promise<void>
  settings: MemorySettingsRow
  chatApiConfig: Pick<ApiConfig, 'apiUrl' | 'apiKey'> | null
  queryDim: number
  embeddingProvider: 'local' | 'api'
  embeddingModelId: string
}): Promise<void> {
  const { memories, upsert, settings, chatApiConfig, queryDim } = params
  const stale = memories
    .filter((m) => memoryNeedsReembed(m, queryDim))
    .sort((a, b) => {
      const am = !Array.isArray(a.memoryEmbedding) || !a.memoryEmbedding.length ? 1 : 0
      const bm = !Array.isArray(b.memoryEmbedding) || !b.memoryEmbedding.length ? 1 : 0
      return bm - am || b.updatedAt - a.updatedAt
    })
    .slice(0, STALE_EMBED_CAP_PER_CALL)
  if (!stale.length) return

  for (let i = 0; i < stale.length; i += EMBEDDING_BATCH) {
    const chunk = stale.slice(i, i + EMBEDDING_BATCH)
    const texts = chunk.map((m) => buildMemoryEmbedText(m))
    try {
      const embedded = await fetchEmbeddingVectorsUnified(settings, chatApiConfig, texts)
      const now = Date.now()
      for (let j = 0; j < chunk.length; j++) {
        const m = chunk[j]
        const hit = embedded[j]
        if (!hit?.vec?.length || hit.vec.length !== queryDim) continue
        const hash = computeMemoryEmbeddingHash(m)
        await upsert({
          ...m,
          memoryEmbedding: hit.vec,
          memoryEmbeddingHash: hash,
          updatedAt: now,
        })
      }
    } catch {
      for (const m of chunk) {
        try {
          const hit = await fetchEmbeddingVectorUnified(settings, chatApiConfig, buildMemoryEmbedText(m))
          if (!hit?.vec.length || hit.vec.length !== queryDim) continue
          await upsert({
            ...m,
            memoryEmbedding: hit.vec,
            memoryEmbeddingHash: computeMemoryEmbeddingHash(m),
            updatedAt: Date.now(),
          })
        } catch {
          /* skip */
        }
      }
    }
  }
}

function scoreMemoriesByVectorSimilarity(params: {
  candidates: CharacterMemory[]
  queryVec: number[]
  topK: number
  minSim: number
  excludeIds: Set<string>
}): { m: CharacterMemory; sim: number }[] {
  const { candidates, queryVec, topK, minSim, excludeIds } = params
  const scored: { m: CharacterMemory; sim: number }[] = []
  for (const m of candidates) {
    if (excludeIds.has(m.id)) continue
    if (isMemoryAlwaysTrigger(m)) continue
    const emb = m.memoryEmbedding
    if (!Array.isArray(emb) || emb.length !== queryVec.length) continue
    const sim = cosineSimilarity(queryVec, emb)
    if (sim >= minSim) scored.push({ m, sim })
  }
  scored.sort((a, b) => b.sim - a.sim)
  return scored.slice(0, topK)
}

/**
 * 多 query 切片 + 词面增强（对齐剧情摘要向量召回），避免超长 hay 稀释导致⑥=0。
 */
export function pickMemoriesByVectorSimilarityScored(params: {
  candidates: CharacterMemory[]
  queryVec: number[]
  topK: number
  minSim: number
  excludeIds: Set<string>
}): { memory: CharacterMemory; score: number }[] {
  return scoreMemoriesByVectorSimilarity(params).map(({ m, sim }) => ({ memory: m, score: sim }))
}

export function pickMemoriesByVectorSimilarity(params: {
  candidates: CharacterMemory[]
  queryVec: number[]
  topK: number
  minSim: number
  excludeIds: Set<string>
}): CharacterMemory[] {
  return scoreMemoriesByVectorSimilarity(params).map((x) => x.m)
}

export function pickMemoriesByFocusedVectorRecall(params: {
  candidates: CharacterMemory[]
  queryVecs: number[][]
  lexicalQuery: string
  topK: number
  excludeIds: Set<string>
  minSim?: number
  fallbackMinSim?: number
}): { memory: CharacterMemory; score: number }[] {
  const {
    candidates,
    queryVecs,
    lexicalQuery,
    topK,
    excludeIds,
    minSim = MEMORY_VECTOR_PRIMARY_MIN_SIM,
    fallbackMinSim = MEMORY_VECTOR_MIN_SIM,
  } = params
  if (!queryVecs.length && !lexicalQuery.trim()) return []

  const scored: { memory: CharacterMemory; score: number; vectorSim: number; lexicalSim: number }[] = []
  for (const m of candidates) {
    if (excludeIds.has(m.id)) continue
    if (isMemoryAlwaysTrigger(m)) continue
    const emb = m.memoryEmbedding
    let vectorSim = -1
    if (Array.isArray(emb) && emb.length && queryVecs.length) {
      const sims = queryVecs
        .filter((q) => q.length === emb.length)
        .map((q) => cosineSimilarity(q, emb))
      if (sims.length) vectorSim = Math.max(...sims)
    }
    const lexicalSim = scoreMemoryLexicalOverlap(m, lexicalQuery)
    const score = resolveMemoryRecallScore(vectorSim, lexicalSim)
    if (score <= 0) continue
    scored.push({ memory: m, score, vectorSim, lexicalSim })
  }

  const primary = scored
    .filter((x) => x.score >= minSim || (x.vectorSim >= minSim && x.vectorSim > 0))
    .sort((a, b) => b.score - a.score)
  const fallback = scored
    .filter((x) => x.score >= fallbackMinSim)
    .sort((a, b) => b.score - a.score)

  const out: { memory: CharacterMemory; score: number }[] = []
  const seen = new Set<string>()
  for (const row of [...primary, ...fallback]) {
    if (seen.has(row.memory.id)) continue
    seen.add(row.memory.id)
    out.push({ memory: row.memory, score: row.score })
    if (out.length >= topK) break
  }
  return out
}

/** 多轮补 embedding 后按短 query 切片召回 */
export async function recallMemoriesByFocusedVector(params: {
  candidates: CharacterMemory[]
  relevanceText: string
  userText?: string
  settings: MemorySettingsRow
  chatApiConfig: Pick<ApiConfig, 'apiUrl' | 'apiKey'> | null
  upsert: (m: CharacterMemory) => Promise<void>
  reloadCandidates: () => Promise<CharacterMemory[]>
  topK: number
  excludeIds: Set<string>
}): Promise<{ memory: CharacterMemory; score: number }[]> {
  const slices = buildMemoryRecallQuerySlices(params.relevanceText, {
    userText: params.userText,
  })
  if (!slices.length) return []

  let queryHits: Awaited<ReturnType<typeof fetchEmbeddingVectorsUnified>> = []
  try {
    queryHits = await fetchEmbeddingVectorsUnified(params.settings, params.chatApiConfig, slices)
  } catch {
    queryHits = []
  }
  const queryVecs = queryHits.map((h) => h.vec).filter((v) => Array.isArray(v) && v.length >= 8)
  const ref = queryHits[0]
  if (ref?.vec.length) {
    let pool = params.candidates
    for (let round = 0; round < MEMORY_EMBED_MAX_ROUNDS; round++) {
      const staleCount = pool.filter((m) => memoryNeedsReembed(m, ref.vec.length)).length
      if (!staleCount) break
      await backfillMemoryEmbeddingsBestEffort({
        memories: pool,
        upsert: params.upsert,
        settings: params.settings,
        chatApiConfig: params.chatApiConfig,
        queryDim: ref.vec.length,
        embeddingProvider: ref.provider,
        embeddingModelId: ref.modelId,
      })
      pool = await params.reloadCandidates()
    }
  }

  const fresh = await params.reloadCandidates()
  return pickMemoriesByFocusedVectorRecall({
    candidates: fresh,
    queryVecs,
    lexicalQuery: slices.join('\n'),
    topK: params.topK,
    excludeIds: params.excludeIds,
  })
}

export type MemoryPromptLineScope = {
  wechatAccountId: string
  sessionPlayerIdentityId: string
}

export type MemoryPromptInjectionBucket = 'own' | 'linked'

export type MemoryVectorRecallOpts = {
  apiConfig: Pick<ApiConfig, 'apiUrl' | 'apiKey'> | null
  embeddingModelId?: string
  disableVector?: boolean
  /** 私聊 storage 键（保留兼容；已总结片段召回不再索引游标后原文） */
  conversationKey?: string | null
  /** 多号分线：长期记忆按来源微信线分组注入 */
  lineScope?: MemoryPromptLineScope | null
  /**
   * own：角色私聊自有长期记忆（默认，不含 memoryScope=linked）
   * linked：线下关联记忆（约会总结写入人脉 NPC 的 `[关联线下]` 条目）
   */
  memoryBucket?: MemoryPromptInjectionBucket
}

export function isMemoryVectorRecallEnabled(settings: MemorySettingsRow, opts?: MemoryVectorRecallOpts | null): boolean {
  if (opts?.disableVector) return false
  if (settings.memoryVectorRecallEnabled === false) return false
  return isMemoryEmbeddingAvailable(settings, opts?.apiConfig ?? null)
}

export function resolveMemoryEmbeddingModelId(settings: MemorySettingsRow, opts?: MemoryVectorRecallOpts | null): string {
  const o = opts?.embeddingModelId?.trim()
  if (o) return o
  const s = settings.memoryEmbeddingModelId?.trim()
  if (s) return s
  return DEFAULT_MEMORY_EMBEDDING_MODEL
}

export const MEMORY_VECTOR_TOP_PRIVATE = 5
export const MEMORY_VECTOR_TOP_GROUP = 4
/** 与剧情摘要兜底门槛对齐：纯余弦过严会导致有库却⑥=0 */
export const MEMORY_VECTOR_MIN_SIM = 0.52
/** 主召回门槛（对齐剧情摘要 STORY_TIMELINE_ROW_VECTOR_MIN_SIM） */
export const MEMORY_VECTOR_PRIMARY_MIN_SIM = 0.58

/** 关键词子串命中后的语义确认门槛（query↔记忆向量余弦） */
export const MEMORY_KEYWORD_HIT_MIN_SIM = 0.62

/** 非「始终触发」的关键词命中注入上限（私聊自有 / 关联各一轨） */
export const MEMORY_KEYWORD_HIT_INJECT_CAP = 8
/** 群聊关键词命中注入上限 */
export const MEMORY_KEYWORD_HIT_INJECT_CAP_GROUP = 4
/** 尚无 embedding 时，关键词命中最多保留几条（按 updatedAt），防止灌爆⑦ */
export const MEMORY_KEYWORD_NO_EMBED_FALLBACK_CAP = 3

export function memoryKeywordHitVectorSim(m: CharacterMemory, queryVec: number[] | null | undefined): number | null {
  if (!queryVec?.length) return null
  const emb = m.memoryEmbedding
  if (!Array.isArray(emb) || emb.length !== queryVec.length) return null
  return cosineSimilarity(queryVec, emb)
}

/**
 * 子串命中后的语义确认：
 * - 有 embedding：须达 minSim
 * - 无 embedding：仅保留最近若干条兜底（避免向量未就绪时⑦灌进十几二十条、⑥永远空）
 */
export function filterKeywordHitsByVectorConfirm(params: {
  hits: CharacterMemory[]
  queryVec: number[] | null | undefined
  minSim?: number
  noEmbedFallbackCap?: number
}): CharacterMemory[] {
  const {
    hits,
    queryVec,
    minSim = MEMORY_KEYWORD_HIT_MIN_SIM,
    noEmbedFallbackCap = MEMORY_KEYWORD_NO_EMBED_FALLBACK_CAP,
  } = params
  if (!queryVec?.length) {
    return [...hits]
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, Math.max(noEmbedFallbackCap, MEMORY_KEYWORD_HIT_INJECT_CAP))
  }
  const passed: CharacterMemory[] = []
  const noEmbed: CharacterMemory[] = []
  for (const m of hits) {
    const sim = memoryKeywordHitVectorSim(m, queryVec)
    if (sim == null) noEmbed.push(m)
    else if (sim >= minSim) passed.push(m)
  }
  noEmbed.sort((a, b) => b.updatedAt - a.updatedAt)
  return [...passed, ...noEmbed.slice(0, noEmbedFallbackCap)]
}

export function capKeywordHitMemoriesForInject(
  hits: CharacterMemory[],
  cap: number = MEMORY_KEYWORD_HIT_INJECT_CAP,
): CharacterMemory[] {
  if (hits.length <= cap) return hits
  return [...hits].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, cap)
}
