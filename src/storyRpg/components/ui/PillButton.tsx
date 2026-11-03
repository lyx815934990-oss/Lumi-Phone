import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean
  children: ReactNode
}

export function PillButton({ active, children, onClick, className = '', type = 'button', ...rest }: Props) {
  return (
    <button
      type={type}
      onClick={onClick}
      className={`shrink-0 rounded-[8px] border px-3 py-1.5 font-mono text-[11px] font-medium tracking-[0.08em] transition-all duration-200 ${
        active
          ? 'border-[var(--sr-text)] bg-[var(--sr-text)] text-[var(--sr-panel-elevated)]'
          : 'border-[var(--sr-border)] bg-[var(--sr-panel-elevated)] text-[var(--sr-text-soft)] hover:border-[var(--sr-text-soft)] hover:text-[var(--sr-text)]'
      } ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}
