import type { CSSProperties } from 'react'

import type { WeChatBubbleTheme } from '../../types'

/**
 * 各 Messenger 气泡模版的「原机」系统字体栈。
 * 仅在套用微信 App / iMessage / Telegram / Talkmaker 主题气泡时注入到 --wx-chat-font；
 * Lumi 默认气泡不注入，聊天正文跟随 --wx-font → 全局 --phone-font。
 */
export const BUBBLE_TEMPLATE_FONT_STACKS = {
  wechat:
    '-apple-system, "Helvetica Neue", Helvetica, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "微软雅黑", Arial, sans-serif',
  imessage:
    '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", "PingFang SC", sans-serif',
  telegram: 'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  talkmaker:
    '-apple-system, "Apple SD Gothic Neo", "Malgun Gothic", "Nanum Gothic", "PingFang SC", "Noto Sans CJK SC", sans-serif',
} as const

export type BubbleTemplateFontStyle = keyof typeof BUBBLE_TEMPLATE_FONT_STACKS

export function bubbleTemplateFontFamily(style: BubbleTemplateFontStyle | string | undefined): string {
  const key = style as BubbleTemplateFontStyle
  return BUBBLE_TEMPLATE_FONT_STACKS[key] ?? BUBBLE_TEMPLATE_FONT_STACKS.wechat
}

/**
 * 聊天展示字体：
 * - 有 Messenger 尾巴主题 → 原机系统字体栈
 * - 无尾巴（Lumi 默认）→ null，跟随全局 --wx-font
 */
export function resolveChatDisplayFontFamily(bubble: WeChatBubbleTheme): string | null {
  const style = bubble.bubbleTailStyle
  if (!style) return null
  return bubbleTemplateFontFamily(style)
}

export function chatDisplayFontCssVars(fontFamily: string | null | undefined): CSSProperties | undefined {
  if (!fontFamily?.trim()) return undefined
  return { ['--wx-chat-font' as string]: fontFamily.trim() }
}

export function isBubbleTemplateFontActive(bubble: WeChatBubbleTheme): boolean {
  return resolveChatDisplayFontFamily(bubble) != null
}

/** 曾被模版/预设写入 wechatTheme.fontFamily（整 App 锁字）的栈，迁移时清空为跟随全局 */
export function isLegacyWeChatLockedFontStack(fontFamily: string): boolean {
  const s = fontFamily.trim()
  if (!s) return false
  return (Object.values(BUBBLE_TEMPLATE_FONT_STACKS) as string[]).includes(s)
}
