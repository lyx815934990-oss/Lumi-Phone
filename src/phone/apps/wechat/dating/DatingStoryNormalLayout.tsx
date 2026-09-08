import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { hexAndOpacityToRgba } from '../danmakuResolve'
import type { DanmakuOverlayBullet } from '../DanmakuOverlay'
import { personaDb } from '../newFriendsPersona/idb'
import { MemoryCoachPortal } from '../memory/MemoryCoachPortal'
import { MemoryTutorialModal } from '../memory/MemoryTutorialModal'
import { readMemoryCoachSeen, writeMemoryCoachSeen } from '../memory/memoryCoachTypes'
import { DatingPlotBodyEditSheet } from './DatingPlotBodyEditSheet'
import { DatingPlotDimensionSheet } from './DatingPlotDimensionSheet'
import { DatingPlotStoryTimeSheet } from './DatingPlotStoryTimeSheet'
import type { DatingStoryNormalActions } from './datingStoryNormalActions'
import type { PlotDimensionKind } from './types'
import {
  DATING_STORY_COACH_ROOT_ATTR,
  DATING_STORY_COACH_SCOPE,
  DATING_STORY_COACH_TARGET_ATTR,
  DATING_STORY_LAYOUT_COACH_SEEN_KEY,
  DATING_STORY_LAYOUT_COACH_STEPS,
} from './datingStoryLayoutCoach'
import {
  DATING_ADVANCED_CONTROL_COACH_ROOT_ATTR,
  DATING_ADVANCED_CONTROL_COACH_SCOPE,
  DATING_ADVANCED_CONTROL_COACH_SEEN_KEY,
  DATING_ADVANCED_CONTROL_COACH_STEPS,
  DATING_ADVANCED_CONTROL_COACH_TARGET_ATTR,
} from './datingAdvancedControlCoach'
import { DATING_STORY_LAYOUT_TUTORIAL_SECTIONS } from './datingStoryLayoutTutorialCopy'
import { DATING_ADVANCED_CONTROL_TUTORIAL_SECTIONS } from './datingAdvancedControlTutorialCopy'
import { buildDatingPlayerControlTags } from './datingPlayerControlTags'
import { plotItemsToStoryNodes } from '../../../../storyRpg/adapters/plotToStoryNode'
import { StoryRpgHeader } from '../../../../storyRpg/components/header/StoryRpgHeader'
import { StoryLookSettingsSheet } from '../../../../storyRpg/components/header/StoryLookSettingsSheet'
import { StoryFeed } from '../../../../storyRpg/components/feed/StoryFeed'
import { DirectorConsole } from '../../../../storyRpg/components/console/DirectorConsole'
import { AdvancedControlSheet } from '../../../../storyRpg/components/console/AdvancedControlSheet'
import { StoryFloorDrawer, StoryFloorRailButton } from '../../../../storyRpg/components/navigation/StoryFloorDrawer'
import type { DanmakuBullet, DirectorActionId, StoryRpgSettings } from '../../../../storyRpg/types'
import { buildStoryRpgThemeStyle } from '../../../../storyRpg/theme/storyRpgThemeBridge'
import { buildStoryFloorEntries, countAiFloors } from '../../../../storyRpg/utils/storyFloorEntries'
import {
  buildTimelineRowBodyMapFromRows,
  buildTimelineRowTitleMapFromRows,
} from './plotSummaryTitle'
import { buildDatingPlotFontCssVars } from './datingPlotFontSettings'
import { normalizeDatingStoryAppearance, resolveDatingStoryDanmakuVisual } from './datingStoryAppearance'
import '../../../../storyRpg/theme/storyRpgTheme.css'

type Props = {
  actions: DatingStoryNormalActions
  danmakuBullets?: DanmakuOverlayBullet[]
}

function overlayBulletsToSr(bullets: DanmakuOverlayBullet[]): DanmakuBullet[] {
  return bullets.map((b, i) => ({
    id: b.id,
    text: b.text,
    top: typeof b.topPct === 'number' ? b.topPct : 8 + (b.track % 5) * 16,
    durationSec: Math.max(6, b.durationSec || 10),
    hue: 38 + (i % 8) * 28,
    color: b.colorRgba,
    startDelaySec: b.startDelaySec,
  }))
}

