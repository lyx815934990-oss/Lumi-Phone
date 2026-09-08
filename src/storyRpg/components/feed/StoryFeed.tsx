import { useCallback, useEffect, useMemo, useRef } from 'react'
import type { RefObject } from 'react'
import type { DatingStoryDanmakuVisual } from '../../../phone/apps/wechat/dating/datingStoryAppearance'
import { useStoryRpgStore } from '../../store/useStoryRpgStore'
import type { DanmakuBullet, StoryNode, StoryRpgSettings } from '../../types'
import { DanmakuOverlay } from './DanmakuOverlay'
import { StoryNodeCard } from './StoryNodeCard'
import { VNModeLayout } from './VNModeLayout'
import { createDemoDanmaku } from '../../demo/mockData'

type Props = {
  scrollRef?: RefObject<HTMLDivElement | null>
  nodes?: StoryNode[]
  settings?: StoryRpgSettings
  characterName?: string
  characterAvatarUrl?: string
  danmakuBullets?: DanmakuBullet[]
  /** 外观覆盖弹幕颜色 */
  danmakuColorOverride?: string
  /** 弹幕完整外观（字号 / 字体 / 底条 / 发光 / 阴影） */
  danmakuVisual?: DatingStoryDanmakuVisual | null
  commentsExpandedId?: string | null
  setCommentsExpandedId?: (id: string | null) => void
  onHeaderCompact?: (compact: boolean) => void
  onEditStoryTime?: (nodeId: string) => void
  onOpenParallel?: (nodeId: string) => void
  onOpenIfLine?: (nodeId: string) => void
  /** 全量剧情中最后一条 AI 的 id（用于 AI 卡「重新回复」） */
  lastAiPlotId?: string | null
  /**
   * 玩家输入 → 其后紧跟的 AI 剧情 id。
   * 用于用户输入卡「重新回复」：重生该条对应回复。
   */
  playerFollowAiPlotIdByPlayerId?: ReadonlyMap<string, string>
  regeneratingPlotId?: string | null
  interactionLocked?: boolean
  onEditPlot?: (plotId: string) => void
  onRegeneratePlot?: (plotId: string) => void
  onDeletePlot?: (plotId: string) => void
  onPlotVersionChange?: (plotId: string, index: number) => void
}

