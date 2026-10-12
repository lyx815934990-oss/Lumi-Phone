import { AnimatePresence, motion } from 'framer-motion'
import {
  Angry,
  BarChart3,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleOff,
  CircleAlert,
  CircleStop,
  Droplets,
  Frown,
  Heart,
  HeartHandshake,
  Loader2,
  MessageCircleHeart,
  Moon,
  NotebookPen,
  Play,
  Settings2,
  Smile,
  SmilePlus,
  Thermometer,
  X,
  type LucideIcon,
} from 'lucide-react'
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'

import { useCurrentApiConfig } from '../../api/ApiSettingsContext'
import { personaDb } from '../newFriendsPersona/idb'
import { fetchCouplePeriodCharCare } from './couplePeriodCharAi'
import {
  DEFAULT_PERIOD_AUTO_CARE_TIME,
  resolvePeriodAutoCareTimeKey,
} from './couplePeriodAutoCare'
import type {
  CouplePeriodCycle,
  CouplePeriodFlow,
  CouplePeriodMood,
  CouplePeriodPain,
} from './coupleSpaceTypes'
import {
  defaultCouplePeriodSettings,
  emptyCouplePeriodState,
  toLocalDateKey,
} from './coupleSpaceTypes'
import {
  PERIOD_FLOW_LABEL,
  PERIOD_MOOD_LABEL,
  PERIOD_PAIN_LABEL,
  buildMonthGrid,
  estimateAvgCycleDays,
  resolveCouplePeriodDayInfo,
  resolveCouplePeriodPhase,
  sortPeriodCyclesNewestFirst,
  type CouplePeriodDayKind,
} from './couplePeriodLogic'
import { getPeriodDayEntry } from './couplePeriodDayRecords'
import { CouplePeriodAnalysisPage } from './CouplePeriodAnalysisPage'
import { useCoupleSpaceStore } from './useCoupleSpaceStore'
import './coupleSpaceTheme.css'

type PeriodPageTab = 'calendar' | 'analysis'

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']
const FLOW_OPTIONS: Array<CouplePeriodFlow | null> = [null, 'light', 'medium', 'heavy']
const PAIN_OPTIONS: Array<CouplePeriodPain | null> = [null, 0, 1, 2, 3]
const MOOD_OPTIONS: Array<{
  value: CouplePeriodMood | null
  label: string
  Icon: LucideIcon
}> = [
  { value: null, label: '不记', Icon: CircleOff },
  { value: 'calm', label: PERIOD_MOOD_LABEL.calm, Icon: Smile },
  { value: 'low', label: PERIOD_MOOD_LABEL.low, Icon: Frown },
  { value: 'irritable', label: PERIOD_MOOD_LABEL.irritable, Icon: Angry },
  { value: 'sensitive', label: PERIOD_MOOD_LABEL.sensitive, Icon: Heart },
  { value: 'tired', label: PERIOD_MOOD_LABEL.tired, Icon: Moon },
  { value: 'anxious', label: PERIOD_MOOD_LABEL.anxious, Icon: CircleAlert },
]
const CYCLE_LEN_OPTIONS = [21, 24, 26, 28, 30, 32, 35]
const PERIOD_LEN_OPTIONS = [3, 4, 5, 6, 7]
const REMIND_OPTIONS: Array<number | null> = [null, 0, 1, 2, 3]

function periodCycleWrite(
  cycle: CouplePeriodCycle,
  patch: {
    flow?: CouplePeriodFlow | null
    pain?: CouplePeriodPain | null
    mood?: CouplePeriodMood | null
    note?: string | null
  } = {},
) {
  return {
    startDateKey: cycle.startDateKey,
    endDateKey: cycle.endDateKey ?? null,
    flow: patch.flow !== undefined ? patch.flow : (cycle.flow ?? null),
    pain: patch.pain !== undefined ? patch.pain : (cycle.pain ?? null),
    mood: patch.mood !== undefined ? patch.mood : (cycle.mood ?? null),
    note: patch.note !== undefined ? patch.note : (cycle.note ?? null),
  }
}

function formatDateLabel(dateKey: string): string {
  const [y, m, d] = dateKey.split('-')
  if (!y || !m || !d) return dateKey
  return `${Number(m)}月${Number(d)}日`
}

