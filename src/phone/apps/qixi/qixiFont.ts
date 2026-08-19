/** 七夕信封正文专用字体 · 七夕字体.ttf */

import qixiLetterTtf from '../../../../中文字体/七夕字体.ttf?url'

export const QIXI_LETTER_FONT_FAMILY = 'QixiLetterFont'

export const QIXI_LETTER_FONT_STACK = `'${QIXI_LETTER_FONT_FAMILY}', "STKaiti", "KaiTi", "PingFang SC", cursive`

export const QIXI_LETTER_FONT_URL = qixiLetterTtf

let injectPromise: Promise<void> | null = null
let loaded = false

function injectFace(): void {
  if (typeof document === 'undefined') return
  const id = 'qixi-letter-font-face-v1'
  if (document.getElementById(id)) return
  const el = document.createElement('style')
  el.id = id
  el.textContent = `@font-face{font-family:'${QIXI_LETTER_FONT_FAMILY}';src:url('${qixiLetterTtf}') format('truetype');font-display:swap;font-weight:400;font-style:normal;}`
  document.head.appendChild(el)
}

export async function ensureQixiLetterFontLoaded(): Promise<void> {
  if (loaded) return
  if (!injectPromise) {
    injectPromise = (async () => {
      injectFace()
      if (typeof document === 'undefined' || !('fonts' in document)) {
        loaded = true
        return
      }
      try {
        const face = new FontFace(QIXI_LETTER_FONT_FAMILY, `url(${qixiLetterTtf})`, {
          style: 'normal',
          weight: '400',
          display: 'swap',
        })
        const loadedFace = await face.load()
        document.fonts.add(loadedFace)
      } catch {
        /* fallback stack */
      } finally {
        loaded = true
      }
    })()
  }
  await injectPromise
}
