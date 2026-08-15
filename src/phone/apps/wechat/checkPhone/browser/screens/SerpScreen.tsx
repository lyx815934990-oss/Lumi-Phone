import { Pressable } from '../../../../../components/Pressable'
import { HighlightText } from '../components/HighlightText'
import type { SerpResult } from '../types'

export function SerpScreen({
  query,
  resultCountLabel,
  results,
  related,
  onOpenResult,
  onRelated,
}: {
  query: string
  resultCountLabel: string
  results: SerpResult[]
  related: string[]
  onOpenResult: (r: SerpResult) => void
  onRelated: (q: string) => void
}) {
  return (
    <div className="browser-scroll h-full overflow-y-auto pb-28">
      <div className="px-4 pb-3 pt-1">
        <div className="text-[15px] font-medium text-[var(--br-ink)]">{query}</div>
        <div className="browser-mono mt-1 text-[11px] text-[var(--br-mist)]">{resultCountLabel}</div>
      </div>

      {results.map((r, idx) => (
        <div key={r.id}>
          {idx === 3 && related.length ? (
            <div className="border-y border-[var(--br-hairline)] px-4 py-4">
              <div className="text-[12px] text-[var(--br-mist)]">相关搜索</div>
              <div className="browser-scroll mt-3 flex gap-2 overflow-x-auto">
                {related.map((tag) => (
                  <Pressable key={tag} type="button" className="browser-chip" onClick={() => onRelated(tag)}>
                    {tag}
                  </Pressable>
                ))}
              </div>
            </div>
          ) : null}
          {idx > 0 ? <div className="mx-4 h-px bg-[var(--br-hairline)]" /> : null}
          <Pressable type="button" className="w-full px-4 py-4 text-left" onClick={() => onOpenResult(r)}>
            <div className="flex items-center gap-1.5 text-[12px] text-[var(--br-mist)]">
              <span className="flex h-4 w-4 items-center justify-center rounded-[4px] bg-[var(--br-hairline)] text-[9px] text-[var(--br-ink)]">
                {r.siteName.slice(0, 1)}
              </span>
              <span>{r.siteName}</span>
              <span className="browser-mono">· {r.host}</span>
            </div>
            <HighlightText
              text={r.title}
              query={query}
              className="mt-2 block text-[16px] font-medium leading-snug text-[var(--br-ink)]"
            />
            <p className="mt-2 line-clamp-2 text-[14px] leading-[1.5] text-[var(--br-mist)]">{r.snippet}</p>
          </Pressable>
        </div>
      ))}
    </div>
  )
}
