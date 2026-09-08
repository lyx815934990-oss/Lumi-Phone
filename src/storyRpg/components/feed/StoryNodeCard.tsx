import { motion } from 'framer-motion'
import { ChevronDown, ChevronLeft, ChevronRight, Clock3, Copy, Pencil, RotateCcw, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, type HTMLAttributes, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useWeChatLongPress } from '../../../phone/apps/wechat/hooks/useWeChatLongPress'
import { WeChatCenterToast } from '../../../phone/apps/wechat/WeChatCenterToast'
import { copyTextToClipboard } from '../../../phone/utils/copyToClipboard'
import type { StoryNode } from '../../types'
import { countWordsExcludingPunct } from '../../utils/wordCount'
import { renderStoryPlotContent } from '../../utils/storyPlotRichText'
import { GlassPanel } from '../ui/GlassPanel'
import { CotAccordion } from './CotAccordion'
import { InlineCommentsPanel } from './InlineCommentsPanel'
import { PlotHtmlVisualAccordion } from './PlotHtmlVisualAccordion'
import { StoryPlotContextMenu, type StoryPlotContextMenuItem } from './StoryPlotContextMenu'
import { splitPlotBodyIntoReaderCommentSegments, stripReaderCommentAnchors } from '../../../phone/apps/wechat/dating/datingReaderComments'

function clearDomSelectionSafe() {
  try {
    window.getSelection()?.removeAllRanges()
  } catch {
    /* ignore */
  }
}

type Props = {
  node: StoryNode
  showCoT: boolean
  commentModeEnabled: boolean
  commentsExpandedId?: string | null
  setCommentsExpandedId?: (id: string | null) => void
  plotArtifactVisualEnabled?: boolean
  onEditStoryTime?: (nodeId: string) => void
  onOpenParallel?: (nodeId: string) => void
  onOpenIfLine?: (nodeId: string) => void
  /** 长按 / 底栏：复制 · 编辑 · 重新回复 · 删除 */
  canRegenerate?: boolean
  isRegenerating?: boolean
  interactionLocked?: boolean
  onEdit?: () => void
  onRegenerate?: () => void
  onDelete?: () => void
  onVersionChange?: (index: number) => void
}

const spring = { type: 'spring' as const, stiffness: 400, damping: 32 }

function SideDimensionChip({
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
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      onPointerDown={(e) => e.stopPropagation()}
      className={`rounded-full border px-2.5 py-1 text-[10px] font-medium leading-none tracking-wide transition ${
        active
          ? 'border-[var(--sr-gold)] bg-[var(--sr-gold)] text-[var(--sr-gold-on)] shadow-sm'
          : 'border-[var(--sr-border)] bg-[var(--sr-panel-elevated)] text-[var(--sr-text-soft)] hover:border-[var(--sr-gold)]/35 hover:text-[var(--sr-text)]'
      }`}
    >
      {label}
      {active ? (
        <span className="ml-1 inline-block size-1 rounded-full bg-[var(--sr-gold-on)]/80 align-middle" aria-hidden />
      ) : null}
    </button>
  )
}

function EditStoryTimeChip({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label="编辑剧情发生时间"
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      onPointerDown={(e) => e.stopPropagation()}
      className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[var(--sr-border)] bg-[var(--sr-panel)] px-2.5 py-1 text-[10px] font-medium leading-none tracking-wide text-[var(--sr-text-soft)] shadow-sm transition hover:border-[var(--sr-gold)]/35 hover:text-[var(--sr-text)]"
    >
      <Clock3 className="size-3 opacity-80" strokeWidth={1.75} aria-hidden />
      改时间
    </button>
  )
}

