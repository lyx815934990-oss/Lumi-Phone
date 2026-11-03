import { PenLine } from 'lucide-react'

import { Pressable } from '../../../../components/Pressable'
import { FORUM_COACH_TARGET_ATTR } from '../../forumCoach'
import { FORUM } from '../../forumTheme'

/** 各 Tab 页左下角悬浮投稿 */
export function PublishFab({ onClick }: { onClick: () => void }) {
  return (
    <Pressable
      type="button"
      onClick={onClick}
      className="absolute z-20 flex items-center gap-1.5 rounded-full px-3.5 py-2.5 active:opacity-90"
      style={{
        left: 16,
        bottom: 14,
        backgroundColor: FORUM.accent,
        boxShadow: '0 6px 18px rgba(179, 58, 43, 0.28)',
      }}
      aria-label="投稿"
      {...{ [FORUM_COACH_TARGET_ATTR]: 'forum-publish-fab' }}
    >
      <PenLine className="size-4" strokeWidth={2.25} color="#FFFDF8" />
      <span className="font-bold" style={{ fontSize: 13, color: '#FFFDF8', letterSpacing: '0.02em' }}>
        投稿
      </span>
    </Pressable>
  )
}
