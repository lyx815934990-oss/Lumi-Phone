import { personaDb } from '../newFriendsPersona/idb'
import {
  formatStoryTimeClockFromMs,
  parseStoryAnchorLabelToMs,
} from '../time/applyOnlineChatTimeFusion'
import { resolveCharacterStoryNowMs } from '../time/messagesTabStoryTime'
import {
  dualNarrativeStoryFieldsFromDelta,
  parseDualNarrativeFieldsFromLabel,
  type DualNarrativeStoryFields,
} from './dualNarrativeTime'
import {
  extractStoryTimelineRowKeywordsFromRowText,
  formatGregorianStoryDayFromMs,
  normalizeStoryTimelineRowKeyword,
  normalizeStoryTimelineRowKeywords,
  normalizeStoryTimelineRowTitle,
  type StoryTimelineSummaryDelta,
} from './storyTimelineTypes'

export type OnlineMemorySummaryKeywordMeta = {
  rowKeywords?: string[]
  memoryTriggerCategory?: string
  memoryTriggerPrecise?: string
  memoryTriggerEmotionNeed?: string[]
  memorySupplementKeywords?: string[]
  content?: string
}

/** 线上总结入库正文：与线下摘要表一致的标题 / 关键词 / 正文结构。 */
export function formatOnlineMemorySummaryStorageBody(
  body: string,
  meta?: { rowTitle?: string; rowKeywords?: string[]; storyTimeLabel?: string },
): string {
  const lines: string[] = []
  const title = normalizeStoryTimelineRowTitle(meta?.rowTitle)
  const kws = normalizeStoryTimelineRowKeywords(meta?.rowKeywords)
  const storyTime = String(meta?.storyTimeLabel ?? '').trim()
  const core = String(body ?? '').trim()
  if (title) lines.push(`【摘要标题】${title}`)
  if (storyTime) lines.push(`【剧情时间】${storyTime}`)
  if (kws.length) lines.push(`【摘要关键词】${kws.join('、')}`)
  if (core) lines.push(`【摘要正文】\n${core}`)
  return (lines.join('\n') || core).slice(0, 4000)
}

/** 从模型 JSON 各字段（含旧版 category / keywords 别名）合并出摘要检索词。 */
export function resolveMemorySummaryRowKeywordsFromParsed(
  meta?: OnlineMemorySummaryKeywordMeta,
): string[] {
  const direct = normalizeStoryTimelineRowKeywords(meta?.rowKeywords)
  if (direct.length) return direct
  const fromLegacy = onlineMemoryKeywordsFromSummary(meta)
  const normalized = normalizeStoryTimelineRowKeywords(fromLegacy)
  if (normalized.length) return normalized
  const body = String(meta?.content ?? '').trim()
  return body ? extractStoryTimelineRowKeywordsFromRowText(body) : []
}

export function onlineMemoryKeywordsFromSummary(meta?: OnlineMemorySummaryKeywordMeta): string[] | undefined {
  const rowKws = normalizeStoryTimelineRowKeywords(meta?.rowKeywords)
  if (rowKws.length) return rowKws
  const legacy: string[] = []
  const cat = normalizeStoryTimelineRowKeyword(meta?.memoryTriggerCategory)
  if (cat) legacy.push(cat)
  const precise = String(meta?.memoryTriggerPrecise ?? '')
    .replace(/\s+/g, '')
    .trim()
    .slice(0, 10)
  if (precise) legacy.push(precise)
  for (const e of meta?.memoryTriggerEmotionNeed ?? []) {
    const t = normalizeStoryTimelineRowKeyword(e)
    if (t) legacy.push(t)
  }
  for (const e of meta?.memorySupplementKeywords ?? []) {
    const t = String(e ?? '').replace(/\s+/g, '').trim().slice(0, 16)
    if (t) legacy.push(t)
  }
  const seen = new Set<string>()
  const out: string[] = []
  for (const kw of legacy) {
    const key = kw.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(kw)
  }
  return out.length ? out : undefined
}

function fieldsFromNowMs(ms: number): DualNarrativeStoryFields {
  return dualNarrativeStoryFieldsFromDelta({
    story_day: formatGregorianStoryDayFromMs(ms),
    story_time: formatStoryTimeClockFromMs(ms),
  })
}

function isAfterStoryNow(candidate: DualNarrativeStoryFields, now: DualNarrativeStoryFields): boolean {
  const a = parseStoryAnchorLabelToMs(candidate.storyTimeLabel)
  const b = parseStoryAnchorLabelToMs(now.storyTimeLabel)
  return a != null && b != null && a > b
}

/** 角色时间设置 / 剧情轴上的「现在」（线上总结盖章用）。 */
export async function resolveCharacterCurrentStoryStamp(
  characterId: string,
): Promise<DualNarrativeStoryFields> {
  const cid = characterId.trim()
  if (!cid) return {}
  try {
    const nowMs = await resolveCharacterStoryNowMs(cid)
    if (typeof nowMs === 'number' && Number.isFinite(nowMs) && nowMs > 0) {
      return fieldsFromNowMs(nowMs)
    }
    const state = await personaDb.getStoryTimelineState(cid)
    return dualNarrativeStoryFieldsFromDelta({
      story_day: state?.currentStoryDay,
      story_time: state?.currentStoryTime,
    })
  } catch {
    return {}
  }
}

/**
 * 线上记忆【剧情时间】：以时间设置/剧情轴「现在」为准。
 * 消息或模型若写出更晚的日期（例如已拨回到 2/13，材料仍停在 2/21），钳回现在。
 */
export async function resolveOnlineMemoryStoryStamp(params: {
  characterId: string
  chunkMessages?: Array<{
    storyTimeLabel?: string | null
    storyDay?: string | null
    storyTime?: string | null
  }>
  modelDelta?: StoryTimelineSummaryDelta | null
}): Promise<DualNarrativeStoryFields> {
  const now = await resolveCharacterCurrentStoryStamp(params.characterId)
  let latestMsg: DualNarrativeStoryFields = {}
  for (const m of params.chunkMessages ?? []) {
    const fromLabel = m.storyTimeLabel?.trim()
      ? parseDualNarrativeFieldsFromLabel(m.storyTimeLabel)
      : dualNarrativeStoryFieldsFromDelta({
          story_day: m.storyDay ?? undefined,
          story_time: m.storyTime ?? undefined,
        })
    if (fromLabel.storyTimeLabel) latestMsg = fromLabel
  }
  const model = dualNarrativeStoryFieldsFromDelta(params.modelDelta)
  const candidates: DualNarrativeStoryFields[] = []
  if (latestMsg.storyTimeLabel && !(now.storyTimeLabel && isAfterStoryNow(latestMsg, now))) {
    candidates.push(latestMsg)
  }
  if (model.storyTimeLabel && !(now.storyTimeLabel && isAfterStoryNow(model, now))) {
    candidates.push(model)
  }
  if (candidates.length) {
    let best = candidates[0]!
    for (const f of candidates.slice(1)) {
      const a = parseStoryAnchorLabelToMs(best.storyTimeLabel)
      const b = parseStoryAnchorLabelToMs(f.storyTimeLabel)
      if (b != null && (a == null || b >= a)) best = f
    }
    return best
  }
  return now
}