function CardActionIcon({
  label,
  icon,
  danger,
  disabled,
  onClick,
}: {
  label: string
  icon: ReactNode
  danger?: boolean
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      onPointerDown={(e) => e.stopPropagation()}
      className={`inline-flex size-8 items-center justify-center rounded-full border transition disabled:opacity-40 ${
        danger
          ? 'border-[var(--ds-danger,#c06b6b)]/30 bg-[var(--sr-panel-elevated)] text-[var(--ds-danger,#c06b6b)] hover:bg-[var(--ds-danger,#c06b6b)]/10'
          : 'border-[var(--sr-border)] bg-[var(--sr-panel-elevated)] text-[var(--sr-text-soft)] hover:border-[var(--sr-gold)]/35 hover:text-[var(--sr-text)]'
      }`}
    >
      {icon}
    </button>
  )
}

function readThemeVars(): Record<string, string> {
  if (typeof document === 'undefined') return {}
  const root = document.querySelector('.story-rpg-root') as HTMLElement | null
  if (!root) return {}
  const cs = getComputedStyle(root)
  const keys = [
    '--sr-panel-elevated',
    '--sr-panel',
    '--sr-border',
    '--sr-text',
    '--sr-text-muted',
    '--sr-text-soft',
    '--sr-gold',
    '--sr-gold-on',
    '--ds-danger',
    '--sr-font-serif',
  ] as const
  const out: Record<string, string> = {}
  for (const k of keys) {
    const v = cs.getPropertyValue(k).trim()
    if (v) out[k] = v
  }
  return out
}

