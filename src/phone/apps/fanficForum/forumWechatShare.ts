/**
 * 同人通讯社 → 微信私聊分享：自包含全文，便于与 char 讨论。
 */

import { emitWeChatStorageChanged, personaDb } from '../wechat/newFriendsPersona/idb'
import type {
  WeChatForumShareComment,
  WeChatForumSharePayload,
  WeChatForumShareReply,
} from '../wechat/newFriendsPersona/types'
import { resolveListenTogetherPrivateChatTarget } from '../wechat/wechatAccountPrivateChatStorage'
import { normalizeForumFicProse, stripForumFicTrailingMeta } from './forumAiShared'
import { forumKindLabel } from './forumTheme'
import type { ForumComment, ForumPost } from './forumTypes'
import { getNetizenPersona } from './netizenPersonas'

const BODY_MAX = 20_000
const NOTE_MAX = 400
/** 一级评论上限（含其下楼中楼）；论坛单帖通常远小于此 */
const TOP_COMMENT_MAX = 80
const REPLY_PER_TOP_MAX = 40
const COMMENT_CONTENT_MAX = 800
/** AI 上下文：正文与评论区合计上限（字符） */
const AI_BODY_MAX = 10_000
const AI_COMMENTS_MAX = 12_000

/** 与详情页同一套稳定点赞底数 */
export function forumShareStableLikeCount(id: string, span = 86, floor = 12): number {
  let h = 2166136261
  for (let i = 0; i < id.length; i += 1) {
    h ^= id.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return floor + (Math.abs(h) % span)
}

export function forumShareContentFallback(card: WeChatForumSharePayload): string {
  return `[同人] ${card.title}`
}

function parseReplyRow(raw: unknown): WeChatForumShareReply | null {
  if (!raw || typeof raw !== 'object') return null
  const c = raw as Record<string, unknown>
  const authorName = typeof c.authorName === 'string' ? c.authorName.trim().slice(0, 32) : ''
  const content = typeof c.content === 'string' ? c.content.trim().slice(0, COMMENT_CONTENT_MAX) : ''
  if (!authorName || !content) return null
  const likeRaw = typeof c.likeCount === 'number' ? c.likeCount : Number(c.likeCount)
  const likeCount = Number.isFinite(likeRaw) ? Math.max(0, Math.floor(likeRaw)) : undefined
  const replyToName =
    typeof c.replyToName === 'string' && c.replyToName.trim()
      ? c.replyToName.trim().slice(0, 32)
      : undefined
  return {
    authorName,
    content,
    ...(likeCount != null ? { likeCount } : {}),
    ...(c.likedByViewer === true ? { likedByViewer: true } : {}),
    ...(c.isPostAuthor === true ? { isPostAuthor: true } : {}),
    ...(replyToName ? { replyToName } : {}),
  }
}

function parseCommentRow(raw: unknown): WeChatForumShareComment | null {
  if (!raw || typeof raw !== 'object') return null
  const c = raw as Record<string, unknown>
  const authorName = typeof c.authorName === 'string' ? c.authorName.trim().slice(0, 32) : ''
  const content = typeof c.content === 'string' ? c.content.trim().slice(0, COMMENT_CONTENT_MAX) : ''
  if (!authorName || !content) return null
  const likeRaw = typeof c.likeCount === 'number' ? c.likeCount : Number(c.likeCount)
  const likeCount = Number.isFinite(likeRaw) ? Math.max(0, Math.floor(likeRaw)) : undefined
  const replies: WeChatForumShareReply[] = []
  if (Array.isArray(c.replies)) {
    for (const row of c.replies) {
      const reply = parseReplyRow(row)
      if (!reply) continue
      replies.push(reply)
      if (replies.length >= REPLY_PER_TOP_MAX) break
    }
  }
  return {
    authorName,
    content,
    ...(likeCount != null ? { likeCount } : {}),
    ...(c.likedByViewer === true ? { likedByViewer: true } : {}),
    ...(c.isPostAuthor === true ? { isPostAuthor: true } : {}),
    ...(replies.length ? { replies } : {}),
  }
}

export function parseWeChatForumSharePayloadFromDb(raw: unknown): WeChatForumSharePayload | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const r = raw as Record<string, unknown>
  if ((typeof r.kind === 'string' ? r.kind.trim() : '') !== 'forum_share') return undefined
  const shareId = typeof r.shareId === 'string' ? r.shareId.trim() : ''
  const postId = typeof r.postId === 'string' ? r.postId.trim() : ''
  const boardCharacterId = typeof r.boardCharacterId === 'string' ? r.boardCharacterId.trim() : ''
  const title = typeof r.title === 'string' ? r.title.trim().slice(0, 80) : ''
  const authorName = typeof r.authorName === 'string' ? r.authorName.trim().slice(0, 64) : ''
  const kindLabel = typeof r.kindLabel === 'string' ? r.kindLabel.trim().slice(0, 32) : '同人'
  const body = typeof r.body === 'string' ? r.body.trim().slice(0, BODY_MAX) : ''
  if (!shareId || !postId || !title || !body) return undefined
  const authorNote =
    typeof r.authorNote === 'string' ? r.authorNote.trim().slice(0, NOTE_MAX) : undefined
  const commentsPreview: WeChatForumShareComment[] = []
  if (Array.isArray(r.commentsPreview)) {
    for (const row of r.commentsPreview) {
      const c = parseCommentRow(row)
      if (!c) continue
      commentsPreview.push(c)
      if (commentsPreview.length >= TOP_COMMENT_MAX) break
    }
  }
  const likeRaw = typeof r.likeCount === 'number' ? r.likeCount : Number(r.likeCount)
  const likeCount = Number.isFinite(likeRaw) ? Math.max(0, Math.floor(likeRaw)) : undefined
  const topRaw = typeof r.topCommentCount === 'number' ? r.topCommentCount : Number(r.topCommentCount)
  const topCommentCount = Number.isFinite(topRaw) ? Math.max(0, Math.floor(topRaw)) : undefined
  const totalRaw =
    typeof r.totalCommentCount === 'number' ? r.totalCommentCount : Number(r.totalCommentCount)
  const totalCommentCount = Number.isFinite(totalRaw) ? Math.max(0, Math.floor(totalRaw)) : undefined
  return {
    kind: 'forum_share',
    shareId,
    postId,
    boardCharacterId: boardCharacterId || '__plaza__',
    title,
    authorName: authorName || '网友',
    kindLabel: kindLabel || '同人',
    body,
    ...(authorNote ? { authorNote } : {}),
    ...(likeCount != null ? { likeCount } : {}),
    ...(r.likedByViewer === true ? { likedByViewer: true } : {}),
    ...(topCommentCount != null ? { topCommentCount } : {}),
    ...(totalCommentCount != null ? { totalCommentCount } : {}),
    ...(commentsPreview.length ? { commentsPreview } : {}),
  }
}

