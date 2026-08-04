import { personaDb } from '../newFriendsPersona/idb'
import type { Character } from '../newFriendsPersona/types'
import { resolvePrivateChatNetworkRootId } from '../privateChatNetworkNpcPronoun'
import type { MutualFriendPeerOption } from './types'

/** 当前角色所在人脉圈全部角色 id（含根） */
export async function listMutualFriendNetworkCharacterIds(
  character: Character | null | undefined,
): Promise<{ rootId: string | null; characterIds: string[] }> {
  const rootId = await resolvePrivateChatNetworkRootId(character)
  if (!rootId) return { rootId: null, characterIds: [] }
  const ids = new Set<string>([rootId])
  try {
    const npcs = await personaDb.listNpcsFor(rootId)
    for (const n of npcs) {
      const id = n.id?.trim()
      if (id) ids.add(id)
    }
  } catch {
    /* ignore */
  }
  return { rootId, characterIds: [...ids] }
}

/**
 * 与当前私聊对象有「角色↔角色」人脉边的其它角色（可传话对象）。
 * 排除玩家身份边、空 relation、以及自己。
 */
export async function listMutualFriendPeersForCharacter(
  character: Character | null | undefined,
): Promise<MutualFriendPeerOption[]> {
  const selfId = character?.id?.trim()
  if (!selfId) return []
  const { characterIds } = await listMutualFriendNetworkCharacterIds(character)
  if (characterIds.length < 2) return []

  let rels = [] as Awaited<ReturnType<typeof personaDb.listRelationshipsInNetwork>>
  try {
    rels = await personaDb.listRelationshipsInNetwork(characterIds)
  } catch {
    return []
  }

  const peerIds = new Set<string>()
  for (const r of rels) {
    if (r.isPlayerIdentity) continue
    const relation = String(r.relation ?? '').trim()
    if (!relation || relation === '陌生人' || relation.toLowerCase() === 'stranger') continue
    const from = r.fromCharacterId.trim()
    const to = r.toCharacterId.trim()
    if (from === selfId && to && to !== selfId) peerIds.add(to)
    if (to === selfId && from && from !== selfId) peerIds.add(from)
  }
  if (!peerIds.size) return []

  const out: MutualFriendPeerOption[] = []
  for (const id of peerIds) {
    try {
      const ch = await personaDb.getCharacter(id)
      const displayName =
        (ch?.name || ch?.wechatNickname || '').trim() || id.slice(0, 8)
      out.push({ characterId: id, displayName })
    } catch {
      out.push({ characterId: id, displayName: id.slice(0, 8) })
    }
  }
  out.sort((a, b) => a.displayName.localeCompare(b.displayName, 'zh'))
  return out
}
