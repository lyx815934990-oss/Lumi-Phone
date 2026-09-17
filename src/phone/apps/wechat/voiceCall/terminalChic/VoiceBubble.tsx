import { ChevronDown, ChevronUp, Download, Loader2, Pause, Play } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

import { Pressable } from '../../../../components/Pressable'
import {
  VC,
  VC_NUM_STYLE,
  voiceWaveHeights,
  voiceWaveWidthPx,
} from '../voiceCallTheme'
import { splitAuditoryNarration, type VoiceLogMessage } from './types'

function barCountForWidth(widthPx: number): number {
  return Math.max(8, Math.min(14, Math.round(widthPx / 14)))
}

/**
 * 通话语音条：默认胶囊时长；可展开文稿；播放时波形跳动。
 */
export function VoiceBubble({
  msg,
  autoPlayToken,
  onListened,
  onPlayingChange,
  onSaveAudio,
  onRequestPlay,
}: {
  msg: VoiceLogMessage
  autoPlayToken?: number
  onListened?: (id: string) => void
  onPlayingChange?: (id: string, playing: boolean) => void
  onSaveAudio?: (msg: VoiceLogMessage) => void
  onRequestPlay?: (id: string) => void
}) {
  const isUser = msg.role === 'user'
  const durationSec = Math.max(1, Math.round(msg.durationSec || 1))
  const transcript = String(msg.asrText ?? msg.text ?? '').trim()
  const pending = msg.audioStatus === 'pending'
  const idle = !isUser && msg.audioStatus === 'idle' && !msg.audioUrl
  const failed = msg.audioStatus === 'failed'
  const [expanded, setExpanded] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const rafRef = useRef<number | null>(null)
  const synthStartRef = useRef(0)
  const autoPlayedRef = useRef(false)

  const widthPx = voiceWaveWidthPx(durationSec)
  const bars = useMemo(() => {
    const n = barCountForWidth(widthPx)
    return voiceWaveHeights(msg.id, n)
  }, [msg.id, widthPx])

  const parts = useMemo(() => splitAuditoryNarration(transcript), [transcript])

  const stopSynth = () => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }

  const markListened = () => {
    if (!msg.listened) onListened?.(msg.id)
  }

  const setPlayingState = (v: boolean) => {
    setPlaying(v)
    onPlayingChange?.(msg.id, v)
  }

  const stopAll = () => {
    stopSynth()
    const a = audioRef.current
    if (a) {
      try {
        a.pause()
        a.currentTime = 0
      } catch {
        /* ignore */
      }
    }
    try {
      window.speechSynthesis?.cancel()
    } catch {
      /* ignore */
    }
    setPlayingState(false)
    setProgress(0)
  }

  useEffect(() => () => stopAll(), [])

  // TTS 完成后若已有 autoPlay 标记，允许再触发一次
  useEffect(() => {
    if (msg.audioStatus === 'ready' && msg.audioUrl) {
      autoPlayedRef.current = false
    }
  }, [msg.audioStatus, msg.audioUrl])

  const runSynthProgress = () => {
    stopSynth()
    synthStartRef.current = performance.now()
    const tick = () => {
      const elapsed = (performance.now() - synthStartRef.current) / 1000
      const p = Math.min(1, elapsed / durationSec)
      setProgress(p)
      if (p >= 1) {
        setPlayingState(false)
        setProgress(0)
        rafRef.current = null
        return
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
  }

  const play = () => {
    if (pending) return
    // 未合成：交给上层按需 MiniMax（用户点击手势内）
    if (!isUser && !msg.audioUrl?.trim() && onRequestPlay) {
      onRequestPlay(msg.id)
      return
    }
    markListened()
    const url = msg.audioUrl?.trim()
    if (url) {
      stopSynth()
      try {
        window.speechSynthesis?.cancel()
      } catch {
        /* ignore */
      }
      let a = audioRef.current
      if (!a || a.src !== url) {
        a = new Audio(url)
        audioRef.current = a
        a.onended = () => {
          setPlayingState(false)
          setProgress(0)
        }
        a.ontimeupdate = () => {
          const d = a!.duration
          if (Number.isFinite(d) && d > 0) setProgress(a!.currentTime / d)
        }
      }
      void a
        .play()
        .then(() => setPlayingState(true))
        .catch(() => {
          setPlayingState(true)
          runSynthProgress()
        })
      return
    }
    setPlayingState(true)
    runSynthProgress()
    if (transcript && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel()
        const speechOnly = parts
          .filter((p) => p.kind === 'speech')
          .map((p) => p.text)
          .join(' ')
        const u = new SpeechSynthesisUtterance(speechOnly || transcript)
        u.lang = 'zh-CN'
        window.speechSynthesis.speak(u)
      } catch {
        /* ignore */
      }
    }
  }

  const pause = () => {
    const a = audioRef.current
    if (a && !a.paused) {
      a.pause()
      setPlayingState(false)
      return
    }
    stopSynth()
    try {
      window.speechSynthesis?.cancel()
    } catch {
      /* ignore */
    }
    setPlayingState(false)
  }

  const togglePlay = () => {
    if (pending) return
    if (playing) pause()
    else play()
  }

  useEffect(() => {
    if (autoPlayToken == null || autoPlayToken <= 0) return
    if (isUser) return
    if (pending) return
    if (autoPlayedRef.current) return
    autoPlayedRef.current = true
    const t = window.setTimeout(() => play(), 150)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 仅 token / ready 触发
  }, [autoPlayToken, pending, msg.audioUrl])

  const dimBar = isUser ? 'rgba(255,255,255,0.5)' : VC.hairline
  const litBar = isUser ? '#FFFFFF' : VC.ink
  const radius = isUser ? '16px 16px 6px 16px' : '16px 16px 16px 6px'
  const showUnreadDot = !isUser && !msg.listened && !pending

  return (
    <div className={`relative flex w-full flex-col ${isUser ? 'items-end' : 'items-start'}`} style={{ gap: 6 }}>
      <div
        className="relative"
        onContextMenu={(e) => {
          if (!onSaveAudio || (!msg.audioUrl && !transcript)) return
          e.preventDefault()
          setMenuOpen(true)
        }}
      >
        {showUnreadDot ? (
          <span
            className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full"
            style={{ background: VC.ink }}
            aria-hidden
          />
        ) : null}
        <div
          className="flex items-center gap-2 px-3 py-2.5"
          style={{
            borderRadius: radius,
            background: isUser ? VC.ink : VC.card,
            border: isUser ? 'none' : `1px solid ${VC.hairline}`,
            maxWidth: '100%',
            opacity: pending ? 0.85 : 1,
          }}
        >
          <Pressable
            type="button"
            aria-label={
              pending ? '正在生成语音' : idle ? '生成并播放' : playing ? '暂停' : '播放'
            }
            onClick={togglePlay}
            disabled={pending}
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full disabled:opacity-70"
            style={{ color: isUser ? '#fff' : VC.ink }}
          >
            {pending ? (
              <Loader2 className="size-[14px] animate-spin" />
            ) : playing ? (
              <Pause className="size-[14px]" fill="currentColor" />
            ) : (
              <Play className="size-[14px]" fill="currentColor" />
            )}
          </Pressable>

          <div className="flex h-5 items-end gap-[2px]" style={{ width: widthPx }}>
            {bars.map((h, i) => {
              const lit = playing && progress > 0 && i / bars.length < progress
              const bounce =
                playing && !pending
                  ? 0.85 + 0.15 * Math.sin((progress * 40 + i) * 1.7)
                  : 1
              return (
                <span
                  key={i}
                  className="flex-1 rounded-[1px]"
                  style={{
                    height: `${Math.round(h * 100 * bounce)}%`,
                    background: lit ? litBar : dimBar,
                    transition: 'background 80ms linear, height 80ms linear',
                    minWidth: 2,
                  }}
                />
              )
            })}
          </div>

          <span
            className="shrink-0 text-[12px]"
            style={{
              ...VC_NUM_STYLE,
              color: isUser ? 'rgba(255,255,255,0.85)' : VC.mist,
            }}
          >
            {pending
              ? '…'
              : idle
                ? '生成'
                : `${Math.floor(durationSec / 60)}:${String(durationSec % 60).padStart(2, '0')}`}
          </span>
        </div>

        {menuOpen && onSaveAudio ? (
          <div
            className="absolute right-0 top-full z-10 mt-1 overflow-hidden rounded-xl border shadow-lg"
            style={{ background: VC.card, borderColor: VC.hairline }}
          >
            <Pressable
              type="button"
              className="flex items-center gap-2 px-3 py-2 text-[13px]"
              style={{ color: VC.ink }}
              onClick={() => {
                setMenuOpen(false)
                onSaveAudio(msg)
              }}
            >
              <Download className="size-3.5" />
              保存音频
            </Pressable>
            <Pressable
              type="button"
              className="block w-full px-3 py-2 text-left text-[12px]"
              style={{ color: VC.mist }}
              onClick={() => setMenuOpen(false)}
            >
              取消
            </Pressable>
          </div>
        ) : null}
      </div>

      {pending ? (
        <span className="text-[12px]" style={{ color: VC.mist }}>
          正在生成语音…
        </span>
      ) : idle ? (
        <span className="text-[12px]" style={{ color: VC.mist }}>
          点播放按需合成（计费）
        </span>
      ) : failed ? (
        <span className="text-[12px]" style={{ color: VC.mist }}>
          合成失败，可展开看文字稿
        </span>
      ) : null}

      {transcript && !pending ? (
        <>
          <Pressable
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="inline-flex items-center gap-0.5 text-[12px]"
            style={{ color: VC.mist }}
          >
            {expanded ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
            <span>{expanded ? '收起文字' : '转文字'}</span>
          </Pressable>
          <div
            className="overflow-hidden"
            style={{
              maxWidth: Math.max(widthPx + 72, 200),
              maxHeight: expanded ? 520 : 0,
              opacity: expanded ? 1 : 0,
              transition: 'max-height 250ms ease-out, opacity 250ms ease-out',
            }}
          >
            <div
              className="space-y-1.5 px-3 py-2 text-[14px] leading-[1.6]"
              style={{
                background: VC.card,
                borderRadius: 12,
                border: `1px solid ${VC.hairline}`,
                color: isUser ? VC.transcriptUser : VC.ink,
              }}
            >
              {parts.map((p, i) =>
                p.kind === 'sfx' ? (
                  <p key={i} className="text-[12px] italic" style={{ color: VC.mist }}>
                    （{p.text}）
                  </p>
                ) : (
                  <p key={i}>{p.text}</p>
                ),
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}
