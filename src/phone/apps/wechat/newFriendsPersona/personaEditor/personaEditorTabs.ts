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
  { id: 'life', num: '02', en: 'LIFE', zh: '可变人生' },
  { id: 'bindings', num: '03', en: 'LINK', zh: '绑定信息' },
  { id: 'opening', num: '04', en: 'CHAT', zh: '开场白' },
  { id: 'wechat', num: '05', en: 'WX', zh: '微信资料' },
  { id: 'worldbook', num: '06', en: 'LORE', zh: '世界书' },
  { id: 'network', num: '07', en: 'NET', zh: '人脉关系' },
  { id: 'schedule', num: '08', en: 'TIME', zh: '日程表' },
  { id: 'worldbackground', num: '09', en: 'WORLD', zh: '世界背景' },
  { id: 'io', num: '10', en: 'DATA', zh: '导入导出' },
]
