import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Pressable } from '../../../../components/Pressable'

const LINES = ['正在同步附近订单...', '正在整理评价手账...', '正在读取待使用票券...']

export function MarketAIGenerateModal({
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
  onSubmit: (bias: string) => void
}) {
  const [bias, setBias] = useState('周末出游、深夜觅食、随手买券')
  const [line, setLine] = useState(0)

  useEffect(() => {
    if (!busy) return
    const id = window.setInterval(() => setLine((v) => (v + 1) % LINES.length), 900)
    return () => window.clearInterval(id)
  }, [busy])

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[1420] flex items-center justify-center bg-black/35 p-5"
          style={{ fontFamily: "'PingFang SC', 'Noto Sans SC', -apple-system, system-ui, sans-serif" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !busy) onClose()
          }}
        >
          {busy ? (
            <motion.div
              className="w-[300px] rounded-[20px] bg-white/95 p-5 text-center shadow-[0_12px_40px_rgba(0,0,0,0.18)] backdrop-blur-xl"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <div className="text-[12px] tracking-[0.12em]" style={{ color: '#8b8b8f' }}>
                团购中心同步中
              </div>
              <motion.div
                className="mx-auto mt-4 h-px w-full max-w-[200px]"
                style={{ background: 'rgba(60,140,134,0.7)' }}
                animate={{ opacity: [0.25, 1, 0.25], scaleX: [0.9, 1, 0.9] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
              />
              <motion.div
                key={line}
                className="mk-num mt-4 text-[12px]"
                style={{ color: '#101012', fontFamily: 'Inter, system-ui, sans-serif' }}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {LINES[line]}
              </motion.div>
            </motion.div>
          ) : (
            <motion.div
              className="relative w-full max-w-[340px] rounded-[20px] bg-white/95 p-4 shadow-[0_12px_40px_rgba(0,0,0,0.18)] backdrop-blur-xl"
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 6 }}
            >
              <div className="text-[16px] font-semibold" style={{ color: '#101012' }}>
                AI 生成团购痕迹
              </div>
              <div className="mt-1 text-[12px]" style={{ color: '#8b8b8f' }}>
                根据人设生成订房、订位、买券与评价记录
              </div>
              <div className="mt-3 text-[12px]" style={{ color: '#8b8b8f' }}>
                内容偏向
              </div>
              <textarea
                rows={3}
                value={bias}
                onChange={(e) => setBias(e.target.value)}
                className="mt-1 w-full resize-none rounded-[14px] border px-3 py-2 text-[13px] outline-none"
                style={{ borderColor: 'rgba(60,60,67,0.12)', background: '#f7f6f4', color: '#101012' }}
                placeholder="例如：周末出游、深夜觅食、踩雷吐槽…"
              />
              {error ? (
                <div className="mt-2 text-[12px]" style={{ color: '#9a4a4a' }}>
                  {error}
                </div>
              ) : null}
              <Pressable
                type="button"
                className="mt-4 h-11 w-full rounded-full text-[14px] font-medium text-white"
                style={{ background: '#3C8C86' }}
                onClick={() => onSubmit(bias)}
              >
                开始生成
              </Pressable>
            </motion.div>
          )}
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
