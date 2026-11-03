import { useEffect, useRef, useState } from 'react'
import {
  PERSONA_NAME_LANGUAGE_OPTIONS,
  type PersonaNameLanguage,
} from './personaNamePools'

type Props = {
  value: PersonaNameLanguage
  onChange: (next: PersonaNameLanguage) => void
  /** 名片深色纸 / AI 表单浅色 */
  tone?: 'card' | 'soft'
  className?: string
}

function labelOf(id: PersonaNameLanguage) {
  return PERSONA_NAME_LANGUAGE_OPTIONS.find((o) => o.id === id)?.label ?? '中文'
}

function shortOf(id: PersonaNameLanguage) {
  return PERSONA_NAME_LANGUAGE_OPTIONS.find((o) => o.id === id)?.en ?? 'ZH'
}

/**
 * 紧凑语言选择：姓名行内小按钮 + 弹出菜单，不占姓名栏下方空间。
 */
export function PersonaNameLanguagePicker({ value, onChange, tone = 'soft', className = '' }: Props) {
  const card = tone === 'card'
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent | TouchEvent) => {
      const el = rootRef.current
      if (!el) return
      if (e.target instanceof Node && !el.contains(e.target)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('touchstart', onDoc, { passive: true })
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('touchstart', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={rootRef} className={`relative shrink-0 ${className}`}>
      <button
        type="button"
        title={`姓名语言：${labelOf(value)}（点击切换）`}
        aria-label={`姓名语言 ${labelOf(value)}`}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((v) => !v)}
        className={
          card
            ? 'inline-flex h-6 min-w-[28px] items-center justify-center rounded-full border px-1.5 text-[9px] font-semibold tracking-wide opacity-80 transition-opacity hover:opacity-100'
            : 'inline-flex h-7 min-w-[32px] items-center justify-center rounded-full border border-neutral-200/90 bg-white px-1.5 text-[10px] font-semibold tracking-wide text-neutral-600 transition-colors hover:border-neutral-300 hover:bg-neutral-50 hover:text-neutral-900'
        }
        style={
          card
            ? { borderColor: '#D2D0CB', color: '#1E2024', background: 'rgba(255,255,255,0.55)' }
            : undefined
        }
      >
        {shortOf(value)}
      </button>

      {open ? (
        <div
          role="listbox"
          aria-label="选择姓名语言"
          className={
            card
              ? 'absolute right-0 z-30 mt-1 min-w-[7.5rem] overflow-hidden rounded-xl border border-[#D2D0CB] bg-[#F8F7F4] py-1 shadow-[0_8px_24px_rgba(30,32,36,0.12)]'
              : 'absolute right-0 z-30 mt-1 min-w-[8rem] overflow-hidden rounded-2xl border border-neutral-200/90 bg-white py-1 shadow-[0_10px_28px_rgba(0,0,0,0.1)]'
          }
        >
          {PERSONA_NAME_LANGUAGE_OPTIONS.map((opt) => {
            const on = value === opt.id
            return (
              <button
                key={opt.id}
                type="button"
                role="option"
                aria-selected={on}
                onClick={() => {
                  onChange(opt.id)
                  setOpen(false)
                }}
                className={
                  card
                    ? `flex w-full items-center justify-between gap-3 px-3 py-1.5 text-left text-[11px] transition-colors ${
                        on ? 'bg-[#1E2024] text-[#F8F7F4]' : 'text-[#1E2024] hover:bg-[#EDEBE7]'
                      }`
                    : `flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-[12px] transition-colors ${
                        on
                          ? 'bg-neutral-900 text-white'
                          : 'text-neutral-700 hover:bg-neutral-50'
                      }`
                }
              >
                <span className="font-medium">{opt.label}</span>
                <span className={on ? 'opacity-70' : 'opacity-45'}>{opt.en}</span>
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
