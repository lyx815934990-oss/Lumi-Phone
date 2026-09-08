import { create } from 'zustand'
import { createDefaultLookWorkshopDraft } from './defaults'
import type {
  InputBtnIconDraft,
  InputBtnIconKey,
  LookWorkshopArchiveFile,
  LookWorkshopCustomFont,
  LookWorkshopDraft,
  LookWorkshopSavedPack,
  BubbleSideDraft,
} from './types'
import { LOOK_WORKSHOP_DRAFT_FORMAT as DRAFT_FORMAT } from './types'
import { normalizeBubbleEdgeStickerList, type BubbleEdge } from '../wechat/bubbleEdgeStickers'
import { normalizeBubbleFrame } from '../wechat/bubbleFrame'
import { normalizeAvatarStickerList } from '../wechat/avatarStickers'
import {
  buildLinearGradientCss,
  defaultBubbleBadge,
  defaultBubbleShadow,
  defaultGradientStops,
  normalizeBubbleBadge,
  normalizeBubbleShadow,
  normalizeGradientStops,
  type GradientMode,
} from '../wechat/bubbleBadge'
import { personaDb } from '../wechat/newFriendsPersona/idb'

const LS_DRAFT = 'lumi.lookWorkshop.draft.v1'
const LS_LIBRARY = 'lumi.lookWorkshop.library.v1'
/** IndexedDB phoneKv：背景图/贴纸等大图不受 localStorage 配额限制 */
const IDB_DRAFT_KEY = 'lumi.lookWorkshop.draft.v1'
const IDB_LIBRARY_KEY = 'lumi.lookWorkshop.library.v1'
/** localStorage 仅作轻量缓存；超过此长度不再写入，避免配额失败 */
const LS_DRAFT_MAX_CHARS = 2_000_000
const BTN_ICON_KEYS: InputBtnIconKey[] = ['voice', 'keyboard', 'emoji', 'plus', 'send']

function mirrorAngleDeg(deg: number): number {
  const n = ((Math.round(deg) % 360) + 360) % 360
  return (360 - n) % 360
}

function mirrorEdge(edge: BubbleEdge): BubbleEdge {
  if (edge === 'left') return 'right'
  if (edge === 'right') return 'left'
  return edge
}

/** 把一侧样式水平镜像到对面（左右对调，非照搬） */
export function mirrorBubbleSideHorizontally(src: BubbleSideDraft): BubbleSideDraft {
  const side = structuredClone(src)
  const padL = side.padL
  side.padL = side.padR
  side.padR = padL

  side.gradientAngleDeg = mirrorAngleDeg(side.gradientAngleDeg)
  if (side.shadowDraft) {
    side.shadowDraft = {
      ...side.shadowDraft,
      angleDeg: mirrorAngleDeg(side.shadowDraft.angleDeg),
    }
  }

  // 手写 box-shadow：尽量把水平偏移取反
  if (typeof side.shadow === 'string' && side.shadow.trim()) {
    side.shadow = side.shadow.replace(
      /(^|[^-.\d])(-?\d+(?:\.\d+)?)(px|em|rem|%)(\s+)(-?\d+(?:\.\d+)?)(px|em|rem|%)/g,
      (_m, pre, x, xu, sp, y, yu) => `${pre}${-Number(x)}${xu}${sp}${y}${yu}`,
    )
  }

  // 手写渐变角度：替换 linear-gradient(Ndeg …)
  if (typeof side.bgGradient === 'string' && side.bgGradient.trim()) {
    side.bgGradient = side.bgGradient.replace(
      /(linear-gradient\(\s*)(-?\d+(?:\.\d+)?)(deg)/gi,
      (_m, pre, deg, unit) => `${pre}${mirrorAngleDeg(Number(deg))}${unit}`,
    )
  }

  side.avatarRotateDeg = -side.avatarRotateDeg

  side.edgeStickers = (side.edgeStickers ?? []).map((s) => {
    const edge = mirrorEdge(s.edge)
    const alongPct =
      s.edge === 'top' || s.edge === 'bottom' ? Math.round(100 - s.alongPct) : s.alongPct
    return {
      ...s,
      edge,
      alongPct,
      rotateDeg: -s.rotateDeg,
    }
  })

  side.avatarStickers = (side.avatarStickers ?? []).map((s) => ({
    ...s,
    xPct: Math.round(100 - s.xPct),
    rotateDeg: -s.rotateDeg,
  }))

  if (side.frame) {
    const left = side.frame.sliceLeft
    side.frame = {
      ...side.frame,
      sliceLeft: side.frame.sliceRight,
      sliceRight: left,
    }
  }

  // badge.side 是语义位（inner=靠中线 / outer=靠头像），对面侧 CSS 已分侧处理，无需翻转
  return side
}

function normalizeCustomFont(raw: unknown): LookWorkshopCustomFont | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const family = typeof o.family === 'string' ? o.family.trim() : ''
  const dataUrl = typeof o.dataUrl === 'string' ? o.dataUrl.trim() : ''
  if (!family || !dataUrl) return null
  return {
    family,
    fileName: typeof o.fileName === 'string' && o.fileName.trim() ? o.fileName.trim() : '自定义字体',
    dataUrl,
  }
}

