import { Compass, UserRound } from 'lucide-react'
import { motion } from 'framer-motion'

import { Pressable } from '../../components/Pressable'
import type { BeadCraftTab } from './types'

const TABS: { id: BeadCraftTab; label: string; Icon: typeof Compass }[] = [
  { id: 'plaza', label: '广场', Icon: Compass },
  { id: 'mine', label: '我的', Icon: UserRound },
]

export function BeadCraftTabBar({
  active,
  onChange,
}: {
  active: BeadCraftTab
  onChange: (tab: BeadCraftTab) => void
}) {
  return (
    <nav
      className="shrink-0 border-t border-[#f0e4dc] bg-white/90 backdrop-blur-xl"
      style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom, 0px))' }}
    >
      <div className="grid grid-cols-2 px-6 pt-2">
        {TABS.map(({ id, label, Icon }) => {
          const isActive = active === id
          return (
            <Pressable
              key={id}
              type="button"
              onClick={() => onChange(id)}
              className="flex flex-col items-center gap-1 py-2"
              aria-current={isActive ? 'page' : undefined}
            >
              <motion.div animate={{ scale: isActive ? 1.06 : 1 }} transition={{ type: 'spring', stiffness: 420, damping: 28 }}>
                <Icon
                  className="size-[22px]"
                  strokeWidth={isActive ? 1.7 : 1.25}
                  style={{ color: isActive ? '#ff7b9c' : '#c4b8b2' }}
                />
              </motion.div>
              <span
                className="text-[11px] font-medium"
                style={{ color: isActive ? '#ff7b9c' : '#b0a6a0' }}
              >
                {label}
              </span>
            </Pressable>
          )
        })}
      </div>
    </nav>
  )
}
