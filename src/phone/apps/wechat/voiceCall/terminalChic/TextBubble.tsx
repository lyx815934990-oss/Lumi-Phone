import { Keyboard } from 'lucide-react'

import { VC } from '../voiceCallTheme'
import type { VoiceLogMessage } from './types'

/** 通话「文字转述」条目：与真人录音语音条区分，带小图标标注。 */
export function TextBubble({ msg }: { msg: VoiceLogMessage }) {
  const isUser = msg.role === 'user'
  const text = String(msg.text ?? '').trim()
  if (!text) return null
  const radius = isUser ? '16px 16px 6px 16px' : '16px 16px 16px 6px'
  const isTyped = msg.source === 'user_text' || msg.kind === 'text'

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className="max-w-[78%] px-3.5 py-2.5"
        style={{
          borderRadius: radius,
          background: isUser ? VC.ink : VC.card,
          color: isUser ? '#fff' : VC.ink,
          border: isUser ? 'none' : `1px solid ${VC.hairline}`,
        }}
      >
        {isTyped && isUser ? (
          <div
            className="mb-1.5 inline-flex items-center gap-1 text-[11px]"
            style={{ color: 'rgba(255,255,255,0.65)' }}
          >
            <Keyboard className="size-3" strokeWidth={2} />
            <span>文字转述</span>
          </div>
        ) : null}
        <div className="whitespace-pre-wrap break-words text-[14px] leading-[1.55]">{text}</div>
      </div>
    </div>
  )
}