function normalizeBtnIcon(
  raw: unknown,
  base: InputBtnIconDraft,
  legacySize?: number,
  legacyRadius?: number,
): InputBtnIconDraft {
  const sizeFallback =
    typeof legacySize === 'number' && Number.isFinite(legacySize) ? legacySize : base.sizePx
  const radiusFallback =
    typeof legacyRadius === 'number' && Number.isFinite(legacyRadius) ? legacyRadius : base.radiusPx
  if (typeof raw === 'string') {
    return { dataUrl: raw, sizePx: sizeFallback, radiusPx: radiusFallback }
  }
  if (raw && typeof raw === 'object') {
    const o = raw as Record<string, unknown>
    const dataUrl =
      typeof o.dataUrl === 'string'
        ? o.dataUrl
        : typeof o.url === 'string'
          ? o.url
          : base.dataUrl
    const sizePx =
      typeof o.sizePx === 'number' && Number.isFinite(o.sizePx) ? o.sizePx : sizeFallback
    const radiusPx =
      typeof o.radiusPx === 'number' && Number.isFinite(o.radiusPx) ? o.radiusPx : radiusFallback
    return {
      dataUrl,
      sizePx: Math.min(28, Math.max(16, Math.round(sizePx))),
      radiusPx: Math.min(24, Math.max(0, Math.round(radiusPx))),
    }
  }
  return { ...base, sizePx: sizeFallback, radiusPx: radiusFallback }
}

function clampInt(n: unknown, min: number, max: number, fallback: number): number {
  if (typeof n !== 'number' || !Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, Math.round(n)))
}

