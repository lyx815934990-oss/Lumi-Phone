import { Heart, X } from 'lucide-react'

import { Pressable } from '../../../components/Pressable'
import type {
  WeChatForumShareComment,
  WeChatForumSharePayload,
  WeChatForumShareReply,
} from '../../wechat/newFriendsPersona/types'
import { FORUM } from '../forumTheme'
import { normalizeForumFicProse } from '../forumAiShared'
import { ForumFicBody } from './ForumFicBody'

function LikeMeta({
  likeCount,
  likedByViewer,
}: {
  likeCount?: number
  likedByViewer?: boolean
}) {
  if (typeof likeCount !== 'number') return null
  return (
    <span
      className="inline-flex items-center gap-0.5 tabular-nums"
      style={{ fontSize: 11, color: likedByViewer ? FORUM.accent : FORUM.textMuted }}
    >
      <Heart
        className="size-3"
        strokeWidth={1.75}
        color={likedByViewer ? FORUM.accent : FORUM.textMuted}
        fill={likedByViewer ? FORUM.accent : 'none'}
      />
      {likeCount}
    </span>
  )
}

function ReplyRow({ reply }: { reply: WeChatForumShareReply }) {
  return (
    <li
      className="rounded-[10px] px-3 py-2"
      style={{ backgroundColor: FORUM.bgAccent, border: `0.5px solid ${FORUM.hairline}` }}
    >
      <div className="flex items-baseline justify-between gap-2">
        <p style={{ fontSize: 12, color: FORUM.text, fontWeight: 500 }}>
          {reply.authorName}
          {reply.isPostAuthor ? (
            <span style={{ fontSize: 11, color: FORUM.textAccent, fontWeight: 500 }}> · 楼主</span>
          ) : null}
          {reply.replyToName?.trim() ? (
            <span style={{ fontSize: 11, color: FORUM.textMuted, fontWeight: 400 }}>
              {' '}
              → {reply.replyToName.trim()}
            </span>
          ) : null}
        </p>
        <LikeMeta likeCount={reply.likeCount} likedByViewer={reply.likedByViewer} />
      </div>
      <p
        className="mt-1 break-words"
        style={{ fontSize: 12.5, color: FORUM.textSecondary, lineHeight: 1.55 }}
      >
        {normalizeForumFicProse(reply.content)}
      </p>
    </li>
  )
}

function CommentRow({ comment, index }: { comment: WeChatForumShareComment; index: number }) {
  return (
    <li
      className="rounded-[10px] px-3 py-2.5"
      style={{ backgroundColor: FORUM.surface2, border: `0.5px solid ${FORUM.hairline}` }}
    >
      <div className="flex items-baseline justify-between gap-2">
        <p style={{ fontSize: 12, color: FORUM.text, fontWeight: 500 }}>
          <span style={{ color: FORUM.textMuted, fontWeight: 400 }}>{index + 1}楼 · </span>
          {comment.authorName}
          {comment.isPostAuthor ? (
            <span style={{ fontSize: 11, color: FORUM.textAccent, fontWeight: 500 }}> · 楼主</span>
          ) : null}
        </p>
        <LikeMeta likeCount={comment.likeCount} likedByViewer={comment.likedByViewer} />
      </div>
      <p
        className="mt-1 break-words"
        style={{ fontSize: 12.5, color: FORUM.textSecondary, lineHeight: 1.55 }}
      >
        {normalizeForumFicProse(comment.content)}
      </p>
      {comment.replies?.length ? (
        <ul className="mt-2 space-y-1.5 pl-2" style={{ borderLeft: `2px solid ${FORUM.hairline}` }}>
          {comment.replies.map((r, i) => (
            <ReplyRow key={`${r.authorName}-${i}`} reply={r} />
          ))}
        </ul>
      ) : null}
    </li>
  )
}

/** 聊天内打开同人分享全文（自包含 payload，不依赖论坛页） */
export function ForumShareReaderSheet({
  open,
  data,
  onClose,
}: {
  open: boolean
  data: WeChatForumSharePayload | null
  onClose: () => void
}) {
  if (!open || !data) return null
  const note = data.authorNote?.trim() ? normalizeForumFicProse(data.authorNote) : ''
  const comments = data.commentsPreview ?? []
  const total =
    data.totalCommentCount ??
    comments.reduce((n, c) => n + 1 + (c.replies?.length ?? 0), 0)

  return (
    <div
      className="fixed inset-0 z-[56000] flex flex-col"
      style={{ backgroundColor: FORUM.surface1 }}
      role="dialog"
      aria-modal="true"
      aria-label="同人全文"
    >
      <header
        className="flex shrink-0 items-center gap-1 pb-2.5"
        style={{
          backgroundColor: FORUM.masthead,
          paddingLeft: FORUM.pagePadX - 8,
          paddingRight: FORUM.pagePadX - 8,
          paddingTop: FORUM.headerPadTop,
        }}
      >
        <Pressable
          type="button"
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-full active:opacity-70"
          aria-label="关闭"
        >
          <X className="size-5" strokeWidth={1.75} color={FORUM.surface2} />
        </Pressable>
        <h1
          className="min-w-0 flex-1 truncate text-center font-semibold tracking-[0.06em]"
          style={{ fontSize: FORUM.font.navTitle, color: FORUM.surface2 }}
        >
          同人全文
        </h1>
        <div className="w-9" aria-hidden />
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-[19px] pb-10 [scrollbar-width:none]">
        <p
          className="mt-3 font-semibold tracking-[0.1em]"
          style={{ fontSize: 10, color: FORUM.accent }}
        >
          {data.kindLabel}
        </p>
        <h2
          className="mt-1 font-semibold"
          style={{ fontSize: FORUM.font.postTitle, color: FORUM.text, lineHeight: 1.35 }}
        >
          {data.title}
        </h2>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
          <p style={{ fontSize: 12, color: FORUM.textMuted }}>{data.authorName}</p>
          <LikeMeta likeCount={data.likeCount} likedByViewer={data.likedByViewer} />
          {total > 0 ? (
            <span style={{ fontSize: 11, color: FORUM.textMuted }}>评 {total}</span>
          ) : null}
        </div>

        {note ? (
          <div
            className="mt-3 rounded-[10px] px-3 py-2.5"
            style={{
              backgroundColor: FORUM.bgAccent,
              borderLeft: `3px solid ${FORUM.accent}`,
            }}
          >
            <p
              className="font-semibold tracking-[0.08em]"
              style={{ fontSize: 10, color: FORUM.accent }}
            >
              作者的话
            </p>
            <p
              className="mt-1.5 break-words"
              style={{ fontSize: 12.5, color: FORUM.textSecondary, lineHeight: 1.65 }}
            >
              {note}
            </p>
          </div>
        ) : null}

        <div className="mt-4">
          <ForumFicBody body={data.body} />
        </div>

        {comments.length ? (
          <div className="mt-6 pb-6">
            <p
              className="font-semibold tracking-[0.1em]"
              style={{ fontSize: 10, color: FORUM.textMuted }}
            >
              楼下评论 · {total}
            </p>
            <ul className="mt-2 space-y-2">
              {comments.map((c, i) => (
                <CommentRow key={`${c.authorName}-${i}`} comment={c} index={i} />
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  )
}
