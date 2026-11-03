import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronRight, X } from 'lucide-react'
import { INK_KICKER, INK_LEAD, INK_SECTION, INK_TITLE } from './personaEditorTabs'
import type {
  ScheduleCalendarEvent,
  ScheduleCalendarEventStatus,
  ScheduleEntry,
  ScheduleTable,
} from '../types'
import { personaDb } from '../idb'
import {
  closePastScheduleCalendarEvents,
  entriesForDay,
  eventsForCalendarDay,
  findCurrentScheduleSlot,
  formatGregorianStoryDay,
  formatScheduleDuration,
  normalizeScheduleCalendarEvents,
  resolveCalendarAnchor,
  resolveCharacterScheduleEntries,
  resolveScheduleClock,
  scheduleDayLabel,
  scheduleTagAccent,
  type ScheduleDayOfWeek,
} from '../../schedule/scheduleEntries'
import { ScheduleMonthCalendar } from '../../schedule/ScheduleMonthCalendar'
import { resolveCharacterStoryNowMs } from '../../time/messagesTabStoryTime'

const INK = '#2E271C'
const CARD = '#F8F7F4'
const PAGE = '#EDEBE7'
const LINE = '#D2D0CB'
const ACCENT = '#B54A3C'

const DAYS: ScheduleDayOfWeek[] = [0, 1, 2, 3, 4, 5, 6]

const CAL_STATUS_ZH: Record<ScheduleCalendarEventStatus, string> = {
  upcoming: '未到',
  past: '已过期',
  done: '已完成',
  skipped: '已跳过',
}

type ViewMode = 'weekly' | 'calendar'

