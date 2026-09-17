import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, Loader2, Play } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { Pressable } from '../../../components/Pressable'
import { playVoiceCallUrl, stopVoiceCallAudio } from './callAudioBridge'
import { splitAuditoryNarration } from './terminalChic/types'
import {
  getVoiceCallAudioObjectUrl,
  getVoiceCallSession,
  type PersistedVoiceCallSession,
} from './voiceCallSessionIdb'
import { prepareVoiceCallTts } from './voiceCallSegmentUtils'
import {
  readVoiceCallSynthEmotion,
  readVoiceCallSynthToneTokens,
} from './voiceCallSynthPrefs'
import { fmtCallDuration, VC, VC_NUM_STYLE, VC_UI_FONT, vcLiquidGlassLight } from './voiceCallTheme'
import { VoiceCallPortal } from './VoiceCallPortal'
import type { VoiceAllowedEmotion } from '../wechatVoiceScript'

type DetailLine = {
  id: string
  role: 'character' | 'user'
  text: string
  audioUrl?: string
  canSynth: boolean
}

function toDisplayText(raw: string): string {
  const parts = splitAuditoryNarration(String(raw ?? '').trim())
  if (!parts.length) return String(raw ?? '').trim()
  return parts
    .map((p) => (p.kind === 'sfx' ? `(${p.text})` : p.text))
    .join('')
    .trim()
}

async function sessionToLines(session: PersistedVoiceCallSession): Promise<DetailLine[]> {
  const out: DetailLine[] = []
  for (const line of session.lines) {
    let audioUrl: string | undefined
    if (line.audioId) {
      audioUrl = (await getVoiceCallAudioObjectUrl(line.audioId)) || undefined
    }
    const text = String(line.text ?? '').trim()
    const display = toDisplayText(text)
    if (!display) continue
    const isChar = line.source === 'char_voice'
    const allowToneTokens = readVoiceCallSynthToneTokens()
    const allowEmotion = readVoiceCallSynthEmotion()
    out.push({
      id: line.id,
      role: isChar ? 'character' : 'user',
      text,
      audioUrl,
      canSynth:
        isChar &&
        !!prepareVoiceCallTts(text, { allowToneTokens, allowEmotion }),
    })
  }
  return out
}

