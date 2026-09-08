/**
 * 语感同化开关：与私聊会话设置同一字段，线上线下共用。
 */
import { personaDb } from './newFriendsPersona/idb'
import {
  findAccountById,
  loadAccountsBundle,
  resolveAccountSessionIdentityId,
} from './wechatAccountPersistence'
import { resolveActivePrivateChatSessionPlayerIdentityId } from './wechatCharacterPlayerIdentity'
import { resolvePrivateWeChatStorageConversationKey } from './wechatConversationKey'

async function resolveMimicStyleConversationKey(characterId: string): Promise<{
  conversationKey: string
  peerCharacterId: string
  playerIdentityId: string
} | null> {
  const cid = characterId.trim()
  if (!cid) return null
  const bundle = await loadAccountsBundle()
  const wechatAccountId = bundle?.currentAccountId?.trim() || null
  const account = wechatAccountId && bundle ? findAccountById(bundle, wechatAccountId) : null
  const appPid = account
    ? resolveAccountSessionIdentityId(account)
    : (await personaDb.getCurrentIdentityId()).trim() || '__none__'
  const sessionPid = await resolveActivePrivateChatSessionPlayerIdentityId({
    characterId: cid,
    wechatAccountId,
    appPlayerIdentityId: appPid,
  })
  return {
    conversationKey: resolvePrivateWeChatStorageConversationKey(cid, wechatAccountId, sessionPid),
    peerCharacterId: cid,
    playerIdentityId: sessionPid,
  }
}

export async function loadMimicUserSpeakingStyleEnabled(characterId: string): Promise<boolean> {
  const scope = await resolveMimicStyleConversationKey(characterId)
  if (!scope) return false
  try {
    const row = await personaDb.getChatConversationSettings(scope.conversationKey)
    return row?.mimicUserSpeakingStyleEnabled === true
  } catch {
    return false
  }
}

export async function saveMimicUserSpeakingStyleEnabled(
  characterId: string,
  enabled: boolean,
): Promise<void> {
  const scope = await resolveMimicStyleConversationKey(characterId)
  if (!scope) return
  await personaDb.upsertChatConversationSettings({
    conversationKey: scope.conversationKey,
    peerCharacterId: scope.peerCharacterId,
    playerIdentityId: scope.playerIdentityId,
    mimicUserSpeakingStyleEnabled: enabled,
  })
  window.dispatchEvent(new Event('wechat-storage-changed'))
}
