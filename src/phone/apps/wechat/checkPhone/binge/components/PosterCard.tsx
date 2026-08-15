import { motion } from 'framer-motion'
import type { BingeItem } from '../types'
import { ProgressRing } from './TypeBadge'
import { TypeBadge } from './TypeBadge'

const EASE = [0.22, 1, 0.36, 1] as const

export function PosterCard({
  item,
  onClick,
  compact,
  index = 0,
}: {
  item: BingeItem
  onClick?: () => void
  compact?: boolean
  index?: number
}) {
  const pct = Math.round(Math.max(0, Math.min(1, item.progress)) * 100)
  return (
    <motion.button
      type="button"
      className={`binge-poster-card ${compact ? 'binge-continue-card' : ''}`}
      onClick={onClick}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, delay: Math.min(index, 12) * 0.03, ease: EASE }}
      whileTap={{ scale: 0.96 }}
    >
      <motion.div
        className="binge-poster-cover"
        style={{ background: item.posterTone }}
        whileTap={{ scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      >
        <div className="binge-poster-veil" aria-hidden />
        <div className="binge-poster-caption">{item.posterCaption || item.title.slice(0, 8)}</div>
        <ProgressRing progress={item.progress} />
        <TypeBadge kind={item.kind} />
        {compact ? (
          <div className="binge-poster-progress-foot">
            <span className="binge-poster-progress-track">
              <span style={{ width: `${Math.max(6, pct)}%` }} />
            </span>
            <em className="binge-num">{pct}%</em>
          </div>
        ) : null}
      </motion.div>
      <div className="min-w-0 binge-poster-meta">
        <div className="binge-poster-title">{item.title}</div>
        <div className="binge-poster-sub binge-num">{item.progressLabel}</div>
      </div>
    </motion.button>
  )
}

export function PosterWall({
  items,
  onOpen,
}: {
  items: BingeItem[]
  onOpen: (id: string) => void
}) {
  if (!items.length) {
    return <div className="binge-empty binge-empty--soft">暂无内容</div>
  }
  return (
    <div className="binge-poster-wall">
      {items.map((item, i) => (
        <PosterCard key={item.id} item={item} index={i} onClick={() => onOpen(item.id)} />
      ))}
    </div>
  )
}
