import { ARCHIVE_KIND, ARCHIVE_VERSION, LUMI_ARCHIVE_IMPORTED_EVENT } from './constants'
import {
  dumpWeChatPersonaIndexedDbSnapshot,
  restoreWeChatPersonaIndexedDbSnapshot,
} from './scanWeChatPersonaIndexedDb'

export type LumiCloudArchive = {
  kind: typeof ARCHIVE_KIND
  /** 1：仅 localStorage；2：含 wechatIndexedDb */
  version: 1 | 2
  exportedAt: number
  localStorage: Record<string, string | null>
  wechatIndexedDb?: {
    dbName: string
    dbVersion: number
    stores: Record<string, unknown[]>
  }
  meta: { generator: string; note?: string }
}

function yieldToUi(): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, 0)
  })
}

/** 粗估 localStorage 体积（字符数），用于导出前提示 */
export function estimateLocalStorageChars(): number {
  if (typeof localStorage === 'undefined') return 0
  let n = 0
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i)
    if (!key) continue
    n += key.length
    n += (localStorage.getItem(key) ?? '').length
  }
  return n
}

export function collectLocalStorageSnapshot(): Record<string, string | null> {
  const out: Record<string, string | null> = {}
  if (typeof localStorage === 'undefined') return out
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i)
    if (!key) continue
    out[key] = localStorage.getItem(key)
  }
  return out
}

/** 默认归档主文件名（不含后缀） */
export function defaultLumiArchiveBaseName(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `Lumi_Archive_${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`
}

