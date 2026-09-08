import type { PlotItem } from '../../phone/apps/wechat/dating/types'
import { resolvePlotStoryEndDisplayLabel } from '../../phone/apps/wechat/dating/plotStoryTimeLabel'
import {
  type PlotSummaryTitleOptions,
  resolvePlotSummaryBody,
  resolvePlotSummaryTitle,
} from '../../phone/apps/wechat/dating/plotSummaryTitle'
import { getAiPlotVersionSlices, getAiVersionArrays } from '../../phone/apps/wechat/dating/plotVersions'
import type { StoryComment, StoryNode } from '../types'

export function plotItemToStoryNode(plot: PlotItem, opts?: PlotSummaryTitleOptions): StoryNode {
  const slices = plot.type === 'ai' ? getAiPlotVersionSlices(plot) : null
  const versionMeta = plot.type === 'ai' ? getAiVersionArrays(plot) : null
  const comments: StoryComment[] | undefined = (slices?.readerComments ?? plot.readerComments)?.map((c) => ({
    id: c.id,
    nick: c.nick,
    avatarHue: c.hue,
    text: c.text,
    likes: c.likes,
    highlight: c.highlight,
    slot: c.slot,
  }))

  const htmlVisualRaw = slices?.plotHtmlVisual ?? plot.plotHtmlVisual
  const htmlVisual = htmlVisualRaw?.html?.trim()
    ? {
        title: htmlVisualRaw.title,
        html: htmlVisualRaw.html,
        emoji: htmlVisualRaw.emoji,
      }
    : undefined

  // 保留讨论位锚点，供卡片按锚点多处穿插评论；渲染正文段时再剥离
  const rawBody = String(slices?.body ?? plot.content ?? '')
  const content = rawBody

  return {
    id: plot.id,
    kind: plot.type === 'player' ? 'player' : 'ai',
    content,
    storyTimeLabel:
      resolvePlotStoryEndDisplayLabel(plot) ??
      String(plot.storyTimeLabel ?? '').trim() ??
      '',
    summary: resolvePlotSummaryTitle({ ...plot, content: rawBody }, opts),
    summaryBody: resolvePlotSummaryBody({ ...plot, content: rawBody }, opts) || undefined,
    hasParallelEvent: !!plot.parallelEvent?.content?.trim(),
    hasIfLine: !!plot.ifLine?.content?.trim(),
    isHighlight: comments?.some((c) => c.highlight) ?? false,
    chainOfThought: plot.logicPass?.trim() || undefined,
    images: plot.plotImages?.map((img) => ({
      id: img.id,
      url: img.url,
      caption: img.prompt,
    })),
    comments,
    htmlVisual,
    versionCount: versionMeta ? Math.max(1, versionMeta.versions.length) : undefined,
    currentVersionIndex: versionMeta?.currentVersionIndex,
    createdAt: plot.timestamp,
    activeControlTags:
      plot.type === 'player' && Array.isArray(plot.activeControlTags) && plot.activeControlTags.length > 0
        ? plot.activeControlTags.map((t) => ({ id: t.id, label: t.label }))
        : undefined,
  }
}

export function plotItemsToStoryNodes(
  plots: PlotItem[],
  opts?: PlotSummaryTitleOptions,
): StoryNode[] {
  return plots.map((p) => plotItemToStoryNode(p, opts))
}
