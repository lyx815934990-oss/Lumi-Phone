import {
  LUMI_BUBBLE_PACK_FORMAT,
  LUMI_BUBBLE_PACK_VERSION,
  type LumiWeChatBubblePack,
} from '../wechat/bubblePack/types'
import { normalizeBubbleEdgeStickerList } from '../wechat/bubbleEdgeStickers'
import {
  bubbleFrameScopedCss,
  normalizeBubbleFrame,
} from '../wechat/bubbleFrame'
import { normalizeAvatarStickerList } from '../wechat/avatarStickers'
import {
  buildLinearGradientCss,
  buildStructuredBoxShadow,
  normalizeBubbleBadge,
  type BubbleBadge,
} from '../wechat/bubbleBadge'
import type {
  BubbleSideDraft,
  HeaderBtnDraft,
  HeaderChromeItemDraft,
  HeaderFreePos,
  LookWorkshopCustomFont,
  LookWorkshopDraft,
  SideKey,
  SpecialCardDraft,
} from './types'
import { compileLookWorkshopFontFaceCss, lookWorkshopFontStack } from './headerFonts'

function headerFontFamilyCss(
  selector: string,
  font: LookWorkshopCustomFont | null | undefined,
): string {
  const stack = lookWorkshopFontStack(font)
  if (!stack) return ''
  // 子节点也会盖继承，必须连 * 一起 !important
  return `${selector}, ${selector} * { font-family: ${stack} !important; }`
}

function compileHeaderFontFaces(draft: LookWorkshopDraft): string {
  return [
    compileLookWorkshopFontFaceCss(draft.header.titleFont),
    compileLookWorkshopFontFaceCss(draft.header.subtitleFont),
    compileLookWorkshopFontFaceCss(draft.timestamp.font),
    compileLookWorkshopFontFaceCss(draft.other.font),
    compileLookWorkshopFontFaceCss(draft.self.font),
    compileLookWorkshopFontFaceCss(draft.other.badge?.font ?? null),
    compileLookWorkshopFontFaceCss(draft.self.badge?.font ?? null),
  ]
    .filter(Boolean)
    .join('\n\n')
}

function cssDataUrl(dataUrl: string): string {
  return `url("${dataUrl.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}")`
}

/** 分侧头像：圆角只打在头像面，勿打在 chrome 上（transform+radius 会裁切探出的贴纸） */
function compileAvatarChromeCss(side: 'self' | 'other', d: BubbleSideDraft): string {
  const r = Math.min(24, Math.max(0, Math.round(d.avatarRadiusPx)))
  const size = Math.min(72, Math.max(24, Math.round(d.avatarSizePx)))
  const rot = Math.min(45, Math.max(-45, Math.round(d.avatarRotateDeg)))
  const yPct = Math.min(100, Math.max(0, Math.round(d.avatarBubbleYPct)))
  const bw = Math.min(4, Math.max(0, Math.round(d.avatarBorderWidth)))
  const slot = `[data-wx-avatar-slot="${side}"]`
  const sel = `[data-wx-avatar-chrome="${side}"]`
  const face = `${sel} > [data-wx-avatar-face], ${sel} > img:first-of-type, ${sel} > div:first-of-type:not([data-wx-avatar-stickers])`
  return [
    `${slot} {`,
    `  align-self: stretch !important;`,
    `  position: relative !important;`,
    `  width: ${size}px !important;`,
    `  min-height: ${size}px !important;`,
    `  flex-shrink: 0 !important;`,
    `  overflow: visible !important;`,
    `}`,
    `${sel} {`,
    `  position: absolute !important;`,
    `  left: 0 !important;`,
    `  top: calc((100% - ${size}px) * ${yPct} / 100) !important;`,
    `  width: ${size}px !important;`,
    `  height: ${size}px !important;`,
    `  border-radius: 0 !important;`,
    `  box-sizing: border-box !important;`,
    `  overflow: visible !important;`,
    `  clip: auto !important;`,
    `  clip-path: none !important;`,
    `  transform: rotate(${rot}deg) !important;`,
    `  transform-origin: center center !important;`,
    bw > 0
      ? `  box-shadow: 0 0 0 ${bw}px ${d.avatarBorderColor} !important;`
      : `  box-shadow: none !important;`,
    `}`,
    `${face} {`,
    `  border-radius: ${r}px !important;`,
    `  width: 100% !important;`,
    `  height: 100% !important;`,
    `  object-fit: cover !important;`,
    `  overflow: hidden !important;`,
    `}`,
    `${sel} > [data-wx-avatar-stickers] {`,
    `  position: absolute !important;`,
    `  inset: 0 !important;`,
    `  overflow: visible !important;`,
    `  clip: auto !important;`,
    `  clip-path: none !important;`,
    `  border-radius: 0 !important;`,
    `  pointer-events: none !important;`,
    `}`,
    `${sel} [data-wx-avatar-sticker] {`,
    `  max-width: none !important;`,
    `  max-height: none !important;`,
    `}`,
  ].join('\n')
}

function compileAvatarEdgeInsetCss(draft: LookWorkshopDraft): string {
  const otherEdge = Math.min(48, Math.max(0, Math.round(draft.other.avatarEdgeInsetPx)))
  const selfEdge = Math.min(48, Math.max(0, Math.round(draft.self.avatarEdgeInsetPx)))
  return [
    `/* 头像/气泡行距屏幕左右边（覆盖默认 ml/mr-[24px]） */`,
    `.ml-\\[24px\\] {`,
    `  margin-left: ${otherEdge}px !important;`,
    `}`,
    `.mr-\\[24px\\] {`,
    `  margin-right: ${selfEdge}px !important;`,
    `}`,
  ].join('\n')
}

/** 把 `A, B` 展开成 `A::before, B::before` */
function withPseudo(selector: string, pseudo: string): string {
  return selector
    .split(',')
    .map((s) => `${s.trim()}${pseudo}`)
    .filter(Boolean)
    .join(', ')
}

/**
 * 面板底色 + 可选背景图层（可模糊）+ 颜色遮罩。
 * 注意：勿用 z-index:-1（会溢出到父级，形成一圈模糊光晕）。
 */
