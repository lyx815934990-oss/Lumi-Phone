import { useCallback, useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import {
  clampDatingLengthTargetChars,
  DATING_AI_LENGTH_TARGET_MAX,
  DATING_AI_LENGTH_TARGET_MIN,
} from '../../../phone/apps/wechat/dating/types'
import {
  DATING_PLOT_PACE_PRESET_OPTIONS,
  type DatingPlotPacePreset,
  type DatingPlotPaceSettings,
} from '../../../phone/apps/wechat/dating/datingPlotPace'
import type {
  DatingLanguageSettingsPatch,
  DatingLanguageSettingsValue,
} from '../../../phone/apps/wechat/dating/DatingLanguageSettingsPanel'
import { normalizeDatingLanguageSettings } from '../../../phone/apps/wechat/dating/DatingLanguageSettingsPanel'
import {
  normalizeWeChatChatLanguageCode,
  WECHAT_CHAT_LANGUAGE_OPTIONS,
} from '../../../phone/apps/wechat/wechatChatLanguage'
import {
  DATING_ADVANCED_CONTROL_COACH_ROOT_ATTR,
  DATING_ADVANCED_CONTROL_COACH_SCOPE,
  DATING_ADVANCED_CONTROL_COACH_TARGET_ATTR,
} from '../../../phone/apps/wechat/dating/datingAdvancedControlCoach'
import { useStoryRpgStore } from '../../store/useStoryRpgStore'
import type { NarrativePerspective, StoryRpgSettings } from '../../types'
import {
  PLOT_ARTIFACT_VISUAL_NAME,
} from '../../../phone/apps/wechat/dating/datingPlotHtmlVisual'
import {
  PLOT_HTML_VISUAL_PRESETS,
  normalizePlotHtmlVisualPresetId,
} from '../../../phone/apps/wechat/dating/datingPlotHtmlVisualPresets'
import { BottomSheet } from '../ui/BottomSheet'
import { CapsuleSwitch } from '../ui/CapsuleSwitch'

const PERSPECTIVE_OPTIONS: { value: NarrativePerspective; label: string }[] = [
  { value: 'first', label: '第一人称' },
  { value: 'second', label: '第二人称' },
  { value: 'third', label: '第三人称' },
]

const PACE_QUICK: DatingPlotPacePreset[] = ['slow', 'medium', 'fast']

type Props = {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  settings?: StoryRpgSettings
  patchSettings?: (patch: Partial<StoryRpgSettings>) => void
  /** 上帝视角开启时：抢话强制关且不可选 */
  godPerspective?: boolean
  plotPace?: DatingPlotPaceSettings
  onPlotPacePatch?: (patch: Partial<DatingPlotPaceSettings>) => void
  languageSettings?: DatingLanguageSettingsValue
  onLanguagePatch?: (patch: DatingLanguageSettingsPatch) => void
  themeStyle?: CSSProperties
  /** 打开场控中心专用文字教程（与剧情页教程分开） */
  onOpenControlTutorial?: () => void
  /** 场控面板内高亮引导（介绍各按钮作用） */
  onStartControlCoach?: () => void
}

function coachTargetProps(id: string) {
  return { [DATING_ADVANCED_CONTROL_COACH_TARGET_ATTR]: id }
}

function BentoCard({
  children,
  className = '',
  ...rest
}: { children: ReactNode; className?: string } & Record<string, unknown>) {
  return (
    <div
      className={`rounded-2xl border border-[var(--sr-border)] bg-[var(--sr-panel)] p-3 ${className}`}
      {...rest}
    >
      {children}
    </div>
  )
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.16em] text-[var(--sr-text-muted)]">
      {children}
    </p>
  )
}

