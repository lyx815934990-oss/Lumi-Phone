import { create } from 'zustand'

import type { FloatingVoiceCallPhase } from './FloatingVoiceCallBubble'

export type FloatLiveCaptionMode = 'idle' | 'thinking' | 'synthesizing' | 'line' | 'status'

type GlobalVoiceCallFloatState = {
  visible: boolean
  peerAvatarUrl: string
  peerRemarkName: string
  phase: FloatingVoiceCallPhase
  /** 悬浮球旁实时字幕（最小化后仍由 VoiceCallPanel 推送） */
  captionId: string | null
  captionText: string
  captionMode: FloatLiveCaptionMode
  /** ChatRoom 注册：取消最小化、回到通话全屏 */
  expandInChat: (() => void) | null
  /** PhoneApp 监听：打开微信（保活层可见） */
  openWechatNonce: number

  syncFloat: (p: {
    visible: boolean
    peerAvatarUrl?: string
    peerRemarkName?: string
    phase?: FloatingVoiceCallPhase
  }) => void
  setLiveCaption: (p: {
    id: string | null
    text: string
    mode: FloatLiveCaptionMode
  }) => void
  registerExpandInChat: (fn: (() => void) | null) => void
  requestExpand: () => void
  clearFloat: () => void
}

export const useGlobalVoiceCallFloatStore = create<GlobalVoiceCallFloatState>((set, get) => ({
  visible: false,
  peerAvatarUrl: '',
  peerRemarkName: '',
  phase: 'connected',
  captionId: null,
  captionText: '',
  captionMode: 'idle',
  expandInChat: null,
  openWechatNonce: 0,

  syncFloat: (p) =>
    set((s) => ({
      visible: p.visible,
      peerAvatarUrl: p.peerAvatarUrl ?? s.peerAvatarUrl,
      peerRemarkName: p.peerRemarkName ?? s.peerRemarkName,
      phase: p.phase ?? s.phase,
      ...(p.visible
        ? {}
        : { captionId: null, captionText: '', captionMode: 'idle' as const }),
    })),

  setLiveCaption: (p) =>
    set({
      captionId: p.id,
      captionText: p.text,
      captionMode: p.mode,
    }),

  registerExpandInChat: (fn) => set({ expandInChat: fn }),

  requestExpand: () => {
    const { expandInChat } = get()
    try {
      expandInChat?.()
    } catch {
      /* ignore */
    }
    set((s) => ({
      visible: false,
      openWechatNonce: s.openWechatNonce + 1,
      captionId: null,
      captionText: '',
      captionMode: 'idle',
    }))
  },

  clearFloat: () =>
    set({
      visible: false,
      peerAvatarUrl: '',
      peerRemarkName: '',
      phase: 'connected',
      captionId: null,
      captionText: '',
      captionMode: 'idle',
    }),
}))
