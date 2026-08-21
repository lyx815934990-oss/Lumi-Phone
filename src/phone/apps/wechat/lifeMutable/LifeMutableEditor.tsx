/** 可变人生表单：角色本线 / 玩家本线两套账本。 */

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { useCurrentApiConfig } from '../../api/ApiSettingsContext'
import type { Character, Gender, PlayerIdentity } from '../newFriendsPersona/types'
import { genderLabelZh, uid } from '../newFriendsPersona/utils'
import { personaDb } from '../newFriendsPersona/idb'
import { LUMI_SHELL_NUM_STYLE } from '../lumiShellTheme'
import { runLifeAlignFromMemory } from './alignFromMemoryAi'
import {
  isLifeLedgerInlineSyncEnabled,
  setLifeLedgerInlineSyncEnabled,
  LIFE_LEDGER_INLINE_SYNC_CHANGED_EVENT,
} from './inlineSync'
import { LIFE_LEDGER_PATCH_UPDATED_EVENT } from './lifeLedgerPatch'
import {
  alignLifeSheetToTimeline,
  approxElapsedStoryYears,
  computeCurrentAge,
  computeEducationLabel,
  emptyLifeMutableSheet,
  lifePlaceKindLabel,
  parseLifeAgeNumber,
  pickEarlierStoryDay,
  resolveLifeClock,
  syncPeopleAgesToTimeline,
} from './compute'
import { loadCharacterStorySpan } from './load'
import { resolveCharacterBoundUserIdentity } from '../charUserPlaceholders'
import { formatPlayerIdentityDisplayName } from '../wechatCharacterPlayerIdentity'
import { syncSharedSocialCircleBetweenSheets } from './sharedSocialCircle'
import {
  LIFE_LEDGER_COACH_ROOT_ATTR,
  LIFE_LEDGER_COACH_SCOPE,
  LIFE_LEDGER_COACH_SEEN_KEY,
  LIFE_LEDGER_COACH_STEPS,
  LIFE_LEDGER_COACH_TARGET_ATTR,
} from './lifeLedgerCoach'
import { LIFE_LEDGER_TUTORIAL_SECTIONS } from './lifeLedgerTutorialCopy'
import { BookOpen, ChevronDown } from 'lucide-react'
import { MemoryCoachPortal } from '../memory/MemoryCoachPortal'
import { MemoryTutorialModal } from '../memory/MemoryTutorialModal'
import { readMemoryCoachSeen, writeMemoryCoachSeen } from '../memory/memoryCoachTypes'
import type {
  LifeEducationTrack,
  LifeFamilyMember,
  LifeMutableSheet,
  LifePayKind,
  LifePet,
  LifePlaceKind,
  LifeRealEstate,
  LifeSocialContact,
  LifeVehicle,
} from './types'

/** Classified Dossier · 美式复古机密档案 */
const STAMP = '#8B1A1A'
const INK = '#2C2C2E'
const MIST = '#8E8E93'
const PAPER = '#F9F8F6'
const PAGE = '#F9F8F6'
const LINE = 'rgba(44,44,46,0.12)'
const RULE = 'rgba(44,44,46,0.1)'
const MONO = '"SF Mono", "Courier New", ui-monospace, monospace'
const SERIF = '"Songti SC", "Noto Serif SC", "SimSun", "Times New Roman", serif'
const SANS = '-apple-system, BlinkMacSystemFont, "PingFang SC", "Helvetica Neue", sans-serif'

const NOISE_BG =
  'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.85\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\' opacity=\'0.045\'/%3E%3C/svg%3E")'

const inputCls =
  'w-full bg-transparent px-0 py-1.5 text-[13px] outline-none'
const inputStyle: CSSProperties = {
  color: INK,
  borderBottom: `1px solid ${RULE}`,
  fontFamily: SANS,
  caretColor: STAMP,
}
const labelCls = 'font-mono text-[9px] font-medium uppercase tracking-[0.16em]'
const labelStyle: CSSProperties = { color: MIST, fontFamily: MONO }

const PLACE_KINDS: { id: LifePlaceKind; zh: string }[] = [
  { id: '', zh: '类型未填' },
  { id: 'home', zh: '自家住所' },
  { id: 'dorm', zh: '学校宿舍' },
  { id: 'rent', zh: '租住' },
  { id: 'family', zh: '家人处' },
  { id: 'work', zh: '工作单位' },
  { id: 'other', zh: '其他' },
]

const TRACKS: { id: LifeEducationTrack; zh: string }[] = [
  { id: '', zh: '未设定（只看备注）' },
  { id: 'junior_high', zh: '初中' },
  { id: 'high_school', zh: '高中' },
  { id: 'undergrad', zh: '大学本科' },
  { id: 'master', zh: '硕士' },
  { id: 'phd', zh: '博士' },
  { id: 'working', zh: '已工作' },
  { id: 'other', zh: '其他' },
]

function Field({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <label className="block py-1.5">
      <span className={labelCls} style={labelStyle}>
        {label}
      </span>
      <div className="mt-0.5">{children}</div>
    </label>
  )
}

function Chip({
  on,
  children,
  onClick,
}: {
  on: boolean
  children: ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-2.5 py-1 text-[11px] tracking-wide"
      style={{
        border: on ? `1px solid ${STAMP}` : `1px solid ${LINE}`,
        background: on ? STAMP : 'transparent',
          color: on ? '#F9F8F6' : INK,
          fontFamily: SANS,
      }}
    >
      {children}
    </button>
  )
}

function Stamp({
  children,
  rotate = -2,
}: {
  children: ReactNode
  rotate?: number
}) {
  return (
    <span
      className="inline-block max-w-[7.5rem] shrink-0 truncate px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em]"
      style={{
        border: `1px solid ${STAMP}`,
        color: STAMP,
        background: 'transparent',
        fontFamily: MONO,
        transform: `rotate(${rotate}deg)`,
      }}
      title={typeof children === 'string' ? children : undefined}
    >
      {children}
    </span>
  )
}

function LaneBadge({ lane }: { lane: 'now' | 'start' }) {
  return <Stamp rotate={lane === 'now' ? -3 : 2}>{lane === 'now' ? 'NOW' : 'START'}</Stamp>
}

function LedgerCard({
  kicker,
  title,
  hint,
  lane,
  extra,
  summary,
  defaultOpen = false,
  children,
}: {
  kicker: string
  title: string
  hint?: string
  lane?: 'now' | 'start'
  extra?: ReactNode
  /** 折叠时右侧摘要，如「03」条 */
  summary?: string
  /** 默认展开 */
  defaultOpen?: boolean
  children: ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <section className="relative py-3">
      <div
        className="flex items-start justify-between gap-2 border-b pb-2"
        style={{ borderColor: LINE }}
      >
        <button
          type="button"
          className="min-w-0 flex-1 text-left"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <div className="flex flex-wrap items-center gap-2">
            <p
              className="font-mono text-[9px] uppercase tracking-[0.22em]"
              style={{ color: lane === 'start' ? MIST : STAMP, fontFamily: MONO }}
            >
              {kicker}
            </p>
            {lane ? <LaneBadge lane={lane} /> : null}
          </div>
          <div className="mt-1 flex items-center gap-2">
            <p
              className="min-w-0 flex-1 text-[15px] font-semibold tracking-tight"
              style={{ color: INK, fontFamily: SERIF }}
            >
              {title}
            </p>
            <ChevronDown
              className="size-4 shrink-0 transition-transform"
              style={{
                color: MIST,
                transform: open ? 'rotate(0deg)' : 'rotate(-90deg)',
              }}
              strokeWidth={1.75}
              aria-hidden
            />
          </div>
          {open && hint ? (
            <p className="mt-1 text-[11px] leading-relaxed" style={{ color: MIST, fontFamily: SANS }}>
              {hint}
            </p>
          ) : null}
          {!open && summary ? (
            <p className="mt-1 font-mono text-[10px] tabular-nums" style={{ color: MIST, fontFamily: MONO }}>
              {summary}
            </p>
          ) : null}
        </button>
        {open && extra ? <div className="shrink-0 pt-0.5">{extra}</div> : null}
      </div>
      {open ? <div className="mt-2.5">{children}</div> : null}
    </section>
  )
}

function InnerPad({ children }: { children: ReactNode }) {
  return (
    <div className="space-y-1.5 py-2.5" style={{ borderTop: `0.5px solid ${LINE}` }}>
      {children}
    </div>
  )
}

function DossierShell({
  fileNo,
  tutorialSlot,
  children,
}: {
  fileNo: string
  tutorialSlot?: ReactNode
  children: ReactNode
}) {
  return (
    <div
      className="relative overflow-hidden"
      style={{
        background: PAPER,
        backgroundImage: NOISE_BG,
        border: `1px solid ${LINE}`,
        boxShadow: '0 10px 40px rgba(44,44,46,0.06)',
        fontFamily: SANS,
      }}
      {...{ [LIFE_LEDGER_COACH_ROOT_ATTR]: LIFE_LEDGER_COACH_SCOPE }}
    >
      <div
        className="sticky top-0 z-10 flex items-center justify-between gap-2 px-4 py-2"
        style={{
          background: 'rgba(249,248,246,0.92)',
          backdropFilter: 'blur(6px)',
          borderBottom: `0.5px solid ${LINE}`,
        }}
      >
        <span
          className="min-w-0 truncate font-mono text-[9px] tracking-[0.18em]"
          style={{ color: STAMP, fontFamily: MONO, transform: 'rotate(-1.5deg)' }}
        >
          CONF. CH-{fileNo}
        </span>
        <div className="flex shrink-0 items-center gap-1.5">{tutorialSlot}</div>
      </div>
      <div className="px-5 pb-6 pt-4">{children}</div>
    </div>
  )
}

