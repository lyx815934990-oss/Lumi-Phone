import { formatDuration, parseDateKey } from '../mockData'
import type { SleepHistoryDay } from '../types'
import { Pressable } from '../../../../../components/Pressable'

function weekdayShort(dateKey: string): string {
  const d = parseDateKey(dateKey)
  return ['日', '一', '二', '三', '四', '五', '六'][d.getDay()] ?? ''
}

export function SleepHistoryStrip({
  history,
  selectedDateKey,
  onSelect,
}: {
  history: SleepHistoryDay[]
  selectedDateKey: string
  onSelect: (dateKey: string) => void
}) {
  const maxMin = Math.max(...history.map((h) => h.totalSleepMin), 1)

  return (
    <div className="sleep-card px-4 py-5">
      <div className="mb-3 text-[12px] tracking-[0.16em] text-[var(--sleep-muted)]">近 7 天</div>
      <div className="sleep-history-scroll -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {history.map((day) => {
          const active = day.dateKey === selectedDateKey
          const h = Math.max(18, Math.round((day.totalSleepMin / maxMin) * 56))
          const { hours, minutes } = formatDuration(day.totalSleepMin)
          return (
            <Pressable
              key={day.dateKey}
              type="button"
              className={`sleep-history-item flex w-[52px] shrink-0 flex-col items-center rounded-[14px] border px-1.5 py-2 outline-none ${
                active
                  ? 'border-[var(--sleep-accent)]/40 bg-[var(--sleep-chip)]'
                  : 'border-transparent bg-transparent'
              }`}
              onClick={() => onSelect(day.dateKey)}
              aria-label={`${day.dateKey} 睡眠 ${hours}小时${minutes}分`}
              aria-pressed={active}
            >
              <div className="flex h-[56px] items-end">
                <div
                  className="w-5 rounded-full"
                  style={{
                    height: h,
                    background: `linear-gradient(180deg, var(--sleep-ring-to), var(--sleep-stage-deep))`,
                    opacity: 0.45 + (day.qualityScore / 100) * 0.55,
                  }}
                />
              </div>
              <div className="mt-2 text-[10px] text-[var(--sleep-muted)]">周{weekdayShort(day.dateKey)}</div>
              <div className="sleep-num mt-0.5 text-[10px] text-[var(--sleep-muted-2)]">
                {hours}:{minutes < 10 ? `0${minutes}` : minutes}
              </div>
            </Pressable>
          )
        })}
      </div>
    </div>
  )
}
