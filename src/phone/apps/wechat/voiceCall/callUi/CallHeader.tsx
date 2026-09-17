import { Minimize2 } from 'lucide-react'

import { Pressable } from '../../../../components/Pressable'
import { VC, VC_NUM_STYLE, fmtCallDuration } from '../voiceCallTheme'

export function CallHeader({
  peerName,
  peerAvatarUrl,
  elapsedSec,
  onMinimize,
}: {
  peerName: string
  peerAvatarUrl?: string
  elapsedSec: number
  onMinimize?: () => void
}) {
  return (
    <div
      className="relative z-[2] flex shrink-0 flex-col items-center px-6"
      style={{ paddingTop: 'max(8px, calc(4px + env(safe-area-inset-top, 0px)))' }}
    >
      {onMinimize ? (
        <Pressable
          type="button"
          aria-label="最小化"
          onClick={onMinimize}
          className="fixed right-4 z-[282] flex h-9 w-9 items-center justify-center rounded-full active:scale-[0.96]"
          style={{
            top: 'max(12px, env(safe-area-inset-top, 0px))',
            color: VC.mist,
            background: 'rgba(255,255,255,0.45)',
          }}
        >
          <Minimize2 className="size-4" strokeWidth={1.8} />
        </Pressable>
      ) : null}

      {peerAvatarUrl?.trim() ? (
        <img
          src={peerAvatarUrl.trim()}
          alt=""
          className="h-[88px] w-[88px] rounded-full object-cover shadow-[0_12px_32px_rgba(16,16,18,0.18)]"
        />
      ) : (
        <div
          className="flex h-[88px] w-[88px] items-center justify-center rounded-full text-[28px] font-semibold shadow-[0_12px_32px_rgba(16,16,18,0.12)]"
          style={{ background: VC.card, color: VC.mist, border: `1px solid ${VC.hairline}` }}
        >
          {peerName.slice(0, 1)}
        </div>
      )}

      <p className="mt-2.5 max-w-[80%] truncate text-[20px] font-semibold tracking-tight" style={{ color: VC.ink }}>
        {peerName}
      </p>
      <p className="mt-1 text-[15px]" style={{ ...VC_NUM_STYLE, color: VC.mist }}>
        {fmtCallDuration(elapsedSec)}
      </p>
    </div>
  )
}
