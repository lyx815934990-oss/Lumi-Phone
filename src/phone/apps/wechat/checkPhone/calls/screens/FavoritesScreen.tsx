import { Star } from 'lucide-react'
import { Pressable } from '../../../../../components/Pressable'
import { GeometricAvatar, displayCallTitle } from '../components/GeometricAvatar'
import type { PhoneContact } from '../types'

export function FavoritesScreen({
  contacts,
  onOpenContact,
}: {
  contacts: PhoneContact[]
  onOpenContact: (c: PhoneContact) => void
}) {
  const favs = contacts.filter((c) => c.isFavorite && !c.isBlocked)

  return (
    <div className="phone-scroll h-full overflow-y-auto px-4 pb-28">
      <h1 className="pb-3 pt-1 text-[28px] font-bold tracking-tight text-[var(--ph-ink)]">收藏</h1>
      {favs.length ? (
        <div className="grid grid-cols-2 gap-3">
          {favs.map((c) => (
            <Pressable
              key={c.id}
              type="button"
              className="phone-card relative flex flex-col items-center gap-2 px-3 py-5 text-center"
              onClick={() => onOpenContact(c)}
            >
              <span className="absolute right-2.5 top-2.5 text-[var(--ph-gold)]" aria-hidden>
                <Star size={14} fill="currentColor" strokeWidth={0} />
              </span>
              <GeometricAvatar contact={c} size={64} />
              <div className="w-full truncate text-[14px] font-semibold text-[var(--ph-ink)]">
                {displayCallTitle(c.remarkName, c.displayName)}
              </div>
              {c.relationTag ? (
                <div className="truncate text-[11px] text-[var(--ph-mist)]">{c.relationTag}</div>
              ) : null}
            </Pressable>
          ))}
        </div>
      ) : (
        <div className="pt-16 text-center text-[13px] text-[var(--ph-mist)]">还没有收藏联系人</div>
      )}
    </div>
  )
}
