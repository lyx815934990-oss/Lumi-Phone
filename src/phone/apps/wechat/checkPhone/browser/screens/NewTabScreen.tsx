import { Pressable } from '../../../../../components/Pressable'
import { WebPageThumb } from '../components/WebPageThumb'
import type { FrequentSite, RecentBrowseCard } from '../types'

export function NewTabScreen({
  frequents,
  recents,
  onOpenRecent,
  onOpenFrequent,
}: {
  frequents: FrequentSite[]
  recents: RecentBrowseCard[]
  onOpenRecent: (card: RecentBrowseCard) => void
  onOpenFrequent: (site: FrequentSite) => void
}) {
  return (
    <div className="browser-scroll h-full overflow-y-auto px-4 pb-28 pt-4">
      <div>
        <div className="text-[13px] text-[var(--br-mist)]">常去</div>
        <div className="mt-4 grid grid-cols-6 gap-x-2 gap-y-4">
          {frequents.slice(0, 6).map((site) => (
            <Pressable
              key={site.id}
              type="button"
              className="flex flex-col items-center gap-2"
              onClick={() => onOpenFrequent(site)}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-[12px] bg-[var(--br-card)] text-[14px] text-[var(--br-ink)] shadow-[var(--br-shadow)]">
                {site.glyph}
              </div>
              <span className="max-w-[52px] truncate text-[11px] text-[var(--br-ink)]">{site.name}</span>
            </Pressable>
          ))}
        </div>
      </div>

      <div className="mt-10">
        <div className="text-[13px] text-[var(--br-mist)]">最近浏览</div>
        <div className="browser-scroll mt-4 flex gap-3 overflow-x-auto pb-2">
          {recents.map((card) => (
            <Pressable
              key={card.id}
              type="button"
              className="w-[148px] shrink-0 text-left"
              onClick={() => onOpenRecent(card)}
            >
              <WebPageThumb
                className="aspect-video w-full"
                title={card.title}
                seed={card.id || card.url}
              />
              <div className="mt-2 line-clamp-2 text-[13px] leading-snug text-[var(--br-ink)]">{card.title}</div>
              <div className="browser-mono mt-1 text-[11px] text-[var(--br-mist)]">{card.visitedAt}</div>
            </Pressable>
          ))}
        </div>
      </div>
    </div>
  )
}
