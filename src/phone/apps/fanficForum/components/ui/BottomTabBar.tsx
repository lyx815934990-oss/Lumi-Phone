import { Compass, Home, Mail, User } from 'lucide-react'

import { Pressable } from '../../../../components/Pressable'
import { FORUM_COACH_TARGET_ATTR } from '../../forumCoach'
import { FORUM } from '../../forumTheme'

export type ForumTabId = 'plaza' | 'discover' | 'messages' | 'me'

const TABS: Array<{
  id: ForumTabId
  label: string
  Icon: typeof Home
}> = [
  { id: 'plaza', label: '首页', Icon: Home },
  { id: 'discover', label: '探索', Icon: Compass },
  { id: 'messages', label: '私信', Icon: Mail },
  { id: 'me', label: '个人', Icon: User },
]

export function BottomTabBar({
  active,
  onChange,
  messageBadge,
}: {
  active: ForumTabId
  onChange: (id: ForumTabId) => void
  /** 私信未读角标 */
  messageBadge?: number
}) {
  return (
    <nav
      className="relative shrink-0"
      style={{
        borderTop: `0.5px solid ${FORUM.hairline}`,
        backgroundColor: FORUM.surface2,
        paddingTop: 10,
        paddingBottom: 'calc(14px + env(safe-area-inset-bottom, 0px))',
      }}
      aria-label="同人通讯社导航"
      {...{ [FORUM_COACH_TARGET_ATTR]: 'forum-tabs' }}
    >
      <div className="flex items-end justify-between px-1">
        {TABS.map((t) => (
          <TabItem
            key={t.id}
            {...t}
            active={active === t.id}
            onClick={() => onChange(t.id)}
            badge={t.id === 'messages' ? messageBadge : undefined}
            coachId={t.id === 'messages' ? 'forum-tab-messages' : undefined}
          />
        ))}
      </div>
    </nav>
  )
}

function TabItem({
  label,
  Icon,
  active,
  onClick,
  badge,
  coachId,
}: {
  label: string
  Icon: typeof Home
  active: boolean
  onClick: () => void
  badge?: number
  coachId?: string
}) {
  const color = active ? FORUM.accent : FORUM.textMuted
  return (
    <Pressable
      type="button"
      onClick={onClick}
      className="relative flex min-w-0 flex-1 flex-col items-center gap-0.5 py-0.5"
      aria-current={active ? 'page' : undefined}
      {...(coachId ? { [FORUM_COACH_TARGET_ATTR]: coachId } : {})}
    >
      <span className="relative inline-flex">
        <Icon className="size-[19px]" strokeWidth={active ? 2 : 1.75} color={color} />
        {badge && badge > 0 ? (
          <span
            className="absolute -right-2.5 -top-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full px-1 font-bold"
            style={{ fontSize: 9, backgroundColor: FORUM.accent, color: '#FFFDF8', lineHeight: 1 }}
          >
            {badge > 9 ? '9+' : badge}
          </span>
        ) : null}
      </span>
      <span
        style={{
          fontSize: FORUM.font.tabLabel,
          color: active ? FORUM.text : FORUM.textMuted,
          fontWeight: active ? 700 : 500,
          lineHeight: 1.2,
        }}
      >
        {label}
      </span>
    </Pressable>
  )
}
