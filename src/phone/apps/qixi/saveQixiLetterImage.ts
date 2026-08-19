/**
 * 将七夕告白信合成为高清长图，并优先系统分享存相册
 */

import type { QixiLetterResult } from './qixiLetterAi'
import {
  ensureQixiLetterFontLoaded,
  QIXI_LETTER_FONT_STACK,
} from './qixiFont'

/** 逻辑稿 720 宽，3 倍像素导出，避免手机相册发糊 */
const SCALE = 3
const W = 720 * SCALE
const PAD_X = 56 * SCALE
const PAD_Y = 56 * SCALE
const MARGIN_X = 44 * SCALE
const TITLE_SIZE = 40 * SCALE
const BODY_SIZE = 34 * SCALE
const LINE_H = 54 * SCALE
const MAX_H = 16000
const UI_FONT_STACK = '"Songti SC", "STSong", "SimSun", "Noto Serif SC", serif'

function wrapLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  indentFirst = false,
): string[] {
  const paras = String(text ?? '')
    .replace(/\r/g, '')
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean)
  const out: string[] = []
  for (const para of paras) {
    let cur = indentFirst ? '　　' : ''
    for (const ch of para) {
      const next = cur + ch
      if (ctx.measureText(next).width > maxWidth && cur) {
        out.push(cur)
        cur = ch
      } else {
        cur = next
      }
    }
    if (cur) out.push(cur)
    out.push('')
  }
  if (out.length && out[out.length - 1] === '') out.pop()
  return out
}

function drawPaperBackground(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = '#fffaf4'
  ctx.fillRect(0, 0, w, h)

  ctx.strokeStyle = 'rgba(196, 90, 110, 0.35)'
  ctx.lineWidth = 2 * SCALE
  ctx.beginPath()
  ctx.moveTo(MARGIN_X, 24 * SCALE)
  ctx.lineTo(MARGIN_X, h - 24 * SCALE)
  ctx.stroke()

  ctx.strokeStyle = 'rgba(120, 150, 190, 0.42)'
  ctx.lineWidth = Math.max(1, SCALE)
  for (let y = PAD_Y; y < h - 28 * SCALE; y += LINE_H) {
    ctx.beginPath()
    ctx.moveTo(MARGIN_X + 8 * SCALE, y)
    ctx.lineTo(w - 28 * SCALE, y)
    ctx.stroke()
  }

  ctx.strokeStyle = 'rgba(180,70,100,0.2)'
  ctx.lineWidth = 2 * SCALE
  ctx.strokeRect(14 * SCALE, 14 * SCALE, w - 28 * SCALE, h - 28 * SCALE)
}

export async function composeQixiLetterPngBlob(
  letter: QixiLetterResult,
  characterName: string,
): Promise<Blob> {
  await ensureQixiLetterFontLoaded()
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('无法创建画布')
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'

  const measure = document.createElement('canvas').getContext('2d')
  if (!measure) throw new Error('无法测量文字')

  const bodyFont = `${BODY_SIZE}px ${QIXI_LETTER_FONT_STACK}`
  const titleFont = `600 ${TITLE_SIZE}px ${UI_FONT_STACK}`
  const maxTextW = W - PAD_X - 28 * SCALE
  const textLeft = PAD_X

  measure.font = titleFont
  const titleLines = wrapLines(measure, letter.title || '写给你的七夕', maxTextW, false)

  measure.font = bodyFont
  const greetingLines = letter.greeting ? wrapLines(measure, letter.greeting, maxTextW, false) : []
  const bodyLines = wrapLines(measure, letter.body, maxTextW, true)
  const closingLines = letter.closing ? wrapLines(measure, letter.closing, maxTextW, true) : []
  const signatureLines = [
    ...(letter.signature ? wrapLines(measure, letter.signature, maxTextW, false) : []),
    ...(letter.signedAt ? [letter.signedAt] : []),
  ]

  const blocks: Array<{ lines: string[]; font: string; align: CanvasTextAlign; color: string; gapAfter: number }> = [
    { lines: titleLines, font: titleFont, align: 'center', color: '#6b2038', gapAfter: 18 * SCALE },
    {
      lines: [`—— ${characterName || 'TA'} · 七夕夜`],
      font: `${18 * SCALE}px ${UI_FONT_STACK}`,
      align: 'center',
      color: 'rgba(107,32,56,0.55)',
      gapAfter: 36 * SCALE,
    },
    { lines: greetingLines, font: bodyFont, align: 'left', color: '#3a2830', gapAfter: 20 * SCALE },
    { lines: bodyLines, font: bodyFont, align: 'left', color: '#3a2830', gapAfter: 28 * SCALE },
    { lines: closingLines, font: bodyFont, align: 'left', color: '#3a2830', gapAfter: 36 * SCALE },
    { lines: signatureLines, font: bodyFont, align: 'right', color: '#6b4050', gapAfter: 0 },
  ]

  let contentH = 0
  for (const b of blocks) {
    contentH += b.lines.length * LINE_H + (b.lines.length ? b.gapAfter : 0)
  }
  const h = Math.min(MAX_H, Math.max(960 * SCALE, PAD_Y * 2 + contentH + 40 * SCALE))
  canvas.width = W
  canvas.height = h

  drawPaperBackground(ctx, W, h)
  ctx.textBaseline = 'top'

  let y = PAD_Y
  for (const b of blocks) {
    if (!b.lines.length) continue
    ctx.font = b.font
    ctx.fillStyle = b.color
    ctx.textAlign = b.align
    const x =
      b.align === 'center' ? W / 2 : b.align === 'right' ? W - 28 * SCALE : textLeft
    for (const line of b.lines) {
      if (y + LINE_H > h - 32 * SCALE) break
      ctx.fillText(line, x, y - BODY_SIZE * 0.15)
      y += LINE_H
    }
    y += b.gapAfter
  }

  ctx.textAlign = 'center'
  ctx.font = `${14 * SCALE}px ${UI_FONT_STACK}`
  ctx.fillStyle = 'rgba(196,72,98,0.35)'
  ctx.fillText('Lumi · 七夕信封', W / 2, h - 28 * SCALE)

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('导出图片失败'))
      },
      'image/png',
    )
  })
}

export type SaveQixiLetterResult = {
  ok: boolean
  message?: string
  previewUrl?: string
}

async function sharePngToPhotos(png: Blob): Promise<'shared' | 'cancelled' | 'unavailable'> {
  if (typeof navigator.share !== 'function') return 'unavailable'
  const file = new File([png], '七夕信封.png', { type: 'image/png' })
  const data: ShareData = { files: [file], title: '七夕信封' }
  try {
    if (typeof navigator.canShare === 'function' && !navigator.canShare(data)) {
      return 'unavailable'
    }
    await navigator.share(data)
    return 'shared'
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') return 'cancelled'
    return 'unavailable'
  }
}

export async function saveQixiLetterToAlbum(
  letter: QixiLetterResult,
  characterName: string,
): Promise<SaveQixiLetterResult> {
  try {
    const png = await composeQixiLetterPngBlob(letter, characterName)
    const share = await sharePngToPhotos(png)
    if (share === 'shared') {
      return { ok: true, message: '请在系统菜单选择「存储图像」到相册' }
    }
    if (share === 'cancelled') {
      return { ok: false, message: '已取消保存' }
    }
    const previewUrl = URL.createObjectURL(png)
    return {
      ok: true,
      previewUrl,
      message: '长按图片，选择「存储图像 / 保存图片」到系统相册',
    }
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : '保存失败' }
  }
}
