/** 聊天气泡角标：皮肤装饰文案，挂在气泡外侧 */

export type BubbleBadgeCluster = 'every' | 'first' | 'last'
export type BubbleBadgeSide = 'inner' | 'outer'

/** 角标独立字体；与外观工坊 LookWorkshopCustomFont 结构一致 */
export type BubbleBadgeFont = {
  family: string
  fileName: string
  dataUrl: string
}

export type BubbleBadge = {
  enabled: boolean
  text: string
  cluster: BubbleBadgeCluster
  /** 是否显示背景条（胶囊底） */
  showBg: boolean
  bg: string
  /** 背景条不透明度 0–100（只影响底色，不影响文字） */
  bgOpacityPct: number
  textColor: string
  fontSizePx: number
  radiusPx: number
  padX: number
  padY: number
  /** 独立字体；null = 跟随该侧气泡文字字体 */
  font: BubbleBadgeFont | null
  /** inner = 靠聊天中心一侧；outer = 靠头像一侧 */
  side: BubbleBadgeSide
  /** 相对气泡高度：0=顶 100=底 */
  yPct: number
  gapPx: number
}

export type BubbleBadgesBySide = {
  self: BubbleBadge | null
  other: BubbleBadge | null
}

export type GradientStop = {
  atPct: number
  color: string
}

export type GradientMode = 'off' | 'stops' | 'css'

export type BubbleShadowDraft = {
  enabled: boolean
  /** true = 用手写 shadow 字符串；false = 用角度/距离等滑块 */
  useCss: boolean
  angleDeg: number
  distancePx: number
  blurPx: number
  spreadPx: number
  color: string
}

function clampNum(n: unknown, min: number, max: number, fallback: number): number {
  if (typeof n !== 'number' || !Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, n))
}

export function defaultBubbleBadge(): BubbleBadge {
  return {
    enabled: false,
    text: '',
    cluster: 'every',
    showBg: true,
    bg: '#ffffff',
    bgOpacityPct: 72,
    textColor: 'rgba(0,0,0,0.45)',
    fontSizePx: 10,
    radiusPx: 999,
    padX: 8,
    padY: 3,
    font: null,
    side: 'inner',
    yPct: 50,
    gapPx: 6,
  }
}

export function defaultGradientStops(): GradientStop[] {
  return [
    { atPct: 0, color: 'rgba(255,255,255,0.55)' },
    { atPct: 100, color: 'rgba(255,255,255,0.28)' },
  ]
}

export function defaultBubbleShadow(): BubbleShadowDraft {
  return {
    enabled: true,
    useCss: false,
    angleDeg: 210,
    distancePx: 4,
    blurPx: 12,
    spreadPx: 0,
    color: 'rgba(0,0,0,0.08)',
  }
}

export function normalizeGradientStops(raw: unknown, fallback: GradientStop[]): GradientStop[] {
  if (!Array.isArray(raw) || raw.length < 2) return fallback.map((s) => ({ ...s }))
  const out: GradientStop[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const o = item as Record<string, unknown>
    const color = typeof o.color === 'string' && o.color.trim() ? o.color.trim() : ''
    if (!color) continue
    out.push({
      atPct: Math.round(clampNum(o.atPct, 0, 100, out.length === 0 ? 0 : 100)),
      color,
    })
    if (out.length >= 5) break
  }
  if (out.length < 2) return fallback.map((s) => ({ ...s }))
  return out
}

export function buildLinearGradientCss(angleDeg: number, stops: GradientStop[]): string {
  const angle = Math.round(clampNum(angleDeg, 0, 360, 135))
  const parts = stops
    .slice()
    .sort((a, b) => a.atPct - b.atPct)
    .map((s) => `${s.color} ${Math.round(clampNum(s.atPct, 0, 100, 0))}%`)
  if (parts.length < 2) return ''
  return `linear-gradient(${angle}deg, ${parts.join(', ')})`
}

export function buildStructuredBoxShadow(s: BubbleShadowDraft): string {
  if (!s.enabled) return 'none'
  const rad = ((s.angleDeg - 90) * Math.PI) / 180
  const dist = Math.max(0, s.distancePx)
  const x = Math.round(Math.cos(rad) * dist)
  const y = Math.round(Math.sin(rad) * dist)
  const blur = Math.max(0, Math.round(s.blurPx))
  const spread = Math.round(s.spreadPx)
  return `${x}px ${y}px ${blur}px ${spread}px ${s.color}`
}

