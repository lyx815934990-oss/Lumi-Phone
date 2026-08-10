/** 开屏开关同步键：供启动瞬间读取（不等 IndexedDB 水合） */
export const SPLASH_PREF_STORAGE_KEY = 'lumi-enable-splash-screen'
const CUSTOM_STORAGE_KEY = 'lumi-phone-custom-v4'

/** 默认开启；仅明确关闭时返回 false */
export function readEnableSplashScreenSync(): boolean {
  if (typeof window === 'undefined') return true
  try {
    const v = window.localStorage.getItem(SPLASH_PREF_STORAGE_KEY)
    if (v === '0') return false
    if (v === '1') return true
    // 兼容：独立键尚未写入时，从外观完整缓存读取
    const raw = window.localStorage.getItem(CUSTOM_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as { ui?: { enableSplashScreen?: unknown } }
      if (typeof parsed?.ui?.enableSplashScreen === 'boolean') {
        return parsed.ui.enableSplashScreen
      }
    }
  } catch {
    /* ignore */
  }
  return true
}

export function writeEnableSplashScreenSync(enabled: boolean): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(SPLASH_PREF_STORAGE_KEY, enabled ? '1' : '0')
  } catch {
    /* ignore */
  }
}
