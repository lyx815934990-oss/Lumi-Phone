import { create } from 'zustand'

import { personaDb } from '../wechat/newFriendsPersona/idb'
import {
  emptyForumAccountData,
  emptyForumCharSlice,
  FORUM_KV_KEY,
  type ForumAccountData,
  type ForumCharSlice,
  type ForumComment,
  type ForumPersistedRoot,
  type ForumPost,
} from './forumTypes'

type ForumStore = {
  hydrated: boolean
  currentAccountId: string | null
  root: ForumPersistedRoot

  bindAccount: (accountId: string | null | undefined) => Promise<void>
  getSlice: (characterId: string) => ForumCharSlice
  listPosts: (characterId: string) => ForumPost[]
  /** 扫全账号切片，按作者人格聚合 */
  listPostsByAuthor: (authorPersonaId: string) => Array<ForumPost & { boardId: string }>
  getPost: (characterId: string, postId: string) => ForumPost | null
  listCommentsForPost: (characterId: string, postId: string) => ForumComment[]
  addPost: (characterId: string, post: ForumPost) => void
  addComments: (characterId: string, comments: ForumComment[]) => void
  deletePost: (characterId: string, postId: string) => void
}

const EMPTY_ROOT: ForumPersistedRoot = { byAccount: {} }

let persistTimer: ReturnType<typeof setTimeout> | null = null

function schedulePersist(root: ForumPersistedRoot) {
  if (persistTimer) clearTimeout(persistTimer)
  persistTimer = setTimeout(() => {
    void personaDb.setPhoneKv(FORUM_KV_KEY, root)
  }, 280)
}

function normalizePost(raw: unknown): ForumPost | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Partial<ForumPost>
  if (typeof r.id !== 'string' || !r.id.trim()) return null
  if (typeof r.characterId !== 'string' || !r.characterId.trim()) return null
  if (typeof r.authorPersonaId !== 'string' || !r.authorPersonaId.trim()) return null
  const kind = r.kind === 'custom' || r.kind === 'char' || r.kind === 'ship' ? r.kind : 'ship'
  return {
    id: r.id.trim(),
    kind,
    characterId: r.characterId.trim(),
    authorPersonaId: r.authorPersonaId.trim(),
    title: typeof r.title === 'string' ? r.title.trim() || '无题' : '无题',
    body: typeof r.body === 'string' ? r.body : '',
    createdAt: typeof r.createdAt === 'number' && Number.isFinite(r.createdAt) ? r.createdAt : Date.now(),
    ...(typeof r.publicContextDigest === 'string' && r.publicContextDigest.trim()
      ? { publicContextDigest: r.publicContextDigest.trim() }
      : {}),
    ...(Array.isArray(r.customPicks) ? { customPicks: r.customPicks } : {}),
  }
}

function normalizeComment(raw: unknown): ForumComment | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Partial<ForumComment>
  if (typeof r.id !== 'string' || !r.id.trim()) return null
  if (typeof r.postId !== 'string' || !r.postId.trim()) return null
  if (typeof r.authorPersonaId !== 'string' || !r.authorPersonaId.trim()) return null
  const content = typeof r.content === 'string' ? r.content.trim() : ''
  if (!content) return null
  return {
    id: r.id.trim(),
    postId: r.postId.trim(),
    authorPersonaId: r.authorPersonaId.trim(),
    content,
    createdAt: typeof r.createdAt === 'number' && Number.isFinite(r.createdAt) ? r.createdAt : Date.now(),
    ...(typeof r.parentCommentId === 'string' && r.parentCommentId.trim()
      ? { parentCommentId: r.parentCommentId.trim() }
      : {}),
  }
}

function normalizeSlice(raw: unknown): ForumCharSlice {
  if (!raw || typeof raw !== 'object') return emptyForumCharSlice()
  const r = raw as Partial<ForumCharSlice>
  const posts = Array.isArray(r.posts)
    ? r.posts.map(normalizePost).filter((x): x is ForumPost => !!x)
    : []
  const comments = Array.isArray(r.comments)
    ? r.comments.map(normalizeComment).filter((x): x is ForumComment => !!x)
    : []
  return {
    posts: posts.sort((a, b) => b.createdAt - a.createdAt),
    comments,
  }
}

