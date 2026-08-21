import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, PhoneOff, Volume2, VolumeX } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { Pressable } from '../../../components/Pressable'
import { ConversationLog } from './terminalChic/ConversationLog'
import { HybridInput } from './terminalChic/HybridInput'
import type { VoiceLogMessage } from './terminalChic/types'
import {
  VC,
  VC_NUM_STYLE,
  VC_UI_FONT,
  estimateSpeechDurationSec,
  fmtCallDuration,
  vcLiquidGlassLight,
} from './voiceCallTheme'
import defaultCallBgUrl from '../../../../../image/通话页面默认壁纸.png'

type VoiceCallPanelProps = {
  open: boolean
  minimized?: boolean
  peerAvatarUrl?: string
  peerRemarkName: string
  backgroundImage?: string
  /** 谁发起的通话：self=用户打出，other=角色打来 */
  callInitiator?: 'self' | 'other' | null
  initialAiText?: string
  onClose: () => void
  onMinimize?: () => void
  onHangup?: (durationSec: number) => void
  onRequestAiReply: (text: string, opts?: { fromVoice?: boolean; voiceEmotion?: string }) => Promise<string> | string
  onTranscribeAudio?: (audioBlob: Blob) => Promise<{ text: string; emotion?: string }>
}

function sanitizeVoiceDisplayText(raw: string): string {
  const s = String(raw ?? '')
  const noInternalMarker = s
    .replace(/^\s*\[(?:消息ID|引用)[:：][^\]]+\]\s*$/gim, '')
    .replace(/\s*\[(?:消息ID|引用)[:：][^\]]+\]\s*/gim, ' ')
  return noInternalMarker.replace(/\n{3,}/g, '\n\n').trim()
}

/**
 * 已接通语音通话主界面：顶栏玻璃状态条 + 对话流 + 底栏玻璃输入。
 */