function ModeToggle({
  mode,
  onChange,
}: {
  mode: 'preview' | 'edit'
  onChange: (m: 'preview' | 'edit') => void
}) {
  return (
    <div
      className="flex overflow-hidden"
      style={{ border: `1.5px solid ${STAMP}`, background: PAPER }}
    >
      {(
        [
          { id: 'preview' as const, label: '预览', en: 'VIEW' },
          { id: 'edit' as const, label: '编辑', en: 'EDIT' },
        ] as const
      ).map((t) => {
        const on = mode === t.id
        return (
          <button
            key={t.id}
            type="button"
            className="min-w-0 flex-1 py-2.5 text-center"
            style={{
              background: on ? STAMP : 'transparent',
              color: on ? '#F9F8F6' : STAMP,
            }}
            onClick={() => onChange(t.id)}
          >
            <span
              className="block font-mono text-[9px] tracking-[0.18em]"
              style={{ fontFamily: MONO, opacity: 0.85 }}
            >
              {t.en}
            </span>
            <span className="mt-0.5 block text-[14px] font-semibold" style={{ fontFamily: SANS }}>
              {t.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function FactLine({
  code,
  value,
  empty = '—',
}: {
  code: string
  value?: string | null
  empty?: string
}) {
  const text = (value ?? '').trim()
  return (
    <div className="flex min-w-0 items-baseline gap-2 py-0.5">
      <span
        className="shrink-0 font-mono text-[9px] uppercase tracking-[0.14em]"
        style={{ color: MIST, fontFamily: MONO, minWidth: 72 }}
      >
        {code}.
      </span>
      <span
        className="min-w-0 flex-1 text-[13px] leading-snug"
        style={{ color: text ? INK : 'rgba(44,44,46,0.28)', fontFamily: SANS }}
      >
        {text || empty}
      </span>
    </div>
  )
}

function PreviewSection({
  title,
  en,
  count,
  children,
  empty,
  defaultOpen = false,
}: {
  title: string
  en?: string
  count?: number
  children: ReactNode
  empty?: string
  /** 默认展开 */
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  const hasKids = !(empty && count === 0)
  return (
    <section className="pt-4">
      <button
        type="button"
        className="mb-1 flex w-full items-baseline justify-between gap-2 border-b pb-2 text-left"
        style={{ borderColor: LINE }}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex min-w-0 items-baseline gap-2">
          {en ? (
            <span
              className="font-mono text-[9px] uppercase tracking-[0.2em]"
              style={{ color: STAMP, fontFamily: MONO }}
            >
              {en}
            </span>
          ) : null}
          <p className="text-[14px] font-semibold" style={{ color: INK, fontFamily: SERIF }}>
            {title}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {typeof count === 'number' ? (
            <span className="font-mono text-[10px] tabular-nums" style={{ color: MIST, fontFamily: MONO }}>
              {String(count).padStart(2, '0')}
            </span>
          ) : null}
          <ChevronDown
            className="size-3.5 transition-transform"
            style={{
              color: MIST,
              transform: open ? 'rotate(0deg)' : 'rotate(-90deg)',
            }}
            strokeWidth={1.75}
            aria-hidden
          />
        </div>
      </button>
      {open ? (
        hasKids ? (
          children
        ) : (
          <p className="py-3 text-[11px]" style={{ color: MIST, fontFamily: SANS }}>
            {empty}
          </p>
        )
      ) : null}
    </section>
  )
}

function DossierRow({
  mark,
  title,
  sub,
  stamp,
  meta,
  memo,
}: {
  mark?: string
  title: string
  sub?: string
  stamp?: string
  meta: string[]
  memo?: string
}) {
  return (
    <div className="py-3" style={{ borderBottom: `0.5px solid ${LINE}` }}>
      <div className="flex items-start gap-2.5">
        {mark ? (
          <span
            className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full font-mono text-[10px]"
            style={{
              border: `1px solid ${LINE}`,
              color: INK,
              fontFamily: MONO,
              background: 'rgba(44,44,46,0.03)',
            }}
          >
            {mark.slice(0, 1)}
          </span>
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p
                className="truncate text-[15px] font-semibold leading-tight"
                style={{ color: INK, fontFamily: SERIF }}
              >
                {title}
              </p>
              {sub ? (
                <p
                  className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.12em]"
                  style={{ color: MIST, fontFamily: MONO }}
                >
                  {sub}
                </p>
              ) : null}
            </div>
            {stamp ? <Stamp rotate={-2.5}>{stamp}</Stamp> : null}
          </div>
          {meta.length ? (
            <p
              className="mt-1.5 font-mono text-[10px] leading-relaxed tracking-[0.04em]"
              style={{ color: INK, fontFamily: MONO, opacity: 0.78 }}
            >
              {meta.join('   |   ')}
            </p>
          ) : null}
          {memo ? (
            <p
              className="mt-1.5 text-[11.5px] leading-relaxed"
              style={{ color: MIST, fontFamily: SANS }}
            >
              <span className="font-mono text-[9px] tracking-[0.12em]" style={{ fontFamily: MONO }}>
                MEMO.{' '}
              </span>
              {memo}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function SystemOverride({
  busy,
  feedback,
  onAlign,
  hasPlayer,
}: {
  busy?: boolean
  feedback?: string
  onAlign?: () => void
  hasPlayer?: boolean
}) {
  if (!onAlign) return null
  return (
    <section className="mt-2.5" {...{ [LIFE_LEDGER_COACH_TARGET_ATTR]: 'ledger-align' }}>
      <div className="flex items-baseline justify-between gap-2">
        <p
          className="font-mono text-[8px] uppercase tracking-[0.2em]"
          style={{ color: MIST, fontFamily: MONO }}
        >
          MEMORY ALIGN
        </p>
        <p className="font-mono text-[8px] tracking-[0.12em]" style={{ color: MIST, fontFamily: MONO }}>
          {hasPlayer ? 'CHAR + USER' : 'CURRENT'}
        </p>
      </div>
      <button
        type="button"
        className="mt-2 flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left disabled:opacity-55"
        disabled={busy}
        style={{
          border: `1.5px solid ${STAMP}`,
          background: busy ? 'rgba(139,26,26,0.06)' : PAPER,
          color: STAMP,
        }}
        onClick={onAlign}
      >
        <span className="min-w-0">
          <span className="block text-[13px] font-semibold" style={{ fontFamily: SANS }}>
            {busy ? '对齐进行中…' : hasPlayer ? '按记忆对齐 · 角色 + 玩家' : '按记忆对齐当前'}
          </span>
          <span className="mt-0.5 block text-[10.5px] leading-relaxed" style={{ color: MIST, fontFamily: SANS }}>
            {hasPlayer
              ? '一次补齐双方职业、住所、家庭、社交圈。不读长期记忆。'
              : '补齐职业 / 住所 / 车产 / 家庭 / 社交圈。不读长期记忆。'}
          </span>
        </span>
        <span
          className="shrink-0 font-mono text-[10px] tracking-[0.14em]"
          style={{ fontFamily: MONO, opacity: busy ? 0.5 : 1 }}
          aria-hidden
        >
          {busy ? '…' : '→'}
        </span>
      </button>
      {feedback || busy ? (
        <p
          className="mt-2 font-mono text-[11px] leading-relaxed"
          style={{ color: STAMP, fontFamily: MONO }}
        >
          {busy ? `› ${feedback || 'PROCESSING…'}` : `› ${feedback}`}
        </p>
      ) : null}
    </section>
  )
}

function SheetPreview({
  sheet,
  currentAge,
  edu,
  spanText,
  elapsedYears,
  cardAge,
}: {
  sheet: LifeMutableSheet
  currentAge: number | null
  edu: string
  spanText: string
  elapsedYears: number | null
  cardAge: number | null
}) {
  const genderText =
    sheet.gender === '' ? '沿用人设卡' : genderLabelZh(sheet.gender as Gender)
  const trackZh = TRACKS.find((t) => t.id === sheet.educationTrack)?.zh || '未设定'
  const displayName = sheet.name.trim() || '（沿用人设卡姓名）'
  const job =
    [sheet.occupationMain.trim(), sheet.occupationSide.trim()].filter(Boolean).join(' / ') || '职业未填'
  const heart = sheet.relationshipStatus.trim() || '感情未填'
  const money = sheet.savings.trim() || '存款未填'
  const startAgeText =
    sheet.ageAtStart != null
      ? `${sheet.ageAtStart} 岁`
      : cardAge != null
        ? `人设卡 ${cardAge} 岁`
        : '未填'
  const payZh = (k: LifePayKind) => (k === 'full' ? 'FULL' : k === 'loan' ? 'LOAN' : '')
  const sexCode = (g: string) => {
    if (g === 'female' || g === '女') return 'F'
    if (g === 'male' || g === '男') return 'M'
    return g.trim() ? 'X' : '—'
  }

  const primaryPlace =
    sheet.realEstates.find((h) => h.isPrimary) ||
    sheet.realEstates.find((h) => h.location.trim() || h.label.trim()) ||
    null
  const primaryPlaceText = primaryPlace
    ? [
        primaryPlace.label.trim() || lifePlaceKindLabel(primaryPlace.placeKind) || '住所',
        primaryPlace.location.trim(),
      ]
        .filter(Boolean)
        .join(' · ')
    : '住所未填'

  return (
    <div className="space-y-1">
      {/* 护照式身份头 */}
      <section className="relative pb-4 pt-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p
              className="truncate text-[28px] font-bold leading-none tracking-tight"
              style={{ color: INK, fontFamily: SERIF }}
            >
              {displayName}
            </p>
            <p className="mt-1.5 text-[12px]" style={{ color: MIST, fontFamily: SANS }}>
              {genderText}
              {sheet.genderChangeNote.trim() ? ` · ${sheet.genderChangeNote.trim()}` : ''}
            </p>
          </div>
          <div className="relative shrink-0 pr-1 text-right">
            <span
              className="pointer-events-none absolute -right-1 -top-3 select-none font-mono text-[56px] font-bold leading-none"
              style={{ color: STAMP, opacity: 0.1, fontFamily: MONO }}
              aria-hidden
            >
              {currentAge != null ? currentAge : '—'}
            </span>
            <p
              className="relative font-mono text-[28px] font-semibold tabular-nums leading-none"
              style={{ color: STAMP, fontFamily: MONO }}
            >
              {currentAge != null ? currentAge : '—'}
            </p>
            <p className="relative mt-1 font-mono text-[8px] tracking-[0.16em]" style={{ color: MIST, fontFamily: MONO }}>
              AGE · NOW
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-1 border-t pt-3" style={{ borderColor: LINE }}>
          <FactLine code="OCCUPATION" value={job} />
          <FactLine code="RELATION" value={heart} />
          <FactLine code="EDU" value={edu || sheet.educationNote || '未填'} />
          <FactLine code="RESIDENCE" value={primaryPlaceText} empty="住所未填" />
          <FactLine code="SAVINGS" value={money} />
        </div>
        <p
          className="mt-3 font-mono text-[10px] tabular-nums tracking-[0.04em]"
          style={{ color: MIST, fontFamily: MONO }}
        >
          TIMELINE. {spanText}
          {elapsedYears != null ? ` · +${elapsedYears}Y` : ''}
        </p>
      </section>

      {/* 开篇锚点 */}
      <PreviewSection title="开篇锚点" en="START ANCHOR">
        <div className="mb-2">
          <LaneBadge lane="start" />
        </div>
        <FactLine code="START DAY" value={sheet.storyStartDay.trim() || '未填（用人设/记忆最早日）'} />
        <FactLine code="AGE @START" value={startAgeText} />
        <FactLine code="EDU TRACK" value={trackZh} />
        {sheet.educationGradeAtStart != null ? (
          <FactLine code="GRADE @START" value={`第 ${sheet.educationGradeAtStart} 档`} />
        ) : null}
      </PreviewSection>

      <PreviewSection title="可去住所" en="PLACES" count={sheet.realEstates.length} empty="暂无（学生可列宿舍+自家）">
        {sheet.realEstates.map((h) => {
          const kind = lifePlaceKindLabel(h.placeKind)
          const title = h.label.trim() || kind || '未命名地点'
          return (
            <DossierRow
              key={h.id}
              mark={title}
              title={title}
              sub={kind && title !== kind ? kind : undefined}
              stamp={h.ownedBySubject ? 'OWNED' : 'NOT OWNED'}
              meta={[
                h.location.trim() && `LOC. ${h.location.trim()}`,
                h.tenure === 'own' ? 'TENURE. OWN' : h.tenure === 'rent' ? 'TENURE. RENT' : '',
                h.isPrimary ? 'PRIMARY' : '',
                h.area && `AREA. ${h.area}`,
                payZh(h.payKind) && `PAY. ${payZh(h.payKind)}`,
              ].filter(Boolean) as string[]}
              memo={h.note.trim() || undefined}
            />
          )
        })}
      </PreviewSection>

      <PreviewSection title="车产" en="VEHICLE" count={sheet.vehicles.length} empty="暂无车产">
        {sheet.vehicles.map((v) => (
          <DossierRow
            key={v.id}
            mark={v.model}
            title={v.model.trim() || '型号未填'}
            meta={
              [v.boughtAt && `ACQ. ${v.boughtAt}`, payZh(v.payKind) && `PAY. ${payZh(v.payKind)}`].filter(
                Boolean,
              ) as string[]
            }
            memo={v.note.trim() || undefined}
          />
        ))}
      </PreviewSection>

      <PreviewSection title="家庭成员" en="FAMILY" count={sheet.family.length} empty="暂无家庭成员">
        {sheet.family.map((f) => {
          const ageNow = f.age.trim()
          const ageStart = f.ageAtStart.trim()
          const relation = f.relation.trim()
          const relLen = [...relation].length
          const stamp =
            relation && relLen <= 6
              ? relation
              : f.livesWithSubject
                ? 'COHABIT'
                : 'SEPARATE'
          return (
            <DossierRow
              key={f.id}
              mark={f.name || relation}
              title={f.name.trim() || relation || '未命名'}
              stamp={stamp}
              meta={[
                relation && relation !== stamp && `REL. ${relation}`,
                !relation && (f.livesWithSubject ? 'COHABIT' : 'SEPARATE'),
                `SEX.${sexCode(f.gender)}`,
                ageNow && `AGE.${ageNow}`,
                ageStart && ageStart !== ageNow && `START.${ageStart}`,
                f.birthdayMD.trim() && `DOB. ${f.birthdayMD.trim()}`,
                f.alive ? 'STATUS. ALIVE' : 'STATUS. DECEASED',
                f.residence.trim() && `LOC. ${f.residence.trim()}`,
              ].filter(Boolean) as string[]}
              memo={[f.occupationOrSchool.trim(), f.health.trim()].filter(Boolean).join(' · ') || undefined}
            />
          )
        })}
      </PreviewSection>

      <PreviewSection title="社交圈" en="SOCIAL" count={sheet.socialCircle.length} empty="暂无社交圈">
        {sheet.socialCircle.map((c) => {
          const ageNow = c.age.trim()
          const ageStart = c.ageAtStart.trim()
          const relation = c.relation.trim()
          const attitude = c.attitude.trim()
          const note = c.note.trim()
          const relLen = [...relation].length
          // 印章：仅短关系称呼（≤8字，如「恋人」「大学同学」）；整句态度绝不盖章
          const stamp = relation && relLen <= 8 ? relation : undefined
          const memo = [
            attitude ? `关系补充：${attitude}` : '',
            relation && !stamp ? `关系：${relation}` : '',
            c.occupationOrSchool.trim(),
            note,
          ]
            .filter(Boolean)
            .join(' · ')
          return (
            <DossierRow
              key={c.id}
              mark={c.name}
              title={c.name.trim() || '未命名'}
              stamp={stamp}
              meta={[
                relation && !stamp ? `REL. ${relation}` : null,
                `SEX.${sexCode(c.gender)}`,
                ageNow && `AGE.${ageNow}`,
                ageStart && ageStart !== ageNow && `START.${ageStart}`,
                c.birthdayMD.trim() && `DOB. ${c.birthdayMD.trim()}`,
                c.residence.trim() && `LOC. ${c.residence.trim()}`,
              ].filter(Boolean) as string[]}
              memo={memo || undefined}
            />
          )
        })}
      </PreviewSection>

      <PreviewSection title="宠物" en="PETS" count={sheet.pets.length} empty="暂无宠物">
        {sheet.pets.map((p) => (
          <DossierRow
            key={p.id}
            mark={p.name}
            title={p.name.trim() || '未命名'}
            sub={p.species.trim() || undefined}
            meta={
              [p.age && `AGE.${p.age}`, p.acquiredAt && `ACQ. ${p.acquiredAt}`, p.acquiredPlace && `LOC. ${p.acquiredPlace}`].filter(
                Boolean,
              ) as string[]
            }
          />
        ))}
      </PreviewSection>

      {sheet.extraNote.trim() ? (
        <PreviewSection title="其他补充" en="NOTES">
          <p
            className="whitespace-pre-wrap py-3 text-[12.5px] leading-relaxed"
            style={{ color: INK, fontFamily: SANS }}
          >
            {sheet.extraNote}
          </p>
        </PreviewSection>
      ) : null}
    </div>
  )
}

function SheetFields({
  sheet,
  onChange,
  cardAge,
  birthdayMD,
  startDay,
  nowDay,
}: {
  sheet: LifeMutableSheet
  onChange: (next: LifeMutableSheet) => void
  cardAge: number | null
  birthdayMD: string
  startDay: string | null
  nowDay: string | null
}) {
  const patch = (p: Partial<LifeMutableSheet>) => onChange({ ...sheet, ...p })
  const ageAtStart = sheet.ageAtStart ?? cardAge
  const clock = resolveLifeClock(sheet.storyStartDay, { startDay, nowDay })
  const effectiveStart = clock.startDay
  const effectiveNow = clock.nowDay
  const currentAge = computeCurrentAge({
    ageAtStart,
    birthdayMD,
    startDay: effectiveStart,
    nowDay: effectiveNow,
  })
  const edu = computeEducationLabel({
    track: sheet.educationTrack,
    gradeAtStart: sheet.educationGradeAtStart,
    startDay: effectiveStart,
    nowDay: effectiveNow,
    note: sheet.educationNote,
  })
  const elapsedYears = approxElapsedStoryYears(effectiveStart, effectiveNow)
  const fmtDay = (d: string) => d.replace(/年|月/g, '.').replace(/日/, '')
  const spanText =
    effectiveStart && effectiveNow
      ? `${fmtDay(effectiveStart)} → ${fmtDay(effectiveNow)}`
      : effectiveStart
        ? `${fmtDay(effectiveStart)} → （等待当前剧情日）`
        : '填写开篇剧情日后显示跨度'
  const customStartDiffers =
    Boolean(sheet.storyStartDay.trim()) &&
    Boolean(startDay) &&
    sheet.storyStartDay.trim() !== startDay
  const memoryEarlierThanLedger =
    Boolean(startDay) &&
    Boolean(effectiveStart) &&
    startDay !== effectiveStart &&
    pickEarlierStoryDay(startDay, effectiveStart) === startDay
  const memorySpanLooksTooLong =
    (approxElapsedStoryYears(startDay, nowDay) ?? 0) >= 2 &&
    (!sheet.storyStartDay.trim() || sheet.storyStartDay.trim() === startDay)
  const alignAnchor = effectiveStart || startDay
  const [viewMode, setViewMode] = useState<'preview' | 'edit'>('preview')

  // 家庭/社交圈：开篇年龄 → 按剧情日推到「现在」，避免同学停在开篇 19 岁
  const peopleAgeKey = JSON.stringify({
    f: sheet.family.map((f) => [f.id, f.age, f.ageAtStart, f.birthdayMD]),
    s: sheet.socialCircle.map((c) => [c.id, c.age, c.ageAtStart, c.birthdayMD]),
  })
  useEffect(() => {
    if (!effectiveStart || !effectiveNow) return
    const synced = syncPeopleAgesToTimeline(sheet, effectiveStart, effectiveNow)
    const sameFamily = JSON.stringify(synced.family) === JSON.stringify(sheet.family)
    const sameSocial = JSON.stringify(synced.socialCircle) === JSON.stringify(sheet.socialCircle)
    if (sameFamily && sameSocial) return
    onChange(synced)
    // 仅在时钟或年龄字段变化时推算
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveStart, effectiveNow, peopleAgeKey])

  const modeBar = (
    <div className="mb-3">
      <ModeToggle mode={viewMode} onChange={setViewMode} />
    </div>
  )

  if (viewMode === 'preview') {
    return (
      <div>
        {modeBar}
        <SheetPreview
          sheet={sheet}
          currentAge={currentAge}
          edu={edu}
          spanText={spanText}
          elapsedYears={elapsedYears}
          cardAge={cardAge}
        />
      </div>
    )
  }

  return (
    <div className="space-y-2.5">
      {modeBar}
      <div
        className="flex flex-wrap items-center gap-2 px-1 py-1 text-[10.5px] leading-relaxed"
        style={{ color: 'rgba(42,34,24,0.5)' }}
      >
        <LaneBadge lane="now" />
        <span>剧情「现在」登记，每轮注入 AI</span>
        <span style={{ color: LINE }}>·</span>
        <LaneBadge lane="start" />
        <span>故事开头锚点，用来推算现在几岁/学历</span>
        </div>

      <LedgerCard
        kicker="COVER"
        title="封面速览 · 年龄对齐"
        lane="now"
        hint="现在几岁、学历进度与时间跨度；可用下方按钮把人设卡年龄对齐到开篇或现在。"
        summary={
          currentAge != null
            ? `现在 ${currentAge} 岁${edu ? ` · ${edu}` : ''}`
            : edu || '待填开篇年龄'
        }
      >
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="font-mono text-[8px] tracking-[0.16em]" style={{ color: MIST, fontFamily: MONO }}>
              AGE · NOW
            </p>
            <p
              className="mt-0.5 font-mono text-[28px] font-semibold tabular-nums tracking-tight"
              style={{ color: STAMP, fontFamily: MONO }}
            >
              {currentAge != null ? `${currentAge}` : '—'}
            </p>
          </div>
          <div className="min-w-0 text-right">
            <p className="truncate text-[12px] font-medium" style={{ color: INK, fontFamily: SANS }}>
              {edu || (currentAge == null ? '填开篇年龄后显示' : '学历进度未填')}
            </p>
            <p
              className="mt-0.5 truncate font-mono text-[10px] tabular-nums"
              style={{ color: MIST, fontFamily: MONO }}
            >
              {spanText}
              {elapsedYears != null ? ` · +${elapsedYears}Y` : ''}
            </p>
          </div>
        </div>
        {alignAnchor ? (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              className="px-2.5 py-2.5 text-left disabled:opacity-55"
              style={{ background: STAMP, color: '#F9F8F6' }}
              onClick={() =>
                onChange(
                  alignLifeSheetToTimeline({
                    sheet,
                    cardAge,
                    birthdayMD,
                    startDay: alignAnchor,
                    nowDay: effectiveNow,
                    mode: 'cardAsStart',
                    keepExistingStart: true,
                  }),
                )
              }
            >
              <span className="block font-mono text-[9px] tracking-[0.16em]" style={{ fontFamily: MONO, opacity: 0.85 }}>
                ALIGN AGE
              </span>
              <span className="mt-0.5 block text-[11px] leading-snug" style={{ fontFamily: SANS }}>
                卡龄=开篇，推现在
              </span>
            </button>
            <button
              type="button"
              className="px-2.5 py-2.5 text-left disabled:opacity-55"
              style={{ border: `1.5px solid ${STAMP}`, background: PAPER, color: STAMP }}
              onClick={() =>
                onChange(
                  alignLifeSheetToTimeline({
                    sheet,
                    cardAge,
                    birthdayMD,
                    startDay: alignAnchor,
                    nowDay: effectiveNow,
                    mode: 'cardAsNow',
                    keepExistingStart: true,
                  }),
                )
              }
            >
              <span className="block font-mono text-[9px] tracking-[0.16em]" style={{ fontFamily: MONO }}>
                BACKDATE
              </span>
              <span className="mt-0.5 block text-[11px] leading-snug" style={{ fontFamily: SANS }}>
                卡龄当现在，倒推开篇
              </span>
            </button>
          </div>
        ) : null}
      </LedgerCard>

      <LedgerCard
        kicker="00 · START ANCHOR"
        title="开篇锚点"
        lane="start"
        hint="只改故事开头。改这里才会重算上方「现在几岁」与学历进度；不是当前职业资产。"
      >
        <Field label="开篇剧情日">
          <div className="mb-0.5 flex justify-end">
                {startDay && sheet.storyStartDay.trim() && sheet.storyStartDay.trim() !== startDay ? (
                  <button
                    type="button"
                    className="text-[10px]"
                    style={{ color: MIST }}
                    onClick={() => patch({ storyStartDay: startDay })}
                  >
                    改回记忆最早日
                  </button>
                ) : null}
              </div>
              <input
                className={inputCls}
                style={{ ...inputStyle, ...LUMI_SHELL_NUM_STYLE }}
                value={sheet.storyStartDay}
                onChange={(e) => patch({ storyStartDay: e.target.value })}
                placeholder="例：2026年3月1日"
              />
              {memoryEarlierThanLedger || memorySpanLooksTooLong ? (
                <div
                  className="mt-2 px-2.5 py-2 text-[11px] leading-relaxed"
                  style={{
                    background: 'rgba(139,46,46,0.06)',
                    border: `1px dashed ${STAMP}`,
                    color: INK,
                  }}
                >
                  <p className="font-medium" style={{ color: STAMP }}>
                    早期记忆年份可能记错了
                  </p>
                  <p className="mt-1" style={{ color: 'rgba(42,34,24,0.65)' }}>
                时间轴最早公历记忆是 {startDay ? fmtDay(startDay) : '未知'}
                    {nowDay ? `，当前剧情日是 ${fmtDay(nowDay)}` : ''}
                。若故事从 2026 才开始，请手填正确开篇日。
                  </p>
                </div>
              ) : (
                <p className="mt-1.5 text-[10.5px] leading-relaxed" style={{ color: 'rgba(42,34,24,0.45)' }}>
                  {startDay
                    ? customStartDiffers
                      ? `已自定义。记忆最早日是 ${fmtDay(startDay)}，年龄按你填的开篇日算。`
                  : `空着会按记忆最早日 ${fmtDay(startDay)} 起算。`
                : '可直接手填开篇日，不必等时间轴。'}
                  {effectiveNow ? ` 当前剧情日 ${fmtDay(effectiveNow)}。` : ''}
                </p>
              )}
        </Field>
        <div className="mt-2 grid grid-cols-2 gap-3">
          <Field label="开篇年龄（岁）">
            <input
              className={inputCls}
              style={{ ...inputStyle, ...LUMI_SHELL_NUM_STYLE }}
              type="number"
              min={0}
              max={120}
              value={sheet.ageAtStart ?? ''}
              onChange={(e) => patch({ ageAtStart: e.target.value ? Number(e.target.value) : null })}
              placeholder={cardAge != null ? `人设卡 ${cardAge}` : '用人设卡'}
            />
          </Field>
          <div className="py-1.5">
            <span className={labelCls} style={labelStyle}>
              推算得·现在
                  </span>
            <p
              className="mt-1 text-[18px] font-semibold tabular-nums"
              style={{ color: STAMP, ...LUMI_SHELL_NUM_STYLE }}
            >
              {currentAge != null ? `${currentAge} 岁` : '—'}
            </p>
          </div>
        </div>
        <div className="mt-3">
          <span className={labelCls} style={labelStyle}>
            开篇学历轨道
                    </span>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {TRACKS.map((t) => (
              <Chip
                key={t.id || 'none'}
                on={sheet.educationTrack === t.id}
                onClick={() => patch({ educationTrack: t.id })}
              >
                {t.zh}
              </Chip>
            ))}
            </div>
          </div>
        <div className="mt-3">
          <span className={labelCls} style={labelStyle}>
            开篇年级（1=初一/高一/大一/研一）
          </span>
          <div className="mt-1.5 flex flex-wrap gap-2">
            <Chip
              on={sheet.educationGradeAtStart == null}
              onClick={() => patch({ educationGradeAtStart: null })}
            >
              未设定
            </Chip>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <Chip
                key={n}
                on={sheet.educationGradeAtStart === n}
                onClick={() => patch({ educationGradeAtStart: n })}
              >
                {n}
              </Chip>
            ))}
        </div>
        </div>
      </LedgerCard>

      <LedgerCard
        kicker="01 · IDENTITY NOW"
        title="当前身份"
        lane="now"
        hint="现在叫什么、什么性别。空姓名/沿用性别 = 用人设卡。"
      >
          <Field label="当前姓名">
            <input
              className={inputCls}
              style={inputStyle}
              value={sheet.name}
              onChange={(e) => patch({ name: e.target.value })}
              placeholder="空则沿用人设卡姓名"
            />
          </Field>
        <div className="mt-2">
          <span className={labelCls} style={labelStyle}>
            当前性别
          </span>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {(['', 'female', 'male', 'other'] as const).map((g) => {
              const text = g === '' ? '沿用人设卡' : genderLabelZh(g as Gender)
              return (
                <Chip key={g || 'inherit'} on={sheet.gender === g} onClick={() => patch({ gender: g })}>
                  {text}
                </Chip>
              )
            })}
          </div>
          <input
            className={inputCls}
            style={inputStyle}
            value={sheet.genderChangeNote}
            onChange={(e) => patch({ genderChangeNote: e.target.value })}
            placeholder="变动说明，如：2025年完成性别肯定手术"
          />
        </div>
      </LedgerCard>

      <LedgerCard
        kicker="02 · WORK & HEART"
        title="当前职业与感情"
        lane="now"
        hint="剧情现在的主业、副业、存款、感情状态。"
      >
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Field label="主业">
            <input
              className={inputCls}
              style={inputStyle}
              value={sheet.occupationMain}
              onChange={(e) => patch({ occupationMain: e.target.value })}
            />
          </Field>
          <Field label="副业">
            <input
              className={inputCls}
              style={inputStyle}
              value={sheet.occupationSide}
              onChange={(e) => patch({ occupationSide: e.target.value })}
            />
          </Field>
        </div>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Field label="存款">
            <input
              className={inputCls}
              style={inputStyle}
              value={sheet.savings}
              onChange={(e) => patch({ savings: e.target.value })}
              placeholder="如：约 50 万"
            />
          </Field>
          <Field label="感情状态">
            <input
              className={inputCls}
              style={inputStyle}
              value={sheet.relationshipStatus}
              onChange={(e) => patch({ relationshipStatus: e.target.value })}
              placeholder="单身 / 热恋 / …"
            />
          </Field>
        </div>
      </LedgerCard>

      <LedgerCard
        kicker="03 · SCHOOL NOTE"
        title="当前学历备注"
        lane="now"
        hint="写「现在读到哪」（如现大三）。开篇轨道在上方「开篇锚点」。"
      >
        <Field label="学历备注（现在）">
            <input
              className={inputCls}
              style={inputStyle}
              value={sheet.educationNote}
              onChange={(e) => patch({ educationNote: e.target.value })}
            placeholder="专业、学校、现几年级等"
            />
          </Field>
        {edu ? (
          <p className="mt-2 text-[11px]" style={{ color: MIST }}>
            推算展示：{edu}
          </p>
        ) : null}
      </LedgerCard>

      <ListBlock
        kicker="04 · PLACES"
        title="可去住所"
        hint="列出本人可去/可住的全部地点（宿舍、自家、租房…）；可标是否归本人名下。"
        lane="now"
        count={sheet.realEstates.length}
        onAdd={() =>
          patch({
            realEstates: [
              ...sheet.realEstates,
              {
                id: uid('house'),
                label: '',
                placeKind: '',
                tenure: '',
                ownedBySubject: false,
                isPrimary: false,
                location: '',
                area: '',
                layout: '',
                floor: '',
                payKind: '',
                loanRemaining: '',
                monthlyPayment: '',
                note: '',
              },
            ],
          })
        }
      >
        {sheet.realEstates.map((h, i) => (
          <EstateCard
            key={h.id}
            item={h}
            onChange={(next) => {
              const arr = sheet.realEstates.slice()
              arr[i] = next
              patch({ realEstates: arr })
            }}
            onRemove={() => patch({ realEstates: sheet.realEstates.filter((x) => x.id !== h.id) })}
          />
        ))}
      </ListBlock>

      <ListBlock
        kicker="05 · VEHICLE"
        title="车产"
        hint="没有车可写「无」。"
        lane="now"
        count={sheet.vehicles.length}
        onAdd={() =>
          patch({
            vehicles: [
              ...sheet.vehicles,
              {
                id: uid('car'),
                boughtAt: '',
                model: '',
                payKind: '',
                loanRemaining: '',
                monthlyPayment: '',
                note: '',
              },
            ],
          })
        }
      >
        {sheet.vehicles.map((v, i) => (
          <VehicleCard
            key={v.id}
            item={v}
            onChange={(next) => {
              const arr = sheet.vehicles.slice()
              arr[i] = next
              patch({ vehicles: arr })
            }}
            onRemove={() => patch({ vehicles: sheet.vehicles.filter((x) => x.id !== v.id) })}
          />
        ))}
      </ListBlock>

      <ListBlock
        kicker="06 · FAMILY"
        title="家庭成员"
        hint="姓名写真人名，关系写父亲/母亲等；开篇年龄随剧情日增长；职业写具体岗位。"
        lane="now"
        count={sheet.family.length}
        onAdd={() =>
          patch({
            family: [
              ...sheet.family,
              {
                id: uid('fam'),
                name: '',
                relation: '',
                gender: '',
                age: '',
                ageAtStart: '',
                birthdayMD: '',
                alive: true,
                health: '',
                occupationOrSchool: '',
                residence: '',
                livesWithSubject: false,
              },
            ],
          })
        }
      >
        {sheet.family.map((f, i) => (
          <FamilyCard
            key={f.id}
            item={f}
            startDay={effectiveStart}
            nowDay={effectiveNow}
            onChange={(next) => {
              const arr = sheet.family.slice()
              arr[i] = next
              patch({ family: arr })
            }}
            onRemove={() => patch({ family: sheet.family.filter((x) => x.id !== f.id) })}
          />
        ))}
      </ListBlock>


      <ListBlock
        kicker="07 · SOCIAL"
        title="社交圈"
        hint="同学/同事/朋友；年龄随剧情日增长，职业写具体岗位/年级。"
        lane="now"
        count={sheet.socialCircle.length}
        onAdd={() =>
          patch({
            socialCircle: [
              ...sheet.socialCircle,
              {
                id: uid('soc'),
                name: '',
                gender: '',
                age: '',
                ageAtStart: '',
                birthdayMD: '',
                relation: '',
                occupationOrSchool: '',
                residence: '',
                attitude: '',
                note: '',
              },
            ],
          })
        }
      >
        {sheet.socialCircle.map((c, i) => (
          <SocialCard
            key={c.id}
            item={c}
            startDay={effectiveStart}
            nowDay={effectiveNow}
            onChange={(next) => {
              const arr = sheet.socialCircle.slice()
              arr[i] = next
              patch({ socialCircle: arr })
            }}
            onRemove={() => patch({ socialCircle: sheet.socialCircle.filter((x) => x.id !== c.id) })}
          />
        ))}
      </ListBlock>
      <ListBlock
        kicker="08 · PETS"
        title="宠物"
        lane="now"
        count={sheet.pets.length}
        onAdd={() =>
          patch({
            pets: [
              ...sheet.pets,
              {
                id: uid('pet'),
                acquiredAt: '',
                acquiredPlace: '',
                species: '',
                name: '',
                age: '',
              },
            ],
          })
        }
      >
        {sheet.pets.map((p, i) => (
          <PetCard
            key={p.id}
            item={p}
            onChange={(next) => {
              const arr = sheet.pets.slice()
              arr[i] = next
              patch({ pets: arr })
            }}
            onRemove={() => patch({ pets: sheet.pets.filter((x) => x.id !== p.id) })}
          />
        ))}
      </ListBlock>

      <LedgerCard kicker="09 · NOTES" title="其他补充" lane="now" hint="当前补充说明，写入本线账本。">
        <textarea
          className="w-full resize-none bg-transparent px-0 py-1.5 text-[13px] outline-none"
          style={{ ...inputStyle, minHeight: 72, borderBottom: `1px solid ${RULE}` }}
          value={sheet.extraNote}
          onChange={(e) => patch({ extraNote: e.target.value })}
          placeholder="其他会变的人生事实…"
        />
      </LedgerCard>
    </div>
  )
}


function ListBlock({
  kicker,
  title,
  hint,
  lane = 'now',
  count,
  onAdd,
  children,
}: {
  kicker: string
  title: string
  hint?: string
  lane?: 'now' | 'start'
  count?: number
  onAdd: () => void
  children: ReactNode
}) {
  return (
    <LedgerCard
      kicker={kicker}
      title={title}
      hint={hint}
      lane={lane}
      summary={typeof count === 'number' ? `${String(count).padStart(2, '0')} 项` : undefined}
      extra={
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onAdd()
          }}
          className="px-2.5 py-1.5 font-mono text-[11px] font-semibold tracking-[0.12em]"
          style={{
            background: STAMP,
            color: '#F9F8F6',
            fontFamily: MONO,
          }}
        >
          添加
        </button>
      }
    >
      <div className="space-y-2">{children}</div>
    </LedgerCard>
  )
}

function PayFields({
  payKind,
  loanRemaining,
  monthlyPayment,
  onChange,
}: {
  payKind: LifePayKind
  loanRemaining: string
  monthlyPayment: string
  onChange: (p: { payKind: LifePayKind; loanRemaining: string; monthlyPayment: string }) => void
}) {
  return (
    <>
      <div className="flex gap-2">
        {(['', 'full', 'loan'] as const).map((k) => (
          <Chip
            key={k || 'na'}
            on={payKind === k}
            onClick={() => onChange({ payKind: k, loanRemaining, monthlyPayment })}
          >
            {k === '' ? '未填' : k === 'full' ? '全款' : '贷款'}
          </Chip>
        ))}
      </div>
      {payKind === 'loan' ? (
        <div className="grid grid-cols-2 gap-2">
          <input
            className={inputCls}
            style={inputStyle}
            placeholder="剩余还款"
            value={loanRemaining}
            onChange={(e) => onChange({ payKind, loanRemaining: e.target.value, monthlyPayment })}
          />
          <input
            className={inputCls}
            style={inputStyle}
            placeholder="月供"
            value={monthlyPayment}
            onChange={(e) => onChange({ payKind, loanRemaining, monthlyPayment: e.target.value })}
          />
        </div>
      ) : null}
    </>
  )
}

function EstateCard({
  item,
  onChange,
  onRemove,
}: {
  item: LifeRealEstate
  onChange: (n: LifeRealEstate) => void
  onRemove: () => void
}) {
  return (
    <InnerPad>
      <div className="flex justify-end">
        <button type="button" className="text-[11px]" style={{ color: MIST }} onClick={onRemove}>
          删除
        </button>
      </div>
      <input
        className={inputCls}
        style={inputStyle}
        placeholder="称呼（学校宿舍 / 自家住所 / 合租屋…）"
        value={item.label}
        onChange={(e) => onChange({ ...item, label: e.target.value })}
      />
      <div className="mt-1.5">
        <span className={labelCls} style={labelStyle}>
          地点类型
        </span>
        <div className="mt-1 flex flex-wrap gap-2">
          {PLACE_KINDS.map((t) => (
            <Chip
              key={t.id || 'na'}
              on={item.placeKind === t.id}
              onClick={() =>
                onChange({
                  ...item,
                  placeKind: t.id,
                  label: item.label.trim() || (t.id ? t.zh : item.label),
                  tenure: t.id === 'rent' ? 'rent' : item.tenure,
                  ownedBySubject: t.id === 'home' ? item.ownedBySubject : t.id === 'dorm' || t.id === 'family' ? false : item.ownedBySubject,
                })
              }
            >
              {t.zh}
            </Chip>
          ))}
        </div>
      </div>
      <div className="mt-1.5 flex flex-wrap gap-2">
        {(
          [
            { id: '' as const, zh: '购/租未填' },
              { id: 'own' as const, zh: '购买' },
              { id: 'rent' as const, zh: '租赁' },
            ] as const
          ).map((t) => (
          <Chip
            key={t.id || 'na'}
            on={item.tenure === t.id}
            onClick={() =>
              onChange({
                ...item,
                tenure: t.id,
                ownedBySubject: t.id === 'own' ? true : t.id === 'rent' ? false : item.ownedBySubject,
              })
            }
          >
              {t.zh}
            </Chip>
          ))}
        <Chip
          on={item.ownedBySubject}
          onClick={() => onChange({ ...item, ownedBySubject: !item.ownedBySubject })}
        >
          {item.ownedBySubject ? '归本人名下' : '非本人产权'}
        </Chip>
        <Chip on={item.isPrimary} onClick={() => onChange({ ...item, isPrimary: !item.isPrimary })}>
          {item.isPrimary ? '当前主居' : '非主居'}
        </Chip>
      </div>
      <input
        className={inputCls}
        style={inputStyle}
        placeholder="地址（城市/区/小区）"
        value={item.location}
        onChange={(e) => onChange({ ...item, location: e.target.value })}
      />
      <div className="grid grid-cols-3 gap-2">
        <input
          className={inputCls}
          style={inputStyle}
          placeholder="面积"
          value={item.area}
          onChange={(e) => onChange({ ...item, area: e.target.value })}
        />
        <input
          className={inputCls}
          style={inputStyle}
          placeholder="户型"
          value={item.layout}
          onChange={(e) => onChange({ ...item, layout: e.target.value })}
        />
        <input
          className={inputCls}
          style={inputStyle}
          placeholder="楼层"
          value={item.floor}
          onChange={(e) => onChange({ ...item, floor: e.target.value })}
        />
      </div>
      <PayFields
        payKind={item.payKind}
        loanRemaining={item.loanRemaining}
        monthlyPayment={item.monthlyPayment}
        onChange={(p) => onChange({ ...item, ...p })}
      />
      <input
        className={inputCls}
        style={inputStyle}
        placeholder="备注"
        value={item.note}
        onChange={(e) => onChange({ ...item, note: e.target.value })}
      />
    </InnerPad>
  )
}

function VehicleCard({
  item,
  onChange,
  onRemove,
}: {
  item: LifeVehicle
  onChange: (n: LifeVehicle) => void
  onRemove: () => void
}) {
  return (
    <InnerPad>
      <div className="flex justify-end">
        <button type="button" className="text-[11px]" style={{ color: MIST }} onClick={onRemove}>
          删除
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input
          className={inputCls}
          style={inputStyle}
          placeholder="购买时间"
          value={item.boughtAt}
          onChange={(e) => onChange({ ...item, boughtAt: e.target.value })}
        />
        <input
          className={inputCls}
          style={inputStyle}
          placeholder="型号"
          value={item.model}
          onChange={(e) => onChange({ ...item, model: e.target.value })}
        />
      </div>
      <PayFields
        payKind={item.payKind}
        loanRemaining={item.loanRemaining}
        monthlyPayment={item.monthlyPayment}
        onChange={(p) => onChange({ ...item, ...p })}
      />
      <input
        className={inputCls}
        style={inputStyle}
        placeholder="备注"
        value={item.note}
        onChange={(e) => onChange({ ...item, note: e.target.value })}
      />
    </InnerPad>
  )
}

function FamilyCard({
  item,
  onChange,
  onRemove,
  startDay,
  nowDay,
}: {
  item: LifeFamilyMember
  onChange: (n: LifeFamilyMember) => void
  onRemove: () => void
  startDay: string | null
  nowDay: string | null
}) {
  const startAge = item.ageAtStart.trim() || item.age.trim()
  const nowAge = computeCurrentAge({
    ageAtStart: parseLifeAgeNumber(startAge),
    birthdayMD: item.birthdayMD,
    startDay,
    nowDay,
  })
  const setStartAge = (raw: string) => {
    const n = parseLifeAgeNumber(raw)
    const current = computeCurrentAge({
      ageAtStart: n,
      birthdayMD: item.birthdayMD,
      startDay,
      nowDay,
    })
    onChange({
      ...item,
      ageAtStart: raw.trim(),
      age: current != null ? String(current) : raw.trim(),
    })
  }
  return (
    <InnerPad>
      <div className="flex justify-end">
        <button type="button" className="text-[11px]" style={{ color: MIST }} onClick={onRemove}>
          删除
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input
          className={inputCls}
          style={inputStyle}
          placeholder="姓名（如林志远，勿写「X父」）"
          value={item.name}
          onChange={(e) => onChange({ ...item, name: e.target.value })}
        />
        <input
          className={inputCls}
          style={inputStyle}
          placeholder="关系（父亲/母亲/继父…）"
          value={item.relation}
          onChange={(e) => onChange({ ...item, relation: e.target.value })}
        />
      </div>
      <div className="mt-1.5 grid grid-cols-2 gap-2">
        <div>
        <input
          className={inputCls}
          style={{ ...inputStyle, ...LUMI_SHELL_NUM_STYLE }}
            placeholder="开篇年龄"
            value={item.ageAtStart || item.age}
            onChange={(e) => setStartAge(e.target.value)}
          />
          <p className="mt-0.5 text-[10px]" style={{ color: MIST }}>
            现在 {nowAge != null ? `${nowAge} 岁` : '—'}（随剧情日）
          </p>
        </div>
        <input
          className={inputCls}
          style={inputStyle}
          placeholder="生日月日（如 3月12日）"
          value={item.birthdayMD}
          onChange={(e) => {
            const birthdayMD = e.target.value
            const n = parseLifeAgeNumber(item.ageAtStart || item.age)
            const current = computeCurrentAge({
              ageAtStart: n,
              birthdayMD,
              startDay,
              nowDay,
            })
            onChange({
              ...item,
              birthdayMD,
              age: current != null ? String(current) : item.age,
            })
          }}
        />
      </div>
      <div className="mt-1.5">
        <input
          className={inputCls}
          style={inputStyle}
          placeholder="具体职业（如市一中语文老师）"
          value={item.occupationOrSchool}
          onChange={(e) => onChange({ ...item, occupationOrSchool: e.target.value })}
        />
      </div>
      <div className="mt-1.5">
        <span className={labelCls} style={labelStyle}>
          性别
        </span>
        <div className="mt-1 flex flex-wrap gap-2">
          {(
            [
              { id: '', zh: '未填' },
              { id: '女', zh: '女' },
              { id: '男', zh: '男' },
              { id: '其他', zh: '其他' },
            ] as const
          ).map((g) => (
            <Chip
              key={g.id || 'none'}
              on={item.gender === g.id || (g.id === '女' && item.gender === 'female') || (g.id === '男' && item.gender === 'male')}
              onClick={() => onChange({ ...item, gender: g.id })}
            >
              {g.zh}
            </Chip>
          ))}
        </div>
      </div>
      <div className="mt-1.5 flex flex-wrap gap-2">
        <Chip on={item.alive} onClick={() => onChange({ ...item, alive: true })}>
          在世
        </Chip>
        <Chip on={!item.alive} onClick={() => onChange({ ...item, alive: false })}>
          已故
        </Chip>
        <Chip
          on={item.livesWithSubject}
          onClick={() =>
            onChange({
              ...item,
              livesWithSubject: !item.livesWithSubject,
              residence:
                !item.livesWithSubject && !item.residence.trim()
                  ? '与本人同址'
                  : item.residence,
            })
          }
        >
          {item.livesWithSubject ? '与本人同居' : '不同居'}
        </Chip>
      </div>
      <input
        className={inputCls}
        style={inputStyle}
        placeholder="身体状况"
        value={item.health}
        onChange={(e) => onChange({ ...item, health: e.target.value })}
      />
      <div className="mt-1.5">
        <span className={labelCls} style={labelStyle}>
          住所（是否与本人同住看这里）
        </span>
      <input
        className={inputCls}
        style={inputStyle}
          placeholder={item.livesWithSubject ? '与本人同址 / 具体小区' : '城市/区/住址'}
          value={item.residence}
          onChange={(e) => onChange({ ...item, residence: e.target.value })}
        />
        <p className="mt-1 text-[10px] leading-relaxed" style={{ color: MIST }}>
          {item.livesWithSubject
            ? '已标「与本人同居」。住所可写同址或具体地址。'
            : '未同居时请写对方住所，便于区分是否同住。'}
        </p>
      </div>
    </InnerPad>
  )
}

function SocialCard({
  item,
  onChange,
  onRemove,
  startDay,
  nowDay,
}: {
  item: LifeSocialContact
  onChange: (n: LifeSocialContact) => void
  onRemove: () => void
  startDay: string | null
  nowDay: string | null
}) {
  const nowAge = computeCurrentAge({
    ageAtStart: parseLifeAgeNumber(item.ageAtStart || item.age),
    birthdayMD: item.birthdayMD,
    startDay,
    nowDay,
  })
  const setStartAge = (raw: string) => {
    const n = parseLifeAgeNumber(raw)
    const current = computeCurrentAge({
      ageAtStart: n,
      birthdayMD: item.birthdayMD,
      startDay,
      nowDay,
    })
    onChange({
      ...item,
      ageAtStart: raw.trim(),
      age: current != null ? String(current) : raw.trim(),
    })
  }
  return (
    <InnerPad>
      <div className="flex justify-end">
        <button type="button" className="text-[11px]" style={{ color: MIST }} onClick={onRemove}>
          删除
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input
          className={inputCls}
          style={inputStyle}
          placeholder="姓名"
          value={item.name}
          onChange={(e) => onChange({ ...item, name: e.target.value })}
        />
        <input
          className={inputCls}
          style={inputStyle}
          placeholder="关系称呼（≤8字，如恋人/同学）"
          value={item.relation}
          onChange={(e) => onChange({ ...item, relation: e.target.value })}
        />
      </div>
      <div className="mt-1.5 grid grid-cols-2 gap-2">
        <div>
          <input
            className={inputCls}
            style={{ ...inputStyle, ...LUMI_SHELL_NUM_STYLE }}
            placeholder="开篇年龄"
            value={item.ageAtStart || item.age}
            onChange={(e) => setStartAge(e.target.value)}
          />
          <p className="mt-0.5 text-[10px]" style={{ color: MIST }}>
            现在 {nowAge != null ? `${nowAge} 岁` : '—'}（随剧情日）
          </p>
        </div>
        <input
          className={inputCls}
          style={inputStyle}
          placeholder="生日月日（如 3月12日）"
          value={item.birthdayMD}
          onChange={(e) => {
            const birthdayMD = e.target.value
            const n = parseLifeAgeNumber(item.ageAtStart || item.age)
            const current = computeCurrentAge({
              ageAtStart: n,
              birthdayMD,
              startDay,
              nowDay,
            })
            onChange({
              ...item,
              birthdayMD,
              age: current != null ? String(current) : item.age,
            })
          }}
        />
      </div>
      <div className="mt-1.5">
        <span className={labelCls} style={labelStyle}>
          性别
        </span>
        <div className="mt-1 flex flex-wrap gap-2">
          {(
            [
              { id: '', zh: '未填' },
              { id: '女', zh: '女' },
              { id: '男', zh: '男' },
              { id: '其他', zh: '其他' },
            ] as const
          ).map((g) => (
            <Chip
              key={g.id || 'none'}
              on={
                item.gender === g.id ||
                (g.id === '女' && item.gender === 'female') ||
                (g.id === '男' && item.gender === 'male')
              }
              onClick={() => onChange({ ...item, gender: g.id })}
            >
              {g.zh}
            </Chip>
          ))}
        </div>
      </div>
      <div className="mt-1.5 grid grid-cols-2 gap-2">
        <input
          className={inputCls}
          style={inputStyle}
          placeholder="具体职业/年级（如大二会计）"
        value={item.occupationOrSchool}
        onChange={(e) => onChange({ ...item, occupationOrSchool: e.target.value })}
      />
      <input
        className={inputCls}
        style={inputStyle}
          placeholder="住所"
        value={item.residence}
        onChange={(e) => onChange({ ...item, residence: e.target.value })}
        />
      </div>
      <input
        className={`${inputCls} mt-1.5`}
        style={inputStyle}
        placeholder="关系补充（态度/亲疏，可写完整句，勿当短标签）"
        value={item.attitude}
        onChange={(e) => onChange({ ...item, attitude: e.target.value })}
      />
      <input
        className={`${inputCls} mt-1.5`}
        style={inputStyle}
        placeholder="其他备注"
        value={item.note}
        onChange={(e) => onChange({ ...item, note: e.target.value })}
      />
    </InnerPad>
  )
}

function PetCard({
  item,
  onChange,
  onRemove,
}: {
  item: LifePet
  onChange: (n: LifePet) => void
  onRemove: () => void
}) {
  return (
    <InnerPad>
      <div className="flex justify-end">
        <button type="button" className="text-[11px]" style={{ color: MIST }} onClick={onRemove}>
          删除
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input
          className={inputCls}
          style={inputStyle}
          placeholder="名字"
          value={item.name}
          onChange={(e) => onChange({ ...item, name: e.target.value })}
        />
        <input
          className={inputCls}
          style={inputStyle}
          placeholder="种类"
          value={item.species}
          onChange={(e) => onChange({ ...item, species: e.target.value })}
        />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <input
          className={inputCls}
          style={{ ...inputStyle, ...LUMI_SHELL_NUM_STYLE }}
          placeholder="年龄"
          value={item.age}
          onChange={(e) => onChange({ ...item, age: e.target.value })}
        />
        <input
          className={inputCls}
          style={inputStyle}
          placeholder="购买/领取时间"
          value={item.acquiredAt}
          onChange={(e) => onChange({ ...item, acquiredAt: e.target.value })}
        />
        <input
          className={inputCls}
          style={inputStyle}
          placeholder="地点"
          value={item.acquiredPlace}
          onChange={(e) => onChange({ ...item, acquiredPlace: e.target.value })}
        />
      </div>
    </InnerPad>
  )
}

function useDebouncedSheetSave(
  sheet: LifeMutableSheet | null,
  save: (s: LifeMutableSheet) => Promise<void>,
) {
  const timer = useRef<number | null>(null)
  const first = useRef(true)
  useEffect(() => {
    if (!sheet) return
    if (first.current) {
      first.current = false
      return
    }
    if (timer.current) window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      void save(sheet)
    }, 450)
    return () => {
      if (timer.current) window.clearTimeout(timer.current)
    }
  }, [sheet, save])
}

export function LifeMutableEditor(props: {
  character: Character
  playerIdentity: PlayerIdentity | null
  /** 资料卡详情页：去掉重复标题，直接铺在点阵底上 */
  variant?: 'default' | 'passport'
}) {
  const { character, variant = 'default' } = props
  const passport = variant === 'passport'
  const [span, setSpan] = useState<{ startDay: string | null; nowDay: string | null }>({
    startDay: null,
    nowDay: null,
  })
  const [charSheet, setCharSheet] = useState<LifeMutableSheet | null>(null)
  const [playerSheet, setPlayerSheet] = useState<LifeMutableSheet | null>(null)
  const [boundPlayer, setBoundPlayer] = useState<PlayerIdentity | null>(null)
  const [panel, setPanel] = useState<'char' | 'player'>('char')
  const [alignBusy, setAlignBusy] = useState(false)
  const [alignFeedback, setAlignFeedback] = useState('')
  const [alignConfirmOpen, setAlignConfirmOpen] = useState(false)
  const [inlineSyncOn, setInlineSyncOn] = useState(false)
  const [tutorialOpen, setTutorialOpen] = useState(false)
  const [coachOpen, setCoachOpen] = useState(false)
  const [coachStepIndex, setCoachStepIndex] = useState(0)
  const chatCardApi = useCurrentApiConfig('chatCard')
  const mainApi = useCurrentApiConfig()
  const apiConfig = chatCardApi ?? mainApi
  const alignAbortRef = useRef<AbortController | null>(null)

  const startLiveCoach = useCallback(() => {
    setCoachStepIndex(0)
    setCoachOpen(true)
  }, [])

  const finishCoach = useCallback((opts?: { openTutorial?: boolean }) => {
    writeMemoryCoachSeen(LIFE_LEDGER_COACH_SEEN_KEY)
    setCoachOpen(false)
    setCoachStepIndex(0)
    if (opts?.openTutorial) setTutorialOpen(true)
  }, [])

  useEffect(() => {
    if (readMemoryCoachSeen(LIFE_LEDGER_COACH_SEEN_KEY)) return
    const id = window.setTimeout(() => startLiveCoach(), 520)
    return () => window.clearTimeout(id)
  }, [character.id, startLiveCoach])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const nextSpan = await loadCharacterStorySpan(character.id)
      if (!cancelled) setSpan(nextSpan)
    })()
    return () => {
      cancelled = true
    }
  }, [character.id, alignBusy, panel])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const row = await personaDb.getCharacterLifeMutable(character.id)
      if (cancelled) return
      setCharSheet(row?.sheet ?? emptyLifeMutableSheet())
      const identity = await resolveCharacterBoundUserIdentity(character)
      if (cancelled) return
      setBoundPlayer(identity)
      if (identity?.id) {
        const p = await personaDb.getPlayerLifeMutable(identity.id, character.id)
        if (!cancelled) setPlayerSheet(p?.sheet ?? emptyLifeMutableSheet())
      } else {
        setPlayerSheet(null)
      }
      try {
        const on = await isLifeLedgerInlineSyncEnabled(character.id, identity?.id)
        if (!cancelled) setInlineSyncOn(on)
      } catch {
        if (!cancelled) setInlineSyncOn(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [character.id, character.playerIdentityId, character.linkedPlayerIdentityIds, character.generatedForCharacterId])

  useEffect(() => {
    const onChange = () => {
      void isLifeLedgerInlineSyncEnabled(character.id, boundPlayer?.id)
        .then(setInlineSyncOn)
        .catch(() => setInlineSyncOn(false))
    }
    window.addEventListener(LIFE_LEDGER_INLINE_SYNC_CHANGED_EVENT, onChange)
    return () => window.removeEventListener(LIFE_LEDGER_INLINE_SYNC_CHANGED_EVENT, onChange)
  }, [boundPlayer?.id, character.id])

  const toggleInlineSync = useCallback(async () => {
    const next = !inlineSyncOn
    setInlineSyncOn(next)
    await setLifeLedgerInlineSyncEnabled({
      conversationCharacterId: character.id,
      playerIdentityId: boundPlayer?.id,
      enabled: next,
    })
  }, [boundPlayer?.id, character.id, inlineSyncOn])

  const saveChar = useMemo(
    () => async (s: LifeMutableSheet) => {
      await personaDb.putCharacterLifeMutable(character.id, s)
    },
    [character.id],
  )
  const savePlayer = useMemo(
    () => async (s: LifeMutableSheet) => {
      if (!boundPlayer?.id) return
      await personaDb.putPlayerLifeMutable(boundPlayer.id, character.id, s)
    },
    [boundPlayer?.id, character.id],
  )
  useDebouncedSheetSave(charSheet, saveChar)
  useDebouncedSheetSave(playerSheet, savePlayer)

  const requestAlign = useCallback(() => {
    if (alignBusy) return
    if (!apiConfig?.apiUrl?.trim() || !apiConfig?.apiKey?.trim() || !apiConfig?.modelId?.trim()) {
      setAlignFeedback('未配置可用 AI：请到 API 设置配置主聊天接口后再试')
      return
    }
    setAlignConfirmOpen(true)
  }, [alignBusy, apiConfig])

  const alignCurrentPanel = useCallback(async () => {
    if (alignBusy) return
    const jobs: Array<{ subject: 'character' | 'player'; sheet: NonNullable<typeof charSheet>; label: string }> = []
    if (charSheet) jobs.push({ subject: 'character', sheet: charSheet, label: '角色' })
    if (boundPlayer?.id && playerSheet) {
      jobs.push({ subject: 'player', sheet: playerSheet, label: '玩家' })
    }
    if (!jobs.length) {
      setAlignFeedback('账本尚未加载完成，请稍后再试')
      return
    }
    if (!apiConfig?.apiUrl?.trim() || !apiConfig?.apiKey?.trim() || !apiConfig?.modelId?.trim()) {
      setAlignFeedback('未配置可用 AI：请到 API 设置配置主聊天接口后再试')
      return
    }
    alignAbortRef.current?.abort()
    const ctrl = new AbortController()
    alignAbortRef.current = ctrl
    setAlignBusy(true)
    setAlignFeedback(jobs.length > 1 ? '正在对齐角色本线与玩家身份…' : '正在准备对齐…')
    const parts: string[] = []
    const changedLabels: string[] = []
    let anyUpdated = false
    try {
      // 手改剧情年后必须重读跨度，避免仍按错误的 2029「现在」对齐
      const freshSpan = await loadCharacterStorySpan(character.id)
      setSpan(freshSpan)
      // 对齐前重读身份卡，避免编辑器里仍是改卡前的缓存
      let freshBound = boundPlayer
      try {
        const latest = await resolveCharacterBoundUserIdentity(character)
        if (latest?.id) {
          freshBound = latest
          setBoundPlayer(latest)
        }
      } catch {
        /* keep boundPlayer */
      }
      let workingChar = charSheet
      let workingPlayer = playerSheet
      for (const job of jobs) {
        if (ctrl.signal.aborted) break
        setAlignFeedback(`正在对齐${job.label}…`)
        const counterpart =
          job.subject === 'character' ? workingPlayer : workingChar
        const result = await runLifeAlignFromMemory({
          character,
          boundPlayer: freshBound,
          subject: job.subject,
          sheet: job.subject === 'character' ? workingChar! : workingPlayer!,
          span: freshSpan,
          counterpartSheet: counterpart,
          apiConfig,
          signal: ctrl.signal,
          onProgress: (_stage, detail) => setAlignFeedback(`${job.label}：${detail}`),
        })
        if (result.status === 'updated') {
          if (job.subject === 'player') {
            workingPlayer = result.sheet
            setPlayerSheet(result.sheet)
          } else {
            workingChar = result.sheet
            setCharSheet(result.sheet)
          }
          anyUpdated = true
          for (const c of result.changed) {
            const tag = `${job.label}·${c}`
            if (!changedLabels.includes(tag)) changedLabels.push(tag)
          }
          parts.push(`${job.label}已对齐：${result.changed.join('、')}`)
        } else if (result.status === 'no_change') {
          parts.push(
            `${job.label}已一致（当前剧情跨度 ${freshSpan.startDay || '？'} → ${freshSpan.nowDay || '？'}）`,
          )
        } else {
          parts.push(`${job.label}失败：${result.reason || '对齐失败'}`)
        }
      }
      // 双方都有账本时：强制同步同名共同好友的学校/职业/住址等客观事实
      if (workingChar && workingPlayer && freshBound?.id) {
        const synced = syncSharedSocialCircleBetweenSheets(workingChar, workingPlayer)
        if (synced.syncedNames.length) {
          workingChar = synced.character
          workingPlayer = synced.player
          setCharSheet(synced.character)
          setPlayerSheet(synced.player)
          await personaDb.putCharacterLifeMutable(character.id, synced.character)
          await personaDb.putPlayerLifeMutable(freshBound.id, character.id, synced.player)
          anyUpdated = true
          const circleLabel = `共同社交圈·${synced.syncedNames.slice(0, 6).join('、')}`
          if (!changedLabels.includes(circleLabel)) changedLabels.push(circleLabel)
          parts.push(`共同社交圈已对齐：${synced.syncedNames.slice(0, 6).join('、')}`)
        }
      }
      setAlignFeedback(parts.join('；') || '对齐结束')
      // 有任一成功（已改写或已一致）时弹出说明；整批失败不弹
      const hadSuccess =
        anyUpdated || parts.some((p) => p.includes('已对齐') || p.includes('已一致'))
      if (!ctrl.signal.aborted && hadSuccess) {
        try {
          window.dispatchEvent(
            new CustomEvent(LIFE_LEDGER_PATCH_UPDATED_EVENT, {
              detail: {
                appliedPatchCount: Math.max(1, changedLabels.length || (anyUpdated ? 1 : 0)),
                changedLabels: anyUpdated ? changedLabels : [],
                source: 'align',
              },
            }),
          )
        } catch {
          /* ignore */
        }
      }
    } catch (e) {
      const msg = e instanceof Error && e.message.trim() ? e.message.trim() : '对齐失败'
      setAlignFeedback(parts.length ? `${parts.join('；')}；${msg}` : msg)
    } finally {
      setAlignBusy(false)
      if (alignAbortRef.current === ctrl) alignAbortRef.current = null
    }
  }, [alignBusy, apiConfig, boundPlayer, character, charSheet, playerSheet])

  const confirmAlign = useCallback(() => {
    if (alignBusy) return
    setAlignConfirmOpen(false)
    void alignCurrentPanel()
  }, [alignBusy, alignCurrentPanel])

  useEffect(() => {
    setAlignFeedback('')
  }, [character.id])

  const pidName = boundPlayer
    ? formatPlayerIdentityDisplayName(boundPlayer, boundPlayer.id)
    : '未绑定身份卡'
  const fileNo = character.id.slice(0, 8).toUpperCase()

  const body = (
    <>
      <header className="mb-4 pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p
              className="text-center font-mono text-[10px] uppercase tracking-[0.42em]"
              style={{ color: STAMP, fontFamily: MONO }}
            >
              LIFE DOSSIER
            </p>
            <h2
              className="mt-2 text-center text-[22px] font-bold tracking-tight"
              style={{ color: INK, fontFamily: SERIF }}
            >
              人生档案本
            </h2>
            <div className="mx-auto mt-2.5 h-[2px] w-full max-w-[220px]" style={{ background: STAMP }} />
            <p className="mt-2.5 text-center text-[11px] leading-relaxed" style={{ color: MIST, fontFamily: SANS }}>
              {passport
                ? '本线当前生理与资产登记。与建档卡分离；每轮对话注入，与世界书同级。'
                : '基础信息仍是开篇固定设定。这里记本线会变的生理与资产。'}
            </p>
            <button
              type="button"
              className="mt-3 flex w-full items-center justify-between gap-3 py-2 text-left"
              style={{
                borderTop: `0.5px solid ${LINE}`,
                color: INK,
              }}
              onClick={() => void toggleInlineSync()}
              {...{ [LIFE_LEDGER_COACH_TARGET_ATTR]: 'ledger-inline-sync' }}
            >
              <span className="min-w-0">
                <span className="block font-mono text-[9px] tracking-[0.16em]" style={{ color: MIST, fontFamily: MONO }}>
                  INLINE SYNC
                </span>
                <span className="mt-0.5 block text-[11px] leading-relaxed" style={{ color: MIST }}>
                  同请求更新账本：本轮新事实才改。老角色用下方「按记忆对齐」一次补齐角色+玩家。
                </span>
              </span>
              <span
                className="relative h-5 w-9 shrink-0 rounded-full transition-colors"
                style={{ background: inlineSyncOn ? STAMP : 'rgba(44,44,46,0.18)' }}
                aria-hidden
              >
                <span
                  className="absolute top-0.5 size-4 rounded-full bg-white transition-[left]"
                  style={{ left: inlineSyncOn ? 18 : 2 }}
                />
              </span>
            </button>
            <SystemOverride
              busy={alignBusy}
              feedback={alignFeedback}
              onAlign={requestAlign}
              hasPlayer={Boolean(boundPlayer?.id)}
            />
          </div>
        </div>
      </header>

      <div
        className="mb-4 flex overflow-hidden"
        style={{ border: `1.5px solid ${STAMP}`, background: PAPER }}
        {...{ [LIFE_LEDGER_COACH_TARGET_ATTR]: 'ledger-tabs' }}
      >
        {(
          [
            { id: 'char' as const, label: '角色本线', en: 'CHAR' },
            { id: 'player' as const, label: `玩家 · ${pidName}`, en: 'USER' },
          ] as const
        ).map((tab) => {
          const on = panel === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              className="min-w-0 flex-1 truncate px-2 py-2.5 text-center"
              style={{
                background: on ? STAMP : 'transparent',
                color: on ? '#F9F8F6' : STAMP,
              }}
              onClick={() => setPanel(tab.id)}
            >
              <span
                className="block font-mono text-[8px] tracking-[0.18em]"
                style={{ fontFamily: MONO, opacity: 0.85 }}
              >
                {tab.en}
              </span>
              <span className="mt-0.5 block truncate text-[12px] font-semibold" style={{ fontFamily: SANS }}>
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>

      {panel === 'char' && charSheet ? (
        <SheetFields
          sheet={charSheet}
          onChange={setCharSheet}
          cardAge={character.age}
          birthdayMD={character.birthdayMD}
          startDay={span.startDay}
          nowDay={span.nowDay}
        />
      ) : null}

      {panel === 'player' ? (
        boundPlayer && playerSheet ? (
          <SheetFields
            sheet={playerSheet}
            onChange={setPlayerSheet}
            cardAge={boundPlayer.age}
            birthdayMD={boundPlayer.birthdayMD}
            startDay={span.startDay}
            nowDay={span.nowDay}
          />
        ) : (
          <div
            className="px-4 py-6 text-center text-[13px] leading-relaxed"
            style={{
              background: PAGE,
              border: `1px dashed ${LINE}`,
              color: MIST,
            }}
          >
            先在绑定信息里选一张玩家身份卡，才会出现「玩家在本角色线」的独立档案页。
          </div>
        )
      ) : null}
    </>
  )

  return (
    <div className="relative pb-4">
      <DossierShell
        fileNo={fileNo}
        tutorialSlot={
          <button
            type="button"
            onClick={() => setTutorialOpen(true)}
            className="flex h-8 items-center gap-1 rounded-full px-2.5 transition-colors"
            style={{
              background: 'rgba(139,26,26,0.08)',
              color: STAMP,
              border: `1px solid rgba(139,26,26,0.22)`,
            }}
            aria-label="人生账本教程"
            {...{ [LIFE_LEDGER_COACH_TARGET_ATTR]: 'ledger-tutorial' }}
          >
            <BookOpen className="size-3.5" strokeWidth={1.5} aria-hidden />
            <span className="text-[11px] font-medium tracking-wide" style={{ fontFamily: SANS }}>
              教程
            </span>
          </button>
        }
      >
        {body}
      </DossierShell>

      {alignConfirmOpen ? (
        <div
          className="fixed inset-0 z-[62550] flex items-center justify-center px-6"
          style={{ background: 'rgba(18, 20, 26, 0.42)' }}
          role="presentation"
          onClick={() => {
            if (!alignBusy) setAlignConfirmOpen(false)
          }}
        >
          <div
            className="w-full max-w-[320px] px-5 pb-5 pt-5"
            style={{
              background: PAPER,
              border: `1.5px solid ${STAMP}`,
              boxShadow: '0 12px 40px rgba(44,44,46,0.18)',
            }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="life-ledger-align-confirm-title"
            onClick={(e) => e.stopPropagation()}
          >
            <p
              id="life-ledger-align-confirm-title"
              className="text-center text-[16px] font-semibold tracking-wide"
              style={{ color: INK, fontFamily: SERIF }}
            >
              确认按记忆对齐？
            </p>
            <p
              className="mt-3 text-[13px] leading-relaxed"
              style={{ color: MIST, fontFamily: SANS }}
            >
              {boundPlayer?.id
                ? '将按人设世界书、身份卡与线上/线下近端各 10 轮，一次补齐角色 + 玩家两边账本空白并校正过时项。不读向量与长期记忆。'
                : '将按人设世界书、身份卡与线上/线下近端各 10 轮，补齐当前账本空白并校正过时项。不读向量与长期记忆。'}
            </p>
            <div className="mt-5 flex gap-2.5">
              <button
                type="button"
                disabled={alignBusy}
                onClick={() => setAlignConfirmOpen(false)}
                className="flex-1 py-2.5 text-[13px] font-medium disabled:opacity-55"
                style={{
                  color: MIST,
                  border: `1px solid ${LINE}`,
                  background: PAGE,
                  fontFamily: SANS,
                }}
              >
                取消
              </button>
              <button
                type="button"
                disabled={alignBusy}
                onClick={confirmAlign}
                className="flex-1 py-2.5 text-[13px] font-semibold disabled:opacity-55"
                style={{
                  background: STAMP,
                  color: '#F9F8F6',
                  fontFamily: SANS,
                }}
              >
                确认对齐
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <MemoryTutorialModal
        open={tutorialOpen}
        onClose={() => setTutorialOpen(false)}
        title="人生账本 · 说明"
        subtitle="会变的现状登记 · 开/关体验对比"
        sections={LIFE_LEDGER_TUTORIAL_SECTIONS}
        onStartLiveCoach={startLiveCoach}
        zIndex={62000}
      />
      <MemoryCoachPortal
        open={coachOpen}
        steps={LIFE_LEDGER_COACH_STEPS}
        stepIndex={coachStepIndex}
        onStepChange={setCoachStepIndex}
        onSkip={() => finishCoach()}
        onComplete={finishCoach}
        scopeRoot={LIFE_LEDGER_COACH_SCOPE}
        coachTargetAttr={LIFE_LEDGER_COACH_TARGET_ATTR}
        coachRootAttr={LIFE_LEDGER_COACH_ROOT_ATTR}
        zIndex={62100}
      />
    </div>
  )
}
