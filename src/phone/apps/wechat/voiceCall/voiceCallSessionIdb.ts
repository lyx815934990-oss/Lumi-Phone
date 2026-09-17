import type { VoiceLogSource } from './terminalChic/types'

const DB_NAME = 'wechat-voice-call-sessions-v1'
const DB_VERSION = 1
const SESSION_STORE = 'sessions'
const AUDIO_STORE = 'audios'

export type PersistedVoiceCallLine = {
  id: string
  source: VoiceLogSource
  text: string
  audioId?: string
  durationSec?: number
  createdAt: number
}

export type PersistedVoiceCallSession = {
  id: string
  characterId: string
  accountId: string
  playerIdentityId?: string
  peerName: string
  peerAvatarUrl?: string
  initiator: 'self' | 'other'
  startedAt: number
  durationSec: number
  lines: PersistedVoiceCallLine[]
  createdAt: number
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onerror = () => reject(req.error ?? new Error('open voice-call db failed'))
    req.onsuccess = () => resolve(req.result)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(SESSION_STORE)) {
        const s = db.createObjectStore(SESSION_STORE, { keyPath: 'id' })
        s.createIndex('byCharacter', 'characterId', { unique: false })
        s.createIndex('byCreated', 'createdAt', { unique: false })
      }
      if (!db.objectStoreNames.contains(AUDIO_STORE)) {
        db.createObjectStore(AUDIO_STORE, { keyPath: 'id' })
      }
    }
  })
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error('tx failed'))
    tx.onabort = () => reject(tx.error ?? new Error('tx aborted'))
  })
}

async function dataUrlOrBlobToBlob(src: string | Blob): Promise<Blob | null> {
  if (src instanceof Blob) return src
  const s = src.trim()
  if (!s) return null
  if (s.startsWith('blob:')) {
    try {
      const res = await fetch(s)
      return await res.blob()
    } catch {
      return null
    }
  }
  if (s.startsWith('data:')) {
    try {
      const res = await fetch(s)
      return await res.blob()
    } catch {
      return null
    }
  }
  return null
}

export async function putVoiceCallAudio(audioId: string, src: string | Blob): Promise<boolean> {
  const blob = await dataUrlOrBlobToBlob(src)
  if (!blob || blob.size <= 0) return false
  const db = await openDb()
  const tx = db.transaction(AUDIO_STORE, 'readwrite')
  tx.objectStore(AUDIO_STORE).put({
    id: audioId,
    blob,
    mime: blob.type || 'audio/webm',
    createdAt: Date.now(),
  })
  await txDone(tx)
  db.close()
  return true
}

export async function getVoiceCallAudioBlob(audioId: string): Promise<Blob | null> {
  const id = audioId.trim()
  if (!id) return null
  const db = await openDb()
  const tx = db.transaction(AUDIO_STORE, 'readonly')
  const req = tx.objectStore(AUDIO_STORE).get(id)
  const row = await new Promise<unknown>((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  await txDone(tx)
  db.close()
  if (!row || typeof row !== 'object') return null
  const blob = (row as { blob?: unknown }).blob
  return blob instanceof Blob ? blob : null
}

export async function getVoiceCallAudioObjectUrl(audioId: string): Promise<string | null> {
  const blob = await getVoiceCallAudioBlob(audioId)
  if (!blob) return null
  return URL.createObjectURL(blob)
}

export async function upsertVoiceCallSession(session: PersistedVoiceCallSession): Promise<void> {
  const db = await openDb()
  const tx = db.transaction(SESSION_STORE, 'readwrite')
  tx.objectStore(SESSION_STORE).put(session)
  await txDone(tx)
  db.close()
}

export async function getVoiceCallSession(sessionId: string): Promise<PersistedVoiceCallSession | null> {
  const id = sessionId.trim()
  if (!id) return null
  const db = await openDb()
  const tx = db.transaction(SESSION_STORE, 'readonly')
  const req = tx.objectStore(SESSION_STORE).get(id)
  const row = await new Promise<unknown>((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  await txDone(tx)
  db.close()
  if (!row || typeof row !== 'object') return null
  return row as PersistedVoiceCallSession
}

export async function listVoiceCallSessionsForCharacter(
  characterId: string,
  limit = 40,
): Promise<PersistedVoiceCallSession[]> {
  const cid = characterId.trim()
  if (!cid) return []
  const db = await openDb()
  const tx = db.transaction(SESSION_STORE, 'readonly')
  const idx = tx.objectStore(SESSION_STORE).index('byCharacter')
  const req = idx.getAll(cid)
  const rows = await new Promise<PersistedVoiceCallSession[]>((resolve, reject) => {
    req.onsuccess = () => resolve((req.result as PersistedVoiceCallSession[]) ?? [])
    req.onerror = () => reject(req.error)
  })
  await txDone(tx)
  db.close()
  return rows.sort((a, b) => b.createdAt - a.createdAt).slice(0, Math.max(1, limit))
}
