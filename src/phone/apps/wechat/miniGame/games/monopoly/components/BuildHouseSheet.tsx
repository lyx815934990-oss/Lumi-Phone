import { AnimatePresence, motion } from 'framer-motion'

import { Pressable } from '../../../../../../components/Pressable'
import {
  COLOR_GROUP_HEX,
  COLOR_GROUP_LABEL,
  type MonopolyColorGroup,
  type MonopolyTileDef,
} from '../monopolyTypes'

export type BuildCandidate = {
  tile: MonopolyTileDef
  houses: number
  cost: number
  canAfford: boolean
}

export function BuildHouseSheet({
  open,
  candidates,
  onBuild,
  onClose,
}: {
  open: boolean
  candidates: BuildCandidate[]
  onBuild: (tileId: number) => void
  onClose: () => void
}) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-40 flex items-end justify-center bg-black/25 backdrop-blur-[2px]"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose()
          }}
        >
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 340, damping: 30 }}
            className="w-full max-w-[400px] rounded-t-2xl border border-stone-200 bg-[#FBF8F2] px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-3 shadow-xl"
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-stone-300/80" />
            <div className="mb-2 flex items-center justify-between">
              <h3
                className="text-[16px] font-semibold text-stone-900"
                style={{ fontFamily: 'var(--phone-font, "Noto Serif SC", serif)' }}
              >
                加盖房屋
              </h3>
              <Pressable onClick={onClose} className="px-2 py-1 text-[12px] text-stone-500">
                关闭
              </Pressable>
            </div>
            <p className="mb-3 text-[11px] text-stone-500">收齐同色地产后可加盖，提升租金。</p>
            {candidates.length === 0 ? (
              <p className="py-6 text-center text-[13px] text-stone-400">暂无可盖地产</p>
            ) : (
              <ul className="max-h-[40vh] space-y-2 overflow-y-auto">
                {candidates.map((c) => {
                  const group = c.tile.colorGroup as MonopolyColorGroup
                  const color = COLOR_GROUP_HEX[group]
                  const isHotel = c.houses >= 5
                  return (
                    <li
                      key={c.tile.id}
                      className="flex items-center gap-3 rounded-xl border border-stone-200/90 bg-white/80 px-3 py-2.5"
                    >
                      <span className="h-8 w-1.5 shrink-0 rounded-full" style={{ background: color }} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium text-stone-800">{c.tile.name}</p>
                        <p className="text-[10px] text-stone-500">
                          {COLOR_GROUP_LABEL[group]} · {isHotel ? '酒店' : `${c.houses} 栋`}
                          {!isHotel ? ` · 下一级 ¥${c.cost.toLocaleString()}` : ''}
                        </p>
                      </div>
                      <Pressable
                        disabled={isHotel || !c.canAfford}
                        onClick={() => onBuild(c.tile.id)}
                        className={`rounded-xl px-3 py-1.5 text-[12px] font-medium ${
                          isHotel || !c.canAfford
                            ? 'bg-stone-100 text-stone-400'
                            : 'bg-[#0A0A0C] text-white active:opacity-90'
                        }`}
                      >
                        {isHotel ? '已满' : c.canAfford ? '加盖' : '不足'}
                      </Pressable>
                    </li>
                  )
                })}
              </ul>
            )}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
