import { useMemo, useState } from 'react'
import type { BingeDataset, MediaFilter, WatchSessionGroup } from '../types'
import { FilterChips } from '../components/FilterChips'

const GROUP_LABEL: Record<WatchSessionGroup, string> = {
  today: '今天',
  yesterday: '昨天',
  earlier: '更早',
}

export function HistoryScreen({
  data,
  onOpenItem,
}: {
  data: BingeDataset
  onOpenItem: (id: string) => void
}) {
  const [filter, setFilter] = useState<MediaFilter>('all')
  const itemMap = useMemo(() => new Map(data.items.map((x) => [x.id, x])), [data.items])

  const rows = useMemo(() => {
    return data.sessions.filter((s) => {
      const it = itemMap.get(s.itemId)
      if (!it) return false
      if (filter === 'all') return true
      return it.kind === filter
    })
  }, [data.sessions, filter, itemMap])

  const groups: WatchSessionGroup[] = ['today', 'yesterday', 'earlier']

  return (
    <div className="px-4 pb-10 pt-1">
      <div className="binge-sub-intro">
        <div className="binge-page-head" style={{ marginBottom: 0 }}>
          <div>
            <h2>观看轨迹</h2>
            <p className="binge-page-lead" style={{ marginBottom: 0, marginTop: 4 }}>
              按日回溯最近打开过的内容。
            </p>
          </div>
          <span className="binge-count-pill binge-num">{rows.length}</span>
        </div>
      </div>

      <div className="mt-3">
        <FilterChips value={filter} onChange={setFilter} />
      </div>

      {!rows.length ? (
        <div className="binge-empty binge-empty--soft">暂无观看记录</div>
      ) : (
        groups.map((g) => {
          const list = rows.filter((r) => r.group === g)
          if (!list.length) return null
          return (
            <section key={g} className="mt-2">
              <div className="binge-day-label">{GROUP_LABEL[g]}</div>
              <ul>
                {list.map((s) => {
                  const it = itemMap.get(s.itemId)
                  if (!it) return null
                  return (
                    <li key={s.id}>
                      <button
                        type="button"
                        className="binge-session-row"
                        onClick={() => onOpenItem(it.id)}
                      >
                        <div className="binge-session-poster" style={{ background: it.posterTone }}>
                          <div className="binge-poster-caption">
                            {it.posterCaption || it.title.slice(0, 4)}
                          </div>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[14px] font-semibold leading-snug">{it.title}</div>
                          <div className="mt-1 truncate text-[12px]" style={{ color: '#8b8b8f' }}>
                            {s.progressNote}
                          </div>
                          <div className="binge-detail-progress mt-2" style={{ height: 4 }}>
                            <span style={{ width: `${Math.max(4, it.progress * 100)}%` }} />
                          </div>
                        </div>
                        <div className="binge-session-time binge-num">
                          <div>{s.durationLabel}</div>
                          <div className="mt-1">{s.timeLabel}</div>
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>
          )
        })
      )}
    </div>
  )
}
