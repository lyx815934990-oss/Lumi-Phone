type Props = {
  credit: string
  /** hub 卡片略紧凑；detail / picker 稍大 */
  size?: 'sm' | 'md'
  className?: string
}

/** 内置表情包原创作者高亮标注 */
export function StickerAuthorCredit({ credit, size = 'sm', className = '' }: Props) {
  const compact = size === 'sm'
  return (
    <div
      className={`inline-flex max-w-full items-center gap-1 rounded-full border border-amber-400/55 bg-amber-50/90 text-amber-950 shadow-[0_0_0_1px_rgba(251,191,36,0.18)] backdrop-blur-[6px] ${
        compact ? 'mt-1.5 px-2 py-0.5' : 'mt-2 px-2.5 py-1'
      } ${className}`}
      title={`原创 · ${credit}`}
    >
      <span
        className={`shrink-0 rounded-[4px] bg-amber-500/90 font-semibold tracking-wide text-white ${
          compact ? 'px-1 py-px text-[9px]' : 'px-1.5 py-0.5 text-[10px]'
        }`}
      >
        原创
      </span>
      <span className={`min-w-0 truncate font-medium ${compact ? 'text-[10px]' : 'text-[11px]'}`}>
        {credit}
      </span>
    </div>
  )
}
