import { emitWeChatStorageChanged, personaDb } from '../newFriendsPersona/idb'
import type { WeChatListenTrackSharePayload } from '../newFriendsPersona/types'
import { resolveListenTogetherPrivateChatTarget } from '../wechatAccountPrivateChatStorage'
import { enrichListenTrackSharePayload } from './listenShareAiContext'

export type SendListenTrackShareInput = {
  targetType: 'song' | 'playlist'
  targetId: number
  targetTitle: string
  targetArtist?: string
  targetCover?: string
  trackCount?: number
}

export type SendListenTrackShareResult = {
  sent: number
  messageIds: string[]
  characterIds: string[]
}

async function sendOneListenTrackShare(
  characterId: string,
  input: SendListenTrackShareInput,
): Promise<string> {
  const { playerIdentityId, conversationKey, timestamp, storyDay, storyTime, storyTimeLabel } =
    await resolveListenTogetherPrivateChatTarget(characterId)

  const shareId = `lts-${timestamp}-${Math.random().toString(36).slice(2, 8)}`
  const messageId = `wxm-${timestamp}-lts-${Math.random().toString(36).slice(2, 8)}`
  const content = input.targetType === 'song' ? '[分享单曲]' : '[分享歌单]'

  const listenTrackShare: WeChatListenTrackSharePayload = await enrichListenTrackSharePayload(
    input,
    shareId,
  )

  await personaDb.appendWeChatChatMessage({
    id: messageId,
    characterId,
    playerIdentityId,
    type: 'player',
    content,
    listenTrackShare,
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

/** 向多名微信私聊联系人发送听一听单曲/歌单分享卡 */
export async function sendListenTrackShareToContacts(
  characterIds: string[],
  input: SendListenTrackShareInput,
): Promise<SendListenTrackShareResult> {
  const ids = [...new Set(characterIds.map((id) => id.trim()).filter(Boolean))]
  if (ids.length === 0) throw new Error('请选择至少一位好友')
  if (!input.targetId) throw new Error('缺少歌曲或歌单信息')
  if (!input.targetTitle.trim()) throw new Error('缺少标题')

  const messageIds: string[] = []
  for (const characterId of ids) {
    const messageId = await sendOneListenTrackShare(characterId, input)
    messageIds.push(messageId)
  }

  emitWeChatStorageChanged()
  return { sent: messageIds.length, messageIds, characterIds: ids }
}
