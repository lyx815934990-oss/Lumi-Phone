import { Bell, Compass, Home, Plus, User } from 'lucide-react'

import { Pressable } from '../../../../components/Pressable'
import { FORUM } from '../../forumTheme'

export type ForumTabId = 'plaza' | 'discover' | 'messages' | 'me'

const TABS: Array<{
  id: ForumTabId
  label: string
  Icon: typeof Home
}> = [
  { id: 'plaza', label: '广场', Icon: Home },
  { id: 'discover', label: '发现', Icon: Compass },
  { id: 'messages', label: '消息', Icon: Bell },
  { id: 'me', label: '我的', Icon: User },
]

export function BottomTabBar({
  active,
  onChange,
  onPublish,
}: {
  active: ForumTabId
  onChange: (id: ForumTabId) => void
  onPublish: () => void
}) {
  const left = TABS.slice(0, 2)
  const right = TABS.slice(2)

  return (
    <nav
      className="relative shrink-0"
      style={{
        borderTop: `0.5px solid ${FORUM.hairline}`,
        backgroundColor: FORUM.surface1,
        paddingTop: 12,
        paddingBottom: 'calc(18px + env(safe-area-inset-bottom, 0px))',
      }}
      aria-label="同人论坛导航"
    >
      <div className="relative flex items-end justify-between px-2">
        {left.map((t) => (
          <TabItem key={t.id} {...t} active={active === t.id} onClick={() => onChange(t.id)} />
        ))}

        {/* 中间占位，给悬浮按钮留空 */}
        <div className="w-[42px] shrink-0" aria-hidden />

        {right.map((t) => (
          <TabItem key={t.id} {...t} active={active === t.id} onClick={() => onChange(t.id)} />
        ))}

        <Pressable
          type="button"
          onClick={onPublish}
          className="absolute left-1/2 top-0 flex items-center justify-center rounded-full"
          style={{
            width: 42,
            height: 42,
            marginLeft: -21,
            marginTop: -18,
            backgroundColor: FORUM.accent,
          }}
          aria-label="发布"
        >
          <Plus className="size-5" strokeWidth={2.25} color="#FFFDF8" />
        </Pressable>
      </div>
    </nav>
  )
}

function TabItem({
  label,
  Icon,
  active,
  onClick,
}: {
  label: string
  Icon: typeof Home
  active: boolean
  onClick: () => void
}) {
  const color = active ? FORUM.textAccent : FORUM.textMuted
  return (
    <Pressable
      type="button"
      onClick={onClick}
      className="flex min-w-0 flex-1 flex-col items-center gap-0.5 py-0.5"
      aria-current={active ? 'page' : undefined}
    >
      <Icon className="size-[19px]" strokeWidth={active ? 2 : 1.75} color={color} />
      <span style={{ fontSize: FORUM.font.tabLabel, color, lineHeight: 1.2 }}>{label}</span>
    </Pressable>
  )
}
