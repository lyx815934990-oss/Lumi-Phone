import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import type { BrowseGroup, MarketDataset, MarketFilter } from '../types'
import { MARKET_KIND_LABEL } from '../types'
import { FilterChips } from '../components/TicketBits'

const GROUP_LABEL: Record<BrowseGroup, string> = {
  today: '今天',
  yesterday: '昨天',
  earlier: '更早',
}

const EASE = [0.22, 1, 0.36, 1] as const

export function BrowseScreen({ data }: { data: MarketDataset }) {
  const [filter, setFilter] = useState<MarketFilter>('all')
  const rows = useMemo(() => {
    if (filter === 'all') return data.browses
    return data.browses.filter((b) => b.kind === filter)
  }, [data.browses, filter])

  const groups: BrowseGroup[] = ['today', 'yesterday', 'earlier']

  return (
    <div className="market-browse px-4 pb-10 pt-1">
      <div className="market-browse-intro">
        <h2>浏览足迹</h2>
        <p>团购 App 内看过的商家与项目 · 不是浏览器搜索</p>
      </div>
      <div className="mt-3">
        <FilterChips value={filter} onChange={setFilter} />
      </div>
      {!rows.length ? (
        <div className="market-empty market-empty--soft">暂无浏览记录</div>
      ) : (
        groups.map((g) => {
          const list = rows.filter((r) => r.group === g)
          if (!list.length) return null
          return (
            <section key={g} className="mt-5">
              <div className="market-browse-group-label">{GROUP_LABEL[g]}</div>
              <ul className="market-browse-list">
                {list.map((b, i) => (
                  <motion.li
                    key={b.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i, 8) * 0.03, duration: 0.3, ease: EASE }}
                  >
                    <div className="market-browse-card">
                      <div className="market-browse-cover" style={{ background: b.coverTone }}>
                        <span>{MARKET_KIND_LABEL[b.kind].slice(0, 2)}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="market-browse-title">{b.title}</div>
                        <div className="market-browse-sub">{MARKET_KIND_LABEL[b.kind]}</div>
                      </div>
                      <div className="market-browse-time mk-num">{b.timeLabel}</div>
                    </div>
                  </motion.li>
                ))}
              </ul>
            </section>
          )
        })
      )}
    </div>
  )
}
