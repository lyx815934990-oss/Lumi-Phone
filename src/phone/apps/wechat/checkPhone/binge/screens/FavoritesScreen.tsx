import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { BingeDataset, MediaFilter } from '../types'
import { FilterChips } from '../components/FilterChips'
import { PosterWall } from '../components/PosterCard'

export function FavoritesScreen({
  data,
  onOpenItem,
}: {
  data: BingeDataset
  onOpenItem: (id: string) => void
}) {
  const [filter, setFilter] = useState<MediaFilter>('all')
  const allFav = useMemo(() => data.items.filter((x) => x.favorited), [data.items])
  const items = useMemo(() => {
    if (filter === 'all') return allFav
    return allFav.filter((x) => x.kind === filter)
  }, [allFav, filter])

  return (
    <div className="px-4 pb-10 pt-1">
      <div className="binge-sub-intro">
        <div className="binge-page-head" style={{ marginBottom: 0 }}>
          <div>
            <h2>收藏架</h2>
            <p className="binge-page-lead" style={{ marginBottom: 0, marginTop: 4 }}>
              想反复翻看的剧、影、书与番。
            </p>
          </div>
          <span className="binge-count-pill binge-num">{allFav.length}</span>
        </div>
      </div>

      <div className="mt-3">
        <FilterChips value={filter} onChange={setFilter} />
      </div>

      <div className="mt-3">
        <AnimatePresence mode="wait">
          <motion.div
            key={filter}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
          >
            {items.length ? (
              <PosterWall items={items} onOpen={onOpenItem} />
            ) : (
              <div className="binge-empty binge-empty--soft">
                {allFav.length ? '该分类暂无收藏' : '暂无收藏'}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
