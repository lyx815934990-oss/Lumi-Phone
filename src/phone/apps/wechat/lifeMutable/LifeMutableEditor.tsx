/** 可变人生表单：角色本线 / 玩家本线两套账本。 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import { useCurrentApiConfig } from '../../api/ApiSettingsContext'
import type { Character, Gender, PlayerIdentity } from '../newFriendsPersona/types'
import { genderLabelZh, uid } from '../newFriendsPersona/utils'
import { personaDb } from '../newFriendsPersona/idb'
import { LUMI_SHELL_NUM_STYLE } from '../lumiShellTheme'
import { runLifeAlignFromMemory, runLifeAlignPairFromMemory } from './alignFromMemoryAi'
import {
  isLifeLedgerInlineSyncEnabled,
  setLifeLedgerInlineSyncEnabled,
  LIFE_LEDGER_INLINE_SYNC_CHANGED_EVENT,
} from './inlineSync'
import {
  LIFE_LEDGER_PATCH_UPDATED_EVENT,
  lifeFieldDiffsToChangedItems,
  type LifeLedgerChangedItem,
} from './lifeLedgerPatch'
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
import {
  Anchor,
  BookOpen,
  Car,
  ChevronDown,
  History,
  Home,
  ImagePlus,
  PawPrint,
  Shield,
  StickyNote,
  Users,
  UsersRound,
  type LucideIcon,
} from 'lucide-react'
import { ImageCropperModal } from '../../../components/ImageCropperModal'
import { resolveCharacterAvatarUrl } from '../../../utils/characterAvatarUrl'
import { DEFAULT_PUBLIC_AVATAR_PATH } from '../../../types'
import { compressAvatarDataUrl, MAX_AVATAR_DATA_URL_LEN } from '../avatarCompress'
import { resolveLifeLedgerAvatarSrc } from './ledgerAvatar'
import { MemoryCoachPortal } from '../memory/MemoryCoachPortal'
import { MemoryTutorialModal } from '../memory/MemoryTutorialModal'
import { readMemoryCoachSeen, writeMemoryCoachSeen } from '../memory/memoryCoachTypes'
import {
  appendLifeChangeHistory,
  appendOrCoalesceManualHistory,
  buildLifeSheetDiffs,
  formatLifeHistoryDiffPair,
  lifeChangeSourceLabel,
  lifeSheetContentEqual,
} from './lifeChangeHistory'
import type {
  LifeChangeEvent,
  LifeEducationTrack,
  LifeFamilyMember,
  LifeFieldDiff,
  LifeMutableSheet,
  LifePayKind,
  LifePet,
  LifePlaceKind,
  LifeRealEstate,
  LifeSocialContact,
  LifeVehicle,
} from './types'

/**
 * 人生账本 · 锐利漫画杂志风
 * 全页一个强焦点（LIFE DOSSIER 头）；2px 深墨描边；印章红仅 STATUS/关系标签。
 */
const BG = '#F3ECDD'
const CARD = '#FFFFFF'
const INK = '#2E271C'
const DARK = '#2E271C'
const MIST = '#9C8D6C'
const LINE = '#2E271C'
const RULE = 'rgba(46,39,28,0.18)'
const STAMP = '#C9574F'
const BORDER = '2px solid #2E271C'
const BORDER_SOFT = '1.5px solid #2E271C'
const RADIUS = 10
const PAPER = BG
const PAGE = CARD
const MONO = '"SF Mono", "Courier New", ui-monospace, monospace'
/** 档案正文：仿宋（Windows 仿宋 / macOS 华文仿宋） */
const FANGSONG =
  '"FangSong", "仿宋", "STFangsong", "FangSong_GB2312", "Songti SC", "Noto Serif SC", "SimSun", serif'
const SERIF = FANGSONG
const SANS = '-apple-system, BlinkMacSystemFont, "PingFang SC", "Helvetica Neue", sans-serif'
/** 签名：草书（站内已载 Zhi Mang Xing） */
const SIGNATURE_STACK = '"Zhi Mang Xing", "Long Cang", "STXingkai", "华文行楷", cursive'
const HEX_CLIP = 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)'
const HALFTONE_BG =
  'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'10\' height=\'10\' viewBox=\'0 0 10 10\'%3E%3Ccircle cx=\'1.5\' cy=\'1.5\' r=\'0.9\' fill=\'%232E271C\' fill-opacity=\'0.12\'/%3E%3C/svg%3E")'
/** 名片纸张底：偏白 + 淡灰纤维（不要米色） */
const CARD_PAPER = '#FAFAF8'
const CARD_PAPER_BG = [
  'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'160\' height=\'160\' viewBox=\'0 0 160 160\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3CfeColorMatrix values=\'0 0 0 0 0.12 0 0 0 0 0.12 0 0 0 0 0.12 0 0 0 0.14 0\'/%3E%3C/filter%3E%3Crect width=\'160\' height=\'160\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',
  'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'6\' height=\'6\' viewBox=\'0 0 6 6\'%3E%3Cpath d=\'M0 3h6\' stroke=\'%232E271C\' stroke-opacity=\'0.028\' stroke-width=\'0.55\'/%3E%3C/svg%3E")',
  'linear-gradient(165deg, #FFFFFF 0%, #FAFAF8 55%, #F3F3F0 100%)',
].join(', ')
const cardPaperStyle: CSSProperties = {
  backgroundColor: CARD_PAPER,
  backgroundImage: CARD_PAPER_BG,
  backgroundSize: '160px 160px, 6px 6px, auto',
}

/** 编辑态：当前区块 / 当前字段的焦点底色 */
const EDIT_FOCUS_TINT = 'rgba(201,87,79,0.08)'
const EDIT_FOCUS_EDGE = 'rgba(201,87,79,0.55)'
const EDIT_IDLE_TINT = 'rgba(255,255,255,0.42)'
const EDIT_OPEN_BODY = 'rgba(255,252,247,0.98)'

const inputCls =
  'life-ledger-input w-full bg-transparent px-0 py-1.5 text-[13px] outline-none transition-[border-color,box-shadow] duration-150'
const inputStyle: CSSProperties = {
  color: INK,
  borderBottom: '1.5px solid rgba(46,39,28,0.22)',
  fontFamily: SANS,
  caretColor: STAMP,
}
const labelCls = 'font-mono text-[9px] font-medium uppercase tracking-[0.16em]'
const labelStyle: CSSProperties = { color: MIST, fontFamily: MONO }

/** 编辑态手风琴：同一时刻只展开一块，其余弱化 */
const LedgerAccordionCtx = createContext<{
  openId: string | null
  toggle: (id: string) => void
  registerDefault: (id: string) => void
} | null>(null)

function LedgerAccordionProvider({ children }: { children: ReactNode }) {
  const [openId, setOpenId] = useState<string | null>(null)
  const defaultLocked = useRef(false)
  const toggle = useCallback((id: string) => {
    setOpenId((cur) => (cur === id ? null : id))
  }, [])
  const registerDefault = useCallback((id: string) => {
    if (defaultLocked.current) return
    defaultLocked.current = true
    setOpenId(id)
  }, [])
  const value = useMemo(() => ({ openId, toggle, registerDefault }), [openId, toggle, registerDefault])
  return <LedgerAccordionCtx.Provider value={value}>{children}</LedgerAccordionCtx.Provider>
}

/** 编辑态输入焦点：下划线加粗变印章红（inline style 无法被 Tailwind focus 覆盖） */
function LifeLedgerEditFocusStyles() {
  return (
    <style>{`
      .life-ledger-input:focus {
        border-bottom-color: ${STAMP} !important;
        border-bottom-width: 2px !important;
        box-shadow: 0 1px 0 0 ${STAMP};
      }
      .life-ledger-field:focus-within {
        background: ${EDIT_FOCUS_TINT};
        box-shadow: inset 3px 0 0 0 ${STAMP};
      }
      .life-ledger-field:focus-within .life-ledger-field-label {
        color: ${STAMP} !important;
      }
      .life-ledger-item:focus-within {
        background: ${EDIT_FOCUS_TINT};
        border-color: ${EDIT_FOCUS_EDGE} !important;
        box-shadow: inset 3px 0 0 0 ${STAMP};
      }
      textarea.life-ledger-input:focus {
        box-shadow: none;
        outline: none;
      }
    `}</style>
  )
}

