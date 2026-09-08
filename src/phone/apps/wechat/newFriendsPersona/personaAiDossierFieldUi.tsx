import { AnimatePresence, motion } from 'framer-motion'
import { Dices, Minus, Plus, User } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { PlatinumSwitch } from './PlatinumSwitch'

const EASE = [0.22, 1, 0.36, 1] as const

export function SoftLabel({
  en,
  zh,
  trailing,
}: {
  en: string
  zh: string
  trailing?: ReactNode
}) {
  return (
    <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1.5">
      <div className="flex min-w-0 shrink-0 items-baseline gap-2">
        <span className="whitespace-nowrap text-[10px] font-medium uppercase tracking-[0.16em] text-neutral-400">
          {en}
        </span>
        <span className="whitespace-nowrap text-[13px] font-medium text-neutral-700">{zh}</span>
      </div>
      {trailing ? <div className="ml-auto min-w-0 max-w-full basis-full sm:basis-auto sm:max-w-[min(100%,18rem)]">{trailing}</div> : null}
    </div>
  )
}

export function FieldGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-4">
      <p className="px-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-neutral-400">
        {title}
      </p>
      {children}
    </div>
  )
}

/** 柔和圆润 chip：未选浅底细描边，选中墨黑实心 */
export function Chip({
  label,
  active,
  onClick,
  highlight,
}: {
  label: string
  active?: boolean
  onClick: () => void
  highlight?: boolean
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={false}
      animate={{
        scale: highlight ? [1, 1.04, 1] : 1,
        backgroundColor: active ? '#262626' : '#FAFAFA',
        color: active ? '#ffffff' : '#404040',
        borderColor: active ? '#262626' : 'rgba(0,0,0,0.08)',
        boxShadow: active ? '0 2px 8px rgba(0,0,0,0.08)' : '0 0 0 rgba(0,0,0,0)',
      }}
      transition={{ duration: 0.18, ease: EASE }}
      whileTap={{ scale: 0.97 }}
      className="shrink-0 rounded-full border px-3.5 py-2 text-[12px] font-medium leading-none tracking-wide"
      style={{ borderWidth: 1 }}
    >
      {label}
    </motion.button>
  )
}

function CustomChipInput({
  onCommit,
  placeholder = '+ 自定义',
}: {
  onCommit: (v: string) => void
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const commit = () => {
    const t = draft.trim()
    if (t) onCommit(t)
    setDraft('')
    setOpen(false)
  }
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex shrink-0 items-center gap-1 rounded-full border border-dashed border-neutral-300/90 bg-neutral-50/80 px-3.5 py-2 text-[12px] font-medium leading-none text-neutral-500 transition-colors hover:border-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
      >
        <Plus className="size-3" strokeWidth={2} />
        {placeholder.replace(/^\+\s*/, '')}
      </button>
    )
  }
  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      transition={{ duration: 0.2, ease: EASE }}
      className="w-full min-w-[10rem] basis-full"
    >
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            commit()
          }
          if (e.key === 'Escape') {
            setDraft('')
            setOpen(false)
          }
        }}
        placeholder="输入后回车确认"
        className="w-full rounded-2xl border border-neutral-200/80 bg-neutral-50 px-3.5 py-2.5 text-[12px] text-neutral-900 outline-none placeholder:text-neutral-300 focus:border-neutral-400 focus:bg-white"
      />
    </motion.div>
  )
}

export function ChipField({
  en,
  zh,
  options,
  value,
  mode,
  onToggle,
  onCustom,
  mutable,
  extra,
  supplement,
}: {
  en: string
  zh: string
  options: readonly string[]
  value: string
  mode: 'single' | 'multi'
  onToggle: (kw: string) => void
  onCustom?: (v: string) => void
  mutable?: { checked: boolean; onChange: (v: boolean) => void; label?: string }
  extra?: ReactNode
  /** 可选短补充 */
  supplement?: ReactNode
}) {
  const tokens =
    mode === 'multi'
      ? value
          .split(/[,，、;｜|]+/)
          .map((s) => s.trim())
          .filter(Boolean)
      : value.trim()
        ? [value.trim()]
        : []
  const known = new Set(options)
  const customs = tokens.filter((t) => !known.has(t))
  const [flash, setFlash] = useState<string | null>(null)

  return (
    <div>
      <SoftLabel
        en={en}
        zh={zh}
        trailing={
          mutable ? (
            <label className="inline-flex w-full max-w-full items-center justify-end gap-1.5 sm:w-auto">
              <span className="min-w-0 flex-1 text-right text-[10px] leading-snug text-neutral-500 sm:flex-none">
                {mutable.label ?? '允许在剧情中变化'}
              </span>
              <PlatinumSwitch
                checked={mutable.checked}
                onChange={mutable.onChange}
                aria-label={mutable.label ?? '允许在剧情中变化'}
              />
            </label>
          ) : undefined
        }
      />
      <div className="flex flex-wrap gap-1.5">
        {options.map((kw) => (
          <Chip
            key={kw}
            label={kw}
            active={tokens.includes(kw)}
            onClick={() => onToggle(kw)}
          />
        ))}
        {customs.map((kw) => (
          <Chip
            key={`c:${kw}`}
            label={kw}
            active
            highlight={flash === kw}
            onClick={() => onToggle(kw)}
          />
        ))}
        {onCustom ? (
          <CustomChipInput
            onCommit={(v) => {
              onCustom(v)
              setFlash(v)
              window.setTimeout(() => setFlash(null), 300)
            }}
          />
        ) : null}
        {extra}
      </div>
      {supplement ? <div className="mt-2.5">{supplement}</div> : null}
    </div>
  )
}

