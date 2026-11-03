import type { Gender } from './types'

export {
  DEFAULT_PERSONA_NAME_LANGUAGE,
  PERSONA_NAME_LANGUAGE_OPTIONS,
  loadPersonaNameLanguage,
  randomChineseName,
  randomPersonaName,
  savePersonaNameLanguage,
  type PersonaNameLanguage,
} from './personaNamePools'

/** 人设性别：注入模型、摘要与 UI 等处统一用中文（存储仍为 male/female/other） */
export function genderLabelZh(g: Gender | undefined | null): string {
  if (g === 'male') return '男'
  if (g === 'female') return '女'
  if (g === 'other') return '其他'
  return '未知'
}

export function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function zodiacFromMD(md: string): string {
  const m = Number(md.slice(0, 2))
  const d = Number(md.slice(3, 5))
  if (!Number.isFinite(m) || !Number.isFinite(d) || m < 1 || m > 12 || d < 1 || d > 31) return ''
  const mmdd = m * 100 + d
  const cuts = [120, 219, 321, 420, 521, 622, 723, 823, 923, 1024, 1123, 1222]
  const names = ['摩羯座', '水瓶座', '双鱼座', '白羊座', '金牛座', '双子座', '巨蟹座', '狮子座', '处女座', '天秤座', '天蝎座', '射手座', '摩羯座']
  for (let i = 0; i < cuts.length; i += 1) {
    if (mmdd < cuts[i]) return names[i]
  }
  return '摩羯座'
}

export function formatMD(month: number, day: number) {
  const mm = String(month).padStart(2, '0')
  const dd = String(day).padStart(2, '0')
  return `${mm}-${dd}`
}

export function daysInMonth(month: number) {
  if (month === 2) return 29
  if ([4, 6, 9, 11].includes(month)) return 30
  return 31
}

export const IDENTITY_POOL = [
  '学生',
  '总裁',
  '医生',
  '特工',
  '歌手',
  '演员',
  '画师',
  '作家',
  '骑士',
  '法师',
  '记者',
  '律师',
  '摄影师',
  '调酒师',
] as const

