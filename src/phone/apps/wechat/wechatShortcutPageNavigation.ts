import type { AppSlot, WeChatShortcutPageId } from '../../types'

export const WECHAT_SHORTCUT_PAGE_SESSION_KEY = 'lumi-wechat-shortcut-page'
export const WECHAT_SHORTCUT_PAGE_EVENT = 'wechat:open-shortcut-page'

/** 悬浮球可直达的微信内页面 */
export const WECHAT_SHORTCUT_PAGE_OPTIONS: ReadonlyArray<{
  id: WeChatShortcutPageId
  label: string
}> = [
  { id: 'tab-messages', label: '微信·聊天' },
  { id: 'tab-contacts', label: '微信·通讯录' },
  { id: 'tab-dates', label: '微信·约会' },
  { id: 'tab-discover', label: '微信·发现' },
  { id: 'tab-profile', label: '微信·我' },
  { id: 'new-friends-persona', label: '微信·人设生成' },
  { id: 'memory-manage', label: '微信·记忆管理' },
  { id: 'favorites', label: '微信·收藏' },
  { id: 'album', label: '微信·相册' },
  { id: 'sticker-center', label: '微信·表情' },
  { id: 'add-friend', label: '微信·添加朋友' },
  { id: 'contacts-group-chats', label: '微信·群聊' },
  { id: 'wallet-cards', label: '微信·钱包' },
  { id: 'player-identities', label: '微信·身份卡' },
  { id: 'switch-account', label: '微信·切换账号' },
]

export type WeChatShortcutPageDetail = {
  pageId: WeChatShortcutPageId
}

const PAGE_ID_SET = new Set<string>(WECHAT_SHORTCUT_PAGE_OPTIONS.map((p) => p.id))

export function isWeChatShortcutPageId(id: unknown): id is WeChatShortcutPageId {
  return typeof id === 'string' && PAGE_ID_SET.has(id)
}

export function labelForWeChatShortcutPage(pageId: WeChatShortcutPageId): string {
  return WECHAT_SHORTCUT_PAGE_OPTIONS.find((p) => p.id === pageId)?.label ?? pageId
}

function openWeChatApp() {
  window.dispatchEvent(new CustomEvent<{ id: AppSlot['id'] }>('phone:open-app', { detail: { id: 'wechat' } }))
}

/** 写入待打开页面并拉起微信（由 WeChatApp 消费） */
export function requestOpenWeChatShortcutPage(pageId: WeChatShortcutPageId): void {
  if (!isWeChatShortcutPageId(pageId)) return
  try {
    sessionStorage.setItem(WECHAT_SHORTCUT_PAGE_SESSION_KEY, pageId)
  } catch {
    // ignore
  }
  window.dispatchEvent(
    new CustomEvent<WeChatShortcutPageDetail>(WECHAT_SHORTCUT_PAGE_EVENT, {
      detail: { pageId },
    }),
  )
  openWeChatApp()
}

export function consumeWeChatShortcutPageId(): WeChatShortcutPageId | null {
  try {
    const id = sessionStorage.getItem(WECHAT_SHORTCUT_PAGE_SESSION_KEY)?.trim() || ''
    if (id) sessionStorage.removeItem(WECHAT_SHORTCUT_PAGE_SESSION_KEY)
    return isWeChatShortcutPageId(id) ? id : null
  } catch {
    return null
  }
}
