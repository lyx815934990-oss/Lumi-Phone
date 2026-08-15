import type { GlobalWechatPlate } from '../../worldbook/globalWorldBookTypes'
import type { LoreEntry } from '../../worldbook/loreArchiveTypes'

const ONLINE_PLATES: GlobalWechatPlate[] = ['private_chat', 'group_chat']
const OFFLINE_PLATES: GlobalWechatPlate[] = ['offline_plot', 'vn']

export type LoreSceneChoice = {
  global: boolean
  online: boolean
  offline: boolean
}

export function readSceneChoice(entry: Pick<LoreEntry, 'plateScope'>): LoreSceneChoice {
  if (entry.plateScope.mode === 'all') {
    return { global: true, online: false, offline: false }
  }
  const plates = new Set(entry.plateScope.plates)
  const online = ONLINE_PLATES.some((p) => plates.has(p))
  const offline = OFFLINE_PLATES.some((p) => plates.has(p))
  // 三选一：线上+线下同时存在时按全局展示
  if (online && offline) {
    return { global: true, online: false, offline: false }
  }
  if (online) return { global: false, online: true, offline: false }
  if (offline) return { global: false, online: false, offline: true }
  return { global: true, online: false, offline: false }
}

export function writeSceneChoice(choice: LoreSceneChoice): LoreEntry['plateScope'] {
  if (choice.global) return { mode: 'all' }
  if (choice.online && !choice.offline) {
    return { mode: 'plates', plates: [...ONLINE_PLATES] }
  }
  if (choice.offline && !choice.online) {
    return { mode: 'plates', plates: [...OFFLINE_PLATES] }
  }
  // 空选或非法组合 → 全局
  return { mode: 'all' }
}

export function sceneBadges(entry: Pick<LoreEntry, 'plateScope'>): Array<'global' | 'online' | 'offline'> {
  const c = readSceneChoice(entry)
  if (c.global) return ['global']
  const out: Array<'global' | 'online' | 'offline'> = []
  if (c.online) out.push('online')
  if (c.offline) out.push('offline')
  return out.length ? out : ['global']
}

export const SCENE_BADGE_LABEL: Record<'global' | 'online' | 'offline', string> = {
  global: '全局',
  online: '线上聊天',
  offline: '线下约会',
}
