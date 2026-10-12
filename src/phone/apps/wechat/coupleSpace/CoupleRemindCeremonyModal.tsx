import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useEffect, useState } from 'react'

import { resolveCharacterAvatarUrl } from '../../../utils/characterAvatarUrl'
import { CoupleBondThread, CoupleFloatParticles } from './CoupleMotionDecor'
import type { CoupleRemindOfferPayload } from './coupleMilestoneRemind'
import {
  dismissCoupleRemind,
} from './coupleMilestoneRemind'
import {
  dismissCoupleRemindPushForToday,
  dismissCoupleRemindPushThisSession,
} from './coupleRemindPushStorage'
import { COUPLE_SPRING, COUPLE_SPRING_SLOW } from './coupleSpaceTypes'
import './coupleSpaceTheme.css'

type Phase = 'veil' | 'pulse' | 'card' | 'leaving'

function MiniAvatar({ url, name }: { url?: string; name: string }) {
  const src =
    resolveCharacterAvatarUrl({ avatarUrl: url }) || url?.trim() || ''
  if (src) {
    return <img src={src} alt="" className="cs-remind-ceremony__avatar" />
  }
  return (
    <span className="cs-remind-ceremony__avatar cs-remind-ceremony__avatar--fallback" aria-hidden>
      {(name.trim() || '?').slice(0, 1)}
    </span>
  )
}

export function CoupleRemindCeremonyModal({
  open,
  payload,
  onClose,
  onOpenCoupleSpace,
}: {
  open: boolean
  payload: CoupleRemindOfferPayload | null
  onClose: () => void
  onOpenCoupleSpace?: () => void
}) {
  const reduce = useReducedMotion()
  const [phase, setPhase] = useState<Phase>('veil')

  useEffect(() => {
    if (!open || !payload) {
      setPhase('veil')
      return
    }
    setPhase('veil')
    if (reduce) {
      setPhase('card')
      return
    }
    const t1 = window.setTimeout(() => setPhase('pulse'), 380)
    const t2 = window.setTimeout(() => setPhase('card'), 1100)
    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
    }
  }, [open, payload, reduce])

  const finishClose = (opts?: { openSpace?: boolean }) => {
    if (!payload) {
      onClose()
      return
    }
    // 预览不写入「今日关闭」，避免挡掉真正的自动提醒
    if (!payload.isTest) {
      dismissCoupleRemindPushThisSession()
      dismissCoupleRemindPushForToday()
      dismissCoupleRemind({
        accountId: payload.accountId,
        characterId: payload.characterId,
        milestoneId: payload.milestoneId,
      })
    }
    if (opts?.openSpace) onOpenCoupleSpace?.()
    onClose()
  }

  const requestClose = (opts?: { openSpace?: boolean }) => {
    if (phase === 'leaving') return
    if (reduce) {
      finishClose(opts)
      return
    }
    setPhase('leaving')
    window.setTimeout(() => finishClose(opts), 420)
  }

  return (
    <AnimatePresence>
      {open && payload ? (
        <motion.div
          key="couple-remind-ceremony"
          className="cs-remind-ceremony couple-space-root"
          role="dialog"
          aria-modal
          aria-label="情侣日子提醒"
          initial={{ opacity: 0 }}
          animate={{ opacity: phase === 'leaving' ? 0 : 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.div
            className="cs-remind-ceremony__veil"
            initial={{ opacity: 0 }}
            animate={{
              opacity: phase === 'leaving' ? 0 : 1,
              backdropFilter: phase === 'leaving' ? 'blur(0px)' : 'blur(14px)',
            }}
            transition={{ duration: 0.5 }}
            onClick={() => requestClose()}
          />

          <CoupleFloatParticles
            count={5}
            delays={[0, 0.8, 1.5, 2.2, 2.9]}
            bottoms={[12, 28, 18, 40, 22]}
            lefts={[12, 30, 55, 72, 88]}
            sizes={[4, 5, 4, 6, 4]}
          />

          <AnimatePresence mode="wait">
            {phase === 'veil' || phase === 'pulse' ? (
              <motion.div
                key="pulse"
                className="cs-remind-ceremony__pulse"
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.08, filter: 'blur(6px)' }}
                transition={COUPLE_SPRING}
              >
                <motion.div
                  className="cs-remind-ceremony__heart-ring"
                  animate={
                    reduce
                      ? undefined
                      : { scale: [1, 1.06, 1], opacity: [0.75, 1, 0.75] }
                  }
                  transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                />
                <CoupleBondThread />
                <p className="cs-remind-ceremony__pulse-label">有个日子，在轻轻敲门</p>
              </motion.div>
            ) : (
              <motion.div
                key="card"
                className="cs-remind-ceremony__card"
                initial={{ opacity: 0, y: 36, scale: 0.92, rotateX: 8 }}
                animate={
                  phase === 'leaving'
                    ? { opacity: 0, y: 24, scale: 0.94, filter: 'blur(4px)' }
                    : { opacity: 1, y: 0, scale: 1, rotateX: 0 }
                }
                exit={{ opacity: 0, y: 20, scale: 0.96 }}
                transition={COUPLE_SPRING_SLOW}
              >
                <p className="cs-remind-ceremony__eyebrow">
                  {payload.isTest ? '提醒预览' : payload.eyebrow}
                </p>

                <div className="cs-remind-ceremony__pair">
                  <MiniAvatar url={payload.userAvatarUrl} name={payload.userName} />
                  <span className="cs-remind-ceremony__pair-heart" aria-hidden>
                    ♡
                  </span>
                  <MiniAvatar url={payload.charAvatarUrl} name={payload.charName} />
                </div>

                <motion.p
                  className="couple-space-title cs-remind-ceremony__title"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.12, ...COUPLE_SPRING }}
                >
                  {payload.title}
                </motion.p>

                <motion.div
                  className="cs-remind-ceremony__days"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2, ...COUPLE_SPRING }}
                >
                  <span className="cs-remind-ceremony__days-num">
                    {payload.daysUntil <= 0 ? '今天' : payload.daysUntil}
                  </span>
                  {payload.daysUntil > 0 ? (
                    <span className="cs-remind-ceremony__days-unit">天后</span>
                  ) : null}
                </motion.div>

                <motion.p
                  className="cs-remind-ceremony__line"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.28, duration: 0.45 }}
                >
                  {payload.line}
                </motion.p>
                <motion.p
                  className="cs-remind-ceremony__soft"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4, duration: 0.5 }}
                >
                  {payload.soft}
                </motion.p>

                <div className="cs-remind-ceremony__actions">
                  <button
                    type="button"
                    className="cs-remind-ceremony__btn cs-remind-ceremony__btn--ghost"
                    onClick={() => requestClose()}
                  >
                    我知道了
                  </button>
                  {onOpenCoupleSpace && !payload.isTest ? (
                    <button
                      type="button"
                      className="cs-remind-ceremony__btn cs-remind-ceremony__btn--primary"
                      onClick={() => requestClose({ openSpace: true })}
                    >
                      去情侣空间看看
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="cs-remind-ceremony__btn cs-remind-ceremony__btn--primary"
                      onClick={() => requestClose()}
                    >
                      收起这份提醒
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
