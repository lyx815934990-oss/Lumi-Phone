import type { CSSProperties } from 'react'

/** Lumi 机 · 档案室设计基调（唯一强调色 Seal Amber） */
export const LA = {
  paper: '#F7F6F4',
  ink: '#101012',
  card: '#FFFFFF',
  mist: '#8B8B8F',
  hairline: '#E6E4E0',
  amber: '#B98A46',
  amberSoft: 'rgba(185, 138, 70, 0.12)',
  mistSoft: 'rgba(139, 139, 143, 0.14)',
  inkSoft: 'rgba(16, 16, 18, 0.18)',
  redact: '#D8D6D2',
  redactDeep: 'rgba(16, 16, 18, 0.22)',
} as const

export const LA_FONT_CN =
  '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif'
export const LA_FONT_EN = 'Inter, "PingFang SC", system-ui, sans-serif'

/** 档案目录感：Inter 大写 + 展开字距 */
export const laCatalogLabelStyle: CSSProperties = {
  fontFamily: LA_FONT_EN,
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: LA.mist,
}

export const laPageStyle: CSSProperties = {
  fontFamily: LA_FONT_CN,
  backgroundColor: LA.paper,
  color: LA.ink,
}

export const laEase = [0.22, 1, 0.36, 1] as const
