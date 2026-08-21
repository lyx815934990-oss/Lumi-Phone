import { VC } from '../voiceCallTheme'
import type { VoiceLogMessage } from './types'

/** 通话文字气泡：用户 Ink 实心 / 角色 Card + Hairline */
export function TextBubble({ msg }: { msg: VoiceLogMessage }) {
  const isUser = msg.role === 'user'
  const text = String(msg.text ?? '').trim()
  if (!text) return null
  const radius = isUser ? '16px 16px 6px 16px' : '16px 16px 16px 6px'

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className="max-w-[78%] whitespace-pre-wrap break-words px-3.5 py-2.5 text-[14px] leading-[1.55]"
        style={{
          borderRadius: radius,
          background: isUser ? VC.ink : VC.card,
          color: isUser ? '#fff' : VC.ink,
          border: isUser ? 'none' : `1px solid ${VC.hairline}`,
        }}
      >
        {text}
      </div>
    </div>
  )
}
