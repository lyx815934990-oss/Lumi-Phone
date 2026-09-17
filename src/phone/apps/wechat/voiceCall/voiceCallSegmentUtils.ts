/**
 * 语音通话：清洗模型输出、拆成多条短语音条。
 */

import {
  normalizeVoiceScriptForTts,
  pickVoiceEmotionForTts,
  stripEmotionTagsForTts,
  type VoiceAllowedEmotion,
} from '../wechatVoiceScript'

const META_MARKERS = [
  '---WB_AFTER_PATCH---',
  '---OBS_NOTES_PATCH---',
  '---OBS---',
  '---LIFE_LEDGER_PATCH---',
] as const

/** 去掉尾声 / 观察笔记等不可见协议块，以及消息 ID 等内部标记 */
export function sanitizeVoiceDisplayText(raw: string): string {
  let s = String(raw ?? '')
  for (const marker of META_MARKERS) {
    const i = s.indexOf(marker)
    if (i >= 0) s = s.slice(0, i)
  }
  // 无分隔符时仍可能裸写 [EPILOGUE] / status：无变化
  s = s.replace(/\n*\s*\[EPILOGUE(?:_PATCH)?\][\s\S]*$/i, '')
  s = s.replace(/^\s*\[EPILOGUE(?:_PATCH)?\][\s\S]*$/im, '')
  s = s.replace(/\n\s*status\s*[:：]\s*无变化\s*$/gim, '')
  s = s
    .replace(/^\s*\[(?:消息ID|引用)[:：][^\]]+\]\s*$/gim, '')
    .replace(/\s*\[(?:消息ID|引用)[:：][^\]]+\]\s*/gim, ' ')
  // 模型常写全角（）；统一成半角，便于环境音拆分与 TTS 剔除
  s = s.replace(/（([^）]*)）/g, '($1)')
  return s.replace(/\n{3,}/g, '\n\n').trim()
}

/**
 * TTS 文本探针：去掉中文环境音/语气旁白。
 * - allowToneTokens=true：保留 MiniMax 官方语气词（如 laughs）
 * - allowToneTokens=false：去掉一切括号（含官方语气词）与情绪标签
 */
export function stripForTts(
  raw: string,
  allowToneTokensOrOpts: boolean | { allowToneTokens?: boolean } = false,
): string {
  const allowToneTokens =
    typeof allowToneTokensOrOpts === 'boolean'
      ? allowToneTokensOrOpts
      : allowToneTokensOrOpts.allowToneTokens === true
  const cleaned = sanitizeVoiceDisplayText(raw)
  if (allowToneTokens) return stripEmotionTagsForTts(cleaned)
  return cleaned
    .replace(/\{\/?(happy|sad|angry|fearful|disgusted|surprised|neutral|calm|fluent|whisper)\}/gi, ' ')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export type PrepareVoiceCallTtsOpts = {
  /** 保留 (laughs) 等官方语气词 */
  allowToneTokens?: boolean
  /** 抽取并下发 voice_setting.emotion */
  allowEmotion?: boolean
}

/** 通话合成：按开关保留语气词 / 情绪（可单独开、可全关） */
export function prepareVoiceCallTts(
  raw: string,
  opts?: PrepareVoiceCallTtsOpts | { allowToneEmotion?: boolean },
): {
  text: string
  emotion?: VoiceAllowedEmotion
} | null {
  // 兼容旧布尔组合开关
  const legacy = (opts as { allowToneEmotion?: boolean } | undefined)?.allowToneEmotion
  const allowToneTokens =
    legacy === true
      ? true
      : legacy === false
        ? false
        : (opts as PrepareVoiceCallTtsOpts | undefined)?.allowToneTokens === true
  const allowEmotion =
    legacy === true
      ? true
      : legacy === false
        ? false
        : (opts as PrepareVoiceCallTtsOpts | undefined)?.allowEmotion === true

  const cleaned = sanitizeVoiceDisplayText(raw)
  if (!allowToneTokens && !allowEmotion) {
    const text = stripForTts(cleaned, false)
    if (!text) return null
    return { text }
  }

  // 走规范化拿停顿标记；再按开关剥语气词 / 情绪
  const normalized = normalizeVoiceScriptForTts(cleaned)
  let text = stripEmotionTagsForTts(normalized)
  if (!allowToneTokens) {
    text = text.replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim()
  }
  if (!text) return null

  const emotion = allowEmotion ? pickVoiceEmotionForTts(normalized) : undefined
  return { text, emotion }
}

/**
 * 拆成微信连发式短语音条：
 * - 优先按换行
 * - 过长再按句读弱拆
 * - 纯 `(旁白)` 可单独成条（无 TTS，仅字幕）
 */
export function splitVoiceCallReplySegments(raw: string): string[] {
  const cleaned = sanitizeVoiceDisplayText(raw)
  if (!cleaned) return []

  const lines = cleaned
    .split(/\r?\n+/)
    .map((l) => l.trim())
    .filter(Boolean)

  const pieces: string[] = []
  for (const line of lines) {
    pieces.push(...splitLongLine(line))
  }
  return pieces.length ? pieces : [cleaned]
}

function splitLongLine(line: string): string[] {
  const src = line.trim()
  if (!src) return []
  // 纯旁白 / 很短：不拆
  if (/^\([^)]*\)$/.test(src) || src.length <= 28) return [src]

  const parts = src
    .split(/(?<=[。！？；!?…]|……)\s*/)
    .map((s) => s.trim())
    .filter(Boolean)
  if (parts.length <= 1) return [src]

  const out: string[] = []
  let acc = ''
  for (const p of parts) {
    const merged = acc ? joinSeg(acc, p) : p
    if (merged.length <= 36) {
      acc = merged
      continue
    }
    if (acc) out.push(acc)
    acc = p
  }
  if (acc) out.push(acc)
  return out.length ? out : [src]
}

function joinSeg(a: string, b: string): string {
  if (!a) return b
  if (!b) return a
  // `(旁白)` 紧贴后续台词；台词之间直接相连（标点已在句末）
  if (a.endsWith(')')) return `${a}${b}`
  if (b.startsWith('(')) return `${a}${b}`
  return `${a}${b}`
}
