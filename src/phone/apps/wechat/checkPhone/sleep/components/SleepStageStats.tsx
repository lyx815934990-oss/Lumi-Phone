import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Moon, Waves, Eye, Feather } from 'lucide-react'
import { formatDuration } from '../mockData'
import { stageDurations } from '../mockData'
import { SLEEP_STAGE_META, type SleepNightRecord, type SleepStageKind } from '../types'
import { formatClockFromOffset, formatDurationMin, sleepHaptic } from '../interaction'
import { segmentsOfKind } from '../interaction/lookups'

const STAGE_COLOR: Record<SleepStageKind, string> = {
  deep: 'var(--sleep-stage-deep)',
  light: 'var(--sleep-stage-light)',
  rem: 'var(--sleep-stage-rem)',
  awake: 'var(--sleep-stage-awake)',
}

const ICONS: Record<SleepStageKind, typeof Moon> = {
  deep: Moon,
  light: Waves,
  rem: Eye,
  awake: Feather,
}

const ORDER: SleepStageKind[] = ['deep', 'light', 'rem', 'awake']
const LONG_PRESS_MS = 380
const EASE = [0.25, 0.1, 0.25, 1] as const

export function SleepStageStats({ night }: { night: SleepNightRecord }) {
  const stats = stageDurations(night.stages)
  const [expanded, setExpanded] = useState<SleepStageKind | null>(null)
  const [pressed, setPressed] = useState<SleepStageKind | null>(null)
  const timerRef = useRef<number | null>(null)
  const pointerKindRef = useRef<SleepStageKind | null>(null)

  useEffect(() => {
    setExpanded(null)
    setPressed(null)
  }, [night.dateKey])

  useEffect(() => {
    return () => {
      if (timerRef.current != null) window.clearTimeout(timerRef.current)
    }
  }, [])

  const rangesByKind = useMemo(() => {
    const map = {} as Record<SleepStageKind, string[]>
    for (const kind of ORDER) {
      map[kind] = segmentsOfKind(night, kind).map((s) => {
        const a = formatClockFromOffset(night.fellAsleepAt, s.startMin)
        const b = formatClockFromOffset(night.fellAsleepAt, s.startMin + s.durationMin)
        return `${a}–${b}`
      })
    }
    return map
  }, [night])

  const clearTimer = () => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  const onPointerDown = (kind: SleepStageKind) => (e: ReactPointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    pointerKindRef.current = kind
    setPressed(kind)
    clearTimer()
    timerRef.current = window.setTimeout(() => {
      sleepHaptic(14)
      setExpanded((prev) => (prev === kind ? null : kind))
      setPressed(null)
      timerRef.current = null
    }, LONG_PRESS_MS)
  }

  const onPointerUp = () => {
    clearTimer()
    setPressed(null)
    pointerKindRef.current = null
  }

  return (
    <div className="sleep-card px-4 py-5">
      <div className="mb-3 flex items-end justify-between gap-2">
        <div className="text-[12px] tracking-[0.16em] text-[var(--sleep-muted)]">阶段占比</div>
        <div className="text-[10px] text-[var(--sleep-muted-2)]">长按展开时段</div>
      </div>

      <div className="mb-4 flex h-2.5 overflow-hidden rounded-full">
        {ORDER.map((kind) => (
          <div
            key={kind}
            style={{
              width: `${stats.pct[kind]}%`,
              background: STAGE_COLOR[kind],
              minWidth: stats.pct[kind] > 0 ? 4 : 0,
            }}
            title={`${SLEEP_STAGE_META[kind].label} ${stats.pct[kind]}%`}
          />
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {ORDER.map((kind) => {
          const Icon = ICONS[kind]
          const dur = formatDuration(stats[kind])
          const isOpen = expanded === kind
          const isPressed = pressed === kind
          const ranges = rangesByKind[kind]
          return (
            <div key={kind} className="min-w-0">
              <div
                className={`sleep-stats-card flex cursor-pointer items-center gap-2.5 rounded-[var(--sleep-radius-sm)] border border-[var(--sleep-chip-border)] bg-[var(--sleep-chip)] px-3 py-2.5 outline-none ${
                  isPressed ? 'sleep-stats-card--pressed' : ''
                } ${isOpen ? 'border-[var(--sleep-accent)]/35' : ''}`}
                onPointerDown={onPointerDown(kind)}
                onPointerUp={onPointerUp}
                onPointerLeave={onPointerUp}
                onPointerCancel={onPointerUp}
                onContextMenu={(e) => e.preventDefault()}
                role="button"
                tabIndex={0}
                aria-expanded={isOpen}
                aria-label={`长按查看${SLEEP_STAGE_META[kind].label}时段`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setExpanded((prev) => (prev === kind ? null : kind))
                  }
                }}
              >
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                  style={{ background: STAGE_COLOR[kind], opacity: 0.9 }}
                >
                  <Icon size={14} strokeWidth={1.6} className="text-white/90" aria-hidden />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] text-[var(--sleep-muted)]">{SLEEP_STAGE_META[kind].label}</div>
                  <div className="sleep-num mt-0.5 text-[13px] text-[var(--sleep-text-bright)]">
                    {dur.hours > 0 ? `${dur.hours}h ` : ''}
                    {dur.minutes}m
                    <span className="ml-1.5 text-[11px] text-[var(--sleep-muted)]">{stats.pct[kind]}%</span>
                  </div>
                </div>
              </div>

              <AnimatePresence initial={false}>
                {isOpen ? (
                  <motion.div
                    className="sleep-stats-accordion"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.22, ease: EASE }}
                  >
                    <div className="mt-1.5 rounded-[12px] border border-[var(--sleep-chip-border)] bg-[var(--sleep-chip)] px-2.5 py-2">
                      <div className="mb-1.5 text-[10px] tracking-[0.08em] text-[var(--sleep-muted-2)]">
                        共 {ranges.length} 段 · {formatDurationMin(stats[kind])}
                      </div>
                      {ranges.length ? (
                        <ul className="space-y-1">
                          {ranges.map((range) => (
                            <li key={range} className="flex items-center gap-1.5 text-[11px] text-[var(--sleep-text)]">
                              <span
                                className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
                                style={{ background: STAGE_COLOR[kind] }}
                              />
                              <span className="sleep-num">{range}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="text-[11px] text-[var(--sleep-muted)]">本晚无此阶段</div>
                      )}
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          )
        })}
      </div>
    </div>
  )
}