function normalizeBubbleSide(
  raw: unknown,
  base: LookWorkshopDraft['other'],
  legacyAvatar?: {
    radiusPx?: number
    borderColor?: string
    borderWidth?: number
    showAvatar?: boolean
    avatarOnlyFirst?: boolean
  },
): LookWorkshopDraft['other'] {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  const radiusRaw = o.radius ?? o.radiusSingle
  const radius =
    typeof radiusRaw === 'number' && Number.isFinite(radiusRaw)
      ? Math.min(28, Math.max(0, Math.round(radiusRaw)))
      : base.radius
  const bgImage = typeof o.bgImage === 'string' ? o.bgImage : base.bgImage
  const bgImageBlurPx =
    typeof o.bgImageBlurPx === 'number' && Number.isFinite(o.bgImageBlurPx)
      ? Math.min(24, Math.max(0, Math.round(o.bgImageBlurPx)))
      : base.bgImageBlurPx
  const pctRaw = o.tailOffsetYPct
  const legacyYPx = o.tailOffsetYPx ?? o.tailHeightPx
  const tailOffsetYPct =
    typeof pctRaw === 'number' && Number.isFinite(pctRaw)
      ? Math.min(100, Math.max(0, Math.round(pctRaw)))
      : typeof legacyYPx === 'number' && Number.isFinite(legacyYPx)
        ? // 旧 px：按约 50px 单行气泡高度换算成 %
          Math.min(100, Math.max(0, Math.round((legacyYPx / 50) * 100)))
        : base.tailOffsetYPct
  const lengthRaw = o.tailLengthPx
  const tailLengthPx =
    typeof lengthRaw === 'number' && Number.isFinite(lengthRaw)
      ? Math.min(20, Math.max(4, Math.round(lengthRaw)))
      : base.tailLengthPx
  const tailCluster =
    o.tailCluster === 'last' || o.tailCluster === 'every' || o.tailCluster === 'first'
      ? o.tailCluster
      : base.tailCluster
  const tailAnchor = o.tailAnchor === 'bottom' || o.tailAnchor === 'side' ? o.tailAnchor : base.tailAnchor
  const tailYMode = o.tailYMode === 'avatar' ? 'avatar' : 'pct'
  const tailOffsetXPct = clampInt(o.tailOffsetXPct, 0, 100, base.tailOffsetXPct)
  const tailOffsetXPx = clampInt(o.tailOffsetXPx, -40, 48, base.tailOffsetXPx)
  const tailTiltDeg = clampInt(o.tailTiltDeg, -60, 60, base.tailTiltDeg)
  const tailSurfaceMode = o.tailSurfaceMode === 'custom' ? 'custom' : 'follow'
  const tailBg = typeof o.tailBg === 'string' && o.tailBg.trim() ? o.tailBg : base.tailBg || base.bg
  let tailGradientMode: GradientMode = base.tailGradientMode ?? 'off'
  if (o.tailGradientMode === 'off' || o.tailGradientMode === 'stops' || o.tailGradientMode === 'css') {
    tailGradientMode = o.tailGradientMode
  }
  const tailGradientStops = normalizeGradientStops(
    o.tailGradientStops,
    base.tailGradientStops ?? defaultGradientStops(),
  )
  const tailGradientAngleDeg = clampInt(
    o.tailGradientAngleDeg,
    0,
    360,
    base.tailGradientAngleDeg ?? 135,
  )
  const tailGlassEnabled =
    typeof o.tailGlassEnabled === 'boolean' ? o.tailGlassEnabled : base.tailGlassEnabled === true
  const tailGlassBlurPx = clampInt(o.tailGlassBlurPx, 0, 40, base.tailGlassBlurPx ?? 16)
  const tailGlassSaturatePct = clampInt(
    o.tailGlassSaturatePct,
    100,
    200,
    base.tailGlassSaturatePct ?? 140,
  )
  const legacyRadius =
    typeof legacyAvatar?.radiusPx === 'number' ? legacyAvatar.radiusPx : base.avatarRadiusPx
  const legacyBorderColor =
    typeof legacyAvatar?.borderColor === 'string'
      ? legacyAvatar.borderColor
      : base.avatarBorderColor
  const legacyBorderWidth =
    typeof legacyAvatar?.borderWidth === 'number'
      ? legacyAvatar.borderWidth
      : base.avatarBorderWidth
  const showAvatar =
    typeof o.showAvatar === 'boolean'
      ? o.showAvatar
      : typeof legacyAvatar?.showAvatar === 'boolean'
        ? legacyAvatar.showAvatar
        : base.showAvatar
  let avatarCluster: LookWorkshopDraft['other']['avatarCluster'] = base.avatarCluster
  if (o.avatarCluster === 'every' || o.avatarCluster === 'first' || o.avatarCluster === 'last') {
    avatarCluster = o.avatarCluster
  } else if (typeof o.avatarOnlyFirst === 'boolean') {
    avatarCluster = o.avatarOnlyFirst ? 'first' : 'every'
  } else if (typeof o.avatarOnlyLast === 'boolean' && o.avatarOnlyLast) {
    avatarCluster = 'last'
  } else if (typeof legacyAvatar?.avatarOnlyFirst === 'boolean') {
    avatarCluster = legacyAvatar.avatarOnlyFirst ? 'first' : 'every'
  }

  let gradientMode: GradientMode = base.gradientMode
  if (o.gradientMode === 'off' || o.gradientMode === 'stops' || o.gradientMode === 'css') {
    gradientMode = o.gradientMode
  } else if (typeof o.useGradient === 'boolean') {
    gradientMode = o.useGradient && String(o.bgGradient ?? '').trim() ? 'css' : 'off'
  }
  const gradientStops = normalizeGradientStops(o.gradientStops, base.gradientStops)
  const gradientAngleDeg = clampInt(o.gradientAngleDeg, 0, 360, base.gradientAngleDeg)
  const bgGradient =
    typeof o.bgGradient === 'string'
      ? o.bgGradient
      : gradientMode === 'stops'
        ? buildLinearGradientCss(gradientAngleDeg, gradientStops)
        : base.bgGradient

  const shadowDraft = normalizeBubbleShadow(o.shadowDraft, base.shadowDraft ?? defaultBubbleShadow())
  // 旧草稿只有 shadow 字符串：当作 css 模式
  if (!('shadowDraft' in o) && typeof o.shadow === 'string' && o.shadow.trim()) {
    shadowDraft.useCss = true
    shadowDraft.enabled = o.shadow.trim() !== 'none'
  }

  const badge = normalizeBubbleBadge(o.badge, base.badge ?? defaultBubbleBadge()) ?? {
    ...defaultBubbleBadge(),
    enabled: false,
  }

  return {
    ...base,
    ...(o as Partial<LookWorkshopDraft['other']>),
    radius,
    bgImage,
    bgImageBlurPx,
    tailCluster,
    tailAnchor,
    tailYMode,
    tailOffsetYPct,
    tailOffsetXPct,
    tailOffsetXPx,
    tailLengthPx,
    tailTiltDeg,
    tailSurfaceMode,
    tailBg,
    tailGradientMode,
    tailGradientAngleDeg,
    tailGradientStops,
    tailBgGradient:
      typeof o.tailBgGradient === 'string'
        ? o.tailBgGradient
        : tailGradientMode === 'stops'
          ? buildLinearGradientCss(tailGradientAngleDeg, tailGradientStops)
          : base.tailBgGradient ?? '',
    tailGlassEnabled,
    tailGlassBlurPx,
    tailGlassSaturatePct,
    font: 'font' in o ? normalizeCustomFont(o.font) : base.font,
    edgeStickers:
      'edgeStickers' in o ? normalizeBubbleEdgeStickerList(o.edgeStickers) : base.edgeStickers,
    frame: 'frame' in o ? normalizeBubbleFrame(o.frame) : base.frame,
    avatarStickers:
      'avatarStickers' in o ? normalizeAvatarStickerList(o.avatarStickers) : base.avatarStickers,
    showAvatar,
    avatarCluster,
    gradientMode,
    gradientAngleDeg,
    gradientStops,
    bgGradient,
    useGradient: gradientMode !== 'off',
    glassEnabled: typeof o.glassEnabled === 'boolean' ? o.glassEnabled : base.glassEnabled,
    glassBlurPx: clampInt(o.glassBlurPx, 0, 40, base.glassBlurPx),
    glassSaturatePct: clampInt(o.glassSaturatePct, 100, 200, base.glassSaturatePct),
    glassEdgeBlurPx: clampInt(o.glassEdgeBlurPx, 0, 24, base.glassEdgeBlurPx),
    shadow: typeof o.shadow === 'string' ? o.shadow : base.shadow,
    shadowDraft,
    badge,
    avatarRadiusPx: clampInt(
      'avatarRadiusPx' in o ? o.avatarRadiusPx : legacyRadius,
      0,
      24,
      base.avatarRadiusPx,
    ),
    avatarBorderColor:
      typeof o.avatarBorderColor === 'string'
        ? o.avatarBorderColor
        : 'avatarBorderColor' in o
          ? base.avatarBorderColor
          : legacyBorderColor,
    avatarBorderWidth: clampInt(
      'avatarBorderWidth' in o ? o.avatarBorderWidth : legacyBorderWidth,
      0,
      4,
      base.avatarBorderWidth,
    ),
    // 旧 avatarInsetPx 曾误用作「内容内缩」；现改为距屏幕边距，默认 24
    avatarEdgeInsetPx: clampInt(
      o.avatarEdgeInsetPx ??
        (typeof o.avatarInsetPx === 'number' && o.avatarInsetPx > 12
          ? o.avatarInsetPx
          : undefined),
      0,
      48,
      base.avatarEdgeInsetPx,
    ),
    avatarSizePx: clampInt(o.avatarSizePx, 24, 72, base.avatarSizePx),
    avatarPlaceholderColor:
      typeof o.avatarPlaceholderColor === 'string' && o.avatarPlaceholderColor.trim()
        ? o.avatarPlaceholderColor.trim()
        : base.avatarPlaceholderColor,
    avatarRotateDeg: clampInt(o.avatarRotateDeg, -45, 45, base.avatarRotateDeg),
    avatarBubbleYPct: clampInt(o.avatarBubbleYPct, 0, 100, base.avatarBubbleYPct),
  }
}

