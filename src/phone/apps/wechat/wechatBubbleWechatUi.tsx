/** 微信 8.x 经典聊天气泡 / 卡片 UI 片段 */

import { useId, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'

export const WECHAT_CLASSIC = {
  chatBg: '#F3F3F3',
  headerBg: '#EDEDED',
  inputBg: '#F7F7F7',
  text: '#191919',
  selfBubble: '#95EC69',
  otherBubble: '#FFFFFF',
  wechatGreen: '#07C160',
  quoteBg: '#EBEBEB',
  bubbleRadiusPx: 8,
  tailTopPx: 14,
} as const

/** 聊天气泡最大宽：100vw − 左右 24px − 对方头像列 80px（40 头像 + 12 间距 + 28 缓冲） */
export const WECHAT_CHAT_BUBBLE_MAX_CLASS = 'max-w-[calc(100vw-24px-24px-80px)]'

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

function lerp(ax: number, ay: number, bx: number, by: number, t: number): [number, number] {
  return [ax + (bx - ax) * t, ay + (by - ay) * t]
}

function dist(ax: number, ay: number, bx: number, by: number) {
  return Math.hypot(bx - ax, by - ay)
}

export type BubbleTailGeom = {
  width: number
  height: number
  path: string
  viewBox: string
}

/**
 * @param lengthPx 尖角横向长度（伸出气泡的距离）
 * @param angleDeg 尖端开口夹角（度）；越大开口越宽
 * @param roundPx 仅尖端小圆角（0=锋利三角，勿开太大）
 */
export function buildBubbleTailGeometry(opts: {
  isSelf: boolean
  lengthPx: number
  angleDeg: number
  roundPx: number
}): BubbleTailGeom {
  const width = clamp(Math.round(opts.lengthPx * 10) / 10, 4, 28)
  const angleDeg = clamp(opts.angleDeg, 25, 100)
  const tipRad = (angleDeg / 2) * (Math.PI / 180)
  // 开口角 + 长度 → 竖直底边高度
  const height = clamp(Math.round(2 * width * Math.tan(tipRad)), 6, 40)
  const half = height / 2
  // 圆尖只做尖端微调，避免整颗变成半圆
  const round = clamp(opts.roundPx, 0, Math.min(width * 0.28, half * 0.28))

  const path = opts.isSelf
    ? pathSelfSharp(width, height, half, round)
    : pathOtherSharp(width, height, half, round)

  return {
    width,
    height,
    path,
    viewBox: `0 0 ${width} ${height}`,
  }
}

/**
 * 锋利三角尖角（对方侧）：贴边在 x=W，尖端在 x=0。
 * 直边三角 + 可选尖端微圆，不再用大贝塞尔（会画成半圆）。
 */
function pathOtherSharp(W: number, H: number, mid: number, r: number): string {
  const tipX = 0
  const tipY = mid
  const topX = W
  const topY = 0
  const botX = W
  const botY = H
  if (r < 0.05) return `M${topX},${topY} L${tipX},${tipY} L${botX},${botY} Z`
  const tTop = clamp(r / Math.max(1, dist(tipX, tipY, topX, topY)), 0.02, 0.35)
  const tBot = clamp(r / Math.max(1, dist(tipX, tipY, botX, botY)), 0.02, 0.35)
  const [p1x, p1y] = lerp(tipX, tipY, topX, topY, tTop)
  const [p2x, p2y] = lerp(tipX, tipY, botX, botY, tBot)
  return `M${topX},${topY} L${p1x},${p1y} Q${tipX},${tipY} ${p2x},${p2y} L${botX},${botY} Z`
}

/** 锋利三角尖角（己方侧）：贴边在 x=0，尖端在 x=W */
function pathSelfSharp(W: number, H: number, mid: number, r: number): string {
  const tipX = W
  const tipY = mid
  const topX = 0
  const topY = 0
  const botX = 0
  const botY = H
  if (r < 0.05) return `M${topX},${topY} L${tipX},${tipY} L${botX},${botY} Z`
  const tTop = clamp(r / Math.max(1, dist(tipX, tipY, topX, topY)), 0.02, 0.35)
  const tBot = clamp(r / Math.max(1, dist(tipX, tipY, botX, botY)), 0.02, 0.35)
  const [p1x, p1y] = lerp(tipX, tipY, topX, topY, tTop)
  const [p2x, p2y] = lerp(tipX, tipY, botX, botY, tBot)
  return `M${topX},${topY} L${p1x},${p1y} Q${tipX},${tipY} ${p2x},${p2y} L${botX},${botY} Z`
}


/**
 * 毛玻璃气泡底常是低透明 rgba，尾巴用 fill-current 几乎看不见。
 * 尾巴改用同色相的高不透明实色（对齐糯叽机预览观感）。
 */
export function opaqueCssColorForTail(color: string, alpha = 0.92): string {
  const c = String(color ?? '').trim()
  if (!c) return `rgba(255,255,255,${alpha})`
  const rgba = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/i.exec(c)
  if (rgba) return `rgba(${rgba[1]}, ${rgba[2]}, ${rgba[3]}, ${alpha})`
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(c)
  if (hex) {
    let h = hex[1]!
    if (h.length === 3) h = h.split('').map((ch) => ch + ch).join('')
    const r = parseInt(h.slice(0, 2), 16)
    const g = parseInt(h.slice(2, 4), 16)
    const b = parseInt(h.slice(4, 6), 16)
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }
  return c
}

export type WechatBubbleTailProps = {
  isSelf: boolean
  bubbleColor: string
  /** 横向长度（侧边）或向下伸出长度（底部） */
  lengthPx?: number
  /** 尖端开口夹角（度） */
  angleDeg?: number
  /** 尖端圆角 */
  roundPx?: number
  borderWidth?: number
  borderColor?: string
  /** @deprecated 用 offsetYPct；相对气泡顶边的 px */
  topPx?: number
  /** 侧边尖角垂直位置（相对气泡高度 0–100%）；yMode=pct 时用 */
  offsetYPct?: number
  /**
   * 侧边垂直定位：pct=百分比；avatar=跟随头像中心。
   * 也可读 `--wx-bubble-tail-y-mode`
   */
  yMode?: 'pct' | 'avatar'
  /** 跟随头像时：头像边长；可读 `--wx-bubble-tail-avatar-size` */
  avatarSizePx?: number
  /** 跟随头像时：头像相对行高的垂直 %；可读 `--wx-bubble-tail-avatar-y` */
  avatarBubbleYPct?: number
  /** 贴边：侧边 / 底部 */
  anchor?: 'side' | 'bottom'
  /** 底部贴边：沿底边 0%=靠头像侧 … 100%=靠聊天中心 */
  offsetXPct?: number
  /** 侧边尖角横向偏移（px）：正=朝头像探出，负=塞进气泡 */
  offsetXPx?: number
  /** 尖角整体倾斜（度）：负=逆时针，正=顺时针；绕贴边旋转 */
  tiltDeg?: number
  /**
   * 与气泡底同步：保留透明度/渐变，并可套同款毛玻璃。
   * 也可由宿主 CSS `--wx-bubble-tail-match-surface: 1` 开启。
   */
  matchBubbleSurface?: boolean
  /** 毛玻璃模糊；0 = 关。也可读 `--wx-bubble-tail-glass-blur` */
  glassBlurPx?: number
  glassSaturatePct?: number
}

type TailResolved = {
  lengthPx: number
  angleDeg: number
  roundPx: number
  borderWidth: number
  borderColor: string
  /** 侧边垂直：优先用 %，无则退回 topPx */
  offsetYPct: number | null
  topPx: number
  yMode: 'pct' | 'avatar'
  avatarSizePx: number
  avatarBubbleYPct: number
  anchor: 'side' | 'bottom'
  offsetXPct: number
  offsetXPx: number
  tiltDeg: number
  matchSurface: boolean
  surfaceBg: string
  glassBlurPx: number
  glassSaturatePct: number
}

const TAIL_DEFAULTS: TailResolved = {
  lengthPx: 6,
  angleDeg: 55,
  roundPx: 0,
  borderWidth: 0,
  borderColor: 'transparent',
  offsetYPct: null,
  topPx: WECHAT_CLASSIC.tailTopPx,
  yMode: 'pct',
  avatarSizePx: 40,
  avatarBubbleYPct: 0,
  anchor: 'side',
  offsetXPct: 0,
  offsetXPx: 0,
  tiltDeg: 0,
  matchSurface: false,
  surfaceBg: '',
  glassBlurPx: 0,
  glassSaturatePct: 140,
}

/** 朝下的尖角几何（贴气泡底边） */
export function buildBubbleTailGeometryDown(opts: {
  lengthPx: number
  angleDeg: number
  roundPx: number
}): BubbleTailGeom {
  const height = clamp(Math.round(opts.lengthPx * 10) / 10, 4, 28)
  const angleDeg = clamp(opts.angleDeg, 25, 100)
  const tipRad = (angleDeg / 2) * (Math.PI / 180)
  const width = clamp(Math.round(2 * height * Math.tan(tipRad)), 6, 40)
  const mid = width / 2
  const round = clamp(opts.roundPx, 0, Math.min(height * 0.42, mid * 0.42))
  const tipX = mid
  const tipY = height
  const leftX = 0
  const leftY = 0
  const rightX = width
  const rightY = 0
  let path: string
  if (round < 0.05) {
    path = `M${leftX},${leftY} L${tipX},${tipY} L${rightX},${rightY} Z`
  } else {
    const tL = clamp(round / Math.max(1, dist(tipX, tipY, leftX, leftY)), 0.02, 0.45)
    const tR = clamp(round / Math.max(1, dist(tipX, tipY, rightX, rightY)), 0.02, 0.45)
    const [p1x, p1y] = lerp(tipX, tipY, leftX, leftY, tL)
    const [p2x, p2y] = lerp(tipX, tipY, rightX, rightY, tR)
    path = `M${leftX},${leftY} L${p1x},${p1y} Q${tipX},${tipY} ${p2x},${p2y} L${rightX},${rightY} Z`
  }
  return { width, height, path, viewBox: `0 0 ${width} ${height}` }
}

/** 微信 App 内置经典三角（6×10），勿用参数几何替代 */
const CLASSIC_SELF_TAIL_PATH = 'M0,0 L6,5 L0,10 Z'
const CLASSIC_OTHER_TAIL_PATH = 'M6,0 L0,5 L6,10 Z'

function parseCssOffsetY(raw: string): { offsetYPct: number | null; topPx: number | undefined } {
  const v = raw.trim()
  if (!v) return { offsetYPct: null, topPx: undefined }
  if (v.endsWith('%')) {
    const n = Number.parseFloat(v)
    return { offsetYPct: Number.isFinite(n) ? clamp(n, 0, 100) : null, topPx: undefined }
  }
  const n = Number.parseFloat(v)
  return { offsetYPct: null, topPx: Number.isFinite(n) ? n : undefined }
}

function readTailFromCss(el: Element | null): Partial<TailResolved> {
  if (!el || !(el instanceof HTMLElement)) return {}
  const cs = getComputedStyle(el)
  const num = (name: string) => {
    const raw = cs.getPropertyValue(name).trim()
    if (!raw) return undefined
    const n = Number.parseFloat(raw)
    return Number.isFinite(n) ? n : undefined
  }
  const color = cs.getPropertyValue('--wx-bubble-tail-border-color').trim()
  const surfaceBg = cs.getPropertyValue('--wx-bubble-tail-bg').trim()
  const matchRaw = cs.getPropertyValue('--wx-bubble-tail-match-surface').trim()
  const anchorRaw = cs.getPropertyValue('--wx-bubble-tail-anchor').trim()
  const yParsed = parseCssOffsetY(cs.getPropertyValue('--wx-bubble-tail-offset-y'))
  const yModeRaw = cs.getPropertyValue('--wx-bubble-tail-y-mode').trim()
  return {
    lengthPx: num('--wx-bubble-tail-length') ?? num('--wx-bubble-tail-height'),
    angleDeg: num('--wx-bubble-tail-angle'),
    roundPx: num('--wx-bubble-tail-round'),
    borderWidth: num('--wx-bubble-tail-border-width'),
    borderColor: color || undefined,
    offsetYPct: yParsed.offsetYPct,
    topPx: yParsed.topPx,
    yMode: yModeRaw === 'avatar' ? 'avatar' : yModeRaw === 'pct' ? 'pct' : undefined,
    avatarSizePx: num('--wx-bubble-tail-avatar-size'),
    avatarBubbleYPct: num('--wx-bubble-tail-avatar-y'),
    offsetXPct: num('--wx-bubble-tail-offset-x-pct'),
    offsetXPx: num('--wx-bubble-tail-offset-x'),
    tiltDeg: num('--wx-bubble-tail-tilt'),
    anchor: anchorRaw === 'bottom' ? 'bottom' : anchorRaw === 'side' ? 'side' : undefined,
    matchSurface: matchRaw === '1' || matchRaw === 'true',
    surfaceBg: surfaceBg || undefined,
    glassBlurPx: num('--wx-bubble-tail-glass-blur'),
    glassSaturatePct: num('--wx-bubble-tail-glass-saturate'),
  }
}

/** 仅外观工坊 / 气泡包显式 CSS 变量时启用参数尖角；内置主题走经典路径 */
function hasWorkshopTailCss(
  css: Partial<TailResolved>,
  props: {
    lengthPx?: number
    angleDeg?: number
    roundPx?: number
    borderWidth?: number
    topPx?: number
    offsetYPct?: number
    yMode?: 'pct' | 'avatar'
    avatarSizePx?: number
    avatarBubbleYPct?: number
    anchor?: 'side' | 'bottom'
    offsetXPct?: number
    offsetXPx?: number
    tiltDeg?: number
    matchBubbleSurface?: boolean
    glassBlurPx?: number
  },
): boolean {
  if (props.matchBubbleSurface === true) return true
  if (typeof props.glassBlurPx === 'number' && props.glassBlurPx > 0) return true
  if (props.lengthPx != null || props.angleDeg != null || props.roundPx != null) return true
  if (props.borderWidth != null && props.borderWidth > 0) return true
  if (props.yMode === 'avatar' || props.avatarSizePx != null || props.avatarBubbleYPct != null) {
    return true
  }
  if (
    props.topPx != null ||
    props.offsetYPct != null ||
    props.anchor != null ||
    props.offsetXPct != null ||
    props.offsetXPx != null ||
    props.tiltDeg != null
  ) {
    return true
  }
  if (css.matchSurface === true) return true
  if (typeof css.glassBlurPx === 'number' && css.glassBlurPx > 0) return true
  if (css.lengthPx != null || css.angleDeg != null || css.roundPx != null) return true
  if (css.borderWidth != null && css.borderWidth > 0) return true
  if (css.yMode === 'avatar') return true
  if (
    css.topPx != null ||
    css.offsetYPct != null ||
    css.anchor != null ||
    css.offsetXPct != null ||
    css.offsetXPx != null ||
    css.tiltDeg != null
  ) {
    return true
  }
  if ((css.surfaceBg || '').trim()) return true
  return false
}

export function WechatBubbleTail({
  isSelf,
  bubbleColor,
  lengthPx,
  angleDeg,
  roundPx,
  borderWidth,
  borderColor,
  topPx,
  offsetYPct,
  yMode,
  avatarSizePx,
  avatarBubbleYPct,
  anchor,
  offsetXPct,
  offsetXPx,
  tiltDeg,
  matchBubbleSurface,
  glassBlurPx,
  glassSaturatePct,
}: WechatBubbleTailProps) {
  const hostRef = useRef<Element | null>(null)
  const [cssTail, setCssTail] = useState<Partial<TailResolved>>({})
  /** 跟随头像：头像中心相对气泡盒顶边的 px（实测，避免公式与布局不一致） */
  const [avatarMidPx, setAvatarMidPx] = useState<number | null>(null)
  const clipId = useId().replace(/:/g, '')

  const resolvedYModeEarly: 'pct' | 'avatar' =
    yMode === 'avatar' || yMode === 'pct'
      ? yMode
      : cssTail.yMode === 'avatar' || cssTail.yMode === 'pct'
        ? cssTail.yMode
        : 'pct'
  const resolvedAnchorEarly =
    anchor ?? cssTail.anchor ?? ('side' as const)

  useLayoutEffect(() => {
    const el = hostRef.current
    const host =
      el?.closest('[data-wx-bubble-content]') ??
      el?.closest('[data-wx-special-card]') ??
      el?.parentElement?.querySelector?.('[data-wx-bubble-content]') ??
      el?.parentElement ??
      null
    setCssTail(readTailFromCss(host instanceof Element ? host : null))
  }, [
    isSelf,
    bubbleColor,
    lengthPx,
    angleDeg,
    roundPx,
    borderWidth,
    borderColor,
    topPx,
    offsetYPct,
    yMode,
    avatarSizePx,
    avatarBubbleYPct,
    anchor,
    offsetXPct,
    offsetXPx,
    tiltDeg,
    matchBubbleSurface,
    glassBlurPx,
    glassSaturatePct,
  ])

  useLayoutEffect(() => {
    if (resolvedYModeEarly !== 'avatar' || resolvedAnchorEarly === 'bottom') {
      setAvatarMidPx(null)
      return
    }
    const el = hostRef.current
    if (!el) return
    const sideEl = el.closest('[data-wx-bubble-side]') as HTMLElement | null
    const alignRoot =
      (el.closest('[data-wx-msg-align]') as HTMLElement | null) ??
      (el.closest('.wx-chat-msg-row') as HTMLElement | null) ??
      (sideEl?.parentElement as HTMLElement | null)
    const sideKey = isSelf ? 'self' : 'other'
    const avatarEl =
      (alignRoot?.querySelector(
        `[data-wx-avatar-chrome="${sideKey}"]`,
      ) as HTMLElement | null) ??
      (alignRoot?.querySelector('[data-wx-avatar-chrome]') as HTMLElement | null)

    const measure = () => {
      if (!sideEl || !avatarEl) {
        setAvatarMidPx(null)
        return
      }
      const cs = getComputedStyle(avatarEl)
      if (cs.display === 'none' || cs.visibility === 'hidden') {
        setAvatarMidPx(null)
        return
      }
      const sr = sideEl.getBoundingClientRect()
      const ar = avatarEl.getBoundingClientRect()
      if (sr.height < 1 || ar.height < 1) {
        setAvatarMidPx(null)
        return
      }
      setAvatarMidPx(ar.top + ar.height / 2 - sr.top)
    }

    if (!sideEl) {
      setAvatarMidPx(null)
      return
    }

    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(sideEl)
    if (avatarEl) ro.observe(avatarEl)
    window.addEventListener('resize', measure)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [
    resolvedYModeEarly,
    resolvedAnchorEarly,
    isSelf,
    lengthPx,
    angleDeg,
    roundPx,
    avatarSizePx,
    avatarBubbleYPct,
    cssTail.yMode,
    cssTail.avatarSizePx,
    cssTail.avatarBubbleYPct,
  ])

  const customized = hasWorkshopTailCss(cssTail, {
    lengthPx,
    angleDeg,
    roundPx,
    borderWidth,
    topPx,
    offsetYPct,
    yMode,
    avatarSizePx,
    avatarBubbleYPct,
    anchor,
    offsetXPct,
    offsetXPx,
    tiltDeg,
    matchBubbleSurface,
    glassBlurPx,
  })

  /** 内置「微信 App」：固定 6×10 三角 */
  if (!customized) {
    const fill = opaqueCssColorForTail(bubbleColor)
    return (
      <svg
        ref={(node) => {
          hostRef.current = node
        }}
        aria-hidden
        data-wx-bubble-tail
        data-wx-bubble-tail-anchor="side"
        className="pointer-events-none absolute h-[10px] w-[6px] fill-current"
        style={{
          color: fill,
          top: WECHAT_CLASSIC.tailTopPx,
          zIndex: 0,
          ...(isSelf ? { right: -5 } : { left: -5 }),
        }}
        viewBox="0 0 6 10"
      >
        <path d={isSelf ? CLASSIC_SELF_TAIL_PATH : CLASSIC_OTHER_TAIL_PATH} />
      </svg>
    )
  }

  const resolvedYPct =
    offsetYPct ??
    cssTail.offsetYPct ??
    (typeof topPx === 'number' || typeof cssTail.topPx === 'number' ? null : 28)
  const resolvedTopPx = topPx ?? cssTail.topPx ?? TAIL_DEFAULTS.topPx
  const resolvedYMode: 'pct' | 'avatar' = resolvedYModeEarly

  const resolved: TailResolved = {
    lengthPx: lengthPx ?? cssTail.lengthPx ?? TAIL_DEFAULTS.lengthPx,
    angleDeg: angleDeg ?? cssTail.angleDeg ?? TAIL_DEFAULTS.angleDeg,
    roundPx: roundPx ?? cssTail.roundPx ?? TAIL_DEFAULTS.roundPx,
    borderWidth: borderWidth ?? cssTail.borderWidth ?? TAIL_DEFAULTS.borderWidth,
    borderColor: borderColor ?? cssTail.borderColor ?? TAIL_DEFAULTS.borderColor,
    offsetYPct: resolvedYPct,
    topPx: resolvedTopPx,
    yMode: resolvedYMode,
    avatarSizePx: clamp(
      avatarSizePx ?? cssTail.avatarSizePx ?? TAIL_DEFAULTS.avatarSizePx,
      24,
      72,
    ),
    avatarBubbleYPct: clamp(
      avatarBubbleYPct ?? cssTail.avatarBubbleYPct ?? TAIL_DEFAULTS.avatarBubbleYPct,
      0,
      100,
    ),
    anchor: anchor ?? cssTail.anchor ?? TAIL_DEFAULTS.anchor,
    offsetXPct: offsetXPct ?? cssTail.offsetXPct ?? TAIL_DEFAULTS.offsetXPct,
    offsetXPx: offsetXPx ?? cssTail.offsetXPx ?? TAIL_DEFAULTS.offsetXPx,
    tiltDeg: clamp(tiltDeg ?? cssTail.tiltDeg ?? TAIL_DEFAULTS.tiltDeg, -60, 60),
    matchSurface:
      matchBubbleSurface === true ||
      cssTail.matchSurface === true ||
      (typeof glassBlurPx === 'number' && glassBlurPx > 0) ||
      (typeof cssTail.glassBlurPx === 'number' && cssTail.glassBlurPx > 0),
    // 外观工坊预览会显式传 matchBubbleSurface + bubbleColor（含独立尖角色）；
    // 聊天室皮肤包则靠 CSS --wx-bubble-tail-bg（props 常为不透明主题色兜底）。
    surfaceBg:
      matchBubbleSurface === true
        ? (bubbleColor || '').trim() || (cssTail.surfaceBg || '').trim()
        : (cssTail.surfaceBg || '').trim() || bubbleColor,
    glassBlurPx: glassBlurPx ?? cssTail.glassBlurPx ?? 0,
    glassSaturatePct: glassSaturatePct ?? cssTail.glassSaturatePct ?? 140,
  }

  const isBottom = resolved.anchor === 'bottom'
  const geom = isBottom
    ? buildBubbleTailGeometryDown({
        lengthPx: resolved.lengthPx,
        angleDeg: resolved.angleDeg,
        roundPx: resolved.roundPx,
      })
    : buildBubbleTailGeometry({
        isSelf,
        lengthPx: resolved.lengthPx,
        angleDeg: resolved.angleDeg,
        roundPx: resolved.roundPx,
      })

  const strokeW = Math.max(0, resolved.borderWidth)
  const isGlassTail = resolved.matchSurface
  /** 玻璃：整颗尖角在气泡外，避免半透明叠层成方条/梯形 */
  const tuck = isGlassTail ? 0 : Math.max(3, strokeW + 3)
  const xPct = clamp(resolved.offsetXPct, 0, 100)
  const xNudge = clamp(resolved.offsetXPx, -40, 48)
  const yPct = resolved.offsetYPct
  const tilt = resolved.tiltDeg

  /** 跟随头像：优先用实测头像中心；测不到再退回与 chrome 同公式 */
  const sideTopStyle: CSSProperties =
    !isBottom && resolved.yMode === 'avatar'
      ? avatarMidPx != null
        ? { top: avatarMidPx - geom.height / 2 }
        : {
            top: `calc((100% - ${resolved.avatarSizePx}px) * ${resolved.avatarBubbleYPct} / 100 + ${resolved.avatarSizePx / 2}px - ${geom.height / 2}px)`,
          }
      : yPct != null
        ? { top: `calc(${clamp(yPct, 0, 100)}% - ${geom.height / 2}px)` }
        : { top: resolved.topPx }

  /** 绕贴边旋转：对方右缘 / 自己左缘 / 底部上缘 */
  const tiltOrigin = isBottom
    ? '50% 0%'
    : isSelf
      ? '0% 50%'
      : '100% 50%'
  const tiltStyle: CSSProperties =
    Math.abs(tilt) > 0.05
      ? { transform: `rotate(${tilt}deg)`, transformOrigin: tiltOrigin }
      : {}

  const posStyle: CSSProperties = isBottom
    ? {
        bottom: -(geom.height - tuck),
        zIndex: 0,
        width: geom.width,
        height: geom.height,
        overflow: 'visible',
        ...tiltStyle,
        ...(isSelf
          ? { right: `calc(${xPct}% - ${geom.width / 2}px)`, left: 'auto' }
          : { left: `calc(${xPct}% - ${geom.width / 2}px)`, right: 'auto' }),
      }
    : {
        ...sideTopStyle,
        zIndex: 0,
        width: geom.width,
        height: geom.height,
        overflow: 'visible',
        ...tiltStyle,
        ...(isSelf
          ? { right: -geom.width + tuck + xNudge, left: 'auto' }
          : { left: -geom.width + tuck - xNudge, right: 'auto' }),
      }

  const blur = Math.min(40, Math.max(0, Math.round(resolved.glassBlurPx)))
  const sat = Math.min(200, Math.max(100, Math.round(resolved.glassSaturatePct)))
  const glassFilter = blur > 0 ? `blur(${blur}px) saturate(${sat}%)` : undefined
  const surface = resolved.surfaceBg || bubbleColor
  const triClip = `path(evenodd, "${geom.path}")`
  const strokePath = geom.path.replace(/\s*Z\s*$/i, '')

  /** 描边避开贴边内侧，减少接缝线 */
  const strokeClipRect = isBottom
    ? { x: -2, y: 1, width: geom.width + 4, height: Math.max(1, geom.height - 1) }
    : isSelf
      ? { x: 1, y: -2, width: Math.max(1, geom.width - 1), height: geom.height + 4 }
      : { x: -2, y: -2, width: Math.max(1, geom.width - 1), height: geom.height + 4 }

  if (resolved.matchSurface) {
    return (
      <span
        ref={(node) => {
          hostRef.current = node
        }}
        aria-hidden
        data-wx-bubble-tail
        data-wx-bubble-tail-surface="match"
        data-wx-bubble-tail-anchor={resolved.anchor}
        className="pointer-events-none absolute"
        style={posStyle}
      >
        {/*
          渐变/半透明必须走 CSS background：SVG fill 不认 linear-gradient，
          非法 fill 会落到默认黑色（看起来像「凭空多出黑色尖角」）。
        */}
        <span
          className="absolute inset-0 block"
          style={{
            background: surface,
            WebkitClipPath: triClip,
            clipPath: triClip,
          }}
        />
        {strokeW > 0 ? (
          <svg
            aria-hidden
            className="pointer-events-none absolute inset-0 overflow-visible"
            width={geom.width}
            height={geom.height}
            viewBox={geom.viewBox}
          >
            <defs>
              <clipPath id={`wx-tail-stroke-${clipId}`}>
                <rect
                  x={strokeClipRect.x}
                  y={strokeClipRect.y}
                  width={strokeClipRect.width}
                  height={strokeClipRect.height}
                />
              </clipPath>
            </defs>
            <path
              d={strokePath}
              fill="none"
              stroke={resolved.borderColor}
              strokeWidth={strokeW}
              strokeLinejoin={resolved.roundPx > 0.05 ? 'round' : 'miter'}
              strokeLinecap="butt"
              clipPath={`url(#wx-tail-stroke-${clipId})`}
            />
          </svg>
        ) : null}
        {blur > 0 ? (
          <span
            className="absolute inset-0 block"
            style={{
              WebkitBackdropFilter: glassFilter,
              backdropFilter: glassFilter,
              WebkitClipPath: triClip,
              clipPath: triClip,
            }}
          />
        ) : null}
      </span>
    )
  }

  const fill = opaqueCssColorForTail(bubbleColor)

  return (
    <span
      ref={(node) => {
        hostRef.current = node
      }}
      aria-hidden
      data-wx-bubble-tail
      data-wx-bubble-tail-anchor={resolved.anchor}
      className="pointer-events-none absolute"
      style={posStyle}
    >
      <svg
        className="pointer-events-none absolute inset-0 overflow-visible"
        width={geom.width}
        height={geom.height}
        viewBox={geom.viewBox}
      >
        <defs>
          <clipPath id={`wx-tail-stroke-${clipId}`}>
            <rect
              x={strokeClipRect.x}
              y={strokeClipRect.y}
              width={strokeClipRect.width}
              height={strokeClipRect.height}
            />
          </clipPath>
        </defs>
        <path d={geom.path} fill={fill} />
        {strokeW > 0 ? (
          <path
            d={strokePath}
            fill="none"
            stroke={resolved.borderColor}
            strokeWidth={strokeW}
            strokeLinejoin={resolved.roundPx > 0.05 ? 'round' : 'miter'}
            strokeLinecap="butt"
            clipPath={`url(#wx-tail-stroke-${clipId})`}
          />
        ) : null}
      </svg>
    </span>
  )
}

/** 位置 / 红包等卡片左侧尖角（与卡片顶栏同色） */
export function WechatCardTail({ color, topPx = WECHAT_CLASSIC.tailTopPx }: { color: string; topPx?: number }) {
  return (
    <svg
      aria-hidden
      data-wx-bubble-tail
      className="pointer-events-none absolute h-[10px] w-[6px] fill-current"
      style={{ color, top: topPx, left: -5, zIndex: 0 }}
      viewBox="0 0 6 10"
    >
      <path d={CLASSIC_OTHER_TAIL_PATH} />
    </svg>
  )
}

/** 微信经典语音波形：圆点 + 双弧线（右向；己方镜像为左向） */
export function WechatVoiceWaveIcon({ isSelf, className = 'h-4 w-6' }: { isSelf: boolean; className?: string }) {
  return (
    <svg
      className={`${className} shrink-0 text-[#191919]`}
      viewBox="0 0 18 16"
      fill="none"
      aria-hidden
      style={isSelf ? { transform: 'scaleX(-1)' } : undefined}
    >
      <circle cx="3" cy="8" r="2.25" fill="currentColor" />
      <path
        d="M7 5.5c2.2 2.5 2.2 2.5 0 5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M9.5 3c3.8 5 3.8 5 0 10"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  )
}

/** 微信语音气泡最大宽度（秒数再长也不超过此值） */
export const WECHAT_VOICE_BUBBLE_MAX_PX = 240

/** 微信语音气泡宽度：约 88px + 每秒钟 8px，上限 {@link WECHAT_VOICE_BUBBLE_MAX_PX} */
export function wechatVoiceBubbleWidthPx(durationSec: number): number {
  const sec = Math.max(1, Math.round(durationSec || 1))
  return Math.min(WECHAT_VOICE_BUBBLE_MAX_PX, Math.max(88, 56 + sec * 8))
}

function WechatRedPacketIconClosed() {
  return (
    <svg viewBox="0 0 36 44" className="h-11 w-9 shrink-0" aria-hidden>
      <rect x="3" y="10" width="30" height="32" rx="2.5" fill="#E03E2F" />
      <path d="M3 14 L18 26 L33 14" fill="#C93527" />
      <circle cx="18" cy="30" r="7.5" fill="#FFF" />
      <text
        x="18"
        y="33.5"
        textAnchor="middle"
        fill="#F5A623"
        fontSize="12"
        fontWeight="700"
        fontFamily="system-ui, sans-serif"
      >
        ¥
      </text>
    </svg>
  )
}

function WechatRedPacketIconOpened() {
  return (
    <svg viewBox="0 0 36 44" className="h-11 w-9 shrink-0" aria-hidden>
      <path d="M3 16 L18 6 L33 16 Z" fill="#FFF" />
      <rect x="3" y="16" width="30" height="26" rx="2.5" fill="#E03E2F" />
      <circle cx="18" cy="22" r="4.5" fill="#F5A623" />
      <path d="M3 16 L18 28 L33 16" fill="#C93527" opacity="0.85" />
    </svg>
  )
}

export function WechatRedPacketBubbleFace({
  remark,
  kind,
  isSelf,
}: {
  remark: string
  kind: 'unclaimed' | 'claimed' | 'expired'
  isSelf: boolean
}) {
  const bg = kind === 'unclaimed' ? '#FA9D3B' : kind === 'claimed' ? '#FCE4C5' : '#E8D0BC'
  const dividerCls = kind === 'unclaimed' ? 'border-white/20' : 'border-white/30'

  let statusLabel: string | null = null
  if (kind === 'claimed') statusLabel = '已领取'
  else if (kind === 'expired') statusLabel = '已过期'

  return (
    <div
      data-wx-msg-kind="red-packet"
      data-wx-special-card
      data-wx-special-status={kind}
      className="relative w-[min(240px,72vw)] max-w-full shrink-0 select-none overflow-visible rounded-lg text-white shadow-sm"
      style={{ backgroundColor: bg }}
    >
      <WechatBubbleTail isSelf={isSelf} bubbleColor={bg} />
      <div className="flex items-center gap-3 px-3 pt-3 pb-2.5">
        <span data-wx-special-part="icon">
          {kind === 'unclaimed' ? <WechatRedPacketIconClosed /> : <WechatRedPacketIconOpened />}
        </span>
        <div className="min-w-0 flex-1">
          <p
            data-wx-special-part="label"
            className={`truncate text-[16px] font-normal leading-snug ${kind === 'expired' ? 'line-through opacity-90' : ''}`}
          >
            {remark}
          </p>
          {statusLabel ? (
            <p data-wx-special-part="status" className="mt-0.5 text-[12px] leading-snug text-white/90">
              {statusLabel}
            </p>
          ) : null}
        </div>
      </div>
      <div data-wx-special-part="footer" className={`border-t px-3 py-1.5 ${dividerCls}`}>
        <p className="text-[11px] leading-none text-white/70">微信红包</p>
      </div>
    </div>
  )
}

function WechatTransferIcon({ kind, muted = false }: { kind: 'pending' | 'done' | 'returned'; muted?: boolean }) {
  const ring = muted ? 'border-white/80' : 'border-white'
  const ink = muted ? 'text-white/90' : 'text-white'
  return (
    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 ${ring}`}>
      {kind === 'pending' ? (
        <svg className={`h-[18px] w-[18px] ${ink}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 16l-4-4 4-4M17 8l4 4-4 4M3 12h18" />
        </svg>
      ) : kind === 'done' ? (
        <svg className={`h-5 w-5 ${ink}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className={`h-5 w-5 ${ink}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 14L4 9l5-5M15 10h7" />
        </svg>
      )}
    </span>
  )
}

export function WechatTransferBubbleFace({
  status,
  amountYuan,
  perspective = 'incoming',
}: {
  status: 'pending' | 'accepted' | 'returned'
  amountYuan: number | null
  perspective?: 'incoming' | 'outgoing'
}) {
  const pending = status === 'pending'
  const accepted = status === 'accepted'
  const outgoing = perspective === 'outgoing'
  // 对齐糯叽机「古早微信」写实转账：待收亮橙 / 已收浅橙 / 退还灰
  const bg = pending ? '#FF9709' : accepted ? '#F7D0A2' : '#D4D4D4'

  const amount =
    amountYuan != null && Number.isFinite(amountYuan)
      ? `¥${amountYuan.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : '¥—'

  let statusLabel = '请收款'
  if (pending) {
    statusLabel = outgoing ? '待朋友确认收钱' : '请收款'
  } else if (accepted) {
    statusLabel = outgoing ? '已被接收' : '已收款'
  } else {
    statusLabel = outgoing ? '已被退还' : '已退还'
  }

  const iconKind = pending ? 'pending' : accepted ? 'done' : 'returned'
  const onOrange = pending

  return (
    <div
      data-wx-msg-kind="transfer"
      data-wx-special-card
      data-wx-special-status={status}
      className="relative w-[min(230px,72vw)] max-w-full shrink-0 select-none overflow-visible rounded-[4px] shadow-sm"
      style={{ backgroundColor: bg, height: 90 }}
    >
      <WechatBubbleTail isSelf={outgoing} bubbleColor={bg} />
      {/* 底部白条：糯叽机 ::before 同款 */}
      <div
        data-wx-special-part="footer"
        className="absolute inset-x-0 bottom-0 z-[1] flex h-[22px] items-center px-3"
        style={{ backgroundColor: '#ffffff' }}
      >
        <span className="text-[11px] leading-none text-[#7f7f7f]">微信转账</span>
      </div>
      <div className="relative z-[2] flex items-center gap-3 px-3.5 pt-3.5 pb-7">
        <span data-wx-special-part="icon">
          <WechatTransferIcon kind={iconKind} muted={!onOrange} />
        </span>
        <div className="min-w-0 flex-1">
          <p
            data-wx-special-part="amount"
            className={`truncate text-[16px] font-medium tabular-nums leading-tight ${
              onOrange ? 'text-white' : 'text-white'
            }`}
          >
            {amount}
          </p>
          <p
            data-wx-special-part="label"
            className="mt-0.5 line-clamp-2 text-[12px] font-light leading-snug text-white/95"
          >
            {statusLabel}
          </p>
        </div>
      </div>
    </div>
  )
}

export function WechatDetachedQuoteReply({
  senderName,
  content,
  isSelf,
  showAvatarGutter = false,
  onClick,
}: {
  senderName: string
  content: string
  isSelf: boolean
  showAvatarGutter?: boolean
  onClick?: () => void
}) {
  const label = `"${senderName}"：${content}`
  const shell = (
    <div
      className={`max-w-[min(280px,calc(100vw-24px-24px-80px))] truncate rounded bg-[#EBEBEB] px-2.5 py-1 text-xs text-gray-500 ${
        isSelf ? 'mr-1.5' : 'ml-1.5'
      }`}
    >
      {label}
    </div>
  )

  if (isSelf) {
    return (
      <div className="mb-1 w-full max-w-full">
        <div className="mr-[24px] ml-auto flex max-w-full flex-row justify-end gap-[12px]">
          <div className="flex min-w-0 flex-col items-end">{onClick ? <button type="button" onClick={onClick} className="text-left">{shell}</button> : shell}</div>
          {showAvatarGutter ? <div className="h-10 w-10 shrink-0" aria-hidden /> : null}
        </div>
      </div>
    )
  }

  return (
    <div className="mb-1 w-full max-w-full">
      <div className="ml-[24px] mr-auto flex max-w-full flex-row gap-[12px]">
        {showAvatarGutter ? <div className="h-10 w-10 shrink-0" aria-hidden /> : null}
        <div className="flex min-w-0 flex-1 flex-col items-start">
          {onClick ? <button type="button" onClick={onClick} className="text-left">{shell}</button> : shell}
        </div>
      </div>
    </div>
  )
}
