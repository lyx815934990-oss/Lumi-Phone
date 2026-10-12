import type { CouplePeriodCycle, CouplePeriodSettings } from './coupleSpaceTypes'
import { toLocalDateKey } from './coupleSpaceTypes'

function parseDateKey(dateKey: string): Date | null {
  const [y, m, d] = dateKey.split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d, 12, 0, 0, 0)
}

function startOfLocalDay(ms: number = Date.now()): Date {
  const d = new Date(ms)
  d.setHours(0, 0, 0, 0)
  return d
}

export function couplePeriodDaysBetween(aKey: string, bKey: string): number {
  const a = parseDateKey(aKey)
  const b = parseDateKey(bKey)
  if (!a || !b) return 0
  const aa = startOfLocalDay(a.getTime()).getTime()
  const bb = startOfLocalDay(b.getTime()).getTime()
  return Math.round((bb - aa) / (24 * 3600 * 1000))
}

export function addDaysToDateKey(dateKey: string, days: number): string {
  const d = parseDateKey(dateKey)
  if (!d) return dateKey
  d.setDate(d.getDate() + days)
  return toLocalDateKey(d.getTime())
}

/** 从历史开始日估算平均周期；不足 2 次则用设置值 */
export function estimateAvgCycleDays(
  cycles: readonly CouplePeriodCycle[],
  fallback: number,
): number {
  const starts = cycles
    .map((c) => c.startDateKey)
    .filter((k) => /^\d{4}-\d{2}-\d{2}$/.test(k))
    .sort()
  if (starts.length < 2) return fallback
  const gaps: number[] = []
  for (let i = 1; i < starts.length; i++) {
    const gap = couplePeriodDaysBetween(starts[i - 1]!, starts[i]!)
    if (gap >= 18 && gap <= 45) gaps.push(gap)
  }
  if (!gaps.length) return fallback
  const recent = gaps.slice(-6)
  const avg = Math.round(recent.reduce((s, n) => s + n, 0) / recent.length)
  return Math.min(45, Math.max(21, avg))
}

export function sortPeriodCyclesNewestFirst(
  cycles: readonly CouplePeriodCycle[],
): CouplePeriodCycle[] {
  return cycles.slice().sort((a, b) => {
    const d = b.startDateKey.localeCompare(a.startDateKey)
    if (d !== 0) return d
    return b.createdAt - a.createdAt
  })
}

export type CouplePeriodPhase =
  | { kind: 'in_period'; dayIndex: number; cycle: CouplePeriodCycle }
  | { kind: 'upcoming'; daysUntil: number; predictedStartKey: string }
  | { kind: 'late'; daysLate: number; predictedStartKey: string }
  | { kind: 'empty' }

/** 当前经期状态（进行中优先于预测） */
export function resolveCouplePeriodPhase(params: {
  cycles: readonly CouplePeriodCycle[]
  settings: CouplePeriodSettings
  nowMs?: number
}): CouplePeriodPhase {
  const nowMs = params.nowMs ?? Date.now()
  const today = toLocalDateKey(nowMs)
  const sorted = sortPeriodCyclesNewestFirst(params.cycles)

  // 进行中：开始 ≤ 今天，且（无结束 或 结束 ≥ 今天）
  const active = sorted.find(
    (c) => c.startDateKey <= today && (!c.endDateKey || c.endDateKey >= today),
  )
  if (active) {
    const dayIndex = Math.max(1, couplePeriodDaysBetween(active.startDateKey, today) + 1)
    return { kind: 'in_period', dayIndex, cycle: active }
  }

  const last = sorted[0]
  if (!last) return { kind: 'empty' }

  const avg = estimateAvgCycleDays(sorted, params.settings.avgCycleDays)
  const predictedStartKey = addDaysToDateKey(last.startDateKey, avg)
  const daysUntil = couplePeriodDaysBetween(today, predictedStartKey)
  if (daysUntil >= 0) {
    return { kind: 'upcoming', daysUntil, predictedStartKey }
  }
  return { kind: 'late', daysLate: Math.abs(daysUntil), predictedStartKey }
}

export function periodCycleLengthDays(cycle: CouplePeriodCycle): number | null {
  if (!cycle.endDateKey) return null
  return Math.max(1, couplePeriodDaysBetween(cycle.startDateKey, cycle.endDateKey) + 1)
}

export const PERIOD_FLOW_LABEL: Record<string, string> = {
  light: '少量',
  medium: '中等',
  heavy: '偏多',
}

export const PERIOD_PAIN_LABEL: Record<number, string> = {
  0: '不痛',
  1: '轻微',
  2: '中等',
  3: '较强',
}

export const PERIOD_MOOD_LABEL: Record<string, string> = {
  calm: '平静',
  low: '低落',
  irritable: '易怒',
  sensitive: '敏感',
  tired: '疲惫',
  anxious: '忐忑',
}

