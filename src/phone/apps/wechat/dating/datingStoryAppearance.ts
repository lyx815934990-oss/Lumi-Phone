/**
 * 剧情页色卡 + 昼夜（随角色存档）。
 * UI 色卡面板可后接；此处保证 archive / Context 可 normalize 与落盘。
 */

import type { CSSProperties } from 'react'

export type DatingStoryDayNight = 'day' | 'night'

/** 内置色卡 id */
export type DatingStoryPaletteId =
  | 'mint_mocha'
  | 'soft_mist'
  | 'snow_shengjing'
  | 'pear_blossom'
  | 'morandi_lilac'
  | 'morandi_peach'
  | 'sea_mist_foam'
  | 'mist_pink_rose'
  | 'twilight_iris'
  | 'night_sakura_snow'
  | 'amber_lift'

export type DatingStoryAppearance = {
  paletteId: DatingStoryPaletteId
  dayNight: DatingStoryDayNight
  /** 剧情页弹幕文字色 #RRGGBB；默认白色 */
  danmakuColor?: string
  /** 剧情页弹幕不透明度 0.15～1；缺省 0.92 */
  danmakuOpacity?: number
  /** 字号 px；缺省 13 */
  danmakuFontSize?: number
  /** 自定义字体 CSS family（有 dataUrl 时生效） */
  danmakuFontFamily?: string
  /** 自定义字体原始文件名 */
  danmakuFontFileName?: string
  /** 自定义字体 data URL（ttf/otf/woff） */
  danmakuFontDataUrl?: string
  /** 底部背景条 */
  danmakuBarEnabled?: boolean
  danmakuBarColor?: string
  danmakuBarOpacity?: number
  /** 边缘发光 */
  danmakuGlowEnabled?: boolean
  danmakuGlowColor?: string
  /** 发光半径 px */
  danmakuGlowSize?: number
  /** 文字阴影 */
  danmakuShadowEnabled?: boolean
  danmakuShadowColor?: string
  danmakuShadowBlur?: number
  danmakuShadowOffsetX?: number
  danmakuShadowOffsetY?: number
}

/** 约会剧情页弹幕运行时视觉（由 appearance normalize） */
export type DatingStoryDanmakuVisual = {
  colorHex: string
  colorRgba: string
  opacity: number
  fontSize: number
  fontFamily: string | null
  fontDataUrl: string | null
  fontFileName: string | null
  barEnabled: boolean
  barColor: string
  barOpacity: number
  glowEnabled: boolean
  glowColor: string
  glowSize: number
  shadowEnabled: boolean
  shadowColor: string
  shadowBlur: number
  shadowOffsetX: number
  shadowOffsetY: number
}

export type DatingStoryTokenSet = {
  bg: string
  bgGrad: string
  bgElevated: string
  surface: string
  ink: string
  inkSoft: string
  muted: string
  rule: string
  accent: string
  accentOn: string
  accentSoft: string
  dialogue: string
  os: string
  comment: string
  danger: string
}

export type DatingStoryAppearanceCssVars = {
  '--ds-bg': string
  '--ds-bg-grad': string
  '--ds-bg-elevated': string
  '--ds-surface': string
  '--ds-ink': string
  '--ds-ink-soft': string
  '--ds-muted': string
  '--ds-rule': string
  '--ds-accent': string
  '--ds-accent-on': string
  '--ds-accent-soft': string
  '--ds-dialogue': string
  '--ds-os': string
  '--ds-comment': string
  '--ds-danger': string
}

const PALETTE_IDS: DatingStoryPaletteId[] = [
  'mint_mocha',
  'soft_mist',
  'snow_shengjing',
  'pear_blossom',
  'morandi_lilac',
  'morandi_peach',
  'sea_mist_foam',
  'mist_pink_rose',
  'twilight_iris',
  'night_sakura_snow',
  'amber_lift',
]

