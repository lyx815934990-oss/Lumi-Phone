import { Phone } from 'lucide-react'
import { animate, motion, useMotionValue } from 'framer-motion'
import { useCallback, useEffect, useRef, useState } from 'react'

import { VC } from './voiceCallTheme'

const BUBBLE_SIZE = 56
const EDGE_MARGIN = 10
const DRAG_THRESHOLD_PX = 6
const SPRING = { type: 'spring' as const, stiffness: 300, damping: 25, mass: 0.8 }

export type FloatingVoiceCallPhase = 'calling' | 'incoming' | 'connected'

export function FloatingVoiceCallBubble({
  visible,
  peerAvatarUrl,
  peerRemarkName,
  phase,
  onExpand,
}: {
  visible: boolean
  peerAvatarUrl?: string
  peerRemarkName: string
  phase: FloatingVoiceCallPhase
  onExpand: () => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const x = useMotionValue(0)
  const y = useMotionValue(120)
  const dragMovedRef = useRef(false)
  const [ready, setReady] = useState(false)

  const snapToNearestEdge = useCallback(() => {
    const bounds = containerRef.current?.getBoundingClientRect()
    if (!bounds) return
    const currentX = x.get()
    const centerX = currentX + BUBBLE_SIZE / 2
    const snapLeft = EDGE_MARGIN
    const snapRight = bounds.width - BUBBLE_SIZE - EDGE_MARGIN
    const targetX = centerX < bounds.width / 2 ? snapLeft : snapRight
    const maxY = Math.max(EDGE_MARGIN, bounds.height - BUBBLE_SIZE - EDGE_MARGIN)
    const clampedY = Math.min(maxY, Math.max(EDGE_MARGIN, y.get()))
    void animate(x, targetX, SPRING)
    void animate(y, clampedY, SPRING)
  }, [x, y])

  useEffect(() => {
    if (!visible || !containerRef.current) return
    const bounds = containerRef.current.getBoundingClientRect()
    x.set(bounds.width - BUBBLE_SIZE - EDGE_MARGIN - 4)
    y.set(bounds.height * 0.28)
    setReady(true)
  }, [visible, x, y])

  useEffect(() => {
    if (!visible) setReady(false)
  }, [visible])

  if (!visible) return null

  const peerName = peerRemarkName.trim() || '对方'
  const statusLabel =
    phase === 'calling' ? '你发起的呼叫，等待接听' : phase === 'incoming' ? '对方来电' : '通话中'

  return (
    <div
      ref={containerRef}
      className="pointer-events-none fixed inset-0 z-[290] overflow-visible"
      aria-hidden={!visible}
    >
      <motion.div
        drag
        dragMomentum={false}
        dragElastic={0.08}
        style={{ x, y, touchAction: 'none', opacity: ready ? 1 : 0 }}
        onDragStart={() => {
          dragMovedRef.current = false
        }}
        onDrag={(_, info) => {
          if (Math.abs(info.offset.x) > DRAG_THRESHOLD_PX || Math.abs(info.offset.y) > DRAG_THRESHOLD_PX) {
            dragMovedRef.current = true
          }
        }}
        onDragEnd={() => {
          snapToNearestEdge()
        }}
        className="pointer-events-auto absolute left-0 top-0"
      >
        <motion.button
          type="button"
          aria-label={`${peerName}${statusLabel}，点击返回通话`}
          onPointerDown={() => {
            dragMovedRef.current = false
          }}
          onClick={() => {
            if (dragMovedRef.current) return
            onExpand()
          }}
          whileTap={{ scale: 0.94 }}
          className="relative flex h-14 w-14 items-center justify-center overflow-visible rounded-full border border-white/70 bg-white/95 shadow-[0_10px_28px_rgba(0,0,0,0.18)]"
        >
          <span
            className="pointer-events-none absolute inset-0 rounded-full"
            style={{
              boxShadow: '0 0 0 0 rgba(52,199,89,0.35)',
              animation: 'vc-float-pulse 1.8s ease-out infinite',
            }}
            aria-hidden
          />
          {peerAvatarUrl?.trim() ? (
            <img
              src={peerAvatarUrl.trim()}
              alt=""
              className="h-full w-full rounded-full object-cover"
              draggable={false}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center rounded-full bg-[#f2f2f7] text-[13px] font-semibold text-[#8e8e93]">
              {peerName.slice(0, 1)}
            </div>
          )}
          <span
            className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full text-white shadow-sm ring-2 ring-white"
            style={{ background: VC.callGreen }}
          >
            <Phone className="size-3" strokeWidth={2.4} />
          </span>
        </motion.button>
      </motion.div>
      <style>{`
        @keyframes vc-float-pulse {
          0% { box-shadow: 0 0 0 0 rgba(52,199,89,0.35); }
          70% { box-shadow: 0 0 0 12px rgba(52,199,89,0); }
          100% { box-shadow: 0 0 0 0 rgba(52,199,89,0); }
        }
      `}</style>
    </div>
  )
}
