import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { Activity, Keyboard, Mic, MoreHorizontal, Plus, Smile } from 'lucide-react'
import type { WeChatBubbleTheme } from '../../../types'
import { wrapWeChatChatSkinScopedCss } from '../../wechat/bubblePack/scopedCss'
import { SharedRecordCard } from '../../wechat/favorites/SharedRecordCard'
import { LocationMessageCard } from '../../wechat/location/LocationMessageCard'
import { AcceptResponseCard } from '../../wechat/musicSync/AcceptResponseCard'
import { CharacterInviteReceivedCard } from '../../wechat/musicSync/CharacterInviteReceivedCard'
import { DeclineResponseCard } from '../../wechat/musicSync/DeclineResponseCard'
import { InviteSentCard } from '../../wechat/musicSync/InviteSentCard'
import { RedPacketBubble } from '../../wechat/redPacket/RedPacketBubble'
import { TransferBubbleFace } from '../../wechat/transfer/TransferBubble'
import { CallStatusBubble } from '../../wechat/voiceCall/CallStatusBubble'
import { VoiceMessageBubble } from '../../wechat/VoiceMessageBubble'
import { WeChatChatSkinEngineProvider } from '../../wechat/WeChatChatSkinEngineContext'
import { WechatBubbleTail } from '../../wechat/wechatBubbleWechatUi'
import { compileLookWorkshopScopedCss, compileLookWorkshopSkinOverrides } from '../compile'
import {
  ensureLookWorkshopFontLoaded,
  compileLookWorkshopPreviewFontCss,
  lookWorkshopFontStack,
} from '../headerFonts'
import { useLookWorkshopStore } from '../store'
import type { BubbleSideDraft, HeaderChromeItemDraft, LookWorkshopDraft } from '../types'
import { BubbleEdgeStickers } from '../../wechat/bubbleEdgeStickers'
import { BubbleFaceLayer, BubbleFrameLayer } from '../../wechat/bubbleFrame'
import { AvatarStickersLayer } from '../../wechat/avatarStickers'
import {
  buildLinearGradientCss,
  buildStructuredBoxShadow,
  shouldShowBubbleBadge,
} from '../../wechat/bubbleBadge'
import { DraggableHeaderItem } from './HeaderDragLayer'

const SAMPLE_LOCATION = {
  locationId: 'lw-preview-location',
  name: '中央公园',
  address: '示例路 88 号',
  distance: '320m',
}

const SAMPLE_LISTEN_INVITE = {
  kind: 'music_invite' as const,
  inviteId: 'lw-listen-1',
  trackId: 1,
  trackTitle: '夜行曲',
  trackArtist: '示例歌手',
  coverUrl: '',
}

function sideBgResolved(side: BubbleSideDraft): string {
  if (side.gradientMode === 'stops') {
    const css = buildLinearGradientCss(side.gradientAngleDeg, side.gradientStops ?? [])
    if (css) return css
  }
  if (side.gradientMode === 'css' && side.bgGradient.trim()) return side.bgGradient.trim()
  if (side.useGradient && side.bgGradient.trim()) return side.bgGradient.trim()
  return side.bg
}

function sideBoxShadowResolved(side: BubbleSideDraft): string {
  const draft = side.shadowDraft
  if (draft && !draft.enabled) return 'none'
  if (draft && !draft.useCss) return buildStructuredBoxShadow(draft)
  const raw = (side.shadow || '').trim()
  return raw || 'none'
}

function sideBgForTail(side: BubbleSideDraft): string {
  if (side.tailSurfaceMode === 'custom') {
    if (side.tailGradientMode === 'stops') {
      const css = buildLinearGradientCss(
        side.tailGradientAngleDeg ?? 135,
        side.tailGradientStops ?? [],
      )
      if (css) return css
    }
    if (side.tailGradientMode === 'css' && String(side.tailBgGradient ?? '').trim()) {
      return side.tailBgGradient.trim()
    }
    const solid = String(side.tailBg ?? '').trim()
    return solid || sideBgResolved(side)
  }
  // follow：与气泡底同步
  return sideBgResolved(side)
}

function headerBtnIconFace(item: HeaderChromeItemDraft, fallback: ReactNode): ReactNode {
  const src = item.iconDataUrl.trim()
  if (!src) return fallback
  return (
    <img
      src={src}
      alt=""
      draggable={false}
      className="pointer-events-none object-cover"
      style={{
        width: item.iconSizePx,
        height: item.iconSizePx,
        borderRadius: item.iconRadiusPx,
      }}
    />
  )
}

