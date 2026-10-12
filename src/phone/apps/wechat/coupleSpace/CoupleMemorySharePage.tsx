import {
  BookOpen,
  Brain,
  CalendarHeart,
  ChevronDown,
  ChevronLeft,
  Droplets,
  HeartHandshake,
} from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'

import type { CoupleMemoryShareModule } from './coupleSpaceTypes'
import {
  emptyCoupleMemoryShareState,
  normalizeCoupleMemoryShareState,
} from './coupleSpaceTypes'
import { useCoupleSpaceStore } from './useCoupleSpaceStore'
import './coupleSpaceTheme.css'

const MODULE_META: Array<{
  id: CoupleMemoryShareModule
  title: string
  sub: string
  Icon: typeof BookOpen
  expandable?: 'diary' | 'milestones'
}> = [
  {
    id: 'binding',
    title: '绑定关系',
    sub: '绑定日、在一起天数、显示名',
    Icon: HeartHandshake,
  },
  {
    id: 'milestones',
    title: '纪念日历',
    sub: '可一键全开，或只勾部分日子',
    Icon: CalendarHeart,
    expandable: 'milestones',
  },
  {
    id: 'diary',
    title: '共写日记',
    sub: '总闸打开后，再勾选要同步的日记',
    Icon: BookOpen,
    expandable: 'diary',
  },
  {
    id: 'period',
    title: '经期',
    sub: '阶段 + 已填流量、痛感、心情（不含备注）',
    Icon: Droplets,
  },
]

function ModuleSwitch({
  on,
  onChange,
}: {
  on: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      className={`cs-mem-switch ${on ? 'cs-mem-switch--on' : ''}`}
      onClick={() => onChange(!on)}
    >
      <span className="cs-mem-switch__knob" />
    </button>
  )
}

function CheckItem({
  checked,
  label,
  meta,
  onToggle,
}: {
  checked: boolean
  label: string
  meta?: string
  onToggle: () => void
}) {
  return (
    <button type="button" className="cs-mem-check" onClick={onToggle}>
      <span className={`cs-mem-check__box ${checked ? 'cs-mem-check__box--on' : ''}`} aria-hidden>
        {checked ? '✓' : ''}
      </span>
      <span className="cs-mem-check__text">
        <span className="cs-mem-check__label">{label}</span>
        {meta ? <span className="cs-mem-check__meta">{meta}</span> : null}
      </span>
    </button>
  )
}

