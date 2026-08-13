/** 系统演进录入机推送 · 今日关闭 / 本次关闭 / 已读（跳过强制停留） */

const TODAY_DISMISS_KEY = 'lumi-evolution-push-dismissed-date-v2'
/** 已读过该版本更新内容（含强制停留结束或点进完整日志）→ 再次弹出不再强制 15 秒 */
const READ_VERSION_KEY = 'lumi-evolution-push-read-version-v1'

/**
 * 「关闭」仅本次页面生命周期有效（刷新 / 重新打开会再弹）。
 * 切勿用 sessionStorage：同标签刷新不会清掉，会和文案「刷新仍提醒」冲突。
 */
const sessionDismissedVersions = new Set<string>()

export function evolutionPushTodayKey(d = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function todayDismissToken(version: string): string {
  return `${evolutionPushTodayKey()}::${version.trim()}`
}

export function isEvolutionPushHiddenToday(version: string): boolean {
  if (typeof window === 'undefined') return true
  try {
    return window.localStorage.getItem(TODAY_DISMISS_KEY) === todayDismissToken(version)
  } catch {
    return false
  }
}

export function dismissEvolutionPushForToday(version: string): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(TODAY_DISMISS_KEY, todayDismissToken(version))
  } catch {
    // ignore
  }
}

export function isEvolutionPushDismissedThisSession(version: string): boolean {
  return sessionDismissedVersions.has(version.trim())
}

export function dismissEvolutionPushThisSession(version: string): void {
  const v = version.trim()
  if (!v) return
  sessionDismissedVersions.add(v)
}

export function isEvolutionPushVersionRead(version: string): boolean {
  if (typeof window === 'undefined') return true
  const v = version.trim()
  if (!v) return true
  try {
    return window.localStorage.getItem(READ_VERSION_KEY) === v
  } catch {
    return false
  }
}

export function markEvolutionPushVersionRead(version: string): void {
  if (typeof window === 'undefined') return
  const v = version.trim()
  if (!v) return
  try {
    window.localStorage.setItem(READ_VERSION_KEY, v)
  } catch {
    // ignore
  }
}

/** 本地测试：清掉「今日关闭 / 本次关闭 / 已读」，下次满足条件会再弹且需重新停留 */
export function resetEvolutionPushDismissals(): void {
  sessionDismissedVersions.clear()
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(TODAY_DISMISS_KEY)
    window.localStorage.removeItem(READ_VERSION_KEY)
    window.localStorage.removeItem('lumi-evolution-push-dismissed-date-v1')
    // 清掉旧版误用的 sessionStorage，避免历史残留继续挡弹窗
    window.sessionStorage.removeItem('lumi-evolution-push-session-dismissed-v1')
    window.sessionStorage.removeItem('lumi-evolution-push-session-dismissed-v2')
  } catch {
    // ignore
  }
}

export function shouldOfferEvolutionPush(version: string): boolean {
  const v = version.trim()
  if (!v) return false
  return !isEvolutionPushHiddenToday(v) && !isEvolutionPushDismissedThisSession(v)
}

/** 一次性清掉旧版 sessionStorage 残留（曾导致「没点今日关闭却刷新也不弹」） */
let clearedLegacySessionDismiss = false
export function clearLegacyEvolutionPushSessionDismiss(): void {
  if (clearedLegacySessionDismiss || typeof window === 'undefined') return
  clearedLegacySessionDismiss = true
  try {
    window.sessionStorage.removeItem('lumi-evolution-push-session-dismissed-v1')
    window.sessionStorage.removeItem('lumi-evolution-push-session-dismissed-v2')
  } catch {
    // ignore
  }
}
