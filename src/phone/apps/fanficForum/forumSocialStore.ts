/**
 * 通讯社关注关系 + 笔名（按微信账号隔离）。
 * 与帖子库分开存，避免动现有 forum:v1 schema。
 */

import { create } from 'zustand'

import { personaDb } from '../wechat/newFriendsPersona/idb'
import { listResidentWriters } from './residentWriters'

export const FORUM_SOCIAL_KV_KEY = 'fanfic-forum:social:v1'

type SocialAccount = {
  /** 已关注写手 id */
  followingWriterIds: string[]
  /** 通讯社笔名（可改） */
  penName?: string
  /**
   * 通讯社自定义头像（data URL）。
   * 与微信头像完全隔离：有值才覆盖展示；清空后仍回落到微信头像。
   */
  avatarDataUrl?: string
  /** 已点赞的帖子 id */
  likedPostIds?: string[]
  /** 已点赞的评论 / 回复 id */
  likedCommentIds?: string[]
}

type SocialRoot = {
  byAccount: Record<string, SocialAccount>
}

type ForumSocialStore = {
  hydrated: boolean
  currentAccountId: string | null
  root: SocialRoot
  bindAccount: (accountId: string | null | undefined) => Promise<void>
  followingIds: () => string[]
  isFollowing: (writerId: string) => boolean
  toggleFollow: (writerId: string) => void
  /** 当前账号笔名；空则未设置 */
  penName: () => string
  setPenName: (name: string) => void
  /** 通讯社自定义头像；空则用微信头像 */
  avatarDataUrl: () => string
  setAvatarDataUrl: (dataUrl: string | null) => void
  isPostLiked: (postId: string) => boolean
  togglePostLike: (postId: string) => void
  isCommentLiked: (commentId: string) => boolean
  toggleCommentLike: (commentId: string) => void
  /** 粉丝数：活动量派生 + 稳定底数，避免空账号全 0 */
  followerCount: (postCount: number, commentCount: number) => number
}

const EMPTY_ROOT: SocialRoot = { byAccount: {} }

let persistTimer: ReturnType<typeof setTimeout> | null = null

function schedulePersist(root: SocialRoot) {
  if (persistTimer) clearTimeout(persistTimer)
  persistTimer = setTimeout(() => {
    void personaDb.setPhoneKv(FORUM_SOCIAL_KV_KEY, root)
  }, 280)
}

function defaultFollowing(): string[] {
  return listResidentWriters().map((w) => w.id)
}

function normalizeRoot(raw: unknown): SocialRoot {
  if (!raw || typeof raw !== 'object') return EMPTY_ROOT
  const byAccount: Record<string, SocialAccount> = {}
  const src = (raw as SocialRoot).byAccount
  if (!src || typeof src !== 'object') return EMPTY_ROOT
  for (const [acc, slice] of Object.entries(src)) {
    if (!acc.trim()) continue
    const ids = Array.isArray(slice?.followingWriterIds)
      ? slice.followingWriterIds.filter((x): x is string => typeof x === 'string' && !!x.trim())
      : defaultFollowing()
    const pen =
      typeof slice?.penName === 'string' && slice.penName.trim() ? slice.penName.trim().slice(0, 24) : undefined
    const avatar =
      typeof slice?.avatarDataUrl === 'string' && slice.avatarDataUrl.startsWith('data:image/')
        ? slice.avatarDataUrl
        : undefined
    const liked = Array.isArray(slice?.likedPostIds)
      ? slice.likedPostIds.filter((x): x is string => typeof x === 'string' && !!x.trim())
      : []
    const likedComments = Array.isArray(slice?.likedCommentIds)
      ? slice.likedCommentIds.filter((x): x is string => typeof x === 'string' && !!x.trim())
      : []
    byAccount[acc] = {
      followingWriterIds: [...new Set(ids)],
      ...(pen ? { penName: pen } : {}),
      ...(avatar ? { avatarDataUrl: avatar } : {}),
      ...(liked.length ? { likedPostIds: [...new Set(liked)] } : {}),
      ...(likedComments.length ? { likedCommentIds: [...new Set(likedComments)] } : {}),
    }
  }
  return { byAccount }
}