/** 日间色 */
const DAY_PALETTES: Record<DatingStoryPaletteId, DatingStoryTokenSet> = {
  mint_mocha: {
    bg: '#DEE9DC',
    bgGrad: 'linear-gradient(180deg, #E8F0E6 0%, #DEE9DC 48%, #D5E2D3 100%)',
    bgElevated: '#F4F8F3',
    surface: '#EAF1E8',
    ink: '#594842',
    inkSoft: '#685049',
    muted: '#8A807A',
    rule: 'rgba(89,72,66,0.10)',
    accent: '#7A8F72',
    accentOn: '#FFFFFF',
    accentSoft: 'rgba(183, 192, 175, 0.45)',
    dialogue: '#E8EFE6',
    os: '#F0F4EE',
    comment: '#EAF1E8',
    danger: '#B85C5C',
  },
  soft_mist: {
    bg: '#EFE4E9',
    bgGrad: 'linear-gradient(180deg, #F5ECF0 0%, #EFE4E9 50%, #E8DCE3 100%)',
    bgElevated: '#F7F1F4',
    surface: '#F7F1F4',
    ink: '#5F5F5F',
    inkSoft: '#7A7A7C',
    muted: '#A2A1A4',
    rule: 'rgba(95,95,95,0.12)',
    accent: '#BDBBBF',
    accentOn: '#FFFFFF',
    accentSoft: 'rgba(189, 187, 191, 0.40)',
    dialogue: '#F3EBEE',
    os: '#F8F3F5',
    comment: '#F7F1F4',
    danger: '#C06B6B',
  },
  snow_shengjing: {
    bg: '#D3DBE2',
    bgGrad: 'linear-gradient(180deg, #DEE4EA 0%, #D3DBE2 50%, #C8D1DA 100%)',
    bgElevated: '#E8EDF2',
    surface: '#E8EDF2',
    ink: '#828A93',
    inkSoft: '#6F7780',
    muted: '#B5BDC6',
    rule: 'rgba(130,138,147,0.16)',
    accent: '#C5CCD3',
    accentOn: '#3A424A',
    accentSoft: 'rgba(197, 204, 211, 0.45)',
    dialogue: '#E2E8EE',
    os: '#EEF2F6',
    comment: '#E8EDF2',
    danger: '#B07070',
  },
  pear_blossom: {
    bg: '#FFFAFC',
    bgGrad: 'linear-gradient(180deg, #FFFAFC 0%, #F0ECF4 52%, #E4DCE8 100%)',
    bgElevated: '#F7F3F8',
    surface: '#F0ECF4',
    ink: '#5A5260',
    inkSoft: '#6E6474',
    muted: '#A89EB0',
    rule: 'rgba(90,82,96,0.12)',
    accent: '#C8C0D0',
    accentOn: '#FFFFFF',
    accentSoft: 'rgba(200, 192, 208, 0.42)',
    dialogue: '#F5EFF6',
    os: '#F8F4F9',
    comment: '#F0ECF4',
    danger: '#C07080',
  },
  morandi_lilac: {
    bg: '#FFF5DF',
    bgGrad: 'linear-gradient(180deg, #FFF8EA 0%, #FFF5DF 45%, #E8E4F0 100%)',
    bgElevated: '#FFFBF0',
    surface: '#F5F0E8',
    ink: '#4A4C62',
    inkSoft: '#5E6078',
    muted: '#9092A8',
    rule: 'rgba(74,76,98,0.12)',
    accent: '#72749A',
    accentOn: '#FFFFFF',
    accentSoft: 'rgba(114, 116, 154, 0.32)',
    dialogue: '#F0EDE8',
    os: '#F5F2EC',
    comment: '#F5F0E8',
    danger: '#B87070',
  },
  morandi_peach: {
    bg: '#FCE5D7',
    bgGrad: 'linear-gradient(180deg, #FDF0E8 0%, #FCE5D7 48%, #E8EDF0 100%)',
    bgElevated: '#FEF4EE',
    surface: '#F8EBE2',
    ink: '#594842',
    inkSoft: '#685049',
    muted: '#728B9A',
    rule: 'rgba(89,72,66,0.12)',
    accent: '#728B9A',
    accentOn: '#FFFFFF',
    accentSoft: 'rgba(114, 139, 154, 0.35)',
    dialogue: '#F5EBE4',
    os: '#F8F0EA',
    comment: '#F8EBE2',
    danger: '#B87070',
  },
  // 海盐桃奶 · #F7D8D5 / #E6B8BE / #F9F4E1 / #D0E5E2
  sea_mist_foam: {
    bg: '#F7D8D5',
    bgGrad: 'linear-gradient(180deg, #F9F4E1 0%, #F7D8D5 42%, #D0E5E2 100%)',
    bgElevated: '#F9F4E1',
    surface: '#F3E8E4',
    ink: '#5E4A4E',
    inkSoft: '#7A6268',
    muted: '#A88890',
    rule: 'rgba(94,74,78,0.12)',
    accent: '#E6B8BE',
    accentOn: '#5E4A4E',
    accentSoft: 'rgba(230, 184, 190, 0.45)',
    dialogue: '#F5ECE8',
    os: '#F9F4E1',
    comment: '#E8F0EE',
    danger: '#C07078',
  },
  // 浅玫雾粉 · #e8c8d0 / #fef6f6 / #c89aa8 / #f5dce0
  mist_pink_rose: {
    bg: '#F5DCE0',
    bgGrad: 'linear-gradient(180deg, #FEF6F6 0%, #F5DCE0 48%, #E8C8D0 100%)',
    bgElevated: '#FEF6F6',
    surface: '#F8E8EC',
    ink: '#5C4450',
    inkSoft: '#7A5E68',
    muted: '#A88894',
    rule: 'rgba(92,68,80,0.12)',
    accent: '#C89AA8',
    accentOn: '#FFFFFF',
    accentSoft: 'rgba(200, 154, 168, 0.40)',
    dialogue: '#F8ECEF',
    os: '#FEF6F6',
    comment: '#F0D8DE',
    danger: '#C07080',
  },
  // 暮光鸢尾 · #d7d2ee / #e6f5ff / #bbafcb / #ded0ad
  twilight_iris: {
    bg: '#D7D2EE',
    bgGrad: 'linear-gradient(180deg, #E6F5FF 0%, #D7D2EE 48%, #DED0AD 100%)',
    bgElevated: '#E6F5FF',
    surface: '#E4E0F2',
    ink: '#4A4560',
    inkSoft: '#625C78',
    muted: '#8E88A4',
    rule: 'rgba(74,69,96,0.12)',
    accent: '#BBAFCB',
    accentOn: '#3A3550',
    accentSoft: 'rgba(187, 175, 203, 0.42)',
    dialogue: '#E8E6F4',
    os: '#E6F5FF',
    comment: '#E8E0C8',
    danger: '#C07888',
  },
  // 夜樱粉雪 · #f0d9e4 / #c1a0ac / #806c79 / #4a3f4b
  night_sakura_snow: {
    bg: '#F0D9E4',
    bgGrad: 'linear-gradient(180deg, #F6E8EE 0%, #F0D9E4 50%, #C1A0AC 100%)',
    bgElevated: '#F6E8EE',
    surface: '#EAD0DC',
    ink: '#4A3F4B',
    inkSoft: '#806C79',
    muted: '#A08894',
    rule: 'rgba(74,63,75,0.14)',
    accent: '#806C79',
    accentOn: '#FFFFFF',
    accentSoft: 'rgba(193, 160, 172, 0.42)',
    dialogue: '#F2E0E8',
    os: '#F6E8EE',
    comment: '#E4C8D4',
    danger: '#B87080',
  },
  // 暖琥珀光 · Lift #ebe6e6 + Amberline #c38769
  amber_lift: {
    bg: '#EBE6E6',
    bgGrad: 'linear-gradient(180deg, #F4F0F0 0%, #EBE6E6 50%, #E2D8D4 100%)',
    bgElevated: '#F4F0F0',
    surface: '#F0EBEA',
    ink: '#5A4038',
    inkSoft: '#7A5A4E',
    muted: '#A08880',
    rule: 'rgba(90,64,56,0.12)',
    accent: '#C38769',
    accentOn: '#FFFFFF',
    accentSoft: 'rgba(195, 135, 105, 0.35)',
    dialogue: '#F2ECEA',
    os: '#F6F2F0',
    comment: '#EBE6E6',
    danger: '#C07070',
  },
}

