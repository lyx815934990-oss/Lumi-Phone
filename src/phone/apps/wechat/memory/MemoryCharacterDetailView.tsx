import { Link2, MoreHorizontal, Plus, Search, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ListenNumericText } from '../../../../components/discoverListen/ListenNum'
import type { MemoryArchiveAccountOption } from './memoryArchiveAccountScope'
import { MemoryArchiveAccountPicker } from './MemoryArchiveAccountPicker'
import type { MemoryCharacterRosterItem, MemoryTypeFilterId } from './memoryArchiveTypes'
import { ARCHIVE_BG, ARCHIVE_SOFT_CHIP } from './memoryArchiveTheme'
import { MemoryTypeFilterChips } from './MemoryTypeFilterChips'
import { memorySceneFilterLabel } from './memorySceneChipStyles'

export function MemoryCharacterDetailView({
  character,
  rosterIndex,
  rosterTotal: _rosterTotal,
  search,
  onSearchChange,
  accountOptions,
  selectedAccountId,
  onAccountChange,
  typeFilters,
  onTypeFiltersChange,
  availableTypeFilters,
  filteredCount,
  totalCount,
  onCreate,
  onOpenTutorial,
  onAlignUser,
  onClearAll,
  clearAllDisabled,
  alignUserBusy,
  alignUserDisabled,
  alignUserTitle,
  alignUserToast,
  children,
  layout = 'standalone',
}: {
  character: MemoryCharacterRosterItem
  rosterIndex: number
  rosterTotal: number
  search: string
  onSearchChange: (v: string) => void
  accountOptions: MemoryArchiveAccountOption[]
  selectedAccountId: string
  onAccountChange: (accountId: string) => void
  typeFilters: ReadonlySet<MemoryTypeFilterId>
  onTypeFiltersChange: (next: ReadonlySet<MemoryTypeFilterId>) => void
  availableTypeFilters?: ReadonlySet<MemoryTypeFilterId>
  filteredCount: number
  totalCount: number
  onCreate: () => void
  onOpenTutorial?: () => void
  onAlignUser?: () => void
  onClearAll?: () => void
  clearAllDisabled?: boolean
  alignUserBusy?: boolean
  alignUserDisabled?: boolean
  alignUserTitle?: string
  alignUserToast?: string | null
  children: ReactNode
  /** standalone：完整角色页；onlineSection：嵌入统一详情，仅线上总结区块 */
  layout?: 'standalone' | 'onlineSection'
}) {
  const [toolsOpen, setToolsOpen] = useState(false)
  const toolsRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!toolsOpen) return
    const onOutside = (e: MouseEvent | TouchEvent) => {
      const t = e.target
      if (!(t instanceof Node) || toolsRef.current?.contains(t)) return
      setToolsOpen(false)
    }
    document.addEventListener('mousedown', onOutside)
    document.addEventListener('touchstart', onOutside, { passive: true })
    return () => {
      document.removeEventListener('mousedown', onOutside)
      document.removeEventListener('touchstart', onOutside)
    }
  }, [toolsOpen])

  const isOnlineSection = layout === 'onlineSection'
  void rosterIndex

  return (
    <div className="pb-6">
      <div className={isOnlineSection ? 'px-4' : 'px-4 pt-2'} style={{ background: ARCHIVE_BG }}>
        {alignUserToast && !isOnlineSection ? (
          <p className="mb-3 rounded-2xl border border-black/[0.05] bg-white px-3.5 py-2.5 text-[11px] leading-relaxed text-[#8A8A8E]">
            {alignUserToast}
          </p>
        ) : null}

        {!isOnlineSection ? (
          <div className="relative rounded-[20px] border border-black/[0.05] bg-white px-3.5 py-3.5 shadow-[0_8px_28px_rgba(16,16,18,0.04)]">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-[14px] bg-black/[0.04]">
                  {character.avatarUrl ? (
                    <img src={character.avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-[13px] font-semibold text-[#8A8A8E]">
                      {character.displayName.slice(0, 2)}
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[17px] font-semibold tracking-tight text-[#111]">
                    {character.displayName}
                  </p>
                  <p className="mt-0.5 text-[11px] text-[#8A8A8E]">
                    <ListenNumericText
                      text={
                        `共 ${totalCount} 条记忆` +
                        (filteredCount !== totalCount ? ` · 已筛 ${filteredCount}` : '')
                      }
                    />
                  </p>
                  {character.sceneTags.length ? (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {character.sceneTags.map((tag) => (
                        <span key={tag} className={ARCHIVE_SOFT_CHIP}>
                          {memorySceneFilterLabel(tag)}
                        </span>
                      ))}
                    </div>
                  ) : totalCount === 0 ? (
                    <p className="mt-1.5 text-[11px] text-[#8A8A8E]">当前账号下暂无记忆</p>
                  ) : null}
                </div>
              </div>
              <div className="relative shrink-0" ref={toolsRef}>
                <button
                  type="button"
                  onClick={() => setToolsOpen((v) => !v)}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-black/[0.04] text-[#555]"
                  aria-label="更多操作"
                  aria-expanded={toolsOpen}
                >
                  <MoreHorizontal className="size-[17px]" strokeWidth={1.5} />
                </button>
                {toolsOpen ? (
                  <div className="absolute right-0 top-full z-30 mt-1.5 min-w-[148px] overflow-hidden rounded-2xl border border-black/[0.06] bg-white py-1 shadow-[0_12px_40px_rgba(0,0,0,0.1)]">
                    {onOpenTutorial ? (
                      <button
                        type="button"
                        className="w-full px-3.5 py-2.5 text-left text-[13px] text-[#222] active:bg-black/[0.03]"
                        onClick={() => {
                          setToolsOpen(false)
                          onOpenTutorial()
                        }}
                      >
                        教程说明
                      </button>
                    ) : null}
                    {onAlignUser ? (
                      <button
                        type="button"
                        data-memory-coach="align"
                        disabled={alignUserBusy || alignUserDisabled}
                        title={alignUserTitle}
                        className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-[13px] text-[#222] active:bg-black/[0.03] disabled:opacity-45"
                        onClick={() => {
                          setToolsOpen(false)
                          onAlignUser()
                        }}
                      >
                        <Link2 className="size-3.5" strokeWidth={1.5} />
                        {alignUserBusy ? '对齐中…' : '对齐 {{user}}'}
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                data-memory-coach="create"
                onClick={onCreate}
                className="flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full bg-[#111] py-2.5 text-[13px] font-semibold text-white active:opacity-90"
              >
                <Plus className="size-3.5" strokeWidth={2} />
                刻录记忆
              </button>
              {onClearAll ? (
                <button
                  type="button"
                  data-memory-coach="clear-all"
                  disabled={clearAllDisabled}
                  onClick={onClearAll}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-black/[0.08] text-[#B42318] active:bg-black/[0.03] disabled:opacity-40"
                  aria-label="清空全部记忆"
                >
                  <Trash2 className="size-3.5" strokeWidth={1.75} />
                </button>
              ) : null}
            </div>
          </div>
        ) : null}

        <div
          className={`sticky top-0 z-20 space-y-2.5 rounded-[18px] border border-black/[0.05] bg-white/95 px-3.5 py-3 shadow-[0_8px_28px_rgba(16,16,18,0.04)] backdrop-blur-sm ${
            isOnlineSection ? 'mt-0' : 'mt-3'
          }`}
        >
          <div className="flex items-center gap-2">
            <div
              data-memory-coach="search"
              className="flex min-w-0 flex-1 items-center gap-2 rounded-full bg-black/[0.035] px-3 py-2"
            >
              <Search className="size-3.5 shrink-0 text-[#C0C0C4]" strokeWidth={1.5} />
              <input
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="搜索记忆…"
                className="min-w-0 flex-1 bg-transparent text-[13px] text-[#111] outline-none placeholder:text-[#B0B0B4]"
                spellCheck={false}
              />
            </div>
            {isOnlineSection ? (
              <button
                type="button"
                data-memory-coach="create"
                onClick={onCreate}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#111] text-white active:opacity-90"
                aria-label="刻录记忆"
              >
                <Plus className="size-4" strokeWidth={2} />
              </button>
            ) : null}
            {isOnlineSection && onAlignUser ? (
              <button
                type="button"
                data-memory-coach="align"
                disabled={alignUserBusy || alignUserDisabled}
                title={alignUserTitle}
                onClick={onAlignUser}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-black/[0.06] text-[#555] active:bg-black/[0.03] disabled:opacity-40"
                aria-label={alignUserBusy ? '对齐中' : '对齐 user 占位符'}
              >
                <Link2 className="size-3.5" strokeWidth={1.5} />
              </button>
            ) : null}
          </div>

          {alignUserToast && isOnlineSection ? (
            <p className="rounded-xl bg-black/[0.03] px-3 py-2 text-[11px] leading-relaxed text-[#8A8A8E]">
              {alignUserToast}
            </p>
          ) : null}

          <MemoryArchiveAccountPicker
            accounts={accountOptions}
            selectedAccountId={selectedAccountId}
            onSelect={onAccountChange}
            compact
          />

          <div>
            <p className="mb-1.5 text-[10px] font-medium tracking-[0.12em] text-[#8A8A8E]">分类</p>
            <MemoryTypeFilterChips
              value={typeFilters}
              onChange={onTypeFiltersChange}
              available={availableTypeFilters}
              wrap
              monochrome
            />
          </div>
        </div>
      </div>

      <div className="mt-1">{children}</div>
    </div>
  )
}
