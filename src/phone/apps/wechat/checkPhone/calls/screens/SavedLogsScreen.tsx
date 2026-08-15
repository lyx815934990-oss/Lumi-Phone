import { ChevronRight, Bookmark } from 'lucide-react'
import { Pressable } from '../../../../../components/Pressable'
import {
  GeometricAvatar,
  directionLabel,
  displayCallTitle,
  formatCallWhen,
  formatDuration,
  inferCallListAnchor,
  mediaLabel,
} from '../components/GeometricAvatar'
import { sortCallsNewestFirst } from '../phoneMarkup'
import type { CallRecord, PhoneContact } from '../types'
import { useMemo } from 'react'

export function SavedLogsScreen({
  calls,
  contacts,
  onOpenCall,
}: {
  calls: CallRecord[]
  contacts: PhoneContact[]
  onOpenCall: (call: CallRecord) => void
}) {
  const contactMap = useMemo(() => {
    const m = new Map<string, PhoneContact>()
    for (const c of contacts) m.set(c.id, c)
    return m
  }, [contacts])

  const saved = useMemo(() => sortCallsNewestFirst(calls.filter((c) => c.saved)), [calls])
  const listAnchor = useMemo(() => inferCallListAnchor(calls), [calls])

  return (
    <div className="phone-scroll h-full overflow-y-auto px-4 pb-28">
      <h1 className="pb-1 pt-1 text-[28px] font-bold tracking-tight text-[var(--ph-ink)]">已存录音</h1>
      <p className="mb-4 text-[13px] text-[var(--ph-mist)]">手机主人已存档的通话对白（只读）</p>
      <div className="phone-card overflow-hidden">
        {saved.map((item, idx) => {
          const contact = item.contactId ? contactMap.get(item.contactId) : undefined
          const title = displayCallTitle(item.remarkName, contact?.displayName)
          return (
            <div key={item.id}>
              {idx > 0 ? <div className="ml-14 h-px bg-[var(--ph-line)]" /> : null}
              <Pressable
                type="button"
                className="flex w-full items-center gap-3 px-3.5 py-3 text-left"
                onClick={() => onOpenCall(item)}
              >
                <GeometricAvatar
                  contact={contact}
                  remarkName={item.remarkName}
                  glyph={contact?.avatarGlyph || item.remarkName.slice(0, 1)}
                  tone={contact?.avatarTone}
                  size={44}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-[16px] font-semibold text-[var(--ph-ink)]">{title}</span>
                    <Bookmark size={12} className="shrink-0 phone-gold" fill="currentColor" strokeWidth={0} />
                  </div>
                  <div className="mt-0.5 truncate text-[13px] text-[var(--ph-mist)]">
                    {mediaLabel(item.media)} · {directionLabel(item.direction)}
                    {' · '}
                    {item.direction === 'missed' ? '未接通' : formatDuration(item.durationSec)}
                  </div>
                </div>
                <div className="phone-mono max-w-[7.5rem] shrink-0 text-right text-[11px] leading-snug text-[var(--ph-mist)]">
                  {formatCallWhen(item, { anchor: listAnchor })}
                </div>
                <ChevronRight size={16} className="shrink-0 text-[var(--ph-mist)]" />
              </Pressable>
            </div>
          )
        })}
        {!saved.length ? (
          <div className="px-4 py-14 text-center text-[13px] text-[var(--ph-mist)]">
            暂无已存录音
          </div>
        ) : null}
      </div>
    </div>
  )
}
