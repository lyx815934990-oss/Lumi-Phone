import type { ApiConfig } from '../api/types'
import { openAiCompatibleChat } from '../wechat/newFriendsPersona/ai'
import { buildLookWorkshopAiSystemPrompt } from './aiAssistPrompt'
import { createDefaultLookWorkshopDraft } from './defaults'
import type {
  BubbleSideDraft,
  HeaderAvatarPlacement,
  HeaderBtnDraft,
  HeaderBtnSide,
  HeaderChromeItemDraft,
  HeaderFreePos,
  LookWorkshopDraft,
  SpecialCardDraft,
} from './types'

export type LookWorkshopAiResult = {
  styleName: string
  designNote: string
  draft: LookWorkshopDraft
}

function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min
  return Math.min(max, Math.max(min, n))
}

function asStr(v: unknown, fallback: string): string {
  return typeof v === 'string' && v.trim() ? v.trim() : fallback
}

function asBool(v: unknown, fallback: boolean): boolean {
  return typeof v === 'boolean' ? v : fallback
}

function asNum(v: unknown, fallback: number, min: number, max: number): number {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN
  if (!Number.isFinite(n)) return fallback
  return clamp(n, min, max)
}

function relativeLuminance(hexOrRgb: string): number | null {
  const s = hexOrRgb.trim()
  let r = 0
  let g = 0
  let b = 0
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(s)
  if (hex) {
    let h = hex[1]!
    if (h.length === 3) h = h.split('').map((c) => c + c).join('')
    r = parseInt(h.slice(0, 2), 16) / 255
    g = parseInt(h.slice(2, 4), 16) / 255
    b = parseInt(h.slice(4, 6), 16) / 255
  } else {
    const rgba = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i.exec(s)
    if (!rgba) return null
    r = Number(rgba[1]) / 255
    g = Number(rgba[2]) / 255
    b = Number(rgba[3]) / 255
  }
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

function contrastOk(fg: string, bg: string): boolean {
  const L1 = relativeLuminance(fg)
  const L2 = relativeLuminance(bg)
  if (L1 == null || L2 == null) return true
  const lighter = Math.max(L1, L2)
  const darker = Math.min(L1, L2)
  return (lighter + 0.05) / (darker + 0.05) >= 2.6
}

function ensureReadableText(text: string, bg: string): string {
  if (contrastOk(text, bg)) return text
  const L = relativeLuminance(bg)
  if (L == null) return text
  return L > 0.45 ? '#191919' : '#F5F5F5'
}

function asBtnSide(v: unknown, fallback: HeaderBtnSide): HeaderBtnSide {
  return v === 'left' || v === 'right' ? v : fallback
}

function asAvatarPlacement(v: unknown, fallback: HeaderAvatarPlacement): HeaderAvatarPlacement {
  return v === 'beside' || v === 'above' ? v : fallback
}

function sanitizeFreePos(raw: unknown, base: HeaderFreePos): HeaderFreePos {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  return {
    free: asBool(o.free, base.free),
    xPct: asNum(o.xPct, base.xPct, 0, 100),
    yPct: asNum(o.yPct, base.yPct, 0, 100),
  }
}

function sanitizeChromeItem(raw: unknown, base: HeaderChromeItemDraft): HeaderChromeItemDraft {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  return {
    sizePx: asNum(o.sizePx, base.sizePx, 28, 44),
    pos: sanitizeFreePos(o.pos, base.pos),
    // 图标由用户上传，AI 不覆盖 dataUrl
    iconDataUrl: base.iconDataUrl,
    iconSizePx: asNum(o.iconSizePx, base.iconSizePx, 14, 36),
    iconRadiusPx: asNum(o.iconRadiusPx, base.iconRadiusPx, 0, 24),
  }
}

function sanitizeHeaderBtn(raw: unknown, base: HeaderBtnDraft): HeaderBtnDraft {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  const chrome = sanitizeChromeItem(raw, base)
  return {
    ...chrome,
    side: asBtnSide(o.side, base.side),
  }
}

function sanitizeSide(
  raw: unknown,
  base: BubbleSideDraft,
  legacyAvatar?: {
    radiusPx?: number
    borderColor?: string
    borderWidth?: number
    showAvatar?: boolean
    avatarOnlyFirst?: boolean
  },
): BubbleSideDraft {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  const bg = asStr(o.bg, base.bg)
  const text = ensureReadableText(asStr(o.text, base.text), bg)
  let gradientMode = base.gradientMode
  if (o.gradientMode === 'off' || o.gradientMode === 'stops' || o.gradientMode === 'css') {
    gradientMode = o.gradientMode
  } else if ('useGradient' in o) {
    gradientMode = asBool(o.useGradient, false) && asStr(o.bgGradient, '').trim() ? 'css' : 'off'
  }
  return {
    bg,
    bgGradient: asStr(o.bgGradient, base.bgGradient),
    useGradient: gradientMode !== 'off',
    gradientMode,
    gradientAngleDeg: asNum(o.gradientAngleDeg, base.gradientAngleDeg, 0, 360),
    gradientStops: Array.isArray(o.gradientStops) ? (o.gradientStops as typeof base.gradientStops) : base.gradientStops,
    glassEnabled: asBool(o.glassEnabled, base.glassEnabled),
    glassBlurPx: asNum(o.glassBlurPx, base.glassBlurPx, 0, 40),
    glassSaturatePct: asNum(o.glassSaturatePct, base.glassSaturatePct, 100, 200),
    glassEdgeBlurPx: asNum(o.glassEdgeBlurPx, base.glassEdgeBlurPx, 0, 24),
    // 背景图由用户上传裁剪，AI 不覆盖
    bgImage: base.bgImage,
    bgImageBlurPx: asNum(o.bgImageBlurPx, base.bgImageBlurPx, 0, 24),
    text,
    fontSizePx: asNum(o.fontSizePx, base.fontSizePx, 12, 22),
    fontWeight: asNum(o.fontWeight, base.fontWeight, 300, 700),
    lineHeight: asNum(o.lineHeight, base.lineHeight, 1, 2),
    padT: asNum(o.padT, base.padT, 4, 28),
    padR: asNum(o.padR, base.padR, 4, 28),
    padB: asNum(o.padB, base.padB, 4, 28),
    padL: asNum(o.padL, base.padL, 4, 28),
    radius: asNum(
      o.radius ?? o.radiusSingle,
      base.radius,
      0,
      28,
    ),
    borderColor: asStr(o.borderColor, base.borderColor),
    borderWidth: asNum(o.borderWidth, base.borderWidth, 0, 4),
    shadow: asStr(o.shadow, base.shadow),
    shadowDraft: {
      ...base.shadowDraft,
      ...(o.shadowDraft && typeof o.shadowDraft === 'object'
        ? (o.shadowDraft as Partial<typeof base.shadowDraft>)
        : {}),
    },
    showTail: asBool(o.showTail, base.showTail),
    tailCluster:
      o.tailCluster === 'last' || o.tailCluster === 'every' || o.tailCluster === 'first'
        ? o.tailCluster
        : base.tailCluster,
    tailAnchor: o.tailAnchor === 'bottom' || o.tailAnchor === 'side' ? o.tailAnchor : base.tailAnchor,
    tailYMode: o.tailYMode === 'avatar' ? 'avatar' : 'pct',
    tailOffsetYPct: asNum(
      o.tailOffsetYPct ??
        (typeof (o.tailOffsetYPx ?? o.tailHeightPx) === 'number'
          ? Math.round((Number(o.tailOffsetYPx ?? o.tailHeightPx) / 50) * 100)
          : undefined),
      base.tailOffsetYPct,
      0,
      100,
    ),
    tailOffsetXPct: asNum(o.tailOffsetXPct, base.tailOffsetXPct, 0, 100),
    tailOffsetXPx: asNum(o.tailOffsetXPx, base.tailOffsetXPx, -40, 48),
    tailLengthPx: asNum(o.tailLengthPx, base.tailLengthPx, 4, 20),
    tailAngleDeg: asNum(o.tailAngleDeg, base.tailAngleDeg, 25, 100),
    tailRoundPx: asNum(o.tailRoundPx, base.tailRoundPx, 0, 8),
    tailTiltDeg: asNum(o.tailTiltDeg, base.tailTiltDeg, -60, 60),
    tailSurfaceMode: o.tailSurfaceMode === 'custom' ? 'custom' : 'follow',
    tailBg: asStr(o.tailBg, base.tailBg || base.bg),
    tailGradientMode:
      o.tailGradientMode === 'off' || o.tailGradientMode === 'stops' || o.tailGradientMode === 'css'
        ? o.tailGradientMode
        : base.tailGradientMode ?? 'off',
    tailGradientAngleDeg: asNum(o.tailGradientAngleDeg, base.tailGradientAngleDeg ?? 135, 0, 360),
    tailGradientStops: Array.isArray(o.tailGradientStops)
      ? (o.tailGradientStops as typeof base.tailGradientStops)
      : (base.tailGradientStops ?? base.gradientStops),
    tailBgGradient: asStr(o.tailBgGradient, base.tailBgGradient ?? ''),
    tailGlassEnabled: asBool(o.tailGlassEnabled, base.tailGlassEnabled === true),
    tailGlassBlurPx: asNum(o.tailGlassBlurPx, base.tailGlassBlurPx ?? 16, 0, 40),
    tailGlassSaturatePct: asNum(o.tailGlassSaturatePct, base.tailGlassSaturatePct ?? 140, 100, 200),
    maxWidthPct: asNum(o.maxWidthPct, base.maxWidthPct, 40, 90),
    minWidthPx: asNum(o.minWidthPx, base.minWidthPx, 0, 120),
    // 字体由用户上传，AI 不覆盖
    font: base.font,
    // 贴纸 / 气泡框 / 头像贴纸由用户上传，AI 不覆盖
    edgeStickers: base.edgeStickers ?? [],
    frame: base.frame ?? null,
    avatarStickers: base.avatarStickers ?? [],
    badge: {
      ...base.badge,
      ...(o.badge && typeof o.badge === 'object' ? (o.badge as Partial<typeof base.badge>) : {}),
      // 字体由用户上传，AI 不覆盖
      font: base.badge.font,
    },
    showAvatar: asBool(o.showAvatar, legacyAvatar?.showAvatar ?? base.showAvatar),
    avatarCluster:
      o.avatarCluster === 'every' || o.avatarCluster === 'first' || o.avatarCluster === 'last'
        ? o.avatarCluster
        : typeof o.avatarOnlyFirst === 'boolean'
          ? o.avatarOnlyFirst
            ? 'first'
            : 'every'
          : typeof o.avatarOnlyLast === 'boolean' && o.avatarOnlyLast
            ? 'last'
            : legacyAvatar?.avatarOnlyFirst === false
              ? 'every'
              : legacyAvatar?.avatarOnlyFirst === true
                ? 'first'
                : base.avatarCluster,
    avatarRadiusPx: asNum(
      o.avatarRadiusPx,
      legacyAvatar?.radiusPx ?? base.avatarRadiusPx,
      0,
      24,
    ),
    avatarBorderColor: asStr(
      o.avatarBorderColor,
      legacyAvatar?.borderColor ?? base.avatarBorderColor,
    ),
    avatarBorderWidth: asNum(
      o.avatarBorderWidth,
      legacyAvatar?.borderWidth ?? base.avatarBorderWidth,
      0,
      4,
    ),
    avatarEdgeInsetPx: asNum(o.avatarEdgeInsetPx ?? o.avatarInsetPx, base.avatarEdgeInsetPx, 0, 48),
    avatarSizePx: asNum(o.avatarSizePx, base.avatarSizePx, 24, 72),
    avatarPlaceholderColor:
      typeof o.avatarPlaceholderColor === 'string' && o.avatarPlaceholderColor.trim()
        ? o.avatarPlaceholderColor.trim()
        : base.avatarPlaceholderColor,
    avatarRotateDeg: asNum(o.avatarRotateDeg, base.avatarRotateDeg, -45, 45),
    avatarBubbleYPct: asNum(o.avatarBubbleYPct, base.avatarBubbleYPct, 0, 100),
  }
}

function sanitizeSpecial(raw: unknown, base: SpecialCardDraft): SpecialCardDraft {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  const bg = asStr(o.bg, base.bg)
  return {
    followBubble: asBool(o.followBubble, base.followBubble),
    bg,
    borderColor: asStr(o.borderColor, base.borderColor),
    borderWidth: asNum(o.borderWidth, base.borderWidth, 0, 3),
    radius: asNum(o.radius, base.radius, 0, 24),
    shadow: asStr(o.shadow, base.shadow),
    accent: asStr(o.accent, base.accent),
    titleColor: ensureReadableText(asStr(o.titleColor, base.titleColor), bg),
    mutedColor: asStr(o.mutedColor, base.mutedColor),
    amountColor: asStr(o.amountColor, base.amountColor),
  }
}

/** 去除围栏并解析 JSON */
export function parseLookWorkshopAiJson(raw: string): unknown {
  let text = String(raw ?? '').trim()
  if (!text) throw new Error('模型返回为空')
  text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start < 0 || end <= start) throw new Error('未找到 JSON 对象')
  text = text.slice(start, end + 1)
  return JSON.parse(text) as unknown
}

