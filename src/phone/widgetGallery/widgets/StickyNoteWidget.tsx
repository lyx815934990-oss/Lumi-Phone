import { useState } from 'react'
import { WidgetChrome } from '../WidgetChrome'
import { WidgetStyleButton, WidgetStyleSheet } from '../WidgetStyleSheet'
import {
  PAPER_APPEARANCE,
  appearanceShellStyle,
  mutedFrom,
  parseAppearance,
} from '../widgetAppearance'
import type { GalleryWidgetPlacement } from '../types'
import { useWidgetGallery } from '../WidgetGalleryContext'

type Props = {
  placement: GalleryWidgetPlacement
  isEditMode?: boolean
  isDragging?: boolean
}

export function StickyNoteWidget({
  placement,
  isEditMode = false,
  isDragging = false,
}: Props) {
  const { patchConfig } = useWidgetGallery()
  const [styleOpen, setStyleOpen] = useState(false)
  const cfg = placement.config ?? {}
  const text =
    typeof cfg.text === 'string' ? cfg.text : '今天也要慢慢来。'
  const tilt =
    typeof cfg.tilt === 'number' && Number.isFinite(cfg.tilt)
      ? Math.max(-5, Math.min(5, cfg.tilt))
      : 2
  const appearance = parseAppearance(cfg.appearance, PAPER_APPEARANCE)
  const shell = appearanceShellStyle(appearance)

  return (
    <WidgetChrome
      size={placement.size}
      bare
      isEditMode={isEditMode}
      isDragging={isDragging}
    >
      <div
        className="flex h-full w-full items-center justify-center"
        style={{
          transform: `rotate(${tilt}deg)`,
          transition: 'transform 0.3s ease-in-out',
        }}
      >
        <div
          className="wg-curl-corner relative flex h-[92%] w-[90%] flex-col overflow-hidden rounded-[18px] px-3 pb-3 pt-3 transition-[background,backdrop-filter,color] duration-300 ease-in-out"
          style={{
            ...shell,
            boxShadow:
              '0 12px 28px rgba(28,28,30,0.12), 0 2px 6px rgba(28,28,30,0.05), inset 0 1px 0 rgba(255,255,255,0.65)',
            border: `1px solid ${mutedFrom(appearance.textColor, 0.1)}`,
            backgroundImage: `radial-gradient(${mutedFrom(appearance.textColor, 0.04)} 0.6px, transparent 0.7px)`,
            backgroundSize: '4px 4px',
          }}
        >
          <span
            className="pointer-events-none absolute left-1/2 top-0 h-3 w-10 -translate-x-1/2 -translate-y-1/2 rounded-[2px]"
            style={{
              background: mutedFrom('#ffffff', 0.55),
              boxShadow: '0 1px 3px rgba(28,28,30,0.08)',
              border: '1px solid rgba(255,255,255,0.7)',
            }}
            aria-hidden
          />

          <p
            className="mb-1.5 text-[9px] uppercase tracking-[0.18em]"
            style={{ color: mutedFrom(appearance.textColor, 0.45) }}
          >
            Note
          </p>

          <textarea
            value={text}
            disabled={isEditMode}
            onChange={(e) =>
              patchConfig(placement.id, { text: e.target.value.slice(0, 80) })
            }
            rows={4}
            className="min-h-0 flex-1 resize-none bg-transparent text-[13px] leading-relaxed outline-none"
            style={{
              color: appearance.textColor,
              fontWeight: 400,
              fontFamily:
                'ui-sans-serif, "PingFang SC", "Noto Sans SC", system-ui, sans-serif',
            }}
            placeholder="写一句心情…"
            maxLength={80}
            data-widget-editing="true"
          />
        </div>
      </div>

      <WidgetStyleButton
        visible={!isEditMode && !isDragging}
        onClick={() => setStyleOpen(true)}
      />
      <WidgetStyleSheet
        open={styleOpen}
        title="便签外观"
        appearance={appearance}
        showBlur={false}
        onChange={(next) => patchConfig(placement.id, { appearance: next })}
        onReset={() =>
          patchConfig(placement.id, { appearance: { ...PAPER_APPEARANCE } })
        }
        onClose={() => setStyleOpen(false)}
      />
    </WidgetChrome>
  )
}