function dayKindClass(kind: CouplePeriodDayKind): string {
  if (kind === 'period') return 'cs-pcal-day--period'
  if (kind === 'predicted') return 'cs-pcal-day--predicted'
  if (kind === 'fertile') return 'cs-pcal-day--fertile'
  if (kind === 'ovulation') return 'cs-pcal-day--ovulation'
  return ''
}

function PanelRecordRow({
  icon: Icon,
  tone,
  label,
  children,
}: {
  icon: LucideIcon
  tone: 'rose' | 'coral' | 'amber' | 'lavender' | 'mint'
  label: string
  children: ReactNode
}) {
  return (
    <div className="cs-pcal-panel__row">
      <span className={`cs-pcal-panel__icon cs-pcal-panel__icon--${tone}`} aria-hidden>
        <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
      </span>
      <span className="cs-pcal-panel__label">{label}</span>
      <div className="cs-pcal-panel__trail">{children}</div>
    </div>
  )
}

function PeriodSettingsSheet({
  open,
  avgCycleDays,
  avgPeriodDays,
  remindBeforeDays,
  autoCare,
  autoCareTimeKey,
  estimatedCycleDays,
  charName,
  onClose,
  onSave,
}: {
  open: boolean
  avgCycleDays: number
  avgPeriodDays: number
  remindBeforeDays: number | null
  autoCare: boolean
  autoCareTimeKey: string
  estimatedCycleDays: number
  charName: string
  onClose: () => void
  onSave: (input: {
    avgCycleDays: number
    avgPeriodDays: number
    remindBeforeDays: number | null
    autoCare: boolean
    autoCareTimeKey: string | null
  }) => void
}) {
  const [cycleDays, setCycleDays] = useState(avgCycleDays)
  const [periodDays, setPeriodDays] = useState(avgPeriodDays)
  const [remind, setRemind] = useState<number | null>(remindBeforeDays)
  const [auto, setAuto] = useState(autoCare)
  const [careTime, setCareTime] = useState(autoCareTimeKey)

  useEffect(() => {
    if (!open) return
    setCycleDays(avgCycleDays)
    setPeriodDays(avgPeriodDays)
    setRemind(remindBeforeDays)
    setAuto(autoCare)
    setCareTime(autoCareTimeKey)
  }, [open, avgCycleDays, avgPeriodDays, remindBeforeDays, autoCare, autoCareTimeKey])

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="cs-days-sheet-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button type="button" className="cs-days-sheet-scrim" aria-label="关闭" onClick={onClose} />
          <motion.div
            className="cs-days-sheet cs-period-settings-sheet"
            role="dialog"
            aria-label="经期设置"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="cs-days-sheet__head">
              <p className="cs-days-sheet__title">经期设置</p>
              <button type="button" className="cs-days-sheet__close" aria-label="关闭" onClick={onClose}>
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="cs-period-settings-hint">
              有历史时预测优先用近几次间隔（当前约 {estimatedCycleDays} 天）
            </p>

            <p className="cs-period-chip-row__label">默认周期长度</p>
            <div className="cs-period-chips cs-period-chips--wrap">
              {CYCLE_LEN_OPTIONS.map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`cs-period-chip ${cycleDays === n ? 'cs-period-chip--on' : ''}`}
                  onClick={() => setCycleDays(n)}
                >
                  {n} 天
                </button>
              ))}
            </div>

            <p className="cs-period-chip-row__label">默认经期长度</p>
            <div className="cs-period-chips cs-period-chips--wrap">
              {PERIOD_LEN_OPTIONS.map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`cs-period-chip ${periodDays === n ? 'cs-period-chip--on' : ''}`}
                  onClick={() => setPeriodDays(n)}
                >
                  {n} 天
                </button>
              ))}
            </div>

            <p className="cs-period-chip-row__label">经期将至提醒</p>
            <div className="cs-period-chips cs-period-chips--wrap">
              {REMIND_OPTIONS.map((n) => (
                <button
                  key={String(n)}
                  type="button"
                  className={`cs-period-chip ${remind === n ? 'cs-period-chip--on' : ''}`}
                  onClick={() => setRemind(n)}
                >
                  {n == null ? '关闭' : n === 0 ? '当天' : `提前 ${n} 天`}
                </button>
              ))}
            </div>

            <div className="cs-period-settings-toggle">
              <div className="cs-period-settings-toggle__text">
                <p className="cs-period-chip-row__label" style={{ margin: 0 }}>
                  自动触发关心
                </p>
                <p className="cs-period-settings-hint" style={{ margin: '4px 0 0' }}>
                  经期进行中时每天到点由 {charName} 留下一句；不在情侣空间也会触发；错过则上线后补一次
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={auto}
                className={`cs-period-switch ${auto ? 'cs-period-switch--on' : ''}`}
                onClick={() => setAuto((v) => !v)}
              >
                <span className="cs-period-switch__knob" />
              </button>
            </div>

            {auto ? (
              <div className="cs-period-settings-time">
                <p className="cs-period-chip-row__label">每天触发时刻</p>
                <input
                  type="time"
                  className="cs-period-time-input"
                  value={careTime}
                  onChange={(e) => {
                    const v = e.target.value?.slice(0, 5) || DEFAULT_PERIOD_AUTO_CARE_TIME
                    setCareTime(v)
                  }}
                  aria-label="自动关心触发时刻"
                />
                <p className="cs-period-settings-hint" style={{ margin: '6px 0 0' }}>
                  本地时间 {careTime} 起可触发；当天若已过该时刻但还没生成，打开应用后会自动补一次。
                </p>
              </div>
            ) : null}

            <button
              type="button"
              className="cs-days-sheet__submit"
              onClick={() => {
                onSave({
                  avgCycleDays: cycleDays,
                  avgPeriodDays: periodDays,
                  remindBeforeDays: remind,
                  autoCare: auto,
                  autoCareTimeKey: auto ? careTime : null,
                })
                onClose()
              }}
            >
              保存设置
            </button>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

