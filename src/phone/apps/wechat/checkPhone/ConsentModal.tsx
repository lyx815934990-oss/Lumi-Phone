import { AnimatePresence, motion } from 'framer-motion'
import { Pressable } from '../../../components/Pressable'

/** 柔和黑白：白底黑字，炭雾描边 */
const ink = {
  soft: '#2f2f2f',
  mid: '#5c5c5c',
  mute: '#8a8a8a',
  line: '#e6e6e6',
  wash: '#f4f4f4',
  ghost: '#f0f0f0',
  veil: 'rgba(28, 28, 28, 0.28)',
} as const

const SERIF =
  '"Noto Serif SC", "Songti SC", "STSong", "Source Han Serif SC", "Georgia", serif'

export function ConsentModal({
  open,
  onAsk,
  onSpy,
  onClose,
}: {
  open: boolean
  onAsk: () => void
  onSpy: () => void
  onClose: () => void
}) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[1400] flex items-center justify-center px-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose()
          }}
        >
          <div
            className="absolute inset-0 backdrop-blur-[8px] [-webkit-backdrop-filter:blur(8px)]"
            style={{ backgroundColor: ink.veil }}
          />
          <motion.div
            className="relative w-full max-w-[340px] rounded-[26px] border bg-white px-6 pb-5 pt-7 shadow-[0_18px_48px_rgba(0,0,0,0.10)]"
            style={{
              borderColor: ink.line,
              fontFamily: SERIF,
            }}
            initial={{ y: 12, scale: 0.97, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 8, scale: 0.99, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div
              className="text-center text-[15px] font-normal tracking-[0.04em] leading-relaxed"
              style={{ color: ink.soft }}
            >
              是否征求对方同意？
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <Pressable
                type="button"
                className="h-[46px] rounded-full text-[14px] tracking-[0.02em] active:opacity-80"
                style={{
                  color: ink.soft,
                  backgroundColor: ink.ghost,
                  border: `1px solid ${ink.line}`,
                }}
                onClick={onAsk}
              >
                温柔询问
              </Pressable>
              <Pressable
                type="button"
                className="h-[46px] rounded-full text-[14px] tracking-[0.02em] text-white shadow-[0_8px_20px_rgba(0,0,0,0.12)] active:opacity-90"
                style={{ backgroundColor: ink.soft }}
                onClick={onSpy}
              >
                偷偷潜入
              </Pressable>
            </div>
            <Pressable
              type="button"
              className="mt-4 w-full text-center text-[13px] tracking-[0.06em] active:opacity-80"
              style={{ color: ink.mute }}
              onClick={onClose}
            >
              取消
            </Pressable>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
