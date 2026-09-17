import { AnimatePresence, motion } from 'framer-motion'
import { Loader2, Play, Star, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

import { Pressable } from '../../../../components/Pressable'
import { playVoiceCallUrl, stopVoiceCallAudio } from '../callAudioBridge'
import { VoiceBubble } from '../terminalChic/VoiceBubble'
import { isVoiceKind, splitAuditoryNarration, type VoiceLogMessage } from '../terminalChic/types'
import { VC, vcLiquidGlassLight } from '../voiceCallTheme'

function toDisplayText(raw: string): string {
  const parts = splitAuditoryNarration(String(raw ?? '').trim())
  if (!parts.length) return String(raw ?? '').trim()
  return parts
    .map((p) => (p.kind === 'sfx' ? `(${p.text})` : p.text))
    .join('')
    .trim()
}

function TranscriptTextRow({
  msg,
  favorited,
  favoriteBusy,
  onRequestPlay,
  onFavorite,
}: {
  msg: VoiceLogMessage
  favorited?: boolean
  favoriteBusy?: boolean
  onRequestPlay?: (id: string) => void
  onFavorite?: (msg: VoiceLogMessage) => void
}) {
  const isUser = msg.role === 'user'
  const display = toDisplayText(String(msg.asrText ?? msg.text ?? ''))
  const pending = msg.audioStatus === 'pending'
  const canPlay =
    !!msg.audioUrl?.trim() ||
    (msg.role === 'character' && msg.audioStatus !== 'failed' && !!display)
  const [playing, setPlaying] = useState(false)
  const localPlayRef = useRef(false)

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

  const handlePlay = () => {
    if (pending) return
    if (msg.role === 'character' && onRequestPlay) {
      onRequestPlay(msg.id)
      return
    }
    const url = msg.audioUrl?.trim()
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
  }

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
        {msg.voiceEmotion?.trim() ? (
          <p
            className="mt-1 text-[11px]"
            style={{ color: isUser ? 'rgba(255,255,255,0.55)' : VC.mist }}
          >
            语气 · {msg.voiceEmotion.trim()}
          </p>
        ) : null}

        <div className={`mt-2 flex items-center gap-1.5 ${isUser ? 'justify-end' : 'justify-start'}`}>
          {canPlay ? (
            <Pressable
              type="button"
              aria-label={pending ? '合成中' : playing ? '播放中' : '播放'}
              disabled={pending}
              onClick={handlePlay}
              className="flex h-7 w-7 items-center justify-center rounded-full active:scale-[0.96] disabled:opacity-50"
              style={{
                background: isUser ? 'rgba(255,255,255,0.14)' : 'rgba(16,16,18,0.06)',
                color: isUser ? '#fff' : VC.ink,
              }}
            >
              {pending ? (
                <Loader2 className="size-3.5 animate-spin" strokeWidth={2} />
              ) : (
                <Play className="size-3.5 translate-x-[0.5px]" strokeWidth={2.2} fill="currentColor" />
              )}
            </Pressable>
          ) : null}

          {onFavorite ? (
            <Pressable
              type="button"
              aria-label={favorited ? '已收藏' : '收藏'}
              disabled={favoriteBusy}
              onClick={() => onFavorite(msg)}
              className="flex h-7 w-7 items-center justify-center rounded-full active:scale-[0.96] disabled:opacity-50"
              style={{
                background: isUser ? 'rgba(255,255,255,0.14)' : 'rgba(16,16,18,0.06)',
                color: favorited ? (isUser ? '#FFD60A' : '#F5A623') : isUser ? '#fff' : VC.ink,
              }}
            >
              <Star
                className="size-3.5"
                strokeWidth={2}
                fill={favorited ? 'currentColor' : 'none'}
              />
            </Pressable>
          ) : null}
        </div>
      </div>
    </motion.div>
  )
}

/**
 * 居中面板：通话记录以文字展示；可点播放、可收藏到「我」-收藏。
 */
