import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useCallback, useEffect, useState } from 'react'

import type { CoupleSpaceInviteOutcome } from './coupleSpaceInviteAi'
import { getCoupleSpaceOutcomePanelCopy, isCoupleSpaceAcceptOutcome } from './coupleSpaceInviteAi'
import { COUPLE_SPRING, COUPLE_SPRING_SLOW, formatCoupleBoundDateLabel } from './coupleSpaceTypes'
import './coupleSpaceTheme.css'

type Phase = 'seal' | 'unfold' | 'names' | 'done'

function AvatarCircle({
  url,
  name,
  side,
}: {
  url?: string
  name: string
  side: 'user' | 'char'
}) {
  const initial = (name.trim() || '?').slice(0, 1)
  return (
    <div className="flex flex-col items-center gap-1.5">
      {url?.trim() ? (
        <img
          src={url.trim()}
          alt=""
          className="h-12 w-12 rounded-full object-cover shadow-sm"
          style={{
            border: '2px solid color-mix(in oklab, var(--cs-gold) 55%, white)',
          }}
        />
      ) : (
        <div
          className="flex h-12 w-12 items-center justify-center rounded-full text-[15px] text-white"
          style={{
            background:
              side === 'user'
                ? 'linear-gradient(145deg, #d4a5ad, #c4a574)'
                : 'linear-gradient(145deg, #b89bc8, #d4a5ad)',
            border: '2px solid color-mix(in oklab, var(--cs-gold) 55%, white)',
          }}
          aria-hidden
        >
          {initial}
        </div>
      )}
      <span className="couple-space-title max-w-[96px] truncate text-center text-[13px] text-[color:var(--cs-ink)]">
        {name}
      </span>
    </div>
  )
}

/** 角色主动邀约、用户点接受时用：不展示四档「接受程度」玩笑文案 */
export const COUPLE_SPACE_USER_ACCEPTED_PANEL_COPY =
  '印章已落。从这一刻起，你们共享同一片情侣空间。'

export function CoupleContractReveal({
  open,
  userName,
  charName,
  userAvatarUrl,
  charAvatarUrl,
  outcome = 'full_accept',
  panelCopyOverride,
  boundAt,
  onFinished,
}: {
  open: boolean
  userName: string
  charName: string
  userAvatarUrl?: string
  charAvatarUrl?: string
  /** 四档结果；面板展示固定有趣文案，不用口语原文 */
  outcome?: CoupleSpaceInviteOutcome
  /** 覆盖四档程度文案（如角色发来的邀约，用户接受后不展示「完全接受」等） */
  panelCopyOverride?: string
  boundAt: number
  onFinished: () => void
}) {
  const reduce = useReducedMotion()
  const [phase, setPhase] = useState<Phase>('seal')
  const [breaking, setBreaking] = useState(false)
  const panelCopy = panelCopyOverride?.trim() || getCoupleSpaceOutcomePanelCopy(outcome)
  const accepted = isCoupleSpaceAcceptOutcome(outcome)

  useEffect(() => {
    if (!open) {
      setPhase('seal')
      setBreaking(false)
    }
  }, [open])

  const breakSeal = useCallback(() => {
    if (breaking) return
    setBreaking(true)
    const t = window.setTimeout(
      () => {
        setPhase('unfold')
        window.setTimeout(() => setPhase('names'), reduce ? 200 : 900)
      },
      reduce ? 120 : 520,
    )
    return () => window.clearTimeout(t)
  }, [breaking, reduce])

  if (!open) return null

  return (
    <div className="couple-contract-overlay couple-space-root" role="dialog" aria-label="情侣契约揭晓">
      <AnimatePresence mode="wait">
        {phase === 'seal' ? (
          <motion.div
            key="seal"
            className="flex flex-col items-center gap-5 px-6"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={COUPLE_SPRING}
          >
            <p className="couple-space-title text-center text-[15px] text-[color:var(--cs-cream)]">
              轻触蜡封 · 揭开契约
            </p>
            <motion.button
              type="button"
              className="couple-contract-seal"
              onClick={breakSeal}
              animate={
                breaking
                  ? { scale: [1, 1.08, 0.2], opacity: [1, 1, 0], rotate: [0, -8, 12] }
                  : { scale: [1, 1.03, 1] }
              }
              transition={
                breaking
                  ? { duration: 0.48, ease: [0.22, 1, 0.36, 1] }
                  : { duration: 2.4, repeat: Infinity, ease: 'easeInOut' }
              }
              aria-label="揭开蜡封"
            >
              契
            </motion.button>
          </motion.div>
        ) : (
          <motion.div
            key="cert"
            className="couple-space-paper couple-space-lace-frame mx-5 w-full max-w-[320px] rounded-[18px] px-5 py-6"
            initial={{ opacity: 0, y: 28, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={COUPLE_SPRING_SLOW}
          >
            <p className="couple-space-title text-center text-[18px] text-[color:var(--cs-ink)]">
              情侣契约
            </p>
            <div className="couple-space-gold-line my-3" />
            <p className="text-center text-[11px] tracking-[0.14em] text-[color:var(--cs-ink-muted)]">
              {formatCoupleBoundDateLabel(boundAt)}
            </p>

            <div className="mt-5 flex items-start justify-center gap-4">
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: phase === 'names' || phase === 'done' ? 1 : 0, y: 0 }}
                transition={{ ...COUPLE_SPRING_SLOW, delay: 0.05 }}
              >
                <AvatarCircle url={userAvatarUrl} name={userName} side="user" />
              </motion.div>
              <motion.span
                className="mt-4 text-[14px] text-[color:var(--cs-gold)]"
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: phase === 'names' || phase === 'done' ? 1 : 0, scale: 1 }}
                transition={{ ...COUPLE_SPRING, delay: 0.2 }}
              >
                ♡
              </motion.span>
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: phase === 'names' || phase === 'done' ? 1 : 0, y: 0 }}
                transition={{ ...COUPLE_SPRING_SLOW, delay: 0.12 }}
              >
                <AvatarCircle url={charAvatarUrl} name={charName} side="char" />
              </motion.div>
            </div>

            <motion.blockquote
              className="mt-5 rounded-xl bg-white/50 px-3 py-3 text-center text-[12px] leading-relaxed text-[color:var(--cs-ink-muted)]"
              initial={{ opacity: 0 }}
              animate={{ opacity: phase === 'names' || phase === 'done' ? 1 : 0 }}
              transition={{ delay: 0.35, duration: 0.6 }}
            >
              「{panelCopy}」
            </motion.blockquote>

            <motion.button
              type="button"
              className="mt-6 w-full rounded-full py-2.5 text-[13px] text-white"
              style={{
                background: accepted
                  ? 'linear-gradient(135deg, #d4a5ad 0%, #b89bc8 55%, #c4a574 100%)'
                  : 'linear-gradient(135deg, #c4b4a8 0%, #a89890 100%)',
              }}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: phase === 'names' || phase === 'done' ? 1 : 0, y: 0 }}
              transition={{ ...COUPLE_SPRING, delay: 0.45 }}
              onClick={() => {
                setPhase('done')
                onFinished()
              }}
            >
              {accepted ? '进入情侣空间' : '知道了'}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
