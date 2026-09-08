import { BEAD_PALETTE, nearestPaletteIndex } from './palette'
import { BEAD_EMPTY, type BeadPattern } from './types'

export type ImageToPatternMode = 'auto' | 'photo'

export type ImageToPatternOptions = {
  /** 正方形格数；指定后按照片模式缩放 */
  gridSize?: number
  mode?: ImageToPatternMode
}

export type ImageToPatternResult = {
  pattern: BeadPattern
  /** 识别方式说明 */
  recognitionLabel: string
  detectedCols: number | null
  detectedRows: number | null
}

const DEFAULT_PHOTO_GRID = 20
const GRID_SIZE_MIN = 8
const GRID_SIZE_MAX = 32

export async function imageFileToBeadPattern(
  file: File,
  options: ImageToPatternOptions = {},
): Promise<ImageToPatternResult> {
  const dataUrl = await readFileAsDataUrl(file)
  return imageDataUrlToBeadPattern(dataUrl, file.name, options)
}

export async function imageDataUrlToBeadPattern(
  dataUrl: string,
  nameHint: string,
  options: ImageToPatternOptions = {},
): Promise<ImageToPatternResult> {
  const img = await loadImage(dataUrl)
  const mode = options.mode ?? 'auto'
  const forcedSize = options.gridSize

  let gridW: number
  let gridH: number
  let recognitionLabel: string
  let detectedCols: number | null = null
  let detectedRows: number | null = null
  let chartLike = false

  if (forcedSize != null) {
    gridW = clampGrid(forcedSize)
    gridH = gridW
    recognitionLabel = `按 ${gridW}×${gridH} 格缩放`
  } else if (mode === 'photo') {
    gridW = DEFAULT_PHOTO_GRID
    gridH = DEFAULT_PHOTO_GRID
    recognitionLabel = `按照片转为 ${gridW}×${gridH}`
  } else {
    const detected = detectBeadGridSize(img)
    if (detected) {
      gridW = detected.cols
      gridH = detected.rows
      detectedCols = gridW
      detectedRows = gridH
      chartLike = true
      recognitionLabel =
        detected.mode === 'pixel'
          ? `识别为 ${gridW}×${gridH} 像素图`
          : `识别为 ${gridW}×${gridH} 拼豆图纸`
    } else {
      const suggested = suggestPhotoGridSize(img)
      gridW = suggested
      gridH = suggested
      recognitionLabel = `未检测到网格，按照片转为 ${gridW}×${gridH}`
    }
  }

  const cells = sampleImageToCells(img, gridW, gridH, chartLike)
  const { palette, remappedCells } = buildPatternPalette(cells)
  const name = nameHint.replace(/\.[^.]+$/, '').slice(0, 24) || '我的图纸'

  const pattern: BeadPattern = {
    id: `upload-${Date.now()}`,
    name,
    width: gridW,
    height: gridH,
    palette: palette.length ? palette : ['#FF6B6B'],
    cells: remappedCells,
    source: 'upload',
    authorName: '我',
    createdAt: Date.now(),
  }

  return { pattern, recognitionLabel, detectedCols, detectedRows }
}

function clampGrid(n: number): number {
  return Math.min(GRID_SIZE_MAX, Math.max(GRID_SIZE_MIN, Math.round(n)))
}

function suggestPhotoGridSize(img: HTMLImageElement): number {
  const maxDim = Math.max(img.width, img.height)
  if (maxDim <= 180) return 16
  if (maxDim <= 420) return 20
  if (maxDim <= 720) return 24
  return 28
}

type DetectedGrid = { cols: number; rows: number; mode: 'pixel' | 'grid' }

function detectBeadGridSize(img: HTMLImageElement): DetectedGrid | null {
  const w = img.width
  const h = img.height
  if (w >= 6 && h >= 6 && w <= 48 && h <= 48) {
    return { cols: w, rows: h, mode: 'pixel' }
  }

  const maxAnalyze = 240
  const scale = Math.min(1, maxAnalyze / Math.max(w, h))
  const aw = Math.max(12, Math.round(w * scale))
  const ah = Math.max(12, Math.round(h * scale))

  const canvas = document.createElement('canvas')
  canvas.width = aw
  canvas.height = ah
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.drawImage(img, 0, 0, aw, ah)
  const imageData = ctx.getImageData(0, 0, aw, ah)

  const cols = estimateCellCount(imageData, 'x')
  const rows = estimateCellCount(imageData, 'y')
  if (!cols || !rows) return null
  if (cols < GRID_SIZE_MIN || cols > GRID_SIZE_MAX || rows < GRID_SIZE_MIN || rows > GRID_SIZE_MAX) {
    return null
  }

  const imgRatio = w / h
  const gridRatio = cols / rows
  if (Math.abs(imgRatio - gridRatio) > 0.4) return null

  return { cols, rows, mode: 'grid' }
}

