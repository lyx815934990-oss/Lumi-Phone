import type { VoiceLogMessage } from './terminalChic/types'
import { resolveVoiceLogSource } from './terminalChic/types'
import {
  putVoiceCallAudio,
  upsertVoiceCallSession,
  type PersistedVoiceCallLine,
  type PersistedVoiceCallSession,
} from './voiceCallSessionIdb'

/** 挂断时把本通通话消息与音频落库，返回 sessionId */
export async function persistVoiceCallSession(params: {
  sessionId: string
  characterId: string
  accountId: string
  playerIdentityId?: string
  peerName: string
  peerAvatarUrl?: string
  initiator: 'self' | 'other'
  startedAt: number
  durationSec: number
  messages: VoiceLogMessage[]
}): Promise<string> {
  const sessionId = params.sessionId.trim() || `vcs-${Date.now()}`
  const lines: PersistedVoiceCallLine[] = []

  for (const m of params.messages) {
    const source = resolveVoiceLogSource(m)
    const text = String(m.asrText ?? m.text ?? '').trim()
    if (!text && !m.audioUrl) continue
    let audioId: string | undefined
    if (m.audioUrl?.trim()) {
      audioId = `vca-${m.id}`
      const ok = await putVoiceCallAudio(audioId, m.audioUrl)
      if (!ok) audioId = undefined
    }
    lines.push({
      id: m.id,
      source,
      text,
      audioId,
      durationSec: m.durationSec,
      createdAt: m.createdAt,
    })
  }

  const row: PersistedVoiceCallSession = {
    id: sessionId,
    characterId: params.characterId.trim(),
    accountId: params.accountId.trim(),
    playerIdentityId: params.playerIdentityId?.trim() || undefined,
    peerName: params.peerName.trim() || '对方',
    peerAvatarUrl: params.peerAvatarUrl?.trim() || undefined,
    initiator: params.initiator,
    startedAt: params.startedAt,
    durationSec: Math.max(0, Math.floor(params.durationSec)),
    lines,
    createdAt: Date.now(),
  }
  await upsertVoiceCallSession(row)
  return sessionId
}
