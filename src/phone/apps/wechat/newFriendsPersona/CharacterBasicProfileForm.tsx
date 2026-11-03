import { AnimatePresence, motion } from 'framer-motion'
import { Dices, ImagePlus, Link2, Plus, Sparkles, User, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { ApiConfig } from '../../api/types'
import { PlaceholderAwareTextarea } from './characterFieldPlaceholderPreview'
import type { Character, Gender } from './types'
import { generateCharacterBio } from './ai'
import { personaDb } from './idb'
import {
  calculateBMI,
  getZodiacSign,
  bmiStatusLabelZh,
  parseHeightCm,
  parseWeightKg,
  zodiacZhFromStoredMD,
  normalizeBirthdayMD,
} from './characterProfilePhysioUtils'
import { resolveCharacterAvatarUrl } from '../../../utils/characterAvatarUrl'
import { PHONE_NUM_FONT_FAMILY } from '../../../types'
import { MbtiPersonalityPickerGrid } from './MbtiPersonalityPickerGrid'
import { AnimalArchetypePickerGrid } from './AnimalArchetypePickerGrid'
import { getAnimalArchetypeOption } from './animalArchetype'
import { DEFAULT_WORLD_BACKGROUND_ID } from './worldBackgroundConstants'
import { formatWorldBackgroundForPrompt } from './worldBackgroundFormat'
import { PersonaNameLanguagePicker } from './PersonaNameLanguagePicker'
import {
  IDENTITY_POOL,
  daysInMonth,
  formatMD,
  loadPersonaNameLanguage,
  randomPersonaName,
  savePersonaNameLanguage,
  type PersonaNameLanguage,
} from './utils'

const SHEET_LINES = '#D2D0CB'
const FG = '#1E2024'
const MUTED = '#6A6E76'
const PAGE = '#EDEBE7'
const CARD = '#F8F7F4'
const FOIL = '#5A6574'
const FAINT = '#9AA0A8'
const FOIL_SOFT = '#E2E5EA'

const inputUnderline =
  'w-full border-0 border-b border-[#D2D0CB] bg-transparent py-1.5 text-[13px] text-[#1E2024] outline-none ring-0 transition-colors duration-200 placeholder:text-[#9AA0A8] focus:border-[#5A6574] focus:ring-0'

const numStyle = { fontFamily: PHONE_NUM_FONT_FAMILY } as const

function DualLabel({ zh, en }: { zh: string; en: string }) {
  return (
    <span className="flex shrink-0 flex-col leading-tight">
      <span className="text-[11px] font-semibold" style={{ color: FG }}>
        {zh}
      </span>
      <span className="font-mono text-[9px] font-bold tracking-[0.08em]" style={{ color: MUTED }}>
        {en}
      </span>
    </span>
  )
}

function CardField({
  zh,
  en,
  children,
}: {
  zh: string
  en: string
  children: ReactNode
}) {
  return (
    <div className="mb-2.5 flex items-center gap-2">
      <span className="w-[46px] shrink-0">
        <DualLabel zh={zh} en={en} />
      </span>
      <div className="min-w-0 flex-1 border-b pb-0.5" style={{ borderColor: SHEET_LINES }}>
        {children}
      </div>
    </div>
  )
}

/** 圆形印章 / LOGO 压印 */
function SealStamp({ text, size = 52 }: { text: string; size?: number }) {
  return (
    <div
      className="pointer-events-none flex items-center justify-center rounded-full border-[1.5px]"
      style={{
        width: size,
        height: size,
        borderColor: FG,
        color: FG,
        opacity: 0.16,
        transform: 'rotate(-14deg)',
      }}
      aria-hidden
    >
      <div
        className="flex size-[82%] items-center justify-center rounded-full border"
        style={{ borderColor: FG }}
      >
        <span
          className="whitespace-pre-line text-center font-serif leading-tight tracking-wide"
          style={{ fontSize: size * 0.16 }}
        >
          {text}
        </span>
      </div>
    </div>
  )
}

/** 右上角折页 */
function CornerFold() {
  return (
    <span className="pointer-events-none absolute right-0 top-0 z-[2] flex" aria-hidden>
      <span
        style={{
          width: 0,
          height: 0,
          borderStyle: 'solid',
          borderWidth: '0 15px 15px 0',
          borderColor: `transparent ${FOIL_SOFT} transparent transparent`,
        }}
      />
      <span
        className="absolute right-0 top-0"
        style={{
          width: 0,
          height: 0,
          borderStyle: 'solid',
          borderWidth: '0 15px 15px 0',
          borderColor: `transparent transparent ${SHEET_LINES} transparent`,
          opacity: 0.55,
          transform: 'translate(-0.5px, 0.5px)',
        }}
      />
    </span>
  )
}

/** 顶栏小徽记 */
function HeaderGlyph({ kind }: { kind: 'stats' | 'brief' | 'more' }) {
  if (kind === 'stats') {
    return (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden className="opacity-70">
        <rect x="1.5" y="8" width="2.5" height="4.5" stroke="currentColor" strokeWidth="1.2" />
        <rect x="5.75" y="4.5" width="2.5" height="8" stroke="currentColor" strokeWidth="1.2" />
        <rect x="10" y="2" width="2.5" height="10.5" stroke="currentColor" strokeWidth="1.2" />
      </svg>
    )
  }
  if (kind === 'brief') {
    return (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden className="opacity-70">
        <path d="M3 2.5h8v9H3z" stroke="currentColor" strokeWidth="1.2" />
        <path d="M5 5h4M5 7.5h4M5 10h2.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
      </svg>
    )
  }
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden className="opacity-70">
      <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M7 4.2v5.6M4.2 7h5.6" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  )
}

function InkSubCard({
  zh,
  en,
  right,
  children,
  decor = 'none',
  seal,
  glyph,
}: {
  zh: string
  en: string
  right?: ReactNode
  children: ReactNode
  /** fold=折角 · seal=印章 */
  decor?: 'fold' | 'seal' | 'none'
  seal?: string
  glyph?: 'stats' | 'brief' | 'more'
}) {
  return (
    <div
      className="relative mt-3 overflow-visible rounded-[18px] border-[1.5px]"
      style={{ borderColor: FG, background: CARD }}
    >
      {decor === 'fold' ? <CornerFold /> : null}
      <div className="overflow-hidden rounded-[16.5px]">
        <div
          className="relative flex items-center justify-between gap-2 px-3 py-2"
          style={{ background: FG, color: CARD }}
        >
          <div className="flex min-w-0 items-center gap-2">
            {glyph ? <HeaderGlyph kind={glyph} /> : null}
            <div className="min-w-0">
              <p className="text-[11px] font-semibold leading-none">{zh}</p>
              <p className="mt-1 font-serif text-[9px] tracking-[0.22em] opacity-80">{en}</p>
            </div>
          </div>
          {right}
        </div>
        <div className="relative px-3 py-3">
          {decor === 'seal' && seal ? (
            <div className="pointer-events-none absolute -right-1 bottom-1 z-[1]">
              <SealStamp text={seal} size={58} />
            </div>
          ) : null}
          {children}
        </div>
      </div>
    </div>
  )
}

function VerticalBarcode() {
  return (
    <div className="flex h-[148px] w-[18px] flex-col items-center justify-center gap-[2px]" aria-hidden>
      {Array.from({ length: 22 }, (_, i) => (
        <span
          key={i}
          className="w-full"
          style={{
            height: i % 5 === 0 ? 2.5 : 1.2,
            background: FG,
            opacity: i % 3 === 0 ? 0.9 : 0.35,
          }}
        />
      ))}
    </div>
  )
}

export type CharacterBasicProfileFormProps = {
  editorId: string
  character: Character
  isNpcPerspective: boolean
  protagonistCallsUser: string
  onProtagonistCallsChange: (v: string) => void
  onProtagonistCallsInteraction: () => void

  avatarFileInputRef: React.RefObject<HTMLInputElement | null>
  onPickAvatarFile: (file: File | null) => void

  patchCharacter: (p: Partial<Character>) => void
  /** 写入 MBTI 字段（仅作气质弱偏向；不再启用「人格设定」长文世界书） */
  onMbtiSelect: (nextCode: string) => void

  apiConfig: ApiConfig | null
  bioGenerating: boolean
  setBioGenerating: (v: boolean) => void
  onBioApiMissing: () => void
  onBioWorldBookMissing: () => void

  genderLabelZh: (g: Gender | undefined | null) => string
}

type FormShape = {
  name: string
  motto: string
  gender: Gender
  age: string
  height: string
  weight: string
  birthdayMD: string
  mbti: string
  animalArchetype: string
  identity: string
  bio: string
  avatarUrl: string
}

function toForm(character: Character): FormShape {
  return {
    name: character.name,
    motto: character.motto ?? '',
    gender: character.gender,
    age: character.age != null ? String(character.age) : '',
    height: character.height ?? '',
    weight: character.weight ?? '',
    birthdayMD: character.birthdayMD ?? '01-01',
    mbti: character.mbti ?? '',
    animalArchetype: character.animalArchetype ?? '',
    identity: character.identity ?? '',
    bio: character.bio ?? '',
    avatarUrl: character.avatarUrl ?? '',
  }
}

function formToPatch(f: FormShape): Partial<Character> {
  const ageTrim = f.age.trim()
  const ageNum = ageTrim ? Number(ageTrim) : null
  const md = normalizeBirthdayMD(f.birthdayMD)
  return {
    name: f.name,
    motto: f.motto.trim() ? f.motto : undefined,
    gender: f.gender,
    age: ageNum != null && Number.isFinite(ageNum) ? ageNum : null,
    height: f.height,
    weight: f.weight,
    birthdayMD: md,
    zodiac: zodiacZhFromStoredMD(md),
    mbti: f.mbti.trim() || undefined,
    animalArchetype: f.animalArchetype.trim() || undefined,
    identity: f.identity,
    bio: f.bio,
    avatarUrl: f.avatarUrl.trim(),
  }
}

export function CharacterBasicProfileForm({
  editorId,
  character,
  isNpcPerspective,
  protagonistCallsUser,
  onProtagonistCallsChange,
  onProtagonistCallsInteraction,
  avatarFileInputRef,
  onPickAvatarFile,
  patchCharacter,
  onMbtiSelect,
  apiConfig,
  bioGenerating,
  setBioGenerating,
  onBioApiMissing,
  onBioWorldBookMissing,
  genderLabelZh,
}: CharacterBasicProfileFormProps) {
  const [avatarSheet, setAvatarSheet] = useState(false)
  const [urlDialog, setUrlDialog] = useState(false)
  const [urlDraft, setUrlDraft] = useState('')
  const [mbtiSheet, setMbtiSheet] = useState(false)
  const [animalSheet, setAnimalSheet] = useState(false)
  const [identityFocused, setIdentityFocused] = useState(false)
  const [nameLanguage, setNameLanguage] = useState<PersonaNameLanguage>(() => loadPersonaNameLanguage())

  /** 打字机：临时正文，结束时写回表单与 Character */
  const [bioTyping, setBioTyping] = useState<string | null>(null)
  const typingTimerRef = useRef<number | null>(null)

  const prevIdRef = useRef<string>('')
  const characterRef = useRef(character)
  characterRef.current = character

  const [form, setForm] = useState<FormShape>(() => toForm(character))

  const heightW = form.height
  const weightW = form.weight
  const birthdayW = form.birthdayMD

  const bmiMemo = useMemo(() => {
    const hCm = parseHeightCm(heightW)
    const wKg = parseWeightKg(weightW)
    const bmi = hCm != null && wKg != null ? calculateBMI(hCm, wKg) : null
    if (bmi == null) return null
    return { value: bmi, tier: bmiStatusLabelZh(bmi) }
  }, [heightW, weightW])

  const zodiacMemo = useMemo(() => getZodiacSign(birthdayW), [birthdayW])

  const birthdayParts = useMemo(() => {
    const v = form.birthdayMD || ''
    const m = Number(v.slice(0, 2))
    const d = Number(v.slice(3, 5))
    return {
      month: Number.isFinite(m) && m >= 1 && m <= 12 ? m : 1,
      day: Number.isFinite(d) && d >= 1 && d <= 31 ? d : 1,
    }
  }, [form.birthdayMD])

  useEffect(() => {
    const cid = character.id.trim()
    if (!cid) return
    if (prevIdRef.current !== cid) {
      prevIdRef.current = cid
      setForm(toForm(characterRef.current))
    }
  }, [character.id])

  useEffect(() => {
    const next = character.avatarUrl ?? ''
    setForm((prev) => (prev.avatarUrl === next ? prev : { ...prev, avatarUrl: next }))
  }, [character.avatarUrl])

  useEffect(() => {
    const m = character.mbti ?? ''
    setForm((prev) => (prev.mbti === m ? prev : { ...prev, mbti: m }))
  }, [character.mbti])

  useEffect(() => {
    const a = character.animalArchetype ?? ''
    setForm((prev) => (prev.animalArchetype === a ? prev : { ...prev, animalArchetype: a }))
  }, [character.animalArchetype])

  const pushField = useCallback(
    (patch: Partial<FormShape>) => {
      setForm((prev) => {
        const next = { ...prev, ...patch }
        patchCharacter(formToPatch(next))
        return next
      })
    },
    [patchCharacter],
  )

  const formRef = useRef(form)
  formRef.current = form

  const runBioTypewriter = useCallback(
    (full: string) => {
      if (typingTimerRef.current) window.clearInterval(typingTimerRef.current)
      setBioTyping('')
      let i = 0
      typingTimerRef.current = window.setInterval(() => {
        i += 1
        const slice = full.slice(0, i)
        setBioTyping(slice)
        if (i >= full.length) {
          if (typingTimerRef.current) window.clearInterval(typingTimerRef.current)
          typingTimerRef.current = null
          setBioTyping(null)
          setForm((prev) => {
            const next = { ...prev, bio: full }
            patchCharacter(formToPatch(next))
            return next
          })
        }
      }, 16)
    },
    [patchCharacter],
  )

  useEffect(() => {
    return () => {
      if (typingTimerRef.current) window.clearInterval(typingTimerRef.current)
    }
  }, [])

  const onAiExpandBrief = async () => {
    if (bioGenerating) return
    try {
      setBioGenerating(true)
      if (!apiConfig?.apiUrl || !apiConfig?.apiKey || !apiConfig?.modelId) {
        onBioApiMissing()
        return
      }
      const merged: Character = { ...character, ...formToPatch(formRef.current) }
      const identityContext = merged.playerIdentityId?.trim()
        ? await personaDb.getPlayerIdentity(merged.playerIdentityId)
        : await personaDb.getCurrentIdentity()
      const wbRow =
        merged.worldBackgroundEnabled === false ? null : await personaDb.getWorldBackground(merged.worldBackgroundId ?? DEFAULT_WORLD_BACKGROUND_ID)
      const worldBackgroundPrompt = formatWorldBackgroundForPrompt(wbRow)
      let v = ''
      try {
        v = await generateCharacterBio({
          apiConfig,
          character: merged,
          identityContext,
          worldBackgroundPrompt,
        })
      } catch (e) {
        if (e instanceof Error && /缺少世界书内容/i.test(e.message)) onBioWorldBookMissing()
        else if (e instanceof Error && /未配置 AI API/i.test(e.message)) onBioApiMissing()
        throw e
      }
      runBioTypewriter(v)
    } catch {
      /* 错误已在 overlay / toast 钩子中处理 */
    } finally {
      setBioGenerating(false)
    }
  }

  const openLocalPicker = () => {
    avatarFileInputRef.current?.click()
    setAvatarSheet(false)
  }

  const confirmUrlAvatar = () => {
    const t = urlDraft.trim()
    if (/^https?:\/\//i.test(t)) {
      pushField({ avatarUrl: t })
      setUrlDialog(false)
      setUrlDraft('')
      setAvatarSheet(false)
    }
  }

  const displayBio = bioTyping != null ? bioTyping : form.bio
  const avatarSrc = resolveCharacterAvatarUrl({ avatarUrl: form.avatarUrl })
  const cardNo = character.id.replace(/\D/g, '').slice(-8) || '00000000'
  const latinHint = form.name.trim() || '—'

  return (
    <div className="pb-8">
      {/* PERSONA CARD */}
      <div
        className="overflow-hidden rounded-[18px] border-[1.5px]"
        style={{ borderColor: FG, background: CARD }}
      >
        <div
          className="flex items-center justify-between px-3 py-2"
          style={{ background: FG, color: CARD }}
        >
          <div className="flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden className="opacity-70">
              <rect x="2" y="2.5" width="10" height="9" rx="1.2" stroke="currentColor" strokeWidth="1.2" />
              <path d="M4.5 5.5h5M4.5 8h3.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
            </svg>
            <div>
              <p className="text-[11px] font-semibold leading-none">人设名片</p>
              <p className="mt-1 font-serif text-[9px] tracking-[0.22em] opacity-80">PERSONA CARD</p>
            </div>
          </div>
        </div>

        <div className="flex gap-3 px-3 pb-2.5 pt-3.5">
          <div className="w-[104px] shrink-0">
            <button
              type="button"
              onClick={() => setAvatarSheet(true)}
              className="relative h-[132px] w-[104px] overflow-hidden rounded-xl border-[1.5px]"
              style={{ borderColor: FG, background: FOIL_SOFT }}
            >
              {avatarSrc ? (
                <img src={avatarSrc} alt="" className="size-full object-cover" />
              ) : (
                <span className="flex size-full items-center justify-center">
                  <User className="size-12" style={{ color: FAINT }} strokeWidth={1.2} />
                </span>
              )}
              <span
                className="absolute bottom-1.5 right-1.5 flex size-[22px] items-center justify-center rounded-full border-[1.5px] text-[12px]"
                style={{ background: FG, color: CARD, borderColor: CARD }}
              >
                <Plus className="size-3.5" strokeWidth={2} />
              </span>
            </button>
            <p
              className="mt-2 truncate text-center font-serif text-[14px] font-bold tracking-[0.1em]"
              style={{ color: FG }}
            >
              {form.name.trim() || '未命名'}
            </p>
          </div>

          <div className="min-w-0 flex-1">
            <CardField zh="姓名" en="NAME">
              <div className="flex items-center gap-1">
                <input
                  value={form.name}
                  placeholder="姓名"
                  className="min-w-0 flex-1 border-0 bg-transparent py-0.5 font-serif text-[13px] outline-none"
                  style={{ color: FG }}
                  onChange={(e) => pushField({ name: e.target.value })}
                />
                <PersonaNameLanguagePicker
                  tone="card"
                  value={nameLanguage}
                  onChange={(next) => {
                    setNameLanguage(next)
                    savePersonaNameLanguage(next)
                  }}
                />
                <button
                  type="button"
                  title="随机姓名"
                  onClick={() => pushField({ name: randomPersonaName(form.gender, nameLanguage) })}
                  className="shrink-0 rounded-full p-1 opacity-70 transition-opacity hover:opacity-100"
                  style={{ color: FG }}
                  aria-label="随机姓名"
                >
                  <Dices className="size-3.5" strokeWidth={1.75} />
                </button>
              </div>
            </CardField>
            <CardField zh="年龄" en="AGE">
              <input
                value={form.age}
                inputMode="numeric"
                placeholder="—"
                className="w-full border-0 bg-transparent py-0.5 text-[13px] outline-none"
                style={{ ...numStyle, color: FG }}
                onChange={(e) => pushField({ age: e.target.value })}
              />
            </CardField>
            <CardField zh="身高" en="HEIGHT">
              <div className="flex items-center gap-1">
                <input
                  value={form.height}
                  inputMode="decimal"
                  placeholder="—"
                  className="min-w-0 flex-1 border-0 bg-transparent py-0.5 font-mono text-[13px] outline-none"
                  style={{ color: FG }}
                  onChange={(e) => pushField({ height: e.target.value })}
                />
                <span className="shrink-0 text-[11px]" style={{ color: FAINT }}>
                  cm
                </span>
              </div>
            </CardField>
            <div className="mb-2.5">
              <div className="mb-1.5">
                <DualLabel zh="性别" en="GENDER" />
              </div>
              <div className="flex gap-1.5">
                {(['male', 'female', 'other'] as Gender[]).map((g) => {
                  const on = form.gender === g
                  return (
                    <button
                      key={g}
                      type="button"
                      onClick={() => pushField({ gender: g })}
                      className="h-[30px] min-w-[42px] rounded-full border-[1.5px] px-2.5 text-[12px] font-semibold"
                      style={{
                        borderColor: on ? FG : SHEET_LINES,
                        background: on ? FG : 'transparent',
                        color: on ? CARD : MUTED,
                      }}
                    >
                      {genderLabelZh(g)}
                    </button>
                  )
                })}
              </div>
            </div>
            <CardField zh="人格" en="MBTI">
              <button
                type="button"
                onClick={() => setMbtiSheet(true)}
                className="w-full border-0 bg-transparent py-0.5 text-left text-[13px] outline-none"
                style={{ color: form.mbti?.trim() ? FG : FAINT }}
              >
                {form.mbti?.trim() || '选择'}
              </button>
            </CardField>
            <CardField zh="星座" en="SIGN">
              <button
                type="button"
                className="w-full border-0 bg-transparent py-0.5 text-left font-serif text-[13px] outline-none"
                style={{ color: zodiacMemo ? FG : FAINT }}
                onClick={() => {
                  const el = document.getElementById('persona-card-birthday')
                  el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
                }}
              >
                {zodiacMemo ? zodiacMemo.zh : '选生日'}
              </button>
            </CardField>
          </div>

          <div className="flex items-center self-stretch py-1">
            <VerticalBarcode />
          </div>
        </div>

        <div
          className="relative mx-3 mb-3 rounded-[12px] border px-3 py-2.5"
          style={{ background: FOIL_SOFT, borderColor: SHEET_LINES }}
        >
          <div className="pointer-events-none absolute -right-1 top-1 z-[1]">
            <SealStamp text={'档案\n认证'} size={50} />
          </div>
          <div className="mb-1">
            <DualLabel zh="信条" en="MOTTO" />
          </div>
          <textarea
            value={form.motto}
            rows={2}
            maxLength={24}
            placeholder="「一句信条…」"
            className="relative z-[1] w-full resize-none border-0 bg-transparent font-serif text-[13px] italic leading-snug outline-none placeholder:not-italic"
            style={{ color: FG, fontFamily: 'Georgia, "Noto Serif SC", serif' }}
            onChange={(e) => pushField({ motto: e.target.value })}
          />
          <div className="relative z-[1] mt-1.5 flex items-end justify-between font-mono text-[9px]" style={{ color: FAINT }}>
            <span className="font-serif text-[14px] not-italic" style={{ color: FG, opacity: 0.75, fontFamily: 'Georgia, cursive' }}>
              {latinHint}
            </span>
            <span>NO.{cardNo}</span>
          </div>
        </div>
      </div>

      <InkSubCard zh="档案速览" en="QUICK STATS" decor="none" glyph="stats">
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-[12px] border px-2.5 py-2.5" style={{ borderColor: SHEET_LINES, background: PAGE }}>
            <DualLabel zh="体重" en="WEIGHT" />
            <input
              value={form.weight}
              inputMode="decimal"
              placeholder="—"
              className="mt-1.5 w-full border-0 bg-transparent text-[15px] font-bold outline-none"
              style={{ color: FG }}
              onChange={(e) => pushField({ weight: e.target.value })}
            />
          </div>
          <div className="rounded-[12px] border px-2.5 py-2.5" style={{ borderColor: SHEET_LINES, background: PAGE }}>
            <DualLabel zh="体质" en="BMI" />
            <p className="mt-1.5 text-[15px] font-bold" style={{ color: FG }}>
              {bmiMemo ? bmiMemo.value.toFixed(1) : '—'}
            </p>
            {bmiMemo ? (
              <p className="mt-0.5 text-[10px]" style={{ color: MUTED }}>
                {bmiMemo.tier}
              </p>
            ) : null}
          </div>
          <div className="rounded-[12px] border px-2.5 py-2.5" style={{ borderColor: SHEET_LINES, background: PAGE }}>
            <DualLabel zh="称呼" en="CALLS" />
            <input
              value={protagonistCallsUser}
              placeholder="—"
              className="mt-1.5 w-full border-0 bg-transparent text-[15px] font-bold outline-none"
              style={{ color: FG }}
              onChange={(e) => {
                onProtagonistCallsInteraction()
                onProtagonistCallsChange(e.target.value)
              }}
            />
          </div>
        </div>
        <p className="mt-2.5 text-[10px] leading-relaxed" style={{ color: FAINT }}>
          {isNpcPerspective
            ? '称呼与人脉「你↔主角」同步。'
            : '称呼为主角如何叫你；与同档 NPC 共用。'}
        </p>
      </InkSubCard>

      <InkSubCard
        zh="角色简述"
        en="THE BRIEF"
        decor="seal"
        seal={'LUMI\nFILE'}
        glyph="brief"
        right={
          <button
            type="button"
            disabled={bioGenerating}
            onClick={() => void onAiExpandBrief()}
            className="inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-medium disabled:opacity-50"
            style={{ borderColor: 'rgba(248,247,244,0.35)', color: CARD, background: 'transparent' }}
          >
            <Sparkles className="size-3" strokeWidth={1.75} />
            {bioGenerating ? '扩写中' : 'AI 扩写'}
          </button>
        }
      >
        <PlaceholderAwareTextarea
          value={displayBio}
          onChange={(v) => {
            setBioTyping(null)
            pushField({ bio: v })
          }}
          characterId={editorId}
          className="min-h-[5.5rem] w-full resize-none border-0 bg-transparent text-[12px] leading-relaxed outline-none placeholder:text-[#9AA0A8]"
          style={{ color: MUTED }}
          rows={5}
          placeholder="电竞选手，话少、胜负欲强。亲近时会露出别扭的温柔。"
        />
      </InkSubCard>

      <div id="persona-card-birthday">
        <InkSubCard zh="命理与定位" en="MORE" decor="fold" glyph="more">
          <div className="space-y-3">
            <div>
              <DualLabel zh="生日" en="BIRTHDAY" />
              <div className="mt-2 flex flex-wrap items-end gap-3">
                <label className="min-w-[6rem] flex-1">
                  <DualLabel zh="月" en="MONTH" />
                  <select
                    value={birthdayParts.month}
                    className={`${inputUnderline} mt-1 block w-full bg-transparent`}
                    style={numStyle}
                    onChange={(e) => {
                      const month = Number(e.target.value)
                      const maxD = daysInMonth(month)
                      const day = Math.min(birthdayParts.day, maxD)
                      pushField({ birthdayMD: formatMD(month, day) })
                    }}
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((mo) => (
                      <option key={mo} value={mo}>
                        {mo} 月
                      </option>
                    ))}
                  </select>
                </label>
                <label className="min-w-[6rem] flex-1">
                  <DualLabel zh="日" en="DAY" />
                  <select
                    value={birthdayParts.day}
                    className={`${inputUnderline} mt-1 block w-full bg-transparent`}
                    style={numStyle}
                    onChange={(e) => {
                      const day = Number(e.target.value)
                      pushField({ birthdayMD: formatMD(birthdayParts.month, day) })
                    }}
                  >
                    {Array.from({ length: daysInMonth(birthdayParts.month) }, (_, i) => i + 1).map((dy) => (
                      <option key={dy} value={dy}>
                        {dy} 日
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            <div>
              <DualLabel zh="动物塑" en="ANIMAL" />
              <button
                type="button"
                onClick={() => setAnimalSheet(true)}
                className={`${inputUnderline} mt-1 flex w-full items-center justify-between text-left`}
              >
                <span style={{ color: form.animalArchetype?.trim() ? FG : FAINT }}>
                  {getAnimalArchetypeOption(form.animalArchetype)?.label || '未选择'}
                </span>
              </button>
            </div>

            <div>
              <DualLabel zh="身份" en="ROLE" />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {IDENTITY_POOL.map((x) => {
                  const selected = form.identity === x && !identityFocused
                  return (
                    <button
                      key={x}
                      type="button"
                      onClick={() => pushField({ identity: selected ? '' : x })}
                      className="rounded-full border px-3 py-1 text-[11px] font-medium"
                      style={{
                        borderColor: selected ? FG : SHEET_LINES,
                        background: selected ? FG : 'transparent',
                        color: selected ? CARD : MUTED,
                      }}
                    >
                      {x}
                    </button>
                  )
                })}
              </div>
              <input
                value={form.identity}
                onFocus={() => setIdentityFocused(true)}
                onBlur={() => setIdentityFocused(false)}
                placeholder="自定义职业或身份…"
                className={`${inputUnderline} mt-3`}
                onChange={(e) => pushField({ identity: e.target.value })}
              />
            </div>
          </div>
        </InkSubCard>
      </div>

      <div
        className="mt-4 flex items-center justify-center gap-2.5 rounded-[10px] py-2.5"
        style={{ background: FG, color: CARD }}
      >
        <span className="h-px w-5 opacity-55" style={{ background: FOIL }} />
        <span className="text-center">
          <span className="block text-[10px] font-semibold leading-none">爱无止境</span>
          <span className="mt-1 block font-serif text-[9px] tracking-[0.26em] opacity-80">LOVE ENDLESS</span>
        </span>
        <span className="h-px w-5 opacity-55" style={{ background: FOIL }} />
      </div>

      <AnimatePresence>
        {avatarSheet && (
          <motion.div
            className="fixed inset-0 z-[1250]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button type="button" className="absolute inset-0 bg-black/30" aria-label="关闭" onClick={() => setAvatarSheet(false)} />
            <motion.div
              initial={{ y: '110%' }}
              animate={{ y: 0 }}
              exit={{ y: '110%' }}
              transition={{ type: 'spring', damping: 38, stiffness: 420 }}
              className="absolute inset-x-0 bottom-0 max-h-[50vh] rounded-t-[20px] border-t bg-white px-5 pt-6"
              style={{ borderColor: SHEET_LINES, paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
            >
              <div className="mx-auto mb-5 h-1 w-9 rounded-full bg-neutral-300" aria-hidden />
              <p className="text-[15px] font-semibold text-neutral-950">头像来源</p>
              <button
                type="button"
                className="mt-6 flex w-full items-center gap-3 rounded-xl border border-neutral-200 py-4 pl-5 pr-4 text-[14px] text-neutral-800 active:bg-neutral-50"
                onClick={openLocalPicker}
              >
                <ImagePlus className="size-5 shrink-0 text-neutral-500" strokeWidth={1.5} />
                本地上传（相册 / 文件） · Local File
              </button>
              <button
                type="button"
                className="mt-2 flex w-full items-center gap-3 rounded-xl border border-neutral-200 py-4 pl-5 pr-4 text-[14px] text-neutral-800 active:bg-neutral-50"
                onClick={() => {
                  setUrlDialog(true)
                  setAvatarSheet(false)
                }}
              >
                <Link2 className="size-5 shrink-0 text-neutral-500" strokeWidth={1.5} />
                链接提取（图片地址） · URL
              </button>
              {form.avatarUrl?.trim() ? (
                <button
                  type="button"
                  className="mt-2 w-full py-3 text-center text-[12px] font-medium text-neutral-400"
                  onClick={() => {
                    pushField({ avatarUrl: '' })
                    setAvatarSheet(false)
                  }}
                >
                  移除当前头像
                </button>
              ) : null}
              <button
                type="button"
                className="mx-auto mb-6 mt-3 block rounded-full px-5 py-2 text-[13px] text-neutral-400"
                onClick={() => setAvatarSheet(false)}
              >
                取消
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {urlDialog && (
        <div className="fixed inset-0 z-[1260] flex items-center justify-center bg-black/35 px-4">
          <div className="w-full max-w-sm rounded-[16px] border border-neutral-200 bg-white p-5 shadow-[0_12px_40px_rgba(0,0,0,.08)]">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[14px] font-semibold text-neutral-950">头像链接 · URL</p>
              <button type="button" className="rounded-full p-2 text-neutral-400 hover:bg-neutral-100" onClick={() => setUrlDialog(false)} aria-label="关闭">
                <X className="size-5" strokeWidth={1.5} />
              </button>
            </div>
            <input
              value={urlDraft}
              onChange={(e) => setUrlDraft(e.target.value)}
              placeholder="https://…"
              className={`${inputUnderline} mt-5`}
              autoFocus
            />
            <button
              type="button"
              onClick={() => confirmUrlAvatar()}
              className="mt-6 w-full rounded-xl bg-neutral-950 py-3.5 text-[14px] font-medium text-white"
            >
              完成
            </button>
          </div>
        </div>
      )}

      <AnimatePresence>
        {mbtiSheet && (
          <motion.div className="fixed inset-0 z-[1252]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <button type="button" className="absolute inset-0 bg-black/35" aria-label="关闭" onClick={() => setMbtiSheet(false)} />
            <motion.div
              initial={{ y: '115%' }}
              animate={{ y: 0 }}
              exit={{ y: '115%' }}
              transition={{ type: 'spring', damping: 36, stiffness: 400 }}
              className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-[22px] border-t border-neutral-200 bg-white px-5 pt-8"
              style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className="mx-auto mb-6 h-1 w-9 rounded-full bg-neutral-300" aria-hidden />
              <p className="text-[15px] font-semibold text-neutral-950">MBTI · 人格类型</p>
              <p className="mt-1 text-[11px] text-neutral-500">十六型 · 点击下方卡片选择</p>
              <div className="mt-5 pb-4">
                <MbtiPersonalityPickerGrid
                  value={form.mbti ?? ''}
                  onSelect={(m) => {
                    setForm((prev) => ({ ...prev, mbti: m }))
                    onMbtiSelect(m)
                    setMbtiSheet(false)
                  }}
                />
              </div>
              <button
                type="button"
                className="mx-auto mb-16 mt-4 block px-10 py-3 text-[13px] font-medium text-neutral-400 underline-offset-4 hover:text-neutral-600"
                onClick={() => {
                  setForm((prev) => ({ ...prev, mbti: '' }))
                  onMbtiSelect('')
                  setMbtiSheet(false)
                }}
              >
                清空选择
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {animalSheet && (
          <motion.div className="fixed inset-0 z-[1252]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <button type="button" className="absolute inset-0 bg-black/35" aria-label="关闭" onClick={() => setAnimalSheet(false)} />
            <motion.div
              initial={{ y: '115%' }}
              animate={{ y: 0 }}
              exit={{ y: '115%' }}
              transition={{ type: 'spring', damping: 36, stiffness: 400 }}
              className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-[22px] border-t border-neutral-200 bg-white px-5 pt-8"
              style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className="mx-auto mb-6 h-1 w-9 rounded-full bg-neutral-300" aria-hidden />
              <p className="text-[15px] font-semibold text-neutral-950">动物塑 · 气质倾向</p>
              <p className="mt-1 text-[11px] text-neutral-500">十三种常见动物系气质 · 点击下方卡片选择</p>
              <div className="mt-5 pb-4">
                <AnimalArchetypePickerGrid
                  value={form.animalArchetype ?? ''}
                  onSelect={(id) => {
                    setForm((prev) => ({ ...prev, animalArchetype: id }))
                    pushField({ animalArchetype: id })
                    setAnimalSheet(false)
                  }}
                />
              </div>
              <button
                type="button"
                className="mx-auto mb-16 mt-4 block px-10 py-3 text-[13px] font-medium text-neutral-400 underline-offset-4 hover:text-neutral-600"
                onClick={() => {
                  setForm((prev) => ({ ...prev, animalArchetype: '' }))
                  pushField({ animalArchetype: undefined })
                  setAnimalSheet(false)
                }}
              >
                清空选择
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <input
        ref={avatarFileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          onPickAvatarFile(e.target.files?.[0] ?? null)
          e.target.value = ''
        }}
      />
    </div>
  )
}
