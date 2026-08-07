import { Phone } from 'lucide-react'

import { Pressable } from '../../../components/Pressable'
import { CssCallStatusShell } from '../cssSkinShells'
import { useChatSkinEngine } from '../WeChatChatSkinEngineContext'

function pad2(n: number) {
  return String(n).padStart(2, '0')
}

function fmtDuration(sec: number) {
  const s = Math.max(0, Math.floor(sec))
  const mm = Math.floor(s / 60)
  const ss = s % 60
  return `${pad2(mm)}:${pad2(ss)}`
}

export type CallStatusBubbleData =
  | { status: 'rejected' }
  | { status: 'no_answer' }
  | { status: 'duration'; durationSec: number }

export function CallStatusBubble({
  data,
  onClickDuration,
}: {
  data: CallStatusBubbleData
  onClickDuration?: () => void
}) {
  const chatSkinEngine = useChatSkinEngine()
  const text =
    data.status === 'rejected'
      ? '已拒接'
      : data.status === 'no_answer'
        ? '对方未应答'
        : `通话时长 ${fmtDuration(data.durationSec)}`
  const clickable = data.status === 'duration' && !!onClickDuration

  const content =
    chatSkinEngine === 'css' ? (
      <CssCallStatusShell status={data.status} text={text}>
        <Phone className="size-4 shrink-0" />
      </CssCallStatusShell>
    ) : (
      <div
        data-wx-msg-kind="voice-call"
        data-wx-special-card
        data-wx-special-status={data.status}
        className="flex items-center gap-2 rounded-[14px] px-3 py-2"
        style={{
          background: 'var(--wx-special-call-bg, var(--wx-other-bubble-bg, #f2f2f7))',
          color: 'var(--wx-special-call-text, var(--wx-other-bubble-text, rgba(28,28,30,0.75)))',
        }}
      >
        <Phone
          data-wx-special-part="icon"
          className="size-4 shrink-0"
          style={{ color: 'color-mix(in oklab, currentColor 88%, transparent)' }}
        />
        <div data-wx-special-part="label" className="text-[14px]">
          {text}
        </div>
      </div>
    )

  if (!clickable) return content

  return (
    <Pressable type="button" onClick={onClickDuration} className="active:scale-[0.99]">
      {content}
    </Pressable>
  )
}