/** 深合并嵌套对象，避免旧草稿缺少 header.timeBtn 等新字段 */
function normalizeDraft(partial?: Partial<LookWorkshopDraft> | null): LookWorkshopDraft {
  const base = createDefaultLookWorkshopDraft()
  if (!partial || typeof partial !== 'object') return base
  const inputRaw = (partial.input ?? {}) as Record<string, unknown>
  const legacySize =
    typeof inputRaw.btnIconSizePx === 'number' ? inputRaw.btnIconSizePx : undefined
  const legacyRadius =
    typeof inputRaw.btnIconRadiusPx === 'number' ? inputRaw.btnIconRadiusPx : undefined
  const iconsRaw =
    inputRaw.btnIcons && typeof inputRaw.btnIcons === 'object'
      ? (inputRaw.btnIcons as Record<string, unknown>)
      : {}

  const btnIcons = { ...base.input.btnIcons }
  for (const key of BTN_ICON_KEYS) {
    btnIcons[key] = normalizeBtnIcon(iconsRaw[key], base.input.btnIcons[key], legacySize, legacyRadius)
  }

  const legacyAvatar = {
    radiusPx: partial.avatarRadiusPx,
    borderColor: partial.avatarBorderColor,
    borderWidth: partial.avatarBorderWidth,
    showAvatar: partial.showAvatar,
    avatarOnlyFirst: partial.avatarOnlyFirst,
  }

  return {
    ...base,
    ...partial,
    version: 1,
    meta: { ...base.meta, ...(partial.meta ?? {}) },
    other: normalizeBubbleSide(partial.other, base.other, legacyAvatar),
    self: normalizeBubbleSide(partial.self, base.self, legacyAvatar),
    voice: { ...base.voice, ...(partial.voice ?? {}) },
    transfer: { ...base.transfer, ...(partial.transfer ?? {}) },
    redPacket: { ...base.redPacket, ...(partial.redPacket ?? {}) },
    location: { ...base.location, ...(partial.location ?? {}) },
    voiceCall: { ...base.voiceCall, ...(partial.voiceCall ?? {}) },
    favorite: { ...base.favorite, ...(partial.favorite ?? {}) },
    listenTogether: { ...base.listenTogether, ...(partial.listenTogether ?? {}) },
    header: {
      ...base.header,
      ...(partial.header ?? {}),
      backBtn: {
        ...base.header.backBtn,
        ...(partial.header?.backBtn ?? {}),
        pos: { ...base.header.backBtn.pos, ...(partial.header?.backBtn?.pos ?? {}) },
        iconDataUrl:
          typeof partial.header?.backBtn?.iconDataUrl === 'string'
            ? partial.header.backBtn.iconDataUrl
            : base.header.backBtn.iconDataUrl,
        iconSizePx:
          typeof partial.header?.backBtn?.iconSizePx === 'number'
            ? partial.header.backBtn.iconSizePx
            : base.header.backBtn.iconSizePx,
        iconRadiusPx:
          typeof partial.header?.backBtn?.iconRadiusPx === 'number'
            ? partial.header.backBtn.iconRadiusPx
            : base.header.backBtn.iconRadiusPx,
      },
      moreBtn: {
        ...base.header.moreBtn,
        ...(partial.header?.moreBtn ?? {}),
        pos: { ...base.header.moreBtn.pos, ...(partial.header?.moreBtn?.pos ?? {}) },
        iconDataUrl:
          typeof partial.header?.moreBtn?.iconDataUrl === 'string'
            ? partial.header.moreBtn.iconDataUrl
            : base.header.moreBtn.iconDataUrl,
        iconSizePx:
          typeof partial.header?.moreBtn?.iconSizePx === 'number'
            ? partial.header.moreBtn.iconSizePx
            : base.header.moreBtn.iconSizePx,
        iconRadiusPx:
          typeof partial.header?.moreBtn?.iconRadiusPx === 'number'
            ? partial.header.moreBtn.iconRadiusPx
            : base.header.moreBtn.iconRadiusPx,
      },
      timeBtn: {
        ...base.header.timeBtn,
        ...(partial.header?.timeBtn ?? {}),
        pos: { ...base.header.timeBtn.pos, ...(partial.header?.timeBtn?.pos ?? {}) },
        iconDataUrl:
          typeof partial.header?.timeBtn?.iconDataUrl === 'string'
            ? partial.header.timeBtn.iconDataUrl
            : base.header.timeBtn.iconDataUrl,
        iconSizePx:
          typeof partial.header?.timeBtn?.iconSizePx === 'number'
            ? partial.header.timeBtn.iconSizePx
            : base.header.timeBtn.iconSizePx,
        iconRadiusPx:
          typeof partial.header?.timeBtn?.iconRadiusPx === 'number'
            ? partial.header.timeBtn.iconRadiusPx
            : base.header.timeBtn.iconRadiusPx,
      },
      psycheBtn: {
        ...base.header.psycheBtn,
        ...(partial.header?.psycheBtn ?? {}),
        pos: { ...base.header.psycheBtn.pos, ...(partial.header?.psycheBtn?.pos ?? {}) },
        iconDataUrl:
          typeof partial.header?.psycheBtn?.iconDataUrl === 'string'
            ? partial.header.psycheBtn.iconDataUrl
            : base.header.psycheBtn.iconDataUrl,
        iconSizePx:
          typeof partial.header?.psycheBtn?.iconSizePx === 'number'
            ? partial.header.psycheBtn.iconSizePx
            : base.header.psycheBtn.iconSizePx,
        iconRadiusPx:
          typeof partial.header?.psycheBtn?.iconRadiusPx === 'number'
            ? partial.header.psycheBtn.iconRadiusPx
            : base.header.psycheBtn.iconRadiusPx,
      },
      titleAvatarPos: {
        ...base.header.titleAvatarPos,
        ...(partial.header?.titleAvatarPos ?? {}),
      },
      titlePos: {
        ...base.header.titlePos,
        ...(partial.header?.titlePos ?? {}),
      },
      subtitlePos: {
        ...base.header.subtitlePos,
        ...(partial.header?.subtitlePos ?? {}),
      },
      titleFont:
        partial.header && 'titleFont' in partial.header
          ? normalizeCustomFont(partial.header.titleFont)
          : base.header.titleFont,
      subtitleFont:
        partial.header && 'subtitleFont' in partial.header
          ? normalizeCustomFont(partial.header.subtitleFont)
          : base.header.subtitleFont,
      bgImage:
        typeof partial.header?.bgImage === 'string' ? partial.header.bgImage : base.header.bgImage,
      bgMode: (() => {
        const raw = partial.header?.bgMode
        if (raw === 'color' || raw === 'image') return raw
        const img =
          typeof partial.header?.bgImage === 'string' ? partial.header.bgImage : base.header.bgImage
        return img.trim() ? 'image' : base.header.bgMode
      })(),
    },
    input: {
      ...base.input,
      ...(partial.input ?? {}),
      barBgImage:
        typeof partial.input?.barBgImage === 'string'
          ? partial.input.barBgImage
          : base.input.barBgImage,
      btnIconSyncStyle:
        typeof inputRaw.btnIconSyncStyle === 'boolean'
          ? inputRaw.btnIconSyncStyle
          : base.input.btnIconSyncStyle,
      btnIcons,
    },
    timestamp: (() => {
      const ts = { ...base.timestamp, ...(partial.timestamp ?? {}) }
      const r = Number(ts.radius)
      return {
        ...ts,
        radius: Number.isFinite(r) ? Math.max(0, Math.min(20, Math.round(r))) : base.timestamp.radius,
        font:
          partial.timestamp && 'font' in partial.timestamp
            ? normalizeCustomFont(partial.timestamp.font)
            : base.timestamp.font,
      }
    })(),
    advanced: (() => {
      const adv = { ...base.advanced, ...(partial.advanced ?? {}) }
      return {
        ...adv,
        roomBg:
          typeof adv.roomBg === 'string' && adv.roomBg.trim()
            ? adv.roomBg
            : base.advanced.roomBg,
        roomBgImage:
          typeof adv.roomBgImage === 'string' ? adv.roomBgImage : base.advanced.roomBgImage,
        globalBlurPx:
          typeof adv.globalBlurPx === 'number' && Number.isFinite(adv.globalBlurPx)
            ? Math.min(28, Math.max(0, Math.round(adv.globalBlurPx)))
            : base.advanced.globalBlurPx,
        shadowStrength:
          typeof adv.shadowStrength === 'number' && Number.isFinite(adv.shadowStrength)
            ? Math.min(2, Math.max(0, adv.shadowStrength))
            : base.advanced.shadowStrength,
      }
    })(),
  }
}