function sanitizeUserArchiveBaseName(input: string): string {
  let t = input.replace(/[\\/:*?"<>|\u0000-\u001F]/g, '_').replace(/\s+/g, ' ').trim()
  t = t.replace(/\.(lumi|json)$/i, '')
  t = t.replace(/^\.+/, '').replace(/\.+$/g, '').trim()
  if (t.length > 100) t = t.slice(0, 100)
  return t
}

/** 生成安全下载文件名：JSON 数据包，后缀固定 .json（旧版 .lumi 仍可导入） */
export function buildLumiArchiveDownloadFilename(userLabel: string | null | undefined): string {
  const cleaned = sanitizeUserArchiveBaseName(userLabel ?? '')
  const base = cleaned || defaultLumiArchiveBaseName()
  return `${base}.json`
}

function toExportError(error: unknown): Error {
  if (error instanceof Error) {
    const msg = error.message || ''
    const name = error.name || ''
    if (
      name === 'RangeError' ||
      /out of memory|allocation failed|invalid string length|maximum call stack/i.test(msg)
    ) {
      return new Error(
        '本机数据过大，导出时内存不足。请先删掉部分桌面组件大图 / 名片自定义字体后再试，或换电脑浏览器导出。',
      )
    }
    return error
  }
  return new Error('导出失败')
}

function isIosLike(): boolean {
  if (typeof navigator === 'undefined') return false
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  )
}

type JsonBlobBuilder = {
  parts: BlobPart[]
  approxChars: number
  push: (chunk: string) => void
  flush: () => Promise<void>
}

function createJsonBlobBuilder(): JsonBlobBuilder {
  const parts: BlobPart[] = []
  let approxChars = 0
  let sinceYield = 0
  const builder: JsonBlobBuilder = {
    parts,
    approxChars: 0,
    push(chunk: string) {
      parts.push(chunk)
      approxChars += chunk.length
      builder.approxChars = approxChars
      sinceYield += chunk.length
    },
    async flush() {
      // 每拼约 256KB 文本让出主线程，减轻 iOS 卡死/OOM 连带「模块加载失败」
      if (sinceYield < 262_144) return
      sinceYield = 0
      await yieldToUi()
    },
  }
  return builder
}

/**
 * 分片拼出归档 JSON Blob：避免整包 JSON.stringify 同时占着对象树 + 巨串，
 * 这是手机上导出后报「Importing a module script failed」的主因。
 */
async function buildArchiveBlobFromParts(
  localStorageSnap: Record<string, string | null>,
  idb: {
    dbName: string
    dbVersion: number
    stores: Record<string, unknown[]>
  } | null,
): Promise<{ blob: Blob; approxBytes: number }> {
  const b = createJsonBlobBuilder()
  const note = idb
    ? '含 localStorage 与当前已接入的 IndexedDB 全表快照。'
    : '含 localStorage；未发现已接入的 IndexedDB（若尚未产生索引数据则属正常）。'

  try {
    b.push('{')
    b.push(`"kind":${JSON.stringify(ARCHIVE_KIND)}`)
    b.push(`,"version":${ARCHIVE_VERSION}`)
    b.push(`,"exportedAt":${Date.now()}`)
    b.push(',"localStorage":{')

    const lsKeys = Object.keys(localStorageSnap)
    for (let i = 0; i < lsKeys.length; i += 1) {
      const key = lsKeys[i]!
      if (i > 0) b.push(',')
      b.push(JSON.stringify(key))
      b.push(':')
      b.push(JSON.stringify(localStorageSnap[key] ?? null))
      delete localStorageSnap[key]
      await b.flush()
    }
    b.push('}')

    if (idb) {
      b.push(',"wechatIndexedDb":{')
      b.push(`"dbName":${JSON.stringify(idb.dbName)}`)
      b.push(`,"dbVersion":${idb.dbVersion}`)
      b.push(',"stores":{')
      const storeNames = Object.keys(idb.stores)
      for (let si = 0; si < storeNames.length; si += 1) {
        const storeName = storeNames[si]!
        const rows = idb.stores[storeName] ?? []
        if (si > 0) b.push(',')
        b.push(JSON.stringify(storeName))
        b.push(':[')
        for (let ri = 0; ri < rows.length; ri += 1) {
          if (ri > 0) b.push(',')
          try {
            b.push(JSON.stringify(rows[ri]))
          } catch (e) {
            throw toExportError(e)
          }
          ;(rows as unknown[])[ri] = undefined
          if (ri % 24 === 23) await b.flush()
        }
        b.push(']')
        delete idb.stores[storeName]
        await yieldToUi()
      }
      b.push('}}')
    }

    b.push(',"meta":{')
    b.push(`"generator":${JSON.stringify('Lumi Phone · Data Archive')}`)
    b.push(`,"note":${JSON.stringify(note)}`)
    b.push('}}')
  } catch (e) {
    b.parts.length = 0
    throw toExportError(e)
  }

  let blob: Blob
  try {
    // 下载用 octet-stream：iOS 对 application/json 常会另存成「文本」无后缀文件
    blob = new Blob(b.parts, { type: 'application/octet-stream' })
  } catch (e) {
    throw toExportError(e)
  } finally {
    b.parts.length = 0
  }

  return { blob, approxBytes: b.approxChars * 2 }
}

export async function exportDataToFile(options?: {
  /** 用户自定义主文件名，可不含后缀；非法字符会替换为下划线 */
  displayName?: string | null
}): Promise<{ blob: Blob; filename: string; approxBytes: number }> {
  await yieldToUi()
  const idbSnap = await dumpWeChatPersonaIndexedDbSnapshot()
  await yieldToUi()
  const localStorageSnap = collectLocalStorageSnapshot()
  await yieldToUi()

  let blob: Blob
  let approxBytes: number
  try {
    const built = await buildArchiveBlobFromParts(localStorageSnap, idbSnap)
    blob = built.blob
    approxBytes = built.approxBytes
  } catch (e) {
    throw toExportError(e)
  }

  // 再让出一两帧，给 Safari 回收刚拆掉的对象树
  await yieldToUi()
  await yieldToUi()

  const filename = buildLumiArchiveDownloadFilename(options?.displayName)
  return { blob, filename, approxBytes }
}

type ShareNavigator = Navigator & {
  share?: (data: ShareData) => Promise<void>
  canShare?: (data: ShareData) => boolean
}

/**
 * 触发下载。
 * iOS：只用系统分享保存文件；禁止再走 a.download（Safari 会无视文件名，另存成「文本」）。
 * 桌面：a.download。
 */
export async function downloadBlob(blob: Blob, filename: string): Promise<void> {
  const nav = navigator as ShareNavigator
  const ios = isIosLike()
  const safeName = /\.(json|lumi)$/i.test(filename) ? filename : `${filename}.json`
  // 强制二进制类型，避免被当成可编辑「文本」文档
  const binaryBlob =
    blob.type === 'application/octet-stream'
      ? blob
      : new Blob([blob], { type: 'application/octet-stream' })

  if (ios && typeof nav.share === 'function') {
    try {
      const file = new File([binaryBlob], safeName, {
        type: 'application/octet-stream',
      })
      const data: ShareData = { files: [file] }
      if (typeof nav.canShare !== 'function' || nav.canShare(data)) {
        await nav.share(data)
        return
      }
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') return
      throw new Error(
        '无法打开系统分享面板保存文件。请点分享里的「存储到文件」，不要选「拷贝」或「备忘录」（会变成文本）。',
      )
    }
    throw new Error(
      '当前系统不支持分享保存文件。请换用电脑浏览器导出，或升级 iOS 后再试。',
    )
  }

  const url = URL.createObjectURL(binaryBlob)
  try {
    const a = document.createElement('a')
    a.href = url
    a.download = safeName
    a.rel = 'noopener'
    document.body.appendChild(a)
    a.click()
    a.remove()
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(url), 2500)
  }
}

