import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import {
  formatGregorianStoryDay,
  parseGregorianStoryDayToMs,
} from './scheduleEntries'

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'] as const

const C = {
  ink: '#1C1C1E',
  muted: '#8E8E93',
  faint: '#C7C7CC',
  line: '#E5E5EA',
  today: '#FF3B30',
  dot: '#FF6B8A',
  page: '#FFFFFF',
}

export type ScheduleMonthCalendarProps = {
  /** 高亮锚点日（剧情优先 / 系统兜底），格式 2026年10月21日 */
  anchorStoryDay: string
  /** 当前选中日（编辑定位）；与锚点不同时用描边区分 */
  selectedStoryDay?: string | null
  /** 有事项的公历日集合 */
  eventDays?: ReadonlySet<string> | ReadonlyArray<string>
  /** 点击某日 */
  onSelectDay: (storyDay: string) => void
  /** 锚点来源文案，如「剧情时间」 */
  anchorSourceLabel?: string | null
  /** 是否显示「今天」快捷按钮 */
  showTodayButton?: boolean
  /** 编辑器内嵌时略收紧字号/间距 */
  compact?: boolean
  className?: string
}

type DayCell = {
  storyDay: string
  dayNum: number
  inMonth: boolean
  isAnchor: boolean
  isSelected: boolean
  hasEvent: boolean
}

type MonthBlock = {
  key: string
  year: number
  month0: number
  title: string
  cells: DayCell[]
}

function parseYmd(storyDay: string): { y: number; m: number; d: number } | null {
  const ms = parseGregorianStoryDayToMs(storyDay, '12:00')
  if (ms == null) return null
  const dt = new Date(ms)
  return { y: dt.getFullYear(), m: dt.getMonth(), d: dt.getDate() }
}

function buildMonth(
  year: number,
  month0: number,
  anchorStoryDay: string,
  selectedStoryDay: string,
  eventSet: Set<string>,
): MonthBlock {
  const first = new Date(year, month0, 1)
  const startPad = first.getDay() // 0=Sun
  const daysInMonth = new Date(year, month0 + 1, 0).getDate()
  const prevDays = new Date(year, month0, 0).getDate()
  const cells: DayCell[] = []

  const push = (dt: Date, dayNum: number, inMonth: boolean) => {
    const storyDay = formatGregorianStoryDay(dt)
    cells.push({
      storyDay,
      dayNum,
      inMonth,
      isAnchor: storyDay === anchorStoryDay,
      isSelected: storyDay === selectedStoryDay,
      hasEvent: eventSet.has(storyDay),
    })
  }

  for (let i = 0; i < startPad; i++) {
    const d = prevDays - startPad + 1 + i
    push(new Date(year, month0 - 1, d), d, false)
  }
  for (let d = 1; d <= daysInMonth; d++) {
    push(new Date(year, month0, d), d, true)
  }
  while (cells.length % 7 !== 0) {
    const nextIdx = cells.length - startPad - daysInMonth + 1
    push(new Date(year, month0 + 1, nextIdx), nextIdx, false)
  }

  return {
    key: `${year}-${month0}`,
    year,
    month0,
    title: `${month0 + 1}月`,
    cells,
  }
}

type ViewYm = { y: number; m: number }

function ymFromStoryDay(storyDay: string, fallback?: ViewYm): ViewYm {
  const p = parseYmd(storyDay)
  if (p) return { y: p.y, m: p.m }
  if (fallback) return fallback
  const n = new Date()
  return { y: n.getFullYear(), m: n.getMonth() }
}

function shiftYm(ym: ViewYm, delta: number): ViewYm {
  const d = new Date(ym.y, ym.m + delta, 1)
  return { y: d.getFullYear(), m: d.getMonth() }
}

