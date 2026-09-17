import type { ApiConfig } from '../../phone/apps/api/types'
import {
  openAiCompatibleChat,
  type OpenAiCompatibleMessage,
} from '../../phone/apps/wechat/newFriendsPersona/ai'
import { parseModelJsonPayload } from '../anonymousQa/qnaDirectedJsonParse'
import {
  looksLikeMomentStableText,
  MOMENT_STABLE_OUTPUT_HARD_RULES,
  parseMomentInstantObjectFromStableText,
  parseMomentPostObjectFromStableText,
} from './momentStableFormat'

const STABLE_RETRY_USER_HINT =
  '你上一轮的输出无法被程序解析。请严格按「分隔行 + 标签｜内容」格式重输：不要 JSON、不要 Markdown 代码块、不要解释；正文换行写成 \\n。'

const STRICT_STABLE_RETRY_HINT =
  '忽略角色扮演式自然语言。只输出任务要求的稳定字段行（如 ---MOMENT--- 与 类型｜… / 正文｜…），禁止任何 JSON。'

export type MomentsStableChatOptions = {
  temperature?: number
  max_tokens?: number
}

export type MomentsJsonChatOptions = MomentsStableChatOptions

function resolveMomentsStableTemperature(options?: MomentsStableChatOptions): number {
  const t = options?.temperature
  if (t == null) return 0.45
  return Math.min(t, 0.55)
}

function appendMomentsStableOutputConstraint(
  messages: OpenAiCompatibleMessage[],
): OpenAiCompatibleMessage[] {
  const copy = [...messages]
  let lastUserIdx = -1
  for (let i = copy.length - 1; i >= 0; i -= 1) {
    if (copy[i].role === 'user') {
      lastUserIdx = i
      break
    }
  }
  const tail = `\n\n${MOMENT_STABLE_OUTPUT_HARD_RULES}`
  if (lastUserIdx >= 0) {
    const m = copy[lastUserIdx]
    copy[lastUserIdx] = {
      ...m,
      content: `${String(m.content ?? '')}${tail}`,
    }
  } else {
    copy.push({ role: 'user', content: MOMENT_STABLE_OUTPUT_HARD_RULES })
  }
  return copy
}

function canParseMomentsPostishPayload(raw: string): boolean {
  if (parseMomentPostObjectFromStableText(raw) || parseMomentInstantObjectFromStableText(raw)) {
    return true
  }
  if (looksLikeMomentStableText(raw)) return false
  return !!parseModelJsonPayload(raw)
}

async function callMomentsStableChat(
  cfg: ApiConfig,
  messages: OpenAiCompatibleMessage[],
  options?: MomentsStableChatOptions,
): Promise<string> {
  return (
    await openAiCompatibleChat(cfg, messages, {
      ...options,
      temperature: resolveMomentsStableTemperature(options),
    })
  ).trim()
}

/** 朋友圈专用：请求稳定文本输出，失败时自动重试（不再强制 JSON mode） */
export async function requestMomentsModelStableText(
  cfg: ApiConfig,
  messages: OpenAiCompatibleMessage[],
  options?: MomentsStableChatOptions,
): Promise<string> {
  const baseMessages = appendMomentsStableOutputConstraint(messages)

  let raw = await callMomentsStableChat(cfg, baseMessages, options)
  if (canParseMomentsPostishPayload(raw)) return raw

  const retryMessages: OpenAiCompatibleMessage[] = [
    ...baseMessages,
    { role: 'user', content: STABLE_RETRY_USER_HINT },
  ]
  raw = await callMomentsStableChat(cfg, retryMessages, options)
  if (canParseMomentsPostishPayload(raw)) return raw

  const strictMessages: OpenAiCompatibleMessage[] = [
    ...baseMessages,
    { role: 'user', content: STRICT_STABLE_RETRY_HINT },
  ]
  return await callMomentsStableChat(cfg, strictMessages, { ...options, temperature: 0.35 })
}

/** @deprecated 使用 requestMomentsModelStableText */
export const requestMomentsModelJsonText = requestMomentsModelStableText

/** 优先稳定文本，其次兼容旧 JSON */
export function parseMomentsModelPayload(raw: string): unknown | null {
  const instant = parseMomentInstantObjectFromStableText(raw)
  if (instant) return instant
  const post = parseMomentPostObjectFromStableText(raw)
  if (post) return post
  return parseModelJsonPayload(raw)
}

/** @deprecated 使用 parseMomentsModelPayload */
export const parseMomentsModelJsonPayload = parseMomentsModelPayload

export function describeMomentModelStableFailure(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return '模型未返回内容，请重试或检查接口'
  if (trimmed.startsWith('{')) {
    return '模型仍在输出 JSON；请换模型或重试，当前朋友圈已改为「标签｜内容」稳定格式'
  }
  return '模型输出无法解析为朋友圈稳定字段行。请重试、增大 max_tokens 或换模型'
}

export function throwIfMomentModelDraftInvalid<T>(raw: string, draft: T | null): asserts draft is T {
  const trimmed = raw.trim()
  if (!trimmed) {
    throw new Error(describeMomentModelStableFailure(''))
  }
  if (!draft) {
    if (!parseMomentsModelPayload(raw)) {
      throw new Error(describeMomentModelStableFailure(raw))
    }
    throw new Error(
      '字段已解析但缺少必填项（如类型/正文/配图）或正文为空。请重试、增大 max_tokens 或换模型',
    )
  }
}

/** @deprecated 使用 throwIfMomentModelDraftInvalid */
export const throwIfMomentModelJsonInvalid = throwIfMomentModelDraftInvalid