function DetailTextRow({
  line,
  synthesizing,
  onPlay,
}: {
  line: DetailLine
  synthesizing: boolean
  onPlay: (line: DetailLine) => void
}) {
  const isUser = line.role === 'user'
  const display = toDisplayText(line.text)
  const [playing, setPlaying] = useState(false)
  const localPlayRef = useRef(false)
  const canPlay = !!line.audioUrl?.trim() || (line.role === 'character' && line.canSynth)

  useEffect(() => {
    return () => {
      if (localPlayRef.current) {
        localPlayRef.current = false
        stopVoiceCallAudio()
      }
    }
  }, [])

  if (!display) return null

  const radius = isUser ? '16px 16px 6px 16px' : '16px 16px 16px 6px'

  return (
    <motion.div
      className={`mb-3 flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      <div
        className="max-w-[88%] px-3.5 py-2.5"
        style={{
          borderRadius: radius,
          background: isUser ? VC.ink : VC.card,
          color: isUser ? '#fff' : VC.ink,
          border: isUser ? 'none' : `1px solid ${VC.hairline}`,
        }}
      >
        <p className="whitespace-pre-wrap break-words text-[14px] leading-[1.55]">{display}</p>
        {canPlay ? (
          <div className={`mt-2 flex items-center ${isUser ? 'justify-end' : 'justify-start'}`}>
            <Pressable
              type="button"
              aria-label={synthesizing ? '合成中' : playing ? '播放中' : '播放'}
              disabled={synthesizing}
              onClick={() => {
                if (synthesizing) return
                if (line.role === 'character' && !line.audioUrl?.trim()) {
                  onPlay(line)
                  return
                }
                const url = line.audioUrl?.trim()
                if (!url) return
                localPlayRef.current = true
                setPlaying(true)
                playVoiceCallUrl(url, {
                  onPlay: () => setPlaying(true),
                  onEnded: () => {
                    localPlayRef.current = false
                    setPlaying(false)
                  },
                  onError: () => {
                    localPlayRef.current = false
                    setPlaying(false)
                  },
                })
              }}
              className="flex h-7 w-7 items-center justify-center rounded-full active:scale-[0.96] disabled:opacity-50"
              style={{
                background: isUser ? 'rgba(255,255,255,0.14)' : 'rgba(16,16,18,0.06)',
                color: isUser ? '#fff' : VC.ink,
              }}
            >
              {synthesizing ? (
                <Loader2 className="size-3.5 animate-spin" strokeWidth={2} />
              ) : (
                <Play className="size-3.5 translate-x-[0.5px]" strokeWidth={2.2} fill="currentColor" />
              )}
            </Pressable>
          </div>
        ) : null}
      </div>
    </motion.div>
  )
}

export function VoiceCallSessionDetail({
  open,
  sessionId,
  onClose,
  onSynthesizeCharacterVoice,
}: {
  open: boolean
  sessionId: string | null
  onClose: () => void
  onSynthesizeCharacterVoice?: (text: string, emotion?: VoiceAllowedEmotion) => Promise<string>
}) {
  const [loading, setLoading] = useState(false)
  const [session, setSession] = useState<PersistedVoiceCallSession | null>(null)
  const [lines, setLines] = useState<DetailLine[]>([])
  const [error, setError] = useState<string | null>(null)
  const [synthBusyId, setSynthBusyId] = useState<string | null>(null)
  const objectUrlsRef = useRef<string[]>([])

  useEffect(() => {
    if (!open || !sessionId?.trim()) {
      setSession(null)
      setLines([])
      setError(null)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    void (async () => {
      try {
        const row = await getVoiceCallSession(sessionId.trim())
        if (cancelled) return
        if (!row) {
          setError('找不到这通通话记录')
          setSession(null)
          setLines([])
          return
        }
        const next = await sessionToLines(row)
        if (cancelled) return
        for (const m of next) {
          if (m.audioUrl?.startsWith('blob:')) objectUrlsRef.current.push(m.audioUrl)
        }
        setSession(row)
        setLines(next)
      } catch {
        if (!cancelled) setError('加载失败')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
      stopVoiceCallAudio()
      for (const u of objectUrlsRef.current) {
        try {
          URL.revokeObjectURL(u)
        } catch {
          /* ignore */
        }
      }
      objectUrlsRef.current = []
    }
  }, [open, sessionId])

  const playAfterSynth = useCallback((line: DetailLine) => {
    void (async () => {
      if (!onSynthesizeCharacterVoice) return
      const allowToneTokens = readVoiceCallSynthToneTokens()
      const allowEmotion = readVoiceCallSynthEmotion()
      const prepared = prepareVoiceCallTts(line.text, { allowToneTokens, allowEmotion })
      if (!prepared) return
      setSynthBusyId(line.id)
      try {
        const url = await onSynthesizeCharacterVoice(
          prepared.text,
          allowEmotion ? prepared.emotion : undefined,
        )
        if (!url.trim()) return
        if (url.startsWith('blob:')) objectUrlsRef.current.push(url)
        setLines((prev) => prev.map((x) => (x.id === line.id ? { ...x, audioUrl: url } : x)))
        playVoiceCallUrl(url)
      } finally {
        setSynthBusyId(null)
      }
    })()
  }, [onSynthesizeCharacterVoice])

  if (!open) return null

  return (
    <VoiceCallPortal>
      <AnimatePresence>
        <motion.div
          key="vc-session-detail"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.2 }}
          className="absolute inset-0 z-[400] flex flex-col overflow-hidden"
          style={{ background: VC.paper, fontFamily: VC_UI_FONT }}
        >
          <header
            className="flex shrink-0 items-center gap-1 px-2 py-2"
            style={{
              ...vcLiquidGlassLight({ borderRadius: 0 }),
              paddingTop: 'max(10px, env(safe-area-inset-top, 0px))',
            }}
          >
            <Pressable
              type="button"
              aria-label="返回"
              onClick={onClose}
              className="flex h-10 min-w-[72px] items-center gap-0.5 rounded-full px-2 active:scale-[0.96]"
              style={{ color: VC.ink, background: 'rgba(16,16,18,0.06)' }}
            >
              <ChevronLeft className="size-5 shrink-0" strokeWidth={2.2} />
              <span className="text-[15px] font-medium">返回</span>
            </Pressable>
            <div className="min-w-0 flex-1 pr-2">
              <p className="truncate text-[16px] font-semibold" style={{ color: VC.ink }}>
                {session?.peerName || '通话详情'}
              </p>
              {session ? (
                <p className="text-[12px]" style={{ ...VC_NUM_STYLE, color: VC.mist }}>
                  {fmtCallDuration(session.durationSec)} ·{' '}
                  {new Date(session.startedAt).toLocaleString('zh-CN', {
                    month: 'numeric',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              ) : null}
            </div>
          </header>

          <main className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-16 text-[13px]" style={{ color: VC.mist }}>
                <Loader2 className="size-4 animate-spin" />
                加载中…
              </div>
            ) : error ? (
              <p className="py-16 text-center text-[13px]" style={{ color: VC.mist }}>
                {error}
              </p>
            ) : lines.length === 0 ? (
              <p className="py-16 text-center text-[13px]" style={{ color: VC.mist }}>
                本通通话没有可回听的内容
              </p>
            ) : (
              lines.map((line) => (
                <DetailTextRow
                  key={line.id}
                  line={line}
                  synthesizing={synthBusyId === line.id}
                  onPlay={playAfterSynth}
                />
              ))
            )}
          </main>
        </motion.div>
      </AnimatePresence>
    </VoiceCallPortal>
  )
}
