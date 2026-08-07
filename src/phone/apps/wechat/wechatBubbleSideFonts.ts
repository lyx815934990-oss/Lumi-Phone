import type { CSSProperties } from 'react'

import type { WeChatBubbleSideFont, WeChatBubbleTheme } from '../../types'
import {
  loadWeChatBubbleSideFontDataUrl,
  persistWeChatBubbleSideFontDataUrl,
  deleteWeChatBubbleSideFontDataUrl,
} from './wechatBubbleSideFontPersist'

const FAMILY_PREFIX = 'WeChatBubbleSideFont'
const loadedFamilies = new Set<string>()

export function newWeChatBubbleSideFontId(): string {
  return `wbf-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function newWeChatBubbleSideFontFamily(): string {
  return `${FAMILY_PREFIX}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

export function normalizeWeChatBubbleSideFont(
  v: unknown,
  fallback?: WeChatBubbleSideFont | null,
): WeChatBubbleSideFont | null {
  if (v === null) return null
  if (!v || typeof v !== 'object') {
    if (fallback === undefined) return null
    return fallback ?? null
  }
  const r = v as Partial<WeChatBubbleSideFont>
  const id = typeof r.id === 'string' ? r.id.trim() : ''
  const family = typeof r.family === 'string' ? r.family.trim() : ''
  const fileName = typeof r.fileName === 'string' ? r.fileName.trim() : ''
  if (!id || !family) return null
  return { id, family, fileName: fileName || '自定义字体' }
}

function fontFormatFromDataUrl(dataUrl: string, fileName?: string): string | undefined {
  const lower = `${fileName ?? ''} ${dataUrl.slice(0, 64)}`.toLowerCase()
  if (lower.includes('woff2')) return 'woff2'
  if (lower.includes('woff')) return 'woff'
  if (lower.includes('opentype') || lower.includes('.otf')) return 'opentype'
  if (lower.includes('truetype') || lower.includes('.ttf')) return 'truetype'
  return undefined
}

function dataUrlToArrayBuffer(dataUrl: string): ArrayBuffer {
  const comma = dataUrl.indexOf(',')
  if (comma < 0) throw new Error('invalid data url')
  const meta = dataUrl.slice(0, comma)
  const data = dataUrl.slice(comma + 1)
  if (/;base64/i.test(meta)) {
    const bin = atob(data)
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
    return bytes.buffer
  }
  const decoded = decodeURIComponent(data)
  const bytes = new Uint8Array(decoded.length)
  for (let i = 0; i < decoded.length; i++) bytes[i] = decoded.charCodeAt(i)
  return bytes.buffer
}

export async function ensureWeChatBubbleSideFontLoaded(
  meta: WeChatBubbleSideFont | null | undefined,
  dataUrl?: string | null,
): Promise<boolean> {
  if (typeof document === 'undefined' || !('fonts' in document)) return false
  const fam = meta?.family?.trim()
  const id = meta?.id?.trim()
  if (!fam || !id) return false
  if (loadedFamilies.has(fam)) return true

  let src = dataUrl?.trim() || ''
  if (!src) {
    src = (await loadWeChatBubbleSideFontDataUrl(id)) || ''
  }
  if (!src) return false

  const descriptors: FontFaceDescriptors = { weight: 'normal', style: 'normal', display: 'swap' }

  const tryLoad = async (face: FontFace) => {
    const loaded = await face.load()
    document.fonts.add(loaded)
    loadedFamilies.add(fam)
    return true
  }

  if (src.startsWith('data:')) {
    try {
      let buf: ArrayBuffer
      try {
        buf = dataUrlToArrayBuffer(src)
      } catch {
        const res = await fetch(src)
        buf = await res.arrayBuffer()
      }
      if (await tryLoad(new FontFace(fam, buf, descriptors))) return true
    } catch (err) {
      console.warn('[wechat-bubble-font] ArrayBuffer load failed, fallback url()', fam, err)
    }
  }

  try {
    const format = fontFormatFromDataUrl(src, meta?.fileName)
    const source = format ? `url("${src}") format("${format}")` : `url("${src}")`
    if (await tryLoad(new FontFace(fam, source, descriptors))) return true
  } catch (err) {
    console.warn('[wechat-bubble-font] url() load failed', fam, err)
  }
  return false
}

export async function ensureWeChatBubbleSideFontsLoaded(bubble: WeChatBubbleTheme): Promise<void> {
  await Promise.all([
    ensureWeChatBubbleSideFontLoaded(bubble.selfFont),
    ensureWeChatBubbleSideFontLoaded(bubble.otherFont),
  ])
}

/** 作用域 CSS：用户侧 / 角色侧自定义字体（缺省回退 --wx-chat-font / --wx-font） */
export function chatBubbleSideFontCssVars(bubble: WeChatBubbleTheme): CSSProperties {
  const out: Record<string, string> = {}
  const selfFamily = bubble.selfFont?.family?.trim()
  const otherFamily = bubble.otherFont?.family?.trim()
  if (selfFamily) {
    out['--wx-self-bubble-font'] = `"${selfFamily}", var(--wx-chat-font, var(--wx-font))`
  }
  if (otherFamily) {
    out['--wx-other-bubble-font'] = `"${otherFamily}", var(--wx-chat-font, var(--wx-font))`
  }
  return out as CSSProperties
}

export function bubbleSideHasCustomFont(
  bubble: WeChatBubbleTheme,
  side: 'self' | 'other',
): boolean {
  const meta = side === 'self' ? bubble.selfFont : bubble.otherFont
  return Boolean(meta?.family?.trim() && meta?.id?.trim())
}

export function bubbleSideFontFamilyCss(side: 'self' | 'other'): string {
  return side === 'self'
    ? 'var(--wx-self-bubble-font, var(--wx-chat-font, var(--wx-font)))'
    : 'var(--wx-other-bubble-font, var(--wx-chat-font, var(--wx-font)))'
}

export async function uploadWeChatBubbleSideFont(file: File): Promise<{
  meta: WeChatBubbleSideFont
  dataUrl: string
}> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string' && reader.result.trim()) resolve(reader.result)
      else reject(new Error('读取字体失败'))
    }
    reader.onerror = () => reject(new Error('读取字体失败'))
    reader.readAsDataURL(file)
  })
  const meta: WeChatBubbleSideFont = {
    id: newWeChatBubbleSideFontId(),
    family: newWeChatBubbleSideFontFamily(),
    fileName: file.name?.trim() || '自定义字体',
  }
  await persistWeChatBubbleSideFontDataUrl(meta.id, dataUrl)
  await ensureWeChatBubbleSideFontLoaded(meta, dataUrl)
  return { meta, dataUrl }
}

export async function clearWeChatBubbleSideFont(
  prev: WeChatBubbleSideFont | null | undefined,
): Promise<null> {
  if (prev?.id?.trim()) {
    await deleteWeChatBubbleSideFontDataUrl(prev.id)
  }
  return null
}
