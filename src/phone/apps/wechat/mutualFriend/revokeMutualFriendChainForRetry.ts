import { personaDb } from '../newFriendsPersona/idb'
import { resolveAccountScopedPrivateConversationKey } from '../wechatAccountPrivateChatStorage'
import { logConsole } from '../consoleLogger'
import { removeMutualFriendRelayRecordsForChatSince } from './storage'

/**
 * 重新回复前：撤回本会话锚点消息之后产生的联动副作用。
 * - 传话 localStorage 记录（否则提示词会按「已转达」禁止再出标记块）
 * - 双方自动写入的 mf-relay-* 记忆
 * - 投递到其他人脉私聊的 mutual-chain-* 气泡
 */
export async function revokeMutualFriendChainSideEffectsForRetry(params: {
  characterId: string
  conversationKey: string
  /** 本轮用户锚点消息时间；其后产生的联动副作用视为本轮旧稿 */
  sinceTimestamp: number
  playerIdentityId?: string | null
  wechatAccountId?: string | null
}): Promise<void> {
  const cid = params.characterId.trim()
  const ck = params.conversationKey.trim()
  const since = Number(params.sinceTimestamp)
  if (!cid || !ck || !Number.isFinite(since)) return

  const { removedRecordIds, peerIds } = removeMutualFriendRelayRecordsForChatSince({
    characterId: cid,
    chatId: ck,
    sinceTimestamp: since,
  })

  const memoryOwnerIds = new Set<string>([cid, ...peerIds])
  let memoryRemoved = 0
  for (const ownerId of memoryOwnerIds) {
    try {
      const mems = await personaDb.listCharacterMemoriesForCharacter(ownerId)
      for (const m of mems) {
        const id = String(m.id ?? '')
        if (!id.startsWith('mf-relay-')) continue
        const created = Number(m.createdAt ?? 0)
        if (!Number.isFinite(created) || created < since) continue
        if (!id.includes(cid) && !peerIds.some((p) => id.includes(p))) continue
        await personaDb.deleteCharacterMemory(id)
        memoryRemoved += 1
      }
    } catch {
      /* ignore */
    }
  }

  let dmRemoved = 0
  const sessionPid = String(params.playerIdentityId ?? '').trim() || '__none__'
  for (const peerId of peerIds) {
    let otherCk = ''
    try {
      otherCk = await resolveAccountScopedPrivateConversationKey({
        wechatAccountId: params.wechatAccountId,
        characterId: peerId,
        appSessionPlayerIdentityId: sessionPid,
      })
    } catch {
      continue
    }
    if (!otherCk) continue
    try {
      const recent = await personaDb.listWeChatChatMessagesRecent({
        conversationKey: otherCk,
        limit: 80,
      })
      for (const row of recent) {
        const mid = String(row.id ?? '')
        if (!mid.startsWith('mutual-chain-')) continue
        const ts = Number(row.timestamp ?? 0)
        if (!Number.isFinite(ts) || ts < since) continue
        await personaDb.deleteWeChatChatMessageById(mid)
        dmRemoved += 1
      }
    } catch {
      /* ignore */
    }
  }

  if (removedRecordIds.length || memoryRemoved || dmRemoved) {
    logConsole(
      'ai',
      `联动聊天：重新回复已撤回同轮副作用（传话记录 ${removedRecordIds.length}、记忆 ${memoryRemoved}、私信气泡 ${dmRemoved}）`,
    )
  }
}
