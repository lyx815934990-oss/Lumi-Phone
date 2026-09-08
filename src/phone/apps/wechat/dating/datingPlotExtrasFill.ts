/**
 * 评论 / 小剧场与正文隔离生成：
 * 主回复只负责剧情；缺块时在同一次「发送/重生成」流程里另开短请求补齐。
 * 评论：先保证正文有讨论位锚点，再按槽位补评论（穿插展示，而非堆在文末）。
 * 小剧场：独立高质量完整 HTML（不限行数）。
 */

import type { ApiConfig } from '../../api/types'
import { requestDatingReaderCommentsFill } from './datingReaderCommentsFill'
import { requestDatingTheaterHtmlFill } from './datingPlotTheaterFill'
import {
  ensureReaderCommentAnchorsInBody,
  normalizePlotReaderComments,
  redistributeReaderCommentsToSlots,
  type PlotReaderComment,
} from './datingReaderComments'
import { normalizePlotHtmlVisual, type PlotHtmlVisual } from './datingPlotHtmlVisual'
import type { PlotItem } from './types'
import { getAiVersionArrays } from './plotVersions'

export function patchAiPlotCurrentExtras(
  plot: PlotItem,
  patch: {
    content?: string
    readerComments?: PlotReaderComment[] | null
    plotHtmlVisual?: PlotHtmlVisual | null
  },
): PlotItem {
  if (plot.type !== 'ai') return plot
  const {
    versions,
    versionReaderComments,
    versionPlotHtmlVisuals,
  } = getAiVersionArrays(plot)
  const idx = Math.max(
    0,
    Math.min(versions.length - 1, plot.currentVersionIndex ?? versions.length - 1),
  )
  const nextVersions = [...versions]
  const nextRc = [...versionReaderComments]
  const nextHv = [...versionPlotHtmlVisuals]
  while (nextRc.length < versions.length) nextRc.push(undefined)
  while (nextHv.length < versions.length) nextHv.push(undefined)

  let content = plot.content
  let readerComments = plot.readerComments
  let plotHtmlVisual = plot.plotHtmlVisual

  if (typeof patch.content === 'string') {
    const c = patch.content.trim()
    nextVersions[idx] = c
    content = c
  }
  if (patch.readerComments != null) {
    const rc = patch.readerComments.length
      ? normalizePlotReaderComments(patch.readerComments)
      : undefined
    nextRc[idx] = rc
    readerComments = rc
  }
  if (patch.plotHtmlVisual !== undefined) {
    const hv = patch.plotHtmlVisual ? normalizePlotHtmlVisual(patch.plotHtmlVisual) : undefined
    nextHv[idx] = hv
    plotHtmlVisual = hv
  }

  return {
    ...plot,
    content,
    versions: nextVersions,
    readerComments,
    plotHtmlVisual,
    versionReaderComments: nextRc,
    versionPlotHtmlVisuals: nextHv,
  }
}

/** 正文已有则跳过；缺什么补什么。返回可能已打补丁的 plot。 */
export async function fillDatingPlotExtrasIfNeeded(params: {
  apiConfig: ApiConfig | null | undefined
  plot: PlotItem
  commentModeEnabled: boolean
  plotArtifactVisualEnabled: boolean
  plotArtifactVisualPresetId?: string | null
  characterName: string
  characterGender?: 'male' | 'female' | 'other' | null
  playerName?: string
  playerGender?: 'male' | 'female' | 'other' | null
  plotBody?: string
}): Promise<PlotItem> {
  const cfg = params.apiConfig
  if (!cfg?.apiUrl || !cfg?.apiKey || !cfg?.modelId) return params.plot
  if (params.plot.type !== 'ai') return params.plot

  let body =
    String(params.plotBody || params.plot.content || '')
      .replace(/<thinking>[\s\S]*?<\/thinking>/gi, '')
      .trim() || params.plot.content

  let next = params.plot
  let slotCount = 0

  // 评论穿插：先确保正文有讨论位（否则 UI 只能把评论堆在文末）
  if (params.commentModeEnabled) {
    const ensured = ensureReaderCommentAnchorsInBody(body, 2)
    slotCount = ensured.slotCount
    if (ensured.changed) {
      body = ensured.body
      next = patchAiPlotCurrentExtras(next, { content: body })
    }
    if (next.readerComments?.length && ensured.changed) {
      next = patchAiPlotCurrentExtras(next, {
        readerComments: redistributeReaderCommentsToSlots(next.readerComments, slotCount),
      })
    }
  }

  const needComments =
    params.commentModeEnabled && !(next.readerComments?.length)
  const needTheater =
    params.plotArtifactVisualEnabled && !next.plotHtmlVisual?.html?.trim()
  if (!needComments && !needTheater) return next

  const [comments, theater] = await Promise.all([
    needComments
      ? requestDatingReaderCommentsFill({
          apiConfig: cfg as ApiConfig,
          characterName: params.characterName,
          playerName: params.playerName,
          plotBody: body,
          slotCount: slotCount || undefined,
        })
      : Promise.resolve([] as PlotReaderComment[]),
    needTheater
      ? requestDatingTheaterHtmlFill({
          apiConfig: cfg as ApiConfig,
          characterName: params.characterName,
          characterGender: params.characterGender,
          playerName: params.playerName,
          playerGender: params.playerGender,
          presetId: params.plotArtifactVisualPresetId,
          plotBody: body,
          plotHint: body.slice(-2800),
        })
      : Promise.resolve(null),
  ])

  if (needComments && comments.length) {
    const slotted =
      slotCount > 0 ? redistributeReaderCommentsToSlots(comments, slotCount) : comments
    next = patchAiPlotCurrentExtras(next, { readerComments: slotted })
  }
  if (needTheater && theater?.html?.trim()) {
    next = patchAiPlotCurrentExtras(next, { plotHtmlVisual: theater })
  }
  return next
}