export function VoiceCallPanel({
  open,
  minimized = false,
  peerAvatarUrl,
  peerRemarkName,
  backgroundImage,
  callInitiator = null,
  initialAiText,
  onClose,
  onMinimize,
  onHangup,
  onRequestAiReply,
  onTranscribeAudio,
}: VoiceCallPanelProps) {
  const [elapsedSec, setElapsedSec] = useState(0)
  const [draft, setDraft] = useState('')
  const [messages, setMessages] = useState<VoiceLogMessage[]>([])
  const [autoPlay, setAutoPlay] = useState(true)
  const [autoPlayToast, setAutoPlayToast] = useState<string | null>(null)
  const [peerReplying, setPeerReplying] = useState(false)
  const inflightRef = useRef(false)
  const messagesRef = useRef<VoiceLogMessage[]>([])
  const audioObjectUrlsRef = useRef<string[]>([])
  const toastTimerRef = useRef<number | null>(null)

  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

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
      setElapsedSec(0)
      setDraft('')
      setMessages([])
      setPeerReplying(false)
      setAutoPlayToast(null)
      inflightRef.current = false
      return
    }
    const seed = sanitizeVoiceDisplayText(String(initialAiText ?? ''))
    const peer = (peerRemarkName.trim() || 'CHAR').slice(0, 16)
    if (seed) {
      const id = `vc-${Date.now()}-seed`
      const durationSec = estimateSpeechDurationSec(seed)
      const msg: VoiceLogMessage = {
        id,
        role: 'character',
        prefix: peer,
        kind: 'voice',
        text: seed,
        asrText: seed,
        durationSec,
        listened: false,
        createdAt: Date.now(),
      }
      setMessages([msg])
    } else {
      setMessages([])
    }
    setElapsedSec(0)
    const id = window.setInterval(() => {
      setElapsedSec((s) => s + 1)
    }, 1000)
    return () => window.clearInterval(id)
  }, [initialAiText, open, peerRemarkName])

  useEffect(() => {
    return () => {
      if (toastTimerRef.current != null) window.clearTimeout(toastTimerRef.current)
    }
  }, [])

  const peerName = useMemo(() => peerRemarkName.trim() || '对方', [peerRemarkName])
  const bgUrl = (backgroundImage ?? '').trim() || defaultCallBgUrl

  const showToast = useCallback((text: string) => {
    setAutoPlayToast(text)
    if (toastTimerRef.current != null) window.clearTimeout(toastTimerRef.current)
    toastTimerRef.current = window.setTimeout(() => setAutoPlayToast(null), 800)
  }, [])

  const markListened = useCallback((id: string) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, listened: true } : m)))
  }, [])

  const triggerReply = useCallback(async () => {
    if (inflightRef.current) return
    const last = messagesRef.current[messagesRef.current.length - 1]
    if (!last || last.role !== 'user') return
    const promptText = String(last.asrText ?? last.text ?? '').trim()
    if (!promptText) return
    inflightRef.current = true
    setPeerReplying(true)
    try {
      const got = await Promise.resolve(
        onRequestAiReply(promptText, {
          fromVoice: last.kind === 'voice' || !!last.audioUrl,
          voiceEmotion: last.voiceEmotion,
        }),
      )
      const reply = sanitizeVoiceDisplayText(String(got ?? '')) || '…'
      const peer = (peerRemarkName.trim() || 'CHAR').slice(0, 16)
      const t = Date.now()
      const durationSec = estimateSpeechDurationSec(reply)
      const aiMsg: VoiceLogMessage = {
        id: `vc-${t}-a`,
        role: 'character',
        prefix: peer,
        kind: 'voice',
        text: reply,
        asrText: reply,
        durationSec,
        listened: false,
        createdAt: t,
      }
      setMessages((prev) => [...prev, aiMsg])
    } finally {
      setPeerReplying(false)
      inflightRef.current = false
    }
  }, [onRequestAiReply, peerRemarkName])

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
        text,
        createdAt: now,
      }
      setMessages((prev) => [...prev, userMsg])
      return true
    },
    [],
  )

  const appendUserVoice = useCallback((audioBlob: Blob, asr: { text: string; emotion?: string }, durationHint?: number) => {
    const asrText = String(asr.text ?? '').trim()
    if (!asrText) return false
    const now = Date.now()
    const audioUrl = URL.createObjectURL(audioBlob)
    audioObjectUrlsRef.current.push(audioUrl)
    const durationSec = durationHint && durationHint > 0 ? durationHint : estimateSpeechDurationSec(asrText)
    const userMsg: VoiceLogMessage = {
      id: `vc-${now}-u-a`,
      role: 'user',
      prefix: 'YOU',
      kind: 'voice',
      text: asrText,
      audioUrl,
      audioMime: audioBlob.type || undefined,
      asrText,
      voiceEmotion: asr.emotion,
      durationSec,
      listened: true,
      createdAt: now,
    }
    setMessages((prev) => [...prev, userMsg])
    return true
  }, [])

  const hangup = () => {
    onHangup?.(elapsedSec)
    onClose()
  }

  if (!open || minimized) return null

  return (
    <AnimatePresence>
      <motion.div
        key="voice-call-panel"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[280] flex h-full w-full flex-col overflow-hidden"
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
            opacity: 0.35,
          }}
        />
        <div className="absolute inset-0" aria-hidden style={{ background: 'rgba(247,246,244,0.82)' }} />

        {/* 顶部液态玻璃状态条 */}
        <header
          className="relative z-[2] shrink-0 px-3"
          style={{ paddingTop: 'max(10px, env(safe-area-inset-top, 0px))' }}
        >
          <div
            className="mx-auto flex w-full max-w-[720px] items-center justify-between gap-2 px-3 py-2.5"
            style={vcLiquidGlassLight({ borderRadius: 22 })}
          >
            <div className="flex min-w-0 flex-1 items-center gap-2.5">
              {peerAvatarUrl?.trim() ? (
                <img src={peerAvatarUrl.trim()} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
              ) : (
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[14px] font-semibold"
                  style={{ background: VC.hairline, color: VC.mist }}
                >
                  {peerName.slice(0, 1)}
                </div>
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-[15px] font-medium" style={{ color: VC.ink }}>
                    {peerName}
                  </span>
                  <span
                    className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{
                      background: VC.callGreen,
                      animation: 'vc-live-dot 1.6s ease-in-out infinite',
                    }}
                    aria-hidden
                  />
                </div>
                <div className="flex items-center gap-1.5 text-[12px]" style={{ color: VC.mist }}>
                  <span style={VC_NUM_STYLE}>{fmtCallDuration(elapsedSec)}</span>
                  <span>· {callInitiator === 'other' ? '对方发起' : '你发起'}</span>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
              <Pressable
                type="button"
                aria-label={autoPlay ? '关闭自动播放' : '开启自动播放'}
                onClick={() => {
                  setAutoPlay((v) => {
                    const next = !v
                    showToast(next ? '已开启自动播放' : '已关闭自动播放')
                    return next
                  })
                }}
                className="flex h-9 w-9 items-center justify-center rounded-full active:scale-[0.96]"
                style={{ color: autoPlay ? VC.ink : VC.mist }}
              >
                {autoPlay ? <Volume2 className="size-[18px]" strokeWidth={1.8} /> : <VolumeX className="size-[18px]" strokeWidth={1.8} />}
              </Pressable>
              {onMinimize ? (
                <Pressable
                  type="button"
                  aria-label="挂起通话"
                  onClick={onMinimize}
                  className="flex h-9 w-9 items-center justify-center rounded-full active:scale-[0.96]"
                  style={{ color: VC.ink }}
                >
                  <ChevronDown className="size-[18px]" strokeWidth={1.8} />
                </Pressable>
              ) : null}
              <Pressable
                type="button"
                aria-label="挂断"
                onClick={hangup}
                className="flex h-9 w-9 items-center justify-center rounded-full text-white active:scale-[0.96]"
                style={{ background: VC.endRed }}
              >
                <PhoneOff className="size-4" strokeWidth={2} />
              </Pressable>
            </div>
          </div>
        </header>

        <main className="relative z-[1] mx-auto flex min-h-0 w-full max-w-[760px] flex-1 flex-col">
          <ConversationLog
            messages={messages}
            autoPlay={autoPlay}
            peerReplying={peerReplying}
            onListened={markListened}
          />
        </main>

        <div className="relative z-[2]">
          <HybridInput
            draft={draft}
            setDraft={setDraft}
            onSubmitText={() => {
              const t = draft.trim()
              if (!t) return
              const ok = appendUserText(t)
              if (!ok) return
              setDraft('')
              void triggerReply()
            }}
            onVoiceBlob={
              onTranscribeAudio
                ? async (blob) => {
                    const res = await onTranscribeAudio(blob)
                    const ok = appendUserVoice(blob, res)
                    if (!ok) return
                    setDraft('')
                    void triggerReply()
                  }
                : undefined
            }
            onVoiceRecognizeError={(msg) => {
              if (/未配置语音识别/i.test(msg)) {
                window.alert('未配置语音识别api，无法使用')
              } else {
                showToast(msg)
              }
            }}
          />
        </div>

        <AnimatePresence>
          {autoPlayToast ? (
            <motion.div
              className="pointer-events-none absolute inset-x-0 top-[42%] z-[5] flex justify-center px-6"
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
                {autoPlayToast}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <style>{`
          @keyframes vc-live-dot {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.45; transform: scale(0.85); }
          }
        `}</style>
      </motion.div>
    </AnimatePresence>
  )
}
