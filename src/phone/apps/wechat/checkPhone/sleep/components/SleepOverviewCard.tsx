import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { formatClock, formatDuration } from '../mockData'
import type { SleepNightRecord } from '../types'

function Ring({ score, label }: { score: number; label: string }) {
  const size = 112
  const stroke = 8
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    setDisplay(0)
    const start = performance.now()
    const dur = 1150
    let raf = 0
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur)
      const eased = 1 - Math.pow(1 - t, 3)
      setDisplay(Math.round(score * eased))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [score])

  return (
    <div className="relative flex h-[112px] w-[112px] shrink-0 items-center justify-center">
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <defs>
          <linearGradient id="sleep-ring-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--sleep-ring-from)" />
            <stop offset="100%" stopColor="var(--sleep-ring-to)" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--sleep-muted-2)"
          strokeWidth={stroke}
          opacity={0.45}
        />
        <motion.circle
          key={score}
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="url(#sleep-ring-grad)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - score / 100) }}
          transition={{ duration: 1.15, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="sleep-num text-[28px] leading-none text-[var(--sleep-text-bright)]">{display}</span>
        <span className="mt-1 text-[11px] tracking-[0.12em] text-[var(--sleep-muted)]">{label}</span>
      </div>
    </div>
  )
}

export function SleepOverviewCard({ night }: { night: SleepNightRecord }) {
  const { hours, minutes, label } = formatDuration(night.totalSleepMin)
  return (
    <div className="sleep-card sleep-card--hero px-5 py-6">
      <div className="relative z-[1] flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="text-[12px] tracking-[0.18em] text-[var(--sleep-muted)]">总睡眠</div>
          <div
            className="sleep-num mt-2 text-[var(--sleep-text-bright)]"
            style={{ fontSize: 'clamp(34px, 9vw, 44px)', lineHeight: 1.05 }}
            aria-label={label}
          >
            <span>{hours}</span>
            <span className="ml-1 text-[16px] font-normal tracking-normal text-[var(--sleep-muted)]">小时</span>
            <span className="ml-2">{minutes}</span>
            <span className="ml-1 text-[16px] font-normal tracking-normal text-[var(--sleep-muted)]">分钟</span>
          </div>
          <div className="mt-3 flex items-center gap-2 text-[13px] text-[var(--sleep-muted)]">
            <span className="sleep-num">{formatClock(night.fellAsleepAt)}</span>
            <span aria-hidden className="opacity-60">
              ～
            </span>
            <span className="sleep-num">{formatClock(night.wokeAt)}</span>
          </div>
        </div>
        <Ring score={night.qualityScore} label={night.qualityLabel} />
      </div>
    </div>
  )
}
