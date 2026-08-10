import type { ReactNode } from 'react'

export type DecoPreset =
  | 'stars'
  | 'butterfly'
  | 'cross'
  | 'sparkle'
  | 'dots'
  | 'none'

const PRESETS: Record<
  Exclude<DecoPreset, 'none'>,
  { left: string; right: string }
> = {
  stars: { left: '*+:｡.｡', right: '｡.｡:+*' },
  butterfly: { left: 'ʚ', right: 'ɞ' },
  cross: { left: '† * ˖ +', right: '+ * ˖ †' },
  sparkle: { left: '˚ ✧ ｡', right: '｡ ✧ ˚' },
  dots: { left: '˚ . . . ◌', right: '◌ . . . ˚' },
}

type Props = {
  children: ReactNode
  preset?: DecoPreset
  /** 覆盖预设左右符号 */
  left?: string
  right?: string
  className?: string
  as?: 'span' | 'p' | 'div'
}

/**
 * Y2K / 梦核 ASCII 颜文字装饰文本。
 * 统一左右装饰，保证全系统画风一致。
 */
export function DecoText({
  children,
  preset = 'stars',
  left,
  right,
  className = '',
  as: Tag = 'span',
}: Props) {
  const pack = preset === 'none' ? null : PRESETS[preset]
  const L = left ?? pack?.left ?? ''
  const R = right ?? pack?.right ?? ''

  return (
    <Tag
      className={`inline-flex max-w-full items-baseline justify-center gap-[0.35em] text-center ${className}`}
    >
      {L ? (
        <span className="shrink-0 select-none opacity-55" aria-hidden>
          {L}
        </span>
      ) : null}
      <span className="min-w-0 truncate">{children}</span>
      {R ? (
        <span className="shrink-0 select-none opacity-55" aria-hidden>
          {R}
        </span>
      ) : null}
    </Tag>
  )
}
