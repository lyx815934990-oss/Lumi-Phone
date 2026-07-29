import { AnimatePresence, motion } from 'framer-motion'
import { Loader2, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  normalizeWeChatChatLanguageCode,
  weChatChatLanguageLabel,
  WECHAT_CHAT_DEFAULT_REPLY_LANGUAGE,
  WECHAT_CHAT_LANGUAGE_OPTIONS,
} from '../wechatChatLanguage'
import { PlotRichParagraph } from './plotRichText'
import { PLOT_DIMENSION_LABELS } from './datingPlotDimensionAi'
import {
  parsePlotDimensionLengthTarget,
  type PlotDimensionArtifact,
  type PlotDimensionKind,
  type PlotDimensionLanguageBundle,
} from './types'

type Props = {
  open: boolean
  kind: PlotDimensionKind
  artifact: PlotDimensionArtifact | null | undefined
  defaultLengthTarget: number
  /** 默认旁白 / 对白 / 内心 OS（通常取自约会「语言与翻译」） */
  defaultLanguages?: Partial<PlotDimensionLanguageBundle> | null
  /** 档案是否开启对白 / OS 同步翻译（用于提示） */
  dialogueTranslationSyncEnabled?: boolean
  innerOsTranslationSyncEnabled?: boolean
  loading: boolean
  error: string | null
  onClose: () => void
  onGenerate: (
    writingGuide: string,
    lengthTargetChars: number,
    languages: PlotDimensionLanguageBundle,
  ) => void
}

function LangSelect({ value, onChange }: { value: string; onChange: (code: string) => void }) {
  return (
    <select
      value={normalizeWeChatChatLanguageCode(value)}
      onChange={(e) => onChange(normalizeWeChatChatLanguageCode(e.target.value))}
      className="mt-1.5 w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-[13px] text-stone-800 outline-none focus:border-stone-400"
    >
      {WECHAT_CHAT_LANGUAGE_OPTIONS.map((o) => (
        <option key={o.code} value={o.code}>
          {o.label}（{o.native}）
        </option>
      ))}
    </select>
  )
}

function resolveDefaults(
  artifact: PlotDimensionArtifact | null | undefined,
  defaults?: Partial<PlotDimensionLanguageBundle> | null,
): PlotDimensionLanguageBundle {
  const plot = normalizeWeChatChatLanguageCode(
    artifact?.outputLanguage?.trim() || defaults?.plotOutputLanguage,
    WECHAT_CHAT_DEFAULT_REPLY_LANGUAGE,
  )
  const dialogue = normalizeWeChatChatLanguageCode(
    artifact?.dialogueLanguage?.trim() || defaults?.dialogueLanguage?.trim() || plot,
    plot,
  )
  const innerOs = normalizeWeChatChatLanguageCode(
    artifact?.innerOsLanguage?.trim() || defaults?.innerOsLanguage?.trim() || plot,
    plot,
  )
  return { plotOutputLanguage: plot, dialogueLanguage: dialogue, innerOsLanguage: innerOs }
}

