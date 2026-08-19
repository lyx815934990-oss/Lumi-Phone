/**
 * 七夕信封正文手写体。
 * 衬线标题用的是系统宋体，不用下载；信纸必须走自定义 ttf。
 * 主文件约 12MB，手机上常失败，所以再用一款约 5MB 的手写体兜底。
 */

import { publicHandFontUrl } from '../../utils/publicHandFontUrl'

export const QIXI_LETTER_FONT_FAMILY = 'QixiLetterHand'
const QIXI_LETTER_FONT_SOFT = 'QixiLetterHandSoft'

export const QIXI_LETTER_FONT_STACK = `'${QIXI_LETTER_FONT_FAMILY}', '${QIXI_LETTER_FONT_SOFT}', cursive`

function fontSrcList(fileName: string): string {
  const primary = publicHandFontUrl(fileName)
  const rooted = `/fonts/${fileName}`
  const urls = primary === rooted ? [primary] : [primary, rooted]
  return urls.map((u) => `url('${u}') format('truetype')`).join(',')
}

let injectPromise: Promise<boolean> | null = null
let loaded = false

function injectFaces(): void {
  if (typeof document === 'undefined') return
  const id = 'qixi-letter-font-face-v4'
  if (document.getElementById(id)) return
  const el = document.createElement('style')
  el.id = id
  el.textContent = [
    `@font-face{font-family:'${QIXI_LETTER_FONT_FAMILY}';src:${fontSrcList('qixi-letter.ttf')};font-display:swap;font-weight:400;font-style:normal;}`,
    `@font-face{font-family:'${QIXI_LETTER_FONT_SOFT}';src:${fontSrcList('diary-qing-song-shou-xie.ttf')};font-display:swap;font-weight:400;font-style:normal;}`,
  ].join('')
  document.head.appendChild(el)
}

export async function ensureQixiLetterFontLoaded(): Promise<boolean> {
  if (loaded) return true
  if (!injectPromise) {
    injectPromise = (async () => {
      injectFaces()
      if (typeof document === 'undefined' || !('fonts' in document)) {
        loaded = true
        return true
      }
      try {
        await Promise.race([
          document.fonts.load(`21px '${QIXI_LETTER_FONT_FAMILY}', '${QIXI_LETTER_FONT_SOFT}'`, '七夕你好亲爱的'),
          new Promise<void>((resolve) => window.setTimeout(resolve, 4000)),
        ])
      } catch {
        /* 信纸不阻塞；浏览器会继续换字 */
      }
      loaded = true
      return true
    })()
  }
  return injectPromise
}
