import { captureDisplayMediaStream } from './captureScreen'
import type { ScreenShareSessionState, ScreenShareStartParams } from './types'

type Listener = () => void

const emptyState = (): ScreenShareSessionState => ({
  active: false,
  paused: false,
  reacting: false,
  conversationKey: '',
  characterId: '',
  peerTitle: '',
  peerAvatarUrl: '',
  startedAtMs: 0,
  lastReactionAtMs: 0,
  lastError: null,
})

let state: ScreenShareSessionState = emptyState()
let stream: MediaStream | null = null
let externalPauseGetter: (() => boolean) | null = null
const listeners = new Set<Listener>()

function notify(): void {
  for (const fn of listeners) {
    try {
      fn()
    } catch {
      /* ignore */
    }
  }
}

function patchState(partial: Partial<ScreenShareSessionState>): void {
  state = { ...state, ...partial }
  notify()
}

function stopTracks(): void {
  if (!stream) return
  stream.getTracks().forEach((t) => {
    try {
      t.stop()
    } catch {
      /* ignore */
    }
  })
  stream = null
}

function bindTrackEnded(s: MediaStream): void {
  const track = s.getVideoTracks()[0]
  if (!track) return
  track.addEventListener(
    'ended',
    () => {
      if (stream !== s) return
      stopScreenShareSession('屏幕共享已结束')
    },
    { once: true },
  )
}

export function getScreenShareSession(): ScreenShareSessionState {
  return state
}

export function getScreenShareStream(): MediaStream | null {
  return stream
}

export function subscribeScreenShareSession(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function setScreenShareExternalPauseGetter(getter: (() => boolean) | null): void {
  externalPauseGetter = getter
}

export function isScreenShareEffectivelyPaused(): boolean {
  if (!state.active) return true
  if (state.paused) return true
  try {
    if (externalPauseGetter?.() === true) return true
  } catch {
    /* ignore */
  }
  return false
}

export function setScreenSharePaused(paused: boolean): void {
  if (!state.active) return
  if (state.paused === paused) return
  patchState({ paused })
}

export function setScreenShareReacting(reacting: boolean): void {
  if (!state.active && !reacting) {
    if (state.reacting) patchState({ reacting: false })
    return
  }
  if (state.reacting === reacting) return
  patchState({ reacting })
}

export function markScreenShareReactionFired(atMs = Date.now()): void {
  if (!state.active) return
  patchState({ lastReactionAtMs: atMs, reacting: false, lastError: null })
}

export function setScreenShareLastError(message: string | null): void {
  if (!state.active && !message) return
  patchState({ lastError: message })
}

export async function startScreenShareSession(params: ScreenShareStartParams): Promise<void> {
  const conversationKey = params.conversationKey.trim()
  const characterId = params.characterId.trim()
  if (!conversationKey || !characterId) {
    throw new Error('会话无效，无法开启一起刷')
  }

  if (state.active) {
    if (state.conversationKey === conversationKey) {
      setScreenSharePaused(false)
      return
    }
    stopScreenShareSession()
  }

  const nextStream = await captureDisplayMediaStream()
  stream = nextStream
  bindTrackEnded(nextStream)

  state = {
    active: true,
    paused: false,
    reacting: false,
    conversationKey,
    characterId,
    peerTitle: params.peerTitle.trim() || '对方',
    peerAvatarUrl: params.peerAvatarUrl.trim(),
    startedAtMs: Date.now(),
    lastReactionAtMs: 0,
    lastError: null,
  }
  notify()
}

export function stopScreenShareSession(reason?: string): void {
  const wasActive = state.active
  stopTracks()
  state = {
    ...emptyState(),
    lastError: reason?.trim() || null,
  }
  if (wasActive || reason) notify()
}
