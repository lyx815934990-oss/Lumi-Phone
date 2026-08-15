import { AnimatePresence, motion } from 'framer-motion'
import { Check, Search, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { LA, LA_FONT_CN, laEase } from './loreArchiveTheme'

export type LoreEditorCharacter = {
  id: string
  name: string
  avatarUrl: string
  kind: 'npc' | 'player'
}

type Props = {
  open: boolean
  roster: LoreEditorCharacter[]
  /** null = 全部角色 */
  selectedIds: string[] | null
  onClose: () => void
  onConfirm: (next: { mode: 'all' } | { mode: 'characters'; ids: string[] }) => void
}

export function LoreArchiveCharacterPickerSheet({
  open,
  roster,
  selectedIds,
  onClose,
  onConfirm,
}: Props) {
  const [allMode, setAllMode] = useState(true)
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (!open) return
    setAllMode(selectedIds == null)
    setPicked(new Set(selectedIds ?? []))
    setQuery('')
  }, [open, selectedIds])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return roster
    return roster.filter(
      (c) => c.name.toLowerCase().includes(q) || c.id.toLowerCase().includes(q),
    )
  }, [roster, query])

  const toggle = (id: string) => {
    setAllMode(false)
    setPicked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const count = picked.size

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            aria-label="关闭"
            className="fixed inset-0 z-[42]"
            style={{ background: 'rgba(247, 246, 244, 0.72)', backdropFilter: 'blur(8px)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed inset-x-0 bottom-0 z-[43] mx-auto flex max-h-[86vh] w-full max-w-[560px] flex-col overflow-hidden rounded-t-[28px] border"
            style={{
              fontFamily: LA_FONT_CN,
              background: LA.card,
              borderColor: LA.hairline,
            }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.25, ease: laEase }}
            role="dialog"
            aria-modal="true"
          >
            <header className="flex shrink-0 items-center justify-between px-5 pb-2 pt-4">
              <h2 className="text-[16px] font-semibold" style={{ color: LA.ink }}>
                选择作用角色
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full"
                style={{ color: LA.mist }}
                aria-label="关闭"
              >
                <X className="size-4" strokeWidth={1.6} />
              </button>
            </header>

            <button
              type="button"
              onClick={() => {
                setAllMode(true)
                setPicked(new Set())
              }}
              className="mx-5 mb-3 flex items-center justify-between rounded-2xl border px-4 py-3 text-left"
              style={{
                borderColor: allMode ? LA.amber : LA.hairline,
                background: allMode ? LA.amberSoft : LA.paper,
                transition: 'border-color 200ms ease, background 200ms ease',
              }}
            >
              <div>
                <span className="text-[14px] font-medium" style={{ color: LA.ink }}>
                  全部角色
                </span>
                <p className="mt-0.5 text-[11px]" style={{ color: LA.mist }}>
                  与下方指定角色互斥；点选角色将取消此项
                </p>
              </div>
              <span
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border"
                style={{
                  borderColor: allMode ? LA.amber : LA.hairline,
                  background: allMode ? LA.amber : 'transparent',
                }}
              >
                {allMode ? <Check className="size-3 text-white" strokeWidth={2.4} /> : null}
              </span>
            </button>

            <div
              className="mx-5 mb-3 flex items-center gap-2 rounded-xl border px-3 py-2"
              style={{ borderColor: LA.hairline, background: LA.paper }}
            >
              <Search className="size-4 shrink-0" strokeWidth={1.6} style={{ color: LA.mist }} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="搜索角色"
                className="min-w-0 flex-1 bg-transparent text-[14px] outline-none"
                style={{ color: LA.ink }}
              />
            </div>

            <p className="mx-5 mb-2 text-[12px] font-medium" style={{ color: LA.mist }}>
              指定角色（可多选）
            </p>
            <div
              className="relative min-h-0 flex-1 overflow-y-auto px-5 pb-28"
              style={{ opacity: allMode ? 0.72 : 1 }}
            >
              <div className="grid grid-cols-3 gap-x-4 gap-y-6 pt-1">
                {filtered.map((c) => {
                  const on = !allMode && picked.has(c.id)
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggle(c.id)}
                      className="flex flex-col items-center gap-2"
                    >
                      <span className="relative">
                        <span
                          className="flex h-14 w-14 overflow-hidden rounded-full"
                          style={{
                            border: on ? `2px solid ${LA.amber}` : '2px solid transparent',
                            transition: 'border-color 200ms ease',
                          }}
                        >
                          {c.avatarUrl ? (
                            <img src={c.avatarUrl} alt="" className="h-full w-full object-cover" draggable={false} />
                          ) : (
                            <span
                              className="flex h-full w-full items-center justify-center text-[15px]"
                              style={{ background: LA.paper, color: LA.mist }}
                            >
                              {c.name.slice(0, 1)}
                            </span>
                          )}
                        </span>
                        <span
                          className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full border"
                          style={{
                            borderColor: on ? LA.amber : LA.hairline,
                            background: on ? LA.amber : LA.card,
                          }}
                        >
                          {on ? <Check className="size-3 text-white" strokeWidth={2.4} /> : null}
                        </span>
                      </span>
                      <span className="max-w-[72px] truncate text-[11px]" style={{ color: LA.mist }}>
                        {c.name}
                      </span>
                    </button>
                  )
                })}
              </div>
              {!filtered.length ? (
                <p className="py-10 text-center text-[13px]" style={{ color: LA.mist }}>
                  没有匹配的角色
                </p>
              ) : null}
            </div>

            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center px-5"
              style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom, 0px))' }}
            >
              <button
                type="button"
                className="pointer-events-auto rounded-full px-8 py-3 text-[14px] font-semibold text-white"
                style={{ background: LA.amber }}
                onClick={() => {
                  if (allMode || picked.size === 0) onConfirm({ mode: 'all' })
                  else onConfirm({ mode: 'characters', ids: [...picked] })
                  onClose()
                }}
              >
                完成（{allMode ? '全部' : count}）
              </button>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  )
}
