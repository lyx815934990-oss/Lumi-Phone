/** 文字气泡九宫格拉伸框：贴合气泡周长，随宽高自动伸缩 */

import type { CSSProperties } from 'react'
import {
  DEFAULT_CHROMA_KEY,
  normalizeChromaKey,
  type ChromaKeyConfig,
} from './chromaKey'

export type BubbleFrameEdgeMode = 'stretch' | 'repeat' | 'round'

export type BubbleFrame = {
  /** 实际用于 border-image 的图（抠图烘焙后） */
  imageDataUrl: string
  /** 上传原图；抠图参数改动时从此重新烘焙。空则等同 imageDataUrl */
  sourceImageDataUrl: string
  /** 色度抠图参数 */
  chromaKey: ChromaKeyConfig
  /** 相对原图像素的切片（四角不拉伸，四边与中心按模式伸缩） */
  sliceTop: number
  sliceRight: number
  sliceBottom: number
  sliceLeft: number
  /** 实际边框厚度 */
  borderWidthPx: number
  /** 框相对气泡外扩 */
  outsetPx: number
  /** 中间切片是否填充（整张装饰泡） */
  fillCenter: boolean
  opacityPct: number
  edgeMode: BubbleFrameEdgeMode
}

export type BubbleFramesBySide = {
  self: BubbleFrame | null
  other: BubbleFrame | null
}

/** 气泡底色层 z-index（最底；边框/贴纸/文字都在其上） */
export const BUBBLE_FACE_Z = 0
/** 图层：气泡底(0) < 边框条(1，可盖住气泡边缘) < 边贴纸(2) < 文字(3) */
export const BUBBLE_FRAME_Z = 1

export const MAX_BUBBLE_FRAME_DATA_URL_LEN = 900_000
const FRAME_MAX_SIDE = 640

function clampNum(n: unknown, min: number, max: number, fallback: number): number {
  if (typeof n !== 'number' || !Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, n))
}

export function emptyBubbleFrames(): BubbleFramesBySide {
  return { self: null, other: null }
}

export function frameSourceUrl(f: BubbleFrame): string {
  const src = typeof f.sourceImageDataUrl === 'string' ? f.sourceImageDataUrl.trim() : ''
  return src || f.imageDataUrl
}

export function defaultBubbleFrame(imageDataUrl = ''): BubbleFrame {
  return {
    imageDataUrl,
    sourceImageDataUrl: imageDataUrl,
    chromaKey: { ...DEFAULT_CHROMA_KEY },
    sliceTop: 32,
    sliceRight: 32,
    sliceBottom: 32,
    sliceLeft: 32,
    borderWidthPx: 16,
    /** 在「厚度已在气泡外」之外再多探出的量 */
    outsetPx: 0,
    /** 默认 true：猫耳等整框装饰的中间轮廓会画在底色之上；false 仅四边条 */
    fillCenter: true,
    opacityPct: 100,
    edgeMode: 'stretch',
  }
}

/** 切片不得超过原图对应边一半，否则九宫格中间塌掉会显示异常 */
export function clampBubbleFrameSlicesToImage(
  frame: BubbleFrame,
  imgW: number,
  imgH: number,
): BubbleFrame {
  const ww = Math.max(2, Math.round(imgW))
  const hh = Math.max(2, Math.round(imgH))
  const maxX = Math.max(1, Math.floor(ww / 2) - 1)
  const maxY = Math.max(1, Math.floor(hh / 2) - 1)
  return {
    ...frame,
    sliceTop: Math.min(maxY, Math.max(1, Math.round(frame.sliceTop))),
    sliceRight: Math.min(maxX, Math.max(1, Math.round(frame.sliceRight))),
    sliceBottom: Math.min(maxY, Math.max(1, Math.round(frame.sliceBottom))),
    sliceLeft: Math.min(maxX, Math.max(1, Math.round(frame.sliceLeft))),
  }
}

/** 按原图尺寸给一版可用的默认切片（约 22%，且不超过边长 1/3） */
export function defaultSliceFromImageSize(w: number, h: number): Pick<
  BubbleFrame,
  'sliceTop' | 'sliceRight' | 'sliceBottom' | 'sliceLeft' | 'borderWidthPx'
