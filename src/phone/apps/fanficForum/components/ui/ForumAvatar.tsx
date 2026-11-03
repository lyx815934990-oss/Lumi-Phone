import type { CSSProperties } from 'react'

import { forumAccentVariant, forumInitialChar } from '../../forumTheme'
import { isResidentWriterId } from '../../residentWriters'

/** 认证写手环：暖金 ↔ 朱砂 细环（仅框，不再叠角标） */
const WRITER_RING =
  'conic-gradient(from 210deg, #8B2E22 0%, #E4C49A 28%, #B33A2B 55%, #F0E6D4 78%, #8B2E22 100%)'

/**
 * 常驻写手专属头像框。
 * 默认根据 seed（personaId）自动识别；也可显式传 verified。
 */
export function ForumAvatar({
  size,
  name,
  imageUrl,
  seed,
  className = '',
  style,
  borderColor,
  borderWidth = 0,
  verified,
}: {
  size: number
  name: string
  imageUrl?: string | null
  /** 语义色 / 写手识别种子；缺省用 name */
  seed?: string
  className?: string
  style?: CSSProperties
  borderColor?: string
  borderWidth?: number
  /** 强制开/关认证框；缺省时按 seed 是否为常驻写手 */
  verified?: boolean
}) {
  const variant = forumAccentVariant(seed || name || 'x')
  const initial = forumInitialChar(name)
  const url = imageUrl?.trim()
  const showFrame =
    verified === true || (verified !== false && !!seed && isResidentWriterId(seed))

  const ringW = showFrame ? Math.max(2, Math.round(size * 0.055)) : 0

  return (
    <div
      className={`relative shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        ...style,
      }}
      aria-hidden
      title={showFrame ? '认证写手' : undefined}
    >
      {showFrame ? (
        <span
          className="pointer-events-none absolute inset-0 rounded-full"
          style={{
            background: WRITER_RING,
            padding: ringW,
            boxSizing: 'border-box',
            WebkitMask: `radial-gradient(farthest-side, transparent calc(100% - ${ringW + 0.5}px), #000 calc(100% - ${ringW - 0.5}px))`,
            mask: `radial-gradient(farthest-side, transparent calc(100% - ${ringW + 0.5}px), #000 calc(100% - ${ringW - 0.5}px))`,
          }}
        />
      ) : null}

      <div
        className="absolute overflow-hidden rounded-full"
        style={{
          inset: ringW > 0 ? ringW + 0.5 : 0,
          backgroundColor: url ? undefined : variant.bg,
          border:
            borderWidth > 0 && borderColor ? `${borderWidth}px solid ${borderColor}` : undefined,
          backgroundImage: url ? `url(${url})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {!url ? (
          <span
            className="flex h-full w-full items-center justify-center font-medium"
            style={{
              color: variant.fg,
              fontSize: Math.max(11, Math.round((size - ringW * 2) * 0.38)),
            }}
          >
            {initial}
          </span>
        ) : null}
      </div>
    </div>
  )
}
