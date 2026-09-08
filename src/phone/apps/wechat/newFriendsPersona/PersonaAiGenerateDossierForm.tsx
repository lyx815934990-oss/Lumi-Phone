import { AnimatePresence, motion } from 'framer-motion'
import { useRef } from 'react'
import {
  ChipField,
  FieldGroup,
  FreeTextField,
  IdentityQuickRow,
  MbtiBinaryField,
  RelationshipArcField,
  SoftLabel,
  TinySupplement,
} from './personaAiDossierFieldUi'
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
  PERSONA_AI_IDENTITY_ARC_PRESETS,
  PERSONA_AI_JEALOUSY_PRESETS,
  PERSONA_AI_LIFE_HABITS_PRESETS,
  PERSONA_AI_LOVE_AFTER_PRESETS,
  PERSONA_AI_LOVE_BEFORE_PRESETS,
  PERSONA_AI_MEETING_PROCESS_PRESETS,
  PERSONA_AI_NSFW_PRESETS,
  PERSONA_AI_OCCUPATION_PRESETS,
  PERSONA_AI_ORIENTATION_PRESETS,
  PERSONA_AI_OUTFIT_PRESETS,
  PERSONA_AI_PAIN_POINTS_PRESETS,
  PERSONA_AI_RELATIONSHIP_HISTORY_PRESETS,
  PERSONA_AI_SOCIAL_MASK_PRESETS,
  PERSONA_AI_SPEECH_STYLE_PRESETS,
  applyPersonaAiIdentityArcPreset,
  applyPersonaAiMeetingProcessPreset,
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

const SOCIAL_FAMILY_PRESETS = [
  '重男轻女的父母',
  '独生宠爱',
  '重组家庭',
  '家人疏离少联系',
  '父母期望很高',
  '手足竞争',
] as const

const SOCIAL_FRIENDS_PRESETS = [
  '唯一死党',
  '两三深交',
  '酒肉朋友多',
  '圈子小但稳',
  '几乎不社交',
  '线上好友为主',
] as const

const SOCIAL_WORK_PRESETS = [
  '客气不深的同事',
  '有竞争对手',
  '带教/导师',
  '下属听话',
  '办公室政治敏感',
  '独立作业少协作',
] as const

/** 关系轨迹两侧常用短选项（完整列表过长，取高频） */
const ARC_SIDE_PRESETS = [
  '陌生人',
  '刚认识',
  '网友见面',
  '青梅竹马',
  '同班同学',
  '同事',
  '朋友 · 常聊',
  '死党',
  '暧昧 / 试探中',
  '暗恋对方',
  '恋人 / 稳定交往',
  '前任 · 仍有牵扯',
  '合租室友',
  '邻居',
] as const

