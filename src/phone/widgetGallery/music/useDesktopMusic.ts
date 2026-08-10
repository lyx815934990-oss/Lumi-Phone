import { useMemo, useSyncExternalStore } from 'react'
import { openListenTogetherApp } from '../../../components/discoverListen/listenTogetherNavigation'
import { useMusicStore } from '../../../stores/useMusicStore'
import {
  cycleLocalPlayMode,
  formatMusicTime,
  getDesktopMusicSnapshot,
  isDesktopLocalPlayback,
  LOCAL_PLAY_MODE_LABELS,
  type LocalPlayMode,
  playLocalNext,
  playLocalPrev,
  seekDesktopMusic,
  subscribeDesktopMusic,
  toggleDesktopPlayback,
} from './desktopMusicEngine'

function hasActiveTrack(
  track: { id: number; title: string } | null,
): track is { id: number; title: string } {
  return Boolean(track && track.id > 0 && track.title !== '暂无播放')
}

function withListenEngine(
  run: (engine: typeof import('../../../components/discoverListen/listenTogetherPlayerEngine').listenTogetherPlayerEngine) => void,
) {
  void import('../../../components/discoverListen/listenTogetherPlayerEngine')
    .then(({ listenTogetherPlayerEngine }) => {
      run(listenTogetherPlayerEngine)
    })
    .catch(() => {})
}

function normalizeUiPlayMode(mode: string | null | undefined): LocalPlayMode {
  if (mode === 'repeatOne' || mode === 'shuffle' || mode === 'repeatAll') return mode
  return 'repeatAll'
}

/**
 * 统一成 0–1。
 * 听一听 store.progress 是 0–100；开播瞬间常为 0.x，若当成比例会误显示成几十%，看起来「进度条闪一下」。
 * 优先用 currentTimeMs / durationMs，避免歧义。
 */
function ratioFromTimes(currentSec: number, durationSec: number, storeProgress: number): number {
  if (durationSec > 0 && Number.isFinite(currentSec)) {
    return Math.max(0, Math.min(1, currentSec / durationSec))
  }
  if (!Number.isFinite(storeProgress) || storeProgress <= 0) return 0
  // 兜底：>1 视为百分制；≤1 在无 duration 时按百分制小数处理（0.5 → 0.5%）
  if (storeProgress > 1) return Math.min(1, storeProgress / 100)
  return Math.min(1, storeProgress / 100)
}

/**
 * 桌面播放器：展示听一听 / 本地上传的统一状态；播控按来源分流。
 */
export function useDesktopMusic() {
  const track = useMusicStore((s) => s.currentTrack)
  const isPlaying = useMusicStore((s) => s.isPlaying)
  const storeProgress = useMusicStore((s) => s.progress)
  const currentTimeMs = useMusicStore((s) => s.currentTimeMs)
  const durationMs = useMusicStore((s) => s.durationMs)
  const listenPlayMode = useMusicStore((s) => s.listenPlayMode)
  const localSnap = useSyncExternalStore(
    subscribeDesktopMusic,
    getDesktopMusicSnapshot,
    getDesktopMusicSnapshot,
  )

  const local = Boolean(localSnap.localMode && localSnap.track?.audioUrl)
  const active = hasActiveTrack(track) || local
  const playMode: LocalPlayMode = local
    ? localSnap.playMode
    : normalizeUiPlayMode(listenPlayMode)
  const playModeLabel = LOCAL_PLAY_MODE_LABELS[playMode]

  const currentTime = local ? localSnap.currentTime : currentTimeMs / 1000
  const duration = local ? localSnap.duration : durationMs / 1000
  const progress = local
    ? localSnap.duration > 0
      ? Math.min(1, localSnap.currentTime / localSnap.duration)
      : 0
    : ratioFromTimes(currentTime, duration, storeProgress)
  const playing = local ? localSnap.playing : Boolean(hasActiveTrack(track) && isPlaying)

  const display = useMemo(() => {
    if (local && localSnap.track) {
      const t = localSnap.track
      return {
        id: t.id,
        title: t.title,
        artist: t.artist || '本地文件',
        artworkUrl: t.artworkUrl || '',
        audioUrl: t.audioUrl || '',
      }
    }
    if (hasActiveTrack(track)) {
      return {
        id: String(track.id),
        title: track.title,
        artist: track.artist || '听一听',
        artworkUrl: track.cover || '',
        audioUrl: 'active',
      }
    }
    return {
      id: '',
      title: '静候播放',
      artist: '点按选择播放方式',
      artworkUrl: '',
      audioUrl: '',
    }
  }, [local, localSnap.track, track])

  return {
    display,
    playing,
    hasTrack: active,
    /** 听一听网易云曲目 id；本地文件为 null（不可喜欢到账号歌单） */
    neteaseSongId: local || !hasActiveTrack(track) ? null : track.id,
    currentTime,
    duration,
    progress,
    playMode,
    playModeLabel,
    formatTime: formatMusicTime,
    cyclePlayMode: () => {
      if (isDesktopLocalPlayback()) {
        cycleLocalPlayMode()
        return
      }
      withListenEngine((engine) => {
        engine.cyclePlayMode()
      })
    },
    toggle: () => {
      if (isDesktopLocalPlayback()) {
        toggleDesktopPlayback()
        return
      }
      if (!hasActiveTrack(track)) return
      withListenEngine((engine) => engine.togglePlay())
    },
    skipPrev: () => {
      if (isDesktopLocalPlayback()) {
        void playLocalPrev()
        return
      }
      if (!hasActiveTrack(track)) return
      withListenEngine((engine) => {
        void engine.playPrev()
      })
    },
    skipNext: () => {
      if (isDesktopLocalPlayback()) {
        void playLocalNext()
        return
      }
      if (!hasActiveTrack(track)) return
      withListenEngine((engine) => {
        void engine.playNext()
      })
    },
    seekRatio: (ratio: number) => {
      const r = Math.max(0, Math.min(1, ratio))
      if (isDesktopLocalPlayback()) {
        seekDesktopMusic(r)
        return
      }
      if (!hasActiveTrack(track)) return
      withListenEngine((engine) => {
        // 听一听 seekTo 使用 0–100
        engine.seekTo(r * 100)
      })
    },
    openListenTogether: openListenTogetherApp,
  }
}
