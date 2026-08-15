import { MoreHorizontal, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { ListenNumericText } from '../../../../components/discoverListen/ListenNum'
import type { MemoryUnifiedRosterItem } from './memoryUnifiedSummaryArchive'
import {
  ARCHIVE_BG,
  ARCHIVE_COVER_FALLBACK_BG,
  ARCHIVE_SOFT_CHIP,
} from './memoryArchiveTheme'

export function MemoryUnifiedCharacterHero({
  character,
  rosterIndex,
  rosterTotal,
  onClearAll,
  clearAllDisabled,
}: {
  character: MemoryUnifiedRosterItem
  rosterIndex: number
  rosterTotal: number
  onClearAll?: () => void
  clearAllDisabled?: boolean
}) {
  const { onlineMemoryCount, offlineRowCount } = character
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!menuOpen) return
    const onOutside = (e: MouseEvent | TouchEvent) => {
      const t = e.target
      if (!(t instanceof Node) || menuRef.current?.contains(t)) return
      setMenuOpen(false)
    }
    document.addEventListener('mousedown', onOutside)
    document.addEventListener('touchstart', onOutside, { passive: true })
    return () => {
      document.removeEventListener('mousedown', onOutside)
      document.removeEventListener('touchstart', onOutside)
    }
  }, [menuOpen])

  return (
    <div className="px-4 pb-1 pt-2" style={{ background: ARCHIVE_BG }}>
      <div
        data-memory-coach="detail-hero"
        className="relative rounded-[20px] border border-black/[0.05] bg-white px-3.5 py-3.5 shadow-[0_8px_28px_rgba(16,16,18,0.04)]"
      >
        <div className="flex items-center gap-3.5">
          <div className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-[16px]">
            {character.avatarUrl ? (
              <img
                src={character.avatarUrl}
                alt=""
                className="h-full w-full object-cover"
                draggable={false}
              />
            ) : (
              <div
                className="flex h-full w-full items-center justify-center"
                style={{ background: ARCHIVE_COVER_FALLBACK_BG }}
              >
                <span className="text-[20px] font-semibold tracking-tight text-white/55">
                  {character.displayName.slice(0, 2)}
                </span>
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-medium tracking-[0.14em] text-[#8A8A8E]">
              <ListenNumericText
                text={
                  (rosterIndex >= 0 ? `${rosterIndex + 1} / ${rosterTotal} · ` : '') +
                  `${character.memoryCount} 条记录`
                }
              />
            </p>
            <p className="mt-1 truncate text-[20px] font-semibold tracking-tight text-[#111]">
              {character.displayName}
            </p>
            {character.wechatRemarkName ? (
              <p className="mt-0.5 truncate text-[12px] text-[#8A8A8E]">备注 {character.wechatRemarkName}</p>
            ) : null}
            <div className="mt-2 flex flex-wrap gap-1">
              {onlineMemoryCount > 0 ? (
                <span className={ARCHIVE_SOFT_CHIP}>线上 {onlineMemoryCount}</span>
              ) : null}
              {offlineRowCount > 0 ? (
                <span className={ARCHIVE_SOFT_CHIP}>线下 {offlineRowCount}</span>
              ) : null}
            </div>
          </div>

          {onClearAll ? (
            <div className="relative shrink-0 self-start" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-black/[0.04] text-[#555] active:bg-black/[0.07]"
                aria-label="更多操作"
                aria-expanded={menuOpen}
              >
                <MoreHorizontal className="size-[17px]" strokeWidth={1.6} />
              </button>
              {menuOpen ? (
                <div className="absolute right-0 top-full z-30 mt-1.5 min-w-[148px] overflow-hidden rounded-2xl border border-black/[0.06] bg-white py-1 shadow-[0_12px_40px_rgba(0,0,0,0.1)]">
                  <button
                    type="button"
                    data-memory-coach="clear-all"
                    disabled={clearAllDisabled}
                    className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-[13px] text-[#B42318] active:bg-black/[0.03] disabled:opacity-40"
                    onClick={() => {
                      setMenuOpen(false)
                      onClearAll()
                    }}
                  >
                    <Trash2 className="size-3.5" strokeWidth={1.6} />
                    一键清空记忆
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
