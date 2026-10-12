/**
 * 线下约会：侧幕 / 上帝视角的镜头标签与「最近剧情」知情红行。
 * 缺席方不得从历史全文里「开天眼」获知自己不在场时的细节。
 */

import type { PlotItem } from './types'

export type DatingNarrativeLens = 'god' | 'side'
export type DatingNarrativeLensCurrent = DatingNarrativeLens | 'normal'

/** 从 AI 条自身字段、时间轴侧幕标记、或上一玩家条场控标签推断镜头 */
export function resolvePlotNarrativeLens(
  plot: PlotItem,
  prevPlayer?: PlotItem | null,
): DatingNarrativeLens | undefined {
  if (plot.type !== 'ai') return undefined
  if (plot.narrativeLens === 'god' || plot.narrativeLens === 'side') return plot.narrativeLens
  if (plot.timelineDelta?.side_perspective === true) return 'side'
  const tags = prevPlayer?.type === 'player' ? prevPlayer.activeControlTags : undefined
  if (!tags?.length) return undefined
  if (tags.some((t) => t.id === 'god')) return 'god'
  if (tags.some((t) => t.id === 'side')) return 'side'
  return undefined
}

export function datingNarrativeLensFromArchiveFlags(flags: {
  godPerspective?: boolean
  mainCharacterOffstage?: boolean
}): DatingNarrativeLensCurrent {
  if (flags.godPerspective) return 'god'
  if (flags.mainCharacterOffstage) return 'side'
  return 'normal'
}

function publicAnchorHintFromPlot(plot: PlotItem): string {
  const d = plot.timelineDelta
  const parts: string[] = []
  const day = String(plot.storyDay || d?.story_day || '').trim()
  const time = String(plot.storyTimeLabel || plot.storyTime || d?.story_time || '').trim()
  if (day || time) parts.push([day, time].filter(Boolean).join(' '))
  const loc = String(d?.location || '').trim()
  if (loc) parts.push(`地点线索：${loc}`)
  const present = (d?.characters_present ?? []).map((x) => String(x).trim()).filter(Boolean)
  if (present.length) parts.push(`在场（仅这些人知情）：${present.join('、')}`)
  return parts.join(' · ')
}

/** 侧幕全文对主角色保密：只保留公开锚点，抹掉对白/协议/姓名交换等细节 */
export function formatSidePlotRedactedForMainCharPrompt(
  characterRealName: string,
  plot: PlotItem,
): string {
  const hint = publicAnchorHintFromPlot(plot)
  const presentLine = hint.includes('在场')
    ? ''
    : `在场：玩家与其他 NPC（**不含** ${characterRealName}）。`
  return (
    `【侧幕·${characterRealName}未在场·已对主角色保密】` +
    (hint ? `${hint}。` : '') +
    presentLine +
    `具体对白、姓名交换、约定、情绪细节 ${characterRealName} **完全不知**；` +
    `当面续写禁止复述/点破/精准追问；仅可写合理寻踪疑惑（如「你刚去哪了？」）。`
  )
}

/** 上帝视角：保留在场角色可知信息，但钉死玩家不知情 */
export function formatGodPlotKnowledgeLockPrefix(characterRealName: string): string {
  return (
    `【上帝/屏外·玩家未在场·玩家不知情】以下为屏外切片；在场角色（含 ${characterRealName}，若其在场）可知本段，` +
    `但**玩家本人看不见听不见**。切回当面后禁止写玩家「其实知道 / 感应到 / 早看见了」；` +
    `禁止玩家无故点破屏外细节，除非后文写出合法知情路径。\n`
  )
}

/** 侧幕续写时保留全文，但钉死主角色不知情 */
export function formatSidePlotKnowledgeLockPrefix(characterRealName: string): string {
  return (
    `【侧幕·${characterRealName}未在场·主角色不知情】以下仅玩家与侧幕在场 NPC 知情；` +
    `${characterRealName} **不在知情名单**。禁止写成其全知、远程旁听或事后无因点破。\n`
  )
}