function LedgerAvatarPicker({
  ledgerAvatar,
  wechatAvatarUrl,
  onChange,
  size = 56,
}: {
  ledgerAvatar: string
  wechatAvatarUrl?: string | null
  onChange: (next: string) => void
  size?: number
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [cropSrc, setCropSrc] = useState('')
  const hasCustom = Boolean(ledgerAvatar.trim())
  const src = resolveLifeLedgerAvatarSrc(ledgerAvatar, wechatAvatarUrl)

  const onPickFile = (file: File | null) => {
    if (!file || !file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = () => {
      const next = typeof reader.result === 'string' ? reader.result : ''
      if (next) setCropSrc(next)
    }
    reader.readAsDataURL(file)
  }

  return (
    <>
      <ImageCropperModal
        open={!!cropSrc}
        imageSrc={cropSrc}
        title="裁剪账本头像"
        aspect={1}
        maxSide={1080}
        objectFit="horizontal-cover"
        onCancel={() => setCropSrc('')}
        onConfirm={async (dataUrl) => {
          const next = await compressAvatarDataUrl(dataUrl, MAX_AVATAR_DATA_URL_LEN)
          if (next.length > MAX_AVATAR_DATA_URL_LEN) {
            window.alert('图片过大，请选择较小的图片。')
            return
          }
          onChange(next)
          setCropSrc('')
        }}
      />
      <div className="flex shrink-0 flex-col items-center gap-1">
        <button
          type="button"
          className="relative overflow-hidden active:opacity-90"
          style={{
            width: size,
            height: size,
            border: BORDER,
            borderRadius: 2,
            background: CARD,
          }}
          onClick={() => inputRef.current?.click()}
          aria-label={hasCustom ? '更换账本头像' : '上传账本头像'}
          title={hasCustom ? '更换账本头像' : '默认微信头像 · 点按上传账本专属'}
        >
          <img
            src={src}
            alt=""
            className="size-full object-cover"
            onError={(e) => {
              e.currentTarget.src =
                resolveCharacterAvatarUrl({ avatarUrl: DEFAULT_PUBLIC_AVATAR_PATH }) || src
            }}
          />
          <span
            className="pointer-events-none absolute bottom-0 inset-x-0 flex items-center justify-center gap-0.5 py-0.5"
            style={{ background: 'rgba(46,39,28,0.72)' }}
            aria-hidden
          >
            <ImagePlus className="size-2.5" style={{ color: CARD }} strokeWidth={2} />
          </span>
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => {
            onPickFile(e.target.files?.[0] ?? null)
            e.currentTarget.value = ''
          }}
        />
        <p
          className="max-w-[4.5rem] text-center font-mono text-[8px] leading-tight tracking-[0.06em]"
          style={{ color: MIST, fontFamily: MONO }}
        >
          {hasCustom ? '专属' : '微信'}
        </p>
        {hasCustom ? (
          <button
            type="button"
            className="font-mono text-[8px] tracking-[0.08em] underline-offset-2 hover:underline"
            style={{ color: MIST, fontFamily: MONO }}
            onClick={() => onChange('')}
          >
            恢复微信
          </button>
        ) : null}
      </div>
    </>
  )
}

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
    <label
      className="life-ledger-field block rounded-sm px-2.5 py-2 transition-[background,box-shadow] duration-150"
      style={{ background: 'transparent' }}
    >
      <span className={`life-ledger-field-label ${labelCls}`} style={labelStyle}>
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
      className="inline-flex items-center gap-1.5 px-2 py-1 text-[11px] tracking-wide transition-colors"
      style={{
        border: on ? `1.5px solid ${STAMP}` : BORDER_SOFT,
        background: on ? EDIT_FOCUS_TINT : CARD,
        color: INK,
        fontFamily: SANS,
        borderRadius: 2,
      }}
    >
      <span
        className="relative flex size-[12px] shrink-0 items-center justify-center"
        style={{
          border: on ? `1.5px solid ${STAMP}` : BORDER_SOFT,
          background: on ? STAMP : 'transparent',
          borderRadius: 0,
        }}
        aria-hidden
      >
        {on ? (
          <span className="text-[9px] font-bold leading-none" style={{ color: CARD }}>
            ✓
          </span>
        ) : null}
      </span>
      {children}
    </button>
  )
}

/** 关系/状态标签：唯一允许印章红 + 微倾 */
function Stamp({
  children,
  rotate = -2,
}: {
  children: ReactNode
  rotate?: number
}) {
  return (
    <span
      className="inline-block max-w-[8.5rem] shrink-0 truncate px-1.5 py-0.5 font-mono text-[9px] tracking-[0.06em]"
      style={{
        border: `1.5px solid ${STAMP}`,
        color: STAMP,
        background: CARD,
        fontFamily: MONO,
        transform: `rotate(${rotate}deg)`,
        borderRadius: 2,
      }}
      title={typeof children === 'string' ? children : undefined}
    >
      {children}
    </span>
  )
}

function LaneBadge({ lane }: { lane: 'now' | 'start' }) {
  return (
    <span
      className="inline-block px-1.5 py-0.5 font-mono text-[8px] tracking-[0.14em]"
      style={{
        border: BORDER_SOFT,
        color: MIST,
        background: CARD,
        fontFamily: MONO,
        borderRadius: 2,
      }}
    >
      {lane === 'now' ? 'NOW' : 'START'}
    </span>
  )
}

/** 整页最多 1–2 处点睛，固定探出卡片左上角 */
function Paperclip({ className = '' }: { className?: string }) {
  return (
    <svg
      className={`pointer-events-none absolute z-[2] ${className}`}
      width="16"
      height="24"
      viewBox="0 0 18 28"
      fill="none"
      aria-hidden
    >
      <path
        d="M5.5 10.5V19a3.5 3.5 0 007 0V8.5a2.5 2.5 0 00-5 0V18a1.5 1.5 0 003 0V10"
        stroke={DARK}
        strokeWidth="1.35"
        strokeLinecap="round"
        opacity="0.45"
      />
    </svg>
  )
}

