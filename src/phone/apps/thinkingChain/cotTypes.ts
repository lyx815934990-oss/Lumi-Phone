/** 预设作用范围：通用 / 线上专用 / 线下专用 */
export type CotPresetScope = 'online' | 'offline' | 'both'

/** 提示词（始终可注入文风） / 思维链（仅开思维链时注入） */
export type CotPresetKind = 'replyStyle' | 'thinkingChain'

export type CoTEntry = {
  id: string
  /** 编号 / 拼接优先级（越小越靠前） */
  order: number
  /** 纯文本标题，不解析特殊字符 */
  title: string
  content: string
  enabled: boolean
  /** 展示用子标签（手动添加，与标题无关） */
  tags: string[]
}

/** 预设内正则：对模型可见输出做查找替换（仅本预设启用时生效） */
export type CotRegexRule = {
  id: string
  order: number
  /** 规则名 */
  name: string
  /** 查找：普通模式，或 /pattern/flags */
  find: string
  /** 替换（支持 $1；`\n` `\t` 会转义） */
  replace: string
  enabled: boolean
  /**
   * 配套分组（如「留光」「众生相」）；导入时从【名称】前缀推断。
   * 编辑器按配套分 tab 展示，避免全部堆在一个正则页。
   */
  group?: string
  /**
   * 对齐酒馆：仅作用于「拼进 prompt 的历史」（如只留摘要）。
   * 展示正文时不应套用这类规则。
   */
  promptOnly?: boolean
  /**
   * 对齐酒馆：仅作用于展示（美化 HTML 等）。
   * 与 promptOnly 同时为 true 时两边都生效。
   */
  markdownOnly?: boolean
}

/** 无前缀时的默认配套名 */
export const COT_REGEX_GROUP_OTHER = '其他'

/** 从 group 字段或规则名【配套】前缀解析分组 */
export function inferCotRegexGroup(rule: Pick<CotRegexRule, 'name' | 'group'>): string {
  const g = String(rule.group ?? '').trim()
  if (g) return g.slice(0, 24)
  const n = String(rule.name ?? '').trim()
  const bracket = n.match(/^【\s*([^】]+?)\s*】/)
  if (bracket?.[1]?.trim()) return bracket[1].trim().slice(0, 24)
  const sq = n.match(/^\[\s*([^\]]+?)\s*\]/)
  if (sq?.[1]?.trim()) return sq[1].trim().slice(0, 24)
  // 月读美化-… / MoM美化-… → 月读 / MoM
  const mom = n.match(/^([A-Za-z\u4e00-\u9fff]{2,16})美化/)
  if (mom?.[1]?.trim()) return mom[1].trim().slice(0, 24)
  // 月读必开-[1]… / 月读选开-… → 月读
  const suite = n.match(/^([A-Za-z\u4e00-\u9fff]{2,12})(?:必开|选开|美化)[-—\[（(]/)
  if (suite?.[1]?.trim()) return suite[1].trim().slice(0, 24)
  return COT_REGEX_GROUP_OTHER
}

export type CoTPreset = {
  id: string
  name: string
  entries: CoTEntry[]
  /** 输出美化 / 清理正则（不注入 prompt） */
  regexRules: CotRegexRule[]
  /** 整套预设的作用范围 */
  scope: CotPresetScope
  /** 提示词 or 思维链 */
  kind: CotPresetKind
  /** 分类标签（用户自定义） */
  tags: string[]
  updatedAt: number
}

export const COT_SYSTEM_PRESET_ID = 'system'

/**
 * 启用规则（提示词 / 思维链各自独立一套）：
 * - 通用 / 线上 / 线下 各至多启用 1 个自定义预设
 * - 启用「通用」时：线上+线下都走该预设，不可再启用线上/线下专用
 * - 启用「线上」或「线下」专用时：不可再启用通用（若当前是通用则拆开）
 */
export type CotStoreState = {
  activeReplyStyleOnlineId: string
  activeReplyStyleOfflineId: string
  activeThinkingOnlineId: string
  activeThinkingOfflineId: string
  presets: CoTPreset[]
  /**
   * @deprecated 兼容旧读写：等同 activeThinkingOnlineId
   */
  activeOnlineId?: string
  /**
   * @deprecated 兼容旧读写：等同 activeThinkingOfflineId
   */
  activeOfflineId?: string
}

export type CotExportPayload = {
  version: 1 | 2
  kind: 'lumi-thinking-chain' | 'lumi-prompt-cot'
  exportedAt: number
  activeReplyStyleOnlineId?: string
  activeReplyStyleOfflineId?: string
  activeThinkingOnlineId?: string
  activeThinkingOfflineId?: string
  /** 旧字段：视为思维链启用位 */
  activeOnlineId?: string
  activeOfflineId?: string
  presets: CoTPreset[]
}
