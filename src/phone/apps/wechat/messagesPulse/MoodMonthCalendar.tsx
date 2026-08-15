import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useMemo, useState } from 'react'
import { LUMI_SHELL, LUMI_SHELL_FONT, LUMI_SHELL_NUM_STYLE } from '../lumiShellTheme'
import { moodLevelForDate } from './buildFriendPulse'
import { MOOD_FACE, MOOD_LABEL, MOOD_LEVELS } from './moodFaces'
import type { FriendMoodLevel } from './types'

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'] as const

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function buildMonthCells(year: number, month: number): Array<Date | null> {
  const first = new Date(year, month, 1)
  const startPad = first.getDay() // 0 Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: Array<Date | null> = []
  for (let i = 0; i < startPad; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d))
  while (cells.length % 7 !== 0) cells.push(null)
  while (cells.length < 42) cells.push(null)
  return cells
}

export function MoodMonthCalendar({
  characterId,
  todayMood,
  onEditToday,
}: {
  characterId: string
  /** 今日心情覆盖 0–5 */
  todayMood?: FriendMoodLevel
  onEditToday?: () => void
}) {
  const today = useMemo(() => {
    const d = new Date()
    d.setHours(12, 0, 0, 0)
    return d
  }, [])
  const [cursor, setCursor] = useState(() => ({ y: today.getFullYear(), m: today.getMonth() }))
  const [picked, setPicked] = useState<Date | null>(today)

  const cells = useMemo(() => buildMonthCells(cursor.y, cursor.m), [cursor.y, cursor.m])

  const pickedMood =
    picked != null
      ? moodLevelForDate(characterId, picked, sameDay(picked, today) ? todayMood : null)
      : null

  const shiftMonth = (delta: number) => {
    setCursor((c) => {
      const d = new Date(c.y, c.m + delta, 1)
      return { y: d.getFullYear(), m: d.getMonth() }
    })
  }

  const shiftYear = (delta: number) => {
    setCursor((c) => ({ y: c.y + delta, m: c.m }))
  }

  const goToday = () => {
    setCursor({ y: today.getFullYear(), m: today.getMonth() })
    setPicked(today)
  }

  return (
    <div style={{ fontFamily: LUMI_SHELL_FONT }}>
      <div className="mb-3 flex items-center gap-1">
        <button
          type="button"
          aria-label="上一年"
          className="flex h-8 w-8 items-center justify-center rounded-full"
          style={{ color: LUMI_SHELL.mist }}
          onClick={() => shiftYear(-1)}
        >
          <ChevronLeft size={16} strokeWidth={2} />
          <ChevronLeft size={16} strokeWidth={2} className="-ml-2.5 opacity-50" />
        </button>
        <button
          type="button"
          aria-label="上一月"
          className="flex h-8 w-8 items-center justify-center rounded-full"
          style={{ color: LUMI_SHELL.ink }}
          onClick={() => shiftMonth(-1)}
        >
          <ChevronLeft size={18} strokeWidth={1.75} />
        </button>
        <div className="min-w-0 flex-1 text-center">
          <p
            className="text-[16px] font-semibold tabular-nums tracking-tight"
            style={{ color: LUMI_SHELL.ink, ...LUMI_SHELL_NUM_STYLE }}
          >
            {cursor.y}年{cursor.m + 1}月
          </p>
        </div>
        <button
          type="button"
          aria-label="下一月"
          className="flex h-8 w-8 items-center justify-center rounded-full"
          style={{ color: LUMI_SHELL.ink }}
          onClick={() => shiftMonth(1)}
        >
          <ChevronRight size={18} strokeWidth={1.75} />
        </button>
        <button
          type="button"
          aria-label="下一年"
          className="flex h-8 w-8 items-center justify-center rounded-full"
          style={{ color: LUMI_SHELL.mist }}
          onClick={() => shiftYear(1)}
        >
          <ChevronRight size={16} strokeWidth={2} className="-mr-2.5 opacity-50" />
          <ChevronRight size={16} strokeWidth={2} />
        </button>
      </div>

      <div className="mb-2 flex items-center justify-between px-0.5">
        <button type="button" className="text-[12px]" style={{ color: LUMI_SHELL.mist }} onClick={goToday}>
          回到今天
        </button>
        {pickedMood != null ? (
          <p className="flex items-center gap-1 text-[12px]" style={{ color: LUMI_SHELL.ink }}>
            <span className="text-[15px] leading-none">{MOOD_FACE[pickedMood]}</span>
            {picked && sameDay(picked, today) ? '今日' : '当日'} · {MOOD_LABEL[pickedMood]}
            {picked && sameDay(picked, today) && onEditToday ? (
              <button
                type="button"
                className="ml-1"
                style={{ color: LUMI_SHELL.mist }}
                onClick={onEditToday}
              >
                修改
              </button>
            ) : null}
          </p>
        ) : null}
      </div>

      <div className="mb-1 grid grid-cols-7 gap-1">
        {WEEKDAYS.map((w) => (
          <div key={w} className="py-1 text-center text-[11px]" style={{ color: LUMI_SHELL.mist }}>
            {w}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (!day) {
            return <div key={`e-${i}`} className="aspect-square" />
          }
          const future = day.getTime() > today.getTime()
          const mood = future
            ? null
            : moodLevelForDate(characterId, day, sameDay(day, today) ? todayMood : null)
          const isToday = sameDay(day, today)
          const isPicked = picked != null && sameDay(day, picked)
          return (
            <button
              key={`${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`}
              type="button"
              disabled={future}
              className="relative flex aspect-square flex-col items-center justify-center gap-0.5 rounded-[10px]"
              style={{
                background: isPicked
                  ? 'rgba(16,16,18,0.06)'
                  : isToday
                    ? 'rgba(16,16,18,0.03)'
                    : 'transparent',
                opacity: future ? 0.28 : 1,
                outline: isPicked ? `1.5px solid ${LUMI_SHELL.ink}` : undefined,
                outlineOffset: 1,
                boxShadow: isToday && !isPicked ? `inset 0 0 0 1px ${LUMI_SHELL.mist}` : undefined,
              }}
              onClick={() => setPicked(day)}
              title={mood != null ? MOOD_LABEL[mood] : undefined}
            >
              <span
                className="text-[10px] tabular-nums font-medium leading-none"
                style={{
                  color: future ? LUMI_SHELL.mist : LUMI_SHELL.ink,
                  ...LUMI_SHELL_NUM_STYLE,
                }}
              >
                {day.getDate()}
              </span>
              {mood != null ? (
                <span className="text-[15px] leading-none" aria-hidden>
                  {MOOD_FACE[mood]}
                </span>
              ) : (
                <span className="h-[15px]" />
              )}
            </button>
          )
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 px-0.5">
        <div className="flex flex-wrap items-center gap-1">
          {MOOD_LEVELS.map((m) => (
            <span
              key={m}
              title={MOOD_LABEL[m]}
              className="inline-flex h-6 w-6 items-center justify-center text-[14px]"
            >
              {MOOD_FACE[m]}
            </span>
          ))}
          <span className="ml-1 text-[10px]" style={{ color: LUMI_SHELL.mist }}>
            生气 → 大笑
          </span>
        </div>
        <span className="text-[10px]" style={{ color: LUMI_SHELL.mist }}>
          点日期查看当日心情
        </span>
      </div>
    </div>
  )
}
