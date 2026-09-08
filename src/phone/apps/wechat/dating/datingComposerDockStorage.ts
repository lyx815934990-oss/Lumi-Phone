const LS_KEY = 'wechat-dating-composer-collapsed'

export function loadDatingComposerCollapsed(): boolean {
  if (typeof localStorage === 'undefined') return false
  try {
    return localStorage.getItem(LS_KEY) === '1'
  } catch {
    return false
  }
}

export function saveDatingComposerCollapsed(collapsed: boolean): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(LS_KEY, collapsed ? '1' : '0')
  } catch {
    // ignore quota
  }
}
