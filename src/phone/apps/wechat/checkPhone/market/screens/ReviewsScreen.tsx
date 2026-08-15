import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronRight, Heart, MapPin, NotebookPen, ShoppingBag } from 'lucide-react'
import type { MarketDataset, PlaceReview } from '../types'
import { StarRating } from '../components/TicketBits'

function avgRating(rows: PlaceReview[]): number | null {
  if (!rows.length) return null
  const sum = rows.reduce((a, r) => a + (Number(r.rating) || 0), 0)
  return Math.round((sum / rows.length) * 10) / 10
}

function ReviewCard({
  review,
  onOpenOrder,
}: {
  review: PlaceReview
  onOpenOrder: (id: string) => void
}) {
  const isExp = review.kind === 'experience'
  const tones = review.photoTones ?? []

  return (
    <article className="market-review-card">
      <div className="market-review-card-accent" data-kind={review.kind} />
      <div className="market-review-card-inner">
        <div className="market-review-card-top">
          <div className="min-w-0 flex-1">
            <div className="market-review-badge">
              {isExp ? (
                <>
                  <ShoppingBag size={11} strokeWidth={1.8} aria-hidden />
                  团购体验
                </>
              ) : (
                <>
                  <MapPin size={11} strokeWidth={1.8} aria-hidden />
                  地点手账
                </>
              )}
            </div>
            <h3 className="market-review-place">{review.placeName}</h3>
          </div>
          <StarRating rating={review.rating} size={12} />
        </div>

        <p className="market-review-text">{review.text}</p>

        {tones.length ? (
          <div className="market-photo-row mt-3">
            {tones.slice(0, 4).map((tone, i) => (
              <div key={i} className="market-photo market-photo--lg" style={{ background: tone }} />
            ))}
            {tones.length > 4 ? (
              <div className="market-photo market-photo--lg market-photo--more">+{tones.length - 4}</div>
            ) : null}
          </div>
        ) : null}

        <div className="market-review-foot">
          <span className="mk-num">{review.atLabel}</span>
          <div className="market-review-foot-right">
            {review.likes != null && review.likes > 0 ? (
              <span className="market-review-likes">
                <Heart size={11} strokeWidth={1.8} aria-hidden />
                <span className="mk-num">{review.likes}</span>
              </span>
            ) : null}
            {isExp && review.orderId ? (
              <button
                type="button"
                className="market-review-order-link"
                onClick={() => onOpenOrder(review.orderId!)}
              >
                看订单
                <ChevronRight size={13} strokeWidth={1.8} aria-hidden />
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  )
}

export function ReviewsScreen({
  data,
  onOpenOrder,
}: {
  data: MarketDataset
  onOpenOrder: (id: string) => void
}) {
  const [tab, setTab] = useState<'experience' | 'place'>('experience')

  const experienceRows = useMemo(
    () => data.reviews.filter((r) => r.kind === 'experience'),
    [data.reviews],
  )
  const placeRows = useMemo(() => data.reviews.filter((r) => r.kind === 'place'), [data.reviews])
  const rows = tab === 'experience' ? experienceRows : placeRows
  const avg = avgRating(rows)
  const total = data.reviews.length

  return (
    <div className="market-reviews px-4 pb-12 pt-1">
      <div className="market-reviews-hero">
        <div className="market-reviews-hero-kicker">
          <NotebookPen size={13} strokeWidth={1.7} aria-hidden />
          Review journal
        </div>
        <h1 className="market-reviews-hero-title">评价手账</h1>
        <p className="market-reviews-hero-desc">团购体验与地点短评 · 只读偷看</p>
        <div className="market-reviews-stats">
          <div className="market-reviews-stat">
            <div className="market-detail-label">全部</div>
            <div className="market-reviews-stat-value mk-num">{total}</div>
          </div>
          <div className="market-reviews-stat">
            <div className="market-detail-label">体验</div>
            <div className="market-reviews-stat-value mk-num">{experienceRows.length}</div>
          </div>
          <div className="market-reviews-stat">
            <div className="market-detail-label">地点</div>
            <div className="market-reviews-stat-value mk-num">{placeRows.length}</div>
          </div>
          <div className="market-reviews-stat">
            <div className="market-detail-label">均分</div>
            <div className="market-reviews-stat-value mk-num" style={{ color: '#3C8C86' }}>
              {avg != null ? avg.toFixed(1) : '—'}
            </div>
          </div>
        </div>
      </div>

      <div className="market-seg market-seg--pill mt-4">
        <button type="button" data-on={tab === 'experience' ? 'true' : 'false'} onClick={() => setTab('experience')}>
          团购体验
          <em className="mk-num">{experienceRows.length}</em>
        </button>
        <button type="button" data-on={tab === 'place' ? 'true' : 'false'} onClick={() => setTab('place')}>
          地点评价
          <em className="mk-num">{placeRows.length}</em>
        </button>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          className="mt-4 flex flex-col gap-3"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.16 }}
        >
          {!rows.length ? (
            <div className="market-empty market-empty--soft">
              {tab === 'experience' ? '还没有团购体验评价' : '还没有地点评价'}
            </div>
          ) : (
            rows.map((r) => <ReviewCard key={r.id} review={r} onOpenOrder={onOpenOrder} />)
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
