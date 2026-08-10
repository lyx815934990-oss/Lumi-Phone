import { Heart } from 'lucide-react'
import { useEffect, useSyncExternalStore } from 'react'
import {
  ensureDesktopMusicLikeHydrated,
  getDesktopMusicLikeSnapshot,
  subscribeDesktopMusicLike,
  toggleDesktopSongLike,
} from './desktopMusicLike'
import { openListenTogetherApp } from '../../../components/discoverListen/listenTogetherNavigation'

type Props = {
  /** 网易云歌曲 id；本地上传曲为 null */
  songId: number | null
  isEditMode?: boolean
  size?: number
  className?: string
  /** 未喜欢时描边颜色 */
  color?: string
}

/**
 * 桌面播放器红心：已喜欢实心红；点击空心→实心并写入账号「我喜欢的音乐」。
 * 未登录时点按会打开听一听去登录。
 */
export function MusicLikeButton({
  songId,
  isEditMode = false,
  size = 14,
  className = '',
  color = 'currentColor',
}: Props) {
  const snap = useSyncExternalStore(
    subscribeDesktopMusicLike,
    getDesktopMusicLikeSnapshot,
    getDesktopMusicLikeSnapshot,
  )

  useEffect(() => {
    void ensureDesktopMusicLikeHydrated()
  }, [])

  const liked = Boolean(songId && snap.likedIds.has(songId))
  const busy = Boolean(songId && snap.togglingId === songId)
  const canToggle = Boolean(songId && snap.loggedIn && !isEditMode && !busy)

  return (
    <button
      type="button"
      data-widget-add-ui="true"
      disabled={isEditMode || busy || !songId}
      aria-label={liked ? '取消喜欢' : '添加到喜欢的音乐'}
      aria-pressed={liked}
      className={`inline-flex items-center justify-center disabled:opacity-40 ${className}`}
      onClick={(e) => {
        e.stopPropagation()
        if (isEditMode) return
        if (!songId) return
        if (!snap.loggedIn) {
          openListenTogetherApp()
          return
        }
        if (!canToggle) return
        void toggleDesktopSongLike(songId)
      }}
    >
      <Heart
        size={size}
        strokeWidth={liked ? 0 : 1.8}
        fill={liked ? '#ff3b5c' : 'none'}
        color={liked ? '#ff3b5c' : color}
        className={busy ? 'opacity-60' : undefined}
      />
    </button>
  )
}
