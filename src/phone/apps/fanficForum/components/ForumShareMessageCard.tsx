import { motion } from 'framer-motion'

import type { WeChatForumSharePayload } from '../../wechat/newFriendsPersona/types'
import { FORUM } from '../forumTheme'
import { normalizeForumFicProse } from '../forumAiShared'

const CARD_MOTION = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.38, ease: [0.22, 1, 0.36, 1] as const },
}

type Props = {
  data: WeChatForumSharePayload
  compact?: boolean
  onOpen?: () => void
}

export function ForumShareMessageCard({ data, compact = false, onOpen }: Props) {
  const excerpt = normalizeForumFicProse(data.body).replace(/\s+/g, ' ').trim()
  const clipped = excerpt.length > 88 ? `${excerpt.slice(0, 88)}…` : excerpt
  const totalComments =
    data.totalCommentCount ??
    (data.commentsPreview ?? []).reduce((n, c) => n + 1 + (c.replies?.length ?? 0), 0)
  const statsBits = [
    typeof data.likeCount === 'number' ? `赞 ${data.likeCount}` : '',
    totalComments > 0 ? `评 ${totalComments}` : '',
  ].filter(Boolean)
  const hint = '点击查看同人全文'

  return (
    <motion.button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onOpen?.()
      }}
      aria-label={hint}
      title={hint}
      className={`overflow-hidden rounded-[12px] text-left transition-transform active:scale-[0.98] ${
        compact ? 'w-full' : 'w-[min(280px,calc(100vw-120px))]'
      }`}
      style={{
        backgroundColor: FORUM.surface2,
        border: `0.5px solid ${FORUM.hairline}`,
        borderLeft: `3px solid ${FORUM.accent}`,
        boxShadow: '0 2px 14px rgba(26,26,24,0.04)',
      }}
      {...CARD_MOTION}
    >
      <div className="px-3.5 py-2.5">
        <p
          className="font-semibold uppercase tracking-[0.2em]"
          style={{ fontSize: 9, color: FORUM.textMuted }}
        >
          同人通讯社 · {data.kindLabel}
        </p>
        <p
          className="mt-1.5 font-semibold"
          style={{ fontSize: 14, color: FORUM.text, lineHeight: 1.35 }}
        >
          {data.title}
        </p>
        <p style={{ fontSize: 11, color: FORUM.textMuted, marginTop: 4 }}>
          {data.authorName}
          {statsBits.length ? ` · ${statsBits.join(' · ')}` : ''}
        </p>
        <p
          className="mt-1.5"
          style={{ fontSize: 12, color: FORUM.textSecondary, lineHeight: 1.65 }}
        >
          {clipped}
        </p>
        {onOpen ? (
          <p
            className="mt-2 font-medium"
            style={{ fontSize: 10, color: FORUM.accent, letterSpacing: '0.04em' }}
          >
            点击查看全文 →
          </p>
        ) : null}
      </div>
    </motion.button>
  )
}