function formatCommentThreadForAi(comments: WeChatForumShareComment[]): string {
  const lines: string[] = []
  let used = 0
  for (let i = 0; i < comments.length; i += 1) {
    const c = comments[i]!
    const like =
      typeof c.likeCount === 'number' ? `（赞 ${c.likeCount}${c.likedByViewer ? '·用户已赞' : ''}）` : ''
    const authorTag = c.isPostAuthor ? '·楼主' : ''
    const head = `${i + 1}楼 ${c.authorName}${authorTag}${like}：${c.content}`
    if (used + head.length > AI_COMMENTS_MAX) {
      lines.push(`…其余 ${comments.length - i} 条一级评论因篇幅省略`)
      break
    }
    lines.push(head)
    used += head.length + 1
    for (const r of c.replies ?? []) {
      const rLike =
        typeof r.likeCount === 'number'
          ? `（赞 ${r.likeCount}${r.likedByViewer ? '·用户已赞' : ''}）`
          : ''
      const to = r.replyToName?.trim() ? ` → ${r.replyToName.trim()}` : ''
      const rAuthorTag = r.isPostAuthor ? '·楼主' : ''
      const replyLine = `  ↳ ${r.authorName}${rAuthorTag}${to}${rLike}：${r.content}`
      if (used + replyLine.length > AI_COMMENTS_MAX) {
        lines.push('  …其余楼中楼因篇幅省略')
        return lines.join('\n')
      }
      lines.push(replyLine)
      used += replyLine.length + 1
    }
  }
  return lines.join('\n')
}

