import { motion } from 'framer-motion'

import type { WeChatCoupleSpaceInvitePayload } from '../newFriendsPersona/types'
import { coupleSpaceOutcomeLabel } from './coupleSpaceInviteAi'
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
  onOpenSpace?: () => void
}

/** 用户发出的情侣空间绑定邀约卡（乙女风专属气泡） */
export function CoupleSpaceInviteSentCard({ data, peerName, onOpenSpace }: Props) {
  const status = data.charResponded
  const outcome = data.outcome
  const accepted = status === 'accepted' || outcome === 'full_accept' || outcome === 'reluctant_accept'
  const declined = status === 'declined' || outcome === 'soft_reject' || outcome === 'hard_reject'
  const canOpen = accepted && !!onOpenSpace

  const statusText = outcome
    ? peerName?.trim()
      ? `${peerName.trim()} · ${coupleSpaceOutcomeLabel(outcome)}`
      : coupleSpaceOutcomeLabel(outcome)
    : accepted
      ? peerName?.trim()
        ? `${peerName.trim()} 已接受邀请`
        : '对方已接受邀请'
      : declined
        ? peerName?.trim()
          ? `${peerName.trim()} 已婉拒`
          : '对方已婉拒'
        : '等待对方回应…'

  const ctaText = accepted
    ? canOpen
      ? '点击进入情侣空间 →'
      : '已开通情侣空间'
    : declined
      ? outcome === 'hard_reject'
        ? '这次邀约彻底没戏'
        : '这次邀约没有达成'
      : '已送出专属邀约'

  const cardClass = [
    'couple-invite-card',
    accepted ? 'couple-invite-card--accepted' : '',
    declined ? 'couple-invite-card--declined' : '',
    canOpen ? 'couple-invite-card--tappable' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const body = (
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
      <p className="couple-space-title couple-invite-card__title">
        {data.title?.trim() || '开通我们的情侣空间'}
      </p>
      <p className="couple-invite-card__subtitle">
        {data.subtitle?.trim() || '一起写日记 · 记纪念日 · 留专属称呼'}
      </p>

      <div className="couple-invite-card__divider" aria-hidden />

      <p
        className={`couple-invite-card__status ${
          accepted
            ? 'couple-invite-card__status--ok'
            : declined
              ? 'couple-invite-card__status--no'
              : ''
        }`}
      >
        {statusText}
      </p>
      <p
        className={`couple-invite-card__cta ${
          canOpen ? 'couple-invite-card__cta--active' : ''
        }`}
      >
        {ctaText}
      </p>
    </>
  )

  if (canOpen) {
    return (
      <motion.button
        type="button"
        className={cardClass}
        onClick={onOpenSpace}
        {...CARD_MOTION}
      >
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
