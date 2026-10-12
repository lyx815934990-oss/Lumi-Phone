import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowUpFromLine,
  BookHeart,
  CalendarHeart,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Heart,
  Highlighter,
  Palette,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  X,
} from 'lucide-react'
import { useMemo, useRef, useState } from 'react'

import type {
  CoupleMilestone,
  CoupleMilestoneAccent,
  CoupleMilestoneCategory,
  CoupleMilestoneRepeat,
} from './coupleSpaceTypes'
import {
  COUPLE_MILESTONE_ACCENT_OPTIONS,
  coupleDaysTogether,
  coupleMilestoneAccentLabel,
  coupleMilestoneResolvedAccent,
  toLocalDateKey,
} from './coupleSpaceTypes'
import {
  coupleMilestoneEffectiveDateKey,
  coupleRemindLabel,
  type CoupleRemindOffsetDays,
} from './coupleMilestoneRemind'
import { useCoupleSpaceStore } from './useCoupleSpaceStore'
import './coupleSpaceTheme.css'

const WEEKDAYS = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']

const CATEGORY_LABEL: Record<CoupleMilestoneCategory, string> = {
  life: '生活',
  love: '恋爱',
  memory: '纪念',
}

const REPEAT_LABEL: Record<CoupleMilestoneRepeat, string> = {
  none: '不重复',
  yearly: '每年',
  monthly: '每月',
}

const CATEGORY_OPTIONS: CoupleMilestoneCategory[] = ['life', 'love', 'memory']
const REPEAT_OPTIONS: CoupleMilestoneRepeat[] = ['none', 'yearly', 'monthly']
const REMIND_OPTIONS: Array<CoupleRemindOffsetDays | null> = [null, 0, 1, 3, 7]

type DayEditorValues = {
  title: string
  dateKey: string
  pinned: boolean
  repeat: CoupleMilestoneRepeat
  category: CoupleMilestoneCategory
  remindOffsetDays: CoupleRemindOffsetDays | null
  endDateKey: string | null
  timeKey: string | null
  countFromNextDay: boolean
  accent: CoupleMilestoneAccent | null
  highlight: boolean
}

type PickerKind = 'category' | 'repeat' | 'remind' | 'accent' | null

function DayOptionPicker({
  open,
  title,
  options,
  valueKey,
  onPick,
  onClose,
}: {
  open: boolean
  title: string
  options: Array<{ key: string; label: string; swatch?: string }>
  valueKey: string
  onPick: (key: string) => void
  onClose: () => void
}) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key={title}
          className="cs-days-sheet-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <button
            type="button"
            className="cs-days-sheet-scrim"
            aria-label="关闭"
            onClick={onClose}
          />
          <motion.div
            className="cs-days-sheet cs-day-picker-sheet"
            role="dialog"
            aria-label={title}
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="cs-days-sheet__head">
              <p className="cs-days-sheet__title">{title}</p>
              <button
                type="button"
                className="cs-days-sheet__close"
                aria-label="关闭"
                onClick={onClose}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <ul className="cs-day-picker-list">
              {options.map((opt) => {
                const active = opt.key === valueKey
                return (
                  <li key={opt.key}>
                    <button
                      type="button"
                      className={`cs-day-picker-option ${active ? 'cs-day-picker-option--on' : ''}`}
                      onClick={() => {
                        onPick(opt.key)
                        onClose()
                      }}
                    >
                      <span className="cs-day-picker-option__main">
                        {opt.swatch ? (
                          <span
                            className={`cs-day-accent-dot cs-day-accent-dot--${opt.swatch}`}
                            aria-hidden
                          />
                        ) : null}
                        <span>{opt.label}</span>
                      </span>
                      {active ? <span className="cs-day-picker-option__check">✓</span> : null}
                    </button>
                  </li>
                )
              })}
            </ul>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

function shortDateLabel(dateKey: string): string {
  const d = parseDateKey(dateKey)
  if (!d) return dateKey
  return `${d.getMonth() + 1}-${d.getDate()}`
}

function advancedSummary(v: Pick<
  DayEditorValues,
  'endDateKey' | 'timeKey' | 'countFromNextDay' | 'accent' | 'highlight' | 'category'
>): string {
  const parts: string[] = []
  if (v.endDateKey) parts.push(`结束 ${shortDateLabel(v.endDateKey)}`)
  if (v.timeKey) parts.push(v.timeKey)
  if (v.countFromNextDay) parts.push('+1日')
  parts.push(
    coupleMilestoneAccentLabel(
      v.accent ?? coupleMilestoneResolvedAccent({ category: v.category }),
    ),
  )
  if (v.highlight) parts.push('高亮')
  return parts.join(' · ')
}