function presetTokens(value: string): string[] {
  return value
    .split(/[,，、;｜|]+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

function filled(v: string | undefined): boolean {
  return Boolean(v?.trim())
}

/** 各 tab 用于进度点的字段键 */
export const PERSONA_AI_TAB_PROGRESS_KEYS: Record<
  PersonaAiDossierTabId,
  (keyof PersonaAiGenerateForm)[]
> = {
  '01': [
    'referencePersonaHint',
    'nameHint',
    'avatarUrl',
    'ageHint',
    'occupationHint',
    'mbtiHint',
    'orientationHint',
  ],
  '02': [
    'hairColorHint',
    'hairStyleHint',
    'bodyShapeHint',
    'outfitHint',
    'appearanceHint',
    'auraHint',
  ],
  '03': [
    'backgroundHint',
    'relationshipHistoryHint',
    'hobbiesHint',
    'lifeHabitsHint',
    'speechStyleHint',
    'painPointsHint',
  ],
  '04': ['socialFamilyHint', 'socialFriendsHint', 'socialWorkHint', 'socialMaskHint', 'gapMoeHint'],
  '05': [
    'relationDetailHint',
    'historyCharIdentity',
    'presentCharIdentity',
    'relationToUser',
    'loveBeforeHint',
    'loveAfterHint',
    'jealousyHint',
    'conflictHint',
    'nsfwHint',
    'extraNotes',
  ],
}

export type PersonaAiTabFillState = 'empty' | 'partial' | 'full'

export function personaAiTabFillState(
  form: PersonaAiGenerateForm,
  tabId: PersonaAiDossierTabId,
): PersonaAiTabFillState {
  if (form.referencePersonaDirectGenerate && tabId !== '01') {
    return filled(form.referencePersonaHint) ? 'full' : 'empty'
  }
  const keys = PERSONA_AI_TAB_PROGRESS_KEYS[tabId]
  let n = 0
  for (const k of keys) {
    if (k === 'nsfwHint' && !form.nsfwEnabled) continue
    if (filled(String(form[k] ?? ''))) n += 1
  }
  const total =
    tabId === '05' && !form.nsfwEnabled
      ? keys.filter((k) => k !== 'nsfwHint').length
      : keys.length
  if (n <= 0) return 'empty'
  if (n >= total) return 'full'
  return 'partial'
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
      <div className="space-y-5 px-5 py-5">{children}</div>
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

  const pastArc = form.historyCharIdentity.trim()
  const presentArc = form.relationToUser.trim() || form.presentCharIdentity.trim()

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={activeTab}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15, ease: TAB_EASE }}
      >
        {activeTab === '01' ? (
          <ChapterShell code="01" en="IDENTITY" zh="身份锚定">
            <FreeTextField
              en="Reference"
              zh="参考人物"
              value={form.referencePersonaHint}
              onChange={(v) => {
                patch(
                  v.trim()
                    ? { referencePersonaHint: v }
                    : { referencePersonaHint: v, referencePersonaDirectGenerate: false },
                )
              }}
              placeholder="填写角色或人物名；可附作品名。多名用顿号或逗号分隔"
              maxLength={300}
              rows={2}
              footer={
                <div className="flex items-center justify-between gap-3 py-0.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-medium text-neutral-800">直接生成该人物档案</p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-neutral-400">
                      {form.referencePersonaDirectGenerate
                        ? '已打开：仅按参考人物生成；其余章节已锁定'
                        : '关闭 = 只借气质；打开 = 只按参考人物生成'}
                    </p>
                  </div>
                  <PlatinumSwitch
                    checked={form.referencePersonaDirectGenerate}
                    onChange={(next) => patch({ referencePersonaDirectGenerate: next })}
                    disabled={!form.referencePersonaHint.trim()}
                    aria-label="直接生成该人物档案"
                  />
                </div>
              }
            />

            <div
              className={`relative space-y-5 ${
                form.referencePersonaDirectGenerate ? 'pointer-events-none select-none opacity-40' : ''
              }`}
              aria-disabled={form.referencePersonaDirectGenerate || undefined}
            >
              {form.referencePersonaDirectGenerate ? (
                <div className="rounded-xl border border-neutral-200/80 bg-neutral-50 px-4 py-3">
                  <p className="text-[12px] font-medium text-neutral-800">其余选项已锁定</p>
                  <p className="mt-0.5 text-[11px] text-neutral-400">
                    关闭「直接生成」后可继续填写姓名、外貌、亲密等种子
                  </p>
                </div>
              ) : null}

              <IdentityQuickRow
                avatarUrl={form.avatarUrl}
                name={form.nameHint}
                age={form.ageHint}
                gender={form.gender}
                avatarInputRef={avatarInputRef}
                onAvatarPick={pickAvatarFile}
                onClearAvatar={() => patch({ avatarUrl: '' })}
                onNameChange={(v) => patch({ nameHint: v })}
                onRandomName={() => patch({ nameHint: randomChineseName(form.gender) })}
                onAgeChange={(v) => patch({ ageHint: v })}
                onRandomAge={() =>
                  patch({ ageHint: `${16 + Math.floor(Math.random() * 20)}岁` })
                }
              />

              <ChipField
                en="Gender"
                zh="性别"
                mode="single"
                options={(['female', 'male', 'other'] as Gender[]).map(genderLabelZh)}
                value={genderLabelZh(form.gender)}
                onToggle={(label) => {
                  const g = (['female', 'male', 'other'] as Gender[]).find(
                    (x) => genderLabelZh(x) === label,
                  )
                  if (g) patch({ gender: g })
                }}
              />

              <ChipField
                en="Occupation"
                zh="职业"
                mode="single"
                options={PERSONA_AI_OCCUPATION_PRESETS}
                value={form.occupationHint}
                onToggle={(kw) => setSingle('occupationHint', kw)}
                onCustom={(v) => patch({ occupationHint: v })}
                mutable={{
                  checked: form.occupationMutable,
                  onChange: (next) => patch({ occupationMutable: next }),
                  label: '允许职业在剧情中变化',
                }}
              />

              <MbtiBinaryField
                value={form.mbtiHint}
                onChange={(v) => patch({ mbtiHint: v })}
              />

              <ChipField
                en="Orientation"
                zh="性取向"
                mode="single"
                options={PERSONA_AI_ORIENTATION_PRESETS}
                value={form.orientationHint}
                onToggle={(kw) => setSingle('orientationHint', kw)}
                onCustom={(v) => patch({ orientationHint: v })}
                mutable={{
                  checked: form.orientationMutable,
                  onChange: (next) => patch({ orientationMutable: next }),
                  label: '允许性取向在剧情中变化',
                }}
              />
            </div>
          </ChapterShell>
        ) : null}

        {activeTab === '02' ? (
          <ChapterShell code="02" en="APPEARANCE" zh="骨相皮囊">
            {form.referencePersonaDirectGenerate ? (
              <DirectGenerateLockedNotice />
            ) : (
              <div className="space-y-5">
                <FieldGroup title="发型五官">
                  <ChipField
                    en="Hair Color"
                    zh="发色"
                    mode="single"
                    options={PERSONA_AI_HAIR_COLOR_PRESETS}
                    value={form.hairColorHint}
                    onToggle={(kw) => setSingle('hairColorHint', kw)}
                    onCustom={(v) => patch({ hairColorHint: v })}
                  />
                  <ChipField
                    en="Hairstyle"
                    zh="发型"
                    mode="single"
                    options={PERSONA_AI_HAIR_STYLE_PRESETS}
                    value={form.hairStyleHint}
                    onToggle={(kw) => setSingle('hairStyleHint', kw)}
                    onCustom={(v) => patch({ hairStyleHint: v })}
                  />
                  <ChipField
                    en="Details"
                    zh="眉眼配饰"
                    mode="multi"
                    options={PERSONA_AI_APPEARANCE_DETAIL_PRESETS}
                    value={form.appearanceHint}
                    onToggle={(kw) => appendToken('appearanceHint', kw)}
                    onCustom={(v) => appendToken('appearanceHint', v)}
                  />
                </FieldGroup>

                <FieldGroup title="身材穿搭">
                  <ChipField
                    en="Body"
                    zh="身材"
                    mode="multi"
                    options={PERSONA_AI_BODY_SHAPE_PRESETS}
                    value={form.bodyShapeHint}
                    onToggle={(kw) => appendToken('bodyShapeHint', kw)}
                    onCustom={(v) => appendToken('bodyShapeHint', v)}
                  />
                  <ChipField
                    en="Outfit"
                    zh="穿搭"
                    mode="multi"
                    options={PERSONA_AI_OUTFIT_PRESETS}
                    value={form.outfitHint}
                    onToggle={(kw) => appendToken('outfitHint', kw)}
                    onCustom={(v) => appendToken('outfitHint', v)}
                  />
                </FieldGroup>

                <FieldGroup title="气场">
                  <ChipField
                    en="Aura / Vibe"
                    zh="气质气场"
                    mode="multi"
                    options={PERSONA_AI_AURA_PRESETS}
                    value={form.auraHint}
                    onToggle={(kw) => appendToken('auraHint', kw)}
                    onCustom={(v) => appendToken('auraHint', v)}
                  />
                </FieldGroup>
              </div>
            )}
          </ChapterShell>
        ) : null}

        {activeTab === '03' ? (
          <ChapterShell code="03" en="TRAJECTORY" zh="灵魂脉络">
            {form.referencePersonaDirectGenerate ? (
              <DirectGenerateLockedNotice />
            ) : (
              <div className="space-y-5">
                <FieldGroup title="过往叙事">
                  <FreeTextField
                    en="Backstory"
                    zh="身世过往"
                    value={form.backgroundHint}
                    onChange={(v) => patch({ backgroundHint: v })}
                    placeholder="塑造性格成因的关键过往…"
                    maxLength={280}
                    rows={3}
                    inspiration={PERSONA_AI_BACKGROUND_PRESETS}
                  />
                  <FreeTextField
                    en="Romance History"
                    zh="感情史"
                    value={form.relationshipHistoryHint}
                    onChange={(v) => patch({ relationshipHistoryHint: v })}
                    placeholder="可选：曾有好感/交往过的对象，或不填也会生成条目"
                    maxLength={240}
                    rows={2}
                    inspiration={PERSONA_AI_RELATIONSHIP_HISTORY_PRESETS}
                  />
                </FieldGroup>

                <FieldGroup title="日常底色">
                  <ChipField
                    en="Hobbies"
                    zh="兴趣爱好"
                    mode="multi"
                    options={PERSONA_AI_HOBBIES_PRESETS}
                    value={form.hobbiesHint}
                    onToggle={(kw) => appendToken('hobbiesHint', kw)}
                    onCustom={(v) => appendToken('hobbiesHint', v)}
                  />
                  <ChipField
                    en="Quirks"
                    zh="癖好习惯"
                    mode="multi"
                    options={PERSONA_AI_LIFE_HABITS_PRESETS}
                    value={form.lifeHabitsHint}
                    onToggle={(kw) => appendToken('lifeHabitsHint', kw)}
                    onCustom={(v) => appendToken('lifeHabitsHint', v)}
                  />
                  <ChipField
                    en="Speech Habits"
                    zh="口语习惯"
                    mode="multi"
                    options={PERSONA_AI_SPEECH_STYLE_PRESETS}
                    value={form.speechStyleHint}
                    onToggle={(kw) => appendToken('speechStyleHint', kw)}
                    onCustom={(v) => appendToken('speechStyleHint', v)}
                  />
                  <ChipField
                    en="Red Flags"
                    zh="雷点与底线"
                    mode="multi"
                    options={PERSONA_AI_PAIN_POINTS_PRESETS}
                    value={form.painPointsHint}
                    onToggle={(kw) => appendToken('painPointsHint', kw)}
                    onCustom={(v) => appendToken('painPointsHint', v)}
                  />
                </FieldGroup>
              </div>
            )}
          </ChapterShell>
        ) : null}

        {activeTab === '04' ? (
          <ChapterShell code="04" en="SOCIAL" zh="社交镜像">
            {form.referencePersonaDirectGenerate ? (
              <DirectGenerateLockedNotice />
            ) : (
              <div className="space-y-5">
                <div>
                  <SoftLabel en="Social Circles" zh="人脉偏向" />
                  <div className="space-y-4">
                    <ChipField
                      en="Family"
                      zh="家人偏向"
                      mode="multi"
                      options={SOCIAL_FAMILY_PRESETS}
                      value={form.socialFamilyHint}
                      onToggle={(kw) => appendToken('socialFamilyHint', kw)}
                      onCustom={(v) => appendToken('socialFamilyHint', v)}
                    />
                    <ChipField
                      en="Friends"
                      zh="朋友偏向"
                      mode="multi"
                      options={SOCIAL_FRIENDS_PRESETS}
                      value={form.socialFriendsHint}
                      onToggle={(kw) => appendToken('socialFriendsHint', kw)}
                      onCustom={(v) => appendToken('socialFriendsHint', v)}
                    />
                    <ChipField
                      en="Work"
                      zh="同事偏向"
                      mode="multi"
                      options={SOCIAL_WORK_PRESETS}
                      value={form.socialWorkHint}
                      onToggle={(kw) => appendToken('socialWorkHint', kw)}
                      onCustom={(v) => appendToken('socialWorkHint', v)}
                    />
                  </div>
                </div>

                <ChipField
                  en="Social Facades"
                  zh="多面社交态度"
                  mode="multi"
                  options={PERSONA_AI_SOCIAL_MASK_PRESETS}
                  value={form.socialMaskHint}
                  onToggle={(kw) => appendToken('socialMaskHint', kw)}
                  onCustom={(v) => appendToken('socialMaskHint', v)}
                />

                <ChipField
                  en="Gap Moe"
                  zh="反差萌点"
                  mode="multi"
                  options={PERSONA_AI_GAP_MOE_PRESETS}
                  value={form.gapMoeHint}
                  onToggle={(kw) => appendToken('gapMoeHint', kw)}
                  onCustom={(v) => appendToken('gapMoeHint', v)}
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
              <div className="space-y-5">
                <FreeTextField
                  en="Meeting"
                  zh="和 user 的相识过程"
                  value={form.relationDetailHint}
                  onChange={(v) =>
                    patch({
                      relationDetailHint: v,
                      meetingProcessPresetId: '',
                    })
                  }
                  placeholder="如何认识、早期互动、过程节点…"
                  maxLength={240}
                  rows={3}
                  inspiration={PERSONA_AI_MEETING_PROCESS_PRESETS.map((p) => p.label)}
                  onInspiration={(label) => {
                    const p = PERSONA_AI_MEETING_PROCESS_PRESETS.find((x) => x.label === label)
                    if (p) patch(applyPersonaAiMeetingProcessPreset(p))
                  }}
                />

                <RelationshipArcField
                  pastOptions={ARC_SIDE_PRESETS}
                  presentOptions={ARC_SIDE_PRESETS}
                  pastValue={pastArc}
                  presentValue={presentArc}
                  onPast={(v) =>
                    patch({
                      historyCharIdentity: v,
                      historyUserIdentity: v,
                      identityArcPresetId: '',
                    })
                  }
                  onPresent={(v) =>
                    patch({
                      presentCharIdentity: v,
                      presentUserIdentity: v,
                      relationToUser: v,
                      identityArcPresetId: '',
                    })
                  }
                  onPastCustom={(v) =>
                    patch({
                      historyCharIdentity: v,
                      historyUserIdentity: v,
                      identityArcPresetId: '',
                    })
                  }
                  onPresentCustom={(v) =>
                    patch({
                      presentCharIdentity: v,
                      presentUserIdentity: v,
                      relationToUser: v,
                      identityArcPresetId: '',
                    })
                  }
                  presets={
                    <div>
                      <p className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.12em] text-neutral-400">
                        抓马开局 · 一键填入
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {PERSONA_AI_IDENTITY_ARC_PRESETS.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              if (form.identityArcPresetId === p.id) {
                                patch({
                                  historyCharIdentity: '',
                                  historyUserIdentity: '',
                                  presentCharIdentity: '',
                                  presentUserIdentity: '',
                                  relationToUser: '',
                                  identityArcPresetId: '',
                                })
                              } else {
                                patch({
                                  ...applyPersonaAiIdentityArcPreset(p),
                                  relationToUser: p.presentChar,
                                })
                              }
                            }}
                            className={`rounded-full border px-3 py-1.5 text-[11px] font-medium leading-none transition-colors ${
                              form.identityArcPresetId === p.id
                                ? 'border-neutral-800 bg-neutral-800 text-white shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
                                : 'border-neutral-200/80 bg-neutral-50 text-neutral-600 hover:border-neutral-300 hover:bg-white'
                            }`}
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  }
                />

                <FieldGroup title="恋爱镜面">
                  <ChipField
                    en="Before"
                    zh="恋爱前的样子"
                    mode="multi"
                    options={PERSONA_AI_LOVE_BEFORE_PRESETS}
                    value={form.loveBeforeHint}
                    onToggle={(kw) => appendToken('loveBeforeHint', kw)}
                    onCustom={(v) => appendToken('loveBeforeHint', v)}
                    supplement={
                      <TinySupplement
                        onCommit={(v) => appendToken('loveBeforeHint', v)}
                        placeholder="可选：补一句具体表现…"
                      />
                    }
                  />
                  <ChipField
                    en="After"
                    zh="恋爱后的样子"
                    mode="multi"
                    options={PERSONA_AI_LOVE_AFTER_PRESETS}
                    value={form.loveAfterHint}
                    onToggle={(kw) => appendToken('loveAfterHint', kw)}
                    onCustom={(v) => appendToken('loveAfterHint', v)}
                    supplement={
                      <TinySupplement
                        onCommit={(v) => appendToken('loveAfterHint', v)}
                        placeholder="可选：补一句具体表现…"
                      />
                    }
                  />
                </FieldGroup>

                <FieldGroup title="修罗场反应">
                  <ChipField
                    en="Jealousy"
                    zh="吃醋的样子"
                    mode="multi"
                    options={PERSONA_AI_JEALOUSY_PRESETS}
                    value={form.jealousyHint}
                    onToggle={(kw) => appendToken('jealousyHint', kw)}
                    onCustom={(v) => appendToken('jealousyHint', v)}
                  />
                  <ChipField
                    en="Conflict"
                    zh="起冲突的样子"
                    mode="multi"
                    options={PERSONA_AI_CONFLICT_PRESETS}
                    value={form.conflictHint}
                    onToggle={(kw) => appendToken('conflictHint', kw)}
                    onCustom={(v) => appendToken('conflictHint', v)}
                  />
                </FieldGroup>

                <div className="pt-2">
                  <ChipField
                    en="Kinks & Desires"
                    zh="XP 点与亲密偏好"
                    mode="multi"
                    options={PERSONA_AI_NSFW_PRESETS}
                    value={form.nsfwHint}
                    onToggle={(kw) => {
                      const parts = presetTokens(form.nsfwHint)
                      const next = parts.includes(kw)
                        ? parts.filter((p) => p !== kw)
                        : [...parts, kw]
                      const hint = next.join('、')
                      patch({ nsfwHint: hint, nsfwEnabled: hint.trim().length > 0 })
                    }}
                    onCustom={(v) => {
                      const t = v.trim()
                      if (!t) return
                      const parts = presetTokens(form.nsfwHint)
                      if (parts.includes(t)) return
                      const hint = parts.length ? `${parts.join('、')}、${t}` : t
                      patch({ nsfwHint: hint, nsfwEnabled: true })
                    }}
                    supplement={
                      <p className="text-[11px] leading-relaxed text-neutral-400">
                        点选后会额外生成一条成人向世界书「亲密身体与性爱偏好」；不选则不写露骨床戏条目。
                      </p>
                    }
                  />
                </div>

                <FreeTextField
                  en="Notes"
                  zh="补充说明"
                  value={form.extraNotes}
                  onChange={(v) => patch({ extraNotes: v })}
                  placeholder="题材、禁忌、其他补充…"
                  maxLength={600}
                  rows={3}
                />
              </div>
            )}
          </ChapterShell>
        ) : null}
      </motion.div>
    </AnimatePresence>
  )
}
