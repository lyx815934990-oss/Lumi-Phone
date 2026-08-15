import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { BingeDataset, MediaFilter } from '../types'
import { FilterChips } from '../components/FilterChips'
import { PosterWall } from '../components/PosterCard'

export function SearchesScreen({
  data,
  onClear,
  onSearch,
}: {
  data: BingeDataset
  onClear: () => void
  onSearch: (query: string) => void
}) {
  return (
    <div className="px-4 pb-10 pt-1">
      <div className="binge-sub-intro">
        <div className="binge-page-head" style={{ marginBottom: 0 }}>
          <div>
            <h2>站内搜索</h2>
            <p className="binge-page-lead" style={{ marginBottom: 0, marginTop: 4 }}>
              在追剧馆里搜过的关键词。
            </p>
          </div>
          {data.searches.length ? (
            <button
              type="button"
              className="text-[13px] font-medium"
              style={{ color: '#6B5A78' }}
              onClick={onClear}
            >
              清除
            </button>
          ) : (
            <span className="binge-count-pill binge-num">0</span>
          )}
        </div>
      </div>

      <div className="binge-search-hint mt-3">
        仅记录在追剧馆内搜过的作品名、演员/作者与关键词，与手机浏览器搜索无关。
      </div>

      {!data.searches.length ? (
        <div className="binge-empty binge-empty--soft">暂无站内搜索记录</div>
      ) : (
        <ul>
          {data.searches.map((s) => (
            <li key={s.id}>
              <button type="button" className="binge-search-row" onClick={() => onSearch(s.query)}>
                <span className="binge-search-icon">
                  <Search size={15} strokeWidth={1.7} aria-hidden />
                </span>
                <div className="min-w-0 flex-1 truncate text-[15px] font-medium">{s.query}</div>
                <div className="binge-num shrink-0 text-[11px]" style={{ color: '#8b8b8f' }}>
                  {s.timeLabel}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function SearchResultsScreen({
  data,
  query,
  onOpenItem,
}: {
  data: BingeDataset
  query: string
  onOpenItem: (id: string) => void
}) {
  const [filter, setFilter] = useState<MediaFilter>('all')
  const q = query.trim().toLowerCase()
  const items = useMemo(() => {
    const hit = data.items.filter(
      (x) =>
        x.title.toLowerCase().includes(q) ||
        (x.creators || '').toLowerCase().includes(q) ||
        (x.synopsis || '').toLowerCase().includes(q),
    )
    if (filter === 'all') return hit
    return hit.filter((x) => x.kind === filter)
  }, [data.items, filter, q])

  return (
    <div className="px-4 pb-10 pt-1">
      <h1 className="binge-results-query">「{query}」</h1>
      <p className="binge-results-sub binge-num">
        {items.length ? `找到 ${items.length} 部相关内容` : '没有匹配内容'}
      </p>
      <FilterChips value={filter} onChange={setFilter} />
      <div className="mt-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={filter}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {items.length ? (
              <PosterWall items={items} onOpen={onOpenItem} />
            ) : (
              <div className="binge-empty binge-empty--soft">换个关键词或分类试试</div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