function panelSurfaceCss(
  selector: string,
  opts: {
    bgColor: string
    bgImage: string | undefined | null
    imageBlurPx: number
    overlayColor: string
    overlayOpacity: number
    /**
     * false：允许四边贴纸探出气泡（不裁切）。
     * 此时不强制子元素 position/z-index，由贴纸 z=2、文字 z=3 自己分层。
     */
    clipOverflow?: boolean
  },
): string {
  const img = typeof opts.bgImage === 'string' ? opts.bgImage.trim() : ''
  const blur = Math.min(40, Math.max(0, Math.round(opts.imageBlurPx)))
  const op = Math.min(100, Math.max(0, opts.overlayOpacity)) / 100
  const hasImage = Boolean(img)
  const hasOverlay = op > 0.001
  const clipOverflow = opts.clipOverflow !== false
  const beforeSel = withPseudo(selector, '::before')
  const afterSel = withPseudo(selector, '::after')

  if (!hasImage && !hasOverlay) {
    return [
      `${selector} {`,
      `  background-color: ${opts.bgColor} !important;`,
      `  background-image: none !important;`,
      `}`,
      `${beforeSel}, ${afterSel} { content: none !important; display: none !important; }`,
    ].join('\n')
  }

  const scale = blur > 0 ? 1.12 : 1
  // filter:blur 会向外渗出；默认可 overflow:hidden；有边贴纸时改为 visible
  const before = hasImage
    ? [
        `${beforeSel} {`,
        `  content: "" !important;`,
        `  display: block !important;`,
        `  position: absolute !important;`,
        `  inset: 0 !important;`,
        `  z-index: 0 !important;`,
        `  pointer-events: none !important;`,
        `  border-radius: inherit !important;`,
        `  background-image: ${cssDataUrl(img)} !important;`,
        `  background-size: cover !important;`,
        `  background-position: center !important;`,
        `  background-repeat: no-repeat !important;`,
        blur > 0 ? `  filter: blur(${blur}px) !important;` : `  filter: none !important;`,
        blur > 0 ? `  transform: scale(${scale}) !important;` : `  transform: none !important;`,
        `}`,
      ].join('\n')
    : `${beforeSel} { content: none !important; display: none !important; }`

  const after = hasOverlay
    ? [
        `${afterSel} {`,
        `  content: "" !important;`,
        `  display: block !important;`,
        `  position: absolute !important;`,
        `  inset: 0 !important;`,
        `  z-index: 0 !important;`,
        `  pointer-events: none !important;`,
        `  border-radius: inherit !important;`,
        `  background-color: ${opts.overlayColor} !important;`,
        `  background-image: none !important;`,
        `  opacity: ${Number(op.toFixed(3))} !important;`,
        `  filter: none !important;`,
        `  transform: none !important;`,
        `}`,
      ].join('\n')
    : `${afterSel} { content: none !important; display: none !important; }`

  return [
    `${selector} {`,
    `  position: relative !important;`,
    clipOverflow
      ? `  overflow: hidden !important;`
      : `  overflow: visible !important;`,
    `  background-color: ${opts.bgColor} !important;`,
    `  background-image: none !important;`,
    `}`,
    // 抬高直接子节点压过 z-index:0 背景；有贴纸时勿改子元素，避免破坏 absolute 定位
    clipOverflow
      ? [
          `${selector} > * {`,
          `  position: relative;`,
          `  z-index: 1;`,
          `}`,
        ].join('\n')
      : [
          `${selector} > [data-wx-bubble-text] {`,
          `  position: relative;`,
          `  z-index: 3;`,
          `}`,
        ].join('\n'),
    before,
    after,
  ].join('\n')
}

function cssBgImageVar(dataUrl: string | undefined | null): string {
  const img = typeof dataUrl === 'string' ? dataUrl.trim() : ''
  return img ? cssDataUrl(img) : 'none'
}

function inputBtnIconCss(
  btn: string,
  iconMode: string | null,
  dataUrl: string,
  sizePx: number,
  radiusPx: number,
): string {
  if (!dataUrl.trim()) return ''
  const sel = iconMode
    ? `[data-wx-chat-input-btn="${btn}"][data-wx-chat-input-icon="${iconMode}"]`
    : `[data-wx-chat-input-btn="${btn}"]`
  // 用 ::after 承载图标，使圆角作用在图标本身（而非外层 36px 按钮盒）
  return [
    `${sel} {`,
    `  position: relative !important;`,
    `  color: transparent !important;`,
    `}`,
    `${sel}::after {`,
    `  content: "" !important;`,
    `  position: absolute !important;`,
    `  left: 50% !important;`,
    `  top: 50% !important;`,
    `  width: ${sizePx}px !important;`,
    `  height: ${sizePx}px !important;`,
    `  transform: translate(-50%, -50%) !important;`,
    `  background-image: ${cssDataUrl(dataUrl.trim())} !important;`,
    `  background-size: cover !important;`,
    `  background-repeat: no-repeat !important;`,
    `  background-position: center !important;`,
    `  border-radius: ${radiusPx}px !important;`,
    `  overflow: hidden !important;`,
    `  pointer-events: none !important;`,
    `  z-index: 1 !important;`,
    `}`,
    `${sel} > *,`,
    `${sel} svg {`,
    `  opacity: 0 !important;`,
    `}`,
  ].join('\n')
}

function compileInputBtnIconsCss(draft: LookWorkshopDraft): string {
  const icons = draft.input.btnIcons
  const voice = icons.voice
  const keyboard = icons.keyboard
  const emoji = icons.emoji
  const plus = icons.plus
  const send = icons.send
  const keyboardFallback = keyboard.dataUrl.trim() || voice.dataUrl.trim()
  const keyboardStyle = keyboard.dataUrl.trim() ? keyboard : voice
  return [
    inputBtnIconCss('voice', 'mic', voice.dataUrl, voice.sizePx, voice.radiusPx),
    inputBtnIconCss(
      'voice',
      'keyboard',
      keyboardFallback,
      keyboardStyle.sizePx,
      keyboardStyle.radiusPx,
    ),
    inputBtnIconCss('voice', null, voice.dataUrl, voice.sizePx, voice.radiusPx),
    inputBtnIconCss('emoji', 'emoji', emoji.dataUrl, emoji.sizePx, emoji.radiusPx),
    inputBtnIconCss(
      'emoji',
      'keyboard',
      keyboard.dataUrl.trim() || emoji.dataUrl,
      keyboard.dataUrl.trim() ? keyboard.sizePx : emoji.sizePx,
      keyboard.dataUrl.trim() ? keyboard.radiusPx : emoji.radiusPx,
    ),
    inputBtnIconCss('emoji', null, emoji.dataUrl, emoji.sizePx, emoji.radiusPx),
    inputBtnIconCss('plus', null, plus.dataUrl, plus.sizePx, plus.radiusPx),
    inputBtnIconCss('send', null, send.dataUrl, send.sizePx, send.radiusPx),
  ]
    .filter(Boolean)
    .join('\n')
}

function freePosCss(
  selector: string,
  pos: HeaderFreePos,
  sizePx?: number,
  color?: string,
): string {
  if (!pos.free) return ''
  const lines = [
    `${selector} {`,
    `  position: absolute !important;`,
    `  left: ${pos.xPct}% !important;`,
    `  top: ${pos.yPct}% !important;`,
    `  right: auto !important;`,
    `  bottom: auto !important;`,
    `  transform: translate(-50%, -50%) !important;`,
    `  z-index: 30 !important;`,
    `  margin: 0 !important;`,
  ]
  if (sizePx != null) {
    lines.push(`  width: ${sizePx}px !important;`)
    lines.push(`  height: ${sizePx}px !important;`)
    lines.push(`  min-width: ${sizePx}px !important;`)
  }
  if (color) lines.push(`  color: ${color} !important;`)
  lines.push(`}`)
  return lines.join('\n')
}

/** 标题/副标题定位：与外观工坊预览一致，始终按 xPct/yPct 绝对定位（不依赖 free） */
function headerTextPosCss(selector: string, pos: HeaderFreePos): string {
  return [
    `${selector} {`,
    `  position: absolute !important;`,
    `  left: ${pos.xPct}% !important;`,
    `  top: ${pos.yPct}% !important;`,
    `  right: auto !important;`,
    `  bottom: auto !important;`,
    `  transform: translate(-50%, -50%) !important;`,
    `  z-index: 30 !important;`,
    `  margin: 0 !important;`,
    `  max-width: min(70%, 220px) !important;`,
    `  white-space: nowrap !important;`,
    `  overflow: hidden !important;`,
    `  text-overflow: ellipsis !important;`,
    `  pointer-events: auto !important;`,
    `}`,
  ].join('\n')
}

