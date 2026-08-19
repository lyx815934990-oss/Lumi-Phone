/**
 * 七夕信封正文专用手写体。
 * 字体文件经 Vite 插件拷到 public/fonts/qixi-letter.ttf（英文路径），
 * 避免 Rolldown 打包「中文字体/七夕字体.ttf」时把资源丢掉。
 */

export const QIXI_LETTER_FONT_FAMILY = 'QixiLetterHand'

/** 手写体优先；没就绪时先用楷体，保证信能看见 */
export const QIXI_LETTER_FONT_STACK = `'${QIXI_LETTER_FONT_FAMILY}', "STKaiti", "KaiTi", "Kaiti SC", cursive`

export function qixiLetterFontUrl(): string {
  const base = import.meta.env.BASE_URL || '/'
  const prefix = base.endsWith('/') ? base : `${base}/`
  return `${prefix}fonts/qixi-letter.ttf`
}

let injectPromise: Promise<boolean> | null = null
let loaded = false

function injectFace(url: string): void {
  if (typeof document === 'undefined') return
  const id = 'qixi-letter-font-face-v3'
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
      const url = qixiLetterFontUrl()
      injectFace(url)
      if (typeof document === 'undefined' || !('fonts' in document)) {
        loaded = true
        return true
      }
      try {
        await document.fonts.load(`21px '${QIXI_LETTER_FONT_FAMILY}'`, '七夕你好亲爱的')
        loaded = true
        return true
      } catch {
        loaded = true
        return false
      }
    })()
  }
  return injectPromise
}
