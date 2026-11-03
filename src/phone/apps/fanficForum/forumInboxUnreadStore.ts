/**
 * 私信 / 互动未读：点击后清除红点（示例数据期用内存态）。
 */

import { create } from 'zustand'

import {
  FORUM_SAMPLE_DMS,
  FORUM_SAMPLE_NOTIFS,
  forumItemUnreadCount,
  type ForumDmItem,
  type ForumNotifItem,
} from './forumDmSample'

type ForumInboxUnreadStore = {
  /** 已点开清除的私信 id */
  readDmIds: string[]
  /** 已点开清除的互动 id */
  readNotifIds: string[]
  markDmRead: (dmId: string) => void
  markNotifRead: (notifId: string) => void
  isDmRead: (dmId: string) => boolean
  isNotifRead: (notifId: string) => boolean
}

export const useForumInboxUnreadStore = create<ForumInboxUnreadStore>((set, get) => ({
  readDmIds: [],
  readNotifIds: [],

  markDmRead: (dmId) => {
    const id = dmId.trim()
    if (!id) return
    const prev = get().readDmIds
    if (prev.includes(id)) return
    set({ readDmIds: [...prev, id] })
  },

  markNotifRead: (notifId) => {
    const id = notifId.trim()
    if (!id) return
    const prev = get().readNotifIds
    if (prev.includes(id)) return
    set({ readNotifIds: [...prev, id] })
  },

  isDmRead: (dmId) => get().readDmIds.includes(dmId.trim()),
  isNotifRead: (notifId) => get().readNotifIds.includes(notifId.trim()),
}))

export function withDmReadState(item: ForumDmItem, readIds: string[]): ForumDmItem {
  if (!item.unread || !readIds.includes(item.id)) return item
  return { ...item, unread: false, unreadCount: 0 }
}

export function withNotifReadState(item: ForumNotifItem, readIds: string[]): ForumNotifItem {
  if (!item.unread || !readIds.includes(item.id)) return item
  return { ...item, unread: false, unreadCount: 0 }
}

/** 底栏角标：私信 + 互动未读合计 */
export function selectForumInboxBadge(readDmIds: string[], readNotifIds: string[]): number {
  let total = 0
  for (const d of FORUM_SAMPLE_DMS) {
    total += forumItemUnreadCount(withDmReadState(d, readDmIds))
  }
  for (const n of FORUM_SAMPLE_NOTIFS) {
    total += forumItemUnreadCount(withNotifReadState(n, readNotifIds))
  }
  return total
}
