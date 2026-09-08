import { useEffect, useMemo, type CSSProperties } from 'react'
import type { DatingStoryDanmakuVisual } from '../../../phone/apps/wechat/dating/datingStoryAppearance'
import type { DanmakuBullet } from '../../types'

type Props = {
  bullets: DanmakuBullet[]
  /** 外观面板覆盖色（rgba）；有则优先于单条 color/hue；无 visual 时仍可用 */
  colorOverride?: string
  /** 完整弹幕外观（字号 / 字体 / 底条 / 发光 / 阴影） */
  visual?: DatingStoryDanmakuVisual | null
  /** 循环滚动，默认 true */
  loop?: boolean
}

function hexToRgba(hex: string, opacity: number): string {
  const h = hex.trim().replace(/^#/, '')
  if (h.length !== 6) return `rgba(0,0,0,${opacity})`
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  if (![r, g, b].every((x) => Number.isFinite(x))) return `rgba(0,0,0,${opacity})`
  return `rgba(${r},${g},${b},${opacity})`
}

function buildTextShadow(visual: DatingStoryDanmakuVisual | null | undefined): string | undefined {
  if (!visual) return '0 1px 4px rgba(0,0,0,0.55)'
  const parts: string[] = []
  if (visual.glowEnabled && visual.glowSize > 0) {
    const glow = hexToRgba(visual.glowColor, 0.85)
    const s = visual.glowSize
    parts.push(`0 0 ${s}px ${glow}`, `0 0 ${Math.max(1, Math.round(s * 1.6))}px ${glow}`)
  }
  if (visual.shadowEnabled) {
    parts.push(
      `${visual.shadowOffsetX}px ${visual.shadowOffsetY}px ${visual.shadowBlur}px ${hexToRgba(visual.shadowColor, 0.7)}`,
    )
  }
  return parts.length ? parts.join(', ') : undefined
}

/** CSS 动画弹幕层：默认循环播放，避免滚一次就没了 */
export function DanmakuOverlay({ bullets, colorOverride, visual, loop = true }: Props) {
  const visible = useMemo(() => bullets.slice(-36), [bullets])

  useEffect(() => {
    const family = visual?.fontFamily?.trim()
    const dataUrl = visual?.fontDataUrl?.trim()
    if (!family || !dataUrl || !dataUrl.startsWith('data:')) return
    let cancelled = false
    let face: FontFace | null = null
    try {
      face = new FontFace(family, `url(${dataUrl})`)
      void face.load().then((loaded) => {
        if (cancelled) return
        document.fonts.add(loaded)
      })
    } catch {
      /* ignore bad font */
    }
    return () => {
      cancelled = true
    }
  }, [visual?.fontFamily, visual?.fontDataUrl])

  if (!visible.length) return null

  const fontSize = visual?.fontSize ?? 13
  const fontFamily =
    visual?.fontFamily && visual?.fontDataUrl
      ? `"${visual.fontFamily}", system-ui, sans-serif`
      : undefined
  const textShadow = buildTextShadow(visual)
  const barEnabled = !!visual?.barEnabled
  const barBg = visual
    ? hexToRgba(visual.barColor, visual.barOpacity)
    : undefined

  return (
    <>
      <style>{`
        @keyframes sr-danmaku-fly {
          from { transform: translate3d(110vw, 0, 0); }
          to { transform: translate3d(-125%, 0, 0); }
        }
      `}</style>
      <div
        className="pointer-events-none absolute inset-x-0 top-[var(--sr-header-h)] z-[30] h-[32%] overflow-hidden"
        aria-hidden
      >
        {visible.map((b) => {
          const dur = Math.max(4, Number(b.durationSec) || 10)
          const delay = Math.max(0, Number(b.startDelaySec) || 0)
          const color =
            visual?.colorRgba ||
            colorOverride?.trim() ||
            b.color?.trim() ||
            `hsl(${b.hue} 65% 72%)`
          const style: CSSProperties = {
            top: `${Math.max(2, Math.min(88, b.top))}%`,
            color,
            fontSize: `${fontSize}px`,
            fontFamily,
            textShadow,
            animation: `sr-danmaku-fly ${dur}s linear ${delay}s ${loop ? 'infinite' : '1'} both`,
            ...(barEnabled
              ? {
                  background: barBg,
                  padding: '2px 8px',
                  borderRadius: 999,
                  lineHeight: 1.35,
                }
              : null),
          }
          return (
            <span
              key={b.id}
              className="absolute left-0 inline-block max-w-[92vw] truncate whitespace-nowrap font-medium tracking-wide"
              style={style}
            >
              {b.text}
            </span>
          )
        })}
      </div>
    </>
  )
}
