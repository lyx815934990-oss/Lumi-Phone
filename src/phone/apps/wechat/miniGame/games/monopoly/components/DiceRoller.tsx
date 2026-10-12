import { motion } from 'framer-motion'

import { Pressable } from '../../../../../../components/Pressable'

function DieFace({ value, spinning }: { value: number; spinning: boolean }) {
  return (
    <motion.div
      key={spinning ? `spin-${value}` : `face-${value}`}
      initial={spinning ? { rotateX: 0, scale: 0.92 } : { scale: 0.9 }}
      animate={
        spinning
          ? { rotateX: [0, 360, 720], scale: [0.92, 1.06, 1] }
          : { scale: 1, rotateX: 0 }
      }
      transition={
        spinning
          ? { duration: 0.55, ease: 'easeOut' }
          : { type: 'spring', stiffness: 420, damping: 22 }
      }
      className="flex h-12 w-12 items-center justify-center rounded-xl border border-stone-200 bg-white text-[22px] font-semibold text-stone-800 shadow-sm"
      style={{ fontFamily: 'var(--phone-font, "Noto Serif SC", serif)' }}
    >
      {value}
    </motion.div>
  )
}

export function DiceRoller({
  dice,
  rolling,
  disabled,
  onRoll,
}: {
  dice: [number, number] | null
  rolling: boolean
  disabled: boolean
  onRoll: () => void
}) {
  const a = dice?.[0] ?? 1
  const b = dice?.[1] ?? 1
  return (
    <div className="flex items-center gap-3">
      <DieFace value={a} spinning={rolling} />
      <DieFace value={b} spinning={rolling} />
      <Pressable
        disabled={disabled || rolling}
        onClick={onRoll}
        className={`ml-1 rounded-2xl px-4 py-2.5 text-[14px] font-medium ${
          disabled || rolling
            ? 'bg-stone-200 text-stone-400'
            : 'bg-[#0A0A0C] text-white active:opacity-90'
        }`}
      >
        {rolling ? '掷骰中…' : '掷骰子'}
      </Pressable>
    </div>
  )
}
