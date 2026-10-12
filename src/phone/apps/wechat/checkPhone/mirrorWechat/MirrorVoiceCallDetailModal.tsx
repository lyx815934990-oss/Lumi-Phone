import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, Volume2 } from 'lucide-react'

import { Pressable } from '../../../../components/Pressable'
import { splitAuditoryNarration } from '../../voiceCall/terminalChic/types'
import { fmtCallDuration, VC_UI_FONT } from '../../voiceCall/voiceCallTheme'

export type MirrorVoiceCallLine = {
  role: 'character' | 'player'
  text: string
  /** 同步翻译（勾选「自带翻译」时由模型写入） */
  translation?: string
}

const C = {
  pageBg: '#FAFAF9',
  ink: '#1A1A1A',
  label: '#9A9A95',
  hairline: '#ECEAE5',
  foot: '#B8B4AE',
  peerBubble: '#1A1A1A',
  peerSpeech: '#FFFFFF',
  peerSfx: '#8A8A85',
  peerAvatarBg: '#E8E6E1',
  charBubble: '#FFFFFF',
  charSpeech: '#1A1A1A',
  charSfx: '#B8B4AE',
  charAvatarBg: '#F0ECE4',
} as const

function CallLineBody({
  text,
  speechColor,
  sfxColor,
}: {
  text: string
  speechColor: string
  sfxColor: string
}) {
  const parts = splitAuditoryNarration(text)
  if (!parts.length) return null

  const speech = parts
    .filter((p) => p.kind === 'speech')
    .map((p) => p.text)
    .join('')
    .trim()
  const sfxList = parts.filter((p) => p.kind === 'sfx').map((p) => p.text.trim()).filter(Boolean)

  return (
    <>
      {speech ? (
        <p
          className="whitespace-pre-wrap break-words"
          style={{ fontSize: 14.5, lineHeight: 1.6, color: speechColor }}
        >
          {speech}
        </p>
      ) : null}
      {sfxList.map((sfx, i) => (
        <div
          key={`${i}-${sfx.slice(0, 8)}`}
          className="flex items-start gap-1"
          style={{ marginTop: speech || i > 0 ? 7 : 0 }}
        >
          <Volume2
            size={11}
            strokeWidth={2}
            className="mt-[2px] shrink-0"
            style={{ color: sfxColor }}
          />
          <p className="min-w-0 flex-1 italic" style={{ fontSize: 11.5, lineHeight: 1.5, color: sfxColor }}>
            {sfx}
          </p>
        </div>
      ))}
    </>
  )
}

function AvatarChip({
  url,
  fallbackBg,
  label,
}: {
  url?: string
  fallbackBg: string
  label: string
}) {
  const src = url?.trim()
  return (
    <div
      className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full"
      style={{ background: fallbackBg }}
      aria-hidden
    >
      {src ? (
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="text-[12px] font-medium" style={{ color: C.label }}>
          {(label || '?').slice(0, 1)}
        </span>
      )}
    </div>
  )
}

/**
 * 镜像微信 · 语音通话记录弹窗（窥探模式只读）。
 * 转录稿排版：头像统一靠左、对白右展；旁白独立成行。
 */
export function MirrorVoiceCallDetailModal({
  open,
  durationSec,
  peerName,
  peerAvatarUrl,
  characterName,
  characterAvatarUrl,
  lines,
  onClose,
}: {
  open: boolean
  durationSec: number
  peerName: string
  peerAvatarUrl?: string
  characterName?: string
  characterAvatarUrl?: string
  lines: MirrorVoiceCallLine[]
  onClose: () => void
}) {
  const peerLabel = peerName?.trim() || '联系人'
  const charLabel = characterName?.trim() || '角色'

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[1480] flex flex-col overflow-hidden"
          style={{
            fontFamily: VC_UI_FONT,
            background: C.pageBg,
            borderRadius: 28,
          }}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ type: 'spring', stiffness: 320, damping: 30 }}
        >
          <div
            className="shrink-0"
            style={{
              padding: '18px 20px 14px',
              paddingTop: 'max(18px, env(safe-area-inset-top))',
            }}
          >
            <div className="flex items-start gap-2">
              <Pressable
                type="button"
                onClick={onClose}
                className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full active:bg-black/5"
                aria-label="返回"
              >
                <ChevronLeft size={19} strokeWidth={2.2} style={{ color: C.ink }} />
              </Pressable>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[16px] font-semibold" style={{ color: C.ink }}>
                  通话记录 · {peerLabel}
                </div>
                <div className="text-[11.5px]" style={{ color: C.label, marginTop: 2 }}>
                  时长 {fmtCallDuration(Math.max(0, durationSec || 0))} · 窥探模式
                </div>
              </div>
            </div>
          </div>

          <div
            className="min-h-0 flex-1 overflow-y-auto"
            style={{
              padding: '0 20px',
              paddingBottom: 'max(24px, env(safe-area-inset-bottom))',
            }}
          >
            {lines.length ? (
              <div className="flex flex-col" style={{ gap: 20 }}>
                {lines.map((line, i) => {
                  const isPeer = line.role === 'player'
                  const speaker = isPeer ? peerLabel : charLabel
                  const speechColor = isPeer ? C.peerSpeech : C.charSpeech
                  const sfxColor = isPeer ? C.peerSfx : C.charSfx
                  return (
                    <div
                      key={`${i}-${line.text.slice(0, 12)}`}
                      className="flex w-full items-start"
                      style={{ gap: 12 }}
                    >
                      <AvatarChip
                        url={isPeer ? peerAvatarUrl : characterAvatarUrl}
                        fallbackBg={isPeer ? C.peerAvatarBg : C.charAvatarBg}
                        label={speaker}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-[11px]" style={{ color: C.label, marginBottom: 5 }}>
                          {speaker}
                        </div>
                        <div
                          style={{
                            background: isPeer ? C.peerBubble : C.charBubble,
                            border: isPeer ? 'none' : `1px solid ${C.hairline}`,
                            borderRadius: '4px 16px 16px 16px',
                            padding: '11px 14px',
                          }}
                        >
                          <CallLineBody
                            text={line.text}
                            speechColor={speechColor}
                            sfxColor={sfxColor}
                          />
                        </div>
                        {line.translation?.trim() ? (
                          <div
                            className="mt-1.5 px-0.5"
                            style={{
                              fontSize: 12,
                              lineHeight: 1.5,
                              color: C.label,
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-word',
                            }}
                          >
                            <span style={{ opacity: 0.75 }}>译 · </span>
                            {line.translation.trim()}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div
                className="px-4 py-10 text-center text-[13px]"
                style={{
                  color: C.label,
                  border: `1px dashed ${C.hairline}`,
                  borderRadius: 16,
                  background: '#FFFFFF',
                }}
              >
                暂无通话内容片段
              </div>
            )}

            <div
              className="flex items-start gap-1.5"
              style={{
                marginTop: 20,
                paddingTop: 14,
                borderTop: '0.5px solid rgba(0,0,0,0.08)',
              }}
            >
              <Volume2
                size={12}
                strokeWidth={2}
                className="mt-[2px] shrink-0"
                style={{ color: C.foot }}
              />
              <p className="min-w-0 flex-1" style={{ fontSize: 11.5, lineHeight: 1.5, color: C.foot }}>
                斜体为声音旁白（呼吸、沉默、环境音等），非屏幕对白
              </p>
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
