import { useState } from 'react'

type Props = {
  title: string
  body: string
  defaultOpen?: boolean
}

/** 「剧情走向」叙事折叠：默认展开，避免被 details 默认收起藏掉 */
export function PlotDirectionCard({ title, body, defaultOpen = true }: Props) {
  const [open, setOpen] = useState(defaultOpen)
  const t = String(title || '').trim() || '剧情走向'
  const b = String(body || '').trim()

  return (
    <div className="lumi-plot-direction-card my-3.5 w-full rounded-xl border border-[var(--sr-border)] bg-[var(--sr-panel-elevated)]/60 px-3 py-2.5">
      <button
        type="button"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation()
          setOpen((v) => !v)
        }}
        onPointerDown={(e) => e.stopPropagation()}
        className="flex w-full items-center justify-center gap-1.5 py-1 text-center text-[13px] font-semibold tracking-wide text-[var(--sr-text)]"
      >
        <span className="opacity-90">{t}</span>
        <span className="text-[10px] font-normal text-[var(--sr-text-muted)]">
          {open ? '收起' : '展开'}
        </span>
      </button>
      {open && b ? (
        <div className="mt-2 whitespace-pre-wrap border-t border-[var(--sr-border)]/70 pt-2.5 text-left text-[14px] leading-[1.8] text-[var(--sr-text)] opacity-95">
          {b}
        </div>
      ) : null}
    </div>
  )
}