export function StoryNodeCard({
  node,
  showCoT,
  commentModeEnabled,
  plotArtifactVisualEnabled = true,
  commentsExpandedId,
  setCommentsExpandedId,
  onEditStoryTime,
  onOpenParallel,
  onOpenIfLine,
  canRegenerate = false,
  isRegenerating = false,
  interactionLocked = false,
  onEdit,
  onRegenerate,
  onDelete,
  onVersionChange,
}: Props) {
  const [cotOpen, setCotOpen] = useState(false)
  const [htmlVisualOpen, setHtmlVisualOpen] = useState(false)
  const [summaryOpen, setSummaryOpen] = useState(false)
  const [localCommentsOpen, setLocalCommentsOpen] = useState(false)
  const [ctxOpen, setCtxOpen] = useState(false)
  const [ctxPos, setCtxPos] = useState({ x: 0, y: 0 })
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [copyToast, setCopyToast] = useState<string | null>(null)
  const cardRef = useRef<HTMLDivElement | null>(null)
  const copyToastTimerRef = useRef<number | null>(null)

  const wordCount = countWordsExcludingPunct(stripReaderCommentAnchors(node.content))
  const isPlayer = node.kind === 'player'
  const comments = node.comments ?? []
  const hasComments = comments.length > 0
  const highlightComment = node.isHighlight || comments.some((c) => c.highlight)
  const summaryText = node.summary?.trim() ?? ''
  const summaryBody = node.summaryBody?.trim() ?? ''
  const storyTimeText = node.storyTimeLabel?.trim() ?? ''
  const showPlotMeta =
    !isPlayer &&
    (!!summaryText || !!summaryBody || !!storyTimeText || !!onEditStoryTime || !!onOpenParallel || !!onOpenIfLine)

  const bodySegments = useMemo(() => {
    const plotComments =
      commentModeEnabled && !isPlayer
        ? comments.map((c) => ({
            id: c.id,
            nick: c.nick,
            text: c.text,
            likes: c.likes,
            highlight: c.highlight,
            hue: c.avatarHue,
            slot: c.slot,
          }))
        : []
    return splitPlotBodyIntoReaderCommentSegments(node.content, plotComments, plotComments.length > 0)
  }, [commentModeEnabled, comments, isPlayer, node.content])

  const plainBodyText = useMemo(
    () =>
      bodySegments
        .filter((s): s is { type: 'text'; text: string } => s.type === 'text')
        .map((s) => s.text)
        .join('\n\n')
        .trim(),
    [bodySegments],
  )

  const commentsOpen =
    setCommentsExpandedId !== undefined
      ? commentsExpandedId === node.id
      : localCommentsOpen

  const toggleComments = () => {
    if (setCommentsExpandedId) {
      setCommentsExpandedId(commentsOpen ? null : node.id)
    } else {
      setLocalCommentsOpen((v) => !v)
    }
  }

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

  const openContextMenuAt = useCallback((clientX?: number, clientY?: number) => {
    clearDomSelectionSafe()
    const el = cardRef.current
    const rect = el?.getBoundingClientRect()
    setCtxPos({
      x: typeof clientX === 'number' ? clientX : rect ? rect.left + rect.width / 2 : window.innerWidth / 2,
      y: typeof clientY === 'number' ? clientY : rect ? rect.top + Math.min(48, rect.height * 0.22) : window.innerHeight / 2,
    })
    setCtxOpen(true)
  }, [])

  // 滚动列表里勿因 pointerleave / 全局 loading 禁用长按
  const longPressEnabled = !isRegenerating && !ctxOpen && !deleteConfirmOpen
  const { bind, pressing } = useWeChatLongPress({
    enabled: longPressEnabled,
    ms: 450,
    moveThresholdPx: 16,
    onLongPress: (e) => openContextMenuAt(e.clientX, e.clientY),
  })

  // 原生 selectstart / dragstart 不在 React 合成事件里；用 DOM 监听挡系统框选
  useEffect(() => {
    const el = cardRef.current
    if (!el) return
    const block = (e: Event) => {
      e.preventDefault()
    }
    const onSelectionChange = () => {
      if (!pressing && !ctxOpen) return
      try {
        window.getSelection()?.removeAllRanges()
      } catch {
        /* ignore */
      }
    }
    el.addEventListener('selectstart', block)
    el.addEventListener('dragstart', block)
    document.addEventListener('selectionchange', onSelectionChange)
    return () => {
      el.removeEventListener('selectstart', block)
      el.removeEventListener('dragstart', block)
      document.removeEventListener('selectionchange', onSelectionChange)
    }
  }, [node.id, pressing, ctxOpen])

  const handleCopy = useCallback(async () => {
    const text = plainBodyText
    if (!text) {
      showCopyToast('暂无内容可复制')
      return
    }
    const ok = await copyTextToClipboard(text)
    showCopyToast(ok ? '已复制' : '复制失败，请检查浏览器剪贴板权限')
  }, [plainBodyText, showCopyToast])

  const requestDelete = useCallback(() => {
    if (!onDelete || interactionLocked || isRegenerating) return
    setCtxOpen(false)
    setDeleteConfirmOpen(true)
  }, [interactionLocked, isRegenerating, onDelete])

  const confirmDelete = useCallback(() => {
    setDeleteConfirmOpen(false)
    onDelete?.()
  }, [onDelete])

  const versionCount = Math.max(0, node.versionCount ?? 0)
  const currentVersionIndex = Math.max(
    0,
    Math.min(versionCount > 0 ? versionCount - 1 : 0, node.currentVersionIndex ?? 0),
  )
  const showVersionSwitcher = !isPlayer && versionCount > 1 && !!onVersionChange

  const menuItems = useMemo((): StoryPlotContextMenuItem[] => {
    const items: StoryPlotContextMenuItem[] = [
      {
        id: 'copy',
        label: '复制',
        onSelect: () => {
          void handleCopy()
        },
      },
    ]
    if (onEdit) {
      items.push({
        id: 'edit',
        label: '编辑',
        disabled: interactionLocked || isRegenerating,
        onSelect: onEdit,
      })
    }
    if (canRegenerate && onRegenerate) {
      items.push({
        id: 'regenerate',
        label: '重新回复',
        disabled: interactionLocked || isRegenerating,
        onSelect: onRegenerate,
      })
    }
    if (onDelete) {
      items.push({
        id: 'delete',
        label: '删除',
        danger: true,
        disabled: interactionLocked || isRegenerating,
        onSelect: requestDelete,
      })
    }
    return items
  }, [
    canRegenerate,
    handleCopy,
    interactionLocked,
    isRegenerating,
    onDelete,
    onEdit,
    onRegenerate,
    requestDelete,
  ])

  const themeVars = deleteConfirmOpen ? readThemeVars() : {}

  return (
    <>
      <div
        ref={cardRef}
        className="relative touch-manipulation select-none transition-transform duration-150 ease-out"
        style={{
          transform: pressing ? 'scale(0.985)' : 'scale(1)',
          WebkitTouchCallout: 'none',
          WebkitUserSelect: 'none',
          userSelect: 'none',
          MozUserSelect: 'none',
          msUserSelect: 'none',
        }}
        data-no-native-select="1"
        onPointerDown={bind.onPointerDown}
        onPointerMove={bind.onPointerMove}
        onPointerUp={bind.onPointerUp}
        onPointerCancel={bind.onPointerCancel}
        // 不绑 onPointerLeave：滚动列表里极易误触发导致长按永远不着火
        onDragStart={bind.onDragStart}
        // React 类型未收录 selectstart，运行时仍生效
        {...({ onSelectStart: bind.onSelectStart } as HTMLAttributes<HTMLDivElement>)}
        onContextMenu={(e) => {
          e.preventDefault()
          clearDomSelectionSafe()
          if (!longPressEnabled) return
          openContextMenuAt(e.clientX, e.clientY)
        }}
      >
        <GlassPanel
          highlight={node.isHighlight}
          className={`scroll-mt-[calc(var(--sr-header-h)+8px)] p-4 ${isPlayer ? 'border-[var(--sr-gold-dim)]/20 bg-[var(--sr-gold)]/[0.04]' : ''} ${isRegenerating ? 'opacity-70' : ''}`}
          id={`dating-plot-${node.id}`}
        >
          {isPlayer && node.activeControlTags && node.activeControlTags.length > 0 ? (
            <div className="mb-2.5 flex flex-wrap items-center gap-1.5" aria-label="当轮场控">
              {node.activeControlTags.map((tag) => (
                <span
                  key={tag.id}
                  className="inline-flex items-center rounded-full border border-[var(--sr-gold)]/35 bg-[var(--sr-gold)]/12 px-2 py-0.5 text-[10px] font-medium leading-none tracking-wide text-[var(--sr-text)]"
                >
                  {tag.label}
                </span>
              ))}
            </div>
          ) : null}

          {!showPlotMeta ? null : (
            <div className="mb-3 flex items-start gap-2">
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                {summaryText || summaryBody ? (
                  <div className="overflow-hidden rounded-[14px] border border-[var(--sr-border)] bg-[var(--sr-panel-elevated)]">
                    <div className="flex items-start justify-between gap-2 px-3.5 pt-3 pb-2">
                      {summaryText ? (
                        <h3 className="min-w-0 flex-1 font-[family-name:var(--sr-font-serif)] text-[17px] font-semibold leading-snug tracking-tight text-[var(--sr-text)]">
                          {summaryText}
                        </h3>
                      ) : (
                        <span className="min-w-0 flex-1 text-[12px] text-[var(--sr-text-muted)]">本段摘要</span>
                      )}
                      <span className="shrink-0 pt-1 font-mono text-[10px] leading-none text-[var(--sr-text-muted)]">
                        {wordCount} W
                      </span>
                    </div>
                    {summaryBody ? (
                      <>
                        <button
                          type="button"
                          aria-expanded={summaryOpen}
                          onClick={(e) => {
                            e.stopPropagation()
                            setSummaryOpen((v) => !v)
                          }}
                          onPointerDown={(e) => e.stopPropagation()}
                          className="flex w-full items-center gap-2 border-t border-[var(--sr-border)]/70 px-3.5 py-2 text-left transition hover:bg-[var(--sr-panel)]/40"
                        >
                          <span className="min-w-0 flex-1 text-[10px] font-medium tracking-wide text-[var(--sr-text-faint)]">
                            {summaryOpen ? '点击收起' : '点击展开完整摘要'}
                          </span>
                          <ChevronDown
                            className={`size-3.5 shrink-0 text-[var(--sr-text-muted)] transition-transform duration-200 ${
                              summaryOpen ? 'rotate-180' : ''
                            }`}
                            strokeWidth={2}
                            aria-hidden
                          />
                        </button>
                        <motion.div
                          initial={false}
                          animate={{ height: summaryOpen ? 'auto' : 0, opacity: summaryOpen ? 1 : 0 }}
                          transition={spring}
                          className="overflow-hidden"
                        >
                          <div className="border-t border-[var(--sr-border)]/50 bg-[var(--sr-panel)]/35 px-3.5 py-3">
                            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--sr-text-faint)]">
                              摘要正文
                            </p>
                            <div className="max-h-[min(50vh,360px)] overflow-y-auto whitespace-pre-wrap break-words font-[family-name:var(--sr-font-serif)] text-[13px] leading-relaxed text-[var(--sr-text-soft)]">
                              {summaryBody}
                            </div>
                          </div>
                        </motion.div>
                      </>
                    ) : null}
                  </div>
                ) : null}

                <div className="flex items-center justify-between gap-2 rounded-[14px] border border-[var(--sr-border)] bg-[var(--sr-panel-elevated)] px-3 py-2">
                  <span className="inline-flex min-w-0 items-center gap-1.5 text-[11px] font-medium tracking-wide text-[var(--sr-text-muted)]">
                    <span className="size-1 shrink-0 rounded-full bg-[var(--sr-text-faint)]" aria-hidden />
                    {storyTimeText ? (
                      <span className="truncate text-[var(--sr-text)]">{storyTimeText}</span>
                    ) : (
                      '剧情时间轴'
                    )}
                  </span>
                  <div className="flex shrink-0 items-center gap-2">
                    {!summaryText && !summaryBody ? (
                      <span className="font-mono text-[10px] leading-none text-[var(--sr-text-muted)]">
                        {wordCount} W
                      </span>
                    ) : null}
                    {onEditStoryTime ? <EditStoryTimeChip onClick={() => onEditStoryTime(node.id)} /> : null}
                  </div>
                </div>
              </div>

              {onOpenParallel || onOpenIfLine ? (
                <div className="flex shrink-0 flex-col gap-1 pt-0.5">
                  {onOpenParallel ? (
                    <SideDimensionChip
                      label="平行事件"
                      active={node.hasParallelEvent}
                      onClick={() => onOpenParallel(node.id)}
                    />
                  ) : null}
                  {onOpenIfLine ? (
                    <SideDimensionChip
                      label="IF线"
                      active={node.hasIfLine}
                      onClick={() => onOpenIfLine(node.id)}
                    />
                  ) : null}
                </div>
              ) : null}
            </div>
          )}

          {showCoT && node.chainOfThought ? (
            <CotAccordion
              open={cotOpen}
              onToggle={() => setCotOpen((v) => !v)}
              content={node.chainOfThought}
            />
          ) : null}

          {bodySegments.map((seg, i) => {
            if (seg.type === 'text') {
              return (
                <div key={`t-${i}`} className="sr-prose">
                  {renderStoryPlotContent(seg.text)}
                </div>
              )
            }
            // 章内穿插：直接展示该锚点对应评论（只点评此处之前剧情）
            return (
              <InlineCommentsPanel
                key={`c-${seg.slot}-${i}`}
                comments={seg.comments.map((c) => ({
                  id: c.id,
                  nick: c.nick,
                  avatarHue: c.hue,
                  text: c.text,
                  likes: c.likes,
                  highlight: c.highlight,
                  slot: c.slot,
                }))}
                variant="inline"
              />
            )
          })}

          {/* 兼容：无锚点切分失败时仍可底部展开全部批注 */}
          {commentModeEnabled && !isPlayer && hasComments && bodySegments.every((s) => s.type === 'text') ? (
            <div className="my-4">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  toggleComments()
                }}
                onPointerDown={(e) => e.stopPropagation()}
                className="group flex w-full items-center gap-3 py-2 text-left transition"
              >
                <span
                  className={`h-px flex-1 ${highlightComment ? 'bg-[var(--sr-gold)]/35' : 'bg-[var(--sr-border)]'}`}
                  aria-hidden
                />
                <span className="inline-flex shrink-0 items-center gap-1.5 text-[10px] tracking-[0.2em] text-[var(--sr-text-muted)] transition group-hover:text-[var(--sr-text)]">
                  <span className={highlightComment ? 'text-[var(--sr-gold)]' : ''}>读者批注</span>
                  <span className="font-mono tracking-normal text-[var(--sr-text-faint)]">
                    {comments.length}
                  </span>
                  <span className="text-[var(--sr-text-faint)]">{commentsOpen ? '收起' : '展开'}</span>
                </span>
                <span
                  className={`h-px flex-1 ${highlightComment ? 'bg-[var(--sr-gold)]/35' : 'bg-[var(--sr-border)]'}`}
                  aria-hidden
                />
              </button>
              <motion.div
                initial={false}
                animate={{ height: commentsOpen ? 'auto' : 0, opacity: commentsOpen ? 1 : 0 }}
                transition={spring}
                className="overflow-hidden"
              >
                {commentsOpen ? (
                  <div className="px-0.5 pb-1">
                    <InlineCommentsPanel comments={comments} />
                  </div>
                ) : null}
              </motion.div>
            </div>
          ) : null}

          {commentModeEnabled && !isPlayer && !hasComments ? (
            <div className="mt-3 rounded-xl border border-dashed border-[var(--sr-border)] bg-[var(--sr-panel-elevated)]/60 px-3.5 py-2.5">
              <p className="text-[12px] font-medium tracking-wide text-[var(--sr-text-muted)]">
                读者评论 · 待生成
              </p>
              <p className="mt-0.5 text-[10px] leading-snug text-[var(--sr-text-faint)]">
                评论会穿插在正文讨论位。若仍为空，请对本段点「重新回复」。
              </p>
            </div>
          ) : null}

          {plotArtifactVisualEnabled && !isPlayer ? (
            <PlotHtmlVisualAccordion
              open={htmlVisualOpen}
              onToggle={() => setHtmlVisualOpen((v) => !v)}
              visual={node.htmlVisual}
              pendingHint={!node.htmlVisual?.html?.trim()}
            />
          ) : null}

          {node.images?.length ? (
            <div className="mt-3 grid grid-cols-2 gap-2">
              {node.images.map((img) => (
                <figure key={img.id} className="overflow-hidden rounded-xl border border-[var(--sr-border)]">
                  <img src={img.url} alt={img.alt ?? ''} className="aspect-[4/3] w-full object-cover" />
                  {img.caption ? (
                    <figcaption className="px-2 py-1 text-[10px] text-[var(--sr-text-faint)]">
                      {img.caption}
                    </figcaption>
                  ) : null}
                </figure>
              ))}
            </div>
          ) : null}

          <div className="mt-3 flex items-end justify-between gap-2">
            {showVersionSwitcher ? (
              <div className="inline-flex min-w-0 items-center gap-1 rounded-full border border-[var(--sr-border)] bg-[var(--sr-panel-elevated)] px-1 py-0.5">
                <button
                  type="button"
                  aria-label="上一版"
                  title="上一版"
                  disabled={interactionLocked || isRegenerating || currentVersionIndex <= 0}
                  onClick={(e) => {
                    e.stopPropagation()
                    onVersionChange?.(currentVersionIndex - 1)
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="inline-flex size-7 items-center justify-center rounded-full text-[var(--sr-text-soft)] transition hover:text-[var(--sr-text)] disabled:opacity-35"
                >
                  <ChevronLeft className="size-3.5" strokeWidth={1.75} aria-hidden />
                </button>
                <span className="min-w-[3.25rem] text-center font-mono text-[10px] tabular-nums text-[var(--sr-text-muted)]">
                  {currentVersionIndex + 1}/{versionCount}
                </span>
                <button
                  type="button"
                  aria-label="下一版"
                  title="下一版"
                  disabled={
                    interactionLocked || isRegenerating || currentVersionIndex >= versionCount - 1
                  }
                  onClick={(e) => {
                    e.stopPropagation()
                    onVersionChange?.(currentVersionIndex + 1)
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="inline-flex size-7 items-center justify-center rounded-full text-[var(--sr-text-soft)] transition hover:text-[var(--sr-text)] disabled:opacity-35"
                >
                  <ChevronRight className="size-3.5" strokeWidth={1.75} aria-hidden />
                </button>
              </div>
            ) : (
              <span />
            )}
            <div className="flex shrink-0 items-center justify-end gap-1.5">
              <CardActionIcon
                label="复制"
                icon={<Copy className="size-3.5" strokeWidth={1.75} aria-hidden />}
                onClick={() => {
                  void handleCopy()
                }}
              />
              {onEdit ? (
                <CardActionIcon
                  label="编辑"
                  icon={<Pencil className="size-3.5" strokeWidth={1.75} aria-hidden />}
                  disabled={interactionLocked || isRegenerating}
                  onClick={onEdit}
                />
              ) : null}
              {canRegenerate && onRegenerate ? (
                <CardActionIcon
                  label="重新回复"
                  icon={<RotateCcw className="size-3.5" strokeWidth={1.75} aria-hidden />}
                  disabled={interactionLocked || isRegenerating}
                  onClick={onRegenerate}
                />
              ) : null}
              {onDelete ? (
                <CardActionIcon
                  label="删除"
                  icon={<Trash2 className="size-3.5" strokeWidth={1.75} aria-hidden />}
                  danger
                  disabled={interactionLocked || isRegenerating}
                  onClick={requestDelete}
                />
              ) : null}
            </div>
          </div>

          {isRegenerating ? (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-[var(--sr-bg)]/35 backdrop-blur-[1px]">
              <p className="rounded-full border border-[var(--sr-border)] bg-[var(--sr-panel-elevated)] px-3 py-1.5 text-[12px] text-[var(--sr-text-soft)]">
                正在重新生成…
              </p>
            </div>
          ) : null}
        </GlassPanel>
      </div>

      <StoryPlotContextMenu
        open={ctxOpen}
        x={ctxPos.x}
        y={ctxPos.y}
        items={menuItems}
        onClose={() => setCtxOpen(false)}
      />

      {typeof document !== 'undefined'
        ? createPortal(<WeChatCenterToast message={copyToast} />, document.body)
        : null}

      {typeof document !== 'undefined' && deleteConfirmOpen
        ? createPortal(
            <div
              className="fixed inset-0 z-[300] flex items-center justify-center px-4"
              style={{ background: 'rgba(0,0,0,0.32)' }}
              onClick={() => setDeleteConfirmOpen(false)}
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby={`delete-plot-${node.id}`}
                className="w-full max-w-[360px] rounded-2xl border p-4 shadow-[0_16px_48px_rgba(0,0,0,0.18)]"
                style={{
                  ...themeVars,
                  minHeight: 'auto',
                  height: 'auto',
                  background: 'var(--sr-panel-elevated, #f7f1f4)',
                  color: 'var(--sr-text, #5f5f5f)',
                  borderColor: 'var(--sr-border, rgba(95,95,95,0.12))',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <p
                  id={`delete-plot-${node.id}`}
                  className="text-center text-[16px] font-semibold tracking-wide"
                  style={{ fontFamily: 'var(--sr-font-serif, inherit)' }}
                >
                  删除这条剧情？
                </p>
                <p className="mt-2 text-center text-[12px] leading-relaxed text-[var(--sr-text-muted,#8e8e8e)]">
                  将删除本条内容，并同步清理对应剧情摘要。此操作不可撤销。
                </p>
                <div className="mt-4 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    className="rounded-full border border-[var(--sr-border)] bg-[var(--sr-panel)] px-4 py-2 text-[13px] text-[var(--sr-text-soft)]"
                    onClick={() => setDeleteConfirmOpen(false)}
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    className="rounded-full px-4 py-2 text-[13px] font-medium text-white"
                    style={{ background: 'var(--ds-danger, #c06b6b)' }}
                    onClick={confirmDelete}
                  >
                    确认删除
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  )
}
