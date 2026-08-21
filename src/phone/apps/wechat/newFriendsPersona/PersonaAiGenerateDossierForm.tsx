import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeftRight, ChevronDown, Dices, Plus, User, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { MEET_MBTI_SIXTEEN } from '../../lumiMeet/meetPersonaPrompt'
import { PlatinumSwitch } from './PlatinumSwitch'
import {
  PERSONA_AI_APPEARANCE_DETAIL_PRESETS,
  PERSONA_AI_AURA_PRESETS,
  PERSONA_AI_BACKGROUND_PRESETS,
  PERSONA_AI_BODY_SHAPE_PRESETS,
  PERSONA_AI_CONFLICT_PRESETS,
  PERSONA_AI_GAP_MOE_PRESETS,
  PERSONA_AI_HAIR_COLOR_PRESETS,
  PERSONA_AI_HAIR_STYLE_PRESETS,
  PERSONA_AI_HOBBIES_PRESETS,
  PERSONA_AI_JEALOUSY_PRESETS,
  PERSONA_AI_LIFE_HABITS_PRESETS,
  PERSONA_AI_LOVE_AFTER_PRESETS,
  PERSONA_AI_LOVE_BEFORE_PRESETS,
  PERSONA_AI_NSFW_PRESETS,
  PERSONA_AI_OCCUPATION_PRESETS,
  PERSONA_AI_ORIENTATION_PRESETS,
  PERSONA_AI_OUTFIT_PRESETS,
  PERSONA_AI_PAIN_POINTS_PRESETS,
  PERSONA_AI_RELATIONSHIP_HISTORY_PRESETS,
  PERSONA_AI_SOCIAL_MASK_PRESETS,
  PERSONA_AI_SPEECH_STYLE_PRESETS,
  PERSONA_AI_IDENTITY_ARC_PRESETS,
  PERSONA_AI_MEETING_PROCESS_PRESETS,
  applyPersonaAiIdentityArcPreset,
  applyPersonaAiMeetingProcessPreset,
  composePersonaAiIdentityArcSeed,
  type PersonaAiGenerateForm,
} from './personaAiGenerateTypes'
import type { Gender } from './types'
import { genderLabelZh, randomChineseName } from './utils'

const TAB_EASE = [0.22, 1, 0.36, 1] as const

export const PERSONA_AI_DOSSIER_TABS = [
  { id: '01', en: 'IDENTITY', zh: '身份', full: '身份锚定' },
  { id: '02', en: 'APPEARANCE', zh: '外貌', full: '骨相皮囊' },
  { id: '03', en: 'TRAJECTORY', zh: '脉络', full: '灵魂脉络' },
  { id: '04', en: 'SOCIAL', zh: '社交', full: '社交镜像' },
  { id: '05', en: 'INTIMACY', zh: '亲密', full: '亲密与宿命' },
] as const

export type PersonaAiDossierTabId = (typeof PERSONA_AI_DOSSIER_TABS)[number]['id']

function presetTokens(value: string): string[] {
  return value
    .split(/[,，、;/｜|]+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

function SoftLabel({ en, zh }: { en: string; zh: string }) {
  return (
    <div className="mb-2.5 flex items-baseline gap-2">
      <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-neutral-400">{en}</span>
      <span className="text-[13px] font-medium text-neutral-700">{zh}</span>
    </div>
  )
}

function presetSummary(value: string): string | undefined {
  const t = value.trim()
  if (!t) return undefined
  const parts = presetTokens(t)
  return parts.length > 1 ? `已选 ${parts.length} 项` : t
}

/** 分区卡片 + 可折叠预选按钮 */
function CollapsiblePresetZone({
  en,
  zh,
  summary,
  defaultOpen = false,
  presets,
  footer,
  hint,
}: {
  en: string
  zh: string
  /** 折叠时展示的已选摘要 */
  summary?: string
  defaultOpen?: boolean
  presets: React.ReactNode
  footer?: React.ReactNode
  hint?: string
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200/80 bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-neutral-50/80"
        aria-expanded={open}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-neutral-400">{en}</span>
            <span className="text-[14px] font-semibold text-neutral-900">{zh}</span>
          </div>
          <p className="mt-1 truncate text-[12px] text-neutral-500">
            {summary?.trim() ? summary : '未选择 · 点此展开预选'}
          </p>
        </div>
        <span
          className={`flex size-8 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-500 transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
        >
          <ChevronDown className="size-4" strokeWidth={2} />
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            key="presets"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: TAB_EASE }}
            className="overflow-hidden"
          >
            <div className="border-t border-neutral-100 px-4 pb-3.5 pt-3">
              <p className="mb-2.5 text-[10px] font-medium uppercase tracking-[0.14em] text-neutral-400">
                {hint ?? '预选 · 点选切换'}
              </p>
              {presets}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
      {footer ? <div className="border-t border-neutral-100 px-4 py-3">{footer}</div> : null}
    </div>
  )
}

function SoftArea({
  value,
  onChange,
  placeholder,
  maxLength,
  rows = 3,
  accent,
}: {
  value: string
  onChange: (v: string) => void
  placeholder: string
  maxLength: number
  rows?: number
  accent?: 'rose'
}) {
  return (
    <div className="relative">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        maxLength={maxLength}
        className={`w-full resize-none rounded-xl border-0 bg-neutral-50 px-4 py-3.5 text-[14px] leading-relaxed text-neutral-900 outline-none transition-shadow placeholder:text-neutral-300 focus:bg-white focus:shadow-[0_0_0_1px_rgba(23,23,23,0.08)] ${
          accent === 'rose' ? 'border-l-2 border-l-rose-200/80' : ''
        }`}
      />
      <span
        className="pointer-events-none absolute bottom-3 right-3 font-mono text-[10px] tabular-nums"
        style={{ color: value.length > maxLength * 0.85 ? '#A66A6A' : '#C4C4CC' }}
      >
        {value.length}/{maxLength}
      </span>
    </div>
  )
}

function Pill({
  label,
  active,
  onClick,
}: {
  label: string
  active?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-medium transition-all duration-200 active:scale-[0.97] ${
        active
          ? 'bg-neutral-900 text-white'
          : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200/80'
      }`}
    >
      {label}
    </button>
  )
}

function PillRow({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap gap-1.5">{children}</div>
}

function CustomPillInput({
  onCommit,
  placeholder = '自定义',
}: {
  onCommit: (v: string) => void
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex shrink-0 items-center gap-1 rounded-full border border-dashed border-neutral-300 bg-transparent px-3 py-1.5 text-[12px] font-medium text-neutral-500 transition-colors hover:border-neutral-400 hover:text-neutral-700"
      >
        <Plus className="size-3" strokeWidth={2} />
        {placeholder}
      </button>
    )
  }
  return (
    <input
      autoFocus
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        const t = draft.trim()
        if (t) onCommit(t)
        setDraft('')
        setOpen(false)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          const t = draft.trim()
          if (t) onCommit(t)
          setDraft('')
          setOpen(false)
        }
        if (e.key === 'Escape') {
          setDraft('')
          setOpen(false)
        }
      }}
      placeholder="输入后回车"
      className="min-w-[7rem] flex-1 border-0 border-b border-neutral-300 bg-transparent px-1 py-1.5 text-[12px] text-neutral-900 outline-none placeholder:text-neutral-300 focus:border-neutral-900"
    />
  )
}

