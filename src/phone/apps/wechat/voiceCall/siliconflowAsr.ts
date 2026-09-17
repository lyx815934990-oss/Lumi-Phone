import { buildOpenAiAudioTranscriptionsEndpoint } from '../../api/openAiCompatibleEndpoints'
import {
  BUILTIN_SILICONFLOW_API_BASE_URL,
  BUILTIN_SILICONFLOW_API_KEY,
} from '../../api/builtinSiliconflow'
import type { ApiConfig } from '../../api/types'

export type VoiceAsrResult = {
  text: string
  emotion?: string
}

const SILICONFLOW_ASR_MODEL = 'FunAudioLLM/SenseVoiceSmall'
export const SILICONFLOW_ASR_DEFAULT_BASE_URL = BUILTIN_SILICONFLOW_API_BASE_URL

/** 过短 / 空录音，SenseVoice 常返回空或 4xx，时好时坏 */
const MIN_ASR_BLOB_BYTES = 1200

function mapEmotionToken(token: string): string | undefined {
  const t = token.trim().toLowerCase()
  if (!t) return undefined
  if (t.includes('happy') || t.includes('joy')) return '开心'
  if (t.includes('sad')) return '难过'
  if (t.includes('angry') || t.includes('anger')) return '生气'
  if (t.includes('fear') || t.includes('scared')) return '紧张'
  if (t.includes('surprise')) return '惊讶'
  if (t.includes('disgust')) return '反感'
  if (t.includes('calm') || t.includes('neutral')) return '平静'
  return undefined
}

export function normalizeSenseVoiceText(raw: string): VoiceAsrResult {
  const src = String(raw ?? '').trim()
  if (!src) return { text: '' }
  const tags = [...src.matchAll(/<\|([^|>]+)\|>/g)].map((m) => String(m[1] ?? '').trim())
  const emotion = tags.map((t) => mapEmotionToken(t)).find((x) => !!x)
  const cleaned = src.replace(/<\|[^|>]+\|>/g, ' ').replace(/\s+/g, ' ').trim()
  // SenseVoice 偶发只回标签 / nospeech，清洗后为空 → 视为失败而非「成功但没字」
  if (!cleaned) {
    const joined = tags.join(' ').toLowerCase()
    if (joined.includes('nospeech') || joined.includes('silence')) {
      return { text: '', emotion }
    }
  }
  return { text: cleaned, emotion }
}

function resolveAsrConfig(cfg: ApiConfig | null | undefined): ApiConfig {
  const key = cfg?.apiKey?.trim() || BUILTIN_SILICONFLOW_API_KEY
  return {
    apiUrl: (cfg?.apiUrl?.trim() || SILICONFLOW_ASR_DEFAULT_BASE_URL).replace(/\/+$/, ''),
    apiKey: key,
    modelId: SILICONFLOW_ASR_MODEL,
    modelList: [SILICONFLOW_ASR_MODEL],
  }
}

function guessAudioExt(blob: Blob): { ext: string; mime: string } {
  const t = String(blob.type || '').toLowerCase()
  if (t.includes('ogg')) return { ext: 'ogg', mime: t || 'audio/ogg' }
  if (t.includes('mp4') || t.includes('m4a') || t.includes('aac')) {
    return { ext: 'm4a', mime: t || 'audio/mp4' }
  }
  if (t.includes('mpeg') || t.includes('mp3')) return { ext: 'mp3', mime: t || 'audio/mpeg' }
  if (t.includes('wav')) return { ext: 'wav', mime: t || 'audio/wav' }
  return { ext: 'webm', mime: t || 'audio/webm' }
}

async function postSiliconflowTranscriptionOnce(
  endpoint: string,
  apiKey: string,
  audioBlob: Blob,
  signal: AbortSignal,
): Promise<VoiceAsrResult> {
  const { ext, mime } = guessAudioExt(audioBlob)
  const file = new File([audioBlob], `voice.${ext}`, { type: mime })
  const form = new FormData()
  form.append('file', file)
  form.append('model', SILICONFLOW_ASR_MODEL)

  const resp = await fetch(endpoint, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
    signal,
  })
  const text = await resp.text()
  let payload: unknown = null
  try {
    payload = text ? (JSON.parse(text) as unknown) : null
  } catch {
    payload = null
  }
  if (!resp.ok) {
    const msg =
      payload && typeof payload === 'object'
        ? String(
            (payload as { message?: unknown; error?: { message?: unknown } }).error?.message ??
              (payload as { message?: unknown }).message ??
              `语音识别失败（HTTP ${resp.status})`,
          )
        : `语音识别失败（HTTP ${resp.status})`
    console.warn('[SenseVoice]', resp.status, endpoint, text.slice(0, 400))
    throw new Error(msg)
  }
  const asrText =
    payload && typeof payload === 'object'
      ? String((payload as { text?: unknown }).text ?? '')
      : ''
  const parsed = normalizeSenseVoiceText(asrText)
  if (!parsed.text) {
    console.warn('[SenseVoice] 空转写', {
      status: resp.status,
      bytes: audioBlob.size,
      type: audioBlob.type,
      snippet: text.slice(0, 200),
    })
    throw new Error('没有听清内容，请再说清楚一点后重试')
  }
  return parsed
}

/** 私聊 / 通话按住说话：默认走内置 SenseVoice，无需副接口配置 */
export async function requestSiliconflowTranscription(
  cfg: ApiConfig | null | undefined,
  audioBlob: Blob,
  opts?: { signal?: AbortSignal; timeoutMs?: number },
): Promise<VoiceAsrResult> {
  if (!audioBlob || audioBlob.size < MIN_ASR_BLOB_BYTES) {
    throw new Error('录音太短或为空，请按住说完再松手')
  }
  const resolved = resolveAsrConfig(cfg)
  const endpoint = buildOpenAiAudioTranscriptionsEndpoint(
    resolved.apiUrl || SILICONFLOW_ASR_DEFAULT_BASE_URL,
  )
  if (!endpoint) throw new Error('语音识别 API URL 无效')

  const timeoutMs =
    typeof opts?.timeoutMs === 'number' && Number.isFinite(opts.timeoutMs)
      ? Math.max(5000, Math.floor(opts.timeoutMs))
      : 45000

  const runWithTimeout = async (): Promise<VoiceAsrResult> => {
    const ctrl = new AbortController()
    const onAbort = () => ctrl.abort()
    opts?.signal?.addEventListener('abort', onAbort, { once: true })
    const timer = window.setTimeout(() => ctrl.abort(), timeoutMs)
    try {
      return await postSiliconflowTranscriptionOnce(
        endpoint,
        resolved.apiKey,
        audioBlob,
        ctrl.signal,
      )
    } catch (err) {
      if (ctrl.signal.aborted && !opts?.signal?.aborted) {
        throw new Error('语音识别超时，请重试')
      }
      throw err
    } finally {
      window.clearTimeout(timer)
      opts?.signal?.removeEventListener('abort', onAbort)
    }
  }

  try {
    return await runWithTimeout()
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err ?? '')
    // 瞬时网络 / 空转写：自动再试一次
    if (/超时|空|没有听清|Failed to fetch|network|HTTP 5/i.test(msg)) {
      console.warn('[SenseVoice] 自动重试一次', msg)
      return await runWithTimeout()
    }
    throw err
  }
}
