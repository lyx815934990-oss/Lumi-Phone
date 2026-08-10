import type { CSSProperties } from 'react'

export type WidgetAppearance = {
  /** 背景色（hex） */
  bgColor: string
  /** 主文字色（hex） */
  textColor: string
  /** 背景透明度 0.12~1 */
  opacity: number
  /** 照片/背景图模糊 px 0~28（filter，非 backdrop） */
  blur: number
}

export const ACRYLIC_APPEARANCE: WidgetAppearance = {
  bgColor: '#ffffff',
  textColor: '#2c2c2e',
  opacity: 0.22,
  blur: 12,
}

export const PAPER_APPEARANCE: WidgetAppearance = {
  bgColor: '#f3f1ec',
  textColor: '#2c2c2e',
  opacity: 0.96,
  blur: 0,
}

export const POLAROID_APPEARANCE: WidgetAppearance = {
  bgColor: '#faf9f6',
  textColor: '#2c2c2e',
  opacity: 1,
  blur: 0,
}

export const MUSIC_APPEARANCE: WidgetAppearance = {
  bgColor: '#1c1c1e',
  textColor: '#ffffff',
  opacity: 0.82,
  blur: 20,
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

function isHex(v: string): boolean {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v)
}

function expandHex(hex: string): string {
  if (hex.length === 4) {
    const r = hex[1]
    const g = hex[2]
    const b = hex[3]
    return `#${r}${r}${g}${g}${b}${b}`
  }
  return hex
}

export function hexToRgba(hex: string, alpha: number): string {
  const h = expandHex(hex.trim())
  if (!isHex(h)) return `rgba(255,255,255,${clamp(alpha, 0, 1)})`
  const n = parseInt(h.slice(1), 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  return `rgba(${r},${g},${b},${clamp(alpha, 0, 1)})`
}

export function mutedFrom(hex: string, alpha = 0.48): string {
  return hexToRgba(hex, alpha)
}

export function parseAppearance(
  raw: unknown,
  defaults: WidgetAppearance,
): WidgetAppearance {
  if (!raw || typeof raw !== 'object') return { ...defaults }
  const o = raw as Record<string, unknown>
  const bg =
    typeof o.bgColor === 'string' && isHex(o.bgColor.trim())
      ? expandHex(o.bgColor.trim())
      : defaults.bgColor
  const text =
    typeof o.textColor === 'string' && isHex(o.textColor.trim())
      ? expandHex(o.textColor.trim())
      : defaults.textColor
  const opacity =
    typeof o.opacity === 'number' && Number.isFinite(o.opacity)
      ? clamp(o.opacity, 0.12, 1)
      : defaults.opacity
  const blur =
    typeof o.blur === 'number' && Number.isFinite(o.blur)
      ? clamp(Math.round(o.blur), 0, 28)
      : defaults.blur
  return { bgColor: bg, textColor: text, opacity, blur }
}

export function appearanceShellStyle(a: WidgetAppearance): CSSProperties {
  return {
    background: hexToRgba(a.bgColor, a.opacity),
    color: a.textColor,
    borderColor: hexToRgba(a.textColor, 0.12),
  }
}

/** 对照片 / 背景图施加真实模糊（CSS filter） */
export function imageBlurStyle(blur: number): CSSProperties {
  if (!(blur > 0)) return {}
  return {
    filter: `blur(${blur}px)`,
    // 略放大，避免模糊后边缘露底
    transform: 'scale(1.06)',
    transformOrigin: 'center',
  }
}
