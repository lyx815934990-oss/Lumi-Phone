import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import { useCustomization } from '../../CustomizationContext'
import { AvatarStickersLayer } from './avatarStickers'
import type { WeChatAvatarBadgeCorner, WeChatAvatarChrome } from './wechatAvatarChrome'
import {
  collectWeChatAvatarChromeAssetIds,
  emptyWeChatAvatarChrome,
  normalizeWeChatAvatarBadgeScale,
} from './wechatAvatarChrome'
import { resolveWeChatAvatarChromeAssetUrls } from './wechatAvatarChromePersist'

export type WeChatAvatarChromeSide = 'self' | 'other'

export type ResolvedAvatarBadge = {
  url: string
  corner: WeChatAvatarBadgeCorner
  scale: number
}

export type ResolvedWeChatAvatarChrome = {
  selfFrameUrl: string | null
  otherFrameUrl: string | null
  selfBadge: ResolvedAvatarBadge | null
  otherBadge: ResolvedAvatarBadge | null
  /** 指纹，便于依赖 */
  skinKey: string
}

const EMPTY_RESOLVED: ResolvedWeChatAvatarChrome = {
  selfFrameUrl: null,
  otherFrameUrl: null,
  selfBadge: null,
  otherBadge: null,
  skinKey: '',
}

const WeChatAvatarChromeCtx = createContext<ResolvedWeChatAvatarChrome>(EMPTY_RESOLVED)

export function useResolvedWeChatAvatarChrome(): ResolvedWeChatAvatarChrome {
  return useContext(WeChatAvatarChromeCtx)
}

export function WeChatAvatarChromeProvider({
  chrome,
  children,
}: {
  chrome: WeChatAvatarChrome | null | undefined
  children: ReactNode
}) {
  const safe = chrome ?? emptyWeChatAvatarChrome()
  const idsKey = collectWeChatAvatarChromeAssetIds(safe).join(',')
  const [urls, setUrls] = useState<Record<string, string>>({})

  useEffect(() => {
    let cancelled = false
    const ids = idsKey ? idsKey.split(',').filter(Boolean) : []
    if (!ids.length) {
      setUrls({})
      return
    }
    void resolveWeChatAvatarChromeAssetUrls(ids).then((map) => {
      if (!cancelled) setUrls(map)
    })
    return () => {
      cancelled = true
    }
  }, [idsKey])

  const value = useMemo((): ResolvedWeChatAvatarChrome => {
    const badge = (
      b: WeChatAvatarChrome['selfBadge'],
    ): ResolvedAvatarBadge | null => {
      if (!b?.assetId) return null
      const url = urls[b.assetId]
      if (!url) return null
      return {
        url,
        corner: b.corner,
        scale: normalizeWeChatAvatarBadgeScale(b.scale),
      }
    }
    return {
      selfFrameUrl: safe.selfFrameAssetId ? urls[safe.selfFrameAssetId] ?? null : null,
      otherFrameUrl: safe.otherFrameAssetId ? urls[safe.otherFrameAssetId] ?? null : null,
      selfBadge: badge(safe.selfBadge),
      otherBadge: badge(safe.otherBadge),
      skinKey: idsKey,
    }
  }, [idsKey, safe.otherBadge, safe.otherFrameAssetId, safe.selfBadge, safe.selfFrameAssetId, urls])

  return <WeChatAvatarChromeCtx.Provider value={value}>{children}</WeChatAvatarChromeCtx.Provider>
}

const CORNER_STYLE: Record<WeChatAvatarBadgeCorner, CSSProperties> = {
  tl: { top: '-2px', left: '-2px' },
  tr: { top: '-2px', right: '-2px' },
  bl: { bottom: '-2px', left: '-2px' },
  br: { bottom: '-2px', right: '-2px' },
}

export function WeChatAvatarSizeGutter({ side }: { side: WeChatAvatarChromeSide }) {
  return (
    <div
      data-wx-avatar-slot={side}
      className="relative shrink-0 self-stretch overflow-visible"
      aria-hidden
    >
      <div data-wx-avatar-chrome={side} className="invisible h-10 w-10" />
    </div>
  )
}

/**
 * 包裹 40×40 头像：可选外框 + 四角角标 + 头像贴纸（盖在头像上，可 GIF）。
 * 与群头衔叠放时角标默认用 br/bl，避免左上冲突。
 */
export function WeChatAvatarChromeWrap({
  side,
  children,
  className = '',
}: {
  side: WeChatAvatarChromeSide
  children: ReactNode
  className?: string
}) {
  const resolved = useResolvedWeChatAvatarChrome()
  const { state: customizationState } = useCustomization()
  const avatarStickers =
    customizationState.wechatTheme.avatarStickers?.[side] ?? []
  const frameUrl = side === 'self' ? resolved.selfFrameUrl : resolved.otherFrameUrl
  const badge = side === 'self' ? resolved.selfBadge : resolved.otherBadge
  const hasStickers = avatarStickers.some((s) => s.imageDataUrl.trim())
  const badgePx = Math.round(40 * (badge?.scale ?? 0.4))

  // 始终包一层 slot + chrome，便于皮肤 CSS 按侧覆盖大小 / 圆角 / 倾斜 / 相对气泡上下
  return (
    <div
      data-wx-avatar-slot={side}
      className={`relative inline-flex shrink-0 flex-col self-stretch overflow-visible ${className}`.trim()}
    >
      <div
        className="relative inline-flex h-10 w-10 shrink-0 overflow-visible"
        data-wx-avatar-chrome={side}
      >
        {children}
        {frameUrl ? (
          <img
            src={frameUrl}
            alt=""
            className="pointer-events-none absolute z-[4] object-contain"
            style={{
              width: '118%',
              height: '118%',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
            }}
            aria-hidden
            draggable={false}
          />
        ) : null}
        {hasStickers ? <AvatarStickersLayer stickers={avatarStickers} /> : null}
        {badge ? (
          <img
            src={badge.url}
            alt=""
            className="pointer-events-none absolute z-[7] object-contain"
            style={{
              width: badgePx,
              height: badgePx,
              ...CORNER_STYLE[badge.corner],
            }}
            aria-hidden
            draggable={false}
          />
        ) : null}
      </div>
    </div>
  )
}
