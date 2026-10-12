import { AnimatePresence, motion } from 'framer-motion'

import { Pressable } from '../../../../../../components/Pressable'

/** 小剧场事件 · 票据/卷轴风弹窗 */
export function EventModal({
  open,
  title = '小剧场彩蛋',
  text,
  cashDelta,
  onDismiss,
}: {
  open: boolean
  title?: string
  text: string
  cashDelta: number
  onDismiss: () => void
}) {
  const deltaLabel =
    cashDelta > 0 ? `+¥${cashDelta.toLocaleString()}` : cashDelta < 0 ? `¥${cashDelta.toLocaleString()}` : '无资金变动'
  const tone = cashDelta > 0 ? 'gain' : cashDelta < 0 ? 'loss' : 'neutral'

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-40 flex items-center justify-center bg-black/30 px-5 backdrop-blur-[3px]"
        >
          <motion.div
            initial={{ y: 28, opacity: 0, rotate: -2, scale: 0.94 }}
            animate={{ y: 0, opacity: 1, rotate: 0, scale: 1 }}
            exit={{ y: 12, opacity: 0, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
            className="w-full max-w-[300px] overflow-hidden rounded-2xl border border-stone-300/80 bg-[#F7F0E4] shadow-[0_12px_40px_rgba(40,30,20,0.18)]"
          >
            <div className="flex">
              <div className="w-1.5 shrink-0 bg-gradient-to-b from-amber-700/80 via-amber-600/70 to-amber-800/80" />
              <div className="min-w-0 flex-1 px-4 py-3.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[10px] tracking-[0.18em] text-amber-900/60">THEATER TICKET</p>
                    <h3
                      className="mt-1 text-[17px] font-semibold text-stone-900"
                      style={{ fontFamily: 'var(--phone-font, "Noto Serif SC", serif)' }}
                    >
                      {title}
                    </h3>
                  </div>
                  <span
                    className={`mt-1 shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                      tone === 'gain'
                        ? 'border-emerald-400/70 bg-emerald-50 text-emerald-700'
                        : tone === 'loss'
                          ? 'border-rose-300/80 bg-rose-50 text-rose-700'
                          : 'border-stone-300 bg-stone-50 text-stone-500'
                    }`}
                    style={{ transform: 'rotate(-6deg)' }}
                  >
                    {tone === 'gain' ? '入账' : tone === 'loss' ? '扣款' : '剧情'}
                  </span>
                </div>

                <div className="my-3 border-t border-dashed border-stone-300/90" />

                <p className="text-[13px] leading-relaxed text-stone-700">{text}</p>

                <motion.p
                  key={deltaLabel}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`mt-3 text-[22px] font-semibold tabular-nums ${
                    tone === 'gain' ? 'text-emerald-700' : tone === 'loss' ? 'text-rose-700' : 'text-stone-600'
                  }`}
                  style={{ fontFamily: 'var(--phone-font, "Noto Serif SC", serif)' }}
                >
                  {deltaLabel}
                </motion.p>

                <Pressable
                  onClick={onDismiss}
                  className="mt-4 flex h-10 w-full items-center justify-center rounded-xl bg-[#2C241B] text-[14px] font-medium text-[#F7F0E4] active:opacity-90"
                >
                  收起票据
                </Pressable>
              </div>
              <div className="relative flex w-14 shrink-0 items-center justify-center border-l border-dashed border-stone-300/90 bg-[#EFE6D6]/80">
                <span className="absolute -left-1.5 top-2 h-3 w-3 rounded-full bg-[#E8DFD0]" />
                <span className="absolute -left-1.5 bottom-2 h-3 w-3 rounded-full bg-[#E8DFD0]" />
                <span
                  className="rotate-90 text-[10px] tracking-[0.2em] text-stone-500"
                  style={{ fontFamily: 'var(--phone-font, "Noto Serif SC", serif)' }}
                >
                  EVENT
                </span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
