import { DEFAULT_PUBLIC_AVATAR_PATH, DEFAULT_PUBLIC_AVATAR_URL } from '../../types'
import { publicAssetUrl, resolvePublicImageUrl } from '../../../publicAssetUrl'

/**
 * 只用来发现文件名，不把图打进 /assets 哈希包。
 * 展示与落库统一用 `/image/随机网友头像/…`（Vite 中间件 / dist 同步）。
 */
const AVATAR_GLOB = import.meta.glob('../../../../image/随机网友头像/*.{png,jpg,jpeg,webp}')

function listNetizenAvatarCanonicalPaths(): string[] {
  const paths = Object.keys(AVATAR_GLOB)
    .map((key) => {
      const file = key.replace(/\\/g, '/').split('/').pop()?.split('?')[0]?.trim()
      if (!file) return ''
      return `/image/随机网友头像/${file}`
    })
    .filter(Boolean)
  paths.sort()
  return paths
}

const CANONICAL_POOL = listNetizenAvatarCanonicalPaths()

/** 规范路径池（写入 IndexedDB / 稳定哈希用） */
export function listWechatDefaultAvatarPaths(): string[] {
  return CANONICAL_POOL.length > 0 ? CANONICAL_POOL : [DEFAULT_PUBLIC_AVATAR_PATH]
}

/** 当前环境下的可请求 URL（img src） */
export function listWechatDefaultAvatarUrls(): string[] {
  return listWechatDefaultAvatarPaths().map((p) => resolvePublicImageUrl(p) || publicAssetUrl(p))
}

export function pickRandomWechatDefaultAvatar(): string {
  const pool = listWechatDefaultAvatarUrls()
  return pool[Math.floor(Math.random() * pool.length)] ?? DEFAULT_PUBLIC_AVATAR_URL
}

/** 注册页初始展示：规范路径（展示处需 resolvePublicImageUrl / resolveCharacterAvatarUrl） */
export function getDefaultWechatRegistrationAvatar(): string {
  return DEFAULT_PUBLIC_AVATAR_PATH
}

export function normalizeAvatarUrlInput(raw: string): string {
  return String(raw ?? '').trim()
}

export function isPlausibleAvatarUrl(url: string): boolean {
  const t = url.trim()
  if (!t) return false
  if (t.startsWith('data:image/')) return true
  return /^https?:\/\/.+/i.test(t)
}
