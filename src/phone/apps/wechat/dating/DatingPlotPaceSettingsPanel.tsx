import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Gauge, ChevronDown } from 'lucide-react'
import {
  DATING_PLOT_PACE_PRESET_OPTIONS,
  DATING_PLOT_PACE_UNIT_OPTIONS,
  datingPlotPaceLabel,
  normalizeDatingPlotPaceSettings,
  type DatingPlotPacePreset,
  type DatingPlotPaceSettings,
  type DatingPlotPaceUnit,
} from './datingPlotPace'

export type DatingPlotPaceSettingsPatch = Partial<DatingPlotPaceSettings>

/** 面板正文（弹窗 / VN 内嵌共用） */
export function DatingPlotPaceSettingsFields({
  value,
  onPatch,
}: {
  value: DatingPlotPaceSettings
  onPatch: (partial: DatingPlotPaceSettingsPatch) => void
}) {
  const pace = normalizeDatingPlotPaceSettings(value)

  return (
    <div className="space-y-3">
      <p className="text-[12px] leading-relaxed text-[#8e8e8e]">
        本轮故事时间跨度（与字数无关）。影响旁白推进多久，不改变目标字数。
      </p>
      <div className="grid grid-cols-2 gap-1.5">
        {DATING_PLOT_PACE_PRESET_OPTIONS.map((it) => (
          <button
            key={it.id}
            type="button"
            onClick={() => onPatch({ preset: it.id as DatingPlotPacePreset })}
            className={`rounded-xl border px-2.5 py-2 text-left text-[12px] transition-colors ${
              pace.preset === it.id
                ? 'border-stone-800 bg-stone-900 text-white'
                : 'border-stone-200 bg-white text-[#262626] hover:bg-stone-50'
            }`}
          >
            <span className="font-medium">{it.label}</span>
            <span
              className={`mt-0.5 block text-[10px] leading-snug ${
                pace.preset === it.id ? 'text-stone-300' : 'text-[#8e8e8e]'
              }`}
            >
              {it.hint}
            </span>
          </button>
        ))}
      </div>
      {pace.preset === 'custom' ? (
        <div className="space-y-1.5 rounded-xl border border-stone-100 bg-stone-50/80 p-2.5">
          <p className="px-0.5 text-[11px] text-[#8e8e8e]">自定义跨度</p>
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              min={0.1}
              max={9999}
              step={1}
              value={pace.customAmount ?? 3}
              onChange={(e) =>
                onPatch({
                  preset: 'custom',
                  customAmount: Number(e.target.value),
                })
              }
              className="w-[80px] rounded-lg border border-stone-200 bg-white px-2 py-2 text-[13px] text-[#262626] outline-none focus:border-stone-400"
            />
            <select
              value={pace.customUnit ?? 'day'}
              onChange={(e) =>
                onPatch({
                  preset: 'custom',
                  customUnit: e.target.value as DatingPlotPaceUnit,
                })
              }
              className="min-w-0 flex-1 rounded-lg border border-stone-200 bg-white px-2 py-2 text-[13px] text-[#262626] outline-none focus:border-stone-400"
            >
              {DATING_PLOT_PACE_UNIT_OPTIONS.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : null}
    </div>
  )
}

/** 工具栏「推进速度」按钮 + 居中弹窗 */
export function DatingPlotPaceSettingsButton({
  value,
  onPatch,
  className,
  iconOnly = false,
}: {
  value: DatingPlotPaceSettings
  onPatch: (partial: DatingPlotPaceSettingsPatch) => void
  className?: string
  iconOnly?: boolean
}) {
  const [open, setOpen] = useState(false)
  const btnRef = useRef<HTMLButtonElement | null>(null)
  const titleId = useId()
  const pace = normalizeDatingPlotPaceSettings(value)
  const label = datingPlotPaceLabel(pace)
  const titleText = `剧情推进速度 · ${label}`

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prevOverflow
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const panel: ReactNode = open
    ? createPortal(
        <div
          className="fixed inset-0 z-[240] flex items-center justify-center bg-black/45 px-4"
          style={{
            paddingTop: 'max(12px, env(safe-area-inset-top, 0px))',
            paddingBottom: 'max(12px, env(safe-area-inset-bottom, 0px))',
          }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setOpen(false)
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="flex max-h-[min(85dvh,560px)] w-[min(92vw,360px)] flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-[0_20px_56px_rgba(0,0,0,0.22)]"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[#f0f0f0] px-4 py-3">
              <div className="min-w-0">
                <p id={titleId} className="text-[16px] font-semibold text-black">
                  剧情推进速度
                </p>
                <p className="mt-0.5 truncate text-[11px] text-[#a3a3a3]">当前：{label}</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="shrink-0 rounded-lg bg-black px-3 py-1.5 text-[13px] font-medium text-white"
              >
                完成
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3">
              <DatingPlotPaceSettingsFields value={pace} onPatch={onPatch} />
            </div>
          </div>
        </div>,
        document.body,
      )
    : null

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        title={titleText}
        aria-label={titleText}
        className={
          className ??
          (iconOnly
            ? 'inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-stone-200 bg-stone-50 text-[#262626] transition-all duration-200 hover:border-stone-400'
            : 'inline-flex max-w-full items-center gap-1 rounded-lg border border-stone-200 bg-stone-50 px-2.5 py-1.5 text-[13px] text-[#262626] transition-all duration-200 hover:border-stone-400')
        }
      >
        <Gauge className="size-3.5 shrink-0" strokeWidth={1.75} aria-hidden />
        {!iconOnly ? (
          <>
            <span className="max-w-[7.5em] truncate">{label}</span>
            <ChevronDown className="size-3.5 shrink-0 opacity-60" aria-hidden />
          </>
        ) : null}
      </button>
      {panel}
    </>
  )
}