function estimateCellCount(imageData: ImageData, axis: 'x' | 'y'): number | null {
  const { width: w, height: h, data } = imageData
  const size = axis === 'x' ? w : h
  const signal: number[] = []

  for (let i = 0; i < size; i++) {
    let diffSum = 0
    let count = 0
    if (axis === 'x') {
      for (let y = 0; y < h; y++) {
        if (i === 0) continue
        const i0 = (y * w + (i - 1)) * 4
        const i1 = (y * w + i) * 4
        diffSum += colorDiff(data, i0, i1)
        count++
      }
    } else {
      for (let x = 0; x < w; x++) {
        if (i === 0) continue
        const i0 = ((i - 1) * w + x) * 4
        const i1 = (i * w + x) * 4
        diffSum += colorDiff(data, i0, i1)
        count++
      }
    }
    signal.push(count ? diffSum / count : 0)
  }

  let bestPeriod = 0
  let bestScore = 0
  const minPeriod = 3
  const maxPeriod = Math.floor(size / 6)

  for (let period = minPeriod; period <= maxPeriod; period++) {
    let score = 0
    let n = 0
    for (let i = period; i < signal.length; i++) {
      score += signal[i]! * signal[i - period]!
      n++
    }
    const normalized = n ? score / n : 0
    if (normalized > bestScore) {
      bestScore = normalized
      bestPeriod = period
    }
  }

  if (!bestPeriod || bestScore < 40) return null
  const count = Math.round(size / bestPeriod)
  if (count < GRID_SIZE_MIN || count > GRID_SIZE_MAX) return null
  return count
}

function colorDiff(data: Uint8ClampedArray, a: number, b: number): number {
  const dr = data[a]! - data[b]!
  const dg = data[a + 1]! - data[b + 1]!
  const db = data[a + 2]! - data[b + 2]!
  return dr * dr + dg * dg + db * db
}

/** 从原图采样到格子；chartLike 为 true 时铺满画布，否则照片居中留白 */
function sampleImageToCells(
  img: HTMLImageElement,
  gridW: number,
  gridH: number,
  chartLike: boolean,
): number[] {
  const maxSide = 512
  const scale = Math.min(1, maxSide / Math.max(img.width, img.height))
  const cw = Math.max(1, Math.round(img.width * scale))
  const ch = Math.max(1, Math.round(img.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = cw
  canvas.height = ch
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('无法读取图片')

  if (chartLike) {
    ctx.drawImage(img, 0, 0, cw, ch)
  } else {
    const size = Math.min(gridW, gridH)
    canvas.width = size
    canvas.height = size
    const fit = Math.min(size / img.width, size / img.height)
    const dw = img.width * fit
    const dh = img.height * fit
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, size, size)
    ctx.drawImage(img, (size - dw) / 2, (size - dh) / 2, dw, dh)
    return sampleCanvasCells(ctx, size, size, gridW, gridH)
  }

  return sampleCanvasCells(ctx, cw, ch, gridW, gridH)
}

function sampleCanvasCells(
  ctx: CanvasRenderingContext2D,
  cw: number,
  ch: number,
  gridW: number,
  gridH: number,
): number[] {
  const cells: number[] = []
  for (let gy = 0; gy < gridH; gy++) {
    for (let gx = 0; gx < gridW; gx++) {
      const x0 = (gx / gridW) * cw
      const y0 = (gy / gridH) * ch
      const x1 = ((gx + 1) / gridW) * cw
      const y1 = ((gy + 1) / gridH) * ch
      const marginX = (x1 - x0) * 0.22
      const marginY = (y1 - y0) * 0.22
      const sx = Math.floor(x0 + marginX)
      const sy = Math.floor(y0 + marginY)
      const sw = Math.max(1, Math.floor(x1 - marginX) - sx)
      const sh = Math.max(1, Math.floor(y1 - marginY) - sy)
      const patch = ctx.getImageData(sx, sy, sw, sh)
      const { r, g, b, a } = averageRgb(patch)
      if (a < 40) {
        cells.push(BEAD_EMPTY)
        continue
      }
      const hex = `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`
      cells.push(nearestPaletteIndex(hex, BEAD_PALETTE))
    }
  }
  return cells
}

function averageRgb(imageData: ImageData): { r: number; g: number; b: number; a: number } {
  const { data } = imageData
  let r = 0
  let g = 0
  let b = 0
  let a = 0
  let n = 0
  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3]!
    if (alpha < 20) continue
    r += data[i]!
    g += data[i + 1]!
    b += data[i + 2]!
    a += alpha
    n++
  }
  if (!n) return { r: 255, g: 255, b: 255, a: 0 }
  return { r: Math.round(r / n), g: Math.round(g / n), b: Math.round(b / n), a: Math.round(a / n) }
}

function buildPatternPalette(rawCells: number[]): { palette: string[]; remappedCells: number[] } {
  const usedIndices = new Set<number>()
  for (const c of rawCells) {
    if (c >= 0) usedIndices.add(c)
  }
  const palette = BEAD_PALETTE.filter((_, i) => usedIndices.has(i))
  const remap = new Map<number, number>()
  ;[...usedIndices].sort((a, b) => a - b).forEach((old, i) => remap.set(old, i))
  const remappedCells = rawCells.map((c) => (c >= 0 ? (remap.get(c) ?? BEAD_EMPTY) : BEAD_EMPTY))
  return { palette: palette.length ? [...palette] : ['#FF6B6B'], remappedCells }
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(reader.error ?? new Error('读取失败'))
    reader.readAsDataURL(file)
  })
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('图片加载失败'))
    img.src = src
  })
}

export function clonePattern(pattern: BeadPattern): BeadPattern {
  return {
    ...pattern,
    palette: [...pattern.palette],
    cells: [...pattern.cells],
  }
}

export const PHOTO_GRID_SIZE_OPTIONS = [16, 20, 24, 28, 32] as const
