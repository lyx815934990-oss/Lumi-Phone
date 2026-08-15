import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Pressable } from '../../../../components/Pressable'

const LINES = ['正在同步观影足迹...', '正在整理讨论组动态...', '正在读取深夜追剧记录...']

export function BingeAIGenerateModal({
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
  const [bias, setBias] = useState('深夜追更、意难平、嗑糖弃坑')
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
          style={{
            fontFamily: "'PingFang SC', 'Noto Sans SC', -apple-system, system-ui, sans-serif",
          }}
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
              exit={{ opacity: 0, scale: 0.96 }}
            >
              <div className="text-[12px] tracking-[0.12em]" style={{ color: '#8b8b8f' }}>
                追剧馆同步中
              </div>
              <motion.div
                className="mx-auto mt-4 h-px w-full max-w-[200px]"
                style={{ background: 'rgba(107,90,120,0.7)' }}
                animate={{ opacity: [0.25, 1, 0.25], scaleX: [0.9, 1, 0.9] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
              />
              <motion.div
                key={line}
                className="mt-4 text-[12px]"
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
              transition={{ duration: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
            >
              <div className="text-[16px] font-semibold" style={{ color: '#101012' }}>
                AI 生成追剧痕迹
              </div>
              <div className="mt-1 text-[12px]" style={{ color: '#8b8b8f' }}>
                根据角色人设与剧情生成观影/阅读足迹、讨论组与短评
              </div>
              <div className="mt-3 text-[12px]" style={{ color: '#8b8b8f' }}>
                内容偏向
              </div>
              <textarea
                rows={3}
                value={bias}
                onChange={(e) => setBias(e.target.value)}
                className="mt-1 w-full resize-none rounded-[14px] border px-3 py-2 text-[13px] outline-none"
                style={{
                  borderColor: 'rgba(60,60,67,0.12)',
                  background: '#f7f6f4',
                  color: '#101012',
                }}
                placeholder="例如：深夜追更、意难平、嗑糖、弃坑纠结…"
              />
              {error ? (
                <div className="mt-2 text-[12px]" style={{ color: '#9a4a4a' }}>
                  {error}
                </div>
              ) : null}
              <Pressable
                type="button"
                className="mt-4 h-11 w-full rounded-full text-[14px] font-medium text-white"
                style={{ background: '#6b5a78' }}
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
