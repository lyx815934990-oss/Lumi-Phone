import type { DualNarrativeStoryFields, StoryTimeEditMode } from './dualNarrativeTime'
import {
  dualNarrativeFieldsFromDatetimeLocal,
  dualNarrativeFieldsFromDatetimeLocalRange,
  dualNarrativeFieldsToDatetimeLocal,
  dualNarrativeFieldsToEndDatetimeLocal,
  switchDualNarrativeStoryEditMode,
} from './dualNarrativeTime'

const MUTED = '#9CA3AF'

/** 记忆 / 线下摘要共用：时间点 或 时间段 编辑 */
export function MemoryStoryTimeFieldsEditor({
  value,
  onChange,
  disabled,
  hint,
}: {
  value: DualNarrativeStoryFields
  onChange: (next: DualNarrativeStoryFields) => void
  disabled?: boolean
  hint?: string
}) {
  const mode: StoryTimeEditMode = value.editMode === 'range' ? 'range' : 'point'
  const inputCls =
    'min-w-0 flex-1 rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-[14px] text-gray-900 outline-none focus:border-gray-400 focus:bg-white disabled:opacity-60'

  return (
    <div>
      <div className="mb-2 flex rounded-full bg-gray-100/80 p-1">
        {(
          [
            { id: 'point' as const, label: '时间点' },
            { id: 'range' as const, label: '时间段' },
          ] as const
        ).map((tab) => {
          const active = mode === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              disabled={disabled}
              onClick={() => onChange(switchDualNarrativeStoryEditMode(value, tab.id))}
              className={`flex-1 rounded-full py-2 text-[12px] font-medium transition-colors disabled:opacity-50 ${
                active ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400'
              }`}
            >
              {tab.label}
            </button>
          )
        })}
      </div>
      {hint ? (
        <p className="mb-2 text-[11px] leading-relaxed" style={{ color: MUTED }}>
          {hint}
        </p>
      ) : null}

      {mode === 'point' ? (
        <div className="flex items-center gap-2">
          <input
            type="datetime-local"
            value={dualNarrativeFieldsToDatetimeLocal(value)}
            onChange={(e) => onChange(dualNarrativeFieldsFromDatetimeLocal(e.target.value))}
            disabled={disabled}
            className={inputCls}
          />
          {value.storyTimeLabel || value.storyDay ? (
            <button
              type="button"
              disabled={disabled}
              className="shrink-0 rounded-full px-3 py-2 text-[12px] text-gray-500 active:bg-gray-100 disabled:opacity-50"
              onClick={() => onChange({})}
            >
              清除
            </button>
          ) : null}
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="w-8 shrink-0 text-[11px] text-gray-400">起</span>
            <input
              type="datetime-local"
              value={dualNarrativeFieldsToDatetimeLocal(value)}
              onChange={(e) =>
                onChange(
                  dualNarrativeFieldsFromDatetimeLocalRange(
                    e.target.value,
                    dualNarrativeFieldsToEndDatetimeLocal(value) || e.target.value,
                  ),
                )
              }
              disabled={disabled}
              className={inputCls}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="w-8 shrink-0 text-[11px] text-gray-400">止</span>
            <input
              type="datetime-local"
              value={dualNarrativeFieldsToEndDatetimeLocal(value)}
              onChange={(e) =>
                onChange(
                  dualNarrativeFieldsFromDatetimeLocalRange(
                    dualNarrativeFieldsToDatetimeLocal(value) || e.target.value,
                    e.target.value,
                  ),
                )
              }
              disabled={disabled}
              className={inputCls}
            />
            {value.storyTimeLabel || value.storyDay ? (
              <button
                type="button"
                disabled={disabled}
                className="shrink-0 rounded-full px-3 py-2 text-[12px] text-gray-500 active:bg-gray-100 disabled:opacity-50"
                onClick={() => onChange({})}
              >
                清除
              </button>
            ) : null}
          </div>
        </div>
      )}

      {value.storyTimeLabel ? (
        <p className="mt-1.5 text-[12px] text-gray-500">将保存为：{value.storyTimeLabel}</p>
      ) : null}
    </div>
  )
}
