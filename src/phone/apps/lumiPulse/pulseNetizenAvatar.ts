import { DEFAULT_PUBLIC_AVATAR_PATH } from '../../types'
import { canonicalPublicImagePath, resolvePublicImageUrl } from '../../../publicAssetUrl'
import { listWechatDefaultAvatarPaths } from '../wechat/wechatDefaultAvatars'

/** 历史 bug：池被打成 /assets 后全部丢弃，网友头像回退成个人名片默认图 */
function isBrokenNetizenAvatarFallback(url: string): boolean {
  const c = canonicalPublicImagePath(url)
  if (!c) return true
  if (c === DEFAULT_PUBLIC_AVATAR_PATH) return true
  if (c.endsWith('/个人名片默认头像1.png')) return true
  return false
}

/** 从 image/随机网友头像 构建可落库的规范路径池 */
function listPulseNetizenAvatarPaths(): string[] {
  const paths = listWechatDefaultAvatarPaths().filter((p) => p.includes('/随机网友头像/'))
  return paths.length ? paths : [DEFAULT_PUBLIC_AVATAR_PATH]
}

/** 同一网友身份（authorPovId / 昵称）稳定对应一张随机网友头像 */
export function pickStablePulseNetizenAvatarPath(seed: string): string {
  const pool = listPulseNetizenAvatarPaths()
  const s = String(seed ?? '').trim()
  if (!s) return pool[0]!
  let h = 2166136261
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return pool[Math.abs(h) % pool.length]!
}

/** 是否为 AI 网友帖（非玩家 / 角色 POV） */
export function isPulseNetizenAuthor(authorPovId: string, isAiGenerated?: boolean): boolean {
  const id = authorPovId.trim()
  if (isAiGenerated) return true
  if (id.startsWith('ai:')) return true
  return false
}

/** 展示用：规范路径 → 当前环境可请求 URL */
export function resolvePulseAuthorAvatarUrl(stored?: string): string | undefined {
  const t = stored?.trim()
  if (!t) return undefined
  const resolved = resolvePublicImageUrl(t)
  return resolved || undefined
}

/** 落库前补全网友头像（已有自定义头像则保留；历史错误回退图会重抽） */
export function resolvePulseAuthorAvatarForPersist(
  authorPovId: string,
  authorName: string,
  authorAvatarUrl?: string,
  isAiGenerated?: boolean,
): string | undefined {
  const existing = authorAvatarUrl?.trim()
  if (existing && !isBrokenNetizenAvatarFallback(existing)) return existing
  if (!isPulseNetizenAuthor(authorPovId, isAiGenerated)) {
    return existing || undefined
  }
  return pickStablePulseNetizenAvatarPath(authorPovId.trim() || authorName.trim())
}
