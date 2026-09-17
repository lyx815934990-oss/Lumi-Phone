import { AnimatePresence, motion } from 'framer-motion'
import { AudioLines, AudioWaveform, Keyboard, Mic2, ScrollText, Smile, Sparkles } from 'lucide-react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'

import { Pressable } from '../../../../components/Pressable'
import { VC, vcLiquidGlassLight } from '../voiceCallTheme'

function ToolRow({
  icon,
  title,
  subtitle,
  trailing,
  onClick,
}: {
  icon: ReactNode
  title: string
  subtitle?: string
  trailing?: ReactNode
  onClick?: () => void
}) {
  const inner = (
    <>
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
        style={{
          background: 'rgba(28,28,30,0.05)',
          color: VC.ink,
        }}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-medium leading-snug" style={{ color: VC.ink }}>
          {title}
        </span>
        {subtitle ? (
          <span className="mt-0.5 block text-[11px] leading-snug" style={{ color: VC.mist }}>
            {subtitle}
          </span>
        ) : null}
      </span>
      {trailing}
    </>
  )

  if (!onClick) {
    return (
      <div className="flex items-center gap-3 px-3.5 py-3" style={{ borderTop: `1px solid ${VC.hairline}` }}>
        {inner}
      </div>
    )
  }

  return (
    <Pressable
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 px-3.5 py-3 text-left active:bg-black/[0.03]"
      style={{ borderTop: `1px solid ${VC.hairline}` }}
    >
      {inner}
    </Pressable>
  )
}

function SwitchDot({ on }: { on: boolean }) {
  return (
    <span
      className="relative h-[22px] w-[38px] shrink-0 rounded-full transition-colors"
      style={{ background: on ? VC.ink : 'rgba(120,120,128,0.28)' }}
      aria-hidden
    >
      <span
        className="absolute top-[2px] h-[18px] w-[18px] rounded-full bg-white shadow transition-transform"
        style={{ left: on ? 18 : 2 }}
      />
    </span>
  )
}

/** 通话「功能整合」：合成 / 输入 / 记录 / 音色（portal 到 body，避免被输入条挡住） */
export function CallToolsSheet({
  open,
  onClose,
  autoPlay,
  synthToneTokens,
  synthEmotion,
  keyboardOpen,
  voiceBound,
  transcriptCount,
  onToggleAutoPlay,
  onToggleSynthToneTokens,
  onToggleSynthEmotion,
  onToggleKeyboard,
  onOpenTranscript,
  onOpenVoiceBind,
}: {
  open: boolean
  onClose: () => void
  autoPlay: boolean
  synthToneTokens: boolean
  synthEmotion: boolean
  keyboardOpen: boolean
  voiceBound?: boolean
  transcriptCount: number
  onToggleAutoPlay: () => void
  onToggleSynthToneTokens: () => void
  onToggleSynthEmotion: () => void
  onToggleKeyboard: () => void
  onOpenTranscript: () => void
  onOpenVoiceBind?: () => void
}) {
  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          key="vc-tools"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[320] flex flex-col justify-end"
          style={{ background: 'rgba(16,16,18,0.28)', backdropFilter: 'blur(8px)' }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose()
          }}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto w-full max-w-[420px] px-3 pb-[max(12px,env(safe-area-inset-bottom,0px))]"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div
              className="overflow-hidden rounded-[22px]"
              style={{
                ...vcLiquidGlassLight({ borderRadius: 22 }),
                background: 'rgba(252,251,249,0.94)',
              }}
            >
              <div className="px-4 pb-2 pt-3.5">
                <div
                  className="mx-auto mb-3 h-1 w-9 rounded-full"
                  style={{ background: 'rgba(28,28,30,0.12)' }}
                />
                <p className="text-[15px] font-semibold" style={{ color: VC.ink }}>
                  通话功能
                </p>
                <p className="mt-0.5 text-[11px] leading-snug" style={{ color: VC.mist }}>
                  合成、键盘、记录与音色
                </p>
              </div>

              <ToolRow
                icon={<AudioWaveform className="size-4" strokeWidth={1.9} />}
                title="语音识别（语气情感）"
                subtitle="催回复 / 挂断时才识别；录音松手立刻上屏"
                trailing={
                  <span className="text-[12px] font-medium" style={{ color: VC.ink }}>
                    已启用
                  </span>
                }
              />

              <ToolRow
                icon={<AudioLines className="size-4" strokeWidth={1.9} />}
                title="自动合成连播"
                subtitle={autoPlay ? '角色回复将自动生成并连播（计费）' : '默认按需：点歌词旁播放再合成'}
                trailing={<SwitchDot on={autoPlay} />}
                onClick={onToggleAutoPlay}
              />

              <ToolRow
                icon={<Smile className="size-4" strokeWidth={1.9} />}
                title="合成语气词"
                subtitle={
                  synthToneTokens
                    ? '已开启：可带笑声 / 叹气 / 咳嗽等官方语气词'
                    : '关闭：合成与回复都不带英文语气词'
                }
                trailing={<SwitchDot on={synthToneTokens} />}
                onClick={onToggleSynthToneTokens}
              />

              <ToolRow
                icon={<Sparkles className="size-4" strokeWidth={1.9} />}
                title="合成情绪词"
                subtitle={
                  synthEmotion
                    ? '已开启：可带开心 / 难过等情绪标签'
                    : '关闭：合成与回复都不带情绪标签'
                }
                trailing={<SwitchDot on={synthEmotion} />}
                onClick={onToggleSynthEmotion}
              />

              <ToolRow
                icon={<Keyboard className="size-4" strokeWidth={1.9} />}
                title="键盘输入"
                subtitle={
                  keyboardOpen
                    ? '已打开：可点「收起键盘」或再点本项关闭'
                    : '打开后可打字；录音时会自动收起'
                }
                trailing={<SwitchDot on={keyboardOpen} />}
                onClick={() => {
                  onToggleKeyboard()
                  onClose()
                }}
              />

              <ToolRow
                icon={<ScrollText className="size-4" strokeWidth={1.9} />}
                title="通话记录"
                subtitle={transcriptCount > 0 ? `${transcriptCount} 条` : '查看本通字幕与语音'}
                onClick={() => {
                  onClose()
                  onOpenTranscript()
                }}
              />

              {onOpenVoiceBind ? (
                <ToolRow
                  icon={<Mic2 className="size-4" strokeWidth={1.9} />}
                  title={voiceBound ? '更换角色音色' : '绑定角色音色'}
                  subtitle={voiceBound ? '已绑定，可合成角色语音' : '未绑定则无法合成角色语音'}
                  onClick={() => {
                    onClose()
                    onOpenVoiceBind()
                  }}
                />
              ) : null}
            </div>

            <Pressable
              type="button"
              onClick={onClose}
              className="mt-2 flex w-full items-center justify-center rounded-[16px] py-3.5 text-[15px] font-medium active:scale-[0.99]"
              style={{
                ...vcLiquidGlassLight({ borderRadius: 16 }),
                background: 'rgba(255,255,255,0.88)',
                color: VC.ink,
              }}
            >
              关闭
            </Pressable>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  )
}
