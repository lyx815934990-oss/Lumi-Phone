import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { speakerLabel } from './speakers'
import type { CurtainDiveState, CurtainMessage } from './types'

type LogKind = 'dialogue' | 'narration' | 'wing'

type LogEntry = {
  id: string
  index: number
  kind: LogKind
  name: string | null
  text: string
  isUser: boolean
}

function toLogEntry(
  msg: CurtainMessage,
  index: number,
  dive: CurtainDiveState,
): LogEntry {
  const isWing = msg.isMeta || msg.channel === 'wing'
  const isNarration = msg.role === 'system' || msg.role === 'npc'
  const name = speakerLabel(
    msg,
    dive.partnerName,
    dive.quest.roles.userRole,
    dive.quest.roles.charRole,
  )

  if (isNarration) {
    return { id: msg.id, index, kind: 'narration', name: null, text: msg.content, isUser: false }
  }
  if (isWing) {
    return {
      id: msg.id,
      index,
      kind: 'wing',
      name: msg.role === 'user' ? '你' : dive.partnerName,
      text: msg.content,
      isUser: msg.role === 'user',
    }
  }
  return {
    id: msg.id,
    index,
    kind: 'dialogue',
    name,
    text: msg.content,
    isUser: msg.role === 'user',
  }
}

function LogItem({ item }: { item: LogEntry }) {
  if (item.kind === 'narration') {
    return (
      <div className="px-8 py-1.5 text-center text-[13px] font-light leading-relaxed text-gray-500">
        {item.text}
      </div>
    )
  }
  if (item.kind === 'wing') {
    return (
      <div className="rounded-xl border border-[#E8DDC8]/65 bg-white/70 px-4 py-3">
        <p className="mb-1 text-[11px] tracking-[0.12em] text-[#8B7B62]/80">
          [{item.name || '未署名'}] · 幕间
        </p>
        <p className="font-serif text-[15px] italic leading-relaxed text-[#C5A880]">
          “{item.text}”
        </p>
      </div>
    )
  }
  return (
    <div
      className="rounded-xl border px-4 py-3"
      style={
        item.isUser
          ? { borderColor: '#B9C9E6', background: '#EDF4FF' }
          : { borderColor: '#E7EAEE', background: '#FFFFFF' }
      }
    >
      <p
        className="mb-1 text-xs font-semibold tracking-[0.04em]"
        style={{ color: item.isUser ? '#2F5F9A' : '#1C1C1E' }}
      >
        {item.name || '未署名'}
      </p>
      <p className="text-[15px] leading-relaxed text-[#2B313B]">{item.text}</p>
    </div>
  )
}

type Props = {
  open: boolean
  dive: CurtainDiveState
  /** 兼容旧调用；LOG 打开后滚到底 */
  startIndex?: number
  onClose: () => void
  /** 点某条可跳回主界面该句（可选） */
  onResumeAt: (index: number) => void
}

/**
 * 全屏历史 LOG —— 对齐线下约会剧情 VN「历史」：
 * 半透明遮罩 + 居中圆角面板 + 可滚动台词列表（旁白居中 / 对白卡片 / 幕间斜体）
 */
export function VnReplayOverlay({ open, dive, onClose, onResumeAt }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const entries = dive.messages.map((m, i) => toLogEntry(m, i, dive))

  useEffect(() => {
    if (!open) return
    const el = scrollRef.current
    if (!el) return
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight
    })
  }, [open, entries.length])

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="absolute inset-0 z-[120] flex items-center justify-center bg-black/22 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          onClick={onClose}
        >
          <motion.div
            className="flex h-[78dvh] w-full max-w-[680px] flex-col overflow-hidden rounded-3xl border border-[#DCC9A6] bg-[#F8F8F6] shadow-[0_22px_60px_rgba(0,0,0,0.16)]"
            initial={{ y: 36, opacity: 0.78, scale: 0.985 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 20, opacity: 0.86, scale: 0.99 }}
            transition={{ type: 'spring', stiffness: 240, damping: 30, mass: 0.92 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="relative flex items-center justify-center border-b border-[#E6D9BF] bg-[#F3F1EC] px-4 py-3"
              style={{ paddingTop: 'max(12px, env(safe-area-inset-top, 0px))' }}
            >
              <p className="text-[12px] tracking-[0.45em] text-[#2F3540]">L O G</p>
              <button
                type="button"
                className="absolute right-3 rounded-full border border-[#E1D6BF] bg-[#FCFBF8] p-1.5 text-[#4B5563] transition hover:bg-white"
                onClick={onClose}
                aria-label="关闭历史记录"
              >
                <ChevronDown className="size-4" strokeWidth={1.5} />
              </button>
            </div>

            <div
              ref={scrollRef}
              className="min-h-0 flex-1 space-y-2 overflow-y-auto px-5 py-4 [scrollbar-color:rgba(120,130,145,0.35)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#9CA3AF]/40 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar]:w-1.5"
            >
              {entries.length ? (
                entries.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    className="block w-full text-left"
                    onClick={() => {
                      onResumeAt(entry.index)
                      onClose()
                    }}
                  >
                    <LogItem item={entry} />
                  </button>
                ))
              ) : (
                <p className="py-8 text-center text-[13px] font-light text-[#9CA3AF]">
                  当前还没有可回顾的台词
                </p>
              )}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
