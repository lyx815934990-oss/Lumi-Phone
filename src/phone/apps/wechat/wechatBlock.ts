/**
 * 私聊拉黑：系统灰条、未送达标记、AI 提示词附录。
 *
 * 规则（双方对称）：
 * - 任一方拉黑后，双方都可继续发消息；对方虚构上收不到这些内容（相当于屏蔽对方来信）。
 * - 被拉黑方：自己发出的每条消息带红色感叹号，气泡下方跟居中灰条「消息已发出，但被对方拒收」。
 * - 拉黑方：虚构上只能「收到」拉黑前对方的消息；界面仍可展示被拉黑方带失败标记的气泡供扮演。
 * - 角色被用户拉黑后，首条失败消息（红叹号 + 拒收灰条）出现后才知情并可接反应。
 * - 通讯录 / 会话列表 / 顶栏备注旁：红色圆底感叹号表示存在拉黑关系。
 */

import { emitWeChatStorageChanged, personaDb } from './newFriendsPersona/idb'
import type { Character } from './newFriendsPersona/types'
import { resolveAccountScopedPrivateConversationKey } from './wechatAccountPrivateChatStorage'
import {
  findAccountById,
  loadAccountsBundle,
  resolveAccountSessionIdentityId,
} from './wechatAccountPersistence'
import { resolvePrivateChatSessionPlayerIdentityId } from './wechatCharacterPlayerIdentity'

/** @deprecated 仅兼容旧灰条精确匹配；新文案请用 format* 带备注名 */
export const WECHAT_BLOCK_SYSTEM_USER_BLOCKED = '【系统】已将对方拉黑'
export const WECHAT_BLOCK_SYSTEM_USER_UNBLOCKED = '【系统】你已将对方移出黑名单'
export const WECHAT_BLOCK_SYSTEM_PEER_BLOCKED = '【系统】对方把你拉黑'
export const WECHAT_BLOCK_SYSTEM_PEER_UNBLOCKED = '【系统】对方已将你移出黑名单'

export const WECHAT_BLOCK_SEND_FAIL_HINT = '消息发送失败'

function clipRemark(name: string | null | undefined, fallback = '对方'): string {
  const t = String(name || '').trim()
  return (t || fallback).slice(0, 64)
}

/** 用户拉黑角色：已将XX拉入黑名单 */
export function formatWechatUserBlockedSystemNote(remarkName: string | null | undefined): string {
  return `【系统】已将${clipRemark(remarkName)}拉入黑名单`
}

/** 用户解除拉黑 */
export function formatWechatUserUnblockedSystemNote(remarkName: string | null | undefined): string {
  return `【系统】已将${clipRemark(remarkName)}移出黑名单`
}

/** 角色拉黑用户（剧情） */
export function formatWechatPeerBlockedSystemNote(remarkName: string | null | undefined): string {
  return `【系统】${clipRemark(remarkName)}把你拉黑`
}

/** 角色解除拉黑用户 */
export function formatWechatPeerUnblockedSystemNote(remarkName: string | null | undefined): string {
  return `【系统】${clipRemark(remarkName)}已将你移出黑名单`
}

/**
 * 被拉黑方发出消息失败后的知情系统条。
 * - userBlockedChar：用户已拉黑角色 →「张三已被你拉黑，消息暂未发送成功」
 * - charBlockedUser：角色已拉黑用户 →「你已被张三拉黑，消息暂未发送成功」
 */
export function formatWechatBlockSendFailAwareSystemNote(params: {
  mode: 'userBlockedChar' | 'charBlockedUser'
  remarkName: string | null | undefined
}): string {
  const who = clipRemark(params.remarkName)
  if (params.mode === 'userBlockedChar') {
    return `【系统】${who}已被你拉黑，消息暂未发送成功`
  }
  return `【系统】你已被${who}拉黑，消息暂未发送成功`
}

export function isWechatBlockSendFailAwareNote(text: string): boolean {
  const t = String(text || '').trim().replace(/^【系统】\s*/, '')
  return /已被.+拉黑，消息暂未发送成功$/.test(t) || t === '消息暂未发送成功'
}

