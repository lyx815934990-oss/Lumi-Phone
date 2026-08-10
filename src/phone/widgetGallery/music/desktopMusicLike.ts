/**
 * 桌面播放器「喜欢」：与听一听同一套网易云 likelist / like API。
 * 模块级单例，避免每个组件各自拉一遍喜欢列表。
 */

import { hydrateNeteaseListenSession } from '../../../components/discoverListen/neteaseListenSession'
import {
  fetchLikedSongIds,
  setNeteaseSongLiked,
} from '../../../components/discoverListen/neteaseMusicApi'
import { clearPlaylistCache } from '../../../components/discoverListen/playlistTracksCache'
import { fetchNeteaseProfile } from '../../../components/discoverListen/neteaseProfileApi'

type Listener = () => void

type LikeSnapshot = {
  ready: boolean
  loggedIn: boolean
  likedIds: Set<number>
  togglingId: number | null
}

let cookie = ''
let uid = 0
let likedPlaylistId = 0
let likedIds = new Set<number>()
let ready = false
let loggedIn = false
let togglingId: number | null = null
let hydratePromise: Promise<void> | null = null
let snapshotCache: LikeSnapshot | null = null

const listeners = new Set<Listener>()

function emit() {
  snapshotCache = null
  for (const l of listeners) l()
}

function buildSnapshot(): LikeSnapshot {
  if (!snapshotCache) {
    snapshotCache = {
      ready,
      loggedIn,
      likedIds,
      togglingId,
    }
  }
  return snapshotCache
}

export function subscribeDesktopMusicLike(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getDesktopMusicLikeSnapshot(): LikeSnapshot {
  return buildSnapshot()
}

export async function ensureDesktopMusicLikeHydrated(): Promise<void> {
  if (hydratePromise) return hydratePromise
  hydratePromise = (async () => {
    try {
      const session = await hydrateNeteaseListenSession()
      cookie = session.cookie.trim()
      loggedIn = Boolean(cookie)
      if (!loggedIn) {
        uid = 0
        likedPlaylistId = 0
        likedIds = new Set()
        ready = true
        emit()
        return
      }
      const profile = await fetchNeteaseProfile(cookie)
      uid = profile?.user?.userId ?? 0
      likedPlaylistId = profile?.likedSongs?.id ?? 0
      if (uid > 0) {
        const ids = await fetchLikedSongIds(cookie, uid)
        likedIds = new Set(ids)
      } else {
        likedIds = new Set()
      }
      ready = true
      emit()
    } catch {
      ready = true
      emit()
    }
  })()
  return hydratePromise
}

export function isDesktopSongLiked(songId: number | null | undefined): boolean {
  if (!songId) return false
  return likedIds.has(songId)
}

/** 喜欢 / 取消喜欢；需已登录且 songId 为网易云曲目 */
export async function toggleDesktopSongLike(songId: number): Promise<boolean> {
  if (!songId || !cookie.trim()) return false
  const wasLiked = likedIds.has(songId)
  const nextLiked = !wasLiked

  togglingId = songId
  likedIds = new Set(likedIds)
  if (nextLiked) likedIds.add(songId)
  else likedIds.delete(songId)
  emit()

  try {
    await setNeteaseSongLiked(cookie, songId, nextLiked)
    if (likedPlaylistId) {
      await clearPlaylistCache(likedPlaylistId)
    }
    return true
  } catch {
    likedIds = new Set(likedIds)
    if (wasLiked) likedIds.add(songId)
    else likedIds.delete(songId)
    emit()
    return false
  } finally {
    togglingId = null
    emit()
  }
}