function CoupleDayAdvancedPanel({
  dateKey,
  category,
  endDateKey,
  timeKey,
  countFromNextDay,
  accent,
  highlight,
  onChange,
}: {
  dateKey: string
  category: CoupleMilestoneCategory
  endDateKey: string | null
  timeKey: string | null
  countFromNextDay: boolean
  accent: CoupleMilestoneAccent | null
  highlight: boolean
  onChange: (
    patch: Partial<
      Pick<
        DayEditorValues,
        'endDateKey' | 'timeKey' | 'countFromNextDay' | 'accent' | 'highlight'
      >
    >,
  ) => void
}) {
  const [accentPicker, setAccentPicker] = useState(false)
  const endInputRef = useRef<HTMLInputElement>(null)
  const timeInputRef = useRef<HTMLInputElement>(null)
  const resolvedAccent = accent ?? coupleMilestoneResolvedAccent({ category })

  return (
    <>
      <div className="cs-day-add-adv-panel">
        <div className="cs-day-add-row cs-day-add-row--picker">
          <span className="cs-day-add-row__icon" aria-hidden>
            <CalendarHeart className="h-[18px] w-[18px]" strokeWidth={1.7} />
          </span>
          <span className="cs-day-add-row__label">结束日</span>
          <span className="cs-day-add-row__trail">
            <span className="cs-day-add-row__value cs-day-add-row__value--accent">
              {endDateKey ? formatTargetLabel(endDateKey) : '未设置'}
            </span>
            <ChevronRight className="h-4 w-4 text-[#C9A99C]" strokeWidth={1.75} />
          </span>
          <input
            ref={endInputRef}
            type="date"
            className="cs-day-add-date-hit"
            min={dateKey}
            value={endDateKey ?? dateKey}
            aria-label="选择结束日"
            onPointerDown={() => {
              if (!endDateKey) onChange({ endDateKey: dateKey })
            }}
            onChange={(e) => {
              const v = e.target.value
              if (!v) {
                onChange({ endDateKey: null })
                return
              }
              onChange({ endDateKey: v < dateKey ? dateKey : v })
            }}
          />
        </div>
        {endDateKey ? (
          <button
            type="button"
            className="cs-day-add-clear-link"
            onClick={() => onChange({ endDateKey: null })}
          >
            清除结束日
          </button>
        ) : (
          <p className="cs-day-add-remind-hint">旅行、异地等区间日子，可设结束日显示「还有 X 天结束」。</p>
        )}

        <div className="cs-day-add-row cs-day-add-row--picker">
          <span className="cs-day-add-row__icon" aria-hidden>
            <Clock3 className="h-[18px] w-[18px]" strokeWidth={1.7} />
          </span>
          <span className="cs-day-add-row__label">精确时间</span>
          <span className="cs-day-add-row__trail">
            <span className="cs-day-add-row__value cs-day-add-row__value--accent">
              {timeKey ?? '未设置（0:00）'}
            </span>
            <ChevronRight className="h-4 w-4 text-[#C9A99C]" strokeWidth={1.75} />
          </span>
          <input
            ref={timeInputRef}
            type="time"
            className="cs-day-add-date-hit"
            value={timeKey ?? '20:00'}
            aria-label="选择精确时间"
            onPointerDown={() => {
              if (!timeKey) onChange({ timeKey: '20:00' })
            }}
            onChange={(e) => {
              const v = e.target.value
              onChange({ timeKey: v ? v.slice(0, 5) : null })
            }}
          />
        </div>
        {timeKey ? (
          <button
            type="button"
            className="cs-day-add-clear-link"
            onClick={() => onChange({ timeKey: null })}
          >
            清除精确时间
          </button>
        ) : (
          <p className="cs-day-add-remind-hint">提醒日到了该时刻后，才会弹出仪式提醒。</p>
        )}

        <div className="cs-day-add-row">
          <span className="cs-day-add-row__icon" aria-hidden>
            <Plus className="h-[18px] w-[18px]" strokeWidth={1.7} />
          </span>
          <span className="cs-day-add-adv">
            <span className="cs-day-add-row__label">+1 日</span>
            <span className="cs-day-add-adv__sub">从目标日的下一天开始计「已经」</span>
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={countFromNextDay}
            className={`cs-day-add-switch ${countFromNextDay ? 'cs-day-add-switch--on' : ''}`}
            onClick={() => onChange({ countFromNextDay: !countFromNextDay })}
          >
            <span className="cs-day-add-switch__knob" />
            <span className="cs-day-add-switch__text">{countFromNextDay ? 'ON' : 'OFF'}</span>
          </button>
        </div>

        <button type="button" className="cs-day-add-row" onClick={() => setAccentPicker(true)}>
          <span className="cs-day-add-row__icon" aria-hidden>
            <Palette className="h-[18px] w-[18px]" strokeWidth={1.7} />
          </span>
          <span className="cs-day-add-row__label">颜色</span>
          <span className="cs-day-add-row__trail">
            <span
              className={`cs-day-accent-dot cs-day-accent-dot--${resolvedAccent}`}
              aria-hidden
            />
            <span className="cs-day-add-row__value">
              {accent
                ? coupleMilestoneAccentLabel(accent)
                : `跟随倒数本（${coupleMilestoneAccentLabel(resolvedAccent)}）`}
            </span>
            <ChevronRight className="h-4 w-4 text-[#C9A99C]" strokeWidth={1.75} />
          </span>
        </button>

        <div className="cs-day-add-row">
          <span className="cs-day-add-row__icon" aria-hidden>
            <Highlighter className="h-[18px] w-[18px]" strokeWidth={1.7} />
          </span>
          <span className="cs-day-add-adv">
            <span className="cs-day-add-row__label">高亮</span>
            <span className="cs-day-add-adv__sub">列表里更醒目，不必抢主卡</span>
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={highlight}
            className={`cs-day-add-switch ${highlight ? 'cs-day-add-switch--on' : ''}`}
            onClick={() => onChange({ highlight: !highlight })}
          >
            <span className="cs-day-add-switch__knob" />
            <span className="cs-day-add-switch__text">{highlight ? 'ON' : 'OFF'}</span>
          </button>
        </div>
      </div>

      <DayOptionPicker
        open={accentPicker}
        title="选择颜色"
        valueKey={accent ?? 'auto'}
        options={[
          { key: 'auto', label: '跟随倒数本', swatch: resolvedAccent },
          ...COUPLE_MILESTONE_ACCENT_OPTIONS.map((o) => ({
            key: o.id,
            label: o.label,
            swatch: o.id,
          })),
        ]}
        onPick={(key) => {
          if (key === 'auto') onChange({ accent: null })
          else onChange({ accent: key as CoupleMilestoneAccent })
        }}
        onClose={() => setAccentPicker(false)}
      />
    </>
  )
}

