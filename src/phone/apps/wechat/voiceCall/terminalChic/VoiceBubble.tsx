import { ChevronDown, ChevronUp, Pause, Play } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

import { Pressable } from '../../../../components/Pressable'
import {
  VC,
  VC_NUM_STYLE,
  voiceWaveHeights,
  voiceWaveWidthPx,
} from '../voiceCallTheme'
import type { VoiceLogMessage } from './types'

function barCountForWidth(widthPx: number): number {
  return Math.max(8, Math.min(14, Math.round(widthPx / 14)))
}

/**
 * 通话语音条：用户/角色共用结构，仅配色与对齐反转。
 */
export function VoiceBubble({
  msg,
  autoPlayToken,
  onListened,
}: {
  msg: VoiceLogMessage
  /** 变化时触发自动播放（autoPlay 开启且为新角色消息） */
  autoPlayToken?: number
  onListened?: (id: string) => void
}) {
  const isUser = msg.role === 'user'
  const durationSec = Math.max(1, Math.round(msg.durationSec || 1))
  const transcript = String(msg.asrText ?? msg.text ?? '').trim()
  const [expanded, setExpanded] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const rafRef = useRef<number | null>(null)
  const synthStartRef = useRef(0)
  const autoPlayedRef = useRef(false)

  const widthPx = voiceWaveWidthPx(durationSec)
  const bars = useMemo(() => {
    const n = barCountForWidth(widthPx)
    return voiceWaveHeights(msg.id, n)
  }, [msg.id, widthPx])

  const stopSynth = () => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }

  const markListened = () => {
    if (!msg.listened) onListened?.(msg.id)
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
    setPlaying(false)
    setProgress(0)
  }

  useEffect(() => () => stopAll(), [])

  const runSynthProgress = () => {
    stopSynth()
    synthStartRef.current = performance.now()
    const tick = () => {
      const elapsed = (performance.now() - synthStartRef.current) / 1000
      const p = Math.min(1, elapsed / durationSec)
      setProgress(p)
      if (p >= 1) {
        setPlaying(false)
        setProgress(0)
        rafRef.current = null
        return
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
  }

  const play = () => {
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
          setPlaying(false)
          setProgress(0)
        }
        a.ontimeupdate = () => {
          const d = a!.duration
          if (Number.isFinite(d) && d > 0) setProgress(a!.currentTime / d)
        }
      }
      void a.play().then(() => {
        setPlaying(true)
      }).catch(() => {
        setPlaying(true)
        runSynthProgress()
      })
      return
    }
    // 无真实音频：进度合成 + 可选朗读
    setPlaying(true)
    runSynthProgress()
    if (transcript && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel()
        const u = new SpeechSynthesisUtterance(transcript)
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
      setPlaying(false)
      return
    }
    stopSynth()
    try {
      window.speechSynthesis?.cancel()
    } catch {
      /* ignore */
    }
    setPlaying(false)
  }

  const togglePlay = () => {
    if (playing) pause()
    else play()
  }

  useEffect(() => {
    if (autoPlayToken == null || autoPlayToken <= 0) return
    if (isUser) return
    if (autoPlayedRef.current) return
    autoPlayedRef.current = true
    const t = window.setTimeout(() => play(), 150)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 仅 token 触发一次
  }, [autoPlayToken])

  const dimBar = isUser ? 'rgba(255,255,255,0.5)' : VC.hairline
  const litBar = isUser ? '#FFFFFF' : VC.ink
  const radius = isUser ? '16px 16px 6px 16px' : '16px 16px 16px 6px'
  const showUnreadDot = !isUser && !msg.listened

  return (
    <div className={`flex w-full flex-col ${isUser ? 'items-end' : 'items-start'}`} style={{ gap: 6 }}>
      <div className="relative">
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
          }}
        >
          <Pressable
            type="button"
            aria-label={playing ? '暂停' : '播放'}
            onClick={togglePlay}
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
            style={{ color: isUser ? '#fff' : VC.ink }}
          >
            {playing ? <Pause className="size-[14px]" fill="currentColor" /> : <Play className="size-[14px]" fill="currentColor" />}
          </Pressable>

          <div className="flex h-5 items-end gap-[2px]" style={{ width: widthPx }}>
            {bars.map((h, i) => {
              const lit = progress > 0 && i / bars.length < progress
              return (
                <span
                  key={i}
                  className="flex-1 rounded-[1px]"
                  style={{
                    height: `${Math.round(h * 100)}%`,
                    background: lit ? litBar : dimBar,
                    transition: 'background 80ms linear',
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
            {`${Math.floor(durationSec / 60)}:${String(durationSec % 60).padStart(2, '0')}`}
          </span>
        </div>
      </div>

      {transcript ? (
        <>
          <Pressable
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="inline-flex items-center gap-0.5 text-[12px]"
            style={{ color: VC.mist }}
          >
            {expanded ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
            <span>{expanded ? '收起文字' : '展开文字'}</span>
          </Pressable>
          <div
            className="overflow-hidden"
            style={{
              maxWidth: Math.max(widthPx + 72, 180),
              maxHeight: expanded ? 480 : 0,
              opacity: expanded ? 1 : 0,
              transition: 'max-height 250ms ease-out, opacity 250ms ease-out',
            }}
          >
            <div
              className="px-3 py-2 text-[14px] leading-[1.6]"
              style={{
                background: VC.card,
                borderRadius: 12,
                border: `1px solid ${VC.hairline}`,
                color: isUser ? VC.transcriptUser : VC.ink,
              }}
            >
              {transcript}
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}
