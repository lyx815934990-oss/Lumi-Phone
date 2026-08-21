import {
  formatStoryTimelineDeltaForDisplay,
  upsertStoryTimelineCalendarAnchorInRowText,
  type StoryTimelineSummaryDelta,
} from '../memory/storyTimelineTypes'
import {
  normalizeDualNarrativeStoryFields,
  type DualNarrativeStoryFields,
} from '../memory/dualNarrativeTime'
import type { PlotDialogueTranslation, PlotItem } from './types'

/** 取 AI 剧情用于多版本存储/展示的正文与思维链（与 `StoryBlock` / `splitDatingAssistantOutput` 一致） */
export function getAiPlotVersionSlices(plot: PlotItem): {
  body: string
  logicPass?: string
  timelineSnapshot?: string
  timelineDelta?: StoryTimelineSummaryDelta
  dialogueTranslations?: PlotDialogueTranslation[]
  innerOsTranslations?: PlotDialogueTranslation[]
} {
  if (plot.type !== 'ai') return { body: plot.content }
  const {
    versions,
    versionLogicPasses,
    versionTimelineSnapshots,
    versionTimelineDeltas,
    versionDialogueTranslations,
    versionInnerOsTranslations,
    currentVersionIndex,
  } = getAiVersionArrays(plot)
  const i = Math.max(0, Math.min(versions.length - 1, currentVersionIndex))
  return {
    body: versions[i] ?? plot.content,
    logicPass: versionLogicPasses[i] ?? plot.logicPass,
    timelineSnapshot: versionTimelineSnapshots[i] ?? plot.timelineSnapshot,
    timelineDelta: versionTimelineDeltas[i] ?? plot.timelineDelta,
    dialogueTranslations: versionDialogueTranslations[i] ?? plot.dialogueTranslations,
    innerOsTranslations: versionInnerOsTranslations[i] ?? plot.innerOsTranslations,
  }
}

export function getAiVersionArrays(plot: PlotItem): {
  versions: string[]
  versionLogicPasses: (string | undefined)[]
  versionTimelineSnapshots: (string | undefined)[]
  versionTimelineDeltas: (StoryTimelineSummaryDelta | undefined)[]
  versionDialogueTranslations: (PlotDialogueTranslation[] | undefined)[]
  versionInnerOsTranslations: (PlotDialogueTranslation[] | undefined)[]
  currentVersionIndex: number
} {
  const versions = plot.versions?.length ? [...plot.versions] : [plot.content]
  const versionLogicPasses = plot.versionLogicPasses?.length
    ? [...plot.versionLogicPasses]
    : [plot.logicPass]
  const versionTimelineSnapshots = plot.versionTimelineSnapshots?.length
    ? [...plot.versionTimelineSnapshots]
    : [plot.timelineSnapshot]
  const versionTimelineDeltas = plot.versionTimelineDeltas?.length
    ? [...plot.versionTimelineDeltas]
    : [plot.timelineDelta]
  const versionDialogueTranslations = plot.versionDialogueTranslations?.length
    ? [...plot.versionDialogueTranslations]
    : [plot.dialogueTranslations]
  const versionInnerOsTranslations = plot.versionInnerOsTranslations?.length
    ? [...plot.versionInnerOsTranslations]
    : [plot.innerOsTranslations]
  while (versionLogicPasses.length < versions.length) versionLogicPasses.push(undefined)
  while (versionTimelineSnapshots.length < versions.length) versionTimelineSnapshots.push(undefined)
  while (versionTimelineDeltas.length < versions.length) versionTimelineDeltas.push(undefined)
  while (versionDialogueTranslations.length < versions.length) versionDialogueTranslations.push(undefined)
  while (versionInnerOsTranslations.length < versions.length) versionInnerOsTranslations.push(undefined)
  const currentVersionIndex =
    typeof plot.currentVersionIndex === 'number' && Number.isFinite(plot.currentVersionIndex)
      ? Math.max(0, Math.min(versions.length - 1, plot.currentVersionIndex))
      : versions.length - 1
  return {
    versions,
    versionLogicPasses,
    versionTimelineSnapshots,
    versionTimelineDeltas,
    versionDialogueTranslations,
    versionInnerOsTranslations,
    currentVersionIndex,
  }
}

