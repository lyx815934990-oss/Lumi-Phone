export type BrowserTheme = 'light' | 'dark'

export type BrowserScreen =
  | 'newtab'
  | 'suggest'
  | 'serp'
  | 'article'
  | 'forum'
  | 'history'
  | 'bookmarks'
  | 'shared'
  | 'tabs'

export type FrequentSite = {
  id: string
  name: string
  host: string
  /** 单字或两字缩写，作图标 */
  glyph: string
  /** 点开常去时跳转的详情（有则打开文章/论坛，而不是空搜索） */
  pageKind?: 'article' | 'forum'
  pageId?: string
}

export type RecentBrowseCard = {
  id: string
  title: string
  url: string
  visitedAt: string
  /** CSS 渐变作缩略图占位，避免外链依赖 */
  thumbTone: string
  /** 缩略图画面描述（有则显示在占位图中间） */
  thumbCaption?: string
  pageKind: 'article' | 'forum' | 'serp'
  pageId?: string
}

export type SuggestItem = {
  id: string
  text: string
  source: 'history' | 'suggest'
}

export type SerpResult = {
  id: string
  siteName: string
  host: string
  url: string
  title: string
  snippet: string
  pageKind: 'article' | 'forum'
  pageId: string
}

export type ArticlePage = {
  id: string
  url: string
  siteName: string
  author: string
  publishedAt: string
  title: string
  /** 正文段落 */
  paragraphs: string[]
  /** 高亮的段落索引与起止字（可选） */
  highlight?: { paragraphIndex: number; phrase: string }
  imageTone?: string
  imageCaption?: string
}

export type ForumReply = {
  id: string
  nick: string
  content: string
  likes: number
  liked?: boolean
  time: string
  /** 是否为角色本人发言（头像用角色微信头像） */
  isCharacter?: boolean
}

export type ForumPage = {
  id: string
  url: string
  siteName: string
  opNick: string
  opTime: string
  opContent: string
  /** 楼主是否为角色本人 */
  opIsCharacter?: boolean
  replies: ForumReply[]
}

export type HistoryGroup = 'today' | 'yesterday' | 'earlier'

export type HistoryItem = {
  id: string
  title: string
  url: string
  host: string
  timeLabel: string
  group: HistoryGroup
  pageKind?: 'article' | 'forum' | 'serp'
  pageId?: string
}

export type BookmarkFolder = {
  id: string
  name: string
}

export type BookmarkItem = {
  id: string
  folderId: string
  title: string
  siteName: string
  url: string
  savedAt: string
  thumbTone: string
  /** 缩略图中间显示的画面描述 */
  thumbCaption?: string
  pageKind?: 'article' | 'forum'
  pageId?: string
}

export type BrowserTab = {
  id: string
  title: string
  url: string
  screen: BrowserScreen
  query?: string
  pageId?: string
  pageKind?: 'article' | 'forum'
  thumbTone: string
}

/** 角色分享过的网页记录（朋友圈/好友/群聊等） */
export type SharedPageRecord = {
  id: string
  title: string
  url: string
  host: string
  /** 分享渠道，如 微信好友 / 朋友圈 / 群聊 */
  channel: string
  /** 分享时的配文 */
  caption?: string
  timeLabel: string
  group: HistoryGroup
  thumbTone: string
  thumbCaption?: string
  pageKind?: 'article' | 'forum'
  pageId?: string
}

export type BrowserDataset = {
  frequents: FrequentSite[]
  recents: RecentBrowseCard[]
  suggests: SuggestItem[]
  serpByQuery: Record<string, { resultCountLabel: string; results: SerpResult[]; related: string[] }>
  articles: Record<string, ArticlePage>
  forums: Record<string, ForumPage>
  history: HistoryItem[]
  bookmarkFolders: BookmarkFolder[]
  bookmarks: BookmarkItem[]
  /** 角色分享网页记录 */
  sharedPages: SharedPageRecord[]
  /** 角色浏览器里已打开的标签（只读，由生成内容决定） */
  openTabs: BrowserTab[]
}

export type BrowserState = {
  dataset: BrowserDataset
  tabs: BrowserTab[]
  activeTabId: string
  theme: BrowserTheme
}
