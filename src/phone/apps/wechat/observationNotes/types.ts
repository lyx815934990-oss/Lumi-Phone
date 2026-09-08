/**
 * char 对 user 的深层认知档案（观察笔记）
 * 优先级高于记忆流水：稳定特征 + 第一人称侧写
 */

export type ObservationVoice = 'objective' | 'marginalia'

export type ObservationField = {
  /** 展示文案 */
  text: string
  /** objective=常规墨黑；marginalia=手记体绛笺红斜体 */
  voice: ObservationVoice
}

export type ObservationBasicFacts = {
  name: ObservationField
  gender: ObservationField
  orientation: ObservationField
  favoriteFoods: ObservationField
  taboos: ObservationField
  hobbies: ObservationField
}

export type ObservationLabeledField = {
  key: string
  label: string
  field: ObservationField
}

export type ObservationTimelineEntry = {
  id: string
  /** 如 "10.15" */
  dateLabel: string
  at?: number
  text: string
}

export type ObservationRadarAxis = {
  label: string
  /** 0–100 */
  value: number
}

export type ObservationRadarBlock = {
  axes: ObservationRadarAxis[]
  /** 手记体小结 */
  note?: string
  /**
   * 是否已由模型真正判定过。
   * 缺省/false：空白档默认六轴 50，UI 视为「尚未判定」。
   */
  judged?: boolean
}

/** 人格倾向：与资料卡 MBTI 雷达同轴 */
export const OBS_MBTI_AXIS_LABELS = ['外向', '直觉', '理性', '决断', '开放', '共情'] as const

/** 内在能力：与资料卡能力雷达同轴 */
export const OBS_ABILITY_AXIS_LABELS = ['智商', '情商', '胆商', '逆商', '创商', '健商'] as const


export type ObservationFieldDiff = {
  path: string
  label: string
  previousText: string
  currentText: string
}

export type ObservationChangeEvent = {
  id: string
  at: number
  summary: string
  diffs: ObservationFieldDiff[]
}

export type ObservationNotesDoc = {
  conversationCharacterId: string
  playerIdentityId: string
  /** 笔记标题，可由 char 自拟 */
  title: string
  /** 签名用显示名 */
  charDisplayName: string
  updatedAt: number
  basic: ObservationBasicFacts
  intimate: ObservationLabeledField[]
  strengths: string[]
  weaknesses: string[]
  /** 给你的线上备注（须像该 char 人设会取的通讯录备注；可含 emoji、颜文字） */
  remarkNickname: string
  /** 你喜欢的称呼：char 平时怎么叫 user */
  preferredAddress: string
  /** char 眼中 user 常挂嘴边的口头禅 / 惯用语（可多项，顿号或逗号分隔） */
  userCatchphrases: string
  /** char 对 user 说话风格的一两句简述（断句、语气词、软硬、碎不碎等） */
  languageStyleBrief: string
  heartMoments: ObservationTimelineEntry[]
  deepMemories: ObservationTimelineEntry[]
  personalityRadar: ObservationRadarBlock
  abilityRadar: ObservationRadarBlock
  overallEvaluation: string
  affection: number
  /**
   * 好感旁展示用阶段文案；与 `relationshipLabel` 对齐（char 自填），
   * 不再按数值硬套「轻微在意期」等系统名。
   */
  affectionStageLabel: string
  /** char 自认的关系阶段（暗恋/暧昧等）；好感条旁展示以此为准 */
  relationshipLabel: string
  /** 相对上次版本的字段级 diff（用于主页标记） */
  pendingDiffs: ObservationFieldDiff[]
  changeHistory: ObservationChangeEvent[]
  /** 用户上次完整阅读本笔记的时间；用于未读红点 */
  lastSeenAt: number | null
}

export const BASIC_FIELD_META: Array<{
  key: keyof ObservationBasicFacts
  label: string
  en: string
}> = [
  { key: 'name', label: '姓名', en: 'NAME' },
  { key: 'gender', label: '性别', en: 'GENDER' },
  { key: 'orientation', label: '性取向', en: 'ORIENT.' },
  { key: 'favoriteFoods', label: '喜欢的食物', en: 'FOOD' },
  { key: 'taboos', label: '雷点', en: 'TABOO' },
  { key: 'hobbies', label: '兴趣爱好', en: 'HOBBY' },
]

export function emptyField(voice: ObservationVoice = 'objective'): ObservationField {
  return { text: '尚不清楚', voice }
}

export function clampPct(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(100, Math.round(n)))
}

/** 旧版按数值硬套的阶段名（勿再展示 / 注入提示词） */
const LEGACY_CODE_AFFECTION_STAGE_LABELS = new Set([
  '礼貌试探期',
  '保持距离期',
  '轻微在意期',
  '心动萌芽期',
  '心意渐明期',
])

/**
 * 好感旁展示的阶段文案：只用 char 自己填的「关系」标签。
 * 数值高低不另套系统阶段（暗恋可以只有 50 好感）。
 */
export function resolveAffectionStageDisplay(relationshipLabel: string | undefined | null): string {
  const rel = String(relationshipLabel ?? '').trim()
  if (!rel || rel === '关系未明') return ''
  return rel
}

/** @deprecated 勿再按数值套阶段；保留仅为兼容旧调用，恒返回空串 */
export function affectionStageFromValue(_affection: number): string {
  return ''
}

export function isLegacyCodeAffectionStageLabel(label: string | undefined | null): boolean {
  return LEGACY_CODE_AFFECTION_STAGE_LABELS.has(String(label ?? '').trim())
}

export function fieldText(f: ObservationField | undefined | null): string {
  return (f?.text ?? '').trim() || '尚不清楚'
}
