import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { CallVoiceBindSheet } from './CallVoiceBindSheet'
import {
  playVoiceCallUrl,
  stopVoiceCallAudio,
  unlockVoiceCallAudio,
} from './callAudioBridge'
import { CallControls } from './callUi/CallControls'
import { CallHeader } from './callUi/CallHeader'
import { CallTranscriptLog } from './callUi/CallTranscriptLog'
import { CallVisualizer } from './callUi/CallVisualizer'
import { CallTextInputBar } from './terminalChic/HybridInput'
import { splitAuditoryNarration, type VoiceLogMessage } from './terminalChic/types'
import { useGlobalVoiceCallFloatStore } from './useGlobalVoiceCallFloatStore'
import { useVoiceCallSessionStore } from './useVoiceCallSessionStore'
import {
  prepareVoiceCallTts,
  sanitizeVoiceDisplayText,
  splitVoiceCallReplySegments,
  stripForTts,
} from './voiceCallSegmentUtils'
import type { VoiceAllowedEmotion } from '../wechatVoiceScript'
import { splitVoiceCallHangupDirective, estimateVoiceCallCaptionRevealMs } from './voiceCallHangup'
import { estimateSpeechDurationSec, VC, VC_UI_FONT, vcLiquidGlassLight } from './voiceCallTheme'
import { VoiceCallPortal } from './VoiceCallPortal'
import { SHARED_RECORD_PLAYER_ORIGIN_ID } from '../favorites/sharedRecordOrigin'
import { personaDb } from '../newFriendsPersona/idb'
import { lookupBoundVoiceIdForCharacter } from '../../voiceprint/characterVoiceMapStorage'
import defaultCallBgUrl from '../../../../../image/通话页面默认壁纸.png'

function toFloatCaptionDisplay(raw: string): string {
  const cleaned = sanitizeVoiceDisplayText(raw)
  const parts = splitAuditoryNarration(cleaned)
  if (!parts.length) return cleaned.trim()
  return parts
    .map((p) => (p.kind === 'sfx' ? `(${p.text})` : p.text))
    .join('')
    .trim()
}

function voiceCallFavoriteMessageId(msgId: string): string {
  return `vc-line-${msgId}`
}

export type VoiceCallHangupPayload = {
  durationSec: number
  sessionId: string
  messages: VoiceLogMessage[]
  startedAt: number
  /** 谁结束了通话；缺省按用户挂断 */
  endedBy?: 'user' | 'character'
}

type VoiceCallPanelProps = {
  open: boolean
  minimized?: boolean
  peerAvatarUrl?: string
  peerRemarkName: string
  backgroundImage?: string
  /** 用于查找 / 绑定声纹的角色 id（人设档案 id） */
  voiceCharacterId?: string
  callInitiator?: 'self' | 'other' | null
  initialAiText?: string
  onClose: () => void
  onMinimize?: () => void
  onHangup?: (payload: VoiceCallHangupPayload) => void
  onRequestAiReply: (
    text: string,
    opts?: {
      fromVoice?: boolean
      voiceEmotion?: string
      allowSynthToneTokens?: boolean
      allowSynthEmotion?: boolean
      /** @deprecated 请用 allowSynthToneTokens / allowSynthEmotion */
      allowSynthToneEmotion?: boolean
      /** 接通瞬间首轮开口（由模型生成，非本地开场白） */
      callEvent?: 'connected_opening'
      callInitiator?: 'self' | 'other' | null
      /** 本通已发生的全部对白（含当前这句用户话） */
      callMessages?: Array<{
        role: 'user' | 'character'
        text?: string
        asrText?: string
        voiceEmotion?: string
        source?: string
      }>
    },
  ) => Promise<string> | string
  onTranscribeAudio?: (audioBlob: Blob) => Promise<{ text: string; emotion?: string }>
  /** MiniMax TTS：须使用角色已绑定音色；返回可播放 URL；未绑定或失败返回空串 */
  onSynthesizeCharacterVoice?: (text: string, emotion?: VoiceAllowedEmotion) => Promise<string>
}

function buildSegmentMessages(
  segments: string[],
  peer: string,
  baseTime: number,
  opts: { canSynth: boolean; autoPlay: boolean; allowToneTokens: boolean },
): VoiceLogMessage[] {
  return segments.map((seg, i) => {
    const tts = stripForTts(seg, opts.allowToneTokens)
    const pureSfx = !tts
    let audioStatus: VoiceLogMessage['audioStatus']
    if (pureSfx) {
      audioStatus = 'ready'
    } else if (!opts.canSynth) {
      audioStatus = 'failed'
    } else if (opts.autoPlay) {
      audioStatus = 'pending'
    } else {
      audioStatus = 'idle'
    }
    return {
      id: `vc-${baseTime}-a${i}`,
      role: 'character' as const,
      prefix: peer,
      kind: 'voice' as const,
      source: 'char_voice' as const,
      text: seg,
      asrText: seg,
      durationSec: pureSfx ? Math.max(1, Math.round(seg.length / 8)) : estimateSpeechDurationSec(tts || seg),
      listened: false,
      audioStatus,
      createdAt: baseTime + i,
    }
  })
}

/**
 * 已接通语音通话：iOS 骨架（大头像+计时+声波主视觉），记录默认收起。
 * 角色回复拆成多条短语音条；自动播放时打字机与当前条同步，播完跳下一条。
 */
