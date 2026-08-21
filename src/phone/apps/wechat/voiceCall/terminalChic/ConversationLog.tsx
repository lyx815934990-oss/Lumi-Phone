import { useEffect, useMemo, useRef } from 'react'

import { VC } from '../voiceCallTheme'
import { MessageUnit } from './MessageUnit'
import type { VoiceLogMessage } from './types'

/**
 * 中间对话流：独立滚动；顶/底玻璃条由面板固定。
 */
export function ConversationLog({
  messages,
  autoPlay,
  peerReplying,
  onListened,
}: {
  messages: VoiceLogMessage[]
  autoPlay: boolean
  peerReplying?: boolean
  onListened: (id: string) => void
}) {
  const endRef = useRef<HTMLDivElement>(null)
  const lastId = useMemo(() => (messages.length ? messages[messages.length - 1]!.id : null), [messages])
  const lastCharId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i]!.role === 'character') return messages[i]!.id
    }
    return null
  }, [messages])

  useEffect(() => {
    if (!endRef.current) return
    endRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [lastId, peerReplying])

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-3 pt-2">
      {messages.map((m) => {
        const autoPlayToken =
          autoPlay && m.role === 'character' && m.id === lastCharId && isLikelyNewVoice(m) ? m.createdAt : undefined
        return (
          <MessageUnit
            key={m.id}
            msg={m}
            autoPlayToken={autoPlayToken}
            onListened={onListened}
          />
        )
      })}
      {peerReplying ? (
        <div className="mb-3 flex justify-start">
          <div
            className="flex items-center gap-1 rounded-[16px] px-3.5 py-2.5"
            style={{ background: VC.card, border: `1px solid ${VC.hairline}` }}
            aria-label="对方正在说话"
          >
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="block h-1.5 w-1.5 rounded-full"
                style={{
                  background: VC.mist,
                  animation: `vc-dot-bounce 1s ease-in-out ${i * 0.15}s infinite`,
                }}
              />
            ))}
          </div>
        </div>
      ) : null}
      <div ref={endRef} />
      <style>{`
        @keyframes vc-dot-bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.45; }
          40% { transform: translateY(-3px); opacity: 1; }
        }
      `}</style>
    </div>
  )
}

function isLikelyNewVoice(m: VoiceLogMessage): boolean {
  if (m.kind === 'text') return false
  return true
}
