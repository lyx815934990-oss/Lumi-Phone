import { useMemo } from 'react'
import { Info, PhoneIncoming, PhoneMissed, PhoneOutgoing } from 'lucide-react'
import { Pressable } from '../../../../../components/Pressable'
import {
  GeometricAvatar,
  directionLabel,
  displayCallTitle,
  formatCallWhen,
  inferCallListAnchor,
  mediaLabel,
} from '../components/GeometricAvatar'
import { sortCallsNewestFirst } from '../phoneMarkup'
import type { CallDirection, CallRecord, PhoneContact } from '../types'

function DirectionBadge({ direction }: { direction: CallDirection }) {
  const Icon = direction === 'outgoing' ? PhoneOutgoing : direction === 'missed' ? PhoneMissed : PhoneIncoming
  return (
    <span className="phone-dir-badge" data-dir={direction} aria-hidden>
      <Icon size={10} strokeWidth={2.4} />
    </span>
  )
}

export function CallLogScreen({
  calls,
  contacts,
  query,
  filter,
  onOpenCall,
  onOpenInfo,
}: {
  calls: CallRecord[]
  contacts: PhoneContact[]
  query: string
  filter: 'all' | 'missed'
  onOpenCall: (call: CallRecord) => void
  onOpenInfo: (call: CallRecord) => void
}) {
  const contactMap = useMemo(() => {
    const m = new Map<string, PhoneContact>()
    for (const c of contacts) m.set(c.id, c)
    return m
  }, [contacts])

  const filtered = useMemo(() => {
    let list = sortCallsNewestFirst(calls)
    if (filter === 'missed') list = list.filter((c) => c.direction === 'missed')
    const q = query.trim().toLowerCase()
    if (!q) return list
    return list.filter((c) => {
      const contact = c.contactId ? contactMap.get(c.contactId) : undefined
      const hay = `${c.remarkName} ${c.phoneNumber} ${contact?.displayName || ''}`.toLowerCase()
      return hay.includes(q)
    })
  }, [calls, filter, query, contactMap])

  /** 以整份通话最晚日为「今天」，避免剧情年超前本机时全显示成时分 */
  const listAnchor = useMemo(() => inferCallListAnchor(calls), [calls])

  return (
    <div className="phone-scroll h-full overflow-y-auto px-4 pb-28">
      <h1 className="pb-3 pt-1 text-[28px] font-bold tracking-tight text-[var(--ph-ink)]">最近通话</h1>
      <div className="overflow-hidden rounded-[var(--ph-radius)] bg-[var(--ph-card)] shadow-[var(--ph-shadow)]">
        {filtered.map((item, idx) => {
          const contact = item.contactId ? contactMap.get(item.contactId) : undefined
          const title = displayCallTitle(item.remarkName, contact?.displayName)
          const missed = item.direction === 'missed'
          const sub = `${mediaLabel(item.media)} · ${directionLabel(item.direction)}`
          return (
            <div key={item.id} className="relative">
              {idx > 0 ? <div className="absolute left-[72px] right-0 top-0 h-px bg-[var(--ph-line)]" /> : null}
              <div className="flex items-center">
                <Pressable
                  type="button"
                  className="flex min-w-0 flex-1 items-center gap-3 py-3 pl-4 text-left"
                  onClick={() => onOpenCall(item)}
                >
                  <div className="relative shrink-0">
                    <GeometricAvatar
                      contact={contact}
                      remarkName={item.remarkName}
                      glyph={contact?.avatarGlyph || item.remarkName.slice(0, 1)}
                      tone={contact?.avatarTone}
                      size={44}
                    />
                    <DirectionBadge direction={item.direction} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className={`truncate text-[16px] font-semibold ${missed ? 'phone-missed' : 'text-[var(--ph-ink)]'}`}>
                      {title}
                    </div>
                    <div className={`mt-0.5 truncate text-[13px] ${missed ? 'phone-missed' : 'text-[var(--ph-mist)]'}`}>
                      {sub}
                    </div>
                  </div>
                  <div className="phone-mono max-w-[7.5rem] shrink-0 pr-1 text-right text-[11px] leading-snug text-[var(--ph-mist)]">
                    {formatCallWhen(item, { anchor: listAnchor })}
                  </div>
                </Pressable>
                <Pressable
                  type="button"
                  className="mr-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--ph-fog)]"
                  aria-label="通话详情"
                  onClick={(e) => {
                    e.stopPropagation()
                    onOpenInfo(item)
                  }}
                >
                  <Info size={18} strokeWidth={1.7} />
                </Pressable>
              </div>
            </div>
          )
        })}
        {!filtered.length ? (
          <div className="px-4 py-16 text-center text-[13px] text-[var(--ph-mist)]">暂无通话记录</div>
        ) : null}
      </div>
    </div>
  )
}