export function StoryFeed({
  scrollRef,
  nodes: nodesProp,
  settings: settingsProp,
  characterName: characterNameProp,
  characterAvatarUrl: characterAvatarUrlProp,
  danmakuBullets: danmakuProp,
  danmakuColorOverride,
  danmakuVisual,
  commentsExpandedId: commentsExpandedIdProp,
  setCommentsExpandedId: setCommentsExpandedIdProp,
  onHeaderCompact,
  onEditStoryTime,
  onOpenParallel,
  onOpenIfLine,
  lastAiPlotId = null,
  playerFollowAiPlotIdByPlayerId,
  regeneratingPlotId = null,
  interactionLocked = false,
  onEditPlot,
  onRegeneratePlot,
  onDeletePlot,
  onPlotVersionChange,
}: Props) {
  const storeNodes = useStoryRpgStore((s) => s.nodes)
  const storeSettings = useStoryRpgStore((s) => s.settings)
  const storeCharacterName = useStoryRpgStore((s) => s.characterName)
  const storeAvatar = useStoryRpgStore((s) => s.characterAvatarUrl)
  const storeCommentsExpandedId = useStoryRpgStore((s) => s.commentsExpandedId)
  const storeSetCommentsExpandedId = useStoryRpgStore((s) => s.setCommentsExpandedId)
  const storeSetHeaderCompact = useStoryRpgStore((s) => s.setHeaderCompact)

  const nodes = nodesProp ?? storeNodes
  const settings = settingsProp ?? storeSettings
  const characterName = characterNameProp ?? storeCharacterName
  const characterAvatarUrl = characterAvatarUrlProp ?? storeAvatar
  const commentsExpandedId = commentsExpandedIdProp ?? storeCommentsExpandedId
  const setCommentsExpandedId = setCommentsExpandedIdProp ?? storeSetCommentsExpandedId

  const internalRef = useRef<HTMLDivElement>(null)
  const ref = scrollRef ?? internalRef

  const isVn = settings.mode === 'vn'
  const latestAi = [...nodes].reverse().find((n) => n.kind === 'ai')

  const followAiMap = useMemo(
    () => playerFollowAiPlotIdByPlayerId ?? new Map<string, string>(),
    [playerFollowAiPlotIdByPlayerId],
  )

  const onScroll = useCallback(() => {
    const el = ref.current
    if (!el) return
    const compact = el.scrollTop > 48
    onHeaderCompact?.(compact)
    if (!onHeaderCompact) storeSetHeaderCompact(compact)
  }, [onHeaderCompact, ref, storeSetHeaderCompact])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [onScroll, ref])

  useEffect(() => {
    const el = ref.current
    if (!el || nodes.length === 0) return
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [nodes.length, nodes[nodes.length - 1]?.id, ref])

  const danmaku =
    danmakuProp ??
    (settings.danmakuEnabled ? createDemoDanmaku(nodes) : [])

  return (
    <div
      className="relative min-h-0 flex-1 overflow-hidden"
      data-dating-story-coach="sr-feed"
    >
      {settings.danmakuEnabled && danmaku.length ? (
        <DanmakuOverlay
          bullets={danmaku}
          colorOverride={danmakuColorOverride}
          visual={danmakuVisual}
          loop
        />
      ) : null}
      {isVn ? (
        <VNModeLayout
          avatarUrl={characterAvatarUrl}
          characterName={characterName}
          latestAiNode={latestAi}
        />
      ) : null}
      <div
        ref={ref}
        className={`h-full overflow-y-auto overscroll-contain px-3 pt-[calc(var(--sr-header-h)+8px)] ${
          isVn ? 'pointer-events-none opacity-0' : ''
        }`}
        style={{
          paddingBottom:
            'calc(var(--sr-console-h, var(--sr-console-min-h)) + var(--sr-keyboard-inset, 0px) + 28px)',
        }}
      >
        <div className="mx-auto flex max-w-lg flex-col gap-4">
          {nodes.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 py-16 text-center text-[13px] text-white/35">
              暂无剧情，在下方输入开始你们的约会故事
            </div>
          ) : (
            nodes.map((node) => {
              const followAiId =
                node.kind === 'player' ? followAiMap.get(node.id) ?? null : null
              const canRegenerate =
                !!onRegeneratePlot &&
                ((node.kind === 'ai' && node.id === lastAiPlotId) ||
                  (node.kind === 'player' && !!followAiId))
              const regenerateTargetId =
                node.kind === 'player' ? followAiId : node.kind === 'ai' ? node.id : null
              const isRegenerating =
                !!regeneratingPlotId &&
                (regeneratingPlotId === node.id ||
                  (node.kind === 'player' && regeneratingPlotId === followAiId))
              return (
                <StoryNodeCard
                  key={node.id}
                  node={node}
                  showCoT={settings.thinkingChainEnabled}
                  commentModeEnabled={settings.commentModeEnabled}
                  plotArtifactVisualEnabled={settings.plotArtifactVisualEnabled}
                  commentsExpandedId={commentsExpandedId}
                  setCommentsExpandedId={setCommentsExpandedId}
                  onEditStoryTime={onEditStoryTime}
                  onOpenParallel={onOpenParallel}
                  onOpenIfLine={onOpenIfLine}
                  canRegenerate={canRegenerate}
                  isRegenerating={isRegenerating}
                  interactionLocked={interactionLocked}
                  onEdit={onEditPlot ? () => onEditPlot(node.id) : undefined}
                  onRegenerate={
                    canRegenerate && onRegeneratePlot != null && regenerateTargetId
                      ? () => onRegeneratePlot(regenerateTargetId)
                      : undefined
                  }
                  onDelete={onDeletePlot ? () => onDeletePlot(node.id) : undefined}
                  onVersionChange={
                    node.kind === 'ai' && onPlotVersionChange
                      ? (index) => onPlotVersionChange(node.id, index)
                      : undefined
                  }
                />
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
