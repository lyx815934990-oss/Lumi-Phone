/**
 * 七夕信封正文：源文件「中文字体/七夕字体.ttf」。
 * 构建时修 vhea → 压成 woff2（约 7MB），Safari 比裸 12MB TTF 稳得多。
 * 用 ArrayBuffer + FontFace 注册，避免 iOS Safari 对 CSS @font-face 大文件超时。
 */

import qixiLetterWoff2 from './qixi-letter.woff2?url'

export const QIXI_LETTER_FONT_FAMILY = 'QixiLetterHand'

export const QIXI_LETTER_FONT_STACK = `'${QIXI_LETTER_FONT_FAMILY}'`

let injectPromise: Promise<boolean> | null = null
let loaded = false

function injectFace(url: string): void {
  if (typeof document === 'undefined') return
  const id = 'qixi-letter-font-face-v8'
  if (document.getElementById(id)) return
  const el = document.createElement('style')
  el.id = id
  el.textContent = `@font-face{font-family:'${QIXI_LETTER_FONT_FAMILY}';src:url('${url}') format('woff2');font-display:swap;font-weight:400;font-style:normal;}`
  document.head.appendChild(el)
}

export async function ensureQixiLetterFontLoaded(): Promise<boolean> {
  if (loaded) return true
  if (!injectPromise) {
    injectPromise = (async () => {
      const url = String(qixiLetterWoff2 || '').trim()
      if (!url) return false
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
        try {
          await document.fonts.load(`21px '${QIXI_LETTER_FONT_FAMILY}'`, '七夕你好亲爱的')
        } catch {
          /* already added */
        }
        loaded = true
        return true
      } catch {
        injectPromise = null
        loaded = false
        return false
      }
    })()
  }
  return injectPromise
}