export function CallTranscriptLog({
  open,
  messages,
  peerReplying,
  favoritedIds,
  favoriteBusyId,
  onRequestPlay,
  onFavorite,
  onClose,
}: {
  open: boolean
  messages: VoiceLogMessage[]
  peerReplying?: boolean
  favoritedIds?: ReadonlySet<string>
  favoriteBusyId?: string | null
  onRequestPlay?: (id: string) => void
  onFavorite?: (msg: VoiceLogMessage) => void
  onClose: () => void
}) {
  const endRef = useRef<HTMLDivElement>(null)
  const lastId = useMemo(() => (messages.length ? messages[messages.length - 1]!.id : null), [messages])

  useEffect(() => {
    if (!open || !endRef.current) return
    endRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [lastId, peerReplying, open])

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="vc-transcript-mask"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="absolute inset-0 z-[30] flex items-center justify-center px-4"
          style={{ background: 'rgba(16,16,18,0.28)' }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose()
          }}
        >
          <motion.div
            key="vc-transcript-panel"
            role="dialog"
            aria-modal="true"
            aria-label="通话记录"
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: 'spring', stiffness: 420, damping: 34 }}
            className="flex max-h-[min(72vh,560px)] w-full max-w-[380px] flex-col overflow-hidden rounded-[22px]"
            style={vcLiquidGlassLight({
              borderRadius: 22,
              background: 'rgba(255,255,255,0.92)',
              boxShadow: '0 18px 48px rgba(16,16,18,0.22)',
            })}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div
              className="flex shrink-0 items-center justify-between gap-2 border-b px-4 py-3"
              style={{ borderColor: VC.hairline }}
            >
              <div>
                <p className="text-[15px] font-semibold" style={{ color: VC.ink }}>
                  通话记录
                </p>
                <p className="mt-0.5 text-[11px]" style={{ color: VC.mist }}>
                  共 {messages.length} 条 · 点星收藏到「我」的收藏
                </p>
              </div>
              <Pressable
                type="button"
                aria-label="关闭"
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full active:scale-[0.96]"
                style={{ color: VC.mist, background: 'rgba(16,16,18,0.05)' }}
              >
                <X className="size-4" strokeWidth={2} />
              </Pressable>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
              {messages.length === 0 ? (
                <p className="py-12 text-center text-[13px]" style={{ color: VC.mist }}>
                  暂无记录
                </p>
              ) : (
                messages.map((m) =>
                  isVoiceKind(m) && m.role === 'user' && m.audioUrl ? (
                    <div key={m.id} className="mb-3">
                      <div className="flex justify-end">
                        <div className="max-w-[88%]">
                          <VoiceBubble msg={m} />
                        </div>
                      </div>
                      {onFavorite ? (
                        <div className="mt-1 flex justify-end">
                          <Pressable
                            type="button"
                            aria-label={favoritedIds?.has(m.id) ? '已收藏' : '收藏'}
                            disabled={favoriteBusyId === m.id}
                            onClick={() => onFavorite(m)}
                            className="flex h-7 w-7 items-center justify-center rounded-full active:scale-[0.96] disabled:opacity-50"
                            style={{
                              background: 'rgba(16,16,18,0.06)',
                              color: favoritedIds?.has(m.id) ? '#F5A623' : VC.ink,
                            }}
                          >
                            <Star
                              className="size-3.5"
                              strokeWidth={2}
                              fill={favoritedIds?.has(m.id) ? 'currentColor' : 'none'}
                            />
                          </Pressable>
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <TranscriptTextRow
                      key={m.id}
                      msg={m}
                      favorited={favoritedIds?.has(m.id)}
                      favoriteBusy={favoriteBusyId === m.id}
                      onRequestPlay={onRequestPlay}
                      onFavorite={onFavorite}
                    />
                  ),
                )
              )}
              {peerReplying ? (
                <div className="mb-3 flex justify-start">
                  <div
                    className="flex items-center gap-1 rounded-[16px] px-3.5 py-2.5"
                    style={{ background: VC.card, border: `1px solid ${VC.hairline}` }}
                    aria-label="对方正在组织语言"
                  >
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="block h-1.5 w-1.5 rounded-full"
                        style={{
                          background: VC.mist,
                          animation: `vc-dot-bounce 1s ease-in-out ${i * 0.15}s infinite`,
                        }}
                      />
                    ))}
                  </div>
                </div>
              ) : null}
              <div ref={endRef} />
            </div>
          </motion.div>

          <style>{`
            @keyframes vc-dot-bounce {
              0%, 80%, 100% { transform: translateY(0); opacity: 0.45; }
              40% { transform: translateY(-3px); opacity: 1; }
            }
          `}</style>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