> {
  const ww = Math.max(1, Math.round(w))
  const hh = Math.max(1, Math.round(h))
  const sliceX = Math.max(8, Math.min(Math.floor(ww / 3), Math.round(ww * 0.22)))
  const sliceY = Math.max(8, Math.min(Math.floor(hh / 3), Math.round(hh * 0.22)))
  const borderWidthPx = Math.max(8, Math.min(28, Math.round(Math.min(sliceX, sliceY) * 0.55)))
  return {
    sliceTop: sliceY,
    sliceRight: sliceX,
    sliceBottom: sliceY,
    sliceLeft: sliceX,
    borderWidthPx,
  }
}

export function normalizeBubbleFrame(raw: unknown): BubbleFrame | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const imageDataUrl = typeof o.imageDataUrl === 'string' ? o.imageDataUrl.trim() : ''
  if (!imageDataUrl) return null
  const sourceRaw =
    typeof o.sourceImageDataUrl === 'string' ? o.sourceImageDataUrl.trim() : ''
  const edgeMode: BubbleFrameEdgeMode =
    o.edgeMode === 'repeat' || o.edgeMode === 'round' ? o.edgeMode : 'stretch'
  const opacityRaw =
    typeof o.opacityPct === 'number'
      ? o.opacityPct
      : typeof o.opacity === 'number'
        ? o.opacity <= 1
          ? o.opacity * 100
          : o.opacity
        : 100
  return {
    imageDataUrl,
    sourceImageDataUrl: sourceRaw || imageDataUrl,
    chromaKey: normalizeChromaKey(o.chromaKey),
    sliceTop: Math.round(clampNum(o.sliceTop, 1, 512, 32)),
    sliceRight: Math.round(clampNum(o.sliceRight, 1, 512, 32)),
    sliceBottom: Math.round(clampNum(o.sliceBottom, 1, 512, 32)),
    sliceLeft: Math.round(clampNum(o.sliceLeft, 1, 512, 32)),
    borderWidthPx: Math.round(clampNum(o.borderWidthPx, 1, 64, 16)),
    outsetPx: Math.round(clampNum(o.outsetPx, 0, 48, 0)),
    // 默认开启中间绘制，避免整框装饰（猫耳等）被「挖空」看起来像被底色截断
    fillCenter: o.fillCenter !== false,
    opacityPct: Math.round(clampNum(opacityRaw, 0, 100, 100)),
    edgeMode,
  }
}

export function normalizeBubbleFrames(raw: unknown): BubbleFramesBySide {
  if (!raw || typeof raw !== 'object') return emptyBubbleFrames()
  const o = raw as Record<string, unknown>
  return {
    self: normalizeBubbleFrame(o.self),
    other: normalizeBubbleFrame(o.other),
  }
}

function cssUrl(dataUrl: string): string {
  return `url("${dataUrl.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}")`
}

export function bubbleFrameSliceValue(f: BubbleFrame): string {
  const base = `${f.sliceTop} ${f.sliceRight} ${f.sliceBottom} ${f.sliceLeft}`
  return f.fillCenter ? `${base} fill` : base
}

/**
 * 边框条叠在气泡条之上（可盖住气泡边缘），outset 再额外探出气泡外。
 * 父级须 overflow:visible。图层：气泡底 < 边框 < 贴纸 < 文字。
 *
 * inset 只用 -outset（不要再减厚度）：厚度画在盒内侧，才能盖住气泡条。
 * 勿写 `inset: auto`（会清掉定位，空盒 + border-image 会揉成一团）。
 */
export function bubbleFrameOverlayStyle(f: BubbleFrame): CSSProperties {
  const w = Math.max(1, Math.round(f.borderWidthPx))
  const extra = Math.max(0, Math.round(f.outsetPx))
  const opacity = Math.min(1, Math.max(0, (f.opacityPct ?? 100) / 100))
  const slice = bubbleFrameSliceValue(f)
  return {
    position: 'absolute',
    display: 'block',
    top: -extra,
    right: -extra,
    bottom: -extra,
    left: -extra,
    width: 'auto',
    height: 'auto',
    zIndex: BUBBLE_FRAME_Z,
    pointerEvents: 'none',
    boxSizing: 'border-box',
    borderStyle: 'solid',
    borderColor: 'transparent',
    borderWidth: w,
    // 简写比拆属性更稳，避免部分引擎丢 slice
    borderImage: `${cssUrl(f.imageDataUrl)} ${slice} / ${w}px / 0 ${f.edgeMode}`,
    opacity,
    margin: 0,
    padding: 0,
    background: 'transparent',
    overflow: 'visible',
  }
}

