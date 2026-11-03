/** 人设编辑页 Archive Index 的板块 */

export type PersonaEditTabId =
  | 'basic'
  | 'life'
  | 'bindings'
  | 'opening'
  | 'wechat'
  | 'worldbook'
  | 'network'
  | 'schedule'
  | 'worldbackground'
  | 'io'

export const PERSONA_ARCHIVE_TABS: {
  id: PersonaEditTabId
  num: string
  en: string
  zh: string
}[] = [
  { id: 'basic', num: '01', en: 'INFO', zh: '基础信息' },
  { id: 'worldbook', num: '02', en: 'LORE', zh: '世界书' },
  { id: 'life', num: '03', en: 'LIFE', zh: '可变人生' },
  { id: 'bindings', num: '04', en: 'LINK', zh: '绑定信息' },
  { id: 'opening', num: '05', en: 'CHAT', zh: '开场白' },
  { id: 'wechat', num: '06', en: 'WX', zh: '微信资料' },
  { id: 'network', num: '07', en: 'NET', zh: '人脉关系' },
  { id: 'schedule', num: '08', en: 'TIME', zh: '日程表' },
  { id: 'worldbackground', num: '09', en: 'WORLD', zh: '世界背景' },
  { id: 'io', num: '10', en: 'DATA', zh: '导入导出' },
]

/** 水墨杂志：纸色页、墨色字、冷灰线 */
export const INK_PAGE = '#EDEBE7'
export const INK_CARD = '#F8F7F4'
export const INK_INK = '#1E2024'
export const INK_FOIL = '#5A6574'
export const INK_MUTED = '#6A6E76'
export const INK_LINE = '#D2D0CB'
export const INK_SECTION =
  'rounded-[14px] border border-[#D2D0CB] bg-[#F8F7F4]'
export const INK_KICKER =
  'font-mono text-[9px] font-medium uppercase tracking-[0.16em] text-[#5A6574]'
export const INK_TITLE =
  'mt-2 font-serif text-[17px] font-semibold tracking-tight text-[#1E2024]'
export const INK_LEAD = 'mt-1 text-[11px] font-light leading-relaxed text-[#6A6E76]'
