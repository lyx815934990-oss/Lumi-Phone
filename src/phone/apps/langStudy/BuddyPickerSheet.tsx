import { Check, Search, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Pressable } from '../../components/Pressable'
import type { LangStudyBuddy } from './langStudyTypes'
import { LS } from './langStudyTheme'

type Props = {
  open: boolean
  roster: LangStudyBuddy[]
  selectedIds: string[]
  onClose: () => void
  onConfirm: (ids: string[]) => void
}

export function BuddyPickerSheet({ open, roster, selectedIds, onClose, onConfirm }: Props) {
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (!open) return
    setPicked(new Set(selectedIds))
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
    setPicked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  if (!open) return null

  return (
    <div className="absolute inset-0 z-[40] flex min-h-0 flex-col" style={{ background: LS.pageBg }}>
      <header
        className="shrink-0 border-b px-3 pb-3"
        style={{
          borderColor: LS.hairline,
          paddingTop: 'max(12px, env(safe-area-inset-top, 0px))',
          background: 'rgba(244,247,245,0.96)',
        }}
      >
        <div className="flex items-center gap-2">
          <Pressable
            type="button"
            aria-label="关闭"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full"
            style={{ color: LS.ink }}
          >
            <X className="size-5" strokeWidth={2} />
          </Pressable>
          <h1 className="min-w-0 flex-1 text-center text-[17px] font-semibold" style={{ color: LS.ink }}>
            选择监督搭子
          </h1>
          <Pressable
            type="button"
            onClick={() => onConfirm([...picked])}
            className="rounded-full px-3 py-1.5 text-[13px] font-medium text-white"
            style={{ background: LS.accent }}
          >
            完成 ({picked.size})
          </Pressable>
        </div>
        <p className="mt-2 px-1 text-center text-[12px]" style={{ color: LS.mist }}>
          仅在本 App 内催进度，不会发微信消息
        </p>
        <div className="relative mt-3">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2"
            style={{ color: LS.mist }}
            strokeWidth={2}
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索通讯录好友"
            className="w-full rounded-xl border py-2.5 pl-9 pr-3 text-[14px] outline-none"
            style={{ borderColor: LS.hairline, background: LS.card, color: LS.ink }}
          />
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {filtered.length === 0 ? (
          <p className="py-10 text-center text-[13px]" style={{ color: LS.mist }}>
            {roster.length === 0 ? '暂无通讯录好友，请先在微信添加人设联系人' : '没有匹配的好友'}
          </p>
        ) : (
          <ul className="space-y-2">
            {filtered.map((c) => {
              const on = picked.has(c.id)
              return (
                <li key={c.id}>
                  <Pressable
                    type="button"
                    onClick={() => toggle(c.id)}
                    className="flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-left"
                    style={{
                      borderColor: on ? LS.accent : LS.hairline,
                      background: on ? LS.accentSoft : LS.card,
                    }}
                  >
                    <span
                      className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full text-[13px] font-semibold"
                      style={{ background: LS.soft, color: LS.accent }}
                    >
                      {c.avatarUrl ? (
                        <img src={c.avatarUrl} alt="" className="size-full object-cover" />
                      ) : (
                        (c.name.trim().slice(0, 1) || '?')
                      )}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[15px] font-medium" style={{ color: LS.ink }}>
                      {c.name}
                    </span>
                    <span
                      className="flex size-6 shrink-0 items-center justify-center rounded-full"
                      style={{
                        background: on ? LS.accent : 'transparent',
                        border: on ? 'none' : `1.5px solid ${LS.mist}`,
                      }}
                    >
                      {on ? <Check className="size-3.5 text-white" strokeWidth={2.5} /> : null}
                    </span>
                  </Pressable>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
