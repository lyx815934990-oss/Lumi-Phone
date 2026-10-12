/**
 * 最近一次 chat/completions（或 Gemini）成功响应的 token 用量缓存。
 * 主回复返回后立刻 snapshot，避免尾声二次请求覆盖。
 */

export type ChatApiTokenUsage = {
  promptTokens: number
  completionTokens: number
  totalTokens: number
  capturedAtMs: number
  /** 来自 API usage / usageMetadata；否则为粗估 */
  fromApi: boolean
}

let lastUsage: ChatApiTokenUsage | null = null

function clampTok(n: number): number {
  if (!Number.isFinite(n) || n <= 0) return 0
  return Math.min(Math.floor(n), 2_000_000)
}

/** 从 OpenAI / Gemini 响应体解析 prompt + completion token */
export function extractChatApiTokenUsage(data: unknown): ChatApiTokenUsage | null {
  const root = data && typeof data === 'object' ? (data as Record<string, unknown>) : null
  if (!root) return null

  let prompt = 0
  let completion = 0
  let total = 0
  let fromApi = false

  const usage = root.usage && typeof root.usage === 'object' ? (root.usage as Record<string, unknown>) : null
  if (usage) {
    const pt = Number(usage.prompt_tokens ?? usage.promptTokens)
    const ct = Number(usage.completion_tokens ?? usage.completionTokens)
    const tt = Number(usage.total_tokens ?? usage.totalTokens)
    if (Number.isFinite(pt) && pt > 0) {
      prompt = clampTok(pt)
      fromApi = true
    }
    if (Number.isFinite(ct) && ct > 0) {
      completion = clampTok(ct)
      fromApi = true
    }
    if (Number.isFinite(tt) && tt > 0) {
      total = clampTok(tt)
      fromApi = true
    }
  }

  const um =
    root.usageMetadata && typeof root.usageMetadata === 'object'
      ? (root.usageMetadata as Record<string, unknown>)
      : root.usage_metadata && typeof root.usage_metadata === 'object'
        ? (root.usage_metadata as Record<string, unknown>)
        : null
  if (um) {
    const pt = Number(um.promptTokenCount ?? um.prompt_token_count)
    const ct = Number(um.candidatesTokenCount ?? um.candidates_token_count)
    const tt = Number(um.totalTokenCount ?? um.total_token_count)
    if (!prompt && Number.isFinite(pt) && pt > 0) {
      prompt = clampTok(pt)
      fromApi = true
    }
    if (!completion && Number.isFinite(ct) && ct > 0) {
      completion = clampTok(ct)
      fromApi = true
    }
    if (!total && Number.isFinite(tt) && tt > 0) {
      total = clampTok(tt)
      fromApi = true
    }
  }

  if (!prompt && !completion && !total) return null
  if (!total && (prompt || completion)) total = prompt + completion
  if (!prompt && total && completion) prompt = Math.max(0, total - completion)
  if (!completion && total && prompt) completion = Math.max(0, total - prompt)

  return {
    promptTokens: prompt,
    completionTokens: completion,
    totalTokens: total || prompt + completion,
    capturedAtMs: Date.now(),
    fromApi,
  }
}

export function recordLastChatApiUsageFromResponse(data: unknown): void {
  const u = extractChatApiTokenUsage(data)
  if (!u) return
  lastUsage = u
}

export function peekLastChatApiUsage(): ChatApiTokenUsage | null {
  return lastUsage ? { ...lastUsage } : null
}

/** 主回复成功后立刻冻结一份，供思维溯源发布 */
export function snapshotLastChatApiUsage(): ChatApiTokenUsage | null {
  return peekLastChatApiUsage()
}