function CoupleDayEditorPage({
  mode,
  initial,
  lockDate,
  onBack,
  onSave,
  onDelete,
}: {
  mode: 'add' | 'edit'
  initial?: Partial<DayEditorValues>
  lockDate?: boolean
  onBack: () => void
  onSave: (input: DayEditorValues) => void
  onDelete?: () => void
}) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [dateKey, setDateKey] = useState(initial?.dateKey ?? toLocalDateKey())
  const [pinned, setPinned] = useState(initial?.pinned ?? false)
  const [repeat, setRepeat] = useState<CoupleMilestoneRepeat>(initial?.repeat ?? 'none')
  const [category, setCategory] = useState<CoupleMilestoneCategory>(initial?.category ?? 'love')
  const [remindOffsetDays, setRemindOffsetDays] = useState<CoupleRemindOffsetDays | null>(
    initial?.remindOffsetDays ?? 1,
  )
  const [endDateKey, setEndDateKey] = useState<string | null>(initial?.endDateKey ?? null)
  const [timeKey, setTimeKey] = useState<string | null>(initial?.timeKey ?? null)
  const [countFromNextDay, setCountFromNextDay] = useState(initial?.countFromNextDay ?? false)
  const [accent, setAccent] = useState<CoupleMilestoneAccent | null>(initial?.accent ?? null)
  const [highlight, setHighlight] = useState(initial?.highlight ?? false)
  const [picker, setPicker] = useState<PickerKind>(null)
  const [advOpen, setAdvOpen] = useState(false)
  const dateInputRef = useRef<HTMLInputElement>(null)

  const canSave = !!title.trim() && !!dateKey

  const patchAdvanced = (
    patch: Partial<
      Pick<
        DayEditorValues,
        'endDateKey' | 'timeKey' | 'countFromNextDay' | 'accent' | 'highlight'
      >
    >,
  ) => {
    if (patch.endDateKey !== undefined) setEndDateKey(patch.endDateKey)
    if (patch.timeKey !== undefined) setTimeKey(patch.timeKey)
    if (patch.countFromNextDay !== undefined) setCountFromNextDay(patch.countFromNextDay)
    if (patch.accent !== undefined) setAccent(patch.accent)
    if (patch.highlight !== undefined) setHighlight(patch.highlight)
  }

  const save = () => {
    if (!canSave) return
    onSave({
      title: title.trim(),
      dateKey,
      pinned,
      repeat,
      category,
      remindOffsetDays,
      endDateKey,
      timeKey,
      countFromNextDay,
      accent,
      highlight,
    })
  }

  const timeHint = timeKey ? timeKey : '0:00'

  return (
    <div className="couple-space-root cs-days-root cs-day-add-root">
      <header className="cs-days-header">
        <button
          type="button"
          onClick={onBack}
          className="cs-days-header__icon-btn"
          aria-label="返回"
        >
          <ChevronLeft className="h-[20px] w-[20px]" strokeWidth={1.75} />
        </button>
        <h1 className="couple-space-title cs-days-header__title">
          {mode === 'edit' ? '编辑日子' : '添加新日子'}
        </h1>
        <button
          type="button"
          className={`cs-day-add-save-chip ${canSave ? '' : 'cs-day-add-save-chip--disabled'}`}
          disabled={!canSave}
          onClick={save}
        >
          保存
        </button>
      </header>

      <div className="cs-day-add-body">
        <div className="cs-day-add-card">
          <label className="cs-day-add-row cs-day-add-row--title">
            <span className="cs-day-add-row__icon" aria-hidden>
              <Heart className="h-[18px] w-[18px]" strokeWidth={1.7} />
            </span>
            <input
              className="cs-day-add-row__input"
              value={title}
              maxLength={40}
              placeholder="点击这里输入事件名称"
              onChange={(e) => setTitle(e.target.value)}
              autoFocus={mode === 'add'}
            />
          </label>

          <div
            className={`cs-day-add-row cs-day-add-row--picker ${lockDate ? 'cs-day-add-row--locked' : ''}`}
          >
            <span className="cs-day-add-row__icon" aria-hidden>
              <CalendarHeart className="h-[18px] w-[18px]" strokeWidth={1.7} />
            </span>
            <span className="cs-day-add-row__label">目标日</span>
            <span className="cs-day-add-row__value cs-day-add-row__value--accent">
              {formatTargetLabel(dateKey)}
            </span>
            <span className="cs-day-add-pill">{lockDate ? '绑定' : '公历'}</span>
            {!lockDate ? (
              <input
                ref={dateInputRef}
                type="date"
                className="cs-day-add-date-hit"
                value={dateKey}
                aria-label="选择目标日"
                onChange={(e) => {
                  const next = e.target.value || toLocalDateKey()
                  setDateKey(next)
                  if (endDateKey && endDateKey < next) setEndDateKey(next)
                }}
              />
            ) : null}
          </div>

          <button type="button" className="cs-day-add-row" onClick={() => setPicker('category')}>
            <span className="cs-day-add-row__icon" aria-hidden>
              <BookHeart className="h-[18px] w-[18px]" strokeWidth={1.7} />
            </span>
            <span className="cs-day-add-row__label">倒数本</span>
            <span className="cs-day-add-row__trail">
              <span className="cs-day-add-cat-icon" aria-hidden>
                ♡
              </span>
              <span className="cs-day-add-row__value">{CATEGORY_LABEL[category]}</span>
              <ChevronRight className="h-4 w-4 text-[#C9A99C]" strokeWidth={1.75} />
            </span>
          </button>

          <div className="cs-day-add-row">
            <span className="cs-day-add-row__icon" aria-hidden>
              <ArrowUpFromLine className="h-[18px] w-[18px]" strokeWidth={1.7} />
            </span>
            <span className="cs-day-add-row__label">置顶</span>
            <button
              type="button"
              role="switch"
              aria-checked={pinned}
              className={`cs-day-add-switch ${pinned ? 'cs-day-add-switch--on' : ''}`}
              onClick={() => setPinned((v) => !v)}
            >
              <span className="cs-day-add-switch__knob" />
              <span className="cs-day-add-switch__text">{pinned ? 'ON' : 'OFF'}</span>
            </button>
          </div>

          <button type="button" className="cs-day-add-row" onClick={() => setPicker('repeat')}>
            <span className="cs-day-add-row__icon" aria-hidden>
              <RefreshCw className="h-[18px] w-[18px]" strokeWidth={1.7} />
            </span>
            <span className="cs-day-add-row__label">重复</span>
            <span className="cs-day-add-row__trail">
              <span className="cs-day-add-row__value cs-day-add-row__value--accent">
                {REPEAT_LABEL[repeat]}
              </span>
              <ChevronRight className="h-4 w-4 text-[#C9A99C]" strokeWidth={1.75} />
            </span>
          </button>

          <button type="button" className="cs-day-add-row" onClick={() => setPicker('remind')}>
            <span className="cs-day-add-row__icon" aria-hidden>
              <Clock3 className="h-[18px] w-[18px]" strokeWidth={1.7} />
            </span>
            <span className="cs-day-add-row__label">定期提醒</span>
            <span className="cs-day-add-row__trail">
              <span className="cs-day-add-row__value cs-day-add-row__value--accent">
                {coupleRemindLabel(remindOffsetDays)}
              </span>
              <ChevronRight className="h-4 w-4 text-[#C9A99C]" strokeWidth={1.75} />
            </span>
          </button>
          {remindOffsetDays != null ? (
            <p className="cs-day-add-remind-hint">
              {remindOffsetDays === 0
                ? `会在目标日当天 ${timeHint} 起，以仪式弹层轻轻提醒你一次。`
                : `纪念日会按频率：提前 ${remindOffsetDays} 天的那天 ${timeHint} 提醒一次；普通日子仍只在目标日当天提醒。`}
            </p>
          ) : null}
        </div>

        <div className="cs-day-add-card cs-day-add-card--gap">
          <button
            type="button"
            className="cs-day-add-row cs-day-add-row--adv-toggle"
            aria-expanded={advOpen}
            onClick={() => setAdvOpen((v) => !v)}
          >
            <span className="cs-day-add-row__icon" aria-hidden>
              <Sparkles className="h-[18px] w-[18px]" strokeWidth={1.7} />
            </span>
            <span className="cs-day-add-adv">
              <span className="cs-day-add-adv__title">进阶设置</span>
              <span className="cs-day-add-adv__sub">
                {advancedSummary({
                  endDateKey,
                  timeKey,
                  countFromNextDay,
                  accent,
                  highlight,
                  category,
                })}
              </span>
            </span>
            <ChevronRight
              className={`h-4 w-4 shrink-0 text-[#C9A99C] transition-transform duration-200 ${
                advOpen ? 'rotate-90' : ''
              }`}
              strokeWidth={1.75}
            />
          </button>

          <AnimatePresence initial={false}>
            {advOpen ? (
              <motion.div
                key="adv-panel"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                className="cs-day-add-adv-collapse"
              >
                <CoupleDayAdvancedPanel
                  dateKey={dateKey}
                  category={category}
                  endDateKey={endDateKey}
                  timeKey={timeKey}
                  countFromNextDay={countFromNextDay}
                  accent={accent}
                  highlight={highlight}
                  onChange={patchAdvanced}
                />
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        <button
          type="button"
          className="cs-day-add-bottom-save"
          disabled={!canSave}
          onClick={save}
        >
          保存
        </button>

        {mode === 'edit' && onDelete ? (
          <button type="button" className="cs-day-edit-delete" onClick={onDelete}>
            删除这个日子
          </button>
        ) : null}
      </div>

      <DayOptionPicker
        open={picker === 'category'}
        title="选择倒数本"
        valueKey={category}
        options={CATEGORY_OPTIONS.map((k) => ({ key: k, label: CATEGORY_LABEL[k] }))}
        onPick={(key) => setCategory(key as CoupleMilestoneCategory)}
        onClose={() => setPicker(null)}
      />
      <DayOptionPicker
        open={picker === 'repeat'}
        title="选择重复"
        valueKey={repeat}
        options={REPEAT_OPTIONS.map((k) => ({ key: k, label: REPEAT_LABEL[k] }))}
        onPick={(key) => setRepeat(key as CoupleMilestoneRepeat)}
        onClose={() => setPicker(null)}
      />
      <DayOptionPicker
        open={picker === 'remind'}
        title="选择定期提醒"
        valueKey={remindOffsetDays == null ? 'null' : String(remindOffsetDays)}
        options={REMIND_OPTIONS.map((k) => ({
          key: k == null ? 'null' : String(k),
          label: coupleRemindLabel(k),
        }))}
        onPick={(key) => {
          if (key === 'null') setRemindOffsetDays(null)
          else setRemindOffsetDays(Number(key) as CoupleRemindOffsetDays)
        }}
        onClose={() => setPicker(null)}
      />
    </div>
  )
}

type DayRelationTone = 'future' | 'past' | 'today' | 'ongoing'

type DayRelation = {
  days: number
  tone: DayRelationTone
  phrase: string
  subNote?: string
  dateLine: string
}

function parseDateKey(dateKey: string): Date | null {
  const [y, m, d] = dateKey.split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d, 12, 0, 0, 0)
}

