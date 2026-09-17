import type { ApiConfig } from './types'
import { logConsole } from '../wechat/consoleLogger'

/** auto：按模型名猜测；on/off：强制 */
export type ApiVisionInputMode = 'auto' | 'on' | 'off'

const VISION_FAIL_KEY = 'lumi.api.visionFailModels.v1'

function readVisionFailSet(): Set<string> {
  try {
    const raw = sessionStorage.getItem(VISION_FAIL_KEY)
    if (!raw) return new Set()
    const arr = JSON.parse(raw) as unknown
    if (!Array.isArray(arr)) return new Set()
    return new Set(arr.filter((x): x is string => typeof x === 'string' && !!x.trim()).map((x) => x.trim().toLowerCase()))
  } catch {
    return new Set()
  }
}

function writeVisionFailSet(set: Set<string>) {
  try {
    sessionStorage.setItem(VISION_FAIL_KEY, JSON.stringify([...set].slice(0, 80)))
  } catch {
    /* ignore */
  }
}

/** 本会话内：识图请求曾对该模型 400/INVALID_ARGUMENT，auto 模式下不再强行带图 */
export function markModelVisionFailed(modelId: string): void {
  const id = modelId.trim().toLowerCase()
  if (!id) return
  const set = readVisionFailSet()
  if (set.has(id)) return
  set.add(id)
  writeVisionFailSet(set)
  logConsole('ai', `[AI识图] 已记录模型「${modelId}」本会话不支持识图，后续自动跳过带图`)
}

export function clearModelVisionFailed(modelId?: string): void {
  if (!modelId?.trim()) {
    try {
      sessionStorage.removeItem(VISION_FAIL_KEY)
    } catch {
      /* ignore */
    }
    return
  }
  const set = readVisionFailSet()
  set.delete(modelId.trim().toLowerCase())
  writeVisionFailSet(set)
}

export function normalizeApiVisionInputMode(raw: unknown): ApiVisionInputMode | undefined {
  const s = String(raw ?? '')
    .trim()
    .toLowerCase()
  if (s === 'auto' || s === 'on' || s === 'off') return s
  return undefined
}

/**
 * 根据模型名猜测是否具备视觉能力。
 * - true：较像识图模型
 * - false：较像纯文本 / 非聊天模型
 * - null：无法判断（auto 时默认不带图，避免 400）
 */
export function guessModelSupportsVision(modelId: string): boolean | null {
  const id = modelId.trim().toLowerCase()
  if (!id) return null

  if (
    /embedding|rerank|tts|asr|sensevoice|whisper|moderation|instruct-embedding|bge-|gte-/i.test(id)
  ) {
    return false
  }

  // 明确视觉 / 多模态
  if (
    /gemini/i.test(id) ||
    /gpt-4o|chatgpt-4o|gpt-4\.1|gpt-4-turbo|gpt-5/i.test(id) ||
    /claude/i.test(id) ||
    /qwen[^a-z0-9]*vl|\bvl[-_.]?qwen|qwen2\.5-vl|qwen3-vl|qwen-vl/i.test(id) ||
    /glm-4v|glm4v|glm-4\.5v|cogvlm|visualglm/i.test(id) ||
    /internvl|llava|pixtral|molmo|phi-4-multimodal|phi-3\.5-vision/i.test(id) ||
    /\bvision\b|multimodal|[-_]vl\b|\bvl[-_]/i.test(id) ||
    /doubao.*vision|seed-1[.-]?5|kimi.*vision|moonshot.*vision|kimi-vl/i.test(id)
  ) {
    return true
  }

  // 常见纯文本
  if (
    /deepseek(?!.*vl)/i.test(id) ||
    /gpt-3\.5/i.test(id) ||
    /qwen([-_.]?(turbo|plus|max|long|coder))?$/i.test(id) ||
    /qwen2\.5(?!.*vl)/i.test(id) ||
    /\bo1-mini\b|\bo3-mini\b|\bo4-mini\b/i.test(id) ||
    /yi-|yi1|lingyiwanwu/i.test(id) ||
    /hunyuan(?!.*vision)/i.test(id)
  ) {
    return false
  }

  return null
}

export function resolveApiVisionInput(cfg: Pick<ApiConfig, 'modelId' | 'visionInput'>): {
  enabled: boolean
  mode: ApiVisionInputMode
  reason: string
} {
  const mode: ApiVisionInputMode = cfg.visionInput === 'on' || cfg.visionInput === 'off' ? cfg.visionInput : 'auto'
  const modelId = cfg.modelId?.trim() || ''

  if (mode === 'off') {
    return { enabled: false, mode, reason: 'API 设置：识图=关闭' }
  }
  if (mode === 'on') {
    return { enabled: true, mode, reason: 'API 设置：识图=强制开启' }
  }

  const failed = modelId && readVisionFailSet().has(modelId.toLowerCase())
  if (failed) {
    return { enabled: false, mode, reason: `本会话该模型识图曾失败，已跳过（${modelId}）` }
  }

  const guess = guessModelSupportsVision(modelId)
  if (guess === true) {
    return { enabled: true, mode, reason: `自动：模型名像支持识图（${modelId || '空'}）` }
  }
  if (guess === false) {
    return { enabled: false, mode, reason: `自动：模型名像纯文本，跳过带图（${modelId || '空'}）` }
  }
  return {
    enabled: false,
    mode,
    reason: `自动：无法确认「${modelId || '(空)'}」是否支持识图，已跳过带图（可在 API 设置改为强制开启）`,
  }
}

/** 识图请求失败时，若像「不支持图片参数」，记入本会话黑名单 */
export function maybeMarkVisionUnsupportedFromError(modelId: string, err: unknown): void {
  const msg = err instanceof Error ? err.message : String(err ?? '')
  if (!/400|INVALID_ARGUMENT|invalid argument|image|vision|multimodal|base64|unsupported/i.test(msg)) {
    return
  }
  markModelVisionFailed(modelId)
}