function stableSeed(accountId: string): number {
  let h = 2166136261
  for (let i = 0; i < accountId.length; i += 1) {
    h ^= accountId.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return Math.abs(h)
}

export const useForumSocialStore = create<ForumSocialStore>((set, get) => ({
  hydrated: false,
  currentAccountId: null,
  root: EMPTY_ROOT,

  bindAccount: async (accountId) => {
    const acc = String(accountId ?? '').trim() || null
    try {
      const raw = await personaDb.getPhoneKv(FORUM_SOCIAL_KV_KEY)
      const root = normalizeRoot(raw)
      if (acc && !root.byAccount[acc]) {
        root.byAccount[acc] = { followingWriterIds: defaultFollowing() }
        schedulePersist(root)
      }
      set({ hydrated: true, currentAccountId: acc, root })
    } catch {
      const root: SocialRoot = acc
        ? { byAccount: { [acc]: { followingWriterIds: defaultFollowing() } } }
        : EMPTY_ROOT
      set({ hydrated: true, currentAccountId: acc, root })
    }
  },

  followingIds: () => {
    const { currentAccountId, root } = get()
    if (!currentAccountId) return []
    return root.byAccount[currentAccountId]?.followingWriterIds ?? []
  },

  isFollowing: (writerId) => {
    const id = writerId.trim()
    if (!id) return false
    return get().followingIds().includes(id)
  },

  toggleFollow: (writerId) => {
    const id = writerId.trim()
    const acc = get().currentAccountId
    if (!id || !acc) return
    const root = structuredClone(get().root)
    const slice = root.byAccount[acc] ?? { followingWriterIds: [] }
    const setIds = new Set(slice.followingWriterIds)
    if (setIds.has(id)) setIds.delete(id)
    else setIds.add(id)
    root.byAccount[acc] = { ...slice, followingWriterIds: [...setIds] }
    schedulePersist(root)
    set({ root })
  },

  penName: () => {
    const { currentAccountId, root } = get()
    if (!currentAccountId) return ''
    return root.byAccount[currentAccountId]?.penName?.trim() ?? ''
  },

  setPenName: (name) => {
    const acc = get().currentAccountId
    if (!acc) return
    const next = name.trim().slice(0, 24)
    const root = structuredClone(get().root)
    const slice = root.byAccount[acc] ?? { followingWriterIds: defaultFollowing() }
    root.byAccount[acc] = {
      ...slice,
      ...(next ? { penName: next } : { penName: undefined }),
    }
    if (!next) delete root.byAccount[acc]!.penName
    schedulePersist(root)
    set({ root })
  },

  avatarDataUrl: () => {
    const { currentAccountId, root } = get()
    if (!currentAccountId) return ''
    return root.byAccount[currentAccountId]?.avatarDataUrl?.trim() ?? ''
  },

  setAvatarDataUrl: (dataUrl) => {
    const acc = get().currentAccountId
    if (!acc) return
    const root = structuredClone(get().root)
    const slice = root.byAccount[acc] ?? { followingWriterIds: defaultFollowing() }
    const next = typeof dataUrl === 'string' && dataUrl.startsWith('data:image/') ? dataUrl : ''
    root.byAccount[acc] = { ...slice }
    if (next) root.byAccount[acc]!.avatarDataUrl = next
    else delete root.byAccount[acc]!.avatarDataUrl
    schedulePersist(root)
    set({ root })
  },

  isPostLiked: (postId) => {
    const id = postId.trim()
    if (!id) return false
    const acc = get().currentAccountId ?? '__guest__'
    return get().root.byAccount[acc]?.likedPostIds?.includes(id) ?? false
  },

  togglePostLike: (postId) => {
    const id = postId.trim()
    if (!id) return
    const acc = get().currentAccountId ?? '__guest__'
    const root = structuredClone(get().root)
    const slice = root.byAccount[acc] ?? { followingWriterIds: defaultFollowing() }
    const setIds = new Set(slice.likedPostIds ?? [])
    if (setIds.has(id)) setIds.delete(id)
    else setIds.add(id)
    root.byAccount[acc] = {
      ...slice,
      likedPostIds: [...setIds],
    }
    if (setIds.size === 0) delete root.byAccount[acc]!.likedPostIds
    schedulePersist(root)
    set({ root })
  },

  isCommentLiked: (commentId) => {
    const id = commentId.trim()
    if (!id) return false
    const acc = get().currentAccountId ?? '__guest__'
    return get().root.byAccount[acc]?.likedCommentIds?.includes(id) ?? false
  },

  toggleCommentLike: (commentId) => {
    const id = commentId.trim()
    if (!id) return
    const acc = get().currentAccountId ?? '__guest__'
    const root = structuredClone(get().root)
    const slice = root.byAccount[acc] ?? { followingWriterIds: defaultFollowing() }
    const setIds = new Set(slice.likedCommentIds ?? [])
    if (setIds.has(id)) setIds.delete(id)
    else setIds.add(id)
    root.byAccount[acc] = {
      ...slice,
      likedCommentIds: [...setIds],
    }
    if (setIds.size === 0) delete root.byAccount[acc]!.likedCommentIds
    schedulePersist(root)
    set({ root })
  },

  followerCount: (postCount, commentCount) => {
    const acc = get().currentAccountId ?? 'guest'
    const base = 40 + (stableSeed(acc) % 120)
    return base + postCount * 8 + commentCount * 2
  },
}))