export function ScheduleTimelineTab({
  characterId,
  schedule,
  scheduleEntries,
  scheduleCalendarEvents,
  scheduleCalendarAutoUpdateEnabled,
  onEdit,
  onEditCalendarDay,
  currentTimeMs,
  storyDay,
  storyTime,
  storyNowLabel,
}: {
  characterId?: string | null
  schedule: ScheduleTable | undefined
  scheduleEntries?: ScheduleEntry[] | null
  scheduleCalendarEvents?: ScheduleCalendarEvent[] | null
  scheduleCalendarAutoUpdateEnabled?: boolean
  /** 顶栏「编辑」；可带当前预览模式，便于编辑器对齐 */
  onEdit: (opts?: { mode?: ViewMode }) => void
  /** 从日程弹窗进入编辑并定位某日 */
  onEditCalendarDay?: (storyDay: string) => void
  currentTimeMs?: number
  storyDay?: string | null
  storyTime?: string | null
  storyNowLabel?: string | null
}) {
  const [resolvedStoryLabel, setResolvedStoryLabel] = useState<string | null>(
    storyNowLabel?.trim() || null,
  )
  const [peekDay, setPeekDay] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const external = storyNowLabel?.trim() || storyDay?.trim() || ''
    if (external) {
      setResolvedStoryLabel(
        storyNowLabel?.trim() ||
          (storyDay?.trim()
            ? `${storyDay.trim()}${storyTime?.trim() ? ` ${storyTime.trim()}` : ''}`
            : null),
      )
      return
    }
    const cid = characterId?.trim()
    if (!cid) {
      setResolvedStoryLabel(null)
      return
    }
    void (async () => {
      try {
        const [state, storyMs] = await Promise.all([
          personaDb.getStoryTimelineState(cid),
          resolveCharacterStoryNowMs(cid),
        ])
        if (cancelled) return
        const day = state?.currentStoryDay?.trim()
        const time = state?.currentStoryTime?.trim()
        if (day) {
          setResolvedStoryLabel(time ? `${day} ${time}` : day)
          return
        }
        if (storyMs != null && Number.isFinite(storyMs)) {
          setResolvedStoryLabel(formatGregorianStoryDay(new Date(storyMs)))
          return
        }
        setResolvedStoryLabel(null)
      } catch {
        if (!cancelled) setResolvedStoryLabel(null)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [characterId, storyNowLabel, storyDay, storyTime])

  const clock = useMemo(
    () =>
      resolveScheduleClock({
        currentTimeMs,
        storyDay,
        storyTime,
        storyNowLabel: resolvedStoryLabel,
      }),
    [currentTimeMs, storyDay, storyTime, resolvedStoryLabel],
  )
  const calAnchor = useMemo(
    () =>
      resolveCalendarAnchor({
        currentTimeMs,
        storyDay,
        storyTime,
        storyNowLabel: resolvedStoryLabel,
        currentTimeIsStory: !!resolvedStoryLabel || !!storyDay,
      }),
    [currentTimeMs, storyDay, storyTime, resolvedStoryLabel],
  )
  const entries = useMemo(
    () => resolveCharacterScheduleEntries({ schedule, scheduleEntries }),
    [schedule, scheduleEntries],
  )
  const calEvents = useMemo(
    () =>
      closePastScheduleCalendarEvents(
        normalizeScheduleCalendarEvents(scheduleCalendarEvents),
        calAnchor,
      ),
    [scheduleCalendarEvents, calAnchor],
  )
  const eventDays = useMemo(() => new Set(calEvents.map((e) => e.storyDay.trim())), [calEvents])

  const [mode, setMode] = useState<ViewMode>('weekly')
  const [activeDay, setActiveDay] = useState<ScheduleDayOfWeek>(clock.day)
  useEffect(() => {
    setActiveDay(clock.day)
  }, [clock.day])
  const dayEntries = entriesForDay(entries, activeDay)
  const nowSlot =
    activeDay === clock.day ? findCurrentScheduleSlot(entries, clock) : null
  const sourceLabel = clock.source === 'story' ? '剧情时钟' : '系统时间'
  const calSourceLabel = calAnchor.source === 'story' ? '剧情时间' : '系统时间'

  const peekEvents = useMemo(
    () => (peekDay ? eventsForCalendarDay(calEvents, peekDay) : []),
    [calEvents, peekDay],
  )

  const onPickCalendarDay = (day: string) => {
    const list = eventsForCalendarDay(calEvents, day)
    if (!list.length) {
      setPeekDay(null)
      return
    }
    setPeekDay(day)
  }

  return (
    <section className={`${INK_SECTION} px-4 pb-8 pt-5`}>
      <header className="mb-5 flex items-start justify-between gap-3 border-b pb-4" style={{ borderColor: LINE }}>
        <div>
          <p className={INK_KICKER}>08 TIME · 行程轴</p>
          <h2 className={INK_TITLE}>日程表</h2>
          <p className={INK_LEAD}>
            周循环作息 + 月历安排；有安排的日期可点开查看
            {scheduleCalendarAutoUpdateEnabled ? ' · 自动更新已开' : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onEdit({ mode })}
          className="inline-flex shrink-0 items-center gap-1 border-[1.5px] px-3 py-1.5 text-[12px] font-semibold transition-colors"
          style={{ borderColor: INK, color: INK, background: CARD, borderRadius: 9 }}
        >
          编辑
          <ChevronRight className="size-3.5 opacity-50" />
        </button>
      </header>

      <div
        className="mb-2 flex gap-1 border-[1.5px] p-1"
        style={{ borderColor: INK, background: CARD, borderRadius: 10 }}
      >
        {(
          [
            { id: 'weekly' as const, label: '周循环' },
            { id: 'calendar' as const, label: '日历' },
          ] as const
        ).map((m) => {
          const on = mode === m.id
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => setMode(m.id)}
              className="flex-1 px-2 py-1.5 text-[12px] font-semibold transition-colors"
              style={{
                borderRadius: 8,
                background: on ? INK : 'transparent',
                color: on ? CARD : '#6A6E76',
              }}
            >
              {m.label}
            </button>
          )
        })}
      </div>
      <p className="mb-4 text-[11px] leading-relaxed" style={{ color: '#6A6E76' }}>
        {mode === 'weekly'
          ? '周循环 = 没事时的生活习惯；有日历特殊事件时日历优先。'
          : '日历 = 特殊事件安排，优先于周循环；点有安排的日期可查看详情。'}
      </p>

      {mode === 'calendar' ? (
        <div
          className="overflow-hidden border-[1.5px] px-2 pb-3 pt-3"
          style={{ borderColor: LINE, background: '#fff', borderRadius: 12 }}
        >
          <ScheduleMonthCalendar
            anchorStoryDay={calAnchor.storyDay}
            selectedStoryDay={peekDay}
            eventDays={eventDays}
            anchorSourceLabel={`${calSourceLabel} · ${calAnchor.label}`}
            onSelectDay={onPickCalendarDay}
          />
        </div>
      ) : !schedule && !entries.length ? (
        <p className="py-10 text-center text-[13px]" style={{ color: '#9AA0A8' }}>
          尚未创建周循环日程 · 点击「编辑」开始
        </p>
      ) : (
        <>
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="truncate text-[13px] font-semibold" style={{ color: INK }}>
              {schedule?.name?.trim() || '日程专栏'}
            </p>
            <span
              className="shrink-0 border px-2 py-0.5 font-mono text-[10px] tracking-wide"
              style={{ borderColor: INK, color: INK, background: PAGE, borderRadius: 999 }}
              title={clock.label}
            >
              {sourceLabel} · {clock.label}
            </span>
          </div>

          <div
            className="mb-4 flex gap-1 overflow-x-auto border-[1.5px] p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            style={{ borderColor: INK, background: CARD, borderRadius: 10 }}
          >
            {DAYS.map((d) => {
              const on = activeDay === d
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => setActiveDay(d)}
                  className="min-w-[40px] flex-1 px-1.5 py-2 text-center text-[11px] font-semibold transition-colors"
                  style={{
                    borderRadius: 8,
                    background: on ? INK : 'transparent',
                    color: on ? CARD : '#6A6E76',
                  }}
                >
                  {scheduleDayLabel(d).replace('周', '')}
                </button>
              )
            })}
          </div>

          {dayEntries.length === 0 ? (
            <div
              className="border-[1.5px] px-4 py-8 text-center text-[13px]"
              style={{ borderColor: INK, background: PAGE, color: '#6A6E76', borderRadius: 10 }}
            >
              {scheduleDayLabel(activeDay)}暂无安排 · 自由状态
            </div>
          ) : (
            <div className="relative pl-14">
              <div
                className="absolute bottom-3 left-[27px] top-3 w-[1.5px]"
                style={{ background: INK }}
                aria-hidden
              />
              <ul className="space-y-4">
                {dayEntries.map((e) => {
                  const accent = scheduleTagAccent(e.tag)
                  const isNow = nowSlot?.id === e.id
                  const dur = formatScheduleDuration(e.durationAmount, e.durationUnit)
                  return (
                    <li key={e.id} className="relative">
                      <div className="absolute -left-14 top-0 w-11 text-right">
                        <p className="font-mono text-[11px] font-semibold leading-tight" style={{ color: INK }}>
                          {e.startTime}
                        </p>
                        <p className="font-mono text-[10px]" style={{ color: '#9AA0A8' }}>
                          {e.endTime}
                        </p>
                      </div>
                      <span
                        className="absolute -left-[23px] top-2 size-3 border-[1.5px]"
                        style={{
                          borderRadius: 999,
                          background: accent.dot,
                          borderColor: INK,
                          boxShadow: isNow ? `0 0 0 4px ${accent.dot}33` : undefined,
                        }}
                        aria-hidden
                      />
                      <div
                        className="relative border px-3 py-2.5"
                        style={{
                          borderRadius: 10,
                          borderWidth: isNow ? 2 : 1.5,
                          borderStyle: 'solid',
                          borderColor: isNow ? accent.card : INK,
                          background: CARD,
                        }}
                      >
                        {isNow ? (
                          <span
                            className="absolute right-2 top-2 px-1.5 py-0.5 font-mono text-[9px] font-bold tracking-wider text-white"
                            style={{ background: accent.card, borderRadius: 4 }}
                          >
                            NOW
                          </span>
                        ) : null}
                        <div className="flex items-start gap-2 pr-10">
                          <span
                            className="mt-0.5 size-2 shrink-0"
                            style={{ background: accent.dot, borderRadius: 2 }}
                            aria-hidden
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-[13px] font-semibold leading-snug" style={{ color: INK }}>
                              {e.activity}
                            </p>
                            <p className="mt-1 text-[11px]" style={{ color: '#6A6E76' }}>
                              {accent.label}
                              {e.location?.trim() ? ` · ${e.location.trim()}` : ''}
                              {dur ? ` · ${dur}` : ''}
                            </p>
                          </div>
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </>
      )}

      <AnimatePresence>
        {peekDay && peekEvents.length ? (
          <motion.div
            className="fixed inset-0 z-[1200] flex items-end justify-center"
            style={{ background: 'rgba(20,16,12,0.4)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setPeekDay(null)
            }}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label={`${peekDay} 日程安排`}
              className="w-full max-w-[520px] border-t-[2px] px-4 pt-4"
              style={{
                borderColor: INK,
                background: CARD,
                paddingBottom: 'max(20px, env(safe-area-inset-bottom, 0px))',
                borderTopLeftRadius: 16,
                borderTopRightRadius: 16,
              }}
              initial={{ y: 48 }}
              animate={{ y: 0 }}
              exit={{ y: 48 }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold tracking-[0.14em]" style={{ color: '#9AA0A8' }}>
                    DAY · 当日行程
                  </p>
                  <h3 className="mt-0.5 truncate text-[16px] font-bold" style={{ color: INK }}>
                    {peekDay}
                  </h3>
                  <p className="mt-0.5 text-[11px]" style={{ color: '#6A6E76' }}>
                    共 {peekEvents.length} 项安排
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPeekDay(null)}
                  className="flex size-8 shrink-0 items-center justify-center border-[1.5px]"
                  style={{ borderColor: LINE, background: PAGE, borderRadius: 8, color: INK }}
                  aria-label="关闭"
                >
                  <X className="size-4" />
                </button>
              </div>

              <ul className="max-h-[min(48vh,360px)] space-y-2.5 overflow-y-auto pb-1">
                {peekEvents.map((e) => {
                  const accent = scheduleTagAccent(e.tag)
                  const dur = formatScheduleDuration(e.durationAmount, e.durationUnit)
                  const faded = e.status === 'past' || e.status === 'done' || e.status === 'skipped'
                  return (
                    <li
                      key={e.id}
                      className="border-[1.5px] px-3 py-2.5"
                      style={{
                        borderColor: INK,
                        background: PAGE,
                        borderRadius: 10,
                        opacity: faded ? 0.6 : 1,
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-mono text-[12px] font-semibold" style={{ color: INK }}>
                          {e.startTime}
                          {e.endTime ? `-${e.endTime}` : ''}
                        </p>
                        <span
                          className="shrink-0 border px-1.5 py-0.5 text-[10px]"
                          style={{ borderColor: LINE, color: ACCENT, borderRadius: 4 }}
                        >
                          {CAL_STATUS_ZH[e.status]}
                        </span>
                      </div>
                      <p className="mt-1.5 text-[13.5px] font-semibold leading-snug" style={{ color: INK }}>
                        {e.activity}
                      </p>
                      <p className="mt-1 text-[11px]" style={{ color: '#6A6E76' }}>
                        <span style={{ color: accent.dot }}>{accent.label}</span>
                        {e.location?.trim() ? ` · ${e.location.trim()}` : ''}
                        {dur ? ` · ${dur}` : ''}
                      </p>
                      {e.note?.trim() ? (
                        <p className="mt-1 text-[11px]" style={{ color: '#9AA0A8' }}>
                          备注 · {e.note.trim()}
                        </p>
                      ) : null}
                    </li>
                  )
                })}
              </ul>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPeekDay(null)}
                  className="border-[1.5px] py-2.5 text-[13px] font-semibold"
                  style={{ borderColor: LINE, background: PAGE, color: INK, borderRadius: 9 }}
                >
                  关闭
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const day = peekDay
                    setPeekDay(null)
                    if (day && onEditCalendarDay) onEditCalendarDay(day)
                    else onEdit({ mode: 'calendar' })
                  }}
                  className="border-[1.5px] py-2.5 text-[13px] font-bold"
                  style={{ borderColor: INK, background: INK, color: CARD, borderRadius: 9 }}
                >
                  编辑这一天
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  )
}
