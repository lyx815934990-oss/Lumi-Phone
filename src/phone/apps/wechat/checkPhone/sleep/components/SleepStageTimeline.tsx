import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { SLEEP_STAGE_META, type SleepNightRecord, type SleepStageKind } from '../types'
import {
  SleepGlassTooltip,
  SleepScrubLine,
  formatClockFromOffset,
  formatDurationMin,
  sleepHaptic,
  useDragScrubber,
} from '../interaction'
import { findHeartRateAtOffset, findStageAtOffset, findStageIndexAtOffset } from '../interaction/lookups'

const STAGE_COLOR: Record<SleepStageKind, string> = {
  deep: 'var(--sleep-stage-deep)',
  light: 'var(--sleep-stage-light)',
  rem: 'var(--sleep-stage-rem)',
  awake: 'var(--sleep-stage-awake)',
}

const EASE = [0.25, 0.1, 0.25, 1] as const

/**
 * 后续迭代：双指捏合缩放时间轴（pinch-to-zoom）
 * 放大后横向平移查看局部小时细节；本次仅实现点击 / 长按扫描。
 */
export function SleepStageTimeline({ night }: { night: SleepNightRecord }) {
  const total = Math.max(1, night.totalSleepMin)
  const [grown, setGrown] = useState(false)
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)
  const lastStageIdxRef = useRef<number | null>(null)
  const cardRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    setGrown(false)
    setSelectedIdx(null)
    lastStageIdxRef.current = null
    const t = window.setTimeout(() => setGrown(true), 40)
    return () => window.clearTimeout(t)
  }, [night.dateKey])

  useEffect(() => {
    const onDoc = (e: PointerEvent) => {
      if (!cardRef.current) return
      if (!cardRef.current.contains(e.target as Node)) setSelectedIdx(null)
    }
    document.addEventListener('pointerdown', onDoc)
    return () => document.removeEventListener('pointerdown', onDoc)
  }, [])

  const ticks = useMemo(() => {
    const step = 120
    const list: number[] = [0]
    for (let m = step; m < total; m += step) list.push(m)
    if (list[list.length - 1] !== total) list.push(total)
    return list
  }, [total])

  const { scrubbing, ratio, bind } = useDragScrubber({
    longPressMs: 360,
    onTap: (r) => {
      const offset = r * total
      const idx = findStageIndexAtOffset(night.stages, offset)
      setSelectedIdx((prev) => (prev === idx ? null : idx))
    },
    onScrubStart: () => {
      setSelectedIdx(null)
    },
    onScrubMove: (r) => {
      const offset = r * total
      const idx = findStageIndexAtOffset(night.stages, offset)
      if (lastStageIdxRef.current != null && lastStageIdxRef.current !== idx) {
        sleepHaptic(8)
      }
      lastStageIdxRef.current = idx
    },
    onScrubEnd: () => {
      lastStageIdxRef.current = null
    },
  })

  const scrubOffset = ratio != null ? ratio * total : null
  const scrubStage = scrubOffset != null ? findStageAtOffset(night.stages, scrubOffset) : null
  const scrubHr = scrubOffset != null ? findHeartRateAtOffset(night.heartRate, scrubOffset) : null
  const scrubLeftPct = (ratio ?? 0) * 100

  const selected = selectedIdx != null ? night.stages[selectedIdx] : null
  const selectedLeftPct = selected ? ((selected.startMin + selected.durationMin / 2) / total) * 100 : 0

  return (
    <div className="sleep-card px-4 py-5" ref={cardRef}>
      <div className="mb-3 flex items-end justify-between gap-2">
        <div className="text-[12px] tracking-[0.16em] text-[var(--sleep-muted)]">睡眠阶段</div>
        <div className="text-[10px] text-[var(--sleep-muted-2)]">点按详情 · 长按扫描</div>
      </div>

        <div className="relative pt-1">
          <div className="mb-2 flex justify-between text-[10px] text-[var(--sleep-muted-2)]">
            {ticks.map((m) => (
              <span key={m} className="sleep-num">
                {formatClockFromOffset(night.fellAsleepAt, m)}
              </span>
            ))}
          </div>

          {/* 预留气泡高度，避免遮挡刻度 */}
          <div className="relative pt-[56px]">
            <div
              className="relative h-9 select-none overflow-visible rounded-full border border-[var(--sleep-card-border)] bg-[var(--sleep-muted-2)]/20"
              {...bind}
              role="slider"
              aria-valuemin={0}
              aria-valuemax={total}
              aria-valuenow={scrubOffset != null ? Math.round(scrubOffset) : undefined}
              aria-label="睡眠阶段时间轴"
            >
              <SleepGlassTooltip open={!!selected && !scrubbing} leftPct={selectedLeftPct} arrow="bottom">
                {selected ? (
                  <>
                    <div className="text-[11px] text-[var(--sleep-muted)]">{SLEEP_STAGE_META[selected.kind].label}</div>
                    <div className="sleep-num mt-0.5 text-[13px] text-[var(--sleep-text-bright)]">
                      {formatClockFromOffset(night.fellAsleepAt, selected.startMin)}–
                      {formatClockFromOffset(night.fellAsleepAt, selected.startMin + selected.durationMin)}
                    </div>
                    <div className="mt-0.5 text-[11px] text-[var(--sleep-muted)]">
                      {formatDurationMin(selected.durationMin)}
                    </div>
                  </>
                ) : null}
              </SleepGlassTooltip>

              <SleepGlassTooltip open={scrubbing && scrubOffset != null} leftPct={scrubLeftPct} arrow="bottom">
                {scrubOffset != null && scrubStage ? (
                  <>
                    <div className="sleep-num text-[13px] text-[var(--sleep-text-bright)]">
                      {formatClockFromOffset(night.fellAsleepAt, scrubOffset)}
                    </div>
                    <div className="mt-0.5 text-[11px] text-[var(--sleep-muted)]">
                      {SLEEP_STAGE_META[scrubStage.kind].label}
                      {scrubHr ? ` · ${scrubHr.bpm} bpm` : ''}
                    </div>
                  </>
                ) : null}
              </SleepGlassTooltip>

              <div className="absolute inset-0 flex overflow-hidden rounded-full">
                {night.stages.map((seg, i) => {
                  const widthPct = (seg.durationMin / total) * 100
                  const active = selectedIdx === i && !scrubbing
                  return (
                    <div key={`${night.dateKey}-${i}-${seg.kind}`} className="relative h-full" style={{ width: `${widthPct}%` }}>
                      <motion.div
                        className={`absolute inset-0 ${active ? 'sleep-stage-seg--active' : ''}`}
                        style={{
                          background: STAGE_COLOR[seg.kind],
                          transformOrigin: 'center center',
                          border: seg.kind === 'awake' ? '1px solid rgba(255,255,255,0.25)' : undefined,
                          boxSizing: 'border-box',
                        }}
                        initial={{ scaleX: 0, opacity: 0.4 }}
                        animate={
                          grown
                            ? { scaleX: 1, opacity: 1, scale: active ? 1.03 : 1 }
                            : { scaleX: 0, opacity: 0.4, scale: 1 }
                        }
                        transition={{
                          scaleX: { duration: 0.55, delay: i * 0.045, ease: [0.22, 1, 0.36, 1] },
                          scale: { duration: 0.2, ease: EASE },
                          opacity: { duration: 0.35 },
                        }}
                      />
                    </div>
                  )
                })}
              </div>

              <SleepScrubLine open={scrubbing && ratio != null} leftPct={scrubLeftPct} />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
            {(Object.keys(SLEEP_STAGE_META) as SleepStageKind[]).map((kind) => (
              <div key={kind} className="flex items-center gap-1.5 text-[11px] text-[var(--sleep-muted)]">
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{
                    background: STAGE_COLOR[kind],
                    boxShadow: kind === 'awake' ? 'inset 0 0 0 1px rgba(255,255,255,0.35)' : undefined,
                  }}
                />
                {SLEEP_STAGE_META[kind].label}
              </div>
            ))}
          </div>
        </div>
    </div>
  )
}
