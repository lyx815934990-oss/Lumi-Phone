import { useEffect, useState } from 'react'
import { MonitorOff, Pause, Play } from 'lucide-react'

import { Pressable } from '../../../components/Pressable'
import {
  getScreenShareSession,
  setScreenSharePaused,
  stopScreenShareSession,
  subscribeScreenShareSession,
} from './screenShareSession'
import type { ScreenShareSessionState } from './types'

export function ScreenShareDock({ conversationKey }: { conversationKey: string }) {
  const [session, setSession] = useState<ScreenShareSessionState>(() => getScreenShareSession())

  useEffect(() => subscribeScreenShareSession(() => setSession(getScreenShareSession())), [])

  const ck = conversationKey.trim()
  if (!session.active || !ck || session.conversationKey !== ck) return null

  const status = session.reacting
    ? '对方正在看屏幕…'
    : session.paused
      ? '已暂停接话'
      : session.lastError
        ? session.lastError
        : '一起刷中'

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-[max(72px,calc(56px+env(safe-area-inset-bottom,0px)))] z-[80] flex justify-center px-3">
      <div className="pointer-events-auto flex max-w-full items-center gap-2 rounded-full border border-[#e5e5ea] bg-white/95 px-2.5 py-1.5 shadow-[0_6px_24px_rgba(0,0,0,0.12)] backdrop-blur-md">
        {session.peerAvatarUrl.trim() ? (
          <img
            src={session.peerAvatarUrl.trim()}
            alt=""
            className="h-7 w-7 shrink-0 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#07c160]/20 text-[11px] font-semibold text-[#07c160]">
            刷
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate text-[12px] font-medium text-[#111]">
            和{session.peerTitle || '对方'}一起刷
          </div>
          <div className="truncate text-[10px] text-[#888]">{status}</div>
        </div>
        <Pressable
          type="button"
          aria-label={session.paused ? '继续接话' : '暂停接话'}
          onClick={() => setScreenSharePaused(!session.paused)}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f2f2f7] text-[#333]"
        >
          {session.paused ? <Play size={14} /> : <Pause size={14} />}
        </Pressable>
        <Pressable
          type="button"
          aria-label="结束一起刷"
          onClick={() => stopScreenShareSession()}
          className="flex h-8 shrink-0 items-center gap-1 rounded-full bg-[#ff3b30]/10 px-2.5 text-[11px] font-medium text-[#ff3b30]"
        >
          <MonitorOff size={13} />
          结束
        </Pressable>
      </div>
    </div>
  )
}
