import { AnimatePresence, motion } from 'framer-motion'
import { Layers, Search, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { DATING_STORY_COACH_TARGET_ATTR } from '../../../phone/apps/wechat/dating/datingStoryLayoutCoach'
import {
  filterStoryFloorEntries,
  type StoryFloorEntry,
} from '../../utils/storyFloorEntries'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  entries: StoryFloorEntry[]
  totalAiFloors: number
  visibleTailCount: number
  activePlotId?: string | null
  onJump: (plotId: string) => void
  onAdjustTail?: (count: number) => void
  themeStyle?: CSSProperties
}

const spring = { type: 'spring' as const, stiffness: 380, damping: 34 }

export function StoryFloorDrawer({
  open,
  onOpenChange,
  entries,
  totalAiFloors,
  visibleTailCount,
  activePlotId,
  onJump,
  onAdjustTail,
  themeStyle,
}: Props) {
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (!open) {
      setQuery('')
      return
    }
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false)
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      document.removeEventListener('keydown', onKey)
    }
  }, [onOpenChange, open])

  const filtered = useMemo(() => filterStoryFloorEntries(entries, query), [entries, query])
  const hasQuery = query.trim().length > 0

  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            aria-label="关闭楼层目录"
            className="story-rpg-root fixed inset-0 z-[240] bg-black/35"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => onOpenChange(false)}
          />
          <motion.aside
            className="story-rpg-root fixed inset-y-0 left-0 z-[241] flex w-[min(88vw,320px)] flex-col border-r border-[var(--sr-border)] shadow-[8px_0_32px_rgba(0,0,0,0.18)]"
            style={{
              ...themeStyle,
              background: 'var(--sr-panel-elevated)',
              color: 'var(--sr-text)',
              paddingTop: 'env(safe-area-inset-top, 0px)',
              paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            }}
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={spring}
          >
            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[var(--sr-border)] px-4 py-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Layers className="size-4 text-[var(--sr-gold)]" strokeWidth={1.75} />
                  <h2 className="font-[family-name:var(--sr-font-serif)] text-[16px] font-semibold text-[var(--sr-text)]">
                    楼层目录
                  </h2>
                </div>
                <p className="mt-0.5 text-[11px] text-[var(--sr-text-muted)]">
                  共 {totalAiFloors} 层 AI 剧情 · 当前显示最近 {visibleTailCount} 段
                </p>
              </div>
              <button
                type="button"
                aria-label="关闭"
                onClick={() => onOpenChange(false)}
                className="flex size-8 shrink-0 items-center justify-center rounded-full border border-[var(--sr-border)] text-[var(--sr-text-muted)] hover:text-[var(--sr-text)]"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="shrink-0 border-b border-[var(--sr-border)] px-4 py-3">
              <label className="relative block">
                <Search
                  className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[var(--sr-text-faint)]"
                  strokeWidth={1.75}
                  aria-hidden
                />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="搜索摘要、时间、正文关键词…"
                  className="h-9 w-full rounded-xl border border-[var(--sr-border)] bg-[var(--sr-panel)] py-2 pl-8 pr-8 text-[13px] text-[var(--sr-text)] outline-none placeholder:text-[var(--sr-text-faint)] focus:border-[var(--sr-gold)]/45"
                  autoComplete="off"
                  enterKeyHint="search"
                />
                {hasQuery ? (
                  <button
                    type="button"
                    aria-label="清空搜索"
                    onClick={() => setQuery('')}
                    className="absolute right-2 top-1/2 flex size-5 -translate-y-1/2 items-center justify-center rounded-full text-[var(--sr-text-muted)] hover:bg-[var(--sr-glass-strong)] hover:text-[var(--sr-text)]"
                  >
                    <X className="size-3.5" />
                  </button>
                ) : null}
              </label>
              {hasQuery ? (
                <p className="mt-1.5 text-[10px] text-[var(--sr-text-muted)]">
                  命中 {filtered.length} / {entries.length} 段
                </p>
              ) : null}
            </div>

            {onAdjustTail && totalAiFloors > 3 && !hasQuery ? (
              <div className="shrink-0 border-b border-[var(--sr-border)] px-4 py-3">
                <label className="block text-[11px] text-[var(--sr-text-muted)]">
                  显示最近段数（{visibleTailCount}）
                </label>
                <input
                  type="range"
                  min={3}
                  max={Math.min(80, entries.length || 3)}
                  value={visibleTailCount}
                  onChange={(e) => onAdjustTail(Number(e.target.value))}
                  className="mt-2 w-full accent-[var(--sr-gold)]"
                />
              </div>
            ) : null}

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-2">
              {entries.length === 0 ? (
                <p className="px-2 py-8 text-center text-[13px] text-[var(--sr-text-faint)]">暂无剧情</p>
              ) : filtered.length === 0 ? (
                <p className="px-2 py-8 text-center text-[13px] text-[var(--sr-text-faint)]">
                  未找到含「{query.trim()}」的楼层
                </p>
              ) : (
                <ul className="space-y-1">
                  {[...filtered].reverse().map((entry) => {
                    const active = activePlotId === entry.plotId
                    return (
                      <li key={entry.plotId}>
                        <button
                          type="button"
                          onClick={() => onJump(entry.plotId)}
                          className={`w-full rounded-xl border px-3 py-2.5 text-left transition ${
                            active
                              ? 'border-[var(--sr-gold)]/45 bg-[var(--sr-gold)]/12'
                              : 'border-transparent bg-[var(--sr-panel)] hover:border-[var(--sr-border)] hover:bg-[var(--sr-glass-strong)]'
                          }`}
                        >
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="shrink-0 font-mono text-[11px] font-semibold text-[var(--sr-gold)]">
                              {entry.floor != null ? `#${entry.floor}` : '玩家'}
                            </span>
                            <span className="truncate font-mono text-[10px] text-[var(--sr-text-faint)]">
                              {entry.generatedAtCompact}
                            </span>
                          </div>
                          <p className="mt-1 line-clamp-2 text-[13px] leading-snug text-[var(--sr-text)]">
                            {entry.hasStoredSummary ? (
                              <span className="mr-1 text-[10px] font-medium text-[var(--sr-gold-dim)]">
                                摘要
                              </span>
                            ) : null}
                            {entry.title}
                          </p>
                          {entry.storyTimeLabel ? (
                            <p className="mt-1 truncate text-[10px] text-[var(--sr-text-muted)]">
                              剧情 {entry.storyTimeLabel}
                            </p>
                          ) : null}
                          <p className="mt-0.5 truncate text-[10px] text-[var(--sr-text-faint)]">
                            生成 {entry.generatedAtLabel}
                          </p>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>,
    document.body,
  )
}

/** 左侧常驻入口：点开楼层目录（可纵向拖动，位置本地记忆） */
const FLOOR_RAIL_POS_KEY = 'story-rpg-floor-rail-top-px'
const FLOOR_RAIL_DRAG_THRESHOLD = 6

function readFloorRailTopPx(): number | null {
  try {
    const raw = localStorage.getItem(FLOOR_RAIL_POS_KEY)
    if (raw == null) return null
    const n = Number(raw)
    return Number.isFinite(n) ? n : null
  } catch {
    return null
  }
}

function clampFloorRailTop(top: number): number {
  if (typeof window === 'undefined') return top
  const min = 72
  const max = Math.max(min, window.innerHeight - 120)
  return Math.min(max, Math.max(min, top))
}

export function StoryFloorRailButton({ onClick }: { onClick: () => void }) {
  const [topPx, setTopPx] = useState(() => clampFloorRailTop(readFloorRailTopPx() ?? 132))
  const dragRef = useRef<{
    pointerId: number
    startY: number
    originTop: number
    moved: boolean
  } | null>(null)

  useEffect(() => {
    const onResize = () => setTopPx((t) => clampFloorRailTop(t))
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  return (
    <button
      type="button"
      onClick={(e) => {
        if (dragRef.current?.moved) {
          e.preventDefault()
          return
        }
        onClick()
      }}
      onPointerDown={(e) => {
        if (e.button !== 0) return
        dragRef.current = {
          pointerId: e.pointerId,
          startY: e.clientY,
          originTop: topPx,
          moved: false,
        }
        e.currentTarget.setPointerCapture(e.pointerId)
      }}
      onPointerMove={(e) => {
        const drag = dragRef.current
        if (!drag || drag.pointerId !== e.pointerId) return
        const dy = e.clientY - drag.startY
        if (Math.abs(dy) > FLOOR_RAIL_DRAG_THRESHOLD) drag.moved = true
        if (!drag.moved) return
        setTopPx(clampFloorRailTop(drag.originTop + dy))
      }}
      onPointerUp={(e) => {
        const drag = dragRef.current
        if (!drag || drag.pointerId !== e.pointerId) return
        try {
          e.currentTarget.releasePointerCapture(e.pointerId)
        } catch {
          /* ignore */
        }
        if (drag.moved) {
          const next = clampFloorRailTop(drag.originTop + (e.clientY - drag.startY))
          setTopPx(next)
          try {
            localStorage.setItem(FLOOR_RAIL_POS_KEY, String(Math.round(next)))
          } catch {
            /* ignore */
          }
        }
        // 延后清零，避免同一次手势触发 click
        window.setTimeout(() => {
          dragRef.current = null
        }, 0)
      }}
      onPointerCancel={() => {
        dragRef.current = null
      }}
      style={{ top: topPx }}
      className="fixed left-0 z-[90] flex touch-none flex-col items-center rounded-r-xl border border-l-0 border-[var(--sr-border)] bg-[var(--sr-panel-elevated)]/95 px-1 py-2.5 text-[10px] font-medium tracking-[0.12em] text-[var(--sr-text-soft)] shadow-md backdrop-blur-sm transition-[border-color,color] hover:border-[var(--sr-gold)]/35 hover:text-[var(--sr-gold)] active:cursor-grabbing"
      aria-label="打开楼层目录（可上下拖动）"
      title="点击打开 · 按住上下拖动"
      {...{ [DATING_STORY_COACH_TARGET_ATTR]: 'sr-floor' }}
    >
      <Layers className="mb-0.5 size-3.5" strokeWidth={1.75} />
      楼层
    </button>
  )
}
