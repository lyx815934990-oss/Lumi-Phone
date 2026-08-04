import type { MutualFriendChainPayload } from './types'

/** 控制台摘要：本轮是否解析到联动标记块 */
export function formatMutualFriendChainConsoleSummary(
  payload: MutualFriendChainPayload | null | undefined,
): string {
  if (!payload) return '无联动块'
  const relays = Array.isArray(payload.relayTo) ? payload.relayTo : []
  const outs = Array.isArray(payload.otherOutgoing) ? payload.otherOutgoing : []
  if (!relays.length && !outs.length) return '无联动块'

  const parts: string[] = []
  for (const r of relays) {
    const id = String(r?.otherRoleId || '').trim() || '?'
    const reason = String(r?.reason || '').trim()
    const msg = String(r?.relayedMessage || '').trim()
    const heard = String(r?.heardBack || '').trim()
    parts.push(
      `传话→${id}` +
        (reason ? ` 因=${reason}` : '') +
        (msg ? ` 告=${msg.slice(0, 40)}` : '') +
        (heard ? ` 闻=${heard.slice(0, 40)}` : ''),
    )
  }
  for (const og of outs) {
    const id = String(og?.otherRoleId || '').trim() || '?'
    const reason = String(og?.reason || '').trim()
    const lines = (og?.lines || []).map((x) => String(x || '').trim()).filter(Boolean)
    parts.push(
      `私信←${id}` +
        (reason ? ` 因=${reason}` : '') +
        (lines.length ? ` 说×${lines.length}「${lines[0]!.slice(0, 36)}」` : ''),
    )
  }
  return parts.join(' | ')
}