function ChapterShell({
  code,
  en,
  zh,
  children,
}: {
  code: string
  en: string
  zh: string
  children: React.ReactNode
}) {
  return (
    <section
      className="overflow-hidden rounded-2xl bg-white"
      style={{ boxShadow: '0 1px 0 rgba(0,0,0,0.03), 0 8px 32px rgba(0,0,0,0.04)' }}
    >
      <div className="border-b border-neutral-100 px-5 py-3.5">
        <p className="font-mono text-[10px] tabular-nums text-neutral-400">
          {code} · {en}
        </p>
        <p className="mt-0.5 text-[16px] font-semibold tracking-tight text-neutral-900">{zh}</p>
      </div>
      <div className="space-y-6 px-5 py-5">{children}</div>
    </section>
  )
}

function DirectGenerateLockedNotice() {
  return (
    <div className="rounded-xl border border-neutral-200/80 bg-neutral-50 px-4 py-4">
      <p className="text-[13px] font-medium text-neutral-800">本章已锁定</p>
      <p className="mt-1 text-[12px] leading-relaxed text-neutral-400">
        已勾选「直接生成该人物档案」，仅按身份页的参考人物生成。请回到「身份」关闭该开关后再填写本章。
      </p>
    </div>
  )
}

export function PersonaAiGenerateDossierForm({
  form,
  patch,
  activeTab,
}: {
  form: PersonaAiGenerateForm
  patch: (partial: Partial<PersonaAiGenerateForm>) => void
  activeTab: PersonaAiDossierTabId
}) {
  const [xpUnlocked, setXpUnlocked] = useState(false)
  const [occCustom, setOccCustom] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  const pickAvatarFile = (file: File | null) => {
    if (!file || !file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : ''
      if (result) patch({ avatarUrl: result })
    }
    reader.readAsDataURL(file)
  }

  const appendToken = (field: keyof PersonaAiGenerateForm, kw: string) => {
    const parts = presetTokens(String(form[field] ?? ''))
    if (parts.includes(kw)) {
      patch({ [field]: parts.filter((p) => p !== kw).join('、') })
    } else {
      patch({ [field]: parts.length ? `${parts.join('、')}、${kw}` : kw })
    }
  }

  const setSingle = (field: keyof PersonaAiGenerateForm, kw: string) => {
    const cur = String(form[field] ?? '').trim()
    patch({ [field]: cur === kw ? '' : kw })
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.22, ease: TAB_EASE }}
      >
        {activeTab === '01' ? (
          <ChapterShell code="01" en="IDENTITY" zh="身份锚定">
            <div>
              <SoftLabel en="Reference" zh="参考人物" />
              <SoftArea
                value={form.referencePersonaHint}
                onChange={(v) => {
                  const next = v
                  patch(
                    next.trim()
                      ? { referencePersonaHint: next }
                      : { referencePersonaHint: next, referencePersonaDirectGenerate: false },
                  )
                }}
                placeholder="填写角色或人物名；可附作品名。多名用顿号或逗号分隔"
                maxLength={300}
                rows={2}
              />
              <div className="mt-2.5 flex items-center justify-between gap-3 rounded-xl bg-neutral-50 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-medium text-neutral-800">直接生成该人物档案</p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-neutral-400">
                    {form.referencePersonaDirectGenerate
                      ? '已打开：仅按参考人物生成；下方及其他章节已锁定，无需再填'
                      : '关闭 = 只借气质，可继续填写下方种子；打开 = 只按参考人物生成，锁定其余选项'}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span
                    className={`text-[10px] font-medium tracking-wide ${
                      form.referencePersonaDirectGenerate ? 'text-neutral-800' : 'text-neutral-400'
                    }`}
                  >
                    {form.referencePersonaDirectGenerate ? '原著' : '借鉴'}
                  </span>
                  <PlatinumSwitch
                    checked={form.referencePersonaDirectGenerate}
                    onChange={(next) => patch({ referencePersonaDirectGenerate: next })}
                    disabled={!form.referencePersonaHint.trim()}
                    aria-label="直接生成该人物档案"
                  />
                </div>
              </div>
            </div>

            <div
              className={`relative space-y-6 ${
                form.referencePersonaDirectGenerate ? 'pointer-events-none select-none' : ''
              }`}
              aria-disabled={form.referencePersonaDirectGenerate || undefined}
            >
              {form.referencePersonaDirectGenerate ? (
                <div className="rounded-xl border border-neutral-200/80 bg-neutral-50 px-4 py-3">
                  <p className="text-[12px] font-medium text-neutral-800">其余选项已锁定</p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-neutral-400">
                    关闭「直接生成」后可继续填写姓名、外貌、亲密等种子
                  </p>
                </div>
              ) : null}
              <div
                className={
                  form.referencePersonaDirectGenerate ? 'opacity-40' : undefined
                }
              >
            <div className="flex flex-col items-center">
              <div className="mb-2.5 flex items-baseline justify-center gap-2">
                <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-neutral-400">
                  WeChat Avatar
                </span>
                <span className="text-[13px] font-medium text-neutral-700">微信头像</span>
              </div>
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                className="relative flex size-[5.5rem] shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-neutral-50 shadow-[0_4px_16px_rgba(0,0,0,0.04)] transition-colors hover:bg-neutral-100/80 active:scale-[0.98]"
                aria-label="上传微信头像"
              >
                {form.avatarUrl.trim() ? (
                  <img
                    src={form.avatarUrl}
                    alt=""
                    className="size-full rounded-full object-cover"
                  />
                ) : (
                  <User className="size-9 text-neutral-300" strokeWidth={1.25} />
                )}
                <span className="absolute -bottom-0.5 -right-0.5 flex size-7 items-center justify-center rounded-full border border-neutral-200 bg-white shadow-sm">
                  <Plus className="size-3.5 text-neutral-600" strokeWidth={1.75} />
                </span>
              </button>
              <div className="mt-2.5 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  className="text-[12px] font-medium text-neutral-600 underline-offset-2 hover:underline"
                >
                  {form.avatarUrl.trim() ? '更换头像' : '上传头像'}
                </button>
                {form.avatarUrl.trim() ? (
                  <button
                    type="button"
                    onClick={() => patch({ avatarUrl: '' })}
                    className="inline-flex items-center gap-1 text-[12px] text-neutral-400 hover:text-neutral-700"
                  >
                    <X className="size-3" strokeWidth={2} />
                    清除
                  </button>
                ) : null}
              </div>
              <p className="mt-1.5 text-center text-[11px] text-neutral-400">
                可选；生成后作为角色微信头像
              </p>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  pickAvatarFile(e.target.files?.[0] ?? null)
                  e.target.value = ''
                }}
              />
            </div>

            <div>
              <SoftLabel en="Name" zh="姓名" />
              <div className="relative">
                <input
                  value={form.nameHint}
                  onChange={(e) => patch({ nameHint: e.target.value })}
                  placeholder="留空由引擎命名"
                  maxLength={12}
                  className="w-full border-0 border-b border-neutral-200 bg-transparent pb-3 pr-12 text-[28px] font-semibold tracking-tight text-neutral-900 outline-none placeholder:text-neutral-300 focus:border-neutral-900"
                />
                <button
                  type="button"
                  title="随机姓名"
                  onClick={() => patch({ nameHint: randomChineseName(form.gender) })}
                  className="absolute bottom-3 right-0 rounded-md border border-neutral-300 p-1.5 text-neutral-500 transition-colors hover:border-neutral-900 hover:text-neutral-900"
                  aria-label="随机姓名"
                >
                  <Dices className="size-4" strokeWidth={1.5} />
                </button>
              </div>
              <p className="mt-2 text-[11px] text-neutral-400">先选性别，再点骰子抽取姓名池</p>
            </div>

            <div>
              <SoftLabel en="Age" zh="年龄方向" />
              <input
                value={form.ageHint}
                onChange={(e) => patch({ ageHint: e.target.value })}
                placeholder="例：25岁、20-28岁"
                maxLength={48}
                className="w-full rounded-xl border-0 bg-neutral-50 px-4 py-3 text-[14px] text-neutral-900 outline-none placeholder:text-neutral-300 focus:bg-white focus:shadow-[0_0_0_1px_rgba(23,23,23,0.08)]"
              />
            </div>

            <div>
              <SoftLabel en="Gender" zh="性别" />
              <PillRow>
                {(['female', 'male', 'other'] as Gender[]).map((g) => (
                  <Pill
                    key={g}
                    label={genderLabelZh(g)}
                    active={form.gender === g}
                    onClick={() => patch({ gender: g })}
                  />
                ))}
              </PillRow>
            </div>

            <div className="space-y-3">
              <CollapsiblePresetZone
                en="Occupation"
                zh="职业"
                summary={form.occupationHint.trim() || undefined}
                presets={
                  <PillRow>
                    {PERSONA_AI_OCCUPATION_PRESETS.map((kw) => (
                      <Pill
                        key={kw}
                        label={kw}
                        active={form.occupationHint === kw}
                        onClick={() => setSingle('occupationHint', kw)}
                      />
                    ))}
                    {!occCustom &&
                    !PERSONA_AI_OCCUPATION_PRESETS.includes(
                      form.occupationHint as (typeof PERSONA_AI_OCCUPATION_PRESETS)[number],
                    ) &&
                    form.occupationHint.trim() ? (
                      <Pill
                        label={form.occupationHint}
                        active
                        onClick={() => patch({ occupationHint: '' })}
                      />
                    ) : null}
                    <CustomPillInput
                      placeholder="自定义"
                      onCommit={(v) => {
                        patch({ occupationHint: v })
                        setOccCustom(false)
                      }}
                    />
                  </PillRow>
                }
                footer={
                  <div className="space-y-2">
                    <input
                      value={
                        PERSONA_AI_OCCUPATION_PRESETS.includes(
                          form.occupationHint as (typeof PERSONA_AI_OCCUPATION_PRESETS)[number],
                        )
                          ? ''
                          : form.occupationHint
                      }
                      onChange={(e) => patch({ occupationHint: e.target.value })}
                      placeholder="或直接输入职业"
                      maxLength={64}
                      className="w-full rounded-xl border-0 bg-neutral-50 px-4 py-3 text-[14px] text-neutral-900 outline-none placeholder:text-neutral-300 focus:bg-white focus:shadow-[0_0_0_1px_rgba(23,23,23,0.08)]"
                    />
                    <div className="flex items-center justify-between gap-3 rounded-xl bg-neutral-50 px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-[12px] font-medium text-neutral-800">职业可变</p>
                        <p className="mt-0.5 text-[11px] leading-relaxed text-neutral-400">
                          {form.occupationMutable
                            ? '已打开：写入尾声「职业身份的当前快照」，可随剧情更新'
                            : '打开 = 可变（进尾声）；关闭 = 固定（写在「名片基础」序言）'}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <span
                          className={`text-[10px] font-medium tracking-wide ${
                            form.occupationMutable ? 'text-neutral-800' : 'text-neutral-400'
                          }`}
                        >
                          {form.occupationMutable ? '可变' : '固定'}
                        </span>
                        <PlatinumSwitch
                          checked={form.occupationMutable}
                          onChange={(next) => patch({ occupationMutable: next })}
                          aria-label="职业可变：打开为可变，关闭为固定"
                        />
                      </div>
                    </div>
                  </div>
                }
              />

              <CollapsiblePresetZone
                en="MBTI"
                zh="人格偏向"
                summary={form.mbtiHint.trim() ? form.mbtiHint.toUpperCase() : '交由引擎'}
                presets={
                  <div className="grid grid-cols-4 gap-1.5">
                    <button
                      type="button"
                      onClick={() => patch({ mbtiHint: '' })}
                      className={`col-span-4 rounded-lg py-2 text-[11px] font-medium transition-all ${
                        !form.mbtiHint.trim()
                          ? 'bg-neutral-900 text-white'
                          : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200/80'
                      }`}
                    >
                      交由引擎
                    </button>
                    {MEET_MBTI_SIXTEEN.map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => patch({ mbtiHint: form.mbtiHint.toUpperCase() === m ? '' : m })}
                        className={`rounded-lg py-2 font-mono text-[11px] font-semibold tracking-wide transition-all active:scale-[0.97] ${
                          form.mbtiHint.toUpperCase() === m
                            ? 'bg-neutral-900 text-white'
                            : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200/80'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                }
              />

              <CollapsiblePresetZone
                en="Orientation"
                zh="性取向"
                summary={form.orientationHint.trim() || '交由引擎'}
                presets={
                  <PillRow>
                    {PERSONA_AI_ORIENTATION_PRESETS.map((kw) => (
                      <Pill
                        key={kw}
                        label={kw}
                        active={form.orientationHint === kw}
                        onClick={() => setSingle('orientationHint', kw)}
                      />
                    ))}
                  </PillRow>
                }
                footer={
                  <div className="flex items-center justify-between gap-3 rounded-xl bg-neutral-50 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-medium text-neutral-800">取向可变</p>
                      <p className="mt-0.5 text-[11px] leading-relaxed text-neutral-400">
                        {form.orientationMutable
                          ? '已打开：写入尾声「取向认同的当前快照」，可随剧情更新'
                          : '打开 = 可变（进尾声）；关闭 = 固定（写在「性格内核」序言）'}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span
                        className={`text-[10px] font-medium tracking-wide ${
                          form.orientationMutable ? 'text-neutral-800' : 'text-neutral-400'
                        }`}
                      >
                        {form.orientationMutable ? '可变' : '固定'}
                      </span>
                      <PlatinumSwitch
                        checked={form.orientationMutable}
                        onChange={(next) => patch({ orientationMutable: next })}
                        aria-label="取向可变：打开为可变，关闭为固定"
                      />
                    </div>
                  </div>
                }
              />
            </div>
              </div>
            </div>
          </ChapterShell>
        ) : null}

        {activeTab === '02' ? (
          <ChapterShell code="02" en="APPEARANCE" zh="骨相皮囊">
            {form.referencePersonaDirectGenerate ? (
              <DirectGenerateLockedNotice />
            ) : (
            <div className="space-y-3">
              <CollapsiblePresetZone
                en="Hair Color"
                zh="发色"
                summary={form.hairColorHint.trim() || undefined}
                presets={
                  <PillRow>
                    {PERSONA_AI_HAIR_COLOR_PRESETS.map((kw) => (
                      <Pill
                        key={kw}
                        label={kw}
                        active={form.hairColorHint === kw}
                        onClick={() => setSingle('hairColorHint', kw)}
                      />
                    ))}
                    {!PERSONA_AI_HAIR_COLOR_PRESETS.includes(
                      form.hairColorHint as (typeof PERSONA_AI_HAIR_COLOR_PRESETS)[number],
                    ) && form.hairColorHint.trim() ? (
                      <Pill
                        label={form.hairColorHint}
                        active
                        onClick={() => patch({ hairColorHint: '' })}
                      />
                    ) : null}
                    <CustomPillInput
                      placeholder="自定义"
                      onCommit={(v) => patch({ hairColorHint: v })}
                    />
                  </PillRow>
                }
              />

              <CollapsiblePresetZone
                en="Hairstyle"
                zh="发型"
                summary={form.hairStyleHint.trim() || undefined}
                presets={
                  <PillRow>
                    {PERSONA_AI_HAIR_STYLE_PRESETS.map((kw) => (
                      <Pill
                        key={kw}
                        label={kw}
                        active={form.hairStyleHint === kw}
                        onClick={() => setSingle('hairStyleHint', kw)}
                      />
                    ))}
                    {!PERSONA_AI_HAIR_STYLE_PRESETS.includes(
                      form.hairStyleHint as (typeof PERSONA_AI_HAIR_STYLE_PRESETS)[number],
                    ) && form.hairStyleHint.trim() ? (
                      <Pill
                        label={form.hairStyleHint}
                        active
                        onClick={() => patch({ hairStyleHint: '' })}
                      />
                    ) : null}
                    <CustomPillInput
                      placeholder="自定义"
                      onCommit={(v) => patch({ hairStyleHint: v })}
                    />
                  </PillRow>
                }
              />

              <CollapsiblePresetZone
                en="Body"
                zh="身材"
                summary={form.bodyShapeHint.trim() || undefined}
                presets={
                  <PillRow>
                    {PERSONA_AI_BODY_SHAPE_PRESETS.map((kw) => (
                      <Pill
                        key={kw}
                        label={kw}
                        active={form.bodyShapeHint === kw}
                        onClick={() => setSingle('bodyShapeHint', kw)}
                      />
                    ))}
                    {!PERSONA_AI_BODY_SHAPE_PRESETS.includes(
                      form.bodyShapeHint as (typeof PERSONA_AI_BODY_SHAPE_PRESETS)[number],
                    ) && form.bodyShapeHint.trim() ? (
                      <Pill
                        label={form.bodyShapeHint}
                        active
                        onClick={() => patch({ bodyShapeHint: '' })}
                      />
                    ) : null}
                    <CustomPillInput
                      placeholder="自定义"
                      onCommit={(v) => patch({ bodyShapeHint: v })}
                    />
                  </PillRow>
                }
              />

              <CollapsiblePresetZone
                en="Outfit"
                zh="穿搭"
                summary={presetSummary(form.outfitHint)}
                presets={
                  <PillRow>
                    {PERSONA_AI_OUTFIT_PRESETS.map((kw) => (
                      <Pill
                        key={kw}
                        label={kw}
                        active={presetTokens(form.outfitHint).includes(kw)}
                        onClick={() => appendToken('outfitHint', kw)}
                      />
                    ))}
                    <CustomPillInput onCommit={(v) => appendToken('outfitHint', v)} />
                  </PillRow>
                }
                footer={
                  <SoftArea
                    value={form.outfitHint}
                    onChange={(v) => patch({ outfitHint: v })}
                    placeholder="补充工作 / 私下 / 约会等场合穿搭…"
                    maxLength={320}
                    rows={2}
                  />
                }
              />

              <CollapsiblePresetZone
                en="Details"
                zh="眉眼配饰"
                summary={presetSummary(form.appearanceHint)}
                presets={
                  <PillRow>
                    {PERSONA_AI_APPEARANCE_DETAIL_PRESETS.map((kw) => (
                      <Pill
                        key={kw}
                        label={kw}
                        active={presetTokens(form.appearanceHint).includes(kw)}
                        onClick={() => appendToken('appearanceHint', kw)}
                      />
                    ))}
                    <CustomPillInput onCommit={(v) => appendToken('appearanceHint', v)} />
                  </PillRow>
                }
                footer={
                  <SoftArea
                    value={form.appearanceHint}
                    onChange={(v) => patch({ appearanceHint: v })}
                    placeholder="补充眉眼、配饰等细节…"
                    maxLength={240}
                    rows={2}
                  />
                }
              />

              <CollapsiblePresetZone
                en="Aura / Vibe"
                zh="气质气场"
                summary={form.auraHint.trim() || undefined}
                presets={
                  <PillRow>
                    {PERSONA_AI_AURA_PRESETS.map((kw) => (
                      <Pill
                        key={kw}
                        label={kw}
                        active={presetTokens(form.auraHint).includes(kw)}
                        onClick={() => appendToken('auraHint', kw)}
                      />
                    ))}
                    <CustomPillInput onCommit={(v) => appendToken('auraHint', v)} />
                  </PillRow>
                }
                footer={
                  <SoftArea
                    value={form.auraHint}
                    onChange={(v) => patch({ auraHint: v })}
                    placeholder="第一印象与气场…"
                    maxLength={160}
                    rows={2}
                  />
                }
              />
            </div>
            )}
          </ChapterShell>
        ) : null}

        {activeTab === '03' ? (
          <ChapterShell code="03" en="TRAJECTORY" zh="灵魂脉络">
            {form.referencePersonaDirectGenerate ? (
              <DirectGenerateLockedNotice />
            ) : (
            <div className="space-y-3">
              <CollapsiblePresetZone
                en="Backstory"
                zh="身世过往"
                summary={presetSummary(form.backgroundHint)}
                presets={
                  <PillRow>
                    {PERSONA_AI_BACKGROUND_PRESETS.map((kw) => (
                      <Pill
                        key={kw}
                        label={kw}
                        active={presetTokens(form.backgroundHint).includes(kw)}
                        onClick={() => appendToken('backgroundHint', kw)}
                      />
                    ))}
                    <CustomPillInput onCommit={(v) => appendToken('backgroundHint', v)} />
                  </PillRow>
                }
                footer={
                  <SoftArea
                    value={form.backgroundHint}
                    onChange={(v) => patch({ backgroundHint: v })}
                    placeholder="塑造性格成因的关键过往…"
                    maxLength={280}
                    rows={3}
                  />
                }
              />

              <CollapsiblePresetZone
                en="Romance History"
                zh="感情史"
                summary={form.relationshipHistoryHint.trim() || '生成时必写「过往感情史」条目'}
                presets={
                  <PillRow>
                    {PERSONA_AI_RELATIONSHIP_HISTORY_PRESETS.map((kw) => (
                      <Pill
                        key={kw}
                        label={kw}
                        active={form.relationshipHistoryHint === kw}
                        onClick={() => setSingle('relationshipHistoryHint', kw)}
                      />
                    ))}
                  </PillRow>
                }
                footer={
                  <SoftArea
                    value={
                      PERSONA_AI_RELATIONSHIP_HISTORY_PRESETS.includes(
                        form.relationshipHistoryHint as (typeof PERSONA_AI_RELATIONSHIP_HISTORY_PRESETS)[number],
                      )
                        ? ''
                        : form.relationshipHistoryHint
                    }
                    onChange={(v) => patch({ relationshipHistoryHint: v })}
                    placeholder="可选：写清曾有好感/喜欢/交往过的对象，或母胎单身等；不填也会生成该条目"
                    maxLength={240}
                    rows={2}
                  />
                }
              />

              <CollapsiblePresetZone
                en="Hobbies"
                zh="兴趣爱好"
                summary={presetSummary(form.hobbiesHint)}
                hint="可多选 · 点选切换"
                presets={
                  <PillRow>
                    {PERSONA_AI_HOBBIES_PRESETS.map((kw) => (
                      <Pill
                        key={kw}
                        label={kw}
                        active={presetTokens(form.hobbiesHint).includes(kw)}
                        onClick={() => appendToken('hobbiesHint', kw)}
                      />
                    ))}
                    <CustomPillInput onCommit={(v) => appendToken('hobbiesHint', v)} />
                  </PillRow>
                }
                footer={
                  <SoftArea
                    value={form.hobbiesHint}
                    onChange={(v) => patch({ hobbiesHint: v })}
                    placeholder="可多选预选，或直接补充爱好…"
                    maxLength={160}
                    rows={2}
                  />
                }
              />

              <CollapsiblePresetZone
                en="Quirks"
                zh="癖好习惯"
                summary={presetSummary(form.lifeHabitsHint)}
                presets={
                  <PillRow>
                    {PERSONA_AI_LIFE_HABITS_PRESETS.map((kw) => (
                      <Pill
                        key={kw}
                        label={kw}
                        active={presetTokens(form.lifeHabitsHint).includes(kw)}
                        onClick={() => appendToken('lifeHabitsHint', kw)}
                      />
                    ))}
                    <CustomPillInput onCommit={(v) => appendToken('lifeHabitsHint', v)} />
                  </PillRow>
                }
                footer={
                  <SoftArea
                    value={form.lifeHabitsHint}
                    onChange={(v) => patch({ lifeHabitsHint: v })}
                    placeholder="例：紧张时转笔、回消息很慢…"
                    maxLength={240}
                    rows={2}
                  />
                }
              />

              <CollapsiblePresetZone
                en="Speech Habits"
                zh="口语习惯"
                summary={presetSummary(form.speechStyleHint)}
                presets={
                  <PillRow>
                    {PERSONA_AI_SPEECH_STYLE_PRESETS.map((kw) => (
                      <Pill
                        key={kw}
                        label={kw}
                        active={presetTokens(form.speechStyleHint).includes(kw)}
                        onClick={() => appendToken('speechStyleHint', kw)}
                      />
                    ))}
                    <CustomPillInput onCommit={(v) => appendToken('speechStyleHint', v)} />
                  </PillRow>
                }
                footer={
                  <SoftArea
                    value={form.speechStyleHint}
                    onChange={(v) => patch({ speechStyleHint: v })}
                    placeholder="口头禅或语气特征…"
                    maxLength={160}
                    rows={2}
                  />
                }
              />

              <CollapsiblePresetZone
                en="Red Flags"
                zh="雷点与绝对底线"
                summary={presetSummary(form.painPointsHint)}
                presets={
                  <PillRow>
                    {PERSONA_AI_PAIN_POINTS_PRESETS.map((kw) => (
                      <Pill
                        key={kw}
                        label={kw}
                        active={presetTokens(form.painPointsHint).includes(kw)}
                        onClick={() => appendToken('painPointsHint', kw)}
                      />
                    ))}
                    <CustomPillInput onCommit={(v) => appendToken('painPointsHint', v)} />
                  </PillRow>
                }
                footer={
                  <SoftArea
                    value={form.painPointsHint}
                    onChange={(v) => patch({ painPointsHint: v })}
                    placeholder="无法忍受的雷区与底线…"
                    maxLength={160}
                    rows={2}
                    accent="rose"
                  />
                }
              />
            </div>
            )}
          </ChapterShell>
        ) : null}

        {activeTab === '04' ? (
          <ChapterShell code="04" en="SOCIAL" zh="社交镜像">
            {form.referencePersonaDirectGenerate ? (
              <DirectGenerateLockedNotice />
            ) : (
            <div className="space-y-3">
              <div>
                <SoftLabel en="Social Circles" zh="人脉偏向" />
                <div className="space-y-3">
                  {(
                    [
                      ['家人', 'socialFamilyHint', '例：极度重男轻女的父母'],
                      ['朋友', 'socialFriendsHint', '例：唯一的死党'],
                      ['同事/下属', 'socialWorkHint', '例：客气不深的同事圈'],
                    ] as const
                  ).map(([label, field, ph]) => (
                    <div key={field} className="rounded-xl bg-neutral-50 p-3.5">
                      <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.12em] text-neutral-400">
                        {label}
                      </p>
                      <input
                        value={form[field]}
                        onChange={(e) => patch({ [field]: e.target.value })}
                        placeholder={ph}
                        maxLength={120}
                        className="w-full border-0 bg-transparent text-[14px] text-neutral-900 outline-none placeholder:text-neutral-300"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <CollapsiblePresetZone
                en="Social Facades"
                zh="多面社交态度"
                summary={form.socialMaskHint.trim() || undefined}
                presets={
                  <PillRow>
                    {PERSONA_AI_SOCIAL_MASK_PRESETS.map((kw) => (
                      <Pill
                        key={kw}
                        label={kw}
                        active={form.socialMaskHint === kw}
                        onClick={() => setSingle('socialMaskHint', kw)}
                      />
                    ))}
                  </PillRow>
                }
                footer={
                  <SoftArea
                    value={form.socialMaskHint}
                    onChange={(v) => patch({ socialMaskHint: v })}
                    placeholder="对不同人的反差，如：对熟人毒舌，对长辈极其礼貌伪装…"
                    maxLength={200}
                    rows={2}
                  />
                }
              />

              <CollapsiblePresetZone
                en="Gap Moe"
                zh="反差萌点"
                summary={presetSummary(form.gapMoeHint)}
                presets={
                  <PillRow>
                    {PERSONA_AI_GAP_MOE_PRESETS.map((kw) => (
                      <Pill
                        key={kw}
                        label={kw}
                        active={presetTokens(form.gapMoeHint).includes(kw)}
                        onClick={() => appendToken('gapMoeHint', kw)}
                      />
                    ))}
                    <CustomPillInput onCommit={(v) => appendToken('gapMoeHint', v)} />
                  </PillRow>
                }
                footer={
                  <SoftArea
                    value={form.gapMoeHint}
                    onChange={(v) => patch({ gapMoeHint: v })}
                    placeholder="高冷外表下隐藏的笨拙瞬间…"
                    maxLength={160}
                    rows={2}
                  />
                }
              />
            </div>
            )}
          </ChapterShell>
        ) : null}

        {activeTab === '05' ? (
          <ChapterShell code="05" en="INTIMACY" zh="亲密与宿命">
            {form.referencePersonaDirectGenerate ? (
              <DirectGenerateLockedNotice />
            ) : (
            <div className="space-y-3">
              <CollapsiblePresetZone
                en="Opening Process"
                zh="初始过程"
                summary={
                  form.relationDetailHint.trim()
                    ? form.relationDetailHint.trim()
                    : form.relationToUser.trim() || undefined
                }
                hint="预设一键填入相识过程，也可自定义"
                presets={
                  <PillRow>
                    {PERSONA_AI_MEETING_PROCESS_PRESETS.map((p) => {
                      const active = form.meetingProcessPresetId === p.id
                      return (
                        <Pill
                          key={p.id}
                          label={p.label}
                          active={active}
                          onClick={() => {
                            if (active) {
                              patch({
                                meetingProcessPresetId: '',
                                relationDetailHint: '',
                                relationToUser: '',
                              })
                            } else {
                              patch(applyPersonaAiMeetingProcessPreset(p))
                            }
                          }}
                        />
                      )
                    })}
                    <CustomPillInput
                      placeholder="自定义关系标签"
                      onCommit={(v) =>
                        patch({
                          relationToUser: v,
                          meetingProcessPresetId: '',
                        })
                      }
                    />
                  </PillRow>
                }
                footer={
                  <div className="space-y-2">
                    <p className="text-[11px] text-neutral-400">
                      相识过程（写入世界书「相遇羁绊」）
                      {form.relationToUser.trim()
                        ? ` · 关系标签：${form.relationToUser.trim()}`
                        : ''}
                    </p>
                    <SoftArea
                      value={form.relationDetailHint}
                      onChange={(v) =>
                        patch({
                          relationDetailHint: v,
                          meetingProcessPresetId: '',
                        })
                      }
                      placeholder="如何认识、早期互动、过程节点…（勿写当前关系/态度，那些留给「对你现在」）"
                      maxLength={240}
                      rows={3}
                    />
                  </div>
                }
              />

              <CollapsiblePresetZone
                en="Identity Arc"
                zh="历史 / 现在身份"
                defaultOpen={Boolean(composePersonaAiIdentityArcSeed(form))}
                summary={
                  composePersonaAiIdentityArcSeed(form)
                    ? composePersonaAiIdentityArcSeed(form)
                    : undefined
                }
                hint="可点预设一键填满四格，也可分别手改"
                presets={
                  <div className="space-y-2">
                    <p className="text-[11px] text-neutral-400">抓马开局预设 · 点选填入四格身份</p>
                    <PillRow>
                      {PERSONA_AI_IDENTITY_ARC_PRESETS.map((p) => {
                        const active = form.identityArcPresetId === p.id
                        return (
                          <Pill
                            key={p.id}
                            label={p.label}
                            active={active}
                            onClick={() => {
                              if (active) {
                                patch({
                                  historyCharIdentity: '',
                                  historyUserIdentity: '',
                                  presentCharIdentity: '',
                                  presentUserIdentity: '',
                                  identityArcPresetId: '',
                                })
                              } else {
                                patch(applyPersonaAiIdentityArcPreset(p))
                              }
                            }}
                          />
                        )
                      })}
                    </PillRow>
                  </div>
                }
                footer={
                  <div className="space-y-4">
                    <button
                      type="button"
                      disabled={!composePersonaAiIdentityArcSeed(form)}
                      onClick={() => {
                        patch({
                          historyCharIdentity: form.historyUserIdentity,
                          historyUserIdentity: form.historyCharIdentity,
                          presentCharIdentity: form.presentUserIdentity,
                          presentUserIdentity: form.presentCharIdentity,
                          identityArcPresetId: '',
                        })
                      }}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-[13px] font-medium text-neutral-800 transition-colors hover:bg-neutral-50 active:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ArrowLeftRight className="size-3.5 shrink-0 text-neutral-500" strokeWidth={2} />
                      对换角色 / 用户身份
                    </button>
                    <div className="rounded-xl bg-neutral-50 px-3 py-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-neutral-400">
                            Then · 历史身份
                          </p>
                          <p className="mt-0.5 text-[12px] text-neutral-500">相识 / 过往阶段时双方是谁</p>
                        </div>
                        <button
                          type="button"
                          title="对换本行角色与用户"
                          disabled={!form.historyCharIdentity.trim() && !form.historyUserIdentity.trim()}
                          onClick={() => {
                            patch({
                              historyCharIdentity: form.historyUserIdentity,
                              historyUserIdentity: form.historyCharIdentity,
                              identityArcPresetId: '',
                            })
                          }}
                          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white text-neutral-500 shadow-sm transition-colors hover:text-neutral-800 disabled:opacity-30"
                        >
                          <ArrowLeftRight className="size-3.5" strokeWidth={2} />
                        </button>
                      </div>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <div>
                          <p className="mb-1.5 text-[11px] text-neutral-500">角色 · {'{{char}}'}</p>
                          <input
                            value={form.historyCharIdentity}
                            onChange={(e) =>
                              patch({
                                historyCharIdentity: e.target.value,
                                identityArcPresetId: '',
                              })
                            }
                            placeholder="例：恋人、青梅、匿名网友"
                            maxLength={64}
                            className="w-full rounded-xl border-0 bg-white px-3 py-2.5 text-[13px] text-neutral-900 outline-none placeholder:text-neutral-300 focus:shadow-[0_0_0_1px_rgba(23,23,23,0.08)]"
                          />
                        </div>
                        <div>
                          <p className="mb-1.5 text-[11px] text-neutral-500">用户 · {'{{user}}'}</p>
                          <input
                            value={form.historyUserIdentity}
                            onChange={(e) =>
                              patch({
                                historyUserIdentity: e.target.value,
                                identityArcPresetId: '',
                              })
                            }
                            placeholder="例：恋人、被救下的人"
                            maxLength={64}
                            className="w-full rounded-xl border-0 bg-white px-3 py-2.5 text-[13px] text-neutral-900 outline-none placeholder:text-neutral-300 focus:shadow-[0_0_0_1px_rgba(23,23,23,0.08)]"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="rounded-xl bg-neutral-50 px-3 py-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-neutral-400">
                            Now · 现在身份
                          </p>
                          <p className="mt-0.5 text-[12px] text-neutral-500">开局当下双方的社会身份</p>
                        </div>
                        <button
                          type="button"
                          title="对换本行角色与用户"
                          disabled={!form.presentCharIdentity.trim() && !form.presentUserIdentity.trim()}
                          onClick={() => {
                            patch({
                              presentCharIdentity: form.presentUserIdentity,
                              presentUserIdentity: form.presentCharIdentity,
                              identityArcPresetId: '',
                            })
                          }}
                          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white text-neutral-500 shadow-sm transition-colors hover:text-neutral-800 disabled:opacity-30"
                        >
                          <ArrowLeftRight className="size-3.5" strokeWidth={2} />
                        </button>
                      </div>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <div>
                          <p className="mb-1.5 text-[11px] text-neutral-500">角色 · {'{{char}}'}</p>
                          <input
                            value={form.presentCharIdentity}
                            onChange={(e) =>
                              patch({
                                presentCharIdentity: e.target.value,
                                identityArcPresetId: '',
                              })
                            }
                            placeholder="例：直属上司、合租室友"
                            maxLength={64}
                            className="w-full rounded-xl border-0 bg-white px-3 py-2.5 text-[13px] text-neutral-900 outline-none placeholder:text-neutral-300 focus:shadow-[0_0_0_1px_rgba(23,23,23,0.08)]"
                          />
                        </div>
                        <div>
                          <p className="mb-1.5 text-[11px] text-neutral-500">用户 · {'{{user}}'}</p>
                          <input
                            value={form.presentUserIdentity}
                            onChange={(e) =>
                              patch({
                                presentUserIdentity: e.target.value,
                                identityArcPresetId: '',
                              })
                            }
                            placeholder="例：下属员工、租客"
                            maxLength={64}
                            className="w-full rounded-xl border-0 bg-white px-3 py-2.5 text-[13px] text-neutral-900 outline-none placeholder:text-neutral-300 focus:shadow-[0_0_0_1px_rgba(23,23,23,0.08)]"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                }
              />

              <div className="space-y-3">
                <p className="px-0.5 text-[11px] font-medium uppercase tracking-[0.14em] text-neutral-400">
                  Before vs After · 恋爱镜面对比
                </p>
                <CollapsiblePresetZone
                  en="Before"
                  zh="沦陷前"
                  summary={presetSummary(form.loveBeforeHint)}
                  hint="可多选 · 点选切换"
                  presets={
                    <PillRow>
                      {PERSONA_AI_LOVE_BEFORE_PRESETS.map((kw) => (
                        <Pill
                          key={kw}
                          label={kw}
                          active={presetTokens(form.loveBeforeHint).includes(kw)}
                          onClick={() => appendToken('loveBeforeHint', kw)}
                        />
                      ))}
                      <CustomPillInput onCommit={(v) => appendToken('loveBeforeHint', v)} />
                    </PillRow>
                  }
                  footer={
                    <SoftArea
                      value={form.loveBeforeHint}
                      onChange={(v) => patch({ loveBeforeHint: v })}
                      placeholder="恋爱前的界限感、距离、态度…"
                      maxLength={160}
                      rows={2}
                    />
                  }
                />
                <CollapsiblePresetZone
                  en="After"
                  zh="沦陷后"
                  summary={presetSummary(form.loveAfterHint)}
                  hint="可多选 · 点选切换"
                  presets={
                    <PillRow>
                      {PERSONA_AI_LOVE_AFTER_PRESETS.map((kw) => (
                        <Pill
                          key={kw}
                          label={kw}
                          active={presetTokens(form.loveAfterHint).includes(kw)}
                          onClick={() => appendToken('loveAfterHint', kw)}
                        />
                      ))}
                      <CustomPillInput onCommit={(v) => appendToken('loveAfterHint', v)} />
                    </PillRow>
                  }
                  footer={
                    <SoftArea
                      value={form.loveAfterHint}
                      onChange={(v) => patch({ loveAfterHint: v })}
                      placeholder="恋爱后的黏人程度、软化、表达…"
                      maxLength={160}
                      rows={2}
                    />
                  }
                />
              </div>

              <div className="space-y-3">
                <p className="px-0.5 text-[11px] font-medium uppercase tracking-[0.14em] text-neutral-400">
                  Conflict Patterns · 修罗场反应
                </p>
                <CollapsiblePresetZone
                  en="Jealousy"
                  zh="吃醋的样子"
                  summary={presetSummary(form.jealousyHint)}
                  presets={
                    <PillRow>
                      {PERSONA_AI_JEALOUSY_PRESETS.map((kw) => (
                        <Pill
                          key={kw}
                          label={kw}
                          active={presetTokens(form.jealousyHint).includes(kw)}
                          onClick={() => appendToken('jealousyHint', kw)}
                        />
                      ))}
                      <CustomPillInput onCommit={(v) => appendToken('jealousyHint', v)} />
                    </PillRow>
                  }
                  footer={
                    <SoftArea
                      value={form.jealousyHint}
                      onChange={(v) => patch({ jealousyHint: v })}
                      placeholder="吃醋时的言行…"
                      maxLength={160}
                      rows={2}
                    />
                  }
                />
                <CollapsiblePresetZone
                  en="Conflict"
                  zh="起冲突的样子"
                  summary={presetSummary(form.conflictHint)}
                  presets={
                    <PillRow>
                      {PERSONA_AI_CONFLICT_PRESETS.map((kw) => (
                        <Pill
                          key={kw}
                          label={kw}
                          active={presetTokens(form.conflictHint).includes(kw)}
                          onClick={() => appendToken('conflictHint', kw)}
                        />
                      ))}
                      <CustomPillInput onCommit={(v) => appendToken('conflictHint', v)} />
                    </PillRow>
                  }
                  footer={
                    <SoftArea
                      value={form.conflictHint}
                      onChange={(v) => patch({ conflictHint: v })}
                      placeholder="与恋人冲突时的反应…"
                      maxLength={160}
                      rows={2}
                    />
                  }
                />
              </div>

              <div>
                <SoftLabel en="Kinks & Desires" zh="XP 与情欲偏好" />
                <div className="relative overflow-hidden rounded-xl">
                  {!form.nsfwEnabled || !xpUnlocked ? (
                    <div className="relative">
                      <div className="pointer-events-none select-none blur-[6px]">
                        <SoftArea
                          value=""
                          onChange={() => {}}
                          placeholder="亲密接触时的偏好、主被动倾向…"
                          maxLength={100}
                          rows={3}
                        />
                      </div>
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/55 backdrop-blur-[2px]">
                        {!form.nsfwEnabled ? (
                          <button
                            type="button"
                            onClick={() => {
                              patch({ nsfwEnabled: true })
                              setXpUnlocked(true)
                            }}
                            className="rounded-full border border-neutral-300 bg-white px-4 py-2 text-[12px] font-medium text-neutral-800 shadow-sm transition-colors hover:border-neutral-900"
                          >
                            解锁视线并开启 XP
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setXpUnlocked(true)}
                            className="rounded-full border border-neutral-300 bg-white px-4 py-2 text-[12px] font-medium text-neutral-800 shadow-sm transition-colors hover:border-neutral-900"
                          >
                            解锁视线
                          </button>
                        )}
                        <p className="px-6 text-center text-[11px] text-neutral-400">
                          需确认后才可填写亲密偏好
                        </p>
                      </div>
                    </div>
                  ) : (
                    <CollapsiblePresetZone
                      en="XP"
                      zh="情欲偏好"
                      summary={presetSummary(form.nsfwHint)}
                      defaultOpen
                      presets={
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <PillRow>
                              {PERSONA_AI_NSFW_PRESETS.map((kw) => (
                                <Pill
                                  key={kw}
                                  label={kw}
                                  active={presetTokens(form.nsfwHint).includes(kw)}
                                  onClick={() => appendToken('nsfwHint', kw)}
                                />
                              ))}
                            </PillRow>
                            <button
                              type="button"
                              onClick={() => {
                                patch({ nsfwEnabled: false, nsfwHint: '' })
                                setXpUnlocked(false)
                              }}
                              className="shrink-0 text-[11px] text-neutral-400 hover:text-neutral-700"
                            >
                              关闭
                            </button>
                          </div>
                        </div>
                      }
                      footer={
                        <SoftArea
                          value={form.nsfwHint}
                          onChange={(v) => patch({ nsfwHint: v })}
                          placeholder="亲密接触时的偏好、节奏、主被动倾向…"
                          maxLength={500}
                          rows={4}
                        />
                      }
                    />
                  )}
                </div>
              </div>

              <div>
                <SoftLabel en="Notes" zh="补充说明" />
                <SoftArea
                  value={form.extraNotes}
                  onChange={(v) => patch({ extraNotes: v })}
                  placeholder="题材、禁忌、其他补充…"
                  maxLength={600}
                  rows={3}
                />
              </div>
            </div>
            )}
          </ChapterShell>
        ) : null}
      </motion.div>
    </AnimatePresence>
  )
}