function resolveTitleAvatarPreviewPos(draft: LookWorkshopDraft): HeaderFreePos {
  const titlePos = draft.header.titlePos
  if (draft.header.titleAvatarPos.free) return draft.header.titleAvatarPos
  if (draft.header.titleAvatarPlacement === 'above') {
    return {
      free: true,
      xPct: titlePos.xPct,
      yPct: Math.max(10, titlePos.yPct - 28),
    }
  }
  return {
    free: true,
    xPct: Math.max(12, titlePos.xPct - 14),
    yPct: titlePos.yPct,
  }
}

function headerChromeBtnCss(
  name: 'back' | 'time' | 'psyche' | 'more',
  item: HeaderChromeItemDraft | HeaderBtnDraft,
  draft: LookWorkshopDraft,
): string {
  const color = draft.header.btnColor.trim() || draft.header.textColor
  const iconPx = Math.max(14, Math.round(item.iconSizePx || item.sizePx * 0.5))
  const hasCustomIcon = Boolean(item.iconDataUrl?.trim())
  const base = [
    `[data-wx-chat-header-btn="${name}"] {`,
    `  display: flex !important;`,
    `  align-items: center !important;`,
    `  justify-content: center !important;`,
    `  color: ${color} !important;`,
    `  width: ${item.sizePx}px !important;`,
    `  height: ${item.sizePx}px !important;`,
    `  min-width: ${item.sizePx}px !important;`,
    hasCustomIcon ? `  position: relative !important;` : '',
    `}`,
    hasCustomIcon
      ? ''
      : `[data-wx-chat-header-btn="${name}"] svg { width: ${iconPx}px !important; height: ${iconPx}px !important; }`,
    hasCustomIcon
      ? [
          `[data-wx-chat-header-btn="${name}"]::after {`,
          `  content: "" !important;`,
          `  position: absolute !important;`,
          `  left: 50% !important;`,
          `  top: 50% !important;`,
          `  width: ${item.iconSizePx}px !important;`,
          `  height: ${item.iconSizePx}px !important;`,
          `  transform: translate(-50%, -50%) !important;`,
          `  background-image: ${cssDataUrl(item.iconDataUrl.trim())} !important;`,
          `  background-size: cover !important;`,
          `  background-repeat: no-repeat !important;`,
          `  background-position: center !important;`,
          `  border-radius: ${item.iconRadiusPx}px !important;`,
          `  overflow: hidden !important;`,
          `  pointer-events: none !important;`,
          `  z-index: 1 !important;`,
          `}`,
          `[data-wx-chat-header-btn="${name}"] > *,`,
          `[data-wx-chat-header-btn="${name}"] svg {`,
          `  opacity: 0 !important;`,
          `}`,
        ].join('\n')
      : '',
  ].filter(Boolean)
  const free = freePosCss(`[data-wx-chat-header-btn="${name}"]`, item.pos, item.sizePx, color)
  // 未 free 时：time/psyche 仍支持 side 切换（四键始终显示）
  if (!item.pos.free && (name === 'time' || name === 'psyche')) {
    const btn = item as HeaderBtnDraft
    const crossed =
      (name === 'time' && btn.side === 'right') || (name === 'psyche' && btn.side === 'left')
    if (crossed) {
      const peer = name === 'time' ? draft.header.psycheBtn : draft.header.timeBtn
      const peerSameSide = peer.side === btn.side && !peer.pos.free ? peer.sizePx : 0
      if (btn.side === 'right') {
        const right = 8 + draft.header.moreBtn.sizePx + peerSameSide
        return [
          ...base,
          `[data-wx-chat-header-btn="${name}"] {`,
          `  position: absolute !important;`,
          `  right: ${right}px !important;`,
          `  left: auto !important;`,
          `  top: 50% !important;`,
          `  transform: translateY(-50%) !important;`,
          `}`,
        ].join('\n')
      }
      const left = 8 + draft.header.backBtn.sizePx + peerSameSide
      return [
        ...base,
        `[data-wx-chat-header-btn="${name}"] {`,
        `  position: absolute !important;`,
        `  left: ${left}px !important;`,
        `  right: auto !important;`,
        `  top: 50% !important;`,
        `  transform: translateY(-50%) !important;`,
        `}`,
      ].join('\n')
    }
  }
  return [...base, free].filter(Boolean).join('\n')
}

function scaleShadow(shadow: string, strength: number): string {
  if (strength === 1 || !shadow.trim()) return shadow
  return shadow.replace(
    /rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*\)/gi,
    (_m, r, g, b, a) => `rgba(${r},${g},${b},${Math.min(1, Number(a) * strength)})`,
  )
}

function sideBg(side: BubbleSideDraft): string {
  if (side.gradientMode === 'stops') {
    const css = buildLinearGradientCss(side.gradientAngleDeg, side.gradientStops ?? [])
    if (css) return css
  }
  if (side.gradientMode === 'css' && side.bgGradient.trim()) return side.bgGradient.trim()
  if (side.useGradient && side.bgGradient.trim()) return side.bgGradient.trim()
  return side.bg
}

/** 尖角表面底色：follow=同步气泡条；custom=独立纯色/渐变 */
function sideTailBg(side: BubbleSideDraft): string {
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
    return solid || side.bg
  }
  return sideBg(side)
}

function sideBoxShadow(side: BubbleSideDraft, strength: number): string {
  const draft = side.shadowDraft
  if (draft && !draft.enabled) return 'none'
  if (draft && !draft.useCss) {
    return scaleShadow(buildStructuredBoxShadow(draft), strength)
  }
  const raw = (side.shadow || '').trim()
  if (!raw || raw === 'none') return 'none'
  return scaleShadow(raw, strength)
}

function glassCssLines(side: BubbleSideDraft): string[] {
  if (!side.glassEnabled) return []
  const blur = Math.min(40, Math.max(0, Math.round(side.glassBlurPx)))
  const sat = Math.min(200, Math.max(100, Math.round(side.glassSaturatePct)))
  return [
    `  -webkit-backdrop-filter: blur(${blur}px) saturate(${sat}%) !important;`,
    `  backdrop-filter: blur(${blur}px) saturate(${sat}%) !important;`,
  ]
}

/** 液体玻璃边缘模糊：玻璃底单独一层 filter:blur，轮廓羽化；文字不糊 */
function glassEdgeBlurShellCss(
  contentSel: string,
  faceSel: string,
  side: BubbleSideDraft,
  bg: string,
  glass: string[],
  baseShadow: string,
  opts: { hasBgImage: boolean },
): string {
  const e = Math.min(24, Math.max(0, Math.round(side.glassEdgeBlurPx ?? 0)))
  if (!side.glassEnabled || e <= 0) return ''
  const radius = Math.max(0, Math.round(side.radius))
  const outerR = radius + e
  const shadow =
    baseShadow && baseShadow !== 'none'
      ? `box-shadow: ${baseShadow} !important;`
      : `box-shadow: none !important;`
  return [
    `/* lumi glass-edge-blur */`,
    `${contentSel} {`,
    `  background: transparent !important;`,
    `  border-style: solid !important;`,
    `  border-width: 0 !important;`,
    `  border-color: transparent !important;`,
    `  overflow: visible !important;`,
    `  isolation: isolate !important;`,
    `  -webkit-backdrop-filter: none !important;`,
    `  backdrop-filter: none !important;`,
    shadow,
    `}`,
    // 关掉 face 实底，避免和 ::before 叠两层硬边
    `${faceSel} {`,
    `  background: transparent !important;`,
    `  -webkit-backdrop-filter: none !important;`,
    `  backdrop-filter: none !important;`,
    `  filter: none !important;`,
    `  box-shadow: none !important;`,
    `}`,
    // ::before = 真正被边缘模糊的玻璃板（轮廓羽化）
    `${contentSel}::before {`,
    `  content: "" !important;`,
    `  display: block !important;`,
    `  position: absolute !important;`,
    `  inset: -${e}px !important;`,
    `  z-index: 0 !important;`,
    `  pointer-events: none !important;`,
    `  border: none !important;`,
    `  border-radius: ${outerR}px !important;`,
    opts.hasBgImage ? '' : `  background: ${bg} !important;`,
    ...glass,
    `  filter: blur(${e}px) !important;`,
    `  -webkit-filter: blur(${e}px) !important;`,
    `}`,
    `${contentSel}::after { content: none !important; display: none !important; }`,
    `${contentSel} [data-wx-bubble-text] {`,
    `  position: relative !important;`,
    `  z-index: 3 !important;`,
    `}`,
    // 尖角在 side 下（预览）或 content 内：同步羽化，避免硬三角边
    `[data-wx-bubble-side] > [data-wx-bubble-tail],`,
    `${contentSel} [data-wx-bubble-tail] {`,
    `  filter: blur(${Math.max(1, Math.round(e * 0.85))}px) !important;`,
    `  -webkit-filter: blur(${Math.max(1, Math.round(e * 0.85))}px) !important;`,
    `}`,
  ]
    .filter(Boolean)
    .join('\n')
}