export function formatForumShareAiTranscriptLine(
  card: WeChatForumSharePayload,
  from: 'self' | 'other',
): string {
  const who = from === 'self' ? '用户' : '你'
  const note = card.authorNote?.trim()
  const body = stripForumFicTrailingMeta(normalizeForumFicProse(card.body)).slice(0, AI_BODY_MAX)
  const comments = card.commentsPreview ?? []
  const thread = comments.length ? formatCommentThreadForAi(comments) : ''
  const likeLine =
    typeof card.likeCount === 'number'
      ? `帖子互动：点赞 ${card.likeCount}${card.likedByViewer ? '（用户已赞）' : ''}｜一级评论 ${
          card.topCommentCount ?? comments.length
        }｜含楼中楼共 ${
          card.totalCommentCount ??
          comments.reduce((n, c) => n + 1 + (c.replies?.length ?? 0), 0)
        } 条。`
      : `帖子互动：一级评论 ${card.topCommentCount ?? comments.length}｜含楼中楼共 ${
          card.totalCommentCount ??
          comments.reduce((n, c) => n + 1 + (c.replies?.length ?? 0), 0)
        } 条。`
  return [
    `【系统事件】${who}把同人通讯社的一篇同人帖分享到了微信，想和你一起聊这篇文。`,
    `标题「${card.title}」｜写手「${card.authorName}」｜类型：${card.kindLabel}。`,
    likeLine,
    note ? `作者的话：${note}` : '',
    `正文全文：\n${body}`,
    thread ? `楼下评论区（含楼中楼与点赞）：\n${thread}` : '楼下暂无评论。',
    `请结合人设真实讨论情节/人设/磕点/楼评氛围；可夸可刀可吐槽，勿假装没看到正文、作者的话或评论区。`,
  ]
    .filter(Boolean)
    .join('\n')
}

export type BuildForumShareInput = {
  post: ForumPost
  comments: ForumComment[]
  selfAuthorName?: string
  /** 帖子展示点赞数（含用户点赞） */
  postLikeCount?: number
  /** 用户是否已赞该帖 */
  postLikedByViewer?: boolean
  /** 用户已赞的评论 id */
  likedCommentIds?: ReadonlySet<string> | readonly string[]
}

function resolveCommentAuthorName(c: ForumComment, selfAuthorName?: string): string {
  if (c.authorPersonaId === 'forum-self') return selfAuthorName?.trim() || '我'
  return getNetizenPersona(c.authorPersonaId)?.username ?? '网友'
}

function commentLikeCount(
  commentId: string,
  isReply: boolean,
  likedIds: ReadonlySet<string>,
): { likeCount: number; likedByViewer: boolean } {
  const likedByViewer = likedIds.has(commentId)
  const base = forumShareStableLikeCount(commentId, 28, isReply ? 1 : 2)
  return { likeCount: base + (likedByViewer ? 1 : 0), likedByViewer }
}

export function buildForumSharePayload(input: BuildForumShareInput): WeChatForumSharePayload {
  const { post, comments } = input
  const isSelf = post.authorPersonaId === 'forum-self'
  const authorName = isSelf
    ? input.selfAuthorName?.trim() || '我'
    : getNetizenPersona(post.authorPersonaId)?.username ?? '网友'
  const likedSet: ReadonlySet<string> = (() => {
    const raw = input.likedCommentIds
    if (!raw) return new Set()
    return raw instanceof Set ? raw : new Set(raw)
  })()

  const forPost = comments.filter((c) => c.postId === post.id)
  const tops = forPost
    .filter((c) => !c.parentCommentId)
    .sort((a, b) => a.createdAt - b.createdAt)
    .slice(0, TOP_COMMENT_MAX)
  const repliesByParent = new Map<string, ForumComment[]>()
  for (const c of forPost) {
    const pid = c.parentCommentId?.trim()
    if (!pid) continue
    const list = repliesByParent.get(pid) ?? []
    list.push(c)
    repliesByParent.set(pid, list)
  }
  for (const list of repliesByParent.values()) {
    list.sort((a, b) => a.createdAt - b.createdAt)
  }

  let totalCommentCount = 0
  const commentsPreview: WeChatForumShareComment[] = tops.map((c) => {
    const name = resolveCommentAuthorName(c, input.selfAuthorName)
    const { likeCount, likedByViewer } = commentLikeCount(c.id, false, likedSet)
    const childRows = (repliesByParent.get(c.id) ?? []).slice(0, REPLY_PER_TOP_MAX)
    const replies: WeChatForumShareReply[] = childRows.map((r) => {
      const rName = resolveCommentAuthorName(r, input.selfAuthorName)
      const stats = commentLikeCount(r.id, true, likedSet)
      return {
        authorName: rName.slice(0, 32),
        content: normalizeForumFicProse(r.content).slice(0, COMMENT_CONTENT_MAX),
        likeCount: stats.likeCount,
        ...(stats.likedByViewer ? { likedByViewer: true } : {}),
        ...(r.authorPersonaId === post.authorPersonaId ? { isPostAuthor: true } : {}),
        replyToName: name.slice(0, 32),
      }
    })
    totalCommentCount += 1 + replies.length
    return {
      authorName: name.slice(0, 32),
      content: normalizeForumFicProse(c.content).slice(0, COMMENT_CONTENT_MAX),
      likeCount,
      ...(likedByViewer ? { likedByViewer: true } : {}),
      ...(c.authorPersonaId === post.authorPersonaId ? { isPostAuthor: true } : {}),
      ...(replies.length ? { replies } : {}),
    }
  })

  const nowMs = Date.now()
  const authorNote = post.authorNote?.trim()
    ? normalizeForumFicProse(post.authorNote).slice(0, NOTE_MAX)
    : undefined

  const postLikeBase =
    typeof post.likeCount === 'number' && post.likeCount >= 0
      ? post.likeCount
      : forumShareStableLikeCount(post.id)
  const postLikedByViewer = input.postLikedByViewer === true
  const postLikeCount =
    typeof input.postLikeCount === 'number' && Number.isFinite(input.postLikeCount)
      ? Math.max(0, Math.floor(input.postLikeCount))
      : postLikeBase + (postLikedByViewer ? 1 : 0)

  return {
    kind: 'forum_share',
    shareId: `fms-${nowMs}-${Math.random().toString(36).slice(2, 8)}`,
    postId: post.id,
    boardCharacterId: post.characterId.trim() || '__plaza__',
    title: post.title.trim().slice(0, 80) || '无题',
    authorName: authorName.slice(0, 64),
    kindLabel: forumKindLabel(post.kind),
    body: stripForumFicTrailingMeta(normalizeForumFicProse(post.body)).slice(0, BODY_MAX),
    likeCount: postLikeCount,
    ...(postLikedByViewer ? { likedByViewer: true } : {}),
    topCommentCount: tops.length,
    totalCommentCount,
    ...(authorNote ? { authorNote } : {}),
    ...(commentsPreview.length ? { commentsPreview } : {}),
  }
}

