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
/** 每用户当天自动开屏只触发一次：username -> 日历日 */
const AUTO_OFFER_KEY = 'lumi-qixi-auto-offered-by-user-v1'

export type QixiOpenEventDetail = {
  /** 是否播放仪式感开屏（自动弹出为 true，桌面重开为 false） */
  withCeremony?: boolean
}

type QixiLetterStore = Record<
  string,
  {
    day: string
    letter: QixiLetterResult
    savedAt: number
  }
>

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
  try {
    window.localStorage.setItem(LETTERS_KEY, JSON.stringify(store))
  } catch {
    /* quota */
  }
}

export function loadSavedQixiLetter(characterId: string, d = new Date()): QixiLetterResult | null {
  const cid = characterId.trim()
  if (!cid) return null
  const row = readLetterStore()[cid]
  if (!row?.letter?.body?.trim()) return null
  if (row.day !== qixiCalendarDayKey(d)) return null
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

export function saveQixiLetter(characterId: string, letter: QixiLetterResult, d = new Date()): void {
  const cid = characterId.trim()
  if (!cid || !letter.body?.trim()) return
  const store = readLetterStore()
  store[cid] = { day: qixiCalendarDayKey(d), letter, savedAt: Date.now() }
  writeLetterStore(store)
}

export function listSavedQixiLetterIds(d = new Date()): Set<string> {
  const day = qixiCalendarDayKey(d)
  const ids = new Set<string>()
  for (const [id, row] of Object.entries(readLetterStore())) {
    if (row?.day === day && row.letter?.body?.trim()) ids.add(id)
  }
  return ids
}

/** @deprecated 兼容旧调用名 */
export function markQixiEnvelopeShownThisSession(): void {
  markQixiEnvelopeAutoOfferedThisSession()
}

/** @deprecated 关闭不再写入「今日不再弹」 */
export function dismissQixiEnvelopeForToday(_d = new Date()): void {
  /* no-op：当日可重复打开 */
}
