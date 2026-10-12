/** 聊天顶栏：抵消 iOS visualViewport.offsetTop，与输入栏 inset 同为 DOM 直写（避免 setState 掉帧） */

export type WeChatChatHeaderPinMode = 'flow' | 'absolute'

export function readVisualViewportOffsetTop(): number {
  if (typeof window === 'undefined') return 0
  const vv = window.visualViewport
  return Math.max(0, Math.round(vv?.offsetTop || 0))
}

export function applyWeChatChatHeaderViewportPin(
  el: HTMLElement | null | undefined,
  offsetTop: number,
  mode: WeChatChatHeaderPinMode,
): void {
  if (!el) return
  const topPx = Math.max(0, Math.round(offsetTop))
  if (mode === 'absolute') {
    el.style.transform = ''
    el.style.willChange = ''
    el.style.zIndex = topPx > 0 ? '50' : ''
    el.style.top = topPx > 0 ? `${topPx}px` : ''
    return
  }
  el.style.top = ''
  if (topPx > 0) {
    el.style.position = 'relative'
    el.style.zIndex = '50'
    el.style.transform = `translate3d(0, ${topPx}px, 0)`
    el.style.willChange = 'transform'
  } else {
    el.style.position = ''
    el.style.zIndex = ''
    el.style.transform = ''
    el.style.willChange = ''
  }
}

/** ChatRoom 键盘循环里同步顶栏：查 [data-wx-chat-header-pin] */
export function syncWeChatChatHeaderPinFromViewport(): void {
  if (typeof document === 'undefined') return
  const el = document.querySelector('[data-wx-chat-header-pin]') as HTMLElement | null
  if (!el) return
  const mode = el.getAttribute('data-wx-chat-header-pin') === 'absolute' ? 'absolute' : 'flow'
  applyWeChatChatHeaderViewportPin(el, readVisualViewportOffsetTop(), mode)
}
