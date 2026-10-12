/** 情侣空间纪念日 · 全局提醒推送（今日关闭 / 本次关闭） */

export const COUPLE_REMIND_TEST_EVENT = 'lumi:couple-remind-test'

const TODAY_DISMISS_KEY = 'lumi-couple-remind-push-dismissed-date-v1'

/** 本次页面生命周期内关闭后不再弹（刷新可再弹） */
let sessionDismissed = false

export function coupleRemindPushTodayKey(d = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function isCoupleRemindPushHiddenToday(): boolean {
  if (typeof window === 'undefined') return true
  try {
    return window.localStorage.getItem(TODAY_DISMISS_KEY) === coupleRemindPushTodayKey()
  } catch {
    return false
  }
}

export function dismissCoupleRemindPushForToday(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(TODAY_DISMISS_KEY, coupleRemindPushTodayKey())
  } catch {
    /* ignore */
  }
}

export function isCoupleRemindPushDismissedThisSession(): boolean {
  return sessionDismissed
}

export function dismissCoupleRemindPushThisSession(): void {
  sessionDismissed = true
}

export function shouldOfferCoupleRemindPush(): boolean {
  if (isCoupleRemindPushDismissedThisSession()) return false
  if (isCoupleRemindPushHiddenToday()) return false
  return true
}

/** 开发测试：清掉关闭标记 */
export function resetCoupleRemindPushDismissals(): void {
  sessionDismissed = false
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(TODAY_DISMISS_KEY)
  } catch {
    /* ignore */
  }
}

/** 手动预览全局提醒仪式（不计入今日关闭） */
export function requestCoupleRemindTestPreview(detail?: {
  charName?: string
  userName?: string
  charAvatarUrl?: string
  userAvatarUrl?: string
}): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(
    new CustomEvent(COUPLE_REMIND_TEST_EVENT, {
      detail: {
        charName: detail?.charName?.trim() || '对方',
        userName: detail?.userName?.trim() || '我',
        charAvatarUrl: detail?.charAvatarUrl?.trim() || undefined,
        userAvatarUrl: detail?.userAvatarUrl?.trim() || undefined,
      },
    }),
  )
}
