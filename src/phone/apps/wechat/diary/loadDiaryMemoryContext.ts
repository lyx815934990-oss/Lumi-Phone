import type { ApiConfigCore } from '../../api/types'
import { isMeetImportedWeChatMessageId } from '../../lumiMeet/meetMemoryConstants'
import { loadStoryTimelinePromptBlock } from '../memory/storyTimelinePersist'
import { personaDb } from '../newFriendsPersona/idb'
import {
  parseStoryAnchorLabelToMs,
  resolveCharacterStoryTimeFloor,
} from '../time/applyOnlineChatTimeFusion'
import { loadDatingPlotsFromKv } from '../unifiedMemoryAutoSummary'
import { resolveLastOfflineAiPlotTimestampMs } from '../wechatCrossChannelTimeline'
import {
  MEMORY_UNSUMMARIZED_BLOCK_CHAR_CAP,
  MEMORY_UNSUMMARIZED_GATHER_MESSAGE_LIMIT,
  buildLastOnlineChatContinuityNote,
  formatPrivateLineUnsummarized,
} from '../wechatMemoryPromptBlocks'
import { loadDiaryOfflineSummaryPromptBlock } from './loadDiaryOfflineSummaryPrompt'

function resolveUnsummarizedFromTimestamp(
  cursor: number | null | undefined,
  minMessageTimestamp?: number,
): number {
  const c = typeof cursor === 'number' && Number.isFinite(cursor) ? cursor : 0
  const min =
    typeof minMessageTimestamp === 'number' && Number.isFinite(minMessageTimestamp)
      ? minMessageTimestamp
      : 0
  return Math.max(c, min)
}

function clipLinesPreferRecent(lines: string[], charCap: number): string {
  if (!lines.length) return ''
  let parts = [...lines]
  while (parts.join('\n').length > charCap && parts.length > 4) parts.shift()
  let body = parts.join('\n')
  if (body.length > charCap) body = `${body.slice(-charCap)}\n…（更早未总结私聊已截断）`
  return body
}

/**
 * 日记专用：按「剧情现在」把未总结私聊拆成往事 / 近端，避免线下已推进后仍把旧线上当此刻。
 */
async function loadDiaryUnsummarizedPrivateSplit(params: {
  conversationKey: string
  currentStoryLabel: string
  currentStoryMs: number | null
  lastOfflineAiPlotTs: number | null
}): Promise<{ pastBlock: string; recentBlock: string }> {
  const ck = params.conversationKey.trim()
  if (!ck) return { pastBlock: '', recentBlock: '' }

  const cursor = await personaDb.getMemorySummaryCursorTimestamp(ck)
  const fromTs = resolveUnsummarizedFromTimestamp(cursor)
  const rows = await personaDb.listWeChatChatMessagesFromTimestampAsc({
    conversationKey: ck,
    fromTimestampInclusive: fromTs,
    limit: MEMORY_UNSUMMARIZED_GATHER_MESSAGE_LIMIT,
  })
  if (!rows.length) return { pastBlock: '', recentBlock: '' }

  const pastLines: string[] = []
  const recentLines: string[] = []
  const nowMs = params.currentStoryMs
  const offlineTs = params.lastOfflineAiPlotTs

  for (const m of rows) {
    if (isMeetImportedWeChatMessageId(m.id)) continue
    const line = formatPrivateLineUnsummarized(m, { includeTimestamp: true })
    if (!line) continue
    const storyMs = parseStoryAnchorLabelToMs(m.storyTimeLabel)
    let isPast = false
    if (storyMs != null && nowMs != null) {
      // 严格早于「现在」→ 往事；同刻或更晚仍算近端可承接
      isPast = storyMs < nowMs
    } else if (storyMs == null && offlineTs != null && Number.isFinite(m.timestamp)) {
      // 无剧情戳：系统落库早于最新线下 AI → 当作线下之前的线上往事
      isPast = m.timestamp < offlineTs
    }
    ;(isPast ? pastLines : recentLines).push(line)
  }

  const pastBody = clipLinesPreferRecent(pastLines, Math.floor(MEMORY_UNSUMMARIZED_BLOCK_CHAR_CAP * 0.45))
  const recentBody = clipLinesPreferRecent(recentLines, MEMORY_UNSUMMARIZED_BLOCK_CHAR_CAP)

  const pastBlock = pastBody
    ? `【往事·未总结私聊（剧情时间早于「现在」，或落库早于最新线下）】\n` +
      `每条前缀为剧情时间（有则优先）或系统落库时刻。**仅可回溯提及，禁止写成此刻刚聊、正在分别/即将离开。**\n` +
      `${pastBody}`
    : ''

  const recentBlock = recentBody
    ? `【近端·未总结私聊（不早于剧情「现在」/最新线下之后）】\n` +
      `每条前缀为剧情时间（有则优先）或系统落库时刻；可与「现在」承接。\n` +
      `${recentBody}`
    : ''

  return { pastBlock, recentBlock }
}

