/**
 * 经期按天记录：流量 / 痛感 / 心情
 */

import type {
  CouplePeriodCycle,
  CouplePeriodDayEntry,
  CouplePeriodFlow,
  CouplePeriodMood,
  CouplePeriodPain,
} from './coupleSpaceTypes'
import {
  PERIOD_FLOW_LABEL,
  PERIOD_MOOD_LABEL,
  PERIOD_PAIN_LABEL,
  addDaysToDateKey,
  couplePeriodDaysBetween,
  periodCycleLengthDays,
} from './couplePeriodLogic'
import { toLocalDateKey } from './coupleSpaceTypes'

const FLOW_RANK: Record<CouplePeriodFlow, number> = { light: 1, medium: 2, heavy: 3 }

export function normalizeCouplePeriodDayEntry(raw: unknown): CouplePeriodDayEntry | null {
  if (!raw || typeof raw !== 'object') return null
  const d = raw as Partial<CouplePeriodDayEntry>
  const dateKey = String(d.dateKey ?? '').trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return null
  const flow =
    d.flow === 'light' || d.flow === 'medium' || d.flow === 'heavy' ? d.flow : undefined
  const pain =
    d.pain === 0 || d.pain === 1 || d.pain === 2 || d.pain === 3 ? d.pain : undefined
  const mood =
    d.mood === 'calm' ||
    d.mood === 'low' ||
    d.mood === 'irritable' ||
    d.mood === 'sensitive' ||
    d.mood === 'tired' ||
    d.mood === 'anxious'
      ? d.mood
      : undefined
  if (!flow && pain == null && !mood) return null
  return {
    dateKey,
    ...(flow ? { flow } : {}),
    ...(pain != null ? { pain } : {}),
    ...(mood ? { mood } : {}),
  }
}

export function normalizeCouplePeriodDays(raw: unknown): CouplePeriodDayEntry[] {
  if (!Array.isArray(raw)) return []
  const map = new Map<string, CouplePeriodDayEntry>()
  for (const item of raw) {
    const row = normalizeCouplePeriodDayEntry(item)
    if (row) map.set(row.dateKey, row)
  }
  return [...map.values()].sort((a, b) => a.dateKey.localeCompare(b.dateKey))
}

/** 旧版整段字段 → 落到开始日一条，便于迁移 */
export function migrateLegacyCycleMetrics(cycle: CouplePeriodCycle): CouplePeriodDayEntry[] {
  const existing = normalizeCouplePeriodDays(cycle.days)
  if (existing.length) return existing
  if (!cycle.flow && cycle.pain == null && !cycle.mood) return []
  return [
    {
      dateKey: cycle.startDateKey,
      ...(cycle.flow ? { flow: cycle.flow } : {}),
      ...(cycle.pain != null ? { pain: cycle.pain } : {}),
      ...(cycle.mood ? { mood: cycle.mood } : {}),
    },
  ]
}

export function getPeriodDayEntry(
  cycle: CouplePeriodCycle,
  dateKey: string,
): CouplePeriodDayEntry | undefined {
  const days = migrateLegacyCycleMetrics(cycle)
  return days.find((d) => d.dateKey === dateKey)
}

export function upsertPeriodDayEntry(
  days: readonly CouplePeriodDayEntry[],
  dateKey: string,
  patch: {
    flow?: CouplePeriodFlow | null
    pain?: CouplePeriodPain | null
    mood?: CouplePeriodMood | null
  },
): CouplePeriodDayEntry[] {
  const map = new Map(normalizeCouplePeriodDays(days).map((d) => [d.dateKey, d]))
  const prev = map.get(dateKey)
  const nextFlow =
    patch.flow !== undefined
      ? patch.flow === null
        ? undefined
        : patch.flow
      : prev?.flow
  const nextPain =
    patch.pain !== undefined
      ? patch.pain === null
        ? undefined
        : patch.pain
      : prev?.pain
  const nextMood =
    patch.mood !== undefined
      ? patch.mood === null
        ? undefined
        : patch.mood
      : prev?.mood

  if (!nextFlow && nextPain == null && !nextMood) {
    map.delete(dateKey)
  } else {
    map.set(dateKey, {
      dateKey,
      ...(nextFlow ? { flow: nextFlow } : {}),
      ...(nextPain != null ? { pain: nextPain } : {}),
      ...(nextMood ? { mood: nextMood } : {}),
    })
  }
  return [...map.values()].sort((a, b) => a.dateKey.localeCompare(b.dateKey))
}

/** 从按天记录回填整段摘要（峰值流量/痛感、最近心情），供记忆/旧 UI 兼容 */
export function summarizeCycleMetricsFromDays(days: readonly CouplePeriodDayEntry[]): {
  flow?: CouplePeriodFlow
  pain?: CouplePeriodPain
  mood?: CouplePeriodMood
} {
  let flow: CouplePeriodFlow | undefined
  let pain: CouplePeriodPain | undefined
  let mood: CouplePeriodMood | undefined
  for (const d of days) {
    if (d.flow && (!flow || FLOW_RANK[d.flow] > FLOW_RANK[flow])) flow = d.flow
    if (d.pain != null && (pain == null || d.pain > pain)) pain = d.pain
    if (d.mood) mood = d.mood
  }
  return {
    ...(flow ? { flow } : {}),
    ...(pain != null ? { pain } : {}),
    ...(mood ? { mood } : {}),
  }
}

