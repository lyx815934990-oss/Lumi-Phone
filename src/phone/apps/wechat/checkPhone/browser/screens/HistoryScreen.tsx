import { useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Link2, Star, Trash2 } from 'lucide-react'
import { Pressable } from '../../../../../components/Pressable'
import type { HistoryGroup, HistoryItem } from '../types'

const GROUP_LABEL: Record<HistoryGroup, string> = {
  today: '今天',
  yesterday: '昨天',
  earlier: '更早',
}

const EASE = [0.25, 0.1, 0.25, 1] as const

export function HistoryScreen({
  items,
  onOpen,
  readOnly = false,
  onClear,
  onDelete,
  onCopy,
  onBookmark,
}: {
  items: HistoryItem[]
  onOpen: (item: HistoryItem) => void
  readOnly?: boolean
  onClear?: () => void
  onDelete?: (id: string) => void
  onCopy?: (url: string) => void
  onBookmark?: (item: HistoryItem) => void
}) {
  const [sheetItem, setSheetItem] = useState<HistoryItem | null>(null)
  const timerRef = useRef<number | null>(null)

  const groups = useMemo(() => {
    const order: HistoryGroup[] = ['today', 'yesterday', 'earlier']
    return order
      .map((g) => ({ group: g, rows: items.filter((i) => i.group === g) }))
      .filter((g) => g.rows.length)
  }, [items])

  const onPointerDown = (item: HistoryItem) => {
    if (readOnly) return
    timerRef.current = window.setTimeout(() => setSheetItem(item), 420)
  }
  const clearTimer = () => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  return (
    <div className="relative flex h-full flex-col">
      <div className="flex items-center justify-between px-4 pb-3 pt-2">
        <div className="text-[17px] font-medium text-[var(--br-ink)]">历史记录</div>
        {!readOnly && onClear ? (
          <Pressable type="button" className="text-[13px] text-[var(--br-mist)]" onClick={onClear}>
            清除
          </Pressable>
        ) : (
          <div className="text-[11px] text-[var(--br-mist)]">只读</div>
        )}
      </div>

      <div className="browser-scroll flex-1 overflow-y-auto pb-28">
        {groups.map(({ group, rows }) => (
          <div key={group}>
            <div className="sticky top-0 z-[1] bg-[var(--br-paper)]/95 px-4 py-2 backdrop-blur-sm">
              <div className="browser-mono text-[12px] text-[var(--br-mist)]">{GROUP_LABEL[group]}</div>
            </div>
            <div className="browser-trace">
              {rows.map((item, idx) => {
                const isSearch = item.pageKind === 'serp' || /^搜索[：:]/.test(item.title)
                return (
                  <div key={item.id}>
                    {idx > 0 ? <div className="ml-7 h-px bg-[var(--br-hairline)]" /> : null}
                    {isSearch ? (
                      <div className="relative flex h-[52px] w-full items-center gap-2.5 pr-4 text-left">
                        <span className="browser-trace-dot" aria-hidden />
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[6px] bg-[var(--br-hairline)] text-[10px]">
                          搜
                        </span>
                        <span className="min-w-0 flex-1 truncate text-[14px] text-[var(--br-ink)]">{item.title}</span>
                        <span className="shrink-0 text-[10px] text-[var(--br-mist)]">仅查看</span>
                        <span className="browser-mono shrink-0 text-[11px] text-[var(--br-mist)]">{item.timeLabel}</span>
                      </div>
                    ) : (
                      <Pressable
                        type="button"
                        className="relative flex h-[52px] w-full items-center gap-2.5 pr-4 text-left"
                        onPointerDown={() => onPointerDown(item)}
                        onPointerUp={clearTimer}
                        onPointerLeave={clearTimer}
                        onPointerCancel={clearTimer}
                        onClick={() => onOpen(item)}
                        onContextMenu={(e) => e.preventDefault()}
                      >
                        <span className="browser-trace-dot" aria-hidden />
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[6px] bg-[var(--br-hairline)] text-[10px]">
                          {item.host.slice(0, 1).toUpperCase()}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-[14px] text-[var(--br-ink)]">{item.title}</span>
                        <span className="browser-mono shrink-0 text-[11px] text-[var(--br-mist)]">{item.timeLabel}</span>
                      </Pressable>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
        {!items.length ? (
          <div className="px-4 pt-16 text-center text-[13px] text-[var(--br-mist)]">还没有浏览痕迹</div>
        ) : null}
      </div>

      <AnimatePresence>
        {sheetItem ? (
          <motion.div
            className="absolute inset-0 z-30 flex items-end bg-black/20 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setSheetItem(null)
            }}
          >
            <motion.div
              className="browser-sheet w-full overflow-hidden"
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 16, opacity: 0 }}
              transition={{ duration: 0.15, ease: EASE }}
            >
              {[
                  {
                    label: '删除',
                    icon: Trash2,
                    run: () => {
                      onDelete?.(sheetItem.id)
                      setSheetItem(null)
                    },
                  },
                  {
                    label: '复制链接',
                    icon: Link2,
                    run: () => {
                      onCopy?.(sheetItem.url)
                      setSheetItem(null)
                    },
                  },
                  {
                    label: '收藏',
                    icon: Star,
                    run: () => {
                      onBookmark?.(sheetItem)
                      setSheetItem(null)
                    },
                  },
              ].map((opt, i) => (
                <div key={opt.label}>
                  {i > 0 ? <div className="h-px bg-[var(--br-hairline)]" /> : null}
                  <Pressable
                    type="button"
                    className="flex h-12 w-full items-center gap-3 px-4 text-[14px] text-[var(--br-ink)]"
                    onClick={opt.run}
                  >
                    <opt.icon size={15} strokeWidth={1.6} className="text-[var(--br-mist)]" />
                    {opt.label}
                  </Pressable>
                </div>
              ))}
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
