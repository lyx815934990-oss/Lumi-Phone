import type { MirrorWeChatMessage } from './types'
import { inferSpySpecialFromContent } from '../spyWechatMarkup'

function resolveSpecial(msg: MirrorWeChatMessage) {
  if (msg.special?.kind === 'red_packet' || msg.special?.kind === 'transfer') return msg.special
  return inferSpySpecialFromContent(msg.content)
}

function isClaimStrip(content: string): boolean {
  const t = String(content || '').trim()
  if (!/^【系统】/.test(t)) return false
  return /领取.*红包|已收款|已收钱|收取了.*转账/.test(t)
}

function nearbyHasClaimStrip(messages: MirrorWeChatMessage[], fromIndex: number): boolean {
  for (let j = fromIndex + 1; j < messages.length && j <= fromIndex + 6; j++) {
    if (isClaimStrip(messages[j]?.content || '')) return true
  }
  return false
}

const DEFAULT_RP_REMARK = /^(恭喜发财|大吉大利|恭喜发财，大吉大利|Best Wishes)$/i

/**
 * 模型常误写红包气泡：
 * 1) 「联系人发红包 → 角色领取」写成两条（P 已领 + C 未领发出）
 * 2) 「角色发出且已领」后又跟一条默认祝福语的 C 未领发出（截图里已领浅包 + 再跟一条亮橙默认包）
 * 窥探展示时丢掉这些误写的角色侧未领默认包，不改写落库原文。
 */
export function dropSpuriousMirrorSelfRedPackets(
  messages: MirrorWeChatMessage[],
): MirrorWeChatMessage[] {
  if (!messages.length) return messages
  const out: MirrorWeChatMessage[] = []
  for (const msg of messages) {
    const special = resolveSpecial(msg)
    if (special?.kind === 'red_packet' && msg.from === 'character' && !special.opened) {
      const remark = (special.remark || '').trim()
      const isDefaultRemark = !remark || DEFAULT_RP_REMARK.test(remark)
      let incomingOpenedNearby = false
      let selfOpenedNearby = false
      for (let j = Math.max(0, out.length - 10); j < out.length; j++) {
        const prev = out[j]!
        const ps = resolveSpecial(prev)
        if (ps?.kind !== 'red_packet' || !ps.opened) continue
        const dt = Math.abs(Number(msg.timestamp) - Number(prev.timestamp))
        if (dt > 30 * 60 * 1000) continue
        if (prev.from === 'player') incomingOpenedNearby = true
        if (prev.from === 'character') selfOpenedNearby = true
      }
      // 默认祝福语的「未领发出」紧跟对方已领 / 自己已领红包 → 几乎必是模型误写
      if (isDefaultRemark && (incomingOpenedNearby || selfOpenedNearby)) {
        continue
      }
    }
    out.push(msg)
  }
  return out
}

/**
 * 窥探模式只读展示：已领红包 / 已收转账时，在领取方补一条居中系统条（不改写原会话落库）。
 * - 联系人发出、角色领取 → 「你领取了…」
 * - 角色发出、联系人领取 → 「{联系人}领取了你的…」
 */
export function enrichMirrorMessagesWithClaimReceipts(
  messages: MirrorWeChatMessage[],
  opts: { peerLabel: string; selfLabel?: string },
): MirrorWeChatMessage[] {
  const peer = (opts.peerLabel || '对方').trim() || '对方'
  const cleaned = dropSpuriousMirrorSelfRedPackets(messages)
  if (!cleaned.length) return cleaned
  const out: MirrorWeChatMessage[] = []
  for (let i = 0; i < cleaned.length; i++) {
    const msg = cleaned[i]!
    out.push(msg)
    const special = resolveSpecial(msg)
    if (!special) continue

    let strip: string | null = null
    if (special.kind === 'red_packet' && special.opened) {
      strip =
        msg.from === 'character'
          ? `【系统】${peer}领取了你的红包`
          : `【系统】你领取了${peer}的红包`
    } else if (special.kind === 'transfer' && special.status === 'accepted') {
      strip =
        msg.from === 'character'
          ? `【系统】${peer}已收款`
          : `【系统】你已收款`
    }
    if (!strip) continue
    if (nearbyHasClaimStrip(cleaned, i)) continue
    // 避免本轮刚插入的相邻重复
    if (out.length && isClaimStrip(out[out.length - 1]?.content || '')) continue
    out.push({
      from: 'character',
      content: strip,
      timestamp: Math.max(msg.timestamp + 1, (cleaned[i + 1]?.timestamp || msg.timestamp + 1) - 1),
    })
  }
  return out
}
