import { DEFAULT_MEMORY_EMBEDDING_MODEL } from './memoryEmbeddingApi'

/** 当轮语义向量召回是否跑通（含是否命中条目） */
export type MemoryVectorRecallRoundStatus = {
  enabled: boolean
  attempted: boolean
  ok: boolean
  hitCount: number
  modelId: string
  detail?: string
}

export function emptyMemoryVectorRecallStatus(
  patch?: Partial<MemoryVectorRecallRoundStatus>,
): MemoryVectorRecallRoundStatus {
  return {
    enabled: false,
    attempted: false,
    ok: false,
    hitCount: 0,
    modelId: DEFAULT_MEMORY_EMBEDDING_MODEL,
    ...patch,
  }
}

export function mergeMemoryVectorRecallStatus(
  a: MemoryVectorRecallRoundStatus,
  b: MemoryVectorRecallRoundStatus,
): MemoryVectorRecallRoundStatus {
  const attempted = a.attempted || b.attempted
  const ok = attempted ? a.ok || b.ok : false
  const details = [a.detail, b.detail].filter(Boolean)
  return {
    enabled: a.enabled || b.enabled,
    attempted,
    ok,
    hitCount: a.hitCount + b.hitCount,
    modelId: a.modelId || b.modelId || DEFAULT_MEMORY_EMBEDDING_MODEL,
    detail: details.length ? details.join('；') : undefined,
  }
}

export function formatMemoryVectorRecallConsoleLine(status: MemoryVectorRecallRoundStatus): string {
  const model = status.modelId.trim() || DEFAULT_MEMORY_EMBEDDING_MODEL
  if (!status.enabled) {
    return `[向量记忆] 本轮未调用（语义召回已关闭）`
  }
  if (!status.attempted) {
    return `[向量记忆] 本轮未调用（${status.detail?.trim() || '上下文过短或无需向量'}）`
  }
  if (!status.ok) {
    return `[向量记忆] 本轮调用失败 · ${model}${status.detail?.trim() ? ` · ${status.detail.trim()}` : ''}`
  }
  return `[向量记忆] 本轮调用成功 · ${model} · 命中 ${status.hitCount} 条`
}
