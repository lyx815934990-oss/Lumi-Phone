import { useMemo, useState, type ReactNode } from 'react'
import {
  PLOT_HTML_VISUAL_CATEGORY_LABELS,
  PLOT_HTML_VISUAL_PRESETS,
  type PlotHtmlVisualCategory,
  type PlotHtmlVisualPreset,
} from '../../phone/apps/wechat/dating/datingPlotHtmlVisualPresetsData'

const CATEGORIES = ['A', 'B', 'C', 'D', 'E', 'F'] as const satisfies readonly PlotHtmlVisualCategory[]

/** 预设目录：/?theaterEgg=1（文案目录；HTML 样式预览待后续） */
export function TheaterEggCatalogPage() {
  const [filter, setFilter] = useState<PlotHtmlVisualCategory | 'all'>('all')
  const [openId, setOpenId] = useState<string | null>(null)

  const list = useMemo(() => {
    if (filter === 'all') return PLOT_HTML_VISUAL_PRESETS
    return PLOT_HTML_VISUAL_PRESETS.filter((p) => p.category === filter)
  }, [filter])

  return (
    <div className="min-h-screen bg-[linear-gradient(165deg,#f6f3ee_0%,#eef2f6_48%,#f7f0f2_100%)] text-[#2a2622]">
      <header className="sticky top-0 z-20 border-b border-black/8 bg-[#f6f3ee]/92 px-4 py-3 backdrop-blur-md">
        <div className="mx-auto max-w-3xl">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#8a7a60]">THEATER EGG · PRESET CATALOG</p>
          <h1 className="text-[18px] font-semibold tracking-wide">小剧场预设 · A–F · {PLOT_HTML_VISUAL_PRESETS.length}</h1>
          <p className="mt-1 text-[12px] text-[#6a6056]">
            文案目录（typeDef / 结构 / 仪式感）。产品内按酒馆 snow 输出完整 HTML+CSS+JS，折叠 iframe（allow-scripts）展示。
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <FilterChip active={filter === 'all'} onClick={() => setFilter('all')}>
              全部 {PLOT_HTML_VISUAL_PRESETS.length}
            </FilterChip>
            {CATEGORIES.map((c) => {
              const n = PLOT_HTML_VISUAL_PRESETS.filter((p) => p.category === c).length
              return (
                <FilterChip key={c} active={filter === c} onClick={() => setFilter(c)}>
                  {c} · {n}
                </FilterChip>
              )
            })}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-6">
        {CATEGORIES.filter((c) => filter === 'all' || filter === c).map((c) => {
          const items = list.filter((p) => p.category === c)
          if (!items.length) return null
          return (
            <section key={c} className="space-y-3">
              <h2 className="sticky top-[7.5rem] z-10 bg-[#f6f3ee]/90 py-1 text-[13px] font-semibold text-[#5a5046] backdrop-blur-sm">
                {c}. {PLOT_HTML_VISUAL_CATEGORY_LABELS[c]}
              </h2>
              {items.map((p) => (
                <PresetCard
                  key={p.id}
                  preset={p}
                  open={openId === p.id}
                  onToggle={() => setOpenId((id) => (id === p.id ? null : p.id))}
                />
              ))}
            </section>
          )
        })}
      </main>
    </div>
  )
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-2.5 py-1 text-[11px] transition ${
        active
          ? 'border-[#c9a24b] bg-[#c9a24b]/15 text-[#8a6b28]'
          : 'border-black/10 bg-white/70 text-[#5a5046]'
      }`}
    >
      {children}
    </button>
  )
}

function PresetCard({
  preset,
  open,
  onToggle,
}: {
  preset: PlotHtmlVisualPreset
  open: boolean
  onToggle: () => void
}) {
  return (
    <article className="rounded-[10px] border border-black/6 bg-white/75 px-3.5 py-3 shadow-sm">
      <button type="button" onClick={onToggle} className="flex w-full items-start gap-2 text-left">
        <span className="font-mono text-[12px] text-[#8a7a60]">#{preset.id}</span>
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-semibold tracking-wide">{preset.name}</span>
          <span className="mt-0.5 block text-[11px] text-[#8a7a60]">
            {preset.shortTitle} · {preset.tags.join(' / ')}
          </span>
        </span>
        <span className="text-[11px] text-[#a09078]">{open ? '收起' : '展开'}</span>
      </button>
      <p className="mt-2 text-[12px] leading-relaxed text-[#5a5046]">
        <span className="font-medium text-[#8a6b28]">仪式感：</span>
        {preset.ritualHook}
      </p>
      {open ? (
        <div className="mt-2 space-y-2 border-t border-black/5 pt-2 text-[12px] leading-relaxed text-[#4a4036]">
          <p>{preset.typeDef}</p>
          <ol className="list-decimal space-y-1 pl-4">
            {preset.structure.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
        </div>
      ) : null}
    </article>
  )
}