function normalizeRoot(raw: unknown): ForumPersistedRoot {
  if (!raw || typeof raw !== 'object') return { byAccount: {} }
  const byAccount = (raw as ForumPersistedRoot).byAccount
  if (!byAccount || typeof byAccount !== 'object') return { byAccount: {} }
  const next: ForumPersistedRoot = { byAccount: {} }
  for (const [acc, data] of Object.entries(byAccount)) {
    if (!acc.trim() || !data || typeof data !== 'object') continue
    const byChar: Record<string, ForumCharSlice> = {}
    const rawByChar = (data as ForumAccountData).byChar ?? {}
    for (const [charId, slice] of Object.entries(rawByChar)) {
      if (!charId.trim()) continue
      byChar[charId] = normalizeSlice(slice)
    }
    next.byAccount[acc] = { byChar }
  }
  return next
}

function patchSlice(
  root: ForumPersistedRoot,
  accountId: string,
  characterId: string,
  recipe: (slice: ForumCharSlice) => ForumCharSlice,
): ForumPersistedRoot {
  const acc = root.byAccount[accountId] ?? emptyForumAccountData()
  const current = acc.byChar[characterId] ?? emptyForumCharSlice()
  return {
    byAccount: {
      ...root.byAccount,
      [accountId]: {
        byChar: {
          ...acc.byChar,
          [characterId]: recipe(current),
        },
      },
    },
  }
}

function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function createForumPostId(): string {
  return uid('fp')
}

export function createForumCommentId(): string {
  return uid('fc')
}

export const useForumStore = create<ForumStore>((set, get) => ({
  hydrated: false,
  currentAccountId: null,
  root: EMPTY_ROOT,

  async bindAccount(accountId) {
    const acc = accountId?.trim() || null
    if (acc === get().currentAccountId && get().hydrated) return

    if (!acc) {
      set({ currentAccountId: null, root: EMPTY_ROOT, hydrated: true })
      return
    }

    const raw = await personaDb.getPhoneKv(FORUM_KV_KEY)
    set({
      currentAccountId: acc,
      root: normalizeRoot(raw),
      hydrated: true,
    })
  },

  getSlice(characterId) {
    const acc = get().currentAccountId
    const cid = characterId.trim()
    if (!acc || !cid) return emptyForumCharSlice()
    return get().root.byAccount[acc]?.byChar[cid] ?? emptyForumCharSlice()
  },

  listPosts(characterId) {
    return get().getSlice(characterId).posts
  },

  listPostsByAuthor(authorPersonaId) {
    const acc = get().currentAccountId
    const aid = authorPersonaId.trim()
    if (!acc || !aid) return []
    const byChar = get().root.byAccount[acc]?.byChar ?? {}
    const rows: Array<ForumPost & { boardId: string }> = []
    for (const [boardId, slice] of Object.entries(byChar)) {
      for (const p of slice.posts) {
        if (p.authorPersonaId === aid) rows.push({ ...p, boardId })
      }
    }
    return rows.sort((a, b) => b.createdAt - a.createdAt)
  },

  getPost(characterId, postId) {
    const pid = postId.trim()
    if (!pid) return null
    return get().listPosts(characterId).find((p) => p.id === pid) ?? null
  },

  listCommentsForPost(characterId, postId) {
    const pid = postId.trim()
    if (!pid) return []
    return get()
      .getSlice(characterId)
      .comments.filter((c) => c.postId === pid)
      .sort((a, b) => a.createdAt - b.createdAt)
  },

  addPost(characterId, post) {
    const acc = get().currentAccountId
    const cid = characterId.trim()
    if (!acc || !cid) return
    const next = patchSlice(get().root, acc, cid, (slice) => ({
      ...slice,
      posts: [post, ...slice.posts.filter((p) => p.id !== post.id)].sort(
        (a, b) => b.createdAt - a.createdAt,
      ),
    }))
    set({ root: next })
    schedulePersist(next)
  },

  addComments(characterId, comments) {
    const acc = get().currentAccountId
    const cid = characterId.trim()
    if (!acc || !cid || !comments.length) return
    const byId = new Map(comments.map((c) => [c.id, c]))
    const next = patchSlice(get().root, acc, cid, (slice) => {
      const kept = slice.comments.filter((c) => !byId.has(c.id))
      return { ...slice, comments: [...kept, ...comments] }
    })
    set({ root: next })
    schedulePersist(next)
  },

  deletePost(characterId, postId) {
    const acc = get().currentAccountId
    const cid = characterId.trim()
    const pid = postId.trim()
    if (!acc || !cid || !pid) return
    const next = patchSlice(get().root, acc, cid, (slice) => ({
      posts: slice.posts.filter((p) => p.id !== pid),
      comments: slice.comments.filter((c) => c.postId !== pid),
    }))
    set({ root: next })
    schedulePersist(next)
  },
}))
