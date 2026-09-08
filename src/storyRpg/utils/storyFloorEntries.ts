import type { PlotItem } from '../../phone/apps/wechat/dating/types'
import {
  formatPlotGenerationTimeCompact,
  formatPlotGenerationTimeLabel,
  resolvePlotStoryEndDisplayLabel,
} from '../../phone/apps/wechat/dating/plotStoryTimeLabel'
import {
  type PlotSummaryTitleOptions,
  plotHasStoredSynopsis,
  resolvePlotSummaryTitle,
} from '../../phone/apps/wechat/dating/plotSummaryTitle'

export type StoryFloorEntry = {
  plotId: string
  kind: 'ai' | 'player'
  /** AI 楼层序号（1 起）；玩家输入无楼层号 */
  floor?: number
  title: string
  /** 是否为模型写入的 planSummary（否则为推导标题） */
  hasStoredSummary?: boolean
  storyTimeLabel: string | null
  generatedAtLabel: string
  generatedAtCompact: string
  /** 供楼层目录关键词检索（标题 + 时间 + 正文摘录） */
  searchHaystack: string
}

function buildEntryTitle(plot: PlotItem, opts?: PlotSummaryTitleOptions): string {
  const title = resolvePlotSummaryTitle(plot, opts)
  if (title) return title
  return plot.type === 'player' ? '玩家输入' : '（暂无摘要）'
}

function buildSearchHaystack(plot: PlotItem, title: string, storyTimeLabel: string | null): string {
  const body = String(plot.content || '')
    .replace(/<thinking>[\s\S]*?<\/thinking>/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 800)
  return [title, storyTimeLabel ?? '', plot.type === 'player' ? '玩家' : '', body]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

/** 按关键词过滤楼层目录（空关键词返回全部） */
export function filterStoryFloorEntries(
  entries: StoryFloorEntry[],
  query: string,
): StoryFloorEntry[] {
  const q = query.trim().toLowerCase()
  if (!q) return entries
  const tokens = q.split(/\s+/).filter(Boolean)
  if (!tokens.length) return entries
  return entries.filter((entry) => {
    const hay = entry.searchHaystack
    const floorToken = entry.floor != null ? `#${entry.floor}` : '玩家'
    return tokens.every(
      (token) =>
        hay.includes(token) ||
        floorToken.includes(token) ||
        String(entry.floor ?? '').includes(token),
    )
  })
}

/** 由完整 plot 列表构建楼层目录（含摘要标题与生成时间） */
export function buildStoryFloorEntries(
  plots: PlotItem[],
  opts?: PlotSummaryTitleOptions,
): StoryFloorEntry[] {
  let aiFloor = 0
  return plots.map((plot) => {
    if (plot.type === 'ai') aiFloor += 1
    const title = buildEntryTitle(plot, opts)
    const storyTimeLabel = resolvePlotStoryEndDisplayLabel(plot) || plot.storyTimeLabel?.trim() || null
    return {
      plotId: plot.id,
      kind: plot.type,
      floor: plot.type === 'ai' ? aiFloor : undefined,
      title,
      hasStoredSummary: plotHasStoredSynopsis(plot, opts),
      storyTimeLabel,
      generatedAtLabel: formatPlotGenerationTimeLabel(plot),
      generatedAtCompact: formatPlotGenerationTimeCompact(plot),
      searchHaystack: buildSearchHaystack(plot, title, storyTimeLabel),
    }
  })
}

export function countAiFloors(plots: PlotItem[]): number {
  return plots.filter((p) => p.type === 'ai').length
}
