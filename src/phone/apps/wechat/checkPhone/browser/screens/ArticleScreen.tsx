import { Star } from 'lucide-react'
import { Pressable } from '../../../../../components/Pressable'
import { ImagePlaceholder, sceneCaptionFromSeed, toneFromCaptionSeed } from '../components/ImagePlaceholder'
import type { ArticlePage } from '../types'

export function ArticleScreen({
  page,
  bookmarked,
  onToggleBookmark,
  readOnly = false,
}: {
  page: ArticlePage
  bookmarked: boolean
  onToggleBookmark: () => void
  /** 查手机场景：只读查看，不提供收藏操作 */
  readOnly?: boolean
}) {
  const caption = sceneCaptionFromSeed(page.id, page.imageCaption)
  const tone = page.imageTone || toneFromCaptionSeed(page.id)

  return (
    <div className="relative h-full">
      <div className="browser-scroll h-full overflow-y-auto px-4 pb-32 pt-2">
        <div className="browser-mono text-[12px] text-[var(--br-mist)]">
          {page.siteName} · {page.author} · {page.publishedAt}
        </div>
        <h1 className="browser-display mt-4 text-[22px] leading-[1.3] text-[var(--br-ink)]">{page.title}</h1>

        <div className="mt-5">
          <ImagePlaceholder className="aspect-video w-full" caption={caption} tone={tone} seed={page.id} />
        </div>

        <div className="mt-6 space-y-4">
          {page.paragraphs.map((p, i) => {
            const hl = page.highlight
            if (hl && hl.paragraphIndex === i && hl.phrase && p.includes(hl.phrase)) {
              const [before, after] = p.split(hl.phrase)
              return (
                <p key={i} className="text-[16px] leading-[1.7] text-[var(--br-ink)]">
                  {before}
                  <span className="browser-mark">{hl.phrase}</span>
                  {after}
                </p>
              )
            }
            return (
              <p key={i} className="text-[16px] leading-[1.7] text-[var(--br-ink)]">
                {p}
              </p>
            )
          })}
        </div>
      </div>

      {!readOnly ? (
        <div
          className="pointer-events-none absolute inset-x-0 z-10 flex justify-center"
          style={{ bottom: 'max(76px, calc(env(safe-area-inset-bottom) + 64px))' }}
        >
          <Pressable
            type="button"
            className="pointer-events-auto inline-flex h-10 items-center gap-1.5 rounded-[var(--br-radius-pill)] border px-4 text-[13px]"
            style={{
              borderColor: bookmarked ? 'var(--br-fog)' : 'var(--br-hairline)',
              background: bookmarked ? 'var(--br-fog)' : 'var(--br-card)',
              color: bookmarked ? '#fff' : 'var(--br-ink)',
              boxShadow: 'var(--br-shadow)',
            }}
            onClick={onToggleBookmark}
          >
            <Star size={14} strokeWidth={1.6} fill={bookmarked ? 'currentColor' : 'none'} />
            {bookmarked ? '已收藏' : '收藏'}
          </Pressable>
        </div>
      ) : null}
    </div>
  )
}