function startOfLocalDay(ms: number = Date.now()): Date {
  const d = new Date(ms)
  d.setHours(0, 0, 0, 0)
  return d
}

function rawRelationToDateKey(
  dateKey: string,
  nowMs: number = Date.now(),
): { days: number; tone: 'future' | 'past' | 'today' } {
  const target = parseDateKey(dateKey)
  if (!target) return { days: 0, tone: 'today' }
  const a = startOfLocalDay(target.getTime()).getTime()
  const b = startOfLocalDay(nowMs).getTime()
  const diff = Math.round((a - b) / (24 * 3600 * 1000))
  if (diff > 0) return { days: diff, tone: 'future' }
  if (diff < 0) return { days: Math.abs(diff), tone: 'past' }
  return { days: 0, tone: 'today' }
}

function applyCountFromNextDay(
  rel: { days: number; tone: 'future' | 'past' | 'today' },
  countFromNextDay?: boolean,
): { days: number; tone: 'future' | 'past' | 'today' } {
  if (!countFromNextDay || rel.tone !== 'past') return rel
  return { days: Math.max(0, rel.days - 1), tone: rel.days <= 1 ? 'today' : 'past' }
}

function formatStartLabel(dateKey: string): string {
  const d = parseDateKey(dateKey)
  if (!d) return dateKey
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day} ${WEEKDAYS[d.getDay()] ?? ''}`
}

function formatTargetLabel(dateKey: string): string {
  const d = parseDateKey(dateKey)
  if (!d) return dateKey
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()} ${WEEKDAYS[d.getDay()] ?? ''}`
}

