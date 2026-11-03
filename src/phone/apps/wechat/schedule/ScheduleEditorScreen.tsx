import { AnimatePresence, motion } from 'framer-motion'
import { Clock3, Hourglass, MapPin } from 'lucide-react'
import { useEffect, useId, useMemo, useState } from 'react'

import type { ApiConfig } from '../../api/types'
import type {
  ScheduleCalendarEvent,
  ScheduleCalendarEventStatus,
  ScheduleDayOfWeek,
  ScheduleDurationUnit,
  ScheduleEntry,
  ScheduleTable,
} from '../newFriendsPersona/types'
import {
  SCHEDULE_TAG_PRESETS,
  closePastScheduleCalendarEvents,
  eventsForCalendarDay,
  formatScheduleDuration,
  normalizeScheduleCalendarEvents,
  normalizeScheduleEntries,
  parseScheduleTableToEntries,
  resolveCalendarAnchor,
  scheduleDayLabel,
  scheduleEntriesToDailyTable,
  scheduleTagAccent,
} from './scheduleEntries'
import { ScheduleMonthCalendar } from './ScheduleMonthCalendar'
import {
  requestScheduleCalendarEventsFromAi,
  requestScheduleWeekEntriesFromAi,
} from '../wechatChatAi'

const CAL_AI_SPAN_OPTS = [
  { days: 3, label: '3 天' },
  { days: 7, label: '1 周' },
  { days: 14, label: '2 周' },
  { days: 30, label: '1 个月' },
] as const

const MODE_SCENE_HINT = {
  weekly:
    '生活习惯层：没有大事时每周怎么过（按职业作息：上班/排练/通勤/兴趣等；勿默认校园）。与日历冲突时让位日历。',
  calendar:
    '特殊事件层：约会、演出、出差、聚会等一次性安排（考试仅限在校生人设），优先于周循环。可开自动更新由对话写入。',
} as const

const C = {
  page: '#F3EEE6',
  panel: '#FFFDF8',
  ink: '#1F1A14',
  muted: '#6E6458',
  faint: '#A89C8C',
  line: '#D8CFC2',
  accent: '#B54A3C',
  accentSoft: '#F2E0DB',
}

const DAYS: ScheduleDayOfWeek[] = [0, 1, 2, 3, 4, 5, 6]
const DURATION_UNITS: { id: ScheduleDurationUnit; label: string }[] = [
  { id: 'minute', label: '分钟' },
  { id: 'hour', label: '小时' },
  { id: 'day', label: '天' },
]

/** 左侧时间轨：开始 → 结束，带时钟图标与竖向分隔 */
function ScheduleTimeRail({
  startTime,
  endTime,
}: {
  startTime: string
  endTime: string | null
}) {
  return (
    <div className="flex w-[58px] shrink-0 flex-col items-center gap-1 pt-0.5">
      <div
        className="flex h-5 w-5 items-center justify-center border"
        style={{ borderColor: C.accent, background: C.accentSoft, borderRadius: 3, color: C.accent }}
      >
        <Clock3 size={11} strokeWidth={2.25} />
      </div>
      <div className="font-mono text-[12.5px] font-bold leading-none tracking-tight" style={{ color: C.ink }}>
        {startTime}
      </div>
      <div className="flex flex-1 flex-col items-center py-0.5" aria-hidden>
        <div className="h-full min-h-[14px] w-px" style={{ background: C.accent, opacity: 0.55 }} />
        <div
          className="my-0.5 h-1.5 w-1.5 rotate-45 border"
          style={{ borderColor: C.accent, background: C.panel }}
        />
        <div className="h-full min-h-[14px] w-px" style={{ background: C.line }} />
      </div>
      <div className="font-mono text-[11px] leading-none" style={{ color: C.faint }}>
        {endTime || '—'}
      </div>
    </div>
  )
}

/** 地点 / 时长分区芯片 */
function ScheduleMetaChips({
  location,
  durationLabel,
  extra,
}: {
  location?: string | null
  durationLabel?: string | null
  extra?: string | null
}) {
  const loc = String(location ?? '').trim()
  const dur = String(durationLabel ?? '').trim()
  const hasLoc = Boolean(loc)
  const hasDur = Boolean(dur)
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      <span
        className="inline-flex max-w-full items-center gap-1 border px-1.5 py-1 text-[11px] leading-none"
        style={{
          borderColor: hasLoc ? '#C9B8A8' : C.line,
          background: hasLoc ? '#F7F1EA' : C.page,
          color: hasLoc ? C.muted : C.faint,
          borderRadius: 3,
        }}
        title={hasLoc ? loc : '未填地点'}
      >
        <MapPin size={11} strokeWidth={2.2} style={{ color: hasLoc ? C.accent : C.faint, flexShrink: 0 }} />
        <span className="truncate">{hasLoc ? loc : '地点未填'}</span>
      </span>
      <span
        className="inline-flex items-center gap-1 border px-1.5 py-1 text-[11px] leading-none"
        style={{
          borderColor: hasDur ? '#C9B8A8' : C.line,
          background: hasDur ? '#F7F1EA' : C.page,
          color: hasDur ? C.muted : C.faint,
          borderRadius: 3,
        }}
      >
        <Hourglass size={11} strokeWidth={2.2} style={{ color: hasDur ? C.accent : C.faint, flexShrink: 0 }} />
        <span>{hasDur ? dur : '时长未填'}</span>
      </span>
      {extra ? (
        <span
          className="inline-flex items-center border px-1.5 py-1 text-[10px] font-semibold leading-none"
          style={{ borderColor: C.line, background: C.accentSoft, color: C.accent, borderRadius: 3 }}
        >
          {extra}
        </span>
      ) : null}
    </div>
  )
}

const CAL_STATUS_OPTS: { id: ScheduleCalendarEventStatus; label: string }[] = [
  { id: 'upcoming', label: '未到' },
  { id: 'past', label: '已过期' },
  { id: 'done', label: '已完成' },
  { id: 'skipped', label: '已跳过' },
]

type EditorMode = 'weekly' | 'calendar'

export type ScheduleEditorSavePayload = {
  table: ScheduleTable
  entries: ScheduleEntry[]
  calendarEvents: ScheduleCalendarEvent[]
  calendarAutoUpdateEnabled: boolean
}

function uid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function emptyEntry(day: ScheduleDayOfWeek): ScheduleEntry {
  return {
    id: uid('sch'),
    dayOfWeek: day,
    startTime: '15:00',
    endTime: '16:00',
    activity: '',
    tag: '工作',
    location: '',
    durationAmount: null,
    durationUnit: null,
  }
}

function emptyCalEvent(storyDay: string): ScheduleCalendarEvent {
  const now = Date.now()
  return {
    id: uid('sce'),
    storyDay,
    startTime: '19:00',
    endTime: '20:00',
    activity: '',
    tag: '社交',
    location: '',
    durationAmount: null,
    durationUnit: null,
    status: 'upcoming',
    source: 'manual',
    createdAt: now,
    updatedAt: now,
  }
}

