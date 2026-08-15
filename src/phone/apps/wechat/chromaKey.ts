/** 色度抠图：取色去底，与约会立绘实验室同算法 */

export type ChromaKeyConfig = {
  enabled: boolean
  /** #RRGGBB */
  targetColor: string
  /** 0–100，越大抠得越多 */
  tolerance: number
  /** 0–100，边缘羽化 */
  edgeSoftness: number
}

export const DEFAULT_CHROMA_KEY: ChromaKeyConfig = {
  enabled: false,
  targetColor: '#00FF00',
  tolerance: 24,
  edgeSoftness: 18,
}

export const CHROMA_COLOR_PRESETS = ['#00FF00', '#0000FF', '#FFFFFF', '#000000'] as const

function clampNum(n: unknown, min: number, max: number, fallback: number): number {
  if (typeof n !== 'number' || !Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, n))
}

export function normalizeHexColor(raw: unknown, fallback = '#00FF00'): string {
  const s = String(raw ?? '')
    .trim()
    .toUpperCase()
  if (/^#[0-9A-F]{6}$/.test(s)) return s
  if (/^[0-9A-F]{6}$/.test(s)) return `#${s}`
  return fallback
}

export function normalizeChromaKey(raw: unknown): ChromaKeyConfig {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_CHROMA_KEY }
  const o = raw as Record<string, unknown>
  return {
    enabled: o.enabled === true,
    targetColor: normalizeHexColor(o.targetColor, DEFAULT_CHROMA_KEY.targetColor),
    tolerance: Math.round(clampNum(o.tolerance, 0, 100, DEFAULT_CHROMA_KEY.tolerance)),
    edgeSoftness: Math.round(
      clampNum(o.edgeSoftness, 0, 100, DEFAULT_CHROMA_KEY.edgeSoftness),
    ),
  }
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const s = normalizeHexColor(hex)
  return {
    r: Number.parseInt(s.slice(1, 3), 16),
    g: Number.parseInt(s.slice(3, 5), 16),
    b: Number.parseInt(s.slice(5, 7), 16),
  }
}

/** 就地修改 ImageData alpha */
export function applyChromaKeyToImageData(
  imageData: ImageData,
  chroma: ChromaKeyConfig,
): void {
  if (!chroma.enabled) return
  const data = imageData.data
  const target = hexToRgb(chroma.targetColor)
  const tol = Math.max(0, Math.min(100, chroma.tolerance))
  const soft = Math.max(0, Math.min(100, chroma.edgeSoftness))
  const threshold = (tol / 100) * 442
  const feather = Math.max(1, (soft / 100) * 120)

  for (let i = 0; i < data.length; i += 4) {
    const dr = data[i]! - target.r
    const dg = data[i + 1]! - target.g
    const db = data[i + 2]! - target.b
    const dist = Math.sqrt(dr * dr + dg * dg + db * db)

    if (dist <= threshold - feather) {
      data[i + 3] = 0
      continue
    }
    if (dist >= threshold + feather) continue

    const t = (dist - (threshold - feather)) / (2 * feather)
    data[i + 3] = Math.max(0, Math.min(255, Math.round(t * 255)))
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.decoding = 'async'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('抠图源图读取失败'))
    img.src = src
  })
}

/**
 * 将色度抠图结果烘焙为 PNG data URL。
 * 未启用时原样返回 source。
 */
export async function bakeChromaKeyDataUrl(
  sourceDataUrl: string,
  chroma: ChromaKeyConfig,
  opts?: { maxSide?: number },
): Promise<string> {
  const src = String(sourceDataUrl ?? '').trim()
  if (!src) return ''
  if (!chroma.enabled) return src

  const img = await loadImage(src)
  const sourceW = Math.max(1, img.naturalWidth || img.width)
  const sourceH = Math.max(1, img.naturalHeight || img.height)
  const maxSide = opts?.maxSide ?? 640
  const scale = Math.min(1, maxSide / Math.max(sourceW, sourceH))
  const drawW = Math.max(1, Math.round(sourceW * scale))
  const drawH = Math.max(1, Math.round(sourceH * scale))

  const canvas = document.createElement('canvas')
  canvas.width = drawW
  canvas.height = drawH
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return src
  ctx.clearRect(0, 0, drawW, drawH)
  ctx.drawImage(img, 0, 0, drawW, drawH)
  const imageData = ctx.getImageData(0, 0, drawW, drawH)
  applyChromaKeyToImageData(imageData, chroma)
  ctx.putImageData(imageData, 0, 0)
  return canvas.toDataURL('image/png')
}

/** 从已绘制的 canvas 坐标取色（相对 canvas 显示尺寸） */
export function sampleCanvasHex(
  canvas: HTMLCanvasElement,
  clientX: number,
  clientY: number,
): string | null {
  const rect = canvas.getBoundingClientRect()
  if (rect.width <= 0 || rect.height <= 0) return null
  const x = Math.floor(((clientX - rect.left) / rect.width) * canvas.width)
  const y = Math.floor(((clientY - rect.top) / rect.height) * canvas.height)
  if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) return null
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return null
  const pixel = ctx.getImageData(x, y, 1, 1).data
  const r = pixel[0]!.toString(16).padStart(2, '0')
  const g = pixel[1]!.toString(16).padStart(2, '0')
  const b = pixel[2]!.toString(16).padStart(2, '0')
  return `#${r}${g}${b}`.toUpperCase()
}

type EyeDropperLike = { open: () => Promise<{ sRGBHex: string }> }
type WindowWithEyeDropper = Window & { EyeDropper?: new () => EyeDropperLike }

export async function pickColorWithEyeDropper(): Promise<string | null> {
  const win = window as WindowWithEyeDropper
  if (!win.EyeDropper) return null
  try {
    const eyeDropper = new win.EyeDropper()
    const result = await eyeDropper.open()
    if (result?.sRGBHex) return normalizeHexColor(result.sRGBHex)
  } catch {
    // 用户取消
  }
  return null
}

export function supportsEyeDropper(): boolean {
  return typeof window !== 'undefined' && Boolean((window as WindowWithEyeDropper).EyeDropper)
}