function badgeCss(
  side: SideKey,
  badge: BubbleBadge | null | undefined,
  sideFont: LookWorkshopCustomFont | null | undefined,
): string {
  const b = normalizeBubbleBadge(badge)
  if (!b || !b.enabled || !b.text.trim()) {
    return `[data-wx-bubble-badge="${side}"] { display: none !important; }`
  }
  const isSelf = side === 'self'
  // inner = 靠聊天中心：self 在气泡左侧，other 在气泡右侧
  const placeInner = b.side === 'inner'
  const onLeft = isSelf ? placeInner : !placeInner
  const badgeFontStack =
    lookWorkshopFontStack(b.font) ?? lookWorkshopFontStack(sideFont) ?? null
  // 无独立/气泡自定义字体时用栈；否则跟该侧气泡文本字体变量
  const fontFamily =
    badgeFontStack ??
    `var(--wx-${side}-bubble-font, var(--wx-chat-font, var(--wx-font)))`
  const showBg = b.showBg !== false
  return [
    `[data-wx-bubble-side="${side}"] {`,
    `  position: relative !important;`,
    `}`,
    `[data-wx-bubble-badge="${side}"] {`,
    `  position: absolute !important;`,
    `  top: ${b.yPct}% !important;`,
    `  transform: translateY(-50%) !important;`,
    onLeft
      ? `  right: calc(100% + ${b.gapPx}px) !important; left: auto !important;`
      : `  left: calc(100% + ${b.gapPx}px) !important; right: auto !important;`,
    `  display: inline-flex !important;`,
    `  align-items: center !important;`,
    `  white-space: nowrap !important;`,
    `  pointer-events: none !important;`,
    `  z-index: 4 !important;`,
    showBg
      ? [
          `  background: ${
            Math.round(Math.min(100, Math.max(0, b.bgOpacityPct))) >= 100
              ? b.bg
              : `color-mix(in srgb, ${b.bg} ${Math.round(Math.min(100, Math.max(0, b.bgOpacityPct)))}%, transparent)`
          } !important;`,
          `  border-radius: ${b.radiusPx}px !important;`,
          `  padding: ${b.padY}px ${b.padX}px !important;`,
          `  box-shadow: 0 1px 4px rgba(0,0,0,0.06) !important;`,
        ].join('\n')
      : [
          `  background: transparent !important;`,
          `  border-radius: 0 !important;`,
          `  padding: 0 !important;`,
          `  box-shadow: none !important;`,
        ].join('\n'),
    `  color: ${b.textColor} !important;`,
    `  font-size: ${b.fontSizePx}px !important;`,
    `  line-height: 1.2 !important;`,
    `  font-family: ${fontFamily} !important;`,
    `}`,
    b.cluster === 'first'
      ? [
          `[data-wx-bubble-cluster="middle"] [data-wx-bubble-badge="${side}"],`,
          `[data-wx-bubble-cluster="last"] [data-wx-bubble-badge="${side}"] {`,
          `  display: none !important;`,
          `}`,
        ].join('\n')
      : b.cluster === 'last'
        ? [
            `[data-wx-bubble-cluster="first"] [data-wx-bubble-badge="${side}"],`,
            `[data-wx-bubble-cluster="middle"] [data-wx-bubble-badge="${side}"] {`,
            `  display: none !important;`,
            `}`,
          ].join('\n')
        : '',
  ]
    .filter(Boolean)
    .join('\n')
}

function specialBlock(
  kind: string,
  card: SpecialCardDraft,
  followSide: BubbleSideDraft,
  strength: number,
): string {
  const bg = card.followBubble ? sideBg(followSide) : card.bg
  const border = card.followBubble ? followSide.borderColor : card.borderColor
  const bw = card.followBubble ? followSide.borderWidth : card.borderWidth
  const radius = card.followBubble ? followSide.radius : card.radius
  const shadow = card.followBubble
    ? sideBoxShadow(followSide, strength)
    : scaleShadow(card.shadow, strength)
  return [
    `/* ${kind} */`,
    `[data-wx-msg-kind="${kind}"][data-wx-special-card] {`,
    `  background: ${bg} !important;`,
    `  border: ${bw}px solid ${border} !important;`,
    `  border-radius: ${radius}px !important;`,
    `  box-shadow: ${shadow} !important;`,
    `}`,
    `[data-wx-msg-kind="${kind}"] [data-wx-special-part="label"],`,
    `[data-wx-msg-kind="${kind}"] [data-wx-special-part="amount"] {`,
    `  color: ${card.followBubble ? followSide.text : card.titleColor} !important;`,
    `}`,
    `[data-wx-msg-kind="${kind}"] [data-wx-special-part="status"],`,
    `[data-wx-msg-kind="${kind}"] [data-wx-special-part="footer"] {`,
    `  color: ${card.mutedColor} !important;`,
    `}`,
    kind === 'transfer' || kind === 'red-packet'
      ? [
          `[data-wx-msg-kind="${kind}"] [data-wx-special-part="amount"] {`,
          `  color: ${card.amountColor} !important;`,
          `}`,
          `[data-wx-msg-kind="${kind}"] [data-wx-special-part="icon"] {`,
          `  color: ${card.accent} !important;`,
          `}`,
        ].join('\n')
      : '',
  ]
    .filter(Boolean)
    .join('\n')
}