function milestoneEffectiveKey(m: CoupleMilestone): string {
  return coupleMilestoneEffectiveDateKey(m.dateKey, m.repeat ?? 'none')
}

function resolveMilestoneRelation(m: CoupleMilestone, nowMs: number = Date.now()): DayRelation {
  const startKey = milestoneEffectiveKey(m)
  const endKey =
    m.endDateKey && /^\d{4}-\d{2}-\d{2}$/.test(m.endDateKey) && m.endDateKey >= m.dateKey
      ? m.endDateKey
      : null

  const startRel = applyCountFromNextDay(rawRelationToDateKey(startKey, nowMs), m.countFromNextDay)

  if (!endKey) {
    const phrase =
      startRel.tone === 'future' ? '还有' : startRel.tone === 'past' ? '已经' : '就是'
    return {
      days: startRel.days,
      tone: startRel.tone,
      phrase,
      dateLine: formatStartLabel(m.dateKey),
    }
  }

  const endRel = applyCountFromNextDay(rawRelationToDateKey(endKey, nowMs), m.countFromNextDay)
  const spanRaw = rawRelationToDateKey(endKey, parseDateKey(startKey)?.getTime() ?? nowMs)
  const totalDays = Math.max(1, spanRaw.days + 1)

  if (startRel.tone === 'future') {
    return {
      days: startRel.days,
      tone: 'future',
      phrase: '还有',
      subNote: `至 ${shortDateLabel(endKey)}`,
      dateLine: `${formatStartLabel(m.dateKey)} → ${shortDateLabel(endKey)}`,
    }
  }

  if (endRel.tone === 'future' || endRel.tone === 'today') {
    const elapsed = rawRelationToDateKey(startKey, nowMs)
    const dayIndex = Math.min(totalDays, Math.max(1, elapsed.days + 1))
    return {
      days: endRel.tone === 'today' ? 0 : endRel.days,
      tone: 'ongoing',
      phrase: endRel.tone === 'today' ? '今日结束' : '还有',
      subNote: `第 ${dayIndex} / 共 ${totalDays} 天 · 结束`,
      dateLine: `${formatStartLabel(m.dateKey)} → ${shortDateLabel(endKey)}`,
    }
  }

  return {
    days: endRel.days,
    tone: 'past',
    phrase: '已经',
    subNote: '已结束',
    dateLine: `${formatStartLabel(m.dateKey)} → ${shortDateLabel(endKey)}`,
  }
}

