import { ChevronRight } from 'lucide-react'

import type { WeChatPersonaContact } from '../../../types'
import { resolveCharacterAvatarUrl } from '../../../utils/characterAvatarUrl'
import { FORUM } from '../forumTheme'
import { personaAvatarResolved } from '../personaAvatar'
import { listResidentWriters } from '../residentWriters'
import { ForumAvatar, SoftCard } from './ui'

export function ForumPlaza({
  contacts,
  displayNameById = {},
  hydrated,
  postCount,
  onOpenCharacter,
  onOpenWriter,
}: {
  contacts: WeChatPersonaContact[]
  /** characterId → 真实姓名 */
  displayNameById?: Record<string, string>
  hydrated: boolean
  postCount: (characterId: string) => number
  onOpenCharacter: (characterId: string) => void
  onOpenWriter: (writerId: string) => void
}) {
  const writers = listResidentWriters()

  return (
    <div style={{ paddingLeft: FORUM.pagePadX, paddingRight: FORUM.pagePadX, paddingTop: 18 }}>
      <header>
        <h1
          className="font-semibold"
          style={{ fontSize: FORUM.font.pageTitle, color: FORUM.text, letterSpacing: '-0.02em' }}
        >
          同人创作论坛
        </h1>
        <p className="mt-1.5" style={{ fontSize: 12.5, color: FORUM.textSecondary, lineHeight: 1.6 }}>
          同人社区，友好交流与尊重第一。点进常驻写手主页，用 TA 的笔触写同人文；或选通讯录好友写本命。
        </p>
      </header>

      <section style={{ marginTop: FORUM.sectionGap }}>
        <h2 className="font-medium" style={{ fontSize: 13, color: FORUM.textMuted, marginBottom: 10 }}>
          常驻写手
        </h2>
        <div
          className="flex gap-3 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{
            marginLeft: -FORUM.pagePadX,
            marginRight: -FORUM.pagePadX,
            paddingLeft: FORUM.pagePadX,
            paddingRight: FORUM.pagePadX,
          }}
        >
          {writers.map((w) => {
            const avatar = personaAvatarResolved(w.id, w.username)
            return (
              <button
                key={w.id}
                type="button"
                onClick={() => onOpenWriter(w.id)}
                className="flex w-[92px] shrink-0 flex-col items-center gap-1.5 active:opacity-75"
              >
                <ForumAvatar size={52} name={w.username} imageUrl={avatar} seed={w.id} />
                <span
                  className="w-full truncate text-center font-medium"
                  style={{ fontSize: 11.5, color: FORUM.text }}
                >
                  {w.username}
                </span>
                <span
                  className="w-full truncate text-center"
                  style={{ fontSize: 10, color: FORUM.textMuted, lineHeight: 1.3 }}
                >
                  {w.specialties[0] ?? '写手'}
                </span>
              </button>
            )
          })}
        </div>
      </section>

      <div style={{ marginTop: FORUM.sectionGap }}>
        <h2 className="font-medium" style={{ fontSize: 13, color: FORUM.textMuted, marginBottom: 10 }}>
          角色区
        </h2>
        {!hydrated ? (
          <p style={{ fontSize: FORUM.font.body, color: FORUM.textMuted, paddingTop: 16 }}>加载中…</p>
        ) : contacts.length === 0 ? (
          <p style={{ fontSize: FORUM.font.body, color: FORUM.textMuted, paddingTop: 16, lineHeight: 1.7 }}>
            通讯录暂无角色。可先去写手主页用选角写一篇。
          </p>
        ) : (
          <ul className="flex flex-col" style={{ gap: FORUM.cardGap }}>
            {contacts.map((c) => {
              const cid = c.characterId.trim()
              const name = displayNameById[cid]?.trim() || c.remarkName.trim() || '未命名'
              const count = postCount(cid)
              const avatar = resolveCharacterAvatarUrl({ avatarUrl: c.avatarUrl })
              return (
                <li key={cid}>
                  <SoftCard onClick={() => onOpenCharacter(cid)} paddingY={13}>
                    <div className="flex items-center gap-3">
                      <ForumAvatar size={FORUM.avatar.plaza} name={name} imageUrl={avatar} seed={cid} />
                      <div className="min-w-0 flex-1">
                        <p
                          className="truncate font-medium"
                          style={{ fontSize: FORUM.font.cardTitle, color: FORUM.text }}
                        >
                          {name}
                        </p>
                        <p style={{ fontSize: FORUM.font.meta, color: FORUM.textMuted, marginTop: 2 }}>
                          {count > 0 ? `${count} 篇同人文` : '暂无帖子'}
                        </p>
                      </div>
                      <ChevronRight className="size-4 shrink-0" strokeWidth={1.75} color={FORUM.textMuted} />
                    </div>
                  </SoftCard>
                </li>
              )
            })}
          </ul>
        )}
      </div>
      <div className="h-6" />
    </div>
  )
}

export function ForumDiscoverFeed({
  items,
  onOpenPost,
}: {
  items: Array<{
    postId: string
    characterId: string
    charName: string
    title: string
    authorName: string
    kindLabel: string
    commentCount: number
  }>
  onOpenPost: (characterId: string, postId: string) => void
}) {
  return (
    <div style={{ paddingLeft: FORUM.pagePadX, paddingRight: FORUM.pagePadX, paddingTop: 18 }}>
      <h1 className="font-semibold" style={{ fontSize: FORUM.font.pageTitle, color: FORUM.text }}>
        发现
      </h1>
      <p className="mt-1.5" style={{ fontSize: 12.5, color: FORUM.textSecondary, lineHeight: 1.6 }}>
        同好近期帖子。评论请对事不对人，友好交流。
      </p>
      <div style={{ marginTop: FORUM.sectionGap }}>
        {items.length === 0 ? (
          <p style={{ fontSize: FORUM.font.body, color: FORUM.textMuted, paddingTop: 32 }}>
            还没有帖子。去广场点常驻写手，让 TA 写一篇吧。
          </p>
        ) : (
          <ul className="flex flex-col" style={{ gap: FORUM.cardGap }}>
            {items.map((it) => (
              <li key={`${it.characterId}:${it.postId}`}>
                <SoftCard onClick={() => onOpenPost(it.characterId, it.postId)}>
                  <p className="font-medium" style={{ fontSize: 14, color: FORUM.text }}>
                    {it.title}
                  </p>
                  <p style={{ fontSize: 12, color: FORUM.textMuted, marginTop: 4 }}>
                    {it.charName} · {it.authorName} · {it.kindLabel} · 评 {it.commentCount}
                  </p>
                </SoftCard>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="h-6" />
    </div>
  )
}

export function ForumPlaceholderTab({ title, hint }: { title: string; hint: string }) {
  return (
    <div style={{ paddingLeft: FORUM.pagePadX, paddingRight: FORUM.pagePadX, paddingTop: 18 }}>
      <h1 className="font-semibold" style={{ fontSize: FORUM.font.pageTitle, color: FORUM.text }}>
        {title}
      </h1>
      <p className="mt-1.5" style={{ fontSize: 12.5, color: FORUM.textSecondary, lineHeight: 1.6 }}>
        {hint}
      </p>
    </div>
  )
}
