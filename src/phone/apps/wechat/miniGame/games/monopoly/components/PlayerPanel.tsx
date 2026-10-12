import { Pressable } from '../../../../../../components/Pressable'
import { resolveCharacterAvatarUrl } from '../../../../../../utils/characterAvatarUrl'
import { ITEM_LABEL, type MonopolyItemId, type MonopolyPlayerId } from '../monopolyTypes'

export function PlayerPanel({
  who,
  name,
  cash,
  items,
  avatarUrl,
  active,
  canUseItems,
  onUseItem,
}: {
  who: MonopolyPlayerId
  name: string
  cash: number
  items: MonopolyItemId[]
  avatarUrl?: string
  active: boolean
  canUseItems: boolean
  onUseItem?: (item: MonopolyItemId) => void
}) {
  const resolved = resolveCharacterAvatarUrl({ avatarUrl }) || undefined
  const accent = who === 'player' ? 'border-emerald-300/80' : 'border-rose-300/80'
  return (
    <div
      className={`min-w-0 flex-1 rounded-2xl border bg-white/90 px-3 py-2.5 shadow-sm ${accent} ${
        active ? 'ring-2 ring-offset-1 ring-stone-800/10' : ''
      }`}
    >
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full border border-stone-200 bg-stone-100">
          {resolved ? (
            <img src={resolved} alt="" className="h-full w-full object-cover" draggable={false} />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[11px] text-stone-400">
              {name.slice(0, 1)}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-medium text-stone-700">{name}</p>
          <p
            className="text-[15px] font-semibold tabular-nums text-stone-900"
            style={{ fontFamily: 'var(--phone-font, "Noto Serif SC", serif)' }}
          >
            ¥{cash.toLocaleString()}
          </p>
        </div>
      </div>
      {items.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1">
          {items.map((item, idx) => (
            <Pressable
              key={`${item}-${idx}`}
              disabled={!canUseItems || who !== 'player' || !onUseItem}
              onClick={() => onUseItem?.(item)}
              className={`rounded-full border px-2 py-0.5 text-[10px] ${
                canUseItems && who === 'player'
                  ? 'border-amber-200 bg-amber-50 text-amber-800 active:opacity-80'
                  : 'border-stone-200 bg-stone-50 text-stone-500'
              }`}
            >
              {ITEM_LABEL[item]}
            </Pressable>
          ))}
        </div>
      ) : (
        <p className="mt-1.5 text-[10px] text-stone-400">道具空</p>
      )}
    </div>
  )
}
