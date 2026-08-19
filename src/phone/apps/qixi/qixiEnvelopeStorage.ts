/** 七夕信封 · 仅 2026-08-19 当天可开；当日可重复打开（关闭不挡再进） */

import type { QixiLetterResult } from './qixiLetterAi'
import { getStoredUsername } from '../../userSystem/userSystemApi'

/** 会话内已自动弹出过（避免同次进桌面反复自动弹；手动入口仍可开） */
let sessionAutoOffered = false

export const QIXI_EVENT_YEAR = 2026
export const QIXI_EVENT_MONTH = 8
export const QIXI_EVENT_DAY = 19

/** 桌面手动打开七夕信封 */
export const QIXI_OPEN_EVENT = 'lumi-open-qixi-envelope'

const LETTERS_KEY = 'lumi-qixi-letters-v1'
const IDB_NAME = 'lumi-qixi-envelope-v1'
const IDB_STORE = 'letters'
const IDB_VERSION = 1
/** 每用户当天自动开屏只触发一次：username -> 日历日 */
const AUTO_OFFER_KEY = 'lumi-qixi-auto-offered-by-user-v1'

export type QixiOpenEventDetail = {
  /** 是否播放仪式感开屏（自动弹出为 true，桌面重开为 false） */
  withCeremony?: boolean
}

type QixiLetterRow = {
  day: string
  letter: QixiLetterResult
  savedAt: number
}

type QixiLetterStore = Record<string, QixiLetterRow>

/** 同一次打开 App 内立刻可命中，不依赖磁盘 */
const memLetters = new Map<string, QixiLetterRow>()
let hydratePromise: Promise<void> | null = null
let hydrated = false

export function qixiCalendarDayKey(d = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** 本地日历是否为 2026-08-19（8 月 20 日 00:00 起为 false） */
export function isQixiEnvelopeEventDay(d = new Date()): boolean {
  return (
    d.getFullYear() === QIXI_EVENT_YEAR &&
    d.getMonth() + 1 === QIXI_EVENT_MONTH &&
    d.getDate() === QIXI_EVENT_DAY
  )
}

function qixiUserKey(): string {
  const name = getStoredUsername()?.trim()
  return name || '__local__'
}

function readAutoOfferMap(): Record<string, string> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(AUTO_OFFER_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, string>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export function wasQixiAutoOfferedTodayForUser(d = new Date()): boolean {
  const map = readAutoOfferMap()
  return map[qixiUserKey()] === qixiCalendarDayKey(d)
}

/** 记下该用户今日已自动弹出过开屏（刷新/重进不再自动触发） */
export function markQixiAutoOfferedTodayForUser(d = new Date()): void {
  if (typeof window === 'undefined') return
  sessionAutoOffered = true
  try {
    const map = readAutoOfferMap()
    map[qixiUserKey()] = qixiCalendarDayKey(d)
    window.localStorage.setItem(AUTO_OFFER_KEY, JSON.stringify(map))
  } catch {
    /* ignore */
  }
}

export function wasQixiEnvelopeAutoOfferedThisSession(): boolean {
  return sessionAutoOffered
}

export function markQixiEnvelopeAutoOfferedThisSession(): void {
  sessionAutoOffered = true
}

/** 演进结束后是否自动弹出（当日 + 该用户今日尚未自动弹过） */
export function shouldOfferQixiEnvelope(d = new Date()): boolean {
  if (!isQixiEnvelopeEventDay(d)) return false
  if (sessionAutoOffered) return false
  if (wasQixiAutoOfferedTodayForUser(d)) return false
  return true
}

export function dispatchOpenQixiEnvelope(detail: QixiOpenEventDetail = {}): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(QIXI_OPEN_EVENT, { detail }))
}

/** 开发强制：清会话自动弹出标记与当日用户记录 */
export function resetQixiEnvelopeDismissals(): void {
  sessionAutoOffered = false
  if (typeof window === 'undefined') return
  try {
    const map = readAutoOfferMap()
    delete map[qixiUserKey()]
    window.localStorage.setItem(AUTO_OFFER_KEY, JSON.stringify(map))
  } catch {
    /* ignore */
  }
}

function isUsableLetterRow(row: QixiLetterRow | undefined, d = new Date()): row is QixiLetterRow {
  return Boolean(row?.letter?.body?.trim() && row.day === qixiCalendarDayKey(d))
}

function letterFromRow(row: QixiLetterRow): QixiLetterResult {
  const letter = row.letter
  if (letter.signedAt?.trim()) return letter
  const fallback = new Date(row.savedAt)
  return {
    ...letter,
    signedAt: Number.isFinite(fallback.getTime())
      ? `${fallback.getFullYear()}年${fallback.getMonth() + 1}月${fallback.getDate()}日 ${String(fallback.getHours()).padStart(2, '0')}:${String(fallback.getMinutes()).padStart(2, '0')}`
      : '',
  }
}

