import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Languages } from 'lucide-react'
import {
  normalizeWeChatChatLanguageCode,
  weChatChatLanguageLabel,
  WECHAT_CHAT_DEFAULT_REPLY_LANGUAGE,
  WECHAT_CHAT_DEFAULT_TRANSLATION_LANGUAGE,
  WECHAT_CHAT_LANGUAGE_OPTIONS,
} from '../wechatChatLanguage'
import { summarizeDatingLanguageSettings } from './datingLanguagePrompt'

export type DatingLanguageSettingsValue = {
  plotOutputLanguage: string
  dialogueLanguage: string
  /** 内心 OS；默认跟随旁白 */
  innerOsLanguage: string
  dialogueTranslationSyncEnabled: boolean
  innerOsTranslationSyncEnabled: boolean
  dialogueTranslationLanguage: string
}

export type DatingLanguageSettingsPatch = Partial<DatingLanguageSettingsValue>

function WxSwitch({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onToggle}
      className="relative h-8 w-[52px] shrink-0 self-center rounded-full transition-colors duration-200"
      style={{ backgroundColor: on ? '#000000' : '#cccccc' }}
    >
      <span
        className="absolute top-1 h-6 w-6 rounded-full bg-white shadow-sm transition-[left] duration-200 ease-out"
        style={{ left: on ? 26 : 4 }}
        aria-hidden
      />
    </button>
  )
}

function LangSelect({ value, onChange }: { value: string; onChange: (code: string) => void }) {
  return (
    <select
      value={normalizeWeChatChatLanguageCode(value)}
      onChange={(e) => onChange(e.target.value)}
      className="mt-2 w-full rounded-xl border border-[#e5e5ea] bg-[#f7f7f7] px-3 py-2.5 text-[15px] text-black outline-none"
    >
      {WECHAT_CHAT_LANGUAGE_OPTIONS.map((o) => (
        <option key={o.code} value={o.code}>
          {o.label}（{o.native}）
        </option>
      ))}
    </select>
  )
}

export function normalizeDatingLanguageSettings(
  raw: Partial<DatingLanguageSettingsValue> | null | undefined,
): DatingLanguageSettingsValue {
  const plot = normalizeWeChatChatLanguageCode(
    raw?.plotOutputLanguage,
    WECHAT_CHAT_DEFAULT_REPLY_LANGUAGE,
  )
  const dialogue = normalizeWeChatChatLanguageCode(
    raw?.dialogueLanguage?.trim() ? raw.dialogueLanguage : plot,
    plot,
  )
  const innerOs = normalizeWeChatChatLanguageCode(
    raw?.innerOsLanguage?.trim() ? raw.innerOsLanguage : plot,
    plot,
  )
  return {
    plotOutputLanguage: plot,
    dialogueLanguage: dialogue,
    innerOsLanguage: innerOs,
    dialogueTranslationSyncEnabled: raw?.dialogueTranslationSyncEnabled === true,
    innerOsTranslationSyncEnabled: raw?.innerOsTranslationSyncEnabled === true,
    dialogueTranslationLanguage: normalizeWeChatChatLanguageCode(
      raw?.dialogueTranslationLanguage,
      WECHAT_CHAT_DEFAULT_TRANSLATION_LANGUAGE,
    ),
  }
}

