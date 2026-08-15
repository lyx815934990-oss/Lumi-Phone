import { Link2, Plus, Search } from 'lucide-react'
import { ListenNumericText } from '../../../../components/discoverListen/ListenNum'
import type { MemoryArchiveAccountOption } from './memoryArchiveAccountScope'
import { MemoryArchiveAccountPicker } from './MemoryArchiveAccountPicker'
import {
  ARCHIVE_BG,
  ARCHIVE_MAG_KICKER,
  ARCHIVE_MAG_STAT,
  ARCHIVE_MAG_TITLE,
} from './memoryArchiveTheme'

/** 角色列表页顶栏（详情页使用 {@link MemoryCharacterDetailView}） */
export function MemoryArchiveHeader({
  search,
  onSearchChange,
  accountOptions,
  selectedAccountId,
  onAccountChange,
  onCreate,
  alignUserBusy,
  alignUserDisabled,
  alignUserTitle,
  onAlignUser,
  alignUserToast,
  rosterSummary,
}: {
  search: string
  onSearchChange: (v: string) => void
  accountOptions: MemoryArchiveAccountOption[]
  selectedAccountId: string
  onAccountChange: (accountId: string) => void
  onCreate: () => void
  alignUserBusy?: boolean
  alignUserDisabled?: boolean
  alignUserTitle?: string
  onAlignUser?: () => void
  alignUserToast?: string | null
  rosterSummary?: { characterCount: number; memoryCount: number; onlineCount: number; offlineCount: number }
}) {
  const hasStats = rosterSummary && rosterSummary.characterCount > 0

  return (
    <div className="sticky top-0 z-20 px-4 pb-3 pt-2" style={{ background: ARCHIVE_BG }}>
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className={ARCHIVE_MAG_KICKER}>Character archive</p>
          <h2 className={`mt-1 ${ARCHIVE_MAG_TITLE}`}>角色记忆</h2>
          {hasStats ? (
            <p className={`mt-1.5 ${ARCHIVE_MAG_STAT}`}>
              <ListenNumericText
                text={`${rosterSummary.characterCount} 人 · 线上 ${rosterSummary.onlineCount} · 线下 ${rosterSummary.offlineCount}`}
              />
            </p>
          ) : (
            <p className={`mt-1.5 ${ARCHIVE_MAG_STAT}`}>按角色浏览线上总结与线下摘要</p>
          )}
        </div>
        <button
          type="button"
          data-memory-coach="create"
          onClick={onCreate}
          className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#111] text-white shadow-[0_8px_20px_rgba(0,0,0,0.12)] transition-opacity active:opacity-90"
          aria-label="新建记忆"
        >
          <Plus className="size-[17px]" strokeWidth={1.75} />
        </button>
      </div>

      <div className="mt-3.5 flex items-center gap-2">
        <div data-memory-coach="search" className="relative min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[#C0C0C4]"
            strokeWidth={1.75}
          />
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="搜索角色"
            className="w-full rounded-full border-0 bg-white py-2.5 pl-9 pr-3 text-[13px] text-[#111] outline-none ring-1 ring-black/[0.06] placeholder:text-[#B0B0B4] focus:ring-black/15"
            spellCheck={false}
          />
        </div>
        {onAlignUser ? (
          <button
            type="button"
            data-memory-coach="align"
            disabled={alignUserBusy || alignUserDisabled}
            onClick={onAlignUser}
            title={alignUserTitle || '对齐 {{user}} 占位符'}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-black/[0.06] bg-white text-[#555] active:bg-black/[0.03] disabled:opacity-40"
            aria-label={alignUserBusy ? '对齐中' : '对齐 user 占位符'}
          >
            <Link2 className="size-3.5" strokeWidth={1.6} />
          </button>
        ) : null}
      </div>

      <div className="mt-3">
        <MemoryArchiveAccountPicker
          accounts={accountOptions}
          selectedAccountId={selectedAccountId}
          onSelect={onAccountChange}
          variant="roster"
        />
      </div>

      {alignUserToast ? (
        <p className="mt-2 rounded-2xl border border-black/[0.05] bg-white px-3.5 py-2.5 text-[11px] leading-relaxed text-[#8A8A8E]">
          {alignUserToast}
        </p>
      ) : null}
    </div>
  )
}
