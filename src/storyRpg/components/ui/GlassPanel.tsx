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
      className={`relative overflow-hidden rounded-[18px] border border-[var(--sr-border)] bg-[var(--sr-glass)] backdrop-blur-md ${highlight ? 'sr-highlight-border' : ''} ${className}`}
    >
      {children}
    </div>
  )
}
