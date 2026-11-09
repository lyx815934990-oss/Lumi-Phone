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
  type PlotDimensionOutputFormat,
  type PlotItem,
} from './types'
import {
  normalizePlotDimensionHtmlContent,
  peekPlotDimensionHtmlShell,
  PLOT_DIMENSION_LABELS,
  unwrapDimensionProseLineWraps,
  type DimensionTruncateContinueAsk,
  type DimensionTruncateContinueAskInfo,
} from './datingPlotDimensionAi'
import { formatPlotGenerationDurationLabel } from './plotStoryTimeLabel'
import { PlotRichParagraph } from './plotRichText'
import { SandboxedHtmlFrame } from '../../../../storyRpg/components/feed/SandboxedHtmlFrame'
import { countWordsExcludingPunct } from '../../../../storyRpg/utils/wordCount'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  plot: PlotItem | null
  kind: PlotDimensionKind
  perspective: NarrativePerspective
  defaultLengthTarget: number
  /** IF 面板默认格式（来自存档） */
  defaultOutputFormat?: PlotDimensionOutputFormat
  onGenerate: (params: {
    writingGuide: string
    lengthTargetChars: number
    outputFormat?: PlotDimensionOutputFormat
    askContinueAfterTruncate?: DimensionTruncateContinueAsk
  }) => Promise<void>
  onPersistLengthTarget?: (chars: number) => void
  onPersistOutputFormat?: (format: PlotDimensionOutputFormat) => void
  busy?: boolean
  themeStyle?: CSSProperties
}

type ContinueAskState = {
  info: DimensionTruncateContinueAskInfo
  resolve: (ok: boolean) => void
}

