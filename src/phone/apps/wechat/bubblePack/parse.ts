import type { ChatThemePatch } from '../ChatThemeContext'
import type { WeChatBubblePreset } from '../wechatBubblePresets'
import {
  normalizeWeChatAvatarChrome,
  type WeChatAvatarChrome,
} from '../wechatAvatarChrome'
import { normalizeBubbleEdgeStickers } from '../bubbleEdgeStickers'
import { normalizeBubbleFrames } from '../bubbleFrame'
import { normalizeAvatarStickers } from '../avatarStickers'
import { normalizeBubbleBadges } from '../bubbleBadge'
import type { WeChatBubbleTheme, WeChatChatRoomBg } from '../../../types'
import {
  LUMI_BUBBLE_PACK_FORMAT,
  LUMI_BUBBLE_PACK_SKIN_VAR_PREFIXES,
  LUMI_BUBBLE_PACK_VERSION,
  LUMI_BUBBLE_PACK_VERSION_MIN,
  normalizeLumiBubblePackSkinEngine,
  type LumiBubblePackEmbeddedAsset,
  type LumiBubblePackMeta,
  type LumiWeChatBubblePack,
} from './types'

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v)
}

function pickStr(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v.trim() : fallback
}

function pickBool(v: unknown, fallback: boolean): boolean {
  return typeof v === 'boolean' ? v : fallback
}

function pickNum(v: unknown, fallback: number, min: number, max: number): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) return fallback
  return Math.max(min, Math.min(max, Math.round(v)))
}

function isAllowedSkinVar(key: string): boolean {
  return LUMI_BUBBLE_PACK_SKIN_VAR_PREFIXES.some((p) => key.startsWith(p))
}

const DEFAULT_SOLID_CHAT_BG = '#EDEDED'

