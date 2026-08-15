/** 网页内容缩略预览：白页 + 模糊黑字（仅列表/主页用，不含画面描述） */

function hashSeed(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export function WebPageThumb({
  title,
  seed,
  className = '',
  compact = false,
}: {
  title?: string
  seed: string
  className?: string
  /** 更小尺寸（收藏/分享侧栏） */
  compact?: boolean
}) {
  const n = hashSeed(seed || title || 'page')
  const lineCount = compact ? 4 : 5 + (n % 3)
  const showHero = n % 3 !== 0
  const heroH = compact ? 22 : 34 + (n % 12)
  const titleW = 55 + (n % 30)
  const lines = Array.from({ length: lineCount }, (_, i) => {
    const w = 62 + ((n >> (i + 2)) % 32)
    return Math.min(96, w)
  })

  return (
    <div className={`browser-page-thumb relative overflow-hidden rounded-[12px] border border-[var(--br-hairline)] ${className}`} aria-hidden>
      <div className="browser-page-thumb__chrome flex h-[14%] min-h-[12px] items-center gap-1 px-[6%]">
        <span className="browser-page-thumb__dot" />
        <span className="browser-page-thumb__dot" />
        <span className="browser-page-thumb__dot" />
        <span className="browser-page-thumb__omnibox ml-1 h-[5px] flex-1 rounded-full" />
      </div>

      <div className="browser-page-thumb__blur px-[8%] pt-[7%]">
        {showHero ? <div className="browser-page-thumb__hero mb-[8%] rounded-[3px]" style={{ height: heroH }} /> : null}
        <div className="browser-page-thumb__title mb-[6%] h-[7px] rounded-[2px]" style={{ width: `${titleW}%` }} />
        {lines.map((w, i) => (
          <div
            key={i}
            className="browser-page-thumb__line mb-[4.5%] h-[4px] rounded-[1px]"
            style={{ width: `${i === lines.length - 1 ? Math.max(28, w - 20) : w}%` }}
          />
        ))}
      </div>

      <div className="browser-page-thumb__fade pointer-events-none absolute inset-x-0 bottom-0 h-[28%]" />
    </div>
  )
}
