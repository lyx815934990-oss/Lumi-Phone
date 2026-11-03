import { ChevronLeft, Heart, MessageCircle, Send, Share2, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { Pressable } from '../../../components/Pressable'
import { useComposerKeyboardInset } from '../../../hooks/useComposerKeyboardInset'
import type { WeChatPersonaContact } from '../../../types'
import { MemoryCoachPortal } from '../../wechat/memory/MemoryCoachPortal'
import {
  readMemoryCoachSeen,
  writeMemoryCoachSeen,
} from '../../wechat/memory/memoryCoachTypes'
import { normalizeForumFicProse } from '../forumAiShared'
import {
  FORUM_COACH_ROOT_ATTR,
  FORUM_COACH_TARGET_ATTR,
  FORUM_POST_COACH_SCOPE,
  FORUM_POST_COACH_SEEN_KEY,
  FORUM_POST_COACH_STEPS,
} from '../forumCoach'
import { sendForumShareToWeChatContacts } from '../forumWechatShare'
import { ForumContactPickSheet } from './ForumContactPickSheet'
import {
  FORUM,
  formatForumRelativeTime,
  forumKindLabel,
} from '../forumTheme'
import { useForumSocialStore } from '../forumSocialStore'
import { getNetizenPersona } from '../netizenPersonas'
import type { ForumComment, ForumPost } from '../forumTypes'
import { personaAvatarResolved } from '../personaAvatar'
import { isResidentWriterId } from '../residentWriters'
import { ForumFicBody } from './ForumFicBody'
import { ForumAvatar } from './ui'

/** Zustand 选择器勿 `?? []`：每次新引用会 Maximum update depth */
const EMPTY_LIKED_COMMENT_IDS: readonly string[] = Object.freeze([])

/** 票根编号：同一帖稳定显示 */
function ticketNo(postId: string): string {
  let h = 0
  for (let i = 0; i < postId.length; i += 1) h = (h * 31 + postId.charCodeAt(i)) >>> 0
  return String((h % 9000) + 1000)
}

/** 展示用点赞底数（同一 id 稳定） */
function baseLikeCount(id: string, span = 86, floor = 12): number {
  let h = 2166136261
  for (let i = 0; i < id.length; i += 1) {
    h ^= id.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return floor + (Math.abs(h) % span)
}

function commentDisplayName(
  comment: ForumComment,
  selfName?: string,
): string {
  if (comment.authorPersonaId === 'forum-self') return selfName?.trim() || '我'
  return getNetizenPersona(comment.authorPersonaId)?.username ?? '网友'
}

type ReplyTarget = {
  /** 楼中楼挂在这一层（一级评论 id） */
  floorId: string
  /** 展示用：回复谁 */
  toName: string
}

export function ForumPostDetail({
  post,
  comments,
  onBack,
  onDelete,
  onOpenAuthor,
  onSubmitComment,
  selfAuthorName,
  selfAuthorAvatarUrl,
  shareContacts = [],
  shareDisplayNameById = {},
}: {
  post: ForumPost
  comments: ForumComment[]
  onBack: () => void
  onDelete?: () => void
  onOpenAuthor?: (authorPersonaId: string) => void
  /** 发出评论 / 楼中楼回复；示例帖也可只靠本地态 */
  onSubmitComment?: (comment: ForumComment) => void
  selfAuthorName?: string
  selfAuthorAvatarUrl?: string | null
  shareContacts?: WeChatPersonaContact[]
  shareDisplayNameById?: Record<string, string>
}) {
  const isSelf = post.authorPersonaId === 'forum-self'
  const author = isSelf ? null : getNetizenPersona(post.authorPersonaId)
  const authorName = isSelf
    ? selfAuthorName?.trim() || '我'
    : author?.username ?? '网友'
  const avatar = isSelf
    ? selfAuthorAvatarUrl?.trim() || undefined
    : personaAvatarResolved(post.authorPersonaId, authorName)
  const [draft, setDraft] = useState('')
  const [replyTo, setReplyTo] = useState<ReplyTarget | null>(null)
  const [localComments, setLocalComments] = useState<ForumComment[]>([])
  const [shareOpen, setShareOpen] = useState(false)
  const [shareSending, setShareSending] = useState(false)
  const [coachOpen, setCoachOpen] = useState(false)
  const [coachStepIndex, setCoachStepIndex] = useState(0)
  const autoCoachStartedRef = useRef(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputBarRef = useRef<HTMLDivElement>(null)
  const keyboardFillRef = useRef<HTMLDivElement>(null)

  const finishPostCoach = useCallback(() => {
    writeMemoryCoachSeen(FORUM_POST_COACH_SEEN_KEY)
    setCoachOpen(false)
    setCoachStepIndex(0)
  }, [])

  useEffect(() => {
    if (autoCoachStartedRef.current) return
    if (readMemoryCoachSeen(FORUM_POST_COACH_SEEN_KEY)) return
    autoCoachStartedRef.current = true
    writeMemoryCoachSeen(FORUM_POST_COACH_SEEN_KEY)
    const id = window.setTimeout(() => {
      setCoachStepIndex(0)
      setCoachOpen(true)
    }, 520)
    return () => window.clearTimeout(id)
  }, [])

  useComposerKeyboardInset(scrollRef, inputBarRef, keyboardFillRef, {
    scrollPaddingAnchor: '96px',
    inputBarSafePadding: 'max(28px, env(safe-area-inset-bottom, 0px))',
    inputBarActivePadding: '18px',
  })

  const liked = useForumSocialStore((s) => {
    const acc = s.currentAccountId ?? '__guest__'
    return s.root.byAccount[acc]?.likedPostIds?.includes(post.id) ?? false
  })
  const likedCommentIds = useForumSocialStore((s) => {
    const acc = s.currentAccountId ?? '__guest__'
    return s.root.byAccount[acc]?.likedCommentIds ?? EMPTY_LIKED_COMMENT_IDS
  })
  const togglePostLike = useForumSocialStore((s) => s.togglePostLike)
  const likeBase =
    typeof post.likeCount === 'number' && post.likeCount >= 0
      ? post.likeCount
      : baseLikeCount(post.id)
  const likeCount = likeBase + (liked ? 1 : 0)
  const authorClickable =
    !!onOpenAuthor && !isSelf && isResidentWriterId(post.authorPersonaId)

  const allComments = useMemo(() => {
    const byId = new Map<string, ForumComment>()
    for (const c of comments) byId.set(c.id, c)
    for (const c of localComments) byId.set(c.id, c)
    return [...byId.values()].sort((a, b) => a.createdAt - b.createdAt)
  }, [comments, localComments])

  const tree = useMemo(() => {
    const tops = allComments.filter((c) => !c.parentCommentId)
    const byParent = new Map<string, ForumComment[]>()
    for (const c of allComments) {
      if (!c.parentCommentId) continue
      const list = byParent.get(c.parentCommentId) ?? []
      list.push(c)
      byParent.set(c.parentCommentId, list)
    }
    return tops.map((t) => ({ top: t, replies: byParent.get(t.id) ?? [] }))
  }, [allComments])

  const kind = forumKindLabel(post.kind)
  const time = formatForumRelativeTime(post.createdAt)
  const no = ticketNo(post.id)
  const displayAuthorNote = post.authorNote?.trim()
    ? normalizeForumFicProse(post.authorNote)
    : ''

  const focusInput = () => {
    const el = inputRef.current
    if (!el) return
    el.focus()
    const len = el.value.length
    try {
      el.setSelectionRange(len, len)
    } catch {
      /* 部分 WebView 不支持 */
    }
  }

  const startReply = (comment: ForumComment) => {
    const floorId = comment.parentCommentId?.trim() || comment.id
    setReplyTo({
      floorId,
      toName: commentDisplayName(comment, selfAuthorName),
    })
    focusInput()
  }

  const clearReply = () => setReplyTo(null)

  const send = () => {
    const text = draft.trim()
    if (!text) return
    const comment: ForumComment = {
      id: `u-c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      postId: post.id,
      authorPersonaId: 'forum-self',
      content: text.slice(0, 500),
      createdAt: Date.now(),
      ...(replyTo ? { parentCommentId: replyTo.floorId } : {}),
    }
    setLocalComments((prev) => [...prev, comment])
    onSubmitComment?.(comment)
    setDraft('')
    setReplyTo(null)
  }

  const shareToContact = async (characterId: string) => {
    if (shareSending) return
    setShareSending(true)
    try {
      await sendForumShareToWeChatContacts([characterId], {
        post,
        comments: allComments,
        selfAuthorName,
        postLikeCount: likeCount,
        postLikedByViewer: liked,
        likedCommentIds,
      })
      setShareOpen(false)
      window.alert('已分享到微信聊天')
    } catch (e) {
      window.alert(e instanceof Error ? e.message : '分享失败，请重试')
    } finally {
      setShareSending(false)
    }
  }

  return (
    <div
      className="relative flex h-full min-h-0 flex-col"
      style={{ backgroundColor: FORUM.surface1, fontFamily: 'inherit' }}
      {...{ [FORUM_COACH_ROOT_ATTR]: FORUM_POST_COACH_SCOPE }}
    >
      {/* 深色报头 */}
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
          onClick={onBack}
          className="flex h-9 w-9 items-center justify-center rounded-full active:opacity-70"
          aria-label="返回"
        >
          <ChevronLeft className="size-5" strokeWidth={1.75} color={FORUM.surface2} />
        </Pressable>
        <h1
          className="min-w-0 flex-1 truncate text-center font-semibold tracking-[0.06em]"
          style={{ fontSize: FORUM.font.navTitle, color: FORUM.surface2 }}
        >
          帖子详情
        </h1>
        <div className="flex h-9 min-w-[4.5rem] items-center justify-end gap-0.5">
          <Pressable
            type="button"
            onClick={() => setShareOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-full active:opacity-70"
            aria-label="分享到微信"
            {...{ [FORUM_COACH_TARGET_ATTR]: 'forum-post-share' }}
          >
            <Share2 className="size-4" strokeWidth={1.75} color={FORUM.surface2} />
          </Pressable>
          {onDelete ? (
            <Pressable
              type="button"
              onClick={onDelete}
              className="px-2 text-[12.5px] active:opacity-70"
              style={{ color: '#E8B4B4' }}
            >
              删除
            </Pressable>
          ) : null}
        </div>
      </header>

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <div className="flex min-h-full flex-col" style={{ backgroundColor: FORUM.bgAccent }}>
          {/* 票根正文 */}
          <article
            style={{
              backgroundColor: FORUM.surface2,
              paddingLeft: FORUM.pagePadX,
              paddingRight: FORUM.pagePadX,
              paddingTop: 14,
              paddingBottom: 0,
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
              style={{
                fontSize: FORUM.font.postTitle,
                color: FORUM.text,
                marginTop: 14,
                lineHeight: 1.35,
                letterSpacing: '0.02em',
              }}
            >
              {post.title}
            </h2>

            {displayAuthorNote ? (
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
                  作者的话 · 简介
                </p>
                <p
                  className="mt-1.5 whitespace-pre-wrap break-words"
                  style={{
                    fontSize: 12.5,
                    color: FORUM.textSecondary,
                    lineHeight: 1.65,
                    wordBreak: 'normal',
                    overflowWrap: 'anywhere',
                  }}
                >
                  {displayAuthorNote}
                </p>
              </div>
            ) : null}

            <div style={{ marginTop: 10 }}>
              <ForumFicBody body={post.body} />
            </div>

            <div
              className="mt-3.5 flex items-center justify-between pb-2"
              style={{ color: FORUM.textMuted }}
              {...{ [FORUM_COACH_TARGET_ATTR]: 'forum-post-like' }}
            >
              <div className="flex items-center gap-4">
                <Pressable
                  type="button"
                  onClick={() => togglePostLike(post.id)}
                  className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 active:scale-95"
                  style={{
                    fontSize: 12.5,
                    color: liked ? FORUM.accent : FORUM.textMuted,
                  }}
                  aria-label={liked ? '取消点赞' : '点赞'}
                  aria-pressed={liked}
                >
                  <Heart
                    className="size-[14px]"
                    strokeWidth={1.75}
                    color={liked ? FORUM.accent : FORUM.textMuted}
                    fill={liked ? FORUM.accent : 'none'}
                  />
                  <span className="tabular-nums font-medium">{likeCount}</span>
                </Pressable>
                <Pressable
                  type="button"
                  onClick={() => {
                    clearReply()
                    focusInput()
                  }}
                  className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 active:opacity-70"
                  style={{ fontSize: 12.5, color: FORUM.textMuted }}
                  aria-label="写评论"
                >
                  <MessageCircle className="size-[14px]" strokeWidth={1.75} />
                  {allComments.length}
                </Pressable>
              </div>
              <span
                className="font-bold tabular-nums tracking-[0.1em]"
                style={{ fontSize: 11, color: FORUM.accent }}
              >
                NO.{no}
              </span>
            </div>
          </article>

          {/* 票根打孔撕边 */}
          <div
            className="flex justify-between px-2.5 pb-1.5"
            style={{ backgroundColor: FORUM.surface2 }}
            aria-hidden
          >
            {Array.from({ length: 14 }).map((_, i) => (
              <span
                key={i}
                className="size-[7px] shrink-0 rounded-full"
                style={{
                  backgroundColor: FORUM.bgAccent,
                  border: `1px solid ${FORUM.hairline}`,
                }}
              />
            ))}
          </div>

          {/* 楼层评论 */}
          <div
            className="flex-1"
            style={{
              backgroundColor: FORUM.bgAccent,
              paddingLeft: FORUM.pagePadX - 2,
              paddingRight: FORUM.pagePadX - 2,
              paddingTop: 12,
              paddingBottom: 8,
            }}
          >
            <div className="mb-2.5 flex items-center justify-between px-0.5">
              <div className="flex items-center gap-1.5">
                <span
                  className="h-3 w-0.5 shrink-0 rounded-sm"
                  style={{ backgroundColor: FORUM.accent }}
                />
                <h3 className="font-bold" style={{ fontSize: 12, color: FORUM.text }}>
                  楼层评论
                </h3>
              </div>
              <span style={{ fontSize: 10, color: FORUM.textMuted }}>{allComments.length} 条</span>
            </div>

            {tree.length === 0 ? (
              <p
                className="px-1"
                style={{ fontSize: FORUM.font.body, color: FORUM.textMuted, lineHeight: 1.7 }}
              >
                暂无评论，来写一楼吧
              </p>
            ) : (
              <ul className="flex flex-col" style={{ gap: 8 }}>
                {tree.map(({ top, replies }, floor) => (
                  <li
                    key={top.id}
                    className="flex gap-2.5 rounded-[10px] px-2.5 py-2.5"
                    style={{
                      backgroundColor: FORUM.surface2,
                      outline:
                        replyTo?.floorId === top.id
                          ? `1.5px solid ${FORUM.accent}55`
                          : undefined,
                    }}
                  >
                    <div
                      className="w-7 shrink-0 text-center font-extrabold tabular-nums"
                      style={{
                        fontSize: 11,
                        color: FORUM.accent,
                        lineHeight: '28px',
                      }}
                    >
                      {floor + 1}F
                    </div>
                    <div className="min-w-0 flex-1">
                      <CommentBlock
                        comment={top}
                        isPostAuthor={top.authorPersonaId === post.authorPersonaId}
                        selfName={selfAuthorName}
                        selfAvatarUrl={selfAuthorAvatarUrl}
                        onReply={() => startReply(top)}
                      />
                      {replies.length ? (
                        <ul className="mt-2 flex flex-col" style={{ gap: 8 }}>
                          {replies.map((r) => (
                            <li
                              key={r.id}
                              className="rounded-lg px-2.5 py-2"
                              style={{ backgroundColor: FORUM.surface1 }}
                            >
                              <CommentBlock
                                comment={r}
                                compact
                                isPostAuthor={r.authorPersonaId === post.authorPersonaId}
                                selfName={selfAuthorName}
                                selfAvatarUrl={selfAuthorAvatarUrl}
                                onReply={() => startReply(r)}
                              />
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div className="h-8" />
          </div>
        </div>
      </div>

      <div
        ref={keyboardFillRef}
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[8]"
        aria-hidden
      />

      {/* 常驻底部输入：抬高底垫 + 键盘弹起时整体上移，避免被挡死 */}
      <div
        ref={inputBarRef}
        className="relative z-[9] shrink-0"
        style={{
          borderTop: `1px solid ${FORUM.hairline}`,
          backgroundColor: FORUM.surface2,
          paddingLeft: FORUM.pagePadX,
          paddingRight: FORUM.pagePadX,
          paddingTop: replyTo ? 10 : 14,
          paddingBottom: 'max(28px, env(safe-area-inset-bottom, 0px))',
        }}
      >
        {replyTo ? (
          <div className="mb-2.5 flex items-center gap-2">
            <span
              className="min-w-0 flex-1 truncate rounded-full px-2.5 py-1"
              style={{
                fontSize: 11.5,
                color: FORUM.textAccent,
                backgroundColor: FORUM.bgAccent,
              }}
            >
              楼中楼回复 @{replyTo.toName}
            </span>
            <Pressable
              type="button"
              onClick={clearReply}
              className="flex size-7 shrink-0 items-center justify-center rounded-full active:opacity-70"
              aria-label="取消回复"
              style={{ backgroundColor: FORUM.bgAccent }}
            >
              <X className="size-3.5" strokeWidth={2} color={FORUM.textMuted} />
            </Pressable>
          </div>
        ) : null}
        <div className="flex items-center gap-2.5">
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape' && replyTo) {
                e.preventDefault()
                clearReply()
                return
              }
              if (e.key === 'Enter') {
                e.preventDefault()
                send()
              }
            }}
            enterKeyHint="send"
            autoComplete="off"
            placeholder={replyTo ? `回复 ${replyTo.toName}…` : '写一条评论…'}
            className="min-w-0 flex-1 outline-none"
            style={{
              borderRadius: FORUM.radiusPill,
              backgroundColor: FORUM.bgAccent,
              padding: '14px 16px',
              fontSize: 15,
              color: FORUM.text,
              border: 'none',
              minHeight: 48,
            }}
          />
          <Pressable
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={send}
            disabled={!draft.trim()}
            className="flex size-11 shrink-0 items-center justify-center rounded-full active:opacity-70 disabled:opacity-35"
            aria-label="发送"
            style={{
              backgroundColor: draft.trim() ? FORUM.accent : FORUM.bgAccent,
            }}
          >
            <Send
              className="size-[18px]"
              strokeWidth={1.75}
              color={draft.trim() ? FORUM.surface2 : FORUM.textAccent}
            />
          </Pressable>
        </div>
      </div>

      <ForumContactPickSheet
        open={shareOpen}
        onClose={() => {
          if (!shareSending) setShareOpen(false)
        }}
        contacts={shareContacts}
        displayNameById={shareDisplayNameById}
        busy={shareSending}
        eyebrow="分享到微信"
        title="发给通讯录好友"
        hint="TA 会在私聊里收到这篇同人全文，方便一起讨论。"
        rowHint="发送到微信私聊"
        emptyHint="通讯录暂无角色，无法分享。"
        onPick={(c) => void shareToContact(c.characterId.trim())}
      />
      <MemoryCoachPortal
        open={coachOpen}
        steps={FORUM_POST_COACH_STEPS}
        stepIndex={coachStepIndex}
        onStepChange={setCoachStepIndex}
        onSkip={finishPostCoach}
        onComplete={finishPostCoach}
        scopeRoot={FORUM_POST_COACH_SCOPE}
        coachTargetAttr={FORUM_COACH_TARGET_ATTR}
        coachRootAttr={FORUM_COACH_ROOT_ATTR}
        zIndex={64200}
      />
    </div>
  )
}

function CommentBlock({
  comment,
  compact,
  isPostAuthor,
  selfName,
  selfAvatarUrl,
  onReply,
}: {
  comment: ForumComment
  compact?: boolean
  isPostAuthor?: boolean
  selfName?: string
  selfAvatarUrl?: string | null
  onReply?: () => void
}) {
  const isSelf = comment.authorPersonaId === 'forum-self'
  const persona = isSelf ? null : getNetizenPersona(comment.authorPersonaId)
  const name = isSelf ? selfName?.trim() || '我' : persona?.username ?? '网友'
  const avatar = isSelf
    ? selfAvatarUrl?.trim() || undefined
    : personaAvatarResolved(comment.authorPersonaId, name)
  const size = compact ? 22 : FORUM.avatar.comment
  const liked = useForumSocialStore((s) => {
    const acc = s.currentAccountId ?? '__guest__'
    return s.root.byAccount[acc]?.likedCommentIds?.includes(comment.id) ?? false
  })
  const toggleCommentLike = useForumSocialStore((s) => s.toggleCommentLike)
  const likeCount = baseLikeCount(comment.id, 28, compact ? 1 : 2) + (liked ? 1 : 0)

  return (
    <div className="flex gap-2">
      <ForumAvatar size={size} name={name} imageUrl={avatar} seed={comment.authorPersonaId} />
      <div className="min-w-0 flex-1">
        <p className="font-medium" style={{ fontSize: 12.5, color: FORUM.text }}>
          {name}
          {isPostAuthor ? (
            <span style={{ fontSize: 11, color: FORUM.textAccent, fontWeight: 500 }}> · 楼主</span>
          ) : isSelf ? (
            <span style={{ fontSize: 11, color: FORUM.textAccent, fontWeight: 500 }}> · 我</span>
          ) : persona && !compact ? (
            <span style={{ fontSize: 11, color: FORUM.textMuted, fontWeight: 400 }}>
              {' '}
              · {persona.archetype}
            </span>
          ) : null}
        </p>
        <p
          className="break-words"
          style={{
            fontSize: FORUM.font.comment,
            color: FORUM.textSecondary,
            lineHeight: 1.6,
            marginTop: 2,
            wordBreak: 'normal',
            overflowWrap: 'anywhere',
          }}
        >
          {normalizeForumFicProse(comment.content)}
        </p>
        <div className="mt-1.5 flex items-center gap-3">
          <Pressable
            type="button"
            onClick={() => toggleCommentLike(comment.id)}
            className="inline-flex items-center gap-1 rounded-full px-1 py-0.5 active:scale-95"
            style={{
              fontSize: 11,
              color: liked ? FORUM.accent : FORUM.textMuted,
            }}
            aria-label={liked ? '取消点赞' : '点赞'}
            aria-pressed={liked}
          >
            <Heart
              className="size-3"
              strokeWidth={1.75}
              color={liked ? FORUM.accent : FORUM.textMuted}
              fill={liked ? FORUM.accent : 'none'}
            />
            <span className="tabular-nums">{likeCount}</span>
          </Pressable>
          {onReply ? (
            <Pressable
              type="button"
              onClick={onReply}
              className="rounded-full px-1 py-0.5 active:opacity-70"
              style={{ fontSize: 11, color: FORUM.textMuted, fontWeight: 500 }}
            >
              回复
            </Pressable>
          ) : null}
        </div>
      </div>
    </div>
  )
}
