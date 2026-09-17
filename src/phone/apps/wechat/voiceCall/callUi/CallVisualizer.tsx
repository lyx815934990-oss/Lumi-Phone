import { Loader2, Pause, Play } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

import { Pressable } from '../../../../components/Pressable'
import { Typewriter } from '../terminalChic/Typewriter'
import {
  splitAuditoryNarration,
  type VoiceAudioStatus,
  type VoiceLogMessage,
} from '../terminalChic/types'
import { VC, voiceWaveHeights, voiceWaveWidthPx } from '../voiceCallTheme'

type VizMode = 'idle' | 'speaking' | 'thinking' | 'synthesizing'

type LyricLine = {
  id: string
  role: 'user' | 'character'
  text: string
  display: string
  audioStatus?: VoiceAudioStatus
  hasAudio: boolean
  audioUrl?: string
  durationSec?: number
  isUserVoice?: boolean
  /** 用户真实录音经 SenseVoice 识别的语气 */
  voiceEmotion?: string
}

function toDisplayText(raw: string): string {
  const parts = splitAuditoryNarration(String(raw ?? '').trim())
  if (!parts.length) return ''
  return parts
    .map((p) => (p.kind === 'sfx' ? `(${p.text})` : p.text))
    .join('')
    .trim()
}

function buildLyricLines(
  messages: VoiceLogMessage[],
  opts?: { hidePendingChar?: boolean },
): LyricLine[] {
  const hidePendingChar = opts?.hidePendingChar !== false
  const out: LyricLine[] = []
  for (const m of messages) {
    const text = String(m.asrText ?? m.text ?? '').trim()
    const audioUrl = m.audioUrl?.trim() || ''
    const isUserVoice =
      m.role === 'user' &&
      (m.source === 'user_voice' || m.kind === 'voice' || !!audioUrl)
    // 用户真实录音：即使识别文案为空也要上屏（显示语音条）
    if (!text && !(isUserVoice && audioUrl)) continue
    if (hidePendingChar && m.role === 'character' && m.audioStatus === 'pending') continue
    const pendingAsr = isUserVoice && m.asrPending === true
    const displayRaw =
      pendingAsr || text === '（语音）' || text === '(语音)' ? '' : text
    const display = toDisplayText(displayRaw)
    if (!display && !(isUserVoice && audioUrl)) continue
    out.push({
      id: m.id,
      role: m.role,
      text: displayRaw,
      display,
      audioStatus: m.audioStatus,
      hasAudio: !!audioUrl,
      audioUrl: audioUrl || undefined,
      durationSec: m.durationSec,
      isUserVoice,
      voiceEmotion: m.voiceEmotion?.trim() || undefined,
    })
  }
  return out
}

/**
 * 主视觉：声波 + 歌词页式实时通话文稿。
 * 角色行旁提供播放键：关闭自动合成时按需生成并播放。
 */
