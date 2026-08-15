import { Ban, ChevronRight, Cross, Star, Users } from 'lucide-react'
import { Pressable } from '../../../../../components/Pressable'
import { displayCallTitle } from '../components/GeometricAvatar'
import type { PhoneContact } from '../types'

export function ContactsHubScreen({
  contacts,
  onOpenFavorites,
  onOpenBlocked,
  onOpenAll,
  onOpenContact,
}: {
  contacts: PhoneContact[]
  /** 保留供 PhoneApp 传入；枢纽页内紧急联系人直接点开详情 */
  onOpenEmergency: () => void
  onOpenFavorites: () => void
  onOpenBlocked: () => void
  onOpenAll: () => void
  onOpenContact: (c: PhoneContact) => void
}) {
  const emergency = contacts.filter((c) => c.isEmergency && !c.isBlocked)
  const favCount = contacts.filter((c) => c.isFavorite && !c.isBlocked).length
  const blockedCount = contacts.filter((c) => c.isBlocked).length

  return (
    <div className="phone-scroll h-full overflow-y-auto px-4 pb-28">
      <h1 className="pb-3 pt-1 text-[28px] font-bold tracking-tight text-[var(--ph-ink)]">通讯录</h1>

      <div className="mb-4 text-[13px] font-semibold text-[var(--ph-mist)]">紧急联系人</div>
      <div className="phone-card mb-5 overflow-hidden">
        {emergency.length ? (
          emergency.map((c, i) => (
            <div key={c.id}>
              {i > 0 ? <div className="ml-14 h-px bg-[var(--ph-line)]" /> : null}
              <Pressable
                type="button"
                className="flex w-full items-center gap-3 px-3.5 py-3 text-left"
                onClick={() => onOpenContact(c)}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[rgba(217,83,79,0.12)] text-[var(--ph-danger)]">
                  <Cross size={18} strokeWidth={2} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[16px] font-semibold text-[var(--ph-ink)]">
                    {displayCallTitle(c.remarkName, c.displayName)}
                  </div>
                  <div className="mt-0.5 text-[12px] text-[var(--ph-danger)]">
                    {c.relationTag || '紧急联系人'}
                  </div>
                </div>
                <ChevronRight size={16} className="text-[var(--ph-mist)]" />
              </Pressable>
            </div>
          ))
        ) : (
          <div className="px-4 py-8 text-center text-[13px] text-[var(--ph-mist)]">暂无紧急联系人</div>
        )}
      </div>

      <div className="phone-card overflow-hidden">
        <Pressable type="button" className="flex w-full items-center gap-3 px-3.5 py-3.5 text-left" onClick={onOpenFavorites}>
          <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[rgba(212,175,55,0.16)] text-[var(--ph-gold)]">
            <Star size={16} fill="currentColor" strokeWidth={0} />
          </div>
          <div className="min-w-0 flex-1 text-[16px] font-medium text-[var(--ph-ink)]">收藏</div>
          <span className="text-[13px] text-[var(--ph-mist)]">{favCount}</span>
          <ChevronRight size={16} className="text-[var(--ph-mist)]" />
        </Pressable>
        <div className="ml-14 h-px bg-[var(--ph-line)]" />
        <Pressable type="button" className="flex w-full items-center gap-3 px-3.5 py-3.5 text-left" onClick={onOpenAll}>
          <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[rgba(94,108,132,0.12)] text-[var(--ph-fog)]">
            <Users size={16} />
          </div>
          <div className="min-w-0 flex-1 text-[16px] font-medium text-[var(--ph-ink)]">全部联系人</div>
          <span className="text-[13px] text-[var(--ph-mist)]">{contacts.length}</span>
          <ChevronRight size={16} className="text-[var(--ph-mist)]" />
        </Pressable>
      </div>

      <Pressable
        type="button"
        className="mt-6 flex w-full items-center justify-center gap-2 py-3 text-[14px] text-[var(--ph-mist)]"
        onClick={onOpenBlocked}
      >
        <Ban size={14} />
        已拦截的来电与联系人
        {blockedCount ? <span className="text-[var(--ph-danger)]">· {blockedCount}</span> : null}
      </Pressable>
    </div>
  )
}
