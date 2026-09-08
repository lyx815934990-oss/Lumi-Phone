/** 纸片人色度抠图 / 立绘参数 */

export type PaperDollChromaSettings = {
  /** 开启色度抠图（非透明底立绘） */
  enabled: boolean
  /** 抠色 #rrggbb */
  keyHex: string
  /** 相似度：越大抠得越多（0–1） */
  similarity: number
  /** 边缘柔和（0–1） */
  softness: number
  /** 溢色抑制，减轻绿/蓝边（0–1） */
  spill: number
  /** 身高缩放 */
  heightScale: number
}

export const PAPER_DOLL_HEIGHT_SCALE_MIN = 0.6
export const PAPER_DOLL_HEIGHT_SCALE_MAX = 2.2
export const PAPER_DOLL_HEIGHT_SCALE_DEFAULT = 1

export const PAPER_DOLL_CHROMA_DEFAULT: PaperDollChromaSettings = {
  enabled: false,
  keyHex: '#00e676',
  similarity: 0.32,
  softness: 0.12,
  spill: 0.4,
  heightScale: PAPER_DOLL_HEIGHT_SCALE_DEFAULT,
}

export type PaperDollChromaPreset = {
  id: string
  label: string
  keyHex: string
  similarity: number
  softness: number
  spill: number
}

export const PAPER_DOLL_CHROMA_PRESETS: PaperDollChromaPreset[] = [
  { id: 'green', label: '绿幕', keyHex: '#00ff00', similarity: 0.3, softness: 0.1, spill: 0.45 },
  { id: 'blue', label: '蓝幕', keyHex: '#0088ff', similarity: 0.3, softness: 0.1, spill: 0.4 },
  { id: 'white', label: '白底', keyHex: '#ffffff', similarity: 0.16, softness: 0.08, spill: 0.15 },
  { id: 'black', label: '黑底', keyHex: '#000000', similarity: 0.22, softness: 0.1, spill: 0.1 },
  { id: 'gray', label: '灰底', keyHex: '#c0c0c0', similarity: 0.18, softness: 0.09, spill: 0.12 },
]

export function clamp01(n: number, fallback: number): number {
  if (!Number.isFinite(n)) return fallback
  return Math.max(0, Math.min(1, n))
}

