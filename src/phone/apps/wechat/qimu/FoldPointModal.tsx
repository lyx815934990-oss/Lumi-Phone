import { AnimatePresence, motion } from 'framer-motion'
import { Pressable } from '../../../components/Pressable'
import type { CurtainFoldPoint } from './types'
import { qimuInk } from './theme'

type Props = {
  point: CurtainFoldPoint | null
  onChoose: (choiceId: string) => void
}

/** 折点信笺：打断聊天流的主线抉择 */
export function FoldPointModal({ point, onChoose }: Props) {
  return (
    <AnimatePresence>
      {point ? (
        <motion.div
          key={point.id}
          className="absolute inset-0 z-40 flex items-center justify-center px-5"
          style={{ background: 'rgba(0,0,0,0.42)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            initial={{ opacity: 0, y: -28 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ type: 'spring', stiffness: 360, damping: 32 }}
            className="w-full max-w-[340px] overflow-hidden rounded-[18px] border bg-white px-5 py-5"
            style={{
              borderColor: 'rgba(0,0,0,0.08)',
              boxShadow: '0 18px 48px rgba(0,0,0,0.12)',
            }}
          >
            <p
              className="text-[11px] font-medium tracking-[0.14em]"
              style={{ color: qimuInk.mute, fontFamily: qimuInk.mono }}
            >
              CRITICAL FOLD · 世界线收束
            </p>
            <h2
              className="mt-2 text-[18px] font-semibold tracking-tight"
              style={{ color: qimuInk.title, fontFamily: qimuInk.display }}
            >
              {point.title}
            </h2>
            <p className="mt-2.5 text-[13.5px] leading-[1.7]" style={{ color: qimuInk.body }}>
              {point.body}
            </p>
            <div className="mt-4 space-y-2">
              {point.choices.map((c) => (
                <Pressable
                  key={c.id}
                  type="button"
                  onClick={() => onChoose(c.id)}
                  className="w-full rounded-[12px] border px-3.5 py-3 text-left text-[13.5px] font-medium active:opacity-88"
                  style={{
                    borderColor: qimuInk.lineStrong,
                    background: qimuInk.surface,
                    color: qimuInk.title,
                  }}
                >
                  {c.label}
                </Pressable>
              ))}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