function PreviewBubble({
  side,
  text,
  cluster,
  draftSide,
}: {
  side: 'self' | 'other'
  text: string
  cluster: 'single' | 'first' | 'middle' | 'last'
  draftSide: BubbleSideDraft
}) {
  const isSelf = side === 'self'
  const showAvatar = draftSide.showAvatar
  /** every=每条；first=仅首/单；last=仅末/单 */
  const showAv =
    showAvatar &&
    (draftSide.avatarCluster === 'every' ||
      cluster === 'single' ||
      (draftSide.avatarCluster === 'first' && cluster === 'first') ||
      (draftSide.avatarCluster === 'last' && cluster === 'last'))
  const reserveGutter = showAvatar && !showAv

  const showTailHere =
    draftSide.showTail &&
    (draftSide.tailCluster === 'every' ||
      cluster === 'single' ||
      cluster === draftSide.tailCluster)

  const avatarRadius = draftSide.avatarRadiusPx
  const avatarSize = draftSide.avatarSizePx
  const avatarNode = showAv ? (
    <div data-wx-avatar-slot={side} className="relative shrink-0 self-stretch overflow-visible">
      <div
        data-wx-avatar-chrome={side}
        className="relative shrink-0 overflow-visible"
        style={{
          width: avatarSize,
          height: avatarSize,
          // 圆角只打在 face；chrome 上同时 radius+transform 会裁切探出的贴纸
          boxShadow:
            draftSide.avatarBorderWidth > 0
              ? `0 0 0 ${draftSide.avatarBorderWidth}px ${draftSide.avatarBorderColor}`
              : undefined,
          transform: `rotate(${draftSide.avatarRotateDeg}deg)`,
          top: `calc((100% - ${avatarSize}px) * ${draftSide.avatarBubbleYPct} / 100)`,
          position: 'absolute',
          left: 0,
        }}
      >
        <div
          data-wx-avatar-face=""
          className="h-full w-full overflow-hidden"
          style={{
            borderRadius: avatarRadius,
            background: draftSide.avatarPlaceholderColor || (isSelf ? '#E5E5E5' : '#D4D4D4'),
          }}
        />
        <AvatarStickersLayer stickers={draftSide.avatarStickers ?? []} />
      </div>
    </div>
  ) : reserveGutter ? (
    <div
      data-wx-avatar-slot={side}
      className="shrink-0 self-stretch"
      style={{ width: avatarSize, minHeight: avatarSize }}
      aria-hidden
    />
  ) : null

  const sideFontStack = lookWorkshopFontStack(draftSide.font)
  const resolvedBg = sideBgResolved(draftSide)
  const resolvedTailBg = sideBgForTail(draftSide)
  const tailGlassOn =
    draftSide.tailSurfaceMode === 'custom'
      ? draftSide.tailGlassEnabled === true
      : draftSide.glassEnabled === true
  const tailGlassBlurPx = tailGlassOn
    ? draftSide.tailSurfaceMode === 'custom'
      ? draftSide.tailGlassBlurPx
      : draftSide.glassBlurPx
    : 0
  const tailGlassSaturatePct =
    draftSide.tailSurfaceMode === 'custom'
      ? draftSide.tailGlassSaturatePct
      : draftSide.glassSaturatePct
  const resolvedShadow = sideBoxShadowResolved(draftSide)
  const hasFrame = Boolean(draftSide.frame?.imageDataUrl?.trim())
  const hasBgImage = Boolean(draftSide.bgImage?.trim())
  const glassFilter = draftSide.glassEnabled
    ? `blur(${Math.min(40, Math.max(0, Math.round(draftSide.glassBlurPx)))}px) saturate(${Math.min(200, Math.max(100, Math.round(draftSide.glassSaturatePct)))}%)`
    : undefined
  const edgeSoftPx = draftSide.glassEnabled
    ? Math.min(24, Math.max(0, Math.round(draftSide.glassEdgeBlurPx ?? 0)))
    : 0
  const useEdgeSoft = edgeSoftPx > 0
  const badge = draftSide.badge
  const showBadge =
    Boolean(badge?.enabled && badge.text.trim()) &&
    shouldShowBubbleBadge(badge.cluster, cluster)
  const tailAnchor = draftSide.tailAnchor ?? 'side'

  /** 外层可溢出尖角与贴纸；背景图模糊单独裁在内层 */
  const bubble = (
    <div
      data-wx-bubble-side={side}
      data-wx-msg-kind="text"
      className="relative z-[2] w-fit max-w-full shrink-0 overflow-visible"
      style={{
        // 用 px 上限，避免 % 相对整行把用户侧「气泡+头像」行撑开
        maxWidth: Math.round(3.2 * draftSide.maxWidthPct),
      }}
    >
      {/* 尖角在气泡玻璃层外：避免半透明叠层；% 相对本侧气泡盒高度 */}
      {showTailHere ? (
        <WechatBubbleTail
          isSelf={isSelf}
          bubbleColor={resolvedTailBg}
          matchBubbleSurface
          glassBlurPx={tailGlassBlurPx}
          glassSaturatePct={tailGlassSaturatePct}
          lengthPx={draftSide.tailLengthPx}
          angleDeg={draftSide.tailAngleDeg}
          roundPx={draftSide.tailRoundPx}
          offsetYPct={draftSide.tailOffsetYPct}
          yMode={(draftSide.tailAnchor ?? 'side') === 'side' ? draftSide.tailYMode ?? 'pct' : 'pct'}
          avatarSizePx={draftSide.avatarSizePx}
          avatarBubbleYPct={draftSide.avatarBubbleYPct}
          offsetXPct={draftSide.tailOffsetXPct ?? 0}
          offsetXPx={draftSide.tailOffsetXPx ?? 0}
          tiltDeg={draftSide.tailTiltDeg ?? 0}
          anchor={tailAnchor}
          borderWidth={useEdgeSoft ? 0 : draftSide.borderWidth}
          borderColor={draftSide.borderColor}
        />
      ) : null}
      <div
        data-wx-bubble-content
        className="lw-pv-bubble relative z-[1] w-fit max-w-full overflow-visible break-words"
        style={{
          // 边缘模糊时底色/毛玻璃交给 ::before（scopedCss），避免内容层硬切边
          background: hasFrame || hasBgImage || useEdgeSoft ? 'transparent' : resolvedBg,
          color: draftSide.text,
          fontSize: draftSide.fontSizePx,
          fontWeight: draftSide.fontWeight,
          lineHeight: draftSide.lineHeight,
          padding: `${draftSide.padT}px ${draftSide.padR}px ${draftSide.padB}px ${draftSide.padL}px`,
          borderRadius: draftSide.radius,
          ...(useEdgeSoft
            ? {
                border: '0 solid transparent',
                boxShadow: resolvedShadow === 'none' ? undefined : resolvedShadow,
                WebkitBackdropFilter: 'none',
                backdropFilter: 'none',
              }
            : {
                border: `${draftSide.borderWidth}px solid ${draftSide.borderColor}`,
                ...(showTailHere
                  ? tailAnchor === 'bottom'
                    ? { borderBottomWidth: 0 }
                    : isSelf
                      ? { borderRightWidth: 0 }
                      : { borderLeftWidth: 0 }
                  : null),
                boxShadow: resolvedShadow,
              }),
          ...(sideFontStack ? { fontFamily: sideFontStack } : null),
          ...(!hasFrame && !useEdgeSoft && glassFilter
            ? ({
                WebkitBackdropFilter: glassFilter,
                backdropFilter: glassFilter,
              } as CSSProperties)
            : null),
          ...(showTailHere
            ? ({
                ['--wx-bubble-tail-anchor' as string]: tailAnchor,
                ['--wx-bubble-tail-length' as string]: `${draftSide.tailLengthPx}px`,
                ['--wx-bubble-tail-angle' as string]: String(draftSide.tailAngleDeg),
                ['--wx-bubble-tail-round' as string]: `${draftSide.tailRoundPx}px`,
                ['--wx-bubble-tail-y-mode' as string]:
                  tailAnchor === 'side' && (draftSide.tailYMode ?? 'pct') === 'avatar'
                    ? 'avatar'
                    : 'pct',
                ['--wx-bubble-tail-offset-y' as string]: `${Math.min(100, Math.max(0, Math.round(draftSide.tailOffsetYPct)))}%`,
                ['--wx-bubble-tail-avatar-size' as string]: `${Math.min(72, Math.max(24, Math.round(draftSide.avatarSizePx)))}px`,
                ['--wx-bubble-tail-avatar-y' as string]: String(
                  Math.min(100, Math.max(0, Math.round(draftSide.avatarBubbleYPct))),
                ),
                ['--wx-bubble-tail-offset-x-pct' as string]: String(draftSide.tailOffsetXPct ?? 0),
                ['--wx-bubble-tail-offset-x' as string]: `${draftSide.tailOffsetXPx ?? 0}px`,
                ['--wx-bubble-tail-tilt' as string]: String(draftSide.tailTiltDeg ?? 0),
                ['--wx-bubble-tail-border-width' as string]: `${useEdgeSoft ? 0 : draftSide.borderWidth}px`,
                ['--wx-bubble-tail-border-color' as string]: draftSide.borderColor,
                ['--wx-bubble-tail-match-surface' as string]: '1',
                // 必须与尖角独立表面一致；勿写气泡条 resolvedBg（会盖掉 custom）
                ['--wx-bubble-tail-bg' as string]: resolvedTailBg,
                ['--wx-bubble-tail-glass-blur' as string]: `${Math.min(40, Math.max(0, Math.round(tailGlassBlurPx)))}px`,
                ['--wx-bubble-tail-glass-saturate' as string]: `${Math.min(200, Math.max(100, Math.round(tailGlassSaturatePct)))}%`,
              } as CSSProperties)
            : null),
        }}
      >
        <BubbleFaceLayer
          style={{
            borderRadius: draftSide.radius,
            // 边缘模糊时 face 透明，玻璃板走 ::before
            background:
              useEdgeSoft || hasBgImage
                ? 'transparent'
                : hasFrame
                  ? resolvedBg
                  : 'transparent',
            ...(!hasBgImage && hasFrame && !useEdgeSoft && glassFilter
              ? ({
                  WebkitBackdropFilter: glassFilter,
                  backdropFilter: glassFilter,
                } as CSSProperties)
              : null),
            ...(hasBgImage
              ? {
                  backgroundImage: `url("${draftSide.bgImage.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}")`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  filter:
                    draftSide.bgImageBlurPx > 0
                      ? `blur(${draftSide.bgImageBlurPx}px)`
                      : undefined,
                  transform: draftSide.bgImageBlurPx > 0 ? 'scale(1.12)' : undefined,
                }
              : null),
          }}
        />
        {/* 图层：气泡底(face) < 边框 < 贴纸 < 文字 */}
        <BubbleFrameLayer frame={draftSide.frame} />
        <BubbleEdgeStickers stickers={draftSide.edgeStickers ?? []} />
        <span data-wx-bubble-text="" className="relative z-[3]">
          {text}
        </span>
      </div>
      {showBadge ? (
        <span data-wx-bubble-badge={side} aria-hidden>
          {badge.text}
        </span>
      ) : null}
    </div>
  )

  /** 与 WeChatMessageBubbleRow 同结构：ml-auto 直接包在「气泡+头像」flex 上，勿再套一层易撑满的块级盒 */
  if (isSelf) {
    return (
      <div
        className="wx-chat-msg-row flex w-full max-w-full shrink-0 items-end justify-end overflow-visible px-0"
        data-wx-bubble-cluster={cluster}
      >
        {!showAvatar ? (
          <div
            data-wx-msg-align="self"
            className="mr-[24px] ml-auto w-fit min-w-0 max-w-full"
          >
            {bubble}
          </div>
        ) : (
          <div
            data-wx-msg-align="self"
            className="mr-[24px] ml-auto flex w-fit max-w-full flex-row items-start gap-[12px]"
          >
            {bubble}
            {avatarNode}
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      className="wx-chat-msg-row w-full max-w-full shrink-0 overflow-visible px-0"
      data-wx-bubble-cluster={cluster}
    >
      {!showAvatar ? (
        <div data-wx-msg-align="other" className="ml-[24px] mr-auto w-fit min-w-0 max-w-full">
          {bubble}
        </div>
      ) : (
        <div
          data-wx-msg-align="other"
          className="ml-[24px] mr-auto flex w-fit max-w-full flex-row items-start gap-[12px]"
        >
          {avatarNode}
          {bubble}
        </div>
      )}
    </div>
  )
}

function draftToPreviewBubble(draft: LookWorkshopDraft): WeChatBubbleTheme {
  const selfBg =
    draft.self.useGradient && draft.self.bgGradient.trim() ? draft.self.bg : draft.self.bg
  const otherBg =
    draft.other.useGradient && draft.other.bgGradient.trim() ? draft.other.bg : draft.other.bg
  return {
    selfBubbleBg: selfBg,
    otherBubbleBg: otherBg,
    selfBubbleRadiusPx: draft.self.radius,
    otherBubbleRadiusPx: draft.other.radius,
    showAvatar: draft.other.showAvatar || draft.self.showAvatar,
    showAvatarOther: draft.other.showAvatar,
    showAvatarSelf: draft.self.showAvatar,
    avatarRadiusPx: draft.other.avatarRadiusPx,
    showBubbleTail: draft.self.showTail || draft.other.showTail,
    // 不写 bubbleTailStyle:'wechat'：预览/导出都不碰微信 App 预设语义；尖角走几何组件 + CSS 变量
    messengerBubbleStyle: 'lumi',
    mergeConsecutiveAvatarGroup:
      draft.other.avatarCluster === 'first' || draft.self.avatarCluster === 'first',
    avatarClusterOther: draft.other.avatarCluster,
    avatarClusterSelf: draft.self.avatarCluster,
  }
}

/** 特殊消息行：左右对齐 + 可选头像占位（与真机皮肤预览一致） */
function SpecialMsgRow({
  isSelf,
  children,
}: {
  isSelf: boolean
  children: ReactNode
}) {
  const draft = useLookWorkshopStore((s) => s.draft)
  const side = isSelf ? draft.self : draft.other
  const showAvatar = side.showAvatar
  const avatarRadius = side.avatarRadiusPx
  const avatarSize = side.avatarSizePx
  const sideKey = isSelf ? 'self' : 'other'
  const avatar = (
    <div data-wx-avatar-slot={sideKey} className="relative shrink-0 self-stretch overflow-visible">
      <div
        data-wx-avatar-chrome={sideKey}
        className="relative shrink-0 overflow-visible"
        style={{
          width: avatarSize,
          height: avatarSize,
          boxShadow:
            side.avatarBorderWidth > 0
              ? `0 0 0 ${side.avatarBorderWidth}px ${side.avatarBorderColor}`
              : undefined,
          transform: `rotate(${side.avatarRotateDeg}deg)`,
          top: `calc((100% - ${avatarSize}px) * ${side.avatarBubbleYPct} / 100)`,
          position: 'absolute',
          left: 0,
        }}
        aria-hidden
      >
        <div
          data-wx-avatar-face=""
          className="h-full w-full overflow-hidden"
          style={{
            borderRadius: avatarRadius,
            background: side.avatarPlaceholderColor || (isSelf ? '#E5E5E5' : '#D4D4D4'),
          }}
        />
        <AvatarStickersLayer stickers={side.avatarStickers ?? []} />
      </div>
    </div>
  )

  if (!isSelf) {
    return (
      <div className="wx-chat-msg-row w-full max-w-full shrink-0 overflow-visible px-0">
        {!showAvatar ? (
          <div className="ml-[24px] mr-auto w-fit min-w-0 max-w-full">{children}</div>
        ) : (
          <div className="ml-[24px] mr-auto flex w-fit max-w-full flex-row items-start gap-[12px]">
            {avatar}
            {children}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="wx-chat-msg-row flex w-full max-w-full shrink-0 items-end justify-end overflow-visible px-0">
      {!showAvatar ? (
        <div className="mr-[24px] ml-auto w-fit min-w-0 max-w-full">{children}</div>
      ) : (
        <div className="mr-[24px] ml-auto flex w-fit max-w-full flex-row items-start gap-[12px]">
          {children}
          {avatar}
        </div>
      )}
    </div>
  )
}

function SectionHint({ children }: { children: string }) {
  return (
    <p className="mt-3 px-3 pb-1 pt-2 text-[9px] tracking-wide text-neutral-400">{children}</p>
  )
}

export function LivePreview(_props: { compact?: boolean }) {
  const draft = useLookWorkshopStore((s) => s.draft)
  const [inputMode, setInputMode] = useState<'text' | 'voice'>('text')
  const [hasDraftText, setHasDraftText] = useState(true)
  const [, setFontTick] = useState(0)

  const scopedCss = useMemo(
    () => compileLookWorkshopScopedCss(draft, { includeFontFaces: false }),
    [draft],
  )
  const overrides = useMemo(() => compileLookWorkshopSkinOverrides(draft), [draft])
  const wrapped = useMemo(() => wrapWeChatChatSkinScopedCss(scopedCss), [scopedCss])
  const previewBubble = useMemo(() => draftToPreviewBubble(draft), [draft])
  const roomBgForTail = draft.advanced.roomBg || '#EDEDED'

  useEffect(() => {
    let cancelled = false
    void (async () => {
      await Promise.all([
        ensureLookWorkshopFontLoaded(draft.header.titleFont),
        ensureLookWorkshopFontLoaded(draft.header.subtitleFont),
        ensureLookWorkshopFontLoaded(draft.timestamp.font),
        ensureLookWorkshopFontLoaded(draft.other.font),
        ensureLookWorkshopFontLoaded(draft.self.font),
        ensureLookWorkshopFontLoaded(draft.other.badge?.font ?? null),
        ensureLookWorkshopFontLoaded(draft.self.badge?.font ?? null),
      ])
      if (!cancelled) setFontTick((n) => n + 1)
    })()
    return () => {
      cancelled = true
    }
  }, [
    draft.header.titleFont,
    draft.header.subtitleFont,
    draft.timestamp.font,
    draft.other.font,
    draft.self.font,
    draft.other.badge?.font,
    draft.self.badge?.font,
  ])

  const toggleInputMode = () => {
    setInputMode((m) => (m === 'text' ? 'voice' : 'text'))
  }

  const titleFontStack = lookWorkshopFontStack(draft.header.titleFont)
  const subFontStack = lookWorkshopFontStack(draft.header.subtitleFont)
  const timestampFontStack = lookWorkshopFontStack(draft.timestamp.font)
  const previewFontCss = useMemo(
    () =>
      [
        compileLookWorkshopPreviewFontCss(draft.header.titleFont, [
          '[data-wx-chat-header-title]',
        ]),
        compileLookWorkshopPreviewFontCss(draft.header.subtitleFont, [
          '[data-wx-chat-header-sub]',
        ]),
        compileLookWorkshopPreviewFontCss(draft.timestamp.font, ['[data-wx-timestamp]']),
        compileLookWorkshopPreviewFontCss(draft.other.font, [
          '[data-wx-bubble-side="other"]',
          '[data-wx-bubble-side="other"] [data-wx-bubble-content]',
        ]),
        compileLookWorkshopPreviewFontCss(draft.self.font, [
          '[data-wx-bubble-side="self"]',
          '[data-wx-bubble-side="self"] [data-wx-bubble-content]',
        ]),
        compileLookWorkshopPreviewFontCss(draft.other.badge?.font ?? null, [
          '[data-wx-bubble-badge="other"]',
        ]),
        compileLookWorkshopPreviewFontCss(draft.self.badge?.font ?? null, [
          '[data-wx-bubble-badge="self"]',
        ]),
      ]
        .filter(Boolean)
        .join('\n\n'),
    [
      draft.header.titleFont,
      draft.header.subtitleFont,
      draft.timestamp.font,
      draft.other.font,
      draft.self.font,
      draft.other.badge?.font,
      draft.self.badge?.font,
    ],
  )

  return (
    <div className="lw-preview flex h-full min-h-0 flex-col">
      <div
        data-wx-chat-skin-scope
        className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[16px]"
        style={{
          backgroundColor: draft.advanced.roomBg,
          backgroundImage: draft.advanced.roomBgImage.trim()
            ? `url("${draft.advanced.roomBgImage.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}")`
            : undefined,
          backgroundSize: draft.advanced.roomBgImage.trim() ? 'cover' : undefined,
          backgroundPosition: draft.advanced.roomBgImage.trim() ? 'center' : undefined,
          backgroundRepeat: draft.advanced.roomBgImage.trim() ? 'no-repeat' : undefined,
          ...(overrides as CSSProperties),
        }}
      >
        <style dangerouslySetInnerHTML={{ __html: wrapped }} />
        {previewFontCss ? (
          <style dangerouslySetInnerHTML={{ __html: previewFontCss }} />
        ) : null}

        <header
          data-wx-chat-header
          className="relative shrink-0 overflow-hidden border-b px-2"
          style={{
            height: draft.header.heightPx,
            minHeight: draft.header.heightPx,
            backgroundColor: draft.header.bg,
            color: draft.header.textColor,
            borderColor: draft.header.borderColor,
            touchAction: 'none',
          }}
        >
          {draft.header.bgMode === 'image' && draft.header.bgImage.trim() ? (
            <div
              aria-hidden
              data-wx-chat-header-surface="image"
              className="pointer-events-none absolute inset-0 z-0"
              style={{
                backgroundImage: `url("${draft.header.bgImage.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}")`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                filter:
                  draft.header.bgImageBlurPx > 0
                    ? `blur(${draft.header.bgImageBlurPx}px)`
                    : undefined,
                transform: draft.header.bgImageBlurPx > 0 ? 'scale(1.12)' : undefined,
              }}
            />
          ) : null}
          {draft.header.bgMode === 'image' && draft.header.bgOverlayOpacity > 0 ? (
            <div
              aria-hidden
              data-wx-chat-header-surface="overlay"
              className="pointer-events-none absolute inset-0 z-0"
              style={{
                backgroundColor: draft.header.bgOverlayColor,
                opacity: draft.header.bgOverlayOpacity / 100,
              }}
            />
          ) : null}
          <DraggableHeaderItem
            target="title"
            pos={draft.header.titlePos}
            label="联系人昵称"
            autoSize
            data-wx-chat-header-title
            className="px-1"
            style={{
              fontSize: draft.header.titleSizePx,
              fontWeight: draft.header.titleWeight,
              color: draft.header.textColor,
              whiteSpace: 'nowrap',
              ...(titleFontStack ? { fontFamily: titleFontStack } : null),
            }}
          >
            预览对象
          </DraggableHeaderItem>

          {draft.header.showSubtitle ? (
            <DraggableHeaderItem
              target="subtitle"
              pos={draft.header.subtitlePos}
              label="输入状态"
              autoSize
              data-wx-chat-header-sub
              className="px-1"
              style={{
                fontSize: 10,
                color: draft.header.mutedColor,
                whiteSpace: 'nowrap',
                ...(subFontStack ? { fontFamily: subFontStack } : null),
              }}
            >
              {draft.header.subtitleText.trim() || '对方正在输入…'}
            </DraggableHeaderItem>
          ) : null}

          {/* 导出 CSS 的 title-wrap 钩子；预览里不铺满，避免挡交互 */}
          <div
            data-wx-chat-header-title-wrap
            className="pointer-events-none absolute left-1/2 top-1/2 z-[1] flex -translate-x-1/2 -translate-y-1/2 items-center gap-2"
            aria-hidden
          />

          <DraggableHeaderItem
            target="back"
            sizePx={draft.header.backBtn.sizePx}
            pos={draft.header.backBtn.pos}
            label="返回"
            data-wx-chat-header-btn="back"
            className="rounded-full"
            style={{ color: draft.header.btnColor || draft.header.textColor }}
          >
            {headerBtnIconFace(
              draft.header.backBtn,
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>,
            )}
          </DraggableHeaderItem>

          <DraggableHeaderItem
            target="time"
            sizePx={draft.header.timeBtn.sizePx}
            pos={draft.header.timeBtn.pos}
            label="线上时间设置"
            data-wx-chat-header-btn="time"
            className="rounded-full"
            style={{ color: draft.header.btnColor || draft.header.textColor }}
          >
            {headerBtnIconFace(
              draft.header.timeBtn,
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 2" />
              </svg>,
            )}
          </DraggableHeaderItem>

          {draft.header.showTitleAvatar ? (
            <DraggableHeaderItem
              target="titleAvatar"
              sizePx={draft.header.titleAvatarSizePx}
              pos={
                draft.header.titleAvatarPos.free
                  ? draft.header.titleAvatarPos
                  : draft.header.titleAvatarPlacement === 'above'
                    ? {
                        free: false,
                        xPct: draft.header.titlePos.xPct,
                        yPct: Math.max(10, draft.header.titlePos.yPct - 28),
                      }
                    : {
                        // 标题左侧：跟昵称同一水平线，略偏左
                        free: false,
                        xPct: Math.max(12, draft.header.titlePos.xPct - 14),
                        yPct: draft.header.titlePos.yPct,
                      }
              }
              label="角色头像"
              data-wx-chat-header-avatar
              className="overflow-hidden shadow-sm"
              style={{
                borderRadius: draft.header.titleAvatarRadiusPx,
                background: '#9ca3af',
                border: '1.5px solid rgba(255,255,255,0.55)',
                boxSizing: 'border-box',
                zIndex: 40,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span
                className="pointer-events-none flex h-full w-full items-center justify-center text-[9px] font-medium leading-none text-white"
                aria-hidden
              >
                头像
              </span>
            </DraggableHeaderItem>
          ) : null}

          <DraggableHeaderItem
            target="psyche"
            sizePx={draft.header.psycheBtn.sizePx}
            pos={draft.header.psycheBtn.pos}
            label="体征与心理监测"
            data-wx-chat-header-btn="psyche"
            className="rounded-full"
            style={{ color: draft.header.btnColor || draft.header.textColor }}
          >
            {headerBtnIconFace(
              draft.header.psycheBtn,
              <Activity size={20} strokeWidth={1.75} aria-hidden />,
            )}
          </DraggableHeaderItem>

          <DraggableHeaderItem
            target="more"
            sizePx={draft.header.moreBtn.sizePx}
            pos={draft.header.moreBtn.pos}
            label="当前聊天设置"
            data-wx-chat-header-btn="more"
            className="rounded-full"
            style={{ color: draft.header.btnColor || draft.header.textColor }}
          >
            {headerBtnIconFace(
              draft.header.moreBtn,
              <MoreHorizontal size={22} strokeWidth={2} aria-hidden />,
            )}
          </DraggableHeaderItem>
        </header>

        <div
          className="min-h-0 flex-1 overflow-y-auto overflow-x-visible px-1 py-2"
          style={{
            paddingLeft: draft.msgAreaPadX,
            paddingRight: draft.msgAreaPadX,
          }}
        >
          <div className="flex justify-center">
            <span
              key={draft.timestamp.font?.family || 'ts-default'}
              data-wx-timestamp
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                background: draft.timestamp.bg,
                color: draft.timestamp.textColor,
                borderRadius: draft.timestamp.radius,
                padding: `${draft.timestamp.padY}px ${draft.timestamp.padX}px`,
                fontSize: 13,
                lineHeight: 1.2,
                fontWeight: 400,
                fontStyle: 'normal',
                ...(timestampFontStack ? { fontFamily: timestampFontStack } : null),
              }}
            >
              今天 09:41
            </span>
          </div>

          <SectionHint>文字气泡 · 连续发送</SectionHint>
          <PreviewBubble
            side="other"
            text="这是对方气泡，低饱和留白。"
            cluster="first"
            draftSide={draft.other}
          />
          <PreviewBubble
            side="other"
            text="连续发送第二条，看中间圆角。"
            cluster="middle"
            draftSide={draft.other}
          />
          <PreviewBubble
            side="other"
            text="这是一条较长的示例文案，用来查看「最大宽度」：调低百分比时这里会更早换行，短句则几乎看不出变化。"
            cluster="last"
            draftSide={draft.other}
          />
          <PreviewBubble
            side="self"
            text="这是我的气泡预览。"
            cluster="first"
            draftSide={draft.self}
          />
          <PreviewBubble
            side="self"
            text="连续第二条也带头像。"
            cluster="middle"
            draftSide={draft.self}
          />
          <PreviewBubble
            side="self"
            text="这是一条较长的示例文案，用来查看「最大宽度」：调低百分比时这里会更早换行，短句则几乎看不出变化。"
            cluster="last"
            draftSide={draft.self}
          />

          <SectionHint>语音</SectionHint>
          <WeChatChatSkinEngineProvider engine="structured">
            <SpecialMsgRow
              isSelf={false}
            >
              <VoiceMessageBubble
                isUser={false}
                duration={12}
                audioUrl=""
                transcriptText="对方语音转写预览"
                messengerStyle="lumi"
                bubble={previewBubble}
                showBubbleTail={draft.other.showTail}
                bubbleTailMaskColor={roomBgForTail}
              />
            </SpecialMsgRow>
            <SpecialMsgRow
              isSelf
            >
              <VoiceMessageBubble
                isUser
                duration={8}
                audioUrl=""
                transcriptText="己方语音转写预览"
                messengerStyle="lumi"
                bubble={previewBubble}
                showBubbleTail={draft.self.showTail}
                bubbleTailMaskColor={roomBgForTail}
              />
            </SpecialMsgRow>

            <SectionHint>转账 · 全部状态</SectionHint>
            <SpecialMsgRow
              isSelf
            >
              <TransferBubbleFace
                messengerStyle="lumi"
                status="pending"
                amountYuan={88}
                remark="转账"
                perspective="outgoing"
              />
            </SpecialMsgRow>
            <SpecialMsgRow
              isSelf={false}
            >
              <TransferBubbleFace
                messengerStyle="lumi"
                status="accepted"
                amountYuan={88}
                remark="转账"
                perspective="incoming"
              />
            </SpecialMsgRow>
            <SpecialMsgRow
              isSelf
            >
              <TransferBubbleFace
                messengerStyle="lumi"
                status="returned"
                amountYuan={88}
                remark="转账"
                perspective="outgoing"
              />
            </SpecialMsgRow>

            <SectionHint>红包 · 全部状态</SectionHint>
            <SpecialMsgRow
              isSelf={false}
            >
              <RedPacketBubble
                messageId="lw-rp-unclaimed"
                data={{ remark: '恭喜发财', opened: false, amountYuan: 88 }}
                isSelf={false}
                messengerStyle="lumi"
                onAction={() => {}}
              />
            </SpecialMsgRow>
            <SpecialMsgRow
              isSelf
            >
              <RedPacketBubble
                messageId="lw-rp-claimed"
                data={{ remark: '恭喜发财', opened: true, amountYuan: 88 }}
                isSelf
                messengerStyle="lumi"
                onAction={() => {}}
              />
            </SpecialMsgRow>
            <SpecialMsgRow
              isSelf={false}
            >
              <RedPacketBubble
                messageId="lw-rp-expired"
                data={{ remark: '恭喜发财', opened: false, amountYuan: 88, expired: true }}
                isSelf={false}
                messengerStyle="lumi"
                onAction={() => {}}
              />
            </SpecialMsgRow>

            <SectionHint>位置 / 通话 / 收藏</SectionHint>
            <SpecialMsgRow
              isSelf={false}
            >
              <LocationMessageCard data={SAMPLE_LOCATION} />
            </SpecialMsgRow>
            <SpecialMsgRow
              isSelf
            >
              <CallStatusBubble data={{ status: 'duration', durationSec: 206 }} initiatedBySelf />
            </SpecialMsgRow>
            <SpecialMsgRow
              isSelf={false}
            >
              <CallStatusBubble data={{ status: 'rejected' }} initiatedBySelf={false} />
            </SpecialMsgRow>
            <SpecialMsgRow
              isSelf
            >
              <CallStatusBubble data={{ status: 'no_answer' }} initiatedBySelf />
            </SpecialMsgRow>
            <SpecialMsgRow
              isSelf={false}
            >
              <SharedRecordCard
                data={{
                  kind: 'shared_record',
                  shareId: 'lw-fav-1',
                  originalSenderName: '微信',
                  originalSenderCharacterId: '',
                  recordType: 'text',
                  contentSummary: '收藏的聊天记录预览',
                  timestamp: Date.now(),
                }}
              />
            </SpecialMsgRow>

            <SectionHint>听一听 · 全部状态</SectionHint>
            <SpecialMsgRow
              isSelf={false}
            >
              <CharacterInviteReceivedCard
                data={SAMPLE_LISTEN_INVITE}
                peerName="对方"
                onAccept={() => {}}
                onDecline={() => {}}
              />
            </SpecialMsgRow>
            <SpecialMsgRow
              isSelf
            >
              <InviteSentCard data={SAMPLE_LISTEN_INVITE} />
            </SpecialMsgRow>
            <SpecialMsgRow
              isSelf={false}
            >
              <AcceptResponseCard
                data={{
                  kind: 'music_accept',
                  inviteId: 'lw-listen-1',
                  replyText: '好呀，一起听。',
                  trackTitle: SAMPLE_LISTEN_INVITE.trackTitle,
                  trackArtist: SAMPLE_LISTEN_INVITE.trackArtist,
                }}
              />
            </SpecialMsgRow>
            <SpecialMsgRow
              isSelf={false}
            >
              <DeclineResponseCard
                data={{
                  kind: 'music_decline',
                  inviteId: 'lw-listen-1',
                  replyText: '这次先不去啦。',
                }}
              />
            </SpecialMsgRow>
          </WeChatChatSkinEngineProvider>
        </div>

        <div
          data-wx-chat-input-bar
          className="relative flex shrink-0 items-end gap-2 overflow-hidden border-t px-2"
          style={{
            backgroundColor: draft.input.barBg,
            borderColor: draft.input.barBorder,
            paddingTop: draft.input.padY,
            paddingBottom: draft.input.padY,
          }}
        >
          <button
            type="button"
            data-wx-chat-input-btn="voice"
            data-wx-chat-input-icon={inputMode === 'voice' ? 'keyboard' : 'mic'}
            className="flex h-9 w-9 items-center justify-center"
            style={{ color: draft.input.btnColor }}
            aria-label={inputMode === 'text' ? '切换为语音输入' : '切换为文字输入'}
            onClick={toggleInputMode}
          >
            {inputMode === 'voice' ? (
              <Keyboard size={20} strokeWidth={1.8} />
            ) : (
              <Mic size={20} strokeWidth={1.8} />
            )}
          </button>

          {inputMode === 'voice' ? (
            <button
              type="button"
              data-wx-chat-input-shell
              className="flex min-h-[36px] min-w-0 flex-1 items-center justify-center px-3 py-2 text-[14px]"
              style={{
                background: draft.input.shellBg,
                border: `1px solid ${draft.input.shellBorder}`,
                borderRadius: draft.input.shellRadius,
                color: draft.input.textColor,
              }}
            >
              按住说话
            </button>
          ) : (
            <button
              type="button"
              data-wx-chat-input-shell
              className="min-h-[36px] min-w-0 flex-1 px-3 py-2 text-left text-[14px]"
              style={{
                background: draft.input.shellBg,
                border: `1px solid ${draft.input.shellBorder}`,
                borderRadius: draft.input.shellRadius,
                color: hasDraftText ? draft.input.textColor : draft.input.placeholderColor,
              }}
              onClick={() => setHasDraftText((v) => !v)}
              aria-label="切换有字/空输入预览"
            >
              {hasDraftText ? '想说点什么…' : '输入消息...'}
            </button>
          )}

          <button
            type="button"
            data-wx-chat-input-btn="emoji"
            data-wx-chat-input-icon="emoji"
            className="flex h-9 w-9 items-center justify-center"
            style={{ color: draft.input.btnColor }}
            aria-label="表情"
          >
            <Smile size={20} strokeWidth={1.8} />
          </button>
          <button
            type="button"
            data-wx-chat-input-btn="plus"
            className="flex h-9 w-9 items-center justify-center"
            style={{ color: draft.input.btnColor }}
            aria-label="更多"
          >
            <Plus size={20} strokeWidth={1.8} />
          </button>
          <button
            type="button"
            data-wx-chat-input-btn="send"
            className="flex h-9 w-9 items-center justify-center text-[12px] font-medium"
            style={{ color: draft.input.btnColor }}
            aria-label="发送"
          >
            <span className="pointer-events-none">
              {inputMode === 'voice' ? 'AI' : hasDraftText ? '发' : 'AI'}
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}
