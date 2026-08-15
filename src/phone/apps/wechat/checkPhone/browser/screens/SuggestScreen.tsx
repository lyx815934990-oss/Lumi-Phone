import { Clock3, CornerDownLeft, Search } from 'lucide-react'
import { Pressable } from '../../../../../components/Pressable'
import { HighlightText } from '../components/HighlightText'
import type { SuggestItem } from '../types'

export function SuggestScreen({
  query,
  items,
  onChangeQuery,
  onCancel,
  onSubmit,
  onPick,
  onFill,
}: {
  query: string
  items: SuggestItem[]
  onChangeQuery: (v: string) => void
  onCancel: () => void
  onSubmit: (q: string) => void
  onPick: (text: string) => void
  onFill: (text: string) => void
}) {
  const filtered = items.filter((it) => !query.trim() || it.text.toLowerCase().includes(query.trim().toLowerCase()))

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-4 pb-2 pt-1">
        <div
          className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-[var(--br-radius-pill)] border bg-[var(--br-card)] px-3.5"
          style={{ borderWidth: 1.5, borderColor: 'var(--br-fog)' }}
        >
          <Search size={14} strokeWidth={1.6} className="text-[var(--br-mist)]" />
          <input
            autoFocus
            value={query}
            onChange={(e) => onChangeQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && query.trim()) onSubmit(query.trim())
            }}
            placeholder="搜索或输入网址"
            className="min-w-0 flex-1 bg-transparent text-[14px] text-[var(--br-ink)] outline-none placeholder:text-[var(--br-mist)]"
          />
        </div>
        <Pressable type="button" className="shrink-0 px-1 text-[14px] text-[var(--br-ink)]" onClick={onCancel}>
          取消
        </Pressable>
      </div>

      <div className="browser-scroll flex-1 overflow-y-auto pb-28">
        {filtered.map((it, idx) => {
          const isSearchHistory = it.source === 'history'
          return (
            <div key={it.id}>
              {idx > 0 ? <div className="mx-4 h-px bg-[var(--br-hairline)]" /> : null}
              <div className="flex h-12 items-center gap-3 px-4">
                {isSearchHistory ? (
                  <div className="flex min-w-0 flex-1 items-center gap-3 text-left">
                    <Clock3 size={14} strokeWidth={1.6} className="shrink-0 text-[var(--br-mist)]" />
                    <HighlightText text={it.text} query={query} className="truncate text-[14px] text-[var(--br-ink)]" />
                    <span className="shrink-0 text-[10px] text-[var(--br-mist)]">仅查看</span>
                  </div>
                ) : (
                  <>
                    <Pressable
                      type="button"
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                      onClick={() => onPick(it.text)}
                    >
                      <Search size={14} strokeWidth={1.6} className="shrink-0 text-[var(--br-mist)]" />
                      <HighlightText text={it.text} query={query} className="truncate text-[14px] text-[var(--br-ink)]" />
                    </Pressable>
                    <Pressable
                      type="button"
                      className="flex h-8 w-8 items-center justify-center text-[var(--br-mist)]"
                      aria-label="填入"
                      onClick={() => onFill(it.text)}
                    >
                      <CornerDownLeft size={14} strokeWidth={1.6} />
                    </Pressable>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