export type DiaryMemoryContextPack = {
  storyTimeline: string
  offlineSummaryBlock: string
  onlineContinuityNote: string
  pastPrivateBlock: string
  recentPrivateBlock: string
  unsummarizedGroupNotes: string
  unsMeet: string
  currentStoryLabel: string
}

/** 组装日记生成用的跨频道记忆上下文（含时间轴「现在」与线上时序拆分） */
export async function loadDiaryMemoryContext(params: {
  characterId: string
  conversationKey: string
  relevanceHaystack: string
  apiConfig?: ApiConfigCore | null
  /** 来自 persona pack 的群聊/遇见未总结（可原样附带） */
  unsummarizedGroupNotes?: string
  unsMeet?: string
}): Promise<DiaryMemoryContextPack> {
  const cid = params.characterId.trim()
  const ck = params.conversationKey.trim()
  const apiOk =
    params.apiConfig?.apiUrl?.trim() && params.apiConfig?.apiKey?.trim() ? params.apiConfig : null

  const [floor, offlineSummaryBlock, plots, storyTimeline] = await Promise.all([
    resolveCharacterStoryTimeFloor(cid),
    loadDiaryOfflineSummaryPromptBlock(cid),
    loadDatingPlotsFromKv(cid).catch(() => []),
    loadStoryTimelinePromptBlock(cid, {
      relevanceText: params.relevanceHaystack,
      apiConfig: apiOk,
      conversationKey: ck || undefined,
    }).catch(() => ''),
  ])

  const currentStoryLabel = floor.label?.trim() || ''
  const currentStoryMs = floor.floorMs
  const lastOfflineAiPlotTs = resolveLastOfflineAiPlotTimestampMs(plots)

  const [{ pastBlock, recentBlock }, onlineContinuityNote] = await Promise.all([
    ck
      ? loadDiaryUnsummarizedPrivateSplit({
          conversationKey: ck,
          currentStoryLabel,
          currentStoryMs,
          lastOfflineAiPlotTs,
        })
      : Promise.resolve({ pastBlock: '', recentBlock: '' }),
    ck
      ? buildLastOnlineChatContinuityNote({
          conversationKey: ck,
          currentStoryLabel: currentStoryLabel || null,
          currentTimeMs: currentStoryMs,
        }).catch(() => '')
      : Promise.resolve(''),
  ])

  return {
    storyTimeline: String(storyTimeline ?? '').trim(),
    offlineSummaryBlock: String(offlineSummaryBlock ?? '').trim(),
    onlineContinuityNote: String(onlineContinuityNote ?? '').trim(),
    pastPrivateBlock: pastBlock,
    recentPrivateBlock: recentBlock,
    unsummarizedGroupNotes: String(params.unsummarizedGroupNotes ?? '').trim(),
    unsMeet: String(params.unsMeet ?? '').trim(),
    currentStoryLabel,
  }
}

/** 拼进 user 任务的近期上下文（顺序：现在感知 → 线下 → 往事线上 → 近端线上） */
export function formatDiaryRecentContextUserBlock(ctx: DiaryMemoryContextPack): string {
  const nowLine = ctx.currentStoryLabel
    ? `【日记书写锚点】故事内「现在」= ${ctx.currentStoryLabel}（以【剧情时间轴·当前状态】为准；正文时序与 inUniverseTime 须落在此锚点附近或之后的收束，禁止倒回已结束的「即将分别/尚未归来」。）`
    : `【日记书写锚点】以系统中的【剧情时间轴·当前状态】为故事「现在」；禁止把更早的线上分别对话写成此刻。`

  return [
    nowLine,
    ctx.onlineContinuityNote,
    ctx.offlineSummaryBlock,
    ctx.pastPrivateBlock,
    ctx.recentPrivateBlock,
    ctx.unsummarizedGroupNotes
      ? `【群聊参照（未总结）】\n${ctx.unsummarizedGroupNotes}\n（群聊仅为参照；时序仍服从剧情「现在」。）`
      : '',
    ctx.unsMeet ? `【遇见承接】\n${ctx.unsMeet}` : '',
  ]
    .filter(Boolean)
    .join('\n\n')
}
