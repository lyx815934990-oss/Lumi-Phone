import type { ApiConfig } from './types'

/** 从存储/表单规范化可选数值；非法或空 → undefined（表示不覆盖系统默认） */
export function normalizeOptionalNumber(
  raw: unknown,
  min: number,
  max: number,
): number | undefined {
  if (raw == null || raw === '') return undefined
  const n = typeof raw === 'number' ? raw : Number(String(raw).trim())
  if (!Number.isFinite(n)) return undefined
  return Math.min(max, Math.max(min, n))
}

/** 把 ApiConfig 上的采样/流式字段规范化后合并进配置对象 */
export function pickApiConfigSamplingFields(raw: Partial<ApiConfig> | null | undefined): Pick<
  ApiConfig,
  'temperature' | 'topP' | 'maxTokens' | 'frequencyPenalty' | 'presencePenalty' | 'streamEnabled'
> {
  const r = raw ?? {}
  const temperature = normalizeOptionalNumber(r.temperature, 0, 2)
  const topP = normalizeOptionalNumber(r.topP, 0, 1)
  const maxTokens = normalizeOptionalNumber(r.maxTokens, 1, 128_000)
  const frequencyPenalty = normalizeOptionalNumber(r.frequencyPenalty, -2, 2)
  const presencePenalty = normalizeOptionalNumber(r.presencePenalty, -2, 2)
  const streamEnabled = r.streamEnabled === true ? true : undefined
  return {
    ...(temperature !== undefined ? { temperature } : {}),
    ...(topP !== undefined ? { topP } : {}),
    ...(maxTokens !== undefined ? { maxTokens: Math.floor(maxTokens) } : {}),
    ...(frequencyPenalty !== undefined ? { frequencyPenalty } : {}),
    ...(presencePenalty !== undefined ? { presencePenalty } : {}),
    ...(streamEnabled ? { streamEnabled: true } : {}),
  }
}

export type ChatSamplingOptions = {
  temperature?: number
  max_tokens?: number
  top_p?: number
  frequency_penalty?: number
  presence_penalty?: number
  stream?: boolean
}

/**
 * 温度 / max_tokens / top_p / 惩罚：配置页有值则优先于各功能硬编码；
 * 配置页留空时，才回落单次 options（如约会篇幅、起名等内置上限）或温度默认 0.7。
 * 可选参数仅在有值时写入请求体。
 */
export function resolveChatSampling(
  cfg: ApiConfig,
  options?: ChatSamplingOptions,
): {
  temperature: number
  maxTokens?: number
  topP?: number
  frequencyPenalty?: number
  presencePenalty?: number
  stream: boolean
} {
  const temperature =
    typeof cfg.temperature === 'number' && Number.isFinite(cfg.temperature)
      ? cfg.temperature
      : typeof options?.temperature === 'number' && Number.isFinite(options.temperature)
        ? options.temperature
        : 0.7

  // 用户在 API 设置里调的最大 Token 覆盖约会/起名/摘要/弹幕等内置上限；未调则仍用各功能 options
  const maxTokens =
    typeof cfg.maxTokens === 'number' && Number.isFinite(cfg.maxTokens)
      ? Math.floor(cfg.maxTokens)
      : typeof options?.max_tokens === 'number' && Number.isFinite(options.max_tokens)
        ? Math.floor(options.max_tokens)
        : undefined

  const topP =
    typeof cfg.topP === 'number' && Number.isFinite(cfg.topP)
      ? cfg.topP
      : typeof options?.top_p === 'number' && Number.isFinite(options.top_p)
        ? options.top_p
        : undefined

  const frequencyPenalty =
    typeof cfg.frequencyPenalty === 'number' && Number.isFinite(cfg.frequencyPenalty)
      ? cfg.frequencyPenalty
      : typeof options?.frequency_penalty === 'number' && Number.isFinite(options.frequency_penalty)
        ? options.frequency_penalty
        : undefined

  const presencePenalty =
    typeof cfg.presencePenalty === 'number' && Number.isFinite(cfg.presencePenalty)
      ? cfg.presencePenalty
      : typeof options?.presence_penalty === 'number' && Number.isFinite(options.presence_penalty)
        ? options.presence_penalty
        : undefined

  const stream =
    typeof options?.stream === 'boolean'
      ? options.stream
      : cfg.streamEnabled === true

  return {
    temperature,
    ...(maxTokens !== undefined ? { maxTokens } : {}),
    ...(topP !== undefined ? { topP } : {}),
    ...(frequencyPenalty !== undefined ? { frequencyPenalty } : {}),
    ...(presencePenalty !== undefined ? { presencePenalty } : {}),
    stream,
  }
}

export function applySamplingToOpenAiChatBody(
  body: Record<string, unknown>,
  sampling: ReturnType<typeof resolveChatSampling>,
  applyMaxTokens: (body: Record<string, unknown>, n: number) => void,
): void {
  body.temperature = sampling.temperature
  if (sampling.topP !== undefined) body.top_p = sampling.topP
  if (sampling.frequencyPenalty !== undefined) body.frequency_penalty = sampling.frequencyPenalty
  if (sampling.presencePenalty !== undefined) body.presence_penalty = sampling.presencePenalty
  if (sampling.maxTokens !== undefined) applyMaxTokens(body, sampling.maxTokens)
  if (sampling.stream) body.stream = true
}

export function applySamplingToGeminiGenerationConfig(
  generationConfig: Record<string, unknown>,
  sampling: ReturnType<typeof resolveChatSampling>,
): void {
  generationConfig.temperature = sampling.temperature
  if (sampling.topP !== undefined) generationConfig.topP = sampling.topP
  if (sampling.maxTokens !== undefined) generationConfig.maxOutputTokens = sampling.maxTokens
  // Gemini 原生 generateContent 此处不做 SSE；streamEnabled 仅作用于 OpenAI 兼容接口
}
