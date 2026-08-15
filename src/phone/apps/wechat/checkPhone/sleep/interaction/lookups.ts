import type { HeartRateSample, SleepNightRecord, SleepStageKind, SleepStageSegment } from '../types'

export function findStageAtOffset(stages: SleepStageSegment[], offsetMin: number): SleepStageSegment | null {
  if (!stages.length) return null
  for (const s of stages) {
    if (offsetMin >= s.startMin && offsetMin < s.startMin + s.durationMin) return s
  }
  return stages[stages.length - 1] ?? null
}

export function findStageIndexAtOffset(stages: SleepStageSegment[], offsetMin: number): number {
  for (let i = 0; i < stages.length; i++) {
    const s = stages[i]!
    if (offsetMin >= s.startMin && offsetMin < s.startMin + s.durationMin) return i
  }
  return Math.max(0, stages.length - 1)
}

export function findHeartRateAtOffset(samples: HeartRateSample[], offsetMin: number): HeartRateSample | null {
  if (!samples.length) return null
  let best = samples[0]!
  let bestDist = Math.abs(best.atMin - offsetMin)
  for (let i = 1; i < samples.length; i++) {
    const s = samples[i]!
    const d = Math.abs(s.atMin - offsetMin)
    if (d < bestDist) {
      best = s
      bestDist = d
    }
  }
  return best
}

export function sampleIndexAtOffset(samples: HeartRateSample[], offsetMin: number): number {
  if (!samples.length) return 0
  let best = 0
  let bestDist = Math.abs(samples[0]!.atMin - offsetMin)
  for (let i = 1; i < samples.length; i++) {
    const d = Math.abs(samples[i]!.atMin - offsetMin)
    if (d < bestDist) {
      best = i
      bestDist = d
    }
  }
  return best
}

export function segmentsOfKind(night: SleepNightRecord, kind: SleepStageKind): SleepStageSegment[] {
  return night.stages.filter((s) => s.kind === kind)
}