/** 新建 AI 条时写入的首版结构（与 `PlotItem` 合并为完整对象） */
export function initialAiPlotVersions(
  content: string,
  logicPass?: string,
  planSummary?: string,
  timelineSnapshot?: string,
  timelineDelta?: StoryTimelineSummaryDelta,
  dialogueTranslations?: PlotDialogueTranslation[],
  innerOsTranslations?: PlotDialogueTranslation[],
): Pick<
  PlotItem,
  | 'content'
  | 'logicPass'
  | 'planSummary'
  | 'versions'
  | 'versionLogicPasses'
  | 'versionTimelineSnapshots'
  | 'versionTimelineDeltas'
  | 'versionDialogueTranslations'
  | 'dialogueTranslations'
  | 'versionInnerOsTranslations'
  | 'innerOsTranslations'
  | 'timelineSnapshot'
  | 'timelineDelta'
  | 'currentVersionIndex'
> {
  const snap = timelineSnapshot?.trim() || undefined
  const delta = timelineDelta && Object.keys(timelineDelta).length ? timelineDelta : undefined
  const tr = dialogueTranslations?.length ? dialogueTranslations : undefined
  const osTr = innerOsTranslations?.length ? innerOsTranslations : undefined
  return {
    content,
    logicPass,
    planSummary,
    versions: [content],
    versionLogicPasses: [logicPass],
    versionTimelineSnapshots: [snap],
    versionTimelineDeltas: [delta],
    versionDialogueTranslations: [tr],
    dialogueTranslations: tr,
    versionInnerOsTranslations: [osTr],
    innerOsTranslations: osTr,
    timelineSnapshot: snap,
    timelineDelta: delta,
    currentVersionIndex: 0,
  }
}

/** 重新生成：追加新版本并指向最新 */
export function appendAiRegenerateVersion(
  prev: PlotItem,
  newContent: string,
  newLogicPass?: string,
  newPlanSummary?: string,
  newTimelineSnapshot?: string,
  newTimelineDelta?: StoryTimelineSummaryDelta,
  newDialogueTranslations?: PlotDialogueTranslation[],
  newInnerOsTranslations?: PlotDialogueTranslation[],
): PlotItem {
  const {
    versions,
    versionLogicPasses,
    versionTimelineSnapshots,
    versionTimelineDeltas,
    versionDialogueTranslations,
    versionInnerOsTranslations,
  } = getAiVersionArrays(prev)
  const nextVs = [...versions, newContent]
  const nextLp = [...versionLogicPasses, newLogicPass]
  const nextTs = [...versionTimelineSnapshots, newTimelineSnapshot?.trim() || undefined]
  const nextTd = [...versionTimelineDeltas, newTimelineDelta]
  const nextTr = [
    ...versionDialogueTranslations,
    newDialogueTranslations?.length ? newDialogueTranslations : undefined,
  ]
  const nextOsTr = [
    ...versionInnerOsTranslations,
    newInnerOsTranslations?.length ? newInnerOsTranslations : undefined,
  ]
  while (nextLp.length < nextVs.length) nextLp.push(undefined)
  while (nextTs.length < nextVs.length) nextTs.push(undefined)
  while (nextTd.length < nextVs.length) nextTd.push(undefined)
  while (nextTr.length < nextVs.length) nextTr.push(undefined)
  while (nextOsTr.length < nextVs.length) nextOsTr.push(undefined)
  const snap = nextTs[nextTs.length - 1]
  const delta = nextTd[nextTd.length - 1]
  const tr = nextTr[nextTr.length - 1]
  const osTr = nextOsTr[nextOsTr.length - 1]
  return {
    ...prev,
    content: newContent,
    logicPass: newLogicPass,
    planSummary: newPlanSummary,
    versions: nextVs,
    versionLogicPasses: nextLp,
    versionTimelineSnapshots: nextTs,
    versionTimelineDeltas: nextTd,
    versionDialogueTranslations: nextTr,
    dialogueTranslations: tr,
    versionInnerOsTranslations: nextOsTr,
    innerOsTranslations: osTr,
    timelineSnapshot: snap,
    timelineDelta: delta,
    currentVersionIndex: nextVs.length - 1,
    timestamp: Date.now(),
  }
}

