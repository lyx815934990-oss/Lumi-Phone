import { PieChart } from 'lucide-react'
import { animate, motion, useMotionValue } from 'framer-motion'
import { useCallback, useEffect, useRef, useState } from 'react'

import {
  getReplyTokenFabState,
  hideReplyTokenFab,
  setReplyTokenPanelOpen,
  subscribeReplyTokenFab,
} from './replyTokenFabStore'

const BUBBLE_SIZE = 52
const EDGE_MARGIN = 10
const DRAG_THRESHOLD_PX = 6
const LONG_PRESS_MS = 500
const SPRING = { type: 'spring' as const, stiffness: 300, damping: 25, mass: 0.8 }

function shellSize(el: HTMLElement) {
  return { w: el.offsetWidth || el.clientWidth, h: el.offsetHeight || el.clientHeight }
}

export function ReplyTokenFloatingButton() {
  const [visible, setVisible] = useState(() => getReplyTokenFabState().visible)
  const containerRef = useRef<HTMLDivElement>(null)
  const x = useMotionValue(0)
  const y = useMotionValue(160)
  const dragMovedRef = useRef(false)
  const longPressTimerRef = useRef<number | null>(null)
  const longPressFiredRef = useRef(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    return subscribeReplyTokenFab(() => {
      setVisible(getReplyTokenFabState().visible)
    })
  }, [])

  const clearLongPress = useCallback(() => {
    if (longPressTimerRef.current != null) {
      window.clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }, [])

  const clampInShell = useCallback(() => {
    const box = containerRef.current
    if (!box) return
    const { w: boxW, h: boxH } = shellSize(box)
    const maxX = Math.max(EDGE_MARGIN, boxW - BUBBLE_SIZE - EDGE_MARGIN)
    const maxY = Math.max(EDGE_MARGIN, boxH - BUBBLE_SIZE - EDGE_MARGIN)
    const nx = Math.min(maxX, Math.max(EDGE_MARGIN, x.get()))
    const ny = Math.min(maxY, Math.max(EDGE_MARGIN, y.get()))
    void animate(x, nx, SPRING)
    void animate(y, ny, SPRING)
  }, [x, y])

  useEffect(() => {
    if (!visible || !containerRef.current) return
    const { w, h } = shellSize(containerRef.current)
    x.set(Math.max(EDGE_MARGIN, w - BUBBLE_SIZE - EDGE_MARGIN - 4))
    y.set(Math.max(EDGE_MARGIN, Math.min(h - BUBBLE_SIZE - EDGE_MARGIN, h * 0.42)))
    setReady(true)
  }, [visible, x, y])

  useEffect(() => {
    if (!visible) setReady(false)
  }, [visible])

  useEffect(() => () => clearLongPress(), [clearLongPress])

  if (!visible) return null

  return (
    <div
      ref={containerRef}
      className="pointer-events-none absolute inset-0 z-[250] overflow-hidden"
      aria-hidden={!visible}
    >
      <motion.div
        drag
        dragMomentum={false}
        dragElastic={0.08}
        dragConstraints={containerRef}
        style={{ x, y, touchAction: 'none', opacity: ready ? 1 : 0 }}
        onDragStart={() => {
          dragMovedRef.current = false
          clearLongPress()
        }}
        onDrag={(_, info) => {
          if (Math.abs(info.offset.x) > DRAG_THRESHOLD_PX || Math.abs(info.offset.y) > DRAG_THRESHOLD_PX) {
            dragMovedRef.current = true
            clearLongPress()
          }
        }}
        onDragEnd={() => {
          clampInShell()
        }}
        className="pointer-events-auto absolute left-0 top-0"
      >
        <motion.button
          type="button"
          aria-label="查看回复 Token 用量，长按收起"
          onPointerDown={() => {
            dragMovedRef.current = false
            longPressFiredRef.current = false
            clearLongPress()
            longPressTimerRef.current = window.setTimeout(() => {
              longPressFiredRef.current = true
              hideReplyTokenFab()
            }, LONG_PRESS_MS)
          }}
          onPointerUp={clearLongPress}
          onPointerCancel={clearLongPress}
          onClick={() => {
            if (dragMovedRef.current || longPressFiredRef.current) return
            setReplyTokenPanelOpen(true)
          }}
          whileTap={{ scale: 0.94 }}
          className="relative flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full border border-white/80 bg-gradient-to-b from-[#F3F7FB] to-white shadow-[0_10px_28px_rgba(0,0,0,0.16)]"
        >
          <PieChart className="size-5 text-sky-600" strokeWidth={2.2} aria-hidden />
          <span className="absolute -bottom-0.5 rounded-full bg-sky-500 px-1.5 py-px text-[9px] font-semibold leading-none text-white shadow-sm">
            Token
          </span>
        </motion.button>
      </motion.div>
    </div>
  )
}