export function DatingStoryNormalLayout({ actions, danmakuBullets = [] }: Props) {
  const feedScrollRef = actions.feedScrollRef
  const [headerCompact, setHeaderCompact] = useState(false)
  const [commentsExpandedId, setCommentsExpandedId] = useState<string | null>(null)
  const [advancedSheetOpen, setAdvancedSheetOpen] = useState(false)
  const [lookSheetOpen, setLookSheetOpen] = useState(false)
  const [tutorialOpen, setTutorialOpen] = useState(false)
  const [controlTutorialOpen, setControlTutorialOpen] = useState(false)
  const [coachOpen, setCoachOpen] = useState(false)
  const [coachStepIndex, setCoachStepIndex] = useState(0)
  const [controlCoachOpen, setControlCoachOpen] = useState(false)
  const [controlCoachStepIndex, setControlCoachStepIndex] = useState(0)
  const autoCoachStartedRef = useRef(false)
  const autoControlCoachStartedRef = useRef(false)
  const [storyTimePlotId, setStoryTimePlotId] = useState<string | null>(null)
  const [editBodyPlotId, setEditBodyPlotId] = useState<string | null>(null)
  const [dimensionTarget, setDimensionTarget] = useState<{
    plotId: string
    kind: PlotDimensionKind
  } | null>(null)
  const [dimensionBusy, setDimensionBusy] = useState(false)
  const [floorDrawerOpen, setFloorDrawerOpen] = useState(false)
  const [timelineRowTitles, setTimelineRowTitles] = useState<Map<string, string>>(() => new Map())
  const [timelineRowBodies, setTimelineRowBodies] = useState<Map<string, string>>(() => new Map())

  const startLiveCoach = useCallback(() => {
    setTutorialOpen(false)
    setControlTutorialOpen(false)
    setControlCoachOpen(false)
    setAdvancedSheetOpen(false)
    setLookSheetOpen(false)
    setCoachStepIndex(0)
    setCoachOpen(true)
  }, [])

  const finishCoach = useCallback((opts?: { openTutorial?: boolean }) => {
    writeMemoryCoachSeen(DATING_STORY_LAYOUT_COACH_SEEN_KEY)
    setCoachOpen(false)
    setCoachStepIndex(0)
    if (opts?.openTutorial) setTutorialOpen(true)
  }, [])

  const startControlCoach = useCallback(() => {
    setControlTutorialOpen(false)
    setCoachOpen(false)
    setLookSheetOpen(false)
    setAdvancedSheetOpen(true)
    setControlCoachStepIndex(0)
    // 等场控面板动画起来再高亮，避免测不到目标
    window.setTimeout(() => setControlCoachOpen(true), 280)
  }, [])

  const finishControlCoach = useCallback((opts?: { openTutorial?: boolean }) => {
    writeMemoryCoachSeen(DATING_ADVANCED_CONTROL_COACH_SEEN_KEY)
    setControlCoachOpen(false)
    setControlCoachStepIndex(0)
    if (opts?.openTutorial) setControlTutorialOpen(true)
  }, [])

  useEffect(() => {
    if (autoCoachStartedRef.current) return
    if (readMemoryCoachSeen(DATING_STORY_LAYOUT_COACH_SEEN_KEY)) return
    autoCoachStartedRef.current = true
    writeMemoryCoachSeen(DATING_STORY_LAYOUT_COACH_SEEN_KEY)
    const id = window.setTimeout(() => startLiveCoach(), 640)
    return () => window.clearTimeout(id)
  }, [startLiveCoach])

  useEffect(() => {
    if (!advancedSheetOpen) return
    if (autoControlCoachStartedRef.current) return
    if (readMemoryCoachSeen(DATING_ADVANCED_CONTROL_COACH_SEEN_KEY)) return
    autoControlCoachStartedRef.current = true
    writeMemoryCoachSeen(DATING_ADVANCED_CONTROL_COACH_SEEN_KEY)
    const id = window.setTimeout(() => startControlCoach(), 520)
    return () => window.clearTimeout(id)
  }, [advancedSheetOpen, startControlCoach])

  const { currentArchive, currentCharacter, plots, plotTailVisible } = actions
  const lastPlotId = plots[plots.length - 1]?.id

  useEffect(() => {
    const cid = currentCharacter?.id?.trim()
    if (!cid) {
      setTimelineRowTitles(new Map())
      setTimelineRowBodies(new Map())
      return
    }
    let cancelled = false
    void (async () => {
      try {
        const rows = await personaDb.listStoryTimelinePlotRowsByCharacterId(cid)
        if (cancelled) return
        // 与记忆管理页一致：展示前展开 {{char}}/{{user}}/{{id:…}}，入库仍保留占位符
        const expandedRows = await Promise.all(
          rows.map(async (row) => {
            const rowText = await personaDb.expandStoryTimelineTextForDisplay(cid, row.rowText)
            const titleRaw = String(row.rowTitle ?? '').trim()
            const rowTitle =
              titleRaw && titleRaw.includes('{{')
                ? await personaDb.expandStoryTimelineTextForDisplay(cid, titleRaw)
                : titleRaw || undefined
            return {
              ...row,
              rowText,
              ...(rowTitle ? { rowTitle } : {}),
            }
          }),
        )
        if (cancelled) return
        setTimelineRowTitles(buildTimelineRowTitleMapFromRows(expandedRows))
        setTimelineRowBodies(buildTimelineRowBodyMapFromRows(expandedRows))
      } catch {
        if (!cancelled) {
          setTimelineRowTitles(new Map())
          setTimelineRowBodies(new Map())
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [currentCharacter?.id, plots.length, lastPlotId])

  const summaryTitleOpts = useMemo(
    () => ({ timelineRowTitles, timelineRowBodies }),
    [timelineRowTitles, timelineRowBodies],
  )

  const visiblePlots = useMemo(() => {
    const tail = Math.max(1, plotTailVisible)
    if (plots.length <= tail) return plots
    return plots.slice(-tail)
  }, [plots, plotTailVisible])

  const baseNodes = useMemo(
    () => plotItemsToStoryNodes(visiblePlots, summaryTitleOpts),
    [visiblePlots, summaryTitleOpts],
  )

  const [nodes, setNodes] = useState(baseNodes)

  useEffect(() => {
    setNodes(baseNodes)
    const cid = currentCharacter?.id?.trim()
    if (!cid) return
    const needsExpand = baseNodes.some(
      (n) => n.summary?.includes('{{') || n.summaryBody?.includes('{{'),
    )
    if (!needsExpand) return
    let cancelled = false
    void (async () => {
      const next = await Promise.all(
        baseNodes.map(async (n) => {
          if (n.kind !== 'ai') return n
          let summary = n.summary
          let summaryBody = n.summaryBody
          if (summary?.includes('{{')) {
            summary =
              (await personaDb.expandStoryTimelineTextForDisplay(cid, summary)).trim() || summary
          }
          if (summaryBody?.includes('{{')) {
            summaryBody =
              (await personaDb.expandStoryTimelineTextForDisplay(cid, summaryBody)).trim() ||
              summaryBody
          }
          if (summary === n.summary && summaryBody === n.summaryBody) return n
          return { ...n, summary, summaryBody }
        }),
      )
      if (!cancelled) setNodes(next)
    })()
    return () => {
      cancelled = true
    }
  }, [baseNodes, currentCharacter?.id])

  const settings: StoryRpgSettings = useMemo(
    () => ({
      mode: currentArchive.modePreference,
      danmakuEnabled: !!currentArchive.offlineDanmakuEnabled,
      thinkingChainEnabled: actions.thinkingChainEnabled,
      autoUserReaction: currentArchive.godPerspective ? false : actions.autoUserReaction,
      commentModeEnabled: currentArchive.commentModeEnabled !== false,
      plotArtifactVisualEnabled: currentArchive.plotArtifactVisualEnabled !== false,
      plotArtifactVisualPresetId: currentArchive.plotArtifactVisualPresetId?.trim() || 'random',
      perspective: actions.perspective,
      lengthTargetChars: Number(actions.lengthTargetChars) || 500,
      heartWhisperMode: false,
      translateEnabled:
        !!actions.languageSettingsValue.dialogueTranslationSyncEnabled ||
        !!actions.languageSettingsValue.innerOsTranslationSyncEnabled,
      outputLanguage: actions.languageSettingsValue.plotOutputLanguage || 'zh-CN',
    }),
    [
      actions.autoUserReaction,
      actions.languageSettingsValue.dialogueTranslationSyncEnabled,
      actions.languageSettingsValue.innerOsTranslationSyncEnabled,
      actions.languageSettingsValue.plotOutputLanguage,
      actions.perspective,
      actions.thinkingChainEnabled,
      actions.lengthTargetChars,
      currentArchive.commentModeEnabled,
      currentArchive.godPerspective,
      currentArchive.plotArtifactVisualEnabled,
      currentArchive.plotArtifactVisualPresetId,
      currentArchive.modePreference,
      currentArchive.offlineDanmakuEnabled,
    ],
  )

  const activeDirectorActions = useMemo(
    (): Partial<Record<DirectorActionId, boolean>> => ({
      god: !!currentArchive.godPerspective,
      director: !!currentArchive.directorMode,
      side: !!currentArchive.mainCharacterOffstage,
      parallel: !!currentArchive.generateParallelOnSend,
      'if-line': !!currentArchive.generateIfLineOnSend,
    }),
    [
      currentArchive.directorMode,
      currentArchive.generateIfLineOnSend,
      currentArchive.generateParallelOnSend,
      currentArchive.godPerspective,
      currentArchive.mainCharacterOffstage,
    ],
  )

  const pendingControlTags = useMemo(
    () =>
      buildDatingPlayerControlTags({
        perspective: actions.perspective,
        lengthTargetChars: Number(actions.lengthTargetChars) || 500,
        godPerspective: !!currentArchive.godPerspective,
        mainCharacterOffstage: !!currentArchive.mainCharacterOffstage,
        directorMode: !!currentArchive.directorMode,
        autoUserReaction: currentArchive.godPerspective ? false : !!actions.autoUserReaction,
        generateParallelOnSend: !!currentArchive.generateParallelOnSend,
        generateIfLineOnSend: !!currentArchive.generateIfLineOnSend,
        commentModeEnabled: currentArchive.commentModeEnabled !== false,
        plotArtifactVisualEnabled: currentArchive.plotArtifactVisualEnabled !== false,
        thinkingChainEnabled: actions.thinkingChainEnabled !== false,
        offlineDanmakuEnabled: !!currentArchive.offlineDanmakuEnabled,
      }),
    [
      actions.autoUserReaction,
      actions.lengthTargetChars,
      actions.perspective,
      actions.thinkingChainEnabled,
      currentArchive.commentModeEnabled,
      currentArchive.directorMode,
      currentArchive.generateIfLineOnSend,
      currentArchive.generateParallelOnSend,
      currentArchive.godPerspective,
      currentArchive.mainCharacterOffstage,
      currentArchive.offlineDanmakuEnabled,
      currentArchive.plotArtifactVisualEnabled,
    ],
  )

  const patchSettings = useCallback(
    (patch: Partial<StoryRpgSettings>) => {
      if (patch.mode !== undefined) actions.setMode(patch.mode)
      if (patch.danmakuEnabled !== undefined) actions.setOfflineDanmakuEnabled(patch.danmakuEnabled)
      if (patch.thinkingChainEnabled !== undefined && patch.thinkingChainEnabled !== actions.thinkingChainEnabled) {
        actions.toggleThinkingChain()
      }
      if (patch.autoUserReaction !== undefined) {
        // 上帝视角下禁止打开抢话
        if (!(patch.autoUserReaction && currentArchive.godPerspective)) {
          actions.setAutoUserReaction(patch.autoUserReaction)
        }
      }
      if (patch.commentModeEnabled !== undefined) actions.setCommentModeEnabled(patch.commentModeEnabled)
      if (patch.plotArtifactVisualEnabled !== undefined) {
        actions.setPlotArtifactVisualEnabled(patch.plotArtifactVisualEnabled)
      }
      if (patch.plotArtifactVisualPresetId !== undefined) {
        actions.setPlotArtifactVisualPresetId(patch.plotArtifactVisualPresetId)
      }
      if (patch.perspective !== undefined) actions.setPerspective(patch.perspective)
      if (patch.lengthTargetChars !== undefined) {
        // 必须把新值传入：setState 后立刻无参 persist 会读到闭包旧值，退出场控又变回 500
        actions.blurPersistLengthTarget(patch.lengthTargetChars)
      }
      if (patch.translateEnabled !== undefined) {
        actions.patchDatingLanguageSettings({
          dialogueTranslationSyncEnabled: patch.translateEnabled,
          innerOsTranslationSyncEnabled: patch.translateEnabled,
        })
      }
    },
    [actions, currentArchive.godPerspective],
  )

  const handleDirectorAction = useCallback(
    (id: DirectorActionId) => {
      switch (id) {
        case 'god': {
          const next = !currentArchive.godPerspective
          actions.setGodPerspective(next)
          if (next) {
            actions.setMainCharacterOffstage(false)
            actions.setDirectorMode(false)
            actions.setAutoUserReaction(false)
          }
          break
        }
        case 'director':
          actions.setDirectorMode(!currentArchive.directorMode)
          break
        case 'side': {
          const next = !currentArchive.mainCharacterOffstage
          actions.setMainCharacterOffstage(next)
          if (next) actions.setGodPerspective(false)
          break
        }
        case 'parallel':
          actions.setGenerateParallelOnSend(!currentArchive.generateParallelOnSend)
          break
        case 'if-line':
          actions.setGenerateIfLineOnSend(!currentArchive.generateIfLineOnSend)
          break
        case 'continue':
          actions.openContinueProbe('normal')
          break
        case 'npc':
          actions.inputRef.current?.focus()
          break
      }
    },
    [actions, currentArchive],
  )

  const floorEntries = useMemo(
    () => buildStoryFloorEntries(actions.plots, summaryTitleOpts),
    [actions.plots, summaryTitleOpts],
  )
  const totalAiFloors = useMemo(() => countAiFloors(actions.plots), [actions.plots])

  const scrollToPlot = useCallback((plotId: string) => {
    const el = document.getElementById(`dating-plot-${plotId}`)
    const container = feedScrollRef.current
    if (!el) return false
    if (container) {
      const containerRect = container.getBoundingClientRect()
      const elRect = el.getBoundingClientRect()
      const targetTop = container.scrollTop + (elRect.top - containerRect.top) - 8
      container.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' })
    } else {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
    return true
  }, [feedScrollRef])

  const handleJumpToPlot = useCallback(
    (plotId: string) => {
      const idx = actions.plots.findIndex((p) => p.id === plotId)
      if (idx >= 0) {
        const needTail = actions.plots.length - idx
        if (needTail > actions.plotTailVisible) {
          actions.persistPlotTail(needTail)
        }
      }
      setFloorDrawerOpen(false)
      const tryScroll = (attempt = 0) => {
        if (scrollToPlot(plotId)) return
        if (attempt < 12) {
          requestAnimationFrame(() => tryScroll(attempt + 1))
        } else {
          actions.jumpToPlot(plotId)
        }
      }
      requestAnimationFrame(() => tryScroll())
    },
    [actions, scrollToPlot],
  )

  const handleEditStoryTime = useCallback((plotId: string) => {
    setStoryTimePlotId(plotId)
  }, [])

  const handleEditPlotBody = useCallback((plotId: string) => {
    setEditBodyPlotId(plotId)
  }, [])

  const handleOpenParallel = useCallback((plotId: string) => {
    setDimensionTarget({ plotId, kind: 'parallel' })
  }, [])

  const handleOpenIfLine = useCallback((plotId: string) => {
    setDimensionTarget({ plotId, kind: 'if' })
  }, [])

  const storyTimePlot = useMemo(
    () => (storyTimePlotId ? actions.plots.find((p) => p.id === storyTimePlotId) ?? null : null),
    [actions.plots, storyTimePlotId],
  )

  const editBodyPlot = useMemo(
    () => (editBodyPlotId ? actions.plots.find((p) => p.id === editBodyPlotId) ?? null : null),
    [actions.plots, editBodyPlotId],
  )

  const dimensionPlot = useMemo(
    () =>
      dimensionTarget
        ? actions.plots.find((p) => p.id === dimensionTarget.plotId) ?? null
        : null,
    [actions.plots, dimensionTarget],
  )

  const handleSaveStoryTime = useCallback(
    async (plotId: string, fields: Parameters<typeof actions.updatePlotStoryTime>[1]) => {
      const result = await actions.updatePlotStoryTime(plotId, fields)
      if (result.ok === false) return { ok: false as const, reason: result.reason }
      return { ok: true as const }
    },
    [actions],
  )

  const handleSavePlotBody = useCallback(
    async (plotId: string, draftBody: string) => {
      const result = await actions.saveEditedPlotBody(plotId, draftBody)
      if (result.ok === false) return { ok: false as const, reason: result.reason }
      return { ok: true as const }
    },
    [actions],
  )

  const handlePlotVersionChange = useCallback(
    (plotId: string, index: number) => {
      actions.setPlotVersionIndex(plotId, index)
    },
    [actions],
  )

  const handleGenerateDimension = useCallback(
    async (params: { writingGuide: string; lengthTargetChars: number }) => {
      if (!dimensionTarget) return
      setDimensionBusy(true)
      try {
        await actions.generatePlotDimension(
          dimensionTarget.plotId,
          dimensionTarget.kind,
          params.writingGuide,
          params.lengthTargetChars,
          actions.perspective,
        )
      } finally {
        setDimensionBusy(false)
      }
    },
    [actions, dimensionTarget],
  )

  const srDanmaku = useMemo(
    () => (settings.danmakuEnabled ? overlayBulletsToSr(danmakuBullets) : []),
    [danmakuBullets, settings.danmakuEnabled],
  )

  const storyAppearance = useMemo(
    () => normalizeDatingStoryAppearance(actions.storyAppearance),
    [actions.storyAppearance],
  )

  const danmakuColorOverride = useMemo(() => {
    const hex = storyAppearance.danmakuColor?.trim() || '#FFFFFF'
    const op = typeof storyAppearance.danmakuOpacity === 'number' ? storyAppearance.danmakuOpacity : 0.92
    return hexAndOpacityToRgba(hex, op)
  }, [storyAppearance.danmakuColor, storyAppearance.danmakuOpacity])

  const danmakuVisual = useMemo(
    () => resolveDatingStoryDanmakuVisual(storyAppearance),
    [storyAppearance],
  )

  const themeStyle = useMemo(() => buildStoryRpgThemeStyle(storyAppearance), [storyAppearance])
  const plotFontCssVars = useMemo(
    () => buildDatingPlotFontCssVars(actions.plotFontSettings, actions.plotFontDataUrls),
    [actions.plotFontSettings, actions.plotFontDataUrls],
  )
  const lastAiPlotId = useMemo(() => {
    for (let i = actions.plots.length - 1; i >= 0; i--) {
      if (actions.plots[i]?.type === 'ai') return actions.plots[i]!.id
    }
    return null
  }, [actions.plots])

  const playerFollowAiPlotIdByPlayerId = useMemo(() => {
    const map = new Map<string, string>()
    const list = actions.plots
    for (let i = 0; i < list.length - 1; i++) {
      const cur = list[i]
      const next = list[i + 1]
      if (cur?.type === 'player' && next?.type === 'ai') {
        map.set(cur.id, next.id)
      }
    }
    return map
  }, [actions.plots])

  /** 仅锁「重新回复 / 删除 / 编辑」写操作；长按与复制仍可用 */
  const interactionLocked = actions.loading || !!actions.regeneratingPlotId
  const rootStyle = useMemo(
    (): CSSProperties => ({
      ...themeStyle,
      ...plotFontCssVars,
      ['--sr-keyboard-inset' as string]: `${Math.max(0, actions.keyboardPadPx || 0)}px`,
    }),
    [themeStyle, plotFontCssVars, actions.keyboardPadPx],
  )

  return (
    <div
      className="story-rpg-root relative flex h-full min-h-0 flex-col overflow-hidden"
      data-mode={settings.mode}
      data-day-night={storyAppearance.dayNight}
      data-palette={storyAppearance.paletteId}
      data-header-compact={headerCompact ? 'true' : 'false'}
      data-dating-story-layout-root
      data-dating-story-actions-ready="true"
      {...{ [DATING_STORY_COACH_ROOT_ATTR]: DATING_STORY_COACH_SCOPE }}
      style={rootStyle}
    >
      <StoryRpgHeader
        characterName={currentCharacter.realName?.trim() || '角色'}
        characterAvatarUrl={actions.displayAvatarUrl}
        headerCompact={headerCompact}
        appearance={storyAppearance}
        mode={settings.mode}
        onModeChange={(mode) => patchSettings({ mode })}
        onBack={actions.onBackToSelect}
        onResetProgress={() => actions.setResetArchiveConfirmOpen(true)}
        onWorldBook={() => actions.setArchiveWbSheetOpen(true)}
        onOpenLook={() => setLookSheetOpen(true)}
        onOpenTutorial={() => setTutorialOpen(true)}
        lookOpen={lookSheetOpen}
        viewportOffsetTop={actions.viewportOffsetTop}
      />
      <StoryFeed
        scrollRef={feedScrollRef}
        nodes={nodes}
        settings={settings}
        characterName={currentCharacter.realName?.trim() || '角色'}
        characterAvatarUrl={actions.displayAvatarUrl}
        danmakuBullets={srDanmaku}
        danmakuColorOverride={danmakuColorOverride}
        danmakuVisual={danmakuVisual}
        commentsExpandedId={commentsExpandedId}
        setCommentsExpandedId={setCommentsExpandedId}
        onHeaderCompact={setHeaderCompact}
        onEditStoryTime={handleEditStoryTime}
        onOpenParallel={handleOpenParallel}
        onOpenIfLine={handleOpenIfLine}
        lastAiPlotId={lastAiPlotId}
        playerFollowAiPlotIdByPlayerId={playerFollowAiPlotIdByPlayerId}
        regeneratingPlotId={actions.regeneratingPlotId}
        interactionLocked={interactionLocked}
        onEditPlot={handleEditPlotBody}
        onRegeneratePlot={actions.openRetryBiasPanel}
        onDeletePlot={actions.deletePlotItem}
        onPlotVersionChange={handlePlotVersionChange}
      />
      <StoryFloorRailButton onClick={() => setFloorDrawerOpen(true)} />
      <DirectorConsole
        loading={actions.loading}
        onSend={() => void actions.onSend()}
        composerRef={actions.composerRef}
        composer={{
          value: actions.input,
          onChange: actions.setInput,
          inputRef: actions.inputRef,
          onKeyDown: actions.onInputKeyDown,
          onFocus: actions.onInputFocus,
          insertQuotePair: actions.insertQuotePair,
          placeholder: actions.placeholder,
        }}
        keyboardInsetPx={actions.keyboardInsetPx}
        activeDirectorActions={activeDirectorActions}
        onDirectorAction={handleDirectorAction}
        onOpenAdvanced={() => setAdvancedSheetOpen(true)}
        onHeartWhisper={() => actions.setHeartWhisperOpen(true)}
        pendingControlTags={pendingControlTags}
      />
      <AdvancedControlSheet
        open={advancedSheetOpen}
        onOpenChange={setAdvancedSheetOpen}
        settings={settings}
        patchSettings={patchSettings}
        godPerspective={!!currentArchive.godPerspective}
        plotPace={actions.plotPace}
        onPlotPacePatch={actions.setPlotPaceSettings}
        languageSettings={actions.languageSettingsValue}
        onLanguagePatch={actions.patchDatingLanguageSettings}
        themeStyle={themeStyle}
        onOpenControlTutorial={() => setControlTutorialOpen(true)}
        onStartControlCoach={startControlCoach}
      />
      <StoryLookSettingsSheet
        open={lookSheetOpen}
        onOpenChange={setLookSheetOpen}
        characterId={currentCharacter.id}
        appearance={storyAppearance}
        onPatchAppearance={actions.patchStoryAppearance}
        plotFontSettings={actions.plotFontSettings}
        plotFontDataUrls={actions.plotFontDataUrls}
        onPlotFontChange={actions.patchDatingPlotFontSettings}
        onPlotFontDataUrlChange={actions.setPlotFontDataUrls}
        onStyleSaved={actions.setStyleTuning}
        themeStyle={themeStyle}
      />
      <StoryFloorDrawer
        open={floorDrawerOpen}
        onOpenChange={setFloorDrawerOpen}
        entries={floorEntries}
        totalAiFloors={totalAiFloors}
        visibleTailCount={plotTailVisible}
        onJump={handleJumpToPlot}
        onAdjustTail={actions.persistPlotTail}
        themeStyle={themeStyle}
      />
      <DatingPlotStoryTimeSheet
        open={!!storyTimePlotId}
        onOpenChange={(open) => {
          if (!open) setStoryTimePlotId(null)
        }}
        plot={storyTimePlot}
        onSave={handleSaveStoryTime}
        themeStyle={themeStyle}
      />
      <DatingPlotBodyEditSheet
        open={!!editBodyPlotId}
        onOpenChange={(open) => {
          if (!open) setEditBodyPlotId(null)
        }}
        plot={editBodyPlot}
        onSave={handleSavePlotBody}
        themeStyle={themeStyle}
      />
      <DatingPlotDimensionSheet
        open={!!dimensionTarget}
        onOpenChange={(open) => {
          if (!open) setDimensionTarget(null)
        }}
        plot={dimensionPlot}
        kind={dimensionTarget?.kind ?? 'parallel'}
        perspective={actions.perspective}
        defaultLengthTarget={Number(actions.lengthTargetChars) || 500}
        onGenerate={handleGenerateDimension}
        busy={dimensionBusy || actions.loading}
        themeStyle={themeStyle}
      />
      <MemoryTutorialModal
        open={tutorialOpen}
        onClose={() => setTutorialOpen(false)}
        title="剧情页 · 说明"
        subtitle="平行 · IF · 续写方向 · 人脉 · 场控入口"
        sections={DATING_STORY_LAYOUT_TUTORIAL_SECTIONS}
        onStartLiveCoach={startLiveCoach}
        zIndex={64000}
      />
      <MemoryTutorialModal
        open={controlTutorialOpen}
        onClose={() => setControlTutorialOpen(false)}
        title="场控中心 · 说明"
        subtitle="人称 · 字数 · 推进 · 开关 · 语言"
        sections={DATING_ADVANCED_CONTROL_TUTORIAL_SECTIONS}
        onStartLiveCoach={startControlCoach}
        zIndex={64500}
      />
      <MemoryCoachPortal
        open={coachOpen}
        steps={DATING_STORY_LAYOUT_COACH_STEPS}
        stepIndex={coachStepIndex}
        onStepChange={setCoachStepIndex}
        onSkip={() => finishCoach()}
        onComplete={finishCoach}
        scopeRoot={DATING_STORY_COACH_SCOPE}
        coachTargetAttr={DATING_STORY_COACH_TARGET_ATTR}
        coachRootAttr={DATING_STORY_COACH_ROOT_ATTR}
        zIndex={64100}
      />
      <MemoryCoachPortal
        open={controlCoachOpen}
        steps={DATING_ADVANCED_CONTROL_COACH_STEPS}
        stepIndex={controlCoachStepIndex}
        onStepChange={setControlCoachStepIndex}
        onSkip={() => finishControlCoach()}
        onComplete={finishControlCoach}
        scopeRoot={DATING_ADVANCED_CONTROL_COACH_SCOPE}
        coachTargetAttr={DATING_ADVANCED_CONTROL_COACH_TARGET_ATTR}
        coachRootAttr={DATING_ADVANCED_CONTROL_COACH_ROOT_ATTR}
        zIndex={64600}
      />
    </div>
  )
}
