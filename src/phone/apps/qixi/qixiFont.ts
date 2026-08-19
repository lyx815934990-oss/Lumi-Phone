/**
 * 七夕信封正文只用「七夕字体.ttf」。
 * 开屏标题的宋体是系统字体；信纸必须下载这份手写体。
 */

import { publicHandFontUrl } from '../../utils/publicHandFontUrl'

export const QIXI_LETTER_FONT_FAMILY = 'QixiLetterHand'

export const QIXI_LETTER_FONT_STACK = `'${QIXI_LETTER_FONT_FAMILY}', cursive`

function qixiLetterUrls(): string[] {
  const primary = publicHandFontUrl('qixi-letter.ttf')
  const rooted = '/fonts/qixi-letter.ttf'
  return primary === rooted ? [primary] : [primary, rooted]
}

let injectPromise: Promise<boolean> | null = null
let loaded = false

function injectPreload(url: string): void {
  if (typeof document === 'undefined') return
  const id = `qixi-letter-font-preload-${url}`
  if (document.getElementById(id)) return
  const link = document.createElement('link')
  link.id = id
  link.rel = 'preload'
  link.as = 'font'
  link.type = 'font/ttf'
  link.href = url
  document.head.appendChild(link)
}

function injectFace(urls: string[]): void {
  if (typeof document === 'undefined') return
  const id = 'qixi-letter-font-face-v5'
  if (document.getElementById(id)) return
  const src = urls.map((u) => `url('${u}') format('truetype')`).join(',')
  const el = document.createElement('style')
  el.id = id
  el.textContent = `@font-face{font-family:'${QIXI_LETTER_FONT_FAMILY}';src:${src};font-display:swap;font-weight:400;font-style:normal;}`
  document.head.appendChild(el)
}

export async function ensureQixiLetterFontLoaded(): Promise<boolean> {
  if (loaded) return true
  if (!injectPromise) {
    injectPromise = (async () => {
      const urls = qixiLetterUrls()
      urls.forEach(injectPreload)
      injectFace(urls)
      if (typeof document === 'undefined' || !('fonts' in document)) {
        loaded = true
        return true
      }
      try {
        const face = new FontFace(QIXI_LETTER_FONT_FAMILY, `url("${urls[0]}") format("truetype")`, {
          style: 'normal',
          weight: '400',
          display: 'swap',
        })
        void face.load().then((loadedFace) => {
          document.fonts.add(loadedFace)
        })
      } catch {
        /* @font-face 仍会继续拉七夕字体 */
      }
      loaded = true
      return true
    })()
  }
  return injectPromise
}
