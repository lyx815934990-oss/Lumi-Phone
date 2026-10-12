/**
 * 经期分析（周期级）：预测条、周期/经期天数对比、每次月经摘要
 */

import type {
  CouplePeriodCycle,
  CouplePeriodFlow,
  CouplePeriodMood,
  CouplePeriodPain,
  CouplePeriodSettings,
} from './coupleSpaceTypes'
import { toLocalDateKey } from './coupleSpaceTypes'
import {
  PERIOD_FLOW_LABEL,
  PERIOD_MOOD_LABEL,
  PERIOD_PAIN_LABEL,
  addDaysToDateKey,
  couplePeriodDaysBetween,
  estimateAvgCycleDays,
  periodCycleLengthDays,
  predictPeriodWindow,
  sortPeriodCyclesNewestFirst,
} from './couplePeriodLogic'
import {
  buildHalfYearDayAverages,
  formatFlowChain,
  formatMoodChain,
  formatPainChain,
  listPeriodDayMetricPoints,
  type PeriodDayMetricPoint,
} from './couplePeriodDayRecords'

export type LengthTag = 'normal' | 'short' | 'long' | 'ongoing' | 'unknown'

export type CycleLengthRow = {
  cycleId: string
  /** 该段开始日（本周期起点） */
  startDateKey: string
  /** 到下一次开始的间隔；进行中为空 */
  lengthDays: number | null
  tag: LengthTag
  /** 相对个人平均：正=推迟，负=提前 */
  deltaVsAvg: number | null
  label: string
}

export type PeriodLengthRow = {
  cycleId: string
  startDateKey: string
  endDateKey?: string
  lengthDays: number | null
  tag: LengthTag
  deltaVsPrev: number | null
  label: string
}

export type PredictStripDay = {
  dateKey: string
  day: number
  month: number
  /** 预测开始日 */
  isPredictedStart: boolean
  /** 邻近日（可能开始） */
  isPossible: boolean
}

export type PeriodPredictStrip = {
  predictedStartKey: string
  daysUntil: number
  late: boolean
  days: PredictStripDay[]
  summary: string
} | null

export type SinglePeriodCard = {
  cycle: CouplePeriodCycle
  rangeLabel: string
  periodDays: number | null
  periodTag: LengthTag
  cycleDays: number | null
  cycleTag: LengthTag
  flowLabel: string | null
  painLabel: string | null
  moodLabel: string | null
  flowDelta: string | null
  painDelta: string | null
  moodDelta: string | null
  periodDeltaLabel: string | null
  cycleDeltaLabel: string | null
  careText: string | null
  ongoing: boolean
}

export type DayCompareChart = {
  maxDay: number
  currentPoints: PeriodDayMetricPoint[]
  flowAvgRanks: Array<number | null>
  painAvgRanks: Array<number | null>
  title: string
}

export type CouplePeriodAnalysisModel = {
  predict: PeriodPredictStrip
  /** 最近已完成周期摘要（有下一次开始日的） */
  latestCompletedCycle: {
    startDateKey: string
    endDateKey: string
    lengthDays: number
    tag: LengthTag
    deltaVsPrev: number | null
    rangeLabel: string
  } | null
  cycleBars: CycleLengthRow[]
  latestPeriod: {
    startDateKey: string
    endDateKey?: string
    lengthDays: number | null
    tag: LengthTag
    deltaVsPrev: number | null
    ongoing: boolean
  } | null
  periodBars: PeriodLengthRow[]
  /** 最近一次经期：按天流量/痛感 vs 近半年 */
  dayCompare: DayCompareChart | null
  cards: SinglePeriodCard[]
  avgCycleDays: number
}

function formatMd(dateKey: string): string {
  const [, m, d] = dateKey.split('-')
  if (!m || !d) return dateKey
  return `${Number(m)}月${Number(d)}日`
}

function formatRange(start: string, end?: string): string {
  if (!end) return `${formatMd(start)} 起`
  return `${formatMd(start)}–${formatMd(end)}`
}