function sortMilestones(list: CoupleMilestone[]): CoupleMilestone[] {
  return list.slice().sort((a, b) => {
    if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1
    if (!!a.highlight !== !!b.highlight) return a.highlight ? -1 : 1
    const ra = resolveMilestoneRelation(a)
    const rb = resolveMilestoneRelation(b)
    const rank = (r: DayRelation) =>
      r.tone === 'today' ? 0 : r.tone === 'ongoing' ? 1 : r.tone === 'future' ? 2 : 3
    const dr = rank(ra) - rank(rb)
    if (dr !== 0) return dr
    if (ra.days !== rb.days) return ra.days - rb.days
    return a.dateKey.localeCompare(b.dateKey)
  })
}

function editorValuesFromMilestone(m: CoupleMilestone): DayEditorValues {
  const remind =
    m.remindOffsetDays === 0 ||
    m.remindOffsetDays === 1 ||
    m.remindOffsetDays === 3 ||
    m.remindOffsetDays === 7
      ? m.remindOffsetDays
      : null
  return {
    title: m.title,
    dateKey: m.dateKey,
    pinned: !!m.pinned,
    repeat: m.repeat ?? 'none',
    category: m.category ?? 'life',
    remindOffsetDays: remind,
    endDateKey: m.endDateKey ?? null,
    timeKey: m.timeKey ?? null,
    countFromNextDay: !!m.countFromNextDay,
    accent: m.accent ?? null,
    highlight: !!m.highlight,
  }
}

