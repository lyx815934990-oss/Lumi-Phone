/**
 * 七夕仪式感开屏：演进日志结束后的沉浸惊喜过渡
 */

import { AnimatePresence, motion } from 'framer-motion'
import { useEffect } from 'react'

const LINES = [
  { text: '亲爱的宝宝，七夕快乐！', delay: 0.4 },
  { text: '貌似这里有个惊喜等着你哟~', delay: 1.7 },
  { text: '快拆开信封看看？', delay: 3.0 },
]

export function QixiCeremonyIntro(props: {
  open: boolean
  onFinished: () => void
  onSkip: () => void
}) {
  const { open, onFinished, onSkip } = props

  useEffect(() => {
    if (!open) return
    const t = window.setTimeout(() => onFinished(), 5000)
    return () => window.clearTimeout(t)
  }, [open, onFinished])

  if (!open) return null

  return (
    <AnimatePresence>
      <motion.div
        className="absolute inset-0 z-20 flex flex-col items-center justify-center overflow-hidden"
        style={{
          background:
            'radial-gradient(ellipse 90% 70% at 50% 35%, #3a1524 0%, #12080e 55%, #080406 100%)',
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* 星屑 */}
        <div className="pointer-events-none absolute inset-0">
          {Array.from({ length: 28 }).map((_, i) => (
            <motion.span
              key={i}
              className="absolute rounded-full bg-[#fce8ee]"
              style={{
                width: 1.5 + (i % 3),
                height: 1.5 + (i % 3),
                left: `${(i * 37) % 100}%`,
                top: `${(i * 53) % 100}%`,
                opacity: 0.15 + (i % 5) * 0.08,
              }}
              animate={{ opacity: [0.15, 0.65, 0.2], scale: [1, 1.4, 1] }}
              transition={{
                duration: 2.4 + (i % 4) * 0.35,
                repeat: Infinity,
                delay: (i % 7) * 0.2,
              }}
            />
          ))}
        </div>

        {/* 柔光 */}
        <motion.div
          className="pointer-events-none absolute left-1/2 top-[38%] h-[220px] w-[220px] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            background:
              'radial-gradient(circle, rgba(232,160,176,0.28) 0%, rgba(196,72,98,0.08) 45%, transparent 70%)',
          }}
          animate={{ scale: [0.85, 1.08, 0.92], opacity: [0.5, 0.9, 0.55] }}
          transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
        />

        <motion.p
          className="relative mb-10 text-[12px] tracking-[0.18em] text-[#f0c4ce]/55"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.8 }}
        >
          七夕 · 八月十九日
        </motion.p>

        <div className="relative z-10 flex min-h-[200px] flex-col items-center justify-center gap-5 px-8 text-center">
          {LINES.map((line) => (
            <motion.p
              key={line.text}
              className="text-[17px] leading-relaxed tracking-[0.04em] text-[#fce8ee]"
              style={{
                fontFamily: '"Songti SC", "STSong", "SimSun", "Noto Serif SC", serif',
                textShadow: '0 0 24px rgba(232,160,176,0.25)',
              }}
              initial={{ opacity: 0, y: 16, filter: 'blur(6px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ delay: line.delay, duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
            >
              {line.text}
            </motion.p>
          ))}
        </div>

        <motion.div
          className="absolute bottom-[max(28px,env(safe-area-inset-bottom,0px))] flex flex-col items-center gap-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 3.8, duration: 0.6 }}
        >
          <p className="text-[12px] tracking-[0.12em] text-[#f0c4ce]/50">拆开看看嘛</p>
          <button
            type="button"
            onClick={onSkip}
            className="rounded-full px-4 py-1.5 text-[11px] tracking-widest text-white/35 hover:text-white/60"
          >
            跳过
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
