/** 文章配图占位：渐变底 + 居中画面描述，让用户知道「图里是什么」 */

function hashSeed(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export function sceneCaptionFromSeed(seed: string, preferred?: string): string {
  const p = String(preferred || '')
    .trim()
    .replace(/^图\s*[|｜]\s*/, '')
  if (p.length >= 2) return p
  // 不再用本地写死的场景句兜底；没有 AI 画面描述就留空提示
  return seed ? `（待生成画面）` : '（待生成画面）'
}

export function toneFromCaptionSeed(seed: string): string {
  const h = hashSeed(seed)
  const a = 0xdc + (h % 20)
  const b = 0xc8 + ((h >> 4) % 24)
  const c = 0xd4 + ((h >> 8) % 18)
  return `linear-gradient(145deg,rgb(${a},${b},${c}),rgb(${b - 12},${c},${a - 8}))`
}

export function ImagePlaceholder({
  caption,
  tone,
  seed = 'img',
  className = '',
  compact = false,
}: {
  caption?: string
  tone?: string
  seed?: string
  className?: string
  compact?: boolean
}) {
  const text = sceneCaptionFromSeed(seed, caption)
  const bg = tone || toneFromCaptionSeed(seed)
  return (
    <div
      className={`browser-img-ph relative overflow-hidden rounded-[12px] border border-[var(--br-hairline)] ${className}`}
      style={{ background: bg }}
      role="img"
      aria-label={text}
    >
      <div className="pointer-events-none absolute inset-0 opacity-40" style={{ background: 'radial-gradient(circle at 30% 20%, rgba(255,255,255,0.55), transparent 55%)' }} />
      <div className={`absolute inset-0 flex items-center justify-center ${compact ? 'px-1.5' : 'px-4'}`}>
        <p
          className={`text-center font-medium leading-snug text-[var(--br-ink)]/80 ${
            compact ? 'line-clamp-3 text-[8px]' : 'text-[13px] sm:text-[14px]'
          }`}
        >
          {text}
        </p>
      </div>
    </div>
  )
}
