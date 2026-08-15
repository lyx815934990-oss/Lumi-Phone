import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent } from 'react'
import { createPortal } from 'react-dom'
import { copyTextToClipboard } from '../../../utils/copyToClipboard'
import { formatApiClientError } from '../addFriend/friendRequestApiError'
import { WeChatCenterToast } from '../WeChatCenterToast'
import { useExpandedStoryTimelineSnapshot } from '../memory/useExpandedStoryTimelineSnapshot'
import { useDating } from './DatingContext'
import { PlotDimensionPanel } from './PlotDimensionPanel'
import { getAiPlotVersionSlices, getAiVersionArrays } from './plotVersions'
import { resolveDatingPlotDisplayFromItem } from './plotCoT'
import {
  formatPlotGenerationTimeCompact,
  resolvePlotStoryEndDisplayLabel,
} from './plotStoryTimeLabel'
import { PlotMagazineBody } from './PlotMagazineBody'
import { PlotRichParagraph } from './plotRichText'
import { DatingNum } from './DatingNum'
import type { BranchOption, NarrativePerspective, PlotDimensionKind, PlotItem } from './types'

function PlotCardMetaFooter({
  bodyChars,
  generationCompact,
  storyEndLabel,
  showLongPressHint,
}: {
  bodyChars?: number
  generationCompact: string
  storyEndLabel?: string | null
  showLongPressHint?: boolean
}) {
  const hasStory = Boolean(storyEndLabel?.trim())
  return (
    <div className="mt-2.5 border-t border-black/[0.05] pt-2">
      <div className="mb-1 flex items-center justify-between gap-2">
        {typeof bodyChars === 'number' ? (
          <p className="text-[10px] leading-none text-[#8A8A8E]">
            约 <DatingNum>{bodyChars}</DatingNum> 字
          </p>
        ) : (
          <span />
        )}
        {showLongPressHint ? (
          <span className="shrink-0 text-[10px] leading-none text-[#C8C8CC] opacity-0 transition-opacity group-hover:opacity-100">
            长按菜单
          </span>
        ) : null}
      </div>
      <div className="grid grid-cols-1 gap-1">
        <div className="flex min-w-0 items-baseline gap-2" title={`生成时间 ${generationCompact}`}>
          <span className="w-6 shrink-0 text-[9px] font-medium tracking-[0.08em] text-[#8A8A8E]">生成</span>
          <span className="min-w-0 truncate text-[11px] leading-tight text-[#555]">
            <DatingNum>{generationCompact}</DatingNum>
          </span>
        </div>
        {hasStory ? (
          <div className="flex min-w-0 items-baseline gap-2" title={`剧情时间 ${storyEndLabel}`}>
            <span className="w-6 shrink-0 text-[9px] font-medium tracking-[0.08em] text-[#8A8A8E]">剧情</span>
            <span className="min-w-0 truncate text-[11px] leading-tight text-[#333]">
              <DatingNum>{storyEndLabel}</DatingNum>
            </span>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export type BranchChoicesSlot = {
  loading: boolean
  options: BranchOption[]
  onPick: (o: BranchOption) => void
}

const LONG_PRESS_MS = 500
const MOVE_CANCEL_PX = 12

/** 禁止系统文本圈选 / iOS 长按「拷贝·查询·翻译」浮条，仅保留自定义长按菜单 */
const suppressSystemTextUi: {
  className: string
  style: CSSProperties
  onContextMenu: (e: MouseEvent) => void
} = {
  className:
    'cursor-default select-none touch-manipulation [-webkit-touch-callout:none] [-webkit-user-select:none]',
  style: {
    WebkitTouchCallout: 'none',
    WebkitUserSelect: 'none',
    userSelect: 'none',
  },
  onContextMenu: (e) => e.preventDefault(),
}

function countPlotCharsExcludePunctuation(text: string): number {
  let n = 0
  for (const ch of text) {
    if (/[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/.test(ch)) n += 1
    else if (/[A-Za-z0-9]/.test(ch)) n += 1
  }
  return n
}

function TypewriterShimmer() {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => (t + 1) % 4), 420)
    return () => window.clearInterval(id)
  }, [])
  const dots = '.'.repeat(tick + 1)
  return (
    <motion.div
      className="min-h-[4.5rem] rounded-[16px] border border-black/[0.05] bg-white px-3.5 py-3.5 text-[14px] leading-relaxed text-[#8A8A8E]"
      initial={{ opacity: 0.6 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
    >
      <span className="font-medium text-[#555]">正在重新生成</span>
      <span className="tabular-nums">{dots.padEnd(3, '\u00a0')}</span>
    </motion.div>
  )
}

type Props = {
  plot: PlotItem
  /** 展开剧情时间轴占位符时使用的角色 id（与 loadStoryTimelinePromptBlock 同源） */
  timelineExpandCharacterId?: string | null
  isRegenerating: boolean
  interactionLocked?: boolean
  /** 是否允许「重新回复」（由父级根据是否为列表最后一条 AI 决定） */
  canRegenerate?: boolean
  onSaveBodyEdit: (body: string) => void
  onRegenerate?: () => void
  onDelete?: () => void
  onVersionChange?: (nextIndex: number) => void
  /** 末条 AI 卡内折叠：剧情分支选项 */
  branchChoices?: BranchChoicesSlot
  narrativePerspective?: NarrativePerspective
}

function PlotDimensionChip({
  label,
  filled,
  onClick,
}: {
  label: string
  filled: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-2.5 py-1 text-[10px] font-medium leading-none tracking-wide transition-colors ${
        filled
          ? 'border-[#111] bg-[#111] text-white'
          : 'border-black/[0.08] bg-white text-[#666] hover:border-black/15 hover:bg-black/[0.02]'
      }`}
    >
      {label}
      {filled ? <span className="ml-1 inline-block size-1 rounded-full bg-white/80 align-middle" aria-hidden /> : null}
    </button>
  )
}

export function StoryBlock({
  plot,
  timelineExpandCharacterId = null,
  isRegenerating,
  interactionLocked,
  canRegenerate,
  onSaveBodyEdit,
  onRegenerate,
  onDelete,
  onVersionChange,
  branchChoices,
  narrativePerspective = 'second',
}: Props) {
  const { generatePlotDimension, backfillPlotTranslations, currentArchive, currentCharacterId } =
    useDating()
  const [backfillBusy, setBackfillBusy] = useState(false)
  const aiSplit = useMemo(() => {
    if (plot.type !== 'ai') return { thinkingText: '', displayBody: plot.content }
    return resolveDatingPlotDisplayFromItem(plot)
  }, [plot])

  const versionInfo = useMemo(() => {
    if (plot.type !== 'ai') return { total: 1, index: 0, hasPager: false }
    const { versions, currentVersionIndex } = getAiVersionArrays(plot)
    return {
      total: versions.length,
      index: currentVersionIndex,
      hasPager: versions.length > 1,
    }
  }, [plot])

  const timelineSnapshotRaw = useMemo(() => {
    if (plot.type !== 'ai') return ''
    return getAiPlotVersionSlices(plot).timelineSnapshot?.trim() ?? ''
  }, [plot])
  const timelineSnapshotText = useExpandedStoryTimelineSnapshot(
    timelineExpandCharacterId,
    timelineSnapshotRaw,
  )

  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [ctxOpen, setCtxOpen] = useState(false)
  const [ctxPos, setCtxPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [pressing, setPressing] = useState(false)
  const [dimensionPanel, setDimensionPanel] = useState<PlotDimensionKind | null>(null)
  const [dimensionLoading, setDimensionLoading] = useState(false)
  const [dimensionError, setDimensionError] = useState<string | null>(null)
  const [copyToast, setCopyToast] = useState<string | null>(null)
  const pressTimer = useRef<number | null>(null)
  const startRef = useRef<{ x: number; y: number } | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const cardRef = useRef<HTMLDivElement | null>(null)
  const copyToastTimerRef = useRef<number | null>(null)

  const displayBodyForCopy = plot.type === 'ai' ? aiSplit.displayBody : plot.content

  const showCopyToast = useCallback((msg: string) => {
    setCopyToast(msg)
    if (copyToastTimerRef.current != null) window.clearTimeout(copyToastTimerRef.current)
    copyToastTimerRef.current = window.setTimeout(() => setCopyToast(null), 1800)
  }, [])

  useEffect(
    () => () => {
      if (copyToastTimerRef.current != null) window.clearTimeout(copyToastTimerRef.current)
    },
    [],
  )

  const handleCopyPlot = useCallback(async () => {
    const text = String(displayBodyForCopy ?? '').trim()
    setCtxOpen(false)
    if (!text) {
      showCopyToast('暂无内容可复制')
      return
    }
    const ok = await copyTextToClipboard(text)
    showCopyToast(ok ? '已复制' : '复制失败，请检查浏览器剪贴板权限')
  }, [displayBodyForCopy, showCopyToast])

  useEffect(() => {
    if (!editing) {
      const b = plot.type === 'ai' ? getAiPlotVersionSlices(plot).body : plot.content
      setDraft(b)
    }
  }, [plot, editing])

  useEffect(() => {
    if (editing) textareaRef.current?.focus()
  }, [editing])

  const clearPress = useCallback(() => {
    if (pressTimer.current != null) {
      window.clearTimeout(pressTimer.current)
      pressTimer.current = null
    }
    startRef.current = null
    setPressing(false)
  }, [])

  const openContextMenu = useCallback(() => {
    const el = cardRef.current
    const rect = el?.getBoundingClientRect()
    const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2
    const y = rect ? rect.bottom + 6 : window.innerHeight / 2
    setCtxPos({ x, y })
    setCtxOpen(true)
  }, [])

  const onPointerDown = (e: React.PointerEvent) => {
    if (editing || isRegenerating || interactionLocked || ctxOpen) return
    if (e.button !== 0) return
    startRef.current = { x: e.clientX, y: e.clientY }
    setPressing(true)
    pressTimer.current = window.setTimeout(() => {
      pressTimer.current = null
      startRef.current = null
      setPressing(false)
      openContextMenu()
    }, LONG_PRESS_MS)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!startRef.current || pressTimer.current == null) return
    const dx = e.clientX - startRef.current.x
    const dy = e.clientY - startRef.current.y
    if (dx * dx + dy * dy > MOVE_CANCEL_PX * MOVE_CANCEL_PX) clearPress()
  }

  const onTouchMoveCancel = (e: React.TouchEvent) => {
    const t = e.touches[0]
    if (!t || !startRef.current || pressTimer.current == null) return
    const dx = t.clientX - startRef.current.x
    const dy = t.clientY - startRef.current.y
    if (dx * dx + dy * dy > MOVE_CANCEL_PX * MOVE_CANCEL_PX) clearPress()
  }

  const endPointer = () => clearPress()

  const commitEdit = () => {
    onSaveBodyEdit(draft.trimEnd())
    setEditing(false)
    setCtxOpen(false)
    // 正文改过后原文键可能对不上旧译文：若已开同步翻译则自动补译
    if (
      plot.type === 'ai' &&
      (currentArchive.dialogueTranslationSyncEnabled || currentArchive.innerOsTranslationSyncEnabled)
    ) {
      window.setTimeout(() => {
        void handleBackfillTranslations()
      }, 0)
    }
  }

  const cancelEdit = () => {
    const b = plot.type === 'ai' ? getAiPlotVersionSlices(plot).body : plot.content
    setDraft(b)
    setEditing(false)
  }

  const bodyChars = countPlotCharsExcludePunctuation(plot.type === 'ai' ? aiSplit.displayBody : plot.content)
  const generationCompact = useMemo(() => formatPlotGenerationTimeCompact(plot), [plot])
  const storyEndTimeLabel = useMemo(
    () => (plot.type === 'ai' ? resolvePlotStoryEndDisplayLabel(plot) : null),
    [plot],
  )

  const albumCharacterId = (timelineExpandCharacterId ?? currentCharacterId)?.trim() ?? ''

  const defaultDimensionLength =
    typeof currentArchive.datingLengthTargetChars === 'number' &&
    Number.isFinite(currentArchive.datingLengthTargetChars)
      ? currentArchive.datingLengthTargetChars
      : 500

  const handleBackfillTranslations = useCallback(async () => {
    if (plot.type !== 'ai' || backfillBusy) return
    setBackfillBusy(true)
    try {
      await backfillPlotTranslations(plot.id)
      showCopyToast('已补全缺失译文')
    } catch (e) {
      showCopyToast(formatApiClientError(e, '补译失败，请稍后重试'))
    } finally {
      setBackfillBusy(false)
    }
  }, [backfillBusy, backfillPlotTranslations, plot.id, plot.type, showCopyToast])

  const openDimensionPanel = useCallback((kind: PlotDimensionKind) => {
    setDimensionError(null)
    setDimensionPanel(kind)
  }, [])

  const handleDimensionGenerate = useCallback(
    async (
      writingGuide: string,
      lengthTargetChars: number,
      languages: import('./types').PlotDimensionLanguageBundle,
    ) => {
      if (!dimensionPanel) return
      setDimensionLoading(true)
      setDimensionError(null)
      try {
        await generatePlotDimension(
          plot.id,
          dimensionPanel,
          writingGuide,
          lengthTargetChars,
          narrativePerspective,
          languages,
        )
      } catch (e) {
        setDimensionError(formatApiClientError(e, '生成失败，请稍后重试'))
      } finally {
        setDimensionLoading(false)
      }
    },
    [dimensionPanel, generatePlotDimension, narrativePerspective, plot.id],
  )

  const versionPager =
    plot.type === 'ai' && versionInfo.hasPager && onVersionChange && !editing && !isRegenerating ? (
      <div className="mt-2 flex items-center justify-center gap-1.5 text-[11px] tabular-nums text-stone-300/95 transition-colors hover:text-stone-400">
        <button
          type="button"
          aria-label="上一版本"
          disabled={versionInfo.index <= 0}
          onClick={(e) => {
            e.stopPropagation()
            onVersionChange(versionInfo.index - 1)
          }}
          className="rounded-md p-1 text-stone-300 transition-colors hover:bg-stone-100/80 hover:text-stone-500 disabled:opacity-25"
        >
          <ChevronLeft className="size-3.5" strokeWidth={1.75} />
        </button>
        <span className="min-w-[2.75rem] text-center font-medium tracking-tight text-stone-400/90">
          {versionInfo.index + 1} / {versionInfo.total}
        </span>
        <button
          type="button"
          aria-label="下一版本"
          disabled={versionInfo.index >= versionInfo.total - 1}
          onClick={(e) => {
            e.stopPropagation()
            onVersionChange(versionInfo.index + 1)
          }}
          className="rounded-md p-1 text-stone-300 transition-colors hover:bg-stone-100/80 hover:text-stone-500 disabled:opacity-25"
        >
          <ChevronRight className="size-3.5" strokeWidth={1.75} />
        </button>
      </div>
    ) : null

  const menuLayer =
    typeof document !== 'undefined'
      ? createPortal(
          <AnimatePresence>
            {ctxOpen ? (
              <>
                <motion.div
                  key="ctx-bg"
                  role="presentation"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[60] bg-stone-900/[0.03]"
                  onClick={() => setCtxOpen(false)}
                />
                <motion.div
                  key="ctx-menu"
                  role="menu"
                  initial={{ opacity: 0, y: 6, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 4, scale: 0.98 }}
                  transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                  style={{
                    position: 'fixed',
                    left: Math.min(window.innerWidth - 168, Math.max(12, ctxPos.x - 84)),
                    top: Math.min(window.innerHeight - 220, ctxPos.y),
                    zIndex: 70,
                  }}
                  className="w-[168px] overflow-hidden rounded-2xl border border-white/70 bg-white/75 py-1 shadow-[0_12px_40px_rgba(0,0,0,0.1)] backdrop-blur-xl"
                >
                  <button
                    type="button"
                    className="flex w-full px-3.5 py-2.5 text-left text-[13px] text-stone-700 transition-colors hover:bg-white/60"
                    onClick={() => {
                      void handleCopyPlot()
                    }}
                  >
                    复制
                  </button>
                  <button
                    type="button"
                    className="flex w-full px-3.5 py-2.5 text-left text-[13px] text-stone-700 transition-colors hover:bg-white/60"
                    onClick={() => {
                      setCtxOpen(false)
                      setEditing(true)
                    }}
                  >
                    编辑内容
                  </button>
                  {canRegenerate && onRegenerate ? (
                    <button
                      type="button"
                      className="flex w-full px-3.5 py-2.5 text-left text-[13px] text-stone-700 transition-colors hover:bg-white/60 disabled:opacity-40"
                      disabled={interactionLocked || isRegenerating}
                      onClick={() => {
                        setCtxOpen(false)
                        onRegenerate()
                      }}
                    >
                      重新回复
                    </button>
                  ) : null}
                  {plot.type === 'ai' &&
                  (currentArchive.dialogueTranslationSyncEnabled ||
                    currentArchive.innerOsTranslationSyncEnabled) ? (
                    <button
                      type="button"
                      className="flex w-full px-3.5 py-2.5 text-left text-[13px] text-stone-700 transition-colors hover:bg-white/60 disabled:opacity-40"
                      disabled={interactionLocked || isRegenerating || backfillBusy}
                      onClick={() => {
                        setCtxOpen(false)
                        void handleBackfillTranslations()
                      }}
                    >
                      {backfillBusy ? '补译中…' : '补全缺失译文'}
                    </button>
                  ) : null}
                  {onDelete ? (
                    <button
                      type="button"
                      className="flex w-full px-3.5 py-2.5 text-left text-[13px] font-medium text-red-600 transition-colors hover:bg-red-50/80"
                      onClick={() => {
                        setCtxOpen(false)
                        if (window.confirm('确定删除这条剧情？')) onDelete()
                      }}
                    >
                      删除
                    </button>
                  ) : null}
                </motion.div>
              </>
            ) : null}
          </AnimatePresence>,
          document.body,
        )
      : null

  const copyToastNode = <WeChatCenterToast message={copyToast} />

  if (plot.type === 'player') {
    return (
      <>
        <motion.div layout className="group relative mb-7" transition={{ type: 'spring', stiffness: 380, damping: 32 }}>
        <motion.div
          ref={cardRef}
          animate={{ scale: pressing && !editing ? 0.98 : 1 }}
          transition={{ type: 'spring', stiffness: 520, damping: 38 }}
          className="relative"
        >
          <AnimatePresence mode="wait">
            {editing ? (
              <motion.div
                key="edit"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 2 }}
                transition={{ duration: 0.2 }}
                className="rounded-[16px] border border-black/[0.08] bg-white p-1 shadow-[0_8px_28px_rgba(16,16,18,0.06)]"
              >
                <textarea
                  ref={textareaRef}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  rows={4}
                  className="w-full resize-y rounded-lg border-0 bg-transparent px-3 py-2.5 text-[16px] leading-[1.8] text-sky-950 outline-none"
                />
                <div className="flex justify-end gap-2 px-2 pb-2">
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="rounded-lg px-2.5 py-1 text-[12px] text-stone-500 hover:bg-stone-100"
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    onClick={commitEdit}
                    className="rounded-lg bg-stone-900 px-2.5 py-1 text-[12px] font-medium text-white hover:bg-stone-800"
                  >
                    保存
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="view"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onTouchMove={onTouchMoveCancel}
                onPointerUp={endPointer}
                onPointerLeave={endPointer}
                onPointerCancel={endPointer}
                onContextMenu={suppressSystemTextUi.onContextMenu}
                style={suppressSystemTextUi.style}
                className={`rounded-[16px] border border-black/[0.06] bg-[#FAFAFA] px-3.5 py-3 text-[16px] leading-[1.8] text-[#1A1A1A] transition-shadow duration-200 ${suppressSystemTextUi.className}`}
              >
                <span className="mr-2 inline-block rounded-full bg-[#111] px-2 py-0.5 text-[11px] font-medium tracking-wide text-white">
                  我
                </span>
                <PlotRichParagraph content={plot.content} />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
        {!editing ? (
          <PlotCardMetaFooter
            generationCompact={generationCompact}
            showLongPressHint
          />
        ) : null}
      </motion.div>
        {menuLayer}
        {copyToastNode}
      </>
    )
  }

  const { thinkingText, displayBody } = aiSplit

  return (
    <>
    <motion.div layout className="group relative mb-7" transition={{ type: 'spring', stiffness: 380, damping: 32 }}>
      <div className="mb-2.5 flex items-start gap-2">
        <div className="min-w-0 flex-1 flex flex-col gap-2">
      {thinkingText ? (
        <details className="rounded-[14px] border border-black/[0.06] bg-white px-3 py-2">
          <summary
            onContextMenu={suppressSystemTextUi.onContextMenu}
            className="cursor-pointer select-none touch-manipulation list-none text-[11px] font-medium tracking-wide text-[#8A8A8E] [-webkit-touch-callout:none] [-webkit-user-select:none] [&::-webkit-details-marker]:hidden"
            style={suppressSystemTextUi.style}
          >
            Lumi 思维链
          </summary>
          <pre
            onContextMenu={suppressSystemTextUi.onContextMenu}
            className="mt-1.5 max-h-[min(40vh,280px)] overflow-y-auto whitespace-pre-wrap break-words border-t border-black/[0.04] pt-1.5 font-sans text-[12px] leading-relaxed text-[#555] select-none [-webkit-touch-callout:none] [-webkit-user-select:none]"
            style={suppressSystemTextUi.style}
          >
            {thinkingText}
          </pre>
        </details>
      ) : null}

      {timelineSnapshotText ? (
        <details className="listen-together-cn-text rounded-[14px] border border-black/[0.06] bg-white px-3 py-2">
          <summary
            onContextMenu={suppressSystemTextUi.onContextMenu}
            className="cursor-pointer select-none touch-manipulation list-none text-[11px] font-medium tracking-wide text-[#8A8A8E] [-webkit-touch-callout:none] [-webkit-user-select:none] [&::-webkit-details-marker]:hidden"
            style={suppressSystemTextUi.style}
          >
            剧情时间轴
          </summary>
          <pre
            onContextMenu={suppressSystemTextUi.onContextMenu}
            className="mt-1.5 max-h-[min(40vh,280px)] overflow-y-auto whitespace-pre-wrap break-words border-t border-black/[0.04] pt-1.5 font-sans text-[12px] leading-relaxed text-[#333] select-none [-webkit-touch-callout:none] [-webkit-user-select:none]"
            style={suppressSystemTextUi.style}
          >
            {timelineSnapshotText}
          </pre>
        </details>
      ) : null}
        </div>
        <div className="flex shrink-0 flex-col gap-1 pt-0.5">
          <PlotDimensionChip
            label="平行事件"
            filled={!!plot.parallelEvent?.content?.trim()}
            onClick={() => openDimensionPanel('parallel')}
          />
          <PlotDimensionChip
            label="IF线"
            filled={!!plot.ifLine?.content?.trim()}
            onClick={() => openDimensionPanel('if')}
          />
        </div>
      </div>

      <PlotDimensionPanel
        open={dimensionPanel === 'parallel'}
        kind="parallel"
        artifact={plot.parallelEvent}
        defaultLengthTarget={defaultDimensionLength}
        defaultLanguages={{
          plotOutputLanguage: currentArchive.plotOutputLanguage,
          dialogueLanguage: currentArchive.dialogueLanguage,
          innerOsLanguage: currentArchive.innerOsLanguage,
        }}
        dialogueTranslationSyncEnabled={currentArchive.dialogueTranslationSyncEnabled === true}
        innerOsTranslationSyncEnabled={currentArchive.innerOsTranslationSyncEnabled === true}
        loading={dimensionLoading}
        error={dimensionError}
        onClose={() => {
          setDimensionPanel(null)
          setDimensionError(null)
        }}
        onGenerate={handleDimensionGenerate}
      />
      <PlotDimensionPanel
        open={dimensionPanel === 'if'}
        kind="if"
        artifact={plot.ifLine}
        defaultLengthTarget={defaultDimensionLength}
        defaultLanguages={{
          plotOutputLanguage: currentArchive.plotOutputLanguage,
          dialogueLanguage: currentArchive.dialogueLanguage,
          innerOsLanguage: currentArchive.innerOsLanguage,
        }}
        dialogueTranslationSyncEnabled={currentArchive.dialogueTranslationSyncEnabled === true}
        innerOsTranslationSyncEnabled={currentArchive.innerOsTranslationSyncEnabled === true}
        loading={dimensionLoading}
        error={dimensionError}
        onClose={() => {
          setDimensionPanel(null)
          setDimensionError(null)
        }}
        onGenerate={handleDimensionGenerate}
      />

      <motion.div
        ref={cardRef}
        animate={{ scale: pressing && !editing && !isRegenerating ? 0.98 : 1 }}
        transition={{ type: 'spring', stiffness: 520, damping: 38 }}
        className="relative"
      >
        <div className="relative">
          <AnimatePresence mode="wait">
            {isRegenerating ? (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <TypewriterShimmer />
              </motion.div>
            ) : editing ? (
              <motion.div
                key="edit"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 2 }}
                transition={{ duration: 0.2 }}
                className="rounded-[16px] border border-black/[0.08] bg-white p-1 shadow-[0_8px_28px_rgba(16,16,18,0.06)]"
              >
                <textarea
                  ref={textareaRef}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  rows={8}
                  className="w-full resize-y rounded-lg border-0 bg-transparent px-3 py-2.5 text-[16px] leading-[1.85] text-stone-900 outline-none"
                />
                <div className="flex justify-end gap-2 px-2 pb-2">
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="rounded-full px-3 py-1 text-[12px] text-[#666] hover:bg-black/[0.04]"
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    onClick={commitEdit}
                    className="rounded-full bg-[#111] px-3 py-1 text-[12px] font-medium text-white hover:opacity-90"
                  >
                    保存
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key={`view-${versionInfo.index}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onTouchMove={onTouchMoveCancel}
                onPointerUp={endPointer}
                onPointerLeave={endPointer}
                onPointerCancel={endPointer}
                onContextMenu={suppressSystemTextUi.onContextMenu}
                style={suppressSystemTextUi.style}
                className={`rounded-[18px] border border-black/[0.05] bg-white px-4 py-4 text-[16px] font-normal leading-[1.85] text-[#262626] shadow-[0_8px_28px_rgba(16,16,18,0.035)] ${suppressSystemTextUi.className}`}
              >
                {plot.type === 'ai' && plot.plotImages?.length ? (
                  <PlotMagazineBody
                    content={displayBody}
                    plotImages={plot.plotImages}
                    characterId={albumCharacterId}
                    plotId={plot.id}
                    dialogueTranslations={plot.dialogueTranslations}
                    innerOsTranslations={plot.innerOsTranslations}
                    onBackfillMissingTranslations={() => void handleBackfillTranslations()}
                    onRegenerateForMissingTranslation={
                      canRegenerate && onRegenerate ? onRegenerate : undefined
                    }
                    backfillBusy={backfillBusy}
                  />
                ) : (
                  <PlotRichParagraph
                    content={displayBody}
                    dialogueTranslations={plot.type === 'ai' ? plot.dialogueTranslations : undefined}
                    innerOsTranslations={plot.type === 'ai' ? plot.innerOsTranslations : undefined}
                    onBackfillMissingTranslations={
                      plot.type === 'ai' ? () => void handleBackfillTranslations() : undefined
                    }
                    onRegenerateForMissingTranslation={
                      plot.type === 'ai' && canRegenerate && onRegenerate ? onRegenerate : undefined
                    }
                    backfillBusy={backfillBusy}
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        {versionPager}
      </motion.div>

      {branchChoices ? (
        <details className="mt-3 rounded-[14px] border border-black/[0.06] bg-white px-3 py-2">
          <summary
            onContextMenu={suppressSystemTextUi.onContextMenu}
            className="cursor-pointer select-none touch-manipulation list-none text-[11px] font-medium tracking-wide text-[#8A8A8E] [-webkit-touch-callout:none] [-webkit-user-select:none] [&::-webkit-details-marker]:hidden"
            style={suppressSystemTextUi.style}
          >
            剧情分支
          </summary>
          <div className="mt-2 max-h-[min(48vh,320px)] space-y-2 overflow-y-auto border-t border-black/[0.04] pt-2 pb-1">
            {branchChoices.loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="animate-pulse rounded-[14px] border border-black/[0.04] bg-black/[0.03] px-4 py-3"
                >
                  <div className="h-3 w-16 rounded bg-black/[0.06]" />
                  <div className="mt-2 h-3 w-full rounded bg-black/[0.05]" />
                  <div className="mt-1.5 h-3 w-[82%] rounded bg-black/[0.04]" />
                </div>
              ))
            ) : (
              branchChoices.options.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => branchChoices.onPick(o)}
                  className="w-full rounded-[14px] border border-black/[0.05] bg-[#FAFAFA] px-4 py-3 text-left transition-colors active:bg-black/[0.03]"
                >
                  {o.styleLabel ? (
                    <span className="mb-1 block text-[10px] font-medium tracking-wide text-[#8A8A8E]">
                      {o.styleLabel}
                    </span>
                  ) : null}
                  <span className="text-[15px] leading-relaxed text-[#1A1A1A]">{o.content}</span>
                </button>
              ))
            )}
          </div>
        </details>
      ) : null}

      {!isRegenerating ? (
        <PlotCardMetaFooter
          bodyChars={bodyChars}
          generationCompact={generationCompact}
          storyEndLabel={storyEndTimeLabel}
          showLongPressHint={!editing}
        />
      ) : null}
    </motion.div>
    {menuLayer}
    {copyToastNode}
    </>
  )
}