export function CouplePeriodPage({
  characterId,
  charName = 'TA',
  userName = '你',
  onBack,
}: {
  characterId: string
  charName?: string
  userName?: string
  onBack: () => void
}) {
  const apiConfig = useCurrentApiConfig('chatCard')
  const room = useCoupleSpaceStore((s) => s.getRoom(characterId) ?? s.ensureRoom(characterId))
  const setPeriodStartMarked = useCoupleSpaceStore((s) => s.setPeriodStartMarked)
  const setPeriodEndMarked = useCoupleSpaceStore((s) => s.setPeriodEndMarked)
  const updatePeriodCycle = useCoupleSpaceStore((s) => s.updatePeriodCycle)
  const updatePeriodDay = useCoupleSpaceStore((s) => s.updatePeriodDay)
  const updatePeriodSettings = useCoupleSpaceStore((s) => s.updatePeriodSettings)
  const requestPeriodCharAction = useCoupleSpaceStore((s) => s.requestPeriodCharAction)
  const setPeriodCharActionResponse = useCoupleSpaceStore((s) => s.setPeriodCharActionResponse)

  const period = room?.period ?? emptyCouplePeriodState()
  const settings = period.settings ?? defaultCouplePeriodSettings()
  const cycles = useMemo(() => sortPeriodCyclesNewestFirst(period.cycles), [period.cycles])
  const phase = useMemo(
    () => resolveCouplePeriodPhase({ cycles, settings }),
    [cycles, settings],
  )
  const estimated = estimateAvgCycleDays(cycles, settings.avgCycleDays)

  const today = toLocalDateKey()
  const todayDate = useMemo(() => new Date(), [])
  const [cursorY, setCursorY] = useState(todayDate.getFullYear())
  const [cursorM0, setCursorM0] = useState(todayDate.getMonth())
  const [selectedKey, setSelectedKey] = useState(today)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [pageTab, setPageTab] = useState<PeriodPageTab>('calendar')
  const [careBusy, setCareBusy] = useState(false)
  const [careHint, setCareHint] = useState<string | null>(null)
  const [careSheetOpen, setCareSheetOpen] = useState(false)
  const monthSwipeRef = useRef<{ x: number; y: number } | null>(null)

  const grid = useMemo(() => buildMonthGrid(cursorY, cursorM0), [cursorY, cursorM0])

  const dayInfoMap = useMemo(() => {
    const map = new Map<string, ReturnType<typeof resolveCouplePeriodDayInfo>>()
    for (const cell of grid) {
      map.set(
        cell.dateKey,
        resolveCouplePeriodDayInfo({
          dateKey: cell.dateKey,
          cycles,
          settings,
        }),
      )
    }
    return map
  }, [grid, cycles, settings])

  const selectedInfo = useMemo(
    () =>
      resolveCouplePeriodDayInfo({
        dateKey: selectedKey,
        cycles,
        settings,
      }),
    [selectedKey, cycles, settings],
  )

  const isPeriodDay = selectedInfo.kind === 'period'
  const selectedCycle = selectedInfo.cycle
  const selectedDayEntry = selectedCycle
    ? getPeriodDayEntry(selectedCycle, selectedKey)
    : undefined
  const isStartDay =
    selectedInfo.periodEdge === 'start' || selectedInfo.periodEdge === 'both'
  const isEndDay =
    selectedInfo.periodEdge === 'end' || selectedInfo.periodEdge === 'both'

  /** 进行中的经期（已来、未结束） */
  const openCycle = useMemo(
    () => cycles.find((c) => !c.endDateKey) ?? null,
    [cycles],
  )

  /**
   * 只显示其一，避免「来了 / 结束」同时出现矛盾：
   * - 已有未结束经期，且选中日在开始日之后 → 只问「结束了」
   * - 选中日正好是某段结束日（可撤销结束）→ 只问「结束了」
   * - 其余 → 只问「来了」
   */
  const panelMode: 'start' | 'end' = (() => {
    if (openCycle && selectedKey > openCycle.startDateKey) return 'end'
    if (!openCycle && isEndDay) return 'end'
    return 'start'
  })()

  const shiftMonth = (delta: number) => {
    const d = new Date(cursorY, cursorM0 + delta, 1)
    setCursorY(d.getFullYear())
    setCursorM0(d.getMonth())
  }

  const jumpToday = () => {
    const d = new Date()
    setCursorY(d.getFullYear())
    setCursorM0(d.getMonth())
    setSelectedKey(toLocalDateKey())
  }

  const onMonthPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    monthSwipeRef.current = { x: e.clientX, y: e.clientY }
  }

  const onMonthPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    const start = monthSwipeRef.current
    monthSwipeRef.current = null
    if (!start) return
    const dx = e.clientX - start.x
    const dy = e.clientY - start.y
    if (Math.abs(dx) < 48) return
    if (Math.abs(dx) < Math.abs(dy) * 1.2) return
    shiftMonth(dx < 0 ? 1 : -1)
  }

  const onMonthPointerCancel = () => {
    monthSwipeRef.current = null
  }

  const phaseLine = (() => {
    if (phase.kind === 'empty') return '点选日期，标记「月经来了」开始记录'
    if (phase.kind === 'in_period') return `经期第 ${phase.dayIndex} 天 · 好好照顾自己`
    if (phase.kind === 'upcoming') {
      return phase.daysUntil === 0
        ? '今天可能迎来经期'
        : `预计还有 ${phase.daysUntil} 天迎来经期`
    }
    return `比预计晚了 ${phase.daysLate} 天`
  })()

  const selectedKindHint = (() => {
    if (selectedInfo.kind === 'period') return '月经期'
    if (selectedInfo.kind === 'predicted') return '预测经期'
    if (selectedInfo.kind === 'ovulation') return '排卵日'
    if (selectedInfo.kind === 'fertile') return '排卵期'
    return '普通日'
  })()

  const careDayIndex =
    phase.kind === 'in_period' && selectedCycle && phase.cycle.id === selectedCycle.id
      ? phase.dayIndex
      : phase.kind === 'in_period'
        ? phase.dayIndex
        : null

  const runPeriodCare = async (
    cycle: CouplePeriodCycle,
    opts?: { silent?: boolean; openSheet?: boolean },
  ) => {
    if (careBusy) return
    setCareBusy(true)
    if (!opts?.silent) setCareHint(null)
    if (opts?.openSheet) setCareSheetOpen(true)
    requestPeriodCharAction(characterId, cycle.id, ['warm_comment'])
    try {
      const ch = await personaDb.getCharacter(characterId).catch(() => null)
      const dayIndex =
        phase.kind === 'in_period' && phase.cycle.id === cycle.id ? phase.dayIndex : careDayIndex
      const res = await fetchCouplePeriodCharCare({
        api: apiConfig,
        cycle,
        dayIndex,
        character: ch,
        charDisplayName: charName,
        userDisplayName: userName,
        relationshipStage: room?.binding?.relationshipStageAtBind,
      })
      const text = res?.text?.trim() ?? ''
      if (!text) {
        if (!opts?.silent) setCareHint('模型没有返回内容，未写入关心')
        return
      }
      setPeriodCharActionResponse(characterId, cycle.id, text)
      if (!opts?.silent) setCareHint(`${charName} 留下了关心`)
    } catch {
      if (!opts?.silent) setCareHint('请求失败，请稍后重试')
    } finally {
      setCareBusy(false)
    }
  }

  const openCareView = (cycle: CouplePeriodCycle) => {
    setCareSheetOpen(true)
    if (!cycle.charActions?.response?.trim() && !careBusy) {
      void runPeriodCare(cycle, { silent: false, openSheet: true })
    }
  }

  return (
    <div className="couple-space-root cs-period-root">
      <header className="cs-days-header">
        <button type="button" className="cs-days-header__icon-btn" onClick={onBack} aria-label="返回">
          <ChevronLeft className="h-[20px] w-[20px]" strokeWidth={1.75} />
        </button>
        <h1 className="couple-space-title cs-days-header__title">经期管理</h1>
        <button
          type="button"
          className="cs-days-header__icon-btn"
          aria-label="设置"
          onClick={() => setSettingsOpen(true)}
        >
          <Settings2 className="h-[18px] w-[18px]" strokeWidth={1.6} />
        </button>
      </header>

      <div className="cs-period-tabs" role="tablist" aria-label="经期视图">
        <div className="cs-period-tabs__track">
          <button
            type="button"
            role="tab"
            aria-selected={pageTab === 'calendar'}
            className={`cs-period-tab ${pageTab === 'calendar' ? 'cs-period-tab--on' : ''}`}
            onClick={() => setPageTab('calendar')}
          >
            <CalendarDays className="cs-period-tab__icon" strokeWidth={1.75} aria-hidden />
            日历
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={pageTab === 'analysis'}
            className={`cs-period-tab ${pageTab === 'analysis' ? 'cs-period-tab--on' : ''}`}
            onClick={() => setPageTab('analysis')}
          >
            <BarChart3 className="cs-period-tab__icon" strokeWidth={1.75} aria-hidden />
            分析
          </button>
        </div>
      </div>

      {pageTab === 'analysis' ? (
        <CouplePeriodAnalysisPage characterId={characterId} />
      ) : null}

      {pageTab === 'calendar' ? (
      <div className="cs-period-body cs-period-body--cal">
        <div className="cs-pcal-monthbar">
          <button type="button" className="cs-pcal-monthbar__nav" onClick={() => shiftMonth(-1)} aria-label="上一月">
            <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
            <span>{((cursorM0 + 11) % 12) + 1}月</span>
          </button>
          <button type="button" className="cs-pcal-monthbar__title" onClick={jumpToday}>
            {cursorY}年{cursorM0 + 1}月
          </button>
          <button type="button" className="cs-pcal-monthbar__nav" onClick={() => shiftMonth(1)} aria-label="下一月">
            <span>{((cursorM0 + 1) % 12) + 1}月</span>
            <ChevronRight className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>

        <div
          className="cs-pcal-card cs-pcal-card--swipe"
          onPointerDown={onMonthPointerDown}
          onPointerUp={onMonthPointerUp}
          onPointerCancel={onMonthPointerCancel}
        >
          <div className="cs-pcal-weekdays">
            {WEEKDAYS.map((w) => (
              <span key={w}>{w}</span>
            ))}
          </div>
          <div className="cs-pcal-grid">
            {grid.map((cell) => {
              const info = dayInfoMap.get(cell.dateKey)!
              const selected = cell.dateKey === selectedKey
              const isToday = cell.dateKey === today
              return (
                <button
                  key={cell.dateKey}
                  type="button"
                  className={[
                    'cs-pcal-day',
                    dayKindClass(info.kind),
                    cell.inMonth ? '' : 'cs-pcal-day--out',
                    selected ? 'cs-pcal-day--selected' : '',
                    isToday ? 'cs-pcal-day--today' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => {
                    setSelectedKey(cell.dateKey)
                    if (!cell.inMonth) {
                      const [y, m] = cell.dateKey.split('-').map(Number)
                      if (y && m) {
                        setCursorY(y)
                        setCursorM0(m - 1)
                      }
                    }
                  }}
                >
                  {info.kind === 'period' &&
                  (info.periodEdge === 'start' || info.periodEdge === 'both') ? (
                    <span className="cs-pcal-day__edge cs-pcal-day__edge--start" aria-hidden>
                      ▶
                    </span>
                  ) : null}
                  {info.kind === 'period' &&
                  (info.periodEdge === 'end' || info.periodEdge === 'both') ? (
                    <span className="cs-pcal-day__edge cs-pcal-day__edge--end" aria-hidden>
                      ■
                    </span>
                  ) : null}
                  {info.kind === 'ovulation' ? (
                    <span className="cs-pcal-day__ovu" aria-hidden>
                      ◆
                    </span>
                  ) : null}
                  <span className="cs-pcal-day__num">{cell.day}</span>
                  {isToday ? <span className="cs-pcal-day__today-tag">今天</span> : null}
                </button>
              )
            })}
          </div>

          <div className="cs-pcal-legend">
            <span>
              <i className="cs-pcal-legend__swatch cs-pcal-legend__swatch--period" />
              月经期
            </span>
            <span>
              <i className="cs-pcal-legend__swatch cs-pcal-legend__swatch--predicted" />
              预测经期
            </span>
            <span>
              <i className="cs-pcal-legend__swatch cs-pcal-legend__swatch--fertile" />
              排卵期
            </span>
            <span>
              <i className="cs-pcal-legend__ovu" aria-hidden>
                ◆
              </i>
              排卵日
            </span>
          </div>
        </div>

        <div className="cs-pcal-status">
          <p className="cs-pcal-status__line">{phaseLine}</p>
          <p className="cs-pcal-status__sub">
            {formatDateLabel(selectedKey)} · {selectedKindHint}
            {estimated ? ` · 周期约 ${estimated} 天` : ''}
          </p>
        </div>

        <div className="cs-pcal-panel">
          {panelMode === 'start' ? (
            <PanelRecordRow icon={Play} tone="rose" label="月经来了">
              <div className="cs-pcal-yesno">
                <button
                  type="button"
                  className={`cs-pcal-yesno__btn ${isStartDay ? 'cs-pcal-yesno__btn--on' : ''}`}
                  onClick={() => setPeriodStartMarked(characterId, selectedKey, true)}
                >
                  是
                </button>
                <button
                  type="button"
                  className={`cs-pcal-yesno__btn ${!isStartDay ? 'cs-pcal-yesno__btn--on' : ''}`}
                  onClick={() => setPeriodStartMarked(characterId, selectedKey, false)}
                >
                  否
                </button>
              </div>
            </PanelRecordRow>
          ) : (
            <PanelRecordRow icon={CircleStop} tone="coral" label="月经结束了">
              <div className="cs-pcal-yesno">
                <button
                  type="button"
                  className={`cs-pcal-yesno__btn ${isEndDay ? 'cs-pcal-yesno__btn--on' : ''}`}
                  onClick={() => setPeriodEndMarked(characterId, selectedKey, true)}
                >
                  是
                </button>
                <button
                  type="button"
                  className={`cs-pcal-yesno__btn ${!isEndDay ? 'cs-pcal-yesno__btn--on' : ''}`}
                  onClick={() => setPeriodEndMarked(characterId, selectedKey, false)}
                >
                  否
                </button>
              </div>
            </PanelRecordRow>
          )}

          {isPeriodDay && selectedCycle ? (
            <>
              <p className="cs-pcal-panel__day-cap">
                记录 {formatDateLabel(selectedKey)} 当天（可每天不同）
              </p>
              <PanelRecordRow icon={Droplets} tone="lavender" label="流量">
                <div className="cs-period-chips cs-period-chips--compact">
                  {FLOW_OPTIONS.map((opt) => (
                    <button
                      key={String(opt)}
                      type="button"
                      className={`cs-period-chip ${(selectedDayEntry?.flow ?? null) === opt ? 'cs-period-chip--on' : ''}`}
                      onClick={() =>
                        updatePeriodDay(characterId, selectedCycle.id, selectedKey, {
                          flow: opt,
                        })
                      }
                    >
                      {opt == null ? '不记' : PERIOD_FLOW_LABEL[opt]}
                    </button>
                  ))}
                </div>
              </PanelRecordRow>
              <PanelRecordRow icon={Thermometer} tone="amber" label="痛感">
                <div className="cs-period-chips cs-period-chips--compact">
                  {PAIN_OPTIONS.map((opt) => (
                    <button
                      key={String(opt)}
                      type="button"
                      className={`cs-period-chip ${(selectedDayEntry?.pain ?? null) === opt ? 'cs-period-chip--on' : ''}`}
                      onClick={() =>
                        updatePeriodDay(characterId, selectedCycle.id, selectedKey, {
                          pain: opt,
                        })
                      }
                    >
                      {opt == null ? '不记' : PERIOD_PAIN_LABEL[opt]}
                    </button>
                  ))}
                </div>
              </PanelRecordRow>
              <PanelRecordRow icon={SmilePlus} tone="rose" label="心情">
                <div className="cs-period-moods" role="listbox" aria-label="心情">
                  {MOOD_OPTIONS.map(({ value, label, Icon }) => {
                    const on = (selectedDayEntry?.mood ?? null) === value
                    return (
                      <button
                        key={String(value)}
                        type="button"
                        role="option"
                        aria-selected={on}
                        aria-label={label}
                        title={label}
                        className={`cs-period-mood ${on ? 'cs-period-mood--on' : ''}`}
                        onClick={() =>
                          updatePeriodDay(characterId, selectedCycle.id, selectedKey, {
                            mood: value,
                          })
                        }
                      >
                        <Icon className="cs-period-mood__icon" strokeWidth={1.75} aria-hidden />
                        <span className="cs-period-mood__label">{label}</span>
                      </button>
                    )
                  })}
                </div>
              </PanelRecordRow>
              <div className="cs-pcal-panel__note-block">
                <PanelRecordRow icon={NotebookPen} tone="mint" label="备注">
                  <span className="cs-pcal-panel__note-cap">只给自己看 · 整段共用</span>
                </PanelRecordRow>
                <textarea
                  className="cs-pcal-panel__textarea"
                  value={selectedCycle.note ?? ''}
                  maxLength={120}
                  placeholder="写一点这次经期的感受…"
                  onChange={(e) =>
                    updatePeriodCycle(
                      characterId,
                      selectedCycle.id,
                      periodCycleWrite(selectedCycle, { note: e.target.value || null }),
                    )
                  }
                />
              </div>
              <div className="cs-period-care">
                <PanelRecordRow icon={HeartHandshake} tone="coral" label="TA的关心">
                  <span className="cs-pcal-panel__note-cap">
                    {settings.autoCare
                      ? `每天 ${resolvePeriodAutoCareTimeKey(settings) ?? DEFAULT_PERIOD_AUTO_CARE_TIME}`
                      : '暖心向 · 不含备注'}
                  </span>
                </PanelRecordRow>
                <p className="cs-period-care__hint">
                  {settings.autoCare
                    ? `每天 ${resolvePeriodAutoCareTimeKey(settings) ?? DEFAULT_PERIOD_AUTO_CARE_TIME} 自动关心；错过会在上线后补一次。也可点下方查看。`
                    : `${charName} 会看到阶段与已填的流量、痛感、心情，留下一句体贴回应。`}
                </p>
                {selectedCycle.charActions?.response?.trim() ? (
                  <div className="cs-diary-char-response cs-period-care__response">
                    <p className="mb-1 text-[10px] font-medium tracking-wide text-[#B99A8E]">
                      {charName} 的关心
                    </p>
                    <p className="text-[12px] leading-relaxed text-[#6A5248]">
                      {selectedCycle.charActions.response}
                    </p>
                  </div>
                ) : careBusy ? (
                  <p className="cs-period-care__status">正在生成关心…</p>
                ) : null}
                <div className="cs-period-care__actions">
                  <button
                    type="button"
                    className="cs-diary-action-chip"
                    disabled={careBusy}
                    onClick={() => openCareView(selectedCycle)}
                  >
                    {careBusy ? (
                      <Loader2 className="h-3 w-3 animate-spin" strokeWidth={1.75} />
                    ) : (
                      <MessageCircleHeart className="h-3 w-3" strokeWidth={1.75} />
                    )}
                    查看TA的关心
                  </button>
                  {selectedCycle.charActions?.response?.trim() ? (
                    <button
                      type="button"
                      className="cs-diary-action-chip cs-period-care__refresh"
                      disabled={careBusy}
                      onClick={() => void runPeriodCare(selectedCycle, { openSheet: true })}
                    >
                      换一句
                    </button>
                  ) : null}
                </div>
                {careHint ? <p className="cs-period-care__status">{careHint}</p> : null}
              </div>
            </>
          ) : (
            <p className="cs-pcal-panel__hint">
              {panelMode === 'end'
                ? '经期进行中，在结束那天点「是」即可。'
                : '点「是」标记月经开始；开始后，后面的日期只会问是否结束。'}
            </p>
          )}
        </div>
      </div>
      ) : null}

      <PeriodSettingsSheet
        open={settingsOpen}
        avgCycleDays={settings.avgCycleDays}
        avgPeriodDays={settings.avgPeriodDays}
        remindBeforeDays={
          settings.remindBeforeDays === 0 ||
          settings.remindBeforeDays === 1 ||
          settings.remindBeforeDays === 2 ||
          settings.remindBeforeDays === 3
            ? settings.remindBeforeDays
            : null
        }
        autoCare={settings.autoCare === true}
        autoCareTimeKey={
          resolvePeriodAutoCareTimeKey(settings) ?? DEFAULT_PERIOD_AUTO_CARE_TIME
        }
        estimatedCycleDays={estimated}
        charName={charName}
        onClose={() => setSettingsOpen(false)}
        onSave={(input) => {
          updatePeriodSettings(characterId, {
            avgCycleDays: input.avgCycleDays,
            avgPeriodDays: input.avgPeriodDays,
            remindBeforeDays: input.remindBeforeDays,
            autoCare: input.autoCare,
            ...(input.autoCare
              ? { autoCareTimeKey: input.autoCareTimeKey ?? DEFAULT_PERIOD_AUTO_CARE_TIME }
              : { autoCareTimeKey: undefined }),
          })
        }}
      />

      <AnimatePresence>
        {careSheetOpen && selectedCycle ? (
          <motion.div
            className="cs-days-sheet-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button
              type="button"
              className="cs-days-sheet-scrim"
              aria-label="关闭"
              onClick={() => setCareSheetOpen(false)}
            />
            <motion.div
              className="cs-days-sheet cs-period-care-sheet"
              role="dialog"
              aria-label={`${charName}的关心`}
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 24, opacity: 0 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="cs-days-sheet__head">
                <p className="cs-days-sheet__title">{charName} 的关心</p>
                <button
                  type="button"
                  className="cs-days-sheet__close"
                  aria-label="关闭"
                  onClick={() => setCareSheetOpen(false)}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              {careBusy && !selectedCycle.charActions?.response?.trim() ? (
                <div className="cs-period-care-sheet__loading">
                  <Loader2 className="h-5 w-5 animate-spin text-[#D99C90]" strokeWidth={1.75} />
                  <p>正在写下关心…</p>
                </div>
              ) : selectedCycle.charActions?.response?.trim() ? (
                <p className="cs-period-care-sheet__body">{selectedCycle.charActions.response}</p>
              ) : (
                <p className="cs-period-care-sheet__empty">还没有关心内容，稍后再看或点「换一句」生成</p>
              )}
              <div className="cs-period-care-sheet__actions">
                <button
                  type="button"
                  className="cs-diary-action-chip"
                  disabled={careBusy}
                  onClick={() => void runPeriodCare(selectedCycle, { openSheet: true })}
                >
                  {careBusy ? (
                    <Loader2 className="h-3 w-3 animate-spin" strokeWidth={1.75} />
                  ) : (
                    <MessageCircleHeart className="h-3 w-3" strokeWidth={1.75} />
                  )}
                  {selectedCycle.charActions?.response?.trim() ? '换一句' : '生成关心'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
