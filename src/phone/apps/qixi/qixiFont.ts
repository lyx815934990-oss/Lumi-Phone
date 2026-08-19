/**
 * 七夕信封正文：源文件是「中文字体/七夕字体.ttf」。
 * 构建时改掉 Chrome 拒收的 vhea 表，再由 Vite 打进 assets（不要去请求会 404 的 /fonts/）。
 */

import qixiLetterTtf from './qixi-letter.ttf?url'

export const QIXI_LETTER_FONT_FAMILY = 'QixiLetterHand'

export const QIXI_LETTER_FONT_STACK = `'${QIXI_LETTER_FONT_FAMILY}'`

let injectPromise: Promise<boolean> | null = null
let loaded = false

function injectFace(url: string): void {
  if (typeof document === 'undefined') return
  const id = 'qixi-letter-font-face-v7'
  if (document.getElementById(id)) return
  const el = document.createElement('style')
  el.id = id
  el.textContent = `@font-face{font-family:'${QIXI_LETTER_FONT_FAMILY}';src:url('${url}') format('truetype');font-display:swap;font-weight:400;font-style:normal;}`
  document.head.appendChild(el)
}

export async function ensureQixiLetterFontLoaded(): Promise<boolean> {
  if (loaded) return true
  if (!injectPromise) {
    injectPromise = (async () => {
      const url = String(qixiLetterTtf || '').trim()
      if (!url) return false
      injectFace(url)
      if (typeof document === 'undefined' || !('fonts' in document)) {
        loaded = true
        return true
      }
      try {
        const face = new FontFace(QIXI_LETTER_FONT_FAMILY, `url("${url}")`, {
          style: 'normal',
          weight: '400',
          display: 'swap',
        })
        const loadedFace = await face.load()
        document.fonts.add(loadedFace)
      } catch {
        /* @font-face 仍会继续拉 */
      }
      loaded = true
      return true
    })()
  }
  return injectPromise
}
