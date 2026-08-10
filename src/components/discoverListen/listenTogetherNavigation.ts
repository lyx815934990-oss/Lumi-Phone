import { useMusicStore } from '../../stores/useMusicStore'
import type { AppSlot } from '../../phone/types'

export const LISTEN_TOGETHER_NAVIGATE_EVENT = 'listen-together:navigate'
export const LISTEN_TOGETHER_FULLSCREEN_EVENT = 'listen-together:fullscreen'

/** 从任意应用直接唤起全屏歌词/播放页（不跳转微信发现 Tab） */
export function navigateToListenTogetherFullscreen(): void {
  useMusicStore.getState().openListenFullscreen()
}

/** 发现页尚未挂载时，先记下再进听一听 */
let pendingOpenListenTogether = false

export function consumePendingOpenListenTogether(): boolean {
  const open = pendingOpenListenTogether
  pendingOpenListenTogether = false
  return open
}

/** 打开微信发现 → 听一听（与微博广场同类深链） */
export function openListenTogetherApp(): void {
  pendingOpenListenTogether = true
  window.dispatchEvent(
    new CustomEvent<{ id: AppSlot['id'] }>('phone:open-app', { detail: { id: 'wechat' } }),
  )
  window.dispatchEvent(new CustomEvent(LISTEN_TOGETHER_NAVIGATE_EVENT))
}