/** 夜间：不纯黑，随色卡偏暖/偏冷 */
const NIGHT_PALETTES: Record<DatingStoryPaletteId, DatingStoryTokenSet> = {
  mint_mocha: {
    bg: '#1C1A19',
    bgGrad: 'linear-gradient(180deg, #24201E 0%, #1C1A19 55%, #181614 100%)',
    bgElevated: '#2A2624',
    surface: '#262220',
    ink: '#D8D0C8',
    inkSoft: '#C4B8AE',
    muted: '#9A9088',
    rule: 'rgba(216,208,200,0.12)',
    accent: '#8FA388',
    accentOn: '#1C1A19',
    accentSoft: 'rgba(143, 163, 136, 0.28)',
    dialogue: '#2E2A27',
    os: '#322E2B',
    comment: '#262220',
    danger: '#D08080',
  },
  soft_mist: {
    bg: '#1F1B1D',
    bgGrad: 'linear-gradient(180deg, #282226 0%, #1F1B1D 55%, #1A1618 100%)',
    bgElevated: '#2C2629',
    surface: '#282226',
    ink: '#D4CCD0',
    inkSoft: '#BDB4B8',
    muted: '#958E92',
    rule: 'rgba(212,204,208,0.12)',
    accent: '#B0AEB2',
    accentOn: '#1F1B1D',
    accentSoft: 'rgba(176, 174, 178, 0.28)',
    dialogue: '#322C30',
    os: '#362F33',
    comment: '#282226',
    danger: '#D08888',
  },
  snow_shengjing: {
    bg: '#1A1C20',
    bgGrad: 'linear-gradient(180deg, #222428 0%, #1A1C20 55%, #15171A 100%)',
    bgElevated: '#262A30',
    surface: '#22262B',
    ink: '#CFD4D9',
    inkSoft: '#B4BBC2',
    muted: '#8E969E',
    rule: 'rgba(207,212,217,0.12)',
    accent: '#A8B0B8',
    accentOn: '#1A1C20',
    accentSoft: 'rgba(168, 176, 184, 0.28)',
    dialogue: '#2A2E34',
    os: '#2E3339',
    comment: '#22262B',
    danger: '#C88888',
  },
  pear_blossom: {
    bg: '#1A161D',
    bgGrad: 'linear-gradient(180deg, #221E26 0%, #1A161D 55%, #141118 100%)',
    bgElevated: '#252029',
    surface: '#222026',
    ink: '#E4DCE8',
    inkSoft: '#C8BED0',
    muted: '#958E9E',
    rule: 'rgba(228,220,232,0.12)',
    accent: '#C8C0D0',
    accentOn: '#1A161D',
    accentSoft: 'rgba(200, 192, 208, 0.28)',
    dialogue: '#2C2830',
    os: '#302C34',
    comment: '#222026',
    danger: '#D08898',
  },
  morandi_lilac: {
    bg: '#1E1F28',
    bgGrad: 'linear-gradient(180deg, #262838 0%, #1E1F28 55%, #181920 100%)',
    bgElevated: '#2A2B38',
    surface: '#262730',
    ink: '#E8E4DC',
    inkSoft: '#C8C4BC',
    muted: '#9092A8',
    rule: 'rgba(232,228,220,0.12)',
    accent: '#72749A',
    accentOn: '#1E1F28',
    accentSoft: 'rgba(114, 116, 154, 0.32)',
    dialogue: '#2E3038',
    os: '#32343C',
    comment: '#262730',
    danger: '#D08888',
  },
  morandi_peach: {
    bg: '#1A1E22',
    bgGrad: 'linear-gradient(180deg, #222830 0%, #1A1E22 55%, #14181C 100%)',
    bgElevated: '#242A30',
    surface: '#20262C',
    ink: '#FCE5D7',
    inkSoft: '#D8C8BC',
    muted: '#728B9A',
    rule: 'rgba(252,229,215,0.12)',
    accent: '#728B9A',
    accentOn: '#1A1E22',
    accentSoft: 'rgba(114, 139, 154, 0.32)',
    dialogue: '#2A2E32',
    os: '#2E3236',
    comment: '#20262C',
    danger: '#D08888',
  },
  sea_mist_foam: {
    bg: '#1C1A1B',
    bgGrad: 'linear-gradient(180deg, #262022 0%, #1C1A1B 50%, #18201E 100%)',
    bgElevated: '#2A2626',
    surface: '#262222',
    ink: '#F7D8D5',
    inkSoft: '#E6B8BE',
    muted: '#A88890',
    rule: 'rgba(247,216,213,0.12)',
    accent: '#E6B8BE',
    accentOn: '#1C1A1B',
    accentSoft: 'rgba(230, 184, 190, 0.28)',
    dialogue: '#2E2828',
    os: '#322C2A',
    comment: '#262828',
    danger: '#D08890',
  },
  mist_pink_rose: {
    bg: '#1E1618',
    bgGrad: 'linear-gradient(180deg, #281E22 0%, #1E1618 55%, #181214 100%)',
    bgElevated: '#2A2226',
    surface: '#261E22',
    ink: '#F5DCE0',
    inkSoft: '#E8C8D0',
    muted: '#A88894',
    rule: 'rgba(245,220,224,0.12)',
    accent: '#C89AA8',
    accentOn: '#1E1618',
    accentSoft: 'rgba(200, 154, 168, 0.30)',
    dialogue: '#302428',
    os: '#34282C',
    comment: '#261E22',
    danger: '#D08898',
  },
  twilight_iris: {
    bg: '#18161F',
    bgGrad: 'linear-gradient(180deg, #201E2A 0%, #18161F 50%, #1A1E22 100%)',
    bgElevated: '#262430',
    surface: '#22202A',
    ink: '#E6F5FF',
    inkSoft: '#D7D2EE',
    muted: '#BBAFCB',
    rule: 'rgba(230,245,255,0.12)',
    accent: '#BBAFCB',
    accentOn: '#18161F',
    accentSoft: 'rgba(187, 175, 203, 0.30)',
    dialogue: '#2A2834',
    os: '#2E2C38',
    comment: '#2A2824',
    danger: '#D08898',
  },
  night_sakura_snow: {
    bg: '#4A3F4B',
    bgGrad: 'linear-gradient(180deg, #5A4C58 0%, #4A3F4B 50%, #3A323C 100%)',
    bgElevated: '#5A4C58',
    surface: '#564850',
    ink: '#F0D9E4',
    inkSoft: '#C1A0AC',
    muted: '#A08894',
    rule: 'rgba(240,217,228,0.14)',
    accent: '#C1A0AC',
    accentOn: '#4A3F4B',
    accentSoft: 'rgba(193, 160, 172, 0.32)',
    dialogue: '#5E5058',
    os: '#645660',
    comment: '#564850',
    danger: '#D090A0',
  },
  amber_lift: {
    bg: '#1C1816',
    bgGrad: 'linear-gradient(180deg, #26201C 0%, #1C1816 55%, #161210 100%)',
    bgElevated: '#2A2420',
    surface: '#26201C',
    ink: '#EBE6E6',
    inkSoft: '#D8C8BC',
    muted: '#A08880',
    rule: 'rgba(235,230,230,0.12)',
    accent: '#C38769',
    accentOn: '#1C1816',
    accentSoft: 'rgba(195, 135, 105, 0.30)',
    dialogue: '#302824',
    os: '#342C28',
    comment: '#26201C',
    danger: '#D08880',
  },
}

