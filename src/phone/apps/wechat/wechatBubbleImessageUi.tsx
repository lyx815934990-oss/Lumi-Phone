/** iMessage 气泡底角尾巴（透明底 inline SVG · 任意壁纸/渐变均可透出） */

import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { opaqueCssColorForTail } from './wechatBubbleWechatUi'

/** 组内末条：尾巴一侧底角为 0，与 SVG 无缝衔接 */
export function imessageBubbleCornerRadius(isSelf: boolean, radiusPx: number, showTail: boolean): string {
  const r = `${radiusPx}px`
  if (!showTail) return r
  if (isSelf) return `${r} ${r} 0 ${r}`
  return `${r} ${r} ${r} 0`
}

const SELF_TAIL_PATH = 'M0,0 C0,10 3,19 10,20 L0,20 Z'
const OTHER_TAIL_PATH = 'M10,0 C10,10 7,19 0,20 L10,20 Z'

type CssTail = {
  lengthPx?: number
  topPx?: number
  offsetXPct?: number
  anchor?: 'side' | 'bottom'
  matchSurface?: boolean
  surfaceBg?: string
  glassBlurPx?: number
  glassSaturatePct?: number
}

function readCss(el: Element | null): CssTail {
  if (!el || !(el instanceof HTMLElement)) return {}
  const cs = getComputedStyle(el)
  const num = (name: string) => {
    const raw = cs.getPropertyValue(name).trim()
    if (!raw) return undefined
    const n = Number.parseFloat(raw)
    return Number.isFinite(n) ? n : undefined
  }
  const anchorRaw = cs.getPropertyValue('--wx-bubble-tail-anchor').trim()
  const matchRaw = cs.getPropertyValue('--wx-bubble-tail-match-surface').trim()
  const surfaceBg = cs.getPropertyValue('--wx-bubble-tail-bg').trim()
  return {
    lengthPx: num('--wx-bubble-tail-length'),
    topPx: num('--wx-bubble-tail-offset-y'),
    offsetXPct: num('--wx-bubble-tail-offset-x-pct'),
    anchor: anchorRaw === 'bottom' ? 'bottom' : anchorRaw === 'side' ? 'side' : undefined,
    matchSurface: matchRaw === '1' || matchRaw === 'true',
    surfaceBg: surfaceBg || undefined,
    glassBlurPx: num('--wx-bubble-tail-glass-blur'),
    glassSaturatePct: num('--wx-bubble-tail-glass-saturate'),
  }
}

function hasWorkshopTailCss(
  css: CssTail,
  props: {
    lengthPx?: number
    anchor?: 'side' | 'bottom'
    topPx?: number
    offsetXPct?: number
    matchBubbleSurface?: boolean
    glassBlurPx?: number
  },
): boolean {
  if (props.matchBubbleSurface === true) return true
  if (typeof props.glassBlurPx === 'number' && props.glassBlurPx > 0) return true
  if (props.lengthPx != null || props.anchor != null || props.topPx != null || props.offsetXPct != null) {
    return true
  }
  if (css.matchSurface === true) return true
  if (typeof css.glassBlurPx === 'number' && css.glassBlurPx > 0) return true
  if (css.lengthPx != null || css.anchor != null || css.topPx != null || css.offsetXPct != null) return true
  if ((css.surfaceBg || '').trim()) return true
  return false
}

export type ImessageBubbleTailProps = {
  isSelf: boolean
  bubbleColor: string
  /** 基准约 10×20；用长度缩放 */
  lengthPx?: number
  anchor?: 'side' | 'bottom'
  /** 侧边时的上下偏移 */
  topPx?: number
  /** 底部时沿底边百分比（0=靠头像侧） */
  offsetXPct?: number
  matchBubbleSurface?: boolean
  glassBlurPx?: number
  glassSaturatePct?: number
}

