import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, Phone, PhoneOff } from 'lucide-react'
import { useMemo } from 'react'

import { Pressable } from '../../../components/Pressable'
import { VC, VC_UI_FONT, vcLiquidGlassDark } from './voiceCallTheme'

export function IncomingCallScreen({
  open,
  minimized = false,
  peerAvatarUrl,
  peerRemarkName,
  backgroundImage: _backgroundImage,
  onAccept,
  onReject,
  onMinimize,
}: {
  open: boolean
  minimized?: boolean
  peerAvatarUrl?: string
  peerRemarkName: string
  backgroundImage?: string
  onAccept: () => void
  onReject: () => void
  onMinimize?: () => void
}) {
  const peerName = useMemo(() => peerRemarkName.trim() || '对方', [peerRemarkName])
  const avatar = peerAvatarUrl?.trim() || ''

  if (!open || minimized) return null

  return (
    <AnimatePresence>
      <motion.div
        key="incoming-call-screen"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[286] flex h-full w-full flex-col overflow-hidden"
        style={{ background: VC.ink, fontFamily: VC_UI_FONT }}
      >
        <div className="absolute inset-0 overflow-hidden" aria-hidden>
          {avatar ? (
            <img
              src={avatar}
              alt=""
              className="h-full w-full object-cover"
              style={{ filter: 'blur(50px)', transform: 'scale(1.25)' }}
            />
          ) : (
            <div className="h-full w-full" style={{ background: 'linear-gradient(160deg, #2a2a2e 0%, #101012 100%)' }} />
          )}
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.4)' }} />
        </div>

        {onMinimize ? (
          <header
            className="relative z-[2] flex shrink-0 items-center justify-end px-3"
            style={{ paddingTop: 'max(12px, env(safe-area-inset-top, 0px))' }}
          >
            <Pressable
              type="button"
              aria-label="挂起通话"
              onClick={onMinimize}
              className="flex h-10 w-10 items-center justify-center rounded-full text-white/80 active:opacity-70"
            >
              <ChevronDown className="size-5" strokeWidth={1.8} />
            </Pressable>
          </header>
        ) : (
          <div style={{ paddingTop: 'max(12px, env(safe-area-inset-top, 0px))' }} />
        )}

        <main className="relative z-[1] flex min-h-0 flex-1 flex-col items-center justify-center px-6">
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
            style={{ animation: 'vc-incoming-breathe 2s ease-in-out infinite' }}
          >
            邀请你语音聊天中…
          </p>
          <p className="mt-1.5 text-[12px] text-white/45">对方发起的语音通话</p>
        </main>

        <footer
          className="relative z-[2] shrink-0 px-5"
          style={{ paddingBottom: 'max(28px, env(safe-area-inset-bottom, 0px))' }}
        >
          <div
            className="mx-auto flex w-full max-w-[320px] items-center justify-center gap-14 px-6 py-5"
            style={vcLiquidGlassDark({ borderRadius: 28 })}
          >
            <Pressable
              type="button"
              aria-label="拒绝"
              onClick={onReject}
              className="flex h-16 w-16 items-center justify-center rounded-full text-white active:scale-[0.96]"
              style={{ background: VC.endRed, boxShadow: '0 8px 24px rgba(255,59,48,0.35)' }}
            >
              <PhoneOff className="size-7" />
            </Pressable>
            <Pressable
              type="button"
              aria-label="接听"
              onClick={onAccept}
              className="flex h-16 w-16 items-center justify-center rounded-full text-white active:scale-[0.96]"
              style={{ background: VC.callGreen, boxShadow: '0 8px 24px rgba(52,199,89,0.35)' }}
            >
              <Phone className="size-7" />
            </Pressable>
          </div>
        </footer>

        <style>{`
          @keyframes vc-incoming-breathe {
            0%, 100% { opacity: 0.55; }
            50% { opacity: 0.92; }
          }
        `}</style>
      </motion.div>
    </AnimatePresence>
  )
}