export function VoiceCallPanel({
  open,
  minimized = false,
  peerAvatarUrl,
  peerRemarkName,
  backgroundImage,
  voiceCharacterId = '',
  callInitiator = null,
  initialAiText: _initialAiText,
  onClose,
  onMinimize,
  onHangup,
  onRequestAiReply,
  onTranscribeAudio,
  onSynthesizeCharacterVoice,
}: VoiceCallPanelProps) {
  const {
    sessionId,
    startedAt,
    elapsedSec,
    messages,
    autoPlay,
    synthToneTokens,
    synthEmotion,
    peerReplying,
    peerSpeaking,
    draft,
    beginSession,
    resetSession,
    setElapsedSec,
    setMessages,
    patchMessage,
    setAutoPlay,
    setSynthToneTokens,
    setSynthEmotion,
    setPeerReplying,
    setPeerSpeaking,
    setDraft,
  } = useVoiceCallSessionStore()

  const [transcriptOpen, setTranscriptOpen] = useState(false)
  const [keyboardOpen, setKeyboardOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  /** 触发悬浮球刷新「对方已挂断」展示 */
  const [peerHangupUiTick, setPeerHangupUiTick] = useState(0)
  const [voiceBindOpen, setVoiceBindOpen] = useState(false)
  const [boundVoiceId, setBoundVoiceId] = useState('')
  /** 居中打字机当前对齐的语音条 id */
  const [captionMsgId, setCaptionMsgId] = useState<string | null>(null)
  /** 手动/自动正在播放的语音条 */
  const [playingMsgId, setPlayingMsgId] = useState<string | null>(null)
  /** 通话记录里已收藏的句子 id */
  const [favoritedLineIds, setFavoritedLineIds] = useState<Set<string>>(() => new Set())
  const [favoriteBusyId, setFavoriteBusyId] = useState<string | null>(null)

  const inflightRef = useRef(false)
  const messagesRef = useRef<VoiceLogMessage[]>([])
  const audioObjectUrlsRef = useRef<string[]>([])
  /** 用户录音 Blob：催回复 / 挂断时再 ASR，松手只上屏 */
  const voiceBlobByMsgIdRef = useRef(new Map<string, Blob>())
  const toastTimerRef = useRef<number | null>(null)
  const seededRef = useRef(false)
  /** 接通首轮已向模型请求过（避免失败后 effect 死循环刷请求） */
  const openingRequestedRef = useRef(false)
  const sessionStartedRef = useRef(false)
  const playQueueRef = useRef<string[]>([])
  const queueBusyRef = useRef(false)
  const sfxTimerRef = useRef<number | null>(null)
  const captionParadeRef = useRef<number | null>(null)
  /** 对方挂断：等打字机全部显示完 + 3s 后再真正挂断 */
  const peerHangupTimerRef = useRef<number | null>(null)
  const peerHangupDelayTimerRef = useRef<number | null>(null)
  /** 已宣布对方挂断：阻止字幕 effect 盖掉悬浮球上的「对方已挂断」 */
  const peerHangupAnnouncedRef = useRef(false)
  const autoPlayRef = useRef(autoPlay)
  const synthToneTokensRef = useRef(synthToneTokens)
  const synthEmotionRef = useRef(synthEmotion)
  const kickPlayQueueRef = useRef<() => void>(() => {})
  const enqueuedIdsRef = useRef<Set<string>>(new Set())
  const hangupRef = useRef<(endedBy?: 'user' | 'character') => void>(() => {})
  const minimizedRef = useRef(minimized)
  const callInitiatorRef = useRef(callInitiator)
  const openRef = useRef(open)

  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  useEffect(() => {
    minimizedRef.current = minimized
  }, [minimized])

  useEffect(() => {
    callInitiatorRef.current = callInitiator
  }, [callInitiator])

  useEffect(() => {
    openRef.current = open
  }, [open])

  useEffect(() => {
    autoPlayRef.current = autoPlay
  }, [autoPlay])

  useEffect(() => {
    synthToneTokensRef.current = synthToneTokens
  }, [synthToneTokens])

  useEffect(() => {
    synthEmotionRef.current = synthEmotion
  }, [synthEmotion])

  const markListened = useCallback(
    (id: string) => {
      patchMessage(id, { listened: true })
    },
    [patchMessage],
  )

  /** 同步写 messagesRef，避免 patch 后立刻 kick 仍读到 pending */
  const patchMessageSync = useCallback(
    (id: string, patch: Partial<VoiceLogMessage>) => {
      messagesRef.current = messagesRef.current.map((m) =>
        m.id === id ? { ...m, ...patch } : m,
      )
      patchMessage(id, patch)
    },
    [patchMessage],
  )

  const stopCenterAudio = useCallback(() => {
    if (sfxTimerRef.current != null) {
      window.clearTimeout(sfxTimerRef.current)
      sfxTimerRef.current = null
    }
    stopVoiceCallAudio()
  }, [])

  const kickPlayQueue = useCallback(() => {
    if (!autoPlayRef.current) return
    if (queueBusyRef.current) return
    const nextId = playQueueRef.current[0]
    if (!nextId) return

    const msg = messagesRef.current.find((m) => m.id === nextId)
    if (!msg) {
      // store 可能尚未刷到；等 messages effect 再踢，勿丢弃队列头
      return
    }
    if (msg.audioStatus === 'pending') return

    playQueueRef.current.shift()
    queueBusyRef.current = true
    setCaptionMsgId(msg.id)
    setPlayingMsgId(msg.id)
    stopCenterAudio()

    const finish = () => {
      queueBusyRef.current = false
      setPeerSpeaking(false)
      setPlayingMsgId(null)
      kickPlayQueueRef.current()
    }

    const url = msg.audioUrl?.trim()
    if (url) {
      unlockVoiceCallAudio()
      playVoiceCallUrl(url, {
        onPlay: () => {
          setPeerSpeaking(true)
          markListened(msg.id)
        },
        onEnded: () => finish(),
        onError: () => {
          // 自动播放被拦时：再解锁重试一次，仍失败则只留字幕
          unlockVoiceCallAudio()
          window.setTimeout(() => {
            playVoiceCallUrl(url, {
              onPlay: () => {
                setPeerSpeaking(true)
                markListened(msg.id)
              },
              onEnded: () => finish(),
              onError: () => {
                markListened(msg.id)
                const text = String(msg.asrText ?? msg.text ?? '')
                const waitMs = Math.min(4200, Math.max(900, text.length * 70))
                setPeerSpeaking(true)
                sfxTimerRef.current = window.setTimeout(finish, waitMs)
              },
            })
          }, 120)
        },
      })
      return
    }

    // 纯旁白 / 合成失败：按文稿长度短暂展示字幕后跳下一条
    markListened(msg.id)
    const text = String(msg.asrText ?? msg.text ?? '')
    const waitMs = Math.min(4200, Math.max(900, text.length * 70))
    setPeerSpeaking(true)
    sfxTimerRef.current = window.setTimeout(finish, waitMs)
  }, [markListened, setPeerSpeaking, stopCenterAudio])

  useEffect(() => {
    kickPlayQueueRef.current = kickPlayQueue
  }, [kickPlayQueue])

  const enqueuePlay = useCallback(
    (ids: string[]) => {
      if (!ids.length) return
      for (const id of ids) {
        if (enqueuedIdsRef.current.has(id)) continue
        enqueuedIdsRef.current.add(id)
        playQueueRef.current.push(id)
      }
      kickPlayQueue()
    },
    [kickPlayQueue],
  )

  // 消息就绪 / 开场白落库后补踢；并回收「ready 但从未入队」的首句
  useEffect(() => {
    if (!autoPlay || !open) return
    const missing = messages.filter(
      (m) =>
        m.role === 'character' &&
        m.audioStatus === 'ready' &&
        !!m.audioUrl?.trim() &&
        !m.listened &&
        !enqueuedIdsRef.current.has(m.id) &&
        !playQueueRef.current.includes(m.id),
    )
    if (missing.length) {
      enqueuePlay(missing.map((m) => m.id))
      return
    }
    if (!playQueueRef.current.length) return
    if (queueBusyRef.current) return
    const headId = playQueueRef.current[0]
    const head = messages.find((m) => m.id === headId)
    if (head && head.audioStatus !== 'pending') {
      kickPlayQueue()
    }
  }, [autoPlay, enqueuePlay, kickPlayQueue, messages, open])

  const refreshVoiceBinding = useCallback(async () => {
    const cid = voiceCharacterId.trim()
    if (!cid) {
      setBoundVoiceId('')
      return ''
    }
    const id = await lookupBoundVoiceIdForCharacter(cid)
    setBoundVoiceId(id)
    return id
  }, [voiceCharacterId])

  useEffect(() => {
    if (!open) return
    void refreshVoiceBinding()
  }, [open, refreshVoiceBinding])

  const showToast = useCallback((text: string, ms = 1600) => {
    setToast(text)
    // 最小化时全屏 toast 不可见：推到悬浮球旁
    if (minimizedRef.current) {
      useGlobalVoiceCallFloatStore.getState().setLiveCaption({
        id: `toast-${Date.now()}`,
        text,
        mode: 'status',
      })
    }
    if (toastTimerRef.current != null) window.clearTimeout(toastTimerRef.current)
    toastTimerRef.current = window.setTimeout(() => setToast(null), ms)
  }, [])

  const schedulePeerHangupAfterReveal = useCallback(
    (replyText: string) => {
      if (peerHangupTimerRef.current != null) {
        window.clearTimeout(peerHangupTimerRef.current)
        peerHangupTimerRef.current = null
      }
      if (peerHangupDelayTimerRef.current != null) {
        window.clearTimeout(peerHangupDelayTimerRef.current)
        peerHangupDelayTimerRef.current = null
      }
      peerHangupAnnouncedRef.current = false
      const segments = replyText ? splitVoiceCallReplySegments(replyText) : []
      const revealMs = estimateVoiceCallCaptionRevealMs(segments, {
        autoPlay: autoPlayRef.current,
      })
      peerHangupTimerRef.current = window.setTimeout(() => {
        peerHangupTimerRef.current = null
        peerHangupAnnouncedRef.current = true
        setPeerHangupUiTick((n) => n + 1)
        showToast('对方已挂断', 2200)
        peerHangupDelayTimerRef.current = window.setTimeout(() => {
          peerHangupDelayTimerRef.current = null
          hangupRef.current('character')
        }, 3000)
      }, revealMs)
    },
    [showToast],
  )

  // 打开通话记录时，同步哪些句子已在「我」的收藏里
  useEffect(() => {
    if (!transcriptOpen || !open) return
    let cancelled = false
    void (async () => {
      const next = new Set<string>()
      await Promise.all(
        messagesRef.current.map(async (m) => {
          const hit = await personaDb.findMessageFavoriteByMessageId(voiceCallFavoriteMessageId(m.id))
          if (hit) next.add(m.id)
        }),
      )
      if (!cancelled) setFavoritedLineIds(next)
    })()
    return () => {
      cancelled = true
    }
  }, [messages, open, transcriptOpen])

  const favoriteTranscriptLine = useCallback(
    async (msg: VoiceLogMessage) => {
      const text = toFloatCaptionDisplay(String(msg.asrText ?? msg.text ?? ''))
      if (!text) {
        showToast('这条没有可收藏的文字', 1600)
        return
      }
      const characterId =
        msg.role === 'user'
          ? SHARED_RECORD_PLAYER_ORIGIN_ID
          : voiceCharacterId.trim() || 'unknown-character'
      if (msg.role === 'character' && !voiceCharacterId.trim()) {
        showToast('无法识别角色，暂不能收藏', 1800)
        return
      }
      setFavoriteBusyId(msg.id)
      try {
        const result = await personaDb.addFavoriteFromPlainText({
          messageId: voiceCallFavoriteMessageId(msg.id),
          characterId,
          content: text,
          timestamp: msg.createdAt,
        })
        if (!result) {
          showToast('收藏失败', 1600)
          return
        }
        setFavoritedLineIds((prev) => {
          const next = new Set(prev)
          next.add(msg.id)
          return next
        })
        showToast(result.created ? '已收藏到「我」的收藏' : '已在收藏中', 1800)
      } catch {
        showToast('收藏失败，请稍后重试', 1800)
      } finally {
        setFavoriteBusyId(null)
      }
    },
    [showToast, voiceCharacterId],
  )

  const attachSynth = useCallback(
    async (msgId: string, replyText: string) => {
      const allowToneTokens = synthToneTokensRef.current
      const allowEmotion = synthEmotionRef.current
      const prepared = prepareVoiceCallTts(replyText, { allowToneTokens, allowEmotion })
      if (!prepared) {
        // 纯听觉旁白：无需 TTS，直接可播字幕
        patchMessageSync(msgId, { audioStatus: 'ready', audioUrl: undefined })
        kickPlayQueueRef.current()
        return
      }
      if (!onSynthesizeCharacterVoice) {
        patchMessageSync(msgId, { audioStatus: 'failed' })
        kickPlayQueueRef.current()
        return
      }
      const bound = boundVoiceId || (await refreshVoiceBinding())
      if (!bound) {
        patchMessageSync(msgId, { audioStatus: 'failed' })
        showToast('未绑定角色音色，点「绑音色」后可合成', 2400)
        kickPlayQueueRef.current()
        return
      }
      try {
        const url = await onSynthesizeCharacterVoice(
          prepared.text,
          allowEmotion ? prepared.emotion : undefined,
        )
        if (!url.trim()) {
          patchMessageSync(msgId, { audioStatus: 'failed' })
          showToast('语音合成失败，请检查 MiniMax 配置或音色绑定', 2200)
          kickPlayQueueRef.current()
          return
        }
        if (url.startsWith('blob:')) audioObjectUrlsRef.current.push(url)
        patchMessageSync(msgId, { audioUrl: url, audioStatus: 'ready' })
        kickPlayQueueRef.current()
      } catch {
        patchMessageSync(msgId, { audioStatus: 'failed' })
        showToast('语音合成失败', 1800)
        kickPlayQueueRef.current()
      }
    },
    [
      boundVoiceId,
      onSynthesizeCharacterVoice,
      patchMessageSync,
      refreshVoiceBinding,
      showToast,
    ],
  )

  const commitCharacterSegments = useCallback(
    (rawReply: string, replaceAll = false) => {
      const segments = splitVoiceCallReplySegments(rawReply)
      if (!segments.length) return
      const peer = (peerRemarkName.trim() || 'CHAR').slice(0, 16)
      const t = Date.now()
      const canSynth = !!onSynthesizeCharacterVoice
      const doAuto = autoPlayRef.current
      const batch = buildSegmentMessages(segments, peer, t, {
        canSynth,
        autoPlay: doAuto,
        allowToneTokens: synthToneTokensRef.current,
      })
      if (replaceAll) {
        messagesRef.current = batch
        setMessages(batch)
      } else {
        setMessages((prev) => {
          const next = [...prev, ...batch]
          messagesRef.current = next
          return next
        })
      }
      setCaptionMsgId(batch[0]?.id ?? null)
      if (doAuto) {
        if (captionParadeRef.current != null) {
          window.clearTimeout(captionParadeRef.current)
          captionParadeRef.current = null
        }
        enqueuePlay(batch.map((m) => m.id))
        for (const m of batch) {
          if (m.audioStatus === 'pending') void attachSynth(m.id, String(m.asrText ?? m.text ?? ''))
        }
      } else if (batch.length > 1) {
        // 未开自动播：按文稿节奏推进字幕，悬浮球也能逐条打字机展示
        if (captionParadeRef.current != null) {
          window.clearTimeout(captionParadeRef.current)
          captionParadeRef.current = null
        }
        let i = 0
        const step = () => {
          i += 1
          if (i >= batch.length) {
            captionParadeRef.current = null
            return
          }
          const m = batch[i]!
          setCaptionMsgId(m.id)
          const text = String(m.asrText ?? m.text ?? '')
          const waitMs = Math.min(4200, Math.max(1200, text.length * 70))
          captionParadeRef.current = window.setTimeout(step, waitMs)
        }
        const firstText = String(batch[0]?.asrText ?? batch[0]?.text ?? '')
        const waitMs = Math.min(4200, Math.max(1200, firstText.length * 70))
        captionParadeRef.current = window.setTimeout(step, waitMs)
      }
      // 关闭自动合成：只上字，等用户点播放再按需合成
    },
    [attachSynth, enqueuePlay, onSynthesizeCharacterVoice, peerRemarkName, setMessages],
  )

  const resynthMissingCharacterAudio = useCallback(async () => {
    const list = messagesRef.current.filter(
      (m) =>
        m.role === 'character' &&
        (!m.audioUrl ||
          m.audioStatus === 'failed' ||
          m.audioStatus === 'pending' ||
          m.audioStatus === 'idle'),
    )
    for (const m of list) {
      const text = String(m.asrText ?? m.text ?? '').trim()
      if (!text) continue
      if (!stripForTts(text, synthToneTokensRef.current)) {
        patchMessageSync(m.id, { audioStatus: 'ready', audioUrl: undefined })
        continue
      }
      patchMessageSync(m.id, { audioStatus: 'pending', audioUrl: undefined })
      await attachSynth(m.id, text)
    }
    kickPlayQueueRef.current()
  }, [attachSynth, patchMessageSync])

  /** 点歌词旁播放：用户手势内解锁 + 按需合成 + 播放 */
  const playCharacterLine = useCallback(
    async (id: string) => {
      unlockVoiceCallAudio()
      const msg0 = messagesRef.current.find((m) => m.id === id)
      if (!msg0 || msg0.role !== 'character') return

      if (msg0.audioStatus === 'pending') {
        showToast('正在合成语音…', 1200)
        return
      }

      stopCenterAudio()
      queueBusyRef.current = true
      setCaptionMsgId(id)
      setPlayingMsgId(id)

      const finishManual = () => {
        queueBusyRef.current = false
        setPeerSpeaking(false)
        setPlayingMsgId(null)
        if (autoPlayRef.current) kickPlayQueueRef.current()
      }

      let msg = msg0
      const text = String(msg.asrText ?? msg.text ?? '').trim()
      if (!text) {
        finishManual()
        return
      }

      if (!msg.audioUrl?.trim()) {
        if (!stripForTts(text, synthToneTokensRef.current)) {
          markListened(id)
          const waitMs = Math.min(4200, Math.max(900, text.length * 70))
          setPeerSpeaking(true)
          sfxTimerRef.current = window.setTimeout(finishManual, waitMs)
          return
        }
        if (!onSynthesizeCharacterVoice) {
          showToast('未配置语音合成', 1800)
          finishManual()
          return
        }
        patchMessageSync(id, { audioStatus: 'pending' })
        await attachSynth(id, text)
        msg = messagesRef.current.find((m) => m.id === id) || msg
      }

      const url = msg.audioUrl?.trim()
      if (!url) {
        showToast(msg.audioStatus === 'failed' ? '合成失败，请检查音色绑定' : '暂无音频', 2000)
        finishManual()
        return
      }

      playVoiceCallUrl(url, {
        onPlay: () => {
          setPeerSpeaking(true)
          markListened(id)
        },
        onEnded: () => finishManual(),
        onError: () => {
          showToast('播放失败', 1600)
          finishManual()
        },
      })
    },
    [
      attachSynth,
      markListened,
      onSynthesizeCharacterVoice,
      patchMessageSync,
      setPeerSpeaking,
      showToast,
      stopCenterAudio,
    ],
  )

  useEffect(() => {
    if (!open) {
      for (const u of audioObjectUrlsRef.current) {
        try {
          URL.revokeObjectURL(u)
        } catch {
          /* ignore */
        }
      }
      audioObjectUrlsRef.current = []
      stopCenterAudio()
      playQueueRef.current = []
      queueBusyRef.current = false
      enqueuedIdsRef.current = new Set()
      resetSession()
      seededRef.current = false
      openingRequestedRef.current = false
      sessionStartedRef.current = false
      peerHangupAnnouncedRef.current = false
      setTranscriptOpen(false)
      setKeyboardOpen(false)
      setVoiceBindOpen(false)
      setBoundVoiceId('')
      setToast(null)
      setCaptionMsgId(null)
      setPlayingMsgId(null)
      setFavoritedLineIds(new Set())
      setFavoriteBusyId(null)
      inflightRef.current = false
      if (captionParadeRef.current != null) {
        window.clearTimeout(captionParadeRef.current)
        captionParadeRef.current = null
      }
      if (peerHangupTimerRef.current != null) {
        window.clearTimeout(peerHangupTimerRef.current)
        peerHangupTimerRef.current = null
      }
      if (peerHangupDelayTimerRef.current != null) {
        window.clearTimeout(peerHangupDelayTimerRef.current)
        peerHangupDelayTimerRef.current = null
      }
      useGlobalVoiceCallFloatStore.getState().setLiveCaption({ id: null, text: '', mode: 'idle' })
      return
    }

    // 接通瞬间再尝试解锁（接听按钮手势链上）——仅会话首次启动，避免挂起重渲染打断正在播放的语音
    if (!sessionStartedRef.current) {
      unlockVoiceCallAudio()
      sessionStartedRef.current = true
      beginSession(`vcs-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`)
    }

    const id = window.setInterval(() => {
      setElapsedSec((s) => s + 1)
    }, 1000)
    return () => window.clearInterval(id)
  }, [beginSession, open, resetSession, setElapsedSec, stopCenterAudio])

  // 接通后首轮：一律请求模型开口（可多句），不用本地/指令里的开场白文案
  useEffect(() => {
    if (!open || !sessionStartedRef.current) return
    if (openingRequestedRef.current || seededRef.current || inflightRef.current) return
    openingRequestedRef.current = true
    inflightRef.current = true
    setPeerReplying(true)
    void (async () => {
      try {
        const got = await Promise.resolve(
          onRequestAiReply('', {
            callEvent: 'connected_opening',
            callInitiator: callInitiatorRef.current,
            allowSynthToneTokens: synthToneTokensRef.current,
            allowSynthEmotion: synthEmotionRef.current,
            callMessages: [],
          }),
        )
        if (!openRef.current) return
        const raw = sanitizeVoiceDisplayText(String(got ?? ''))
        const { speech, hangup: peerHangup } = splitVoiceCallHangupDirective(raw)
        const reply = speech || (peerHangup ? '' : '…')
        if (reply) {
          seededRef.current = true
          commitCharacterSegments(reply, true)
        }
        if (peerHangup) schedulePeerHangupAfterReveal(reply)
      } catch (err) {
        if (!openRef.current) return
        const detail = err instanceof Error ? err.message.trim() : ''
        console.warn('[语音通话] 接通开口失败', err)
        showToast(detail || '接通后开口失败，可先说话再点「回复」', 2800)
      } finally {
        inflightRef.current = false
        if (openRef.current) setPeerReplying(false)
      }
    })()
  }, [commitCharacterSegments, onRequestAiReply, open, schedulePeerHangupAfterReveal, showToast])

  useEffect(() => {
    return () => {
      if (toastTimerRef.current != null) window.clearTimeout(toastTimerRef.current)
      // 停播只在 open→false 会话清理里做；此处勿 stop，避免依赖抖动 / StrictMode 误杀续播
    }
  }, [])

  const peerName = useMemo(() => peerRemarkName.trim() || '对方', [peerRemarkName])
  const bgUrl = (backgroundImage ?? '').trim() || defaultCallBgUrl

  const resolvePendingUserVoiceAsr = useCallback(
    async (msgId: string): Promise<VoiceLogMessage | null> => {
      const cur = messagesRef.current.find((m) => m.id === msgId)
      if (!cur || cur.role !== 'user') return cur ?? null
      const isVoice = cur.source === 'user_voice' || cur.kind === 'voice' || !!cur.audioUrl
      if (!isVoice || !cur.asrPending) return cur
      const blob = voiceBlobByMsgIdRef.current.get(msgId)
      if (!onTranscribeAudio) {
        // 无 ASR：保留占位，催回复侧会拦截
        return cur
      }
      if (!blob || blob.size < 800) {
        showToast('录音太短或为空，请重新按住说话', 2400)
        return cur
      }
      try {
        const res = await onTranscribeAudio(blob)
        const text = String(res.text ?? '').trim()
        if (!text) {
          showToast('没有听清内容，请再说清楚一点后点「回复」', 2600)
          return cur
        }
        const emotion = res.emotion?.trim() || undefined
        const patch: Partial<VoiceLogMessage> = {
          text,
          asrText: text,
          voiceEmotion: emotion,
          asrPending: false,
        }
        patchMessageSync(msgId, patch)
        voiceBlobByMsgIdRef.current.delete(msgId)
        if (emotion) showToast(`语气：${emotion}`, 1800)
        return { ...cur, ...patch }
      } catch (err) {
        const detail = err instanceof Error ? err.message : String(err ?? '未知错误')
        console.warn('[语音通话] SenseVoice 识别失败', err)
        // 保留 blob + asrPending，方便再点「回复」重试；绝不把「（语音）」塞给模型
        showToast(detail || '语音识别失败，请再点一次「回复」', 2800)
        return cur
      }
    },
    [onTranscribeAudio, patchMessageSync, showToast],
  )

  const resolveAllPendingUserVoiceAsr = useCallback(async () => {
    const pending = messagesRef.current.filter(
      (m) =>
        m.role === 'user' &&
        m.asrPending &&
        (m.source === 'user_voice' || m.kind === 'voice' || !!m.audioUrl),
    )
    for (const m of pending) {
      await resolvePendingUserVoiceAsr(m.id)
    }
  }, [resolvePendingUserVoiceAsr])

  const hangup = useCallback(
    (endedBy: 'user' | 'character' = 'user') => {
      if (peerHangupTimerRef.current != null) {
        window.clearTimeout(peerHangupTimerRef.current)
        peerHangupTimerRef.current = null
      }
      if (peerHangupDelayTimerRef.current != null) {
        window.clearTimeout(peerHangupDelayTimerRef.current)
        peerHangupDelayTimerRef.current = null
      }
      const sid = sessionId || `vcs-${Date.now()}`
      const start = startedAt || Date.now() - elapsedSec * 1000
      void (async () => {
        try {
          await resolveAllPendingUserVoiceAsr()
        } catch {
          /* ignore */
        }
        onHangup?.({
          durationSec: elapsedSec,
          sessionId: sid,
          messages: messagesRef.current,
          startedAt: start,
          endedBy,
        })
        onClose()
      })()
    },
    [elapsedSec, onClose, onHangup, resolveAllPendingUserVoiceAsr, sessionId, startedAt],
  )
  hangupRef.current = hangup

  const isUsableVoicePrompt = (raw: string) => {
    const t = String(raw ?? '').trim()
    if (!t) return false
    if (t === '（语音）' || t === '(语音)' || t === '语音') return false
    return true
  }

  const triggerReply = useCallback(async () => {
    if (inflightRef.current) return
    const last0 = messagesRef.current[messagesRef.current.length - 1]
    if (!last0 || last0.role !== 'user') return
    inflightRef.current = true
    setPeerReplying(true)
    try {
      const last = (await resolvePendingUserVoiceAsr(last0.id)) ?? last0
      const promptText = String(last.asrText ?? last.text ?? '').trim()
      const isVoice =
        last.source === 'user_voice' || last.kind === 'voice' || !!last.audioUrl
      if (isVoice && (last.asrPending || !isUsableVoicePrompt(promptText))) {
        setPeerReplying(false)
        showToast(
          last.asrPending
            ? '语音还没识别成功，请再说清楚一点或再点「回复」'
            : '语音内容为空，请重新按住说话后再催回复',
          2600,
        )
        return
      }
      if (!isUsableVoicePrompt(promptText)) {
        setPeerReplying(false)
        showToast('没有可回复的内容', 1800)
        return
      }
      const got = await Promise.resolve(
        onRequestAiReply(promptText, {
          fromVoice: isVoice,
          voiceEmotion: last.voiceEmotion,
          allowSynthToneTokens: synthToneTokensRef.current,
          allowSynthEmotion: synthEmotionRef.current,
          callMessages: messagesRef.current.map((m) => ({
            role: m.role,
            text: m.text,
            asrText: m.asrText,
            voiceEmotion: m.voiceEmotion,
            source: m.source,
          })),
        }),
      )
      const raw = sanitizeVoiceDisplayText(String(got ?? ''))
      const { speech, hangup: peerHangup } = splitVoiceCallHangupDirective(raw)
      const reply = speech || (peerHangup ? '' : '…')
      setPeerReplying(false)
      if (reply) commitCharacterSegments(reply, false)
      if (peerHangup) schedulePeerHangupAfterReveal(reply)
    } catch (err) {
      setPeerReplying(false)
      const detail = err instanceof Error ? err.message.trim() : ''
      console.warn('[语音通话] 回复失败', err)
      showToast(detail || '回复失败，请稍后重试', 2800)
    } finally {
      inflightRef.current = false
    }
  }, [
    commitCharacterSegments,
    onRequestAiReply,
    resolvePendingUserVoiceAsr,
    schedulePeerHangupAfterReveal,
    showToast,
  ])

  const appendUserText = useCallback(
    (textRaw: string) => {
      const text = textRaw.trim()
      if (!text) return false
      const now = Date.now()
      const userMsg: VoiceLogMessage = {
        id: `vc-${now}-u`,
        role: 'user',
        prefix: 'YOU',
        kind: 'text',
        source: 'user_text',
        text,
        asrText: text,
        createdAt: now,
      }
      setMessages((prev) => {
        const next = [...prev, userMsg]
        messagesRef.current = next
        return next
      })
      setCaptionMsgId(userMsg.id)
      return true
    },
    [setMessages],
  )

  /** 松手立刻上屏；ASR 延后到催回复 / 挂断 */
  const appendUserVoice = useCallback(
    (audioBlob: Blob, durationHint?: number) => {
      if (!audioBlob || audioBlob.size < 1200) {
        showToast('录音太短，请按住说完再松手', 2200)
        return false
      }
      const now = Date.now()
      const audioUrl = URL.createObjectURL(audioBlob)
      audioObjectUrlsRef.current.push(audioUrl)
      const durationSec = durationHint && durationHint > 0 ? durationHint : 1
      const userMsg: VoiceLogMessage = {
        id: `vc-${now}-u-a`,
        role: 'user',
        prefix: 'YOU',
        kind: 'voice',
        source: 'user_voice',
        // 文稿等催回复时 ASR；公屏只显示可播放语音条，不写「（语音）」占位进模型
        text: '',
        audioUrl,
        audioMime: audioBlob.type || undefined,
        asrText: '',
        durationSec,
        listened: true,
        audioStatus: 'ready',
        asrPending: true,
        createdAt: now,
      }
      voiceBlobByMsgIdRef.current.set(userMsg.id, audioBlob)
      setMessages((prev) => {
        const next = [...prev, userMsg]
        messagesRef.current = next
        return next
      })
      setCaptionMsgId(userMsg.id)
      return true
    },
    [setMessages, showToast],
  )

  const focusMsg = useMemo(() => {
    if (captionMsgId) {
      const hit = messages.find((m) => m.id === captionMsgId)
      if (hit) return hit
    }
    if (!autoPlay) {
      for (let i = messages.length - 1; i >= 0; i -= 1) {
        const m = messages[i]!
        if (m.role === 'character' && String(m.asrText ?? m.text ?? '').trim()) return m
      }
    }
    return null
  }, [autoPlay, captionMsgId, messages])

  const hasPendingCharAudio = messages.some(
    (m) => m.role === 'character' && m.audioStatus === 'pending',
  )

  const liveCaption = useMemo(() => {
    if (!focusMsg) return null
    const text = String(focusMsg.asrText ?? focusMsg.text ?? '').trim()
    if (!text) return null
    if (autoPlay && focusMsg.audioStatus === 'pending') return null
    return {
      id: focusMsg.id,
      text,
    }
  }, [autoPlay, focusMsg])

  const vizMode = peerSpeaking
    ? 'speaking'
    : peerReplying
      ? 'thinking'
      : autoPlay && hasPendingCharAudio && !liveCaption
        ? 'synthesizing'
        : 'idle'

  // 最小化后全屏 UI 隐藏，但仍推送字幕到悬浮球（回复 / 自动播继续跑）
  useEffect(() => {
    const setLiveCaption = useGlobalVoiceCallFloatStore.getState().setLiveCaption
    if (!open) {
      setLiveCaption({ id: null, text: '', mode: 'idle' })
      return
    }
    // 对方已挂断公告优先，勿被后续字幕/思考态盖掉
    if (peerHangupAnnouncedRef.current) {
      setLiveCaption({ id: 'peer-hangup', text: '对方已挂断', mode: 'status' })
      return
    }
    if (peerReplying) {
      setLiveCaption({ id: null, text: '对方正在组织语言', mode: 'thinking' })
      return
    }
    if (vizMode === 'synthesizing') {
      setLiveCaption({ id: null, text: '语音生成中', mode: 'synthesizing' })
      return
    }
    if (liveCaption?.text) {
      const display = toFloatCaptionDisplay(liveCaption.text)
      if (display) {
        setLiveCaption({ id: liveCaption.id, text: display, mode: 'line' })
        return
      }
    }
    setLiveCaption({ id: null, text: '', mode: 'idle' })
  }, [liveCaption, open, peerHangupUiTick, peerReplying, vizMode])

  if (!open || minimized) return null

  return (
    <VoiceCallPortal>
    <AnimatePresence>
      <motion.div
        key="voice-call-panel"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="absolute inset-0 z-[280] flex h-full w-full flex-col overflow-hidden"
        style={{ background: VC.paper, fontFamily: VC_UI_FONT }}
      >
        <div
          className="absolute inset-0"
          aria-hidden
          style={{
            backgroundImage: `url(${bgUrl})`,
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            backgroundSize: 'cover',
            opacity: 0.4,
          }}
        />
        <div className="absolute inset-0" aria-hidden style={{ background: 'rgba(247,246,244,0.78)' }} />

        {/* 头像 / 歌词 / 底栏整体靠中，缩短上下大块留白 */}
        <div className="relative z-[1] flex min-h-0 flex-1 flex-col justify-center">
        <CallHeader
          peerName={peerName}
          peerAvatarUrl={peerAvatarUrl}
          elapsedSec={elapsedSec}
          onMinimize={onMinimize}
        />

        <CallVisualizer
          mode={vizMode}
          seed={peerName}
          messages={messages}
          activeMsgId={peerReplying ? null : liveCaption?.id ?? captionMsgId}
          playingMsgId={playingMsgId}
          peerReplying={peerReplying}
          autoPlay={autoPlay}
          onPlayCharacterLine={(id) => void playCharacterLine(id)}
        />

        <div className="relative z-[10] shrink-0">
          <CallControls
            autoPlay={autoPlay}
            synthToneTokens={synthToneTokens}
            synthEmotion={synthEmotion}
            keyboardOpen={keyboardOpen}
            voiceBound={!!boundVoiceId}
            transcriptCount={messages.length}
            onPrepareOpenTools={() => setKeyboardOpen(false)}
            onToggleAutoPlay={() => {
              if (!autoPlay) {
                const ok = window.confirm(
                  [
                    '开启「自动合成」后：',
                    '• 角色每条回复会立刻生成全部语音条',
                    '• 并自动连播（打字机同步）',
                    '',
                    '语音合成按量计费，请谨慎开启。',
                    '',
                    '确定开启吗？',
                  ].join('\n'),
                )
                if (!ok) return
                unlockVoiceCallAudio()
                setAutoPlay(true)
                showToast('已开启自动合成：将生成并连播全部语音条', 2600)
                void (async () => {
                  await resynthMissingCharacterAudio()
                  const ids = messagesRef.current
                    .filter((m) => m.role === 'character')
                    .map((m) => m.id)
                  enqueuePlay(ids)
                })()
                return
              }
              setAutoPlay(false)
              stopCenterAudio()
              playQueueRef.current = []
              queueBusyRef.current = false
              setPlayingMsgId(null)
              showToast('已关闭自动合成：点歌词旁 ▶ 按需生成并播放', 2600)
            }}
            onToggleSynthToneTokens={() => {
              const next = !synthToneTokens
              setSynthToneTokens(next)
              showToast(next ? '已开启合成语气词' : '已关闭合成语气词', 1800)
            }}
            onToggleSynthEmotion={() => {
              const next = !synthEmotion
              setSynthEmotion(next)
              showToast(next ? '已开启合成情绪词' : '已关闭合成情绪词', 1800)
            }}
            onToggleKeyboard={() => setKeyboardOpen((v) => !v)}
            onOpenVoiceBind={
              voiceCharacterId.trim() ? () => setVoiceBindOpen(true) : undefined
            }
            onOpenTranscript={() => setTranscriptOpen(true)}
            onHangup={() => hangup('user')}
            canNudgeReply={(() => {
              if (peerReplying) return false
              const last = messages[messages.length - 1]
              return !!last && last.role === 'user'
            })()}
            replyBusy={peerReplying}
            onNudgeReply={() => {
              const last = messagesRef.current[messagesRef.current.length - 1]
              if (!last || last.role !== 'user') {
                showToast('先发一条语音或文字', 1800)
                return
              }
              void triggerReply()
            }}
            onHoldStart={() => setKeyboardOpen(false)}
            onVoiceBlob={async (blob, meta) => {
              setKeyboardOpen(false)
              appendUserVoice(blob, meta?.durationSec)
              setDraft('')
              // 松手即上屏；催回复时再 ASR 语气 / 文稿
            }}
            onVoiceRecognizeError={(msg) => showToast(msg)}
          />
          <CallTextInputBar
            open={keyboardOpen}
            draft={draft}
            setDraft={setDraft}
            replyBusy={peerReplying || inflightRef.current}
            canNudgeReply={(() => {
              if (peerReplying) return false
              const last = messages[messages.length - 1]
              return !!last && last.role === 'user'
            })()}
            onClose={() => setKeyboardOpen(false)}
            onEnterCommit={(text) => {
              // 对齐线上：回车只上屏，不自动催模型
              const ok = appendUserText(text)
              if (!ok) return
              setDraft('')
            }}
            onSendClick={() => {
              const t = draft.trim()
              if (t) {
                // 有内容点发送：上屏并催回复（同线上纸飞机）
                const ok = appendUserText(t)
                if (!ok) return
                setDraft('')
                void triggerReply()
                return
              }
              // 空发送：催回复（上一条须是用户）
              const last = messagesRef.current[messagesRef.current.length - 1]
              if (!last || last.role !== 'user') {
                showToast('先发一条内容，或空回车催回复', 1800)
                return
              }
              void triggerReply()
            }}
          />
        </div>
        </div>

        <CallTranscriptLog
          open={transcriptOpen}
          messages={messages}
          peerReplying={peerReplying}
          favoritedIds={favoritedLineIds}
          favoriteBusyId={favoriteBusyId}
          onRequestPlay={(id) => {
            stopCenterAudio()
            queueBusyRef.current = false
            setCaptionMsgId(id)
            void playCharacterLine(id)
          }}
          onFavorite={(m) => void favoriteTranscriptLine(m)}
          onClose={() => setTranscriptOpen(false)}
        />

        <AnimatePresence>
          {toast ? (
            <motion.div
              className="pointer-events-none absolute inset-x-0 top-[42%] z-[6] flex justify-center px-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <div
                className="rounded-full px-4 py-2 text-[13px]"
                style={{
                  ...vcLiquidGlassLight({ borderRadius: 999 }),
                  color: VC.ink,
                }}
              >
                {toast}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <CallVoiceBindSheet
          open={voiceBindOpen}
          characterId={voiceCharacterId}
          peerName={peerName}
          onClose={() => setVoiceBindOpen(false)}
          onBound={(voiceId) => {
            setBoundVoiceId(voiceId)
            if (autoPlayRef.current) {
              showToast('已绑定角色音色，正在合成语音…', 1800)
              void resynthMissingCharacterAudio()
            } else {
              showToast('已绑定角色音色：点歌词旁 ▶ 再按需合成', 2400)
            }
          }}
        />

        <span className="sr-only">{callInitiator === 'other' ? '对方发起的通话' : '你发起的通话'}</span>
      </motion.div>
    </AnimatePresence>
    </VoiceCallPortal>
  )
}