export function sanitizeLookWorkshopAiResult(raw: unknown): LookWorkshopAiResult {
  const base = createDefaultLookWorkshopDraft()
  const root = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  const themeRaw =
    root.theme && typeof root.theme === 'object'
      ? (root.theme as Record<string, unknown>)
      : root

  const specials =
    themeRaw.specialCards && typeof themeRaw.specialCards === 'object'
      ? (themeRaw.specialCards as Record<string, unknown>)
      : themeRaw

  const otherSrc = themeRaw.other ?? themeRaw.bubbleChar ?? themeRaw.char
  const selfSrc = themeRaw.self ?? themeRaw.bubbleUser ?? themeRaw.user
  const headerSrc = themeRaw.header
  const inputSrc = themeRaw.input ?? themeRaw.inputBar
  const tsSrc = themeRaw.timestamp
  const advSrc = themeRaw.advanced

  const legacyAvatar = {
    radiusPx: asNum(themeRaw.avatarRadiusPx, base.other.avatarRadiusPx, 0, 24),
    borderColor: asStr(themeRaw.avatarBorderColor, base.other.avatarBorderColor),
    borderWidth: asNum(themeRaw.avatarBorderWidth, base.other.avatarBorderWidth, 0, 4),
    showAvatar: asBool(themeRaw.showAvatar, base.other.showAvatar),
    avatarOnlyFirst: asBool(themeRaw.avatarOnlyFirst, base.other.avatarCluster === 'first'),
  }
  const other = sanitizeSide(otherSrc, base.other, legacyAvatar)
  const self = sanitizeSide(selfSrc, base.self, legacyAvatar)

  const headerObj = headerSrc && typeof headerSrc === 'object' ? (headerSrc as Record<string, unknown>) : {}
  const inputObj = inputSrc && typeof inputSrc === 'object' ? (inputSrc as Record<string, unknown>) : {}
  const tsObj = tsSrc && typeof tsSrc === 'object' ? (tsSrc as Record<string, unknown>) : {}
  const advObj = advSrc && typeof advSrc === 'object' ? (advSrc as Record<string, unknown>) : {}

  const headerBg = asStr(headerObj.bg, base.header.bg)
  const inputShellBg = asStr(inputObj.shellBg, base.input.shellBg)

  const draft: LookWorkshopDraft = {
    ...base,
    version: 1,
    meta: {
      ...base.meta,
      name: asStr(root.styleName, base.meta.name).slice(0, 40),
      description: asStr(root.designNote, base.meta.description).slice(0, 200),
    },
    gapSameSpeakerPx: asNum(themeRaw.gapSameSpeakerPx, base.gapSameSpeakerPx, 0, 20),
    gapDifferentSpeakerPx: asNum(themeRaw.gapDifferentSpeakerPx, base.gapDifferentSpeakerPx, 4, 28),
    msgAreaPadX: asNum(themeRaw.msgAreaPadX, base.msgAreaPadX, 0, 16),
    msgAreaPadY: asNum(themeRaw.msgAreaPadY, base.msgAreaPadY, 0, 24),
    other,
    self,
    voice: sanitizeSpecial(specials.voice ?? themeRaw.voice, base.voice),
    transfer: sanitizeSpecial(specials.transfer ?? themeRaw.transfer, base.transfer),
    redPacket: sanitizeSpecial(
      specials.redPacket ?? specials.redpacket ?? themeRaw.redPacket,
      base.redPacket,
    ),
    location: sanitizeSpecial(specials.location ?? themeRaw.location, base.location),
    voiceCall: sanitizeSpecial(
      specials.voiceCall ?? specials.call ?? themeRaw.voiceCall,
      base.voiceCall,
    ),
    favorite: sanitizeSpecial(specials.favorite ?? themeRaw.favorite, base.favorite),
    listenTogether: sanitizeSpecial(
      specials.listenTogether ?? themeRaw.listenTogether,
      base.listenTogether,
    ),
    header: {
      heightPx: asNum(headerObj.heightPx, base.header.heightPx, 36, 120),
      bg: headerBg,
      // 背景图由用户上传裁剪，AI 不覆盖；模式可改
      bgMode: headerObj.bgMode === 'image' || headerObj.bgMode === 'color' ? headerObj.bgMode : base.header.bgMode,
      bgImage: base.header.bgImage,
      bgImageBlurPx: asNum(headerObj.bgImageBlurPx, base.header.bgImageBlurPx, 0, 24),
      bgOverlayColor: asStr(headerObj.bgOverlayColor, base.header.bgOverlayColor),
      bgOverlayOpacity: asNum(headerObj.bgOverlayOpacity, base.header.bgOverlayOpacity, 0, 100),
      useBlur: asBool(headerObj.useBlur, base.header.useBlur),
      blurPx: asNum(headerObj.blurPx, base.header.blurPx, 0, 40),
      textColor: ensureReadableText(asStr(headerObj.textColor, base.header.textColor), headerBg),
      mutedColor: asStr(headerObj.mutedColor, base.header.mutedColor),
      borderColor: asStr(headerObj.borderColor, base.header.borderColor),
      showSubtitle: asBool(headerObj.showSubtitle, base.header.showSubtitle),
      subtitleText: asStr(headerObj.subtitleText, base.header.subtitleText).slice(0, 40),
      titleSizePx: asNum(headerObj.titleSizePx, base.header.titleSizePx, 12, 20),
      titleWeight: asNum(headerObj.titleWeight, base.header.titleWeight, 400, 700),
      // 字体由用户上传，AI 不覆盖
      titleFont: base.header.titleFont,
      subtitleFont: base.header.subtitleFont,
      showTitleAvatar: asBool(headerObj.showTitleAvatar, base.header.showTitleAvatar),
      titleAvatarSizePx: asNum(
        headerObj.titleAvatarSizePx,
        base.header.titleAvatarSizePx,
        20,
        48,
      ),
      titleAvatarRadiusPx: asNum(
        headerObj.titleAvatarRadiusPx,
        base.header.titleAvatarRadiusPx,
        0,
        24,
      ),
      titleAvatarPlacement: asAvatarPlacement(
        headerObj.titleAvatarPlacement,
        base.header.titleAvatarPlacement,
      ),
      btnColor: asStr(headerObj.btnColor, base.header.btnColor),
      backBtn: sanitizeChromeItem(headerObj.backBtn, base.header.backBtn),
      moreBtn: sanitizeChromeItem(headerObj.moreBtn, base.header.moreBtn),
      timeBtn: sanitizeHeaderBtn(headerObj.timeBtn, base.header.timeBtn),
      psycheBtn: sanitizeHeaderBtn(headerObj.psycheBtn, base.header.psycheBtn),
      titleAvatarPos: sanitizeFreePos(headerObj.titleAvatarPos, base.header.titleAvatarPos),
      titlePos: sanitizeFreePos(headerObj.titlePos, base.header.titlePos),
      subtitlePos: sanitizeFreePos(headerObj.subtitlePos, base.header.subtitlePos),
    },
    input: {
      barBg: asStr(inputObj.barBg, base.input.barBg),
      // 背景图由用户上传裁剪，AI 不覆盖
      barBgImage: base.input.barBgImage,
      barBgImageBlurPx: asNum(inputObj.barBgImageBlurPx, base.input.barBgImageBlurPx, 0, 24),
      barBgOverlayColor: asStr(inputObj.barBgOverlayColor, base.input.barBgOverlayColor),
      barBgOverlayOpacity: asNum(
        inputObj.barBgOverlayOpacity,
        base.input.barBgOverlayOpacity,
        0,
        100,
      ),
      barBorder: asStr(inputObj.barBorder, base.input.barBorder),
      useBlur: asBool(inputObj.useBlur, base.input.useBlur),
      blurPx: asNum(inputObj.blurPx, base.input.blurPx, 0, 40),
      shellBg: inputShellBg,
      shellBorder: asStr(inputObj.shellBorder, base.input.shellBorder),
      shellRadius: asNum(inputObj.shellRadius, base.input.shellRadius, 0, 28),
      textColor: ensureReadableText(asStr(inputObj.textColor, base.input.textColor), inputShellBg),
      placeholderColor: asStr(inputObj.placeholderColor, base.input.placeholderColor),
      btnColor: asStr(inputObj.btnColor, base.input.btnColor),
      padY: asNum(inputObj.padY, base.input.padY, 4, 16),
      btnIconSyncStyle: asBool(inputObj.btnIconSyncStyle, base.input.btnIconSyncStyle),
      // 图标由用户上传，AI 不覆盖
      btnIcons: { ...base.input.btnIcons },
    },
    timestamp: {
      bg: asStr(tsObj.bg, base.timestamp.bg),
      textColor: asStr(tsObj.textColor, base.timestamp.textColor),
      radius: asNum(tsObj.radius, base.timestamp.radius, 0, 20),
      padX: asNum(tsObj.padX, base.timestamp.padX, 4, 20),
      padY: asNum(tsObj.padY, base.timestamp.padY, 2, 12),
      // 字体由用户上传，AI 不覆盖
      font: base.timestamp.font,
    },
    advanced: {
      roomBg: asStr(advObj.roomBg, base.advanced.roomBg),
      // 背景图由用户上传，AI 不覆盖
      roomBgImage: base.advanced.roomBgImage,
      globalBlurPx: asNum(advObj.globalBlurPx, base.advanced.globalBlurPx, 0, 28),
      shadowStrength: asNum(advObj.shadowStrength, base.advanced.shadowStrength, 0, 2),
    },
  }

  return {
    styleName: draft.meta.name,
    designNote: asStr(root.designNote, draft.meta.description),
    draft,
  }
}

