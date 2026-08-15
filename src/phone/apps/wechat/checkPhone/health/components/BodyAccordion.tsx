import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import type { BodySection, BodySectionId } from '../types'

/** 经典手风琴：同时仅展开一节 */
export function BodyAccordion({ sections }: { sections: BodySection[] }) {
  const [openId, setOpenId] = useState<BodySectionId | null>(null)

  return (
    <div className="health-accordion">
      {sections.map((sec, index) => {
        const open = openId === sec.id
        const hot = !!sec.statusLabel && !/正常|大致|未录入/.test(sec.statusLabel)
        const idx = String(index + 1).padStart(2, '0')
        return (
          <div key={sec.id} className="health-acc-item">
            <button
              type="button"
              className="health-acc-head"
              data-open={open ? 'true' : 'false'}
              aria-expanded={open}
              onClick={() => setOpenId(open ? null : sec.id)}
            >
              <span className="health-acc-index">{idx}</span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[14px] font-semibold">{sec.title}</span>
                  {sec.statusLabel ? (
                    <span className="health-status-pill" data-hot={hot ? 'true' : 'false'}>
                      {sec.statusLabel}
                    </span>
                  ) : null}
                </div>
              </div>
              <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.18 }}>
                <ChevronDown size={18} strokeWidth={1.6} style={{ color: '#8b8b8f' }} />
              </motion.span>
            </button>
            <AnimatePresence initial={false}>
              {open ? (
                <motion.div
                  key="panel"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
                >
                  <div className="health-acc-panel">
                    <p>{sec.body}</p>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        )
      })}
    </div>
  )
}
