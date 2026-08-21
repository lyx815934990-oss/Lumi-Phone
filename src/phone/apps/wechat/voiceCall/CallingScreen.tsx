import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, ChevronLeft, Mic, MicOff, PhoneOff, Volume2, VolumeX } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

import { Pressable } from '../../../components/Pressable'
import { VC, VC_UI_FONT, vcLiquidGlassDark } from './voiceCallTheme'

export type CallDecision = 'ACCEPT' | 'REJECT' | 'NO_ANSWER'

export function CallingScreen({
  open,
  minimized = false,
  peerAvatarUrl,
  peerRemarkName,
  backgroundImage: _backgroundImage,
  onCancel,
  onMinimize,
  onDecision,
  requestDecision,
}: {
  open: boolean
  minimized?: boolean
  peerAvatarUrl?: string
  peerRemarkName: string
  backgroundImage?: string
  onCancel: () => void
  onMinimize?: () => void
  onDecision: (d: CallDecision) => void
  requestDecision: () => Promise<CallDecision>
}) {
  const [phase, setPhase] = useState<'waiting' | 'resolved'>('waiting')
  const [muted, setMuted] = useState(false)
  const [speakerOn, setSpeakerOn] = useState(true)
  const mountedRef = useRef(false)
  const openSeqRef = useRef(0)
  const decisionRequestedRef = useRef(false)
  const requestDecisionRef = useRef(requestDecision)
  const onDecisionRef = useRef(onDecision)

  useEffect(() => {
    requestDecisionRef.current = requestDecision
  }, [requestDecision])

  useEffect(() => {
    onDecisionRef.current = onDecision
  }, [onDecision])

  const peerName = useMemo(() => peerRemarkName.trim() || '对方', [peerRemarkName])
  const avatar = peerAvatarUrl?.trim() || ''

  useEffect(() => {
    if (!open) {
      setPhase('waiting')
      mountedRef.current = false
      decisionRequestedRef.current = false
      setMuted(false)
      setSpeakerOn(true)
      return
    }
    if (decisionRequestedRef.current) return
    decisionRequestedRef.current = true
    mountedRef.current = true
    const seq = Date.now()
    openSeqRef.current = seq
    setPhase('waiting')
    void (async () => {
      const d = await requestDecisionRef.current()
      if (!mountedRef.current) return
      if (openSeqRef.current !== seq) return
      setPhase('resolved')
      onDecisionRef.current(d)
    })()
    return () => {
      mountedRef.current = false
    }
  }, [open])

  if (!open || minimized) return null

  return (
    <AnimatePresence>
      <motion.div
        key="calling-screen"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[285] flex h-full w-full flex-col overflow-hidden"
        style={{ background: VC.ink, fontFamily: VC_UI_FONT }}
      >
        {/* 头像高斯模糊铺满 + 40% 黑蒙层 */}
        <div className="absolute inset-0 overflow-hidden" aria-hidden>
          {avatar ? (
            <img
              src={avatar}
              alt=""
              className="h-full w-full scale-110 object-cover"
              style={{ filter: 'blur(50px)', transform: 'scale(1.25)' }}
            />
          ) : (
            <div className="h-full w-full" style={{ background: 'linear-gradient(160deg, #2a2a2e 0%, #101012 100%)' }} />
          )}
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.4)' }} />
        </div>

        <header
          className="relative z-[2] flex shrink-0 items-center justify-between px-3"
          style={{ paddingTop: 'max(12px, env(safe-area-inset-top, 0px))' }}
        >
          <Pressable
            type="button"
            aria-label="取消呼叫"
            onClick={onCancel}
            className="flex h-10 w-10 items-center justify-center rounded-full text-white/90 active:opacity-70"
          >
            <ChevronLeft className="size-6" strokeWidth={1.8} />
          </Pressable>
          {onMinimize ? (
            <Pressable
              type="button"
              aria-label="挂起通话"
              onClick={onMinimize}
              className="flex h-10 w-10 items-center justify-center rounded-full text-white/80 active:opacity-70"
            >
              <ChevronDown className="size-5" strokeWidth={1.8} />
            </Pressable>
          ) : (
            <span className="h-10 w-10" />
          )}
        </header>

        <main className="relative z-[1] flex min-h-0 flex-1 flex-col items-center justify-center px-6 pb-8">
          {avatar ? (
            <img
              src={avatar}
              alt=""
              className="h-[120px] w-[120px] rounded-full object-cover"
              style={{ border: '2px solid #fff', boxShadow: '0 12px 36px rgba(0,0,0,0.28)' }}
            />
          ) : (
            <div
              className="flex h-[120px] w-[120px] items-center justify-center rounded-full text-[36px] font-semibold text-white/50"
              style={{ border: '2px solid #fff', background: 'rgba(255,255,255,0.08)' }}
            >
              {peerName.slice(0, 1)}
            </div>
          )}
          <p className="mt-5 text-[20px] font-semibold text-white">{peerName}</p>
          <p
            className="mt-2 text-[14px] text-white/70"
            style={{ animation: phase === 'waiting' ? 'vc-status-breathe 2s ease-in-out infinite' : undefined }}
          >
            正在等待对方接听…
          </p>
          <p className="mt-1.5 text-[12px] text-white/45">你发起的语音通话</p>
        </main>

        <footer
          className="relative z-[2] shrink-0 px-5"
          style={{ paddingBottom: 'max(22px, env(safe-area-inset-bottom, 0px))' }}
        >
          <div
            className="mx-auto flex w-full max-w-[360px] items-center justify-between px-6 py-4"
            style={vcLiquidGlassDark({ borderRadius: 28 })}
          >
            <Pressable
              type="button"
              aria-label={muted ? '取消静音' : '静音'}
              onClick={() => setMuted((v) => !v)}
              className="flex h-12 w-12 items-center justify-center rounded-full text-white/90 active:scale-[0.96]"
              style={{ background: muted ? 'rgba(255,255,255,0.14)' : 'transparent' }}
            >
              {muted ? <MicOff className="size-5" strokeWidth={1.7} /> : <Mic className="size-5" strokeWidth={1.7} />}
            </Pressable>

            <Pressable
              type="button"
              aria-label="挂断"
              onClick={onCancel}
              className="flex h-[72px] w-[72px] items-center justify-center rounded-full text-white active:scale-[0.96]"
              style={{ background: VC.endRed, boxShadow: '0 8px 24px rgba(255,59,48,0.35)' }}
            >
              <PhoneOff className="size-7" strokeWidth={2} />
            </Pressable>

            <Pressable
              type="button"
              aria-label={speakerOn ? '关闭免提' : '开启免提'}
              onClick={() => setSpeakerOn((v) => !v)}
              className="flex h-12 w-12 items-center justify-center rounded-full text-white/90 active:scale-[0.96]"
              style={{ background: speakerOn ? 'rgba(255,255,255,0.14)' : 'transparent' }}
            >
              {speakerOn ? <Volume2 className="size-5" strokeWidth={1.7} /> : <VolumeX className="size-5" strokeWidth={1.7} />}
            </Pressable>
          </div>
        </footer>

        <style>{`
          @keyframes vc-status-breathe {
            0%, 100% { opacity: 0.55; }
            50% { opacity: 0.92; }
          }
        `}</style>
      </motion.div>
    </AnimatePresence>
  )
}
