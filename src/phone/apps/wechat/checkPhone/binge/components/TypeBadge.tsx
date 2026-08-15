import { Film, BookOpen, Clapperboard, BookMarked, Tv } from 'lucide-react'
import { motion } from 'framer-motion'
import type { MediaKind } from '../types'
import { MEDIA_KIND_LABEL } from '../types'

const ICON = {
  series: Tv,
  movie: Clapperboard,
  novel: BookOpen,
  comic: BookMarked,
  anime: Film,
} as const

export function TypeBadge({ kind }: { kind: MediaKind }) {
  const Icon = ICON[kind]
  return (
    <span className="binge-type-badge">
      <Icon size={9} strokeWidth={1.8} aria-hidden />
      {MEDIA_KIND_LABEL[kind]}
    </span>
  )
}

export function ProgressRing({ progress, size = 16 }: { progress: number; size?: number }) {
  const p = Math.max(0, Math.min(1, progress))
  const r = (size - 3) / 2
  const c = 2 * Math.PI * r
  const offset = c * (1 - p)
  return (
    <svg className="binge-progress-ring" width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E6E4E0" strokeWidth={2} />
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="#6B5A78"
        strokeWidth={2}
        strokeLinecap="round"
        strokeDasharray={c}
        initial={{ strokeDashoffset: c }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  )
}