function bubbleSideCss(side: SideKey, d: BubbleSideDraft, strength: number): string {
  const bg = sideBg(d)
  const shadow = sideBoxShadow(d, strength)
  const sel = `[data-wx-bubble-side="${side}"]`
  // 真机：side 包 content；工坊预览：二者常在同一节点
  const content = `${sel}[data-wx-bubble-content], ${sel} [data-wx-bubble-content]`
  const face = `${sel} [data-wx-bubble-face], ${sel}[data-wx-bubble-content] > [data-wx-bubble-face]`
  const hasBgImage = Boolean(d.bgImage?.trim())
  const hasEdgeStickers = (d.edgeStickers?.length ?? 0) > 0
  const hasFrame = Boolean(normalizeBubbleFrame(d.frame))
  const glass = glassCssLines(d)
  const edgeSoftPx = d.glassEnabled
    ? Math.min(24, Math.max(0, Math.round(d.glassEdgeBlurPx ?? 0)))
    : 0
  const useEdgeSoft = edgeSoftPx > 0
  // 有边框时：底色画在 face 层（最底），content 透明，避免白底盖住边框
  const bgTarget = hasFrame || useEdgeSoft ? face : content
  return [
    `/* bubble ${side} */`,
    `${content} {`,
    hasFrame || hasBgImage || useEdgeSoft
      ? `  background: transparent !important;`
      : `  background: ${bg} !important;`,
    `  color: ${d.text} !important;`,
    `  font-size: ${d.fontSizePx}px !important;`,
    `  font-weight: ${d.fontWeight} !important;`,
    `  line-height: ${d.lineHeight} !important;`,
    `  padding: ${d.padT}px ${d.padR}px ${d.padB}px ${d.padL}px !important;`,
    `  border-style: solid !important;`,
    `  border-radius: ${d.radius}px !important;`,
    ...(useEdgeSoft
      ? [
          `  border-width: 0 !important;`,
          `  border-color: transparent !important;`,
          `  box-shadow: ${shadow === 'none' ? 'none' : shadow} !important;`,
          `  -webkit-backdrop-filter: none !important;`,
          `  backdrop-filter: none !important;`,
        ]
      : [
          `  border-color: ${d.borderColor} !important;`,
          // 分边宽度：贴尖角侧必须 0（勿用 transparent）
          `  border-top-width: ${d.borderWidth}px !important;`,
          `  border-bottom-width: ${d.showTail && d.tailAnchor === 'bottom' ? 0 : d.borderWidth}px !important;`,
          `  border-left-width: ${d.showTail && d.tailAnchor !== 'bottom' && side === 'other' ? 0 : d.borderWidth}px !important;`,
          `  border-right-width: ${d.showTail && d.tailAnchor !== 'bottom' && side === 'self' ? 0 : d.borderWidth}px !important;`,
          `  box-shadow: ${shadow} !important;`,
        ]),
    // 用 px 上限，避免 max-width: N% 相对整行把「气泡盒」撑开（用户侧头像会看起来离文字很远）
    `  max-width: min(${Math.round(3.2 * d.maxWidthPct)}px, ${d.maxWidthPct}vw) !important;`,
    d.minWidthPx > 0 ? `  min-width: ${d.minWidthPx}px !important;` : '',
    hasEdgeStickers || hasFrame || d.glassEnabled || useEdgeSoft
      ? `  overflow: visible !important;`
      : '',
    // 无边缘模糊时：玻璃打在 content；有边缘模糊/九宫格时玻璃打在 face/::before
    !hasFrame && !useEdgeSoft ? glass.join('\n') : '',
    d.showTail
      ? [
          `  --wx-bubble-tail-anchor: ${d.tailAnchor ?? 'side'};`,
          `  --wx-bubble-tail-length: ${d.tailLengthPx}px;`,
          `  --wx-bubble-tail-angle: ${d.tailAngleDeg};`,
          `  --wx-bubble-tail-round: ${d.tailRoundPx}px;`,
          `  --wx-bubble-tail-y-mode: ${(d.tailAnchor ?? 'side') === 'side' && d.tailYMode === 'avatar' ? 'avatar' : 'pct'};`,
          `  --wx-bubble-tail-offset-y: ${Math.min(100, Math.max(0, Math.round(d.tailOffsetYPct)))}%;`,
          `  --wx-bubble-tail-avatar-size: ${Math.min(72, Math.max(24, Math.round(d.avatarSizePx)))}px;`,
          `  --wx-bubble-tail-avatar-y: ${Math.min(100, Math.max(0, Math.round(d.avatarBubbleYPct)))};`,
          `  --wx-bubble-tail-offset-x-pct: ${d.tailOffsetXPct ?? 0};`,
          `  --wx-bubble-tail-offset-x: ${d.tailOffsetXPx ?? 0}px;`,
          `  --wx-bubble-tail-tilt: ${d.tailTiltDeg ?? 0};`,
          `  --wx-bubble-tail-border-width: ${useEdgeSoft ? 0 : d.borderWidth}px;`,
          `  --wx-bubble-tail-border-color: ${d.borderColor};`,
          `  --wx-bubble-tail-match-surface: 1;`,
          `  --wx-bubble-tail-bg: ${sideTailBg(d)};`,
          (() => {
            const custom = d.tailSurfaceMode === 'custom'
            const glassOn = custom ? d.tailGlassEnabled === true : d.glassEnabled
            const blurPx = custom ? (d.tailGlassBlurPx ?? 16) : d.glassBlurPx
            const satPct = custom ? (d.tailGlassSaturatePct ?? 140) : d.glassSaturatePct
            // 边缘羽化仅跟随气泡条玻璃；尖角单独表面时不套用气泡 edge blur
            const softEdge = !custom && useEdgeSoft
            return glassOn
              ? [
                  `  --wx-bubble-tail-glass-blur: ${Math.min(40, Math.max(0, Math.round(blurPx)))}px;`,
                  `  --wx-bubble-tail-glass-saturate: ${Math.min(200, Math.max(100, Math.round(satPct)))}%;`,
                  softEdge ? `  --wx-bubble-tail-edge-blur: ${edgeSoftPx}px;` : '',
                ]
                  .filter(Boolean)
                  .join('\n')
              : `  --wx-bubble-tail-glass-blur: 0px;`
          })(),
        ].join('\n')
      : '',
    `}`,
    useEdgeSoft
      ? glassEdgeBlurShellCss(content, face, d, bg, glass, shadow, {
          hasBgImage,
        })
      : hasFrame
        ? [
            `${face} {`,
            `  position: absolute !important;`,
            `  inset: 0 !important;`,
            `  z-index: 0 !important;`,
            `  pointer-events: none !important;`,
            `  border-radius: inherit !important;`,
            hasBgImage ? '' : `  background: ${bg} !important;`,
            ...glass,
            `}`,
          ].join('\n')
        : '',
    headerFontFamilyCss(content, d.font),
    headerFontFamilyCss(sel, d.font),
    hasBgImage
      ? panelSurfaceCss(bgTarget, {
          bgColor: d.bg,
          bgImage: d.bgImage,
          imageBlurPx: d.bgImageBlurPx,
          overlayColor: 'transparent',
          overlayOpacity: 0,
          clipOverflow: !(hasEdgeStickers || hasFrame || d.glassEnabled || useEdgeSoft),
        })
      : useEdgeSoft
        ? // 边缘模糊时 ::before 由 glassEdgeBlurShellCss 接管
          `${withPseudo(content, '::after')} { content: none !important; display: none !important; }`
        : `${withPseudo(content, '::before')}, ${withPseudo(content, '::after')} { content: none !important; display: none !important; }`,
    badgeCss(side, d.badge, d.font),
    // 必须带 [data-wx-bubble-side]，否则一侧「仅末条」会把另一侧首条/每条尖角也 display:none 掉
    d.showTail
      ? d.tailCluster === 'every'
        ? ''
        : d.tailCluster === 'first'
          ? [
              `[data-wx-bubble-cluster="middle"] [data-wx-bubble-side="${side}"] [data-wx-bubble-tail],`,
              `[data-wx-bubble-cluster="last"] [data-wx-bubble-side="${side}"] [data-wx-bubble-tail] {`,
              `  display: none !important;`,
              `}`,
              // 无尖角时恢复贴边描边（上面 content 规则在 showTail 时一律清零了）
              `[data-wx-bubble-cluster="middle"] ${content},`,
              `[data-wx-bubble-cluster="last"] ${content} {`,
              side === 'other'
                ? `  border-left-width: ${d.borderWidth}px !important;`
                : side === 'self'
                  ? `  border-right-width: ${d.borderWidth}px !important;`
                  : '',
              d.tailAnchor === 'bottom'
                ? `  border-bottom-width: ${d.borderWidth}px !important;`
                : '',
              `}`,
            ]
              .filter(Boolean)
              .join('\n')
          : [
              `[data-wx-bubble-cluster="first"] [data-wx-bubble-side="${side}"] [data-wx-bubble-tail],`,
              `[data-wx-bubble-cluster="middle"] [data-wx-bubble-side="${side}"] [data-wx-bubble-tail] {`,
              `  display: none !important;`,
              `}`,
              `[data-wx-bubble-cluster="first"] ${content},`,
              `[data-wx-bubble-cluster="middle"] ${content} {`,
              side === 'other'
                ? `  border-left-width: ${d.borderWidth}px !important;`
                : side === 'self'
                  ? `  border-right-width: ${d.borderWidth}px !important;`
                  : '',
              d.tailAnchor === 'bottom'
                ? `  border-bottom-width: ${d.borderWidth}px !important;`
                : '',
              `}`,
            ]
              .filter(Boolean)
              .join('\n')
      : '',
  ]
    .filter(Boolean)
    .join('\n')
}

