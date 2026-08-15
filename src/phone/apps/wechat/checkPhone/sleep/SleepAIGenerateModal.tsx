import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

import { Pressable } from '../../../../components/Pressable'

const CEREMONY_LINES = [
  '正在读取穿戴设备同步记录...',
  '正在比对近期作息与情绪...',
  '正在重建夜间监测曲线...',
  '正在生成角色私密睡眠小结...',
]

export function SleepAIGenerateModal({
  open,
  busy,
  error,
  onClose,
  onSubmit,
}: {
  open: boolean
  busy: boolean
  error: string | null
  onClose: () => void
  onSubmit: (params: { days: number; bias: string }) => void
}) {
  const [daysInput, setDaysInput] = useState('7')
  const [bias, setBias] = useState('贴合近期剧情：可能失眠、熬夜，或睡得很沉')
  const [lineIndex, setLineIndex] = useState(0)

  useEffect(() => {
    if (!busy) return
    const id = window.setInterval(() => {
      setLineIndex((v) => (v + 1) % CEREMONY_LINES.length)
    }, 900)
    return () => window.clearInterval(id)
  }, [busy])

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[1420] flex items-end bg-black/35 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !busy) onClose()
          }}
        >
          {busy ? (
            <motion.div
              className="absolute inset-0 flex items-center justify-center bg-black/30"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="w-[320px] rounded-2xl border border-white/10 bg-[#1c1d24]/92 p-5 backdrop-blur-md">
                <div className="text-center text-[12px] tracking-[0.14em] text-white/45">睡眠数据同步中</div>
                <motion.div
                  className="mt-4 h-px w-full bg-white/70"
                  animate={{ opacity: [0.2, 1, 0.2], scaleX: [0.94, 1, 0.94] }}
                  transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                />
                <motion.div
                  key={lineIndex}
                  className="mt-4 h-5 text-center font-mono text-[12px] text-white/75"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                >
                  {CEREMONY_LINES[lineIndex]}
                </motion.div>
              </div>
            </motion.div>
          ) : null}

          {!busy ? (
            <motion.div
              className="relative w-full rounded-[20px] border border-white/10 bg-[#22232b]/95 p-4 shadow-[0_12px_40px_rgba(0,0,0,0.35)] backdrop-blur-lg"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
            >
              <div className="text-[16px] text-white/90">AI 生成睡眠记录</div>
              <div className="mt-1 text-[11px] text-white/40">基于角色人设与近期剧情生成监测数据</div>
              <div className="mt-3 text-[12px] text-white/40">生成天数（3-7）</div>
              <input
                type="number"
                min={3}
                max={7}
                value={daysInput}
                onChange={(e) => setDaysInput(e.target.value)}
                className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/90 outline-none"
              />
              <div className="mt-3 text-[12px] text-white/40">内容偏向</div>
              <textarea
                rows={3}
                value={bias}
                onChange={(e) => setBias(e.target.value)}
                className="mt-1 w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/90 outline-none"
              />
              {error ? <div className="mt-2 text-[12px] text-rose-300">{error}</div> : null}
              <Pressable
                type="button"
                className="mt-4 h-11 w-full rounded-xl bg-white/90 text-[14px] text-[#1c1d24] active:scale-[0.99]"
                onClick={() => {
                  const parsed = Number(daysInput)
                  const days = Number.isFinite(parsed) ? Math.min(7, Math.max(3, Math.round(parsed))) : 7
                  onSubmit({ days, bias })
                }}
              >
                开始生成
              </Pressable>
            </motion.div>
          ) : null}
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
