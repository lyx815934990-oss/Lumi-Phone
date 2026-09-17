import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, ChevronLeft, PhoneOff } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

import { Pressable } from '../../../components/Pressable'
import { unlockVoiceCallAudio } from './callAudioBridge'
import { VoiceCallPortal } from './VoiceCallPortal'
import { VC, VC_UI_FONT } from './voiceCallTheme'

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
      return
    }
    if (decisionRequestedRef.current) return
    decisionRequestedRef.current = true
    mountedRef.current = true
    // 用户刚点「语音通话」进入本页：趁手势链解锁音频，接通后开场白才能自动播
    unlockVoiceCallAudio()
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
    <VoiceCallPortal>
    <AnimatePresence>
      <motion.div
        key="calling-screen"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="absolute inset-0 z-[285] flex h-full w-full flex-col overflow-hidden"
        style={{ background: VC.ink, fontFamily: VC_UI_FONT }}
      >
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
          className="relative z-[2] flex shrink-0 flex-col items-center px-5"
          style={{ paddingBottom: 'max(28px, calc(16px + env(safe-area-inset-bottom, 0px)))' }}
        >
          <Pressable
            type="button"
            aria-label="挂断"
            onClick={onCancel}
            className="flex h-[72px] w-[72px] items-center justify-center rounded-full text-white active:scale-[0.96]"
            style={{ background: VC.endRed, boxShadow: '0 8px 24px rgba(255,59,48,0.35)' }}
          >
            <PhoneOff className="size-7" strokeWidth={2} />
          </Pressable>
          <span className="mt-2.5 text-[12px] text-white/55">挂断</span>
        </footer>

        <style>{`
          @keyframes vc-status-breathe {
            0%, 100% { opacity: 0.55; }
            50% { opacity: 0.92; }
          }
        `}</style>
      </motion.div>
    </AnimatePresence>
    </VoiceCallPortal>
  )
}
