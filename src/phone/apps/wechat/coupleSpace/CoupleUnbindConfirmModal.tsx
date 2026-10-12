import { AnimatePresence, motion } from 'framer-motion'

import {
  coupleDaysTogether,
  formatCoupleBoundDateLabel,
  type CoupleSpaceRoom,
} from './coupleSpaceTypes'
import { CoupleFloatParticles } from './CoupleMotionDecor'
import './coupleSpaceTheme.css'

export type CoupleUnbindSharedSummary = {
  daysTogether: number
  diaryCount: number
  milestoneCount: number
  periodCount: number
  userToChar: string
  charToUser: string
  boundLabel: string
}

export function summarizeCoupleRoomForUnbind(
  room: CoupleSpaceRoom | null | undefined,
): CoupleUnbindSharedSummary {
  const binding = room?.binding
  const nick = room?.nicknames
  return {
    daysTogether: binding?.boundAt ? coupleDaysTogether(binding.boundAt) : 0,
    diaryCount: room?.diary?.length ?? 0,
    milestoneCount: room?.milestones?.length ?? 0,
    periodCount: room?.period?.cycles?.length ?? 0,
    userToChar: nick?.userToChar?.trim() || '',
    charToUser: nick?.charToUser?.trim() || '',
    boundLabel: binding?.boundAt ? formatCoupleBoundDateLabel(binding.boundAt) : '',
  }
}

type Props = {
  open: boolean
  charName: string
  userName: string
  userAvatarUrl?: string
  charAvatarUrl?: string
  summary: CoupleUnbindSharedSummary
  onCancel: () => void
  onConfirm: () => void
}

function MiniAvatar({ url, name }: { url?: string; name: string }) {
  if (url?.trim()) {
    return <img src={url.trim()} alt="" className="cs-unbind-avatar" />
  }
  return (
    <span className="cs-unbind-avatar cs-unbind-avatar--fallback" aria-hidden>
      {(name.trim() || '?').slice(0, 1)}
    </span>
  )
}

/** 解绑确认：遗憾氛围，展示将清零的共同数据 */
export function CoupleUnbindConfirmModal({
  open,
  charName,
  userName,
  userAvatarUrl,
  charAvatarUrl,
  summary,
  onCancel,
  onConfirm,
}: Props) {
  const hasNick = !!(summary.userToChar || summary.charToUser)

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="unbind-overlay"
          className="cs-unbind-overlay"
          role="dialog"
          aria-modal
          aria-label="确认解除情侣空间"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.28 }}
        >
          <button type="button" className="cs-unbind-scrim" aria-label="关闭" onClick={onCancel} />
          <motion.div
            className="cs-unbind-card"
            initial={{ opacity: 0, y: 28, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
          >
            <CoupleFloatParticles
              count={3}
              delays={[0, 1.6, 2.8]}
              bottoms={[8, 22, 14]}
              lefts={[16, 48, 78]}
              sizes={[4, 5, 4]}
            />

            <p className="cs-unbind-eyebrow">即将分别</p>
            <div className="cs-unbind-pair">
              <MiniAvatar url={userAvatarUrl} name={userName} />
              <span className="cs-unbind-break" aria-hidden>
                ✦
              </span>
              <MiniAvatar url={charAvatarUrl} name={charName} />
            </div>

            <h2 className="couple-space-title cs-unbind-title">
              要解开与{charName}的羁绊吗？
            </h2>
            <p className="cs-unbind-lead">
              这些日子里留下的痕迹，解绑后都会消散——再也不会回来。
            </p>

            <div className="cs-unbind-stats">
              {summary.boundLabel ? (
                <p className="cs-unbind-stat-line">
                  自 <em>{summary.boundLabel}</em> 起，你们走过了{' '}
                  <em>{summary.daysTogether}</em> 天
                </p>
              ) : (
                <p className="cs-unbind-stat-line">
                  你们一起度过了 <em>{summary.daysTogether}</em> 天
                </p>
              )}
              <ul className="cs-unbind-stat-list">
                <li>
                  <span>共写日记</span>
                  <strong>{summary.diaryCount} 篇</strong>
                </li>
                <li>
                  <span>纪念日历</span>
                  <strong>{summary.milestoneCount} 个</strong>
                </li>
                <li>
                  <span>经期记录</span>
                  <strong>{summary.periodCount} 条</strong>
                </li>
                {hasNick ? (
                  <li className="cs-unbind-stat-list--nick">
                    <span>专属称呼</span>
                    <strong>
                      {[
                        summary.userToChar ? `你曾叫对方「${summary.userToChar}」` : '',
                        summary.charToUser ? `对方曾叫你「${summary.charToUser}」` : '',
                      ]
                        .filter(Boolean)
                        .join(' · ') || '已留下'}
                    </strong>
                  </li>
                ) : (
                  <li>
                    <span>专属称呼</span>
                    <strong>尚未留下</strong>
                  </li>
                )}
              </ul>
              <p className="cs-unbind-wipe">解绑后，以上共同数据将全部清零，无法找回。</p>
            </div>

            <div className="cs-unbind-actions">
              <button type="button" className="cs-unbind-btn cs-unbind-btn--stay" onClick={onCancel}>
                再想想
              </button>
              <button
                type="button"
                className="cs-unbind-btn cs-unbind-btn--leave"
                onClick={onConfirm}
              >
                确认解绑
              </button>
            </div>
            <p className="cs-unbind-footnote">分别之后，空间会回到最初的空白。</p>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