function readLetterStore(): QixiLetterStore {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(LETTERS_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as QixiLetterStore
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeLetterStore(store: QixiLetterStore): void {
  if (typeof window === 'undefined') return
  const persist = (data: QixiLetterStore) => {
    window.localStorage.setItem(LETTERS_KEY, JSON.stringify(data))
  }
  try {
    persist(store)
  } catch {
    const day = qixiCalendarDayKey()
    const slim: QixiLetterStore = {}
    for (const [id, row] of Object.entries(store)) {
      if (row?.day === day) slim[id] = row
    }
    try {
      persist(slim)
    } catch {
      /* IndexedDB 仍会留下 */
    }
  }
}

function openQixiLetterDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('no idb'))
      return
    }
    const req = indexedDB.open(IDB_NAME, IDB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(IDB_STORE)) db.createObjectStore(IDB_STORE)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error ?? new Error('idb open failed'))
  })
}

async function idbPutLetter(characterId: string, row: QixiLetterRow): Promise<void> {
  const db = await openQixiLetterDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite')
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error('idb put failed'))
    tx.objectStore(IDB_STORE).put(row, characterId)
  })
  db.close()
}

async function idbReadAllLetters(): Promise<QixiLetterStore> {
  const db = await openQixiLetterDb()
  const out = await new Promise<QixiLetterStore>((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readonly')
    const req = tx.objectStore(IDB_STORE).openCursor()
    const store: QixiLetterStore = {}
    req.onsuccess = () => {
      const cursor = req.result
      if (!cursor) return
      const key = String(cursor.key ?? '')
      const value = cursor.value as QixiLetterRow
      if (key && value?.letter?.body) store[key] = value
      cursor.continue()
    }
    tx.oncomplete = () => resolve(store)
    tx.onerror = () => reject(tx.error ?? new Error('idb read failed'))
  })
  db.close()
  return out
}

function mergeLetterStores(...stores: QixiLetterStore[]): void {
  for (const store of stores) {
    for (const [id, row] of Object.entries(store)) {
      const cid = id.trim()
      if (!cid || !row?.letter?.body?.trim()) continue
      const prev = memLetters.get(cid)
      if (!prev || (row.savedAt ?? 0) >= (prev.savedAt ?? 0)) memLetters.set(cid, row)
    }
  }
}

export async function hydrateQixiLetterStore(): Promise<void> {
  if (hydrated) return
  if (!hydratePromise) {
    hydratePromise = (async () => {
      mergeLetterStores(readLetterStore())
      try {
        mergeLetterStores(await idbReadAllLetters())
      } catch {
        /* 无 IndexedDB 时仍可用内存 / localStorage */
      }
      for (const [id, row] of memLetters) {
        void idbPutLetter(id, row).catch(() => {
          /* ignore */
        })
      }
      hydrated = true
    })().catch(() => {
      hydratePromise = null
      hydrated = true
    })
  }
  await hydratePromise
}

function pickStoredLetterRow(characterId: string): QixiLetterRow | undefined {
  const cid = characterId.trim()
  if (!cid) return undefined
  return memLetters.get(cid) ?? readLetterStore()[cid]
}

export function loadSavedQixiLetter(characterId: string, d = new Date()): QixiLetterResult | null {
  const row = pickStoredLetterRow(characterId)
  if (!isUsableLetterRow(row, d)) return null
  return letterFromRow(row)
}

export async function loadSavedQixiLetterAsync(
  characterId: string,
  d = new Date(),
): Promise<QixiLetterResult | null> {
  await hydrateQixiLetterStore()
  return loadSavedQixiLetter(characterId, d)
}

export function saveQixiLetter(characterId: string, letter: QixiLetterResult, d = new Date()): void {
  void saveQixiLetterAsync(characterId, letter, d)
}

export async function saveQixiLetterAsync(
  characterId: string,
  letter: QixiLetterResult,
  d = new Date(),
): Promise<void> {
  const cid = characterId.trim()
  if (!cid || !letter.body?.trim()) return
  const row: QixiLetterRow = { day: qixiCalendarDayKey(d), letter, savedAt: Date.now() }
  memLetters.set(cid, row)
  const store = readLetterStore()
  store[cid] = row
  writeLetterStore(store)
  try {
    await idbPutLetter(cid, row)
  } catch {
    /* 内存已留下，关掉再开仍可命中同一次会话 */
  }
}

export function listSavedQixiLetterIds(d = new Date()): Set<string> {
  const day = qixiCalendarDayKey(d)
  const ids = new Set<string>()
  const consider = (id: string, row: QixiLetterRow | undefined) => {
    if (row?.day === day && row.letter?.body?.trim()) ids.add(id)
  }
  for (const [id, row] of memLetters) consider(id, row)
  for (const [id, row] of Object.entries(readLetterStore())) consider(id, row)
  return ids
}

export async function listSavedQixiLetterIdsAsync(d = new Date()): Promise<Set<string>> {
  await hydrateQixiLetterStore()
  return listSavedQixiLetterIds(d)
}

/** @deprecated 兼容旧调用名 */
export function markQixiEnvelopeShownThisSession(): void {
  markQixiEnvelopeAutoOfferedThisSession()
}

/** @deprecated 关闭不再写入「今日不再弹」 */
export function dismissQixiEnvelopeForToday(_d = new Date()): void {
  /* no-op：当日可重复打开 */
}
