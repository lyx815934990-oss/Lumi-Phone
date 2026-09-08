/** 外观工坊 · 自定义字体（顶栏 / 时间戳等） */

import type { LookWorkshopCustomFont } from './types'

export type { LookWorkshopCustomFont }

const FAMILY_PREFIX = 'LookWorkshopHeaderFont'
const loadedFamilies = new Set<string>()
/** family → blob: URL，供预览 @font-face 使用（避免把数 MB base64 塞进 <style>） */
const previewBlobUrls = new Map<string, string>()

export function newLookWorkshopFontFamily(): string {
  return `${FAMILY_PREFIX}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

function fontFormatFromDataUrl(dataUrl: string, fileName?: string): string | undefined {
  const lower = `${fileName ?? ''} ${dataUrl.slice(0, 80)}`.toLowerCase()
  if (lower.includes('woff2')) return 'woff2'
  if (lower.includes('woff')) return 'woff'
  if (lower.includes('opentype') || lower.includes('.otf')) return 'opentype'
  if (lower.includes('truetype') || lower.includes('.ttf')) return 'truetype'
  return undefined
}

function mimeFromFormat(fmt: string | undefined): string {
  if (fmt === 'woff2') return 'font/woff2'
  if (fmt === 'woff') return 'font/woff'
  if (fmt === 'opentype') return 'font/otf'
  return 'font/ttf'
}

function dataUrlToArrayBuffer(dataUrl: string): ArrayBuffer {
  const comma = dataUrl.indexOf(',')
  if (comma < 0) throw new Error('invalid data url')
  const meta = dataUrl.slice(0, comma)
  const data = dataUrl.slice(comma + 1)
  if (/;base64/i.test(meta)) {
    const bin = atob(data)
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i)
    return bytes.buffer
  }
  const decoded = decodeURIComponent(data)
  const bytes = new Uint8Array(decoded.length)
  for (let i = 0; i < decoded.length; i += 1) bytes[i] = decoded.charCodeAt(i)
  return bytes.buffer
}

export function hasLookWorkshopCustomFont(
  font: LookWorkshopCustomFont | null | undefined,
): boolean {
  return Boolean(font?.family?.trim() && font?.dataUrl?.trim())
}

/** 预览用 blob URL（同一 family 复用） */
export function ensureLookWorkshopFontBlobUrl(
  font: LookWorkshopCustomFont | null | undefined,
): string | null {
  if (typeof URL === 'undefined' || typeof Blob === 'undefined') return null
  if (!hasLookWorkshopCustomFont(font)) return null
  const fam = font!.family.trim()
  const cached = previewBlobUrls.get(fam)
  if (cached) return cached
  try {
    const buf = dataUrlToArrayBuffer(font!.dataUrl.trim())
    const fmt = fontFormatFromDataUrl(font!.dataUrl, font!.fileName)
    const blob = new Blob([buf], { type: mimeFromFormat(fmt) })
    const url = URL.createObjectURL(blob)
    previewBlobUrls.set(fam, url)
    return url
  } catch {
    return null
  }
}

export async function ensureLookWorkshopFontLoaded(
  font: LookWorkshopCustomFont | null | undefined,
): Promise<boolean> {
  if (typeof document === 'undefined' || !('fonts' in document)) return false
  if (!hasLookWorkshopCustomFont(font)) return false
  const fam = font!.family.trim()
  const src = font!.dataUrl.trim()
  if (loadedFamilies.has(fam)) {
    try {
      await document.fonts.load(`16px ${JSON.stringify(fam)}`)
    } catch {
      /* ignore */
    }
    return true
  }

  // 覆盖常见字重，避免父级 font-weight 与 normal 对不上而回退系统字体
  const descriptors: FontFaceDescriptors = {
    weight: '100 900',
    style: 'normal',
    display: 'swap',
  }
  const fmt = fontFormatFromDataUrl(src, font!.fileName)

  const tryLoad = async (face: FontFace) => {
    try {
      await face.load()
      document.fonts.add(face)
      await document.fonts.load(`16px ${JSON.stringify(fam)}`)
      loadedFamilies.add(fam)
      return true
    } catch {
      return false
    }
  }

  // 顺带准备 blob URL，给预览 CSS 用
  ensureLookWorkshopFontBlobUrl(font)

  try {
    const buf = dataUrlToArrayBuffer(src)
    if (await tryLoad(new FontFace(fam, buf, descriptors))) return true
  } catch {
    /* fall through */
  }

  const blobUrl = previewBlobUrls.get(fam)
  if (blobUrl) {
    const source = fmt
      ? `url(${JSON.stringify(blobUrl)}) format(${JSON.stringify(fmt)})`
      : `url(${JSON.stringify(blobUrl)})`
    if (await tryLoad(new FontFace(fam, source, descriptors))) return true
  }

  const source = fmt
    ? `url(${JSON.stringify(src)}) format(${JSON.stringify(fmt)})`
    : `url(${JSON.stringify(src)})`
  return tryLoad(new FontFace(fam, source, descriptors))
}

export async function readLookWorkshopFontFile(file: File): Promise<LookWorkshopCustomFont> {
  const lower = file.name.toLowerCase()
  const ok =
    lower.endsWith('.ttf') ||
    lower.endsWith('.otf') ||
    lower.endsWith('.woff') ||
    lower.endsWith('.woff2') ||
    file.type.includes('font') ||
    file.type.includes('octet-stream')
  if (!ok) throw new Error('请选择 .ttf / .otf / .woff / .woff2 字体文件')

  // 中文字体常 3～12MB；data URL 会再膨胀，过大易撑爆 localStorage / 气泡包
  const maxBytes = 16 * 1024 * 1024
  if (file.size > maxBytes) {
    const mb = (file.size / (1024 * 1024)).toFixed(1)
    throw new Error(`字体文件过大（当前 ${mb}MB，上限 16MB；可换精简/子集版 .woff2）`)
  }

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string' && reader.result.trim()) resolve(reader.result)
      else reject(new Error('读取字体失败'))
    }
    reader.onerror = () => reject(new Error('读取字体失败'))
    reader.readAsDataURL(file)
  })

  const font: LookWorkshopCustomFont = {
    family: newLookWorkshopFontFamily(),
    fileName: file.name.trim() || '自定义字体',
    dataUrl,
  }
  const okLoad = await ensureLookWorkshopFontLoaded(font)
  if (!okLoad) throw new Error('字体加载失败，请换一个文件试试')
  return font
}

/** 勿把 CSS 关键字 inherit 放进 font-family 列表，部分引擎会整条声明丢弃 */
export function lookWorkshopFontStack(font: LookWorkshopCustomFont | null | undefined): string | undefined {
  if (!hasLookWorkshopCustomFont(font)) return undefined
  return JSON.stringify(font!.family.trim())
}

/**
 * 预览专用：用 blob URL 写短 @font-face + 选择器，不把 base64 塞进 DOM。
 * selectors 例：`[data-wx-timestamp]`
 */
export function compileLookWorkshopPreviewFontCss(
  font: LookWorkshopCustomFont | null | undefined,
  selectors: string[],
): string {
  if (!hasLookWorkshopCustomFont(font) || selectors.length === 0) return ''
  const fam = font!.family.trim()
  const blobUrl = ensureLookWorkshopFontBlobUrl(font)
  const src = blobUrl || font!.dataUrl.trim()
  const fmt = fontFormatFromDataUrl(font!.dataUrl, font!.fileName)
  const srcDecl = fmt
    ? `url(${JSON.stringify(src)}) format(${JSON.stringify(fmt)})`
    : `url(${JSON.stringify(src)})`
  const sel = selectors.flatMap((s) => [s.trim(), `${s.trim()} *`]).filter(Boolean).join(', ')
  return [
    `@font-face {`,
    `  font-family: ${JSON.stringify(fam)};`,
    `  src: ${srcDecl};`,
    `  font-weight: 100 900;`,
    `  font-style: normal;`,
    `  font-display: swap;`,
    `}`,
    `${sel} {`,
    `  font-family: ${JSON.stringify(fam)} !important;`,
    `  font-weight: 400 !important;`,
    `  font-style: normal !important;`,
    `}`,
  ].join('\n')
}

/** 导出用 @font-face（须放在 @scope 外；含 dataUrl） */
export function compileLookWorkshopFontFaceCss(
  font: LookWorkshopCustomFont | null | undefined,
): string {
  if (!hasLookWorkshopCustomFont(font)) return ''
  const fam = font!.family.trim()
  const src = font!.dataUrl.trim()
  const fmt = fontFormatFromDataUrl(src, font!.fileName)
  const srcDecl = fmt
    ? `url(${JSON.stringify(src)}) format(${JSON.stringify(fmt)})`
    : `url(${JSON.stringify(src)})`
  return [
    `@font-face {`,
    `  font-family: ${JSON.stringify(fam)};`,
    `  src: ${srcDecl};`,
    `  font-weight: 100 900;`,
    `  font-style: normal;`,
    `  font-display: swap;`,
    `}`,
  ].join('\n')
}