export type ImportArchiveResult = { keysRestored: number; indexedDbRestored: boolean }

/**
 * 从 .lumi / .json 恢复。v1 仅 localStorage；v2 另写回归档内附带的 IndexedDB 主库（须本机已有对应库结构）。
 */
export async function importDataFromFile(text: string): Promise<ImportArchiveResult> {
  let parsed: unknown
  try {
    parsed = JSON.parse(text) as unknown
  } catch {
    throw new Error('文件不是有效的 JSON，无法解析。')
  }
  if (!parsed || typeof parsed !== 'object') throw new Error('归档格式无效（根节点须为对象）。')
  const o = parsed as Record<string, unknown>
  if (o.kind !== ARCHIVE_KIND) throw new Error('不是 Lumi 数据中心归档文件（缺少识别标记）。')
  const ver = Number(o.version)
  if (ver !== 1 && ver !== 2) throw new Error(`不支持的归档版本：${String(o.version)}（支持 1 或 2）。`)

  let indexedDbRestored = false
  if (ver >= 2) {
    const idb = o.wechatIndexedDb
    if (idb && typeof idb === 'object' && !Array.isArray(idb)) {
      const stores = (idb as Record<string, unknown>).stores
      if (stores && typeof stores === 'object' && !Array.isArray(stores)) {
        await restoreWeChatPersonaIndexedDbSnapshot(stores as Record<string, unknown[]>)
        indexedDbRestored = true
      }
    }
  }

  const snap = o.localStorage
  if (!snap || typeof snap !== 'object' || Array.isArray(snap)) {
    throw new Error('归档中缺少 localStorage 快照。')
  }
  const entries = Object.entries(snap as Record<string, unknown>)
  let n = 0
  for (const [k, v] of entries) {
    if (typeof k !== 'string' || !k.trim()) continue
    if (v === null || v === undefined) {
      localStorage.removeItem(k)
    } else if (typeof v === 'string') {
      localStorage.setItem(k, v)
    } else {
      localStorage.setItem(k, JSON.stringify(v))
    }
    n += 1
  }

  if (indexedDbRestored) {
    try {
      const { reconcileWeChatCharacterOwnershipAfterArchiveImport } = await import(
        '../wechat/wechatAccountPersistence',
      )
      await reconcileWeChatCharacterOwnershipAfterArchiveImport()
    } catch {
      /* 归属修复失败不阻断导入；名册页仍会尝试自愈 */
    }
  }

  if (typeof window !== 'undefined') {
    try {
      // 先锁微信内存回写并清进程缓存，再派发事件；避免导入前打开的注册空态覆盖刚恢复的账号
      const { markWechatStorePendingDiskRehydrate } = await import('../wechat/useWechatStore')
      markWechatStorePendingDiskRehydrate()
    } catch {
      /* ignore */
    }
    try {
      const { emitWeChatStorageChanged } = await import('../wechat/newFriendsPersona/idb')
      emitWeChatStorageChanged()
    } catch {
      window.dispatchEvent(new CustomEvent('wechat-storage-changed'))
    }
    window.dispatchEvent(new CustomEvent(LUMI_ARCHIVE_IMPORTED_EVENT))
  }

  return { keysRestored: n, indexedDbRestored }
}
