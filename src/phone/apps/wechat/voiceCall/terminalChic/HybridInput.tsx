import { Keyboard, Mic, Send, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

import { Pressable } from '../../../../components/Pressable'
import { VC, VC_NUM_STYLE, VC_UI_FONT, fmtCallDuration, vcLiquidGlassLight } from '../voiceCallTheme'

const CANCEL_SLIDE_PX = 64
const WAVE_BARS = 12
/** 按住不足此时长，SenseVoice 极易空转写 → 时好时坏 */
const MIN_HOLD_MS = 700
const MIN_BLOB_BYTES = 1200

/** 通话控件区「按住说话」圆形按钮 + 录音浮层（松手即上屏，不在此等待 ASR） */
export function HoldToSpeakButton({
  onVoiceBlob,
  onVoiceRecognizeError,
  onHoldStart,
  disabled,
}: {
  onVoiceBlob?: (
    audioBlob: Blob,
    meta?: { durationSec: number },
  ) => Promise<void> | void
  onVoiceRecognizeError?: (message: string) => void
  /** 开始按住录音时回调（用于收起键盘，避免挡音波浮层） */
  onHoldStart?: () => void
  disabled?: boolean
}) {
  const [holding, setHolding] = useState(false)
  const [willCancel, setWillCancel] = useState(false)
  const [recordSec, setRecordSec] = useState(0)
  const [flyCancel, setFlyCancel] = useState(false)
  const [levels, setLevels] = useState<number[]>(() => Array.from({ length: WAVE_BARS }, () => 0.2))

  const holdRef = useRef(false)
  const cancelRef = useRef(false)
  const startYRef = useRef(0)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<BlobPart[]>([])
  const recordTimerRef = useRef<number | null>(null)
  const recordSecRef = useRef(0)
  const recordStartedAtRef = useRef(0)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const rafRef = useRef<number | null>(null)

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

  const stopAnalyser = () => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    try {
      void audioCtxRef.current?.close()
    } catch {
      /* ignore */
    }
    audioCtxRef.current = null
    analyserRef.current = null
    setLevels(Array.from({ length: WAVE_BARS }, () => 0.2))
  }

  const startAnalyser = (stream: MediaStream) => {
    stopAnalyser()
    try {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Ctx) return
      const ctx = new Ctx()
      const source = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 64
      source.connect(analyser)
      audioCtxRef.current = ctx
      analyserRef.current = analyser
      const data = new Uint8Array(analyser.frequencyBinCount)
      const tick = () => {
        const a = analyserRef.current
        if (!a) return
        a.getByteFrequencyData(data)
        const step = Math.max(1, Math.floor(data.length / WAVE_BARS))
        const next: number[] = []
        for (let i = 0; i < WAVE_BARS; i += 1) {
          const v = data[Math.min(data.length - 1, i * step)] ?? 0
          next.push(Math.max(0.12, Math.min(1, v / 180)))
        }
        setLevels(next)
        rafRef.current = requestAnimationFrame(tick)
      }
      rafRef.current = requestAnimationFrame(tick)
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    return () => {
      clearRecordTimer()
      stopAnalyser()
      stopTracks()
      mediaRecorderRef.current = null
      chunksRef.current = []
    }
  }, [])

  const finishHold = () => {
    holdRef.current = false
    const cancelled = cancelRef.current
    setHolding(false)
    setWillCancel(false)
    clearRecordTimer()
    const recorder = mediaRecorderRef.current
    if (!recorder) {
      // 权限弹窗 / getUserMedia 还没起录就松手：直接丢弃，不算失败
      setRecordSec(0)
      recordSecRef.current = 0
      recordStartedAtRef.current = 0
      stopAnalyser()
      stopTracks()
      return
    }
    if (cancelled) {
      chunksRef.current = []
      try {
        if (recorder.state !== 'inactive') recorder.stop()
      } catch {
        /* ignore */
      }
      setRecordSec(0)
      recordSecRef.current = 0
      recordStartedAtRef.current = 0
      setFlyCancel(true)
      window.setTimeout(() => setFlyCancel(false), 420)
      return
    }
    const heldMs =
      recordStartedAtRef.current > 0 ? Date.now() - recordStartedAtRef.current : 0
    if (heldMs > 0 && heldMs < MIN_HOLD_MS) {
      chunksRef.current = []
      try {
        if (recorder.state !== 'inactive') recorder.stop()
      } catch {
        /* ignore */
      }
      setRecordSec(0)
      recordSecRef.current = 0
      recordStartedAtRef.current = 0
      onVoiceRecognizeError?.('按太短了，请按住说完再松手')
      return
    }
    try {
      // 不要 requestData()+立刻 stop：部分浏览器会切出空/残缺块，ASR 就会时好时坏
      if (recorder.state !== 'inactive') recorder.stop()
    } catch {
      /* ignore */
    }
  }

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

  const startHold = async (clientY: number) => {
    if (disabled || !onVoiceBlob) {
      if (!onVoiceBlob) onVoiceRecognizeError?.('麦克风发送暂不可用')
      return
    }
    onHoldStart?.()
    holdRef.current = true
    cancelRef.current = false
    startYRef.current = clientY
    setHolding(true)
    setWillCancel(false)
    setRecordSec(0)
    recordSecRef.current = 0
    recordStartedAtRef.current = 0
    clearRecordTimer()
    recordTimerRef.current = window.setInterval(() => {
      recordSecRef.current += 1
      setRecordSec(recordSecRef.current)
    }, 1000)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          channelCount: 1,
        },
      })
      if (!holdRef.current) {
        stream.getTracks().forEach((t) => t.stop())
        return
      }
      mediaStreamRef.current = stream
      startAnalyser(stream)
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
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
        const startedAt = recordStartedAtRef.current
        const heldMs = startedAt > 0 ? Date.now() - startedAt : 0
        const durationSec = Math.max(1, Math.round(Math.max(heldMs, recordSecRef.current * 1000) / 1000))
        setRecordSec(0)
        recordSecRef.current = 0
        recordStartedAtRef.current = 0
        // 先停轨，再关分析器，避免部分机型关 AudioContext 干扰尾包
        stopTracks()
        stopAnalyser()
        mediaRecorderRef.current = null
        if (cancelRef.current || !onVoiceBlob) return
        if (!parts.length) {
          onVoiceRecognizeError?.('没录到声音，请靠近麦克风再说一次')
          return
        }
        const blob = new Blob(parts, { type: recorder.mimeType || 'audio/webm' })
        if (blob.size < MIN_BLOB_BYTES) {
          console.warn('[语音通话] 录音过小', { bytes: blob.size, type: blob.type, heldMs })
          onVoiceRecognizeError?.('录音太短，请按住说完再松手')
          return
        }
        console.info('[语音通话] 录音就绪', { bytes: blob.size, type: blob.type, heldMs })
        void Promise.resolve(onVoiceBlob(blob, { durationSec })).catch((err: unknown) => {
          const msg = err instanceof Error ? err.message : '发送语音失败'
          onVoiceRecognizeError?.(msg)
        })
      }
      recorder.start(200)
      recordStartedAtRef.current = Date.now()
    } catch {
      holdRef.current = false
      setHolding(false)
      clearRecordTimer()
      setRecordSec(0)
      recordSecRef.current = 0
      recordStartedAtRef.current = 0
      stopAnalyser()
      stopTracks()
      onVoiceRecognizeError?.('无法启用麦克风，请检查设备权限')
    }
  }

  return (
    <div className="relative flex flex-col items-center gap-1">
      {holding ? (
        <div className="pointer-events-none absolute bottom-[calc(100%+14px)] left-1/2 z-[80] -translate-x-1/2">
          <div
            className="inline-flex flex-col items-center gap-2 rounded-2xl px-4 py-2.5 shadow-[0_8px_28px_rgba(16,16,18,0.18)]"
            style={vcLiquidGlassLight({ borderRadius: 18 })}
          >
            <div className="flex h-8 items-end gap-[3px]">
              {levels.map((lv, i) => (
                <span
                  key={i}
                  className="w-[3px] rounded-full"
                  style={{
                    height: `${Math.round(lv * 28)}px`,
                    background: willCancel ? VC.endRed : VC.ink,
                    transition: 'height 60ms linear',
                  }}
                />
              ))}
            </div>
            <div className="inline-flex items-center gap-2 whitespace-nowrap">
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
              <span className="text-[12px]" style={{ color: willCancel ? VC.endRed : VC.mist }}>
                {willCancel ? '松手取消' : '上滑取消'}
              </span>
            </div>
          </div>
        </div>
      ) : null}

      <AnimatePresence>
        {flyCancel ? (
          <motion.div
            className="pointer-events-none absolute bottom-[calc(100%+8px)] left-1/2 z-[81] -translate-x-1/2"
            initial={{ opacity: 1, y: 0 }}
            animate={{ opacity: 0, y: -36 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          >
            <span
              className="rounded-full px-3 py-1 text-[12px]"
              style={{ background: 'rgba(255,59,48,0.12)', color: VC.endRed }}
            >
              已取消
            </span>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <button
        type="button"
        disabled={disabled || !onVoiceBlob}
        aria-label="按住说话"
        className="flex h-[58px] w-[58px] items-center justify-center rounded-full outline-none select-none disabled:opacity-40 active:scale-[0.96]"
        style={{
          ...vcLiquidGlassLight({ borderRadius: 999 }),
          color: holding ? (willCancel ? VC.endRed : '#fff') : VC.ink,
          background: holding
            ? willCancel
              ? 'rgba(250,81,81,0.18)'
              : VC.ink
            : 'rgba(255,255,255,0.78)',
          boxShadow: holding && !willCancel ? '0 10px 28px rgba(16,16,18,0.28)' : undefined,
          touchAction: 'none',
        }}
        onPointerDown={(e) => {
          e.preventDefault()
          void startHold(e.clientY)
        }}
        onContextMenu={(e) => e.preventDefault()}
      >
        <Mic className="size-6" strokeWidth={2} />
      </button>
      <span className="text-[9px] leading-none whitespace-nowrap" style={{ color: holding ? VC.ink : VC.mist }}>
        {holding ? (willCancel ? '松手取消' : '录音中') : '按住说话'}
      </span>

      <style>{`
        @keyframes vc-rec-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.45; transform: scale(0.85); }
        }
      `}</style>
    </div>
  )
}

/** 键盘输入条：仅在用户点开「键盘」时显示。交互对齐线上微信：
 * - 回车（有内容）：只发送上屏，不自动催回复
 * - 点「发送」（有内容）：发送并催角色回复
 * - 空回车 / 空点发送：若上一条是用户，则催回复
 */
export function CallTextInputBar({
  open,
  draft,
  setDraft,
  canNudgeReply = false,
  replyBusy = false,
  onEnterCommit,
  onSendClick,
  onClose,
}: {
  open: boolean
  draft: string
  setDraft: (v: string) => void
  /** 上一条是用户且当前未在回复中，允许空输入催回复 */
  canNudgeReply?: boolean
  replyBusy?: boolean
  /** 回车有内容：只上屏 */
  onEnterCommit: (text: string) => void
  /** 点发送有内容：上屏并催回复；空发送：催回复 */
  onSendClick: () => void
  onClose?: () => void
}) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const hasDraft = !!draft.trim()
  const canAct = !replyBusy && (hasDraft || canNudgeReply)

  useEffect(() => {
    if (!open) return
    const t = window.setTimeout(() => inputRef.current?.focus(), 60)
    return () => window.clearTimeout(t)
  }, [open])

  if (!open) return null

  return (
    <div
      className="relative z-[5] shrink-0 px-3 pt-1"
      style={{
        paddingBottom: 8,
        fontFamily: VC_UI_FONT,
      }}
    >
      <div
        className="mx-auto flex w-full max-w-[720px] items-center gap-2 px-2.5 py-2"
        style={vcLiquidGlassLight({ borderRadius: 28 })}
      >
        <Pressable
          type="button"
          aria-label="收起键盘"
          title="收起键盘"
          onClick={() => onClose?.()}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full active:scale-[0.96]"
          style={{ background: 'rgba(28,28,30,0.06)', color: VC.ink }}
        >
          <X className="size-4" strokeWidth={2} />
        </Pressable>
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={
            canNudgeReply ? '回车发送；空回车催回复' : '打字代替说话（文字转述）'
          }
          className="h-10 min-w-0 flex-1 rounded-full border bg-white/70 px-3.5 text-[14px] outline-none placeholder:text-[#8B8B8F]/70"
          style={{ borderColor: VC.hairline, color: VC.ink, fontFamily: VC_UI_FONT }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              onClose?.()
              return
            }
            if (e.key !== 'Enter') return
            if (e.nativeEvent.isComposing) return
            e.preventDefault()
            if (replyBusy) return
            const t = draft.trim()
            if (t) {
              onEnterCommit(t)
              return
            }
            if (canNudgeReply) onSendClick()
          }}
        />
        <Pressable
          type="button"
          aria-label={hasDraft ? '发送并催回复' : canNudgeReply ? '催角色回复' : '发送'}
          disabled={!canAct}
          onClick={() => {
            if (!canAct) return
            onSendClick()
          }}
          className="flex h-9 shrink-0 items-center justify-center gap-1 rounded-full px-3.5 text-[13px] font-medium text-white disabled:opacity-40 active:scale-[0.97]"
          style={{ background: VC.ink }}
        >
          <Send className="size-3.5" strokeWidth={2} />
          {hasDraft ? '发送' : '回复'}
        </Pressable>
      </div>
      <button
        type="button"
        onClick={() => onClose?.()}
        className="mx-auto mt-1.5 flex items-center gap-1 text-[11px]"
        style={{ color: VC.mist }}
      >
        <Keyboard className="size-3" strokeWidth={1.8} />
        收起键盘 · 返回按住说话
      </button>
    </div>
  )
}

/** @deprecated 保留导出名，避免外部旧引用断裂；请用 HoldToSpeakButton / CallTextInputBar */
export function HybridInput(props: {
  draft: string
  setDraft: (v: string) => void
  onSubmitText: () => void
  onVoiceBlob?: (audioBlob: Blob) => Promise<void>
  onVoiceRecognizeError?: (message: string) => void
}) {
  return (
    <CallTextInputBar
      open
      draft={props.draft}
      setDraft={props.setDraft}
      onEnterCommit={() => props.onSubmitText()}
      onSendClick={props.onSubmitText}
    />
  )
}