function looksLikeCssColor(s: string): boolean {
  const t = s.trim()
  if (!t) return false
  if (/^#([0-9a-f]{3,8})$/i.test(t)) return true
  if (/^(rgb|rgba|hsl|hsla)\(/i.test(t)) return true
  if (/^(transparent|white|black|ivory|beige|whitesmoke|snow)$/i.test(t)) return true
  return false
}

function looksLikeCssGradient(s: string): boolean {
  return /^(linear|radial|conic)-gradient\(/i.test(s.trim())
}

/**
 * 兼容模型常见写法：solid / image / gradient（含 colorStart/colorEnd、stops、css）。
 * 自由度优先：能纠正则纠正，尽量不拒收整包。
 */
function normalizeChatRoomBg(raw: unknown): WeChatChatRoomBg {
  if (typeof raw === 'string') {
    const t = raw.trim()
    if (looksLikeCssGradient(t)) {
      return { mode: 'gradient', css: t, fallbackColor: DEFAULT_SOLID_CHAT_BG }
    }
    if (looksLikeCssColor(t)) return { mode: 'solid', color: t }
    throw new Error('preset.chatRoomDefaultBg 无效')
  }
  if (!isPlainObject(raw)) {
    throw new Error('preset.chatRoomDefaultBg 无效')
  }

  const modeRaw = pickStr(raw.mode).toLowerCase()
  const color =
    pickStr(raw.color) ||
    pickStr(raw.fallbackColor) ||
    pickStr(raw.colorStart) ||
    pickStr(raw.startColor) ||
    pickStr(raw.bg) ||
    pickStr(raw.background) ||
    pickStr(raw.backgroundColor)
  const imageUrl =
    pickStr(raw.imageUrl) ||
    pickStr(raw.url) ||
    pickStr(raw.src) ||
    pickStr(raw.wallpaper)
  const cssRaw = pickStr(raw.css) || (looksLikeCssGradient(pickStr(raw.background)) ? pickStr(raw.background) : '')
  const colorStart = pickStr(raw.colorStart) || pickStr(raw.startColor)
  const colorEnd = pickStr(raw.colorEnd) || pickStr(raw.endColor)
  const stops = Array.isArray(raw.stops)
    ? raw.stops.map((s) => String(s ?? '').trim()).filter(Boolean)
    : []
  const angle =
    typeof raw.angle === 'number' && Number.isFinite(raw.angle) ? Math.round(raw.angle) : undefined
  const gradientType = pickStr(raw.gradientType).toLowerCase() === 'radial' ? 'radial' : 'linear'

  const asGradient = (): WeChatChatRoomBg => {
    const out: WeChatChatRoomBg = {
      mode: 'gradient',
      gradientType,
      fallbackColor: color || colorStart || DEFAULT_SOLID_CHAT_BG,
    }
    if (angle != null) out.angle = angle
    if (cssRaw) out.css = cssRaw
    if (stops.length) out.stops = stops
    if (colorStart) out.colorStart = colorStart
    if (colorEnd) out.colorEnd = colorEnd
    // 只有起止色时也合法
    if (!out.css && !out.stops?.length && colorStart && colorEnd) {
      out.colorStart = colorStart
      out.colorEnd = colorEnd
    }
    if (!out.css && !out.stops?.length && !out.colorStart) {
      // 无任何色标 → 退纯色
      return { mode: 'solid', color: out.fallbackColor || DEFAULT_SOLID_CHAT_BG }
    }
    return out
  }

  // 明确 image 且有地址
  if ((modeRaw === 'image' || modeRaw === 'wallpaper' || modeRaw === 'photo') && imageUrl) {
    return {
      mode: 'image',
      imageUrl,
      fallbackColor: color || DEFAULT_SOLID_CHAT_BG,
    }
  }

  // 写了 image 但没图 → 若有渐变信息则渐变，否则纯色
  if (modeRaw === 'image' || modeRaw === 'wallpaper' || modeRaw === 'photo') {
    if (cssRaw || stops.length >= 2 || (colorStart && colorEnd)) return asGradient()
    return { mode: 'solid', color: color || DEFAULT_SOLID_CHAT_BG }
  }

  if (
    modeRaw === 'gradient' ||
    modeRaw === '渐变' ||
    cssRaw ||
    stops.length >= 2 ||
    (colorStart && colorEnd && (modeRaw === 'gradient' || modeRaw === '' || modeRaw === '渐变'))
  ) {
    // 显式 gradient，或带齐双色/css
    if (modeRaw === 'gradient' || modeRaw === '渐变' || cssRaw || stops.length >= 2 || (colorStart && colorEnd)) {
      return asGradient()
    }
  }

  // solid / color / 缺 mode 但有色
  if (
    modeRaw === 'solid' ||
    modeRaw === 'color' ||
    modeRaw === '纯色' ||
    !modeRaw
  ) {
    if (color && looksLikeCssColor(color)) return { mode: 'solid', color }
    if (imageUrl) {
      return {
        mode: 'image',
        imageUrl,
        fallbackColor: DEFAULT_SOLID_CHAT_BG,
      }
    }
    return { mode: 'solid', color: DEFAULT_SOLID_CHAT_BG }
  }

  // 未知 mode：有渐变线索优先；有色 solid；有图 image
  if (cssRaw || stops.length >= 2 || (colorStart && colorEnd)) return asGradient()
  if (color && looksLikeCssColor(color)) return { mode: 'solid', color }
  if (imageUrl) {
    return { mode: 'image', imageUrl, fallbackColor: DEFAULT_SOLID_CHAT_BG }
  }
  return { mode: 'solid', color: DEFAULT_SOLID_CHAT_BG }
}

function normalizeBubble(raw: unknown): WeChatBubbleTheme {
  if (!isPlainObject(raw)) throw new Error('preset.bubble 无效')
  const tail = raw.bubbleTailStyle
  const bubbleTailStyle =
    tail === 'wechat' || tail === 'imessage' || tail === 'telegram' || tail === 'talkmaker'
      ? tail
      : undefined
  const messengerRaw = raw.messengerBubbleStyle
  const messengerBubbleStyle =
    messengerRaw === 'lumi' ||
    messengerRaw === 'wechat' ||
    messengerRaw === 'imessage' ||
    messengerRaw === 'telegram' ||
    messengerRaw === 'talkmaker'
      ? messengerRaw
      : undefined
  const showBubbleTail = pickBool(raw.showBubbleTail, !!bubbleTailStyle)
  const pickCluster = (v: unknown): 'every' | 'first' | 'last' | undefined =>
    v === 'every' || v === 'first' || v === 'last' ? v : undefined
  const avatarClusterOther = pickCluster(raw.avatarClusterOther)
  const avatarClusterSelf = pickCluster(raw.avatarClusterSelf)
  const bubble: WeChatBubbleTheme = {
    selfBubbleBg: pickStr(raw.selfBubbleBg, '#95EC69') || '#95EC69',
    otherBubbleBg: pickStr(raw.otherBubbleBg, '#FFFFFF') || '#FFFFFF',
    selfBubbleRadiusPx: pickNum(raw.selfBubbleRadiusPx, 12, 4, 28),
    otherBubbleRadiusPx: pickNum(raw.otherBubbleRadiusPx, 12, 4, 28),
    showAvatar: pickBool(raw.showAvatar, true),
    avatarRadiusPx: pickNum(raw.avatarRadiusPx, 8, 0, 18),
    showBubbleTail,
    mergeConsecutiveAvatarGroup: pickBool(raw.mergeConsecutiveAvatarGroup, false),
  }
  if (typeof raw.showAvatarOther === 'boolean') bubble.showAvatarOther = raw.showAvatarOther
  if (typeof raw.showAvatarSelf === 'boolean') bubble.showAvatarSelf = raw.showAvatarSelf
  if (avatarClusterOther) bubble.avatarClusterOther = avatarClusterOther
  if (avatarClusterSelf) bubble.avatarClusterSelf = avatarClusterSelf
  if (bubbleTailStyle) bubble.bubbleTailStyle = bubbleTailStyle
  if (messengerBubbleStyle) bubble.messengerBubbleStyle = messengerBubbleStyle
  return bubble
}

function normalizeChatThemePatch(raw: unknown): ChatThemePatch | undefined {
  if (raw == null) return undefined
  if (!isPlainObject(raw)) throw new Error('preset.chatThemePatch 无效')
  const ibRaw = raw.inputBar
  if (ibRaw == null) return {}
  if (!isPlainObject(ibRaw)) throw new Error('preset.chatThemePatch.inputBar 无效')
  const layout =
    ibRaw.layout === 'lumi' ||
    ibRaw.layout === 'wechat' ||
    ibRaw.layout === 'imessage' ||
    ibRaw.layout === 'telegram' ||
    ibRaw.layout === 'talkmaker' ||
    ibRaw.layout === 'twitter'
      ? ibRaw.layout
      : undefined
  const inputBar: NonNullable<ChatThemePatch['inputBar']> = {}
  if (typeof ibRaw.borderRadius === 'number') inputBar.borderRadius = pickNum(ibRaw.borderRadius, 16, 0, 999)
  if (typeof ibRaw.borderColor === 'string') inputBar.borderColor = ibRaw.borderColor
  if (typeof ibRaw.buttonSize === 'number') inputBar.buttonSize = pickNum(ibRaw.buttonSize, 20, 12, 36)
  if (typeof ibRaw.buttonColor === 'string') inputBar.buttonColor = ibRaw.buttonColor
  if (typeof ibRaw.backgroundColor === 'string') inputBar.backgroundColor = ibRaw.backgroundColor
  if (layout) inputBar.layout = layout
  if (typeof ibRaw.sendButtonColor === 'string' && ibRaw.sendButtonColor.trim()) {
    inputBar.sendButtonColor = ibRaw.sendButtonColor.trim()
  }
  return { inputBar }
}

function normalizeWechatThemePatch(
  raw: unknown,
): WeChatBubblePreset['wechatThemePatch'] | undefined {
  if (raw == null) return undefined
  if (!isPlainObject(raw)) throw new Error('preset.wechatThemePatch 无效')
  const patch: NonNullable<WeChatBubblePreset['wechatThemePatch']> = {}
  if (raw.chatRoomDefaultBg != null) {
    patch.chatRoomDefaultBg = normalizeChatRoomBg(raw.chatRoomDefaultBg)
  }
  if (typeof raw.chatInputBg === 'string') patch.chatInputBg = raw.chatInputBg
  if (typeof raw.chatInputBorder === 'string') patch.chatInputBorder = raw.chatInputBorder
  return patch
}

function normalizeMeta(raw: unknown): LumiBubblePackMeta {
  if (!isPlainObject(raw)) throw new Error('meta 无效')
  const id = pickStr(raw.id)
  const name = pickStr(raw.name)
  if (!id) throw new Error('meta.id 不能为空')
  if (!name) throw new Error('meta.name 不能为空')
  const description = pickStr(raw.description, name) || name
  const author = pickStr(raw.author) || undefined
  return author ? { id, name, description, author } : { id, name, description }
}

function normalizePreset(raw: unknown): WeChatBubblePreset {
  if (!isPlainObject(raw)) throw new Error('preset 无效')
  const id = pickStr(raw.id)
  const name = pickStr(raw.name)
  if (!id) throw new Error('preset.id 不能为空')
  if (!name) throw new Error('preset.name 不能为空')
  const bubble = normalizeBubble(raw.bubble)
  const chatRoomDefaultBg = normalizeChatRoomBg(raw.chatRoomDefaultBg)
  const preset: WeChatBubblePreset = {
    id,
    name,
    description: pickStr(raw.description, name) || name,
    bubble,
    selfBubbleText: pickStr(raw.selfBubbleText, '#191919') || '#191919',
    otherBubbleText: pickStr(raw.otherBubbleText, '#191919') || '#191919',
    chatRoomDefaultBg,
  }
  const wechatThemePatch = normalizeWechatThemePatch(raw.wechatThemePatch)
  if (wechatThemePatch && Object.keys(wechatThemePatch).length) {
    preset.wechatThemePatch = wechatThemePatch
  }
  const chatThemePatch = normalizeChatThemePatch(raw.chatThemePatch)
  if (chatThemePatch && Object.keys(chatThemePatch).length) {
    preset.chatThemePatch = chatThemePatch
  }
  return preset
}

function normalizeSkinOverrides(raw: unknown): Record<string, string> | undefined {
  if (raw == null) return undefined
  if (!isPlainObject(raw)) throw new Error('skinOverrides 须为对象')
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(raw)) {
    const key = k.trim()
    if (!key) continue
    if (!isAllowedSkinVar(key)) {
      throw new Error(`不允许的 skinOverrides 键：${key}（仅 --wx-chat-* / --wx-special-*）`)
    }
    if (typeof v !== 'string' || !v.trim()) {
      throw new Error(`skinOverrides.${key} 须为非空字符串`)
    }
    out[key] = v.trim()
  }
  return Object.keys(out).length ? out : undefined
}

function normalizeScopedCss(raw: unknown): string | undefined {
  if (raw == null) return undefined
  if (typeof raw !== 'string') throw new Error('scopedCss 须为字符串')
  const css = raw.trim()
  if (!css) return undefined
  if (/(^|})\s*(html|body|:root)\b/i.test(css) || /@import\b/i.test(css)) {
    throw new Error('scopedCss 禁止使用 html/body/:root 或 @import')
  }
  return css
}

function normalizeAvatarChrome(raw: unknown): WeChatAvatarChrome | undefined {
  if (raw == null) return undefined
  return normalizeWeChatAvatarChrome(raw)
}

function normalizeAssets(raw: unknown): Record<string, LumiBubblePackEmbeddedAsset> | undefined {
  if (raw == null) return undefined
  if (!isPlainObject(raw)) throw new Error('assets 须为对象')
  const out: Record<string, LumiBubblePackEmbeddedAsset> = {}
  for (const [k, v] of Object.entries(raw)) {
    const id = k.trim()
    if (!id) continue
    if (!isPlainObject(v)) throw new Error(`assets.${id} 无效`)
    const dataUrl = pickStr(v.dataUrl)
    if (!dataUrl || !/^data:/i.test(dataUrl)) {
      throw new Error(`assets.${id}.dataUrl 须为 data URL`)
    }
    if (dataUrl.length > 2_500_000) {
      throw new Error(`assets.${id} 过大（请压缩后重试）`)
    }
    out[id] = {
      mime: pickStr(v.mime, 'image/png') || 'image/png',
      dataUrl,
      ...(pickStr(v.name) ? { name: pickStr(v.name) } : {}),
    }
  }
  return Object.keys(out).length ? out : undefined
}

/** 去掉 AI 可能包的 markdown 围栏；优先取第一个 ```json / ```css / ``` 块 */
export function stripBubblePackFence(raw: string): string {
  let t = String(raw ?? '').trim()
  const fenced = /```(?:json|css|lumiBubblePack)?\s*([\s\S]*?)```/i.exec(t)
  if (fenced?.[1]) return fenced[1].trim()
  t = t.replace(/^```(?:json|css|lumiBubblePack)?\s*/i, '').replace(/\s*```$/i, '').trim()
  return t
}

/** 从混杂文本里抽出最外层 JSON 对象（模型常在前后加说明） */
export function extractBubblePackJsonText(raw: string): string | null {
  const t = String(raw ?? '')
  const start = t.indexOf('{')
  if (start < 0) return null
  let depth = 0
  let inStr = false
  let esc = false
  for (let i = start; i < t.length; i++) {
    const ch = t[i]!
    if (inStr) {
      if (esc) {
        esc = false
        continue
      }
      if (ch === '\\') {
        esc = true
        continue
      }
      if (ch === '"') inStr = false
      continue
    }
    if (ch === '"') {
      inStr = true
      continue
    }
    if (ch === '{') depth++
    else if (ch === '}') {
      depth--
      if (depth === 0) return t.slice(start, i + 1)
    }
  }
  return null
}

/** 像纯 scopedCss（糯叽机式），而非气泡包 JSON */
export function looksLikeBubbleScopedCss(text: string): boolean {
  const t = String(text ?? '').trim()
  if (!t || t.length < 12) return false
  if (/^\s*\{/.test(t) && /"format"\s*:/.test(t)) return false
  if (/^\s*\{/.test(t) && /"preset"\s*:/.test(t)) return false
  const hasRule = /\{[^}]*\}/.test(t)
  if (!hasRule) return false
  if (/\[data-wx-/.test(t)) return true
  if (/backdrop-filter\s*:/i.test(t)) return true
  if (/\/\*[\s\S]*?\*\//.test(t) && /[{;]/.test(t)) return true
  // 常见选择器开头 + 声明块
  if (/^\s*(\/\*|@media|[.#\[]|[a-z][\w-]*)/i.test(t) && /:\s*[^;]+;/.test(t)) return true
  return false
}

/** 把纯 CSS 收成 skinEngine=css 的气泡包（可直接植入预览 / 上传） */
export function bubblePackFromScopedCssOnly(
  cssRaw: string,
  meta?: Partial<LumiBubblePackMeta>,
): LumiWeChatBubblePack {
  const css = normalizeScopedCss(cssRaw)
  if (!css) throw new Error('CSS 内容为空')
  const id =
    pickStr(meta?.id) ||
    `css-skin-${Date.now().toString(36)}`
  const name = pickStr(meta?.name) || 'CSS 气泡皮肤'
  return {
    format: LUMI_BUBBLE_PACK_FORMAT,
    version: LUMI_BUBBLE_PACK_VERSION,
    meta: {
      id,
      name,
      description: pickStr(meta?.description) || '由纯 CSS 导入（skinEngine: css）',
      ...(pickStr(meta?.author) ? { author: pickStr(meta?.author) } : {}),
    },
    preset: {
      id,
      name,
      description: 'CSS 皮肤：视觉写在 scopedCss',
      bubble: {
        otherBubbleBg: 'transparent',
        selfBubbleBg: 'transparent',
        otherBubbleRadiusPx: 12,
        selfBubbleRadiusPx: 12,
        showAvatar: true,
        avatarRadiusPx: 8,
        // css 引擎会清空尾巴差异；勿写 bubbleTailStyle:'wechat' 污染微信 App 预设语义
        showBubbleTail: false,
        messengerBubbleStyle: 'lumi',
        mergeConsecutiveAvatarGroup: false,
      },
      selfBubbleText: '#191919',
      otherBubbleText: '#191919',
      chatRoomDefaultBg: { mode: 'solid', color: '#EDEDED' },
    },
    skinEngine: 'css',
    scopedCss: css,
  }
}

function parseBubblePackObject(data: Record<string, unknown>): LumiWeChatBubblePack {
  if (data.format !== LUMI_BUBBLE_PACK_FORMAT) {
    throw new Error(`不支持的气泡包格式（期望 ${LUMI_BUBBLE_PACK_FORMAT}）`)
  }
  const version = typeof data.version === 'number' ? data.version : Number(data.version)
  if (
    !Number.isFinite(version) ||
    version < LUMI_BUBBLE_PACK_VERSION_MIN ||
    version > LUMI_BUBBLE_PACK_VERSION
  ) {
    throw new Error(
      `不支持的气泡包版本（期望 ${LUMI_BUBBLE_PACK_VERSION_MIN}–${LUMI_BUBBLE_PACK_VERSION}）`,
    )
  }

  const pack: LumiWeChatBubblePack = {
    format: LUMI_BUBBLE_PACK_FORMAT,
    version: Math.floor(version),
    meta: normalizeMeta(data.meta),
    preset: normalizePreset(data.preset),
  }

  const skinOverrides = normalizeSkinOverrides(data.skinOverrides)
  if (skinOverrides) pack.skinOverrides = skinOverrides
  const scopedCss = normalizeScopedCss(data.scopedCss)
  if (scopedCss) pack.scopedCss = scopedCss
  const skinEngine = normalizeLumiBubblePackSkinEngine(data.skinEngine)
  if (skinEngine) pack.skinEngine = skinEngine
  const avatarChrome = normalizeAvatarChrome(data.avatarChrome)
  if (avatarChrome) pack.avatarChrome = avatarChrome
  const assets = normalizeAssets(data.assets)
  if (assets) pack.assets = assets
  const bubbleEdgeStickers = normalizeBubbleEdgeStickers(data.bubbleEdgeStickers)
  if (bubbleEdgeStickers.self.length || bubbleEdgeStickers.other.length) {
    pack.bubbleEdgeStickers = bubbleEdgeStickers
  }
  const bubbleFrames = normalizeBubbleFrames(data.bubbleFrames)
  if (bubbleFrames.self || bubbleFrames.other) {
    pack.bubbleFrames = bubbleFrames
  }
  const avatarStickers = normalizeAvatarStickers(data.avatarStickers)
  if (avatarStickers.self.length || avatarStickers.other.length) {
    pack.avatarStickers = avatarStickers
  }
  const bubbleBadges = normalizeBubbleBadges(data.bubbleBadges)
  if (
    (bubbleBadges.self?.enabled && bubbleBadges.self.text.trim()) ||
    (bubbleBadges.other?.enabled && bubbleBadges.other.text.trim())
  ) {
    pack.bubbleBadges = bubbleBadges
  }

  return pack
}

export function serializeLumiBubblePack(pack: LumiWeChatBubblePack): string {
  return `${JSON.stringify(pack, null, 2)}\n`
}

/**
 * 解析气泡包：
 * 1) 标准 JSON 气泡包（可含 skinEngine:"css" + scopedCss）
 * 2) 纯 CSS / ```css 围栏 → 自动收成 css 引擎包
 */
export function parseLumiBubblePack(raw: string): LumiWeChatBubblePack {
  const original = String(raw ?? '').trim()
  if (!original) throw new Error('气泡包内容为空')

  const fencedCss = /```css\s*([\s\S]*?)```/i.exec(original)
  if (fencedCss?.[1] && looksLikeBubbleScopedCss(fencedCss[1])) {
    return bubblePackFromScopedCssOnly(fencedCss[1])
  }

  const text = stripBubblePackFence(original)
  if (!text) throw new Error('气泡包内容为空')

  const tryParseJson = (candidate: string): LumiWeChatBubblePack | null => {
    try {
      const data = JSON.parse(candidate) as unknown
      if (!isPlainObject(data)) return null
      return parseBubblePackObject(data)
    } catch {
      return null
    }
  }

  const direct = tryParseJson(text)
  if (direct) return direct

  const extracted = extractBubblePackJsonText(original) ?? extractBubblePackJsonText(text)
  if (extracted) {
    const fromExtract = tryParseJson(extracted)
    if (fromExtract) return fromExtract
  }

  if (looksLikeBubbleScopedCss(text) || looksLikeBubbleScopedCss(original)) {
    return bubblePackFromScopedCssOnly(text.length >= 12 ? text : original)
  }

  throw new Error(
    '无法解析气泡包：既不是合法 JSON，也不像 scopedCss。请粘贴完整气泡包 JSON，或纯 CSS（将按 skinEngine:css 导入）。',
  )
}

export function parseLumiBubblePackFile(file: File): Promise<LumiWeChatBubblePack> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('读取文件失败'))
    reader.onload = () => {
      try {
        resolve(parseLumiBubblePack(String(reader.result ?? '')))
      } catch (err) {
        reject(err instanceof Error ? err : new Error('导入失败'))
      }
    }
    reader.readAsText(file, 'utf-8')
  })
}
