/**
 * Lumi 同人创作论坛 · 类型
 * 一期仅落地 kind: 'ship'；custom / char 预留二期。
 */

/** 帖子类型：本命 / 自定义请求 / 角色自发（后二者二期） */
export type ForumPostKind = 'ship' | 'custom' | 'char'

export type ForumPost = {
  id: string
  kind: ForumPostKind
  characterId: string
  authorPersonaId: string
  title: string
  body: string
  createdAt: number
  /** 生成时注入的公开素材摘要，便于调试/重生成 */
  publicContextDigest?: string
  /**
   * 二期：自定义同人文关联的选角 context
   * @see AnimeCharacterPick
   */
  customPicks?: AnimeCharacterPick[]
}

export type ForumComment = {
  id: string
  postId: string
  authorPersonaId: string
  content: string
  /** 仅允许一层：parent 必须是一级评论 */
  parentCommentId?: string
  createdAt: number
}

/** 按角色隔离的论坛切片 */
export type ForumCharSlice = {
  posts: ForumPost[]
  comments: ForumComment[]
}

export type ForumAccountData = {
  byChar: Record<string, ForumCharSlice>
}

export type ForumPersistedRoot = {
  byAccount: Record<string, ForumAccountData>
}

/** AniList/Jikan/手动选角结果（一期组件产出，二期接入 custom 生成） */
export type AnimeCharacterPick = {
  mediaTitle: string
  characterName: string
  characterBio?: string
  imageUrl?: string
  /** anilist / jikan / bangumi / manual */
  source?: 'anilist' | 'jikan' | 'bangumi' | 'manual'
  mediaId?: number
  characterId?: number
}

export const FORUM_KV_KEY = 'fanfic-forum:v1'

/**
 * 广场直接发起的「原作选角同人文」落库板：不依赖通讯录角色。
 * 发现流可见；不出现在某位好友的角色主页。
 */
export const FORUM_PLAZA_BOARD_ID = '__plaza__'

export function isForumPlazaBoardId(characterId: string | null | undefined): boolean {
  return String(characterId ?? '').trim() === FORUM_PLAZA_BOARD_ID
}


/** 稳定空切片：禁止在渲染选择器里每次 `?? []`，否则 Zustand 会把更新打满 */
export const EMPTY_FORUM_CHAR_SLICE: ForumCharSlice = Object.freeze({
  posts: Object.freeze([]) as unknown as ForumPost[],
  comments: Object.freeze([]) as unknown as ForumComment[],
}) as ForumCharSlice

export function emptyForumCharSlice(): ForumCharSlice {
  return EMPTY_FORUM_CHAR_SLICE
}

export function emptyForumAccountData(): ForumAccountData {
  return { byChar: {} }
}
