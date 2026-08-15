import { AnimatePresence, motion } from 'framer-motion'
import type { ReactNode } from 'react'

const EASE = [0.25, 0.1, 0.25, 1] as const

/** 夜色毛玻璃气泡 —— 时间轴 / 心率曲线共用 */
export function SleepGlassTooltip({
  open,
  leftPct,
  children,
  arrow = 'bottom',
  className = '',
}: {
  open: boolean
  /** 0–100，相对父容器水平位置 */
  leftPct: number
  children: ReactNode
  arrow?: 'bottom' | 'top' | 'none'
  className?: string
}) {
  const clamped = Math.max(8, Math.min(92, leftPct))
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className={`pointer-events-none absolute z-20 ${className}`}
          style={{
            left: `${clamped}%`,
            transform: 'translateX(-50%)',
            bottom: arrow === 'bottom' ? '100%' : undefined,
            top: arrow === 'top' ? '100%' : undefined,
            marginBottom: arrow === 'bottom' ? 10 : undefined,
            marginTop: arrow === 'top' ? 10 : undefined,
          }}
          initial={{ opacity: 0, scale: 0.92, y: arrow === 'bottom' ? 4 : -4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: arrow === 'bottom' ? 3 : -3 }}
          transition={{ duration: 0.2, ease: EASE }}
        >
          <div className="sleep-tooltip-bubble relative whitespace-nowrap px-3 py-2 text-left">
            {children}
            {arrow !== 'none' ? (
              <span
                className={`sleep-tooltip-arrow ${arrow === 'bottom' ? 'sleep-tooltip-arrow--down' : 'sleep-tooltip-arrow--up'}`}
                aria-hidden
              />
            ) : null}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

export function SleepScrubLine({
  open,
  leftPct,
}: {
  open: boolean
  leftPct: number
}) {
  const clamped = Math.max(0, Math.min(100, leftPct))
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="pointer-events-none absolute inset-y-0 z-10"
          style={{ left: `${clamped}%` }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: EASE }}
        >
          <div className="sleep-scrub-line absolute inset-y-[-4px] w-px -translate-x-1/2" />
          <div className="sleep-scrub-handle absolute left-1/2 top-[-6px] h-2.5 w-2.5 -translate-x-1/2 rounded-full" />
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
