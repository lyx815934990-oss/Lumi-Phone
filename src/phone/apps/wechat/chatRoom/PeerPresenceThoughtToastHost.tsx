import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { WeChatChatMixedText } from '../WeChatChatMixedText'
import {
  PEER_PRESENCE_THOUGHT_TOAST_EVENT,
  type PeerPresenceThoughtToastDetail,
} from './peerPresenceThoughtStorage'

const AUTO_DISMISS_MS = 2400

/** 角色公开想法更新时的柔和提示（轻量、不打断） */
export function PeerPresenceThoughtToastHost() {
  const [detail, setDetail] = useState<PeerPresenceThoughtToastDetail | null>(null)
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    const onToast = (e: Event) => {
      const d = (e as CustomEvent<PeerPresenceThoughtToastDetail>).detail
      if (!d?.characterId?.trim()) return
      if (!(d.thoughtText?.trim() || d.thoughtEmoji?.trim())) return
      if (timerRef.current != null) window.clearTimeout(timerRef.current)
      setDetail(d)
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null
        setDetail(null)
      }, AUTO_DISMISS_MS)
    }
    window.addEventListener(PEER_PRESENCE_THOUGHT_TOAST_EVENT, onToast as EventListener)
    return () => {
      window.removeEventListener(PEER_PRESENCE_THOUGHT_TOAST_EVENT, onToast as EventListener)
      if (timerRef.current != null) window.clearTimeout(timerRef.current)
    }
  }, [])

  if (typeof document === 'undefined') return null

  const name = detail?.displayName?.trim() || '对方'
  const thoughtLine = [detail?.thoughtEmoji, detail?.thoughtText].filter(Boolean).join(' ').trim()

  return createPortal(
    <AnimatePresence>
      {detail ? (
        <motion.div
          key={`peer-thought-toast-${detail.characterId}-${detail.thoughtText}-${detail.thoughtEmoji}`}
          role="status"
          aria-live="polite"
          className="pointer-events-none fixed inset-x-0 top-[18%] z-[10050] flex justify-center px-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            className="max-w-[min(100vw-2.5rem,300px)] rounded-full border border-white/70 bg-white/78 px-4 py-2.5 text-center shadow-[0_10px_36px_rgba(16,16,18,0.10)] backdrop-blur-[18px]"
          >
            <p className="text-[13px] font-medium leading-snug text-[#1c1c1e]">
              {name}更新了状态和想法
            </p>
            {thoughtLine ? (
              <p className="mt-1 truncate text-[12px] leading-snug text-[#8e8e93]">
                <WeChatChatMixedText text={thoughtLine} />
              </p>
            ) : null}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  )
}
