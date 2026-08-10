/** 个人名片自定义字体加载（FontFace） */

const loadedFamilies = new Set<string>()

function fontFormatFromDataUrl(dataUrl: string, fileName?: string): string | undefined {
  const lower = `${fileName ?? ''} ${dataUrl.slice(0, 80)}`.toLowerCase()
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
    for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i)
    return bytes.buffer
  }
  const decoded = decodeURIComponent(data)
  const bytes = new Uint8Array(decoded.length)
  for (let i = 0; i < decoded.length; i += 1) bytes[i] = decoded.charCodeAt(i)
  return bytes.buffer
}

/**
 * 确保名片自定义字体已注入 document.fonts。
 * 返回是否可用。
 */
export async function ensurePersonalCardFontLoaded(
  family: string | undefined,
  dataUrl: string | undefined,
  fileName?: string,
): Promise<boolean> {
  if (typeof document === 'undefined' || !('fonts' in document)) return false
  const fam = family?.trim()
  const src = dataUrl?.trim()
  if (!fam || !src) return false
  if (loadedFamilies.has(fam)) return true

  const descriptors: FontFaceDescriptors = {
    weight: 'normal',
    style: 'normal',
    display: 'swap',
  }
  const fmt = fontFormatFromDataUrl(src, fileName)

  const tryLoad = async (face: FontFace) => {
    try {
      await face.load()
      document.fonts.add(face)
      loadedFamilies.add(fam)
      return true
    } catch {
      return false
    }
  }

  try {
    const buf = dataUrlToArrayBuffer(src)
    if (await tryLoad(new FontFace(fam, buf, descriptors))) return true
  } catch {
    /* fall through */
  }

  const source = fmt ? `url(${JSON.stringify(src)}) format(${JSON.stringify(fmt)})` : `url(${JSON.stringify(src)})`
  return tryLoad(new FontFace(fam, source, descriptors))
}

/** 名片可用字体栈：自定义族优先，否则跟手机主题 */
export function personalCardFontStack(
  customFamily: string | undefined,
  themeFont: string | undefined,
): string | undefined {
  const fam = customFamily?.trim()
  if (fam) return `"${fam}", ${themeFont || 'inherit'}`
  return undefined
}
