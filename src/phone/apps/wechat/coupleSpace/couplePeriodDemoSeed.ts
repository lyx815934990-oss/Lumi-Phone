/**
 * 经期分析预览用：随机生成若干次月经记录（按天流量/痛感/心情）
 */

import type {
  CouplePeriodDayEntry,
  CouplePeriodFlow,
  CouplePeriodMood,
  CouplePeriodPain,
} from './coupleSpaceTypes'
import { toLocalDateKey } from './coupleSpaceTypes'
import { addDaysToDateKey } from './couplePeriodLogic'
import { summarizeCycleMetricsFromDays } from './couplePeriodDayRecords'

export type PeriodCycleSeedInput = {
  startDateKey: string
  endDateKey?: string | null
  flow?: CouplePeriodFlow | null
  pain?: CouplePeriodPain | null
  mood?: CouplePeriodMood | null
  days?: CouplePeriodDayEntry[] | null
  note?: string | null
}

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!
}

function randInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1))
}

const FLOWS: CouplePeriodFlow[] = ['light', 'medium', 'heavy']
const PAINS: CouplePeriodPain[] = [0, 1, 2, 3]
const MOODS: CouplePeriodMood[] = [
  'calm',
  'low',
  'irritable',
  'sensitive',
  'tired',
  'anxious',
]

/** 一次经期按天随机：前几天偏多/较痛，后面变少 */
function buildDaysForPeriod(start: string, dayCount: number): CouplePeriodDayEntry[] {
  const days: CouplePeriodDayEntry[] = []
  for (let i = 0; i < dayCount; i++) {
    const dateKey = addDaysToDateKey(start, i)
    let flow: CouplePeriodFlow
    if (i === 0) flow = pick(['medium', 'heavy'] as const)
    else if (i === 1) flow = pick(['heavy', 'medium'] as const)
    else if (i >= dayCount - 1) flow = 'light'
    else flow = pick(FLOWS)

    let pain: CouplePeriodPain
    if (i <= 1) pain = pick([1, 2, 3] as const)
    else if (i >= dayCount - 1) pain = pick([0, 1] as const)
    else pain = pick(PAINS)

    const mood = Math.random() < 0.2 ? undefined : pick(MOODS)
    days.push({
      dateKey,
      flow,
      pain,
      ...(mood ? { mood } : {}),
    })
  }
  return days
}

/**
 * 生成 count 次经期（含按天 days）。
 * 最近一次可能未结束，便于看「进行中」。
 */
export function buildDemoPeriodCycleInputs(
  count: number = 6,
  nowMs: number = Date.now(),
): PeriodCycleSeedInput[] {
  const n = Math.min(12, Math.max(3, count))
  const today = toLocalDateKey(nowMs)
  let start = addDaysToDateKey(today, -(n * 28 + randInt(0, 10)))
  const rows: PeriodCycleSeedInput[] = []

  for (let i = 0; i < n; i++) {
    const isLast = i === n - 1
    const periodLen = randInt(4, 7)
    const end = addDaysToDateKey(start, periodLen - 1)
    const leaveOpen = isLast && Math.random() < 0.45
    const recordedDays = leaveOpen
      ? Math.min(periodLen, coupleDaysOpen(start, today))
      : periodLen
    const days = buildDaysForPeriod(start, Math.max(1, recordedDays))
    const summary = summarizeCycleMetricsFromDays(days)
    rows.push({
      startDateKey: start,
      endDateKey: leaveOpen ? null : end,
      days,
      flow: summary.flow ?? null,
      pain: summary.pain ?? null,
      mood: summary.mood ?? null,
      note: Math.random() < 0.25 ? '（测试）略感不适，想喝热水' : null,
    })
    start = addDaysToDateKey(start, randInt(24, 33))
    if (start > today && !isLast) break
  }

  return rows
}

function coupleDaysOpen(start: string, today: string): number {
  const [ys, ms, ds] = start.split('-').map(Number)
  const [yt, mt, dt] = today.split('-').map(Number)
  if (!ys || !ms || !ds || !yt || !mt || !dt) return 1
  const a = Date.UTC(ys, ms - 1, ds)
  const b = Date.UTC(yt, mt - 1, dt)
  return Math.max(1, Math.round((b - a) / 86400000) + 1)
}
