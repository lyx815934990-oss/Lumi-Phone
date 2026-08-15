import { motion } from 'framer-motion'
import type { CurtainChannel } from './types'
import { qimuInk } from './theme'

type Props = {
  channel: CurtainChannel
  onChange: (channel: CurtainChannel) => void
  disabled?: boolean
}

/** 幕前 ⇄ 幕间 · 无 emoji 的诗意双态切换 */
export function PersonaChannelToggle({ channel, onChange, disabled }: Props) {
  const isWing = channel === 'wing'
  return (
    <div
      className="relative flex w-full max-w-[320px] rounded-full p-[3px]"
      style={{
        background: isWing ? 'rgba(232,220,200,0.35)' : 'rgba(0,0,0,0.05)',
        boxShadow: isWing ? qimuInk.pearlGlow : 'none',
      }}
      role="tablist"
      aria-label="通讯频道"
    >
      <motion.div
        className="absolute bottom-[3px] top-[3px] w-[calc(50%-3px)] rounded-full"
        style={{
          background: isWing ? qimuInk.wingInput : '#fff',
          boxShadow: '0 1px 8px rgba(0,0,0,0.06)',
        }}
        animate={{ left: isWing ? 'calc(50%)' : '3px' }}
        transition={{ type: 'spring', stiffness: 420, damping: 36 }}
      />
      <button
        type="button"
        role="tab"
        aria-selected={!isWing}
        disabled={disabled}
        onClick={() => onChange('stage')}
        className="relative z-[1] flex-1 rounded-full py-2 text-center text-[12.5px] font-medium tracking-wide disabled:opacity-50"
        style={{ color: !isWing ? qimuInk.title : qimuInk.mute }}
      >
        幕前
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={isWing}
        disabled={disabled}
        onClick={() => onChange('wing')}
        className="relative z-[1] flex-1 rounded-full py-2 text-center text-[12.5px] font-medium tracking-wide disabled:opacity-50"
        style={{ color: isWing ? qimuInk.title : qimuInk.mute }}
      >
        幕间
      </button>
    </div>
  )
}
