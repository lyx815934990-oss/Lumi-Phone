import { Keyboard, Mic, Send } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

import { Pressable } from '../../../../components/Pressable'
import { VC, VC_NUM_STYLE, VC_UI_FONT, fmtCallDuration, vcLiquidGlassLight } from '../voiceCallTheme'

const CANCEL_SLIDE_PX = 64

/**
 * 底部液态玻璃输入区：默认按住说话 / 可切文字模式。
 */
export function HybridInput({
  draft,
  setDraft,
  onSubmitText,
  onVoiceBlob,
  onVoiceRecognizeError,
}: {
  draft: string
  setDraft: (v: string) => void
  /** 发送文字并触发回复 */
  onSubmitText: () => void
  /** 松手发送语音 blob（上层 ASR + 插入气泡 + 触发回复）；cancel 时不调用 */
  onVoiceBlob?: (audioBlob: Blob) => Promise<void>
  onVoiceRecognizeError?: (message: string) => void
}) {
  const [mode, setMode] = useState<'voice' | 'text'>('voice')
  const [holding, setHolding] = useState(false)
  const [willCancel, setWillCancel] = useState(false)
  const [recordSec, setRecordSec] = useState(0)
  const [recognizing, setRecognizing] = useState(false)
  const [flyCancel, setFlyCancel] = useState(false)

  const holdRef = useRef(false)
  const cancelRef = useRef(false)
  const startYRef = useRef(0)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<BlobPart[]>([])
  const recordTimerRef = useRef<number | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  const stopTracks = () => {
    const stream = mediaStreamRef.current
    if (stream) stream.getTracks().forEach((t) => t.stop())
    mediaStreamRef.current = null
  }

  const clearRecordTimer = () => {
    if (recordTimerRef.current != null) {
      window.clearInterval(recordTimerRef.current)
      recordTimerRef.current = null
    }
  }

  useEffect(() => {
    return () => {
      clearRecordTimer()
      stopTracks()
      mediaRecorderRef.current = null
      chunksRef.current = []
    }
  }, [])

  useEffect(() => {
    if (!holding) return
    const onMove = (e: PointerEvent) => {
      if (!holdRef.current) return
      const dy = startYRef.current - e.clientY
      const cancel = dy > CANCEL_SLIDE_PX
      cancelRef.current = cancel
      setWillCancel(cancel)
    }
    const onUp = () => {
      if (!holdRef.current) return
      finishHold()
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [holding])

  const finishHold = () => {
    holdRef.current = false
    const cancelled = cancelRef.current
    setHolding(false)
    setWillCancel(false)
    clearRecordTimer()
    setRecordSec(0)
    const recorder = mediaRecorderRef.current
    if (!recorder) return
    if (cancelled) {
      chunksRef.current = []
      try {
        if (recorder.state !== 'inactive') recorder.stop()
      } catch {
        /* ignore */
      }
      setFlyCancel(true)
      window.setTimeout(() => setFlyCancel(false), 420)
      return
    }
    try {
      if (recorder.state !== 'inactive') recorder.stop()
    } catch {
      /* ignore */
    }
  }

  const startHold = async (clientY: number) => {
    if (recognizing || !onVoiceBlob) {
      if (!onVoiceBlob) onVoiceRecognizeError?.('未配置语音识别api，无法使用')
      return
    }
    holdRef.current = true
    cancelRef.current = false
    startYRef.current = clientY
    setHolding(true)
    setWillCancel(false)
    setRecordSec(0)
    clearRecordTimer()
    recordTimerRef.current = window.setInterval(() => {
      setRecordSec((s) => s + 1)
    }, 1000)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      if (!holdRef.current) {
        stream.getTracks().forEach((t) => t.stop())
        return
      }
      mediaStreamRef.current = stream
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')
          ? 'audio/ogg;codecs=opus'
          : ''
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
      mediaRecorderRef.current = recorder
      chunksRef.current = []
      recorder.ondataavailable = (evt: BlobEvent) => {
        if (evt.data && evt.data.size > 0) chunksRef.current.push(evt.data)
      }
      recorder.onstop = () => {
        const parts = chunksRef.current
        chunksRef.current = []
        stopTracks()
        if (cancelRef.current || !parts.length || !onVoiceBlob) return
        const blob = new Blob(parts, { type: recorder.mimeType || 'audio/webm' })
        setRecognizing(true)
        void onVoiceBlob(blob)
          .catch((err: unknown) => {
            const msg = err instanceof Error ? err.message : '语音识别失败'
            onVoiceRecognizeError?.(msg)
          })
          .finally(() => setRecognizing(false))
      }
      recorder.start()
    } catch {
      holdRef.current = false
      setHolding(false)
      clearRecordTimer()
      setRecordSec(0)
      onVoiceRecognizeError?.('无法启用麦克风，请检查设备权限')
    }
  }

  const holdLabel = !holding
    ? '按住 说话'
    : willCancel
      ? '松开手指，取消发送'
      : '松开 发送，上滑 取消'

  return (
    <div
      className="relative shrink-0 px-3 pt-2"
      style={{
        paddingBottom: 'max(12px, env(safe-area-inset-bottom, 0px))',
        fontFamily: VC_UI_FONT,
      }}
    >
      {holding ? (
        <div className="pointer-events-none absolute inset-x-0 -top-8 z-[2] flex justify-center">
          <div className="inline-flex items-center gap-2 rounded-full px-3 py-1" style={vcLiquidGlassLight({ borderRadius: 999 })}>
            <span
              className="h-2 w-2 rounded-full"
              style={{
                background: VC.endRed,
                animation: 'vc-rec-pulse 1s ease-in-out infinite',
              }}
            />
            <span className="text-[13px]" style={{ ...VC_NUM_STYLE, color: VC.ink }}>
              {fmtCallDuration(recordSec)}
            </span>
          </div>
        </div>
      ) : null}

      <AnimatePresence>
        {flyCancel ? (
          <motion.div
            className="pointer-events-none absolute inset-x-0 top-0 z-[3] flex justify-center"
            initial={{ opacity: 1, y: 0 }}
            animate={{ opacity: 0, y: -48 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          >
            <span className="rounded-full px-3 py-1 text-[12px]" style={{ background: 'rgba(255,59,48,0.12)', color: VC.endRed }}>
              已取消
            </span>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div
        className="mx-auto flex w-full max-w-[720px] items-center gap-2 px-2.5 py-2"
        style={vcLiquidGlassLight({ borderRadius: 28 })}
      >
        <Pressable
          type="button"
          aria-label={mode === 'voice' ? '切换到文字输入' : '切换到语音输入'}
          onClick={() => setMode((m) => (m === 'voice' ? 'text' : 'voice'))}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full active:scale-[0.96]"
          style={{ color: VC.ink }}
          disabled={holding}
        >
          {mode === 'voice' ? <Keyboard className="size-5" strokeWidth={1.7} /> : <Mic className="size-5" strokeWidth={1.7} />}
        </Pressable>

        <div className="relative min-h-[44px] min-w-0 flex-1">
          <AnimatePresence mode="wait" initial={false}>
            {mode === 'voice' ? (
              <motion.div
                key="voice"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="absolute inset-0"
              >
                <button
                  type="button"
                  disabled={recognizing}
                  className="flex h-full w-full items-center justify-center rounded-full text-[15px] outline-none select-none disabled:opacity-50"
                  style={{
                    background: holding
                      ? willCancel
                        ? 'rgba(255,59,48,0.16)'
                        : 'rgba(255,59,48,0.12)'
                      : 'rgba(16,16,18,0.05)',
                    color: holding && willCancel ? VC.endRed : VC.ink,
                    transform: holding ? 'scale(0.97)' : 'scale(1)',
                    transition: 'transform 80ms ease-out, background 120ms ease-out, color 120ms ease-out',
                    touchAction: 'none',
                    WebkitUserSelect: 'none',
                    userSelect: 'none',
                  }}
                  onPointerDown={(e) => {
                    e.preventDefault()
                    void startHold(e.clientY)
                  }}
                  onContextMenu={(e) => e.preventDefault()}
                >
                  {recognizing ? '识别中…' : holdLabel}
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="text"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="absolute inset-0 flex items-center gap-2"
              >
                <input
                  ref={inputRef}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="输入文字，为对方朗读或触发回复"
                  className="h-10 min-w-0 flex-1 rounded-full border bg-white/70 px-3.5 text-[14px] outline-none placeholder:text-[#8B8B8F]/70"
                  style={{ borderColor: VC.hairline, color: VC.ink, fontFamily: VC_UI_FONT }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      if (draft.trim()) onSubmitText()
                    }
                  }}
                />
                <Pressable
                  type="button"
                  aria-label="发送"
                  disabled={!draft.trim() || recognizing}
                  onClick={() => {
                    if (!draft.trim()) return
                    onSubmitText()
                  }}
                  className="flex h-9 shrink-0 items-center justify-center gap-1 rounded-full px-3.5 text-[13px] font-medium text-white disabled:opacity-40 active:scale-[0.97]"
                  style={{ background: VC.ink }}
                >
                  <Send className="size-3.5" strokeWidth={2} />
                  发送
                </Pressable>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <style>{`
        @keyframes vc-rec-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.45; transform: scale(0.85); }
        }
      `}</style>
    </div>
  )
}
