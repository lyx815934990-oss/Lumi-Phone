/** 查手机 · 健康（电子病历夹） */

export type VisitExam = {
  name: string
  result?: string
}

export type HealthVisit = {
  id: string
  hospital: string
  department: string
  doctor?: string
  visitedAtLabel: string
  chiefComplaint: string
  exams: VisitExam[]
  diagnosis: string
  advice: string
  followUp?: string
}

export type BodySectionId =
  | 'surface'
  | 'senses'
  | 'respiratory'
  | 'circulatory'
  | 'digestive'
  | 'urogenital'
  | 'musculo'
  | 'neuro'
  | 'mental'
  | 'lifestyle'

export const BODY_SECTION_META: Array<{ id: BodySectionId; title: string }> = [
  { id: 'surface', title: '体表 · 头发皮肤甲床' },
  { id: 'senses', title: '五官与感官' },
  { id: 'respiratory', title: '呼吸' },
  { id: 'circulatory', title: '循环 · 血管' },
  { id: 'digestive', title: '消化' },
  { id: 'urogenital', title: '泌尿生殖' },
  { id: 'musculo', title: '骨骼肌肉' },
  { id: 'neuro', title: '神经反射' },
  { id: 'mental', title: '心理与精神' },
  { id: 'lifestyle', title: '生活方式' },
]

export type BodySection = {
  id: BodySectionId
  title: string
  /** 详细正文，可多段用 \n 分隔 */
  body: string
  /** 简要状态词：大致正常 / 需关注 / 随访中 */
  statusLabel?: string
}

export type LabFlag = 'normal' | 'high' | 'low' | 'abnormal'

export type LabItem = {
  name: string
  value: string
  refRange: string
  flag: LabFlag
}

export type CheckupReport = {
  id: string
  orgName: string
  packageName: string
  dateLabel: string
  /** 体检基础体征（年龄/身高体重/BMI/血糖/体脂等） */
  vitals?: CheckupVitals
  labs: LabItem[]
  summary: string
  advice: string
}

/** 体检报告封面基础值 */
export type CheckupVitals = {
  age?: string
  height?: string
  weight?: string
  bmi?: string
  /** 空腹血糖等 */
  bloodSugar?: string
  /** 体脂率 */
  bodyFat?: string
  /** 可选：血压 */
  bloodPressure?: string
}

export type Medication = {
  id: string
  name: string
  dose: string
  note?: string
}

/** 面诊问诊对话里的一句 */
export type ConsultTurn = {
  speaker: 'patient' | 'doctor'
  text: string
}

/** 处方一行；note 为用意批注（界面用强调色） */
export type ConsultRxLine = {
  text: string
  note?: string
}

/**
 * 面诊病案记录单（仿纸质门诊病案：来诊原因 / 问诊 / 脉望舌 / 诊断 / 处方）
 * 与对话笔录并存；旧数据可无此块，详情页会从对白软合成。
 */
export type ConsultCaseChart = {
  gender?: string
  /** 年龄及体型，如「28岁，偏瘦」 */
  ageBody?: string
  /** 来诊原因 */
  reason?: string
  /** 问诊要点（编号列表） */
  inquiry?: string[]
  pulse?: string
  inspection?: string
  tongue?: string
  diagnosis?: string
  /** 处方标题，如「原方基础上加减」 */
  rxTitle?: string
  rxLines?: ConsultRxLine[]
  /** 煎服 / 用法说明 */
  prepNote?: string
  explanation?: string
  remark?: string
}

/** 一次面诊问诊笔录（角色 ↔ 医生） */
export type ConsultSession = {
  id: string
  hospital: string
  department: string
  doctor?: string
  consultedAtLabel: string
  /** 面诊主题 / 主诉摘要 */
  topic: string
  /** 可选：关联某条就诊记录 id */
  linkedVisitId?: string
  turns: ConsultTurn[]
  /** 结构化病案记录单 */
  chart?: ConsultCaseChart
}

export type HealthProfile = {
  bloodType?: string
  allergies?: string
  emergencyContact?: string
  /** 与体检同步的基础体征（首页可展示） */
  age?: string
  height?: string
  weight?: string
  bmi?: string
}

export type HealthDataset = {
  profile: HealthProfile
  /** 首页摘要用 */
  latestVisitId?: string
  visits: HealthVisit[]
  bodySections: BodySection[]
  checkups: CheckupReport[]
  medications: Medication[]
  /** 面诊问诊对话笔录 */
  consults: ConsultSession[]
}

export type HealthScreen =
  | { kind: 'home' }
  | { kind: 'profile' }
  | { kind: 'visits' }
  | { kind: 'visit'; visitId: string }
  | { kind: 'body' }
  | { kind: 'checkups' }
  | { kind: 'checkup'; checkupId: string }
  | { kind: 'meds' }
  | { kind: 'consults' }
  | { kind: 'consult'; consultId: string }

export function emptyHealthDataset(): HealthDataset {
  return {
    profile: {},
    visits: [],
    bodySections: [],
    checkups: [],
    medications: [],
    consults: [],
  }
}

export function hasHealthContent(data: HealthDataset | null | undefined): boolean {
  if (!data) return false
  const visits = data.visits?.length ?? 0
  const bodies = data.bodySections?.length ?? 0
  const checkups = data.checkups?.length ?? 0
  const consults = data.consults?.length ?? 0
  const meds = data.medications?.length ?? 0
  return visits > 0 || bodies > 0 || checkups > 0 || consults > 0 || meds > 0
}

export const LAB_FLAG_LABEL: Record<LabFlag, string> = {
  normal: '正常',
  high: '偏高',
  low: '偏低',
  abnormal: '异常',
}
