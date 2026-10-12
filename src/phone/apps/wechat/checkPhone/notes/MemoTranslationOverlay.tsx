import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft } from 'lucide-react'

import { Pressable } from '../../../../components/Pressable'
import {
  collectMemoTranslationSegments,
  type MemoTranslationSegment,
} from './memoTranslation'
import type { PrivateMemo } from './memoTypes'

function SegmentView({ seg }: { seg: MemoTranslationSegment }) {
  switch (seg.kind) {
    case 'title':
      return <h1 className="text-[28px] leading-[1.25] text-[#141414]">{seg.text}</h1>
    case 'h1':
      return <h2 className="mt-5 text-[24px] leading-[1.3] text-[#1a1a1a]">{seg.text}</h2>
    case 'h2':
      return <h3 className="mt-4 text-[18px] leading-[1.35] text-[#2a2a2a]">{seg.text}</h3>
    case 'voice':
      return (
        <div className="mt-3 rounded-2xl border border-black/10 bg-black/[0.04] px-4 py-3">
          <div className="text-[11px] tracking-[0.08em] text-[#888]">
            语音转写{seg.duration ? ` · ${seg.duration}` : ''}
          </div>
          <p className="mt-1.5 text-[15px] leading-7 text-[#333]">{seg.text}</p>
        </div>
      )
    case 'image':
      return <p className="mt-3 text-[14px] italic leading-7 text-[#666]">{seg.text}</p>
    default:
      return <p className="mt-3 text-[16px] leading-8 text-[#313131]">{seg.text}</p>
  }
}

/** 备忘录整篇译文全屏层 */
export function MemoTranslationOverlay({
  open,
  memo,
  onClose,
}: {
  open: boolean
  memo: PrivateMemo
  onClose: () => void
}) {
  const segments = collectMemoTranslationSegments(memo)

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[1430] flex flex-col bg-[#FCFCFC]"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ type: 'spring', stiffness: 320, damping: 32 }}
          style={{
            paddingTop: 'max(12px, env(safe-area-inset-top, 0px))',
            paddingBottom: 'max(16px, env(safe-area-inset-bottom, 0px))',
          }}
        >
          <div className="flex items-center justify-between border-b border-black/8 px-4 py-3">
            <Pressable
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-black/[0.05] text-[#2c2c2c] active:scale-[0.98]"
              aria-label="关闭翻译"
            >
              <ChevronLeft size={18} />
            </Pressable>
            <div className="text-[12px] tracking-[0.14em] text-[#5c5c5c]">全文翻译</div>
            <div className="w-9" />
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
            {segments.length ? (
              <div className="mx-auto max-w-[520px]">
                {segments.map((seg, i) => (
                  <SegmentView key={`${seg.kind}-${i}`} seg={seg} />
                ))}
              </div>
            ) : (
              <div className="py-16 text-center text-[13px] text-[#999]">暂无译文</div>
            )}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
