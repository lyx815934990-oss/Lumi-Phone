/** Lumi 机 · 微信主界面设计基调（Paper / Ink，无品牌强调色） */

import type { CSSProperties } from 'react'

export const LUMI_SHELL = {
  paper: '#F7F6F4',
  ink: '#101012',
  card: '#FFFFFF',
  mist: '#8B8B8F',
  hairline: '#E6E4E0',
  /** 仅未读数字徽标与「[草稿]」文案 */
  badgeRed: '#E5484D',
  /** 消息列表分组卡片圆角 */
  cardRadiusPx: 20,
} as const

/** 跟随微信主题字 / 全局字（空覆盖时回退系统 UI） */
export const LUMI_SHELL_FONT =
  'var(--wx-font, var(--phone-font, system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Text", "PingFang SC", "PingFang TC", "HarmonyOS Sans SC", "HarmonyOS Sans", "Hiragino Sans GB", "Microsoft YaHei UI", "Microsoft YaHei", "Segoe UI", sans-serif))'

/**
 * 数字/时间：跟随全局数字字体（--phone-num-font）。
 * 注意：不要把多字体栈写进 var() 的 fallback（逗号会拆坏 var 参数）。
 */
export const LUMI_SHELL_NUM_FONT = 'var(--phone-num-font)'

/** 数字样式：与全站 phoneNumStyle 一致（含 tabular / tnum） */
export const LUMI_SHELL_NUM_STYLE = {
  fontFamily: LUMI_SHELL_NUM_FONT,
  fontVariantNumeric: 'tabular-nums',
  fontFeatureSettings: '"tnum" 1, "lnum" 1',
} as const satisfies CSSProperties

/** 液态玻璃底栏几何 */
export const LUMI_LIQUID_NAV = {
  heightPx: 60,
  bottomPx: 14,
  sidePct: 6,
  radiusPx: 30,
  indicatorSizePx: 44,
  /**
   * 列表底留白：底栏离底 + 栏高 + 约一行菜单高度，保证末项（如「设置」）能完整滚出栏上方可点。
   * 14 + 60 + 88 ≈ 162
   */
  listPadBottomPx: 168,
} as const

/** 悬浮底栏下方可滚内容留白（含安全区） */
export const LUMI_LIQUID_NAV_CONTENT_PAD_BOTTOM =
  `calc(${LUMI_LIQUID_NAV.listPadBottomPx}px + env(safe-area-inset-bottom, 0px))` as const

/** 消息列表：独立液态玻璃胶囊行 */
export const LUMI_THREAD_CAPSULE = {
  /** 全圆角胶囊 */
  radiusPx: 999,
  gapPx: 10,
  background: 'rgba(255, 255, 255, 0.62)',
  /** 滑动层前景需更不透，避免动作条透出 */
  foreground: 'rgba(255, 255, 255, 0.88)',
  border: '1px solid rgba(255, 255, 255, 0.72)',
  blur: 'blur(22px) saturate(165%)',
  shadow: '0 6px 20px rgba(16, 16, 18, 0.07), inset 0 1px 0 rgba(255, 255, 255, 0.9)',
} as const

export function lumiThreadCapsuleStyle(): CSSProperties {
  return {
    borderRadius: LUMI_THREAD_CAPSULE.radiusPx,
    background: LUMI_THREAD_CAPSULE.background,
    border: LUMI_THREAD_CAPSULE.border,
    boxShadow: LUMI_THREAD_CAPSULE.shadow,
    backdropFilter: LUMI_THREAD_CAPSULE.blur,
    WebkitBackdropFilter: LUMI_THREAD_CAPSULE.blur,
  }
}

export function isLumiShellDarkBackground(cssColor: string | undefined | null): boolean {
  const raw = String(cssColor || '').trim()
  if (!raw) return false
  const hex = raw.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)
  if (hex) {
    let h = hex[1]!
    if (h.length === 3) h = h.split('').map((c) => c + c).join('')
    const r = parseInt(h.slice(0, 2), 16)
    const g = parseInt(h.slice(2, 4), 16)
    const b = parseInt(h.slice(4, 6), 16)
    const luma = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
    return luma < 0.42
  }
  const rgb = raw.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i)
  if (rgb) {
    const r = Number(rgb[1])
    const g = Number(rgb[2])
    const b = Number(rgb[3])
    const luma = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
    return luma < 0.42
  }
  return false
}