export function isWechatBlockSystemNote(text: string): boolean {
  const t = String(text || '').trim()
  const bare = t.replace(/^【系统】\s*/, '')
  if (
    t === WECHAT_BLOCK_SYSTEM_USER_BLOCKED ||
    t === WECHAT_BLOCK_SYSTEM_USER_UNBLOCKED ||
    t === WECHAT_BLOCK_SYSTEM_PEER_BLOCKED ||
    t === WECHAT_BLOCK_SYSTEM_PEER_UNBLOCKED ||
    bare === '已将对方拉黑' ||
    bare === '对方把你拉黑' ||
    bare === '你已将对方移出黑名单' ||
    bare === '对方已将你移出黑名单'
  ) {
    return true
  }
  if (/^已将.+拉入黑名单$/.test(bare) || /^已将.+移出黑名单$/.test(bare)) return true
  if (/^.+把你拉黑$/.test(bare) || /^.+已将你移出黑名单$/.test(bare)) return true
  if (isWechatBlockSendFailAwareNote(t)) return true
  return false
}

/** ChatRoom 即时插入拉黑灰条（避免仅落库后 hydrate 漏刷 / 会话键不一致） */
export const WECHAT_BLOCK_SYSTEM_NOTE_EVENT = 'wechat-block-system-note'

export type WeChatBlockSystemNoteDetail = {
  conversationKey: string
  id: string
  text: string
  timestamp: number
}

/** 写入私聊系统灰条（【系统】前缀，落库后 ChatRoom 居中展示） */
export async function appendPrivateChatBlockSystemNote(params: {
  characterId: string
  appPlayerIdentityId?: string | null
  /** 当前打开的私聊会话键；传入则优先使用，保证与聊天页一致 */
  conversationKey?: string | null
  text: string
}): Promise<void> {
  const cid = params.characterId.trim()
  const text = String(params.text || '').trim()
  if (!cid || !text) return
  const bundle = await loadAccountsBundle()
  const account = bundle ? findAccountById(bundle, bundle.currentAccountId) : null
  const appPid =
    params.appPlayerIdentityId?.trim() ||
    (account ? resolveAccountSessionIdentityId(account).trim() : '') ||
    '__none__'
  const ch = (await personaDb.getCharacter(cid)) as Character | null
  const sessionPid = resolvePrivateChatSessionPlayerIdentityId(ch, appPid)
  const conversationKey =
    params.conversationKey?.trim() ||
    (await resolveAccountScopedPrivateConversationKey({
      wechatAccountId: account?.accountId ?? bundle?.currentAccountId,
      characterId: cid,
      appSessionPlayerIdentityId: sessionPid,
    }))
  if (!conversationKey) return
  const ts = Date.now()
  const id = `wxsys-block-${ts}-${Math.random().toString(36).slice(2, 8)}`
  const content = text.startsWith('【系统】') ? text : `【系统】${text}`
  await personaDb.appendWeChatChatMessage({
    id,
    characterId: cid,
    playerIdentityId: sessionPid,
    type: 'player',
    content,
    timestamp: ts,
    isRead: true,
    conversationKey,
    quiet: true,
  })
  try {
    await personaDb.markWeChatConversationReadToLatest(conversationKey)
  } catch {
    /* ignore */
  }
  try {
    window.dispatchEvent(
      new CustomEvent(WECHAT_BLOCK_SYSTEM_NOTE_EVENT, {
        detail: {
          conversationKey,
          id,
          text: content,
          timestamp: ts,
        } satisfies WeChatBlockSystemNoteDetail,
      }),
    )
  } catch {
    /* ignore */
  }
  emitWeChatStorageChanged()
}

/**
 * 注入私聊 system：拉黑期间消息归属、延后知情、解除后禁止「我知道你看见了」。
 */
