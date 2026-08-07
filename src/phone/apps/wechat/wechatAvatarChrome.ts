/** 头像框 / 角标装饰（资源本体侧存 IndexedDB，主题只存 id） */

export type WeChatAvatarBadgeCorner = 'tl' | 'tr' | 'bl' | 'br'

export type WeChatAvatarBadgeChrome = {
  assetId: string
  corner: WeChatAvatarBadgeCorner
  /** 相对头像宽度比例，默认 0.4 */
  scale?: number
}

export type WeChatAvatarChrome = {
  selfFrameAssetId?: string | null
  otherFrameAssetId?: string | null
  selfBadge?: WeChatAvatarBadgeChrome | null
  otherBadge?: WeChatAvatarBadgeChrome | null
}

export type WeChatAvatarChromeAssetMeta = {
  id: string
  name: string
  mime: string
  updatedAt: number
}

export const WECHAT_AVATAR_BADGE_CORNERS: WeChatAvatarBadgeCorner[] = ['tl', 'tr', 'bl', 'br']

export function emptyWeChatAvatarChrome(): WeChatAvatarChrome {
  return {
    selfFrameAssetId: null,
    otherFrameAssetId: null,
    selfBadge: null,
    otherBadge: null,
  }
}

export function normalizeWeChatAvatarBadgeCorner(
  v: unknown,
  fallback: WeChatAvatarBadgeCorner = 'br',
): WeChatAvatarBadgeCorner {
  return v === 'tl' || v === 'tr' || v === 'bl' || v === 'br' ? v : fallback
}

export function normalizeWeChatAvatarBadgeScale(v: unknown, fallback = 0.4): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) return fallback
  return Math.max(0.2, Math.min(1.2, Math.round(v * 100) / 100))
}

export function normalizeWeChatAvatarBadgeChrome(
  raw: unknown,
  fallback: WeChatAvatarBadgeChrome | null = null,
): WeChatAvatarBadgeChrome | null {
  if (raw == null) return null
  if (!raw || typeof raw !== 'object') return fallback
  const r = raw as Partial<WeChatAvatarBadgeChrome>
  const assetId = typeof r.assetId === 'string' ? r.assetId.trim() : ''
  if (!assetId) return null
  return {
    assetId,
    corner: normalizeWeChatAvatarBadgeCorner(r.corner, fallback?.corner ?? 'br'),
    scale: normalizeWeChatAvatarBadgeScale(r.scale, fallback?.scale ?? 0.4),
  }
}

export function normalizeWeChatAvatarChrome(
  raw: unknown,
  fallback: WeChatAvatarChrome = emptyWeChatAvatarChrome(),
): WeChatAvatarChrome {
  if (!raw || typeof raw !== 'object') return { ...fallback }
  const r = raw as Partial<WeChatAvatarChrome>
  const pickId = (v: unknown, fb: string | null | undefined): string | null => {
    if (v === null) return null
    if (typeof v === 'string') {
      const t = v.trim()
      return t || null
    }
    return fb ?? null
  }
  return {
    selfFrameAssetId: pickId(r.selfFrameAssetId, fallback.selfFrameAssetId),
    otherFrameAssetId: pickId(r.otherFrameAssetId, fallback.otherFrameAssetId),
    selfBadge: normalizeWeChatAvatarBadgeChrome(r.selfBadge, fallback.selfBadge ?? null),
    otherBadge: normalizeWeChatAvatarBadgeChrome(r.otherBadge, fallback.otherBadge ?? null),
  }
}

export function wechatAvatarChromeEqual(
  a: WeChatAvatarChrome | null | undefined,
  b: WeChatAvatarChrome | null | undefined,
): boolean {
  const aa = a ?? emptyWeChatAvatarChrome()
  const bb = b ?? emptyWeChatAvatarChrome()
  const badgeEq = (
    x: WeChatAvatarBadgeChrome | null | undefined,
    y: WeChatAvatarBadgeChrome | null | undefined,
  ) => {
    if (!x && !y) return true
    if (!x || !y) return false
    return (
      x.assetId === y.assetId &&
      x.corner === y.corner &&
      normalizeWeChatAvatarBadgeScale(x.scale) === normalizeWeChatAvatarBadgeScale(y.scale)
    )
  }
  return (
    (aa.selfFrameAssetId ?? null) === (bb.selfFrameAssetId ?? null) &&
    (aa.otherFrameAssetId ?? null) === (bb.otherFrameAssetId ?? null) &&
    badgeEq(aa.selfBadge, bb.selfBadge) &&
    badgeEq(aa.otherBadge, bb.otherBadge)
  )
}

/** 收集主题里引用到的全部 assetId */
export function collectWeChatAvatarChromeAssetIds(chrome: WeChatAvatarChrome | null | undefined): string[] {
  const c = chrome ?? emptyWeChatAvatarChrome()
  const ids = [
    c.selfFrameAssetId,
    c.otherFrameAssetId,
    c.selfBadge?.assetId,
    c.otherBadge?.assetId,
  ]
  const out: string[] = []
  const seen = new Set<string>()
  for (const id of ids) {
    const t = id?.trim()
    if (!t || seen.has(t)) continue
    seen.add(t)
    out.push(t)
  }
  return out
}

export function wechatAvatarChromeSkinKey(chrome: WeChatAvatarChrome | null | undefined): string {
  const c = chrome ?? emptyWeChatAvatarChrome()
  const b = (x: WeChatAvatarBadgeChrome | null | undefined) =>
    x ? `${x.assetId}:${x.corner}:${normalizeWeChatAvatarBadgeScale(x.scale)}` : ''
  return [
    c.selfFrameAssetId ?? '',
    c.otherFrameAssetId ?? '',
    b(c.selfBadge),
    b(c.otherBadge),
  ].join('|')
}