export const DATING_STORY_PALETTE_META: {
  id: DatingStoryPaletteId
  label: string
  swatch: string
  swatchGrad?: string
}[] = [
  { id: 'mint_mocha', label: '豆青浅咖', swatch: '#DEE9DC', swatchGrad: 'linear-gradient(135deg,#DEE9DC,#594842)' },
  { id: 'soft_mist', label: '藕灰粉调', swatch: '#EFE4E9', swatchGrad: 'linear-gradient(135deg,#EFE4E9,#5F5F5F)' },
  { id: 'snow_shengjing', label: '霜蓝晴空', swatch: '#D3DBE2', swatchGrad: 'linear-gradient(135deg,#D3DBE2,#828A93)' },
  { id: 'pear_blossom', label: '梨白淡紫', swatch: '#E4DCE8', swatchGrad: 'linear-gradient(135deg,#FFFAFC,#C8C0D0)' },
  { id: 'morandi_lilac', label: '米杏丁香', swatch: '#72749A', swatchGrad: 'linear-gradient(135deg,#FFF5DF,#72749A)' },
  { id: 'morandi_peach', label: '桃杏青灰', swatch: '#728B9A', swatchGrad: 'linear-gradient(135deg,#FCE5D7,#728B9A)' },
  {
    id: 'sea_mist_foam',
    label: '海盐桃奶',
    swatch: '#F7D8D5',
    swatchGrad: 'linear-gradient(135deg,#F9F4E1,#F7D8D5,#E6B8BE,#D0E5E2)',
  },
  {
    id: 'mist_pink_rose',
    label: '浅玫雾粉',
    swatch: '#E8C8D0',
    swatchGrad: 'linear-gradient(135deg,#FEF6F6,#F5DCE0,#E8C8D0,#C89AA8)',
  },
  {
    id: 'twilight_iris',
    label: '暮光鸢尾',
    swatch: '#D7D2EE',
    swatchGrad: 'linear-gradient(135deg,#E6F5FF,#D7D2EE,#BBAFCB,#DED0AD)',
  },
  {
    id: 'night_sakura_snow',
    label: '夜樱粉雪',
    swatch: '#C1A0AC',
    swatchGrad: 'linear-gradient(135deg,#F0D9E4,#C1A0AC,#806C79,#4A3F4B)',
  },
  {
    id: 'amber_lift',
    label: '暖琥珀光',
    swatch: '#C38769',
    swatchGrad: 'linear-gradient(135deg,#EBE6E6,#C38769)',
  },
]