function cycleLengthTag(days: number | null, ongoing: boolean): LengthTag {
  if (ongoing) return 'ongoing'
  if (days == null) return 'unknown'
  if (days < 21) return 'short'
  if (days > 35) return 'long'
  return 'normal'
}

function periodLengthTag(days: number | null, ongoing: boolean): LengthTag {
  if (ongoing) return 'ongoing'
  if (days == null) return 'unknown'
  if (days < 2) return 'short'
  if (days > 7) return 'long'
  return 'normal'
}

export function lengthTagLabel(tag: LengthTag): string {
  if (tag === 'normal') return '正常'
  if (tag === 'short') return '偏短'
  if (tag === 'long') return '偏长'
  if (tag === 'ongoing') return '进行中'
  return '—'
}

function deltaDaysLabel(delta: number | null, unit = '天'): string | null {
  if (delta == null) return null
  if (delta === 0) return '相同'
  if (delta > 0) return `多${delta}${unit}`
  return `少${Math.abs(delta)}${unit}`
}

function earlyLateLabel(deltaVsAvg: number | null): string {
  if (deltaVsAvg == null) return ''
  if (deltaVsAvg === 0) return '准时'
  if (deltaVsAvg > 0) return `推迟${deltaVsAvg}天`
  return `提前${Math.abs(deltaVsAvg)}天`
}

const FLOW_RANK: Record<CouplePeriodFlow, number> = { light: 1, medium: 2, heavy: 3 }

function compareFlow(
  cur?: CouplePeriodFlow,
  prev?: CouplePeriodFlow,
): string | null {
  if (!cur || !prev) return null
  const d = FLOW_RANK[cur] - FLOW_RANK[prev]
  if (d === 0) return '与上次相同'
  if (d > 0) return '比上次偏多'
  return '比上次偏少'
}

function comparePain(cur?: CouplePeriodPain, prev?: CouplePeriodPain): string | null {
  if (cur == null || prev == null) return null
  const d = cur - prev
  if (d === 0) return '与上次相同'
  if (d > 0) return '比上次更痛'
  return '比上次轻一些'
}

function compareMood(cur?: CouplePeriodMood, prev?: CouplePeriodMood): string | null {
  if (!cur || !prev) return null
  if (cur === prev) return '与上次相同'
  return `上次是${PERIOD_MOOD_LABEL[prev] ?? prev}`
}

/** 构建预测日期条：预测开始日 ± 3 天 */
export function buildPeriodPredictStrip(params: {
  cycles: readonly CouplePeriodCycle[]
  settings: CouplePeriodSettings
  nowMs?: number
}): PeriodPredictStrip {
  const nowMs = params.nowMs ?? Date.now()
  const today = toLocalDateKey(nowMs)
  const win = predictPeriodWindow({
    cycles: params.cycles,
    settings: params.settings,
    nowMs,
  })
  if (!win.predictedStart) return null

  const predictedStartKey = win.predictedStart
  const daysUntil = couplePeriodDaysBetween(today, predictedStartKey)
  const late = daysUntil < 0
  const days: PredictStripDay[] = []
  for (let offset = -3; offset <= 3; offset++) {
    const dateKey = addDaysToDateKey(predictedStartKey, offset)
    const [, m, d] = dateKey.split('-').map(Number)
    days.push({
      dateKey,
      day: d ?? 0,
      month: m ?? 0,
      isPredictedStart: offset === 0,
      isPossible: offset !== 0 && Math.abs(offset) <= 2,
    })
  }

  let summary: string
  if (late) {
    summary = `预测经期原定 ${formatMd(predictedStartKey)} 开始，已过约 ${Math.abs(daysUntil)} 天`
  } else if (daysUntil === 0) {
    summary = `预测下次经期将于今天（${formatMd(predictedStartKey)}）开始`
  } else {
    summary = `预测下次经期将于 ${formatMd(predictedStartKey)} 开始，距离开始还有 ${daysUntil} 天`
  }

  return { predictedStartKey, daysUntil, late, days, summary }
}