function resolveInitialEntries(
  initial: ScheduleTable | null | undefined,
  initialEntries: ScheduleEntry[] | null | undefined,
): ScheduleEntry[] {
  const fromEntries = normalizeScheduleEntries(initialEntries)
  if (fromEntries.length) return fromEntries
  return parseScheduleTableToEntries(initial ?? null, null)
}

export function ScheduleEditorScreen({
  open,
  title = '日程专栏',
  apiConfig,
  initial,
  initialEntries,
  initialCalendarEvents,
  initialCalendarAutoUpdateEnabled,
  initialMode,
  focusCalendarDay,
  storyNowLabel,
  personaContext,
  characterId,
  onClose,
  onSave,
}: {
  open: boolean
  title?: string
  apiConfig: ApiConfig | null
  initial?: ScheduleTable | null
  initialEntries?: ScheduleEntry[] | null
  initialCalendarEvents?: ScheduleCalendarEvent[] | null
  initialCalendarAutoUpdateEnabled?: boolean
  /** 打开时默认模式；点月历某日进入时应为 calendar */
  initialMode?: EditorMode
  /** 打开时定位到该公历日（日历模式） */
  focusCalendarDay?: string | null
  /** 剧情「现在」标签；有则日历锚点优先剧情日 */
  storyNowLabel?: string | null
  personaContext?: string | null
  /** 角色/玩家身份 id：AI 生成时注入世界书、可变人生、记忆与近聊 */
  characterId?: string | null
  onClose: () => void
  onSave: (payload: ScheduleEditorSavePayload) => Promise<void> | void
}) {
  const titleId = useId()
  const [mode, setMode] = useState<EditorMode>(initialMode ?? 'weekly')
  const [entries, setEntries] = useState<ScheduleEntry[]>(() =>
    resolveInitialEntries(initial, initialEntries),
  )
  const [tableMeta, setTableMeta] = useState<ScheduleTable | null>(initial ?? null)
  const [day, setDay] = useState<ScheduleDayOfWeek>(0)
  const [calEvents, setCalEvents] = useState<ScheduleCalendarEvent[]>(() =>
    normalizeScheduleCalendarEvents(initialCalendarEvents),
  )
  const [autoUpdate, setAutoUpdate] = useState(initialCalendarAutoUpdateEnabled === true)
  const [calDay, setCalDay] = useState(() => {
    const focus = focusCalendarDay?.trim()
    if (focus) return focus
    const a = resolveCalendarAnchor({ storyNowLabel: storyNowLabel ?? null })
    return a.storyDay
  })
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const [draft, setDraft] = useState<ScheduleEntry | null>(null)
  const [calDraft, setCalDraft] = useState<ScheduleCalendarEvent | null>(null)
  const [customTagInput, setCustomTagInput] = useState('')

  const [aiOpen, setAiOpen] = useState(false)
  const [aiDraft, setAiDraft] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiPreview, setAiPreview] = useState<ScheduleEntry[] | null>(null)
  const [aiCalPreview, setAiCalPreview] = useState<ScheduleCalendarEvent[] | null>(null)
  const [aiSpanDays, setAiSpanDays] = useState(7)
  const [aiEventCount, setAiEventCount] = useState(5)

  const anchor = useMemo(
    () => resolveCalendarAnchor({ storyNowLabel: storyNowLabel ?? null }),
    [storyNowLabel],
  )

  const dayEntries = useMemo(
    () =>
      entries
        .filter((e) => e.dayOfWeek === day)
        .sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [entries, day],
  )

  const closedCalEvents = useMemo(
    () => closePastScheduleCalendarEvents(calEvents, anchor),
    [calEvents, anchor],
  )

  const dayCalEvents = useMemo(
    () => eventsForCalendarDay(closedCalEvents, calDay),
    [closedCalEvents, calDay],
  )

  const calEventDays = useMemo(
    () => new Set(closedCalEvents.map((e) => e.storyDay.trim())),
    [closedCalEvents],
  )

  const knownTags = useMemo(() => {
    const set = new Set<string>([...SCHEDULE_TAG_PRESETS])
    for (const e of entries) {
      const t = e.tag?.trim()
      if (t) set.add(t)
    }
    for (const e of calEvents) {
      const t = e.tag?.trim()
      if (t) set.add(t)
    }
    if (draft?.tag?.trim()) set.add(draft.tag.trim())
    if (calDraft?.tag?.trim()) set.add(calDraft.tag.trim())
    return [...set]
  }, [entries, calEvents, draft?.tag, calDraft?.tag])

  useEffect(() => {
    if (!open) return
    const nextMode = initialMode ?? 'weekly'
    setMode(nextMode)
    setEntries(resolveInitialEntries(initial, initialEntries))
    setTableMeta(initial ?? null)
    const a = resolveCalendarAnchor({ storyNowLabel: storyNowLabel ?? null })
    // 周循环也按剧情/系统锚点对齐到当天星期
    setDay(a.dayOfWeek)
    const closed = closePastScheduleCalendarEvents(
      normalizeScheduleCalendarEvents(initialCalendarEvents),
      a,
    )
    setCalEvents(closed)
    setCalDay(focusCalendarDay?.trim() || a.storyDay)
    setAutoUpdate(initialCalendarAutoUpdateEnabled === true)
    setDirty(false)
    setSaving(false)
    setToast(null)
    setDraft(null)
    setCalDraft(null)
    setCustomTagInput('')
    setAiOpen(false)
    setAiDraft('')
    setAiPreview(null)
    setAiCalPreview(null)
    setAiSpanDays(7)
    setAiEventCount(5)
    setAiLoading(false)
  }, [
    open,
    initial,
    initialEntries,
    initialCalendarEvents,
    initialCalendarAutoUpdateEnabled,
    initialMode,
    focusCalendarDay,
    storyNowLabel,
  ])

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(null), 2200)
    return () => window.clearTimeout(t)
  }, [toast])

  const askClose = () => {
    if (dirty && !window.confirm('有未保存修改，确定关闭？')) return
    onClose()
  }

  const openNew = () => {
    if (mode === 'calendar') {
      setCalDraft(emptyCalEvent(calDay || anchor.storyDay))
    } else {
      setDraft(emptyEntry(day))
    }
    setCustomTagInput('')
  }

  const openEdit = (e: ScheduleEntry) => {
    setDraft({ ...e })
    setCustomTagInput('')
  }

  const openCalEdit = (e: ScheduleCalendarEvent) => {
    setCalDraft({ ...e })
    setCustomTagInput('')
  }

  const saveDraft = () => {
    if (!draft) return
    const activity = draft.activity.trim()
    if (!activity) {
      setToast('请填写活动')
      return
    }
    if (!/^\d{2}:\d{2}$/.test(draft.startTime) || !/^\d{2}:\d{2}$/.test(draft.endTime)) {
      setToast('时间格式应为 HH:mm')
      return
    }
    const next: ScheduleEntry = {
      ...draft,
      activity: activity.slice(0, 120),
      tag: draft.tag.trim().slice(0, 24),
      location: draft.location.trim().slice(0, 80),
      durationAmount:
        draft.durationAmount != null && Number.isFinite(draft.durationAmount) && draft.durationAmount > 0
          ? draft.durationAmount
          : null,
      durationUnit:
        draft.durationAmount != null && Number.isFinite(draft.durationAmount) && draft.durationAmount > 0
          ? draft.durationUnit ?? 'minute'
          : null,
    }
    setEntries((prev) => {
      const i = prev.findIndex((x) => x.id === next.id)
      if (i < 0) return [...prev, next]
      const copy = prev.slice()
      copy[i] = next
      return copy
    })
    setDraft(null)
    setDirty(true)
    setToast('已更新条目')
  }

  const saveCalDraft = () => {
    if (!calDraft) return
    const activity = calDraft.activity.trim()
    if (!activity) {
      setToast('请填写活动')
      return
    }
    if (!calDraft.storyDay.trim()) {
      setToast('请填写日期')
      return
    }
    if (!/^\d{2}:\d{2}$/.test(calDraft.startTime)) {
      setToast('开始时间应为 HH:mm')
      return
    }
    if (calDraft.endTime && !/^\d{2}:\d{2}$/.test(calDraft.endTime)) {
      setToast('结束时间应为 HH:mm')
      return
    }
    const now = Date.now()
    const next: ScheduleCalendarEvent = {
      ...calDraft,
      storyDay: calDraft.storyDay.trim().slice(0, 64),
      activity: activity.slice(0, 120),
      tag: calDraft.tag.trim().slice(0, 24) || '社交',
      location: calDraft.location.trim().slice(0, 80),
      endTime: calDraft.endTime?.trim() || null,
      durationAmount:
        calDraft.durationAmount != null &&
        Number.isFinite(calDraft.durationAmount) &&
        calDraft.durationAmount > 0
          ? calDraft.durationAmount
          : null,
      durationUnit:
        calDraft.durationAmount != null &&
        Number.isFinite(calDraft.durationAmount) &&
        calDraft.durationAmount > 0
          ? calDraft.durationUnit ?? 'minute'
          : null,
      source: calDraft.source ?? 'manual',
      updatedAt: now,
      createdAt: calDraft.createdAt || now,
    }
    setCalEvents((prev) => {
      const i = prev.findIndex((x) => x.id === next.id)
      if (i < 0) return normalizeScheduleCalendarEvents([...prev, next])
      const copy = prev.slice()
      copy[i] = next
      return normalizeScheduleCalendarEvents(copy)
    })
    setCalDay(next.storyDay)
    setCalDraft(null)
    setDirty(true)
    setToast('已更新日历事项')
  }

  const deleteDraft = () => {
    if (!draft) return
    if (!window.confirm('删除这条日程？')) return
    setEntries((prev) => prev.filter((x) => x.id !== draft.id))
    setDraft(null)
    setDirty(true)
  }

  const deleteCalDraft = () => {
    if (!calDraft) return
    if (!window.confirm('删除这条日历事项？')) return
    setCalEvents((prev) => prev.filter((x) => x.id !== calDraft.id))
    setCalDraft(null)
    setDirty(true)
  }

  const runAiGenerate = async () => {
    const prompt = aiDraft.trim()
    const persona = String(personaContext ?? '').trim()
    if (!prompt && !persona) {
      setToast('无人设内容可读取，请先填写生成要求')
      return
    }
    if (!apiConfig?.apiUrl?.trim() || !apiConfig.apiKey?.trim() || !apiConfig.modelId?.trim()) {
      setToast('未配置 AI API')
      return
    }
    setAiLoading(true)
    try {
      if (mode === 'calendar') {
        const next = await requestScheduleCalendarEventsFromAi({
          apiConfig,
          userRequirement: prompt || null,
          personaContext: persona || null,
          characterId: characterId?.trim() || null,
          anchorLabel: anchor.label,
          anchorStoryDay: anchor.storyDay,
          spanDays: aiSpanDays,
          eventCount: aiEventCount,
        })
        setAiCalPreview(normalizeScheduleCalendarEvents(next))
        setAiPreview(null)
        setToast(`已生成 ${next.length} 条重要事件（跨度 ${aiSpanDays} 天）`)
      } else {
        const next = await requestScheduleWeekEntriesFromAi({
          apiConfig,
          userRequirement: prompt || null,
          personaContext: persona || null,
          characterId: characterId?.trim() || null,
        })
        setAiPreview(normalizeScheduleEntries(next))
        setAiCalPreview(null)
        setToast(prompt ? `已按要求+人设生成 ${next.length} 条` : `已按人设生成 ${next.length} 条`)
      }
    } catch (e) {
      setToast((e instanceof Error ? e.message : '生成失败').slice(0, 80))
    } finally {
      setAiLoading(false)
    }
  }

  const confirmAiPreview = () => {
    if (mode === 'calendar') {
      if (!aiCalPreview?.length) return
      const normalized = normalizeScheduleCalendarEvents(aiCalPreview)
      setCalEvents(normalized)
      if (normalized[0]?.storyDay) setCalDay(normalized[0].storyDay)
      setAiCalPreview(null)
      setAiOpen(false)
      setDirty(true)
      setToast('已替换为新日历行程')
      return
    }
    if (!aiPreview?.length) return
    setEntries(normalizeScheduleEntries(aiPreview))
    setAiPreview(null)
    setAiOpen(false)
    setDirty(true)
    setToast('已替换为整周新日程')
  }

  const handleSave = async () => {
    if (saving) return
    setSaving(true)
    try {
      const table = scheduleEntriesToDailyTable(entries, tableMeta)
      setTableMeta(table)
      const closed = closePastScheduleCalendarEvents(calEvents, anchor)
      await onSave({
        table,
        entries,
        calendarEvents: closed,
        calendarAutoUpdateEnabled: autoUpdate,
      })
      setDirty(false)
      setToast('已保存')
      onClose()
    } catch (e) {
      setToast((e instanceof Error ? e.message : '保存失败').slice(0, 80))
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  const statusLabel = (s: ScheduleCalendarEventStatus) =>
    CAL_STATUS_OPTS.find((x) => x.id === s)?.label ?? s

  return (
    <div className="fixed inset-0 z-[1300] flex" role="presentation">
      <div
        className="absolute inset-0 z-0 bg-black/40"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) askClose()
        }}
      />

      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 ml-auto flex h-full w-full max-w-[520px] flex-col border-l-[2px]"
        style={{ borderColor: C.ink, background: C.page, color: C.ink }}
        initial={{ x: 520 }}
        animate={{ x: 0 }}
        exit={{ x: 520 }}
        transition={{ type: 'spring', stiffness: 320, damping: 34 }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between gap-2 border-b-[1.5px] px-4 pb-3"
          style={{
            borderColor: C.line,
            background: C.panel,
            paddingTop: 'max(12px, env(safe-area-inset-top, 0px))',
          }}
        >
          <div className="min-w-0">
            <button
              type="button"
              onClick={askClose}
              className="mb-0.5 text-[13px]"
              style={{ color: C.muted }}
            >
              ← 返回
            </button>
            <h2 id={titleId} className="truncate text-[15px] font-bold leading-tight">
              {title}
            </h2>
            <p className="mt-0.5 text-[10px] tracking-[0.12em]" style={{ color: C.faint }}>
              {mode === 'weekly' ? 'MAGAZINE · 周刊时间轴' : 'CALENDAR · 剧情锚点日'}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setAiPreview(null)
                setAiCalPreview(null)
                setAiOpen(true)
              }}
              className="border-[1.5px] px-2.5 py-1.5 text-[12px] font-semibold"
              style={{ borderColor: C.ink, background: C.accentSoft, color: C.ink, borderRadius: 2 }}
            >
              {mode === 'weekly' ? 'AI 整周' : 'AI 行程'}
            </button>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving}
              className="border-[1.5px] px-3 py-1.5 text-[12px] font-semibold disabled:opacity-50"
              style={{ borderColor: C.ink, background: C.ink, color: C.page, borderRadius: 2 }}
            >
              {saving ? '保存中…' : '保存'}
            </button>
          </div>
        </div>

        <div
          className="flex gap-1 border-b px-3 py-2"
          style={{ borderColor: C.line, background: C.page }}
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
                onClick={() => {
                  setMode(m.id)
                  setDraft(null)
                  setCalDraft(null)
                }}
                className="flex-1 border-[1.5px] py-1.5 text-[12px] font-semibold"
                style={{
                  borderColor: on ? C.ink : C.line,
                  background: on ? C.ink : C.panel,
                  color: on ? C.page : C.muted,
                  borderRadius: 2,
                }}
              >
                {m.label}
              </button>
            )
          })}
        </div>

        <p
          className="border-b px-4 py-2 text-[11px] leading-relaxed"
          style={{ borderColor: C.line, background: C.panel, color: C.muted }}
        >
          <span className="font-semibold" style={{ color: C.ink }}>
            {mode === 'weekly' ? '周循环 · 适用：' : '日历 · 适用：'}
          </span>
          {MODE_SCENE_HINT[mode]}
        </p>

        {mode === 'calendar' ? (
          <div
            className="flex items-center justify-between gap-2 border-b px-4 py-2"
            style={{ borderColor: C.line, background: C.panel }}
          >
            <div className="min-w-0">
              <p className="truncate text-[11px]" style={{ color: C.muted }}>
                锚点 · {anchor.source === 'story' ? '剧情' : '系统'} · {anchor.label}
              </p>
            </div>
            <label className="flex shrink-0 cursor-pointer items-center gap-1.5 text-[11px] font-semibold">
              <input
                type="checkbox"
                checked={autoUpdate}
                onChange={(e) => {
                  setAutoUpdate(e.target.checked)
                  setDirty(true)
                }}
              />
              自动更新
            </label>
          </div>
        ) : null}

        {mode === 'calendar' && autoUpdate ? (
          <p className="px-4 pt-2 text-[10px] leading-relaxed" style={{ color: C.faint }}>
            开：私聊/线下约会中，角色明确决定或提到的安排会写入日历；玩笑与模糊「改天」不写。
          </p>
        ) : null}

        {mode === 'weekly' ? (
          <div
            className="flex gap-1.5 overflow-x-auto border-b px-3 py-2.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            style={{ borderColor: C.line, background: C.page }}
          >
            {DAYS.map((d) => {
              const on = d === day
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDay(d)}
                  className="min-w-[44px] shrink-0 border px-2 py-1.5 text-left"
                  style={{
                    borderWidth: on ? 1.5 : 1,
                    borderColor: on ? C.ink : C.line,
                    background: on ? C.accentSoft : C.panel,
                    borderRadius: 2,
                  }}
                >
                  <div className="text-[10px]" style={{ color: C.faint }}>
                    D{d + 1}
                  </div>
                  <div className={`text-[12px] ${on ? 'font-bold' : 'font-medium'}`}>
                    {scheduleDayLabel(d)}
                  </div>
                </button>
              )
            })}
          </div>
        ) : (
          <div className="border-b px-2 pb-2 pt-1" style={{ borderColor: C.line, background: '#fff' }}>
            <ScheduleMonthCalendar
              anchorStoryDay={anchor.storyDay}
              selectedStoryDay={calDay}
              eventDays={calEventDays}
              showTodayButton={false}
              compact
              onSelectDay={(d) => setCalDay(d)}
            />
          </div>
        )}

        <div className="flex items-center justify-between gap-2 px-4 pt-3">
          <p className="text-[11px]" style={{ color: C.muted }}>
            {mode === 'weekly'
              ? `${scheduleDayLabel(day)} · ${dayEntries.length} 条 · 点卡片编辑`
              : `${calDay} · ${dayCalEvents.length} 条 · 点卡片编辑`}
          </p>
          <button
            type="button"
            onClick={openNew}
            className="border-[1.5px] px-2.5 py-1 text-[12px] font-semibold"
            style={{ borderColor: C.ink, background: C.ink, color: C.page, borderRadius: 2 }}
          >
            + 新日程
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-6 pt-3">
          {mode === 'weekly' ? (
            dayEntries.length === 0 ? (
              <div
                className="border border-dashed px-4 py-10 text-center text-[13px]"
                style={{ borderColor: C.line, background: C.panel, color: C.faint, borderRadius: 4 }}
              >
                这一天还没有日程
              </div>
            ) : (
              <div className="grid gap-3">
                {dayEntries.map((e) => {
                  const accent = scheduleTagAccent(e.tag)
                  const dur = formatScheduleDuration(e.durationAmount, e.durationUnit)
                  return (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() => openEdit(e)}
                      className="flex w-full gap-2.5 text-left"
                    >
                      <ScheduleTimeRail startTime={e.startTime} endTime={e.endTime ?? null} />
                      <div
                        className="min-w-0 flex-1 border-[1.5px] px-3 py-2.5"
                        style={{ borderColor: C.ink, background: C.panel, borderRadius: 4 }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-[13.5px] font-bold leading-snug">{e.activity}</p>
                          <span
                            className="shrink-0 border px-1.5 py-0.5 text-[10px]"
                            style={{ borderColor: C.line, color: accent.dot }}
                          >
                            {accent.label}
                          </span>
                        </div>
                        <ScheduleMetaChips location={e.location} durationLabel={dur} />
                      </div>
                    </button>
                  )
                })}
              </div>
            )
          ) : dayCalEvents.length === 0 ? (
            <div
              className="border border-dashed px-4 py-10 text-center text-[13px]"
              style={{ borderColor: C.line, background: C.panel, color: C.faint, borderRadius: 4 }}
            >
              这一天还没有日历事项
            </div>
          ) : (
            <div className="grid gap-3">
              {dayCalEvents.map((e) => {
                const accent = scheduleTagAccent(e.tag)
                const dur = formatScheduleDuration(e.durationAmount, e.durationUnit)
                const faded = e.status === 'past' || e.status === 'done' || e.status === 'skipped'
                return (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => openCalEdit(e)}
                    className="flex w-full gap-2.5 text-left"
                    style={{ opacity: faded ? 0.55 : 1 }}
                  >
                    <ScheduleTimeRail startTime={e.startTime} endTime={e.endTime ?? null} />
                    <div
                      className="min-w-0 flex-1 border-[1.5px] px-3 py-2.5"
                      style={{ borderColor: C.ink, background: C.panel, borderRadius: 4 }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="min-w-0 text-[13.5px] font-bold leading-snug">{e.activity}</p>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <span
                            className="border px-1.5 py-0.5 text-[10px]"
                            style={{ borderColor: C.line, color: accent.dot }}
                          >
                            {statusLabel(e.status)}
                          </span>
                          <span className="text-[10px]" style={{ color: C.faint }}>
                            {accent.label}
                          </span>
                        </div>
                      </div>
                      <ScheduleMetaChips
                        location={e.location}
                        durationLabel={dur}
                        extra={e.source === 'ai_auto' ? 'AI' : null}
                      />
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <AnimatePresence>
          {draft ? (
            <motion.div
              className="absolute inset-0 z-20 flex items-end"
              style={{ background: 'rgba(20,16,12,0.35)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="max-h-[88%] w-full overflow-y-auto border-t-2 px-4 pt-4"
                style={{
                  borderColor: C.ink,
                  background: C.panel,
                  paddingBottom: 'max(20px, env(safe-area-inset-bottom, 0px))',
                }}
                initial={{ y: 40 }}
                animate={{ y: 0 }}
                exit={{ y: 40 }}
              >
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-[15px] font-bold">编辑日程</p>
                    <p className="mt-0.5 text-[11px]" style={{ color: C.muted }}>
                      {scheduleDayLabel(draft.dayOfWeek)} · {draft.startTime}-{draft.endTime}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDraft(null)}
                    className="border px-2.5 py-1 text-[12px]"
                    style={{ borderColor: C.line, background: C.page, borderRadius: 2 }}
                  >
                    关闭
                  </button>
                </div>

                <div className="grid gap-2.5">
                  <label className="block">
                    <span className="mb-1 block text-[11px]" style={{ color: C.muted }}>
                      活动
                    </span>
                    <input
                      value={draft.activity}
                      onChange={(e) => setDraft({ ...draft, activity: e.target.value })}
                      className="w-full border-[1.5px] px-2.5 py-2 text-[13px] outline-none"
                      style={{ borderColor: C.line, background: C.panel, borderRadius: 2 }}
                    />
                  </label>
                  <div
                    className="grid grid-cols-2 gap-2 border px-2.5 py-2.5"
                    style={{ borderColor: C.line, background: '#F7F1EA', borderRadius: 4 }}
                  >
                    <label className="block">
                      <span
                        className="mb-1 flex items-center gap-1 text-[11px]"
                        style={{ color: C.muted }}
                      >
                        <Clock3 size={11} strokeWidth={2.2} style={{ color: C.accent }} />
                        开始
                      </span>
                      <input
                        value={draft.startTime}
                        onChange={(e) => setDraft({ ...draft, startTime: e.target.value })}
                        placeholder="HH:mm"
                        className="w-full border-[1.5px] px-2.5 py-2 font-mono text-[13px] outline-none"
                        style={{ borderColor: C.line, background: C.panel, borderRadius: 2 }}
                      />
                    </label>
                    <label className="block">
                      <span
                        className="mb-1 flex items-center gap-1 text-[11px]"
                        style={{ color: C.muted }}
                      >
                        <Clock3 size={11} strokeWidth={2.2} style={{ color: C.faint }} />
                        结束
                      </span>
                      <input
                        value={draft.endTime}
                        onChange={(e) => setDraft({ ...draft, endTime: e.target.value })}
                        placeholder="HH:mm"
                        className="w-full border-[1.5px] px-2.5 py-2 font-mono text-[13px] outline-none"
                        style={{ borderColor: C.line, background: C.panel, borderRadius: 2 }}
                      />
                    </label>
                  </div>
                  <label className="block">
                    <span
                      className="mb-1 flex items-center gap-1 text-[11px]"
                      style={{ color: C.muted }}
                    >
                      <MapPin size={11} strokeWidth={2.2} style={{ color: C.accent }} />
                      地点
                    </span>
                    <input
                      value={draft.location}
                      onChange={(e) => setDraft({ ...draft, location: e.target.value })}
                      placeholder="发生在哪里"
                      className="w-full border-[1.5px] px-2.5 py-2 text-[13px] outline-none"
                      style={{ borderColor: C.line, background: C.panel, borderRadius: 2 }}
                    />
                  </label>
                  <div
                    className="border px-2.5 py-2.5"
                    style={{ borderColor: C.line, background: '#F7F1EA', borderRadius: 4 }}
                  >
                    <div
                      className="mb-1.5 flex items-center justify-between text-[11px]"
                      style={{ color: C.muted }}
                    >
                      <span className="inline-flex items-center gap-1">
                        <Hourglass size={11} strokeWidth={2.2} style={{ color: C.accent }} />
                        预计时长
                      </span>
                      <span style={{ color: C.faint }}>可选</span>
                    </div>
                    <div className="grid grid-cols-[1fr_auto] gap-2">
                      <input
                        type="number"
                        min={0}
                        step={1}
                        value={draft.durationAmount ?? ''}
                        onChange={(e) => {
                          const v = e.target.value.trim()
                          if (!v) {
                            setDraft({ ...draft, durationAmount: null, durationUnit: null })
                            return
                          }
                          const n = Number(v)
                          setDraft({
                            ...draft,
                            durationAmount: Number.isFinite(n) ? n : null,
                            durationUnit: draft.durationUnit ?? 'minute',
                          })
                        }}
                        placeholder="数字"
                        className="w-full border-[1.5px] px-2.5 py-2 text-[13px] outline-none"
                        style={{ borderColor: C.line, background: C.panel, borderRadius: 2 }}
                      />
                      <div className="flex gap-1">
                        {DURATION_UNITS.map((u) => {
                          const on = (draft.durationUnit ?? 'minute') === u.id
                          return (
                            <button
                              key={u.id}
                              type="button"
                              disabled={draft.durationAmount == null}
                              onClick={() => setDraft({ ...draft, durationUnit: u.id })}
                              className="border px-2 py-2 text-[11px] font-semibold disabled:opacity-40"
                              style={{
                                borderColor: on ? C.ink : C.line,
                                background: on ? C.accentSoft : C.page,
                                borderRadius: 2,
                              }}
                            >
                              {u.label}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="mb-1.5 text-[11px]" style={{ color: C.muted }}>
                      分类标签
                    </div>
                    <div className="mb-2 flex flex-wrap gap-1.5">
                      {knownTags.map((tag) => {
                        const on = draft.tag.trim() === tag
                        return (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => setDraft({ ...draft, tag })}
                            className="border px-2.5 py-1 text-[11px] font-semibold"
                            style={{
                              borderWidth: on ? 1.5 : 1,
                              borderColor: on ? C.ink : C.line,
                              background: on ? C.accentSoft : C.page,
                              borderRadius: 2,
                            }}
                          >
                            {tag}
                          </button>
                        )
                      })}
                    </div>
                    <div className="flex gap-2">
                      <input
                        value={customTagInput}
                        onChange={(e) => setCustomTagInput(e.target.value)}
                        placeholder="自定义标签"
                        className="min-w-0 flex-1 border-[1.5px] px-2.5 py-2 text-[13px] outline-none"
                        style={{ borderColor: C.line, background: C.panel, borderRadius: 2 }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const t = customTagInput.trim().slice(0, 24)
                          if (!t) return
                          setDraft({ ...draft, tag: t })
                          setCustomTagInput('')
                        }}
                        className="shrink-0 border-[1.5px] px-3 py-2 text-[12px] font-semibold"
                        style={{ borderColor: C.ink, background: C.page, borderRadius: 2 }}
                      >
                        使用
                      </button>
                    </div>
                  </div>
                  <div>
                    <span className="mb-1 block text-[11px]" style={{ color: C.muted }}>
                      星期
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {DAYS.map((d) => {
                        const on = draft.dayOfWeek === d
                        return (
                          <button
                            key={d}
                            type="button"
                            onClick={() => setDraft({ ...draft, dayOfWeek: d })}
                            className="border px-2 py-1 text-[11px]"
                            style={{
                              borderColor: on ? C.ink : C.line,
                              background: on ? C.accentSoft : C.page,
                              borderRadius: 2,
                            }}
                          >
                            {scheduleDayLabel(d)}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-[1fr_2fr] gap-2">
                  <button
                    type="button"
                    onClick={deleteDraft}
                    className="border-[1.5px] py-2.5 text-[13px] font-semibold"
                    style={{ borderColor: C.accent, color: C.accent, background: C.panel, borderRadius: 2 }}
                  >
                    删除
                  </button>
                  <button
                    type="button"
                    onClick={saveDraft}
                    className="border-[1.5px] py-2.5 text-[13px] font-bold"
                    style={{ borderColor: C.ink, background: C.ink, color: C.page, borderRadius: 2 }}
                  >
                    保存这条
                  </button>
                </div>
              </motion.div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <AnimatePresence>
          {calDraft ? (
            <motion.div
              className="absolute inset-0 z-20 flex items-end"
              style={{ background: 'rgba(20,16,12,0.35)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="max-h-[88%] w-full overflow-y-auto border-t-2 px-4 pt-4"
                style={{
                  borderColor: C.ink,
                  background: C.panel,
                  paddingBottom: 'max(20px, env(safe-area-inset-bottom, 0px))',
                }}
                initial={{ y: 40 }}
                animate={{ y: 0 }}
                exit={{ y: 40 }}
              >
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-[15px] font-bold">编辑日历事项</p>
                    <p className="mt-0.5 text-[11px]" style={{ color: C.muted }}>
                      {calDraft.storyDay} · {calDraft.startTime}
                      {calDraft.endTime ? `-${calDraft.endTime}` : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCalDraft(null)}
                    className="border px-2.5 py-1 text-[12px]"
                    style={{ borderColor: C.line, background: C.page, borderRadius: 2 }}
                  >
                    关闭
                  </button>
                </div>

                <div className="grid gap-2.5">
                  <label className="block">
                    <span className="mb-1 block text-[11px]" style={{ color: C.muted }}>
                      日期（如 2026年10月22日）
                    </span>
                    <input
                      value={calDraft.storyDay}
                      onChange={(e) => setCalDraft({ ...calDraft, storyDay: e.target.value })}
                      className="w-full border-[1.5px] px-2.5 py-2 text-[13px] outline-none"
                      style={{ borderColor: C.line, background: C.panel, borderRadius: 2 }}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[11px]" style={{ color: C.muted }}>
                      活动
                    </span>
                    <input
                      value={calDraft.activity}
                      onChange={(e) => setCalDraft({ ...calDraft, activity: e.target.value })}
                      className="w-full border-[1.5px] px-2.5 py-2 text-[13px] outline-none"
                      style={{ borderColor: C.line, background: C.panel, borderRadius: 2 }}
                    />
                  </label>
                  <div
                    className="grid grid-cols-2 gap-2 border px-2.5 py-2.5"
                    style={{ borderColor: C.line, background: '#F7F1EA', borderRadius: 4 }}
                  >
                    <label className="block">
                      <span
                        className="mb-1 flex items-center gap-1 text-[11px]"
                        style={{ color: C.muted }}
                      >
                        <Clock3 size={11} strokeWidth={2.2} style={{ color: C.accent }} />
                        开始
                      </span>
                      <input
                        value={calDraft.startTime}
                        onChange={(e) => setCalDraft({ ...calDraft, startTime: e.target.value })}
                        placeholder="HH:mm"
                        className="w-full border-[1.5px] px-2.5 py-2 font-mono text-[13px] outline-none"
                        style={{ borderColor: C.line, background: C.panel, borderRadius: 2 }}
                      />
                    </label>
                    <label className="block">
                      <span
                        className="mb-1 flex items-center gap-1 text-[11px]"
                        style={{ color: C.muted }}
                      >
                        <Clock3 size={11} strokeWidth={2.2} style={{ color: C.faint }} />
                        结束
                      </span>
                      <input
                        value={calDraft.endTime ?? ''}
                        onChange={(e) => setCalDraft({ ...calDraft, endTime: e.target.value || null })}
                        placeholder="可选"
                        className="w-full border-[1.5px] px-2.5 py-2 font-mono text-[13px] outline-none"
                        style={{ borderColor: C.line, background: C.panel, borderRadius: 2 }}
                      />
                    </label>
                  </div>
                  <label className="block">
                    <span
                      className="mb-1 flex items-center gap-1 text-[11px]"
                      style={{ color: C.muted }}
                    >
                      <MapPin size={11} strokeWidth={2.2} style={{ color: C.accent }} />
                      地点
                    </span>
                    <input
                      value={calDraft.location}
                      onChange={(e) => setCalDraft({ ...calDraft, location: e.target.value })}
                      className="w-full border-[1.5px] px-2.5 py-2 text-[13px] outline-none"
                      style={{ borderColor: C.line, background: C.panel, borderRadius: 2 }}
                    />
                  </label>
                  <div
                    className="border px-2.5 py-2.5"
                    style={{ borderColor: C.line, background: '#F7F1EA', borderRadius: 4 }}
                  >
                    <div
                      className="mb-1.5 flex items-center justify-between text-[11px]"
                      style={{ color: C.muted }}
                    >
                      <span className="inline-flex items-center gap-1">
                        <Hourglass size={11} strokeWidth={2.2} style={{ color: C.accent }} />
                        预计时长
                      </span>
                      <span style={{ color: C.faint }}>可选</span>
                    </div>
                    <div className="grid grid-cols-[1fr_auto] gap-2">
                      <input
                        type="number"
                        min={0}
                        step={1}
                        value={calDraft.durationAmount ?? ''}
                        onChange={(e) => {
                          const v = e.target.value.trim()
                          if (!v) {
                            setCalDraft({ ...calDraft, durationAmount: null, durationUnit: null })
                            return
                          }
                          const n = Number(v)
                          setCalDraft({
                            ...calDraft,
                            durationAmount: Number.isFinite(n) ? n : null,
                            durationUnit: calDraft.durationUnit ?? 'minute',
                          })
                        }}
                        placeholder="数字"
                        className="w-full border-[1.5px] px-2.5 py-2 text-[13px] outline-none"
                        style={{ borderColor: C.line, background: C.panel, borderRadius: 2 }}
                      />
                      <div className="flex gap-1">
                        {DURATION_UNITS.map((u) => {
                          const on = (calDraft.durationUnit ?? 'minute') === u.id
                          return (
                            <button
                              key={u.id}
                              type="button"
                              disabled={calDraft.durationAmount == null}
                              onClick={() => setCalDraft({ ...calDraft, durationUnit: u.id })}
                              className="border px-2 py-2 text-[11px] font-semibold disabled:opacity-40"
                              style={{
                                borderColor: on ? C.ink : C.line,
                                background: on ? C.accentSoft : C.page,
                                borderRadius: 2,
                              }}
                            >
                              {u.label}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="mb-1.5 text-[11px]" style={{ color: C.muted }}>
                      分类标签
                    </div>
                    <div className="mb-2 flex flex-wrap gap-1.5">
                      {knownTags.map((tag) => {
                        const on = calDraft.tag.trim() === tag
                        return (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => setCalDraft({ ...calDraft, tag })}
                            className="border px-2.5 py-1 text-[11px] font-semibold"
                            style={{
                              borderWidth: on ? 1.5 : 1,
                              borderColor: on ? C.ink : C.line,
                              background: on ? C.accentSoft : C.page,
                              borderRadius: 2,
                            }}
                          >
                            {tag}
                          </button>
                        )
                      })}
                    </div>
                    <div className="flex gap-2">
                      <input
                        value={customTagInput}
                        onChange={(e) => setCustomTagInput(e.target.value)}
                        placeholder="自定义标签"
                        className="min-w-0 flex-1 border-[1.5px] px-2.5 py-2 text-[13px] outline-none"
                        style={{ borderColor: C.line, background: C.panel, borderRadius: 2 }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const t = customTagInput.trim().slice(0, 24)
                          if (!t) return
                          setCalDraft({ ...calDraft, tag: t })
                          setCustomTagInput('')
                        }}
                        className="shrink-0 border-[1.5px] px-3 py-2 text-[12px] font-semibold"
                        style={{ borderColor: C.ink, background: C.page, borderRadius: 2 }}
                      >
                        使用
                      </button>
                    </div>
                  </div>
                  <div>
                    <span className="mb-1 block text-[11px]" style={{ color: C.muted }}>
                      状态
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {CAL_STATUS_OPTS.map((s) => {
                        const on = calDraft.status === s.id
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => setCalDraft({ ...calDraft, status: s.id })}
                            className="border px-2 py-1 text-[11px]"
                            style={{
                              borderColor: on ? C.ink : C.line,
                              background: on ? C.accentSoft : C.page,
                              borderRadius: 2,
                            }}
                          >
                            {s.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-[1fr_2fr] gap-2">
                  <button
                    type="button"
                    onClick={deleteCalDraft}
                    className="border-[1.5px] py-2.5 text-[13px] font-semibold"
                    style={{ borderColor: C.accent, color: C.accent, background: C.panel, borderRadius: 2 }}
                  >
                    删除
                  </button>
                  <button
                    type="button"
                    onClick={saveCalDraft}
                    className="border-[1.5px] py-2.5 text-[13px] font-bold"
                    style={{ borderColor: C.ink, background: C.ink, color: C.page, borderRadius: 2 }}
                  >
                    保存这条
                  </button>
                </div>
              </motion.div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <AnimatePresence>
          {aiOpen ? (
            <motion.div
              className="absolute inset-0 z-30 flex items-end"
              style={{ background: 'rgba(20,16,12,0.4)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="max-h-[90%] w-full overflow-y-auto border-t-2 px-4 pt-4"
                style={{
                  borderColor: C.ink,
                  background: C.panel,
                  paddingBottom: 'max(20px, env(safe-area-inset-bottom, 0px))',
                }}
                initial={{ y: 48 }}
                animate={{ y: 0 }}
                exit={{ y: 48 }}
              >
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <p className="text-[15px] font-bold">
                      {mode === 'calendar' ? 'AI 生成重要事件行程' : 'AI 生成整周日程'}
                    </p>
                    <p className="mt-0.5 text-[11px]" style={{ color: C.muted }}>
                      要求可留白：空白则按人设生成；有内容则读人设并优先符合输入
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (aiLoading) return
                      setAiOpen(false)
                      setAiPreview(null)
                      setAiCalPreview(null)
                    }}
                    className="border px-2.5 py-1 text-[12px]"
                    style={{ borderColor: C.line, borderRadius: 2 }}
                  >
                    关闭
                  </button>
                </div>

                <div
                  className="mb-3 border-[1.5px] px-3 py-2.5 text-[11px] leading-relaxed"
                  style={{ borderColor: C.line, background: C.page, borderRadius: 2, color: C.muted }}
                >
                  <p className="font-semibold" style={{ color: C.ink }}>
                    两种日程怎么选
                  </p>
                  <p className="mt-1.5">
                    <span className="font-semibold" style={{ color: C.ink }}>
                      周循环：
                    </span>
                    {MODE_SCENE_HINT.weekly}
                  </p>
                  <p className="mt-1">
                    <span className="font-semibold" style={{ color: C.ink }}>
                      日历：
                    </span>
                    {MODE_SCENE_HINT.calendar}
                  </p>
                </div>

                {mode === 'calendar' ? (
                  <div className="mb-3 grid gap-2.5">
                    <div>
                      <p className="mb-1.5 text-[11px] font-semibold" style={{ color: C.muted }}>
                        生成时间跨度
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {CAL_AI_SPAN_OPTS.map((opt) => {
                          const on = aiSpanDays === opt.days
                          return (
                            <button
                              key={opt.days}
                              type="button"
                              onClick={() => setAiSpanDays(opt.days)}
                              className="border px-2.5 py-1.5 text-[12px] font-semibold"
                              style={{
                                borderWidth: on ? 1.5 : 1,
                                borderColor: on ? C.ink : C.line,
                                background: on ? C.accentSoft : C.page,
                                borderRadius: 2,
                              }}
                            >
                              {opt.label}
                            </button>
                          )
                        })}
                      </div>
                      <p className="mt-1 text-[10px]" style={{ color: C.faint }}>
                        从当前锚点（{anchor.label}）起算
                      </p>
                    </div>
                    <div>
                      <p className="mb-1.5 text-[11px] font-semibold" style={{ color: C.muted }}>
                        重要事件行程数量
                      </p>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={1}
                          max={40}
                          value={aiEventCount}
                          onChange={(e) => {
                            const n = Number(e.target.value)
                            if (!Number.isFinite(n)) return
                            setAiEventCount(Math.max(1, Math.min(40, Math.round(n))))
                          }}
                          className="w-20 border-[1.5px] px-2.5 py-2 text-[13px] outline-none"
                          style={{ borderColor: C.line, background: C.page, borderRadius: 2 }}
                        />
                        <span className="text-[12px]" style={{ color: C.muted }}>
                          条（实际生成条数）
                        </span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {[3, 5, 8, 12].map((n) => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => setAiEventCount(n)}
                            className="border px-2 py-1 text-[11px]"
                            style={{
                              borderColor: aiEventCount === n ? C.ink : C.line,
                              background: aiEventCount === n ? C.accentSoft : C.page,
                              borderRadius: 2,
                            }}
                          >
                            {n} 条
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : null}

                <textarea
                  value={aiDraft}
                  onChange={(e) => setAiDraft(e.target.value)}
                  rows={4}
                  placeholder={
                    mode === 'calendar'
                      ? '可留白。填写则优先：如近期有演唱会、出差、朋友聚会…（勿默认考试周）'
                      : '可留白。填写则优先：如工作日排班、周末排练…（按职业作息，勿默认上课）'
                  }
                  className="w-full resize-none border-[1.5px] px-3 py-2.5 text-[13px] outline-none"
                  style={{ borderColor: C.line, background: C.page, borderRadius: 2 }}
                />
                <button
                  type="button"
                  disabled={aiLoading}
                  onClick={() => void runAiGenerate()}
                  className="mt-3 w-full border-[1.5px] py-2.5 text-[13px] font-bold disabled:opacity-50"
                  style={{ borderColor: C.ink, background: C.ink, color: C.page, borderRadius: 2 }}
                >
                  {aiLoading
                    ? '生成中…'
                    : mode === 'calendar'
                      ? aiDraft.trim()
                        ? `按要求生成 ${aiEventCount} 条·${aiSpanDays}天`
                        : `按人设生成 ${aiEventCount} 条·${aiSpanDays}天`
                      : aiDraft.trim()
                        ? '按要求+人设生成'
                        : '按人设生成整周'}
                </button>

                {mode === 'weekly' && aiPreview?.length ? (
                  <div className="mt-4 border-[1.5px] p-3" style={{ borderColor: C.ink, borderRadius: 4 }}>
                    <p className="text-[12px] font-semibold">
                      预览 · 共 {aiPreview.length} 条（确认后替换当前周循环）
                    </p>
                    <ul className="mt-2 max-h-48 space-y-1.5 overflow-y-auto text-[11.5px]" style={{ color: C.muted }}>
                      {aiPreview.slice(0, 40).map((e) => (
                        <li key={e.id}>
                          {scheduleDayLabel(e.dayOfWeek)} {e.startTime}-{e.endTime} {e.activity}
                          {e.location ? ` @${e.location}` : ''}
                          {e.tag ? ` 〔${e.tag}〕` : ''}
                        </li>
                      ))}
                      {aiPreview.length > 40 ? <li>…其余 {aiPreview.length - 40} 条</li> : null}
                    </ul>
                    <button
                      type="button"
                      onClick={confirmAiPreview}
                      className="mt-3 w-full border-[1.5px] py-2.5 text-[13px] font-bold"
                      style={{ borderColor: C.accent, background: C.accentSoft, color: C.ink, borderRadius: 2 }}
                    >
                      确认写入（整周替换）
                    </button>
                  </div>
                ) : null}

                {mode === 'calendar' && aiCalPreview?.length ? (
                  <div className="mt-4 border-[1.5px] p-3" style={{ borderColor: C.ink, borderRadius: 4 }}>
                    <p className="text-[12px] font-semibold">
                      预览 · 共 {aiCalPreview.length} 条重要事件（确认后替换当前日历行程）
                    </p>
                    <ul className="mt-2 max-h-48 space-y-1.5 overflow-y-auto text-[11.5px]" style={{ color: C.muted }}>
                      {aiCalPreview.slice(0, 40).map((e) => (
                        <li key={e.id}>
                          {e.storyDay} {e.startTime}
                          {e.endTime ? `-${e.endTime}` : ''} {e.activity}
                          {e.location ? ` @${e.location}` : ''}
                          {e.tag ? ` 〔${e.tag}〕` : ''}
                        </li>
                      ))}
                      {aiCalPreview.length > 40 ? (
                        <li>…其余 {aiCalPreview.length - 40} 条</li>
                      ) : null}
                    </ul>
                    <button
                      type="button"
                      onClick={confirmAiPreview}
                      className="mt-3 w-full border-[1.5px] py-2.5 text-[13px] font-bold"
                      style={{ borderColor: C.accent, background: C.accentSoft, color: C.ink, borderRadius: 2 }}
                    >
                      确认写入（日历替换）
                    </button>
                  </div>
                ) : null}
              </motion.div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {toast ? (
          <div
            className="pointer-events-none absolute bottom-6 left-1/2 z-40 -translate-x-1/2 border-[1.5px] px-3 py-1.5 text-[12px] font-semibold"
            style={{ borderColor: C.ink, background: C.ink, color: C.page, borderRadius: 2 }}
          >
            {toast}
          </div>
        ) : null}
      </motion.div>
    </div>
  )
}

export default ScheduleEditorScreen
