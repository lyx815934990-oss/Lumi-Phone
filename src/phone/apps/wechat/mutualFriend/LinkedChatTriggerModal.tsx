import { AnimatePresence, motion } from 'framer-motion'
import { MessagesSquare, X } from 'lucide-react'
import { createPortal } from 'react-dom'
import { Pressable } from '../../../components/Pressable'
import { formatLinkedChatNoticeSentence, type LinkedChatNotice } from './linkedChatNotice'

const ink = {
  page: '#f4f4f4',
  surface: '#fafafa',
  card: '#ffffff',
  line: 'rgba(0,0,0,0.06)',
  title: '#1a1a1a',
  body: '#5c5c5c',
  mute: '#9a9a9a',
  iconBg: '#efefef',
  iconFg: '#6a6a6a',
  softBg: '#f3f3f3',
  btn: '#2a2a2a',
  btnText: '#f7f7f7',
  scrim: 'rgba(0,0,0,0.38)',
} as const

export function LinkedChatTriggerModal({
  notice,
  onClose,
}: {
  notice: LinkedChatNotice | null
  onClose: () => void
}) {
  if (typeof document === 'undefined') return null

  const fromName = notice?.fromDisplayName?.trim() || '对方'
  const toName =
    notice?.variant === 'message_you' ? '你' : notice?.toDisplayName?.trim() || '对方'
  const reason = notice?.reason?.trim() || '有事想聊聊'

  return createPortal(
    <AnimatePresence>
      {notice ? (
        <motion.div
          key="linked-chat-trigger"
          role="dialog"
          aria-modal="true"
          aria-labelledby="linked-chat-trigger-title"
          className="fixed inset-0 flex items-center justify-center px-6"
          style={{ zIndex: 58000, background: ink.scrim }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            className="w-full max-w-[340px] overflow-hidden rounded-[22px]"
            style={{
              background: ink.page,
              boxShadow: '0 18px 48px rgba(0,0,0,0.16)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="flex items-start justify-between gap-3 px-5 pb-3 pt-4"
              style={{ background: ink.surface, borderBottom: `1px solid ${ink.line}` }}
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <span
                  className="flex size-8 shrink-0 items-center justify-center rounded-full"
                  style={{ background: ink.iconBg, color: ink.iconFg }}
                >
                  <MessagesSquare className="size-4" strokeWidth={1.75} aria-hidden />
                </span>
                <div className="min-w-0">
                  <p
                    id="linked-chat-trigger-title"
                    className="text-[16px] font-semibold tracking-tight"
                    style={{ color: ink.title }}
                  >
                    联动进行中
                  </p>
                  <p className="mt-0.5 text-[11px]" style={{ color: ink.mute }}>
                    人脉角色正在线上互通
                  </p>
                </div>
              </div>
              <Pressable
                type="button"
                onClick={onClose}
                className="flex size-8 shrink-0 items-center justify-center rounded-full active:opacity-80"
                style={{ background: ink.iconBg, color: ink.iconFg }}
                aria-label="关闭"
              >
                <X className="size-[15px]" strokeWidth={1.75} aria-hidden />
              </Pressable>
            </div>

            <div className="space-y-3 px-5 py-4">
              <div
                className="rounded-[16px] px-4 py-3.5"
                style={{ background: ink.card, border: `1px solid ${ink.line}` }}
              >
                <p className="text-[15px] font-semibold leading-snug" style={{ color: ink.title }}>
                  {fromName}
                </p>
                <p className="mt-2 text-[12px]" style={{ color: ink.mute }}>
                  因为
                </p>
                <p
                  className="mt-1 text-[13.5px] leading-[1.7]"
                  style={{ color: ink.body, wordBreak: 'break-word' }}
                >
                  {reason}
                </p>
                <div className="my-3 h-px" style={{ background: ink.line }} />
                <p className="text-[13.5px] leading-[1.7]" style={{ color: ink.body }}>
                  正在找{' '}
                  <span className="font-semibold" style={{ color: ink.title }}>
                    {toName}
                  </span>{' '}
                  线上聊天
                </p>
              </div>
              <p className="sr-only">{formatLinkedChatNoticeSentence(notice)}</p>
              <div
                className="rounded-[14px] px-3.5 py-3 text-[12px] leading-relaxed"
                style={{ background: ink.softBg, color: ink.mute }}
              >
                这不会打断你当前的聊天；相关消息稍后会出现在对应会话里。
              </div>
            </div>

            <div
              className="px-5 py-4"
              style={{ background: ink.surface, borderTop: `1px solid ${ink.line}` }}
            >
              <Pressable
                type="button"
                onClick={onClose}
                className="w-full rounded-full py-3 text-[15px] font-semibold tracking-wide active:opacity-88"
                style={{ background: ink.btn, color: ink.btnText }}
              >
                知道了
              </Pressable>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  )
}
