import { personaDb } from '../newFriendsPersona/idb'
import type { FavoriteItem } from './favoriteItemTypes'
import { mapFavoriteToItem } from './mapFavoriteToItem'
import { resolveFavoriteVoiceAudioUrl } from './resolveFavoriteVoiceAudio'
import { SHARED_RECORD_PLAYER_ORIGIN_ID } from './sharedRecordOrigin'
import { resolveCanonicalCharacterId } from '../wechatGlobalCharacterRegistry'

async function ensureCharacterDisplayMaps(
  characterId: string,
  nameByCharId: Map<string, string>,
  avatarByCharId: Map<string, string>,
): Promise<void> {
  const raw = characterId.trim()
  if (!raw || raw === SHARED_RECORD_PLAYER_ORIGIN_ID) return
  const canon = (await resolveCanonicalCharacterId(raw)) || raw
  for (const id of new Set([raw, canon])) {
    if (!id) continue
    const needName = !nameByCharId.has(id)
    const needAvatar = !avatarByCharId.has(id)
    // 通讯录常已注入备注名；不能因已有名字就跳过，否则头像永远不会加载
    if (!needName && !needAvatar) continue
    try {
      const ch = await personaDb.getCharacter(id)
      if (needName) nameByCharId.set(id, ch?.name?.trim() || '未命名')
      if (needAvatar) {
        const avatar = ch?.avatarUrl?.trim()
        if (avatar) {
          avatarByCharId.set(id, avatar)
          // 同源 id 一并写入，避免 raw/canon 查找不一致
          for (const alias of [raw, canon]) {
            if (alias && !avatarByCharId.has(alias)) avatarByCharId.set(alias, avatar)
          }
        }
      }
    } catch {
      if (needName) nameByCharId.set(id, '未命名')
    }
  }
}

/** 从 IndexedDB 加载收藏列表（来源名优先用通讯录微信备注，否则回退人设姓名）。 */
export async function loadFavoriteItems(
  nameByCharIdOverride?: Map<string, string>,
  avatarByCharIdOverride?: Map<string, string>,
): Promise<FavoriteItem[]> {
  const favs = await personaDb.listFavorites()
  const nameByCharId = new Map(nameByCharIdOverride ?? [])
  const avatarByCharId = new Map(avatarByCharIdOverride ?? [])
  const mapped: FavoriteItem[] = []

  for (const fav of favs) {
    const msg = await personaDb.getWeChatChatMessageById(fav.messageId)
    const isPlayerMessage = msg?.type === 'player'
    const sourceId = isPlayerMessage
      ? SHARED_RECORD_PLAYER_ORIGIN_ID
      : (msg?.characterId?.trim() || fav.characterId.trim())
    if (!isPlayerMessage && sourceId) {
      await ensureCharacterDisplayMaps(sourceId, nameByCharId, avatarByCharId)
    }
    const item = mapFavoriteToItem(fav, msg, nameByCharId, avatarByCharId)
    if (item.type === 'voice' && !item.audioUrl?.trim()) {
      const resolved = await resolveFavoriteVoiceAudioUrl(fav, msg?.voice?.audioUrl)
      if (resolved) mapped.push({ ...item, audioUrl: resolved })
      else mapped.push(item)
    } else {
      mapped.push(item)
    }
  }

  return mapped
}
