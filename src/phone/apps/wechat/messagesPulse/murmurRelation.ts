import { listMutualFriendPeersForCharacter } from '../mutualFriend/listMutualFriendPeers'
import { personaDb } from '../newFriendsPersona/idb'
import type { MurmurContactLite } from './murmurStorage'

const SELF_IDS = new Set(['__self__', 'me'])

function isUserLikeId(id: string, playerIdentityId?: string | null): boolean {
  const s = id.trim()
  if (!s) return false
  if (SELF_IDS.has(s)) return true
  const pid = (playerIdentityId || '').trim()
  return !!pid && s === pid
}

/** 角色作者的人脉同伴 id（非陌生人边） */
export async function listRelatedCharacterIdsForMurmurAuthor(
  authorCharacterId: string,
): Promise<Set<string>> {
  const cid = authorCharacterId.trim()
  if (!cid) return new Set()
  try {
    const row = await personaDb.getCharacter(cid)
    const peers = await listMutualFriendPeersForCharacter(row)
    return new Set(peers.map((p) => p.characterId.trim()).filter(Boolean))
  } catch {
    return new Set()
  }
}

/**
 * 是否允许 reactor 对作者碎碎念互动。
 * - 用户本人始终可互动（对自己 / 对角色）
 * - 角色之间须有人脉关系（非陌生人）
 */
export async function canMurmurEngage(opts: {
  authorId: string
  reactorId: string
  playerIdentityId?: string | null
  isUserAuthor?: boolean
}): Promise<boolean> {
  const authorId = opts.authorId.trim()
  const reactorId = opts.reactorId.trim()
  if (!authorId || !reactorId) return false
  if (authorId === reactorId) return true

  const userAuthor =
    opts.isUserAuthor === true || isUserLikeId(authorId, opts.playerIdentityId)
  const userReactor = isUserLikeId(reactorId, opts.playerIdentityId)

  if (userAuthor && userReactor) return true
  if (userReactor) return true // 玩家可对角色碎碎念反应
  if (userAuthor) {
    // 角色对用户碎碎念：须与玩家有人脉/关系边
    try {
      const pid = (opts.playerIdentityId || '').trim()
      if (!pid) return false
      const rels = await personaDb.listRelationshipsForIdentity(pid)
      return rels.some((r) => {
        const relation = String(r.relation ?? '').trim()
        if (!relation || relation === '陌生人' || relation.toLowerCase() === 'stranger') return false
        return r.fromCharacterId === reactorId || r.toCharacterId === reactorId
      })
    } catch {
      return false
    }
  }

  // 角色 A 的碎碎念，角色 B 反应：须有人脉边
  const related = await listRelatedCharacterIdsForMurmurAuthor(authorId)
  return related.has(reactorId)
}

/** 从联系人列表筛出与作者有人脉关系的角色 */
export async function filterContactsRelatedToAuthor(
  authorCharacterId: string,
  contacts: MurmurContactLite[],
): Promise<MurmurContactLite[]> {
  const related = await listRelatedCharacterIdsForMurmurAuthor(authorCharacterId)
  if (!related.size) return []
  return contacts.filter((c) => related.has(c.characterId.trim()) && c.characterId.trim() !== authorCharacterId.trim())
}
