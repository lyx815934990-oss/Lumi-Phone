/**
 * 桌面七夕信封悬浮入口：可拖动，点击打开
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { dispatchOpenQixiEnvelope } from './qixiEnvelopeStorage'

const POS_KEY = 'lumi-qixi-fab-pos-v1'
const SIZE = 58
const TAP_SLOP = 10

type FabPos = { x: number; y: number }

function readPos(): FabPos | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(POS_KEY)
    if (!raw) return null
    const o = JSON.parse(raw) as FabPos
    if (typeof o?.x === 'number' && typeof o?.y === 'number') return o
  } catch {
    /* ignore */
  }
  return null
}

function writePos(pos: FabPos): void {
  try {
    window.localStorage.setItem(POS_KEY, JSON.stringify(pos))
  } catch {
    /* ignore */
  }
}

function clampPos(x: number, y: number, box: DOMRect): FabPos {
  const maxX = Math.max(8, box.width - SIZE - 8)
  const maxY = Math.max(8, box.height - SIZE - 8)
  return {
    x: Math.min(maxX, Math.max(8, x)),
    y: Math.min(maxY, Math.max(8, y)),
  }
}

export function QixiHomeFab() {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const [pos, setPos] = useState<FabPos | null>(null)
  const dragRef = useRef<{
    pointerId: number
    startX: number
    startY: number
    origX: number
    origY: number
    moved: boolean
  } | null>(null)

  useEffect(() => {
    const box = rootRef.current?.parentElement?.getBoundingClientRect()
    const saved = readPos()
    if (saved && box) {
      setPos(clampPos(saved.x, saved.y, box))
      return
    }
    if (box) {
      setPos({
        x: box.width - SIZE - 12,
        y: box.height - SIZE - 96,
      })
    }
  }, [])

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return
    const cur = pos
    if (!cur) return
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      origX: cur.x,
      origY: cur.y,
      moved: false,
    }
    e.currentTarget.setPointerCapture(e.pointerId)
  }, [pos])

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const d = dragRef.current
    if (!d || d.pointerId !== e.pointerId) return
    const dx = e.clientX - d.startX
    const dy = e.clientY - d.startY
    if (!d.moved && Math.hypot(dx, dy) < TAP_SLOP) return
    d.moved = true
    const box = rootRef.current?.parentElement?.getBoundingClientRect()
    if (!box) return
    setPos(clampPos(d.origX + dx, d.origY + dy, box))
  }, [])

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    const d = dragRef.current
    if (!d || d.pointerId !== e.pointerId) return
    dragRef.current = null
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }
    if (d.moved) {
      setPos((cur) => {
        if (cur) writePos(cur)
        return cur
      })
      return
    }
    dispatchOpenQixiEnvelope({ withCeremony: false })
  }, [])

  return (
    <div
      ref={rootRef}
      className="pointer-events-none absolute inset-0 z-[40]"
      aria-hidden={false}
    >
      {pos ? (
        <button
          type="button"
          aria-label="打开七夕信封"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className="pointer-events-auto absolute touch-none select-none"
          style={{
            left: pos.x,
            top: pos.y,
            width: SIZE,
            height: SIZE,
          }}
        >
          <span
            className="flex size-full flex-col items-center justify-center overflow-hidden rounded-[18px] border border-[#8a3d52]/40 shadow-[0_10px_22px_rgba(80,20,40,0.38)]"
            style={{
              background:
                'linear-gradient(165deg, #c45a72 0%, #9a3850 55%, #6e2438 100%)',
            }}
          >
            <svg width="26" height="20" viewBox="0 0 26 20" fill="none" aria-hidden>
              <path
                d="M2.2 3.2h21.6c.7 0 1.2.5 1.2 1.2v11.2c0 .7-.5 1.2-1.2 1.2H2.2c-.7 0-1.2-.5-1.2-1.2V4.4c0-.7.5-1.2 1.2-1.2Z"
                fill="#f7e4e8"
              />
              <path d="M1.2 4.6L13 12.2 24.8 4.6" stroke="#c45a72" strokeWidth="1.4" strokeLinejoin="round" />
              <path d="M1.4 16.4L9.8 10.2" stroke="#c45a72" strokeWidth="1.1" opacity="0.7" />
              <path d="M24.6 16.4L16.2 10.2" stroke="#c45a72" strokeWidth="1.1" opacity="0.7" />
            </svg>
            <span className="mt-0.5 text-[9px] font-medium tracking-[0.18em] text-[#fce8ee]">
              七夕
            </span>
          </span>
        </button>
      ) : null}
    </div>
  )
}
