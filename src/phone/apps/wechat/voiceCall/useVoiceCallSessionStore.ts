import { create } from 'zustand'

import type { VoiceLogMessage } from './terminalChic/types'
import {
  readVoiceCallSynthEmotion,
  readVoiceCallSynthToneTokens,
  writeVoiceCallSynthEmotion,
  writeVoiceCallSynthToneTokens,
} from './voiceCallSynthPrefs'

export type VoiceCallSessionStatus = 'idle' | 'active' | 'ended'

type VoiceCallSessionState = {
  status: VoiceCallSessionStatus
  sessionId: string | null
  startedAt: number | null
  elapsedSec: number
  messages: VoiceLogMessage[]
  inputMode: 'voice' | 'text'
  muted: boolean
  speakerOn: boolean
  autoPlay: boolean
  /** 合成时是否带官方语气词（默认关） */
  synthToneTokens: boolean
  /** 合成时是否带情绪标签（默认关） */
  synthEmotion: boolean
  peerReplying: boolean
  peerSpeaking: boolean
  draft: string

  beginSession: (sessionId: string) => void
  resetSession: () => void
  setElapsedSec: (n: number | ((prev: number) => number)) => void
  setMessages: (updater: VoiceLogMessage[] | ((prev: VoiceLogMessage[]) => VoiceLogMessage[])) => void
  patchMessage: (id: string, patch: Partial<VoiceLogMessage>) => void
  setInputMode: (mode: 'voice' | 'text') => void
  setMuted: (v: boolean) => void
  setSpeakerOn: (v: boolean) => void
  setAutoPlay: (v: boolean) => void
  setSynthToneTokens: (v: boolean) => void
  setSynthEmotion: (v: boolean) => void
  setPeerReplying: (v: boolean) => void
  setPeerSpeaking: (v: boolean) => void
  setDraft: (v: string) => void
}

const initial = {
  status: 'idle' as VoiceCallSessionStatus,
  sessionId: null as string | null,
  startedAt: null as number | null,
  elapsedSec: 0,
  messages: [] as VoiceLogMessage[],
  inputMode: 'voice' as const,
  muted: false,
  speakerOn: true,
  /** 默认关闭：按需点播放再合成，避免整通通话自动扣费 */
  autoPlay: false,
  synthToneTokens: false,
  synthEmotion: false,
  peerReplying: false,
  peerSpeaking: false,
  draft: '',
}

export const useVoiceCallSessionStore = create<VoiceCallSessionState>((set) => ({
  ...initial,
  synthToneTokens: readVoiceCallSynthToneTokens(),
  synthEmotion: readVoiceCallSynthEmotion(),

  beginSession: (sessionId) =>
    set({
      ...initial,
      status: 'active',
      sessionId,
      startedAt: Date.now(),
      autoPlay: false,
      synthToneTokens: readVoiceCallSynthToneTokens(),
      synthEmotion: readVoiceCallSynthEmotion(),
      speakerOn: true,
    }),

  resetSession: () =>
    set({
      ...initial,
      messages: [],
      synthToneTokens: readVoiceCallSynthToneTokens(),
      synthEmotion: readVoiceCallSynthEmotion(),
    }),

  setElapsedSec: (n) =>
    set((s) => ({
      elapsedSec: typeof n === 'function' ? n(s.elapsedSec) : n,
    })),

  setMessages: (updater) =>
    set((s) => ({
      messages: typeof updater === 'function' ? updater(s.messages) : updater,
    })),

  patchMessage: (id, patch) =>
    set((s) => ({
      messages: s.messages.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    })),

  setInputMode: (mode) => set({ inputMode: mode }),
  setMuted: (v) => set({ muted: v }),
  setSpeakerOn: (v) => set({ speakerOn: v }),
  setAutoPlay: (v) => set({ autoPlay: v }),
  setSynthToneTokens: (v) => {
    writeVoiceCallSynthToneTokens(v)
    set({ synthToneTokens: v })
  },
  setSynthEmotion: (v) => {
    writeVoiceCallSynthEmotion(v)
    set({ synthEmotion: v })
  },
  setPeerReplying: (v) => set({ peerReplying: v }),
  setPeerSpeaking: (v) => set({ peerSpeaking: v }),
  setDraft: (v) => set({ draft: v }),
}))
