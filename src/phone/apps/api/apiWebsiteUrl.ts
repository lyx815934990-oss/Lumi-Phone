/** 将用户填写的 API 网站规范为可打开的 http(s) 地址；无效则返回 null */
export function normalizeApiWebsiteHref(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  try {
    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
    const parsed = new URL(withProtocol)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null
    return parsed.href
  } catch {
    return null
  }
}

/** 在新标签页打开 API 网站；失败返回 false */
export function openApiWebsiteUrl(raw: string): boolean {
  const href = normalizeApiWebsiteHref(raw)
  if (!href) return false
  window.open(href, '_blank', 'noopener,noreferrer')
  return true
}