/** 控件草稿 → scopedCss 正文（可含 @font-face；wrap 时会提到 @scope 外） */
export function compileLookWorkshopScopedCss(
  draft: LookWorkshopDraft,
  opts?: { includeFontFaces?: boolean },
): string {
  const s = draft.advanced.shadowStrength
  // 预览改走 FontFace API，避免把数 MB 的 dataUrl 塞进 <style> 导致后续规则解析失败
  const fontFaces =
    opts?.includeFontFaces === false ? '' : compileHeaderFontFaces(draft)
  const blurBoost =
    draft.advanced.globalBlurPx > 0
      ? [
          `[data-wx-bubble-content], [data-wx-special-card], [data-wx-chat-input-shell] {`,
          `  -webkit-backdrop-filter: blur(${draft.advanced.globalBlurPx}px) saturate(150%) !important;`,
          `  backdrop-filter: blur(${draft.advanced.globalBlurPx}px) saturate(150%) !important;`,
          `}`,
        ].join('\n')
      : ''

  const headerBlur = draft.header.useBlur
    ? [
        `  -webkit-backdrop-filter: blur(${draft.header.blurPx}px) saturate(160%) !important;`,
        `  backdrop-filter: blur(${draft.header.blurPx}px) saturate(160%) !important;`,
      ].join('\n')
    : ''
  const inputBlur = draft.input.useBlur
    ? [
        `  -webkit-backdrop-filter: blur(${draft.input.blurPx}px) saturate(160%) !important;`,
        `  backdrop-filter: blur(${draft.input.blurPx}px) saturate(160%) !important;`,
      ].join('\n')
    : ''

  return [
    fontFaces,
    '/* ===== 外观工坊 · 气泡 ===== */',
    bubbleSideCss('other', draft.other, s),
    bubbleSideCss('self', draft.self, s),
    bubbleFrameScopedCss('other', normalizeBubbleFrame(draft.other.frame)),
    bubbleFrameScopedCss('self', normalizeBubbleFrame(draft.self.frame)),
    // 气泡底 < 边框(1) < 贴纸(2) < 文字(3)；框/贴纸均可探出气泡外
    (draft.self.edgeStickers?.length ||
      draft.other.edgeStickers?.length ||
      normalizeBubbleFrame(draft.self.frame) ||
      normalizeBubbleFrame(draft.other.frame))
      ? [
          `[data-wx-msg-kind="text"][data-wx-bubble-side],`,
          `[data-wx-msg-kind="text"] [data-wx-bubble-content] {`,
          `  overflow: visible !important;`,
          `}`,
          `[data-wx-bubble-frame] {`,
          `  z-index: 1 !important;`,
          `  overflow: visible !important;`,
          `}`,
          `[data-wx-bubble-face] {`,
          `  z-index: 0 !important;`,
          `}`,
          `[data-wx-bubble-edge-stickers],`,
          `[data-wx-bubble-edge-sticker] {`,
          `  pointer-events: none !important;`,
          `  overflow: visible !important;`,
          `  z-index: 2 !important;`,
          `}`,
          `[data-wx-bubble-content] > [data-wx-bubble-text] {`,
          `  position: relative !important;`,
          `  z-index: 3 !important;`,
          `}`,
        ].join('\n')
      : '',
    '',
    '/* ===== 头像与间距（分侧） ===== */',
    compileAvatarChromeCss('other', draft.other),
    compileAvatarChromeCss('self', draft.self),
    compileAvatarEdgeInsetCss(draft),
    draft.other.showAvatar
      ? ''
      : `[data-wx-avatar-chrome="other"], [data-wx-avatar-slot="other"] { display: none !important; }`,
    draft.self.showAvatar
      ? ''
      : `[data-wx-avatar-chrome="self"], [data-wx-avatar-slot="self"] { display: none !important; }`,
    /* 行距：相邻行默认异角色；同角色连续簇覆盖为更紧 */
    `.wx-chat-msg-row {`,
    `  margin-top: 0 !important;`,
    `  margin-bottom: 0 !important;`,
    `}`,
    `.wx-chat-msg-row + .wx-chat-msg-row {`,
    `  margin-top: ${draft.gapDifferentSpeakerPx}px !important;`,
    `}`,
    `[data-wx-bubble-cluster="first"] + [data-wx-bubble-cluster="middle"],`,
    `[data-wx-bubble-cluster="middle"] + [data-wx-bubble-cluster="middle"],`,
    `[data-wx-bubble-cluster="middle"] + [data-wx-bubble-cluster="last"],`,
    `[data-wx-bubble-cluster="first"] + [data-wx-bubble-cluster="last"] {`,
    `  margin-top: ${draft.gapSameSpeakerPx}px !important;`,
    `}`,
    '',
    '/* ===== 时间戳 ===== */',
    `[data-wx-timestamp] {`,
    `  display: inline-flex !important;`,
    `  align-items: center !important;`,
    `  background: ${draft.timestamp.bg} !important;`,
    `  color: ${draft.timestamp.textColor} !important;`,
    `  border-radius: ${draft.timestamp.radius}px !important;`,
    `  padding: ${draft.timestamp.padY}px ${draft.timestamp.padX}px !important;`,
    `}`,
    headerFontFamilyCss(`[data-wx-timestamp]`, draft.timestamp.font),
    '',
    '/* ===== 特殊消息 ===== */',
    specialBlock('voice', draft.voice, draft.other, s),
    specialBlock('transfer', draft.transfer, draft.self, s),
    specialBlock('red-packet', draft.redPacket, draft.self, s),
    specialBlock('location', draft.location, draft.other, s),
    specialBlock('voice-call', draft.voiceCall, draft.other, s),
    specialBlock('favorite', draft.favorite, draft.other, s),
    specialBlock('listen-together', draft.listenTogether, draft.other, s),
    '',
    '/* ===== 顶栏 ===== */',
    `[data-wx-chat-header] {`,
    `  position: relative !important;`,
    `  height: ${draft.header.heightPx}px !important;`,
    `  min-height: ${draft.header.heightPx}px !important;`,
    `  max-height: ${draft.header.heightPx}px !important;`,
    `  box-sizing: border-box !important;`,
    `  color: ${draft.header.textColor} !important;`,
    `  border-bottom-color: ${draft.header.borderColor} !important;`,
    headerBlur,
    `}`,
    panelSurfaceCss('[data-wx-chat-header]', {
      // 背景图/模糊/遮罩由真机 Header 的 CSS 变量图层绘制，避免 scopedCss 的 ::before 打不到顶栏
      bgColor: draft.header.bg,
      bgImage: '',
      imageBlurPx: 0,
      overlayColor: 'transparent',
      overlayOpacity: 0,
    }),
    draft.header.showSubtitle
      ? ''
      : `[data-wx-chat-header] [data-wx-chat-header-sub] { display: none !important; }`,
    `[data-wx-chat-header-title] {`,
    `  font-size: ${draft.header.titleSizePx}px !important;`,
    `  font-weight: ${draft.header.titleWeight} !important;`,
    `  color: ${draft.header.textColor} !important;`,
    `}`,
    headerFontFamilyCss(`[data-wx-chat-header-title]`, draft.header.titleFont),
    // 与工坊预览一致：标题/副标题始终按坐标绝对定位；先拆掉 title-wrap 的 relative，使 % 相对顶栏
    [
      `[data-wx-chat-header-title-wrap],`,
      `[data-wx-chat-header-title-wrap] *:not([data-wx-chat-header-title]):not([data-wx-chat-header-sub]):not([data-wx-chat-header-avatar]) {`,
      `  position: static !important;`,
      `  transform: none !important;`,
      `}`,
    ].join('\n'),
    headerTextPosCss(`[data-wx-chat-header-title]`, draft.header.titlePos),
    draft.header.showSubtitle
      ? [
          `[data-wx-chat-header-sub] { color: ${draft.header.mutedColor} !important; }`,
          headerFontFamilyCss(`[data-wx-chat-header-sub]`, draft.header.subtitleFont),
          headerTextPosCss(`[data-wx-chat-header-sub]`, draft.header.subtitlePos),
        ].join('\n')
      : '',
    draft.header.showTitleAvatar
      ? [
          `[data-wx-chat-header-avatar] {`,
          `  display: flex !important;`,
          `  align-items: center !important;`,
          `  justify-content: center !important;`,
          `  width: ${draft.header.titleAvatarSizePx}px !important;`,
          `  height: ${draft.header.titleAvatarSizePx}px !important;`,
          `  border-radius: ${draft.header.titleAvatarRadiusPx}px !important;`,
          `  object-fit: cover !important;`,
          `  flex-shrink: 0 !important;`,
          `}`,
          // 与 LivePreview 相同：beside/above 也写成绝对坐标，避免 flex 行与绝对标题叠在一起
          freePosCss(
            `[data-wx-chat-header-avatar]`,
            resolveTitleAvatarPreviewPos(draft),
            draft.header.titleAvatarSizePx,
          ),
        ]
          .filter(Boolean)
          .join('\n')
      : `[data-wx-chat-header-avatar] { display: none !important; }`,
    headerChromeBtnCss('back', draft.header.backBtn, draft),
    headerChromeBtnCss('more', draft.header.moreBtn, draft),
    headerChromeBtnCss('time', draft.header.timeBtn, draft),
    headerChromeBtnCss('psyche', draft.header.psycheBtn, draft),
    '',
    '/* ===== 输入栏 ===== */',
    `[data-wx-chat-input-bar] {`,
    `  border-top-color: ${draft.input.barBorder} !important;`,
    `  padding-top: ${draft.input.padY}px !important;`,
    `  padding-bottom: ${draft.input.padY}px !important;`,
    inputBlur,
    `}`,
    panelSurfaceCss('[data-wx-chat-input-bar]', {
      bgColor: draft.input.barBg,
      bgImage: draft.input.barBgImage,
      imageBlurPx: draft.input.barBgImageBlurPx,
      overlayColor: draft.input.barBgOverlayColor,
      overlayOpacity: draft.input.barBgOverlayOpacity,
    }),
    `[data-wx-chat-input-shell] {`,
    `  background: ${draft.input.shellBg} !important;`,
    `  border-color: ${draft.input.shellBorder} !important;`,
    `  border-radius: ${draft.input.shellRadius}px !important;`,
    `  color: ${draft.input.textColor} !important;`,
    `}`,
    `[data-wx-chat-input-btn] { color: ${draft.input.btnColor} !important; }`,
    compileInputBtnIconsCss(draft),
    blurBoost,
  ]
    .filter(Boolean)
    .join('\n')
}

