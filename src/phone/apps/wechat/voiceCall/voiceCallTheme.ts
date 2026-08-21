import type { CSSProperties } from 'react'

import { LUMI_SHELL, LUMI_SHELL_FONT } from '../lumiShellTheme'

/** 通话页专属色板（复用 Lumi 机基调 + 电话惯例绿/红） */
export const VC = {
  paper: LUMI_SHELL.paper,
  ink: LUMI_SHELL.ink,
  card: LUMI_SHELL.card,
  mist: LUMI_SHELL.mist,
  hairline: LUMI_SHELL.hairline,
  callGreen: '#34C759',
  endRed: '#FF3B30',
  transcriptUser: '#4A4A4C',
} as const

/** 中文 UI：PingFang；与壳层 --wx-font 对齐 */
export const VC_UI_FONT = LUMI_SHELL_FONT

/** 时长等数字：Inter 制表数字，避免每秒抖动 */
export const VC_NUM_STYLE = {
  fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, sans-serif',
  fontVariantNumeric: 'tabular-nums',
  fontFeatureSettings: '"tnum" 1, "lnum" 1',
} as const satisfies CSSProperties

/** 主界面导航栏液态玻璃（浅色版） */
export function vcLiquidGlassLight(extra?: CSSProperties): CSSProperties {
  return {
    background: 'rgba(247, 246, 244, 0.55)',
    backdropFilter: 'blur(24px) saturate(160%)',
    WebkitBackdropFilter: 'blur(24px) saturate(160%)',
    border: '1px solid rgba(255, 255, 255, 0.6)',
    boxShadow: '0 10px 30px rgba(16, 16, 18, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.85)',
    ...extra,
  }
}

/** 接通等待页底部控件：深色玻璃 */
export function vcLiquidGlassDark(extra?: CSSProperties): CSSProperties {
  return {
    background: 'rgba(16, 16, 18, 0.5)',
    backdropFilter: 'blur(24px) saturate(160%)',
    WebkitBackdropFilter: 'blur(24px) saturate(160%)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.07)',
    ...extra,
  }
}

export function estimateSpeechDurationSec(text: string): number {
  const t = text.trim()
  if (!t) return 1
  // ~4 字/秒，夹在 1–59
  return Math.max(1, Math.min(59, Math.round(t.length / 4)))
}

export function fmtCallDuration(sec: number): string {
  const s = Math.max(0, Math.floor(sec))
  const h = Math.floor(s / 3600)
  const mm = Math.floor((s % 3600) / 60)
  const ss = s % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  if (h > 0) return `${h}:${pad(mm)}:${pad(ss)}`
  return `${pad(mm)}:${pad(ss)}`
}

/** 稳定伪随机波形高度（0.2–1），按消息 id 播种 */
export function voiceWaveHeights(seed: string, count: number): number[] {
  let h = 2166136261
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  const out: number[] = []
  for (let i = 0; i < count; i += 1) {
    h ^= h << 13
    h ^= h >>> 17
    h ^= h << 5
    const n = (h >>> 0) / 0xffffffff
    out.push(0.22 + n * 0.78)
  }
  return out
}

export function voiceWaveWidthPx(durationSec: number): number {
  const d = Math.max(1, durationSec)
  return Math.round(Math.min(220, Math.max(80, 72 + d * 12)))
}