/** 切换当前展示版本，并同步顶层 content / logicPass / timelineSnapshot */
export function plotWithVersionIndex(plot: PlotItem, index: number): PlotItem {
  if (plot.type !== 'ai') return plot
  const {
    versions,
    versionLogicPasses,
    versionTimelineSnapshots,
    versionTimelineDeltas,
    versionDialogueTranslations,
    versionInnerOsTranslations,
  } = getAiVersionArrays(plot)
  const i = Math.max(0, Math.min(versions.length - 1, index))
  return {
    ...plot,
    content: versions[i]!,
    logicPass: versionLogicPasses[i],
    timelineSnapshot: versionTimelineSnapshots[i],
    timelineDelta: versionTimelineDeltas[i],
    dialogueTranslations: versionDialogueTranslations[i],
    innerOsTranslations: versionInnerOsTranslations[i],
    versions,
    versionLogicPasses,
    versionTimelineSnapshots,
    versionTimelineDeltas,
    versionDialogueTranslations,
    versionInnerOsTranslations,
    currentVersionIndex: i,
  }
}

/** 保存编辑：改写当前版本的故事内公历时刻（timelineDelta / snapshot / 顶层 story*） */
export function plotWithEditedStoryTime(
  plot: PlotItem,
  fields: DualNarrativeStoryFields,
): PlotItem {
  if (plot.type !== 'ai') return plot
  const norm = normalizeDualNarrativeStoryFields(fields)
  const calendarLabel = norm.storyTimeLabel?.trim() || ''
  if (!calendarLabel) return plot

  const {
    versions,
    versionLogicPasses,
    versionTimelineSnapshots,
    versionTimelineDeltas,
    versionDialogueTranslations,
    versionInnerOsTranslations,
    currentVersionIndex,
  } = getAiVersionArrays(plot)
  const i = currentVersionIndex
  const nextTd = [...versionTimelineDeltas]
  const nextTs = [...versionTimelineSnapshots]
  while (nextTd.length < versions.length) nextTd.push(undefined)
  while (nextTs.length < versions.length) nextTs.push(undefined)

  const prevDelta = nextTd[i] ?? plot.timelineDelta ?? {}
  const nextDelta: StoryTimelineSummaryDelta = {
    ...prevDelta,
    story_day: norm.storyDay?.trim() || undefined,
    story_time: norm.storyTime?.trim() || undefined,
    ...(norm.editMode === 'range'
      ? {
          story_day_end: (norm.storyDayEnd || norm.storyDay)?.trim() || undefined,
          story_time_end: (norm.storyTimeEnd || norm.storyTime)?.trim() || undefined,
        }
      : {
          story_day_end: undefined,
          story_time_end: undefined,
        }),
  }
  nextTd[i] = nextDelta

  const prevSnap = (nextTs[i] ?? plot.timelineSnapshot ?? '').trim()
  const nextSnap = prevSnap
    ? upsertStoryTimelineCalendarAnchorInRowText(prevSnap, calendarLabel)
    : formatStoryTimelineDeltaForDisplay(nextDelta, { recordedAtMs: plot.timestamp })
  nextTs[i] = nextSnap.trim() || undefined

  const endDay = (nextDelta.story_day_end || nextDelta.story_day)?.trim()
  const endTime = (nextDelta.story_time_end || nextDelta.story_time)?.trim()

  return {
    ...plot,
    storyDay: endDay || undefined,
    storyTime: endTime || undefined,
    storyTimeLabel: calendarLabel,
    timelineDelta: nextDelta,
    timelineSnapshot: nextTs[i],
    versions,
    versionLogicPasses,
    versionTimelineSnapshots: nextTs,
    versionTimelineDeltas: nextTd,
    versionDialogueTranslations,
    versionInnerOsTranslations,
    dialogueTranslations: versionDialogueTranslations[i],
    innerOsTranslations: versionInnerOsTranslations[i],
    currentVersionIndex: i,
  }
}

