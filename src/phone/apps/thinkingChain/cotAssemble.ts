import { getActiveCotEntriesForScene } from './cotStore'
import { formatEnabledEntryInjectText } from './cotTokens'
import type { CoTEntry } from './cotTypes'

/**
 * 已启用条目按展示顺序拼接（仅 order，调用方已排好；关闭的跳过）。
 */
function joinEnabledEntries(entries: CoTEntry[]): string {
  return entries
    .map(formatEnabledEntryInjectText)
    .filter(Boolean)
    .join('\n\n')
    .trim()
}

/** 组装线上思维链；有启用条目时整段替换内置，否则 null */
export function resolveOnlineThinkingChainAppendix(): string | null {
  const entries = getActiveCotEntriesForScene('online', 'thinkingChain')
  if (!entries.length) return null
  const text = joinEnabledEntries(entries)
  return text || null
}

/** 组装线下思维链；有启用条目时整段替换内置场记包，否则 null */
export function resolveOfflineThinkingChainBooksPrompt(): string | null {
  const entries = getActiveCotEntriesForScene('offline', 'thinkingChain')
  if (!entries.length) return null
  const text = joinEnabledEntries(entries)
  return text || null
}

/** 组装线上自定义提示词；有启用条目时整段替换 WECHAT_CORE 扮演主壳（沙盒/格式永不替换） */
export function resolveOnlineReplyStyleAppendix(): string | null {
  const entries = getActiveCotEntriesForScene('online', 'replyStyle')
  if (!entries.length) return null
  const text = joinEnabledEntries(entries)
  return text || null
}

/** 组装线下自定义提示词；有启用条目时替换扮演总规则+写作板块，并覆盖沙盒与禁词硬钉（输出壳仍保留） */
export function resolveOfflineReplyStyleAppendix(): string | null {
  const entries = getActiveCotEntriesForScene('offline', 'replyStyle')
  if (!entries.length) return null
  const text = joinEnabledEntries(entries)
  return text || null
}
