import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Clock3, Receipt, Star, Ticket } from 'lucide-react'
import type { MarketDataset, MarketFilter, MarketKind, MarketScreen } from '../types'
import { MARKET_KIND_LABEL, MARKET_KINDS, formatYuan } from '../types'
import {
  AnimatedPresenceList,
  FilterChips,
  TicketStubCard,
  useCountUp,
} from '../components/TicketBits'

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.055, delayChildren: 0.03 } },
}

const item = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.38, ease: [0.22, 1, 0.36, 1] as const },
  },
}

const KIND_TONE: Record<MarketKind, string> = {
  hotel: '#3C8C86',
  restaurant: '#5a8f7b',
  voucher: '#6a9a8e',
  play: '#4a7d78',
}

export function HomeScreen({
  data,
  characterName,
  onNavigate,
  onOpenOrder,
}: {
  data: MarketDataset
  characterName?: string
  onNavigate: (screen: MarketScreen) => void
  onOpenOrder: (id: string) => void
}) {
  const [filter, setFilter] = useState<MarketFilter>('all')
  const who = characterName?.trim() || 'TA'
  const spendAnim = useCountUp(data.monthSpendYuan, 720)
  const orderCount = data.orderCount || data.orders.length

  const orders = useMemo(() => {
    if (filter === 'all') return data.orders
    return data.orders.filter((o) => o.kind === filter)
  }, [data.orders, filter])

  const pendingCount = useMemo(
    () => data.orders.filter((o) => o.status === 'pending' || o.status === 'confirmed').length,
    [data.orders],
  )

  const kindShare = useMemo(() => {
    const total = Math.max(1, data.orders.length)
    return MARKET_KINDS.map((k) => {
      const n = data.orders.filter((o) => o.kind === k).length
      return { kind: k, n, pct: n / total, color: KIND_TONE[k] }
    }).filter((x) => x.n > 0)
  }, [data.orders])

  return (
    <motion.div className="market-home px-4 pb-12 pt-2" variants={stagger} initial="hidden" animate="show">
      <motion.header className="market-ledger-hero" variants={item}>
        <div className="market-ledger-hero-kicker">
          <Receipt size={12} strokeWidth={1.8} aria-hidden />
          Neighborhood ledger
        </div>
        <h1 className="market-ledger-hero-title">{who}的团购账本</h1>
        <p className="market-ledger-hero-desc">订房 · 订位 · 买券 · 出门玩 · 只读偷看</p>

        <div className="market-ledger-spend">
          <div className="min-w-0">
            <div className="market-ledger-label">本月消费</div>
            <div className="market-ledger-amount">
              <span className="mk-num">¥{formatYuan(spendAnim)}</span>
            </div>
          </div>
          <div className="market-ledger-spend-side">
            <div className="market-ledger-pill">
              <span className="mk-num">{orderCount}</span>
              <small>笔订单</small>
            </div>
            {pendingCount > 0 ? (
              <div className="market-ledger-pill market-ledger-pill--hot">
                <Ticket size={12} strokeWidth={1.8} aria-hidden />
                <span className="mk-num">{pendingCount}</span>
                <small>待用</small>
              </div>
            ) : null}
          </div>
        </div>

        {kindShare.length ? (
          <div className="market-ledger-share" aria-hidden>
            {kindShare.map((s, i) => (
              <motion.span
                key={s.kind}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.14 + i * 0.05, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  width: `${Math.max(8, s.pct * 100)}%`,
                  background: s.color,
                  transformOrigin: 'left center',
                }}
                title={`${MARKET_KIND_LABEL[s.kind]} ${s.n}`}
              />
            ))}
          </div>
        ) : null}

        {kindShare.length ? (
          <div className="market-ledger-legend">
            {kindShare.map((s) => (
              <span key={s.kind}>
                <i style={{ background: s.color }} />
                {MARKET_KIND_LABEL[s.kind]}
                <em className="mk-num">{s.n}</em>
              </span>
            ))}
          </div>
        ) : null}
      </motion.header>

      <motion.div className="market-quick-row mt-4" variants={item}>
        <motion.button
          type="button"
          className="market-quick-tile"
          onClick={() => onNavigate({ kind: 'browse' })}
          whileTap={{ scale: 0.97 }}
        >
          <span className="market-quick-tile-icon">
            <Clock3 size={18} strokeWidth={1.6} />
          </span>
          <strong>浏览足迹</strong>
          <em>App 里看过的店与项目</em>
        </motion.button>
        <motion.button
          type="button"
          className="market-quick-tile"
          onClick={() => onNavigate({ kind: 'reviews' })}
          whileTap={{ scale: 0.97 }}
        >
          <span className="market-quick-tile-icon">
            <Star size={18} strokeWidth={1.6} />
          </span>
          <strong>评价手账</strong>
          <em>团购体验与地点短评</em>
        </motion.button>
      </motion.div>

      <motion.div className="mt-5" variants={item}>
        <div className="market-section-head">
          <span>订单票根</span>
          <em className="mk-num">{orders.length}</em>
        </div>
        <FilterChips value={filter} onChange={setFilter} />
      </motion.div>

      <motion.div className="mt-3 flex flex-col gap-3" variants={item}>
        <AnimatedPresenceList filterKey={filter}>
          {orders.length ? (
            orders.map((o, i) => (
              <TicketStubCard key={o.id} order={o} index={i} onClick={() => onOpenOrder(o.id)} />
            ))
          ) : (
            <div className="market-empty market-empty--soft">这个分类还没有订单</div>
          )}
        </AnimatedPresenceList>
      </motion.div>
    </motion.div>
  )
}
