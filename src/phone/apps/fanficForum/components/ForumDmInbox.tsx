import { useMemo, useState } from 'react'
import { Heart, MessageCircle } from 'lucide-react'

import { FORUM } from '../forumTheme'
import {
  FORUM_SAMPLE_DMS,
  FORUM_SAMPLE_NOTIFS,
  forumItemUnreadCount,
  type ForumNotifItem,
} from '../forumDmSample'
import {
  selectForumInboxBadge,
  useForumInboxUnreadStore,
  withDmReadState,
  withNotifReadState,
} from '../forumInboxUnreadStore'
import { getNetizenPersona } from '../netizenPersonas'
import { personaAvatarResolved } from '../personaAvatar'
import { getResidentWriter } from '../residentWriters'
import { ForumAvatar } from './ui'

type Seg = 'dm' | 'notif'

export type ForumInboxPostRef = {
  postId: string
  characterId: string
  title: string
}

type BoundNotif = ForumNotifItem & {
  /** 已解析到的真实帖；有则点击直达帖子详情 */
  linkedPost?: ForumInboxPostRef
}

function resolvePerson(id: string) {
  const writer = getResidentWriter(id)
  if (writer) {
    return {
      id: writer.id,
      name: writer.username,
      imageUrl: personaAvatarResolved(writer.id, writer.username),
    }
  }
  const nz = getNetizenPersona(id)
  return {
    id,
    name: nz?.username ?? '网友',
    imageUrl: personaAvatarResolved(id, nz?.username ?? '网友'),
  }
}

function bindNotifsToPosts(posts: ForumInboxPostRef[]): BoundNotif[] {
  if (posts.length === 0) {
    return FORUM_SAMPLE_NOTIFS.map((n) => ({ ...n }))
  }
  return FORUM_SAMPLE_NOTIFS.map((n, i) => {
    const byTitle =
      posts.find((p) => {
        const a = p.title.trim()
        const b = n.postTitle.trim()
        return a === b || a.includes(b) || b.includes(a)
      }) ?? null
    const linked = byTitle ?? posts[i % posts.length]!
    const title = linked.title
    return {
      ...n,
      postTitle: title,
      text: n.text.replace(/《[^》]+》/g, `《${title}》`),
      linkedPost: linked,
    }
  })
}

