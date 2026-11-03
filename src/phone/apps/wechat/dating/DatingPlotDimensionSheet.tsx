import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { ChevronDown, Copy, Loader2, Timer } from 'lucide-react'
import { BottomSheet } from '../../../../storyRpg/components/ui/BottomSheet'
import { WeChatCenterToast } from '../WeChatCenterToast'
import { copyTextToClipboard } from '../../../utils/copyToClipboard'
import { formatApiClientError } from '../addFriend/friendRequestApiError'
import {
  DATING_PLOT_DIMENSION_LENGTH_MAX,
  parsePlotDimensionLengthTarget,
  type NarrativePerspective,
  type PlotDimensionKind,
  type PlotItem,
} from './types'
import { PLOT_DIMENSION_LABELS, unwrapDimensionProseLineWraps } from './datingPlotDimensionAi'
import { formatPlotGenerationDurationLabel } from './plotStoryTimeLabel'
import { PlotRichParagraph } from './plotRichText'
import { countWordsExcludingPunct } from '../../../../storyRpg/utils/wordCount'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  plot: PlotItem | null
  kind: PlotDimensionKind
  perspective: NarrativePerspective
  defaultLengthTarget: number
  onGenerate: (params: { writingGuide: string; lengthTargetChars: number }) => Promise<void>
  onPersistLengthTarget?: (chars: number) => void
  busy?: boolean
  themeStyle?: CSSProperties
}

