import { Moon, Palette, Sun, X } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import {
  DATING_STORY_PALETTE_META,
  type DatingStoryAppearance,
  type DatingStoryDayNight,
  type DatingStoryPaletteId,
} from '../../../phone/apps/wechat/dating/datingStoryAppearance'
import { buildStoryRpgThemeStyle } from '../../theme/storyRpgThemeBridge'
import { StoryHeaderIconButton } from './StoryHeaderIconButton'

type Props = {
  appearance: DatingStoryAppearance
  onPatch: (patch: Partial<DatingStoryAppearance>) => void
}

type Pos = { top: number; left: number; width: number }

export function StoryThemePicker({ appearance, onPatch }: Props) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<Pos | null>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const currentMeta = DATING_STORY_PALETTE_META.find((p) => p.id === appearance.paletteId)
  const isNight = appearance.dayNight === 'night'
  const themeStyle = buildStoryRpgThemeStyle(appearance) as CSSProperties

  const updatePos = () => {
    const btn = btnRef.current
    if (!btn) return
    const r = btn.getBoundingClientRect()
    const width = Math.min(280, window.innerWidth - 16)
    let left = r.right - width
    left = Math.max(8, Math.min(left, window.innerWidth - width - 8))
    setPos({ top: r.bottom + 8, left, width })
  }

  useLayoutEffect(() => {
    if (!open) return
    updatePos()
  }, [open])

  useEffect(() => {
    if (!open) return
    const onPointer = (e: PointerEvent) => {
      const t = e.target
      if (!(t instanceof Node)) return
      if (btnRef.current?.contains(t)) return
      if (panelRef.current?.contains(t)) return
      setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    const onReposition = () => updatePos()
    document.addEventListener('pointerdown', onPointer, true)
    document.addEventListener('keydown', onKey)
    window.addEventListener('resize', onReposition)
    window.addEventListener('scroll', onReposition, true)
    return () => {
      document.removeEventListener('pointerdown', onPointer, true)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', onReposition)
      window.removeEventListener('scroll', onReposition, true)
    }
  }, [open])

  const pickPalette = (id: DatingStoryPaletteId) => {
    onPatch({ paletteId: id })
  }

  const pickDayNight = (mode: DatingStoryDayNight) => {
    onPatch({ dayNight: mode })
  }

  const panel =
    open && pos
      ? createPortal(
          <div
            ref={panelRef}
            className="story-rpg-root fixed z-[4000] rounded-2xl border p-3 shadow-[0_16px_40px_rgba(0,0,0,0.35)]"
            style={{
              ...themeStyle,
              top: pos.top,
              left: pos.left,
              width: pos.width,
              background: 'var(--sr-panel-elevated)',
              color: 'var(--sr-text)',
              borderColor: 'var(--sr-border)',
            }}
            role="dialog"
            aria-label="主题配色"
          >
            <div className="mb-2 flex items-center justify-between gap-2 px-1">
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--sr-text-muted)]">
                主题配色
              </p>
              <button
                type="button"
                className="rounded-full p-1 text-[var(--sr-text-muted)] hover:bg-[var(--sr-panel)] hover:text-[var(--sr-text)]"
                aria-label="关闭"
                onClick={() => setOpen(false)}
              >
                <X className="size-3.5" />
              </button>
            </div>

            <div className="mb-3 flex gap-2 rounded-xl border border-[var(--sr-border)] bg-[var(--sr-panel)] p-1">
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

            <div className="grid max-h-[min(48vh,340px)] grid-cols-2 gap-2 overflow-y-auto">
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
                      {selected ? (
                        <span className="text-[10px] text-[var(--sr-gold)]">当前</span>
                      ) : null}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>,
          document.body,
        )
      : null

  return (
    <>
      <StoryHeaderIconButton
        ref={btnRef}
        ariaLabel="主题配色"
        title={`主题 · ${currentMeta?.label ?? ''} · ${isNight ? '夜间' : '日间'}`}
        active={open}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <Palette className="size-3.5" strokeWidth={1.75} />
      </StoryHeaderIconButton>
      {panel}
    </>
  )
}
