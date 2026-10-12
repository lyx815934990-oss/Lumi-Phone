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

export type CoTPreset = {
  id: string
  name: string
  entries: CoTEntry[]
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