/** 控件草稿 → skinOverrides CSS 变量 */
export function compileLookWorkshopSkinOverrides(draft: LookWorkshopDraft): Record<string, string> {
  return {
    '--wx-chat-header-bg': draft.header.bg,
    '--wx-chat-header-bg-image':
      draft.header.bgMode === 'image' ? cssBgImageVar(draft.header.bgImage) : 'none',
    '--wx-chat-header-bg-image-blur':
      draft.header.bgMode === 'image'
        ? `${Math.min(40, Math.max(0, draft.header.bgImageBlurPx))}px`
        : '0px',
    '--wx-chat-header-bg-overlay':
      draft.header.bgMode === 'image' ? draft.header.bgOverlayColor : 'transparent',
    '--wx-chat-header-bg-overlay-opacity': String(
      draft.header.bgMode === 'image'
        ? Math.min(100, Math.max(0, draft.header.bgOverlayOpacity)) / 100
        : 0,
    ),
    '--wx-chat-header-text': draft.header.textColor,
    '--wx-chat-header-muted': draft.header.mutedColor,
    '--wx-chat-header-border': draft.header.borderColor,
    '--wx-chat-header-height': `${draft.header.heightPx}px`,
    '--wx-chat-header-btn': draft.header.btnColor.trim() || draft.header.textColor,
    '--wx-chat-header-show-avatar': draft.header.showTitleAvatar ? '1' : '0',
    '--wx-chat-header-avatar-display': draft.header.showTitleAvatar ? 'block' : 'none',
    '--wx-chat-header-avatar-size': `${draft.header.titleAvatarSizePx}px`,
    '--wx-chat-header-avatar-radius': `${draft.header.titleAvatarRadiusPx}px`,
    '--wx-chat-header-typing-text': draft.header.subtitleText.trim() || '对方正在输入…',
    '--wx-chat-input-bar-bg': draft.input.barBg,
    '--wx-chat-input-bar-bg-image': cssBgImageVar(draft.input.barBgImage),
    '--wx-chat-input-bar-bg-image-blur': `${Math.min(40, Math.max(0, draft.input.barBgImageBlurPx))}px`,
    '--wx-chat-input-bar-bg-overlay': draft.input.barBgOverlayColor,
    '--wx-chat-input-bar-bg-overlay-opacity': String(
      Math.min(100, Math.max(0, draft.input.barBgOverlayOpacity)) / 100,
    ),
    '--wx-chat-input-bar-border': draft.input.barBorder,
    '--wx-chat-input-shell-bg': draft.input.shellBg,
    '--wx-chat-input-shell-border': draft.input.shellBorder,
    '--wx-chat-input-shell-radius': `${draft.input.shellRadius}px`,
    '--wx-chat-input-btn-color': draft.input.btnColor,
    '--wx-chat-input-text-color': draft.input.textColor,
    '--wx-chat-input-placeholder': draft.input.placeholderColor,
    '--wx-special-rp-bg': draft.redPacket.bg,
    '--wx-special-rp-border': draft.redPacket.borderColor,
    '--wx-special-rp-accent': draft.redPacket.accent,
    '--wx-special-rp-text': draft.redPacket.titleColor,
    '--wx-special-tf-bg': draft.transfer.bg,
    '--wx-special-tf-accent-pending': draft.transfer.accent,
    '--wx-special-tf-accent-accepted': draft.transfer.accent,
    '--wx-special-tf-amount': draft.transfer.amountColor,
    '--wx-special-tf-muted': draft.transfer.mutedColor,
    '--wx-special-voice-bg-self': draft.voice.followBubble ? draft.self.bg : draft.voice.bg,
    '--wx-special-voice-bg-other': draft.voice.followBubble ? draft.other.bg : draft.voice.bg,
    '--wx-special-voice-border-self': draft.voice.borderColor,
    '--wx-special-voice-border-other': draft.voice.borderColor,
    '--wx-special-voice-duration': draft.voice.mutedColor,
    '--wx-special-loc-bg': draft.location.bg,
    '--wx-special-loc-border': draft.location.borderColor,
    '--wx-special-loc-title': draft.location.titleColor,
    '--wx-special-loc-muted': draft.location.mutedColor,
    '--wx-special-loc-pin': draft.location.accent,
    '--wx-special-call-bg': draft.voiceCall.bg,
    '--wx-special-call-text': draft.voiceCall.titleColor,
    '--wx-special-call-muted': draft.voiceCall.mutedColor,
    '--wx-special-call-border': draft.voiceCall.borderColor,
    '--wx-special-fav-bg': draft.favorite.bg,
    '--wx-special-fav-border': draft.favorite.borderColor,
    '--wx-special-fav-title': draft.favorite.titleColor,
    '--wx-special-fav-muted': draft.favorite.mutedColor,
    '--wx-special-listen-bg': draft.listenTogether.bg,
    '--wx-special-listen-border': draft.listenTogether.borderColor,
    '--wx-special-listen-title': draft.listenTogether.titleColor,
    '--wx-special-listen-muted': draft.listenTogether.mutedColor,
    '--wx-special-listen-accent': draft.listenTogether.accent,
    '--wx-chat-timestamp-radius': `${draft.timestamp.radius}px`,
    ...(lookWorkshopFontStack(draft.timestamp.font)
      ? { '--wx-chat-timestamp-font': lookWorkshopFontStack(draft.timestamp.font)! }
      : {}),
    ...(lookWorkshopFontStack(draft.self.font)
      ? {
          '--wx-self-bubble-font': `${lookWorkshopFontStack(draft.self.font)}, var(--wx-chat-font, var(--wx-font))`,
        }
      : {}),
    ...(lookWorkshopFontStack(draft.other.font)
      ? {
          '--wx-other-bubble-font': `${lookWorkshopFontStack(draft.other.font)}, var(--wx-chat-font, var(--wx-font))`,
        }
      : {}),
  }
}

