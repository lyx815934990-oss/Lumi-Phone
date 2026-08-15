import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Pressable } from '../../../../components/Pressable'
import { DatingNum } from '../../dating/DatingNum'

const LINES = ['正在读取通话记录...', '正在比对关系脉络...', '正在重建通讯录痕迹...']

const SPAN_PRESETS = [
  { days: 1, label: '近1天' },
  { days: 3, label: '近3天' },
  { days: 7, label: '近7天' },
  { days: 14, label: '近14天' },
  { days: 30, label: '近30天' },
] as const

const COUNT_PRESETS = [5, 6, 8, 10, 12] as const

export type PhoneGenerateForm = {
  bias: string
  /** 通话条数 */
  callCount: number
  /** 相对剧情「现在」往回覆盖的天数 */
  timeSpanDays: number
}

function clampCallCount(n: number): number {
  if (!Number.isFinite(n)) return 8
  return Math.max(4, Math.min(12, Math.round(n)))
}

function clampSpanDays(n: number): number {
  if (!Number.isFinite(n)) return 7
  return Math.max(1, Math.min(60, Math.round(n)))
}

export function PhoneAIGenerateModal({
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
  onSubmit: (form: PhoneGenerateForm) => void
}) {
  const [bias, setBias] = useState('深夜未接、关系试探、家人催促')
  const [callCount, setCallCount] = useState(8)
  const [timeSpanDays, setTimeSpanDays] = useState(7)
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
            fontFamily:
              "'SF Pro Text', 'PingFang SC', 'Noto Sans SC', -apple-system, system-ui, sans-serif",
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
              <div className="text-[12px] tracking-[0.12em] text-[#8e8e93]">通话同步中</div>
              <motion.div
                className="mx-auto mt-4 h-px w-full max-w-[200px] bg-[#5e6c84]/70"
                animate={{ opacity: [0.25, 1, 0.25], scaleX: [0.9, 1, 0.9] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
              />
              <motion.div
                key={line}
                className="mt-4 font-mono text-[12px] text-[#1c1c1e]"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {LINES[line]}
              </motion.div>
            </motion.div>
          ) : (
            <motion.div
              className="relative max-h-[min(88vh,640px)] w-full max-w-[360px] overflow-y-auto rounded-[20px] bg-white/95 p-4 shadow-[0_12px_40px_rgba(0,0,0,0.18)] backdrop-blur-xl"
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 6 }}
              transition={{ duration: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
            >
              <div className="text-[16px] font-semibold text-[#1c1c1e]">AI 生成通话痕迹</div>
              <div className="mt-1 text-[12px] leading-relaxed text-[#8e8e93]">
                自定义通话条数与时间跨度；通讯录收藏 / 黑名单 / 紧急联系人由模型按人设自行安排。
              </div>

              <div className="mt-4 text-[12px] font-medium text-[#8e8e93]">通话记录条数</div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {COUNT_PRESETS.map((n) => {
                  const on = callCount === n
                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setCallCount(n)}
                      className={`rounded-full px-3 py-1.5 text-[12px] transition-colors ${
                        on
                          ? 'bg-[#1c1c1e] text-white'
                          : 'bg-[#f2f2f7] text-[#3a3a3c] hover:bg-[#e8e8ed]'
                      }`}
                    >
                      <DatingNum>{n}</DatingNum> 条
                    </button>
                  )
                })}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="number"
                  min={4}
                  max={12}
                  value={callCount}
                  onChange={(e) => setCallCount(clampCallCount(Number(e.target.value)))}
                  className="h-9 w-20 rounded-[12px] border border-[rgba(60,60,67,0.12)] bg-[#f5f5f7] px-2 text-center text-[13px] text-[#1c1c1e] outline-none"
                />
                <span className="text-[11px] text-[#aeaeb2]">可填 <DatingNum>4</DatingNum>–<DatingNum>12</DatingNum></span>
              </div>

              <div className="mt-4 text-[12px] font-medium text-[#8e8e93]">通话时间跨度</div>
              <p className="mt-0.5 text-[11px] leading-relaxed text-[#aeaeb2]">
                相对剧情「现在」往回覆盖；无剧情时间则相对系统今天。
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {SPAN_PRESETS.map((p) => {
                  const on = timeSpanDays === p.days
                  return (
                    <button
                      key={p.days}
                      type="button"
                      onClick={() => setTimeSpanDays(p.days)}
                      className={`rounded-full px-3 py-1.5 text-[12px] transition-colors ${
                        on
                          ? 'bg-[#1c1c1e] text-white'
                          : 'bg-[#f2f2f7] text-[#3a3a3c] hover:bg-[#e8e8ed]'
                      }`}
                    >
                      {p.label}
                    </button>
                  )
                })}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={timeSpanDays}
                  onChange={(e) => setTimeSpanDays(clampSpanDays(Number(e.target.value)))}
                  className="h-9 w-20 rounded-[12px] border border-[rgba(60,60,67,0.12)] bg-[#f5f5f7] px-2 text-center text-[13px] text-[#1c1c1e] outline-none"
                />
                <span className="text-[11px] text-[#aeaeb2]">天（<DatingNum>1</DatingNum>–<DatingNum>60</DatingNum>）</span>
              </div>

              <div className="mt-4 text-[12px] font-medium text-[#8e8e93]">内容偏向</div>
              <textarea
                rows={3}
                value={bias}
                onChange={(e) => setBias(e.target.value)}
                className="mt-1 w-full resize-none rounded-[14px] border border-[rgba(60,60,67,0.12)] bg-[#f5f5f7] px-3 py-2 text-[13px] text-[#1c1c1e] outline-none"
                placeholder="例如：深夜未接、暧昧试探、家人催促…"
              />
              {error ? <div className="mt-2 text-[12px] text-[#d9534f]">{error}</div> : null}
              <Pressable
                type="button"
                className="mt-4 h-11 w-full rounded-full bg-[#1c1c1e] text-[14px] font-medium text-white"
                onClick={() =>
                  onSubmit({
                    bias,
                    callCount: clampCallCount(callCount),
                    timeSpanDays: clampSpanDays(timeSpanDays),
                  })
                }
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
