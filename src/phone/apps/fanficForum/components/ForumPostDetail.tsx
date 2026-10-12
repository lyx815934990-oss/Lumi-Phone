import { Heart, MessageCircle, Send } from 'lucide-react'
import { useMemo, useState } from 'react'

import { Pressable } from '../../../components/Pressable'
import {
  FORUM,
  formatForumRelativeTime,
  forumKindLabel,
} from '../forumTheme'
import { getNetizenPersona } from '../netizenPersonas'
import type { ForumComment, ForumPost } from '../forumTypes'
import { personaAvatarResolved } from '../personaAvatar'
import { ForumChrome } from './ForumChrome'
import { ForumAvatar } from './ui'

export function ForumPostDetail({
  post,
  comments,
  onBack,
  onDelete,
  onOpenAuthor,
}: {
  post: ForumPost
  comments: ForumComment[]
  onBack: () => void
  onDelete?: () => void
  /** 点作者头像/名：写手进主页 */
  onOpenAuthor?: (authorPersonaId: string) => void
}) {
  const author = getNetizenPersona(post.authorPersonaId)
  const authorName = author?.username ?? '网友'
  const avatar = personaAvatarResolved(post.authorPersonaId, authorName)
  const [draft, setDraft] = useState('')
  const authorClickable = !!onOpenAuthor && author?.archetype === '常驻大触'

  const tree = useMemo(() => {
    const tops = comments.filter((c) => !c.parentCommentId)
    const byParent = new Map<string, ForumComment[]>()
    for (const c of comments) {
      if (!c.parentCommentId) continue
      const list = byParent.get(c.parentCommentId) ?? []
      list.push(c)
      byParent.set(c.parentCommentId, list)
    }
    return tops.map((t) => ({ top: t, replies: byParent.get(t.id) ?? [] }))
  }, [comments])

  const kind = forumKindLabel(post.kind)
  const time = formatForumRelativeTime(post.createdAt)

  return (
    <ForumChrome
      title="帖子详情"
      onBack={onBack}
      right={
        onDelete ? (
          <Pressable
            type="button"
            onClick={onDelete}
            className="px-2 text-[12.5px]"
            style={{ color: FORUM.danger }}
          >
            删除
          </Pressable>
        ) : null
      }
    >
      <div className="flex min-h-full flex-col">
        {/* 帖子主体 */}
        <article
          style={{
            paddingLeft: FORUM.pagePadX,
            paddingRight: FORUM.pagePadX,
            paddingTop: 8,
            paddingBottom: 16,
            borderBottom: `0.5px solid ${FORUM.hairline}`,
          }}
        >
          <button
            type="button"
            disabled={!authorClickable}
            onClick={() => onOpenAuthor?.(post.authorPersonaId)}
            className="flex w-full items-center gap-2.5 text-left disabled:cursor-default"
          >
            <ForumAvatar
              size={FORUM.avatar.postAuthor}
              name={authorName}
              imageUrl={avatar}
              seed={post.authorPersonaId}
            />
            <div className="min-w-0">
              <p className="truncate font-medium" style={{ fontSize: 13.5, color: FORUM.text }}>
                {authorName}
                {author?.archetype === '常驻大触' ? (
                  <span style={{ fontSize: 11, color: FORUM.textAccent, fontWeight: 500 }}>
                    {' '}
                    · 写手
                  </span>
                ) : null}
              </p>
              <p style={{ fontSize: 11, color: FORUM.textMuted, marginTop: 1 }}>
                {time} · {kind}
              </p>
            </div>
          </button>

          <h2
            className="font-semibold"
            style={{ fontSize: FORUM.font.postTitle, color: FORUM.text, marginTop: 14, lineHeight: 1.35 }}
          >
            {post.title}
          </h2>
          <div
            className="whitespace-pre-wrap"
            style={{
              fontSize: FORUM.font.body,
              color: FORUM.textSecondary,
              lineHeight: 1.75,
              marginTop: 8,
            }}
          >
            {post.body}
          </div>

          <div className="mt-[14px] flex items-center gap-4" style={{ color: FORUM.textMuted }}>
            <span className="inline-flex items-center gap-1" style={{ fontSize: 12.5 }}>
              <Heart className="size-[14px]" strokeWidth={1.75} />
              —
            </span>
            <span className="inline-flex items-center gap-1" style={{ fontSize: 12.5 }}>
              <MessageCircle className="size-[14px]" strokeWidth={1.75} />
              {comments.length}
            </span>
          </div>
        </article>

        {/* 评论列表 */}
        <div
          className="flex-1"
          style={{ paddingLeft: FORUM.pagePadX, paddingRight: FORUM.pagePadX, paddingTop: 16 }}
        >
          {tree.length === 0 ? (
            <p style={{ fontSize: FORUM.font.body, color: FORUM.textMuted, lineHeight: 1.7 }}>
              暂无评论
            </p>
          ) : (
            <ul className="flex flex-col" style={{ gap: 16 }}>
              {tree.map(({ top, replies }) => (
                <li key={top.id}>
                  <CommentBlock
                    comment={top}
                    isPostAuthor={top.authorPersonaId === post.authorPersonaId}
                  />
                  {replies.length ? (
                    <ul className="mt-3 flex flex-col pl-[36px]" style={{ gap: 12 }}>
                      {replies.map((r) => (
                        <li key={r.id}>
                          <CommentBlock
                            comment={r}
                            compact
                            isPostAuthor={r.authorPersonaId === post.authorPersonaId}
                          />
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
          <div className="h-24" />
        </div>

        {/* 底部评论输入栏 */}
        <div
          className="shrink-0"
          style={{
            borderTop: `0.5px solid ${FORUM.hairline}`,
            backgroundColor: FORUM.surface1,
            paddingLeft: FORUM.pagePadX,
            paddingRight: FORUM.pagePadX,
            paddingTop: 10,
            paddingBottom: 10,
          }}
        >
          <div className="flex items-center gap-2.5">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="写一条评论…"
              className="min-w-0 flex-1 outline-none"
              style={{
                borderRadius: FORUM.radiusPill,
                backgroundColor: FORUM.surface2,
                padding: '10px 14px',
                fontSize: 13.5,
                color: FORUM.text,
                border: 'none',
              }}
            />
            <Pressable
              type="button"
              onClick={() => {
                // 一期：用户评论仅本地占位提示；AI 评论已在生成时写入
                if (!draft.trim()) return
                window.alert('用户评论发送将在后续版本接入；当前评论区由网友人格生成。')
                setDraft('')
              }}
              className="flex size-9 shrink-0 items-center justify-center rounded-full"
              aria-label="发送"
            >
              <Send className="size-[18px]" strokeWidth={1.75} color={FORUM.textAccent} />
            </Pressable>
          </div>
        </div>
      </div>
    </ForumChrome>
  )
}

function CommentBlock({
  comment,
  compact,
  isPostAuthor,
}: {
  comment: ForumComment
  compact?: boolean
  isPostAuthor?: boolean
}) {
  const persona = getNetizenPersona(comment.authorPersonaId)
  const name = persona?.username ?? '网友'
  const avatar = personaAvatarResolved(comment.authorPersonaId, name)
  const size = compact ? 24 : FORUM.avatar.comment

  return (
    <div className="flex gap-2">
      <ForumAvatar size={size} name={name} imageUrl={avatar} seed={comment.authorPersonaId} />
      <div className="min-w-0 flex-1">
        <p className="font-medium" style={{ fontSize: 12.5, color: FORUM.text }}>
          {name}
          {isPostAuthor ? (
            <span style={{ fontSize: 11, color: FORUM.textAccent, fontWeight: 500 }}> · 楼主</span>
          ) : persona && !compact ? (
            <span style={{ fontSize: 11, color: FORUM.textMuted, fontWeight: 400 }}>
              {' '}
              · {persona.archetype}
            </span>
          ) : null}
        </p>
        <p
          className="whitespace-pre-wrap"
          style={{
            fontSize: FORUM.font.comment,
            color: FORUM.textSecondary,
            lineHeight: 1.6,
            marginTop: 2,
          }}
        >
          {comment.content}
        </p>
      </div>
    </div>
  )
}
