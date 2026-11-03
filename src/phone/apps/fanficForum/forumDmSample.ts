/**
 * 通讯社私信 / 互动：类型与（可选）互动示例帖。
 * 私信列表示例数据已移除，等待真实 store。
 */

import { FORUM_PLAZA_BOARD_ID, type ForumComment, type ForumPost } from './forumTypes'

/** 示例帖落在广场板，不污染真实角色切片 */
export const FORUM_SAMPLE_POST_BOARD = FORUM_PLAZA_BOARD_ID

export type ForumDmItem = {
  id: string
  fromId: string
  preview: string
  time: string
  unread: boolean
  /** 未读条数；unread 为 true 时至少为 1 */
  unreadCount?: number
}

export type ForumDmBubble = {
  id: string
  fromMe: boolean
  text: string
  time: string
}

export type ForumNotifItem = {
  id: string
  kind: 'reply' | 'like' | 'comment'
  fromId: string
  text: string
  preview: string
  time: string
  unread: boolean
  unreadCount?: number
  /** 关联帖标题 */
  postTitle: string
  /** 你发出的原评论（回复/点赞场景） */
  yourComment?: string
  /** 对方内容 */
  theirContent: string
  /** 帖子摘要 */
  postExcerpt: string
}

export function forumItemUnreadCount(item: { unread: boolean; unreadCount?: number }): number {
  if (!item.unread) return 0
  const n = item.unreadCount
  return typeof n === 'number' && n > 0 ? Math.floor(n) : 1
}

/** 私信列表现已不走示例数据；保留空表兼容旧引用 */
export const FORUM_SAMPLE_DMS: readonly ForumDmItem[] = []

export const FORUM_SAMPLE_NOTIFS: readonly ForumNotifItem[] = [
  {
    id: 'n1',
    kind: 'reply',
    fromId: 'nz-kexue',
    text: '回复了你在《雨夜车站》的评论',
    preview: '伞沿那半步我直接没了…',
    time: '2 分钟前',
    unread: true,
    unreadCount: 1,
    postTitle: '雨夜车站',
    yourComment: '后半收得干净，没硬升华。伞沿那半步太准了。',
    theirContent: '伞沿那半步我直接没了…作者怎么敢这么写的。',
    postExcerpt: '雨刚停，站台灯亮得发白。你说等下一班，他却先转过身去。',
  },
  {
    id: 'n2',
    kind: 'like',
    fromId: 'nz-dushe',
    text: '赞了你的评论',
    preview: '后半收得干净，没硬升华。',
    time: '18 分钟前',
    unread: true,
    unreadCount: 3,
    postTitle: '雨夜车站',
    yourComment: '后半收得干净，没硬升华。',
    theirContent: '赞了这条评论',
    postExcerpt: '雨刚停，站台灯亮得发白。你说等下一班，他却先转过身去。',
  },
  {
    id: 'n3',
    kind: 'comment',
    fromId: 'nz-kaoju',
    text: '评论了你的帖子《三月的伞》',
    preview: '时间线有个小问题…',
    time: '1 小时前',
    unread: false,
    postTitle: '三月的伞',
    theirContent:
      '时间线有个小问题：前一段写「上周二」，后文又说「三天前还在下雨」——按日历对不上。不过伞的细节很稳。',
    postExcerpt: '三月的伞还挂在玄关。他伸手的时候，你假装没看见水珠。',
  },
]

export function getForumDmItem(_id: string): ForumDmItem | null {
  return null
}

export function getForumDmThread(_id: string): ForumDmBubble[] {
  return []
}

export function getForumNotifItem(id: string): ForumNotifItem | null {
  return FORUM_SAMPLE_NOTIFS.find((n) => n.id === id) ?? null
}

const NOW = Date.now()

