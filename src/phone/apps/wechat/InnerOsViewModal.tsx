import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'

import { Pressable } from '../../components/Pressable'

const OS_SERIF =
  'var(--wx-font, "Songti SC", "Noto Serif SC", "Source Han Serif SC", Georgia, serif)'

/**
 * 气泡内心 OS 查看弹层（与心语整段档案不同：仅一句潜台词）。
 * 观感：低语便签 — 深雾遮罩 + 浅色浮卡，嘴上淡化、心里突出。
 */
export function InnerOsViewModal({
  open,
  bubbleText,
  innerOs,
  onClose,
}: {
  open: boolean
  /** 嘴上说的（气泡原文摘要） */
  bubbleText?: string
  /** 心里想的 */
  innerOs: string
  onClose: () => void
}) {
  const os = innerOs.trim()
  const said = String(bubbleText ?? '').trim()
  if (!open || !os) return null

  return (
    <AnimatePresence>
      <motion.div
        key="inner-os-mask"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.22 }}
        className="fixed inset-0 z-[1320] flex items-center justify-center px-5"
        style={{
          background:
            'radial-gradient(ellipse at 50% 40%, rgba(28,28,30,0.28) 0%, rgba(10,10,12,0.52) 100%)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
        }}
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) onClose()
        }}
      >
        <motion.div
          key="inner-os-panel"
          role="dialog"
          aria-modal="true"
          aria-label="内心 OS"
          initial={{ opacity: 0, y: 18, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.98 }}
          transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
          className="relative w-full max-w-[328px] overflow-hidden"
          style={{
            borderRadius: 22,
            background:
              'linear-gradient(165deg, rgba(255,255,255,0.98) 0%, rgba(250,250,252,0.99) 55%, rgba(244,244,248,0.99) 100%)',
            boxShadow:
              '0 1px 0 rgba(255,255,255,0.85) inset, 0 24px 64px rgba(0,0,0,0.22), 0 4px 16px rgba(0,0,0,0.08)',
            border: '1px solid rgba(255,255,255,0.6)',
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {/* 顶缘柔光 */}
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-24"
            style={{
              background:
                'radial-gradient(ellipse 80% 100% at 50% -20%, rgba(90,100,120,0.07), transparent 70%)',
            }}
            aria-hidden
          />

          <div className="relative px-5 pb-5 pt-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold tracking-wide"
                  style={{
                    background: 'rgba(28,28,30,0.06)',
                    color: '#3A3A3C',
                    fontFamily: OS_SERIF,
                  }}
                  aria-hidden
                >
                  OS
                </span>
                <div className="min-w-0">
                  <p
                    className="text-[10px] font-medium uppercase tracking-[0.22em]"
                    style={{ color: 'rgba(60,60,67,0.45)' }}
                  >
                    Whisper
                  </p>
                  <h2
                    className="mt-0.5 truncate text-[16px] font-semibold leading-tight"
                    style={{ color: '#1C1C1E', fontFamily: OS_SERIF }}
                  >
                    心里其实在说
                  </h2>
                </div>
              </div>
              <Pressable
                type="button"
                onClick={onClose}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors"
                style={{ background: 'rgba(28,28,30,0.05)', color: 'rgba(60,60,67,0.55)' }}
                aria-label="关闭"
              >
                <X className="size-3.5" strokeWidth={1.75} />
              </Pressable>
            </div>

            {said ? (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.06, duration: 0.28 }}
                className="mt-4 overflow-hidden rounded-2xl"
                style={{
                  background: 'rgba(28,28,30,0.035)',
                  border: '1px solid rgba(28,28,30,0.04)',
                }}
              >
                <div className="flex items-center gap-2 px-3.5 pt-2.5">
                  <span
                    className="h-1 w-1 rounded-full"
                    style={{ background: 'rgba(60,60,67,0.35)' }}
                    aria-hidden
                  />
                  <p
                    className="text-[10px] font-medium tracking-[0.16em]"
                    style={{ color: 'rgba(60,60,67,0.45)' }}
                  >
                    嘴上
                  </p>
                </div>
                <p
                  className="px-3.5 pb-3 pt-1.5 text-[13px] leading-relaxed"
                  style={{ color: 'rgba(60,60,67,0.62)' }}
                >
                  {said}
                </p>
              </motion.div>
            ) : null}

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: said ? 0.12 : 0.06, duration: 0.32 }}
              className="relative mt-4"
            >
              <div
                className="mb-2 flex items-center gap-2"
                aria-hidden
              >
                <span
                  className="h-px flex-1"
                  style={{
                    background:
                      'linear-gradient(90deg, transparent, rgba(28,28,30,0.12), transparent)',
                  }}
                />
                <span
                  className="text-[10px] font-medium tracking-[0.18em]"
                  style={{ color: 'rgba(60,60,67,0.4)' }}
                >
                  心里
                </span>
                <span
                  className="h-px flex-1"
                  style={{
                    background:
                      'linear-gradient(90deg, transparent, rgba(28,28,30,0.12), transparent)',
                  }}
                />
              </div>

              <div className="relative px-1 pt-1">
                <span
                  className="pointer-events-none absolute -left-0.5 -top-3 select-none text-[5rem] leading-none"
                  style={{
                    fontFamily: OS_SERIF,
                    color: 'rgba(28,28,30,0.07)',
                  }}
                  aria-hidden
                >
                  “
                </span>
                <p
                  className="relative whitespace-pre-wrap text-[15.5px] leading-[1.75]"
                  style={{
                    color: '#1C1C1E',
                    fontFamily: OS_SERIF,
                  }}
                >
                  {os}
                </p>
              </div>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.22, duration: 0.3 }}
              className="mt-5 text-center text-[10px] tracking-wide"
              style={{ color: 'rgba(60,60,67,0.35)' }}
            >
              点空白处关闭
            </motion.p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
