import type { MutualFriendChainPayload } from './types'

export type LinkedChatNotice = {
  /** 发起方显示名（通常为当前角色） */
  fromDisplayName: string
  /** 被找的一方显示名（另一角色，或「你」） */
  toDisplayName: string
  /** 一句话原因 */
  reason: string
  /** peer_chat：当前角色找另一角色；message_you：另一角色找你 */
  variant: 'peer_chat' | 'message_you'
}

function pickReason(...candidates: Array<string | undefined | null>): string {
  for (const c of candidates) {
    const t = String(c ?? '').trim()
    if (t) return t.length > 48 ? `${t.slice(0, 48)}…` : t
  }
  return '有事想聊聊'
}

/** 从 payload 选出一条用于弹窗的联动提示（优先 relayTo） */
export function resolveLinkedChatNoticeFromPayload(params: {
  payload: MutualFriendChainPayload
  currentDisplayName: string
  allowedPeerIds: ReadonlySet<string>
  resolvePeerDisplayName: (characterId: string) => string
}): LinkedChatNotice | null {
  const fromName = params.currentDisplayName.trim() || '对方'
  const relays = Array.isArray(params.payload.relayTo) ? params.payload.relayTo : []
  for (const r of relays) {
    const oid = String(r?.otherRoleId || '').trim()
    if (!oid || !params.allowedPeerIds.has(oid)) continue
    const msg = String(r?.relayedMessage || '').trim()
    const heard = String(r?.heardBack || '').trim()
    if (!msg && !heard && !String(r?.reason || '').trim()) continue
    return {
      fromDisplayName: fromName,
      toDisplayName: params.resolvePeerDisplayName(oid) || '对方',
      reason: pickReason(r?.reason, msg),
      variant: 'peer_chat',
    }
  }

  const outs = Array.isArray(params.payload.otherOutgoing) ? params.payload.otherOutgoing : []
  for (const og of outs) {
    const oid = String(og?.otherRoleId || '').trim()
    if (!oid || !params.allowedPeerIds.has(oid)) continue
    const lines = (og.lines || []).map((x) => String(x || '').trim()).filter(Boolean)
    if (!lines.length && !String(og?.reason || '').trim()) continue
    return {
      fromDisplayName: params.resolvePeerDisplayName(oid) || '对方',
      toDisplayName: '你',
      reason: pickReason(og?.reason, lines[0]),
      variant: 'message_you',
    }
  }

  return null
}

export function formatLinkedChatNoticeSentence(notice: LinkedChatNotice): string {
  const from = notice.fromDisplayName.trim() || '对方'
  const to = notice.toDisplayName.trim() || '对方'
  const reason = notice.reason.trim() || '有事想聊聊'
  if (notice.variant === 'message_you') {
    return `${from}因为${reason}，正在找你线上聊天`
  }
  return `${from}因为${reason}，正在找${to}线上聊天`
}
