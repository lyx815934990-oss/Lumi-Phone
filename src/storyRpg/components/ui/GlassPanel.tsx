import type { ReactNode } from 'react'

type Props = {
  children: ReactNode
  className?: string
  highlight?: boolean
  id?: string
}

export function GlassPanel({ children, className = '', highlight = false, id }: Props) {
  return (
    <div
      id={id}
      className={`relative overflow-hidden rounded-[14px] border border-[var(--sr-border)] bg-[var(--sr-panel-elevated)] ${highlight ? 'sr-highlight-border' : ''} ${className}`}
    >
      {children}
    </div>
  )
}
