/**
 * 微信经典黄脸默认包（资源来自 npm `wechat-emojis` / xxk8/wechat-emojis，MIT 封装 + 腾讯表情素材，个人非商业用途）。
 *
 * 注意：勿对 node_modules 内中文路径做 import.meta.glob（Rolldown/Vite 易丢图）。
 * 构建/开发期由 vite 插件同步到 `public/wechat-emojis/`，再用包内全量目录拼 URL。
 */
import { EmojiCategory, getAllEmojis, type EmojiInfo } from 'wechat-emojis'
import type { StickerGroup, StickerItem } from './stickerStore'

export const WECHAT_CLASSIC_GROUP_ID = 'default-sticker-pack-wechat-classic'

const CATEGORY_ORDER = [
  EmojiCategory.FACE,
  EmojiCategory.GESTURE,
  EmojiCategory.ANIMAL,
  EmojiCategory.BLESSING,
  EmojiCategory.OTHER,
] as const

const CATEGORY_LABELS: Record<(typeof CATEGORY_ORDER)[number], string> = {
  [EmojiCategory.FACE]: '表情',
  [EmojiCategory.GESTURE]: '手势',
  [EmojiCategory.ANIMAL]: '动物',
  [EmojiCategory.BLESSING]: '祝福',
  [EmojiCategory.OTHER]: '其它',
}

function appBaseUrl(): string {
  const raw = (import.meta.env.BASE_URL as string | undefined) || '/'
  return raw.endsWith('/') ? raw : `${raw}/`
}

/** `assets/face/微笑.png` → `/…/wechat-emojis/face/%E5%BE%AE%E7%AC%91.png` */
export function wechatClassicEmojiPublicUrl(assetPath: string): string {
  const cleaned = String(assetPath || '')
    .replace(/\\/g, '/')
    .replace(/^assets\//, '')
    .replace(/^\/+/, '')
  if (!cleaned) return ''
  const encoded = cleaned
    .split('/')
    .map((seg) => encodeURIComponent(seg))
    .join('/')
  return `${appBaseUrl()}wechat-emojis/${encoded}`
}

function toStickerItem(emoji: EmojiInfo, idx: number): StickerItem {
  return {
    id: `wxc-${idx + 1}`,
    url: wechatClassicEmojiPublicUrl(emoji.path),
    description: emoji.name,
    createdAt: 0,
  }
}

function listAllEmojisSorted(): EmojiInfo[] {
  const rank = new Map<string, number>(CATEGORY_ORDER.map((c, i) => [c, i]))
  return getAllEmojis().slice().sort((a, b) => {
    const ra = rank.get(a.category) ?? 99
    const rb = rank.get(b.category) ?? 99
    if (ra !== rb) return ra - rb
    return a.name.localeCompare(b.name, 'zh-CN')
  })
}

export type WechatClassicStickerGroup = {
  categoryId: (typeof CATEGORY_ORDER)[number]
  label: string
  items: StickerItem[]
}

/** 全部分类 · 完整 109 枚黄脸 */
export function buildWechatClassicStickerGroups(): WechatClassicStickerGroup[] {
  const byCat = new Map<string, StickerItem[]>()
  listAllEmojisSorted().forEach((emoji, idx) => {
    const list = byCat.get(emoji.category) ?? []
    list.push(toStickerItem(emoji, idx))
    byCat.set(emoji.category, list)
  })
  return CATEGORY_ORDER.filter((cat) => (byCat.get(cat)?.length ?? 0) > 0).map((cat) => ({
    categoryId: cat,
    label: CATEGORY_LABELS[cat],
    items: byCat.get(cat) ?? [],
  }))
}

/** 扁平完整列表（与分类合计一致，应为 109） */
export function buildWechatClassicStickerItems(): StickerItem[] {
  return listAllEmojisSorted().map((emoji, idx) => toStickerItem(emoji, idx))
}

let wechatClassicEmojiUrlByNameCache: ReadonlyMap<string, string> | null = null

/** `[微笑]` 等经典黄脸 token 名 → PNG URL */
export function getWechatClassicEmojiUrlByName(): ReadonlyMap<string, string> {
  if (wechatClassicEmojiUrlByNameCache) return wechatClassicEmojiUrlByNameCache
  const map = new Map<string, string>()
  for (const item of buildWechatClassicStickerItems()) {
    const name = item.description.trim()
    if (name) map.set(name, item.url)
  }
  wechatClassicEmojiUrlByNameCache = map
  return map
}

export function wechatClassicEmojiToken(name: string): string {
  return `[${name.trim()}]`
}

/** 从文字气泡中移除《微信经典表情》目录内的 inline 黄脸 token */
export function stripWechatClassicEmojiTokens(text: string): string {
  if (!text) return text
  const catalog = getWechatClassicEmojiUrlByName()
  if (!catalog.size) return text
  return text.replace(/\[([^\[\]\n]{1,24})\]/g, (full, name: string) => {
    if (catalog.has(String(name).trim())) return ''
    return full
  })
}

export function buildWechatClassicStickerGroup(): StickerGroup | null {
  const items = buildWechatClassicStickerItems()
  if (!items.length) return null
  const smileUrl = items.find((it) => it.description === '微笑')?.url ?? items[0]!.url
  return {
    id: WECHAT_CLASSIC_GROUP_ID,
    name: '微信经典表情',
    coverUrl: smileUrl,
    items,
    createdAt: 0,
    readonly: true,
  }
}
