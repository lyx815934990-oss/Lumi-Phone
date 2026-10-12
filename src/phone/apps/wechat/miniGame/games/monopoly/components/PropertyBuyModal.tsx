import { AnimatePresence, motion } from 'framer-motion'

import { Pressable } from '../../../../../../components/Pressable'
import type { MonopolyTileDef } from '../monopolyTypes'
import { COLOR_GROUP_HEX, COLOR_GROUP_LABEL } from '../monopolyTypes'

export function PropertyBuyModal({
  open,
  tile,
  price,
  flavor,
  onBuy,
  onSkip,
  buyLabel = '购买',
}: {
  open: boolean
  tile: MonopolyTileDef | null
  price: number
  flavor?: string
  onBuy: () => void
  onSkip: () => void
  buyLabel?: string
}) {
  if (!tile) return null
  const color = tile.colorGroup ? COLOR_GROUP_HEX[tile.colorGroup] : '#D6D3D1'
  const group = tile.colorGroup ? COLOR_GROUP_LABEL[tile.colorGroup] : ''

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-30 flex items-center justify-center bg-black/25 px-5 backdrop-blur-[2px]"
        >
          <motion.div
            initial={{ rotateY: -90, opacity: 0.4, scale: 0.92 }}
            animate={{ rotateY: 0, opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 280, damping: 24 }}
            className="w-full max-w-[300px] overflow-hidden rounded-2xl border border-stone-200 bg-[#FBF8F2] shadow-xl"
            style={{ transformStyle: 'preserve-3d' }}
          >
            <div className="h-2 w-full" style={{ background: color }} />
            <div className="px-4 pb-4 pt-3">
              {group ? (
                <p className="text-[10px] tracking-[0.14em] text-stone-500">{group}</p>
              ) : null}
              <h3
                className="mt-1 text-[20px] font-semibold text-stone-900"
                style={{ fontFamily: 'var(--phone-font, "Noto Serif SC", serif)' }}
              >
                {tile.name}
              </h3>
              {flavor ? <p className="mt-1.5 text-[12px] leading-relaxed text-stone-500">{flavor}</p> : null}
              <motion.p
                key={price}
                initial={{ y: 8, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="mt-3 text-[24px] font-semibold tabular-nums text-stone-900"
              >
                ¥{price.toLocaleString()}
              </motion.p>
              <div className="mt-4 flex gap-2">
                <Pressable
                  onClick={onSkip}
                  className="flex h-10 flex-1 items-center justify-center rounded-xl border border-stone-200 bg-white text-[14px] text-stone-600"
                >
                  跳过
                </Pressable>
                <Pressable
                  onClick={onBuy}
                  className="flex h-10 flex-1 items-center justify-center rounded-xl bg-[#0A0A0C] text-[14px] font-medium text-white"
                >
                  {buyLabel}
                </Pressable>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