/** 面板正文（可用于抽屉/弹层内部） */
export function DatingLanguageSettingsFields({
  value,
  onPatch,
}: {
  value: DatingLanguageSettingsValue
  onPatch: (partial: DatingLanguageSettingsPatch) => void
}) {
  const plot = value.plotOutputLanguage
  const dialogue = value.dialogueLanguage
  const innerOs = value.innerOsLanguage
  const dialogueSyncOn = value.dialogueTranslationSyncEnabled
  const osSyncOn = value.innerOsTranslationSyncEnabled
  const anySync = dialogueSyncOn || osSyncOn
  const trans = value.dialogueTranslationLanguage
  const sameDialogueHint =
    dialogueSyncOn && dialogue === trans
      ? '对白语言与翻译语言相同，译文通常无必要；可改其一。'
      : null
  const sameOsHint =
    osSyncOn && innerOs === trans
      ? '内心 OS 语言与翻译语言相同，译文通常无必要；可改其一。'
      : null

  return (
    <div className="space-y-0">
      <div className="border-b border-[#f0f0f0] px-1 py-3">
        <p className="text-[15px] font-medium text-black">旁白语言</p>
        <p className="mt-1 text-[12px] leading-relaxed text-[#8e8e8e]">
          旁白、叙述默认语言（不含对白与内心 OS）。当前：{weChatChatLanguageLabel(plot)}
        </p>
        <LangSelect
          value={plot}
          onChange={(code) => {
            const next: DatingLanguageSettingsPatch = { plotOutputLanguage: code }
            // 仍跟随旁白的项一并带走
            if (dialogue === plot) next.dialogueLanguage = code
            if (innerOs === plot) next.innerOsLanguage = code
            onPatch(next)
          }}
        />
      </div>

      <div className="border-b border-[#f0f0f0] px-1 py-3">
        <p className="text-[15px] font-medium text-black">对白语言</p>
        <p className="mt-1 text-[12px] leading-relaxed text-[#8e8e8e]">
          引号对白 / VN【对白】行语言，可与旁白不同。当前：{weChatChatLanguageLabel(dialogue)}
        </p>
        <LangSelect value={dialogue} onChange={(code) => onPatch({ dialogueLanguage: code })} />
      </div>

      <div className="border-b border-[#f0f0f0] px-1 py-3">
        <p className="text-[15px] font-medium text-black">内心 OS 语言</p>
        <p className="mt-1 text-[12px] leading-relaxed text-[#8e8e8e]">
          <span className="font-mono">**</span> 包裹的内心独白语言，可与旁白/对白不同。当前：
          {weChatChatLanguageLabel(innerOs)}
        </p>
        <LangSelect value={innerOs} onChange={(code) => onPatch({ innerOsLanguage: code })} />
      </div>

      <div className="flex items-center justify-between gap-3 border-b border-[#f0f0f0] px-1 py-3">
        <div className="min-w-0 flex-1 pr-1">
          <p className="text-[15px] font-medium text-black">同步翻译对白</p>
          <p className="mt-1 text-[12px] leading-relaxed text-[#8e8e8e]">
            开启后一并落库对白译文（主线剧情 / 平行事件 / IF 线相同）；默认由聊天模型写。仅当 API 设置勾选翻译「使用副接口」时改走翻译服务。点击对白句可在上方查看。
          </p>
        </div>
        <WxSwitch
          on={dialogueSyncOn}
          onToggle={() => onPatch({ dialogueTranslationSyncEnabled: !dialogueSyncOn })}
        />
      </div>

      <div className="flex items-center justify-between gap-3 border-b border-[#f0f0f0] px-1 py-3">
        <div className="min-w-0 flex-1 pr-1">
          <p className="text-[15px] font-medium text-black">同步翻译内心 OS</p>
          <p className="mt-1 text-[12px] leading-relaxed text-[#8e8e8e]">
            开启后一并落库 OS 译文（主线 / 平行 / IF 相同）；默认由聊天模型写。仅当勾选翻译副接口时改走翻译服务。点击灰色内心句可在上方查看。
          </p>
        </div>
        <WxSwitch
          on={osSyncOn}
          onToggle={() => onPatch({ innerOsTranslationSyncEnabled: !osSyncOn })}
        />
      </div>

      {anySync ? (
        <div className="px-1 py-3">
          <p className="text-[15px] font-medium text-black">翻译语言</p>
          <p className="mt-1 text-[12px] leading-relaxed text-[#8e8e8e]">
            对白 / 内心 OS 悬浮译文语言。当前：{weChatChatLanguageLabel(trans)}
          </p>
          <LangSelect
            value={trans}
            onChange={(code) => onPatch({ dialogueTranslationLanguage: code })}
          />
          {sameDialogueHint ? <p className="mt-2 text-[12px] text-[#c27c3e]">{sameDialogueHint}</p> : null}
          {sameOsHint ? <p className="mt-2 text-[12px] text-[#c27c3e]">{sameOsHint}</p> : null}
        </div>
      ) : null}
    </div>
  )
}

