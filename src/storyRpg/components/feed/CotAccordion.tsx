import { motion } from 'framer-motion'
import { ChevronDown } from 'lucide-react'

type Props = {
  open: boolean
  onToggle: () => void
  content: string
}

const spring = { type: 'spring' as const, stiffness: 420, damping: 34 }

/** CoT 思维链折叠条 */
export function CotAccordion({ open, onToggle, content }: Props) {
  if (!content.trim()) return null

  return (
    <div className="mb-3 overflow-hidden rounded-xl border border-white/[0.06] bg-black/25">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-2 px-3 py-2 text-left"
      >
        <span className="sr-cot-bar h-[3px] flex-1 rounded-full bg-gradient-to-r from-transparent via-[var(--sr-gold)] to-transparent" />
        <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--sr-gold-dim)]">
          Neural Thought Process
        </span>
        <ChevronDown
          className={`size-3.5 shrink-0 text-white/40 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      <motion.div
        initial={false}
        animate={{ height: open ? 'auto' : 0, opacity: open ? 1 : 0 }}
        transition={spring}
        className="overflow-hidden"
      >
        <pre className="mx-3 mb-3 max-h-[200px] overflow-auto rounded-lg border border-white/[0.04] bg-[#0a0a0c] p-3 font-mono text-[11px] leading-relaxed text-emerald-400/80 whitespace-pre-wrap">
          {content}
        </pre>
      </motion.div>
    </div>
  )
}
