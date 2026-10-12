import type { AppSlot } from '../../../types'
import { requestOpenWeChatPersonaChat } from '../wechatFocusChatNavigation'

export const WECHAT_COUPLE_SPACE_AUTO_INVITE_KEY = 'lumi-wechat-couple-space-auto-invite'
export const WECHAT_COUPLE_SPACE_AUTO_INVITE_EVENT = 'wechat:couple-space-auto-invite'

export type WeChatCoupleSpaceAutoInviteDetail = {
  characterId: string
}

/** 打开指定角色私聊，并立刻触发发送情侣空间邀请卡 */
export function requestCoupleSpaceInviteChat(characterId: string): void {
  const id = characterId.trim()
  if (!id) return
  try {
    sessionStorage.setItem(WECHAT_COUPLE_SPACE_AUTO_INVITE_KEY, id)
  } catch {
    // ignore
  }
  requestOpenWeChatPersonaChat(id)
  window.dispatchEvent(
    new CustomEvent<WeChatCoupleSpaceAutoInviteDetail>(WECHAT_COUPLE_SPACE_AUTO_INVITE_EVENT, {
      detail: { characterId: id },
    }),
  )
}

export function peekCoupleSpaceAutoInvite(): string | null {
  try {
    return sessionStorage.getItem(WECHAT_COUPLE_SPACE_AUTO_INVITE_KEY)?.trim() || null
  } catch {
    return null
  }
}

/** 消费待自动邀请标记；仅当当前会话角色匹配时返回 true */
export function consumeCoupleSpaceAutoInvite(characterId: string): boolean {
  const want = characterId.trim()
  if (!want) return false
  try {
    const raw = sessionStorage.getItem(WECHAT_COUPLE_SPACE_AUTO_INVITE_KEY)?.trim() || ''
    if (!raw || raw !== want) return false
    sessionStorage.removeItem(WECHAT_COUPLE_SPACE_AUTO_INVITE_KEY)
    return true
  } catch {
    return false
  }
}

export function openWeChatAppOnly(): void {
  window.dispatchEvent(
    new CustomEvent<{ id: AppSlot['id'] }>('phone:open-app', { detail: { id: 'wechat' } }),
  )
}
