import type { CSSProperties } from 'react'

import { forumAccentVariant, forumInitialChar } from '../../forumTheme'

export function ForumAvatar({
  size,
  name,
  imageUrl,
  seed,
  className = '',
  style,
  borderColor,
  borderWidth = 0,
}: {
  size: number
  name: string
  imageUrl?: string | null
  /** 语义色种子；缺省用 name */
  seed?: string
  className?: string
  style?: CSSProperties
  borderColor?: string
  borderWidth?: number
}) {
  const variant = forumAccentVariant(seed || name || 'x')
  const initial = forumInitialChar(name)
  const url = imageUrl?.trim()

  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-full ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor: url ? undefined : variant.bg,
        border: borderWidth > 0 && borderColor ? `${borderWidth}px solid ${borderColor}` : undefined,
        backgroundImage: url ? `url(${url})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        ...style,
      }}
      aria-hidden
    >
      {!url ? (
        <span
          className="flex h-full w-full items-center justify-center font-medium"
          style={{
            color: variant.fg,
            fontSize: Math.max(11, Math.round(size * 0.38)),
          }}
        >
          {initial}
        </span>
      ) : null}
    </div>
  )
}