/** 导出 scopedCss：依赖 DOM 内 `[data-wx-bubble-frame]` */
export function bubbleFrameScopedCss(side: 'self' | 'other', frame: BubbleFrame | null): string {
  const f = frame && frame.imageDataUrl.trim() ? frame : null
  if (!f) return ''
  const sel = `[data-wx-bubble-side="${side}"] [data-wx-bubble-frame], [data-wx-bubble-side="${side}"][data-wx-bubble-content] > [data-wx-bubble-frame]`
  const w = Math.max(1, Math.round(f.borderWidthPx))
  const extra = Math.max(0, Math.round(f.outsetPx))
  const opacity = Math.min(1, Math.max(0, (f.opacityPct ?? 100) / 100))
  const slice = bubbleFrameSliceValue(f)
  return [
    `${sel} {`,
    `  position: absolute !important;`,
    `  display: block !important;`,
    `  top: -${extra}px !important;`,
    `  right: -${extra}px !important;`,
    `  bottom: -${extra}px !important;`,
    `  left: -${extra}px !important;`,
    `  width: auto !important;`,
    `  height: auto !important;`,
    `  z-index: ${BUBBLE_FRAME_Z} !important;`,
    `  pointer-events: none !important;`,
    `  box-sizing: border-box !important;`,
    `  border-style: solid !important;`,
    `  border-color: transparent !important;`,
    `  border-width: ${w}px !important;`,
    `  border-image: ${cssUrl(f.imageDataUrl)} ${slice} / ${w}px / 0 ${f.edgeMode} !important;`,
    `  opacity: ${Number(opacity.toFixed(3))} !important;`,
    `  margin: 0 !important;`,
    `  padding: 0 !important;`,
    `  background: transparent !important;`,
    `  overflow: visible !important;`,
    `}`,
  ].join('\n')
}

export function BubbleFrameLayer({ frame }: { frame: BubbleFrame | null | undefined }) {
  const f = frame && frame.imageDataUrl.trim() ? frame : null
  if (!f) return null
  return (
    <div
      data-wx-bubble-frame=""
      aria-hidden
      className="pointer-events-none overflow-visible"
      style={bubbleFrameOverlayStyle(f)}
    />
  )
}

/**
 * 气泡底色/底图专用层：永远在最底，避免底色与边框抢同一绘制层把框盖住。
 */
export function BubbleFaceLayer({
  style,
  className = '',
}: {
  style?: CSSProperties
  className?: string
}) {
  return (
    <div
      data-wx-bubble-face=""
      aria-hidden
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`.trim()}
      style={{ zIndex: BUBBLE_FACE_Z, ...style }}
    />
  )
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('读取图片失败'))
    reader.readAsDataURL(file)
  })
}

/** 框图压缩：保留较大分辨率与透明，控制气泡包体积 */
export async function compressBubbleFrameDataUrl(src: string): Promise<{
  dataUrl: string
  width: number
  height: number
}> {
  if (!src.trim()) return { dataUrl: '', width: 0, height: 0 }
  const img = new Image()
  img.decoding = 'async'
  img.src = src
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = () => reject(new Error('气泡框图片读取失败'))
  })
  const w = img.naturalWidth || img.width
  const h = img.naturalHeight || img.height
  if (!w || !h) return { dataUrl: src, width: 0, height: 0 }

  const scale = Math.min(1, FRAME_MAX_SIDE / Math.max(w, h))
  const tw = Math.max(1, Math.round(w * scale))
  const th = Math.max(1, Math.round(h * scale))
  const canvas = document.createElement('canvas')
  canvas.width = tw
  canvas.height = th
  const ctx = canvas.getContext('2d')
  if (!ctx) return { dataUrl: src, width: w, height: h }
  ctx.clearRect(0, 0, tw, th)
  ctx.drawImage(img, 0, 0, tw, th)

  let best = canvas.toDataURL('image/png')
  if (best.length > MAX_BUBBLE_FRAME_DATA_URL_LEN) {
    for (const q of [0.92, 0.85, 0.75, 0.65]) {
      const jpeg = canvas.toDataURL('image/jpeg', q)
      if (jpeg.length < best.length) best = jpeg
      if (jpeg.length <= MAX_BUBBLE_FRAME_DATA_URL_LEN) break
    }
  }
  return { dataUrl: best, width: tw, height: th }
}

export async function readAndCompressBubbleFrame(file: File): Promise<{
  dataUrl: string
  width: number
  height: number
}> {
  if (!file.type.startsWith('image/')) throw new Error('请选择图片文件')
  const raw = await readFileAsDataUrl(file)
  return compressBubbleFrameDataUrl(raw)
}
