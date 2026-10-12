import { AnimatePresence, motion } from 'framer-motion'

import { Pressable } from '../../../../../../components/Pressable'

export function BranchEnterModal({
  open,
  zoneLabel,
  gateName,
  onEnter,
  onSkip,
}: {
  open: boolean
  zoneLabel: string
  gateName: string
  onEnter: () => void
  onSkip: () => void
}) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-40 flex items-center justify-center bg-black/30 px-5 backdrop-blur-[2px]"
        >
          <motion.div
            initial={{ scale: 0.92, y: 12, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            className="w-full max-w-[290px] overflow-hidden rounded-2xl border border-amber-200/80 bg-[#FBF6EA] shadow-xl"
          >
            <div className="bg-gradient-to-r from-amber-600/90 to-amber-800/80 px-4 py-2.5">
              <p className="text-[10px] tracking-[0.16em] text-amber-100/90">SIDE PATH</p>
              <h3
                className="text-[17px] font-semibold text-white"
                style={{ fontFamily: 'var(--phone-font, "Noto Serif SC", serif)' }}
              >
                {zoneLabel}
              </h3>
            </div>
            <div className="px-4 py-3.5">
              <p className="text-[13px] leading-relaxed text-stone-600">
                你停在「{gateName}」。要拐进功能支线吗？支线里有更多道具/事件格，走完会汇回主路。
              </p>
              <div className="mt-4 flex gap-2">
                <Pressable
                  onClick={onSkip}
                  className="flex h-10 flex-1 items-center justify-center rounded-xl border border-stone-200 bg-white text-[13px] text-stone-600"
                >
                  留在主路
                </Pressable>
                <Pressable
                  onClick={onEnter}
                  className="flex h-10 flex-1 items-center justify-center rounded-xl bg-[#2C241B] text-[13px] font-medium text-[#FBF6EA]"
                >
                  进入支线
                </Pressable>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