export function CallVisualizer({
  mode,
  seed = 'call-viz',
  messages = [],
  activeMsgId = null,
  playingMsgId = null,
  peerReplying = false,
  autoPlay = false,
  onPlayCharacterLine,
}: {
  mode: VizMode
  seed?: string
  messages?: VoiceLogMessage[]
  activeMsgId?: string | null
  playingMsgId?: string | null
  peerReplying?: boolean
  autoPlay?: boolean
  onPlayCharacterLine?: (id: string) => void
}) {
  const bars = useMemo(() => voiceWaveHeights(seed, 22), [seed])
  const [tick, setTick] = useState(0)
  const [typingLive, setTypingLive] = useState(false)
  const scrollerRef = useRef<HTMLDivElement | null>(null)
  const activeRowRef = useRef<HTMLDivElement | null>(null)
  const playingRowRef = useRef<HTMLDivElement | null>(null)
  const stickToBottomRef = useRef(true)
  const ignoreScrollUntilRef = useRef(0)

  const lines = useMemo(
    () => buildLyricLines(messages, { hidePendingChar: autoPlay }),
    [autoPlay, messages],
  )
  // 只跟面板指定的当前字幕行；禁止回退到「最后一行」否则前面整批会提前全文露馅
  const activeId = activeMsgId
  /** 播放中优先跟随播放行；否则跟随当前字幕行 */
  const focusId = playingMsgId || activeId

  /** 已揭示到的最大下标（焦点前进后保留已读行） */
  const maxRevealedRef = useRef(-1)
  useEffect(() => {
    if (!lines.length) maxRevealedRef.current = -1
  }, [lines.length])

  const cutoffIndex = useMemo(() => {
    let idx = -1
    if (activeMsgId) {
      const i = lines.findIndex((l) => l.id === activeMsgId)
      if (i >= 0) idx = Math.max(idx, i)
    }
    if (playingMsgId) {
      const i = lines.findIndex((l) => l.id === playingMsgId)
      if (i >= 0) idx = Math.max(idx, i)
    }
    return idx
  }, [activeMsgId, playingMsgId, lines])

  useEffect(() => {
    // 用户新发内容也要立刻进入「已揭示」范围，避免焦点仍停在更早的角色行时把后面的用户句裁掉
    let maxUser = -1
    for (let i = 0; i < lines.length; i += 1) {
      if (lines[i]?.role === 'user') maxUser = i
    }
    if (maxUser > maxRevealedRef.current) maxRevealedRef.current = maxUser
  }, [lines])

  useEffect(() => {
    if (cutoffIndex > maxRevealedRef.current) maxRevealedRef.current = cutoffIndex
  }, [cutoffIndex])

  const revealUntil = Math.max(cutoffIndex, maxRevealedRef.current)

  const visibleLines = useMemo(() => {
    // 用户输入始终直接显示；角色句仍按字幕焦点推进，避免整批剧透
    return lines.filter((l, i) => {
      if (l.role === 'user') return true
      if (revealUntil < 0) return false
      return i <= revealUntil
    })
  }, [lines, revealUntil])

  useEffect(() => {
    if (mode === 'idle' && !typingLive) return
    const id = window.setInterval(
      () => setTick((t) => t + 1),
      mode === 'speaking' || typingLive ? 90 : 160,
    )
    return () => window.clearInterval(id)
  }, [mode, typingLive])

  useEffect(() => {
    const line = activeId ? lines.find((l) => l.id === activeId) : null
    setTypingLive(!!line && line.role === 'character')
  }, [activeId, lines])

  const scrollFocusIntoView = (opts?: { force?: boolean }) => {
    const scroller = scrollerRef.current
    const row = playingMsgId ? playingRowRef.current : activeRowRef.current
    if (!scroller || !row) return
    // 播放中必须可见；未播放时仅在贴底跟随
    if (!opts?.force && !playingMsgId && !stickToBottomRef.current) return

    const scrollerRect = scroller.getBoundingClientRect()
    const rowRect = row.getBoundingClientRect()
    const rowMid = rowRect.top + rowRect.height / 2
    const viewMid = scrollerRect.top + scrollerRect.height / 2
    const delta = rowMid - viewMid
    if (Math.abs(delta) < 8) return

    const maxScroll = Math.max(0, scroller.scrollHeight - scroller.clientHeight)
    const next = Math.max(0, Math.min(maxScroll, scroller.scrollTop + delta))
    ignoreScrollUntilRef.current = Date.now() + 420
    scroller.scrollTo({ top: next, behavior: 'smooth' })
  }

  useEffect(() => {
    let cancelled = false
    const run = () => {
      if (cancelled) return
      scrollFocusIntoView({ force: !!playingMsgId })
    }
    const id1 = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(run)
    })
    const t = window.setTimeout(run, 80)
    return () => {
      cancelled = true
      window.cancelAnimationFrame(id1)
      window.clearTimeout(t)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusId, playingMsgId, activeId, visibleLines.length, typingLive])

  const onScroll = () => {
    if (Date.now() < ignoreScrollUntilRef.current) return
    const el = scrollerRef.current
    if (!el) return
    const dist = el.scrollHeight - el.scrollTop - el.clientHeight
    stickToBottomRef.current = dist < 72
  }

  const effectiveMode: VizMode =
    typingLive || mode === 'speaking'
      ? 'speaking'
      : mode === 'thinking' || mode === 'synthesizing'
        ? mode
        : 'idle'

  const statusLabel =
    mode === 'synthesizing'
      ? '正在合成语音…'
      : mode === 'thinking' || peerReplying
        ? '对方正在组织语言…'
        : lines.length
          ? ''
          : '通话中'

  return (
    <div
      className="relative z-[1] flex w-full shrink-0 flex-col items-center px-5 pt-1 pb-1"
      style={{ height: 'min(34vh, 260px)' }}
    >
      <div
        className="relative mb-2 flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full"
        style={{
          background:
            effectiveMode === 'idle'
              ? 'radial-gradient(circle, rgba(16,16,18,0.08) 0%, transparent 70%)'
              : 'radial-gradient(circle, rgba(16,16,18,0.16) 0%, transparent 72%)',
          animation: effectiveMode === 'idle' ? 'vc-breath 3.2s ease-in-out infinite' : undefined,
        }}
      >
        <div className="flex h-8 items-end justify-center gap-[2px]">
          {bars.map((base, i) => {
            const phase = (tick + i * 3) % 17
            const speakBoost =
              effectiveMode === 'speaking'
                ? 0.35 + ((phase * 17 + i * 13) % 100) / 100
                : effectiveMode === 'thinking' || effectiveMode === 'synthesizing'
                  ? 0.18
                  : 0.05
            const h = Math.max(
              0.12,
              Math.min(1, base * (effectiveMode === 'idle' ? 0.35 : 0.55) + speakBoost * base),
            )
            return (
              <span
                key={i}
                className="w-[2.5px] rounded-full"
                style={{
                  height: `${Math.round(h * 32)}px`,
                  background: effectiveMode === 'idle' ? VC.accentMid : VC.ink,
                  opacity: effectiveMode === 'idle' ? 0.55 : 0.92,
                  transition: 'height 80ms linear',
                }}
              />
            )
          })}
        </div>
      </div>

      <div className="relative min-h-0 w-full max-w-[380px] flex-1">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 z-[2] h-14"
          style={{
            background:
              'linear-gradient(to bottom, rgba(247,246,244,0.96) 0%, rgba(247,246,244,0.55) 45%, rgba(247,246,244,0) 100%)',
          }}
        />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] h-10"
          style={{
            background:
              'linear-gradient(to top, rgba(247,246,244,0.88) 0%, rgba(247,246,244,0) 100%)',
          }}
        />

        <div
          ref={scrollerRef}
          onScroll={onScroll}
          className="h-full overflow-y-auto overscroll-contain px-2"
          style={{
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'none',
            maskImage:
              'linear-gradient(to bottom, transparent 0%, #000 12%, #000 88%, transparent 100%)',
            WebkitMaskImage:
              'linear-gradient(to bottom, transparent 0%, #000 12%, #000 88%, transparent 100%)',
          }}
        >
          <div className="flex min-h-full flex-col justify-end gap-3 py-6">
            {visibleLines.map((line) => {
              const isActive = line.id === activeId
              const isUser = line.role === 'user'
              const isPlaying = playingMsgId === line.id
              const color = isUser ? VC.userLyric : isActive ? VC.ink : 'rgba(28,28,30,0.42)'
              const size = isActive ? 17 : 14
              const weight = isActive ? 600 : 450
              const pending = line.audioStatus === 'pending'
              const showPlay = !isUser && !!onPlayCharacterLine

              return (
                <div
                  key={line.id}
                  ref={(node) => {
                    if (isActive) activeRowRef.current = node
                    if (isPlaying) playingRowRef.current = node
                  }}
                  className="relative px-8 text-center transition-[opacity,transform,font-size] duration-300"
                  style={{
                    color,
                    fontSize: size,
                    fontWeight: weight,
                    lineHeight: 1.55,
                    letterSpacing: '0.02em',
                    opacity: isPlaying ? 1 : isActive ? 1 : isUser ? 0.78 : 0.55,
                    transform: isActive || isPlaying ? 'scale(1)' : 'scale(0.98)',
                  }}
                >
                  {isUser && line.isUserVoice && line.audioUrl ? (
                    <div className="flex flex-col items-center gap-1.5">
                      <UserVoiceLyricCapsule
                        id={line.id}
                        audioUrl={line.audioUrl}
                        durationSec={line.durationSec}
                        transcript={line.display}
                      />
                      {line.voiceEmotion ? (
                        <span
                          className="inline-block rounded-full px-2 py-0.5 text-[10px] font-medium"
                          style={{
                            background: 'rgba(16,16,18,0.06)',
                            color: VC.userLyric,
                          }}
                        >
                          语气 · {line.voiceEmotion}
                        </span>
                      ) : null}
                    </div>
                  ) : isActive && !isUser ? (
                    <Typewriter
                      key={line.id}
                      text={line.display}
                      speedMs={40}
                      cursorColor={VC.ink}
                      onDone={() => setTypingLive(false)}
                    />
                  ) : (
                    <LyricStaticText text={line.display} mutedSfx={!isActive} />
                  )}
                  {isUser && !line.isUserVoice && line.voiceEmotion ? (
                    <span
                      className="mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium"
                      style={{
                        background: 'rgba(16,16,18,0.06)',
                        color: VC.userLyric,
                      }}
                    >
                      语气 · {line.voiceEmotion}
                    </span>
                  ) : null}

                  {showPlay ? (
                    <Pressable
                      type="button"
                      aria-label={
                        pending
                          ? '正在合成'
                          : line.hasAudio
                            ? '播放这句'
                            : '生成并播放这句'
                      }
                      title={
                        line.hasAudio
                          ? '播放'
                          : '按需合成并播放（会产生语音合成费用）'
                      }
                      disabled={pending}
                      onClick={(e) => {
                        e.stopPropagation()
                        onPlayCharacterLine?.(line.id)
                      }}
                      className="absolute -right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full active:scale-[0.94] disabled:opacity-45"
                      style={{
                        color: isPlaying
                          ? VC.ink
                          : isActive
                            ? 'rgba(28,28,30,0.45)'
                            : 'rgba(28,28,30,0.28)',
                        background: isPlaying ? VC.accentSoft : 'transparent',
                      }}
                    >
                      {pending ? (
                        <Loader2 className="size-3.5 animate-spin" strokeWidth={1.8} />
                      ) : (
                        <Play className="size-3.5" strokeWidth={1.7} fill="currentColor" />
                      )}
                    </Pressable>
                  ) : null}
                </div>
              )
            })}

            {statusLabel ? (
              <p className="px-1 text-center text-[13px] leading-relaxed" style={{ color: VC.mist }}>
                {statusLabel}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes vc-breath {
          0%, 100% { transform: scale(1); opacity: 0.85; }
          50% { transform: scale(1.06); opacity: 1; }
        }
        @keyframes vc-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  )
}