export function normalizeBubbleShadow(raw: unknown, base: BubbleShadowDraft): BubbleShadowDraft {
  if (!raw || typeof raw !== 'object') return { ...base }
  const o = raw as Record<string, unknown>
  return {
    enabled: typeof o.enabled === 'boolean' ? o.enabled : base.enabled,
    useCss: typeof o.useCss === 'boolean' ? o.useCss : base.useCss,
    angleDeg: Math.round(clampNum(o.angleDeg, 0, 360, base.angleDeg)),
    distancePx: Math.round(clampNum(o.distancePx, 0, 40, base.distancePx)),
    blurPx: Math.round(clampNum(o.blurPx, 0, 60, base.blurPx)),
    spreadPx: Math.round(clampNum(o.spreadPx, -20, 40, base.spreadPx)),
    color: typeof o.color === 'string' && o.color.trim() ? o.color.trim() : base.color,
  }
}

export function normalizeBubbleBadgeFont(raw: unknown): BubbleBadgeFont | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const dataUrl = typeof o.dataUrl === 'string' ? o.dataUrl.trim() : ''
  const family = typeof o.family === 'string' ? o.family.trim() : ''
  if (!dataUrl || !family) return null
  return {
    family,
    fileName: typeof o.fileName === 'string' && o.fileName.trim() ? o.fileName.trim() : 'badge-font',
    dataUrl,
  }
}

export function normalizeBubbleBadge(raw: unknown, base?: BubbleBadge | null): BubbleBadge | null {
  const fallback = base ?? defaultBubbleBadge()
  if (raw == null) return { ...fallback, enabled: false, font: fallback.font ? { ...fallback.font } : null }
  if (!raw || typeof raw !== 'object') {
    return { ...fallback, font: fallback.font ? { ...fallback.font } : null }
  }
  const o = raw as Record<string, unknown>
  const text = typeof o.text === 'string' ? o.text.slice(0, 24) : fallback.text
  const cluster: BubbleBadgeCluster =
    o.cluster === 'first' || o.cluster === 'last' || o.cluster === 'every'
      ? o.cluster
      : fallback.cluster
  const side: BubbleBadgeSide = o.side === 'outer' ? 'outer' : 'inner'
  const font =
    'font' in o ? normalizeBubbleBadgeFont(o.font) : fallback.font ? { ...fallback.font } : null
  return {
    // 允许仅开启开关（文案可稍后填）；真正渲染仍看 text.trim()
    enabled: o.enabled === true,
    text,
    cluster,
    showBg: typeof o.showBg === 'boolean' ? o.showBg : fallback.showBg,
    bg: typeof o.bg === 'string' && o.bg.trim() ? o.bg.trim() : fallback.bg,
    // 旧存档无此字段：透明度已写在 bg（如 rgba）里，按 100% 叠加以避免二次变淡
    bgOpacityPct: Math.round(
      clampNum(o.bgOpacityPct, 0, 100, 'bgOpacityPct' in o ? fallback.bgOpacityPct : 100),
    ),
    textColor:
      typeof o.textColor === 'string' && o.textColor.trim()
        ? o.textColor.trim()
        : fallback.textColor,
    fontSizePx: Math.round(clampNum(o.fontSizePx, 8, 16, fallback.fontSizePx)),
    radiusPx: Math.round(clampNum(o.radiusPx, 0, 999, fallback.radiusPx)),
    padX: Math.round(clampNum(o.padX, 2, 20, fallback.padX)),
    padY: Math.round(clampNum(o.padY, 1, 12, fallback.padY)),
    font,
    side,
    yPct: Math.round(clampNum(o.yPct, 0, 100, fallback.yPct)),
    gapPx: Math.round(clampNum(o.gapPx, 0, 24, fallback.gapPx)),
  }
}

export function normalizeBubbleBadges(raw: unknown): BubbleBadgesBySide {
  if (!raw || typeof raw !== 'object') return { self: null, other: null }
  const o = raw as Record<string, unknown>
  return {
    self: normalizeBubbleBadge(o.self),
    other: normalizeBubbleBadge(o.other),
  }
}

export function emptyBubbleBadges(): BubbleBadgesBySide {
  return { self: null, other: null }
}

/** 连续簇内是否显示角标 */
export function shouldShowBubbleBadge(
  cluster: BubbleBadgeCluster,
  bubbleCluster: 'single' | 'first' | 'middle' | 'last',
): boolean {
  if (cluster === 'every') return true
  if (cluster === 'first') return bubbleCluster === 'single' || bubbleCluster === 'first'
  return bubbleCluster === 'single' || bubbleCluster === 'last'
}
