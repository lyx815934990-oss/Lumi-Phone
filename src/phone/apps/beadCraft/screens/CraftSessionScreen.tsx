import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, Minus, Plus, RotateCcw, Sparkles } from 'lucide-react'

import {
  countFilled,
  getCharBeadPersonality,
  getNextFillDelay,
  pickCharFillLine,
  pickNextCharCell,
} from '../charAutoFill'
import { selectActiveSession, useBeadCraftStore } from '../store'
import type { BeadCollectionItem } from '../types'
import { BeadGrid } from '../components/BeadGrid'

const GRID_SCALE_MIN = 0.6
const GRID_SCALE_MAX = 2.8
const GRID_SCALE_STEP = 0.2

function clampGridScale(value: number): number {
  return Math.min(GRID_SCALE_MAX, Math.max(GRID_SCALE_MIN, value))
}

function touchDistance(touches: { length: number; [index: number]: { clientX: number; clientY: number } }): number {
  if (touches.length < 2) return 0
  const dx = touches[0]!.clientX - touches[1]!.clientX
  const dy = touches[0]!.clientY - touches[1]!.clientY
  return Math.hypot(dx, dy)
}

export function CraftSessionScreen({
  onBack,
  onComplete,
}: {
  onBack: () => void
  onComplete: (item: BeadCollectionItem) => void
}) {
  const session = useBeadCraftStore(selectActiveSession)
  const fillCell = useBeadCraftStore((s) => s.fillCell)
  const tickActiveDuration = useBeadCraftStore((s) => s.tickActiveDuration)
  const completeSession = useBeadCraftStore((s) => s.completeSession)
  const abandonSession = useBeadCraftStore((s) => s.abandonSession)

  const [charBubble, setCharBubble] = useState('')
  const [justFilled, setJustFilled] = useState<number | null>(null)
  const [gridScale, setGridScale] = useState(1)
  const charTimerRef = useRef<number | null>(null)
  const tickRef = useRef<number | null>(null)
  const pinchRef = useRef<{ startDist: number; startScale: number } | null>(null)

  const bumpGridScale = useCallback((delta: number) => {
    setGridScale((s) => clampGridScale(Math.round((s + delta) * 10) / 10))
  }, [])

  const progress = session
    ? countFilled(session.pattern.cells, session.filled)
    : { done: 0, total: 0 }

  useEffect(() => {
    if (!session || session.status !== 'playing') return

    let cancelled = false

    const runCharFill = () => {
      if (cancelled) return
      const current = selectActiveSession(useBeadCraftStore.getState())
      if (!current || current.status !== 'playing') return

      const personality = getCharBeadPersonality(current.characterId)
      const cell = pickNextCharCell(current.pattern.cells, current.filled)
      if (cell !== null) {
        const ok = fillCell(cell, 'char')
        if (ok) {
          setJustFilled(cell)
          window.setTimeout(() => setJustFilled(null), 420)
          if (Math.random() < 0.22) {
            setCharBubble(pickCharFillLine())
            window.setTimeout(() => setCharBubble(''), 1800)
          }
          if (Math.random() < personality.burstChance) {
            for (let n = 0; n < personality.burstSize; n++) {
              const fresh = selectActiveSession(useBeadCraftStore.getState())
              if (!fresh) break
              const next = pickNextCharCell(fresh.pattern.cells, fresh.filled)
              if (next === null) break
              fillCell(next, 'char')
            }
          }
        }
      }

      charTimerRef.current = window.setTimeout(runCharFill, getNextFillDelay(personality))
    }

    charTimerRef.current = window.setTimeout(
      runCharFill,
      getNextFillDelay(getCharBeadPersonality(session.characterId)),
    )
    tickRef.current = window.setInterval(() => tickActiveDuration(), 1000)

    return () => {
      cancelled = true
      if (charTimerRef.current) window.clearTimeout(charTimerRef.current)
      if (tickRef.current) window.clearInterval(tickRef.current)
    }
  }, [fillCell, session?.id, session?.status, tickActiveDuration])

  useEffect(() => {
    if (!session || session.status !== 'playing') return
    if (progress.done >= progress.total && progress.total > 0) {
      const item = completeSession()
      if (item) onComplete(item)
    }
  }, [completeSession, onComplete, progress.done, progress.total, session])

  if (!session) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6 text-center text-[13px] text-[#9a8f8a]">
        <p>当前没有进行中的拼豆</p>
        <button type="button" onClick={onBack} className="mt-4 text-[#ff7b9c]">
          返回广场
        </button>
      </div>
    )
  }

  const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="bc-header flex shrink-0 items-center gap-2 border-b border-[#f0e4dc] bg-white/70 px-3 pb-2.5 backdrop-blur-md">
        <button type="button" onClick={onBack} className="flex size-9 items-center justify-center rounded-full bg-black/[0.04]">
          <ChevronLeft className="size-5" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold">{session.pattern.name}</p>
          <p className="text-[11px] text-[#9a8f8a]">与 {session.characterName} 一起拼豆</p>
        </div>
        <button
          type="button"
          onClick={() => {
            if (window.confirm('确定放弃这次拼豆吗？进度不会保存到收藏馆。')) {
              abandonSession()
              onBack()
            }
          }}
          className="text-[12px] text-[#9a8f8a]"
        >
          放弃
        </button>
      </header>

      <div className="shrink-0 px-4 py-3">
        <div className="mb-2 flex items-center justify-between text-[12px]">
          <span className="text-[#9a8f8a]">进度 {pct}%</span>
          <span className="text-[#b0a6a0]">
            我 {session.userBeadCount} · {session.characterName} {session.charBeadCount}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-[#f0e4dc]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#ff9ff3] to-[#ff7b9c] transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="mt-2 flex items-center justify-center gap-2">
          <button
            type="button"
            aria-label="缩小"
            onClick={() => bumpGridScale(-GRID_SCALE_STEP)}
            disabled={gridScale <= GRID_SCALE_MIN}
            className="flex size-8 items-center justify-center rounded-full bg-white/90 text-[#9a8f8a] shadow-sm disabled:opacity-40"
          >
            <Minus className="size-4" />
          </button>
          <span className="min-w-[3.2rem] text-center text-[11px] tabular-nums text-[#b0a6a0]">
            {Math.round(gridScale * 100)}%
          </span>
          <button
            type="button"
            aria-label="放大"
            onClick={() => bumpGridScale(GRID_SCALE_STEP)}
            disabled={gridScale >= GRID_SCALE_MAX}
            className="flex size-8 items-center justify-center rounded-full bg-white/90 text-[#9a8f8a] shadow-sm disabled:opacity-40"
          >
            <Plus className="size-4" />
          </button>
          <button
            type="button"
            aria-label="重置缩放"
            onClick={() => setGridScale(1)}
            className="flex size-8 items-center justify-center rounded-full bg-white/90 text-[#9a8f8a] shadow-sm"
          >
            <RotateCcw className="size-3.5" />
          </button>
        </div>
      </div>

      <div
        className="bc-grid-viewport relative flex min-h-0 flex-1 flex-col items-center justify-center overflow-auto px-4 py-2"
        onTouchStart={(e) => {
          if (e.touches.length === 2) {
            pinchRef.current = {
              startDist: touchDistance(e.touches),
              startScale: gridScale,
            }
          }
        }}
        onTouchMove={(e) => {
          const pinch = pinchRef.current
          if (!pinch || e.touches.length < 2) return
          const dist = touchDistance(e.touches)
          if (pinch.startDist <= 0 || dist <= 0) return
          e.preventDefault()
          setGridScale(clampGridScale(pinch.startScale * (dist / pinch.startDist)))
        }}
        onTouchEnd={() => {
          pinchRef.current = null
        }}
        onTouchCancel={() => {
          pinchRef.current = null
        }}
      >
        <div
          className="relative origin-center transition-transform duration-75"
          style={{ transform: `scale(${gridScale})` }}
        >
          <BeadGrid
            width={session.pattern.width}
            height={session.pattern.height}
            palette={session.pattern.palette}
            target={session.pattern.cells}
            filled={session.filled}
            owners={session.owners}
            onCellTap={(index) => {
              fillCell(index, 'user')
            }}
          />
          {charBubble ? (
            <div className="bc-char-bubble absolute -top-2 right-0 max-w-[140px] translate-x-1/4 rounded-2xl bg-white px-3 py-2 text-[11px] shadow-lg">
              <span className="font-medium text-[#ff7b9c]">{session.characterName}：</span>
              {charBubble}
            </div>
          ) : null}
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-full bg-white/80 px-3 py-2 text-[11px] text-[#9a8f8a] shadow-sm">
          <span className="flex size-6 items-center justify-center overflow-hidden rounded-full bg-[#ffeef4]">
            {session.characterAvatarUrl ? (
              <img src={session.characterAvatarUrl} alt="" className="size-full object-cover" />
            ) : (
              session.characterName.slice(0, 1)
            )}
          </span>
          {session.characterName} 正在陪你拼豆
          {justFilled !== null ? <Sparkles className="size-3.5 text-[#ff7b9c]" /> : null}
        </div>
      </div>

      <div className="shrink-0 border-t border-[#f0e4dc] px-4 py-3 text-center text-[11px] text-[#b0a6a0]">
        点击空白格填色 · 双指捏合或 ± 缩放 · 蓝框是你 · 粉框是 TA
      </div>
    </div>
  )
}
