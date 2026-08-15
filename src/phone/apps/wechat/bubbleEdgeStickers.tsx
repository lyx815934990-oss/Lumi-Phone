/** 文字气泡四边贴纸：沿边百分比定位，气泡长短变化时位置跟着走 */

import type { CSSProperties } from 'react'

export type BubbleEdge = 'top' | 'right' | 'bottom' | 'left'

export type BubbleEdgeSticker = {
  id: string
  edge: BubbleEdge
  /** 0–100，沿边从起点到终点（顶/底：左→右；左/右：上→下） */
  alongPct: number
  sizePx: number
  /** 沿法向外偏；正值半挂边外 */
  outsetPx: number
  /** 倾斜角度（度，顺时针为正） */
  rotateDeg: number
  /** 不透明度 0–100 */
  opacityPct: number
  imageDataUrl: string
}

export type BubbleEdgeStickersBySide = {
  self: BubbleEdgeSticker[]
  other: BubbleEdgeSticker[]
}

export const MAX_BUBBLE_EDGE_STICKERS_PER_SIDE = 8

/** 图层：气泡底(0) < 贴纸(2) < 文字(3) */
export const BUBBLE_EDGE_STICKER_Z = 2
export const BUBBLE_EDGE_TEXT_Z = 3

export function emptyBubbleEdgeStickers(): BubbleEdgeStickersBySide {
  return { self: [], other: [] }
}

export function newBubbleEdgeStickerId(): string {
  return `bes-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function clampNum(n: unknown, min: number, max: number, fallback: number): number {
  if (typeof n !== 'number' || !Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, n))
}

function normalizeOne(raw: unknown): BubbleEdgeSticker | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const edge =
    o.edge === 'top' || o.edge === 'right' || o.edge === 'bottom' || o.edge === 'left'
      ? o.edge
      : null
  const imageDataUrl = typeof o.imageDataUrl === 'string' ? o.imageDataUrl.trim() : ''
  if (!edge || !imageDataUrl) return null
  const id =
    typeof o.id === 'string' && o.id.trim() ? o.id.trim() : newBubbleEdgeStickerId()
  const opacityRaw =
    typeof o.opacityPct === 'number'
      ? o.opacityPct
      : typeof o.opacity === 'number'
        ? o.opacity <= 1
          ? o.opacity * 100
          : o.opacity
        : 100
  return {
    id,
    edge,
    alongPct: Math.round(clampNum(o.alongPct, 0, 100, 50)),
    sizePx: Math.round(clampNum(o.sizePx, 8, 96, 24)),
    outsetPx: Math.round(clampNum(o.outsetPx, -24, 48, 0)),
    rotateDeg: Math.round(clampNum(o.rotateDeg ?? o.rotationDeg, -180, 180, 0)),
    opacityPct: Math.round(clampNum(opacityRaw, 0, 100, 100)),
    imageDataUrl,
  }
}

export function normalizeBubbleEdgeStickerList(raw: unknown): BubbleEdgeSticker[] {
  if (!Array.isArray(raw)) return []
  const out: BubbleEdgeSticker[] = []
  for (const item of raw) {
    const s = normalizeOne(item)
    if (!s) continue
    out.push(s)
    if (out.length >= MAX_BUBBLE_EDGE_STICKERS_PER_SIDE) break
  }
  return out
}

export function normalizeBubbleEdgeStickers(raw: unknown): BubbleEdgeStickersBySide {
  if (!raw || typeof raw !== 'object') return emptyBubbleEdgeStickers()
  const o = raw as Record<string, unknown>
  return {
    self: normalizeBubbleEdgeStickerList(o.self),
    other: normalizeBubbleEdgeStickerList(o.other),
  }
}

function edgeAnchorTransform(edge: BubbleEdge, rotateDeg: number): string {
  const rot = `rotate(${rotateDeg}deg)`
  switch (edge) {
    case 'top':
      return `translate(-50%, -50%) ${rot}`
    case 'bottom':
      return `translate(-50%, 50%) ${rot}`
    case 'left':
      return `translate(-50%, -50%) ${rot}`
    case 'right':
      return `translate(50%, -50%) ${rot}`
  }
}

export function bubbleEdgeStickerStyle(s: BubbleEdgeSticker): CSSProperties {
  const along = Math.min(100, Math.max(0, s.alongPct))
  const size = Math.max(8, Math.round(s.sizePx))
  const outset = Math.round(s.outsetPx)
  const rotateDeg = Math.round(s.rotateDeg ?? 0)
  const opacity = Math.min(1, Math.max(0, (s.opacityPct ?? 100) / 100))
  const base: CSSProperties = {
    position: 'absolute',
    width: size,
    height: size,
    maxWidth: 'none',
    maxHeight: 'none',
    objectFit: 'contain',
    pointerEvents: 'none',
    zIndex: BUBBLE_EDGE_STICKER_Z,
    margin: 0,
    opacity,
    transform: edgeAnchorTransform(s.edge, rotateDeg),
  }
  switch (s.edge) {
    case 'top':
      return { ...base, left: `${along}%`, top: -outset }
    case 'bottom':
      return { ...base, left: `${along}%`, bottom: -outset }
    case 'left':
      return { ...base, top: `${along}%`, left: -outset }
    case 'right':
      return { ...base, top: `${along}%`, right: -outset }
  }
}

/**
 * 挂在 `[data-wx-bubble-content]` **内部**：
 * 气泡底色 < 本层贴纸 < 文字（文字需 relative z 更高）。
 * 父级须 `overflow: visible`，贴纸才能完整探出边外。
 */
export function BubbleEdgeStickers({ stickers }: { stickers: readonly BubbleEdgeSticker[] }) {
  const list = stickers.filter((s) => s.imageDataUrl.trim())
  if (!list.length) return null
  return (
    <div
      data-wx-bubble-edge-stickers
      className="pointer-events-none absolute inset-0 overflow-visible"
      style={{ zIndex: BUBBLE_EDGE_STICKER_Z }}
      aria-hidden
    >
      {list.map((s) => (
        <img
          key={s.id}
          data-wx-bubble-edge-sticker=""
          data-edge={s.edge}
          data-sticker-id={s.id}
          src={s.imageDataUrl}
          alt=""
          draggable={false}
          style={bubbleEdgeStickerStyle(s)}
        />
      ))}
    </div>
  )
}