/** 保存编辑：改写当前版本正文（各版本正文与 `versionLogicPasses` 平行存储） */
export function plotWithEditedCurrentVersion(plot: PlotItem, draftBody: string): PlotItem {
  if (plot.type !== 'ai') return { ...plot, content: draftBody.trimEnd() }
  const {
    versions,
    versionLogicPasses,
    versionTimelineSnapshots,
    versionTimelineDeltas,
    versionDialogueTranslations,
    versionInnerOsTranslations,
    currentVersionIndex,
  } = getAiVersionArrays(plot)
  const nextVs = [...versions]
  const nextLp = [...versionLogicPasses]
  const nextTs = [...versionTimelineSnapshots]
  const nextTd = [...versionTimelineDeltas]
  const nextTr = [...versionDialogueTranslations]
  const nextOsTr = [...versionInnerOsTranslations]
  const i = currentVersionIndex
  nextVs[i] = draftBody.trimEnd()
  while (nextLp.length < nextVs.length) nextLp.push(undefined)
  while (nextTs.length < nextVs.length) nextTs.push(undefined)
  while (nextTd.length < nextVs.length) nextTd.push(undefined)
  while (nextTr.length < nextVs.length) nextTr.push(undefined)
  while (nextOsTr.length < nextVs.length) nextOsTr.push(undefined)
  return {
    ...plot,
    content: nextVs[i]!,
    logicPass: nextLp[i],
    timelineSnapshot: nextTs[i],
    timelineDelta: nextTd[i],
    dialogueTranslations: nextTr[i],
    innerOsTranslations: nextOsTr[i],
    versions: nextVs,
    versionLogicPasses: nextLp,
    versionTimelineSnapshots: nextTs,
    versionTimelineDeltas: nextTd,
    versionDialogueTranslations: nextTr,
    versionInnerOsTranslations: nextOsTr,
    currentVersionIndex: i,
  }
}

/** 更新当前版本的对白/内心译文（编辑补译、缺译回填） */
export function plotWithCurrentVersionTranslations(
  plot: PlotItem,
  dialogueTranslations?: PlotDialogueTranslation[],
  innerOsTranslations?: PlotDialogueTranslation[],
  nextContent?: string,
): PlotItem {
  if (plot.type !== 'ai') return plot
  const {
    versions,
    versionLogicPasses,
    versionTimelineSnapshots,
    versionTimelineDeltas,
    versionDialogueTranslations,
    versionInnerOsTranslations,
    currentVersionIndex,
  } = getAiVersionArrays(plot)
  const i = currentVersionIndex
  const nextVs = [...versions]
  const nextTr = [...versionDialogueTranslations]
  const nextOsTr = [...versionInnerOsTranslations]
  const body = typeof nextContent === 'string' ? nextContent.trimEnd() : nextVs[i]!
  nextVs[i] = body
  nextTr[i] = dialogueTranslations?.length ? dialogueTranslations : undefined
  nextOsTr[i] = innerOsTranslations?.length ? innerOsTranslations : undefined
  while (nextTr.length < nextVs.length) nextTr.push(undefined)
  while (nextOsTr.length < nextVs.length) nextOsTr.push(undefined)
  return {
    ...plot,
    content: body,
    dialogueTranslations: nextTr[i],
    innerOsTranslations: nextOsTr[i],
    versions: nextVs,
    versionLogicPasses,
    versionTimelineSnapshots,
    versionTimelineDeltas,
    versionDialogueTranslations: nextTr,
    versionInnerOsTranslations: nextOsTr,
    currentVersionIndex: i,
  }
}
