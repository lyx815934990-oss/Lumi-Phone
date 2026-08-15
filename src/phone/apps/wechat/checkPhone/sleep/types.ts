/** 睡眠阶段类型 —— 同色系明度区分 */
export type SleepStageKind = 'deep' | 'light' | 'rem' | 'awake'

export type SleepStageSegment = {
  kind: SleepStageKind
  /** 相对入睡时刻的起始分钟 */
  startMin: number
  /** 持续分钟 */
  durationMin: number
}

export type HeartRateSample = {
  /** 相对入睡时刻的分钟 */
  atMin: number
  bpm: number
}

export type SleepNightRecord = {
  /** YYYY-MM-DD（起床日） */
  dateKey: string
  /** 入睡时间 ISO */
  fellAsleepAt: string
  /** 起床时间 ISO */
  wokeAt: string
  /** 总睡眠分钟（含清醒片段，展示用可再扣） */
  totalSleepMin: number
  /** 质量分 0–100 */
  qualityScore: number
  /** 质量文案，如「良好」「香甜」 */
  qualityLabel: string
  stages: SleepStageSegment[]
  heartRate: HeartRateSample[]
  /** 角色语气小结 */
  summary: string
}

export type SleepHistoryDay = {
  dateKey: string
  totalSleepMin: number
  qualityScore: number
}

export type SleepDataset = {
  nights: SleepNightRecord[]
  history: SleepHistoryDay[]
}

export const SLEEP_STAGE_META: Record<
  SleepStageKind,
  { label: string; short: string }
> = {
  deep: { label: '深睡', short: '深睡' },
  light: { label: '浅睡', short: '浅睡' },
  rem: { label: '快速眼动', short: 'REM' },
  awake: { label: '清醒', short: '清醒' },
}
