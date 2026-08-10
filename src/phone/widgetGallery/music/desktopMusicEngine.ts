/**
 * 桌面组件本地音频单例；听一听开播时会 pause。
 * 本地播放时会把状态同步到 useMusicStore，桌面组件可统一展示。
 * 支持本地曲库列表：多选上传、点选播放、上一首/下一首、播放模式。
 *
 * 注意：不要顶层 import 听一听引擎，否则会打进桌面首包拖垮手机开屏。
 */

import { useMusicStore } from '../../../stores/useMusicStore'

export type DesktopMusicTrack = {
  id: string
  title: string
  artist: string
  audioUrl: string
  artworkUrl: string
}

/** 与听一听常规模式对齐（不含心动模式） */
export type LocalPlayMode = 'repeatOne' | 'repeatAll' | 'shuffle'

export const LOCAL_PLAY_MODE_ORDER: LocalPlayMode[] = [
  'repeatAll',
  'repeatOne',
  'shuffle',
]

export const LOCAL_PLAY_MODE_LABELS: Record<LocalPlayMode, string> = {
  repeatOne: '单曲循环',
  repeatAll: '列表循环',
  shuffle: '随机播放',
}

type Listener = () => void

const audio = new Audio()
audio.preload = 'metadata'
try {
  audio.setAttribute('playsinline', 'true')
  audio.setAttribute('webkit-playsinline', 'true')
} catch {
  /* ignore */
}

let current: DesktopMusicTrack | null = null
let playing = false
let currentTime = 0
let duration = 0
/** 当前是否由桌面本地文件驱动 useMusicStore */
let localMode = false
/** 本会话本地曲库（blob URL，刷新后需重新添加） */
let library: DesktopMusicTrack[] = []
let libraryIndex = -1
let playMode: LocalPlayMode = 'repeatAll'
const listeners = new Set<Listener>()

let snapshotCache: {
  track: DesktopMusicTrack | null
  playing: boolean
  currentTime: number
  duration: number
  localMode: boolean
  library: DesktopMusicTrack[]
  libraryIndex: number
  playMode: LocalPlayMode
} | null = null

function emit() {
  snapshotCache = null
  for (const l of listeners) l()
}

function localTrackNumericId(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return 900_000_000 + (h % 99_000_000)
}

function pushLocalToMusicStore() {
  if (!localMode || !current) return
  const d = duration > 0 ? duration : 0
  useMusicStore.getState()._syncEngineState({
    currentTrack: {
      id: localTrackNumericId(current.id),
      title: current.title,
      artist: current.artist,
      cover: current.artworkUrl || '',
    },
    isPlaying: playing,
    listenPlayMode: playMode,
    progress: d > 0 ? Math.min(1, currentTime / d) : 0,
    currentTimeMs: Math.max(0, currentTime * 1000),
    durationMs: Math.max(0, d * 1000),
    playError: null,
    canUseHeartMode: false,
    lyrics: [{ timeMs: 0, text: LOCAL_PLAY_MODE_LABELS[playMode] }],
  })
}

/**
 * 仅当「听一听」引擎自身在播时才暂停。
 * 不可看 useMusicStore.isPlaying：本地开播后 store 也是 true，误 toggle 会启动听一听并反过来掐掉本地。
 */
async function pauseListenTogetherIfNeeded() {
  try {
    const { getListenTogetherPlayerSnapshot, listenTogetherPlayerEngine } = await import(
      '../../../components/discoverListen/listenTogetherPlayerEngine'
    )
    if (getListenTogetherPlayerSnapshot().isPlaying) {
      listenTogetherPlayerEngine.togglePlay()
    }
  } catch {
    /* ignore */
  }
}

function syncLibraryIndexFromCurrent() {
  if (!current) {
    libraryIndex = -1
    return
  }
  const i = library.findIndex((t) => t.id === current!.id)
  libraryIndex = i
}

function pickRandomLibraryIndex(exclude: number): number {
  const len = library.length
  if (len <= 1) return 0
  let next = Math.floor(Math.random() * len)
  let guard = 0
  while (next === exclude && guard < 10) {
    next = Math.floor(Math.random() * len)
    guard += 1
  }
  return next
}

