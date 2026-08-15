/** 查手机 · 追剧观影记录 */

export type MediaKind = 'series' | 'movie' | 'novel' | 'comic' | 'anime'

export const MEDIA_KIND_LABEL: Record<MediaKind, string> = {
  series: '剧集',
  movie: '电影',
  novel: '小说',
  comic: '漫画',
  anime: '动漫',
}

export const MEDIA_KINDS: MediaKind[] = ['series', 'movie', 'novel', 'comic', 'anime']

export type MediaFilter = 'all' | MediaKind

export type BingeComment = {
  text: string
  atLabel: string
  likes?: number
}

export type BingeItem = {
  id: string
  kind: MediaKind
  title: string
  /** CSS 渐变作封面占位 */
  posterTone: string
  posterCaption?: string
  /** 原作者 / 导演 / 主演等一行小字 */
  creators?: string
  /** 追更中 / 已完结 / 暂停追看 / 已看完 / 连载中 / 弃坑… */
  status: string
  /** 0–1 */
  progress: number
  /** 类型专属进度文案 */
  progressLabel: string
  /** 累计观看/阅读分钟 */
  totalMinutes: number
  lastWatchedLabel: string
  favorited: boolean
  synopsis: string
  comment?: BingeComment
  forumId?: string
}

export type WatchSessionGroup = 'today' | 'yesterday' | 'earlier'

export type WatchSession = {
  id: string
  itemId: string
  group: WatchSessionGroup
  dateKey: string
  progressNote: string
  durationLabel: string
  timeLabel: string
}

export type ForumPost = {
  id: string
  nick: string
  isCharacter: boolean
  body: string
  likes: number
  replies: number
  timeLabel: string
}

export type ForumGroup = {
  id: string
  name: string
  relatedTitle: string
  coverTone: string
  memberCount: number
  activityLabel: string
  bio: string
  posts: ForumPost[]
}

export type SearchRecord = {
  id: string
  query: string
  timeLabel: string
}

export type BingeDataset = {
  monthHours: number
  kindShare: Record<MediaKind, number>
  items: BingeItem[]
  sessions: WatchSession[]
  forums: ForumGroup[]
  searches: SearchRecord[]
}

export type BingeScreen =
  | { kind: 'home' }
  | { kind: 'detail'; itemId: string }
  | { kind: 'history' }
  | { kind: 'favorites' }
  | { kind: 'forums' }
  | { kind: 'forum'; forumId: string }
  | { kind: 'comments' }
  | { kind: 'searches' }
  | { kind: 'searchResults'; query: string }

export function emptyBingeDataset(): BingeDataset {
  return {
    monthHours: 0,
    kindShare: { series: 0.2, movie: 0.2, novel: 0.2, comic: 0.2, anime: 0.2 },
    items: [],
    sessions: [],
    forums: [],
    searches: [],
  }
}

export function hasBingeContent(data: BingeDataset | null | undefined): boolean {
  return !!data && Array.isArray(data.items) && data.items.length > 0
}

export function formatTotalDuration(minutes: number): string {
  const m = Math.max(0, Math.round(minutes))
  if (m < 60) return `${m}分钟`
  const h = Math.floor(m / 60)
  const rest = m % 60
  return rest ? `${h}小时${rest}分` : `${h}小时`
}
