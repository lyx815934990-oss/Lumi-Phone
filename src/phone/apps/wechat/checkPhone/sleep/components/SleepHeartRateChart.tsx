import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import type { SleepNightRecord } from '../types'
import { SLEEP_STAGE_META } from '../types'
import {
  SleepGlassTooltip,
  SleepScrubLine,
  formatClockFromOffset,
  useDragScrubber,
} from '../interaction'
import { findStageAtOffset, sampleIndexAtOffset } from '../interaction/lookups'

function buildPath(points: Array<{ x: number; y: number }>, closed: boolean): string {
  if (!points.length) return ''
  let d = `M ${points[0]!.x} ${points[0]!.y}`
  for (let i = 1; i < points.length; i++) {
    const p0 = points[i - 1]!
    const p1 = points[i]!
    const cx = (p0.x + p1.x) / 2
    d += ` C ${cx} ${p0.y}, ${cx} ${p1.y}, ${p1.x} ${p1.y}`
  }
  if (closed) {
    const last = points[points.length - 1]!
    const first = points[0]!
    d += ` L ${last.x} 64 L ${first.x} 64 Z`
  }
  return d
}

const EASE = [0.25, 0.1, 0.25, 1] as const

export function SleepHeartRateChart({ night }: { night: SleepNightRecord }) {
  const total = Math.max(1, night.totalSleepMin)
  const cardRef = useRef<HTMLDivElement | null>(null)
  const [pinnedIdx, setPinnedIdx] = useState<number | null>(null)

  useEffect(() => {
    setPinnedIdx(null)
  }, [night.dateKey])

  useEffect(() => {
    const onDoc = (e: PointerEvent) => {
      if (!cardRef.current) return
      if (!cardRef.current.contains(e.target as Node)) setPinnedIdx(null)
    }
    document.addEventListener('pointerdown', onDoc)
    return () => document.removeEventListener('pointerdown', onDoc)
  }, [])

  const chart = useMemo(() => {
    const samples = night.heartRate
    if (!samples.length) {
      return { linePath: '', areaPath: '', avg: 0, min: 0, max: 0, points: [] as Array<{ x: number; y: number }> }
    }
    const bpms = samples.map((s) => s.bpm)
    const lo = Math.min(...bpms) - 4
    const hi = Math.max(...bpms) + 4
    const span = Math.max(1, hi - lo)
    const w = 100
    const h = 56
    const padY = 8
    const points = samples.map((s, i) => {
      const x = samples.length === 1 ? w / 2 : (i / (samples.length - 1)) * w
      const y = padY + (1 - (s.bpm - lo) / span) * (h - padY * 2)
      return { x, y }
    })
    const avgBpm = Math.round(bpms.reduce((a, b) => a + b, 0) / bpms.length)
    return {
      linePath: buildPath(points, false),
      areaPath: buildPath(points, true),
      avg: avgBpm,
      min: Math.min(...bpms),
      max: Math.max(...bpms),
      points,
    }
  }, [night.heartRate])

  const { scrubbing, ratio, bind } = useDragScrubber({
    longPressMs: 280,
    enableScrub: true,
    onTap: (r) => {
      const offset = r * total
      const idx = sampleIndexAtOffset(night.heartRate, offset)
      setPinnedIdx((prev) => (prev === idx ? null : idx))
    },
    onScrubStart: () => setPinnedIdx(null),
  })

  const activeIdx =
    scrubbing && ratio != null ? sampleIndexAtOffset(night.heartRate, ratio * total) : pinnedIdx

  const activeSample = activeIdx != null ? night.heartRate[activeIdx] : null
  const activePoint = activeIdx != null ? chart.points[activeIdx] : null
  const leftPct = activeSample != null ? (activeSample.atMin / total) * 100 : (ratio ?? 0) * 100
  const stage = activeSample != null ? findStageAtOffset(night.stages, activeSample.atMin) : null

  return (
    <div className="sleep-card px-4 py-5" ref={cardRef}>
      <div className="mb-1 flex items-end justify-between">
        <div>
          <div className="text-[12px] tracking-[0.16em] text-[var(--sleep-muted)]">睡眠心率</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="sleep-num text-[22px] text-[var(--sleep-text-bright)]">{chart.avg}</span>
            <span className="text-[11px] text-[var(--sleep-muted)]">bpm 平均</span>
          </div>
        </div>
        <div className="text-right text-[11px] text-[var(--sleep-muted-2)]">
          <div>
            最低 <span className="sleep-num text-[var(--sleep-muted)]">{chart.min}</span>
          </div>
          <div>
            最高 <span className="sleep-num text-[var(--sleep-muted)]">{chart.max}</span>
          </div>
        </div>
      </div>

      <div className="relative mt-2 pt-[52px]">
        <div
          className="sleep-hr-breathe relative h-[88px] w-full select-none"
          {...bind}
          role="slider"
          aria-label="睡眠心率曲线"
        >
          <SleepGlassTooltip open={activeSample != null} leftPct={leftPct} arrow="bottom">
            {activeSample ? (
              <>
                <div className="sleep-num text-[14px] text-[var(--sleep-text-bright)]">
                  {activeSample.bpm}
                  <span className="ml-1 text-[10px] font-normal tracking-normal text-[var(--sleep-muted)]">bpm</span>
                </div>
                <div className="mt-0.5 text-[11px] text-[var(--sleep-muted)]">
                  {formatClockFromOffset(night.fellAsleepAt, activeSample.atMin)}
                  {stage ? ` · ${SLEEP_STAGE_META[stage.kind].label}` : ''}
                </div>
              </>
            ) : null}
          </SleepGlassTooltip>

          <svg viewBox="0 0 100 64" preserveAspectRatio="none" className="h-full w-full" aria-hidden>
            <defs>
              <linearGradient id="sleep-hr-stroke" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="var(--sleep-hr)" stopOpacity="0.45" />
                <stop offset="50%" stopColor="var(--sleep-hr)" stopOpacity="1" />
                <stop offset="100%" stopColor="var(--sleep-hr)" stopOpacity="0.5" />
              </linearGradient>
              <linearGradient id="sleep-hr-fill" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="var(--sleep-hr)" stopOpacity="0.28" />
                <stop offset="100%" stopColor="var(--sleep-hr)" stopOpacity="0" />
              </linearGradient>
            </defs>
            {[20, 36, 52].map((y) => (
              <line
                key={y}
                x1="0"
                x2="100"
                y1={y}
                y2={y}
                stroke="var(--sleep-muted-2)"
                strokeWidth="0.4"
                opacity="0.55"
              />
            ))}
            {chart.areaPath ? <path d={chart.areaPath} fill="url(#sleep-hr-fill)" /> : null}
            {chart.linePath ? (
              <path d={chart.linePath} fill="none" stroke="url(#sleep-hr-stroke)" strokeWidth="1.4" strokeLinecap="round" />
            ) : null}

            {activePoint ? (
              <>
                <line
                  x1={activePoint.x}
                  x2={activePoint.x}
                  y1={0}
                  y2={64}
                  stroke="var(--sleep-text-bright)"
                  strokeOpacity={0.35}
                  strokeWidth={0.5}
                />
                <motion.circle
                  key={`${activeIdx}-${activeSample?.bpm}`}
                  cx={activePoint.x}
                  cy={activePoint.y}
                  r={2.2}
                  fill="var(--sleep-text-bright)"
                  initial={{ scale: 0.6, opacity: 0.5 }}
                  animate={{ scale: [1, 1.25, 1], opacity: 1 }}
                  transition={{ duration: 0.28, ease: EASE }}
                  style={{ transformOrigin: `${activePoint.x}px ${activePoint.y}px` }}
                />
              </>
            ) : null}
          </svg>

          <SleepScrubLine open={scrubbing && ratio != null} leftPct={(ratio ?? 0) * 100} />
        </div>
      </div>

      <div className="mt-2 text-center text-[10px] text-[var(--sleep-muted-2)]">点按查看 · 按住拖动扫读</div>
    </div>
  )
}