export const DEFAULT_STORY_APPEARANCE: DatingStoryAppearance = {
  paletteId: 'soft_mist',
  dayNight: 'day',
  danmakuColor: '#FFFFFF',
  danmakuOpacity: 0.92,
  danmakuFontSize: 13,
  danmakuFontFamily: undefined,
  danmakuFontFileName: undefined,
  danmakuFontDataUrl: undefined,
  danmakuBarEnabled: false,
  danmakuBarColor: '#000000',
  danmakuBarOpacity: 0.35,
  danmakuGlowEnabled: false,
  danmakuGlowColor: '#FFFFFF',
  danmakuGlowSize: 4,
  danmakuShadowEnabled: true,
  danmakuShadowColor: '#000000',
  danmakuShadowBlur: 4,
  danmakuShadowOffsetX: 0,
  danmakuShadowOffsetY: 1,
}

const LEGACY_PALETTE_MAP: Record<string, DatingStoryPaletteId> = {
  // 已下架：黑曜石金 → 藕灰粉调（原「最舒服」）
  obsidian_gold: 'soft_mist',
  obsidian: 'soft_mist',
  gold: 'soft_mist',
  黑曜石: 'soft_mist',
  黑曜石金: 'soft_mist',
  mint_mocha: 'mint_mocha',
  mint: 'mint_mocha',
  comfort: 'mint_mocha',
  薄荷奶咖: 'mint_mocha',
  青雾拿铁: 'mint_mocha',
  豆青浅咖: 'mint_mocha',
  soft_mist: 'soft_mist',
  soft: 'soft_mist',
  mist: 'soft_mist',
  最舒服: 'soft_mist',
  雾纱午后: 'soft_mist',
  藕灰粉调: 'soft_mist',
  snow_shengjing: 'snow_shengjing',
  snow: 'snow_shengjing',
  雪落盛京: 'snow_shengjing',
  北城初雪: 'snow_shengjing',
  霜蓝晴空: 'snow_shengjing',
  pear_blossom: 'pear_blossom',
  pear: 'pear_blossom',
  梨花带雨: 'pear_blossom',
  白梨烟雨: 'pear_blossom',
  梨白淡紫: 'pear_blossom',
  morandi_lilac: 'morandi_lilac',
  morandi: 'morandi_lilac',
  高级灰紫: 'morandi_lilac',
  堇灰静室: 'morandi_lilac',
  米杏丁香: 'morandi_lilac',
  morandi_peach: 'morandi_peach',
  高级灰暖: 'morandi_peach',
  暖灰桃坞: 'morandi_peach',
  桃杏青灰: 'morandi_peach',
  sea_mist_foam: 'sea_mist_foam',
  海雾奶盖: 'sea_mist_foam',
  潮汐奶昔: 'sea_mist_foam',
  海盐桃奶: 'sea_mist_foam',
  mist_pink_rose: 'mist_pink_rose',
  雾粉玫瑰: 'mist_pink_rose',
  胭脂薄雾: 'mist_pink_rose',
  浅玫雾粉: 'mist_pink_rose',
  twilight_iris: 'twilight_iris',
  暮色鸢尾: 'twilight_iris',
  鸢尾黄昏: 'twilight_iris',
  暮光鸢尾: 'twilight_iris',
  night_sakura_snow: 'night_sakura_snow',
  夜樱吹雪: 'night_sakura_snow',
  樱影夜色: 'night_sakura_snow',
  夜樱粉雪: 'night_sakura_snow',
  amber_lift: 'amber_lift',
  轻灰琥珀: 'amber_lift',
  琥珀浅灯: 'amber_lift',
  暖琥珀光: 'amber_lift',
  轻灰: 'amber_lift',
  琥珀: 'amber_lift',
  // 旧名兜底
  粉灰: 'soft_mist',
}

