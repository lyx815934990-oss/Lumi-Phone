import type { WeChatChatMessage } from '../newFriendsPersona/types'
import type { MeetChatMessage } from '../../lumiMeet/meetTypes'

/** 线下剧情窗口切分用的最小字段 */
export type DatingPlotRetentionItem = {
  type: string
  timestamp?: number
}

/**
 * 最近上下文参考：最近若干 **AI 回复轮**（不含用户单独计轮；窗口内保留其间用户输入）。
 * 微信私聊：同一轮连发的多条角色气泡合并计 **1** 轮（与 bumpMemoryAiRoundCount 一致）。
 * 与「游标上下文（待总结）」按消息 id 并集去重后注入；思维溯源⑤会展示去重后的线上近端。
 */
export const MEMORY_RECENT_AI_ROUNDS_REFERENCE = 10

/** 线上私聊固定注入「最近线下剧情」：最近 N 轮 AI 剧情原文（含其间玩家输入；不依赖总结游标）。 */
export const MEMORY_UNSUMMARIZED_OFFLINE_INJECT_AI_ROUNDS = 2

/** @deprecated 使用 {@link MEMORY_RECENT_AI_ROUNDS_REFERENCE} */
export const MEMORY_POST_SUMMARY_RETAIN_AI_ROUNDS = MEMORY_RECENT_AI_ROUNDS_REFERENCE

function selectRecentAiRoundWindowSorted<T>(
  items: readonly T[],
  countAiRound: (item: T) => boolean,
  retainAiRounds: number,
): T[] {
  if (!items.length || retainAiRounds <= 0) return []
  let aiCount = 0
  /** 不足 N 轮时取全部；够 N 轮时切到最旧一记 AI 前的用户输入 */
  let splitIdx = 0
  for (let i = items.length - 1; i >= 0; i--) {
    if (!countAiRound(items[i]!)) continue
    aiCount++
    if (aiCount < retainAiRounds) continue
    splitIdx = i
    while (splitIdx > 0 && !countAiRound(items[splitIdx - 1]!)) {
      splitIdx--
    }
    break
  }
  return items.slice(splitIdx)
}

/** 私聊：最近 N 轮角色回复及其间的用户消息（全量历史，不受总结游标限制）。 */
export function selectRecentWeChatMessagesAiRoundWindow(
  messages: readonly WeChatChatMessage[],
  retainAiRounds = MEMORY_RECENT_AI_ROUNDS_REFERENCE,
): WeChatChatMessage[] {
  const sorted = [...messages].sort((a, b) => a.timestamp - b.timestamp)
  if (!sorted.length || retainAiRounds <= 0) return []

  const roundStarts: number[] = []
  for (let i = 0; i < sorted.length; i++) {
    const m = sorted[i]!
    if (m.type !== 'character' || m.isRecalled) continue
    const prev = sorted[i - 1]
    if (!prev || prev.type !== 'character' || prev.isRecalled) roundStarts.push(i)
  }
  if (!roundStarts.length) return []

  const keepFrom =
    roundStarts[Math.max(0, roundStarts.length - retainAiRounds)] ?? roundStarts[0]!
  let splitIdx = keepFrom
  while (splitIdx > 0) {
    const prev = sorted[splitIdx - 1]!
    if (prev.type === 'character' && !prev.isRecalled) break
    splitIdx--
  }
  return sorted.slice(splitIdx)
}

/** 线下剧情：最近 N 条 AI 剧情及其间的玩家输入。 */
export function selectRecentDatingPlotsAiRoundWindow<T extends DatingPlotRetentionItem>(
  plots: readonly T[],
  retainAiRounds = MEMORY_RECENT_AI_ROUNDS_REFERENCE,
): T[] {
  const sorted = [...plots].sort((a, b) => (a.timestamp ?? 1) - (b.timestamp ?? 1))
  return selectRecentAiRoundWindowSorted(sorted, (p) => p.type === 'ai', retainAiRounds)
}

/** 遇见：最近 N 轮 NPC 回复及其间的用户消息。 */
export function selectRecentMeetMessagesAiRoundWindow(
  messages: readonly MeetChatMessage[],
  retainAiRounds = MEMORY_RECENT_AI_ROUNDS_REFERENCE,
): MeetChatMessage[] {
  const sorted = [...messages].sort((a, b) => a.ts - b.ts)
  return selectRecentAiRoundWindowSorted(sorted, (m) => m.role === 'npc', retainAiRounds)
}
