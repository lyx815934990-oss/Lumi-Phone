import {
  ChevronDown,
  ChevronUp,
  Clock3,
  Droplets,
  CalendarRange,
  Dices,
  Trash2,
  Thermometer,
} from 'lucide-react'
import { useMemo, useState } from 'react'

import {
  buildCouplePeriodAnalysis,
  lengthTagLabel,
  maxBarDays,
  type DayCompareChart,
  type SinglePeriodCard,
} from './couplePeriodAnalysis'
import { buildDemoPeriodCycleInputs } from './couplePeriodDemoSeed'
import {
  PERIOD_FLOW_LABEL,
  PERIOD_PAIN_LABEL,
  sortPeriodCyclesNewestFirst,
} from './couplePeriodLogic'
import {
  defaultCouplePeriodSettings,
  emptyCouplePeriodState,
} from './coupleSpaceTypes'
import { useCoupleSpaceStore } from './useCoupleSpaceStore'
import './coupleSpaceTheme.css'

const FLOW_Y = ['偏多', '中等', '少量'] as const
const PAIN_Y = ['较强', '中等', '轻微', '不痛'] as const

function DayMetricChart({
  chart,
  kind,
}: {
  chart: DayCompareChart
  kind: 'flow' | 'pain'
}) {
  const maxRank = kind === 'flow' ? 3 : 3
  const yLabels = kind === 'flow' ? FLOW_Y : PAIN_Y
  const days = Array.from({ length: chart.maxDay }, (_, i) => i + 1)

  return (
    <div className="cs-panal-daychart">
      <div className="cs-panal-daychart__y">
        {yLabels.map((l) => (
          <span key={l}>{l}</span>
        ))}
      </div>
      <div className="cs-panal-daychart__plot">
        <div className="cs-panal-daychart__cols">
          {days.map((dayIndex) => {
            const pt = chart.currentPoints.find((p) => p.dayIndex === dayIndex)
            const curRank =
              kind === 'flow' ? (pt?.flowRank ?? null) : (pt?.painRank ?? null)
            const avgRank =
              kind === 'flow'
                ? chart.flowAvgRanks[dayIndex - 1] ?? null
                : chart.painAvgRanks[dayIndex - 1] ?? null
            const curH =
              curRank != null ? Math.max(10, Math.round((curRank / maxRank) * 88)) : 0
            const avgH =
              avgRank != null ? Math.max(8, Math.round((avgRank / maxRank) * 88)) : 0
            const curTip =
              kind === 'flow'
                ? pt?.flow
                  ? PERIOD_FLOW_LABEL[pt.flow]
                  : '未记'
                : pt?.pain != null
                  ? PERIOD_PAIN_LABEL[pt.pain]
                  : '未记'
            return (
              <div key={dayIndex} className="cs-panal-daychart__col" title={`第${dayIndex}天 ${curTip}`}>
                <div className="cs-panal-daychart__bars">
                  {avgH > 0 ? (
                    <div className="cs-panal-daychart__bar cs-panal-daychart__bar--avg" style={{ height: avgH }} />
                  ) : (
                    <div className="cs-panal-daychart__bar cs-panal-daychart__bar--empty" />
                  )}
                  {curH > 0 ? (
                    <div className="cs-panal-daychart__bar cs-panal-daychart__bar--cur" style={{ height: curH }} />
                  ) : (
                    <div className="cs-panal-daychart__bar cs-panal-daychart__bar--miss" />
                  )}
                </div>
                <span className="cs-panal-daychart__x">第{dayIndex}天</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function TagPill({ tag }: { tag: string }) {
  const kind =
    tag === '正常' ? 'ok' : tag === '进行中' ? 'ing' : tag === '偏短' || tag === '偏长' ? 'warn' : 'mute'
  return <span className={`cs-panal-tag cs-panal-tag--${kind}`}>{tag}</span>
}

function formatDeltaLine(delta: number | null, prefix = '比前1个周期'): string {
  if (delta == null) return '暂无对比'
  if (delta === 0) return `${prefix} 相同`
  if (delta > 0) return `${prefix} 多${delta}天`
  return `${prefix} 少${Math.abs(delta)}天`
}

function PeriodCardRow({
  card,
  expanded,
  onToggle,
}: {
  card: SinglePeriodCard
  expanded: boolean
  onToggle: () => void
}) {
  return (
    <article className={`cs-panal-cycle-card ${expanded ? 'cs-panal-cycle-card--open' : ''}`}>
      <button type="button" className="cs-panal-cycle-card__head" onClick={onToggle}>
        <div className="cs-panal-cycle-card__title">
          <span>{card.rangeLabel}</span>
          {card.ongoing ? <TagPill tag="进行中" /> : null}
        </div>
        <div className="cs-panal-cycle-card__meta">
          <span>
            经期 {card.periodDays != null ? `${card.periodDays}天` : '—'}
            {card.periodDeltaLabel ? ` · ${card.periodDeltaLabel}` : ''}
          </span>
          {expanded ? (
            <ChevronUp className="h-4 w-4 opacity-60" strokeWidth={1.75} />
          ) : (
            <ChevronDown className="h-4 w-4 opacity-60" strokeWidth={1.75} />
          )}
        </div>
      </button>
      {expanded ? (
        <div className="cs-panal-cycle-card__body">
          <div className="cs-panal-kv">
            <span>周期间隔</span>
            <strong>
              {card.cycleDays != null ? `${card.cycleDays}天` : '尚未迎来下一次'}
              {card.cycleDays != null ? (
                <TagPill tag={lengthTagLabel(card.cycleTag)} />
              ) : null}
            </strong>
          </div>
          {card.cycleDeltaLabel ? (
            <p className="cs-panal-muted">较上个周期 {card.cycleDeltaLabel}</p>
          ) : null}
          <div className="cs-panal-metrics">
            <div>
              <span>流量</span>
              <strong>{card.flowLabel ?? '未记'}</strong>
              {card.flowDelta ? <em>峰值 · {card.flowDelta}</em> : null}
            </div>
            <div>
              <span>痛感</span>
              <strong>{card.painLabel ?? '未记'}</strong>
              {card.painDelta ? <em>峰值 · {card.painDelta}</em> : null}
            </div>
            <div>
              <span>心情</span>
              <strong>{card.moodLabel ?? '未记'}</strong>
              {card.moodDelta ? <em>{card.moodDelta}</em> : null}
            </div>
          </div>
          {card.careText ? (
            <div className="cs-panal-care">
              <p className="cs-panal-care__cap">TA 的关心</p>
              <p>{card.careText}</p>
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  )
}

export function CouplePeriodAnalysisPage({ characterId }: { characterId: string }) {
  const room = useCoupleSpaceStore((s) => s.getRoom(characterId) ?? s.ensureRoom(characterId))
  const replacePeriodCycles = useCoupleSpaceStore((s) => s.replacePeriodCycles)
  const period = room?.period ?? emptyCouplePeriodState()
  const settings = period.settings ?? defaultCouplePeriodSettings()
  const cycles = useMemo(() => sortPeriodCyclesNewestFirst(period.cycles), [period.cycles])

  const model = useMemo(
    () => buildCouplePeriodAnalysis({ cycles, settings }),
    [cycles, settings],
  )

  const [openId, setOpenId] = useState<string | null>(() => model.cards[0]?.cycle.id ?? null)
  const [seedHint, setSeedHint] = useState<string | null>(null)

  const cycleMax = maxBarDays(model.cycleBars, model.avgCycleDays)
  const periodMax = maxBarDays(model.periodBars, 7)

  const fillDemo = () => {
    const inputs = buildDemoPeriodCycleInputs(6)
    const rows = replacePeriodCycles(characterId, inputs)
    setOpenId(rows[0]?.id ?? null)
    setSeedHint(`已写入 ${rows.length} 条测试经期（会覆盖当前记录）`)
  }

  const clearAll = () => {
    replacePeriodCycles(characterId, [])
    setOpenId(null)
    setSeedHint('已清空经期记录')
  }

  const demoBar = (
    <div className="cs-panal-demo">
      <button type="button" className="cs-panal-demo__btn" onClick={fillDemo}>
        <Dices className="h-3.5 w-3.5" strokeWidth={1.75} />
        随机生成测试数据
      </button>
      {cycles.length ? (
        <button type="button" className="cs-panal-demo__btn cs-panal-demo__btn--ghost" onClick={clearAll}>
          <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
          清空
        </button>
      ) : null}
      {seedHint ? <p className="cs-panal-demo__hint">{seedHint}</p> : null}
    </div>
  )

  if (!cycles.length) {
    return (
      <div className="cs-panal-body">
        {demoBar}
        <div className="cs-panal-empty">
          <p>还没有经期记录</p>
          <p className="cs-panal-muted">先在日历里标记，或点上方按钮生成测试数据预览分析</p>
        </div>
      </div>
    )
  }

  return (
    <div className="cs-panal-body">
      {demoBar}
      {model.predict ? (
        <section className="cs-panal-card">
          <header className="cs-panal-card__head">
            <Clock3 className="cs-panal-card__icon" strokeWidth={1.7} />
            <h2>经期预测</h2>
          </header>
          <p className="cs-panal-predict__text">{model.predict.summary}</p>
          <div className="cs-panal-strip" role="list">
            {model.predict.days.map((d) => (
              <div
                key={d.dateKey}
                role="listitem"
                className={[
                  'cs-panal-strip__day',
                  d.isPredictedStart ? 'cs-panal-strip__day--start' : '',
                  d.isPossible ? 'cs-panal-strip__day--possible' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <span className="cs-panal-strip__md">
                  {d.month}/{d.day}
                </span>
              </div>
            ))}
          </div>
          <div className="cs-panal-legend">
            <span>
              <i className="cs-panal-legend__box cs-panal-legend__box--start" />
              预测开始日
            </span>
            <span>
              <i className="cs-panal-legend__box cs-panal-legend__box--possible" />
              可能开始日
            </span>
          </div>
        </section>
      ) : null}

      <section className="cs-panal-card">
        <header className="cs-panal-card__head">
          <CalendarRange className="cs-panal-card__icon" strokeWidth={1.7} />
          <h2>周期变化</h2>
        </header>
        {model.latestCompletedCycle ? (
          <div className="cs-panal-summary">
            <p className="cs-panal-summary__cap">
              最近1个周期（{model.latestCompletedCycle.rangeLabel}）
            </p>
            <p className="cs-panal-summary__main">
              周期天数{' '}
              <strong>{model.latestCompletedCycle.lengthDays}天</strong>
              <TagPill tag={lengthTagLabel(model.latestCompletedCycle.tag)} />
            </p>
            <p className="cs-panal-muted">
              {formatDeltaLine(model.latestCompletedCycle.deltaVsPrev)}
            </p>
          </div>
        ) : (
          <p className="cs-panal-muted cs-panal-pad">至少记录两次开始日，才能对比周期长短</p>
        )}
        {model.cycleBars.length ? (
          <div className="cs-panal-hbars">
            <p className="cs-panal-section-label">近期周期天数</p>
            {model.cycleBars.map((row) => {
              const pct =
                row.lengthDays != null
                  ? Math.max(12, Math.round((row.lengthDays / cycleMax) * 100))
                  : 12
              const [, m, d] = row.startDateKey.split('-')
              return (
                <div key={row.cycleId + row.startDateKey} className="cs-panal-hbar">
                  <div className="cs-panal-hbar__meta">
                    <span>
                      {Number(m)}/{Number(d)}
                    </span>
                    <span className="cs-panal-hbar__tip">{row.label}</span>
                  </div>
                  <div className="cs-panal-hbar__track">
                    <div
                      className={`cs-panal-hbar__fill ${row.tag === 'ongoing' ? 'cs-panal-hbar__fill--ing' : ''}`}
                      style={{ width: `${pct}%` }}
                    />
                    <span className="cs-panal-hbar__val">
                      {row.tag === 'ongoing' ? '当前周期 ' : ''}
                      {row.lengthDays ?? '—'}天
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        ) : null}
      </section>

      <section className="cs-panal-card">
        <header className="cs-panal-card__head">
          <Droplets className="cs-panal-card__icon" strokeWidth={1.7} />
          <h2>经期变化</h2>
        </header>
        {model.latestPeriod ? (
          <div className="cs-panal-summary">
            <p className="cs-panal-summary__cap">
              {model.latestPeriod.ongoing ? '本次经期' : '最近一次经期'}
            </p>
            <p className="cs-panal-summary__main">
              经期天数{' '}
              <strong>
                {model.latestPeriod.lengthDays != null
                  ? `${model.latestPeriod.lengthDays}天`
                  : '—'}
              </strong>
              <TagPill tag={lengthTagLabel(model.latestPeriod.tag)} />
            </p>
            <p className="cs-panal-muted">
              {formatDeltaLine(model.latestPeriod.deltaVsPrev, '和上个周期')}
            </p>
          </div>
        ) : null}
        {model.periodBars.length ? (
          <div className="cs-panal-vbars">
            <p className="cs-panal-section-label">近期经期天数</p>
            <div className="cs-panal-vbars__row">
              {[...model.periodBars].reverse().map((row) => {
                const h =
                  row.lengthDays != null
                    ? Math.max(18, Math.round((row.lengthDays / periodMax) * 88))
                    : 18
                const [, m, d] = row.startDateKey.split('-')
                return (
                  <div key={row.cycleId} className="cs-panal-vbar">
                    <span className="cs-panal-vbar__num">{row.lengthDays ?? '—'}</span>
                    <div className="cs-panal-vbar__col" style={{ height: h }} />
                    <span className="cs-panal-vbar__date">
                      {Number(m)}/{Number(d)}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        ) : null}
      </section>

      {model.dayCompare ? (
        <>
          <section className="cs-panal-card">
            <header className="cs-panal-card__head">
              <Droplets className="cs-panal-card__icon" strokeWidth={1.7} />
              <h2>流量变化</h2>
            </header>
            <p className="cs-panal-muted cs-panal-pad">
              {model.dayCompare.title}按天流量 · 对比近半年同天号平均
            </p>
            <DayMetricChart chart={model.dayCompare} kind="flow" />
            <div className="cs-panal-legend">
              <span>
                <i className="cs-panal-legend__box cs-panal-legend__box--cur" />
                本周期
              </span>
              <span>
                <i className="cs-panal-legend__box cs-panal-legend__box--avg" />
                近半年
              </span>
              <span>
                <i className="cs-panal-legend__box cs-panal-legend__box--miss" />
                未记录
              </span>
            </div>
          </section>
          <section className="cs-panal-card">
            <header className="cs-panal-card__head">
              <Thermometer className="cs-panal-card__icon" strokeWidth={1.7} />
              <h2>痛感变化</h2>
            </header>
            <p className="cs-panal-muted cs-panal-pad">
              {model.dayCompare.title}按天痛感 · 对比近半年同天号平均
            </p>
            <DayMetricChart chart={model.dayCompare} kind="pain" />
            <div className="cs-panal-legend">
              <span>
                <i className="cs-panal-legend__box cs-panal-legend__box--cur" />
                本周期
              </span>
              <span>
                <i className="cs-panal-legend__box cs-panal-legend__box--avg" />
                近半年
              </span>
            </div>
          </section>
        </>
      ) : null}

      <section className="cs-panal-card cs-panal-card--list">
        <header className="cs-panal-card__head">
          <h2>每次月经</h2>
        </header>
        <div className="cs-panal-cycle-list">
          {model.cards.map((card) => (
            <PeriodCardRow
              key={card.cycle.id}
              card={card}
              expanded={openId === card.cycle.id}
              onToggle={() =>
                setOpenId((id) => (id === card.cycle.id ? null : card.cycle.id))
              }
            />
          ))}
        </div>
      </section>
    </div>
  )
}
