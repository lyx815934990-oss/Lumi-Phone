import { Moon, Sun } from 'lucide-react'
import {
  DATING_STORY_PALETTE_META,
  type DatingStoryAppearance,
  type DatingStoryDayNight,
  type DatingStoryPaletteId,
} from '../../../phone/apps/wechat/dating/datingStoryAppearance'

type Props = {
  appearance: DatingStoryAppearance
  onPatch: (patch: Partial<DatingStoryAppearance>) => void
}

/** 主题配色面板内容（可嵌在外观合集里） */
export function StoryThemeFields({ appearance, onPatch }: Props) {
  const isNight = appearance.dayNight === 'night'

  const pickPalette = (id: DatingStoryPaletteId) => onPatch({ paletteId: id })
  const pickDayNight = (mode: DatingStoryDayNight) => onPatch({ dayNight: mode })

  return (
    <div className="space-y-3">
      <div className="flex gap-2 rounded-xl border border-[var(--sr-border)] bg-[var(--sr-panel)] p-1">
        <button
          type="button"
          onClick={() => pickDayNight('day')}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-[12px] transition ${
            !isNight
              ? 'bg-[var(--sr-gold)] text-[var(--sr-gold-on)] shadow-sm'
              : 'text-[var(--sr-text-muted)] hover:text-[var(--sr-text)]'
          }`}
        >
          <Sun className="size-3.5" />
          日间
        </button>
        <button
          type="button"
          onClick={() => pickDayNight('night')}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-[12px] transition ${
            isNight
              ? 'bg-[var(--sr-gold)] text-[var(--sr-gold-on)] shadow-sm'
              : 'text-[var(--sr-text-muted)] hover:text-[var(--sr-text)]'
          }`}
        >
          <Moon className="size-3.5" />
          夜间
        </button>
      </div>

      <div className="grid max-h-[min(48vh,360px)] grid-cols-2 gap-2 overflow-y-auto">
        {DATING_STORY_PALETTE_META.map((p) => {
          const selected = appearance.paletteId === p.id
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => pickPalette(p.id)}
              className={`flex items-center gap-2 rounded-xl border px-2 py-2 text-left transition ${
                selected
                  ? 'border-[var(--sr-gold)] bg-[var(--sr-gold)]/15'
                  : 'border-[var(--sr-border)] bg-[var(--sr-panel)] hover:border-[var(--sr-gold)]/35'
              }`}
            >
              <span
                className="size-8 shrink-0 rounded-full border border-white/25 shadow-inner"
                style={{ background: p.swatchGrad ?? p.swatch }}
              />
              <span className="min-w-0">
                <span className="block truncate font-[family-name:var(--sr-font-serif)] text-[12px] text-[var(--sr-text)]">
                  {p.label}
                </span>
                {selected ? <span className="text-[10px] text-[var(--sr-gold)]">当前</span> : null}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