function coercePaletteId(raw: unknown): DatingStoryPaletteId {
  const key = String(raw ?? '').trim()
  if (!key) return DEFAULT_STORY_APPEARANCE.paletteId
  if ((PALETTE_IDS as string[]).includes(key)) return key as DatingStoryPaletteId
  return LEGACY_PALETTE_MAP[key] ?? DEFAULT_STORY_APPEARANCE.paletteId
}

function coerceDayNight(raw: unknown): DatingStoryDayNight {
  const key = String(raw ?? '').trim().toLowerCase()
  if (key === 'night' || key === 'dark' || key === '夜' || key === '夜间') return 'night'
  return 'day'
}

function coerceDanmakuColor(raw: unknown, fallback = '#FFFFFF'): string {
  const s = String(raw ?? '').trim()
  if (/^#[0-9A-Fa-f]{6}$/.test(s)) return s.toUpperCase()
  if (/^#[0-9A-Fa-f]{3}$/.test(s)) {
    const h = s.slice(1)
    return `#${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}`.toUpperCase()
  }
  return fallback
}

function coerceDanmakuOpacity(raw: unknown, fallback = 0.92, min = 0.15): number {
  const n = typeof raw === 'number' ? raw : Number(raw)
  if (!Number.isFinite(n)) return fallback
  return Math.max(min, Math.min(1, Math.round(n * 100) / 100))
}

function coerceDanmakuFontSize(raw: unknown): number {
  const n = typeof raw === 'number' ? raw : Number(raw)
  if (!Number.isFinite(n)) return DEFAULT_STORY_APPEARANCE.danmakuFontSize ?? 13
  return Math.max(10, Math.min(28, Math.round(n)))
}

function coerceDanmakuPx(raw: unknown, fallback: number, min: number, max: number): number {
  const n = typeof raw === 'number' ? raw : Number(raw)
  if (!Number.isFinite(n)) return fallback
  return Math.max(min, Math.min(max, Math.round(n)))
}

function hexToRgba(hex: string, opacity: number): string {
  const h = hex.trim().replace(/^#/, '')
  if (h.length !== 6) return `rgba(255,255,255,${opacity})`
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  if (![r, g, b].every((x) => Number.isFinite(x))) return `rgba(255,255,255,${opacity})`
  return `rgba(${r},${g},${b},${opacity})`
}

export function normalizeDatingStoryAppearance(input?: unknown): DatingStoryAppearance {
  if (!input || typeof input !== 'object') {
    return { ...DEFAULT_STORY_APPEARANCE }
  }
  const o = input as Record<string, unknown>
  const d = DEFAULT_STORY_APPEARANCE
  const fontFamily = String(o.danmakuFontFamily ?? '').trim() || undefined
  const fontFileName = String(o.danmakuFontFileName ?? '').trim() || undefined
  const fontDataUrl = String(o.danmakuFontDataUrl ?? '').trim() || undefined
  return {
    paletteId: coercePaletteId(o.paletteId ?? o.palette ?? o.colorCard),
    dayNight: coerceDayNight(o.dayNight ?? o.mode ?? o.theme),
    danmakuColor: coerceDanmakuColor(o.danmakuColor ?? o.dmColor, d.danmakuColor ?? '#FFFFFF'),
    danmakuOpacity: coerceDanmakuOpacity(o.danmakuOpacity ?? o.dmOpacity, d.danmakuOpacity ?? 0.92),
    danmakuFontSize: coerceDanmakuFontSize(o.danmakuFontSize),
    danmakuFontFamily: fontFamily,
    danmakuFontFileName: fontFileName,
    danmakuFontDataUrl: fontDataUrl?.startsWith('data:') ? fontDataUrl : undefined,
    danmakuBarEnabled: o.danmakuBarEnabled === true,
    danmakuBarColor: coerceDanmakuColor(o.danmakuBarColor, d.danmakuBarColor ?? '#000000'),
    danmakuBarOpacity: coerceDanmakuOpacity(o.danmakuBarOpacity, d.danmakuBarOpacity ?? 0.35, 0.05),
    danmakuGlowEnabled: o.danmakuGlowEnabled === true,
    danmakuGlowColor: coerceDanmakuColor(o.danmakuGlowColor, d.danmakuGlowColor ?? '#FFFFFF'),
    danmakuGlowSize: coerceDanmakuPx(o.danmakuGlowSize, d.danmakuGlowSize ?? 4, 0, 24),
    danmakuShadowEnabled: o.danmakuShadowEnabled !== false,
    danmakuShadowColor: coerceDanmakuColor(o.danmakuShadowColor, d.danmakuShadowColor ?? '#000000'),
    danmakuShadowBlur: coerceDanmakuPx(o.danmakuShadowBlur, d.danmakuShadowBlur ?? 4, 0, 32),
    danmakuShadowOffsetX: coerceDanmakuPx(o.danmakuShadowOffsetX, d.danmakuShadowOffsetX ?? 0, -12, 12),
    danmakuShadowOffsetY: coerceDanmakuPx(o.danmakuShadowOffsetY, d.danmakuShadowOffsetY ?? 1, -12, 12),
  }
}

/** 将外观里的弹幕参数整理成渲染用结构（默认白色字） */
export function resolveDatingStoryDanmakuVisual(
  appearance?: DatingStoryAppearance | unknown,
): DatingStoryDanmakuVisual {
  const a = normalizeDatingStoryAppearance(appearance)
  const colorHex = a.danmakuColor ?? '#FFFFFF'
  const opacity = a.danmakuOpacity ?? 0.92
  return {
    colorHex,
    colorRgba: hexToRgba(colorHex, opacity),
    opacity,
    fontSize: a.danmakuFontSize ?? 13,
    fontFamily: a.danmakuFontFamily?.trim() || null,
    fontDataUrl: a.danmakuFontDataUrl?.trim() || null,
    fontFileName: a.danmakuFontFileName?.trim() || null,
    barEnabled: !!a.danmakuBarEnabled,
    barColor: a.danmakuBarColor ?? '#000000',
    barOpacity: a.danmakuBarOpacity ?? 0.35,
    glowEnabled: !!a.danmakuGlowEnabled,
    glowColor: a.danmakuGlowColor ?? '#FFFFFF',
    glowSize: a.danmakuGlowSize ?? 4,
    shadowEnabled: a.danmakuShadowEnabled !== false,
    shadowColor: a.danmakuShadowColor ?? '#000000',
    shadowBlur: a.danmakuShadowBlur ?? 4,
    shadowOffsetX: a.danmakuShadowOffsetX ?? 0,
    shadowOffsetY: a.danmakuShadowOffsetY ?? 1,
  }
}

export function resolveDatingStoryTokens(appearance: DatingStoryAppearance): DatingStoryTokenSet {
  const a = normalizeDatingStoryAppearance(appearance)
  const table = a.dayNight === 'night' ? NIGHT_PALETTES : DAY_PALETTES
  return table[a.paletteId] ?? table.soft_mist
}

export function buildDatingStoryAppearanceCssVars(
  appearance?: DatingStoryAppearance | unknown,
): DatingStoryAppearanceCssVars & CSSProperties {
  const t = resolveDatingStoryTokens(normalizeDatingStoryAppearance(appearance))
  return {
    '--ds-bg': t.bg,
    '--ds-bg-grad': t.bgGrad,
    '--ds-bg-elevated': t.bgElevated,
    '--ds-surface': t.surface,
    '--ds-ink': t.ink,
    '--ds-ink-soft': t.inkSoft,
    '--ds-muted': t.muted,
    '--ds-rule': t.rule,
    '--ds-accent': t.accent,
    '--ds-accent-on': t.accentOn,
    '--ds-accent-soft': t.accentSoft,
    '--ds-dialogue': t.dialogue,
    '--ds-os': t.os,
    '--ds-comment': t.comment,
    '--ds-danger': t.danger,
  }
}
