/**
 * 同人论坛展示名：优先真实姓名（人设 Character.name / 玩家身份 name），
 * 不用微信昵称、通讯录备注。
 */

import { personaDb } from '../wechat/newFriendsPersona/idb'

/** 批量读取角色真实姓名（Character.name） */
export async function loadCharacterRealNames(
  characterIds: string[],
): Promise<Record<string, string>> {
  const ids = [...new Set(characterIds.map((id) => id.trim()).filter(Boolean))]
  const out: Record<string, string> = {}
  await Promise.all(
    ids.map(async (id) => {
      try {
        const ch = await personaDb.getCharacter(id)
        const real = typeof ch?.name === 'string' ? ch.name.trim() : ''
        if (real) out[id] = real
      } catch {
        /* ignore */
      }
    }),
  )
  return out
}

/** 玩家身份真实姓名；没有则返回空串 */
export async function loadPlayerRealName(playerIdentityId: string | null | undefined): Promise<string> {
  const pid = playerIdentityId?.trim()
  if (!pid) return ''
  try {
    const iden = await personaDb.getPlayerIdentity(pid)
    return typeof iden?.name === 'string' ? iden.name.trim() : ''
  } catch {
    return ''
  }
}

/** 角色展示：真实姓名 > 通讯录备注 > 兜底 */
export function forumCharLabel(
  characterId: string,
  realNames: Record<string, string>,
  remarkFallback?: string,
): string {
  const id = characterId.trim()
  return realNames[id]?.trim() || remarkFallback?.trim() || '角色'
}

/** 用户展示：身份真实姓名 > 传入兜底（应尽量是真实名而非微信昵称） */
export function forumUserLabel(realName: string, fallback?: string): string {
  return realName.trim() || fallback?.trim() || '用户'
}