function milestoneWritePayload(input: DayEditorValues) {
  return {
    title: input.title,
    dateKey: input.dateKey,
    pinned: input.pinned,
    repeat: input.repeat,
    category: input.category,
    remindOffsetDays: input.remindOffsetDays,
    endDateKey: input.endDateKey,
    timeKey: input.timeKey,
    countFromNextDay: input.countFromNextDay,
    accent: input.accent,
    highlight: input.highlight,
  }
}

export function CoupleCalendarPage({
  characterId,
  onBack,
}: {
  characterId: string
  onBack: () => void
}) {
  const room = useCoupleSpaceStore((s) => s.getRoom(characterId) ?? s.ensureRoom(characterId))
  const addMilestone = useCoupleSpaceStore((s) => s.addMilestone)
  const updateMilestone = useCoupleSpaceStore((s) => s.updateMilestone)
  const removeMilestone = useCoupleSpaceStore((s) => s.removeMilestone)

  const [query, setQuery] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [editing, setEditing] = useState<CoupleMilestone | null>(null)

  const charName = room?.binding?.charDisplayName?.trim() || '对方'
  const milestones = room?.milestones ?? []

  const sorted = useMemo(() => sortMilestones(milestones), [milestones])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return sorted
    return sorted.filter((m) => m.title.toLowerCase().includes(q))
  }, [query, sorted])

  const featured = useMemo(() => {
    const pinned = sorted.find((m) => m.pinned)
    if (pinned) return pinned
    const binding = milestones.find((m) => m.kind === 'binding')
    if (binding) return binding
    return sorted[0] ?? null
  }, [milestones, sorted])

  const featuredRel = featured ? resolveMilestoneRelation(featured) : null
  const featuredAccent = featured
    ? coupleMilestoneResolvedAccent(featured)
    : ('lavender' as CoupleMilestoneAccent)
  const featuredDays =
    featured?.kind === 'binding' && room?.binding?.boundAt && !featured.endDateKey
      ? Math.max(
          0,
          coupleDaysTogether(room.binding.boundAt) - (featured.countFromNextDay ? 1 : 0),
        )
      : featuredRel
        ? featuredRel.tone === 'today' && featuredRel.phrase === '就是'
          ? 0
          : featuredRel.days
        : 0
  const listItems = filtered.filter((m) => m.id !== featured?.id)

  if (addOpen) {
    return (
      <CoupleDayEditorPage
        mode="add"
        onBack={() => setAddOpen(false)}
        onSave={(input) => {
          if (
            addMilestone(characterId, {
              ...milestoneWritePayload(input),
              kind: 'custom',
            })
          ) {
            setAddOpen(false)
          }
        }}
      />
    )
  }

  if (editing) {
    return (
      <CoupleDayEditorPage
        mode="edit"
        lockDate={editing.kind === 'binding'}
        initial={editorValuesFromMilestone(editing)}
        onBack={() => setEditing(null)}
        onSave={(input) => {
          if (updateMilestone(characterId, editing.id, milestoneWritePayload(input))) {
            setEditing(null)
          }
        }}
        onDelete={
          editing.kind === 'binding'
            ? undefined
            : () => {
                removeMilestone(characterId, editing.id)
                setEditing(null)
              }
        }
      />
    )
  }

  return (
    <div className="couple-space-root cs-days-root">
      <header className="cs-days-header">
        <button
          type="button"
          onClick={onBack}
          className="cs-days-header__icon-btn"
          aria-label="返回"
        >
          <ChevronLeft className="h-[20px] w-[20px]" strokeWidth={1.75} />
        </button>
        <h1 className="couple-space-title cs-days-header__title">纪念日历</h1>
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="cs-days-header__icon-btn cs-days-header__icon-btn--plus"
          aria-label="添加纪念日"
        >
          <Plus className="h-[20px] w-[20px]" strokeWidth={2} />
        </button>
      </header>

      <div className="cs-days-body">
        {featured && featuredRel ? (
          <button
            type="button"
            className={`cs-days-hero cs-days-hero--accent-${featuredAccent}`}
            onClick={() => setEditing(featured)}
          >
            <div className="cs-days-hero__text">
              <p className="cs-days-hero__title">
                <span aria-hidden>♡ </span>
                {featured.kind === 'binding' && !featured.pinned
                  ? `和${charName}第`
                  : featured.title}
              </p>
              <p className="cs-days-hero__date">{featuredRel.dateLine}</p>
              {featuredRel.subNote ? (
                <p className="cs-days-hero__sub">{featuredRel.subNote}</p>
              ) : null}
            </div>
            <div className="cs-days-hero__count">
              <span className="cs-days-hero__num">{featuredDays}</span>
              <span className="cs-days-hero__unit">
                {featuredRel.tone === 'today' && featuredRel.phrase === '就是'
                  ? '今天'
                  : featuredRel.tone === 'ongoing' && featuredRel.phrase === '今日结束'
                    ? '今天'
                    : '天'}
              </span>
              {featuredRel.tone === 'ongoing' && featuredRel.phrase === '还有' ? (
                <span className="cs-days-hero__cap">结束</span>
              ) : null}
            </div>
          </button>
        ) : (
          <div className="cs-days-hero cs-days-hero--empty">
            <p className="cs-days-hero__empty-title">还没有纪念日</p>
            <p className="cs-days-hero__empty-sub">点右上角 + 记下你们的日子</p>
          </div>
        )}

        <div className="cs-days-search">
          <Search className="cs-days-search__icon" strokeWidth={1.75} aria-hidden />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索"
            className="cs-days-search__input"
          />
        </div>

        <ul className="cs-days-list">
          {listItems.map((m) => {
            const rel = resolveMilestoneRelation(m)
            const accent = coupleMilestoneResolvedAccent(m)
            const badgeTone =
              rel.tone === 'ongoing' ? 'future' : rel.tone === 'today' ? 'today' : rel.tone
            return (
              <li key={m.id}>
                <button
                  type="button"
                  className={`cs-days-row ${m.highlight || m.pinned ? 'cs-days-row--highlight' : ''} cs-days-row--accent-${accent}`}
                  onClick={() => setEditing(m)}
                >
                  <div className="cs-days-row__left">
                    <p className="cs-days-row__title">
                      {m.title}
                      <span className="cs-days-row__phrase">{rel.phrase}</span>
                    </p>
                    <p className="cs-days-row__date">{rel.dateLine}</p>
                    {rel.subNote ? <p className="cs-days-row__sub">{rel.subNote}</p> : null}
                  </div>
                  <div
                    className={`cs-days-badge cs-days-badge--${badgeTone} cs-days-badge--accent-${accent}`}
                  >
                    <span className="cs-days-badge__num">
                      {rel.tone === 'today' && rel.phrase === '就是' ? 0 : rel.days}
                    </span>
                    <span className="cs-days-badge__unit">天</span>
                  </div>
                </button>
              </li>
            )
          })}
          {!listItems.length && featured ? (
            <li className="cs-days-list__hint">更多日子，点右上角添加</li>
          ) : null}
        </ul>
      </div>
    </div>
  )
}
