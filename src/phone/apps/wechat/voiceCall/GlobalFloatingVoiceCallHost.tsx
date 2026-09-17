import { FloatingVoiceCallBubble } from './FloatingVoiceCallBubble'
import { useGlobalVoiceCallFloatStore } from './useGlobalVoiceCallFloatStore'

/** 挂在 PhoneShell：跨桌面 / 其他 App 仍显示可拖动通话浮标 */
export function GlobalFloatingVoiceCallHost() {
  const visible = useGlobalVoiceCallFloatStore((s) => s.visible)
  const peerAvatarUrl = useGlobalVoiceCallFloatStore((s) => s.peerAvatarUrl)
  const peerRemarkName = useGlobalVoiceCallFloatStore((s) => s.peerRemarkName)
  const phase = useGlobalVoiceCallFloatStore((s) => s.phase)
  const captionId = useGlobalVoiceCallFloatStore((s) => s.captionId)
  const captionText = useGlobalVoiceCallFloatStore((s) => s.captionText)
  const captionMode = useGlobalVoiceCallFloatStore((s) => s.captionMode)
  const requestExpand = useGlobalVoiceCallFloatStore((s) => s.requestExpand)

  return (
    <FloatingVoiceCallBubble
      visible={visible}
      peerAvatarUrl={peerAvatarUrl}
      peerRemarkName={peerRemarkName}
      phase={phase}
      captionId={captionId}
      captionText={captionText}
      captionMode={captionMode}
      onExpand={requestExpand}
    />
  )
}