export type GenerateLookWorkshopThemeArgs = {
  userText: string
  /** 增量微调时带上当前草稿摘要 */
  currentDraft?: LookWorkshopDraft | null
  /** 必填：主接口 / 副接口 / 自定义，由助手 API 设置解析 */
  apiConfig: ApiConfig
  signal?: AbortSignal
}

export async function generateLookWorkshopTheme(
  args: GenerateLookWorkshopThemeArgs,
): Promise<LookWorkshopAiResult> {
  const prompt = args.userText.trim()
  if (!prompt) throw new Error('请先描述你想要的风格')

  const cfg = args.apiConfig
  if (!cfg?.apiUrl?.trim() || !cfg?.apiKey?.trim() || !cfg?.modelId?.trim()) {
    throw new Error('请先在「助手 API 设置」中选择可用接口，并确保 URL / Key / 模型已就绪')
  }

  const system = buildLookWorkshopAiSystemPrompt()
  const userParts = [
    '【用户风格描述】',
    prompt,
    '',
    '请只输出完整 JSON（含 styleName、designNote、theme）。',
  ]
  if (args.currentDraft) {
    userParts.push(
      '',
      '【当前已有主题（在此基础上微调，保留合理部分，不要完全推倒）】',
      JSON.stringify({
        other: args.currentDraft.other,
        self: args.currentDraft.self,
        header: args.currentDraft.header,
        input: args.currentDraft.input,
        advanced: args.currentDraft.advanced,
      }),
    )
  }
  const user = userParts.join('\n')

  const raw = await openAiCompatibleChat(
    cfg,
    [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    { temperature: 0.68, max_tokens: 7000, signal: args.signal },
  )

  try {
    const parsed = parseLookWorkshopAiJson(raw)
    return sanitizeLookWorkshopAiResult(parsed)
  } catch {
    throw new Error('这次没听懂，换个说法再试试？')
  }
}