export function periodSpanDayKeys(cycle: CouplePeriodCycle, nowMs: number = Date.now()): string[] {
  const today = toLocalDateKey(nowMs)
  const end = cycle.endDateKey ?? (cycle.startDateKey <= today ? today : cycle.startDateKey)
  if (end < cycle.startDateKey) return [cycle.startDateKey]
  const n = Math.min(14, Math.max(1, couplePeriodDaysBetween(cycle.startDateKey, end) + 1))
  const keys: string[] = []
  for (let i = 0; i < n; i++) keys.push(addDaysToDateKey(cycle.startDateKey, i))
  return keys
}

export type PeriodDayMetricPoint = {
  dayIndex: number
  dateKey: string
  flow: CouplePeriodFlow | null
  pain: CouplePeriodPain | null
  mood: CouplePeriodMood | null
  flowRank: number | null
  painRank: number | null
}

export function listPeriodDayMetricPoints(
  cycle: CouplePeriodCycle,
  nowMs: number = Date.now(),
): PeriodDayMetricPoint[] {
  const days = migrateLegacyCycleMetrics(cycle)
  const byKey = new Map(days.map((d) => [d.dateKey, d]))
  return periodSpanDayKeys(cycle, nowMs).map((dateKey, i) => {
    const row = byKey.get(dateKey)
    const flow = row?.flow ?? null
    const pain = row?.pain ?? null
    return {
      dayIndex: i + 1,
      dateKey,
      flow,
      pain,
      mood: row?.mood ?? null,
      flowRank: flow ? FLOW_RANK[flow] : null,
      painRank: pain,
    }
  })
}

export function formatFlowChain(cycle: CouplePeriodCycle): string | null {
  const points = listPeriodDayMetricPoints(cycle).filter((p) => p.flow)
  if (!points.length) return null
  return points.map((p) => PERIOD_FLOW_LABEL[p.flow!] ?? p.flow).join('→')
}

export function formatPainChain(cycle: CouplePeriodCycle): string | null {
  const points = listPeriodDayMetricPoints(cycle).filter((p) => p.pain != null)
  if (!points.length) return null
  return points.map((p) => PERIOD_PAIN_LABEL[p.pain!] ?? String(p.pain)).join('→')
}

export function formatMoodChain(cycle: CouplePeriodCycle): string | null {
  const points = listPeriodDayMetricPoints(cycle).filter((p) => p.mood)
  if (!points.length) return null
  return points.map((p) => PERIOD_MOOD_LABEL[p.mood!] ?? p.mood).join('→')
}

export function peakFlowLabel(cycle: CouplePeriodCycle): string | null {
  const s = summarizeCycleMetricsFromDays(migrateLegacyCycleMetrics(cycle))
  return s.flow ? PERIOD_FLOW_LABEL[s.flow] ?? s.flow : null
}

export function peakPainLabel(cycle: CouplePeriodCycle): string | null {
  const s = summarizeCycleMetricsFromDays(migrateLegacyCycleMetrics(cycle))
  return s.pain != null ? PERIOD_PAIN_LABEL[s.pain] ?? String(s.pain) : null
}

/** 近半年同「第 N 天」流量/痛感平均（等级） */
export function buildHalfYearDayAverages(
  cycles: readonly CouplePeriodCycle[],
  nowMs: number = Date.now(),
  maxDay = 7,
): {
  flowAvgRanks: Array<number | null>
  painAvgRanks: Array<number | null>
} {
  const today = toLocalDateKey(nowMs)
  const cutoff = addDaysToDateKey(today, -183)
  const recent = cycles.filter((c) => c.startDateKey >= cutoff)
  const flowBuckets: number[][] = Array.from({ length: maxDay }, () => [])
  const painBuckets: number[][] = Array.from({ length: maxDay }, () => [])

  for (const c of recent) {
    for (const p of listPeriodDayMetricPoints(c, nowMs)) {
      if (p.dayIndex < 1 || p.dayIndex > maxDay) continue
      if (p.flowRank != null) flowBuckets[p.dayIndex - 1]!.push(p.flowRank)
      if (p.painRank != null) painBuckets[p.dayIndex - 1]!.push(p.painRank)
    }
  }

  const avg = (arr: number[]) =>
    arr.length ? Math.round((arr.reduce((s, n) => s + n, 0) / arr.length) * 10) / 10 : null

  return {
    flowAvgRanks: flowBuckets.map(avg),
    painAvgRanks: painBuckets.map(avg),
  }
}

export function flowRankToLabel(rank: number | null): string {
  if (rank == null) return '—'
  if (rank < 1.5) return PERIOD_FLOW_LABEL.light
  if (rank < 2.5) return PERIOD_FLOW_LABEL.medium
  return PERIOD_FLOW_LABEL.heavy
}

export function estimatedPeriodDayCount(cycle: CouplePeriodCycle, nowMs?: number): number {
  return (
    periodCycleLengthDays(cycle) ??
    periodSpanDayKeys(cycle, nowMs).length
  )
}