/** 单月左右翻页月历：当天红圈，有事项粉点 */
export function ScheduleMonthCalendar({
  anchorStoryDay,
  selectedStoryDay,
  eventDays,
  onSelectDay,
  anchorSourceLabel,
  showTodayButton = true,
  compact = false,
  className,
}: ScheduleMonthCalendarProps) {
  const selected = selectedStoryDay?.trim() || anchorStoryDay
  const [viewYm, setViewYm] = useState<ViewYm>(() => ymFromStoryDay(selected || anchorStoryDay))
  const touchStartX = useRef<number | null>(null)

  const eventSet = useMemo(() => {
    if (!eventDays) return new Set<string>()
    if (eventDays instanceof Set) return eventDays
    return new Set(eventDays)
  }, [eventDays])

  // 锚点或选中日变化时，翻到对应月份
  useEffect(() => {
    setViewYm(ymFromStoryDay(selected || anchorStoryDay))
  }, [anchorStoryDay, selected])

  const month = useMemo(
    () => buildMonth(viewYm.y, viewYm.m, anchorStoryDay, selected, eventSet),
    [viewYm.y, viewYm.m, anchorStoryDay, selected, eventSet],
  )

  const goPrev = () => setViewYm((ym) => shiftYm(ym, -1))
  const goNext = () => setViewYm((ym) => shiftYm(ym, 1))
  const goToday = () => {
    setViewYm(ymFromStoryDay(anchorStoryDay))
    onSelectDay(anchorStoryDay)
  }

  return (
    <div className={className} style={{ background: C.page, color: C.ink }}>
      <div className="mb-1 flex items-center justify-between gap-2 px-0.5">
        <button
          type="button"
          onClick={goPrev}
          className="flex size-8 shrink-0 items-center justify-center rounded-full"
          style={{ color: C.today }}
          aria-label="上一月"
        >
          <ChevronLeft className="size-5" strokeWidth={2.2} />
        </button>
        <div className="min-w-0 flex-1 text-center">
          <p className="truncate text-[13px] font-semibold" style={{ color: C.today }}>
            {month.year}年
          </p>
          {anchorSourceLabel ? (
            <p className="truncate text-[10px]" style={{ color: C.muted }}>
              {anchorSourceLabel}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={goNext}
          className="flex size-8 shrink-0 items-center justify-center rounded-full"
          style={{ color: C.today }}
          aria-label="下一月"
        >
          <ChevronRight className="size-5" strokeWidth={2.2} />
        </button>
      </div>

      <div
        className="mb-1 grid grid-cols-7 text-center text-[11px]"
        style={{ color: C.muted }}
      >
        {WEEKDAYS.map((w, i) => (
          <span key={w} style={{ color: i === 0 || i === 6 ? C.faint : C.muted }}>
            {w}
          </span>
        ))}
      </div>

      <div
        className="select-none touch-pan-y"
        onTouchStart={(e) => {
          touchStartX.current = e.changedTouches[0]?.clientX ?? null
        }}
        onTouchEnd={(e) => {
          const start = touchStartX.current
          touchStartX.current = null
          if (start == null) return
          const end = e.changedTouches[0]?.clientX
          if (end == null) return
          const dx = end - start
          if (Math.abs(dx) < 48) return
          if (dx > 0) goPrev()
          else goNext()
        }}
      >
        <h3
          className={`mb-1 px-1 font-bold tracking-tight ${compact ? 'text-[18px]' : 'text-[22px]'}`}
          style={{ color: C.ink }}
        >
          {month.title}
        </h3>
        <div className="grid grid-cols-7">
          {month.cells.map((cell) => {
            const dow = new Date(
              parseGregorianStoryDayToMs(cell.storyDay, '12:00') ?? 0,
            ).getDay()
            const weekend = dow === 0 || dow === 6
            return (
              <button
                key={`${month.key}-${cell.storyDay}-${cell.inMonth ? 'in' : 'out'}`}
                type="button"
                onClick={() => onSelectDay(cell.storyDay)}
                className={`relative flex flex-col items-center ${compact ? 'py-1' : 'py-1.5'}`}
                aria-label={cell.storyDay}
              >
                <span
                  className={`flex items-center justify-center font-semibold tabular-nums ${
                    compact ? 'size-7 text-[13px]' : 'size-8 text-[15px]'
                  }`}
                  style={{
                    borderRadius: 999,
                    background: cell.isAnchor ? C.today : 'transparent',
                    boxShadow:
                      cell.isSelected && !cell.isAnchor
                        ? `inset 0 0 0 1.5px ${C.today}`
                        : undefined,
                    color: cell.isAnchor
                      ? '#fff'
                      : !cell.inMonth
                        ? C.faint
                        : weekend
                          ? C.muted
                          : C.ink,
                    opacity: !cell.inMonth && !cell.isAnchor ? 0.45 : 1,
                  }}
                >
                  {cell.dayNum}
                </span>
                {cell.hasEvent ? (
                  <span
                    className="mt-0.5 size-1 rounded-full"
                    style={{ background: cell.isAnchor ? '#fff' : C.dot }}
                    aria-hidden
                  />
                ) : (
                  <span className="mt-0.5 size-1" aria-hidden />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {showTodayButton ? (
        <button
          type="button"
          onClick={goToday}
          className="mt-2 inline-flex items-center rounded-full border px-3 py-1 text-[12px] font-semibold"
          style={{ borderColor: C.line, color: C.today, background: C.page }}
        >
          今天
        </button>
      ) : null}
    </div>
  )
}

export default ScheduleMonthCalendar
