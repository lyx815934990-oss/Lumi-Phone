/** 触觉反馈：不支持时静默跳过 */
export function sleepHaptic(ms = 12) {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(ms)
    }
  } catch {
    // ignore
  }
}
