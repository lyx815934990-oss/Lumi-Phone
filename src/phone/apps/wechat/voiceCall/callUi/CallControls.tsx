import { LayoutGrid, PhoneOff, Reply } from 'lucide-react'
import { useState } from 'react'

import { Pressable } from '../../../../components/Pressable'
import { HoldToSpeakButton } from '../terminalChic/HybridInput'
import { VC, vcLiquidGlassLight } from '../voiceCallTheme'
import { CallToolsSheet } from './CallToolsSheet'

export function CallControls({
  autoPlay,
  synthToneTokens,
  synthEmotion,
  keyboardOpen,
  voiceBound,
  transcriptCount = 0,
  canNudgeReply = false,
  replyBusy = false,
  onToggleAutoPlay,
  onToggleSynthToneTokens,
  onToggleSynthEmotion,
  onToggleKeyboard,
  onOpenVoiceBind,
  onOpenTranscript,
  onHangup,
  onNudgeReply,
  onVoiceBlob,
  onVoiceRecognizeError,
  onPrepareOpenTools,
  onHoldStart,
}: {
  autoPlay: boolean
  synthToneTokens: boolean
  synthEmotion: boolean
  keyboardOpen: boolean
  voiceBound?: boolean
  transcriptCount?: number
  /** 上一条是用户且未在回复中：可催角色接话 */
  canNudgeReply?: boolean
  replyBusy?: boolean
  onToggleAutoPlay: () => void
  onToggleSynthToneTokens: () => void
  onToggleSynthEmotion: () => void
  onToggleKeyboard: () => void
  onOpenVoiceBind?: () => void
  onOpenTranscript: () => void
  onHangup: () => void
  onNudgeReply?: () => void
  onVoiceBlob?: (
    audioBlob: Blob,
    meta?: { durationSec: number },
  ) => Promise<void>
  onVoiceRecognizeError?: (message: string) => void
  /** 打开功能面板前：收起键盘输入，避免挡板 */
  onPrepareOpenTools?: () => void
  /** 按住说话开始：收起键盘，露出音波浮层 */
  onHoldStart?: () => void
}) {
  const [toolsOpen, setToolsOpen] = useState(false)

  return (
    <div
      className="relative z-[3] mx-auto w-full max-w-[420px] px-3 pt-0"
      style={{
        paddingBottom: 'max(10px, calc(6px + env(safe-area-inset-bottom, 0px)))',
      }}
    >
      <p className="mb-2 px-1 text-center text-[10px] leading-snug" style={{ color: VC.mist }}>
        按住说完再松手（别太短）· 点「回复」再识别语气
      </p>

      <div className="flex items-end justify-center gap-9">
        <div className="flex flex-col items-center gap-1.5">
          <Pressable
            type="button"
            aria-label="通话功能"
            title="合成、键盘、记录、音色"
            onClick={() => {
              onPrepareOpenTools?.()
              setToolsOpen(true)
            }}
            className="flex h-[52px] w-[52px] items-center justify-center rounded-full active:scale-[0.96]"
            style={{
              ...vcLiquidGlassLight({ borderRadius: 999 }),
              color: VC.ink,
              background: 'rgba(255,255,255,0.7)',
            }}
          >
            <LayoutGrid className="size-[20px]" strokeWidth={1.8} />
          </Pressable>
          <span className="text-[9px] leading-none whitespace-nowrap" style={{ color: VC.mist }}>
            功能
          </span>
        </div>

        <HoldToSpeakButton
          onVoiceBlob={onVoiceBlob}
          onVoiceRecognizeError={onVoiceRecognizeError}
          onHoldStart={onHoldStart}
        />

        <div className="flex flex-col items-center gap-1.5">
          <Pressable
            type="button"
            aria-label="挂断"
            onClick={onHangup}
            className="flex h-[58px] w-[58px] items-center justify-center rounded-full text-white shadow-[0_10px_28px_rgba(255,59,48,0.35)] active:scale-[0.96]"
            style={{ background: VC.endRed }}
          >
            <PhoneOff className="size-6" strokeWidth={2} />
          </Pressable>
          <span className="text-[9px] leading-none whitespace-nowrap" style={{ color: VC.mist }}>
            挂断
          </span>
        </div>
      </div>

      {canNudgeReply && onNudgeReply ? (
        <div className="mt-3 flex justify-center">
          <Pressable
            type="button"
            aria-label="催角色回复"
            disabled={replyBusy}
            onClick={onNudgeReply}
            className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-medium disabled:opacity-40 active:scale-[0.97]"
            style={{
              ...vcLiquidGlassLight({ borderRadius: 999 }),
              background: VC.ink,
              color: '#fff',
            }}
          >
            <Reply className="size-3.5" strokeWidth={2.2} />
            回复
          </Pressable>
        </div>
      ) : null}

      <CallToolsSheet
        open={toolsOpen}
        onClose={() => setToolsOpen(false)}
        autoPlay={autoPlay}
        synthToneTokens={synthToneTokens}
        synthEmotion={synthEmotion}
        keyboardOpen={keyboardOpen}
        voiceBound={voiceBound}
        transcriptCount={transcriptCount}
        onToggleAutoPlay={onToggleAutoPlay}
        onToggleSynthToneTokens={onToggleSynthToneTokens}
        onToggleSynthEmotion={onToggleSynthEmotion}
        onToggleKeyboard={onToggleKeyboard}
        onOpenTranscript={onOpenTranscript}
        onOpenVoiceBind={onOpenVoiceBind}
      />
    </div>
  )
}
