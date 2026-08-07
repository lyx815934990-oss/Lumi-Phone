import type { CSSProperties } from 'react'

import type { WeChatChatRoomBg, WeChatChatRoomGradientType } from '../../types'

function pickStops(bg: Extract<WeChatChatRoomBg, { mode: 'gradient' }>): string[] {
  if (Array.isArray(bg.stops) && bg.stops.length > 0) {
    return bg.stops.map((s) => String(s).trim()).filter(Boolean)
  }
  const a = String(bg.colorStart ?? '').trim()
  const b = String(bg.colorEnd ?? '').trim()
  if (a && b) return [a, b]
  if (a) return [a, a]
  if (b) return [b, b]
  return []
}

/** 渐变编译为可用的 CSS background 值 */
export function wechatChatRoomGradientCss(
  bg: Extract<WeChatChatRoomBg, { mode: 'gradient' }>,
): string {
  const raw = String(bg.css ?? '').trim()
  if (raw) return raw
  const stops = pickStops(bg)
  if (stops.length === 0) return '#EDEDED'
  if (stops.length === 1) return stops[0]!
  const type: WeChatChatRoomGradientType = bg.gradientType === 'radial' ? 'radial' : 'linear'
  if (type === 'radial') {
    return `radial-gradient(circle at center, ${stops.join(', ')})`
  }
  const angle = typeof bg.angle === 'number' && Number.isFinite(bg.angle) ? bg.angle : 180
  return `linear-gradient(${angle}deg, ${stops.join(', ')})`
}

export function wechatChatRoomBgEqual(a: WeChatChatRoomBg, b: WeChatChatRoomBg): boolean {
  if (a.mode !== b.mode) return false
  if (a.mode === 'solid' && b.mode === 'solid') return a.color === b.color
  if (a.mode === 'image' && b.mode === 'image') {
    return a.imageUrl === b.imageUrl && a.fallbackColor === b.fallbackColor
  }
  if (a.mode === 'gradient' && b.mode === 'gradient') {
    return (
      wechatChatRoomGradientCss(a) === wechatChatRoomGradientCss(b) &&
      wechatChatRoomBgFallbackColor(a) === wechatChatRoomBgFallbackColor(b)
    )
  }
  return false
}

export function wechatChatRoomBgFallbackColor(bg: WeChatChatRoomBg): string {
  if (bg.mode === 'solid') return bg.color
  if (bg.mode === 'image') return bg.fallbackColor
  const fb = String(bg.fallbackColor ?? '').trim()
  if (fb) return fb
  const stops = pickStops(bg)
  return stops[0] || '#EDEDED'
}

/**
 * 转成可铺满消息区的背景样式。
 * solid → backgroundColor；image → 图；gradient → background（可含 linear/radial）。
 */
export function wechatChatRoomBgToStyle(
  bg: WeChatChatRoomBg,
  resolveImageUrl: (path: string) => string,
): CSSProperties {
  if (bg.mode === 'solid') {
    return { backgroundColor: bg.color }
  }
  if (bg.mode === 'gradient') {
    const css = wechatChatRoomGradientCss(bg)
    return {
      backgroundColor: wechatChatRoomBgFallbackColor(bg),
      backgroundImage: css,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
    }
  }
  const url = resolveImageUrl(bg.imageUrl)
  return {
    backgroundColor: bg.fallbackColor,
    backgroundImage: url ? `url(${url})` : undefined,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
  }
}

/** 主题制作机舞台等：直接给 CSS `background` 用的字符串 */
export function wechatChatRoomBgToCssBackground(
  bg: WeChatChatRoomBg,
  resolveImageUrl?: (path: string) => string,
): string {
  if (bg.mode === 'solid') return bg.color
  if (bg.mode === 'gradient') return wechatChatRoomGradientCss(bg)
  const resolve = resolveImageUrl ?? ((p: string) => p)
  const url = resolve(bg.imageUrl)
  if (!url) return bg.fallbackColor
  return `center / cover no-repeat url(${JSON.stringify(url)}), ${bg.fallbackColor}`
}
