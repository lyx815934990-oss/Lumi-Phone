import { useMemo } from 'react'

import { Pressable } from '../../../components/Pressable'
import { FORUM, forumKindLabel, formatForumRelativeTime } from '../forumTheme'
import { useForumSocialStore } from '../forumSocialStore'
import { personaAvatarResolved } from '../personaAvatar'
import {
  formatWriterFans,
  type ResidentWriter,
  writerFanCount,
} from '../residentWriters'
import type { ForumPost } from '../forumTypes'
import { ForumAvatar, SoftCard, StatRow } from './ui'

export function ForumAuthorProfile({
  writer,
  posts,
  commentCountFor,
  onBack,
  onOpenPost,
  onWriteShip,
  onWriteCustom,
}: {
  writer: ResidentWriter
  posts: Array<ForumPost & { boardId: string }>
  commentCountFor: (boardId: string, postId: string) => number
  onBack: () => void
  onOpenPost: (boardId: string, postId: string) => void
  onWriteShip: () => void
  onWriteCustom: () => void
}) {
  const avatar = personaAvatarResolved(writer.id, writer.username)
  const following = useForumSocialStore((s) => {
    const acc = s.currentAccountId
    if (!acc) return false
    return s.root.byAccount[acc]?.followingWriterIds.includes(writer.id) ?? false
  })
  const toggleFollow = useForumSocialStore((s) => s.toggleFollow)
  const interaction = useMemo(
    () => posts.reduce((n, p) => n + commentCountFor(p.boardId, p.id), 0),
    [posts, commentCountFor],
  )

  return (
    <div className="min-h-full" style={{ backgroundColor: FORUM.surface1 }}>
      <div
        className="relative"
        style={{
          height: 88,
          paddingTop: FORUM.safeTop,
          background: `linear-gradient(135deg, ${FORUM.coverFrom} 0%, ${FORUM.coverTo} 100%)`,
          boxSizing: 'content-box',
        }}
      >
        <button
          type="button"
          onClick={onBack}
          className="absolute left-3 z-10 rounded-full px-2.5 py-1 text-[12px] font-medium active:opacity-70"
          style={{
            top: `calc(${FORUM.safeTop} + 10px)`,
            backgroundColor: 'rgba(246,244,241,0.72)',
            color: FORUM.text,
          }}
        >
          返回
        </button>
        <span
          className="absolute right-3 z-10 rounded-full px-2.5 py-1 text-[11px] font-medium"
          style={{
            top: `calc(${FORUM.safeTop} + 10px)`,
            backgroundColor: 'rgba(246,244,241,0.72)',
            color: FORUM.textAccent,
          }}
        >
          常驻写手
        </span>
      </div>

      <div style={{ paddingLeft: FORUM.pagePadX, paddingRight: FORUM.pagePadX }}>
        <div style={{ marginTop: -36 }}>
          <ForumAvatar
            size={FORUM.avatar.profile}
            name={writer.username}
            imageUrl={avatar}
            seed={writer.id}
            borderWidth={4}
            borderColor={FORUM.surface1}
          />
          <span
            className="mt-2 inline-flex items-center rounded-full px-2 py-0.5"
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.04em',
              color: FORUM.textAccent,
              backgroundColor: FORUM.surface2,
              border: `1px solid ${FORUM.hairline}`,
            }}
          >
            写手 · 已认证
          </span>
        </div>

        <h1
          className="font-semibold"
          style={{ fontSize: FORUM.font.profileName, color: FORUM.text, marginTop: 10 }}
        >
          {writer.username}
        </h1>
        <p style={{ fontSize: 13, color: FORUM.textAccent, marginTop: 4, lineHeight: 1.45 }}>
          {writer.tagline}
        </p>

        <p
          className="whitespace-pre-wrap"
          style={{
            fontSize: FORUM.font.body,
            color: FORUM.textSecondary,
            lineHeight: 1.7,
            marginTop: 12,
          }}
        >
          {writer.bio}
        </p>
        <p style={{ fontSize: 11.5, color: FORUM.textMuted, marginTop: 10, lineHeight: 1.5 }}>
          同人社区 · 友好交流 · 互相尊重
        </p>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {writer.specialties.map((tag) => (
            <span
              key={tag}
              className="rounded-full px-2.5 py-0.5"
              style={{
                fontSize: 11,
                color: FORUM.textMuted,
                backgroundColor: FORUM.surface2,
              }}
            >
              {tag}
            </span>
          ))}
        </div>

        <div style={{ marginTop: 14 }}>
          <StatRow
            items={[
              { label: '作品', value: String(posts.length) },
              { label: '粉丝', value: formatWriterFans(writerFanCount(writer.id)) },
              { label: '互动', value: String(interaction) },
            ]}
          />
        </div>

        <div className="mt-3 flex gap-2">
          <Pressable
            type="button"
            onClick={() => toggleFollow(writer.id)}
            className="rounded-[14px] px-4 py-2.5 text-center text-[13px] font-medium"
            style={{
              background: following ? FORUM.surface2 : FORUM.accent,
              color: following ? FORUM.text : '#FFFDF8',
              border: following ? `1px solid ${FORUM.hairline}` : 'none',
            }}
          >
            {following ? '已关注' : '关注'}
          </Pressable>
          {writer.writesShip ? (
            <Pressable
              type="button"
              onClick={onWriteShip}
              className="flex-1 rounded-[14px] py-2.5 text-center text-[13px] font-medium"
              style={{ background: FORUM.bgAccent, color: FORUM.text }}
            >
              写本命
            </Pressable>
          ) : null}
          {writer.writesCustom ? (
            <Pressable
              type="button"
              onClick={onWriteCustom}
              className="flex-1 rounded-[14px] py-2.5 text-center text-[13px] font-medium"
              style={{ background: FORUM.bgAccent, color: FORUM.text }}
            >
              搜索选角
            </Pressable>
          ) : null}
        </div>

        <h2
          className="font-semibold"
          style={{ fontSize: 14, color: FORUM.text, marginTop: 22, marginBottom: 10 }}
        >
          TA 的同人文
        </h2>

        {posts.length === 0 ? (
          <p style={{ fontSize: FORUM.font.body, color: FORUM.textMuted, lineHeight: 1.7, paddingBottom: 40 }}>
            还没有作品。点上面，让这位写手用自己的风格写一篇。
          </p>
        ) : (
          <ul className="flex flex-col" style={{ gap: FORUM.cardGap, paddingBottom: 40 }}>
            {posts.map((p) => (
              <li key={`${p.boardId}:${p.id}`}>
                <SoftCard onClick={() => onOpenPost(p.boardId, p.id)}>
                  <p className="font-medium" style={{ fontSize: 14, color: FORUM.text }}>
                    {p.title}
                  </p>
                  <p style={{ fontSize: 12, color: FORUM.textMuted, marginTop: 4 }}>
                    {forumKindLabel(p.kind)} · {formatForumRelativeTime(p.createdAt)} · 评{' '}
                    {commentCountFor(p.boardId, p.id)}
                  </p>
                </SoftCard>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
