import { useMemo } from 'react'
import { ChevronRight, Heart } from 'lucide-react'
import type { BingeDataset } from '../types'
import { MEDIA_KIND_LABEL } from '../types'

export function CommentsScreen({
  data,
  onOpenItem,
}: {
  data: BingeDataset
  onOpenItem: (id: string) => void
}) {
  const rows = useMemo(
    () => data.items.filter((x) => x.comment?.text?.trim()),
    [data.items],
  )

  return (
    <div className="px-4 pb-10 pt-1">
      <div className="binge-sub-intro">
        <div className="binge-page-head" style={{ marginBottom: 0 }}>
          <div>
            <h2>评语手账</h2>
            <p className="binge-page-lead" style={{ marginBottom: 0, marginTop: 4 }}>
              角色写过的短评，按作品归档。
            </p>
          </div>
          <span className="binge-count-pill binge-num">{rows.length}</span>
        </div>
      </div>

      {!rows.length ? (
        <div className="binge-empty binge-empty--soft mt-3">暂无评论</div>
      ) : (
        <div className="mt-3">
        {rows.map((it) => (
          <button
            key={it.id}
            type="button"
            className="binge-mine-card"
            onClick={() => onOpenItem(it.id)}
          >
            <div className="binge-mine-top">
              <div className="binge-mine-poster" style={{ background: it.posterTone }} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[14px] font-semibold">{it.title}</div>
                <div className="mt-1 text-[11px]" style={{ color: '#8b8b8f' }}>
                  {MEDIA_KIND_LABEL[it.kind]}
                </div>
              </div>
              <ChevronRight size={16} strokeWidth={1.6} style={{ color: '#8b8b8f' }} />
            </div>
            <p className="binge-mine-text">{it.comment!.text}</p>
            <div className="binge-mine-foot">
              <span className="binge-num">{it.comment!.atLabel}</span>
              {it.comment!.likes != null ? (
                <span className="inline-flex items-center gap-1 binge-num">
                  <Heart size={11} strokeWidth={1.8} aria-hidden />
                  {it.comment!.likes}
                </span>
              ) : null}
            </div>
          </button>
        ))}
        </div>
      )}
    </div>
  )
}
