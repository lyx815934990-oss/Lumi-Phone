import { maybeEmitWeChatInAppCharacterMessage } from '../globalMessage/wechatGlobalMessageGuard'
import { personaDb } from '../newFriendsPersona/idb'
import { resolveAccountScopedPrivateConversationKey } from '../wechatAccountPrivateChatStorage'
import { logConsole } from '../consoleLogger'
import { resolveLinkedChatNoticeFromPayload, type LinkedChatNotice } from './linkedChatNotice'
import { addMutualFriendRelayRecord } from './storage'
import type { MutualFriendChainPayload } from './types'
import { writeMutualFriendRelayMemories } from './writeMutualFriendRelayMemories'

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * 应用主回复里的共同好友链：写传话记录，并向相关角色私聊投递 otherOutgoing。
 * 不发起额外模型请求（文案已在主回复标记块中写好）。
 */
export async function applyMutualFriendChainFromMainReply(params: {
  payload: MutualFriendChainPayload | null | undefined
  currentCharacterId: string
  /** 当前角色显示名（弹窗用） */
  currentDisplayName: string
  /** 允许的 otherRoleId（人脉候选） */
  allowedPeerIds: ReadonlySet<string>
  sourceConversationKey: string
  playerIdentityId: string
  wechatAccountId?: string | null
  /** 联动触发时弹窗（替代 toast） */
  onLinkedChatNotice?: (notice: LinkedChatNotice) => void
}): Promise<void> {
  const payload = params.payload
  if (!payload) return
  const currentId = params.currentCharacterId.trim()
  if (!currentId || !params.allowedPeerIds.size) return

  const peerNameCache = new Map<string, string>()
  const resolvePeerDisplayName = async (characterId: string): Promise<string> => {
    const id = characterId.trim()
    if (!id) return '对方'
    const hit = peerNameCache.get(id)
    if (hit) return hit
    try {
      const other = await personaDb.getCharacter(id)
      // 弹窗 / 传话记忆：优先真实姓名，不要用微信昵称/备注
      const name = (other?.name || other?.wechatNickname || '').trim() || '对方'
      peerNameCache.set(id, name)
      return name
    } catch {
      peerNameCache.set(id, '对方')
      return '对方'
    }
  }

  // 先解析弹窗所需显示名（同步缓存预热）
  const peerIdsNeeded = new Set<string>()
  for (const r of payload.relayTo || []) {
    const oid = String(r?.otherRoleId || '').trim()
    if (oid && params.allowedPeerIds.has(oid)) peerIdsNeeded.add(oid)
  }
  for (const og of payload.otherOutgoing || []) {
    const oid = String(og?.otherRoleId || '').trim()
    if (oid && params.allowedPeerIds.has(oid)) peerIdsNeeded.add(oid)
  }
  await Promise.all([...peerIdsNeeded].map((id) => resolvePeerDisplayName(id)))

  const notice = resolveLinkedChatNoticeFromPayload({
    payload,
    currentDisplayName: params.currentDisplayName,
    allowedPeerIds: params.allowedPeerIds,
    resolvePeerDisplayName: (id) => peerNameCache.get(id.trim()) || '对方',
  })
  if (notice) {
    try {
      params.onLinkedChatNotice?.(notice)
    } catch {
      /* ignore UI errors */
    }
  }

  for (const r of payload.relayTo || []) {
    const oid = String(r?.otherRoleId || '').trim()
    const msg = String(r?.relayedMessage || '').trim()
    const heard = String(r?.heardBack || '').trim()
    if (!oid || !params.allowedPeerIds.has(oid) || (!msg && !heard)) continue
    const record = addMutualFriendRelayRecord({
      fromRoleId: currentId,
      toRoleId: oid,
      relayedMessage: msg || heard,
      ...(heard ? { heardBack: heard } : {}),
      chatId: params.sourceConversationKey,
    })
    if (!record) continue
    const toName = await resolvePeerDisplayName(oid)
    let playerDisplayName = ''
    try {
      const pid = params.playerIdentityId.trim()
      if (pid && pid !== '__none__') {
        const iden = await personaDb.getPlayerIdentity(pid)
        playerDisplayName =
          String(iden?.wechatNickname ?? '').trim() ||
          String(iden?.name ?? '').trim() ||
          String(iden?.remark ?? '').trim() ||
          ''
      }
    } catch {
      playerDisplayName = ''
    }
    try {
      await writeMutualFriendRelayMemories({
        fromRoleId: currentId,
        toRoleId: oid,
        fromDisplayName: params.currentDisplayName,
        toDisplayName: toName,
        playerDisplayName,
        relayedMessage: record.relayedMessage,
        heardBack: record.heardBack,
        playerIdentityId: params.playerIdentityId,
        wechatAccountId: params.wechatAccountId,
      })
    } catch (e) {
      logConsole(
        'ai',
        `联动聊天：传话记忆写入异常：${e instanceof Error ? e.message : String(e)}`,
      )
    }
  }

  const sessionPid = params.playerIdentityId.trim() || '__none__'

  for (const og of payload.otherOutgoing || []) {
    const oid = String(og?.otherRoleId || '').trim()
    if (!oid || !params.allowedPeerIds.has(oid)) continue
    const lines = (og.lines || []).map((x) => String(x || '').trim()).filter(Boolean)
    if (!lines.length) continue

    const other = await personaDb.getCharacter(oid)
    if (!other?.id?.trim()) continue

    const displayName =
      (other.wechatNickname || other.name || '').trim() || '对方'

    await sleep(800)

    let otherCk = ''
    try {
      otherCk = await resolveAccountScopedPrivateConversationKey({
        wechatAccountId: params.wechatAccountId,
        characterId: oid,
        appSessionPlayerIdentityId: sessionPid,
      })
    } catch {
      continue
    }
    if (!otherCk) continue

    const avatarUrl = other.avatarUrl?.trim() || undefined

    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i]!
      const charCount = line.length || 1
      const delayMs = Math.max(1, Math.ceil(charCount / 6)) * 1000
      await sleep(delayMs)

      const now = Date.now()
      const messageId = `mutual-chain-${now}-${i}-${Math.random().toString(16).slice(2, 8)}`
      try {
        await personaDb.appendWeChatChatMessage({
          id: messageId,
          characterId: oid,
          playerIdentityId: sessionPid,
          type: 'character',
          content: line,
          timestamp: now,
          isRead: false,
          conversationKey: otherCk,
          notifyPeerTitle: displayName,
        })
      } catch {
        continue
      }

      maybeEmitWeChatInAppCharacterMessage({
        conversationKey: otherCk,
        title: displayName,
        preview: line,
        avatarUrl,
        messageId,
      })
    }
  }
}
