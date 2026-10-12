import type { CSSProperties, ReactNode } from 'react'

import { FORUM } from '../../forumTheme'

export function SoftCard({
  children,
  className = '',
  style,
  paddingX = FORUM.cardPadX,
  paddingY = FORUM.cardPadY,
  radius = FORUM.radiusCard,
  onClick,
}: {
  children: ReactNode
  className?: string
  style?: CSSProperties
  paddingX?: number
  paddingY?: number
  radius?: number
  onClick?: () => void
}) {
  const shared: CSSProperties = {
    backgroundColor: FORUM.surface2,
    borderRadius: radius,
    paddingLeft: paddingX,
    paddingRight: paddingX,
    paddingTop: paddingY,
    paddingBottom: paddingY,
    border: 'none',
    boxShadow: 'none',
    ...style,
  }

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`w-full text-left active:opacity-90 ${className}`}
        style={shared}
      >
        {children}
      </button>
    )
  }

  return (
    <div className={`w-full ${className}`} style={shared}>
      {children}
    </div>
  )
}
