export type LumiBootApi = {
  set: (percent: number, label?: string) => void
  /** 进度拉满并淡出开屏前加载层；回调在移除 DOM 后触发 */
  done: (onHidden?: () => void) => void
  get: () => number
  isVisible: () => boolean
}

declare global {
  interface Window {
    __lumiBoot?: LumiBootApi
  }
}

export function markBootProgress(percent: number, label?: string) {
  window.__lumiBoot?.set(percent, label)
}

export function finishBootOverlay(onHidden?: () => void) {
  const boot = window.__lumiBoot
  if (!boot) {
    onHidden?.()
    return
  }
  boot.done(onHidden)
}

export function isBootOverlayVisible() {
  return window.__lumiBoot?.isVisible() ?? false
}