export function DatingPlotDimensionSheet({
  open,
  onOpenChange,
  plot,
  kind,
  perspective: _perspective,
  defaultLengthTarget,
  onGenerate,
  onPersistLengthTarget,
  busy = false,
  themeStyle,
}: Props) {
  const label = PLOT_DIMENSION_LABELS[kind]
  const artifact = useMemo(() => {
    if (!plot) return null
    return kind === 'parallel' ? plot.parallelEvent : plot.ifLine
  }, [kind, plot])

  const [writingGuide, setWritingGuide] = useState('')
  const [lengthDraft, setLengthDraft] = useState(String(defaultLengthTarget))
  const [copyToast, setCopyToast] = useState<string | null>(null)
  const [generateError, setGenerateError] = useState<string | null>(null)
  /** 有正文时默认收起指引，把视觉重心留给正文 */
  const [composeOpen, setComposeOpen] = useState(true)
  const copyToastTimerRef = useRef<number | null>(null)
  /** 同一次打开只灌入一次存档，避免收起键盘 / 父级重渲染把草稿打回旧内容 */
  const hydrateSessionKeyRef = useRef<string | null>(null)
  const prevContentLenRef = useRef(0)

  const displayContent = useMemo(
    () => unwrapDimensionProseLineWraps(artifact?.content || ''),
    [artifact?.content],
  )
  const hasResult = Boolean(displayContent.trim())

  useEffect(() => {
    if (!open) {
      hydrateSessionKeyRef.current = null
      prevContentLenRef.current = 0
      return
    }
    const key = `${kind}:${plot?.id ?? ''}`
    if (hydrateSessionKeyRef.current === key) return
    hydrateSessionKeyRef.current = key
    const art = kind === 'parallel' ? plot?.parallelEvent : plot?.ifLine
    const body = String(art?.content ?? '').trim()
    setWritingGuide(art?.writingGuide?.trim() || '')
    setLengthDraft(String(art?.lengthTargetChars || defaultLengthTarget))
    setGenerateError(null)
    setComposeOpen(!body)
    prevContentLenRef.current = body.length
  }, [open, kind, plot, defaultLengthTarget])

  // 新正文落库后自动收起指引，把屏幕留给阅读
  useEffect(() => {
    if (!open || !hasResult) return
    const len = displayContent.length
    if (len > 0 && len !== prevContentLenRef.current) {
      prevContentLenRef.current = len
      setComposeOpen(false)
    }
  }, [open, hasResult, displayContent])

  useEffect(
    () => () => {
      if (copyToastTimerRef.current != null) window.clearTimeout(copyToastTimerRef.current)
    },
    [],
  )

  const showToast = useCallback((msg: string, ms = 1800) => {
    setCopyToast(msg)
    if (copyToastTimerRef.current != null) window.clearTimeout(copyToastTimerRef.current)
    copyToastTimerRef.current = window.setTimeout(() => setCopyToast(null), ms)
  }, [])

  const handleCopyBody = useCallback(async () => {
    const text = displayContent.trim()
    if (!text) {
      showToast('暂无内容可复制')
      return
    }
    const ok = await copyTextToClipboard(text)
    showToast(ok ? '已复制' : '复制失败，请检查浏览器剪贴板权限')
  }, [displayContent, showToast])

  const generatedWordCount = hasResult ? countWordsExcludingPunct(displayContent) : 0
  const durationLabel = formatPlotGenerationDurationLabel(artifact?.generationDurationMs)

  const commitLengthTarget = useCallback(() => {
    const n = parsePlotDimensionLengthTarget(lengthDraft, defaultLengthTarget)
    onPersistLengthTarget?.(n)
    setLengthDraft(String(n))
    return n
  }, [defaultLengthTarget, lengthDraft, onPersistLengthTarget])

  const handleGenerate = async () => {
    const lengthTargetChars = commitLengthTarget()
    setGenerateError(null)
    try {
      await onGenerate({ writingGuide: writingGuide.trim(), lengthTargetChars })
    } catch (e) {
      const reason = formatApiClientError(e, `${label}生成失败，请稍后重试。`)
      const msg = `${label}生成失败：${reason}`
      setGenerateError(msg)
      showToast(msg, 4200)
      console.warn(`[dating] ${label} generate failed`, e)
    }
  }

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={label}
      subtitle={kind === 'parallel' ? '与锚点同刻 · 异场景' : '假设分支 · 可另起番外'}
      themeStyle={themeStyle}
      headerTrailing={
        hasResult ? (
          <button
            type="button"
            onClick={() => void handleCopyBody()}
            className="inline-flex h-8 items-center gap-1.5 rounded-full border border-[var(--sr-border)] bg-[var(--sr-panel)] px-3 text-[11px] font-medium text-[var(--sr-text)] transition hover:border-[var(--sr-gold)]/40"
          >
            <Copy className="size-3.5" strokeWidth={1.75} aria-hidden />
            复制正文
          </button>
        ) : null
      }
    >
      <div className="flex flex-col gap-4 pb-3">
        {/* —— 正文主角区 —— */}
        {hasResult ? (
          <section className="relative overflow-hidden rounded-[18px] border border-[var(--sr-gold)]/25 bg-[var(--sr-panel)] shadow-[inset_3px_0_0_0_var(--sr-gold)]">
            <div className="flex items-center justify-between gap-3 border-b border-[var(--sr-border)]/80 px-4 py-3">
              <div className="min-w-0">
                <p className="font-[family-name:var(--sr-font-serif)] text-[16px] font-semibold tracking-wide text-[var(--sr-text)]">
                  生成正文
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[var(--sr-text-muted)]">
                  <span className="font-mono text-[12px] tabular-nums text-[var(--sr-text-soft)]">
                    {generatedWordCount}
                    <span className="ml-0.5 text-[10px] text-[var(--sr-text-faint)]">字</span>
                  </span>
                  {durationLabel ? (
                    <span className="inline-flex items-center gap-1">
                      <Timer className="size-3 opacity-70" strokeWidth={1.75} aria-hidden />
                      <span className="font-mono tabular-nums">{durationLabel}</span>
                    </span>
                  ) : null}
                </div>
              </div>
              <button
                type="button"
                onClick={() => void handleCopyBody()}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[var(--sr-gold)]/15 px-3 py-1.5 text-[12px] font-medium text-[var(--sr-text)] transition hover:bg-[var(--sr-gold)]/25"
              >
                <Copy className="size-3.5" strokeWidth={1.75} aria-hidden />
                复制
              </button>
            </div>
            <div className="sr-prose sr-prose-selectable max-h-[min(58dvh,480px)] overflow-y-auto overscroll-contain px-4 py-4 text-[15px] leading-[1.85]">
              <PlotRichParagraph
                content={displayContent}
                plainDialogue
                dialogueTranslations={artifact?.dialogueTranslations}
                innerOsTranslations={artifact?.innerOsTranslations}
              />
            </div>
          </section>
        ) : (
          <section className="flex min-h-[min(28dvh,200px)] flex-col items-center justify-center rounded-[18px] border border-dashed border-[var(--sr-border)] bg-[var(--sr-panel)]/50 px-5 py-10 text-center">
            <p className="font-[family-name:var(--sr-font-serif)] text-[17px] tracking-wide text-[var(--sr-text-soft)]">
              正文将显示在这里
            </p>
            <p className="mt-2 max-w-[16rem] text-[12px] leading-relaxed text-[var(--sr-text-faint)]">
              在下方写好指引后生成；生成结果会占满主要阅读区
            </p>
          </section>
        )}

        {generateError ? (
          <div
            role="alert"
            className="rounded-[14px] border border-red-300/80 bg-red-50 px-3.5 py-3 text-[12px] leading-relaxed text-red-800"
          >
            <p className="font-medium">生成失败</p>
            <p className="mt-1 break-words whitespace-pre-wrap opacity-95">{generateError}</p>
            <button
              type="button"
              onClick={() => setGenerateError(null)}
              className="mt-2 text-[11px] text-red-700/80 underline underline-offset-2"
            >
              关闭提示
            </button>
          </div>
        ) : null}

        {/* —— 次要：写作设置（可折叠） —— */}
        <section className="overflow-hidden rounded-[14px] border border-[var(--sr-border)] bg-[var(--sr-panel)]/80">
          <button
            type="button"
            onClick={() => setComposeOpen((v) => !v)}
            className="flex w-full items-center justify-between gap-2 px-3.5 py-3 text-left"
            aria-expanded={composeOpen}
          >
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-[var(--sr-text-soft)]">写作设置</p>
              {!composeOpen ? (
                <p className="mt-0.5 truncate text-[11px] text-[var(--sr-text-faint)]">
                  目标 {lengthDraft || '—'} 字
                  {writingGuide.trim() ? ` · 指引 ${[...writingGuide.trim()].length} 字` : ' · 未填指引'}
                </p>
              ) : null}
            </div>
            <ChevronDown
              className={`size-4 shrink-0 text-[var(--sr-text-muted)] transition-transform ${
                composeOpen ? 'rotate-180' : ''
              }`}
              strokeWidth={1.75}
              aria-hidden
            />
          </button>

          {composeOpen ? (
            <div className="space-y-3 border-t border-[var(--sr-border)] px-3.5 pb-3.5 pt-3">
              <label className="block">
                <span className="mb-1.5 flex items-center justify-between text-[11px] text-[var(--sr-text-muted)]">
                  <span>写作指引</span>
                  <span className="font-mono tabular-nums text-[var(--sr-text-faint)]">
                    {[...writingGuide].length}
                  </span>
                </span>
                <textarea
                  value={writingGuide}
                  onChange={(e) => setWritingGuide(e.target.value)}
                  rows={5}
                  enterKeyHint="done"
                  placeholder={
                    kind === 'parallel'
                      ? '例如：写林子舟在另一处同时发生的事…'
                      : '例：直接另起一个番外……写清视角、场景、结局。'
                  }
                  className="min-h-[6.5rem] w-full resize-y rounded-[12px] border border-[var(--sr-border)] bg-[var(--sr-panel-elevated)] px-3 py-2.5 text-[13px] leading-relaxed text-[var(--sr-text)] outline-none placeholder:text-[var(--sr-text-faint)] focus:border-[var(--sr-gold)]/45"
                />
              </label>

              <div className="flex items-center gap-2">
                <span className="shrink-0 text-[11px] text-[var(--sr-text-muted)]">目标字数</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={DATING_PLOT_DIMENSION_LENGTH_MAX}
                  value={lengthDraft}
                  onChange={(e) => setLengthDraft(e.target.value)}
                  onBlur={() => commitLengthTarget()}
                  className="h-9 min-w-0 flex-1 rounded-[10px] border border-[var(--sr-border)] bg-[var(--sr-panel-elevated)] px-3 font-mono text-[14px] tabular-nums text-[var(--sr-text)] outline-none focus:border-[var(--sr-gold)]/45"
                />
                <span className="shrink-0 text-[10px] text-[var(--sr-text-faint)]">
                  ≤{DATING_PLOT_DIMENSION_LENGTH_MAX}
                </span>
              </div>
            </div>
          ) : null}
        </section>

        <button
          type="button"
          disabled={busy || !plot}
          onClick={() => void handleGenerate()}
          className="flex w-full items-center justify-center gap-2 rounded-[14px] bg-[var(--sr-gold)] py-3.5 text-[15px] font-medium text-[var(--sr-gold-on)] transition hover:brightness-110 disabled:opacity-40"
        >
          {busy ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              生成中…
            </>
          ) : hasResult ? (
            `重新生成${label}`
          ) : (
            `生成${label}`
          )}
        </button>
      </div>
      <WeChatCenterToast message={copyToast} />
    </BottomSheet>
  )
}