export function ImessageBubbleTail({
  isSelf,
  bubbleColor,
  lengthPx,
  anchor,
  topPx,
  offsetXPct,
  matchBubbleSurface,
  glassBlurPx,
  glassSaturatePct,
}: ImessageBubbleTailProps) {
  const hostRef = useRef<Element | null>(null)
  const [css, setCss] = useState<CssTail>({})

  useLayoutEffect(() => {
    const el = hostRef.current
    const host =
      el?.closest('[data-wx-bubble-content]') ??
      el?.parentElement?.querySelector?.('[data-wx-bubble-content]') ??
      el?.parentElement ??
      null
    setCss(readCss(host))
  }, [
    isSelf,
    bubbleColor,
    lengthPx,
    anchor,
    topPx,
    offsetXPct,
    matchBubbleSurface,
    glassBlurPx,
    glassSaturatePct,
  ])

  const customized = hasWorkshopTailCss(css, {
    lengthPx,
    anchor,
    topPx,
    offsetXPct,
    matchBubbleSurface,
    glassBlurPx,
  })

  /** 内置 iMessage：经典底角弯勺，不被工坊 CSS 变量改位 */
  if (!customized) {
    return (
      <svg
        ref={(node) => {
          hostRef.current = node
        }}
        aria-hidden
        data-wx-bubble-tail
        data-wx-bubble-tail-style="imessage"
        className="pointer-events-none absolute bottom-0 z-[1] fill-current"
        style={{
          color: bubbleColor,
          width: 10,
          height: 20,
          overflow: 'visible',
          ...(isSelf ? { right: 0, transform: 'translateX(9px)' } : { left: 0, transform: 'translateX(-9px)' }),
        }}
        viewBox="0 0 10 20"
      >
        <path d={isSelf ? SELF_TAIL_PATH : OTHER_TAIL_PATH} />
      </svg>
    )
  }

  const len = Math.min(28, Math.max(6, lengthPx ?? css.lengthPx ?? 10))
  const scale = len / 10
  const w = 10 * scale
  const h = 20 * scale
  const isBottom = (anchor ?? css.anchor ?? 'bottom') === 'bottom'
  const y = topPx ?? css.topPx ?? 14
  const xPct = Math.min(100, Math.max(0, offsetXPct ?? css.offsetXPct ?? 0))
  const matchSurface =
    matchBubbleSurface === true ||
    css.matchSurface === true ||
    (typeof glassBlurPx === 'number' && glassBlurPx > 0) ||
    (typeof css.glassBlurPx === 'number' && css.glassBlurPx > 0)
  const surface = (css.surfaceBg || '').trim() || bubbleColor
  const blur = Math.min(40, Math.max(0, Math.round(glassBlurPx ?? css.glassBlurPx ?? 0)))
  const sat = Math.min(200, Math.max(100, Math.round(glassSaturatePct ?? css.glassSaturatePct ?? 140)))
  const glassFilter = blur > 0 ? `blur(${blur}px) saturate(${sat}%)` : undefined
  const path = isSelf ? SELF_TAIL_PATH : OTHER_TAIL_PATH

  const pos: CSSProperties = isBottom
    ? {
        bottom: 0,
        overflow: 'visible',
        ...(isSelf
          ? { right: 0, transform: `translateX(${9 * scale}px)` }
          : { left: 0, transform: `translateX(${-9 * scale}px)` }),
        ...(xPct > 0
          ? isSelf
            ? { right: `calc(${xPct}% - ${w / 2}px)` }
            : { left: `calc(${xPct}% - ${w / 2}px)` }
          : null),
      }
    : {
        top: y,
        overflow: 'visible',
        ...(isSelf
          ? { right: -(w - 1), transform: 'rotate(-90deg)', transformOrigin: 'right center' }
          : { left: -(w - 1), transform: 'rotate(90deg)', transformOrigin: 'left center' }),
      }

  if (matchSurface) {
    return (
      <span
        ref={(node) => {
          hostRef.current = node
        }}
        aria-hidden
        data-wx-bubble-tail
        data-wx-bubble-tail-style="imessage"
        data-wx-bubble-tail-anchor={isBottom ? 'bottom' : 'side'}
        className="pointer-events-none absolute z-[3]"
        style={{ ...pos, width: w, height: h }}
      >
        <span
          className="absolute inset-0 block"
          style={{
            background: surface,
            WebkitBackdropFilter: glassFilter,
            backdropFilter: glassFilter,
            WebkitClipPath: `path(evenodd, "${path}")`,
            clipPath: `path(evenodd, "${path}")`,
          }}
        />
      </span>
    )
  }

  const fill = opaqueCssColorForTail(bubbleColor)
  return (
    <svg
      ref={(node) => {
        hostRef.current = node
      }}
      aria-hidden
      data-wx-bubble-tail
      data-wx-bubble-tail-style="imessage"
      data-wx-bubble-tail-anchor={isBottom ? 'bottom' : 'side'}
      className="pointer-events-none absolute z-[3]"
      style={{ ...pos, color: fill }}
      width={w}
      height={h}
      viewBox="0 0 10 20"
    >
      <path d={path} fill="currentColor" />
    </svg>
  )
}
