import { resolvePublicImageUrl } from '../../../publicAssetUrl'

/**
 * 把站内 `/image/…`、blob、可 fetch 的 URL 转成 data URL，供远端 vision / 中转站识图。
 * 远端无法访问本机相对路径；部分中转会把非 http URL 误当成 `base64:…` 去解，导致
 * `illegal base64 data at input byte 7`（例如 `base64:/image/朋友圈默认背景图.png`）。
 */
export async function resolveVisionImageUrlToDataUrl(url: string): Promise<string | null> {
  const raw = String(url ?? '').trim()
  if (!raw) return null
  if (raw.startsWith('data:')) return raw

  const fetchUrl =
    raw.startsWith('blob:') || /^https?:\/\//i.test(raw)
      ? raw
      : resolvePublicImageUrl(raw).trim() || raw

  if (!fetchUrl) return null
  // 仍是站内相对路径但无法解析时，不要原样发给远端
  if (fetchUrl.startsWith('/') && !fetchUrl.startsWith('//')) {
    // resolvePublicImageUrl 通常会带上 BASE_URL；若仍是裸路径，拼当前 origin 再试
  }

  try {
    const absolute =
      fetchUrl.startsWith('blob:') || /^https?:\/\//i.test(fetchUrl)
        ? fetchUrl
        : new URL(fetchUrl, typeof window !== 'undefined' ? window.location.href : 'http://localhost/').href
    const res = await fetch(absolute)
    if (!res.ok) return null
    const blob = await res.blob()
    return await new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

export async function resolveVisionImageUrlsToDataUrls(urls: string[]): Promise<string[]> {
  const out: string[] = []
  for (const url of urls) {
    const data = await resolveVisionImageUrlToDataUrl(url)
    if (data) out.push(data)
  }
  return out
}
