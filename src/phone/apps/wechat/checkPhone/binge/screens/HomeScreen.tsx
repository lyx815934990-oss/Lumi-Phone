import {
  Clock3,
  Clapperboard,
  Heart,
  MessageCircle,
  NotebookPen,
  Search,
} from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import type { BingeDataset, BingeScreen, MediaFilter, MediaKind } from '../types'
import { MEDIA_KIND_LABEL, MEDIA_KINDS } from '../types'
import { FilterChips } from '../components/FilterChips'
import { PosterCard, PosterWall } from '../components/PosterCard'

const QUICK: Array<{
  id: Exclude<BingeScreen['kind'], 'home' | 'detail' | 'forum' | 'searchResults'>
  label: string
  hint: string
  Icon: typeof Clock3
}> = [
  { id: 'history', label: '观看轨迹', hint: '按日回溯', Icon: Clock3 },
  { id: 'favorites', label: '收藏架', hint: '想反复翻', Icon: Heart },
  { id: 'forums', label: '讨论组', hint: '剧粉闲聊', Icon: MessageCircle },
  { id: 'comments', label: '我的评论', hint: '短评手账', Icon: NotebookPen },
  { id: 'searches', label: '站内搜索', hint: '找过什么', Icon: Search },
]

const KIND_TONE: Record<MediaKind, string> = {
  series: '#6B5A78',
  movie: '#7a6570',
  novel: '#8a7a6a',
  comic: '#6a7a78',
  anime: '#5a6a78',
}

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

function useCountUp(target: number, durationMs = 700): number {
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

export function HomeScreen({
  data,
  characterName,
  onNavigate,
  onOpenItem,
}: {
  data: BingeDataset
  characterName?: string
  onNavigate: (screen: BingeScreen) => void
  onOpenItem: (id: string) => void
}) {
  const [filter, setFilter] = useState<MediaFilter>('all')
  const who = characterName?.trim() || 'TA'
  const hoursAnim = useCountUp(data.monthHours || 0, 720)

  const continueItems = useMemo(
    () => data.items.filter((x) => x.progress > 0 && x.progress < 0.98).slice(0, 8),
    [data.items],
  )

  const favCount = useMemo(() => data.items.filter((x) => x.favorited).length, [data.items])

  const wallItems = useMemo(() => {
    if (filter === 'all') return data.items
    return data.items.filter((x) => x.kind === filter)
  }, [data.items, filter])

  const shareParts = useMemo(() => {
    return MEDIA_KINDS.map((k) => ({
      kind: k as MediaKind,
      pct: Math.max(0, data.kindShare[k] || 0),
      color: KIND_TONE[k],
    })).filter((p) => p.pct > 0.01)
  }, [data.kindShare])

  return (
    <motion.div className="binge-home px-4 pb-12 pt-2" variants={stagger} initial="hidden" animate="show">
      <motion.header className="binge-reel-hero" variants={item}>
        <div className="binge-reel-hero-kicker">
          <Clapperboard size={12} strokeWidth={1.8} aria-hidden />
          Reel diary
        </div>
        <h1 className="binge-reel-hero-title">{who}的追剧手账</h1>
        <p className="binge-reel-hero-desc">剧 · 影 · 书 · 漫 · 番 · 只读偷看</p>

        <div className="binge-reel-hours">
          <div className="min-w-0">
            <div className="binge-reel-label">本月累计观看</div>
            <div className="binge-reel-amount">
              <span className="binge-num">{Math.round(hoursAnim * 10) / 10}</span>
              <small>小时</small>
            </div>
          </div>
          <div className="binge-reel-hours-side">
            <div className="binge-reel-pill">
              <span className="binge-num">{data.items.length}</span>
              <small>在追</small>
            </div>
            {continueItems.length ? (
              <div className="binge-reel-pill binge-reel-pill--hot">
                <Clock3 size={12} strokeWidth={1.8} aria-hidden />
                <span className="binge-num">{continueItems.length}</span>
                <small>续看</small>
              </div>
            ) : null}
            {favCount > 0 ? (
              <div className="binge-reel-pill">
                <Heart size={12} strokeWidth={1.8} aria-hidden />
                <span className="binge-num">{favCount}</span>
                <small>收藏</small>
              </div>
            ) : null}
          </div>
        </div>

        {shareParts.length ? (
          <div className="binge-share-bar binge-share-bar--hero" aria-hidden>
            {shareParts.map((p, i) => (
              <motion.span
                key={p.kind}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{
                  duration: 0.48,
                  delay: 0.12 + i * 0.05,
                  ease: [0.22, 1, 0.36, 1],
                }}
                style={{
                  width: `${Math.max(6, p.pct * 100)}%`,
                  background: p.color,
                  transformOrigin: 'left center',
                }}
                title={`${MEDIA_KIND_LABEL[p.kind]} ${Math.round(p.pct * 100)}%`}
              />
            ))}
          </div>
        ) : null}

        {shareParts.length ? (
          <div className="binge-reel-legend">
            {shareParts.map((p) => (
              <span key={p.kind}>
                <i style={{ background: p.color }} />
                {MEDIA_KIND_LABEL[p.kind]}
                <em className="binge-num">{Math.round(p.pct * 100)}%</em>
              </span>
            ))}
          </div>
        ) : null}
      </motion.header>

      <motion.div className="binge-quick-grid mt-4" variants={item}>
        {QUICK.map(({ id, label, hint, Icon }) => (
          <motion.button
            key={id}
            type="button"
            className="binge-quick-tile"
            onClick={() => onNavigate({ kind: id })}
            whileTap={{ scale: 0.97 }}
          >
            <span className="binge-quick-tile-icon">
              <Icon size={16} strokeWidth={1.6} />
            </span>
            <strong>{label}</strong>
            <em>{hint}</em>
          </motion.button>
        ))}
      </motion.div>

      {continueItems.length ? (
        <motion.section className="mt-5" variants={item}>
          <div className="binge-section-head">
            <span>继续观看</span>
            <em className="binge-num">{continueItems.length}</em>
          </div>
          <div className="binge-continue-row">
            {continueItems.map((row, i) => (
              <PosterCard key={row.id} item={row} compact index={i} onClick={() => onOpenItem(row.id)} />
            ))}
          </div>
        </motion.section>
      ) : null}

      <motion.section className="mt-5" variants={item}>
        <div className="binge-section-head">
          <span>片单墙</span>
          <em className="binge-num">{wallItems.length}</em>
        </div>
        <FilterChips value={filter} onChange={setFilter} />
        <div className="mt-3">
          <AnimatePresence mode="wait">
            <motion.div
              key={filter}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            >
              <PosterWall items={wallItems} onOpen={onOpenItem} />
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.section>
    </motion.div>
  )
}