export function normalizeKeyHex(raw: string | undefined, fallback = PAPER_DOLL_CHROMA_DEFAULT.keyHex): string {
  const t = (raw || '').trim()
  if (/^#[0-9a-fA-F]{6}$/.test(t)) return t.toLowerCase()
  if (/^[0-9a-fA-F]{6}$/.test(t)) return `#${t.toLowerCase()}`
  return fallback
}

export function keyHexToRgb01(hex: string): [number, number, number] {
  const h = normalizeKeyHex(hex).slice(1)
  return [
    Number.parseInt(h.slice(0, 2), 16) / 255,
    Number.parseInt(h.slice(2, 4), 16) / 255,
    Number.parseInt(h.slice(4, 6), 16) / 255,
  ]
}

export function rgb01ToKeyHex(r: number, g: number, b: number): string {
  const to = (v: number) =>
    Math.max(0, Math.min(255, Math.round(v * 255)))
      .toString(16)
      .padStart(2, '0')
  return `#${to(r)}${to(g)}${to(b)}`
}

export function clampPaperDollChroma(raw: Partial<PaperDollChromaSettings> | null | undefined): PaperDollChromaSettings {
  const d = PAPER_DOLL_CHROMA_DEFAULT
  const height = Number.isFinite(raw?.heightScale)
    ? Math.max(
        PAPER_DOLL_HEIGHT_SCALE_MIN,
        Math.min(PAPER_DOLL_HEIGHT_SCALE_MAX, raw!.heightScale as number),
      )
    : d.heightScale
  return {
    enabled: raw?.enabled === true,
    keyHex: normalizeKeyHex(raw?.keyHex, d.keyHex),
    similarity: clamp01(raw?.similarity ?? d.similarity, d.similarity),
    softness: clamp01(raw?.softness ?? d.softness, d.softness),
    spill: clamp01(raw?.spill ?? d.spill, d.spill),
    heightScale: height,
  }
}

/** 从贴图四角采样平均色，适合「一键取背景色」 */
export function sampleCornerAverageHex(image: CanvasImageSource, sample = 6): string | null {
  try {
    const w =
      'naturalWidth' in image && (image as HTMLImageElement).naturalWidth
        ? (image as HTMLImageElement).naturalWidth
        : 'width' in image
          ? Number((image as HTMLCanvasElement).width)
          : 0
    const h =
      'naturalHeight' in image && (image as HTMLImageElement).naturalHeight
        ? (image as HTMLImageElement).naturalHeight
        : 'height' in image
          ? Number((image as HTMLCanvasElement).height)
          : 0
    if (!w || !h) return null

    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return null
    ctx.drawImage(image, 0, 0)
    const s = Math.max(1, Math.min(sample, Math.floor(Math.min(w, h) / 4)))
    const corners: [number, number][] = [
      [0, 0],
      [w - s, 0],
      [0, h - s],
      [w - s, h - s],
    ]
    let r = 0
    let g = 0
    let b = 0
    let n = 0
    for (const [sx, sy] of corners) {
      const data = ctx.getImageData(sx, sy, s, s).data
      for (let i = 0; i < data.length; i += 4) {
        r += data[i]!
        g += data[i + 1]!
        b += data[i + 2]!
        n += 1
      }
    }
    if (!n) return null
    return rgb01ToKeyHex(r / n / 255, g / n / 255, b / n / 255)
  } catch {
    return null
  }
}

type CornerSampler = () => string | null
let cornerSampler: CornerSampler | null = null

export function registerPaperDollCornerSampler(fn: CornerSampler | null): void {
  cornerSampler = fn
}

export function samplePaperDollCornerKey(): string | null {
  try {
    return cornerSampler?.() ?? null
  } catch {
    return null
  }
}

/** 2D 预览：把色度抠图画到 canvas（与漫游 shader 算法一致） */
export function renderPaperDollChromaPreview(
  image: HTMLImageElement,
  canvas: HTMLCanvasElement,
  chroma: PaperDollChromaSettings,
  maxEdge = 720,
): void {
  const srcW = image.naturalWidth || image.width
  const srcH = image.naturalHeight || image.height
  if (!srcW || !srcH) return

  const scale = Math.min(1, maxEdge / Math.max(srcW, srcH))
  const w = Math.max(1, Math.round(srcW * scale))
  const h = Math.max(1, Math.round(srcH * scale))
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return
  ctx.clearRect(0, 0, w, h)
  ctx.drawImage(image, 0, 0, w, h)

  if (!chroma.enabled) return

  const [kr, kg, kb] = keyHexToRgb01(chroma.keyHex)
  const similarity = chroma.similarity
  const soft = Math.max(chroma.softness, 0.001)
  const spill = chroma.spill
  const edge0 = Math.max(0, similarity - soft)
  const edge1 = similarity + soft
  const imgData = ctx.getImageData(0, 0, w, h)
  const d = imgData.data

  const smoothstep = (e0: number, e1: number, x: number) => {
    const t = Math.max(0, Math.min(1, (x - e0) / Math.max(1e-6, e1 - e0)))
    return t * t * (3 - 2 * t)
  }

  for (let i = 0; i < d.length; i += 4) {
    const r = d[i]! / 255
    const g = d[i + 1]! / 255
    const b = d[i + 2]! / 255
    const a = d[i + 3]! / 255
    const dist = Math.hypot(r - kr, g - kg, b - kb)
    const keep = smoothstep(edge0, edge1, dist)
    const alpha = keep * a
    const luma = 0.299 * r + 0.587 * g + 0.114 * b
    const prox = 1 - smoothstep(Math.max(0, similarity * 0.45), edge1, dist)
    const mix = Math.max(0, Math.min(1, spill * prox))
    d[i] = Math.round((r + (luma - r) * mix) * 255)
    d[i + 1] = Math.round((g + (luma - g) * mix) * 255)
    d[i + 2] = Math.round((b + (luma - b) * mix) * 255)
    d[i + 3] = Math.round(alpha * 255)
  }
  ctx.putImageData(imgData, 0, 0)
}

