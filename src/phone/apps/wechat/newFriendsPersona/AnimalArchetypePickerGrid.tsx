import { Check } from 'lucide-react'
import { ANIMAL_ARCHETYPE_OPTIONS, type AnimalArchetypeId } from './animalArchetype'

export function AnimalArchetypePickerGrid({
  value,
  onSelect,
  className = '',
}: {
  value: string
  onSelect: (id: AnimalArchetypeId) => void
  className?: string
}) {
  return (
    <div className={`grid grid-cols-2 gap-2.5 ${className}`.trim()}>
      {ANIMAL_ARCHETYPE_OPTIONS.map((opt) => {
        const active = value === opt.id
        return (
          <button
            key={opt.id}
            type="button"
            aria-pressed={active}
            className={`relative flex items-start gap-2.5 rounded-2xl border px-2.5 py-2.5 text-left transition-all duration-200 ease-out active:scale-[0.98] ${
              active
                ? 'border-[#1c1c1c] bg-[#f7f7f5] shadow-[0_2px_12px_rgba(0,0,0,0.06)]'
                : 'border-[#ececec] bg-white hover:border-[#d8d8d8] hover:bg-[#fcfcfc]'
            }`}
            onClick={() => onSelect(opt.id)}
          >
            {active ? (
              <span
                className="absolute right-2 top-2 flex size-[18px] items-center justify-center rounded-full bg-[#1c1c1c]"
                aria-hidden
              >
                <Check className="size-3 text-white" strokeWidth={2.5} />
              </span>
            ) : null}
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-[#efefef] bg-[#fafafa] text-[20px]">
              {opt.emoji}
            </span>
            <div className="min-w-0 flex-1 pr-5">
              <p className="text-[13px] font-semibold text-neutral-950">{opt.label}</p>
              <p className="mt-0.5 text-[10px] leading-snug text-neutral-500">{opt.tagline}</p>
            </div>
          </button>
        )
      })}
    </div>
  )
}
