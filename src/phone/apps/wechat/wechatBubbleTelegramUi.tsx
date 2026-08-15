/** Telegram 气泡内嵌时间与双勾 UI */

import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { PhoneMixedLatinNumText } from '../../phoneMixedLatinNumText'
import { opaqueCssColorForTail } from './wechatBubbleWechatUi'

export function formatTelegramBubbleTime(tsMs: number): string {
  const d = new Date(tsMs)
  if (!Number.isFinite(d.getTime())) return '00:00'
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

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

export type TelegramBubbleTailProps = {
  isSelf: boolean
  bubbleColor: string
  /** 基准宽约 10、高约 12 */
  lengthPx?: number
  anchor?: 'side' | 'bottom'
  topPx?: number
  offsetXPct?: number
  matchBubbleSurface?: boolean
  glassBlurPx?: number
  glassSaturatePct?: number
}

export function TelegramBubbleTail({
  isSelf,
  bubbleColor,
  lengthPx,
  anchor,
  topPx,
  offsetXPct,
  matchBubbleSurface,
  glassBlurPx,
  glassSaturatePct,
}: TelegramBubbleTailProps) {
  const hostRef = useRef<HTMLSpanElement | null>(null)
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

  const len = Math.min(28, Math.max(6, lengthPx ?? css.lengthPx ?? 10))
  const scale = len / 10
  const bw = Math.round(10 * scale)
  const bh = Math.round(12 * scale)
  const isBottom = (anchor ?? css.anchor ?? 'bottom') === 'bottom'
  const y = topPx ?? css.topPx ?? 14
  const xPct = Math.min(100, Math.max(0, offsetXPct ?? css.offsetXPct ?? 0))
  const matchSurface =
    matchBubbleSurface === true ||
    css.matchSurface === true ||
    (typeof glassBlurPx === 'number' && glassBlurPx > 0) ||
    (typeof css.glassBlurPx === 'number' && css.glassBlurPx > 0)
  const surface = (css.surfaceBg || '').trim() || bubbleColor
  const fill = matchSurface ? surface : opaqueCssColorForTail(bubbleColor)
  const blur = Math.min(40, Math.max(0, Math.round(glassBlurPx ?? css.glassBlurPx ?? 0)))
  const sat = Math.min(200, Math.max(100, Math.round(glassSaturatePct ?? css.glassSaturatePct ?? 140)))
  const glassFilter =
    matchSurface && blur > 0 ? `blur(${blur}px) saturate(${sat}%)` : undefined

  const pos: CSSProperties = isBottom
    ? {
        bottom: 0,
        ...(isSelf
          ? { right: `calc(${xPct}% - ${bw / 2}px)` }
          : { left: `calc(${xPct}% - ${bw / 2}px)` }),
      }
    : {
        top: y,
        ...(isSelf ? { right: -bw + 2 } : { left: -bw + 2 }),
      }

  const triangleStyle: CSSProperties = isBottom
    ? {
        width: 0,
        height: 0,
        borderTop: `${bh}px solid transparent`,
        borderBottom: '0 solid transparent',
        ...(isSelf
          ? { borderLeft: `${bw}px solid ${fill}` }
          : { borderRight: `${bw}px solid ${fill}` }),
        WebkitBackdropFilter: glassFilter,
        backdropFilter: glassFilter,
      }
    : {
        width: 0,
        height: 0,
        ...(isSelf
          ? {
              borderLeft: `${bh}px solid transparent`,
              borderRight: '0 solid transparent',
              borderTop: `${bw}px solid ${fill}`,
            }
          : {
              borderRight: `${bh}px solid transparent`,
              borderLeft: '0 solid transparent',
              borderTop: `${bw}px solid ${fill}`,
            }),
        WebkitBackdropFilter: glassFilter,
        backdropFilter: glassFilter,
      }

  return (
    <span
      ref={hostRef}
      aria-hidden
      data-wx-bubble-tail
      data-wx-bubble-tail-style="telegram"
      data-wx-bubble-tail-anchor={isBottom ? 'bottom' : 'side'}
      className="pointer-events-none absolute z-[3]"
      style={pos}
    >
      <span className="block" style={triangleStyle} />
    </span>
  )
}

function TelegramDoubleCheckIcon() {
  return (
    <svg className="h-4 w-4 shrink-0" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <path d="M11.5 3.5L6.5 9L4 6.5L3 7.5L6.5 11L12.5 4.5L11.5 3.5Z" />
      <path d="M15.5 3.5L10.5 9L9.75 8.25L8.75 9.25L10.5 11L16.5 4.5L15.5 3.5Z" />
    </svg>
  )
}

export function TelegramBubbleMeta({
  isSelf,
  timeLabel,
  showReadChecks = false,
}: {
  isSelf: boolean
  timeLabel: string
  showReadChecks?: boolean
}) {
  return (
    <span
      className="float-right ml-3 mt-1.5 inline-flex items-center gap-0.5 text-[11px] leading-none select-none"
      style={{ color: isSelf ? '#4CA861' : '#A1AAB3' }}
      aria-hidden
    >
      <PhoneMixedLatinNumText text={timeLabel} />
      {isSelf && showReadChecks ? <TelegramDoubleCheckIcon /> : null}
    </span>
  )
}

export function telegramBubbleCornerRadius(isSelf: boolean, radiusPx: number, showTail: boolean): string {
  if (!showTail) return `${radiusPx}px`
  if (isSelf) return `${radiusPx}px ${radiusPx}px 0 ${radiusPx}px`
  return `${radiusPx}px ${radiusPx}px ${radiusPx}px 0`
}
