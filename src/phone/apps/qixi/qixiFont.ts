/**
 * 七夕信封正文：源文件「中文字体/七夕字体.ttf」。
 * 构建时修 vhea → 压成 woff2；开屏阶段预下载 + IndexedDB 缓存，Safari 二次打开可秒开。
 */

import qixiLetterWoff2 from './qixi-letter.woff2?url'

export const QIXI_LETTER_FONT_FAMILY = 'QixiLetterHand'

export const QIXI_LETTER_FONT_STACK = `'${QIXI_LETTER_FONT_FAMILY}'`

const FONT_IDB = 'lumi-qixi-font-v1'
const FONT_STORE = 'bin'
const FONT_KEY = 'woff2-v1'

let injectPromise: Promise<boolean> | null = null
let loaded = false
let warmStarted = false

export function qixiLetterFontUrl(): string {
  return String(qixiLetterWoff2 || '').trim()
}

function injectPreload(url: string): void {
  if (typeof document === 'undefined') return
  const id = 'qixi-letter-font-preload-v8'
  if (document.getElementById(id)) return
  const link = document.createElement('link')
  link.id = id
  link.rel = 'preload'
  link.as = 'font'
  link.type = 'font/woff2'
  link.href = url
  document.head.appendChild(link)
}

function injectFace(url: string): void {
  if (typeof document === 'undefined') return
  const id = 'qixi-letter-font-face-v8'
  if (document.getElementById(id)) return
  const el = document.createElement('style')
  el.id = id
  el.textContent = `@font-face{font-family:'${QIXI_LETTER_FONT_FAMILY}';src:url('${url}') format('woff2');font-display:swap;font-weight:400;font-style:normal;}`
  document.head.appendChild(el)
}

function openFontDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('no idb'))
      return
    }
    const req = indexedDB.open(FONT_IDB, 1)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(FONT_STORE)) db.createObjectStore(FONT_STORE)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error ?? new Error('idb open failed'))
  })
}

async function readCachedFont(): Promise<ArrayBuffer | null> {
  try {
    const db = await openFontDb()
    const buf = await new Promise<ArrayBuffer | null>((resolve, reject) => {
      const tx = db.transaction(FONT_STORE, 'readonly')
      const req = tx.objectStore(FONT_STORE).get(FONT_KEY)
      req.onsuccess = () => {
        const v = req.result
        resolve(v instanceof ArrayBuffer ? v : null)
      }
      req.onerror = () => reject(req.error ?? new Error('idb get failed'))
    })
    db.close()
    return buf
  } catch {
    return null
  }
}

async function writeCachedFont(buf: ArrayBuffer): Promise<void> {
  try {
    const db = await openFontDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(FONT_STORE, 'readwrite')
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error ?? new Error('idb put failed'))
      tx.objectStore(FONT_STORE).put(buf, FONT_KEY)
    })
    db.close()
  } catch {
    /* ignore quota */
  }
}

async function registerFontBuffer(buf: ArrayBuffer): Promise<boolean> {
  if (typeof document === 'undefined' || !('fonts' in document)) return true
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
  return true
}

export function isQixiLetterFontReady(): boolean {
  return loaded
}

/** 开屏立刻开下；不阻塞调用方 */
export function warmQixiLetterFont(): void {
  if (warmStarted || loaded) return
  warmStarted = true
  void ensureQixiLetterFontLoaded()
}

export async function ensureQixiLetterFontLoaded(): Promise<boolean> {
  if (loaded) return true
  if (!injectPromise) {
    injectPromise = (async () => {
      const url = qixiLetterFontUrl()
      if (!url) return false
      injectPreload(url)
      injectFace(url)
      if (typeof document === 'undefined' || !('fonts' in document)) {
        loaded = true
        return true
      }
      try {
        const cached = await readCachedFont()
        if (cached && cached.byteLength > 1000) {
          await registerFontBuffer(cached)
          loaded = true
          return true
        }
        const res = await fetch(url)
        if (!res.ok) throw new Error(`font http ${res.status}`)
        const buf = await res.arrayBuffer()
        if (buf.byteLength < 1000) throw new Error('font too small')
        await registerFontBuffer(buf)
        void writeCachedFont(buf)
        try {
          if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
            const reg = await navigator.serviceWorker.ready
            reg.active?.postMessage({ type: 'lumi-cache-urls', urls: [url] })
          }
        } catch {
          /* ignore */
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
