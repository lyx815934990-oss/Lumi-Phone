import { Phone } from 'lucide-react'
import { AnimatePresence, animate, motion, useMotionValue } from 'framer-motion'
import { useCallback, useEffect, useRef, useState } from 'react'

import { Typewriter } from './terminalChic/Typewriter'
import type { FloatLiveCaptionMode } from './useGlobalVoiceCallFloatStore'
import { VC, VC_UI_FONT } from './voiceCallTheme'

const BUBBLE_SIZE = 56
const EDGE_MARGIN = 10
const DRAG_THRESHOLD_PX = 6
const SPRING = { type: 'spring' as const, stiffness: 300, damping: 25, mass: 0.8 }

export type FloatingVoiceCallPhase = 'calling' | 'incoming' | 'connected'

/** 用布局尺寸（不受外壳 scale 影响），避免 getBoundingClientRect 把球算出壳外 */
function shellSize(el: HTMLElement) {
  return { w: el.offsetWidth || el.clientWidth, h: el.offsetHeight || el.clientHeight }
}

export function FloatingVoiceCallBubble({
  visible,
  peerAvatarUrl,
  peerRemarkName,
  phase,
  captionId = null,
  captionText = '',
  captionMode = 'idle',
  onExpand,
}: {
  visible: boolean
  peerAvatarUrl?: string
  peerRemarkName: string
  phase: FloatingVoiceCallPhase
  captionId?: string | null
  captionText?: string
  captionMode?: FloatLiveCaptionMode
  onExpand: () => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const groupRef = useRef<HTMLDivElement>(null)
  const x = useMotionValue(0)
  const y = useMotionValue(120)
  const dragMovedRef = useRef(false)
  const [ready, setReady] = useState(false)
  /** true = 吸左边，字幕向右展开；false = 吸右边，字幕向左展开 */
  const [dockLeft, setDockLeft] = useState(false)

  const showCaption = captionMode !== 'idle' && !!captionText.trim()

  const snapToNearestEdge = useCallback(() => {
    const box = containerRef.current
    const group = groupRef.current
    if (!box) return
    const { w: boxW, h: boxH } = shellSize(box)
    const gw = Math.max(BUBBLE_SIZE, group?.offsetWidth ?? BUBBLE_SIZE)
    const gh = Math.max(BUBBLE_SIZE, group?.offsetHeight ?? BUBBLE_SIZE)
    const currentX = x.get()
    const centerX = currentX + gw / 2
    const snapLeft = EDGE_MARGIN
    const snapRight = Math.max(EDGE_MARGIN, boxW - gw - EDGE_MARGIN)
    const preferLeft = centerX < boxW / 2
    const targetX = preferLeft ? snapLeft : snapRight
    const maxY = Math.max(EDGE_MARGIN, boxH - gh - EDGE_MARGIN)
    const clampedY = Math.min(maxY, Math.max(EDGE_MARGIN, y.get()))
    setDockLeft(preferLeft)
    void animate(x, targetX, SPRING)
    void animate(y, clampedY, SPRING)
  }, [x, y])

  useEffect(() => {
    if (!visible || !containerRef.current) return
    const { w, h } = shellSize(containerRef.current)
    setDockLeft(false)
    x.set(Math.max(EDGE_MARGIN, w - BUBBLE_SIZE - EDGE_MARGIN - 4))
    y.set(Math.max(EDGE_MARGIN, Math.min(h - BUBBLE_SIZE - EDGE_MARGIN, h * 0.28)))
    setReady(true)
  }, [visible, x, y])

  useEffect(() => {
    if (!visible) setReady(false)
  }, [visible])

  // 字幕展开/收起后宽度变化，重新吸边避免出壳
  useEffect(() => {
    if (!visible || !ready) return
    const t = window.setTimeout(() => snapToNearestEdge(), 40)
    return () => window.clearTimeout(t)
  }, [showCaption, captionText, ready, snapToNearestEdge, visible])

  if (!visible) return null

  const peerName = peerRemarkName.trim() || '对方'
  const statusLabel =
    phase === 'calling' ? '你发起的呼叫，等待接听' : phase === 'incoming' ? '对方来电' : '通话中'

  return (
    <div
      ref={containerRef}
      className="pointer-events-none absolute inset-0 z-[290] overflow-hidden"
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
        <div
          ref={groupRef}
          className={`flex items-center gap-2 ${dockLeft ? 'flex-row' : 'flex-row-reverse'}`}
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
            className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-visible rounded-full border border-white/70 bg-white/95 shadow-[0_10px_28px_rgba(0,0,0,0.18)]"
          >
            <span
              className="pointer-events-none absolute inset-0 rounded-full"
              style={{
                boxShadow: '0 0 0 0 rgba(16,16,18,0.28)',
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
              style={{ background: VC.ink }}
            >
              <Phone className="size-3" strokeWidth={2.4} />
            </span>
          </motion.button>

          <AnimatePresence mode="wait">
            {showCaption ? (
              <motion.div
                key={captionId || captionMode}
                initial={{ opacity: 0, scale: 0.92, x: dockLeft ? -8 : 8 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.96, x: dockLeft ? -6 : 6 }}
                transition={{ duration: 0.18 }}
                className="max-w-[min(196px,46vw)] rounded-[16px] border border-white/70 px-3 py-2 shadow-[0_10px_24px_rgba(0,0,0,0.14)]"
                style={{
                  background: 'rgba(255,255,255,0.92)',
                  fontFamily: VC_UI_FONT,
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                }}
                onClick={() => {
                  if (dragMovedRef.current) return
                  onExpand()
                }}
                role="status"
                aria-live="polite"
              >
                {captionMode === 'line' ? (
                  <p className="text-[12.5px] leading-[1.45]" style={{ color: VC.ink }}>
                    <Typewriter
                      key={captionId || captionText}
                      text={captionText}
                      speedMs={40}
                      cursorColor={VC.ink}
                    />
                  </p>
                ) : captionMode === 'status' ? (
                  <p className="text-[12.5px] leading-snug font-medium" style={{ color: VC.ink }}>
                    {captionText}
                  </p>
                ) : (
                  <p className="text-[12px] leading-snug" style={{ color: VC.mist }}>
                    {captionText}
                    <span
                      className="ml-0.5 inline-block"
                      style={{ animation: 'vc-float-dots 1.2s steps(3,end) infinite' }}
                      aria-hidden
                    >
                      …
                    </span>
                  </p>
                )}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </motion.div>
      <style>{`
        @keyframes vc-float-pulse {
          0% { box-shadow: 0 0 0 0 rgba(16,16,18,0.28); }
          70% { box-shadow: 0 0 0 12px rgba(16,16,18,0); }
          100% { box-shadow: 0 0 0 0 rgba(16,16,18,0); }
        }
        @keyframes vc-float-dots {
          0%, 20% { opacity: 0.25; }
          50% { opacity: 1; }
          100% { opacity: 0.25; }
        }
        @keyframes vc-blink {
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  )
}