export function CoupleMemorySharePage({
  characterId,
  onBack,
}: {
  characterId: string
  onBack: () => void
}) {
  const room = useCoupleSpaceStore((s) => s.getRoom(characterId) ?? s.ensureRoom(characterId))
  const setMemoryShareModule = useCoupleSpaceStore((s) => s.setMemoryShareModule)
  const setMemoryShareMilestoneIds = useCoupleSpaceStore((s) => s.setMemoryShareMilestoneIds)
  const setAllDiaryIncludeInMemory = useCoupleSpaceStore((s) => s.setAllDiaryIncludeInMemory)
  const setDiaryIncludeInMemory = useCoupleSpaceStore((s) => s.setDiaryIncludeInMemory)

  const share = normalizeCoupleMemoryShareState(room?.memoryShare ?? emptyCoupleMemoryShareState())
  const diaryEntries = useMemo(
    () =>
      (room?.diary ?? [])
        .filter((e) => e.author === 'user' && e.content.trim())
        .slice()
        .sort((a, b) => b.createdAt - a.createdAt),
    [room?.diary],
  )
  const milestones = useMemo(
    () =>
      (room?.milestones ?? [])
        .slice()
        .sort((a, b) => b.dateKey.localeCompare(a.dateKey)),
    [room?.milestones],
  )

  const [expanded, setExpanded] = useState<Partial<Record<CoupleMemoryShareModule, boolean>>>({
    diary: true,
    milestones: true,
  })

  const milestoneSelected = (id: string) => {
    if (share.milestoneIds === 'all') return true
    return share.milestoneIds.includes(id)
  }

  const toggleMilestone = (id: string) => {
    if (share.milestoneIds === 'all') {
      const next = milestones.map((m) => m.id).filter((mid) => mid !== id)
      setMemoryShareMilestoneIds(characterId, next)
      return
    }
    const set = new Set(share.milestoneIds)
    if (set.has(id)) set.delete(id)
    else set.add(id)
    const arr = Array.from(set)
    if (arr.length === milestones.length && milestones.length > 0) {
      setMemoryShareMilestoneIds(characterId, 'all')
    } else {
      setMemoryShareMilestoneIds(characterId, arr)
    }
  }

  const diaryOnCount = diaryEntries.filter((e) => e.includeInMemory === true).length

  return (
    <div className="couple-space-root cs-mem-root">
      <header className="cs-days-header">
        <button type="button" className="cs-days-header__icon-btn" onClick={onBack} aria-label="返回">
          <ChevronLeft className="h-[20px] w-[20px]" strokeWidth={1.75} />
        </button>
        <h1 className="couple-space-title cs-days-header__title">纳入记忆</h1>
        <span className="cs-days-header__spacer" aria-hidden />
      </header>

      <div className="cs-mem-body">
        <div className="cs-mem-hero">
          <span className="cs-mem-hero__icon" aria-hidden>
            <Brain className="h-5 w-5" strokeWidth={1.7} />
          </span>
          <div>
            <p className="cs-mem-hero__title">决定角色能「记得」什么</p>
            <p className="cs-mem-hero__sub">
              关闭的模块角色完全看不到。日记还需逐条勾选；经期会带上阶段与已填的流量、痛感、心情。
            </p>
          </div>
        </div>

        <ul className="cs-mem-list">
          {MODULE_META.map(({ id, title, sub, Icon, expandable }) => {
            const on = share.modules[id] === true
            const open = !!expanded[id]
            let detail: ReactNode = null

            if (on && expandable === 'diary') {
              detail = (
                <div className="cs-mem-detail">
                  <div className="cs-mem-detail__bar">
                    <span>
                      已勾选 {diaryOnCount}/{diaryEntries.length}
                    </span>
                    <span className="cs-mem-detail__actions">
                      <button
                        type="button"
                        onClick={() => setAllDiaryIncludeInMemory(characterId, true)}
                      >
                        全选
                      </button>
                      <button
                        type="button"
                        onClick={() => setAllDiaryIncludeInMemory(characterId, false)}
                      >
                        清空
                      </button>
                    </span>
                  </div>
                  {diaryEntries.length ? (
                    <ul className="cs-mem-detail__list">
                      {diaryEntries.map((e) => {
                        const d = new Date(e.createdAt)
                        const label = Number.isFinite(d.getTime())
                          ? `${d.getMonth() + 1}/${d.getDate()}`
                          : '某日'
                        return (
                          <li key={e.id}>
                            <CheckItem
                              checked={e.includeInMemory === true}
                              label={e.content.trim().slice(0, 48)}
                              meta={label}
                              onToggle={() =>
                                setDiaryIncludeInMemory(
                                  characterId,
                                  e.id,
                                  e.includeInMemory !== true,
                                )
                              }
                            />
                          </li>
                        )
                      })}
                    </ul>
                  ) : (
                    <p className="cs-mem-detail__empty">还没有可同步的日记</p>
                  )}
                </div>
              )
            }

            if (on && expandable === 'milestones') {
              const selectedCount =
                share.milestoneIds === 'all'
                  ? milestones.length
                  : share.milestoneIds.filter((mid) => milestones.some((m) => m.id === mid))
                      .length
              detail = (
                <div className="cs-mem-detail">
                  <div className="cs-mem-detail__bar">
                    <span>
                      已勾选 {selectedCount}/{milestones.length}
                    </span>
                    <span className="cs-mem-detail__actions">
                      <button
                        type="button"
                        onClick={() => setMemoryShareMilestoneIds(characterId, 'all')}
                      >
                        全选
                      </button>
                      <button
                        type="button"
                        onClick={() => setMemoryShareMilestoneIds(characterId, [])}
                      >
                        清空
                      </button>
                    </span>
                  </div>
                  {milestones.length ? (
                    <ul className="cs-mem-detail__list">
                      {milestones.map((m) => (
                        <li key={m.id}>
                          <CheckItem
                            checked={milestoneSelected(m.id)}
                            label={m.title}
                            meta={m.dateKey}
                            onToggle={() => toggleMilestone(m.id)}
                          />
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="cs-mem-detail__empty">还没有纪念日</p>
                  )}
                </div>
              )
            }

            return (
              <li key={id} className="cs-mem-card">
                <div className="cs-mem-card__main">
                  <span className="cs-mem-card__icon" aria-hidden>
                    <Icon className="h-[18px] w-[18px]" strokeWidth={1.7} />
                  </span>
                  <div className="cs-mem-card__text">
                    <p className="cs-mem-card__title">{title}</p>
                    <p className="cs-mem-card__sub">{sub}</p>
                  </div>
                  <ModuleSwitch
                    on={on}
                    onChange={(v) => {
                      setMemoryShareModule(characterId, id, v)
                      if (v && expandable) {
                        setExpanded((prev) => ({ ...prev, [id]: true }))
                      }
                    }}
                  />
                </div>
                {on && expandable ? (
                  <button
                    type="button"
                    className="cs-mem-card__expand"
                    onClick={() =>
                      setExpanded((prev) => ({ ...prev, [id]: !prev[id] }))
                    }
                  >
                    <span>{open ? '收起分区' : '选择要同步的内容'}</span>
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`}
                      strokeWidth={1.75}
                    />
                  </button>
                ) : null}
                {on && expandable && open ? detail : null}
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
