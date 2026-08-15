import { useEffect, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronRight, Star } from 'lucide-react'
import type { MarketFilter, MarketKind, MarketOrder, OrderStatus } from '../types'
import { MARKET_KIND_LABEL, MARKET_KINDS, ORDER_STATUS_LABEL, formatYuan } from '../types'

const EASE = [0.22, 1, 0.36, 1] as const

export function FilterChips({
  value,
  onChange,
}: {
  value: MarketFilter
  onChange: (next: MarketFilter) => void
}) {
  const chips: Array<{ id: MarketFilter; label: string }> = [
    { id: 'all', label: '全部' },
    ...MARKET_KINDS.map((k) => ({ id: k as MarketFilter, label: MARKET_KIND_LABEL[k] })),
  ]
  return (
    <div className="market-chip-row">
      {chips.map((c) => (
        <button
          key={c.id}
          type="button"
          className="market-chip"
          data-on={value === c.id ? 'true' : 'false'}
          onClick={() => onChange(c.id)}
        >
          {value === c.id ? (
            <motion.span
              layoutId="market-chip-pill"
              className="market-chip-pill"
              transition={{ type: 'spring', stiffness: 420, damping: 34 }}
            />
          ) : null}
          <span className="relative z-[1]">{c.label}</span>
        </button>
      ))}
    </div>
  )
}

export function StarRating({ rating, size = 14 }: { rating: number; size?: number }) {
  const r = Math.max(0, Math.min(5, rating))
  return (
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => {
        const filled = i + 1 <= Math.round(r)
        return (
          <motion.span
            key={i}
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: i * 0.04, duration: 0.28, ease: EASE }}
            className="inline-flex"
          >
            <Star
              size={size}
              strokeWidth={1.6}
              fill={filled ? '#101012' : 'transparent'}
              color={filled ? '#101012' : '#E6E4E0'}
              aria-hidden
            />
          </motion.span>
        )
      })}
      <span className="mk-num ml-1 text-[13px] font-medium" style={{ color: '#3C8C86' }}>
        {r.toFixed(1)}
      </span>
    </span>
  )
}

export function KindPill({ kind }: { kind: MarketKind }) {
  return <span className="market-kind-pill">{MARKET_KIND_LABEL[kind]}</span>
}

function StatusBlock({ status }: { status: OrderStatus }) {
  const label = ORDER_STATUS_LABEL[status]
  if (status === 'pending') {
    return (
      <motion.span
        className="market-stamp"
        initial={{ rotate: -8, scale: 0.86, opacity: 0 }}
        animate={{ rotate: -6, scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 320, damping: 18 }}
      >
        {label}
      </motion.span>
    )
  }
  const hot = status === 'confirmed'
  return (
    <span className="market-status-plain" data-hot={hot ? 'true' : 'false'}>
      {label}
    </span>
  )
}

export function TicketStubCard({
  order,
  onClick,
  index = 0,
}: {
  order: MarketOrder
  onClick: () => void
  index?: number
}) {
  const caption = order.coverCaption?.trim() || MARKET_KIND_LABEL[order.kind]
  return (
    <motion.button
      type="button"
      className="market-ticket"
      onClick={onClick}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.34, delay: Math.min(index, 8) * 0.04, ease: EASE }}
      whileTap={{ scale: 0.985 }}
    >
      <span className="market-ticket-rail" style={{ background: order.coverTone }} aria-hidden />
      <div className="market-ticket-main">
        <div className="market-ticket-cover" style={{ background: order.coverTone }}>
          <span>{caption.slice(0, 6)}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <KindPill kind={order.kind} />
            {order.rating != null ? (
              <span className="market-ticket-rating mk-num">{order.rating.toFixed(1)}</span>
            ) : null}
          </div>
          <div className="market-ticket-title">{order.title}</div>
          <div className="market-ticket-meta">{order.dateLine}</div>
          <div className="market-ticket-amount-row">
            <span className="market-ticket-amount mk-num">¥{formatYuan(order.amountYuan)}</span>
            <ChevronRight size={14} className="market-ticket-chevron" aria-hidden />
          </div>
        </div>
      </div>
      <div className="market-ticket-stub">
        <span className="market-ticket-notch top" />
        <span className="market-ticket-notch bottom" />
        <StatusBlock status={order.status} />
      </div>
    </motion.button>
  )
}

export function useCountUp(target: number, durationMs = 700): number {
  const [v, setV] = useState(0)
  useEffect(() => {
    let raf = 0
    const t0 = performance.now()
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / durationMs)
      const eased = 1 - Math.pow(1 - p, 3)
      setV(target * eased)
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, durationMs])
  return v
}

export function AnimatedPresenceList({
  filterKey,
  children,
}: {
  filterKey: string
  children: ReactNode
}) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={filterKey}
        className="flex flex-col gap-3"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.2, ease: EASE }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
