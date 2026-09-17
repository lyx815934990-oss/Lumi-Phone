import { AnimatePresence, motion } from 'framer-motion'
import { BookOpen, X } from 'lucide-react'
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import {
  clampDatingMaxContextTokens,
  clampDatingPlotSummaryInjectRounds,
  DATING_AI_DEFAULT_CONTEXT_TOKENS,
  DATING_AI_MAX_CONTEXT_TOKENS,
  DATING_AI_MIN_CONTEXT_TOKENS,
  DATING_PLOT_SUMMARY_INJECT_ROUNDS_DEFAULT,
  DATING_PLOT_SUMMARY_INJECT_ROUNDS_MAX,
  DATING_PLOT_SUMMARY_INJECT_ROUNDS_MIN,
  normalizeDatingPlotContextInjectMode,
  type DatingPlotContextInjectMode,
} from '../../../phone/apps/wechat/dating/types'

const RAIL_POS_KEY = 'dating-plot-inject-rail-top-px'
const RAIL_VISIBLE_KEY = 'dating-plot-inject-rail-visible'
const DRAG_THRESHOLD = 6

const spring = { type: 'spring' as const, stiffness: 380, damping: 34 }

export function loadPlotInjectRailVisible(): boolean {
  try {
    return localStorage.getItem(RAIL_VISIBLE_KEY) === '1'
  } catch {
    return false
  }
}

export function savePlotInjectRailVisible(on: boolean) {
  try {
    localStorage.setItem(RAIL_VISIBLE_KEY, on ? '1' : '0')
  } catch {
    /* ignore */
  }
}

function readRailTopPx(): number | null {
  try {
    const raw = localStorage.getItem(RAIL_POS_KEY)
    if (raw == null) return null
    const n = Number(raw)
    return Number.isFinite(n) ? n : null
  } catch {
    return null
  }
}

function clampRailTop(top: number): number {
  if (typeof window === 'undefined') return top
  const min = 72
  const max = Math.max(min, window.innerHeight - 120)
  return Math.min(max, Math.max(min, top))
}

type QuickPanelProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: DatingPlotContextInjectMode
  summaryRounds: number
  maxContextTokens: number
  onModeChange: (mode: DatingPlotContextInjectMode) => void
  onSummaryRoundsChange: (n: number) => void
  onMaxContextTokensChange: (n: number) => void
  themeStyle?: CSSProperties
  /** 与浮层按钮对齐的 top，便于面板出现在旁边 */
  anchorTopPx: number
}

function PlotInjectQuickPanel({
  open,
  onOpenChange,
  mode,
  summaryRounds,
  maxContextTokens,
  onModeChange,
  onSummaryRoundsChange,
  onMaxContextTokensChange,
  themeStyle,
  anchorTopPx,
}: QuickPanelProps) {
  const normalized = normalizeDatingPlotContextInjectMode(mode)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onOpenChange, open])

  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            aria-label="关闭近端注入快捷设置"
            className="story-rpg-root fixed inset-0 z-[240] bg-black/25"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => onOpenChange(false)}
          />
          <motion.div
            role="dialog"
            aria-label="近端剧情注入"
            className="story-rpg-root fixed left-3 z-[241] w-[min(86vw,300px)] overflow-hidden rounded-2xl border border-[var(--sr-border)] shadow-[0_12px_40px_rgba(0,0,0,0.18)]"
            style={{
              ...themeStyle,
              top: clampRailTop(anchorTopPx),
              background: 'var(--sr-panel-elevated)',
              color: 'var(--sr-text)',
            }}
            initial={{ opacity: 0, x: -12, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -8, scale: 0.98 }}
            transition={spring}
          >
            <div className="flex items-center justify-between gap-2 border-b border-[var(--sr-border)] px-3.5 py-2.5">
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-[var(--sr-text)]">近端剧情注入</p>
                <p className="mt-0.5 text-[10px] text-[var(--sr-text-muted)]">快捷切换 · 下一轮生效</p>
              </div>
              <button
                type="button"
                aria-label="关闭"
                onClick={() => onOpenChange(false)}
                className="flex size-8 shrink-0 items-center justify-center rounded-full border border-[var(--sr-border)] text-[var(--sr-text-muted)]"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="space-y-3 px-3.5 py-3">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onModeChange('full_text')}
                  className={`rounded-lg border px-2.5 py-1.5 text-[12px] ${
                    normalized === 'full_text'
                      ? 'border-[var(--sr-gold)]/50 bg-[var(--sr-gold)]/15 text-[var(--sr-text)]'
                      : 'border-[var(--sr-border)] bg-[var(--sr-panel)] text-[var(--sr-text-muted)]'
                  }`}
                >
                  上下文原文
                </button>
                <button
                  type="button"
                  onClick={() => onModeChange('summary')}
                  className={`rounded-lg border px-2.5 py-1.5 text-[12px] ${
                    normalized === 'summary'
                      ? 'border-[var(--sr-gold)]/50 bg-[var(--sr-gold)]/15 text-[var(--sr-text)]'
                      : 'border-[var(--sr-border)] bg-[var(--sr-panel)] text-[var(--sr-text-muted)]'
                  }`}
                >
                  近端摘要
                </button>
              </div>
              {normalized === 'summary' ? (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] text-[var(--sr-text-muted)]">摘要轮数</p>
                    <span className="font-mono text-[12px] tabular-nums text-[var(--sr-text)]">
                      {clampDatingPlotSummaryInjectRounds(summaryRounds)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={DATING_PLOT_SUMMARY_INJECT_ROUNDS_MIN}
                    max={DATING_PLOT_SUMMARY_INJECT_ROUNDS_MAX}
                    step={1}
                    value={clampDatingPlotSummaryInjectRounds(summaryRounds)}
                    onChange={(e) =>
                      onSummaryRoundsChange(clampDatingPlotSummaryInjectRounds(Number(e.target.value)))
                    }
                    className="w-full accent-[var(--sr-gold)]"
                    aria-label="近端摘要轮数"
                  />
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] text-[var(--sr-text-muted)]">最大上下文</p>
                    <span className="font-mono text-[12px] tabular-nums text-[var(--sr-text)]">
                      {clampDatingMaxContextTokens(maxContextTokens).toLocaleString()}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={DATING_AI_MIN_CONTEXT_TOKENS}
                    max={DATING_AI_MAX_CONTEXT_TOKENS}
                    step={1000}
                    value={clampDatingMaxContextTokens(maxContextTokens)}
                    onChange={(e) =>
                      onMaxContextTokensChange(clampDatingMaxContextTokens(Number(e.target.value)))
                    }
                    className="w-full accent-[var(--sr-gold)]"
                    aria-label="最大上下文 Token"
                  />
                </>
              )}
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>,
    document.body,
  )
}

