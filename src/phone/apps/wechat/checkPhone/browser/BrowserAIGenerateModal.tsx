import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Pressable } from '../../../../components/Pressable'

const LINES = ['正在读取浏览痕迹...', '正在比对角色情绪脉络...', '正在重建私密标签页...']

export function BrowserAIGenerateModal({
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
  const [bias, setBias] = useState('深夜emo、关系试探、隐秘兴趣')
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
          className="absolute inset-0 z-[50] flex items-end bg-black/25 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !busy) onClose()
          }}
        >
          {busy ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="browser-sheet w-[300px] p-5 text-center">
                <div className="text-[12px] tracking-[0.12em] text-[var(--br-mist)]">痕迹同步中</div>
                <motion.div
                  key={line}
                  className="browser-mono mt-4 text-[12px] text-[var(--br-ink)]"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  {LINES[line]}
                </motion.div>
              </div>
            </div>
          ) : (
            <motion.div
              className="browser-sheet w-full p-4"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 16, opacity: 0 }}
              transition={{ duration: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
            >
              <div className="text-[16px] text-[var(--br-ink)]">AI 生成浏览痕迹</div>
              <div className="mt-1 text-[12px] text-[var(--br-mist)]">根据角色人设与剧情重写历史 / 收藏 / 文章</div>
              <textarea
                rows={3}
                value={bias}
                onChange={(e) => setBias(e.target.value)}
                className="mt-3 w-full resize-none rounded-[14px] border border-[var(--br-hairline)] bg-[var(--br-paper)] px-3 py-2 text-[13px] text-[var(--br-ink)] outline-none"
              />
              {error ? <div className="mt-2 text-[12px] text-[var(--br-fog)]">{error}</div> : null}
              <Pressable
                type="button"
                className="mt-4 h-11 w-full rounded-[var(--br-radius-pill)] bg-[var(--br-ink)] text-[14px] text-[var(--br-paper)]"
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
