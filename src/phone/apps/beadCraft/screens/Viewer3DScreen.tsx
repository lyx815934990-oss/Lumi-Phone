import { lazy, Suspense, useState } from 'react'
import { ChevronLeft, PartyPopper } from 'lucide-react'

import { formatBeadDate, formatBeadDuration } from '../store'
import type { BeadCollectionItem } from '../types'

const BeadViewer3D = lazy(() =>
  import('../components/BeadViewer3D').then((m) => ({ default: m.BeadViewer3D })),
)

export function Viewer3DScreen({
  item,
  mode,
  onBack,
  onDone,
}: {
  item: BeadCollectionItem
  mode: 'celebrate' | 'collection'
  onBack: () => void
  onDone: (note: string) => void
}) {
  const [note, setNote] = useState(item.note ?? '')

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="bc-header flex shrink-0 items-center gap-2 border-b border-[#f0e4dc] bg-white/70 px-3 pb-2.5 backdrop-blur-md">
        <button type="button" onClick={onBack} className="flex size-9 items-center justify-center rounded-full bg-black/[0.04]">
          <ChevronLeft className="size-5" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold">{item.patternName}</p>
          <p className="text-[11px] text-[#9a8f8a]">3D 成品 · 与 {item.characterName}</p>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <div className="mb-3 flex items-center gap-2 rounded-2xl bg-[#fff0f5] px-3 py-2.5 text-[12px] text-[#c93b60]">
          <PartyPopper className="size-4 shrink-0" />
          拼完啦！可以拖动旋转从各个角度欣赏你们的作品。
        </div>

        <Suspense
          fallback={
            <div className="flex h-[280px] items-center justify-center rounded-2xl bg-[#fff5f8] text-[13px] text-[#9a8f8a]">
              正在渲染 3D 成品…
            </div>
          }
        >
          <BeadViewer3D
            className="h-[min(52vh,320px)] w-full"
            width={item.width}
            height={item.height}
            palette={item.palette}
            cells={item.cells}
          />
        </Suspense>

        <div className="bc-card mt-4 space-y-2 p-4 text-[12px] text-[#9a8f8a]">
          <p>
            <span className="text-[#2a2220]">完成时间</span> · {formatBeadDate(item.completedAt)}
          </p>
          <p>
            <span className="text-[#2a2220]">共处时长</span> · {formatBeadDuration(item.activeDurationMs)}
          </p>
          <p>
            <span className="text-[#2a2220]">填豆分工</span> · 我 {item.userBeadCount} · {item.characterName}{' '}
            {item.charBeadCount}
          </p>
        </div>

        <label className="mt-4 block">
          <span className="mb-1.5 block text-[12px] font-medium text-[#b0a6a0]">写一句纪念（可选）</span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="今天和 TA 一起拼完了这张小图…"
            className="w-full resize-none rounded-2xl border border-[#f0e4dc] bg-white/90 px-3 py-2.5 text-[13px] outline-none focus:border-[#ffb3c6]"
          />
        </label>
      </div>

      <div className="shrink-0 border-t border-[#f0e4dc] p-4">
        <button
          type="button"
          onClick={() => onDone(note)}
          className="w-full rounded-2xl bg-[#ff7b9c] py-3 text-[14px] font-semibold text-white shadow-[0_8px_20px_rgba(255,123,156,0.28)]"
        >
          {mode === 'celebrate' ? '收入收藏馆' : '保存'}
        </button>
      </div>
    </div>
  )
}