type RailProps = {
  mode: DatingPlotContextInjectMode
  summaryRounds: number
  maxContextTokens: number
  onModeChange: (mode: DatingPlotContextInjectMode) => void
  onSummaryRoundsChange: (n: number) => void
  onMaxContextTokensChange: (n: number) => void
  themeStyle?: CSSProperties
}

/** 左侧常驻：近端注入快捷浮层（可纵向拖动，位置本地记忆） */
export function PlotInjectRail({
  mode,
  summaryRounds,
  maxContextTokens,
  onModeChange,
  onSummaryRoundsChange,
  onMaxContextTokensChange,
  themeStyle,
}: RailProps) {
  const [topPx, setTopPx] = useState(() => clampRailTop(readRailTopPx() ?? 220))
  const [panelOpen, setPanelOpen] = useState(false)
  const dragRef = useRef<{
    pointerId: number
    startY: number
    originTop: number
    moved: boolean
  } | null>(null)

  const normalized = normalizeDatingPlotContextInjectMode(mode)
  const shortLabel = normalized === 'summary' ? '摘要' : '原文'
  const rounds =
    normalized === 'summary'
      ? clampDatingPlotSummaryInjectRounds(
          Number(summaryRounds) || DATING_PLOT_SUMMARY_INJECT_ROUNDS_DEFAULT,
        )
      : null

  useEffect(() => {
    const onResize = () => setTopPx((t) => clampRailTop(t))
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          if (dragRef.current?.moved) {
            e.preventDefault()
            return
          }
          setPanelOpen(true)
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
          if (Math.abs(dy) > DRAG_THRESHOLD) drag.moved = true
          if (!drag.moved) return
          setTopPx(clampRailTop(drag.originTop + dy))
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
            const next = clampRailTop(drag.originTop + (e.clientY - drag.startY))
            setTopPx(next)
            try {
              localStorage.setItem(RAIL_POS_KEY, String(Math.round(next)))
            } catch {
              /* ignore */
            }
          }
          window.setTimeout(() => {
            dragRef.current = null
          }, 0)
        }}
        onPointerCancel={() => {
          dragRef.current = null
        }}
        style={{ top: topPx }}
        className="fixed left-0 z-[90] flex touch-none flex-col items-center rounded-r-xl border border-l-0 border-[var(--sr-border)] bg-[var(--sr-panel-elevated)]/95 px-1 py-2.5 text-[10px] font-medium tracking-[0.08em] text-[var(--sr-text-soft)] shadow-md backdrop-blur-sm transition-[border-color,color] hover:border-[var(--sr-gold)]/35 hover:text-[var(--sr-gold)] active:cursor-grabbing"
        aria-label="打开近端剧情注入快捷设置（可上下拖动）"
        title="点击设置 · 按住上下拖动"
      >
        <BookOpen className="mb-0.5 size-3.5" strokeWidth={1.75} />
        <span>注入</span>
        <span className="mt-0.5 max-w-[2.5rem] truncate text-[9px] text-[var(--sr-gold-dim)]">
          {shortLabel}
          {rounds != null ? `·${rounds}` : ''}
        </span>
      </button>
      <PlotInjectQuickPanel
        open={panelOpen}
        onOpenChange={setPanelOpen}
        mode={mode}
        summaryRounds={
          Number(summaryRounds) || DATING_PLOT_SUMMARY_INJECT_ROUNDS_DEFAULT
        }
        maxContextTokens={Number(maxContextTokens) || DATING_AI_DEFAULT_CONTEXT_TOKENS}
        onModeChange={onModeChange}
        onSummaryRoundsChange={onSummaryRoundsChange}
        onMaxContextTokensChange={onMaxContextTokensChange}
        themeStyle={themeStyle}
        anchorTopPx={topPx}
      />
    </>
  )
}
