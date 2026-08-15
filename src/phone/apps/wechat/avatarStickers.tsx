/** 聊天头像装饰贴纸：盖在头像上方，支持 PNG/WebP/GIF 动图 */

import type { CSSProperties } from 'react'
import {
  DEFAULT_CHROMA_KEY,
  normalizeChromaKey,
  type ChromaKeyConfig,
} from './chromaKey'

export type AvatarSticker = {
  id: string
  /** 相对头像盒：中心点 X，0=左 50=中 100=右 */
  xPct: number
  /** 相对头像盒：中心点 Y，0=上 50=中 100=下 */
  yPct: number
  sizePx: number
  rotateDeg: number
  opacityPct: number
  /** 实际显示图（抠图烘焙后）；GIF 为原图 */
  imageDataUrl: string
  /** 上传原图；抠图参数改动时从此重新烘焙。空则等同 imageDataUrl */
  sourceImageDataUrl: string
  /** 色度抠图（GIF 动图忽略） */
  chromaKey: ChromaKeyConfig
}

export type AvatarStickersBySide = {
  self: AvatarSticker[]
  other: AvatarSticker[]
}

export const MAX_AVATAR_STICKERS_PER_SIDE = 6
/** 图层：头像 < 头像框 < 本贴纸（盖住头像） */
export const AVATAR_STICKER_Z = 6

/** 贴纸显示边长上限（需远大于头像，可接近铺满手机屏） */
export const MAX_AVATAR_STICKER_SIZE_PX = 560
export const MIN_AVATAR_STICKER_SIZE_PX = 8

export const MAX_AVATAR_STICKER_DATA_URL_LEN = 1_800_000
const STILL_MAX_SIDE = 160

export function emptyAvatarStickers(): AvatarStickersBySide {
  return { self: [], other: [] }
}

