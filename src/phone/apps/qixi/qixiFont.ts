/**
 * 七夕信封正文专用手写体。
 * 字体文件经 Vite 插件拷到 public/fonts/qixi-letter.ttf（英文路径），
 * 避免 Rolldown 打包「中文字体/七夕字体.ttf」时把资源丢掉。
 */

export const QIXI_LETTER_FONT_FAMILY = 'QixiLetterHand'

export const QIXI_LETTER_FONT_STACK = `'${QIXI_LETTER_FONT_FAMILY}'`

export function qixiLetterFontUrl(): string {
  const base = import.meta.env.BASE_URL || '/'
  const prefix = base.endsWith('/') ? base : `${base}/`
  return `${prefix}fonts/qixi-letter.ttf`
}

let injectPromise: Promise<boolean> | null = null
let loaded = false

function injectPreload(url: string): void {
  if (typeof document === 'undefined') return
  const id = 'qixi-letter-font-preload-v2'
  if (document.getElementById(id)) return
  const link = document.createElement('link')
  link.id = id
  link.rel = 'preload'
  link.as = 'font'
  link.type = 'font/ttf'
  link.crossOrigin = 'anonymous'
  link.href = url
  document.head.appendChild(link)
}

function injectFace(url: string): void {
  if (typeof document === 'undefined') return
  const id = 'qixi-letter-font-face-v2'
  if (document.getElementById(id)) return
  const el = document.createElement('style')
  el.id = id
  el.textContent = `@font-face{font-family:'${QIXI_LETTER_FONT_FAMILY}';src:url('${url}') format('truetype');font-display:swap;font-weight:400;font-style:normal;}`
  document.head.appendChild(el)
}

function fontIsActive(): boolean {
  if (typeof document === 'undefined' || !('fonts' in document)) return false
  try {
    return document.fonts.check(`18px '${QIXI_LETTER_FONT_FAMILY}'`, '七夕你好亲爱的')
  } catch {
    return false
  }
}

export async function ensureQixiLetterFontLoaded(): Promise<boolean> {
  if (loaded && fontIsActive()) return true
  if (!injectPromise) {
    injectPromise = (async () => {
      const url = qixiLetterFontUrl()
      injectPreload(url)
      injectFace(url)
      if (typeof document === 'undefined' || !('fonts' in document)) {
        loaded = true
        return true
      }
      try {
        const res = await fetch(url)
        if (!res.ok) throw new Error(`font http ${res.status}`)
        const buf = await res.arrayBuffer()
        const face = new FontFace(QIXI_LETTER_FONT_FAMILY, buf, {
          style: 'normal',
          weight: '400',
          display: 'swap',
        })
        const loadedFace = await face.load()
        document.fonts.add(loadedFace)
        loaded = true
        return true
      } catch {
        try {
          await document.fonts.load(`21px '${QIXI_LETTER_FONT_FAMILY}'`, '七夕你好亲爱的')
          loaded = true
          return true
        } catch {
          injectPromise = null
          loaded = false
          return false
        }
      }
    })()
  }
  return injectPromise
}
