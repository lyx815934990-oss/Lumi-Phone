import type { BeadPattern } from '../types'
import { PatternPreview } from './BeadGrid'

export function PatternCard({
  pattern,
  subtitle,
  onClick,
}: {
  pattern: BeadPattern
  subtitle?: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="bc-card flex flex-col gap-3 p-3 text-left transition-transform active:scale-[0.98]"
    >
      <div className="flex items-center justify-center rounded-xl bg-[#fff5f8] py-3">
        <PatternPreview
          width={pattern.width}
          height={pattern.height}
          palette={pattern.palette}
          cells={pattern.cells}
          maxSize={80}
        />
      </div>
      <div className="min-w-0">
        <p className="truncate text-[14px] font-semibold text-[#2a2220]">{pattern.name}</p>
        <p className="mt-0.5 text-[11px] text-[#9a8f8a]">
          {subtitle ?? `${pattern.width}×${pattern.height}`}
        </p>
      </div>
    </button>
  )
}