function SelectChip({
  active,
  onClick,
  children,
  className = '',
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-[12px] font-medium transition ${
        active
          ? 'bg-[var(--sr-gold)] text-[var(--sr-gold-on)] shadow-[0_2px_10px_var(--sr-gold-glow)]'
          : 'border border-[var(--sr-border)] bg-[var(--sr-panel)] text-[var(--sr-text)] hover:border-[var(--sr-gold)]/35'
      } ${className}`}
    >
      {children}
    </button>
  )
}

function LangSelect({
  value,
  onChange,
  label,
}: {
  value: string
  onChange: (code: string) => void
  label: string
}) {
  return (
    <label className="block min-w-0 flex-1">
      <span className="mb-1.5 block text-[11px] text-[var(--sr-text-muted)]">{label}</span>
      <select
        value={normalizeWeChatChatLanguageCode(value)}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full rounded-xl border border-[var(--sr-border)] bg-[var(--sr-panel-elevated)] px-2.5 text-[13px] text-[var(--sr-text)] outline-none focus:border-[var(--sr-gold)]/45"
      >
        {WECHAT_CHAT_LANGUAGE_OPTIONS.map((o) => (
          <option key={o.code} value={o.code}>
            {o.label}（{o.native}）
          </option>
        ))}
      </select>
    </label>
  )
}

function CompactSwitch({
  checked,
  onCheckedChange,
  label,
}: {
  checked: boolean
  onCheckedChange: (v: boolean) => void
  label?: string
}) {
  return (
    <label className="flex shrink-0 cursor-pointer items-center gap-2">
      {label ? <span className="text-[12px] text-[var(--sr-text-muted)]">{label}</span> : null}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onCheckedChange(!checked)}
        className={`relative inline-flex h-[22px] w-[40px] shrink-0 items-center rounded-full transition-colors duration-300 ${
          checked ? 'bg-[var(--sr-gold)]' : 'bg-[var(--sr-border)]'
        }`}
      >
        <span
          className={`inline-block size-[18px] rounded-full bg-[var(--sr-gold-on,#0f0f13)] shadow transition-transform duration-300 ${
            checked ? 'translate-x-[19px]' : 'translate-x-0.5'
          }`}
        />
      </button>
    </label>
  )
}

export function AdvancedControlSheet({
  open: openProp,
  onOpenChange: onOpenChangeProp,
  settings: settingsProp,
  patchSettings: patchSettingsProp,
  godPerspective = false,
  plotPace,
  onPlotPacePatch,
  languageSettings: languageSettingsProp,
  onLanguagePatch,
  themeStyle,
  onOpenControlTutorial,
  onStartControlCoach,
}: Props) {
  const storeOpen = useStoryRpgStore((s) => s.advancedSheetOpen)
  const storeSetOpen = useStoryRpgStore((s) => s.setAdvancedSheetOpen)
  const storeSettings = useStoryRpgStore((s) => s.settings)
  const storePatch = useStoryRpgStore((s) => s.patchSettings)

  const open = openProp ?? storeOpen
  const onOpenChange = onOpenChangeProp ?? storeSetOpen
  const settings = settingsProp ?? storeSettings
  const patchSettings = patchSettingsProp ?? storePatch
  const interruptLocked = !!godPerspective
  const interruptChecked = interruptLocked ? false : !!settings.autoUserReaction

  const language = normalizeDatingLanguageSettings(languageSettingsProp)

  const [lengthDraft, setLengthDraft] = useState(String(settings.lengthTargetChars))

  useEffect(() => {
    if (open) setLengthDraft(String(settings.lengthTargetChars))
  }, [open, settings.lengthTargetChars])

  const commitLength = useCallback(() => {
    const n = clampDatingLengthTargetChars(Number(lengthDraft) || settings.lengthTargetChars)
    patchSettings({ lengthTargetChars: n })
    setLengthDraft(String(n))
  }, [lengthDraft, patchSettings, settings.lengthTargetChars])

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) commitLength()
      onOpenChange(next)
    },
    [commitLength, onOpenChange],
  )

  const pacePreset = plotPace?.preset ?? 'auto'
  const paceLabel = DATING_PLOT_PACE_PRESET_OPTIONS.find((o) => o.id === pacePreset)?.label ?? '自动'
  const showHelp = Boolean(onOpenControlTutorial || onStartControlCoach)

  const headerTrailing = showHelp ? (
    <div className="flex items-center gap-1.5" {...coachTargetProps('ac-help')}>
      {onOpenControlTutorial ? (
        <button
          type="button"
          onClick={() => {
            handleOpenChange(false)
            window.setTimeout(() => onOpenControlTutorial(), 180)
          }}
          className="rounded-full border border-[var(--sr-border)] bg-[var(--sr-panel)] px-2.5 py-1 text-[11px] font-medium text-[var(--sr-text)] transition hover:border-[var(--sr-gold)]/35"
        >
          场控说明
        </button>
      ) : null}
      {onStartControlCoach ? (
        <button
          type="button"
          onClick={() => onStartControlCoach()}
          className="rounded-full bg-[var(--sr-gold)] px-2.5 py-1 text-[11px] font-medium text-[var(--sr-gold-on)] shadow-[0_2px_10px_var(--sr-gold-glow)]"
        >
          高亮引导
        </button>
      ) : null}
    </div>
  ) : null

  return (
    <BottomSheet
      open={open}
      onOpenChange={handleOpenChange}
      title="高级场控中心"
      subtitle="低频导演参数 · 随角色存档"
      headerTrailing={headerTrailing}
      themeStyle={themeStyle}
    >
      <div
        className="grid grid-cols-2 gap-3 pb-2"
        {...{ [DATING_ADVANCED_CONTROL_COACH_ROOT_ATTR]: DATING_ADVANCED_CONTROL_COACH_SCOPE }}
      >
        <BentoCard className="col-span-2" {...coachTargetProps('ac-perspective')}>
          <SectionLabel>人称选择</SectionLabel>
          <div className="flex flex-wrap gap-2">
            {PERSPECTIVE_OPTIONS.map((o) => (
              <SelectChip
                key={o.value}
                active={settings.perspective === o.value}
                onClick={() => patchSettings({ perspective: o.value })}
              >
                {o.label}
              </SelectChip>
            ))}
          </div>
        </BentoCard>

        <BentoCard {...coachTargetProps('ac-length')}>
          <SectionLabel>目标字数</SectionLabel>
          <div className="flex items-center gap-2">
            <input
              type="number"
              inputMode="numeric"
              min={DATING_AI_LENGTH_TARGET_MIN}
              max={DATING_AI_LENGTH_TARGET_MAX}
              value={lengthDraft}
              onChange={(e) => setLengthDraft(e.target.value)}
              onBlur={commitLength}
              onKeyDown={(e) => e.key === 'Enter' && commitLength()}
              className="h-10 min-w-0 flex-1 rounded-xl border border-[var(--sr-border)] bg-[var(--sr-panel-elevated)] px-3 font-mono text-[14px] text-[var(--sr-text)] outline-none placeholder:text-[var(--sr-text-faint)] focus:border-[var(--sr-gold)]/45"
              placeholder="500"
            />
            <span className="shrink-0 text-[12px] text-[var(--sr-text-muted)]">字</span>
          </div>
          <p className="mt-1.5 text-[10px] text-[var(--sr-text-faint)]">
            {DATING_AI_LENGTH_TARGET_MIN}～{DATING_AI_LENGTH_TARGET_MAX.toLocaleString()}
          </p>
        </BentoCard>

        <BentoCard {...coachTargetProps('ac-pace')}>
          <SectionLabel>时间推进 · {paceLabel}</SectionLabel>
          <div className="flex flex-wrap gap-1.5">
            {PACE_QUICK.map((id) => {
              const opt = DATING_PLOT_PACE_PRESET_OPTIONS.find((o) => o.id === id)!
              return (
                <SelectChip
                  key={id}
                  active={pacePreset === id}
                  onClick={() => onPlotPacePatch?.({ preset: id })}
                  className="!px-2.5 !py-1 !text-[11px]"
                >
                  {opt.label}
                </SelectChip>
              )
            })}
            <SelectChip
              active={pacePreset === 'auto'}
              onClick={() => onPlotPacePatch?.({ preset: 'auto' })}
              className="!px-2.5 !py-1 !text-[11px]"
            >
              自动
            </SelectChip>
          </div>
        </BentoCard>

        <BentoCard className="col-span-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div {...coachTargetProps('ac-thinking')}>
            <CapsuleSwitch
              label="思维链"
              checked={settings.thinkingChainEnabled}
              onCheckedChange={(v) => patchSettings({ thinkingChainEnabled: v })}
            />
          </div>
          <div {...coachTargetProps('ac-interrupt')}>
            <CapsuleSwitch
              label={interruptLocked ? '抢话与否（上帝视角下不可用）' : '抢话与否'}
              checked={interruptChecked}
              disabled={interruptLocked}
              onCheckedChange={(v) => {
                if (interruptLocked) return
                patchSettings({ autoUserReaction: v })
              }}
            />
          </div>
          <div {...coachTargetProps('ac-comment')}>
            <CapsuleSwitch
              label="评论模式"
              checked={settings.commentModeEnabled}
              onCheckedChange={(v) => patchSettings({ commentModeEnabled: v })}
            />
          </div>
          <div {...coachTargetProps('ac-theater')}>
            <CapsuleSwitch
              label={PLOT_ARTIFACT_VISUAL_NAME}
              checked={settings.plotArtifactVisualEnabled}
              onCheckedChange={(v) => patchSettings({ plotArtifactVisualEnabled: v })}
            />
          </div>
          <div {...coachTargetProps('ac-danmaku')}>
            <CapsuleSwitch
              label="弹幕模式"
              checked={settings.danmakuEnabled}
              onCheckedChange={(v) => patchSettings({ danmakuEnabled: v })}
            />
          </div>
        </BentoCard>

        {settings.plotArtifactVisualEnabled ? (
          <BentoCard className="col-span-2 space-y-2.5">
            <SectionLabel>{PLOT_ARTIFACT_VISUAL_NAME}类型</SectionLabel>
            {PLOT_HTML_VISUAL_PRESETS.length === 0 ? (
              <p className="text-[11px] leading-relaxed text-[var(--sr-text-faint)]">
                预设库已清空，待按 HTML 预览格式重做。当前开启也不会向模型注入预设附录；已有小剧场仍可在卡片中查看。
              </p>
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  <SelectChip
                    active={normalizePlotHtmlVisualPresetId(settings.plotArtifactVisualPresetId) === 'random'}
                    onClick={() => patchSettings({ plotArtifactVisualPresetId: 'random' })}
                  >
                    随机抽取
                  </SelectChip>
                  <SelectChip
                    active={normalizePlotHtmlVisualPresetId(settings.plotArtifactVisualPresetId) !== 'random'}
                    onClick={() => {
                      const cur = normalizePlotHtmlVisualPresetId(settings.plotArtifactVisualPresetId)
                      patchSettings({
                        plotArtifactVisualPresetId: cur === 'random' ? PLOT_HTML_VISUAL_PRESETS[0]!.id : cur,
                      })
                    }}
                  >
                    指定类型
                  </SelectChip>
                </div>
                {normalizePlotHtmlVisualPresetId(settings.plotArtifactVisualPresetId) !== 'random' ? (
                  <label className="block min-w-0">
                    <span className="mb-1.5 block text-[11px] text-[var(--sr-text-muted)]">选择小剧场</span>
                    <select
                      value={normalizePlotHtmlVisualPresetId(settings.plotArtifactVisualPresetId)}
                      onChange={(e) =>
                        patchSettings({
                          plotArtifactVisualPresetId: e.target.value || PLOT_HTML_VISUAL_PRESETS[0]!.id,
                        })
                      }
                      className="h-10 w-full rounded-xl border border-[var(--sr-border)] bg-[var(--sr-panel-elevated)] px-2.5 text-[13px] text-[var(--sr-text)] outline-none focus:border-[var(--sr-gold)]/45"
                    >
                      {PLOT_HTML_VISUAL_PRESETS.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.id} · {p.name}（{p.category}）
                          {p.tags.length ? ` · ${p.tags.slice(0, 2).join('/')}` : ''}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <p className="text-[10px] leading-relaxed text-[var(--sr-text-faint)]">
                    每轮从 {PLOT_HTML_VISUAL_PRESETS.length} 种里随机指定一种。
                  </p>
                )}
              </>
            )}
          </BentoCard>
        ) : null}

        {/* 输出语言：旁白 / 对白 / 内心 · 同步翻译 */}
        <BentoCard className="col-span-2 space-y-3" {...coachTargetProps('ac-language')}>
          <SectionLabel>输出与翻译</SectionLabel>

          <LangSelect
            label="旁白（正文）语言"
            value={language.plotOutputLanguage}
            onChange={(code) => {
              const next: DatingLanguageSettingsPatch = { plotOutputLanguage: code }
              // 仍跟随旁白的项一并带走（与原语言面板一致）
              if (language.dialogueLanguage === language.plotOutputLanguage) {
                next.dialogueLanguage = code
              }
              if (language.innerOsLanguage === language.plotOutputLanguage) {
                next.innerOsLanguage = code
              }
              onLanguagePatch?.(next)
            }}
          />

          <LangSelect
            label="对白语言"
            value={language.dialogueLanguage}
            onChange={(code) => onLanguagePatch?.({ dialogueLanguage: code })}
          />

          <LangSelect
            label="内心 OS 语言"
            value={language.innerOsLanguage}
            onChange={(code) => onLanguagePatch?.({ innerOsLanguage: code })}
          />

          <div className="flex items-center justify-between gap-3 rounded-xl border border-[var(--sr-border)] bg-[var(--sr-panel-elevated)]/60 px-3 py-2.5">
            <div className="min-w-0">
              <p className="text-[13px] text-[var(--sr-text)]">同步翻译对白</p>
              <p className="mt-0.5 text-[10px] leading-relaxed text-[var(--sr-text-faint)]">
                同轮先写对白原文，文末附译文；点对白可查看
              </p>
            </div>
            <CompactSwitch
              label=""
              checked={language.dialogueTranslationSyncEnabled}
              onCheckedChange={(v) =>
                onLanguagePatch?.({ dialogueTranslationSyncEnabled: v })
              }
            />
          </div>

          <div className="flex items-center justify-between gap-3 rounded-xl border border-[var(--sr-border)] bg-[var(--sr-panel-elevated)]/60 px-3 py-2.5">
            <div className="min-w-0">
              <p className="text-[13px] text-[var(--sr-text)]">同步翻译内心 OS</p>
              <p className="mt-0.5 text-[10px] leading-relaxed text-[var(--sr-text-faint)]">
                同轮先写 OS 原文，文末附译文；点内心句可查看
              </p>
            </div>
            <CompactSwitch
              label=""
              checked={language.innerOsTranslationSyncEnabled}
              onCheckedChange={(v) =>
                onLanguagePatch?.({ innerOsTranslationSyncEnabled: v })
              }
            />
          </div>

          {language.dialogueTranslationSyncEnabled || language.innerOsTranslationSyncEnabled ? (
            <div className="space-y-1.5">
              <LangSelect
                label="翻译语言"
                value={language.dialogueTranslationLanguage}
                onChange={(code) => onLanguagePatch?.({ dialogueTranslationLanguage: code })}
              />
              {language.dialogueTranslationSyncEnabled &&
              language.dialogueLanguage === language.dialogueTranslationLanguage ? (
                <p className="text-[10px] text-[var(--sr-gold)]">
                  对白语言与翻译语言相同，译文通常无必要
                </p>
              ) : null}
              {language.innerOsTranslationSyncEnabled &&
              language.innerOsLanguage === language.dialogueTranslationLanguage ? (
                <p className="text-[10px] text-[var(--sr-gold)]">
                  内心 OS 语言与翻译语言相同，译文通常无必要
                </p>
              ) : null}
            </div>
          ) : (
            <p className="text-[10px] leading-relaxed text-[var(--sr-text-faint)]">
              可分别设置旁白 / 对白 / 内心输出语言；需要译文时再打开对应同步翻译。
            </p>
          )}
        </BentoCard>
      </div>
    </BottomSheet>
  )
}