audio.addEventListener('timeupdate', () => {
  currentTime = audio.currentTime || 0
  duration = Number.isFinite(audio.duration) ? audio.duration : duration
  emit()
  if (localMode) pushLocalToMusicStore()
})
audio.addEventListener('loadedmetadata', () => {
  duration = Number.isFinite(audio.duration) ? audio.duration : 0
  emit()
  if (localMode) pushLocalToMusicStore()
})
audio.addEventListener('play', () => {
  playing = true
  emit()
  if (localMode) pushLocalToMusicStore()
})
audio.addEventListener('pause', () => {
  playing = false
  emit()
  if (localMode) pushLocalToMusicStore()
})
audio.addEventListener('ended', () => {
  if (localMode && library.length > 0) {
    void playLocalNext({ fromEnded: true })
    return
  }
  playing = false
  emit()
  if (localMode) pushLocalToMusicStore()
})

function urlsMatch(a: string, b: string): boolean {
  if (!a.trim() || !b.trim()) return false
  if (a === b) return true
  try {
    return new URL(a, window.location.href).href === new URL(b, window.location.href).href
  } catch {
    return false
  }
}

export function subscribeDesktopMusic(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** 稳定快照：每次返回新对象会触发 useSyncExternalStore 无限更新 */
export function getDesktopMusicSnapshot() {
  if (!snapshotCache) {
    snapshotCache = {
      track: current,
      playing,
      currentTime,
      duration,
      localMode,
      library,
      libraryIndex,
      playMode,
    }
  }
  return snapshotCache
}

export function getLocalMusicLibrary(): DesktopMusicTrack[] {
  return library
}

export function getLocalPlayMode(): LocalPlayMode {
  return playMode
}

export function isDesktopLocalPlayback(): boolean {
  return localMode && !!current?.audioUrl
}

export function cycleLocalPlayMode(): LocalPlayMode {
  const i = LOCAL_PLAY_MODE_ORDER.indexOf(playMode)
  playMode = LOCAL_PLAY_MODE_ORDER[(i + 1) % LOCAL_PLAY_MODE_ORDER.length]!
  emit()
  if (localMode) pushLocalToMusicStore()
  return playMode
}

export function setLocalPlayMode(mode: LocalPlayMode): void {
  if (playMode === mode) return
  playMode = mode
  emit()
  if (localMode) pushLocalToMusicStore()
}

export function pauseMusicWidgetSharedAudio(): void {
  localMode = false
  if (!audio.paused) audio.pause()
}

export async function playDesktopTrack(track: DesktopMusicTrack): Promise<void> {
  if (!track.audioUrl.trim()) return
  await pauseListenTogetherIfNeeded()
  localMode = true
  current = track
  syncLibraryIndexFromCurrent()
  if (!urlsMatch(audio.src || audio.currentSrc, track.audioUrl)) {
    audio.pause()
    audio.src = track.audioUrl
    audio.load()
  }
  emit()
  pushLocalToMusicStore()
  try {
    await audio.play()
  } catch (err) {
    playing = false
    emit()
    pushLocalToMusicStore()
    throw err instanceof Error ? err : new Error('播放失败')
  }
}

/** 多选添加本地音频到曲库；可选立即播放第一首新歌 */
export async function addLocalMusicFiles(
  files: File[],
  opts?: { playFirst?: boolean },
): Promise<DesktopMusicTrack[]> {
  const isLikelyAudio = (f: File) => {
    const name = (f.name || '').trim()
    const type = (f.type || '').toLowerCase()
    if (type.startsWith('audio/')) return true
    if (/\.(mp3|m4a|aac|wav|ogg|flac|wma|aiff|aif|opus|amr|3gp|m4b|mp4|aac)$/i.test(name)) {
      return true
    }
    // 手机端常见：无 MIME、application/octet-stream、文件名无扩展名
    if ((!type || type === 'application/octet-stream') && f.size > 1024) {
      if (!name || !/\./.test(name)) return true
      if (!/\.(jpe?g|png|gif|webp|heic|heif|pdf|doc|docx|zip|rar|txt)$/i.test(name)) {
        return true
      }
    }
    return false
  }

  let audioFiles = files.filter(isLikelyAudio)
  // 选择器已限定音频时，仍可能被过度过滤：整批收下非图片
  if (audioFiles.length === 0 && files.length > 0) {
    audioFiles = files.filter((f) => {
      const type = (f.type || '').toLowerCase()
      if (type.startsWith('image/')) return false
      return f.size > 0
    })
  }
  if (audioFiles.length === 0) return []

  const added: DesktopMusicTrack[] = audioFiles.map((file, i) => {
    const rawName = (file.name || '').trim()
    const title =
      (rawName.replace(/\.[^/.]+$/, '') || rawName || `本地音乐 ${library.length + i + 1}`).trim() ||
      `本地音乐 ${library.length + i + 1}`
    return {
      id: `local-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 8)}`,
      title,
      artist: '本地文件',
      audioUrl: URL.createObjectURL(file),
      artworkUrl: '',
    }
  })
  library = [...library, ...added]
  emit()

  if (opts?.playFirst !== false && added[0]) {
    try {
      await playDesktopTrack(added[0])
    } catch {
      /* 已写入曲库与展示；自动播放可能被浏览器拦截，由用户点播放 */
    }
  }
  return added
}

export function removeLocalMusicTrack(id: string): void {
  const target = library.find((t) => t.id === id)
  if (!target) return
  if (target.audioUrl.startsWith('blob:')) {
    try {
      URL.revokeObjectURL(target.audioUrl)
    } catch {
      /* ignore */
    }
  }
  library = library.filter((t) => t.id !== id)
  if (current?.id === id) {
    current = null
    localMode = false
    libraryIndex = -1
    audio.pause()
    audio.removeAttribute('src')
    audio.load()
  } else {
    syncLibraryIndexFromCurrent()
  }
  emit()
}

export async function playLocalPrev(): Promise<void> {
  if (library.length === 0) return
  if (playMode === 'shuffle') {
    const i = libraryIndex >= 0 ? libraryIndex : 0
    await playDesktopTrack(library[pickRandomLibraryIndex(i)]!)
    return
  }
  const i = libraryIndex >= 0 ? libraryIndex : 0
  const next = (i - 1 + library.length) % library.length
  await playDesktopTrack(library[next]!)
}

export async function playLocalNext(opts?: { fromEnded?: boolean }): Promise<void> {
  if (library.length === 0) return
  const fromEnded = Boolean(opts?.fromEnded)

  if (playMode === 'repeatOne' && fromEnded && current) {
    try {
      audio.currentTime = 0
      await audio.play()
    } catch {
      playing = false
      emit()
      pushLocalToMusicStore()
    }
    return
  }

  if (playMode === 'shuffle') {
    const i = libraryIndex >= 0 ? libraryIndex : 0
    await playDesktopTrack(library[pickRandomLibraryIndex(i)]!)
    return
  }

  const i = libraryIndex >= 0 ? libraryIndex : -1
  const next = (i + 1) % library.length
  await playDesktopTrack(library[next]!)
}

export function toggleDesktopPlayback(): void {
  if (!current?.audioUrl) return
  if (audio.paused) {
    localMode = true
    void (async () => {
      await pauseListenTogetherIfNeeded()
      localMode = true
      try {
        await audio.play()
      } catch {
        playing = false
        emit()
        pushLocalToMusicStore()
      }
    })()
  } else {
    audio.pause()
  }
}

export function seekDesktopMusic(ratio: number): void {
  const d = Number.isFinite(audio.duration) ? audio.duration : 0
  if (d <= 0) return
  audio.currentTime = Math.max(0, Math.min(1, ratio)) * d
  currentTime = audio.currentTime
  emit()
  if (localMode) pushLocalToMusicStore()
}

export function formatMusicTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '0:00'
  const s = Math.floor(sec)
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${r.toString().padStart(2, '0')}`
}
