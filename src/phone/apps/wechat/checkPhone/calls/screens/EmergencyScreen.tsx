import { Cross } from 'lucide-react'
import { Pressable } from '../../../../../components/Pressable'
import { GeometricAvatar, displayCallTitle } from '../components/GeometricAvatar'
import type { PhoneContact } from '../types'

export function EmergencyScreen({
  contacts,
  onOpenContact,
}: {
  contacts: PhoneContact[]
  onOpenContact: (c: PhoneContact) => void
}) {
  const rows = contacts.filter((c) => c.isEmergency && !c.isBlocked)
  return (
    <div className="phone-scroll h-full overflow-y-auto px-4 pb-28">
      <h1 className="pb-3 pt-1 text-[28px] font-bold tracking-tight text-[var(--ph-ink)]">紧急联系人</h1>
      <div className="phone-card overflow-hidden">
        {rows.map((c, i) => (
          <div key={c.id}>
            {i > 0 ? <div className="ml-14 h-px bg-[var(--ph-line)]" /> : null}
            <Pressable
              type="button"
              className="flex w-full items-center gap-3 px-3.5 py-3 text-left"
              onClick={() => onOpenContact(c)}
            >
              <div className="relative">
                <GeometricAvatar contact={c} size={44} />
                <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--ph-danger)] text-white">
                  <Cross size={10} strokeWidth={2.4} />
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[16px] font-semibold text-[var(--ph-ink)]">
                  {displayCallTitle(c.remarkName, c.displayName)}
                </div>
                <div className="mt-0.5 text-[12px] text-[var(--ph-danger)]">{c.relationTag || '紧急联系人'}</div>
              </div>
            </Pressable>
          </div>
        ))}
        {!rows.length ? <div className="px-4 py-14 text-center text-[13px] text-[var(--ph-mist)]">暂无紧急联系人</div> : null}
      </div>
    </div>
  )
}
