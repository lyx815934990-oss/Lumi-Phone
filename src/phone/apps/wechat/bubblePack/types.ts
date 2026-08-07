import type { WeChatAvatarChrome } from '../wechatAvatarChrome'
import type { WeChatBubblePreset } from '../wechatBubblePresets'

/** 文件扩展名（内容为 JSON） */
export const LUMI_BUBBLE_PACK_EXT = '.lumiBubblePack'

export const LUMI_BUBBLE_PACK_FORMAT = 'lumi-wechat-bubble-pack' as const
/** 当前写出版本；解析仍接受 v1 */
export const LUMI_BUBBLE_PACK_VERSION = 2 as const
export const LUMI_BUBBLE_PACK_VERSION_MIN = 1 as const

export type LumiBubblePackMeta = {
  id: string
  name: string
  description: string
  author?: string
}

export type LumiBubblePackEmbeddedAsset = {
  mime: string
  dataUrl: string
  name?: string
}

/**
 * structured：走 Lumi / 微信等内置特殊消息皮 + 可选 CSS 微调
 * css：只留 DOM 结构壳，视觉完全由 scopedCss 控制（糯叽机同款）
 */
export type LumiBubblePackSkinEngine = 'structured' | 'css'

/**
 * 微信聊天气泡预设包（结构化，给 AI / 用户导入）
 * - preset：对齐内置 WeChatBubblePreset
 * - skinOverrides：可选，键为 --wx-chat-* / --wx-special-* CSS 变量名
 * - scopedCss：可选，仅作用于 [data-wx-chat-skin-scope]
 * - skinEngine：css 时不套默认特殊消息皮
 * - avatarChrome / assets：头像框与角标（v2）
 */
export type LumiWeChatBubblePack = {
  format: typeof LUMI_BUBBLE_PACK_FORMAT
  version: number
  meta: LumiBubblePackMeta
  preset: WeChatBubblePreset
  skinOverrides?: Record<string, string>
  scopedCss?: string
  /** 默认 structured；css = 纯 CSS 皮肤 */
  skinEngine?: LumiBubblePackSkinEngine
  avatarChrome?: WeChatAvatarChrome
  /** 可选内嵌资源；导入时写入 phoneKv */
  assets?: Record<string, LumiBubblePackEmbeddedAsset>
}

/** 允许写入 skinOverrides 的 CSS 变量前缀 */
export const LUMI_BUBBLE_PACK_SKIN_VAR_PREFIXES = ['--wx-chat-', '--wx-special-'] as const

export function normalizeLumiBubblePackSkinEngine(
  raw: unknown,
): LumiBubblePackSkinEngine | undefined {
  if (raw === 'css' || raw === 'structured') return raw
  return undefined
}

export function isCssSkinEngine(
  engine: LumiBubblePackSkinEngine | string | null | undefined,
): boolean {
  return engine === 'css'
}
