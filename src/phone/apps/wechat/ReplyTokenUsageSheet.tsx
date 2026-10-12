import { useMemo, useSyncExternalStore } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'

import { TokenUsagePanel } from './MemoryTraceModal'
import { getLastMemoryTrace, subscribeLastMemoryTrace } from './memoryTraceStore'
import {
  getReplyTokenFabState,
  hideReplyTokenFab,
  requestOpenChatSettingsReply,
  requestOpenFullMemoryTrace,
  setReplyTokenPanelOpen,
  subscribeReplyTokenFab,
} from './replyTokenFabStore'
import { Pressable } from '../../components/Pressable'

const SHEET_SPRING = { type: 'spring' as const, damping: 38, stiffness: 380 }

export function ReplyTokenUsageSheet() {
  const fab = useSyncExternalStore(subscribeReplyTokenFab, getReplyTokenFabState, getReplyTokenFabState)
  const trace = useSyncExternalStore(subscribeLastMemoryTrace, getLastMemoryTrace, getLastMemoryTrace)

  const open = fab.panelOpen
  const usage = trace?.tokenUsage ?? null
  const charName = trace?.charName?.trim() || ''
  const peerLabel = fab.peerLabel.trim()
  const nameMismatch = useMemo(() => {
    if (!charName || !peerLabel) return false
    const a = charName.toLowerCase()
    const b = peerLabel.toLowerCase()
    return a !== b && !a.includes(b) && !b.includes(a)
  }, [charName, peerLabel])

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="reply-token-sheet"
          className="absolute inset-0 z-[260] flex flex-col justify-end"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
        >
          <button
            type="button"
            aria-label="关闭"
            className="absolute inset-0 bg-black/35"
            onClick={() => setReplyTokenPanelOpen(false)}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={SHEET_SPRING}
            className="relative z-[1] flex max-h-[min(78vh,640px)] flex-col rounded-t-3xl bg-[#F7F8FA] shadow-[0_-8px_32px_rgba(0,0,0,0.12)]"
          >
            <div className="flex shrink-0 items-start justify-between gap-3 px-4 pb-2 pt-3.5">
              <div className="min-w-0">
                <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-neutral-400">
                  Reply Token
                </p>
                <h2 className="mt-0.5 text-[17px] font-semibold tracking-tight text-[#1C1C1E]">
                  回复用量
                </h2>
                {charName ? (
                  <p className="mt-0.5 text-[12px] text-neutral-500">
                    {charName}
                    {nameMismatch ? (
                      <span className="text-neutral-400"> · 以下为最近一轮回复用量</span>
                    ) : null}
                  </p>
                ) : peerLabel ? (
                  <p className="mt-0.5 text-[12px] text-neutral-500">{peerLabel}</p>
                ) : null}
              </div>
              <Pressable
                type="button"
                aria-label="关闭面板"
                onClick={() => setReplyTokenPanelOpen(false)}
                className="flex size-8 shrink-0 items-center justify-center rounded-full bg-neutral-200/70 text-neutral-600 active:bg-neutral-300/80"
              >
                <X size={18} strokeWidth={2} aria-hidden />
              </Pressable>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-3 [scrollbar-width:thin]">
              {usage ? (
                <TokenUsagePanel usage={usage} />
              ) : (
                <div className="rounded-2xl border border-neutral-100 bg-white px-4 py-6 text-center shadow-sm">
                  <p className="text-[14px] font-medium text-neutral-800">尚无回复用量</p>
                  <p className="mt-1.5 text-[12px] leading-relaxed text-neutral-500">
                    本会话尚无回复用量记录，先聊一轮后再查看。
                  </p>
                </div>
              )}
            </div>

            <div className="shrink-0 space-y-2 border-t border-neutral-200/80 bg-[#F7F8FA] px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3">
              <p className="text-[11px] leading-relaxed text-neutral-500">
                板块按当轮真实 system 全文拆开；差额仅为分词差。可关思维链、调近端注入等见「聊天设置 → 回复」。
              </p>
              <Pressable
                type="button"
                onClick={() => requestOpenChatSettingsReply()}
                className="flex w-full items-center justify-center rounded-xl bg-[#1C1C1E] px-3 py-2.5 text-[14px] font-medium text-white active:opacity-90"
              >
                去关闭相关注入
              </Pressable>
              <div className="flex gap-2">
                <Pressable
                  type="button"
                  onClick={() => requestOpenFullMemoryTrace()}
                  className="flex flex-1 items-center justify-center rounded-xl bg-white px-3 py-2 text-[13px] font-medium text-neutral-700 ring-1 ring-neutral-200 active:bg-neutral-50"
                >
                  完整思维溯源
                </Pressable>
                <Pressable
                  type="button"
                  onClick={() => hideReplyTokenFab()}
                  className="flex flex-1 items-center justify-center rounded-xl bg-white px-3 py-2 text-[13px] font-medium text-neutral-700 ring-1 ring-neutral-200 active:bg-neutral-50"
                >
                  收起悬浮钮
                </Pressable>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
