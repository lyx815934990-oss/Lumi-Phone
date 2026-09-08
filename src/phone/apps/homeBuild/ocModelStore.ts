import { emitOcModelChange } from './ocModelEvents'
import { analyzeAvatarMeshRig, type AvatarMeshRigKind } from './avatarMeshAnalyze'
import { loadOcModelGroup } from './loadOcModel'

const DB_NAME = 'lumi-home-oc-models'
const DB_VERSION = 1
const STORE = 'models'

export type OcModelFormat = 'glb' | 'fbx'

export type OcModelMeta = {
  characterId: string
  format: OcModelFormat
  fileName: string
  fileSize: number
  uploadedAt: number
  /** 用户在自动归一化基础上的额外缩放 */
  scale: number
  /** 上传时检测的骨骼类型 */
  rigKind: AvatarMeshRigKind
}

type OcModelRecord = OcModelMeta & {
  blob: Blob
}

const blobUrlCache = new Map<string, string>()

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onerror = () => reject(req.error ?? new Error('open ocModel db'))
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'characterId' })
      }
    }
    req.onsuccess = () => resolve(req.result)
  })
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error('ocModel tx'))
    tx.onabort = () => reject(tx.error ?? new Error('ocModel tx abort'))
  })
}

export function detectOcModelFormat(file: File): OcModelFormat | null {
  const name = file.name.toLowerCase()
  if (name.endsWith('.glb') || name.endsWith('.gltf')) return 'glb'
  if (name.endsWith('.fbx')) return 'fbx'
  return null
}

async function validateOcModelFile(file: File, format: OcModelFormat): Promise<void> {
  if (file.size <= 0) throw new Error('文件为空')
  const head = new Uint8Array(await file.slice(0, 24).arrayBuffer())
  if (format === 'glb') {
    const magic = new TextDecoder().decode(head.subarray(0, 4))
    if (magic !== 'glTF') throw new Error('不是有效的 GLB 文件')
    return
  }
  const fbxMagic = new TextDecoder().decode(head.subarray(0, 21))
  if (!fbxMagic.startsWith('Kaydara FBX Binary') && !nameLooksLikeAsciiFbx(head)) {
    throw new Error('不是有效的 FBX 文件')
  }
}

function nameLooksLikeAsciiFbx(head: Uint8Array): boolean {
  const text = new TextDecoder().decode(head)
  return text.includes('FBX')
}

function revokeBlobUrl(characterId: string): void {
  const prev = blobUrlCache.get(characterId)
  if (prev) {
    URL.revokeObjectURL(prev)
    blobUrlCache.delete(characterId)
  }
}

async function readRecord(characterId: string): Promise<OcModelRecord | null> {
  const cid = characterId.trim()
  if (!cid) return null
  const db = await openDb()
  try {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).get(cid)
    const row = await new Promise<OcModelRecord | undefined>((resolve, reject) => {
      req.onsuccess = () => resolve(req.result as OcModelRecord | undefined)
      req.onerror = () => reject(req.error ?? new Error('get ocModel'))
    })
    await txDone(tx)
    return row ?? null
  } finally {
    db.close()
  }
}

export async function getOcModelMeta(characterId: string): Promise<OcModelMeta | null> {
  const row = await readRecord(characterId)
  if (!row) return null
  const { blob: _blob, ...meta } = row
  return { ...meta, rigKind: meta.rigKind ?? 'static' }
}

export async function getOcModelBlobUrl(characterId: string): Promise<string | null> {
  const cid = characterId.trim()
  if (!cid) return null
  const cached = blobUrlCache.get(cid)
  if (cached) return cached
  const row = await readRecord(cid)
  if (!row?.blob) return null
  const url = URL.createObjectURL(row.blob)
  blobUrlCache.set(cid, url)
  return url
}

export async function saveOcModel(characterId: string, file: File): Promise<OcModelMeta> {
  const cid = characterId.trim()
  if (!cid) throw new Error('请先选择角色')

  const format = detectOcModelFormat(file)
  if (!format) throw new Error('仅支持 .glb / .gltf / .fbx（请确认扩展名）')

  await validateOcModelFile(file, format)

  let rigKind: AvatarMeshRigKind = 'static'
  const tmpUrl = URL.createObjectURL(file)
  try {
    const loaded = await loadOcModelGroup(tmpUrl, format)
    rigKind = analyzeAvatarMeshRig(loaded.group)
  } catch {
    rigKind = 'static'
  } finally {
    URL.revokeObjectURL(tmpUrl)
  }

  const record: OcModelRecord = {
    characterId: cid,
    format,
    fileName: file.name,
    fileSize: file.size,
    uploadedAt: Date.now(),
    scale: 1,
    rigKind,
    blob: file,
  }

  const db = await openDb()
  try {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(record)
    await txDone(tx)
  } finally {
    db.close()
  }

  revokeBlobUrl(cid)
  emitOcModelChange(cid)
  const { blob: _blob, ...meta } = record
  return meta
}

export async function deleteOcModel(characterId: string): Promise<void> {
  const cid = characterId.trim()
  if (!cid) return

  const db = await openDb()
  try {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(cid)
    await txDone(tx)
  } finally {
    db.close()
  }

  revokeBlobUrl(cid)
  emitOcModelChange(cid)
}

export async function setOcModelScale(characterId: string, scale: number): Promise<OcModelMeta | null> {
  const cid = characterId.trim()
  if (!cid) return null
  const row = await readRecord(cid)
  if (!row) return null

  const nextScale = Number.isFinite(scale) ? Math.min(3, Math.max(0.25, scale)) : 1
  const next: OcModelRecord = { ...row, scale: nextScale, uploadedAt: row.uploadedAt }

  const db = await openDb()
  try {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(next)
    await txDone(tx)
  } finally {
    db.close()
  }

  emitOcModelChange(cid)
  const { blob: _blob, ...meta } = next
  return meta
}

/** 预览/加载后纠正骨骼检测结果（首次导入失败时可能写成 static）。不广播，避免 45MB 预览重载 */
export async function updateOcModelRigKind(
  characterId: string,
  rigKind: AvatarMeshRigKind,
): Promise<OcModelMeta | null> {
  const cid = characterId.trim()
  if (!cid) return null
  const row = await readRecord(cid)
  if (!row) return null
  if (row.rigKind === rigKind) {
    const { blob: _b, ...meta } = row
    return { ...meta, rigKind: meta.rigKind ?? 'static' }
  }

  const next: OcModelRecord = { ...row, rigKind }
  const db = await openDb()
  try {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(next)
    await txDone(tx)
  } finally {
    db.close()
  }

  const { blob: _blob, ...meta } = next
  return meta
}
