import type { CSSProperties } from 'react'
import { LUMI_SHELL, LUMI_SHELL_FONT } from '../lumiShellTheme'

/** 过渡仪式等临时色（与默认色卡豆青浅咖日间接近） */
export const DATING_COMFORT = {
  bg: '#DEE9DC',
  card: '#F4F8F3',
  snow: '#F4F8F3',
  chip: '#EAF1E8',
  text: '#594842',
  textMuted: '#8A807A',
  grayMid: '#8A807A',
  border: 'rgba(89,72,66,0.10)',
  grayLight: 'rgba(89,72,66,0.10)',
  surface: '#EAF1E8',
  surfaceDeep: '#DEE9DC',
  accent: '#7A8F72',
  accentOn: '#FFFFFF',
  accentSoft: 'rgba(183, 192, 175, 0.45)',
  dialogueBg: '#E8EFE6',
  dialogueHover: 'rgba(122, 143, 114, 0.12)',
} as const

/** 选角色 / 约会 tab 列表页 — 跟 Lumi 纸墨 */
export const DATING_LIST_THEME = {
  bg: LUMI_SHELL.paper,
  text: LUMI_SHELL.ink,
  textMuted: LUMI_SHELL.mist,
  border: LUMI_SHELL.hairline,
  chip: LUMI_SHELL.card,
  accent: LUMI_SHELL.ink,
  accentOn: LUMI_SHELL.card,
  mist: LUMI_SHELL.mist,
  surface: LUMI_SHELL.card,
  surfaceStrong: LUMI_SHELL.card,
} as const

/** @deprecated 列表页请用 DATING_LIST_THEME */
export const DATING_THEME = DATING_LIST_THEME

export const DATING_THEME_FONT = LUMI_SHELL_FONT

export function datingShellStyle(): CSSProperties {
  return {
    background: LUMI_SHELL.paper,
    color: LUMI_SHELL.ink,
    fontFamily: DATING_THEME_FONT,
  }
}

export function datingSoftCardStyle(): CSSProperties {
  return {
    borderRadius: 20,
    border: `1px solid ${DATING_LIST_THEME.border}`,
    background: DATING_LIST_THEME.surfaceStrong,
    boxShadow: '0 8px 24px rgba(16, 16, 18, 0.04)',
  }
}

export function datingThreadCapsuleStyle(): CSSProperties {
  return {
    borderRadius: 16,
    border: `1px solid ${DATING_LIST_THEME.border}`,
    background: DATING_LIST_THEME.surface,
    boxShadow: '0 2px 8px rgba(16, 16, 18, 0.03)',
  }
}
