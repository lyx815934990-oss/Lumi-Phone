import { CalendarDays, MapPin, Ticket } from 'lucide-react'
import { motion } from 'framer-motion'
import type { MarketOrder, OrderStatus } from '../types'
import { MARKET_KIND_LABEL, ORDER_STATUS_LABEL, formatYuan } from '../types'
import { KindPill, StarRating } from '../components/TicketBits'

const EASE = [0.22, 1, 0.36, 1] as const

function statusTone(status: OrderStatus): { fg: string; bg: string; border: string } {
  switch (status) {
    case 'pending':
      return { fg: '#3C8C86', bg: 'rgba(60,140,134,0.12)', border: 'rgba(60,140,134,0.35)' }
    case 'confirmed':
      return { fg: '#3C8C86', bg: 'rgba(60,140,134,0.08)', border: 'rgba(60,140,134,0.22)' }
    case 'redeemed':
    case 'done':
      return { fg: '#5a5a5e', bg: 'rgba(16,16,18,0.04)', border: 'rgba(16,16,18,0.08)' }
    case 'expired':
    case 'refunded':
      return { fg: '#9a6a4a', bg: 'rgba(154,106,74,0.1)', border: 'rgba(154,106,74,0.22)' }
    default:
      return { fg: '#8b8b8f', bg: 'rgba(139,139,143,0.08)', border: 'rgba(139,139,143,0.2)' }
  }
}

function pickRow(rows: Array<{ label: string; value: string }>, ...keys: string[]) {
  for (const k of keys) {
    const hit = rows.find((r) => r.label.includes(k))
    if (hit?.value?.trim()) return hit
  }
  return null
}

export function DetailScreen({ order }: { order: MarketOrder }) {
  const rows = [...order.infoRows]
  if (order.couponCodeMasked && !rows.some((r) => r.label.includes('券'))) {
    rows.push({ label: '券码', value: order.couponCodeMasked })
  }

  const tone = statusTone(order.status)
  const place = pickRow(rows, '地址', '门店', '位置', '酒店', '餐厅')
  const whenHit = pickRow(rows, '时间', '入住', '入住日', '入住日期', '入场', '有效')
  const when = whenHit || { label: '日期', value: order.dateLine }
  const restRows = rows.filter((r) => r !== place && r !== whenHit)

  return (
    <motion.div
      className="market-detail pb-14 pt-1"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.36, ease: EASE }}
    >
      <motion.div
        className="market-detail-ticket"
        initial={{ opacity: 0, y: 14, rotate: -0.4 }}
        animate={{ opacity: 1, y: 0, rotate: 0 }}
        transition={{ duration: 0.42, ease: EASE }}
      >
        {/* —— 票面主区 —— */}
        <div className="market-detail-face">
          <div className="market-detail-hero" style={{ background: order.coverTone }}>
            <div className="market-detail-hero-veil" />
            <div className="market-detail-hero-top">
              <KindPill kind={order.kind} />
              <motion.span
                className="market-detail-status"
                style={{ color: tone.fg, background: tone.bg, borderColor: tone.border }}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.12, type: 'spring', stiffness: 360, damping: 22 }}
              >
                {ORDER_STATUS_LABEL[order.status]}
              </motion.span>
            </div>
            <div className="market-detail-hero-caption">
              {order.coverCaption || MARKET_KIND_LABEL[order.kind]}
            </div>
            <div className="market-detail-hero-watermark" aria-hidden>
              TICKET
            </div>
          </div>

          <div className="market-detail-body">
            <p className="market-detail-kicker">Order · {order.id.slice(0, 8).toUpperCase()}</p>
            <h1 className="market-detail-title">{order.title}</h1>

            <div className="market-detail-amount-row">
              <div>
                <div className="market-detail-label">实付</div>
                <div className="market-detail-amount">
                  <span className="mk-num">¥{formatYuan(order.amountYuan)}</span>
                </div>
              </div>
              {order.rating != null ? (
                <div className="market-detail-rating">
                  <StarRating rating={order.rating} size={13} />
                </div>
              ) : null}
            </div>

            <div className="market-detail-meta">
              <div className="market-detail-meta-item">
                <CalendarDays size={14} strokeWidth={1.7} aria-hidden />
                <div>
                  <div className="market-detail-label">{when.label}</div>
                  <div className="market-detail-meta-value mk-num">{when.value}</div>
                </div>
              </div>
              {place ? (
                <div className="market-detail-meta-item">
                  <MapPin size={14} strokeWidth={1.7} aria-hidden />
                  <div>
                    <div className="market-detail-label">{place.label}</div>
                    <div className="market-detail-meta-value">{place.value}</div>
                  </div>
                </div>
              ) : null}
            </div>

            {restRows.length ? (
              <div className="market-detail-fields">
                {restRows.map((r, i) => (
                  <motion.div
                    key={`${r.label}-${r.value}`}
                    className="market-detail-field"
                    initial={{ opacity: 0, x: 6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.16 + i * 0.04, duration: 0.28, ease: EASE }}
                  >
                    <span>{r.label}</span>
                    <strong className="mk-num">{r.value}</strong>
                  </motion.div>
                ))}
              </div>
            ) : null}

            {order.couponCodeMasked ? (
              <motion.div
                className="market-detail-code"
                whileTap={{ scale: 0.985 }}
                transition={{ type: 'spring', stiffness: 400, damping: 28 }}
              >
                <Ticket size={14} strokeWidth={1.7} aria-hidden />
                <div className="min-w-0 flex-1">
                  <div className="market-detail-label">券码</div>
                  <div className="market-detail-code-value mk-num">{order.couponCodeMasked}</div>
                </div>
              </motion.div>
            ) : null}

            <div className="market-detail-ordered mk-num">下单 {order.orderedAtLabel}</div>
          </div>
        </div>

        {/* —— 撕票虚线 —— */}
        <div className="market-detail-perforation" aria-hidden>
          <span className="market-detail-notch left" />
          <span className="market-detail-dash" />
          <span className="market-detail-notch right" />
        </div>

        {/* —— 票根 / 示意码 —— */}
        <div className="market-detail-stub">
          <div className="market-detail-stub-copy">
            <div className="market-detail-label">核销示意</div>
            <p className="market-detail-stub-note">仅供查阅 · 无法扫码使用</p>
          </div>
          <div className="market-qr-block market-qr-block--detail" aria-hidden />
        </div>
      </motion.div>

      {order.review ? (
        <motion.section
          className="market-detail-review"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18, duration: 0.34, ease: EASE }}
        >
          <div className="market-detail-review-head">
            <h2>我的评价</h2>
            <StarRating rating={order.review.rating} size={12} />
          </div>
          <p className="market-detail-review-text">{order.review.text}</p>
          {order.review.photoTones?.length ? (
            <div className="market-photo-row mt-3">
              {order.review.photoTones.slice(0, 4).map((photoTone, i) => (
                <motion.div
                  key={i}
                  className="market-photo market-photo--lg"
                  style={{ background: photoTone }}
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.22 + i * 0.05, duration: 0.28, ease: EASE }}
                />
              ))}
            </div>
          ) : null}
          <div className="mk-num mt-3 text-[11px]" style={{ color: '#8b8b8f' }}>
            {order.review.atLabel}
            {order.review.likes != null ? ` · ${order.review.likes} 赞` : ''}
          </div>
        </motion.section>
      ) : null}
    </motion.div>
  )
}
