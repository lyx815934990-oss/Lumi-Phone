import { AnimatePresence, motion } from 'framer-motion'
import { createPortal } from 'react-dom'

export type StoryPlotContextMenuItem = {
  id: string
  label: string
  danger?: boolean
  disabled?: boolean
  onSelect: () => void
}

type Props = {
  open: boolean
  x: number
  y: number
  items: StoryPlotContextMenuItem[]
  onClose: () => void
}

function readStoryRpgThemeVars(): Record<string, string> {
  if (typeof document === 'undefined') return {}
  const root = document.querySelector('.story-rpg-root') as HTMLElement | null
  if (!root) return {}
  const cs = getComputedStyle(root)
  const keys = [
    '--sr-panel-elevated',
    '--sr-border',
    '--sr-text',
    '--sr-glass',
    '--ds-danger',
  ] as const
  const out: Record<string, string> = {}
  for (const k of keys) {
    const v = cs.getPropertyValue(k).trim()
    if (v) out[k] = v
  }
  return out
}

/** 长按剧情卡片 · 横向紧凑动作条（portal 到 body；勿挂 story-rpg-root，会 min-height:100% 撑满屏） */
export function StoryPlotContextMenu({ open, x, y, items, onClose }: Props) {
  if (typeof document === 'undefined') return null

  const itemCount = Math.max(1, items.length)
  const approxW = Math.min(280, Math.max(132, itemCount * 72 + 8))
  const left = Math.min(window.innerWidth - approxW - 8, Math.max(8, x - approxW / 2))
  const top = Math.min(window.innerHeight - 48, Math.max(8, y - 40))
  const themeVars = open ? readStoryRpgThemeVars() : {}

  return createPortal(
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            key="sr-plot-ctx-bg"
            role="presentation"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[260]"
            style={{ background: 'transparent' }}
            onClick={onClose}
          />
          <motion.div
            key="sr-plot-ctx-menu"
            role="menu"
            initial={{ opacity: 0, y: 4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 2, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 480, damping: 36 }}
            style={{
              ...themeVars,
              position: 'fixed',
              left,
              top,
              zIndex: 261,
              height: 36,
              minHeight: 36,
              maxHeight: 36,
              width: 'max-content',
              background: 'var(--sr-panel-elevated, #f7f1f4)',
              borderColor: 'var(--sr-border, rgba(95,95,95,0.12))',
              color: 'var(--sr-text, #5f5f5f)',
              boxShadow: '0 8px 24px rgba(0,0,0,0.16)',
            }}
            className="inline-flex items-center overflow-hidden rounded-full border backdrop-blur-xl"
          >
            {items.map((item, i) => (
              <button
                key={item.id}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                className={`h-9 shrink-0 px-3.5 text-center text-[12px] leading-none transition-colors disabled:opacity-40 ${
                  i > 0 ? 'border-l border-[var(--sr-border,rgba(95,95,95,0.12))]' : ''
                } ${
                  item.danger
                    ? 'font-medium text-[var(--ds-danger,#c06b6b)] active:bg-black/[0.04]'
                    : 'text-[var(--sr-text,#5f5f5f)] active:bg-black/[0.04]'
                }`}
                onClick={() => {
                  if (item.disabled) return
                  onClose()
                  item.onSelect()
                }}
              >
                {item.label}
              </button>
            ))}
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>,
    document.body,
  )
}
