import { Ban } from 'lucide-react'
import { Pressable } from '../../../../../components/Pressable'
import { GeometricAvatar, displayCallTitle } from '../components/GeometricAvatar'
import type { PhoneContact } from '../types'

export function BlockedScreen({
  contacts,
  onOpenContact,
}: {
  contacts: PhoneContact[]
  onOpenContact: (c: PhoneContact) => void
}) {
  const blocked = contacts.filter((c) => c.isBlocked)

  return (
    <div className="phone-scroll h-full overflow-y-auto px-4 pb-28">
      <h1 className="pb-1 pt-1 text-[28px] font-bold tracking-tight text-[var(--ph-ink)]">已拦截</h1>
      <p className="mb-4 text-[13px] text-[var(--ph-mist)]">这些来电与联系人已被系统隔绝</p>
      <div className="phone-card overflow-hidden">
        {blocked.length ? (
          blocked.map((c, i) => (
            <div key={c.id}>
              {i > 0 ? <div className="ml-14 h-px bg-[var(--ph-line)]" /> : null}
              <Pressable
                type="button"
                className="flex w-full items-center gap-3 px-3.5 py-3 text-left"
                onClick={() => onOpenContact(c)}
              >
                <GeometricAvatar contact={c} size={40} blocked />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-[16px] font-medium text-[var(--ph-mist)] line-through">
                      {displayCallTitle(c.remarkName, c.displayName)}
                    </span>
                    <Ban size={12} className="shrink-0 text-[var(--ph-danger)]" />
                  </div>
                  <div className="mt-0.5 text-[12px] text-[var(--ph-mist)]">
                    {c.blockedAt ? `拉黑于 ${c.blockedAt}` : c.phoneNumber}
                  </div>
                </div>
              </Pressable>
            </div>
          ))
        ) : (
          <div className="px-4 py-14 text-center text-[13px] text-[var(--ph-mist)]">暂无拦截记录</div>
        )}
      </div>
    </div>
  )
}