function LyricStaticText({ text, mutedSfx }: { text: string; mutedSfx?: boolean }) {
  const parts = useMemo(() => splitAuditoryNarration(text), [text])
  if (!parts.length) return <>{text}</>
  return (
    <>
      {parts.map((p, i) =>
        p.kind === 'sfx' ? (
          <span
            key={i}
            className="italic"
            style={{
              color: mutedSfx ? 'rgba(139,139,143,0.75)' : VC.mist,
              fontWeight: 400,
              fontSize: '0.92em',
            }}
          >
            ({p.text})
          </span>
        ) : (
          <span key={i}>{p.text}</span>
        ),
      )}
    </>
  )
}

/** 通话主视觉里的用户真实录音条：可回听录入音频 */
function UserVoiceLyricCapsule({
  id,
  audioUrl,
  durationSec,
  transcript,
}: {
  id: string
  audioUrl: string
  durationSec?: number
  transcript: string
}) {
  const sec = Math.max(1, Math.round(durationSec || 1))
  const widthPx = voiceWaveWidthPx(sec)
  const bars = useMemo(() => {
    const n = Math.max(8, Math.min(14, Math.round(widthPx / 14)))
    return voiceWaveHeights(id, n)
  }, [id, widthPx])
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [expanded, setExpanded] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    return () => {
      const a = audioRef.current
      if (a) {
        try {
          a.pause()
        } catch {
          /* ignore */
        }
      }
    }
  }, [])

  const toggle = () => {
    let a = audioRef.current
    if (!a || a.src !== audioUrl) {
      a = new Audio(audioUrl)
      audioRef.current = a
      a.onended = () => {
        setPlaying(false)
        setProgress(0)
      }
      a.ontimeupdate = () => {
        const d = a!.duration
        if (Number.isFinite(d) && d > 0) setProgress(a!.currentTime / d)
      }
    }
    if (playing) {
      a.pause()
      setPlaying(false)
      return
    }
    void a
      .play()
      .then(() => setPlaying(true))
      .catch(() => setPlaying(false))
  }

  return (
    <div className="inline-flex max-w-full flex-col items-center gap-1">
      <Pressable
        type="button"
        aria-label={playing ? '暂停录音' : '播放录音'}
        onClick={(e) => {
          e.stopPropagation()
          toggle()
        }}
        className="inline-flex items-center gap-2 rounded-full px-3 py-2 active:scale-[0.97]"
        style={{ background: VC.ink, color: '#fff' }}
      >
        {playing ? (
          <Pause className="size-3.5 shrink-0" fill="currentColor" />
        ) : (
          <Play className="size-3.5 shrink-0" fill="currentColor" />
        )}
        <span className="flex h-4 items-end gap-[2px]" style={{ width: widthPx }}>
          {bars.map((h, i) => {
            const lit = playing && progress > 0 && i / bars.length < progress
            const bounce = playing ? 0.85 + 0.15 * Math.sin((progress * 40 + i) * 1.7) : 1
            return (
              <span
                key={i}
                className="flex-1 rounded-[1px]"
                style={{
                  height: `${Math.round(h * 100 * bounce)}%`,
                  background: lit ? '#fff' : 'rgba(255,255,255,0.45)',
                  minWidth: 2,
                }}
              />
            )
          })}
        </span>
        <span className="text-[11px] tabular-nums" style={{ color: 'rgba(255,255,255,0.85)' }}>
          {Math.floor(sec / 60)}:{String(sec % 60).padStart(2, '0')}
        </span>
      </Pressable>
      {transcript && transcript !== '（语音）' ? (
        <button
          type="button"
          className="text-[11px]"
          style={{ color: VC.mist }}
          onClick={(e) => {
            e.stopPropagation()
            setExpanded((v) => !v)
          }}
        >
          {expanded ? '收起文字' : '转文字'}
        </button>
      ) : null}
      {expanded ? (
        <p
          className="max-w-[260px] rounded-xl px-3 py-2 text-left text-[13px] leading-relaxed"
          style={{
            background: VC.card,
            border: `1px solid ${VC.hairline}`,
            color: VC.userLyric,
          }}
        >
          {transcript}
        </p>
      ) : null}
    </div>
  )
}
