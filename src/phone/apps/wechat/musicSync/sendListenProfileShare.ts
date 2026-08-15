import { emitWeChatStorageChanged, personaDb } from '../newFriendsPersona/idb'
import type { WeChatListenProfileSharePayload } from '../newFriendsPersona/types'
import { resolveListenTogetherPrivateChatTarget } from '../wechatAccountPrivateChatStorage'
import { enrichListenProfileSharePayload } from './listenShareAiContext'

export type SendListenProfileShareInput = {
  profileType: 'artist' | 'user'
  profileId: number
  displayName: string
  avatar?: string
  subtitle?: string
}

export type SendListenProfileShareResult = {
  sent: number
  messageIds: string[]
}

async function sendOneListenProfileShare(
  characterId: string,
  input: SendListenProfileShareInput,
): Promise<string> {
  const { playerIdentityId, conversationKey, timestamp, storyDay, storyTime, storyTimeLabel } =
    await resolveListenTogetherPrivateChatTarget(characterId)

  const shareId = `lps-${timestamp}-${Math.random().toString(36).slice(2, 8)}`
  const messageId = `wxm-${timestamp}-lps-${Math.random().toString(36).slice(2, 8)}`

  const listenProfileShare: WeChatListenProfileSharePayload = await enrichListenProfileSharePayload(
    input,
    shareId,
  )

  await personaDb.appendWeChatChatMessage({
    id: messageId,
    characterId,
    playerIdentityId,
    type: 'player',
    content: '[分享主页]',
    listenProfileShare,
    timestamp,
    ...(storyDay ? { storyDay } : {}),
    ...(storyTime ? { storyTime } : {}),
    ...(storyTimeLabel ? { storyTimeLabel } : {}),
    isRead: true,
    conversationKey,
  })

  await personaDb.markWeChatConversationReadToLatest(conversationKey)
  return messageId
}

/** 向多名微信私聊联系人发送听一听歌手/用户主页分享卡 */
export async function sendListenProfileShareToContacts(
  characterIds: string[],
  input: SendListenProfileShareInput,
): Promise<SendListenProfileShareResult> {
  const ids = [...new Set(characterIds.map((id) => id.trim()).filter(Boolean))]
  if (ids.length === 0) throw new Error('请选择至少一位好友')
  if (!input.profileId) throw new Error('缺少主页信息')
  if (!input.displayName.trim()) throw new Error('缺少显示名称')

  const messageIds: string[] = []
  for (const characterId of ids) {
    const messageId = await sendOneListenProfileShare(characterId, input)
    messageIds.push(messageId)
  }

  emitWeChatStorageChanged()
  return { sent: messageIds.length, messageIds }
}
