import { useMemo, useState } from 'react'
import { Pressable } from '../../../../../components/Pressable'
import { WebPageThumb } from '../components/WebPageThumb'
import type { BookmarkFolder, BookmarkItem } from '../types'

export function BookmarksScreen({
  folders,
  bookmarks,
  editing,
  readOnly = false,
  onToggleEdit,
  onOpen,
  onDeleteSelected,
}: {
  folders: BookmarkFolder[]
  bookmarks: BookmarkItem[]
  editing: boolean
  readOnly?: boolean
  onToggleEdit: () => void
  onOpen: (item: BookmarkItem) => void
  onDeleteSelected: (ids: string[]) => void
}) {
  const [folderId, setFolderId] = useState('all')
  const [selected, setSelected] = useState<string[]>([])

  const counts = useMemo(() => {
    const map: Record<string, number> = { all: bookmarks.length }
    for (const b of bookmarks) {
      map[b.folderId] = (map[b.folderId] || 0) + 1
    }
    return map
  }, [bookmarks])

  const rows = useMemo(
    () => bookmarks.filter((b) => folderId === 'all' || b.folderId === folderId),
    [bookmarks, folderId],
  )

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-4 pb-2 pt-2">
        <div className="text-[17px] font-medium text-[var(--br-ink)]">收藏</div>
        {!readOnly ? (
          <Pressable
            type="button"
            className="text-[13px] text-[var(--br-mist)]"
            onClick={() => {
              if (editing && selected.length) onDeleteSelected(selected)
              setSelected([])
              onToggleEdit()
            }}
          >
            {editing ? (selected.length ? `删除(${selected.length})` : '完成') : '编辑'}
          </Pressable>
        ) : (
          <div className="text-[11px] text-[var(--br-mist)]">只读</div>
        )}
      </div>

      <div className="browser-scroll flex gap-2 overflow-x-auto px-4 pb-3">
        {folders.map((f) => {
          const n = counts[f.id] ?? 0
          return (
            <Pressable
              key={f.id}
              type="button"
              className="browser-chip"
              data-active={folderId === f.id}
              onClick={() => setFolderId(f.id)}
            >
              {f.name}
              <span className="ml-1 opacity-60">{n}</span>
            </Pressable>
          )
        })}
      </div>

      <div className="browser-scroll flex-1 overflow-y-auto pb-28">
        <div className="browser-trace">
          {rows.map((item, idx) => {
            const checked = selected.includes(item.id)
            return (
              <div key={item.id}>
                {idx > 0 ? <div className="ml-7 h-px bg-[var(--br-hairline)]" /> : null}
                <Pressable
                  type="button"
                  className="relative flex w-full items-center gap-3 py-3 pr-4 text-left"
                  onClick={() => {
                    if (!readOnly && editing) {
                      setSelected((prev) => (checked ? prev.filter((x) => x !== item.id) : [...prev, item.id]))
                      return
                    }
                    onOpen(item)
                  }}
                >
                  <span className="browser-trace-dot browser-trace-dot--solid" aria-hidden />
                  {!readOnly && editing ? (
                    <span
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border"
                      style={{
                        borderColor: checked ? 'var(--br-fog)' : 'var(--br-hairline)',
                        background: checked ? 'var(--br-fog)' : 'transparent',
                      }}
                    />
                  ) : null}
                  <WebPageThumb
                    className="h-12 w-[72px] shrink-0 !rounded-[8px]"
                    compact
                    title={item.title}
                    seed={item.id}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14px] text-[var(--br-ink)]">{item.title}</div>
                    <div className="mt-0.5 truncate text-[12px] text-[var(--br-mist)]">{item.siteName}</div>
                    <div className="browser-mono mt-0.5 text-[11px] text-[var(--br-mist)]">{item.savedAt}</div>
                  </div>
                </Pressable>
              </div>
            )
          })}
        </div>
        {!rows.length ? (
          <div className="px-4 pt-16 text-center text-[13px] text-[var(--br-mist)]">这个分组里还没有收藏</div>
        ) : null}
      </div>
    </div>
  )
}
