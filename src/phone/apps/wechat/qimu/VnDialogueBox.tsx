import { AnimatePresence, motion } from 'framer-motion'
import { Pressable } from '../../../components/Pressable'
import { speakerLabel } from './speakers'
import { qimuInk } from './theme'
import type { CurtainMessage } from './types'

type Props = {
  msg: CurtainMessage
  partnerName: string
  userRole: string
  charRole: string
  /** 右下角提示：有下一句 / 已到末尾 / 自定义 */
  footerHint?: string
  onPress?: () => void
  compact?: boolean
}

/** 经典 VN 对话框：姓名牌 + 全宽正文（主界面与回放共用） */
export function VnDialogueBox({
  msg,
  partnerName,
  userRole,
  charRole,
  footerHint = '■',
  onPress,
  compact,
}: Props) {
  const isWing = msg.isMeta || msg.channel === 'wing'
  const isUser = msg.role === 'user'
  const isNarration = msg.role === 'system' || msg.role === 'npc'
  const name = speakerLabel(msg, partnerName, userRole, charRole)

  const boxBg = isWing
    ? 'linear-gradient(180deg, rgba(22,20,18,0.94) 0%, rgba(12,11,10,0.96) 100%)'
    : isNarration
      ? 'linear-gradient(180deg, rgba(255,255,255,0.97) 0%, rgba(248,246,242,0.95) 100%)'
      : 'linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(242,242,242,0.94) 100%)'

  const namePlateBg = isWing
    ? 'linear-gradient(90deg, #3a342c 0%, #2a2620 100%)'
    : isNarration
      ? 'linear-gradient(90deg, #2c2c2c 0%, #1a1a1a 100%)'
      : isUser
        ? 'linear-gradient(90deg, #444 0%, #2a2a2a 100%)'
        : 'linear-gradient(90deg, #1f1f1f 0%, #111 100%)'

  const body = (
    <div className="relative w-full pt-3 text-left">
      <div
        className="absolute left-3 top-0 z-[1] rounded-sm px-3 py-[3px]"
        style={{
          background: namePlateBg,
          boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
        }}
      >
        <p
          className="text-[11.5px] font-semibold tracking-wide text-white"
          style={{ fontFamily: qimuInk.display }}
        >
          {name}
        </p>
      </div>

      <div
        className={`rounded-[6px] border px-3.5 pb-3.5 pt-5 ${compact ? 'min-h-[88px]' : 'min-h-[108px]'}`}
        style={{
          background: boxBg,
          borderColor: isWing ? 'rgba(210,190,150,0.45)' : 'rgba(0,0,0,0.12)',
          boxShadow: isWing
            ? qimuInk.pearlGlow
            : '0 8px 24px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.65)',
          borderStyle: isWing ? 'dashed' : 'solid',
        }}
      >
        <AnimatePresence mode="wait">
          <motion.p
            key={msg.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
            className={`whitespace-pre-line leading-[1.8] ${compact ? 'text-[14px]' : 'text-[15px]'} ${
              isWing ? 'italic' : ''
            }`}
            style={{
              color: isWing ? 'rgba(250,246,238,0.95)' : qimuInk.title,
              fontFamily: isNarration ? qimuInk.display : 'inherit',
            }}
          >
            {msg.content}
          </motion.p>
        </AnimatePresence>
        <div className="mt-3 flex items-center justify-between">
          <p
            className="text-[9.5px] tracking-[0.14em]"
            style={{
              color: isWing ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.28)',
              fontFamily: qimuInk.mono,
            }}
          >
            {isWing ? 'WING' : isNarration ? 'NARRATION' : 'STAGE'}
          </p>
          <p
            className="text-[11px] font-medium"
            style={{ color: isWing ? 'rgba(245,230,200,0.75)' : qimuInk.mute }}
          >
            {footerHint}
          </p>
        </div>
      </div>
    </div>
  )

  if (!onPress) return body

  return (
    <Pressable type="button" onClick={onPress} className="w-full active:opacity-95">
      {body}
    </Pressable>
  )
}