function loadDraftFromLocalStorage(): LookWorkshopDraft {
  try {
    const raw = localStorage.getItem(LS_DRAFT)
    if (!raw) return createDefaultLookWorkshopDraft()
    return normalizeDraft(JSON.parse(raw) as Partial<LookWorkshopDraft>)
  } catch {
    return createDefaultLookWorkshopDraft()
  }
}

function loadLibraryFromLocalStorage(): LookWorkshopSavedPack[] {
  try {
    const raw = localStorage.getItem(LS_LIBRARY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

type State = {
  draft: LookWorkshopDraft
  library: LookWorkshopSavedPack[]
  /** IndexedDB 水合完成（背景图等大字段以 IDB 为准） */
  hydrated: boolean
  openSection: string
  previewTransferStatus: 'pending' | 'accepted' | 'returned'
  previewRpStatus: 'unclaimed' | 'claimed' | 'expired'
  previewListenStatus: 'invite' | 'accepted'
  previewHasDraftText: boolean
  setOpenSection: (id: string) => void
  setPreviewTransferStatus: (s: State['previewTransferStatus']) => void
  setPreviewRpStatus: (s: State['previewRpStatus']) => void
  setPreviewListenStatus: (s: State['previewListenStatus']) => void
  setPreviewHasDraftText: (v: boolean) => void
  patchDraft: (patch: Partial<LookWorkshopDraft>) => void
  setDraft: (draft: LookWorkshopDraft) => void
  patchPath: (path: string, value: unknown) => void
  resetDraft: () => void
  importArchive: (raw: unknown) => { ok: true } | { ok: false; error: string }
  saveToLibrary: (name?: string) => void
  deleteFromLibrary: (id: string) => void
  loadFromLibrary: (id: string) => void
  mirrorOtherToSelf: () => void
  mirrorSelfToOther: () => void
}

function setDeep(obj: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split('.')
  let cur: Record<string, unknown> = obj
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i]!
    const nextVal = cur[key]
    if (!nextVal || typeof nextVal !== 'object') cur[key] = {}
    cur = cur[key] as Record<string, unknown>
  }
  cur[parts[parts.length - 1]!] = value
}

let draftPersistTimer: number | null = null
let libraryPersistTimer: number | null = null
let pendingDraft: LookWorkshopDraft | null = null
let pendingLibrary: LookWorkshopSavedPack[] | null = null

function tryPersistDraftLocalStorage(draft: LookWorkshopDraft): void {
  try {
    const json = JSON.stringify(draft)
    if (json.length > LS_DRAFT_MAX_CHARS) {
      localStorage.removeItem(LS_DRAFT)
      return
    }
    localStorage.setItem(LS_DRAFT, json)
  } catch {
    try {
      localStorage.removeItem(LS_DRAFT)
    } catch {
      /* ignore */
    }
  }
}

function tryPersistLibraryLocalStorage(library: LookWorkshopSavedPack[]): void {
  try {
    localStorage.setItem(LS_LIBRARY, JSON.stringify(library))
  } catch {
    try {
      localStorage.removeItem(LS_LIBRARY)
    } catch {
      /* ignore */
    }
  }
}

function persistDraft(draft: LookWorkshopDraft) {
  pendingDraft = draft
  tryPersistDraftLocalStorage(draft)
  if (typeof window === 'undefined') return
  if (draftPersistTimer != null) window.clearTimeout(draftPersistTimer)
  draftPersistTimer = window.setTimeout(() => {
    draftPersistTimer = null
    const d = pendingDraft
    if (!d) return
    void personaDb.setPhoneKv(IDB_DRAFT_KEY, d).catch(() => {})
  }, 280)
}

function persistLibrary(library: LookWorkshopSavedPack[]) {
  pendingLibrary = library
  tryPersistLibraryLocalStorage(library)
  if (typeof window === 'undefined') return
  if (libraryPersistTimer != null) window.clearTimeout(libraryPersistTimer)
  libraryPersistTimer = window.setTimeout(() => {
    libraryPersistTimer = null
    const lib = pendingLibrary
    if (!lib) return
    void personaDb.setPhoneKv(IDB_LIBRARY_KEY, lib).catch(() => {})
  }, 280)
}

/** 立刻把待写入草稿刷进 IndexedDB（离开页面前调用） */
export function flushLookWorkshopPersist(): void {
  if (typeof window !== 'undefined') {
    if (draftPersistTimer != null) {
      window.clearTimeout(draftPersistTimer)
      draftPersistTimer = null
    }
    if (libraryPersistTimer != null) {
      window.clearTimeout(libraryPersistTimer)
      libraryPersistTimer = null
    }
  }
  const d = pendingDraft
  const lib = pendingLibrary
  if (d) void personaDb.setPhoneKv(IDB_DRAFT_KEY, d).catch(() => {})
  if (lib) void personaDb.setPhoneKv(IDB_LIBRARY_KEY, lib).catch(() => {})
}

/**
 * 从 IndexedDB 恢复完整草稿（含聊天室背景图等）。
 * 同步首屏仍读 localStorage；有大图时以 IDB 为准覆盖。
 */
export async function hydrateLookWorkshopStore(): Promise<void> {
  if (typeof window === 'undefined') return
  try {
    const raw = await personaDb.getPhoneKv(IDB_DRAFT_KEY)
    if (pendingDraft) {
      // 水合完成前用户已改过草稿（例如刚上传背景图）：以内存为准写回 IDB
      useLookWorkshopStore.setState({ hydrated: true })
      flushLookWorkshopPersist()
    } else if (raw && typeof raw === 'object') {
      const draft = normalizeDraft(raw as Partial<LookWorkshopDraft>)
      useLookWorkshopStore.setState({ draft, hydrated: true })
    } else {
      const lsDraft = loadDraftFromLocalStorage()
      pendingDraft = lsDraft
      await personaDb.setPhoneKv(IDB_DRAFT_KEY, lsDraft).catch(() => {})
      useLookWorkshopStore.setState({ hydrated: true })
    }
  } catch {
    useLookWorkshopStore.setState({ hydrated: true })
  }

  try {
    const libRaw = await personaDb.getPhoneKv(IDB_LIBRARY_KEY)
    if (pendingLibrary) {
      flushLookWorkshopPersist()
    } else if (Array.isArray(libRaw)) {
      useLookWorkshopStore.setState({ library: libRaw as LookWorkshopSavedPack[] })
    } else {
      const lsLib = loadLibraryFromLocalStorage()
      if (lsLib.length) {
        pendingLibrary = lsLib
        await personaDb.setPhoneKv(IDB_LIBRARY_KEY, lsLib).catch(() => {})
      }
    }
  } catch {
    /* ignore */
  }
}

export const useLookWorkshopStore = create<State>((set, get) => ({
  draft: typeof window !== 'undefined' ? loadDraftFromLocalStorage() : createDefaultLookWorkshopDraft(),
  library: typeof window !== 'undefined' ? loadLibraryFromLocalStorage() : [],
  hydrated: false,
  openSection: 'other',
  previewTransferStatus: 'pending',
  previewRpStatus: 'unclaimed',
  previewListenStatus: 'invite',
  previewHasDraftText: false,
  setOpenSection: (id) => set({ openSection: id }),
  setPreviewTransferStatus: (previewTransferStatus) => set({ previewTransferStatus }),
  setPreviewRpStatus: (previewRpStatus) => set({ previewRpStatus }),
  setPreviewListenStatus: (previewListenStatus) => set({ previewListenStatus }),
  setPreviewHasDraftText: (previewHasDraftText) => set({ previewHasDraftText }),
  patchDraft: (patch) => {
    const draft = { ...get().draft, ...patch }
    persistDraft(draft)
    set({ draft })
  },
  setDraft: (next) => {
    const draft = normalizeDraft(next)
    persistDraft(draft)
    set({ draft })
  },
  patchPath: (path, value) => {
    const draft = structuredClone(get().draft) as LookWorkshopDraft & Record<string, unknown>
    setDeep(draft as unknown as Record<string, unknown>, path, value)
    const root = path.split('.')[0]
    if (root === 'other' || root === 'self') {
      const sideKey = root as 'other' | 'self'
      draft[sideKey] = normalizeBubbleSide(
        draft[sideKey],
        createDefaultLookWorkshopDraft()[sideKey],
      )
    }
    persistDraft(draft)
    set({ draft })
    // 图片 / 字体等大字段立刻落 IndexedDB，避免刷新时 debounce 未写完丢失
    const heavy =
      /Image|Stickers|frame|Font|dataUrl|roomBgImage/i.test(path) ||
      (typeof value === 'string' && value.startsWith('data:'))
    if (heavy) flushLookWorkshopPersist()
  },
  resetDraft: () => {
    const draft = createDefaultLookWorkshopDraft()
    persistDraft(draft)
    set({ draft })
  },
  importArchive: (raw) => {
    try {
      const obj = raw as LookWorkshopArchiveFile
      if (!obj || typeof obj !== 'object') return { ok: false, error: '不是有效的 JSON 对象' }
      if (obj.format !== DRAFT_FORMAT && !(obj as { draft?: unknown }).draft) {
        const maybeDraft = obj as unknown as LookWorkshopDraft
        if (maybeDraft.version === 1 && maybeDraft.other && maybeDraft.self) {
          const draft = normalizeDraft(maybeDraft)
          persistDraft(draft)
          set({ draft })
          return { ok: true }
        }
        return { ok: false, error: '格式不符：需要外观工坊存档（lumi-look-workshop-draft）' }
      }
      if (!obj.draft || typeof obj.draft !== 'object') {
        return { ok: false, error: '存档缺少 draft 字段' }
      }
      const draft = normalizeDraft(obj.draft)
      persistDraft(draft)
      set({ draft })
      return { ok: true }
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : '解析失败' }
    }
  },
  saveToLibrary: (name) => {
    const draft = get().draft
    const id = `lw-${Date.now().toString(36)}`
    const item: LookWorkshopSavedPack = {
      id,
      name: (name || draft.meta.name || '未命名皮肤').trim(),
      updatedAt: Date.now(),
      draft: structuredClone(draft),
    }
    const library = [item, ...get().library].slice(0, 30)
    persistLibrary(library)
    set({ library })
  },
  deleteFromLibrary: (id) => {
    const library = get().library.filter((x) => x.id !== id)
    persistLibrary(library)
    set({ library })
  },
  loadFromLibrary: (id) => {
    const item = get().library.find((x) => x.id === id)
    if (!item) return
    const draft = normalizeDraft(item.draft)
    persistDraft(draft)
    set({ draft })
  },
  mirrorOtherToSelf: () => {
    const other = mirrorBubbleSideHorizontally(get().draft.other)
    const draft = { ...get().draft, self: other }
    persistDraft(draft)
    set({ draft })
  },
  mirrorSelfToOther: () => {
    const self = mirrorBubbleSideHorizontally(get().draft.self)
    const draft = { ...get().draft, other: self }
    persistDraft(draft)
    set({ draft })
  },
}))

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => {
    flushLookWorkshopPersist()
  })
  window.addEventListener('beforeunload', () => {
    flushLookWorkshopPersist()
  })
}
