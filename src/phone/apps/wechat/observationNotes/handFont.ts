/** 观察笔记统一手记体 · Aa拾光明信片（构建压成 woff2） */

import obsHandWoff2 from './obs-aa-shige-mingxinpian.woff2?url'

export const OBS_HAND_FAMILY = 'ObsNotesAaShiGeMingXinPian'

export const OBS_HAND_STACK = `'${OBS_HAND_FAMILY}', "STKaiti", "KaiTi", "PingFang SC", cursive`

function obsHandFontUrl(): string {
  return String(obsHandWoff2 || '').trim()
}

let injectPromise: Promise<boolean> | null = null
let loaded = false

function injectFace(url: string): void {
  if (typeof document === 'undefined') return
  const id = 'obs-notes-hand-font-v3'
  if (document.getElementById(id)) return
  const el = document.createElement('style')
  el.id = id
  el.textContent = `@font-face{font-family:'${OBS_HAND_FAMILY}';src:url('${url}') format('woff2');font-display:swap;font-weight:400;font-style:normal;}`
  document.head.appendChild(el)
}

export async function ensureObsHandFontLoaded(): Promise<boolean> {
  if (loaded) return true
  if (!injectPromise) {
    injectPromise = (async () => {
      const url = obsHandFontUrl()
      if (!url) {
        injectPromise = null
        return false
      }
      injectFace(url)
      if (typeof document === 'undefined' || !('fonts' in document)) {
        loaded = true
        return true
      }
      try {
        const res = await fetch(url)
        if (!res.ok) throw new Error(`font http ${res.status}`)
        const buf = await res.arrayBuffer()
        const face = new FontFace(OBS_HAND_FAMILY, buf, {
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
          await document.fonts.load(`18px '${OBS_HAND_FAMILY}'`, '观察笔记')
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