export function buildCouplePeriodAnalysis(params: {
  cycles: readonly CouplePeriodCycle[]
  settings: CouplePeriodSettings
  nowMs?: number
  /** 条图最多条数 */
  barLimit?: number
}): CouplePeriodAnalysisModel {
  const sorted = sortPeriodCyclesNewestFirst(params.cycles)
  const avgCycleDays = estimateAvgCycleDays(sorted, params.settings.avgCycleDays)
  const barLimit = params.barLimit ?? 6
  const predict = buildPeriodPredictStrip(params)

  // 周期条：每段与「更新一段」之间的间隔（更新一段 = 时间上更晚的下一次开始）
  // sorted 新→旧：index i 的下一次开始是 i-1
  const cycleBars: CycleLengthRow[] = []
  for (let i = 0; i < sorted.length; i++) {
    const cur = sorted[i]!
    const nextNewer = i > 0 ? sorted[i - 1]! : null
    if (nextNewer) {
      const lengthDays = couplePeriodDaysBetween(cur.startDateKey, nextNewer.startDateKey)
      const deltaVsAvg = lengthDays - avgCycleDays
      const tag = cycleLengthTag(lengthDays, false)
      cycleBars.push({
        cycleId: cur.id,
        startDateKey: cur.startDateKey,
        lengthDays,
        tag,
        deltaVsAvg,
        label: earlyLateLabel(deltaVsAvg),
      })
    } else {
      // 最新一段：到今天的进行中周期（尚未迎来下一次）
      const today = toLocalDateKey(params.nowMs)
      const soFar = couplePeriodDaysBetween(cur.startDateKey, today) + 1
      cycleBars.push({
        cycleId: cur.id,
        startDateKey: cur.startDateKey,
        lengthDays: soFar,
        tag: 'ongoing',
        deltaVsAvg: soFar - avgCycleDays,
        label: '当前周期',
      })
    }
  }

  const completedCycleBars = cycleBars.filter((r) => r.tag !== 'ongoing')
  const latestCompleted =
    completedCycleBars[0] != null
      ? (() => {
          const row = completedCycleBars[0]!
          const cycle = sorted.find((c) => c.id === row.cycleId)!
          const next = sorted.find((c) => c.startDateKey > cycle.startDateKey)
          // end of cycle span for display: day before next start
          const endKey = next
            ? addDaysToDateKey(next.startDateKey, -1)
            : cycle.endDateKey ?? cycle.startDateKey
          const prev = completedCycleBars[1]
          const deltaVsPrev =
            prev?.lengthDays != null && row.lengthDays != null
              ? row.lengthDays - prev.lengthDays
              : null
          return {
            startDateKey: cycle.startDateKey,
            endDateKey: endKey,
            lengthDays: row.lengthDays!,
            tag: row.tag,
            deltaVsPrev,
            rangeLabel: formatRange(cycle.startDateKey, endKey),
          }
        })()
      : null

  const periodBars: PeriodLengthRow[] = sorted.slice(0, barLimit).map((c, idx) => {
    const ongoing = !c.endDateKey
    const lengthDays = ongoing
      ? couplePeriodDaysBetween(c.startDateKey, toLocalDateKey(params.nowMs)) + 1
      : periodCycleLengthDays(c)
    const older = sorted[idx + 1]
    const olderLen = older ? periodCycleLengthDays(older) : null
    const deltaVsPrev =
      lengthDays != null && olderLen != null ? lengthDays - olderLen : null
    return {
      cycleId: c.id,
      startDateKey: c.startDateKey,
      endDateKey: c.endDateKey,
      lengthDays,
      tag: periodLengthTag(lengthDays, ongoing),
      deltaVsPrev,
      label: formatMd(c.startDateKey),
    }
  })

  const latestPeriodRow = periodBars[0] ?? null
  const latestPeriod = latestPeriodRow
    ? {
        startDateKey: latestPeriodRow.startDateKey,
        endDateKey: latestPeriodRow.endDateKey,
        lengthDays: latestPeriodRow.lengthDays,
        tag: latestPeriodRow.tag,
        deltaVsPrev: latestPeriodRow.deltaVsPrev,
        ongoing: latestPeriodRow.tag === 'ongoing',
      }
    : null

  const cards: SinglePeriodCard[] = sorted.map((c, idx) => {
    const older = sorted[idx + 1]
    const newer = idx > 0 ? sorted[idx - 1]! : null
    const ongoing = !c.endDateKey
    const periodDays = ongoing
      ? couplePeriodDaysBetween(c.startDateKey, toLocalDateKey(params.nowMs)) + 1
      : periodCycleLengthDays(c)
    // 本段开始 → 下一次开始 = 本周期长度；尚无下一次则未完成
    const cycleDays = newer
      ? couplePeriodDaysBetween(c.startDateKey, newer.startDateKey)
      : null
    const olderPeriodDays = older ? periodCycleLengthDays(older) : null
    const prevCycleLen = older
      ? couplePeriodDaysBetween(older.startDateKey, c.startDateKey)
      : null
    const cycleDelta =
      cycleDays != null && prevCycleLen != null ? cycleDays - prevCycleLen : null
    const periodDelta =
      periodDays != null && olderPeriodDays != null ? periodDays - olderPeriodDays : null

    return {
      cycle: c,
      rangeLabel: formatRange(c.startDateKey, c.endDateKey),
      periodDays,
      periodTag: periodLengthTag(periodDays, ongoing),
      cycleDays,
      cycleTag: cycleLengthTag(cycleDays, !newer),
      flowLabel: formatFlowChain(c) ?? (c.flow ? PERIOD_FLOW_LABEL[c.flow] ?? c.flow : null),
      painLabel: formatPainChain(c) ?? (c.pain != null ? PERIOD_PAIN_LABEL[c.pain] ?? String(c.pain) : null),
      moodLabel: formatMoodChain(c) ?? (c.mood ? PERIOD_MOOD_LABEL[c.mood] ?? c.mood : null),
      flowDelta: compareFlow(c.flow, older?.flow),
      painDelta: comparePain(c.pain, older?.pain),
      moodDelta: compareMood(c.mood, older?.mood),
      periodDeltaLabel: deltaDaysLabel(periodDelta),
      cycleDeltaLabel: deltaDaysLabel(cycleDelta),
      careText: c.charActions?.response?.trim() || null,
      ongoing,
    }
  })

  const focusCycle = sorted[0] ?? null
  const maxDay = Math.min(
    7,
    Math.max(5, focusCycle ? listPeriodDayMetricPoints(focusCycle, params.nowMs).length : 5),
  )
  const averages = buildHalfYearDayAverages(sorted, params.nowMs, maxDay)
  const dayCompare: DayCompareChart | null = focusCycle
    ? {
        maxDay,
        currentPoints: listPeriodDayMetricPoints(focusCycle, params.nowMs).slice(0, maxDay),
        flowAvgRanks: averages.flowAvgRanks,
        painAvgRanks: averages.painAvgRanks,
        title: latestPeriod?.ongoing ? '本次经期' : '最近一次经期',
      }
    : null

  return {
    predict,
    latestCompletedCycle: latestCompleted,
    cycleBars: cycleBars.slice(0, barLimit),
    latestPeriod,
    periodBars,
    dayCompare,
    cards,
    avgCycleDays,
  }
}

export function maxBarDays(rows: Array<{ lengthDays: number | null }>, fallback = 35): number {
  let max = fallback
  for (const r of rows) {
    if (r.lengthDays != null && r.lengthDays > max) max = r.lengthDays
  }
  return Math.max(fallback, max)
}
