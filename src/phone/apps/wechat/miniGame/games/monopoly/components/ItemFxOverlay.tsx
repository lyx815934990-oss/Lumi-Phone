import { AnimatePresence, motion } from 'framer-motion'

import { ITEM_LABEL, type MonopolyItemId } from '../monopolyTypes'

const FX: Record<
  MonopolyItemId,
  { ring: string; wash: string; label: string }
> = {
  freeze: {
    ring: 'border-sky-300/80',
    wash: 'bg-sky-400/25',
    label: '冻结',
  },
  double_rent: {
    ring: 'border-amber-300/90',
    wash: 'bg-amber-400/20',
    label: '双倍',
  },
  teleport: {
    ring: 'border-violet-300/80',
    wash: 'bg-violet-400/20',
    label: '传送',
  },
  shield: {
    ring: 'border-emerald-300/80',
    wash: 'bg-emerald-400/20',
    label: '护罩',
  },
  swap: {
    ring: 'border-fuchsia-300/80',
    wash: 'bg-fuchsia-400/20',
    label: '换日',
  },
  rent_free: {
    ring: 'border-teal-300/80',
    wash: 'bg-teal-400/20',
    label: '免租',
  },
}

/** 道具使用 / 抽到时的全屏轻量特效 */
export function ItemFxOverlay({
  item,
  mode = 'use',
}: {
  item: MonopolyItemId | null
  mode?: 'use' | 'got'
}) {
  const fx = item ? FX[item] : null
  return (
    <AnimatePresence>
      {item && fx ? (
        <motion.div
          key={`${mode}-${item}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center overflow-hidden"
        >
          <motion.div
            initial={{ scale: 0.2, opacity: 0.55 }}
            animate={{ scale: 2.6, opacity: 0 }}
            transition={{ duration: 0.75, ease: 'easeOut' }}
            className={`absolute h-40 w-40 rounded-full border-2 ${fx.ring} ${fx.wash}`}
          />
          <motion.div
            initial={{ scale: 0.4, opacity: 0.35 }}
            animate={{ scale: 3.2, opacity: 0 }}
            transition={{ duration: 0.9, ease: 'easeOut', delay: 0.05 }}
            className={`absolute h-28 w-28 rounded-full border ${fx.ring}`}
          />
          <motion.div
            initial={{ y: 10, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ type: 'spring', stiffness: 380, damping: 24 }}
            className="rounded-full border border-white/70 bg-white/90 px-4 py-2 text-[13px] font-medium text-stone-800 shadow-lg backdrop-blur-md"
            style={{ fontFamily: 'var(--phone-font, "Noto Serif SC", serif)' }}
          >
            {mode === 'got' ? `获得 · ${ITEM_LABEL[item]}` : `使用 · ${ITEM_LABEL[item]}`}
            <span className="ml-1.5 text-[10px] text-stone-400">{fx.label}</span>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
