import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'

import type { WeChatCoupleSpaceInvitePayload } from '../newFriendsPersona/types'
import { CoupleBondRingsIcon, CoupleFloatParticles } from './CoupleMotionDecor'
import './coupleSpaceTheme.css'

const CARD_MOTION = {
  initial: { opacity: 0, y: 10, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const },
}

type Props = {
  data: WeChatCoupleSpaceInvitePayload
  peerName?: string
  busy?: boolean
  onAccept: () => void
  onDecline: () => void
  onOpenSpace?: () => void
}

/** 角色发来的情侣空间绑定邀约卡（与用户发出的邀约卡同款乙女风，可点接受/拒绝） */
export function CoupleSpaceCharacterInviteReceivedCard({
  data,
  peerName,
  busy = false,
  onAccept,
  onDecline,
  onOpenSpace,
}: Props) {
  const [panelOpen, setPanelOpen] = useState(false)
  const responded = data.userResponded
  const accepted = responded === 'accepted'
  const declined = responded === 'declined'
  const canOpen = accepted && !!onOpenSpace
  const name = peerName?.trim() || '对方'
  const title = data.title?.trim() || '开通我们的情侣空间'
  // 邀约卡只展示标题/副标题氛围文案；收束语 replyText 不进卡面（避免像「接受程度」说明）
  const subtitle = data.subtitle?.trim() || '一起写日记 · 记纪念日 · 留专属称呼'

  const openPanel = () => {
    if (responded || busy) return
    setPanelOpen(true)
  }

  const cardClass = [
    'couple-invite-card',
    'couple-invite-card--incoming',
    accepted ? 'couple-invite-card--accepted' : '',
    declined ? 'couple-invite-card--declined' : '',
    canOpen ? 'couple-invite-card--tappable' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const bodyCore = (
    <>
      <CoupleFloatParticles
        count={3}
        delays={[0, 1.5, 2.8]}
        bottoms={[10, 18, 8]}
        lefts={[22, 48, 72]}
        sizes={[4, 5, 4]}
      />

      <div className="couple-invite-card__badge-wrap">
        <span className="couple-invite-card__glow cs-glow-pulse" aria-hidden />
        <span className="couple-invite-card__badge">
          <CoupleBondRingsIcon size={22} />
        </span>
      </div>

      <p className="couple-invite-card__eyebrow">情侣空间邀请</p>
      <p className="couple-space-title couple-invite-card__title">{title}</p>
      <p className="couple-invite-card__subtitle">{subtitle}</p>

      <div className="couple-invite-card__divider" aria-hidden />
    </>
  )

  if (accepted) {
    const body = (
      <>
        {bodyCore}
        <p className="couple-invite-card__status couple-invite-card__status--ok">空间已开通</p>
        <p className={`couple-invite-card__cta ${canOpen ? 'couple-invite-card__cta--active' : ''}`}>
          {canOpen ? '点击进入情侣空间 →' : '已开通情侣空间'}
        </p>
      </>
    )
    if (canOpen) {
      return (
        <motion.button type="button" className={cardClass} onClick={onOpenSpace} {...CARD_MOTION}>
          {body}
        </motion.button>
      )
    }
    return (
      <motion.div className={cardClass} {...CARD_MOTION}>
        {body}
      </motion.div>
    )
  }

  if (declined) {
    return (
      <motion.div className={cardClass} {...CARD_MOTION}>
        {bodyCore}
        <p className="couple-invite-card__status couple-invite-card__status--no">已拒绝邀请</p>
        <p className="couple-invite-card__cta">之后还可以再约</p>
      </motion.div>
    )
  }

  return (
    <motion.div className={cardClass} {...CARD_MOTION}>
      <button
        type="button"
        className="w-full border-0 bg-transparent p-0 text-inherit disabled:opacity-60"
        onClick={openPanel}
        disabled={busy}
        aria-expanded={panelOpen}
      >
        {bodyCore}
        <p className="couple-invite-card__status">
          {name} 想和你开通情侣空间{!panelOpen ? ' · 轻触选择' : ''}
        </p>
        <p className="couple-invite-card__cta">等待你的回应</p>
      </button>

      <AnimatePresence>
        {panelOpen ? (
          <motion.div
            key="panel"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="couple-invite-card__action-panel"
          >
            <div className="flex items-center justify-between px-1">
              <p className="text-[11px] font-medium text-[#B99A8E]">开通情侣空间？</p>
              <button
                type="button"
                className="rounded-full p-1 text-[#C9A99C] hover:bg-[#FBEFEA] hover:text-[#4A3A35]"
                aria-label="收起"
                onClick={() => setPanelOpen(false)}
              >
                <X className="size-3.5" />
              </button>
            </div>
            <div className="mt-2 flex gap-2 px-0.5 pb-1">
              <button
                type="button"
                className="flex-1 rounded-full border border-[#F0DDD4] bg-white px-3 py-2 text-[13px] font-medium text-[#B99A8E] shadow-sm transition hover:bg-[#FDF8F5] disabled:opacity-50"
                disabled={busy}
                onClick={() => {
                  setPanelOpen(false)
                  onDecline()
                }}
              >
                拒绝
              </button>
              <button
                type="button"
                className="flex-1 rounded-full px-3 py-2 text-[13px] font-medium text-white shadow-[0_4px_14px_rgba(217,156,144,0.35)] transition disabled:opacity-50"
                style={{ background: 'linear-gradient(90deg, #E8B4A8, #D99C90)' }}
                disabled={busy}
                onClick={() => {
                  setPanelOpen(false)
                  onAccept()
                }}
              >
                接受
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.div>
  )
}