export type CouplePeriodDayKind =
  | 'none'
  | 'period'
  | 'predicted'
  | 'fertile'
  | 'ovulation'

export type CouplePeriodDayInfo = {
  dateKey: string
  kind: CouplePeriodDayKind
  /** 实际经期：是否为该段开始/结束日 */
  periodEdge?: 'start' | 'end' | 'both' | 'mid'
  cycle?: CouplePeriodCycle
}

function dateKeyFromYmd(y: number, m0: number, d: number): string {
  return `${y}-${String(m0 + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

/** 某月日历格子（含前后补齐，周日为一周起点） */
export function buildMonthGrid(year: number, month0: number): Array<{
  dateKey: string
  day: number
  inMonth: boolean
}> {
  const first = new Date(year, month0, 1, 12)
  const startPad = first.getDay() // 0=周日
  const daysInMonth = new Date(year, month0 + 1, 0).getDate()
  const cells: Array<{ dateKey: string; day: number; inMonth: boolean }> = []

  for (let i = 0; i < startPad; i++) {
    const d = new Date(year, month0, 1 - (startPad - i), 12)
    cells.push({
      dateKey: dateKeyFromYmd(d.getFullYear(), d.getMonth(), d.getDate()),
      day: d.getDate(),
      inMonth: false,
    })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({
      dateKey: dateKeyFromYmd(year, month0, d),
      day: d,
      inMonth: true,
    })
  }
  while (cells.length % 7 !== 0 || cells.length < 42) {
    const last = cells[cells.length - 1]!
    const d = parseDateKey(last.dateKey)!
    d.setDate(d.getDate() + 1)
    cells.push({
      dateKey: dateKeyFromYmd(d.getFullYear(), d.getMonth(), d.getDate()),
      day: d.getDate(),
      inMonth: false,
    })
    if (cells.length >= 42) break
  }
  return cells
}

function cycleCoversDay(c: CouplePeriodCycle, dateKey: string, today: string): boolean {
  if (dateKey < c.startDateKey) return false
  const end = c.endDateKey ?? (c.startDateKey <= today ? today : c.startDateKey)
  return dateKey <= end
}

function findCycleOnDay(
  cycles: readonly CouplePeriodCycle[],
  dateKey: string,
  today: string,
): CouplePeriodCycle | undefined {
  return sortPeriodCyclesNewestFirst(cycles).find((c) => cycleCoversDay(c, dateKey, today))
}

export type CouplePeriodPredictWindow = {
  predictedStart: string
  predictedEnd: string
  ovulationDay: string
  fertileStart: string
  fertileEnd: string
  /**
   * 历史已记录周期之间：只标排卵期/排卵日，
   * 不把「预测经期」叠在已知的下一次开始日上。
   */
  skipPredicted?: boolean
}

function windowForPeriodStart(
  predictedStart: string,
  avgPeriod: number,
  opts?: { skipPredicted?: boolean },
): CouplePeriodPredictWindow {
  const predictedEnd = addDaysToDateKey(predictedStart, avgPeriod - 1)
  const ovulationDay = addDaysToDateKey(predictedStart, -14)
  return {
    predictedStart,
    predictedEnd,
    ovulationDay,
    fertileStart: addDaysToDateKey(ovulationDay, -5),
    fertileEnd: addDaysToDateKey(ovulationDay, 1),
    ...(opts?.skipPredicted ? { skipPredicted: true } : {}),
  }
}

/**
 * 推算预测经期 / 排卵日 / 排卵期：
 * - 已记录相邻两次开始日之间（历史）
 * - 最早记录之前（向后推）
 * - 最近记录之后（向前推）
 */
export function listPredictedPeriodWindows(params: {
  cycles: readonly CouplePeriodCycle[]
  settings: CouplePeriodSettings
  /** 至少覆盖到该日（含其排卵窗） */
  throughDateKey?: string
  maxCycles?: number
}): CouplePeriodPredictWindow[] {
  const newestFirst = sortPeriodCyclesNewestFirst(params.cycles)
  if (!newestFirst.length) return []

  const oldestFirst = [...newestFirst].reverse()
  const avgCycle = estimateAvgCycleDays(newestFirst, params.settings.avgCycleDays)
  const avgPeriod = Math.max(1, params.settings.avgPeriodDays)
  const maxCycles = Math.min(48, Math.max(1, params.maxCycles ?? 36))
  const through =
    params.throughDateKey && /^\d{4}-\d{2}-\d{2}$/.test(params.throughDateKey)
      ? params.throughDateKey
      : null

  const out: CouplePeriodPredictWindow[] = []
  const seenOvu = new Set<string>()
  const pushWin = (win: CouplePeriodPredictWindow) => {
    if (seenOvu.has(win.ovulationDay)) return
    seenOvu.add(win.ovulationDay)
    out.push(win)
  }

  // 1) 每一次已记录经期开始日之前的排卵窗（历史月份也会着色）
  for (const c of oldestFirst) {
    pushWin(
      windowForPeriodStart(c.startDateKey, avgPeriod, {
        skipPredicted: true,
      }),
    )
  }

  // 2) 最早记录之前：向后推未记录的预测周期（翻更早月份）
  const earliestStart = oldestFirst[0]!.startDateKey
  // 最早一次的排卵窗起点；再往前才需要额外预测段
  const earliestFertileStart = addDaysToDateKey(addDaysToDateKey(earliestStart, -14), -5)
  if (!through || through < earliestFertileStart) {
    for (let n = 1; n <= maxCycles; n++) {
      const predictedStart = addDaysToDateKey(earliestStart, -n * avgCycle)
      const win = windowForPeriodStart(predictedStart, avgPeriod)
      pushWin(win)
      if (!through) {
        if (n >= 12) break
        continue
      }
      if (
        win.predictedEnd < through &&
        couplePeriodDaysBetween(win.predictedEnd, through) > avgCycle + 20
      ) {
        break
      }
    }
  }

  // 3) 最近记录之后：向前推
  const latestStart = newestFirst[0]!.startDateKey
  const forwardThrough = through ?? addDaysToDateKey(latestStart, avgCycle * 24)
  for (let n = 1; n <= maxCycles; n++) {
    const predictedStart = addDaysToDateKey(latestStart, n * avgCycle)
    const win = windowForPeriodStart(predictedStart, avgPeriod)
    if (win.fertileStart > forwardThrough) break
    pushWin(win)
  }

  return out
}

/** 下一预测窗（阶段文案 / 提醒用） */
export function predictPeriodWindow(params: {
  cycles: readonly CouplePeriodCycle[]
  settings: CouplePeriodSettings
  nowMs?: number
}): {
  predictedStart: string | null
  predictedEnd: string | null
  ovulationDay: string | null
  fertileStart: string | null
  fertileEnd: string | null
} {
  const sorted = sortPeriodCyclesNewestFirst(params.cycles)
  const last = sorted[0]
  if (!last) {
    return {
      predictedStart: null,
      predictedEnd: null,
      ovulationDay: null,
      fertileStart: null,
      fertileEnd: null,
    }
  }
  const avgCycle = estimateAvgCycleDays(sorted, params.settings.avgCycleDays)
  const avgPeriod = Math.max(1, params.settings.avgPeriodDays)
  return windowForPeriodStart(addDaysToDateKey(last.startDateKey, avgCycle), avgPeriod)
}

/** 某日落在哪类预测窗（已记录经期日勿调用） */
function resolvePredictedDayKind(
  dateKey: string,
  windows: readonly CouplePeriodPredictWindow[],
): CouplePeriodDayKind | null {
  for (const win of windows) {
    if (
      !win.skipPredicted &&
      dateKey >= win.predictedStart &&
      dateKey <= win.predictedEnd
    ) {
      return 'predicted'
    }
  }
  for (const win of windows) {
    if (dateKey === win.ovulationDay) return 'ovulation'
    if (dateKey >= win.fertileStart && dateKey <= win.fertileEnd) return 'fertile'
  }
  return null
}

export function resolveCouplePeriodDayInfo(params: {
  dateKey: string
  cycles: readonly CouplePeriodCycle[]
  settings: CouplePeriodSettings
  nowMs?: number
}): CouplePeriodDayInfo {
  const nowMs = params.nowMs ?? Date.now()
  const today = toLocalDateKey(nowMs)
  const cycle = findCycleOnDay(params.cycles, params.dateKey, today)
  if (cycle) {
    const hasEnd = !!cycle.endDateKey
    let periodEdge: CouplePeriodDayInfo['periodEdge'] = 'mid'
    if (params.dateKey === cycle.startDateKey && hasEnd && params.dateKey === cycle.endDateKey) {
      periodEdge = 'both'
    } else if (params.dateKey === cycle.startDateKey) {
      periodEdge = 'start'
    } else if (hasEnd && params.dateKey === cycle.endDateKey) {
      periodEdge = 'end'
    }
    return { dateKey: params.dateKey, kind: 'period', periodEdge, cycle }
  }

  const windows = listPredictedPeriodWindows({
    cycles: params.cycles,
    settings: params.settings,
    throughDateKey: params.dateKey,
  })
  const predictedKind = resolvePredictedDayKind(params.dateKey, windows)
  if (predictedKind) {
    return { dateKey: params.dateKey, kind: predictedKind }
  }
  return { dateKey: params.dateKey, kind: 'none' }
}

function prevDateKey(dateKey: string): string {
  return addDaysToDateKey(dateKey, -1)
}

function newPeriodCycleId(): string {
  return `pd-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function sortCycles(cycles: CouplePeriodCycle[]): CouplePeriodCycle[] {
  return cycles.slice().sort((a, b) => b.startDateKey.localeCompare(a.startDateKey))
}

/**
 * 标记/取消「月经来了」（开始日）。
 * - 是：该日设为某段开始；未结束的旧段若更早，自动在前一天收尾
 * - 否：删除以该日为开始的那段
 */
export function setPeriodStartOnCycles(
  cycles: readonly CouplePeriodCycle[],
  dateKey: string,
  marked: boolean,
  nowMs: number = Date.now(),
): CouplePeriodCycle[] {
  const today = toLocalDateKey(nowMs)
  let sorted = sortPeriodCyclesNewestFirst(cycles)

  if (!marked) {
    return sortCycles(sorted.filter((c) => c.startDateKey !== dateKey))
  }

  const existingStart = sorted.find((c) => c.startDateKey === dateKey)
  if (existingStart) return sortCycles(sorted)

  // 若点在已有段内：把该段起点挪到这天
  const covering = findCycleOnDay(sorted, dateKey, today)
  if (covering) {
    const end = covering.endDateKey
    return sortCycles(
      sorted.map((c) => {
        if (c.id !== covering.id) return c
        return {
          id: c.id,
          startDateKey: dateKey,
          createdAt: c.createdAt,
          ...(end && end >= dateKey ? { endDateKey: end } : {}),
          ...(c.flow ? { flow: c.flow } : {}),
          ...(c.pain != null ? { pain: c.pain } : {}),
          ...(c.mood ? { mood: c.mood } : {}),
          ...(c.days?.length ? { days: c.days } : {}),
          ...(c.note ? { note: c.note } : {}),
          ...(c.charActions ? { charActions: c.charActions } : {}),
        }
      }),
    )
  }

  // 未结束的更早经期：在开始日前一天自动结束
  sorted = sorted.map((c) => {
    if (c.endDateKey) return c
    if (c.startDateKey >= dateKey) return c
    const autoEnd = prevDateKey(dateKey)
    if (autoEnd < c.startDateKey) return c
    return { ...c, endDateKey: autoEnd }
  })

  const row: CouplePeriodCycle = {
    id: newPeriodCycleId(),
    startDateKey: dateKey,
    createdAt: Date.now(),
  }
  return sortCycles([row, ...sorted.filter((c) => c.startDateKey !== dateKey)])
}

/**
 * 标记/取消「月经结束了」（结束日）。
 * - 是：找到 start≤该日 的合适经期段，写入结束日（须先有「来了」）
 * - 否：若该日正是某段结束日，则清除结束（变回进行中）
 */
export function setPeriodEndOnCycles(
  cycles: readonly CouplePeriodCycle[],
  dateKey: string,
  marked: boolean,
  _nowMs: number = Date.now(),
): CouplePeriodCycle[] {
  const sorted = sortPeriodCyclesNewestFirst(cycles)

  if (!marked) {
    return sortCycles(
      sorted.map((c) => {
        if (c.endDateKey !== dateKey) return c
        const { endDateKey: _e, ...rest } = c
        return rest
      }),
    )
  }

  // 已是结束日
  if (sorted.some((c) => c.endDateKey === dateKey)) return sortCycles(sorted)

  // 优先：未结束且开始≤该日
  let target =
    sorted.find((c) => !c.endDateKey && c.startDateKey <= dateKey) ??
    sorted.find((c) => c.startDateKey <= dateKey && (!c.endDateKey || c.endDateKey >= dateKey)) ??
    sorted.find((c) => c.startDateKey <= dateKey)

  if (!target) {
    // 尚未标记「来了」：同日来了+结束
    const row: CouplePeriodCycle = {
      id: newPeriodCycleId(),
      startDateKey: dateKey,
      endDateKey: dateKey,
      createdAt: Date.now(),
    }
    return sortCycles([row, ...sorted])
  }

  if (dateKey < target.startDateKey) return sortCycles(sorted)

  return sortCycles(
    sorted.map((c) => (c.id === target!.id ? { ...c, endDateKey: dateKey } : c)),
  )
}

/** @deprecated 保留兼容；新逻辑请用 setPeriodStart/EndOnCycles */
export function togglePeriodDayOnCycles(
  cycles: readonly CouplePeriodCycle[],
  dateKey: string,
  isPeriod: boolean,
  nowMs: number = Date.now(),
): CouplePeriodCycle[] {
  if (isPeriod) return setPeriodStartOnCycles(cycles, dateKey, true, nowMs)
  return setPeriodStartOnCycles(cycles, dateKey, false, nowMs)
}