export function DatingPlotDimensionSheet({
  open,
  onOpenChange,
  plot,
  kind,
  perspective: _perspective,
  defaultLengthTarget,
  defaultOutputFormat = 'prose',
  onGenerate,
  onPersistLengthTarget,
  onPersistOutputFormat,
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
  const [outputFormat, setOutputFormat] = useState<PlotDimensionOutputFormat>(
    defaultOutputFormat === 'html' ? 'html' : 'prose',
  )
  const [copyToast, setCopyToast] = useState<string | null>(null)
  const [generateError, setGenerateError] = useState<string | null>(null)
  /** HTML 结果：网页预览 vs 落库源码（排查是生成还是容器） */
  const [htmlPane, setHtmlPane] = useState<'preview' | 'source'>('preview')
  /** 有正文时默认收起指引，把视觉重心留给正文 */
  const [composeOpen, setComposeOpen] = useState(true)
  /** 截断后续写确认 */
  const [continueAsk, setContinueAsk] = useState<ContinueAskState | null>(null)
  const copyToastTimerRef = useRef<number | null>(null)
  /** 同一次打开只灌入一次存档，避免收起键盘 / 父级重渲染把草稿打回旧内容 */
  const hydrateSessionKeyRef = useRef<string | null>(null)
  const continueAskRef = useRef<ContinueAskState | null>(null)
  continueAskRef.current = continueAsk

  const askContinueAfterTruncate = useCallback<DimensionTruncateContinueAsk>((info) => {
    return new Promise<boolean>((resolve) => {
      // 若上一次确认还挂着，先按「不续写」收掉，避免 Promise 泄漏
      const prev = continueAskRef.current
      if (prev) prev.resolve(false)
      setContinueAsk({ info, resolve })
    })
  }, [])

  const answerContinueAsk = useCallback((ok: boolean) => {
    const cur = continueAskRef.current
    if (!cur) return
    cur.resolve(ok)
    setContinueAsk(null)
  }, [])
  const prevContentLenRef = useRef(0)

  const storedGuide = artifact?.writingGuide?.trim() || ''
  const htmlContent = useMemo(() => {
    if (kind !== 'if') return null
    // 散文结果不当网页；仅 HTML 产物进预览
    if (artifact?.outputFormat === 'prose') return null
    return normalizePlotDimensionHtmlContent(
      artifact?.content || '',
      storedGuide || writingGuide,
    )
  }, [kind, artifact?.content, artifact?.outputFormat, storedGuide, writingGuide])

  const hollowHtmlShell = useMemo(() => {
    if (kind !== 'if' || htmlContent) return null
    return peekPlotDimensionHtmlShell(artifact?.content || '')
  }, [kind, htmlContent, artifact?.content])

  /** 落库原文（消毒前）；源码面板优先看这个 */
  const htmlSourceRaw = useMemo(() => {
    if (kind !== 'if') return ''
    return String(artifact?.content || '').trim()
  }, [kind, artifact?.content])

  /** 被门闸拒收但仍落库的 HTML（含空 head 等），务必能看源码 */
  const rejectedHtmlDraft = useMemo(() => {
    if (kind !== 'if' || htmlContent) return null
    if (hollowHtmlShell) return hollowHtmlShell
    if (artifact?.outputFormat === 'html' && htmlSourceRaw.length >= 40 && /</.test(htmlSourceRaw)) {
      return htmlSourceRaw
    }
    return null
  }, [kind, htmlContent, hollowHtmlShell, artifact?.outputFormat, htmlSourceRaw])

  const displayContent = useMemo(() => {
    if (htmlContent) return htmlContent
    // 旧空壳 / 被拒草稿：不要把整页标签当散文糊弄；留给提示条
    if (rejectedHtmlDraft) return ''
    return unwrapDimensionProseLineWraps(artifact?.content || '')
  }, [htmlContent, rejectedHtmlDraft, artifact?.content])
  const hasResult = Boolean(displayContent.trim()) || Boolean(rejectedHtmlDraft)
  /** 仅 HTML 产物（可预览或被拒草稿）提供源码对照 */
  const canInspectHtmlSource = Boolean(htmlContent || rejectedHtmlDraft)

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
    const fmt =
      art?.outputFormat === 'html' || art?.outputFormat === 'prose'
        ? art.outputFormat
        : kind === 'if' && normalizePlotDimensionHtmlContent(body)
          ? 'html'
          : defaultOutputFormat === 'html'
            ? 'html'
            : 'prose'
    setOutputFormat(fmt)
    setGenerateError(null)
    setHtmlPane('preview')
    setComposeOpen(!body)
    prevContentLenRef.current = body.length
  }, [open, kind, plot, defaultLengthTarget, defaultOutputFormat])

  // 新 HTML 落库：可预览则回预览；被拒草稿直接打开源码方便复制
  useEffect(() => {
    if (!open || !htmlSourceRaw) return
    setHtmlPane(htmlContent ? 'preview' : 'source')
  }, [open, htmlSourceRaw, htmlContent])

  // 新正文/被拒草稿落库后自动收起指引，把屏幕留给阅读或源码
  useEffect(() => {
    if (!open || !hasResult) return
    const len = Math.max(displayContent.length, htmlSourceRaw.length)
    if (len > 0 && len !== prevContentLenRef.current) {
      prevContentLenRef.current = len
      setComposeOpen(false)
    }
  }, [open, hasResult, displayContent, htmlSourceRaw])

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
    const text =
      htmlPane === 'source' && htmlSourceRaw
        ? htmlSourceRaw
        : (htmlContent || rejectedHtmlDraft || displayContent).trim()
    if (!text) {
      showToast('暂无内容可复制')
      return
    }
    const ok = await copyTextToClipboard(text)
    showToast(ok ? '已复制' : '复制失败，请检查浏览器剪贴板权限')
  }, [htmlPane, htmlSourceRaw, htmlContent, rejectedHtmlDraft, displayContent, showToast])

  const generatedWordCount = htmlContent
    ? htmlContent.length
    : displayContent.trim()
      ? countWordsExcludingPunct(displayContent)
      : 0
  const durationLabel = formatPlotGenerationDurationLabel(artifact?.generationDurationMs)

  const commitLengthTarget = useCallback(() => {
    const n = parsePlotDimensionLengthTarget(lengthDraft, defaultLengthTarget)
    onPersistLengthTarget?.(n)
    setLengthDraft(String(n))
    return n
  }, [defaultLengthTarget, lengthDraft, onPersistLengthTarget])

  const selectOutputFormat = (fmt: PlotDimensionOutputFormat) => {
    setOutputFormat(fmt)
    if (kind === 'if') onPersistOutputFormat?.(fmt)
  }

  const handleGenerate = async () => {
    const lengthTargetChars =
      kind === 'if' && outputFormat === 'html' ? defaultLengthTarget : commitLengthTarget()
    setGenerateError(null)
    try {
      await onGenerate({
        writingGuide: writingGuide.trim(),
        lengthTargetChars,
        askContinueAfterTruncate,
        ...(kind === 'if' ? { outputFormat } : {}),
      })
    } catch (e) {
      // 生成中断时收掉挂起的续写确认
      if (continueAskRef.current) {
        continueAskRef.current.resolve(false)
        setContinueAsk(null)
      }
      const reason = formatApiClientError(e, '请稍后重试。')
      // 底层若已带「IF线生成失败」前缀，勿再叠一层
      const msg = /生成失败/.test(reason) ? reason : `${label}生成失败：${reason}`
      setGenerateError(msg)
      showToast(msg, 4200)
      console.warn(`[dating] ${label} generate failed`, e)
    }
  }

  useEffect(() => {
    if (open) return
    if (continueAskRef.current) {
      continueAskRef.current.resolve(false)
      setContinueAsk(null)
    }
  }, [open])

  const continueReasonLabel =
    continueAsk?.info.reason === 'stream_partial' ? '生成中途断流' : '输出触达上限被掐断'

  return (
    <>
    <BottomSheet
      open={open}
      onOpenChange={(next) => {
        if (!next && continueAskRef.current) {
          continueAskRef.current.resolve(false)
          setContinueAsk(null)
        }
        onOpenChange(next)
      }}
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
      <div className="relative flex flex-col gap-4 pb-3">
        {continueAsk ? (
          <div
            className="absolute inset-0 z-20 flex items-end justify-center bg-black/45 px-3 pb-3 pt-8 sm:items-center"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dimension-continue-title"
          >
            <div className="w-full max-w-sm overflow-hidden rounded-[18px] border border-[var(--sr-border)] bg-[var(--sr-panel-elevated)] shadow-2xl">
              <div className="border-b border-[var(--sr-border)] px-4 py-3">
                <p
                  id="dimension-continue-title"
                  className="text-[15px] font-semibold text-[var(--sr-text)]"
                >
                  正文被截断
                </p>
                <p className="mt-1 text-[12px] leading-relaxed text-[var(--sr-text-muted)]">
                  {continueReasonLabel}。已写约{' '}
                  <span className="font-mono tabular-nums text-[var(--sr-text)]">
                    {continueAsk.info.charsSoFar}
                  </span>{' '}
                  字
                  {continueAsk.info.targetChars > 0 ? (
                    <>
                      （目标{' '}
                      <span className="font-mono tabular-nums">
                        {continueAsk.info.targetChars}
                      </span>{' '}
                      字）
                    </>
                  ) : null}
                  。是否从断点<strong className="font-medium text-[var(--sr-text)]">无缝接着写</strong>
                  ？续写会再请求一次并计费；不会重开篇重写。
                </p>
              </div>
              {continueAsk.info.previewTail.trim() ? (
                <div className="border-b border-[var(--sr-border)] px-4 py-2.5">
                  <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-[var(--sr-text-faint)]">
                    断点末尾
                  </p>
                  <p className="max-h-24 overflow-y-auto whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed text-[var(--sr-text-muted)]">
                    …{continueAsk.info.previewTail}
                  </p>
                </div>
              ) : null}
              <div className="flex gap-2 p-3">
                <button
                  type="button"
                  onClick={() => answerContinueAsk(false)}
                  className="flex-1 rounded-full border border-[var(--sr-border)] bg-[var(--sr-panel)] py-2.5 text-[13px] font-medium text-[var(--sr-text)]"
                >
                  保留半成品
                </button>
                <button
                  type="button"
                  onClick={() => answerContinueAsk(true)}
                  className="flex-[1.2] rounded-full bg-[var(--sr-gold)] py-2.5 text-[13px] font-medium text-[var(--sr-gold-on)]"
                >
                  无缝续写
                </button>
              </div>
            </div>
          </div>
        ) : null}
        {/* —— 正文主角区 —— */}
        {rejectedHtmlDraft ? (
          <section className="overflow-hidden rounded-[18px] border border-amber-300/80 bg-amber-50 text-[13px] leading-relaxed text-amber-950">
            <div className="px-4 py-4">
              <div className="flex items-start justify-between gap-2">
                <p className="font-[family-name:var(--sr-font-serif)] text-[16px] font-semibold tracking-wide">
                  无法按网页打开（已保存源码）
                </p>
                <div className="inline-flex shrink-0 rounded-full border border-amber-400/50 bg-white/60 p-0.5">
                  <button
                    type="button"
                    onClick={() => setHtmlPane('preview')}
                    className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                      htmlPane !== 'source' ? 'bg-amber-200/80' : 'opacity-70'
                    }`}
                  >
                    说明
                  </button>
                  <button
                    type="button"
                    onClick={() => setHtmlPane('source')}
                    className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                      htmlPane === 'source' ? 'bg-amber-200/80' : 'opacity-70'
                    }`}
                  >
                    源码
                  </button>
                </div>
              </div>
              {htmlPane === 'source' ? (
                <pre className="mt-3 max-h-[min(52dvh,480px)] overflow-auto rounded-[12px] bg-[#0f1115] px-3 py-3 font-mono text-[11px] leading-[1.55] whitespace-pre-wrap break-words text-[#d7dde8]">
                  {htmlSourceRaw || rejectedHtmlDraft}
                </pre>
              ) : (
                <p className="mt-2 text-[12px] opacity-90">
                  模型输出未过门闸（常见：空 head / 缺 CSS / 截断）。点「源码」可复制全文发给排查；修好引导后重新生成。
                </p>
              )}
              <button
                type="button"
                onClick={() => void handleCopyBody()}
                className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-amber-400/60 bg-white/70 px-3 py-1.5 text-[11px] font-medium"
              >
                <Copy className="size-3.5" strokeWidth={1.75} aria-hidden />
                复制源码
              </button>
            </div>
          </section>
        ) : hasResult ? (
          <section className="relative overflow-hidden rounded-[18px] border border-[var(--sr-gold)]/25 shadow-[inset_3px_0_0_0_var(--sr-gold)]">
            {/* 顶栏走主题；HTML 预览区与主题色隔离，避免 --sr-* 盖过文档自身配色 */}
            <div className="flex items-center justify-between gap-3 border-b border-[var(--sr-border)]/80 bg-[var(--sr-panel)] px-4 py-3">
              <div className="min-w-0">
                <p className="font-[family-name:var(--sr-font-serif)] text-[16px] font-semibold tracking-wide text-[var(--sr-text)]">
                  {canInspectHtmlSource
                    ? htmlPane === 'source'
                      ? 'HTML 源码'
                      : htmlContent
                        ? '网页预览'
                        : '生成正文'
                    : '生成正文'}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[var(--sr-text-muted)]">
                  <span className="font-mono text-[12px] tabular-nums text-[var(--sr-text-soft)]">
                    {htmlPane === 'source' && htmlSourceRaw
                      ? htmlSourceRaw.length
                      : generatedWordCount}
                    <span className="ml-0.5 text-[10px] text-[var(--sr-text-faint)]">
                      {canInspectHtmlSource ? '字符' : htmlContent ? '字符' : '字'}
                    </span>
                  </span>
                  {durationLabel ? (
                    <span className="inline-flex items-center gap-1">
                      <Timer className="size-3 opacity-70" strokeWidth={1.75} aria-hidden />
                      <span className="font-mono tabular-nums">{durationLabel}</span>
                    </span>
                  ) : null}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                {canInspectHtmlSource ? (
                  <div className="inline-flex rounded-full border border-[var(--sr-border)] bg-[var(--sr-panel-elevated)] p-0.5">
                    <button
                      type="button"
                      onClick={() => setHtmlPane('preview')}
                      className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
                        htmlPane === 'preview'
                          ? 'bg-[var(--sr-gold)]/20 text-[var(--sr-text)]'
                          : 'text-[var(--sr-text-muted)]'
                      }`}
                    >
                      预览
                    </button>
                    <button
                      type="button"
                      onClick={() => setHtmlPane('source')}
                      className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
                        htmlPane === 'source'
                          ? 'bg-[var(--sr-gold)]/20 text-[var(--sr-text)]'
                          : 'text-[var(--sr-text-muted)]'
                      }`}
                    >
                      源码
                    </button>
                  </div>
                ) : null}
                <button
                  type="button"
                  onClick={() => void handleCopyBody()}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[var(--sr-gold)]/15 px-3 py-1.5 text-[12px] font-medium text-[var(--sr-text)] transition hover:bg-[var(--sr-gold)]/25"
                >
                  <Copy className="size-3.5" strokeWidth={1.75} aria-hidden />
                  复制
                </button>
              </div>
            </div>
            {canInspectHtmlSource && htmlPane === 'source' ? (
              <div className="border-t border-[var(--sr-border)]/60 bg-[#0f1115]">
                <p className="border-b border-white/10 px-3 py-2 text-[10px] leading-relaxed text-white/55">
                  落库原文（消毒前）。若源码本身缺样式/棋盘，是生成问题；源码正常但预览怪，才是容器问题。
                  {htmlContent && htmlSourceRaw && htmlContent !== htmlSourceRaw ? (
                    <span className="mt-0.5 block text-amber-200/80">
                      预览用的是消毒后版本（与原文有差异）。
                    </span>
                  ) : null}
                </p>
                <pre className="max-h-[min(72dvh,720px)] overflow-auto overscroll-contain px-3 py-3 font-mono text-[11px] leading-[1.55] whitespace-pre-wrap break-words text-[#d7dde8]">
                  {htmlSourceRaw || '（无源码）'}
                </pre>
              </div>
            ) : htmlContent ? (
              <div className="isolate overflow-hidden border-t border-[var(--sr-border)]/60 bg-transparent">
                <SandboxedHtmlFrame
                  html={htmlContent}
                  title={`${label}网页预览`}
                  minHeight={320}
                  playableSandbox
                  className="block w-full border-0"
                />
              </div>
            ) : (
              <div className="sr-prose sr-prose-selectable max-h-[min(58dvh,480px)] overflow-y-auto overscroll-contain bg-[var(--sr-panel)] px-4 py-4 text-[15px] leading-[1.85]">
                <PlotRichParagraph
                  content={displayContent}
                  plainDialogue
                  dialogueTranslations={artifact?.dialogueTranslations}
                  innerOsTranslations={artifact?.innerOsTranslations}
                />
              </div>
            )}
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
                  {kind === 'if'
                    ? outputFormat === 'html'
                      ? 'HTML · 不限字数'
                      : '纯文本'
                    : `目标 ${lengthDraft || '—'} 字`}
                  {kind !== 'if' || outputFormat !== 'html'
                    ? writingGuide.trim()
                      ? ` · 指引 ${[...writingGuide.trim()].length} 字`
                      : ' · 未填指引'
                    : writingGuide.trim()
                      ? ` · 指引 ${[...writingGuide.trim()].length} 字`
                      : ''}
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
              {kind === 'if' ? (
                <div>
                  <span className="mb-1.5 block text-[11px] text-[var(--sr-text-muted)]">输出格式</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => selectOutputFormat('prose')}
                      className={`flex-1 rounded-[10px] border px-3 py-2 text-[13px] font-medium transition ${
                        outputFormat === 'prose'
                          ? 'border-[var(--sr-gold)] bg-[var(--sr-gold)]/15 text-[var(--sr-text)]'
                          : 'border-[var(--sr-border)] bg-[var(--sr-panel-elevated)] text-[var(--sr-text-soft)]'
                      }`}
                    >
                      纯文本
                    </button>
                    <button
                      type="button"
                      onClick={() => selectOutputFormat('html')}
                      className={`flex-1 rounded-[10px] border px-3 py-2 text-[13px] font-medium transition ${
                        outputFormat === 'html'
                          ? 'border-[var(--sr-gold)] bg-[var(--sr-gold)]/15 text-[var(--sr-text)]'
                          : 'border-[var(--sr-border)] bg-[var(--sr-panel-elevated)] text-[var(--sr-text-soft)]'
                      }`}
                    >
                      HTML 网页
                    </button>
                  </div>
                  <p className="mt-1.5 text-[10px] leading-relaxed text-[var(--sr-text-faint)]">
                    {outputFormat === 'html'
                      ? 'HTML 模式不限字数，须输出完整闭合的 HTML 文件（避免半截 style）。'
                      : '纯文本模式写假设剧情正文，不当网页渲染。'}
                  </p>
                </div>
              ) : null}

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
                      : outputFormat === 'html'
                        ? '贴 HTML/小游戏/表格美化规格书；将输出完整网页。'
                        : '例：另起番外……写清视角、场景、结局。'
                  }
                  className="min-h-[6.5rem] w-full resize-y rounded-[12px] border border-[var(--sr-border)] bg-[var(--sr-panel-elevated)] px-3 py-2.5 text-[13px] leading-relaxed text-[var(--sr-text)] outline-none placeholder:text-[var(--sr-text-faint)] focus:border-[var(--sr-gold)]/45"
                />
              </label>

              {kind === 'if' && outputFormat === 'html' ? (
                <p className="rounded-[10px] border border-[var(--sr-border)] bg-[var(--sr-panel-elevated)] px-3 py-2 text-[11px] leading-relaxed text-[var(--sr-text-muted)]">
                  目标字数已关闭。请让模型写完并闭合全部标签；复杂页面宁可长，不要截断。
                </p>
              ) : (
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
              )}
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
    </>
  )
}
