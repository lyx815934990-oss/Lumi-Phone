/**
 * 同人论坛设计 token：三级表面色阶 + 字号/间距/圆角。
 * 层次靠色阶，不靠边框与阴影。
 */

export const FORUM = {
  /** 页面背景 · surface-1（最浅） */
  surface1: '#F6F4F1',
  /** 卡片背景 · surface-2（略深） */
  surface2: '#EEEBE6',
  /** 强调浅底 */
  bgAccent: '#E8DFD4',
  /** 主文字 */
  text: '#2C2825',
  /** 次要文字 */
  textSecondary: '#6B6560',
  /** 辅助信息（最淡） */
  textMuted: '#9A948C',
  /** 强调文字 / 选中态 */
  textAccent: '#8B6914',
  /** 强调实色（小面积点缀 / 悬浮按钮） */
  accent: '#C4A35A',
  /** 分隔线（0.5px 用，极淡） */
  hairline: 'rgba(44, 40, 37, 0.08)',
  /** 危险操作 */
  danger: '#C45C5C',
  /** 封面渐变起止 */
  coverFrom: '#E8DFD4',
  coverTo: '#D9CFC2',

  radiusPage: 28,
  radiusCard: 17,
  radiusPill: 999,

  pagePadX: 19,
  cardPadX: 14,
  cardPadY: 12,
  cardGap: 10,
  sectionGap: 15,

  /** 顶栏安全区：status bar + 少量呼吸 */
  safeTop: 'max(12px, env(safe-area-inset-top, 0px))',
  /** 顶栏内容区在安全区之下的额外 padding */
  headerPadTop: 'calc(max(12px, env(safe-area-inset-top, 0px)) + 6px)',

  font: {
    pageTitle: 19,
    navTitle: 15,
    cardTitle: 15,
    postTitle: 16,
    profileName: 18,
    body: 13.5,
    comment: 13,
    caption: 12.5,
    meta: 11.5,
    tabLabel: 10,
    tab: 13.5,
  },

  avatar: {
    plaza: 46,
    postAuthor: 34,
    comment: 28,
    profile: 72,
  },
} as const

/** 人格/角色语义色变体（浅底 + 深字） */
export const FORUM_ACCENT_VARIANTS = [
  { bg: '#E8DFD4', fg: '#8B6914' },
  { bg: '#E2E6EF', fg: '#4A5A7A' },
  { bg: '#E6E9E2', fg: '#4F6348' },
  { bg: '#EFE4E6', fg: '#7A4A55' },
  { bg: '#E8E4EF', fg: '#5C4A7A' },
  { bg: '#E5EBE8', fg: '#3F6B5C' },
  { bg: '#EFE8E0', fg: '#7A5A3A' },
  { bg: '#E4EBEF', fg: '#3A5F6B' },
] as const

export function forumAccentVariant(seed: string): (typeof FORUM_ACCENT_VARIANTS)[number] {
  let h = 2166136261
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return FORUM_ACCENT_VARIANTS[Math.abs(h) % FORUM_ACCENT_VARIANTS.length]!
}

export function forumInitialChar(name: string): string {
  const t = name.trim()
  if (!t) return '?'
  return t.slice(0, 1)
}

export function formatForumRelativeTime(ts: number): string {
  const diff = Date.now() - ts
  if (diff < 60_000) return '刚刚'
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)} 分钟前`
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)} 小时前`
  if (diff < 7 * 86400_000) return `${Math.floor(diff / 86400_000)} 天前`
  const d = new Date(ts)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

export function forumKindLabel(kind: string): string {
  if (kind === 'custom') return '自定义请求'
  if (kind === 'char') return '角色发帖'
  return '本命同人'
}
