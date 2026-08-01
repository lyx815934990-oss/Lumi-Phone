export type ScreenShareStartParams = {
  conversationKey: string
  characterId: string
  peerTitle: string
  peerAvatarUrl: string
}

export type ScreenShareSessionState = {
  active: boolean
  paused: boolean
  reacting: boolean
  conversationKey: string
  characterId: string
  peerTitle: string
  peerAvatarUrl: string
  startedAtMs: number
  lastReactionAtMs: number
  lastError: string | null
}

export type ScreenShareFrameCapture = {
  base64: string
  mime: 'image/jpeg'
  width: number
  height: number
}
