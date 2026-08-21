import { Phone } from 'lucide-react'

import { Pressable } from '../../../components/Pressable'
import { CssCallStatusShell } from '../cssSkinShells'
import { useChatSkinEngine } from '../WeChatChatSkinEngineContext'
import { formatCallStatusLabel, formatTwitterCallStatusLabel, type CallStatusKind } from './callStatusLabel'

export type CallStatusBubbleData =
  | { status: 'rejected' }
  | { status: 'no_answer' }
  | { status: 'duration'; durationSec: number }

export function CallStatusBubble({
  data,
  /** true = 用户发起的通话（右对齐气泡侧） */
  initiatedBySelf = true,
  onClickDuration,
  /** X 风格：居中胶囊 + 专用文案 */
  twitterStyle = false,
}: {
  data: CallStatusBubbleData
  initiatedBySelf?: boolean
  onClickDuration?: () => void
  twitterStyle?: boolean
}) {
  const chatSkinEngine = useChatSkinEngine()
  const status = data.status as CallStatusKind
  const text = twitterStyle
    ? formatTwitterCallStatusLabel(
        status,
        initiatedBySelf,
        data.status === 'duration' ? data.durationSec : 0,
      )
    : formatCallStatusLabel(
        status,
        initiatedBySelf,
        data.status === 'duration' ? data.durationSec : 0,
      )
  const clickable = data.status === 'duration' && !!onClickDuration
  const mutedMissed = twitterStyle && status !== 'duration'

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
        data-wx-call-initiator={initiatedBySelf ? 'self' : 'other'}
        className={
          twitterStyle
            ? 'flex items-center gap-2 rounded-full px-3 py-1.5'
            : 'flex items-center gap-2 rounded-[14px] px-3 py-2'
        }
        style={{
          background: 'var(--wx-special-call-bg, var(--wx-other-bubble-bg, #f2f2f7))',
          color: mutedMissed
            ? 'var(--wx-special-call-muted, #536471)'
            : 'var(--wx-special-call-text, var(--wx-other-bubble-text, rgba(28,28,30,0.75)))',
        }}
      >
        <Phone
          data-wx-special-part="icon"
          className="size-4 shrink-0"
          style={{ color: 'color-mix(in oklab, currentColor 88%, transparent)' }}
        />
        <div data-wx-special-part="label" className={twitterStyle ? 'text-[13px]' : 'text-[14px]'}>
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
