import { useState, type ReactNode } from 'react'
import { Clock3, Heart, Trash2, Users } from 'lucide-react'

import { formatBeadDate, formatBeadDuration, selectCollections, selectStats, useBeadCraftStore } from '../store'
import type { BeadCollectionItem } from '../types'
import { PatternPreview } from '../components/BeadGrid'

export function MineScreen({
  onOpenCollection,
}: {
  onOpenCollection: (item: BeadCollectionItem) => void
}) {
  const stats = useBeadCraftStore(selectStats)
  const collections = useBeadCraftStore(selectCollections)
  const removeCollection = useBeadCraftStore((s) => s.removeCollection)
  const charStats = Object.values(stats.byCharacter).sort((a, b) => b.lastPlayedAt - a.lastPlayedAt)

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <section className="mb-4 grid grid-cols-2 gap-3">
        <StatCard
          icon={<Heart className="size-4 text-[#ff7b9c]" />}
          label="完成作品"
          value={String(stats.totalCompleted)}
        />
        <StatCard
          icon={<Clock3 className="size-4 text-[#7ed4b8]" />}
          label="共处时长"
          value={formatBeadDuration(stats.totalActiveDurationMs)}
          small
        />
        <StatCard
          icon={<Users className="size-4 text-[#4d96ff]" />}
          label="我填豆数"
          value={String(stats.totalUserBeads)}
        />
        <StatCard
          icon={<Users className="size-4 text-[#ff9ff3]" />}
          label="TA 填豆数"
          value={String(stats.totalCharBeads)}
        />
      </section>

      <section className="mb-5">
        <p className="mb-2 px-0.5 text-[12px] font-medium text-[#b0a6a0]">和谁的玩耍记录</p>
        {charStats.length ? (
          <div className="flex flex-col gap-2">
            {charStats.map((row) => (
              <div key={row.characterId} className="bc-card flex items-center gap-3 px-3 py-3">
                <span className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#f5ebe4] text-[14px] font-semibold text-[#c9a66b]">
                  {row.characterAvatarUrl ? (
                    <img src={row.characterAvatarUrl} alt="" className="size-full object-cover" />
                  ) : (
                    row.characterName.slice(0, 1)
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-semibold">{row.characterName}</p>
                  <p className="mt-0.5 text-[11px] text-[#9a8f8a]">
                    完成 {row.completedCount} 件 · 共处 {formatBeadDuration(row.activeDurationMs)}
                  </p>
                  <p className="mt-0.5 text-[11px] text-[#b0a6a0]">
                    我 {row.userBeadCount} 豆 · TA {row.charBeadCount} 豆 · 最近 {formatBeadDate(row.lastPlayedAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bc-card px-4 py-8 text-center text-[13px] leading-relaxed text-[#9a8f8a]">
            还没有一起拼过豆呢，去广场选张图纸开始吧～
          </div>
        )}
      </section>

      <section>
        <p className="mb-2 px-0.5 text-[12px] font-medium text-[#b0a6a0]">收藏馆</p>
        {collections.length ? (
          <div className="flex flex-col gap-3">
            {collections.map((item) => (
              <CollectionCard
                key={item.id}
                item={item}
                onOpen={() => onOpenCollection(item)}
                onRemove={() => removeCollection(item.id)}
              />
            ))}
          </div>
        ) : (
          <div className="bc-card px-4 py-8 text-center text-[13px] leading-relaxed text-[#9a8f8a]">
            完成拼豆后，作品会收藏在这里，可以 360° 观赏。
          </div>
        )}
      </section>
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  small = false,
}: {
  icon: ReactNode
  label: string
  value: string
  small?: boolean
}) {
  return (
    <div className="bc-card px-3 py-3">
      <div className="mb-2 flex items-center gap-1.5 text-[#9a8f8a]">
        {icon}
        <span className="text-[11px]">{label}</span>
      </div>
      <p className={`font-semibold text-[#2a2220] ${small ? 'text-[13px]' : 'text-[20px]'}`}>{value}</p>
    </div>
  )
}

function CollectionCard({
  item,
  onOpen,
  onRemove,
}: {
  item: BeadCollectionItem
  onOpen: () => void
  onRemove: () => void
}) {
  const [confirm, setConfirm] = useState(false)
  return (
    <div className="bc-card overflow-hidden">
      <button type="button" onClick={onOpen} className="flex w-full items-center gap-3 p-3 text-left">
        <div className="flex shrink-0 items-center justify-center rounded-xl bg-[#fff5f8] p-2">
          <PatternPreview
            width={item.width}
            height={item.height}
            palette={item.palette}
            cells={item.cells}
            maxSize={56}
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-semibold">{item.patternName}</p>
          <p className="mt-0.5 text-[12px] text-[#9a8f8a]">与 {item.characterName} 一起</p>
          <p className="mt-0.5 text-[11px] text-[#b0a6a0]">
            {formatBeadDate(item.completedAt)} · {formatBeadDuration(item.activeDurationMs)}
          </p>
        </div>
      </button>
      <div className="flex items-center justify-between border-t border-[#f0e4dc] px-3 py-2">
        <span className="text-[11px] text-[#b0a6a0]">
          我 {item.userBeadCount} · TA {item.charBeadCount}
        </span>
        {confirm ? (
          <div className="flex items-center gap-2">
            <button type="button" className="text-[11px] text-[#9a8f8a]" onClick={() => setConfirm(false)}>
              取消
            </button>
            <button
              type="button"
              className="text-[11px] font-medium text-[#e5484d]"
              onClick={() => {
                onRemove()
                setConfirm(false)
              }}
            >
              确认删除
            </button>
          </div>
        ) : (
          <button type="button" className="text-[#c4b8b2]" onClick={() => setConfirm(true)} aria-label="删除">
            <Trash2 className="size-4" />
          </button>
        )}
      </div>
    </div>
  )
}