function newPackId(): string {
  return `look-workshop-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

/** 编译为可上传到「外观 → 聊天气泡」的气泡资源包 */
export function compileLookWorkshopBubblePack(draft: LookWorkshopDraft): LumiWeChatBubblePack {
  const id = newPackId()
  const scopedCss = compileLookWorkshopScopedCss(draft)
  const skinOverrides = compileLookWorkshopSkinOverrides(draft)
  const edgeSelf = normalizeBubbleEdgeStickerList(draft.self.edgeStickers)
  const edgeOther = normalizeBubbleEdgeStickerList(draft.other.edgeStickers)
  const frameSelf = normalizeBubbleFrame(draft.self.frame)
  const frameOther = normalizeBubbleFrame(draft.other.frame)
  const avatarSelf = normalizeAvatarStickerList(draft.self.avatarStickers)
  const avatarOther = normalizeAvatarStickerList(draft.other.avatarStickers)
  const badgeSelf = normalizeBubbleBadge(draft.self.badge)
  const badgeOther = normalizeBubbleBadge(draft.other.badge)
  const hasBadges = Boolean(
    (badgeSelf?.enabled && badgeSelf.text.trim()) ||
      (badgeOther?.enabled && badgeOther.text.trim()),
  )

  return {
    format: LUMI_BUBBLE_PACK_FORMAT,
    version: LUMI_BUBBLE_PACK_VERSION,
    meta: {
      id,
      name: draft.meta.name.trim() || '外观工坊皮肤',
      description: draft.meta.description.trim() || '由外观工坊导出',
      ...(draft.meta.author.trim() ? { author: draft.meta.author.trim() } : {}),
    },
    preset: {
      id,
      name: draft.meta.name.trim() || '外观工坊皮肤',
      description: draft.meta.description.trim() || '由外观工坊导出',
      bubble: {
        selfBubbleBg: sideBg(draft.self),
        otherBubbleBg: sideBg(draft.other),
        selfBubbleRadiusPx: draft.self.radius,
        otherBubbleRadiusPx: draft.other.radius,
        // 包内保留单值兼容；分侧圆角/边框/内边距由 scopedCss 覆盖
        avatarRadiusPx: draft.other.avatarRadiusPx,
        showAvatar: draft.other.showAvatar || draft.self.showAvatar,
        showAvatarOther: draft.other.showAvatar,
        showAvatarSelf: draft.self.showAvatar,
        showBubbleTail: draft.self.showTail || draft.other.showTail,
        // 特殊消息走 Lumi；文字尖角由 showBubbleTail + scopedCss 几何尖角驱动
        // 切勿写 bubbleTailStyle:'wechat'，否则会劫持「微信 App」预设的头像簇/排版语义
        messengerBubbleStyle: 'lumi',
        mergeConsecutiveAvatarGroup:
          draft.other.avatarCluster === 'first' || draft.self.avatarCluster === 'first',
        avatarClusterOther: draft.other.avatarCluster,
        avatarClusterSelf: draft.self.avatarCluster,
      },
      selfBubbleText: draft.self.text,
      otherBubbleText: draft.other.text,
      chatRoomDefaultBg: draft.advanced.roomBgImage.trim()
        ? {
            mode: 'image' as const,
            imageUrl: draft.advanced.roomBgImage.trim(),
            fallbackColor: draft.advanced.roomBg,
          }
        : { mode: 'solid' as const, color: draft.advanced.roomBg },
      wechatThemePatch: {
        chatRoomDefaultBg: draft.advanced.roomBgImage.trim()
          ? {
              mode: 'image' as const,
              imageUrl: draft.advanced.roomBgImage.trim(),
              fallbackColor: draft.advanced.roomBg,
            }
          : { mode: 'solid' as const, color: draft.advanced.roomBg },
        chatInputBg: draft.input.barBg,
        chatInputBorder: draft.input.barBorder,
      },
    },
    skinOverrides,
    scopedCss,
    skinEngine: 'structured',
    ...(edgeSelf.length || edgeOther.length
      ? { bubbleEdgeStickers: { self: edgeSelf, other: edgeOther } }
      : {}),
    ...(frameSelf || frameOther
      ? { bubbleFrames: { self: frameSelf, other: frameOther } }
      : {}),
    ...(avatarSelf.length || avatarOther.length
      ? { avatarStickers: { self: avatarSelf, other: avatarOther } }
      : {}),
    ...(hasBadges ? { bubbleBadges: { self: badgeSelf, other: badgeOther } } : {}),
  }
}

export function downloadJsonFile(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function downloadTextFile(filename: string, text: string, mime = 'text/css;charset=utf-8'): void {
  const blob = new Blob([text], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
