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
      className={`shrink-0 rounded-full border px-3.5 py-1.5 text-[12px] font-medium tracking-wide transition-all duration-200 ${
        active
          ? 'border-transparent bg-[var(--sr-gold)] text-[var(--sr-gold-on)] shadow-[0_2px_12px_var(--sr-gold-glow)]'
          : 'border-[var(--sr-border)] bg-[var(--sr-glass)] text-[var(--sr-text-soft)] hover:bg-[var(--sr-glass-strong)] hover:text-[var(--sr-text)]'
      } ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}
