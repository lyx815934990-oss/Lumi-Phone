/**
 * 站内 `image/` 资源路径：存库与导入包用「规范路径」，展示时再按当前 Vite base 解析。
 *
 * 图片由 vite 插件同步到 `dist/image/`（开发期中间件同源提供），不再用
 * `import.meta.glob(..., { eager: true })` 把整库打进首包 JS。
 */

/** 当前部署 base 下的可请求 URL（仅用于展示，不要写入 localStorage / 人设包） */
export function publicAssetUrl(pathFromSiteRoot: string): string {
  const rel = pathFromSiteRoot.startsWith('/') ? pathFromSiteRoot.slice(1) : pathFromSiteRoot
  const base = import.meta.env.BASE_URL
  const prefix = base.endsWith('/') ? base : `${base}/`
  return `${prefix}${rel}`
}

/**
 * 规范路径：永远是 `/image/…`（不带 Lumi-Phone、不带 /assets 哈希）。
 * 写入 IndexedDB、人设包、主题设置时请用此函数。
 */
export function canonicalPublicImagePath(url: string): string {
  const u = url.trim()
  if (!u) return u
  if (u.startsWith('data:') || u.startsWith('blob:')) return u
  if (/^https?:\/\//i.test(u)) {
    if (/localhost|127\.0\.0\.1|192\.168\.\d+\.\d+/i.test(u)) {
      const imagePath = u.match(/\/image\/[^?#]+/i)?.[0]
      if (imagePath) return imagePath
      return ''
    }
    return u
  }

  const withoutOrigin = u.replace(/^https?:\/\/[^/]+/i, '')
  const imageRel = withoutOrigin
    .replace(/^\/?(?:Lumi-Phone|Phone)\/(image\/)/i, '$1')
    .replace(/^\/?(image\/)/i, '$1')

  if (/^image\//i.test(imageRel)) return `/${imageRel}`
  if (u.startsWith('/image/')) return u
  /** 历史 Vite ?url 哈希资源无法反查规范路径，丢弃以免写脏库 */
  if (u.includes('/assets/')) return ''
  return u
}

/** 展示用：把规范路径或历史脏数据解析为当前环境可请求的 URL */
export function resolvePublicImageUrl(url: string): string {
  const u = url.trim()
  if (!u) return u
  if (u.startsWith('data:') || u.startsWith('blob:')) return u
  if (/^https?:\/\//i.test(u)) return u

  const canon = canonicalPublicImagePath(u)
  if (canon.startsWith('/image/')) {
    return publicAssetUrl(canon)
  }

  const base = import.meta.env.BASE_URL || '/'
  const prefix = base.endsWith('/') ? base : `${base}/`
  if (u.startsWith(prefix)) return u

  return u
}

/** @deprecated 语义同 {@link canonicalPublicImagePath}，保留旧调用名 */
export function migrateLegacyRootPublicUrl(url: string): string {
  return canonicalPublicImagePath(url)
}