function SignatureLine({ name }: { name: string }) {
  const label = name.trim() || '—'
  return (
    <div className="mt-5 flex flex-col items-end pr-1">
      <p
        className="max-w-[90%] truncate text-right leading-none"
        style={{
          color: INK,
          fontFamily: SIGNATURE_STACK,
          fontSize: 30,
          fontWeight: 400,
          letterSpacing: '0.04em',
          transform: 'rotate(-5deg)',
          transformOrigin: 'right bottom',
          opacity: 0.94,
          textShadow: '0.5px 0.7px 0 rgba(46,39,28,0.16)',
        }}
      >
        {label}
      </p>
      <div className="mt-2 h-px w-[min(58%,11rem)]" style={{ background: DARK }} />
      <p
        className="mt-1 text-right text-[10px] font-bold leading-none"
        style={{ color: MIST, fontFamily: FANGSONG }}
      >
        签名
      </p>
      <p
        className="mt-0.5 font-mono text-[7px] uppercase tracking-[0.22em]"
        style={{ color: MIST, fontFamily: MONO }}
        aria-hidden
      >
        SIGNATURE
      </p>
    </div>
  )
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
  summary?: string
  defaultOpen?: boolean
  /** @deprecated 装饰已收敛，忽略 */
  tape?: boolean
  /** @deprecated 装饰已收敛，忽略 */
  clip?: boolean
  children: ReactNode
}) {
  const id = useId()
  const accordion = useContext(LedgerAccordionCtx)
  const [localOpen, setLocalOpen] = useState(defaultOpen)

  useLayoutEffect(() => {
    if (defaultOpen && accordion) accordion.registerDefault(id)
    // 仅挂载时登记默认展开块
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const open = accordion ? accordion.openId === id : localOpen
  /** 手风琴尚未选定时，暂不弱化，避免首帧闪暗 */
  const dimOthers = Boolean(accordion && accordion.openId && !open)
  const onToggle = () => {
    if (accordion) accordion.toggle(id)
    else setLocalOpen((v) => !v)
  }

  return (
    <section
      className="relative overflow-hidden transition-[opacity,box-shadow,background,border-color] duration-200"
      style={{
        marginTop: 10,
        border: open ? BORDER : `1.5px solid rgba(46,39,28,0.2)`,
        borderRadius: RADIUS,
        background: open ? CARD : EDIT_IDLE_TINT,
        boxShadow: open
          ? `inset 4px 0 0 0 ${STAMP}, 0 2px 8px rgba(46,39,28,0.08)`
          : 'none',
        opacity: dimOthers ? 0.58 : 1,
      }}
    >
      <div
        className="flex items-start justify-between gap-2 px-3 py-2.5"
        style={{
          borderBottom: open ? `1px dashed ${RULE}` : 'none',
          background: open ? EDIT_FOCUS_TINT : 'transparent',
        }}
      >
        <button
          type="button"
          className="min-w-0 flex-1 text-left"
          aria-expanded={open}
          onClick={onToggle}
        >
          <div className="flex flex-wrap items-center gap-2">
            <p
              className="font-mono text-[9px] uppercase tracking-[0.18em]"
              style={{ color: open ? STAMP : MIST, fontFamily: MONO }}
            >
              {open ? `EDIT · ${kicker}` : kicker}
            </p>
            {lane ? <LaneBadge lane={lane} /> : null}
          </div>
          <div className="mt-1 flex items-center gap-2">
            <p
              className="min-w-0 flex-1 text-[15px] font-semibold tracking-tight"
              style={{ color: INK, fontFamily: SANS }}
            >
              {title}
            </p>
            <span
              className="flex size-6 shrink-0 items-center justify-center"
              style={{
                border: BORDER_SOFT,
                borderRadius: 2,
                background: open ? INK : CARD,
              }}
              aria-hidden
            >
              <ChevronDown
                className="size-3.5 transition-transform"
                style={{
                  color: open ? CARD : MIST,
                  transform: open ? 'rotate(0deg)' : 'rotate(-90deg)',
                }}
                strokeWidth={2}
              />
            </span>
          </div>
          {open && hint ? (
            <p className="mt-1.5 text-[11px] leading-relaxed" style={{ color: MIST, fontFamily: SANS }}>
              {hint}
            </p>
          ) : null}
          {!open && summary ? (
            <p className="mt-1 font-mono text-[10px] tabular-nums" style={{ color: MIST, fontFamily: MONO }}>
              {summary}
            </p>
          ) : null}
        </button>
        {open && extra ? <div className="shrink-0 pt-5">{extra}</div> : null}
      </div>
      {open ? (
        <div className="space-y-2.5 px-3 pb-3.5 pt-2.5" style={{ background: EDIT_OPEN_BODY }}>
          {children}
        </div>
      ) : null}
    </section>
  )
}

function InnerPad({ children }: { children: ReactNode }) {
  return (
    <div
      className="life-ledger-item space-y-1.5 rounded-sm px-2.5 py-2.5 transition-[background,box-shadow,border-color] duration-150"
      style={{
        border: `1.5px solid rgba(46,39,28,0.18)`,
        background: 'rgba(255,255,255,0.85)',
        borderRadius: 6,
      }}
    >
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
      className="relative"
      style={{
        background: BG,
        fontFamily: SANS,
      }}
      {...{ [LIFE_LEDGER_COACH_ROOT_ATTR]: LIFE_LEDGER_COACH_SCOPE }}
    >
      <LifeLedgerEditFocusStyles />
      <div
        className="sticky top-0 z-10 flex items-center justify-between gap-2 px-4 py-2"
        style={{
          background: 'rgba(243,236,221,0.96)',
          backdropFilter: 'blur(8px)',
          borderBottom: BORDER,
        }}
      >
        <span
          className="min-w-0 truncate font-mono text-[9px] tracking-[0.16em]"
          style={{ color: MIST, fontFamily: MONO }}
        >
          FORM W-01 · LL-{fileNo}
        </span>
        <div className="flex shrink-0 items-center gap-1.5">{tutorialSlot}</div>
      </div>
      <div className="px-3 pb-5 pt-3 sm:px-4">{children}</div>
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
    <div className="flex" style={{ borderBottom: BORDER }}>
      {(
        [
          { id: 'preview' as const, label: '预览', en: '01 VIEW' },
          { id: 'edit' as const, label: '编辑', en: '02 EDIT' },
        ] as const
      ).map((t) => {
        const on = mode === t.id
        return (
          <button
            key={t.id}
            type="button"
            className="relative min-w-0 flex-1 truncate px-3 py-2.5 text-center"
            style={{
              background: 'transparent',
              color: on ? INK : MIST,
            }}
            onClick={() => onChange(t.id)}
          >
            <span
              className="block font-mono text-[9px] tracking-[0.14em]"
              style={{ fontFamily: MONO, fontWeight: on ? 800 : 500 }}
            >
              {t.en}
            </span>
            <span
              className="mt-0.5 block text-[13px]"
              style={{ fontFamily: SANS, fontWeight: on ? 700 : 500 }}
            >
              {t.label}
            </span>
            {on ? (
              <span
                className="pointer-events-none absolute inset-x-3 bottom-0"
                style={{ height: 2, background: INK }}
                aria-hidden
              />
            ) : null}
          </button>
        )
      })}
    </div>
  )
}

function FactLine({
  zh,
  code,
  value,
  empty = '—',
}: {
  /** 主标签：粗体中文，可读 */
  zh: string
  /** 英文装饰码，弱化展示 */
  code: string
  value?: string | null
  empty?: string
}) {
  const text = (value ?? '').trim()
  return (
    <div className="flex min-w-0 items-start gap-2.5 py-1">
      <div className="w-[3.25rem] shrink-0 pt-0.5">
        <span
          className="block text-[13px] font-bold leading-none tracking-wide"
          style={{ color: INK, fontFamily: FANGSONG }}
        >
          {zh}
        </span>
        <span
          className="mt-0.5 block font-mono text-[7.5px] uppercase leading-none tracking-[0.12em]"
          style={{ color: MIST, fontFamily: MONO }}
          aria-hidden
        >
          {code}
        </span>
      </div>
      <span
        className="min-w-0 flex-1 text-[13px] leading-snug"
        style={{ color: text ? INK : 'rgba(42,38,32,0.28)', fontFamily: FANGSONG }}
      >
        {text || empty}
      </span>
    </div>
  )
}

/** 档案袋文件夹：点击封面展开内页 */
function PreviewSection({
  title,
  en,
  count,
  icon: Icon,
  children,
  empty,
  defaultOpen = false,
}: {
  title: string
  en?: string
  count?: number
  icon?: LucideIcon
  children: ReactNode
  empty?: string
  defaultOpen?: boolean
  /** @deprecated */
  tape?: boolean
  /** @deprecated */
  clip?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  const hasKids = !(empty && count === 0)
  return (
    <section className="relative pt-3">
      {/* 叠纸厚度（收起时更明显） */}
      <div
        className="pointer-events-none absolute inset-x-[5px] top-[14px] bottom-[-3px]"
        style={{
          background: '#E8E8E4',
          border: BORDER_SOFT,
          borderRadius: RADIUS,
          opacity: open ? 0.35 : 0.9,
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-[2px] top-[13px] bottom-[-1.5px]"
        style={{
          background: '#F2F2EF',
          border: BORDER_SOFT,
          borderRadius: RADIUS,
          opacity: open ? 0.45 : 1,
        }}
        aria-hidden
      />

      <div className="relative z-[1]">
        {/* 吊耳标签 */}
        <div
          className="pointer-events-none absolute -top-[2px] left-3 z-[2] h-[13px] w-[72px]"
          style={{
            backgroundColor: CARD_PAPER,
            backgroundImage: CARD_PAPER_BG,
            backgroundSize: '160px 160px, 6px 6px, auto',
            border: BORDER,
            borderBottom: 'none',
            borderRadius: '3px 10px 0 0',
            clipPath: 'polygon(0 100%, 0 22%, 10% 0, 88% 0, 100% 28%, 100% 100%)',
          }}
          aria-hidden
        />

        <button
          type="button"
          className="flex w-full items-center gap-2.5 px-3.5 py-3 text-left active:opacity-95"
          style={{
            ...cardPaperStyle,
            border: BORDER,
            borderRadius: open ? `${RADIUS}px ${RADIUS}px 0 0` : RADIUS,
          }}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {/* 左侧文件夹色条 */}
          <span
            className="h-9 w-[3px] shrink-0 self-stretch"
            style={{ background: open ? STAMP : INK, minHeight: 28 }}
            aria-hidden
          />
          {Icon ? (
            <span
              className="flex size-8 shrink-0 items-center justify-center"
              style={{
                border: BORDER_SOFT,
                borderRadius: 2,
                background: open ? 'rgba(46,39,28,0.06)' : 'rgba(255,255,255,0.7)',
              }}
              aria-hidden
            >
              <Icon className="size-[15px]" style={{ color: INK }} strokeWidth={1.75} />
            </span>
          ) : null}
          <div className="min-w-0 flex-1">
            {en ? (
              <span
                className="block font-mono text-[8px] uppercase tracking-[0.16em]"
                style={{ color: MIST, fontFamily: MONO }}
              >
                {en}
              </span>
            ) : null}
            <p
              className="mt-0.5 truncate text-[14px] font-bold leading-tight"
              style={{ color: INK, fontFamily: FANGSONG }}
            >
              {title}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {typeof count === 'number' ? (
              <span
                className="px-1.5 py-0.5 font-mono text-[10px] tabular-nums"
                style={{
                  color: INK,
                  fontFamily: MONO,
                  border: BORDER_SOFT,
                  borderRadius: 2,
                  background: 'rgba(255,255,255,0.55)',
                }}
              >
                {String(count).padStart(2, '0')}
              </span>
            ) : (
              <span
                className="font-mono text-[8px] tracking-[0.12em]"
                style={{ color: MIST, fontFamily: MONO }}
              >
                FILE
              </span>
            )}
            <span
              className="flex size-6 items-center justify-center"
              style={{
                border: BORDER_SOFT,
                borderRadius: 2,
                background: open ? INK : 'rgba(255,255,255,0.6)',
              }}
              aria-hidden
            >
              <ChevronDown
                className="size-3.5 transition-transform"
                style={{
                  color: open ? CARD : INK,
                  transform: open ? 'rotate(0deg)' : 'rotate(-90deg)',
                }}
                strokeWidth={2}
              />
            </span>
          </div>
        </button>

        {open ? (
          <div
            className="overflow-hidden px-3 pb-3 pt-2.5"
            style={{
              ...cardPaperStyle,
              border: BORDER,
              borderTop: `1px dashed ${RULE}`,
              borderRadius: `0 0 ${RADIUS}px ${RADIUS}px`,
            }}
          >
            <p
              className="mb-2 font-mono text-[7.5px] uppercase tracking-[0.18em]"
              style={{ color: MIST, fontFamily: MONO }}
            >
              {open ? 'OPEN · 袋内档案' : ''}
            </p>
            {hasKids ? (
              <div className="space-y-2.5">{children}</div>
            ) : (
              <p className="py-2 text-[12px]" style={{ color: MIST, fontFamily: FANGSONG }}>
                {empty || '（空袋）'}
              </p>
            )}
          </div>
        ) : null}
      </div>
    </section>
  )
}

/** 统一数据卡片：白底 + 金棕描边 + 倾斜印章标签 + MEMO 行 */
function DossierRow({
  title,
  sub,
  stamp,
  stamps,
  meta,
  memo,
  clip,
}: {
  mark?: string
  title: string
  sub?: string
  stamp?: string
  stamps?: string[]
  meta: string[]
  memo?: string
  /** 整页点睛：仅少数卡片传 true */
  clip?: boolean
}) {
  const stampList = [...(stamps ?? []), ...(stamp ? [stamp] : [])].filter(Boolean)
  const primaryStamp = stampList[0]
  const extraStamps = stampList.slice(1)
  return (
    <div
      className="relative overflow-hidden"
      style={{
        ...cardPaperStyle,
        border: BORDER,
        borderRadius: RADIUS,
        padding: '13px 14px',
      }}
    >
      {clip ? <Paperclip className="-left-1.5 -top-2" /> : null}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-bold leading-tight" style={{ color: INK, fontFamily: FANGSONG }}>
            {title}
          </p>
          {sub ? (
            <p className="mt-0.5 font-mono text-[9px] tracking-[0.1em]" style={{ color: MIST, fontFamily: MONO }}>
              {sub}
            </p>
          ) : null}
        </div>
        {primaryStamp ? <Stamp rotate={-2}>{primaryStamp}</Stamp> : null}
      </div>
      {extraStamps.length ? (
        <div className="mt-1.5 flex flex-wrap justify-end gap-1">
          {extraStamps.map((s, i) => (
            <Stamp key={`${s}-${i}`} rotate={-1.5 + i}>
              {s}
            </Stamp>
          ))}
        </div>
      ) : null}
      {meta.length ? (
        <p
          className="mt-2 font-mono text-[10px] leading-[1.7] tracking-[0.02em]"
          style={{ color: MIST, fontFamily: MONO }}
        >
          {meta.join('  ·  ')}
        </p>
      ) : null}
      {memo ? (
        <>
          <div className="my-2.5 h-px w-full" style={{ background: RULE }} />
          <p className="text-[12px] leading-relaxed" style={{ color: MIST, fontFamily: FANGSONG }}>
            <span className="font-semibold" style={{ color: DARK }}>
              MEMO ·{' '}
            </span>
            {memo}
          </p>
        </>
      ) : null}
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
    <section className="mt-3" {...{ [LIFE_LEDGER_COACH_TARGET_ATTR]: 'ledger-align' }}>
      <div className="flex items-baseline justify-between gap-2">
        <p
          className="font-mono text-[8px] uppercase tracking-[0.18em]"
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
        className="mt-2 flex w-full items-center justify-between gap-3 px-3.5 py-3 text-left disabled:opacity-55"
        disabled={busy}
        style={{
          border: BORDER,
          background: CARD,
          color: INK,
          borderRadius: RADIUS,
        }}
        onClick={onAlign}
      >
        <span className="min-w-0">
          <span className="block text-[13px] font-semibold" style={{ fontFamily: SANS }}>
            {busy ? '对齐进行中…' : hasPlayer ? '按记忆对齐 · 角色 + 玩家' : '按记忆对齐当前'}
          </span>
          <span className="mt-0.5 block text-[10.5px] leading-relaxed" style={{ color: MIST, fontFamily: SANS }}>
            {hasPlayer
              ? '一次补齐双方；可填对齐要求；删掉的条目会按证据尽量补回。不读长期记忆。'
              : '可填对齐要求；补齐职业/住所/车产/家庭/社交圈；删项会按证据补回。不读长期记忆。'}
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
          style={{ color: DARK, fontFamily: MONO }}
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
  wechatAvatarUrl,
}: {
  sheet: LifeMutableSheet
  currentAge: number | null
  edu: string
  spanText: string
  elapsedYears: number | null
  cardAge: number | null
  wechatAvatarUrl?: string | null
}) {
  const genderText =
    sheet.gender === '' ? '沿用人设卡' : genderLabelZh(sheet.gender as Gender)
  const trackZh = TRACKS.find((t) => t.id === sheet.educationTrack)?.zh || '未设定'
  const displayName = sheet.name.trim() || '（沿用人设卡姓名）'
  const avatarSrc = resolveLifeLedgerAvatarSrc(sheet.ledgerAvatar, wechatAvatarUrl)
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
    <div>
      {/* 概览焦点：一张身份卡 + 签名；纸张纹理底 */}
      <section
        className="relative overflow-hidden pb-1"
        style={{
          ...cardPaperStyle,
          border: BORDER,
          borderRadius: RADIUS,
          padding: '16px 14px 14px',
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <div
              className="shrink-0 overflow-hidden"
              style={{ width: 52, height: 52, border: BORDER, borderRadius: 2 }}
            >
              <img
                src={avatarSrc}
                alt=""
                className="size-full object-cover"
                onError={(e) => {
                  e.currentTarget.src =
                    resolveCharacterAvatarUrl({ avatarUrl: DEFAULT_PUBLIC_AVATAR_PATH }) || avatarSrc
                }}
              />
            </div>
            <div className="min-w-0 flex-1">
              <p
                className="truncate text-[22px] font-bold leading-none tracking-tight"
                style={{ color: INK, fontFamily: FANGSONG }}
              >
                {displayName}
              </p>
              <p className="mt-1.5 text-[12px]" style={{ color: MIST, fontFamily: FANGSONG }}>
                {genderText}
                {sheet.genderChangeNote.trim() ? ` · ${sheet.genderChangeNote.trim()}` : ''}
              </p>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <p
              className="font-mono text-[26px] font-semibold tabular-nums leading-none"
              style={{ color: DARK, fontFamily: MONO }}
            >
              {currentAge != null ? currentAge : '—'}
            </p>
            <p
              className="mt-1 text-[10px] font-bold leading-none"
              style={{ color: MIST, fontFamily: FANGSONG }}
            >
              现在年龄
            </p>
            <p
              className="mt-0.5 font-mono text-[7px] tracking-[0.14em]"
              style={{ color: MIST, fontFamily: MONO }}
              aria-hidden
            >
              AGE · NOW
            </p>
          </div>
        </div>

        <div className="mt-3 space-y-0.5" style={{ borderTop: `1px solid ${RULE}`, paddingTop: 10 }}>
          <FactLine zh="职业" code="OCCUPATION" value={job} />
          <FactLine zh="感情" code="RELATION" value={heart} />
          <FactLine zh="学历" code="EDU" value={edu || sheet.educationNote || '未填'} />
          <FactLine zh="住所" code="RESIDENCE" value={primaryPlaceText} empty="住所未填" />
          <FactLine zh="存款" code="SAVINGS" value={money} />
          <div className="flex min-w-0 items-start gap-2.5 py-1">
            <div className="w-[3.25rem] shrink-0 pt-0.5">
              <span
                className="block text-[13px] font-bold leading-none tracking-wide"
                style={{ color: INK, fontFamily: FANGSONG }}
              >
                跨度
              </span>
              <span
                className="mt-0.5 block font-mono text-[7.5px] uppercase leading-none tracking-[0.12em]"
                style={{ color: MIST, fontFamily: MONO }}
                aria-hidden
              >
                TIMELINE
              </span>
            </div>
            <span
              className="min-w-0 flex-1 text-[13px] leading-snug tabular-nums"
              style={{ color: INK, fontFamily: FANGSONG }}
            >
              {spanText}
              {elapsedYears != null ? ` · +${elapsedYears}年` : ''}
            </span>
          </div>
        </div>
        <SignatureLine name={displayName} />
      </section>

      <div className="mb-1 mt-5 flex items-end justify-between gap-2 px-0.5">
        <div>
          <p
            className="text-[13px] font-bold leading-none"
            style={{ color: INK, fontFamily: FANGSONG }}
          >
            档案袋
          </p>
          <p
            className="mt-1 font-mono text-[8px] uppercase tracking-[0.16em]"
            style={{ color: MIST, fontFamily: MONO }}
          >
            FILE FOLDERS · TAP TO OPEN
          </p>
        </div>
        <p className="font-mono text-[8px] tracking-[0.12em]" style={{ color: MIST, fontFamily: MONO }}>
          点击展开
        </p>
      </div>

      <PreviewSection title="开篇锚点" en="START ANCHOR" icon={Anchor}>
        <div
          className="overflow-hidden"
          style={{
            ...cardPaperStyle,
            border: BORDER,
            borderRadius: RADIUS,
            padding: '13px 14px',
          }}
        >
          <div className="mb-2">
            <LaneBadge lane="start" />
          </div>
          <FactLine
            zh="开篇日"
            code="START DAY"
            value={sheet.storyStartDay.trim() || '未填（用人设/记忆最早日）'}
          />
          <FactLine zh="开篇岁" code="AGE@START" value={startAgeText} />
          <FactLine zh="学历轨" code="EDU TRACK" value={trackZh} />
          {sheet.educationGradeAtStart != null ? (
            <FactLine zh="开篇档" code="GRADE" value={`第 ${sheet.educationGradeAtStart} 档`} />
          ) : null}
        </div>
      </PreviewSection>

      <PreviewSection title="可去住所" en="PLACES" icon={Home} count={sheet.realEstates.length} empty="暂无（学生可列宿舍+自家）">
        {sheet.realEstates.map((h) => {
          const kind = lifePlaceKindLabel(h.placeKind)
          const title = h.label.trim() || kind || '未命名地点'
          const valueLabel = h.valueWan.trim() ? `价值 ${h.valueWan.trim()} 万` : ''
          return (
            <DossierRow
              key={h.id}
              title={title}
              sub={kind && title !== kind ? kind : undefined}
              stamps={[valueLabel, h.ownedBySubject ? 'OWNED' : 'NOT OWNED'].filter(Boolean)}
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

      <PreviewSection title="车产" en="VEHICLE" icon={Car} count={sheet.vehicles.length} empty="暂无车产">
        {sheet.vehicles.map((v) => (
          <DossierRow
            key={v.id}
            title={v.model.trim() || '型号未填'}
            stamps={v.valueWan.trim() ? [`价值 ${v.valueWan.trim()} 万`] : undefined}
            meta={
              [
                v.boughtAt && `ACQ. ${v.boughtAt}`,
                payZh(v.payKind) && `PAY. ${payZh(v.payKind)}`,
              ].filter(Boolean) as string[]
            }
            memo={v.note.trim() || undefined}
          />
        ))}
      </PreviewSection>

      <PreviewSection title="家庭成员" en="FAMILY" icon={Users} count={sheet.family.length} empty="暂无家庭成员">
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

      <PreviewSection title="社交圈" en="SOCIAL" icon={UsersRound} count={sheet.socialCircle.length} empty="暂无社交圈">
        {sheet.socialCircle.map((c) => {
          const ageNow = c.age.trim()
          const ageStart = c.ageAtStart.trim()
          const relation = c.relation.trim()
          const attitude = c.attitude.trim()
          const note = c.note.trim()
          const relLen = [...relation].length
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

      <PreviewSection title="宠物" en="PETS" icon={PawPrint} count={sheet.pets.length} empty="暂无宠物">
        {sheet.pets.map((p) => (
          <DossierRow
            key={p.id}
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
        <PreviewSection title="其他补充" en="NOTES" icon={StickyNote}>
          <div
            className="overflow-hidden"
            style={{
              ...cardPaperStyle,
              border: BORDER,
              borderRadius: RADIUS,
              padding: '13px 14px',
            }}
          >
            <p className="whitespace-pre-wrap text-[12.5px] leading-relaxed" style={{ color: MIST, fontFamily: FANGSONG }}>
              <span className="font-semibold" style={{ color: DARK }}>
                MEMO ·{' '}
              </span>
              {sheet.extraNote}
            </p>
          </div>
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
  wechatAvatarUrl,
}: {
  sheet: LifeMutableSheet
  onChange: (next: LifeMutableSheet) => void
  cardAge: number | null
  birthdayMD: string
  startDay: string | null
  nowDay: string | null
  wechatAvatarUrl?: string | null
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
          wechatAvatarUrl={wechatAvatarUrl}
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

      <LedgerAccordionProvider>
      <LedgerCard
        kicker="COVER"
        title="封面速览 · 年龄对齐"
        lane="now"
        tape
        defaultOpen
        hint="现在几岁、学历进度与时间跨度；可用下方按钮把人设卡年龄对齐到开篇或现在。"
        summary={
          currentAge != null
            ? `现在 ${currentAge} 岁${edu ? ` · ${edu}` : ''}`
            : edu || '待填开篇年龄'
        }
      >
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold" style={{ color: MIST, fontFamily: FANGSONG }}>
              现在年龄
            </p>
            <p
              className="mt-0.5 font-mono text-[28px] font-semibold tabular-nums tracking-tight"
              style={{ color: DARK, fontFamily: MONO }}
            >
              {currentAge != null ? `${currentAge}` : '—'}
            </p>
            <p
              className="mt-0.5 font-mono text-[7px] tracking-[0.14em]"
              style={{ color: MIST, fontFamily: MONO }}
              aria-hidden
            >
              AGE · NOW
            </p>
          </div>
          <div className="min-w-0 text-right">
            <p className="truncate text-[12px] font-medium" style={{ color: INK, fontFamily: FANGSONG }}>
              {edu || (currentAge == null ? '填开篇年龄后显示' : '学历进度未填')}
            </p>
            <p
              className="mt-0.5 truncate text-[10px] tabular-nums"
              style={{ color: MIST, fontFamily: FANGSONG }}
            >
              {spanText}
              {elapsedYears != null ? ` · +${elapsedYears}年` : ''}
            </p>
          </div>
        </div>
        {alignAnchor ? (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              className="px-2.5 py-2.5 text-left disabled:opacity-55"
              style={{ background: INK, color: CARD, borderRadius: RADIUS }}
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
              style={{ border: BORDER, background: CARD, color: INK, borderRadius: RADIUS }}
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
        tape
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
        tape
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
        tape
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
                valueWan: '',
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
                valueWan: '',
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
        tape
        clip
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
        clip
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
        <div
          className="life-ledger-field"
          style={{
            background: CARD,
            border: BORDER,
            borderRadius: RADIUS,
            padding: '10px 12px',
          }}
        >
          <textarea
            className={`${inputCls} resize-none`}
            style={{
              color: INK,
              fontFamily: SANS,
              caretColor: STAMP,
              minHeight: 72,
              border: 'none',
              borderBottom: 'none',
            }}
            value={sheet.extraNote}
            onChange={(e) => patch({ extraNote: e.target.value })}
            placeholder="其他会变的人生事实…"
          />
        </div>
      </LedgerCard>
      </LedgerAccordionProvider>
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
  tape,
  clip,
  children,
}: {
  kicker: string
  title: string
  hint?: string
  lane?: 'now' | 'start'
  count?: number
  onAdd: () => void
  tape?: boolean
  clip?: boolean
  children: ReactNode
}) {
  return (
    <LedgerCard
      kicker={kicker}
      title={title}
      hint={hint}
      lane={lane}
      tape={tape}
      clip={clip}
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
            background: INK,
            color: CARD,
            fontFamily: MONO,
            borderRadius: 2,
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
      <input
        className={inputCls}
        style={inputStyle}
        placeholder="价值（万元）"
        inputMode="decimal"
        value={item.valueWan}
        onChange={(e) => onChange({ ...item, valueWan: e.target.value })}
      />
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
      <input
        className={inputCls}
        style={inputStyle}
        placeholder="价值（万元）"
        inputMode="decimal"
        value={item.valueWan}
        onChange={(e) => onChange({ ...item, valueWan: e.target.value })}
      />
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
  onCoalescedHistory?: (s: LifeMutableSheet) => void,
) {
  const timer = useRef<number | null>(null)
  const first = useRef(true)
  const lastPersisted = useRef<LifeMutableSheet | null>(null)
  useEffect(() => {
    first.current = true
    lastPersisted.current = null
  }, [save])
  useEffect(() => {
    if (!sheet) return
    if (first.current) {
      first.current = false
      lastPersisted.current = sheet
      return
    }
    if (timer.current) window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      void (async () => {
        const prev = lastPersisted.current
        let toSave = sheet
        if (prev && !lifeSheetContentEqual(prev, sheet)) {
          const latest = sheet.changeHistory?.[0]
          const recentlyRecorded =
            !!latest &&
            Date.now() - latest.at < 8000 &&
            (latest.source === 'align' || latest.source === 'inline' || latest.source === 'sync_circle')
          if (!recentlyRecorded) {
            toSave = appendOrCoalesceManualHistory(prev, sheet)
            if (toSave.changeHistory !== sheet.changeHistory) onCoalescedHistory?.(toSave)
          }
        }
        await save(toSave)
        lastPersisted.current = toSave
      })()
    }, 450)
    return () => {
      if (timer.current) window.clearTimeout(timer.current)
    }
  }, [sheet, save, onCoalescedHistory])
}

function formatLifeHistoryTime(at: number): string {
  try {
    return new Date(at).toLocaleString('zh-CN', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

function LifeHistoryDiffLine({ diff }: { diff: LifeFieldDiff }) {
  const pair = formatLifeHistoryDiffPair(diff.previousText || '（空）', diff.currentText || '（空）')
  return (
    <div
      className="overflow-hidden"
      style={{ border: BORDER, background: CARD, borderRadius: RADIUS }}
    >
      <div className="px-2.5 py-1.5" style={{ borderBottom: BORDER_SOFT, background: 'rgba(255,255,255,0.7)' }}>
        <p className="text-[12px] font-semibold" style={{ color: STAMP, fontFamily: SANS }}>
          {diff.label}
        </p>
      </div>
      <div className="px-2.5 py-2" style={{ borderBottom: BORDER_SOFT }}>
        <p className="mb-0.5 font-mono text-[8px] tracking-[0.14em]" style={{ color: MIST, fontFamily: MONO }}>
          原先
        </p>
        <p className="whitespace-pre-wrap break-words text-[11px] leading-relaxed" style={{ color: MIST, fontFamily: SANS }}>
          {pair.previousText}
        </p>
      </div>
      <div className="px-2.5 py-2" style={{ background: 'rgba(201,87,79,0.06)' }}>
        <p className="mb-0.5 font-mono text-[8px] tracking-[0.14em]" style={{ color: STAMP, fontFamily: MONO }}>
          现在
        </p>
        <p className="whitespace-pre-wrap break-words text-[11px] leading-relaxed" style={{ color: INK, fontFamily: SANS }}>
          {pair.currentText}
        </p>
      </div>
    </div>
  )
}

function LifeHistoryPanel({
  open,
  onClose,
  title,
  events,
}: {
  open: boolean
  onClose: () => void
  title: string
  events: LifeChangeEvent[]
}) {
  const [expandedId, setExpandedId] = useState<string | null>(events[0]?.id ?? null)
  useEffect(() => {
    if (open) setExpandedId(events[0]?.id ?? null)
  }, [open, events])

  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-[62600] flex items-end justify-center sm:items-center"
      style={{ background: 'rgba(18,20,26,0.42)' }}
      role="presentation"
      onClick={onClose}
    >
      <div
        className="flex max-h-[86vh] w-full max-w-[420px] flex-col overflow-hidden"
        style={{
          background: PAPER,
          border: BORDER,
          borderRadius: RADIUS,
          boxShadow: '0 12px 40px rgba(18,20,26,0.18)',
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="life-history-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex shrink-0 items-center gap-2 px-4 py-3"
          style={{ borderBottom: BORDER }}
        >
          <History className="size-4 shrink-0" style={{ color: INK }} strokeWidth={1.6} />
          <div className="min-w-0 flex-1">
            <p
              id="life-history-title"
              className="text-[15px] font-semibold tracking-wide"
              style={{ color: INK, fontFamily: SANS }}
            >
              变更历史
            </p>
            <p className="mt-0.5 font-mono text-[9px] tracking-[0.14em]" style={{ color: MIST, fontFamily: MONO }}>
              {title} · REVISION LOG
            </p>
          </div>
          <button
            type="button"
            className="px-3 py-1.5 text-[12px] font-medium active:opacity-80"
            style={{ color: INK, border: BORDER, borderRadius: 2 }}
            onClick={onClose}
          >
            关闭
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {events.length === 0 ? (
            <div className="px-2 py-10 text-center">
              <History className="mx-auto mb-3 size-7" style={{ color: MIST }} strokeWidth={1.4} />
              <p className="text-[13px]" style={{ color: INK, fontFamily: SANS }}>
                还没有变更记录
              </p>
              <p className="mt-1.5 text-[12px] leading-relaxed" style={{ color: MIST, fontFamily: SANS }}>
                按记忆对齐、同请求同步或手动改字段后，这里会出现新旧对照。
              </p>
            </div>
          ) : (
            <ul className="space-y-2.5">
              {events.map((ev, index) => {
                const openRow = expandedId === ev.id
                return (
                  <li
                    key={ev.id}
                    className="overflow-hidden"
                    style={{ border: BORDER, background: CARD, borderRadius: RADIUS }}
                  >
                    <button
                      type="button"
                      className="flex w-full items-start gap-2 px-3 py-3 text-left active:opacity-95"
                      onClick={() => setExpandedId(openRow ? null : ev.id)}
                      aria-expanded={openRow}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className="px-2 py-0.5 font-mono text-[10px] font-medium tabular-nums"
                            style={{
                              color: INK,
                              background: CARD,
                              border: BORDER_SOFT,
                              borderRadius: 2,
                              fontFamily: MONO,
                            }}
                          >
                            {formatLifeHistoryTime(ev.at)}
                          </span>
                          <span
                            className="px-1.5 py-0.5 text-[9px] font-semibold tracking-wide"
                            style={{
                              color: STAMP,
                              border: `1.5px solid ${STAMP}`,
                              borderRadius: 2,
                              fontFamily: MONO,
                            }}
                          >
                            {lifeChangeSourceLabel(ev.source)}
                          </span>
                          {index === 0 ? (
                            <span className="text-[9px] font-semibold" style={{ color: STAMP }}>
                              最近
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1.5 text-[13px] leading-snug" style={{ color: INK, fontFamily: SANS }}>
                          {ev.summary}
                        </p>
                        <p className="mt-1 text-[11px]" style={{ color: MIST }}>
                          {ev.diffs.length > 0 ? `${ev.diffs.length} 处字段变更` : '无字段明细'}
                        </p>
                      </div>
                      <ChevronDown
                        className="mt-1 size-4 shrink-0 transition-transform"
                        style={{
                          color: INK,
                          transform: openRow ? 'rotate(180deg)' : undefined,
                        }}
                        strokeWidth={1.8}
                      />
                    </button>
                    {openRow && ev.diffs.length > 0 ? (
                      <div className="space-y-2 px-3 pb-3" style={{ borderTop: BORDER_SOFT }}>
                        <p className="pt-2.5 font-mono text-[9px] tracking-[0.14em]" style={{ color: MIST, fontFamily: MONO }}>
                          FIELD DIFF
                        </p>
                        {ev.diffs.map((d) => (
                          <LifeHistoryDiffLine key={`${ev.id}-${d.path}-${d.label}`} diff={d} />
                        ))}
                      </div>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
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
  /** 对齐弹窗：用户额外要求（本会话内保留，便于删改后再次对齐） */
  const [alignUserNotes, setAlignUserNotes] = useState('')
  const [historyOpen, setHistoryOpen] = useState(false)
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
  useDebouncedSheetSave(charSheet, saveChar, setCharSheet)
  useDebouncedSheetSave(playerSheet, savePlayer, setPlayerSheet)

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
    const changedItems: LifeLedgerChangedItem[] = []
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

      const applyAlignJobResult = (
        label: string,
        result: Awaited<ReturnType<typeof runLifeAlignFromMemory>>,
        beforeSheet: LifeMutableSheet | null | undefined,
      ) => {
        if (result.status === 'updated') {
          if (beforeSheet) {
            const items = lifeFieldDiffsToChangedItems(
              buildLifeSheetDiffs(beforeSheet, result.sheet),
              label,
            )
            for (const it of items) {
              if (!changedItems.some((x) => x.label === it.label && x.currentText === it.currentText)) {
                changedItems.push(it)
              }
              if (!changedLabels.includes(it.label)) changedLabels.push(it.label)
            }
          }
          if (label === '玩家') {
            workingPlayer = result.sheet
            setPlayerSheet(result.sheet)
          } else {
            workingChar = result.sheet
            setCharSheet(result.sheet)
          }
          anyUpdated = true
          for (const c of result.changed) {
            const tag = `${label}·${c}`
            if (!changedLabels.includes(tag)) changedLabels.push(tag)
          }
          parts.push(`${label}已对齐：${result.changed.join('、')}`)
        } else if (result.status === 'no_change') {
          parts.push(
            `${label}已一致（当前剧情跨度 ${freshSpan.startDay || '？'} → ${freshSpan.nowDay || '？'}）`,
          )
        } else {
          parts.push(`${label}失败：${result.reason || '对齐失败'}`)
        }
      }

      if (workingChar && freshBound?.id && workingPlayer) {
        if (ctrl.signal.aborted) {
          /* skip */
        } else {
          setAlignFeedback('正在一次请求对齐角色与玩家…')
          const beforeChar = workingChar
          const beforePlayer = workingPlayer
          const pairResult = await runLifeAlignPairFromMemory({
            character,
            boundPlayer: freshBound,
            characterSheet: workingChar,
            playerSheet: workingPlayer,
            span: freshSpan,
            apiConfig,
            userAlignNotes: alignUserNotes,
            signal: ctrl.signal,
            onProgress: (_stage, detail) => setAlignFeedback(detail),
          })
          applyAlignJobResult('角色', pairResult.character, beforeChar)
          applyAlignJobResult('玩家', pairResult.player, beforePlayer)
        }
      } else {
        for (const job of jobs) {
          if (ctrl.signal.aborted) break
          setAlignFeedback(`正在对齐${job.label}…`)
          const counterpart =
            job.subject === 'character' ? workingPlayer : workingChar
          const beforeSheet =
            job.subject === 'character' ? workingChar : workingPlayer
          const result = await runLifeAlignFromMemory({
            character,
            boundPlayer: freshBound,
            subject: job.subject,
            sheet: job.subject === 'character' ? workingChar! : workingPlayer!,
            span: freshSpan,
            counterpartSheet: counterpart,
            apiConfig,
            userAlignNotes: alignUserNotes,
            signal: ctrl.signal,
            onProgress: (_stage, detail) => setAlignFeedback(`${job.label}：${detail}`),
          })
          applyAlignJobResult(job.label, result, beforeSheet)
        }
      }
      // 双方都有账本时：强制同步同名共同好友的学校/职业/住址等客观事实
      if (workingChar && workingPlayer && freshBound?.id) {
        const beforeChar = workingChar
        const beforePlayer = workingPlayer
        const synced = syncSharedSocialCircleBetweenSheets(workingChar, workingPlayer)
        if (synced.syncedNames.length) {
          workingChar = appendLifeChangeHistory(synced.character, {
            before: beforeChar,
            summary: `共同社交圈 · ${synced.syncedNames.slice(0, 6).join('、')}`,
            source: 'sync_circle',
          })
          workingPlayer = appendLifeChangeHistory(synced.player, {
            before: beforePlayer,
            summary: `共同社交圈 · ${synced.syncedNames.slice(0, 6).join('、')}`,
            source: 'sync_circle',
          })
          setCharSheet(workingChar)
          setPlayerSheet(workingPlayer)
          await personaDb.putCharacterLifeMutable(character.id, workingChar)
          await personaDb.putPlayerLifeMutable(freshBound.id, character.id, workingPlayer)
          anyUpdated = true
          const circleItems = [
            ...lifeFieldDiffsToChangedItems(buildLifeSheetDiffs(beforeChar, synced.character), '角色'),
            ...lifeFieldDiffsToChangedItems(buildLifeSheetDiffs(beforePlayer, synced.player), '玩家'),
          ]
          for (const it of circleItems) {
            if (!changedItems.some((x) => x.label === it.label && x.currentText === it.currentText)) {
              changedItems.push(it)
            }
            if (!changedLabels.includes(it.label)) changedLabels.push(it.label)
          }
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
                appliedPatchCount: Math.max(1, changedItems.length || changedLabels.length || (anyUpdated ? 1 : 0)),
                changedLabels: anyUpdated ? changedLabels : [],
                changedItems: anyUpdated ? changedItems : [],
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
  }, [alignBusy, alignUserNotes, apiConfig, boundPlayer, character, charSheet, playerSheet])

  const confirmAlign = useCallback(() => {
    if (alignBusy) return
    setAlignConfirmOpen(false)
    void alignCurrentPanel()
  }, [alignBusy, alignCurrentPanel])

  useEffect(() => {
    setAlignFeedback('')
    setAlignUserNotes('')
  }, [character.id])

  const pidName = boundPlayer
    ? formatPlayerIdentityDisplayName(boundPlayer, boundPlayer.id)
    : '未绑定身份卡'
  const fileNo = character.id.slice(0, 8).toUpperCase()
  const activeSheet = panel === 'char' ? charSheet : playerSheet
  const activeWechatAvatar =
    panel === 'char' ? character.avatarUrl : boundPlayer?.avatarUrl
  const patchActiveAvatar = (next: string) => {
    if (panel === 'char') {
      if (!charSheet) return
      setCharSheet({ ...charSheet, ledgerAvatar: next })
      return
    }
    if (!playerSheet) return
    setPlayerSheet({ ...playerSheet, ledgerAvatar: next })
  }

  const body = (
    <>
      {/* 全页唯一强焦点：头像 + LIFE DOSSIER + 档案表 */}
      <header className="mb-4">
        <div className="relative">
          <div
            className="pointer-events-none absolute right-0 top-0 h-[70px] w-[40%]"
            style={{ backgroundImage: HALFTONE_BG, backgroundSize: '10px 10px' }}
            aria-hidden
          />
          <div className="relative flex items-start gap-3">
            {activeSheet ? (
              <LedgerAvatarPicker
                ledgerAvatar={activeSheet.ledgerAvatar}
                wechatAvatarUrl={activeWechatAvatar}
                onChange={patchActiveAvatar}
                size={56}
              />
            ) : (
              <div
                className="flex size-[56px] shrink-0 items-center justify-center"
                style={{ background: INK, clipPath: HEX_CLIP }}
                aria-hidden
              >
                <Shield className="size-[18px]" style={{ color: CARD }} strokeWidth={1.7} />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h2
                className="text-[16px] font-extrabold uppercase leading-[1.15] tracking-[0.02em]"
                style={{ color: INK, fontFamily: SANS }}
              >
                LIFE
                <br />
                DOSSIER
              </h2>
              <p className="mt-0.5 text-[10px] tracking-[0.1em]" style={{ color: MIST, fontFamily: SANS }}>
                人生档案本 · 可变现状登记
              </p>
            </div>
            <div
              className="relative z-[1] shrink-0 overflow-hidden font-mono text-[10px]"
              style={{ border: BORDER, fontFamily: MONO, minWidth: 108 }}
            >
              <div className="grid grid-cols-[auto_1fr]" style={{ borderBottom: BORDER_SOFT }}>
                <span className="px-1.5 py-1" style={{ color: MIST }}>
                  FILE NO.
                </span>
                <span
                  className="px-1.5 py-1 text-right font-semibold"
                  style={{ color: INK, borderLeft: BORDER_SOFT }}
                >
                  LL-{fileNo.slice(0, 4)}
                </span>
              </div>
              <div className="grid grid-cols-[auto_1fr]">
                <span
                  className="px-1.5 py-1"
                  style={{ color: MIST, background: 'rgba(46,39,28,0.06)' }}
                >
                  STATUS
                </span>
                <span
                  className="px-1.5 py-1 text-right font-semibold"
                  style={{
                    color: STAMP,
                    borderLeft: BORDER_SOFT,
                    fontFamily: SERIF,
                  }}
                >
                  {inlineSyncOn ? '同步' : '在档'}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {(
              [
                { label: 'LIFE LEDGER', solid: false },
                { label: 'CONFIDENTIAL', solid: true },
                { label: 'INTERNAL', solid: false },
              ] as const
            ).map((tag) => (
              <span
                key={tag.label}
                className="px-2 py-0.5 font-mono text-[9px] font-semibold tracking-[0.1em]"
                style={{
                  fontFamily: MONO,
                  border: BORDER_SOFT,
                  background: tag.solid ? INK : 'transparent',
                  color: tag.solid ? CARD : INK,
                  borderRadius: 2,
                }}
              >
                {tag.label}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-3" style={{ height: 3, background: INK }} aria-hidden />

        <p className="mt-2.5 text-[11px] leading-relaxed" style={{ color: MIST, fontFamily: SANS }}>
          {passport
            ? '本线当前生理与资产登记。与建档卡分离；每轮对话注入，与世界书同级。'
            : '基础信息仍是开篇固定设定。这里记本线会变的生理与资产。'}
        </p>

        <button
          type="button"
          className="mt-3 flex w-full items-center justify-between gap-3 py-2.5 text-left"
          style={{ borderTop: BORDER_SOFT, color: INK }}
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
            className="relative h-5 w-9 shrink-0 transition-colors"
            style={{ background: inlineSyncOn ? INK : 'rgba(46,39,28,0.2)', borderRadius: 2 }}
            aria-hidden
          >
            <span
              className="absolute top-0.5 size-4 transition-[left]"
              style={{ left: inlineSyncOn ? 18 : 2, background: CARD, borderRadius: 1 }}
            />
          </span>
        </button>

        <SystemOverride
          busy={alignBusy}
          feedback={alignFeedback}
          onAlign={requestAlign}
          hasPlayer={Boolean(boundPlayer?.id)}
        />

        <section className="mt-3">
          <div className="flex items-baseline justify-between gap-2">
            <p className="font-mono text-[8px] uppercase tracking-[0.18em]" style={{ color: MIST, fontFamily: MONO }}>
              REVISION LOG
            </p>
            <p className="font-mono text-[8px] tracking-[0.12em]" style={{ color: MIST, fontFamily: MONO }}>
              {panel === 'char' ? 'CHAR' : 'USER'}
            </p>
          </div>
          <button
            type="button"
            className="mt-2 flex w-full items-center justify-between gap-3 px-3.5 py-3 text-left active:opacity-90"
            style={{
              border: BORDER,
              background: CARD,
              color: INK,
              borderRadius: RADIUS,
            }}
            onClick={() => setHistoryOpen(true)}
            {...{ [LIFE_LEDGER_COACH_TARGET_ATTR]: 'ledger-history' }}
          >
            <span className="min-w-0">
              <span className="flex items-center gap-1.5 text-[13px] font-semibold" style={{ fontFamily: SANS }}>
                <History className="size-3.5 shrink-0" style={{ color: INK }} strokeWidth={1.7} />
                变更历史
              </span>
              <span className="mt-0.5 block text-[10.5px] leading-relaxed" style={{ color: MIST, fontFamily: SANS }}>
                {(() => {
                  const n =
                    (panel === 'char' ? charSheet?.changeHistory : playerSheet?.changeHistory)?.length ?? 0
                  return n > 0
                    ? `当前页签 ${n} 条记录 · 对齐 / 同步 / 手改`
                    : '对齐、同步或手改后会出现新旧对照'
                })()}
              </span>
            </span>
            <span
              className="shrink-0 font-mono text-[10px] tracking-[0.14em]"
              style={{ fontFamily: MONO, color: INK }}
              aria-hidden
            >
              →
            </span>
          </button>
        </section>
      </header>

      <div className="mb-1" {...{ [LIFE_LEDGER_COACH_TARGET_ATTR]: 'ledger-tabs' }}>
        <p
          className="mb-1 font-mono text-[11px] font-semibold tracking-[0.12em]"
          style={{ color: INK, fontFamily: MONO }}
        >
          FILED CONTENTS
        </p>
        <div className="flex" style={{ borderBottom: BORDER }}>
          {(
            [
              { id: 'char' as const, label: '角色本线', en: '01 CHAR' },
              { id: 'player' as const, label: `玩家 · ${pidName}`, en: '02 USER' },
            ] as const
          ).map((tab) => {
            const on = panel === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                className="relative min-w-0 flex-1 truncate px-2 py-2.5 text-center"
                style={{ color: on ? INK : MIST }}
                onClick={() => setPanel(tab.id)}
              >
                <span
                  className="block font-mono text-[10px] tracking-[0.08em]"
                  style={{ fontFamily: MONO, fontWeight: on ? 800 : 500 }}
                >
                  {tab.en}
                </span>
                <span
                  className="mt-0.5 block truncate text-[12px]"
                  style={{ fontFamily: SANS, fontWeight: on ? 700 : 500 }}
                >
                  {tab.label}
                </span>
                {on ? (
                  <span
                    className="pointer-events-none absolute inset-x-2 bottom-0"
                    style={{ height: 2, background: INK }}
                    aria-hidden
                  />
                ) : null}
              </button>
            )
          })}
        </div>
      </div>

      {panel === 'char' && charSheet ? (
        <SheetFields
          sheet={charSheet}
          onChange={setCharSheet}
          cardAge={character.age}
          birthdayMD={character.birthdayMD}
          startDay={span.startDay}
          nowDay={span.nowDay}
          wechatAvatarUrl={character.avatarUrl}
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
            wechatAvatarUrl={boundPlayer.avatarUrl}
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
            className="flex h-8 items-center gap-1 px-2.5 transition-colors"
            style={{
              background: CARD,
              color: INK,
              border: BORDER,
              borderRadius: 2,
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
              background: CARD,
              border: BORDER,
              borderRadius: RADIUS,
              boxShadow: '0 12px 40px rgba(46,39,28,0.14)',
            }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="life-ledger-align-confirm-title"
            onClick={(e) => e.stopPropagation()}
          >
            <p
              id="life-ledger-align-confirm-title"
              className="text-center text-[16px] font-semibold tracking-wide"
              style={{ color: INK, fontFamily: SANS }}
            >
              确认按记忆对齐？
            </p>
            <p
              className="mt-3 text-[13px] leading-relaxed"
              style={{ color: MIST, fontFamily: SANS }}
            >
              {boundPlayer?.id
                ? '将按人设世界书、身份卡与线上私聊/线下剧情近端各 10 轮，一次补齐角色 + 玩家两边账本。近端聊过的感情/住址/升学，以及新家人/人脉/住所/车产等「现在」事实优先写入（可追加）。你删掉的条目会按证据尽量补回。不读向量与长期记忆。'
                : '将按人设世界书、身份卡与线上私聊/线下剧情近端各 10 轮，补齐当前账本。近端「现在」事实优先于旧账本，允许追加新人新房新车；你删掉的条目会按证据尽量补回。不读向量与长期记忆。'}
            </p>
            <label className="mt-4 block">
              <span
                className="block text-[11px] font-medium tracking-wide"
                style={{ color: DARK, fontFamily: SANS }}
              >
                对齐要求（可选）
              </span>
              <textarea
                value={alignUserNotes}
                onChange={(e) => setAlignUserNotes(e.target.value)}
                rows={3}
                maxLength={1200}
                disabled={alignBusy}
                placeholder="例：人设没写的家庭/社交也可合理补全；把我删掉的同学补回来；现居再写细一点…"
                className="mt-1.5 w-full resize-none px-3 py-2 text-[12px] leading-relaxed outline-none disabled:opacity-55"
                style={{
                  color: INK,
                  border: BORDER,
                  background: BG,
                  borderRadius: 2,
                  fontFamily: SANS,
                }}
              />
            </label>
            <div className="mt-5 flex gap-2.5">
              <button
                type="button"
                disabled={alignBusy}
                onClick={() => setAlignConfirmOpen(false)}
                className="flex-1 py-2.5 text-[13px] font-medium disabled:opacity-55"
                style={{
                  color: MIST,
                  border: BORDER,
                  background: BG,
                  borderRadius: 2,
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
                  background: INK,
                  color: CARD,
                  borderRadius: 2,
                  fontFamily: SANS,
                }}
              >
                确认对齐
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <LifeHistoryPanel
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        title={panel === 'char' ? '角色本线' : `玩家 · ${pidName}`}
        events={
          (panel === 'char' ? charSheet?.changeHistory : playerSheet?.changeHistory) ?? []
        }
      />

      <MemoryTutorialModal
        open={tutorialOpen}
        onClose={() => setTutorialOpen(false)}
        title="人生账本 · 说明"
        subtitle="会变的现状登记 · 历史 · 开/关体验对比"
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