export function newAvatarStickerId(): string {
  return `avs-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function avatarStickerSourceUrl(s: AvatarSticker): string {
  const src = typeof s.sourceImageDataUrl === 'string' ? s.sourceImageDataUrl.trim() : ''
  return src || s.imageDataUrl
}

export function isAvatarStickerGif(dataUrl: string): boolean {
  return /^data:image\/gif/i.test(String(dataUrl ?? '').trim())
}

function clampNum(n: unknown, min: number, max: number, fallback: number): number {
  if (typeof n !== 'number' || !Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, n))
}

function normalizeOne(raw: unknown): AvatarSticker | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const imageDataUrl = typeof o.imageDataUrl === 'string' ? o.imageDataUrl.trim() : ''
  if (!imageDataUrl) return null
  const id =
    typeof o.id === 'string' && o.id.trim() ? o.id.trim() : newAvatarStickerId()
  const opacityRaw =
    typeof o.opacityPct === 'number'
      ? o.opacityPct
      : typeof o.opacity === 'number'
        ? o.opacity <= 1
          ? o.opacity * 100
          : o.opacity
        : 100
  const sourceImageDataUrl =
    typeof o.sourceImageDataUrl === 'string' && o.sourceImageDataUrl.trim()
      ? o.sourceImageDataUrl.trim()
      : imageDataUrl
  const chromaKey = normalizeChromaKey(o.chromaKey)
  const gif = isAvatarStickerGif(sourceImageDataUrl) || isAvatarStickerGif(imageDataUrl)
  return {
    id,
    xPct: Math.round(clampNum(o.xPct, 0, 100, 50)),
    yPct: Math.round(clampNum(o.yPct, 0, 100, 50)),
    sizePx: Math.round(
      clampNum(o.sizePx, MIN_AVATAR_STICKER_SIZE_PX, MAX_AVATAR_STICKER_SIZE_PX, 40),
    ),
    rotateDeg: Math.round(clampNum(o.rotateDeg ?? o.rotationDeg, -180, 180, 0)),
    opacityPct: Math.round(clampNum(opacityRaw, 0, 100, 100)),
    imageDataUrl,
    sourceImageDataUrl,
    chromaKey: gif ? { ...DEFAULT_CHROMA_KEY, enabled: false } : chromaKey,
  }
}

export function normalizeAvatarStickerList(raw: unknown): AvatarSticker[] {
  if (!Array.isArray(raw)) return []
  const out: AvatarSticker[] = []
  for (const item of raw) {
    const s = normalizeOne(item)
    if (!s) continue
    out.push(s)
    if (out.length >= MAX_AVATAR_STICKERS_PER_SIDE) break
  }
  return out
}

export function normalizeAvatarStickers(raw: unknown): AvatarStickersBySide {
  if (!raw || typeof raw !== 'object') return emptyAvatarStickers()
  const o = raw as Record<string, unknown>
  return {
    self: normalizeAvatarStickerList(o.self),
    other: normalizeAvatarStickerList(o.other),
  }
}

export function avatarStickerStyle(s: AvatarSticker): CSSProperties {
  const size = Math.min(
    MAX_AVATAR_STICKER_SIZE_PX,
    Math.max(MIN_AVATAR_STICKER_SIZE_PX, Math.round(s.sizePx)),
  )
  const x = Math.min(100, Math.max(0, s.xPct))
  const y = Math.min(100, Math.max(0, s.yPct))
  const rotateDeg = Math.round(s.rotateDeg ?? 0)
  const opacity = Math.min(1, Math.max(0, (s.opacityPct ?? 100) / 100))
  return {
    position: 'absolute',
    left: `${x}%`,
    top: `${y}%`,
    width: size,
    height: size,
    // Tailwind preflight 的 img{max-width:100%} 会相对头像盒把贴纸压回 40px
    maxWidth: 'none',
    maxHeight: 'none',
    objectFit: 'contain',
    pointerEvents: 'none',
    zIndex: AVATAR_STICKER_Z,
    margin: 0,
    opacity,
    transform: `translate(-50%, -50%) rotate(${rotateDeg}deg)`,
  }
}

export function AvatarStickersLayer({
  stickers,
}: {
  stickers: readonly AvatarSticker[]
}) {
  const list = stickers.filter((s) => s.imageDataUrl.trim())
  if (!list.length) return null
  return (
    <div
      data-wx-avatar-stickers
      className="pointer-events-none absolute inset-0"
      style={{
        zIndex: AVATAR_STICKER_Z,
        overflow: 'visible',
        clipPath: 'none',
        borderRadius: 0,
      }}
      aria-hidden
    >
      {list.map((s) => (
        <img
          key={s.id}
          data-wx-avatar-sticker=""
          data-sticker-id={s.id}
          src={s.imageDataUrl}
          alt=""
          draggable={false}
          style={avatarStickerStyle(s)}
        />
      ))}
    </div>
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

function isLikelyAnimatedKeepRaw(mime: string): boolean {
  const m = mime.toLowerCase()
  return m === 'image/gif' || m === 'image/webp' || m === 'image/apng'
}

/** GIF/动图原样保留；静图可缩到较小边长以控制体积 */
export async function readAvatarStickerFile(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('请选择图片或 GIF')
  const raw = await readFileAsDataUrl(file)
  if (!raw) throw new Error('图片无效')

  if (isLikelyAnimatedKeepRaw(file.type)) {
    if (raw.length > MAX_AVATAR_STICKER_DATA_URL_LEN) {
      throw new Error('动图过大，请压缩后再上传（建议小于 1.5MB）')
    }
    return raw
  }

  const img = new Image()
  img.decoding = 'async'
  img.src = raw
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = () => reject(new Error('贴纸图片读取失败'))
  })
  const w = img.naturalWidth || img.width
  const h = img.naturalHeight || img.height
  if (!w || !h) return raw

  const scale = Math.min(1, STILL_MAX_SIDE / Math.max(w, h))
  const tw = Math.max(1, Math.round(w * scale))
  const th = Math.max(1, Math.round(h * scale))
  const canvas = document.createElement('canvas')
  canvas.width = tw
  canvas.height = th
  const ctx = canvas.getContext('2d')
  if (!ctx) return raw
  ctx.clearRect(0, 0, tw, th)
  ctx.drawImage(img, 0, 0, tw, th)
  let best = canvas.toDataURL('image/png')
  if (best.length > MAX_AVATAR_STICKER_DATA_URL_LEN) {
    for (const q of [0.9, 0.8, 0.7]) {
      const jpeg = canvas.toDataURL('image/jpeg', q)
      if (jpeg.length < best.length) best = jpeg
      if (best.length <= MAX_AVATAR_STICKER_DATA_URL_LEN) break
    }
  }
  if (best.length > MAX_AVATAR_STICKER_DATA_URL_LEN) {
    throw new Error('贴纸过大，请换更小的图')
  }
  return best
}