export function ForumDmInbox({
  onOpenDm,
  onOpenNotif,
  posts = [],
}: {
  onOpenDm: (dmId: string) => void
  /** 互动 → 解析并打开对应帖子详情（不再进互动详情页） */
  onOpenNotif: (notifId: string) => void
  posts?: ForumInboxPostRef[]
}) {
  const [seg, setSeg] = useState<Seg>('dm')
  const readDmIds = useForumInboxUnreadStore((s) => s.readDmIds)
  const readNotifIds = useForumInboxUnreadStore((s) => s.readNotifIds)
  const markDmRead = useForumInboxUnreadStore((s) => s.markDmRead)
  const markNotifRead = useForumInboxUnreadStore((s) => s.markNotifRead)

  const dmItems = useMemo(
    () => FORUM_SAMPLE_DMS.map((d) => withDmReadState(d, readDmIds)),
    [readDmIds],
  )
  const dmUnread = dmItems.reduce((n, d) => n + forumItemUnreadCount(d), 0)

  const boundNotifs = useMemo(() => {
    return bindNotifsToPosts(posts).map((n) => withNotifReadState(n, readNotifIds))
  }, [posts, readNotifIds])
  const notifUnread = boundNotifs.reduce((n, it) => n + forumItemUnreadCount(it), 0)

  return (
    <div
      className="flex h-full min-h-0 flex-col"
      style={{ paddingLeft: FORUM.pagePadX, paddingRight: FORUM.pagePadX, paddingTop: 10 }}
    >
      <p className="font-semibold tracking-[0.12em]" style={{ fontSize: 10, color: FORUM.accent }}>
        消息中心
      </p>
      <h1 className="font-semibold" style={{ fontSize: FORUM.font.pageTitle, color: FORUM.text, marginTop: 2 }}>
        私信
      </h1>
      <p className="mt-1" style={{ fontSize: 12.5, color: FORUM.textSecondary, lineHeight: 1.55 }}>
        网友私信 · 帖评互动通知
      </p>

      <div
        className="mt-3 flex rounded-[10px] p-0.5"
        style={{ backgroundColor: FORUM.bgAccent, border: `1px solid ${FORUM.hairline}` }}
      >
        {(
          [
            {
              id: 'dm' as const,
              label: dmUnread > 0 ? `私信 · ${dmUnread}` : `私信 · ${dmItems.length}`,
            },
            {
              id: 'notif' as const,
              label: notifUnread > 0 ? `互动 · ${notifUnread}` : `互动 · ${boundNotifs.length}`,
            },
          ] as const
        ).map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSeg(s.id)}
            className="flex-1 rounded-lg py-1.5 text-[12px] active:opacity-80"
            style={{
              fontWeight: seg === s.id ? 700 : 500,
              backgroundColor: seg === s.id ? FORUM.surface2 : 'transparent',
              color: seg === s.id ? FORUM.text : FORUM.textMuted,
              outline: seg === s.id ? `1px solid ${FORUM.hairline}` : 'none',
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pt-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {seg === 'dm'
          ? dmItems.length === 0
            ? (
                <p
                  className="px-1 pt-8 text-center"
                  style={{ fontSize: 13, color: FORUM.textMuted, lineHeight: 1.7 }}
                >
                  暂无私信
                  <br />
                  <span style={{ fontSize: 12 }}>写手约稿私信接入后会显示在这里</span>
                </p>
              )
            : dmItems.map((d) => {
              const from = resolvePerson(d.fromId)
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => {
                    markDmRead(d.id)
                    onOpenDm(d.id)
                  }}
                  className="mb-2 flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-left active:opacity-85"
                  style={{
                    backgroundColor: FORUM.surface2,
                    border: `1px solid ${d.unread ? FORUM.accent : FORUM.hairline}`,
                  }}
                >
                  <ForumAvatar size={40} name={from.name} imageUrl={from.imageUrl} seed={from.id} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate font-semibold" style={{ fontSize: 13, color: FORUM.text }}>
                        {from.name}
                      </p>
                      <span className="shrink-0" style={{ fontSize: 10, color: FORUM.textMuted }}>
                        {d.time}
                      </span>
                    </div>
                    <p
                      className="mt-1 truncate"
                      style={{
                        fontSize: 12,
                        color: d.unread ? FORUM.text : FORUM.textMuted,
                        fontWeight: d.unread ? 600 : 400,
                      }}
                    >
                      {d.preview}
                    </p>
                  </div>
                  <UnreadCountBadge count={forumItemUnreadCount(d)} />
                </button>
              )
            })
          : boundNotifs.map((n) => {
              const from = resolvePerson(n.fromId)
              const count = forumItemUnreadCount(n)
              return (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => {
                    markNotifRead(n.id)
                    onOpenNotif(n.id)
                  }}
                  className="mb-2 flex w-full items-start gap-2.5 rounded-xl px-2.5 py-2.5 text-left active:opacity-85"
                  style={{
                    backgroundColor: n.unread ? FORUM.surface2 : 'transparent',
                    border: `1px solid ${n.unread ? FORUM.accent : FORUM.hairline}`,
                  }}
                >
                  <div className="relative shrink-0">
                    <ForumAvatar size={36} name={from.name} imageUrl={from.imageUrl} seed={from.id} />
                    <span
                      className="absolute -bottom-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full"
                      style={{
                        backgroundColor: FORUM.surface2,
                        border: `1px solid ${FORUM.hairline}`,
                      }}
                    >
                      {n.kind === 'like' ? (
                        <Heart className="size-2.5" strokeWidth={2} color={FORUM.accent} fill={FORUM.accent} />
                      ) : (
                        <MessageCircle className="size-2.5" strokeWidth={2} color={FORUM.accent} />
                      )}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate font-semibold" style={{ fontSize: 12, color: FORUM.text }}>
                        {from.name}
                      </p>
                      <span className="shrink-0" style={{ fontSize: 10, color: FORUM.textMuted }}>
                        {n.time}
                      </span>
                    </div>
                    <p style={{ fontSize: 11.5, color: FORUM.text, marginTop: 3 }}>{n.text}</p>
                    <p className="mt-1 truncate" style={{ fontSize: 11, color: FORUM.textMuted }}>
                      {n.preview}
                    </p>
                  </div>
                  <UnreadCountBadge count={count} className="mt-1" />
                </button>
              )
            })}
        <div className="h-4" />
      </div>
    </div>
  )
}

function UnreadCountBadge({ count, className = '' }: { count: number; className?: string }) {
  if (count <= 0) return null
  return (
    <span
      className={`flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full px-1 font-bold tabular-nums ${className}`}
      style={{
        fontSize: 10,
        lineHeight: 1,
        backgroundColor: FORUM.accent,
        color: FORUM.surface2,
      }}
    >
      {count > 99 ? '99+' : count}
    </span>
  )
}

/** 底栏角标用（订阅 store 后请优先用 selectForumInboxBadge） */
export function forumDmUnreadCount(): number {
  const { readDmIds, readNotifIds } = useForumInboxUnreadStore.getState()
  return selectForumInboxBadge(readDmIds, readNotifIds)
}
