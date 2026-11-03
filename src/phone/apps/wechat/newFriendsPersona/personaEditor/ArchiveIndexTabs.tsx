import { motion } from 'framer-motion'
import type { PersonaEditTabId } from './personaEditorTabs'
import { INK_FOIL, INK_INK, INK_LINE, INK_PAGE, PERSONA_ARCHIVE_TABS } from './personaEditorTabs'

const LINE_LAYOUT_ID = 'persona-archive-ink-line'

export function ArchiveIndexTabs({
  activeId,
  onChange,
  hideNetwork,
}: {
  activeId: PersonaEditTabId
  onChange: (id: PersonaEditTabId) => void
  /** NPC 人设隐藏人脉 Tab */
  hideNetwork?: boolean
}) {
  const tabs = hideNetwork ? PERSONA_ARCHIVE_TABS.filter((t) => t.id !== 'network') : PERSONA_ARCHIVE_TABS

  return (
    <nav aria-label="档案索引" style={{ background: INK_PAGE, borderBottom: `1px solid ${INK_LINE}` }}>
      <div className="flex overflow-x-auto px-2 pb-0 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tabs.map((t) => {
          const active = activeId === t.id
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onChange(t.id)}
              className="relative shrink-0 px-3 pb-2.5 pt-2 text-left"
            >
              <span
                className="block whitespace-nowrap font-mono text-[9px] font-semibold tracking-[0.08em]"
                style={{ color: active ? INK_FOIL : '#9AA0A8' }}
              >
                {t.num} {t.en}
              </span>
              <span
                className="mt-0.5 block whitespace-nowrap text-[12px]"
                style={{ color: active ? INK_INK : '#9AA0A8', fontWeight: active ? 650 : 400 }}
              >
                {t.zh}
              </span>
              {active ? (
                <motion.span
                  layoutId={LINE_LAYOUT_ID}
                  className="pointer-events-none absolute bottom-0 left-3 right-3 h-0.5"
                  style={{ background: INK_FOIL }}
                  transition={{ type: 'spring', stiffness: 380, damping: 34 }}
                  aria-hidden
                />
              ) : null}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
