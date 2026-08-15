import { emitWeChatStorageChanged, personaDb } from '../newFriendsPersona/idb'
import { resolveListenTogetherPrivateChatTarget } from '../wechatAccountPrivateChatStorage'
import { resolveSongLyricsExcerpt } from './listenShareAiContext'
import type { MusicTrack } from '../../../../stores/useMusicStore'
import { loadNeteaseCookie } from '../../../../components/discoverListen/neteaseApiClient'

export type SendMusicSyncInviteParams = {
  characterId: string
  contactName: string
  contactAvatar?: string
  track: MusicTrack
}

export type SendMusicSyncInviteResult = {
  inviteId: string
  messageId: string
}

/** 向微信私聊写入音乐共听邀约卡（是否跳转聊天由调用方 toast 提供） */
export async function sendMusicSyncInvite(
  params: SendMusicSyncInviteParams,
): Promise<SendMusicSyncInviteResult> {
  const characterId = params.characterId.trim()
  if (!characterId) throw new Error('invalid character')

  const target = await resolveListenTogetherPrivateChatTarget(characterId)
  const { playerIdentityId, conversationKey, timestamp, storyDay, storyTime, storyTimeLabel } = target

  const inviteId = `msi-${timestamp}-${Math.random().toString(36).slice(2, 8)}`
  const messageId = `wxm-${timestamp}-msi-${Math.random().toString(36).slice(2, 8)}`

  const cookie = loadNeteaseCookie().trim()
  const trackId = Number(params.track.id)
  if (!Number.isFinite(trackId) || !params.track.title?.trim()) {
    throw new Error('invalid track')
  }
  const lyricsExcerpt =
    trackId > 0 ? await resolveSongLyricsExcerpt(trackId, cookie) : ''

  await personaDb.appendWeChatChatMessage({
    id: messageId,
    characterId,
    playerIdentityId,
    type: 'player',
    content: '[音乐共听邀约]',
    musicSync: {
      kind: 'music_invite',
      inviteId,
      trackId: Math.floor(trackId),
      trackTitle: params.track.title.trim(),
      trackArtist: params.track.artist?.trim() || '',
      coverUrl: params.track.cover?.trim() || '',
      ...(lyricsExcerpt ? { lyricsExcerpt } : {}),
    },
    timestamp,
    ...(storyDay ? { storyDay } : {}),
    ...(storyTime ? { storyTime } : {}),
    ...(storyTimeLabel ? { storyTimeLabel } : {}),
    isRead: true,
    conversationKey,
  })

  await personaDb.markWeChatConversationReadToLatest(conversationKey)
  emitWeChatStorageChanged()

  return { inviteId, messageId }
}

/** 预留：角色同意共听时写入回应卡（供后续 AI 管线调用） */
export async function appendMusicSyncAcceptReply(params: {
  characterId: string
  playerIdentityId: string
  conversationKey: string
  inviteId: string
  replyText: string
}): Promise<string> {
  const nowMs = Date.now()
  const messageId = `wxm-${nowMs}-msa-${Math.random().toString(36).slice(2, 8)}`
  await personaDb.appendWeChatChatMessage({
    id: messageId,
    characterId: params.characterId,
    playerIdentityId: params.playerIdentityId,
    type: 'character',
    content: params.replyText.trim() || '频率已接轨。',
    musicSync: {
      kind: 'music_accept',
      inviteId: params.inviteId,
      replyText: params.replyText.trim() || '频率已接轨。',
    },
    timestamp: nowMs,
    isRead: false,
    conversationKey: params.conversationKey,
  })
  emitWeChatStorageChanged()
  return messageId
}

/** 预留：角色拒绝共听时写入回应卡（供后续 AI 管线调用） */
export async function appendMusicSyncDeclineReply(params: {
  characterId: string
  playerIdentityId: string
  conversationKey: string
  inviteId: string
  replyText: string
}): Promise<string> {
  const nowMs = Date.now()
  const messageId = `wxm-${nowMs}-msd-${Math.random().toString(36).slice(2, 8)}`
  await personaDb.appendWeChatChatMessage({
    id: messageId,
    characterId: params.characterId,
    playerIdentityId: params.playerIdentityId,
    type: 'character',
    content: params.replyText.trim() || '现在没空，自己听吧。',
    musicSync: {
      kind: 'music_decline',
      inviteId: params.inviteId,
      replyText: params.replyText.trim() || '现在没空，自己听吧。',
    },
    timestamp: nowMs,
    isRead: false,
    conversationKey: params.conversationKey,
  })
  emitWeChatStorageChanged()
  return messageId
}
