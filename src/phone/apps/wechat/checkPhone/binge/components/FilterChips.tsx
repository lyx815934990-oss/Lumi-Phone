import { motion } from 'framer-motion'
import type { MediaFilter } from '../types'
import { MEDIA_KIND_LABEL, MEDIA_KINDS } from '../types'

const CHIPS: Array<{ id: MediaFilter; label: string }> = [
  { id: 'all', label: '全部' },
  ...MEDIA_KINDS.map((k) => ({ id: k as MediaFilter, label: MEDIA_KIND_LABEL[k] })),
]

export function FilterChips({
  value,
  onChange,
}: {
  value: MediaFilter
  onChange: (next: MediaFilter) => void
}) {
  return (
    <div className="binge-chip-row">
      {CHIPS.map((c) => (
        <button
          key={c.id}
          type="button"
          className="binge-chip"
          data-on={value === c.id ? 'true' : 'false'}
          onClick={() => onChange(c.id)}
        >
          {value === c.id ? (
            <motion.span
              layoutId="binge-chip-pill"
              className="binge-chip-pill"
              transition={{ type: 'spring', stiffness: 420, damping: 34 }}
            />
          ) : null}
          <span className="relative z-[1]">{c.label}</span>
        </button>
      ))}
    </div>
  )
}
