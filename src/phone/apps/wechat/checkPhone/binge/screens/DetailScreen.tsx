import { useEffect, useState } from 'react'
import { ChevronRight, Heart, MessageCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import type { BingeItem } from '../types'
import { MEDIA_KIND_LABEL, formatTotalDuration } from '../types'
import { TypeBadge } from '../components/TypeBadge'

export function DetailScreen({
  item,
  onToggleFavorite,
  onOpenForum,
}: {
  item: BingeItem
  onToggleFavorite: () => void
  onOpenForum?: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [barReady, setBarReady] = useState(false)
  const long = item.synopsis.length > 90
  const pct = Math.round(Math.max(0, Math.min(1, item.progress)) * 100)

  useEffect(() => {
    setBarReady(false)
    const t = window.setTimeout(() => setBarReady(true), 40)
    return () => window.clearTimeout(t)
  }, [item.id])

  return (
    <div className="px-4 pb-12 pt-1">
      <div className="binge-detail-hero">
        <div className="binge-detail-hero-wash" style={{ background: item.posterTone }} />
        <div className="binge-detail-hero-body">
          <div className="binge-detail-poster" style={{ background: item.posterTone }}>
            <div className="binge-poster-caption">{item.posterCaption || item.title.slice(0, 8)}</div>
            <TypeBadge kind={item.kind} />
          </div>
          <div className="min-w-0 flex-1 pt-1">
            <h1 className="binge-detail-title">{item.title}</h1>
            <span className="binge-kind-pill">{MEDIA_KIND_LABEL[item.kind]}</span>
            {item.creators ? <p className="binge-detail-creators">{item.creators}</p> : null}
            <button
              type="button"
              aria-label={item.favorited ? '取消收藏' : '收藏'}
              className="binge-fav-btn"
              onClick={onToggleFavorite}
            >
              <motion.span
                key={item.favorited ? 'on' : 'off'}
                initial={{ scale: 1 }}
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ duration: 0.15 }}
                className="inline-flex"
              >
                <Heart
                  size={18}
                  strokeWidth={1.7}
                  fill={item.favorited ? '#6B5A78' : 'transparent'}
                  color={item.favorited ? '#6B5A78' : '#8b8b8f'}
                />
              </motion.span>
            </button>
          </div>
        </div>
      </div>

      <div className="binge-progress-panel">
        <div className="binge-progress-panel-top">
          <div>
            <div className="text-[11px]" style={{ color: '#8b8b8f' }}>
              观看进度
            </div>
            <div className="binge-num mt-1 text-[15px] font-semibold">{item.progressLabel}</div>
          </div>
          <div className="binge-num text-[22px] font-semibold" style={{ color: '#6B5A78' }}>
            {pct}
            <span className="ml-0.5 text-[12px] font-medium">%</span>
          </div>
        </div>
        <div className="binge-detail-progress mt-3">
          <motion.span
            initial={{ scaleX: 0 }}
            animate={{ scaleX: barReady ? item.progress : 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            style={{ width: '100%' }}
          />
        </div>
      </div>

      <div className="binge-stat-grid mt-3">
        <div className="binge-stat-cell">
          <small>状态</small>
          <strong>{item.status}</strong>
        </div>
        <div className="binge-stat-cell">
          <small>累计时长</small>
          <strong className="binge-num">{formatTotalDuration(item.totalMinutes)}</strong>
        </div>
        <div className="binge-stat-cell" style={{ gridColumn: '1 / -1' }}>
          <small>最近观看</small>
          <strong>{item.lastWatchedLabel}</strong>
        </div>
      </div>

      <div className="binge-section-label">
        <span>简介</span>
      </div>
      <p
        className="binge-synopsis"
        style={{
          display: '-webkit-box',
          WebkitLineClamp: expanded || !long ? undefined : 4,
          WebkitBoxOrient: 'vertical',
          overflow: expanded || !long ? 'visible' : 'hidden',
        }}
      >
        {item.synopsis}
      </p>
      {long ? (
        <button type="button" className="binge-more-btn" onClick={() => setExpanded((v) => !v)}>
          {expanded ? '收起' : '展开更多'}
        </button>
      ) : null}

      {item.comment ? (
        <>
          <div className="binge-section-label">
            <span>我的评论</span>
          </div>
          <div className="binge-comment-card">
            <div className="binge-quote">
              <div className="binge-quote-bar" />
              <div className="min-w-0 flex-1">
                <p className="text-[14px] leading-relaxed" style={{ color: '#101012' }}>
                  {item.comment.text}
                </p>
                <div className="binge-num mt-2 text-[11px]" style={{ color: '#8b8b8f' }}>
                  {item.comment.atLabel}
                  {item.comment.likes != null ? ` · ${item.comment.likes} 赞` : ''}
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}

      {item.forumId && onOpenForum ? (
        <button type="button" className="binge-forum-cta" onClick={onOpenForum}>
          <div className="min-w-0 flex-1">
            <strong>进入讨论组</strong>
            <span>看看同好怎么聊这部作品</span>
          </div>
          <MessageCircle size={18} strokeWidth={1.6} aria-hidden />
          <ChevronRight size={16} strokeWidth={1.8} aria-hidden />
        </button>
      ) : null}
    </div>
  )
}