export function buildWechatBlockRelationAppendix(character: Character | null | undefined): string {
  if (!character) return ''
  const userBlocked = character.isBlocked === true
  const peerBlocked = character.blockedByPeer === true
  if (!userBlocked && !peerBlocked) {
    return `
【拉黑关系 · 当前未拉黑】
- 双方可正常收发；若历史中曾出现「拉入黑名单 / 把你拉黑 / 移出黑名单」系统条，以当前未拉黑为准继续聊。
- 拉黑期间对方未真实收到的消息（历史里标「因拉黑未送达」或带「消息发送失败」的），你**从未看见**；解除后禁止说「我刚才看到你发的了」「你拉黑时我其实收到了」等。
`.trim()
  }

  const lines: string[] = ['【拉黑关系 · 硬项 · 虚构收信与知情】']

  if (userBlocked) {
    lines.push(
      `- **用户已将你拉黑**：用户自己发的消息在对方手机上仍显示为已发送，但**你收不到正文**，禁止引用或回应拉黑后用户说的话。`,
      `- **你可以继续发消息**（吐槽、质问、冷战等均可），像单方面屏蔽对方来信、自己只管往外打字。`,
      `- **知情时机（硬）**：你最多先发**1 条**尚不知晓的接话；一旦历史里已有带「消息已发出，但被对方拒收」的失败气泡，**之后每一条都必须带上被拉黑的知情反应**（如「拉黑？」「你居然把我拉黑了？」等），**禁止**继续像畅通聊天一样深情独白、假装对方还在正常回复。`,
      `- 气泡旁红色感叹号 + 下方拒收灰条表示你侧发送失败；禁止装作用户已读到这些失败气泡的正文。`,
    )
  }
  if (peerBlocked) {
    lines.push(
      `- **你已将用户拉黑**：用户仍可在自己手机上看到完整记录，并继续发消息（每条带失败感叹号与灰条「消息已发出，但被对方拒收」），但**你收不到**那些正文。`,
      `- **你可以继续发消息**；回应当以拉黑前最后已知上下文为准，禁止引用或回应拉黑后用户发出的内容，禁止说「你刚发的我看到了」。`,
      `- 拉黑方虚构上只能「收到」拉黑前对方的消息；把对方来信当成已屏蔽。`,
    )
  }
  lines.push(
    `- **解除拉黑后**：你仍然**不知道**拉黑期间对方手机上显示过哪些「未送达 / 消息发送失败」气泡；禁止复述、禁止指责「你明明看见了」、禁止用那些内容当共同记忆。`,
    `- 系统灰条「已将XX拉入/移出黑名单」「XX把你拉黑」是界面事实；角色对「对方侧仍能看见失败气泡」**不知情**。`,
  )
  return lines.join('\n')
}

/**
 * 线下约会 / 剧情生成：注入当前微信拉黑关系，避免当面戏里假装畅通私聊。
 * 未拉黑时也会注入短附录，避免「刚移出黑名单立刻推线下」时装不知已解除。
 */
export function buildDatingWechatBlockRelationAppendix(
  character: Character | null | undefined,
): string {
  if (!character) return ''
  const userBlocked = character.isBlocked === true
  const peerBlocked = character.blockedByPeer === true

  if (!userBlocked && !peerBlocked) {
    return [
      '【微信拉黑关系 · 线下剧情】（当前线上**未拉黑**，双方可正常收发）',
      `- 若未总结私聊历史里刚有「拉入黑名单 / 把你拉黑」又紧接「移出黑名单」系统灰条：以**当前已解除**为准；若你此前已因发送失败知情被拉黑，线下应知「对方已把你移出黑名单 / 你已把对方移出」，可质问、缓和或装作没事，**禁止**仍按「现在还在拉黑、发消息必失败」来写。`,
      `- 拉黑期间标「因拉黑未送达 / 消息发送失败」的内容，你**从未看见**；解除后禁止说「我刚才其实收到了」。`,
    ].join('\n')
  }

  const lines: string[] = [
    '【微信拉黑关系 · 线下剧情硬项】（与线上私聊状态同步；禁止当面戏里装没事畅通发消息）',
  ]
  if (userBlocked) {
    lines.push(
      `- **用户已将你拉黑（线上）**：微信侧你发的消息会被拒收（红叹号 +「消息已发出，但被对方拒收」）。`,
      `- **线下正文禁止**：写成你打开微信与用户正常私聊、对方已读秒回、你们仍像未拉黑时那样互发日常；禁止用「顺手发微信」推进剧情却无视拉黑。`,
      `- **可以写**：当面质问/冷战、尝试发消息却失败、发现被拒收后的反应、绕开微信改用当面或其他渠道（须符合人设）。`,
      `- 若你尚未在线上发现被拉黑，当面戏里也**不得**表现得像私聊仍畅通；最多可写「还不知道原因的别扭/冷淡」，一旦涉及发消息须符合拒收事实。`,
    )
  }
  if (peerBlocked) {
    lines.push(
      `- **你已将用户拉黑（线上）**：用户发给你的微信消息你收不到；线下禁止写成你已读、回复了那些被拒收内容。`,
      `- **可以写**：你单方面继续发微信、当面装作没事、或冷战；禁止引用拉黑后用户微信正文当共同记忆。`,
    )
  }
  lines.push(
    `- **解除拉黑后**：仍不知拉黑期间对方手机上那些「未送达」气泡内容；禁止事后全知复述。`,
  )
  return lines.join('\n')
}