/** 工具栏「输出语言」按钮 + 居中弹窗 */
export function DatingLanguageSettingsButton({
  value,
  onPatch,
  className,
  dark,
  label = '输出语言',
  showSummary = true,
  /** 仅显示图标（输入区工具栏） */
  iconOnly = false,
}: {
  value: DatingLanguageSettingsValue
  onPatch: (partial: DatingLanguageSettingsPatch) => void
  className?: string
  /** VN 底栏用浅色字 */
  dark?: boolean
  label?: string
  /** 按钮上展示当前语言摘要 */
  showSummary?: boolean
  iconOnly?: boolean
}) {
  const [open, setOpen] = useState(false)
  const btnRef = useRef<HTMLButtonElement | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const titleId = useId()
  const summary = summarizeDatingLanguageSettings(value)
  const anySync = value.dialogueTranslationSyncEnabled || value.innerOsTranslationSyncEnabled
  const shortSummary = (() => {
    const plot = weChatChatLanguageLabel(value.plotOutputLanguage)
    const dialogue = weChatChatLanguageLabel(
      value.dialogueLanguage?.trim() ? value.dialogueLanguage : value.plotOutputLanguage,
    )
    const os = weChatChatLanguageLabel(
      value.innerOsLanguage?.trim() ? value.innerOsLanguage : value.plotOutputLanguage,
    )
    if (plot === dialogue && plot === os) return plot
    const bits = [`旁${plot}`]
    if (dialogue !== plot) bits.push(`白${dialogue}`)
    if (os !== plot) bits.push(`OS${os}`)
    return bits.join('·')
  })()

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prevOverflow
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const panel: ReactNode = open
    ? createPortal(
        <div
          className="fixed inset-0 z-[240] flex items-center justify-center bg-black/45 px-4"
          style={{
            paddingTop: 'max(12px, env(safe-area-inset-top, 0px))',
            paddingBottom: 'max(12px, env(safe-area-inset-bottom, 0px))',
          }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setOpen(false)
          }}
        >
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="flex max-h-[min(85dvh,640px)] w-[min(92vw,360px)] flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-[0_20px_56px_rgba(0,0,0,0.22)]"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[#f0f0f0] px-4 py-3">
              <div className="min-w-0">
                <p id={titleId} className="text-[16px] font-semibold text-black">
                  语言与翻译
                </p>
                <p className="mt-0.5 truncate text-[11px] text-[#a3a3a3]">{summary}</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="shrink-0 rounded-lg bg-black px-3 py-1.5 text-[13px] font-medium text-white"
              >
                完成
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-3">
              <DatingLanguageSettingsFields value={value} onPatch={onPatch} />
            </div>
          </div>
        </div>,
        document.body,
      )
    : null

  const titleText = `输出语言与翻译 · ${summary}`

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        title={titleText}
        aria-label={titleText}
        className={
          className ??
          (iconOnly
            ? dark
              ? 'inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-white/25 bg-white/10 text-white'
              : 'inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-stone-200 bg-stone-50 text-[#262626] transition-all duration-200 hover:border-stone-400'
            : dark
              ? 'inline-flex max-w-full items-center gap-1 rounded-full border border-white/25 bg-white/10 px-2.5 py-1.5 text-[12px] text-white'
              : 'inline-flex max-w-full items-center gap-1.5 rounded-full border border-stone-200/90 bg-stone-50/70 px-2.5 py-1.5 text-[12px] text-[#525252] transition-all duration-200 hover:border-stone-300 hover:bg-white hover:text-[#262626]')
        }
      >
        {iconOnly ? (
          <span className="relative inline-flex">
            <Languages className="size-4" strokeWidth={1.75} aria-hidden />
            {anySync ? (
              <span className="absolute -right-0.5 -top-0.5 size-1.5 rounded-full bg-violet-500" aria-hidden />
            ) : null}
          </span>
        ) : (
          <>
            <span className="shrink-0 font-medium">{label}</span>
            {showSummary ? (
              <span className={`min-w-0 truncate ${dark ? 'text-white/75' : 'text-[#a3a3a3]'}`}>
                {shortSummary}
                {anySync ? ' · 译' : ''}
              </span>
            ) : null}
          </>
        )}
      </button>
      {panel}
    </>
  )
}