export function PlotDimensionPanel({
  open,
  kind,
  artifact,
  defaultLengthTarget,
  defaultLanguages,
  dialogueTranslationSyncEnabled,
  innerOsTranslationSyncEnabled,
  loading,
  error,
  onClose,
  onGenerate,
}: Props) {
  const label = PLOT_DIMENSION_LABELS[kind]
  const [writingGuide, setWritingGuide] = useState('')
  const [lengthTargetDraft, setLengthTargetDraft] = useState(String(defaultLengthTarget))
  const [plotLanguage, setPlotLanguage] = useState(
    () => resolveDefaults(artifact, defaultLanguages).plotOutputLanguage,
  )
  const [dialogueLanguage, setDialogueLanguage] = useState(
    () => resolveDefaults(artifact, defaultLanguages).dialogueLanguage,
  )
  const [innerOsLanguage, setInnerOsLanguage] = useState(
    () => resolveDefaults(artifact, defaultLanguages).innerOsLanguage,
  )

  useEffect(() => {
    if (!open) return
    setWritingGuide(artifact?.writingGuide ?? '')
    const n = artifact?.lengthTargetChars ?? defaultLengthTarget
    setLengthTargetDraft(String(n))
    const next = resolveDefaults(artifact, defaultLanguages)
    setPlotLanguage(next.plotOutputLanguage)
    setDialogueLanguage(next.dialogueLanguage)
    setInnerOsLanguage(next.innerOsLanguage)
  }, [
    open,
    artifact?.writingGuide,
    artifact?.lengthTargetChars,
    artifact?.outputLanguage,
    artifact?.dialogueLanguage,
    artifact?.innerOsLanguage,
    defaultLengthTarget,
    defaultLanguages?.plotOutputLanguage,
    defaultLanguages?.dialogueLanguage,
    defaultLanguages?.innerOsLanguage,
  ])

  if (typeof document === 'undefined') return null

  const langSummary = (() => {
    const p = weChatChatLanguageLabel(plotLanguage)
    const d = weChatChatLanguageLabel(dialogueLanguage)
    const o = weChatChatLanguageLabel(innerOsLanguage)
    if (p === d && p === o) return p
    return `旁白${p} · 对白${d} · OS${o}`
  })()

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          key={`plot-dimension-${kind}`}
          className="fixed inset-0 z-[1280] flex items-end justify-center bg-black/40 px-0 sm:items-center sm:px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={label}
            className="flex max-h-[min(92vh,720px)] w-full max-w-[560px] flex-col overflow-hidden rounded-t-2xl border border-stone-200 bg-white shadow-xl sm:rounded-2xl"
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 16, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 420, damping: 36 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-stone-100 px-4 py-3">
              <div>
                <p className="text-[16px] font-semibold text-stone-900">{label}</p>
                <p className="mt-0.5 text-[12px] leading-relaxed text-stone-500">
                  {kind === 'parallel'
                    ? '勾选后随发送同轮生成；写入时间轴摘要（主角色非全知，NPC 在场全知）。卡片按钮可补生成。'
                    : '勾选后随发送同轮生成；仅卡片阅读，不进剧情参考。卡片按钮可手动补生成。'}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
                aria-label="关闭"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 [scrollbar-width:thin]">
              {artifact?.content?.trim() ? (
                <div className="mb-4 rounded-xl border border-stone-100 bg-stone-50/80 p-3">
                  <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-stone-400">已生成正文</p>
                  <div className="mt-2 text-[16px] font-normal leading-[1.85] text-[#262626]">
                    <PlotRichParagraph
                      content={artifact.content}
                      dialogueTranslations={artifact.dialogueTranslations}
                      innerOsTranslations={artifact.innerOsTranslations}
                    />
                  </div>
                  {artifact.dialogueTranslations?.some((t) => t.translatedText?.trim()) ||
                  artifact.innerOsTranslations?.some((t) => t.translatedText?.trim()) ? (
                    <p className="mt-2 text-[11px] text-stone-400">
                      点击带底纹的对白或灰色内心句可查看译文。
                    </p>
                  ) : dialogueTranslationSyncEnabled || innerOsTranslationSyncEnabled ? (
                    <p className="mt-2 text-[11px] text-[#c27c3e]">
                      已开启同步翻译，但本段尚未落库译文（可能是生成中断或模型未写 [译]）。请再点一次「重新生成」。
                    </p>
                  ) : (
                    <p className="mt-2 text-[11px] text-stone-400">
                      若要在此查看译文，请先在约会「语言」里开启「同步翻译对白 / 内心 OS」，再重新生成本段。
                    </p>
                  )}
                  {artifact.updatedAt ? (
                    <p className="mt-2 text-right text-[10px] text-stone-400">
                      更新于 {new Date(artifact.updatedAt).toLocaleString()}
                      {` · ${langSummary}`}
                    </p>
                  ) : null}
                </div>
              ) : (
                <p className="mb-4 rounded-xl border border-dashed border-stone-200 bg-stone-50/50 px-3 py-4 text-center text-[12px] text-stone-400">
                  尚未生成；填写下方引导后点击生成。
                </p>
              )}

              <label className="block text-[12px] font-medium text-stone-700">写作引导（内容偏向）</label>
              <textarea
                value={writingGuide}
                onChange={(e) => setWritingGuide(e.target.value.slice(0, 480))}
                rows={4}
                maxLength={480}
                placeholder={
                  kind === 'parallel'
                    ? '例：锚点里用户在排练室时，同时刻后勤组在另一层楼搬设备——不出现排练室里的任何人。'
                    : '例：假设玩家当时没有追问，而是直接转身离开，写接下来五分钟的 IF 片段。'
                }
                className="mt-1.5 w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-[13px] leading-relaxed text-stone-800 outline-none transition-colors focus:border-stone-400"
              />
              <p className="mt-1 text-right text-[11px] text-stone-400">{writingGuide.length}/480</p>

              <p className="mt-3 text-[12px] font-medium text-stone-700">输出语言（与主线相同分设）</p>
              <p className="mt-1 text-[11px] leading-relaxed text-stone-400">
                旁白、对白、内心 OS 可各自选择；打开面板时默认带入约会「语言与翻译」当前值。同步翻译仍跟随该设置与 API 翻译副接口。
              </p>

              <label className="mt-2.5 block text-[12px] font-medium text-stone-600">旁白语言</label>
              <LangSelect
                value={plotLanguage}
                onChange={(code) => {
                  setPlotLanguage(code)
                  if (dialogueLanguage === plotLanguage) setDialogueLanguage(code)
                  if (innerOsLanguage === plotLanguage) setInnerOsLanguage(code)
                }}
              />

              <label className="mt-2.5 block text-[12px] font-medium text-stone-600">对白语言</label>
              <LangSelect value={dialogueLanguage} onChange={setDialogueLanguage} />

              <label className="mt-2.5 block text-[12px] font-medium text-stone-600">内心 OS 语言</label>
              <LangSelect value={innerOsLanguage} onChange={setInnerOsLanguage} />

              <label className="mt-3 block text-[12px] font-medium text-stone-700">目标字数（汉字）</label>
              <input
                type="text"
                inputMode="numeric"
                value={lengthTargetDraft}
                onChange={(e) => {
                  const next = e.target.value.replace(/[^\d]/g, '')
                  setLengthTargetDraft(next)
                }}
                placeholder={String(defaultLengthTarget)}
                className="mt-1.5 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-[13px] text-stone-800 outline-none focus:border-stone-400"
              />
              <p className="mt-1 text-[11px] text-stone-400">可自由输入任意正整数；留空则使用默认 {defaultLengthTarget} 字。</p>
              {kind === 'parallel' ? (
                <p className="mt-2 text-[11px] leading-relaxed text-stone-400">
                  手动生成会写入卡片并同步时间轴摘要（主角色非全知行 + NPC 在场行）。
                </p>
              ) : (
                <p className="mt-2 text-[11px] leading-relaxed text-stone-400">
                  IF 线仅保存在本卡片供阅读，不会注入 AI 剧情参考。
                </p>
              )}

              {error ? (
                <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-[12px] text-red-700">{error}</p>
              ) : null}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-stone-100 px-4 py-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-stone-200 bg-white px-4 py-2 text-[13px] text-stone-700 hover:bg-stone-50"
              >
                关闭
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() =>
                  onGenerate(
                    writingGuide.trim(),
                    parsePlotDimensionLengthTarget(lengthTargetDraft, defaultLengthTarget),
                    {
                      plotOutputLanguage: plotLanguage,
                      dialogueLanguage,
                      innerOsLanguage,
                    },
                  )
                }
                className="inline-flex items-center gap-1.5 rounded-xl bg-stone-900 px-4 py-2 text-[13px] font-medium text-white hover:bg-stone-800 disabled:opacity-60"
              >
                {loading ? <Loader2 className="size-4 animate-spin" /> : null}
                {artifact?.content?.trim() ? '重新生成' : '生成'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  )
}