async function sendOneForumShare(
  characterId: string,
  forumShare: WeChatForumSharePayload,
): Promise<string> {
  // 与听一听分享一致：会话身份跟 ChatRoom 对齐；时间戳用角色剧情时钟，
  // 避免墙钟 Date.now 把卡片沉进历史（线下剧情推远后聊天室只看最近窗口）。
  let target: Awaited<ReturnType<typeof resolveListenTogetherPrivateChatTarget>>
  try {
    target = await resolveListenTogetherPrivateChatTarget(characterId)
  } catch (e) {
    const msg = e instanceof Error ? e.message : ''
    if (msg === 'no active wechat account') throw new Error('请先登录微信账号')
    if (msg === 'no player identity') throw new Error('请先设置玩家身份')
    throw e instanceof Error ? e : new Error('分享失败，请重试')
  }

  const { playerIdentityId, conversationKey, timestamp, storyDay, storyTime, storyTimeLabel } = target
  const messageId = `wxm-${timestamp}-fms-${Math.random().toString(36).slice(2, 8)}`

  await personaDb.appendWeChatChatMessage({
    id: messageId,
    characterId,
    playerIdentityId,
    type: 'player',
    content: forumShareContentFallback(forumShare),
    forumShare,
    timestamp,
    ...(storyDay ? { storyDay } : {}),
    ...(storyTime ? { storyTime } : {}),
    ...(storyTimeLabel ? { storyTimeLabel } : {}),
    isRead: true,
    conversationKey,
  })

  const written = await personaDb.getWeChatChatMessageById(messageId)
  if (!written?.forumShare) {
    throw new Error('分享写入失败，请重试')
  }

  await personaDb.markWeChatConversationReadToLatest(conversationKey)
  return messageId
}

/** 把同人帖分享给一位或多位微信好友（私聊） */
export async function sendForumShareToWeChatContacts(
  characterIds: string[],
  input: BuildForumShareInput,
): Promise<{ sent: number; messageIds: string[] }> {
  const ids = [...new Set(characterIds.map((id) => id.trim()).filter(Boolean))]
  if (ids.length === 0) throw new Error('请选择至少一位好友')
  if (!input.post.body.trim()) throw new Error('帖子正文为空')

  const base = buildForumSharePayload(input)
  const messageIds: string[] = []
  for (const characterId of ids) {
    const forumShare: WeChatForumSharePayload = {
      ...base,
      shareId: `fms-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    }
    messageIds.push(await sendOneForumShare(characterId, forumShare))
  }
  emitWeChatStorageChanged()
  return { sent: messageIds.length, messageIds }
}
