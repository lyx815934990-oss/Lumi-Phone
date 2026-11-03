import { getCotGlobalVars } from './cotGlobalVarsStore'
import { expandCotInjectMacros } from './cotMacroExpand'
import { getActiveCotEntriesForScene } from './cotStore'
import { formatEnabledEntryInjectText } from './cotTokens'
import type { CoTEntry } from './cotTypes'

export type CotAssembleMacroOpts = {
  userName?: string
  charName?: string
  /** 额外全局变量（覆盖本地表） */
  globals?: Record<string, string>
  /** 是否把 {{user}}/{{char}} 换成显示名；默认 false（保留占位） */
  expandNames?: boolean
}

/**
 * 已启用条目按展示顺序拼接（仅 order，调用方已排好；关闭的跳过）。
 * 注入前清理 trim/注释，并展开 getglobalvar（读 Lumi 全局表）。
 */
function joinEnabledEntries(entries: CoTEntry[], macro?: CotAssembleMacroOpts): string {
  const joined = entries
    .map(formatEnabledEntryInjectText)
    .filter(Boolean)
    .join('\n\n')
    .trim()
  if (!joined) return ''
  return expandCotInjectMacros(joined, {
    globals: { ...getCotGlobalVars(), ...(macro?.globals ?? {}) },
    userName: macro?.expandNames ? macro.userName : undefined,
    charName: macro?.expandNames ? macro.charName : undefined,
    missingGlobal: 'empty',
  })
}

/** 组装线上思维链；有启用条目时整段替换内置，否则 null */
export function resolveOnlineThinkingChainAppendix(
  macro?: CotAssembleMacroOpts,
): string | null {
  const entries = getActiveCotEntriesForScene('online', 'thinkingChain')
  if (!entries.length) return null
  const text = joinEnabledEntries(entries, macro)
  return text || null
}

/** 组装线下思维链；有启用条目时整段替换内置场记包，否则 null */
export function resolveOfflineThinkingChainBooksPrompt(
  macro?: CotAssembleMacroOpts,
): string | null {
  const entries = getActiveCotEntriesForScene('offline', 'thinkingChain')
  if (!entries.length) return null
  const text = joinEnabledEntries(entries, macro)
  return text || null
}

/** 组装线上自定义提示词；有启用条目时整段替换 WECHAT_CORE 扮演主壳（沙盒/格式永不替换） */
export function resolveOnlineReplyStyleAppendix(
  macro?: CotAssembleMacroOpts,
): string | null {
  const entries = getActiveCotEntriesForScene('online', 'replyStyle')
  if (!entries.length) return null
  const text = joinEnabledEntries(entries, macro)
  return text || null
}

/** 组装线下自定义提示词；有启用条目时替换扮演总规则+写作板块，并覆盖沙盒与禁词硬钉（输出壳仍保留） */
export function resolveOfflineReplyStyleAppendix(
  macro?: CotAssembleMacroOpts,
): string | null {
  const entries = getActiveCotEntriesForScene('offline', 'replyStyle')
  if (!entries.length) return null
  const text = joinEnabledEntries(entries, macro)
  return text || null
}