export function FreeTextField({
  en,
  zh,
  value,
  onChange,
  placeholder,
  maxLength,
  rows = 3,
  inspiration,
  onInspiration,
  footer,
}: {
  en: string
  zh: string
  value: string
  onChange: (v: string) => void
  placeholder: string
  maxLength: number
  rows?: number
  inspiration?: readonly string[]
  /** 默认追加插入；可自定义写入逻辑 */
  onInspiration?: (phrase: string) => void
  footer?: ReactNode
}) {
  const areaRef = useRef<HTMLTextAreaElement>(null)
  const [caretFlash, setCaretFlash] = useState(false)

  const appendPhrase = (phrase: string) => {
    if (onInspiration) {
      onInspiration(phrase)
    } else {
      const cur = value.trim()
      onChange(cur ? `${cur}、${phrase}` : phrase)
    }
    setCaretFlash(true)
    window.setTimeout(() => {
      setCaretFlash(false)
      areaRef.current?.focus()
    }, 180)
  }

  return (
    <div>
      <SoftLabel en={en} zh={zh} />
      {inspiration && inspiration.length > 0 ? (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {inspiration.map((phrase) => (
            <button
              key={phrase}
              type="button"
              onClick={() => appendPhrase(phrase)}
              className="rounded-full border border-neutral-200/80 bg-neutral-50 px-3 py-1.5 text-[11px] font-medium text-neutral-500 transition-colors hover:border-neutral-300 hover:bg-white hover:text-neutral-700"
            >
              {phrase}
            </button>
          ))}
        </div>
      ) : null}
      <div className="relative">
        <textarea
          ref={areaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          maxLength={maxLength}
          className={`w-full resize-none rounded-2xl border-0 bg-neutral-50 px-4 py-3.5 text-[14px] leading-relaxed text-neutral-900 outline-none transition-shadow placeholder:text-neutral-300 focus:bg-white focus:shadow-[0_0_0_1px_rgba(23,23,23,0.06)] ${
            caretFlash ? 'ring-1 ring-neutral-900/15' : ''
          }`}
        />
        <span
          className="pointer-events-none absolute bottom-3 right-3 font-mono text-[10px] tabular-nums"
          style={{ color: value.length > maxLength * 0.85 ? '#A66A6A' : '#C4C4CC' }}
        >
          {value.length}/{maxLength}
        </span>
      </div>
      {footer ? <div className="mt-2.5">{footer}</div> : null}
    </div>
  )
}

const MBTI_DIMS = [
  { left: 'E', right: 'I', leftZh: '外向 E', rightZh: '内向 I' },
  { left: 'S', right: 'N', leftZh: '实感 S', rightZh: '直觉 N' },
  { left: 'T', right: 'F', leftZh: '思考 T', rightZh: '情感 F' },
  { left: 'J', right: 'P', leftZh: '判断 J', rightZh: '知觉 P' },
] as const

function parseMbtiLetters(raw: string): [string, string, string, string] {
  const u = raw.trim().toUpperCase()
  if (u.length !== 4) return ['', '', '', '']
  const out: [string, string, string, string] = ['', '', '', '']
  for (let i = 0; i < 4; i++) {
    const ch = u[i]!
    const dim = MBTI_DIMS[i]!
    if (ch === dim.left || ch === dim.right) out[i] = ch
  }
  return out
}

export function MbtiBinaryField({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  const [dims, setDims] = useState(() => parseMbtiLetters(value))
  useEffect(() => {
    setDims(parseMbtiLetters(value))
  }, [value])

  const pick = (index: number, letter: string) => {
    const next = [...dims] as [string, string, string, string]
    next[index] = next[index] === letter ? '' : letter
    setDims(next)
    onChange(next.every(Boolean) ? next.join('') : '')
  }

  const display = dims.every(Boolean) ? dims.join('') : '····'

  return (
    <div>
      <SoftLabel
        en="MBTI"
        zh="人格偏向"
        trailing={
          <AnimatePresence mode="wait">
            <motion.span
              key={display}
              initial={{ opacity: 0, y: 2 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -2 }}
              transition={{ duration: 0.18 }}
              className="font-mono text-[12px] font-semibold tracking-[0.14em] text-neutral-900"
            >
              {display}
            </motion.span>
          </AnimatePresence>
        }
      />
      <div className="space-y-2">
        {MBTI_DIMS.map((dim, i) => {
          const sel = dims[i]
          return (
            <div
              key={dim.left}
              className="flex overflow-hidden rounded-full border border-neutral-200/80 bg-neutral-50"
            >
              {([dim.left, dim.right] as const).map((letter, side) => {
                const active = sel === letter
                const label = side === 0 ? dim.leftZh : dim.rightZh
                return (
                  <button
                    key={letter}
                    type="button"
                    onClick={() => pick(i, letter)}
                    className="relative flex-1 py-2.5 text-center text-[12px] font-medium transition-colors"
                  >
                    {active ? (
                      <motion.span
                        layoutId={`mbti-fill-${i}`}
                        className="absolute inset-0 bg-neutral-800"
                        transition={{ duration: 0.22, ease: EASE }}
                      />
                    ) : null}
                    <span
                      className={`relative z-[1] ${active ? 'text-white' : 'text-neutral-600'}`}
                    >
                      {label}
                    </span>
                  </button>
                )
              })}
            </div>
          )
        })}
        <button
          type="button"
          onClick={() => {
            setDims(['', '', '', ''])
            onChange('')
          }}
          className={`w-full rounded-full py-2.5 text-[11px] font-medium transition-colors ${
            !value.trim()
              ? 'bg-neutral-800 text-white shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
              : 'bg-neutral-50 text-neutral-500 hover:bg-neutral-100'
          }`}
        >
          交由引擎
        </button>
      </div>
    </div>
  )
}

export function IdentityQuickRow({
  avatarUrl,
  name,
  age,
  gender,
  onAvatarPick,
  onClearAvatar,
  onNameChange,
  onRandomName,
  onAgeChange,
  onRandomAge,
  avatarInputRef,
}: {
  avatarUrl: string
  name: string
  age: string
  gender: string
  onAvatarPick: (file: File | null) => void
  onClearAvatar: () => void
  onNameChange: (v: string) => void
  onRandomName: () => void
  onAgeChange: (v: string) => void
  onRandomAge: () => void
  avatarInputRef: React.RefObject<HTMLInputElement | null>
}) {
  void gender
  const bumpAge = (delta: number) => {
    const n = parseInt(age.replace(/\D/g, ''), 10)
    const base = Number.isFinite(n) ? n : 24
    const next = Math.min(99, Math.max(16, base + delta))
    onAgeChange(`${next}岁`)
  }

  return (
    <div className="flex items-start gap-3.5">
      <div className="flex shrink-0 flex-col items-center gap-1.5">
        <button
          type="button"
          onClick={() => avatarInputRef.current?.click()}
          className="relative flex size-[72px] items-center justify-center rounded-full border border-neutral-200/80 bg-neutral-50 shadow-[0_2px_10px_rgba(0,0,0,0.04)] transition-colors hover:bg-neutral-100 active:scale-[0.98]"
          aria-label="上传微信头像"
        >
          {avatarUrl.trim() ? (
            <img src={avatarUrl} alt="" className="size-full rounded-full object-cover" />
          ) : (
            <User className="size-7 text-neutral-300" strokeWidth={1.25} />
          )}
          <span className="absolute -bottom-0.5 -right-0.5 flex size-5 items-center justify-center rounded-full border border-neutral-200 bg-white shadow-sm">
            <Plus className="size-3 text-neutral-600" strokeWidth={2} />
          </span>
        </button>
        {avatarUrl.trim() ? (
          <button
            type="button"
            onClick={onClearAvatar}
            className="text-[10px] text-neutral-400 hover:text-neutral-700"
          >
            清除
          </button>
        ) : (
          <span className="text-[10px] text-neutral-400">可选</span>
        )}
        <input
          ref={avatarInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            onAvatarPick(e.target.files?.[0] ?? null)
            e.target.value = ''
          }}
        />
      </div>

      <div className="min-w-0 flex-1 space-y-3">
        <div>
          <SoftLabel en="Name" zh="姓名" />
          <div className="relative">
            <input
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="留空由引擎命名"
              maxLength={12}
              className="w-full rounded-2xl border-0 bg-neutral-50 py-2.5 pl-3.5 pr-10 text-[15px] font-semibold tracking-tight text-neutral-900 outline-none placeholder:font-normal placeholder:text-neutral-300 focus:bg-white focus:shadow-[0_0_0_1px_rgba(23,23,23,0.06)]"
            />
            <button
              type="button"
              title="随机姓名"
              onClick={onRandomName}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full p-2 text-neutral-400 transition-colors hover:bg-neutral-100/90 hover:text-neutral-700"
              aria-label="随机姓名"
            >
              <Dices className="size-4" strokeWidth={1.5} />
            </button>
          </div>
        </div>
        <div>
          <SoftLabel en="Age" zh="年龄" />
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => bumpAge(-1)}
              className="flex size-9 shrink-0 items-center justify-center rounded-full border border-neutral-200/80 bg-neutral-50 text-neutral-500 transition-colors hover:bg-white hover:text-neutral-700"
              aria-label="年龄减一"
            >
              <Minus className="size-3.5" strokeWidth={2} />
            </button>
            <div className="relative min-w-0 flex-1">
              <input
                value={age}
                onChange={(e) => onAgeChange(e.target.value)}
                placeholder="例：25岁"
                maxLength={48}
                className="w-full rounded-2xl border-0 bg-neutral-50 py-2.5 pl-3.5 pr-10 text-center text-[14px] text-neutral-900 outline-none placeholder:text-neutral-300 focus:bg-white focus:shadow-[0_0_0_1px_rgba(23,23,23,0.06)]"
              />
              <button
                type="button"
                title="随机年龄"
                onClick={onRandomAge}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100/90 hover:text-neutral-700"
                aria-label="随机年龄"
              >
                <Dices className="size-3.5" strokeWidth={1.5} />
              </button>
            </div>
            <button
              type="button"
              onClick={() => bumpAge(1)}
              className="flex size-9 shrink-0 items-center justify-center rounded-full border border-neutral-200/80 bg-neutral-50 text-neutral-500 transition-colors hover:bg-white hover:text-neutral-700"
              aria-label="年龄加一"
            >
              <Plus className="size-3.5" strokeWidth={2} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/** 曾经 → 当前 双 chip 选择器 */
export function RelationshipArcField({
  pastOptions,
  presentOptions,
  pastValue,
  presentValue,
  onPast,
  onPresent,
  onPastCustom,
  onPresentCustom,
  presets,
}: {
  pastOptions: readonly string[]
  presentOptions: readonly string[]
  pastValue: string
  presentValue: string
  onPast: (v: string) => void
  onPresent: (v: string) => void
  onPastCustom: (v: string) => void
  onPresentCustom: (v: string) => void
  presets?: ReactNode
}) {
  return (
    <div>
      <SoftLabel en="Relationship Arc" zh="关系轨迹" />
      {presets ? <div className="mb-3">{presets}</div> : null}
      <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-2">
        <div className="min-w-0">
          <p className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.12em] text-neutral-400">
            曾经
          </p>
          <div className="flex flex-wrap gap-1.5">
            {pastOptions.map((kw) => (
              <Chip
                key={`p:${kw}`}
                label={kw}
                active={pastValue === kw}
                onClick={() => onPast(pastValue === kw ? '' : kw)}
              />
            ))}
            {pastValue && !pastOptions.includes(pastValue) ? (
              <Chip label={pastValue} active onClick={() => onPast('')} />
            ) : null}
            <CustomChipInput onCommit={onPastCustom} />
          </div>
        </div>
        <span className="mt-7 text-[14px] font-medium text-neutral-400">→</span>
        <div className="min-w-0">
          <p className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.12em] text-neutral-400">
            当前
          </p>
          <div className="flex flex-wrap gap-1.5">
            {presentOptions.map((kw) => (
              <Chip
                key={`n:${kw}`}
                label={kw}
                active={presentValue === kw}
                onClick={() => onPresent(presentValue === kw ? '' : kw)}
              />
            ))}
            {presentValue && !presentOptions.includes(presentValue) ? (
              <Chip label={presentValue} active onClick={() => onPresent('')} />
            ) : null}
            <CustomChipInput onCommit={onPresentCustom} />
          </div>
        </div>
      </div>
    </div>
  )
}

/** 可选短补充输入（回车或失焦提交） */
export function TinySupplement({
  onCommit,
  placeholder,
  maxLength = 80,
}: {
  onCommit: (v: string) => void
  placeholder: string
  maxLength?: number
}) {
  const [draft, setDraft] = useState('')
  const commit = () => {
    const t = draft.trim()
    if (t) onCommit(t)
    setDraft('')
  }
  return (
    <input
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          commit()
        }
      }}
      placeholder={placeholder}
      maxLength={maxLength}
      className="w-full rounded-2xl border-0 bg-neutral-50 px-3.5 py-2.5 text-[12px] text-neutral-800 outline-none placeholder:text-neutral-300 focus:bg-white focus:shadow-[0_0_0_1px_rgba(23,23,23,0.06)]"
    />
  )
}
