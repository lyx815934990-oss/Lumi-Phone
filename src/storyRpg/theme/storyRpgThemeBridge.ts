import type { CSSProperties } from 'react'
import {
  buildDatingStoryAppearanceCssVars,
  normalizeDatingStoryAppearance,
  resolveDatingStoryTokens,
  type DatingStoryAppearance,
} from '../../phone/apps/wechat/dating/datingStoryAppearance'

export type StoryRpgThemeCssVars = {
  '--sr-bg': string
  '--sr-bg-grad': string
  '--sr-panel': string
  '--sr-panel-elevated': string
  '--sr-gold': string
  '--sr-gold-dim': string
  '--sr-gold-on': string
  '--sr-gold-glow': string
  '--sr-text': string
  '--sr-text-muted': string
  '--sr-text-soft': string
  '--sr-text-faint': string
  '--sr-border': string
  '--sr-glass': string
  '--sr-glass-strong': string
  '--sr-header-bg': string
  '--sr-console-bg': string
  '--sr-prose-em': string
}

/** 将约会色卡映射为 Story RPG CSS Variables */
export function buildStoryRpgThemeStyle(appearance?: DatingStoryAppearance | unknown): CSSProperties {
  const a = normalizeDatingStoryAppearance(appearance)
  const t = resolveDatingStoryTokens(a)
  const night = a.dayNight === 'night'
  const ds = buildDatingStoryAppearanceCssVars(a)

  return {
    background: t.bgGrad || t.bg,
    color: t.ink,
    ...ds,
    '--sr-bg': t.bg,
    '--sr-bg-grad': t.bgGrad,
    '--sr-panel': t.surface,
    '--sr-panel-elevated': t.bgElevated,
    '--sr-gold': t.accent,
    '--sr-gold-dim': night ? t.accent : t.inkSoft,
    '--sr-gold-on': t.accentOn,
    '--sr-gold-glow': t.accentSoft,
    '--sr-text': t.ink,
    '--sr-text-muted': t.muted,
    '--sr-text-soft': t.inkSoft,
    '--sr-text-faint': night ? 'rgba(255,255,255,0.32)' : `${t.muted}99`,
    '--sr-border': t.rule,
    '--sr-glass': night ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.42)',
    '--sr-glass-strong': night ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.55)',
    '--sr-header-bg': night ? `${t.bg}cc` : `${t.bgElevated}f0`,
    '--sr-console-bg': night ? `${t.bg}e6` : `${t.bgElevated}f5`,
    '--sr-prose-em': t.muted,
    '--plot-dialogue-fg': t.muted,
    '--plot-inner-os-fg': t.accent,
  } as CSSProperties
}