/** 与互动通知标题对应的示例帖（无真实发帖时也能点进详情） */
export const FORUM_SAMPLE_POSTS: readonly ForumPost[] = [
  {
    id: 'sample-post-rain',
    kind: 'ship',
    characterId: FORUM_SAMPLE_POST_BOARD,
    authorPersonaId: 'rw-baimiao',
    title: '雨夜车站',
    body:
      '雨刚停，站台灯亮得发白。你说等下一班，他却先转过身去。\n\n伞沿还挂着水，他往外走了半步，又停。鞋尖踩进积水里，涟漪一圈圈散开。你跟上去，没有叫他的名字——叫了就像在追。\n\n末班车的广播断断续续。他把伞柄往你这边偏了偏，仍不看你。\n\n「还有一班。」他说。\n\n你应了一声。雨又细了起来。',
    createdAt: NOW - 1000 * 60 * 60 * 26,
  },
  {
    id: 'sample-post-umbrella',
    kind: 'ship',
    characterId: FORUM_SAMPLE_POST_BOARD,
    authorPersonaId: 'forum-self',
    title: '三月的伞',
    body:
      '三月的伞还挂在玄关。他伸手的时候，你假装没看见水珠。\n\n上周二他说「三天前还在下雨」——日历对不上，你也没拆穿。伞骨有点松，收的时候会咔一声。\n\n他把伞放回钩子，袖口蹭过你手背。像无意，又像故意。\n\n外面天已经亮了。',
    createdAt: NOW - 1000 * 60 * 60 * 50,
  },
]

const SAMPLE_COMMENTS: readonly ForumComment[] = [
  {
    id: 'sample-c-rain-self',
    postId: 'sample-post-rain',
    authorPersonaId: 'forum-self',
    content: '后半收得干净，没硬升华。伞沿那半步太准了。',
    createdAt: NOW - 1000 * 60 * 40,
  },
  {
    id: 'sample-c-rain-reply',
    postId: 'sample-post-rain',
    authorPersonaId: 'nz-kexue',
    parentCommentId: 'sample-c-rain-self',
    content: '伞沿那半步我直接没了…作者怎么敢这么写的。',
    createdAt: NOW - 1000 * 60 * 2,
  },
  {
    id: 'sample-c-rain-like-note',
    postId: 'sample-post-rain',
    authorPersonaId: 'nz-dushe',
    content: '这条我赞了。后半收得干净，没硬升华——同意。',
    createdAt: NOW - 1000 * 60 * 18,
  },
  {
    id: 'sample-c-umb-kaoju',
    postId: 'sample-post-umbrella',
    authorPersonaId: 'nz-kaoju',
    content:
      '时间线有个小问题：前一段写「上周二」，后文又说「三天前还在下雨」——按日历对不上。不过伞的细节很稳。',
    createdAt: NOW - 1000 * 60 * 60,
  },
]

/** 互动 id → 示例帖 */
const NOTIF_TO_SAMPLE_POST: Record<string, string> = {
  n1: 'sample-post-rain',
  n2: 'sample-post-rain',
  n3: 'sample-post-umbrella',
}

export function getForumSamplePost(postId: string): ForumPost | null {
  return FORUM_SAMPLE_POSTS.find((p) => p.id === postId) ?? null
}

export function getForumSampleComments(postId: string): ForumComment[] {
  return SAMPLE_COMMENTS.filter((c) => c.postId === postId).sort(
    (a, b) => a.createdAt - b.createdAt,
  )
}

export function isForumSamplePostId(postId: string): boolean {
  return FORUM_SAMPLE_POSTS.some((p) => p.id === postId)
}

/** 互动通知对应的示例帖坐标；始终可点进详情 */
export function resolveForumNotifSamplePost(
  notifId: string,
): { characterId: string; postId: string } | null {
  const postId = NOTIF_TO_SAMPLE_POST[notifId]
  if (!postId) return null
  const post = getForumSamplePost(postId)
  if (!post) return null
  return { characterId: post.characterId, postId: post.id }
}

/** @deprecated 请用 forumInboxUnreadStore.selectForumInboxBadge */
export function forumDmUnreadCount(): number {
  let total = 0
  for (const d of FORUM_SAMPLE_DMS) total += forumItemUnreadCount(d)
  for (const n of FORUM_SAMPLE_NOTIFS) total += forumItemUnreadCount(n)
  return total
}
