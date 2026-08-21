/** Lumi机 · 观察笔记
 * 冷灰纸调 + 冷绛强调；英文字饰常规无衬线；手记统一 Aa拾光明信片。
 */

import type { CSSProperties } from 'react'
import { LUMI_SHELL_NUM_STYLE } from '../lumiShellTheme'
import {
  ARCHIVE_SERIF,
  MEMORY_ARCHIVE_SERIF_CLASS,
} from '../memory/memoryArchiveTheme'

export const OBS_NOTES = {
  /** 冷灰纸底（略带蓝） */
  paper: '#F2F4F7',
  paperSoft: '#E8ECF1',
  ink: '#12141A',
  inkSoft: '#2C3038',
  /** 冷白卡片 */
  card: '#FBFCFD',
  mist: '#7A8090',
  hairline: 'rgba(36, 44, 58, 0.12)',
  /** 冷绛 · 夜色信笺（去暖棕） */
  garnet: '#5C3F4E',
  garnetSoftBg: 'rgba(92, 63, 78, 0.07)',
  garnetFill10: 'rgba(92, 63, 78, 0.12)',
  /** 装饰用更冷的细线 */
  coolLine: 'rgba(70, 88, 112, 0.16)',
  coolRail: 'rgba(92, 63, 78, 0.55)',
  cardRadiusPx: 12,
  sectionGapPx: 16,
  timelineGapPx: 20,
  /** 冷调网格线：仅用于展开的文件夹面板内 */
  pageDotBg:
    'linear-gradient(rgba(48, 58, 78, 0.09) 1px, transparent 1px), linear-gradient(90deg, rgba(48, 58, 78, 0.09) 1px, transparent 1px)',
  pageDotSize: '14px 14px',
} as const

/** 客观字段 / 分区中文标题：记忆馆衬线 */
export const OBS_NOTES_FONT = ARCHIVE_SERIF

/** 挂在页面根节点，强制衬线（覆盖微信 sans 继承） */
export const OBS_NOTES_SERIF_CLASS = MEMORY_ARCHIVE_SERIF_CLASS

/** 英文字饰 · 常规无衬线 */
export const OBS_NOTES_EN_STACK =
  'Inter, "SF Pro Text", "Helvetica Neue", system-ui, -apple-system, sans-serif'

export const OBS_NOTES_EN_STYLE = {
  fontFamily: OBS_NOTES_EN_STACK,
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: '0.14em',
  textTransform: 'uppercase' as const,
  color: OBS_NOTES.mist,
} as const satisfies CSSProperties

/** 字段小标签英文 */
export const OBS_NOTES_LABEL_STYLE = OBS_NOTES_EN_STYLE

export const OBS_NOTES_NUM_STYLE = {
  ...LUMI_SHELL_NUM_STYLE,
  fontFamily: `Inter, var(--phone-num-font), ${OBS_NOTES_EN_STACK}`,
} as const satisfies CSSProperties

/** char 主观手记：统一 Aa拾光明信片 */
export function obsMarginaliaStyle(handStack: string): CSSProperties {
  return {
    fontFamily: handStack,
    fontStyle: 'normal',
    color: OBS_NOTES.garnet,
  }
}

/**
 * 线上备注：你通讯录给对方起的备注（须贴合人设口吻；可含 emoji、颜文字）；勿等同对方公开昵称。
 * 手写体 + 彩色 emoji 回退栈，避免表情被手写字体吃掉。
 */
export function obsRemarkStyle(handStack: string): CSSProperties {
  return {
    fontFamily: `${handStack}, "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", "Segoe UI Symbol", sans-serif`,
    fontStyle: 'normal',
    color: OBS_NOTES.garnet,
    wordBreak: 'break-word',
    overflowWrap: 'anywhere',
    lineHeight: 1.55,
  }
}

/** 分区英文副标题 */
export const OBS_SECTION_EN: Record<string, string> = {
  基础认知: 'BASIC PROFILE',
  亲密偏好认知: 'SEXUAL INTIMACY',
  优点与缺点: 'VIRTUES & FLAWS',
  给你的线上备注: 'ONLINE ALIAS',
  你喜欢的称呼: 'HOW I CALL YOU',
  对你的判定: 'JUDGEMENT',
  总体评价: 'CLOSING LETTER',
  更新历史: 'REVISION LOG',
  溯往: 'REVISION LOG',
}

/** 标题栏固定文案（文艺侧写感，不随档案内 title 字段变动） */
export const OBS_NOTES_HEADER = {
  zh: '私藏侧写',
  en: 'PRIVATE SKETCH',
} as const
