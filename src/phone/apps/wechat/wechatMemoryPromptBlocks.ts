import { stripWechatGroupEventNoticePrefix } from './groupChatEventNotice'
import { findGroupMember } from './groupChatUtils'
import type { GroupChatRow, WeChatChatMessage } from './newFriendsPersona/types'
import { isMeetImportedWeChatMessageId } from '../lumiMeet/meetMemoryConstants'
import { personaDb } from './newFriendsPersona/idb'
import {
  formatSystemRecordTime,
  resolveMessageSystemRecordedAtMs,
} from './wechatCrossChannelTimeline'
import { listPrivateConversationKeysForAccountCharacter } from './wechatAccountPrivateChatStorage'
import {
  isWechatGroupConversationKey,
  parseGroupIdFromConversationKey,
  parsePrivateWeChatConversationCharacterAndSession,
  WECHAT_GROUP_BOT_CHARACTER_ID,
  wechatConversationKey,
  wechatGroupConversationKey,
} from './wechatConversationKey'
import { selectRecentWeChatMessagesAiRoundWindow } from './memory/memorySummaryRetention'
import { formatGregorianStoryDayFromMs } from './memory/storyTimelineTypes'
import { parseStoryAnchorLabelToMs } from './time/applyOnlineChatTimeFusion'

/** 线上固定注入「最近私聊轮次」：默认最近 N 轮对方回复（含其间用户消息）；总结游标推过后仍注入 */
export const MEMORY_RECENT_PRIVATE_CHAT_INJECT_AI_ROUNDS = 10

/** 会话可调：固定注入轮数上限（含 0=关闭） */
export const MEMORY_RECENT_PRIVATE_CHAT_INJECT_AI_ROUNDS_MAX = 16

/** 读取会话设置中的固定注入轮数；未设置则用默认 {@link MEMORY_RECENT_PRIVATE_CHAT_INJECT_AI_ROUNDS}。 */
export function resolveRecentPrivateInjectAiRounds(
  settings?: { recentPrivateInjectAiRounds?: number | null } | null,
): number {
  const raw = settings?.recentPrivateInjectAiRounds
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return Math.max(0, Math.min(MEMORY_RECENT_PRIVATE_CHAT_INJECT_AI_ROUNDS_MAX, Math.floor(raw)))
  }
  return MEMORY_RECENT_PRIVATE_CHAT_INJECT_AI_ROUNDS
}

/** 未总结游标后消息（与 {@link formatUnsummarizedPrivateChatBlock} 同过滤）。 */
export async function listUnsummarizedPrivateChatMessages(params: {
  conversationKey: string
  maxMessages?: number
  minMessageTimestamp?: number
  minStoryCalendarMs?: number | null
  storyNowLabel?: string | null
  lastOfflineAiPlotTs?: number | null
  dropCrossDayEarlier?: boolean
}): Promise<WeChatChatMessage[]> {
  const ck = params.conversationKey.trim()
  if (!ck) return []
  const cursor = await personaDb.getMemorySummaryCursorTimestamp(ck)
  const fromTs = resolveUnsummarizedFromTimestamp(cursor, params.minMessageTimestamp)
  const lim = Math.max(
    1,
    Math.min(MEMORY_UNSUMMARIZED_GATHER_MESSAGE_LIMIT, Math.floor(params.maxMessages ?? MEMORY_UNSUMMARIZED_GATHER_MESSAGE_LIMIT)),
  )
  const rows = await personaDb.listWeChatChatMessagesFromTimestampAsc({
    conversationKey: ck,
    fromTimestampInclusive: fromTs,
    limit: lim,
  })
  if (!rows.length) return []
  const storyFloor =
    typeof params.minStoryCalendarMs === 'number' && Number.isFinite(params.minStoryCalendarMs)
      ? params.minStoryCalendarMs
      : null
  const lastOfflineTs =
    typeof params.lastOfflineAiPlotTs === 'number' && Number.isFinite(params.lastOfflineAiPlotTs)
      ? params.lastOfflineAiPlotTs
      : null
  const dropEarlier = params.dropCrossDayEarlier === true
  const out: WeChatChatMessage[] = []
  for (const m of rows) {
    if (isMeetImportedWeChatMessageId(m.id)) continue
    if (m.isRecalled) continue
    const storyMs = parseStoryAnchorLabelToMs(m.storyTimeLabel)
    let isPast = false
    if (storyFloor != null && storyMs != null) {
      isPast = storyMs < storyFloor && !sameStoryCalendarDayMs(storyMs, storyFloor)
    } else if (storyMs == null && lastOfflineTs != null && Number.isFinite(m.timestamp)) {
      isPast = m.timestamp < lastOfflineTs
    }
    if (dropEarlier && isPast) continue
    out.push(m)
  }
  return out
}

/** 固定近端窗消息（与 {@link buildRecentPrivateChatRoundsWithTimeBlock} 同过滤）。 */
export async function listRecentPrivateInjectChatMessages(params: {
  conversationKey: string
  retainAiRounds?: number
  minMessageTimestamp?: number | null
  minStoryCalendarMs?: number | null
}): Promise<WeChatChatMessage[]> {
  const ck = params.conversationKey.trim()
  if (!ck) return []
  const rounds = Math.max(
    0,
    Math.min(
      MEMORY_RECENT_PRIVATE_CHAT_INJECT_AI_ROUNDS_MAX,
      Math.floor(params.retainAiRounds ?? MEMORY_RECENT_PRIVATE_CHAT_INJECT_AI_ROUNDS),
    ),
  )
  if (rounds <= 0) return []
  try {
    const all = await personaDb.listWeChatChatMessagesByConversationKey(ck)
    const wallFloor =
      typeof params.minMessageTimestamp === 'number' && Number.isFinite(params.minMessageTimestamp)
        ? params.minMessageTimestamp
        : null
    const storyFloor =
      typeof params.minStoryCalendarMs === 'number' && Number.isFinite(params.minStoryCalendarMs)
        ? params.minStoryCalendarMs
        : null
    const usable = all.filter((m) => {
      if (m.isRecalled || isMeetImportedWeChatMessageId(m.id)) return false
      if (wallFloor != null && !(m.timestamp > wallFloor)) return false
      if (storyFloor != null) {
        const storyMs = parseStoryAnchorLabelToMs(m.storyTimeLabel)
        if (
          storyMs != null &&
          storyMs < storyFloor &&
          !sameStoryCalendarDayMs(storyMs, storyFloor)
        ) {
          return false
        }
      }
      return true
    })
    if (!usable.length) return []
    return selectRecentWeChatMessagesAiRoundWindow(usable, rounds)
  } catch {
    return []
  }
}

/** 未总结 ∪ 固定近端：按 id 并集后按时间排序，格式化为单块注入（部分重合时用）。 */
export async function buildMergedPrivateOnlineUnionBlock(params: {
  conversationKey: string
  unionMessageIds: readonly string[]
  maxChars?: number
}): Promise<string> {
  const ck = params.conversationKey.trim()
  const idSet = new Set(params.unionMessageIds.map((x) => String(x ?? '').trim()).filter(Boolean))
  if (!ck || !idSet.size) return ''
  try {
    const all = await personaDb.listWeChatChatMessagesByConversationKey(ck)
    const picked = all
      .filter((m) => idSet.has(m.id) && !m.isRecalled && !isMeetImportedWeChatMessageId(m.id))
      .sort((a, b) => a.timestamp - b.timestamp)
    if (!picked.length) return ''
    const lines: string[] = []
    for (const m of picked) {
      const line = formatPrivateLineUnsummarized(m, { includeTimestamp: true, maxChars: 2000 })
      if (line) lines.push(line)
    }
    if (!lines.length) return ''
    let body = lines.join('\n')
    const charCap = Math.max(
      800,
      Math.min(UNSUMMARIZED_BLOCK_CHAR_HARD_MAX, Math.floor(params.maxChars ?? 14_000)),
    )
    if (body.length > charCap) {
      const parts = body.split('\n')
      while (parts.join('\n').length > charCap && parts.length > 4) parts.shift()
      body = parts.join('\n')
      if (body.length > charCap) body = `${body.slice(-charCap)}\n…（更早线上近端已截断）`
    }
    const timeHint =
      '每条前缀：有剧情锚点写 `[剧情 …｜系统 …]`；仅系统时写 `[系统 …·落库]`。'
    return (
      `【板块·线上近端·未总结∪固定原文】（并集必注全文；已去重，禁止重复阅读）` +
      `下列为未总结游标后消息与固定近端窗的并集气泡原文（${timeHint}）` +
      `重合消息只出现一次；须承接此处原话与口吻，禁止只靠长期记忆摘要续写。\n\n` +
      body
    )
  } catch {
    return ''
  }
}

function sameStoryCalendarDayMs(aMs: number, bMs: number): boolean {
  return formatGregorianStoryDayFromMs(aMs) === formatGregorianStoryDayFromMs(bMs)
}

/**
 * 约会线下：未总结私聊是否算「近端可承接」。
 * - 与故事「现在」**同一公历日**（含同晚较早时段）→ 近端，不得整段丢弃
 * - 剧情戳严格晚于/等于「现在」→ 近端
 * - 无剧情戳：系统落库晚于上一轮线下 AI → 近端
 * 跨日更早的未总结 → 往事（仍注入，禁止当此刻）
 */
export function isDatingUnsummarizedPrivateNearTerm(params: {
  storyTimeLabel?: string | null
  timestamp: number
  storyNowMs: number | null
  lastOfflineAiPlotTs: number | null
}): boolean {
  const storyMs = parseStoryAnchorLabelToMs(params.storyTimeLabel)
  const nowMs =
    typeof params.storyNowMs === 'number' && Number.isFinite(params.storyNowMs) ? params.storyNowMs : null
  if (storyMs != null && nowMs != null) {
    if (sameStoryCalendarDayMs(storyMs, nowMs)) return true
    return storyMs >= nowMs
  }
  const offlineTs = params.lastOfflineAiPlotTs
  if (offlineTs != null && Number.isFinite(offlineTs) && Number.isFinite(params.timestamp)) {
    return params.timestamp > offlineTs
  }
  return true
}

function clipUnsummarizedLinesPreferRecent(lines: string[], charCap: number): string {
  if (!lines.length) return ''
  const cap = Math.max(400, Math.floor(charCap))
  let parts = [...lines]
  while (parts.join('\n').length > cap && parts.length > 4) parts.shift()
  let body = parts.join('\n')
  if (body.length > cap) body = `${body.slice(-cap)}\n…（更早未总结私聊已截断）`
  return body
}

/** 未总结聊天摘录单块汉字硬顶（默认入参仍较小；约会等可传入更大 maxChars） */
const UNSUMMARIZED_BLOCK_CHAR_HARD_MAX = 500_000

/** 与自动总结 gather / 模型输入共用：单次最多纳入的游标后消息条数 */
export const MEMORY_UNSUMMARIZED_GATHER_MESSAGE_LIMIT = 500

/** 游标已覆盖的私聊消息原文（供语义召回索引；非长期记忆 prose 摘要） */
export async function listSummarizedPrivateChatContextLines(
  conversationKey: string,
  opts?: { maxMessages?: number },
): Promise<Array<{ line: string; timestamp: number; messageId: string }>> {
  const ck = conversationKey.trim()
  if (!ck) return []
  const cursor = await personaDb.getMemorySummaryCursorTimestamp(ck)
  if (cursor == null || !Number.isFinite(cursor)) return []
  const lim = Math.max(1, Math.min(200, Math.floor(opts?.maxMessages ?? 200)))
  const rows = await personaDb.listWeChatChatMessagesBeforeTimestampAsc({
    conversationKey: ck,
    beforeTimestampExclusive: cursor + 1,
    limit: lim,
  })
  const out: Array<{ line: string; timestamp: number; messageId: string }> = []
  for (const m of rows) {
    if (isMeetImportedWeChatMessageId(m.id)) continue
    const formatted = formatPrivateLineUnsummarized(m, { includeTimestamp: true })
    if (!formatted) continue
    const line = `- [私聊·原文] ${formatted}`
    if (line.length < 12) continue
    out.push({ line, timestamp: m.timestamp, messageId: m.id })
  }
  return out
}
/** 与自动总结模型输入、私聊 prompt「尚未总结」块共用（超出时优先保留更早未总结段，下次总结继续） */
export const MEMORY_UNSUMMARIZED_BLOCK_CHAR_CAP = 12_000

/** 合并多段文本供「关键词长期记忆」命中；规范空白并小写拉丁字母。 */
export function buildMemoryRelevanceHaystack(parts: Array<string | undefined | null>): string {
  return String(
    parts
      .map((x) => String(x ?? '').trim())
      .filter(Boolean)
      .join('\n')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase(),
  )
}

function clipOneLine(s: string, max = 220): string {
  const t = String(s ?? '')
    .replace(/\s+/g, ' ')
    .trim()
  if (t.length <= max) return t
  return `${t.slice(0, max)}…`
}

function resolveUnsummarizedFromTimestamp(
  memoryCursorTs: number | null,
  minMessageTimestamp?: number,
): number {
  const memFloor = (memoryCursorTs ?? 0) + 1
  const extraFloor =
    typeof minMessageTimestamp === 'number' && Number.isFinite(minMessageTimestamp)
      ? minMessageTimestamp + 1
      : 0
  return Math.max(memFloor, extraFloor)
}

function formatWechatUnsummarizedLineTime(m: Pick<WeChatChatMessage, 'timestamp' | 'systemRecordedAt'>): string {
  return formatSystemRecordTime(resolveMessageSystemRecordedAtMs(m))
}

/** 未总结摘录时间前缀：有剧情锚点则双写「剧情｜系统」；仅系统时标明落库，避免当剧情时刻 */
function formatUnsummarizedDualTimePrefix(
  m: Pick<WeChatChatMessage, 'timestamp' | 'systemRecordedAt' | 'storyTimeLabel'>,
): string {
  const story = m.storyTimeLabel?.trim()
  const sys = formatWechatUnsummarizedLineTime(m)
  if (story) return `[剧情 ${story}｜系统 ${sys}] `
  return `[系统 ${sys}·落库] `
}

export function formatPrivateLineUnsummarized(
  m: WeChatChatMessage,
  opts?: { includeTimestamp?: boolean; maxChars?: number },
): string | null {
  if (m.isRecalled) return null
  let raw = stripWechatGroupEventNoticePrefix(String(m.content ?? '')).trim()
  if (m.redPacket) raw = raw || '[红包]'
  if (m.transfer) raw = raw || '[转账]'
  if (m.callStatus) raw = raw || '[通话]'
  if (m.images?.length) raw = raw ? `${raw} [图片]` : '[图片]'
  if (m.voice) {
    const vt = m.voice.transcriptText?.trim() || raw || ''
    raw = vt ? `（语音）${vt}` : '（语音）'
  }
  if (!raw) return null
  const who = m.type === 'player' ? '用户' : '对方'
  const timePrefix =
    opts?.includeTimestamp && m.timestamp ? formatUnsummarizedDualTimePrefix(m) : ''
  const max =
    typeof opts?.maxChars === 'number' && Number.isFinite(opts.maxChars)
      ? Math.max(80, Math.floor(opts.maxChars))
      : 220
  return `- ${timePrefix}[私聊・${who}] ${clipOneLine(raw, max)}`
}

/**
 * 群消息写入「私聊侧」摘录时的说话人标签。
 * 禁用「你」指代当前私聊 NPC：模型易把「你」误解成真人用户，造成「把 NPC 群发言当成用户说的」。
 */
export function formatGroupSpeakerLabelForPrivateContext(
  m: WeChatChatMessage,
  group: GroupChatRow | null,
  /** 当前私聊会话对方的人设 characterId；仅在注入私聊 prompt 时传入 */
  privatePeerNpcCharacterId?: string,
): string {
  if (m.type === 'player') return '用户'
  const c = m.characterId?.trim() || ''
  if (c === WECHAT_GROUP_BOT_CHARACTER_ID) return '群管家'
  const peer = privatePeerNpcCharacterId?.trim()
  if (peer && c === peer) {
    const nick = group ? (findGroupMember(group, c)?.groupNickname || '').trim() : ''
    return nick ? `对方角色·${nick}` : '对方角色（私聊对象）'
  }
  if (group) {
    const mem = findGroupMember(group, c)
    return (mem?.groupNickname || '').trim() || c.slice(0, 12)
  }
  return c.slice(0, 12)
}

function formatGroupLineUnsummarized(
  m: WeChatChatMessage,
  group: GroupChatRow | null,
  npcCharacterId?: string,
  opts?: { includeTimestamp?: boolean },
): string | null {
  if (m.isRecalled) return null
  const gidLabel = (group?.name || '').trim() || '群聊'
  let raw = stripWechatGroupEventNoticePrefix(String(m.content ?? '')).trim()
  const extMuted = m.ext?.mutedMessageVisibleToModeratorsOnly === true
  if (extMuted) {
    return `- [群「${gidLabel}」·（禁言未展示）]（该条在群内未公开展示）`
  }
  if (m.redPacket) raw = raw || '[红包]'
  if (m.transfer) raw = raw || '[转账]'
  if (m.callStatus) raw = raw || '[通话]'
  if (m.images?.length) raw = raw ? `${raw} [图片]` : '[图片]'
  if (m.voice) {
    const vt = m.voice.transcriptText?.trim() || raw || ''
    raw = vt ? `（语音）${vt}` : '（语音）'
  }
  if (!raw) return null

  const who = formatGroupSpeakerLabelForPrivateContext(m, group, npcCharacterId)
  const timePrefix =
    opts?.includeTimestamp && m.timestamp ? formatUnsummarizedDualTimePrefix(m) : ''
  return `- ${timePrefix}[群「${gidLabel}」·${who}] ${clipOneLine(raw)}`
}

/**
 * 自上次自动总结游标之后、尚未写入长期记忆的私聊消息摘录（本地拼接，不调模型）。
 * 传入故事「现在」时按时间轴拆成「往事 / 近端」，避免跨日旧气泡被当成此刻刚聊。
 */
export async function formatUnsummarizedPrivateChatBlock(params: {
  conversationKey: string
  maxMessages?: number
  maxChars?: number
  /** 晚于记忆游标时，再抬高下限（约会：仅贴上一轮线下 AI 之后的线上段） */
  minMessageTimestamp?: number
  /** 为每条前缀公历系统落库时刻（真实生成/发送钟点，非剧情时间） */
  includeMessageTimestamps?: boolean
  /** 超长时保留较新消息（约会注入默认 true） */
  clipPreferRecent?: boolean
  /** 替换默认块尾说明 */
  footerNote?: string
  /**
   * 故事「现在」毫秒。有剧情戳且**跨日早于**此日的消息：
   * - 若同时提供 storyNowLabel / 用于拆分：标入「往事」仍注入
   * - 若仅作地板且 `dropCrossDayEarlier === true`：不注入近端（旧行为）
   */
  minStoryCalendarMs?: number | null
  /** 故事「现在」文案（有则写入对齐说明，并启用往事/近端拆分） */
  storyNowLabel?: string | null
  /** 无剧情戳时：系统落库早于该时刻的消息视为往事（通常=上一轮线下 AI） */
  lastOfflineAiPlotTs?: number | null
  /**
   * 为 true 时：跨日早于故事「现在」的消息直接丢弃（旧约会过滤）。
   * 默认 false：改为拆入「往事」块，禁止当此刻。
   */
  dropCrossDayEarlier?: boolean
}): Promise<string> {
  const ck = params.conversationKey.trim()
  if (!ck) return ''
  const cursor = await personaDb.getMemorySummaryCursorTimestamp(ck)
  const fromTs = resolveUnsummarizedFromTimestamp(cursor, params.minMessageTimestamp)
  const lim = Math.max(
    1,
    Math.min(MEMORY_UNSUMMARIZED_GATHER_MESSAGE_LIMIT, Math.floor(params.maxMessages ?? MEMORY_UNSUMMARIZED_GATHER_MESSAGE_LIMIT)),
  )
  const rows = await personaDb.listWeChatChatMessagesFromTimestampAsc({
    conversationKey: ck,
    fromTimestampInclusive: fromTs,
    limit: lim,
  })
  if (!rows.length) return ''
  const includeTs = params.includeMessageTimestamps === true
  const storyFloor =
    typeof params.minStoryCalendarMs === 'number' && Number.isFinite(params.minStoryCalendarMs)
      ? params.minStoryCalendarMs
      : null
  const storyNowLabel = String(params.storyNowLabel ?? '').trim()
  const lastOfflineTs =
    typeof params.lastOfflineAiPlotTs === 'number' && Number.isFinite(params.lastOfflineAiPlotTs)
      ? params.lastOfflineAiPlotTs
      : null
  const splitByTimeline = storyFloor != null || !!storyNowLabel || lastOfflineTs != null
  const dropEarlier = params.dropCrossDayEarlier === true

  const pastLines: string[] = []
  const nearLines: string[] = []
  const flatLines: string[] = []

  for (const m of rows) {
    if (isMeetImportedWeChatMessageId(m.id)) continue
    const storyMs = parseStoryAnchorLabelToMs(m.storyTimeLabel)
    let isPast = false
    if (storyFloor != null && storyMs != null) {
      isPast = storyMs < storyFloor && !sameStoryCalendarDayMs(storyMs, storyFloor)
    } else if (storyMs == null && lastOfflineTs != null && Number.isFinite(m.timestamp)) {
      isPast = m.timestamp < lastOfflineTs
    }
    if (dropEarlier && isPast) continue
    const line = formatPrivateLineUnsummarized(m, { includeTimestamp: includeTs })
    if (!line) continue
    if (!splitByTimeline || dropEarlier) {
      flatLines.push(line)
      continue
    }
    ;(isPast ? pastLines : nearLines).push(line)
  }

  const charCap = Math.max(
    400,
    Math.min(UNSUMMARIZED_BLOCK_CHAR_HARD_MAX, Math.floor(params.maxChars ?? MEMORY_UNSUMMARIZED_BLOCK_CHAR_CAP)),
  )
  const preferRecent = params.clipPreferRecent === true

  const clipBody = (lines: string[], cap: number): string => {
    if (!lines.length) return ''
    let body = lines.join('\n')
    if (body.length <= cap) return body
    const parts = body.split('\n')
    while (parts.join('\n').length > cap && parts.length > 4) {
      if (preferRecent) parts.shift()
      else parts.pop()
    }
    body = parts.join('\n')
    const truncNote = preferRecent ? '更早未总结私聊已截断' : '更晚未总结私聊下次总结继续'
    if (body.length > cap) {
      body = preferRecent
        ? `${body.slice(-cap)}\n…（${truncNote}）`
        : `${body.slice(0, cap)}\n…（${truncNote}）`
    }
    return body
  }

  if (splitByTimeline && !dropEarlier) {
    const pastCap = Math.floor(charCap * 0.4)
    const nearCap = charCap
    const pastBody = clipBody(pastLines, pastCap)
    const nearBody = clipBody(nearLines, nearCap)
    if (!pastBody && !nearBody) return ''
    const align =
      storyNowLabel
        ? `【剧情时间轴对齐】当前故事「现在」= **${storyNowLabel}**。下方按时间轴拆分；**禁止**把往事写成此刻刚发生。\n`
        : `【剧情时间轴对齐】下方按故事「现在」/线下锚点拆分；**禁止**把往事写成此刻刚发生。\n`
    const pastBlock = pastBody
      ? `【往事·未总结私聊（早于故事「现在」或落库早于最新线下）】\n` +
        `每条前缀：有剧情锚点为 \`[剧情 …｜系统 …]\`，否则为 \`[系统 …·落库]\`（落库≠剧情时刻）。` +
        `**仅可回溯提及，禁止写成刚刚发生、正在分别或即将离开。**\n` +
        `${pastBody}`
      : ''
    const nearBlock = nearBody
      ? `【近端·未总结私聊（与故事「现在」同日或其后）】\n` +
        `每条前缀规则同上；可与「现在」承接，仍须按前缀先后理解，勿打乱时序。\n` +
        `${nearBody}`
      : ''
    const footer =
      params.footerNote?.trim() ||
      `（↑ 未总结私聊已按剧情时间轴拆分；往事≠此刻；已总结摘要见长期记忆块。）`
    return [align.trim(), pastBlock, nearBlock, footer].filter(Boolean).join('\n\n')
  }

  if (!flatLines.length) return ''
  let body = clipBody(flatLines, charCap)
  if (!body) return ''
  const footer =
    params.footerNote?.trim() ||
    `（↑ 尚未经自动总结写入长期记忆的私聊片段；每条前缀为 \`[剧情 …｜系统 …]\` 或 \`[系统 …·落库]\`；` +
      `故事「现在」以【剧情时间轴·当前状态】为准；**跨日更早禁止写成此刻刚聊**；若与上文气泡重叠，以衔接「总结空白期」为主。）`
  return `${body}\n${footer}`
}

/**
 * 约会线下专用：纳入该角色未总结线上私聊，并按故事「现在」拆成近端 / 往事。
 *
 * - 优先：各私聊桶「记忆游标之后」的消息（真正未总结）
 * - 若游标异常导致为空：回退为该角色私聊近端原文（聊天室看得到的气泡）
 * - 跨日更早标「往事」仍注入（角色已知），**禁止**当此刻；同日较早仍算近端
 * - 已写入记忆库的摘要另走「已总结·长期记忆」
 */
export async function formatDatingUnsummarizedPrivateChatSplit(params: {
  conversationKey: string
  characterId?: string | null
  wechatAccountId?: string | null
  maxMessages?: number
  maxChars?: number
  /** 仅用于文案提示，不用于丢弃消息 */
  storyNowMs?: number | null
  lastOfflineAiPlotTs?: number | null
}): Promise<{ nearBlock: string; pastBlock: string; nearCount: number; pastCount: number }> {
  const ck = params.conversationKey.trim()
  const cid = String(params.characterId ?? '').trim()
  const acc = String(params.wechatAccountId ?? '').trim()
  const lim = Math.max(
    1,
    Math.min(
      MEMORY_UNSUMMARIZED_GATHER_MESSAGE_LIMIT,
      Math.floor(params.maxMessages ?? MEMORY_UNSUMMARIZED_GATHER_MESSAGE_LIMIT),
    ),
  )

  const byId = new Map<string, WeChatChatMessage>()
  const addMsg = (m: WeChatChatMessage) => {
    if (m.isRecalled || isMeetImportedWeChatMessageId(m.id)) return
    const mk = String(m.conversationKey ?? '').trim()
    if (mk && isWechatGroupConversationKey(mk)) return
    byId.set(m.id, m)
  }

  const keys = new Set<string>()
  if (ck && !isWechatGroupConversationKey(ck)) keys.add(ck)

  if (cid) {
    try {
      const byChar = await personaDb.listWeChatChatMessagesRecentByCharacter({
        characterId: cid,
        limit: Math.min(200, Math.max(lim, 120)),
      })
      for (const m of byChar) {
        addMsg(m)
        const mk = String(m.conversationKey ?? '').trim()
        if (mk && !isWechatGroupConversationKey(mk)) keys.add(mk)
      }
    } catch {
      /* ignore */
    }
    try {
      const distinct = await personaDb.listDistinctWeChatConversationKeysFromMessages()
      for (const raw of distinct) {
        const k = raw.trim()
        if (!k || isWechatGroupConversationKey(k)) continue
        const parsed = parsePrivateWeChatConversationCharacterAndSession(k)
        if (parsed?.characterId === cid) keys.add(k)
      }
    } catch {
      /* ignore */
    }
    if (acc) {
      try {
        const accKeys = await listPrivateConversationKeysForAccountCharacter({
          wechatAccountId: acc,
          characterId: cid,
        })
        for (const k of accKeys) keys.add(k)
      } catch {
        /* ignore */
      }
    }
  }

  for (const key of keys) {
    try {
      const rows = await personaDb.listWeChatChatMessagesByConversationKey(key)
      for (const m of rows) addMsg(m)
    } catch {
      /* ignore */
    }
  }

  const allSorted = [...byId.values()].sort((a, b) => a.timestamp - b.timestamp)
  if (!allSorted.length) return { nearBlock: '', pastBlock: '', nearCount: 0, pastCount: 0 }

  // 游标后 = 未总结；按各会话自己的游标过滤
  const cursorCache = new Map<string, number | null>()
  const afterCursor: WeChatChatMessage[] = []
  for (const m of allSorted) {
    const mk = String(m.conversationKey ?? '').trim() || ck
    if (!mk) {
      afterCursor.push(m)
      continue
    }
    let cur = cursorCache.get(mk)
    if (cur === undefined) {
      try {
        cur = await personaDb.getMemorySummaryCursorTimestamp(mk)
      } catch {
        cur = null
      }
      cursorCache.set(mk, cur)
    }
    const fromTs = resolveUnsummarizedFromTimestamp(cur ?? null)
    if (m.timestamp >= fromTs) afterCursor.push(m)
  }

  // 游标空/异常：直接用聊天室近端原文（用户眼里的「未总结」）
  const rows = (afterCursor.length ? afterCursor : allSorted).slice(-lim)

  const pastLines: string[] = []
  const nearLines: string[] = []
  const storyNowMs =
    typeof params.storyNowMs === 'number' && Number.isFinite(params.storyNowMs) ? params.storyNowMs : null
  const lastOffline =
    typeof params.lastOfflineAiPlotTs === 'number' && Number.isFinite(params.lastOfflineAiPlotTs)
      ? params.lastOfflineAiPlotTs
      : null

  for (const m of rows) {
    const line = formatPrivateLineUnsummarized(m, { includeTimestamp: true })
    if (!line) continue
    const near = isDatingUnsummarizedPrivateNearTerm({
      storyTimeLabel: m.storyTimeLabel,
      timestamp: m.timestamp,
      storyNowMs,
      lastOfflineAiPlotTs: lastOffline,
    })
    ;(near ? nearLines : pastLines).push(line)
  }
  if (!nearLines.length && !pastLines.length) {
    return { nearBlock: '', pastBlock: '', nearCount: 0, pastCount: 0 }
  }

  const charCap = Math.max(
    400,
    Math.min(UNSUMMARIZED_BLOCK_CHAR_HARD_MAX, Math.floor(params.maxChars ?? MEMORY_UNSUMMARIZED_BLOCK_CHAR_CAP)),
  )
  const usedCursor = afterCursor.length > 0
  const nearBody = clipUnsummarizedLinesPreferRecent(nearLines, charCap)
  const pastBody = clipUnsummarizedLinesPreferRecent(pastLines, Math.floor(charCap * 0.4))
  const sourceNote = usedCursor
    ? '记忆游标之后的未总结原文'
    : '会话近端原文（游标后为空时的回退）'

  const nearBlock = nearBody
    ? `【近端·未总结私聊（与故事「现在」同日或其后）】\n` +
      `与聊天室一致：${sourceNote}。每条前缀为 \`[剧情 …｜系统 …]\` 或 \`[系统 …·落库]\`；` +
      `可与线下「现在」承接。已写入记忆库的摘要见「已总结·长期记忆」。\n` +
      `${nearBody}`
    : ''

  const pastBlock = pastBody
    ? `【往事·未总结私聊（跨日早于故事「现在」，或落库早于最新线下）】\n` +
      `仍注入且角色已知，但**禁止**写成此刻刚聊、正在分别或即将离开；仅可回溯提及。\n` +
      `${pastBody}`
    : ''

  return {
    nearBlock,
    pastBlock,
    nearCount: nearLines.length,
    pastCount: pastLines.length,
  }
}

/**
 * 线上私聊：固定注入最近 N 轮「对方回复」及其间用户消息（与线下「必注全文」同级）。
 * 不依赖总结游标——游标推过后未总结块可能为空，仍须让模型看见近端气泡**原话**与剧情时间。
 *
 * 约会线下生成请传入 minMessageTimestamp / minStoryCalendarMs，避免「最新几轮」仍是
 * 数日前未总结的「要离开」而线下已推进到归来之后。
 */
export async function buildRecentPrivateChatRoundsWithTimeBlock(params: {
  conversationKey: string
  retainAiRounds?: number
  maxChars?: number
  /** 仅保留系统落库晚于此的消息（约会：上一轮线下 AI 之后） */
  minMessageTimestamp?: number | null
  /**
   * 故事「现在」毫秒。有剧情戳且**跨日早于**此日的消息不进近端窗
   *（同日较早时段仍保留；无剧情戳时仍可靠 minMessageTimestamp 过滤）。
   */
  minStoryCalendarMs?: number | null
}): Promise<string> {
  const ck = params.conversationKey.trim()
  if (!ck) return ''
  const rounds = Math.max(
    0,
    Math.min(
      MEMORY_RECENT_PRIVATE_CHAT_INJECT_AI_ROUNDS_MAX,
      Math.floor(params.retainAiRounds ?? MEMORY_RECENT_PRIVATE_CHAT_INJECT_AI_ROUNDS),
    ),
  )
  if (rounds <= 0) return ''
  try {
    const all = await personaDb.listWeChatChatMessagesByConversationKey(ck)
    const wallFloor =
      typeof params.minMessageTimestamp === 'number' && Number.isFinite(params.minMessageTimestamp)
        ? params.minMessageTimestamp
        : null
    const storyFloor =
      typeof params.minStoryCalendarMs === 'number' && Number.isFinite(params.minStoryCalendarMs)
        ? params.minStoryCalendarMs
        : null
    const usable = all.filter((m) => {
      if (m.isRecalled || isMeetImportedWeChatMessageId(m.id)) return false
      if (wallFloor != null && !(m.timestamp > wallFloor)) return false
      if (storyFloor != null) {
        const storyMs = parseStoryAnchorLabelToMs(m.storyTimeLabel)
        // 同日较早仍保留；仅剔除跨日更早
        if (
          storyMs != null &&
          storyMs < storyFloor &&
          !sameStoryCalendarDayMs(storyMs, storyFloor)
        ) {
          return false
        }
      }
      return true
    })
    if (!usable.length) return ''
    const window = selectRecentWeChatMessagesAiRoundWindow(usable, rounds)
    if (!window.length) return ''
    const lines: string[] = []
    for (const m of window) {
      // 固定注入要保留近端原话，单条放宽截断（未总结块仍用默认短截）
      const line = formatPrivateLineUnsummarized(m, { includeTimestamp: true, maxChars: 2000 })
      if (line) lines.push(line)
    }
    if (!lines.length) return ''
    let body = lines.join('\n')
    const charCap = Math.max(
      800,
      Math.min(UNSUMMARIZED_BLOCK_CHAR_HARD_MAX, Math.floor(params.maxChars ?? 14_000)),
    )
    if (body.length > charCap) {
      const parts = body.split('\n')
      while (parts.join('\n').length > charCap && parts.length > 4) parts.shift()
      body = parts.join('\n')
      if (body.length > charCap) body = `${body.slice(-charCap)}\n…（更早近端私聊已截断）`
    }
    const filterNote =
      wallFloor != null || storyFloor != null
        ? '已剔除跨日早于故事「现在」/上一轮线下墙钟之前的气泡（同日较早仍保留）。'
        : ''
    const timeHint =
      '每条前缀：有剧情锚点写 `[剧情 …｜系统 …]`（左侧为故事内时刻，须按此理解先后）；仅系统时写 `[系统 …·落库]`（真实落库，**不是**剧情时间）。'
    return (
      `【板块·近端·最近 ${rounds} 轮线上私聊原文】（必注全文；不依赖总结游标）` +
      `下列为最近 ${rounds} 轮**对方角色回复**及其间用户消息的气泡原文（${timeHint}）${filterNote}` +
      `总结入库后未总结块可能为空，仍须承接此处原话与口吻，禁止只靠长期记忆摘要续写或声称「不记得原话」。\n\n` +
      body
    )
  } catch {
    return ''
  }
}

function formatGapHintFromMs(gapMs: number): string {
  const gapMin = Math.round(Math.max(0, gapMs) / 60_000)
  if (gapMin >= 120) return `约 ${Math.round(gapMin / 60)} 小时`
  if (gapMin >= 15) return `约 ${gapMin} 分钟`
  if (gapMin >= 3) return `约 ${gapMin} 分钟（较短）`
  if (gapMin >= 1) return `约 1～2 分钟`
  return '几乎刚发生 / 连着聊'
}

function resolveMessageStoryOrClockMs(m: WeChatChatMessage): number {
  const storyMs = parseStoryAnchorLabelToMs(m.storyTimeLabel)
  if (storyMs != null) return storyMs
  const ts = typeof m.timestamp === 'number' && Number.isFinite(m.timestamp) ? m.timestamp : 0
  return ts
}

function formatMessageTimeLabel(m: WeChatChatMessage): string {
  return m.storyTimeLabel?.trim() || formatWechatUnsummarizedLineTime(m)
}

/**
 * 线上私聊：对照「当前剧情现在」与最近用户/对方消息，明示双方未回复间隔。
 * 覆盖「用户发完又调时钟再等角色回」：须用当前时钟 vs 用户最后一条，而非只比相邻两条。
 */
export async function buildLastOnlineChatContinuityNote(params: {
  conversationKey: string
  /** 当前剧情「现在」文案（来自剧情轴） */
  currentStoryLabel?: string | null
  /** 当前线上时钟毫秒（自定义/剧情时钟优先） */
  currentTimeMs?: number | null
}): Promise<string> {
  const ck = params.conversationKey.trim()
  if (!ck) return ''
  try {
    const rows = await personaDb.listWeChatChatMessagesByConversationKey(ck)
    const usable = rows
      .filter((m) => !m.isRecalled && !isMeetImportedWeChatMessageId(m.id))
      .sort((a, b) => a.timestamp - b.timestamp)
    if (!usable.length) return ''

    const lastUser = [...usable].reverse().find((m) => m.type === 'player')
    const lastChar = [...usable].reverse().find((m) => m.type === 'character')
    const latest = usable[usable.length - 1]!

    const nowFromLabel = parseStoryAnchorLabelToMs(params.currentStoryLabel)
    const nowMs =
      (typeof params.currentTimeMs === 'number' && Number.isFinite(params.currentTimeMs)
        ? params.currentTimeMs
        : null) ??
      nowFromLabel ??
      resolveMessageStoryOrClockMs(latest)

    const nowLabel =
      params.currentStoryLabel?.trim() ||
      formatSystemRecordTime(nowMs) ||
      formatMessageTimeLabel(latest)

    const lines = [`【线上私聊·时间感知】`, `- 当前剧情「现在」：${nowLabel}`]

    if (lastUser) {
      const userMs = resolveMessageStoryOrClockMs(lastUser)
      const sinceUser = formatGapHintFromMs(nowMs - userMs)
      lines.push(`- 用户最近一条：${formatMessageTimeLabel(lastUser)}（距「现在」已过 ${sinceUser}）`)
    }
    if (lastChar) {
      const charMs = resolveMessageStoryOrClockMs(lastChar)
      const sinceChar = formatGapHintFromMs(nowMs - charMs)
      lines.push(`- 你（对方）最近一条：${formatMessageTimeLabel(lastChar)}（距「现在」已过 ${sinceChar}）`)
    }

    if (latest.type === 'player' && lastUser) {
      const wait = formatGapHintFromMs(nowMs - resolveMessageStoryOrClockMs(lastUser))
      lines.push(
        `- **待回复**：最新消息来自用户；若距「现在」已明显过去（本轮约 ${wait}），须体现你刚看到/隔了一会儿才回，**禁止**装作秒回或不知用户等了多久。`,
      )
    } else if (latest.type === 'character' && lastChar && lastUser) {
      const userAfterChar =
        resolveMessageStoryOrClockMs(lastUser) > resolveMessageStoryOrClockMs(lastChar)
      if (userAfterChar) {
        const gap = formatGapHintFromMs(
          resolveMessageStoryOrClockMs(lastUser) - resolveMessageStoryOrClockMs(lastChar),
        )
        lines.push(
          `- **用户回你间隔**：用户在你上一条之后隔了约 ${gap} 才发来；可自然接这个间隔（忙完才回/隔了会儿），勿当成无缝连聊。`,
        )
      }
    }

    lines.push(
      `- 须按真实间隔理解（刚分别不久 / 已过数小时 / 隔日再聊等）；**禁止**装作不知刚线下见过，也**禁止**把数小时前的作息当「此刻刚醒」。`,
    )
    return lines.join('\n')
  } catch {
    return ''
  }
}

/**
 * 游标后无未总结私聊时：按角色聚合最近私聊气泡，供线下剧情承接口吻（与 ChatRoom 近期参考同源思路）。
 */
export async function formatRecentPrivateChatReferenceByCharacter(params: {
  characterId: string
  maxMessages?: number
  maxChars?: number
}): Promise<string> {
  const cid = params.characterId.trim()
  if (!cid) return ''
  const lim = Math.max(1, Math.min(120, Math.floor(params.maxMessages ?? 48)))
  const rows = await personaDb.listWeChatChatMessagesRecentByCharacter({ characterId: cid, limit: lim })
  if (!rows.length) return ''
  const lines: string[] = []
  for (const m of rows) {
    if (isMeetImportedWeChatMessageId(m.id)) continue
    const line = formatPrivateLineUnsummarized(m)
    if (line) lines.push(line)
  }
  if (!lines.length) return ''
  let body = lines.join('\n')
  const charCap = Math.max(400, Math.min(UNSUMMARIZED_BLOCK_CHAR_HARD_MAX, Math.floor(params.maxChars ?? 3200)))
  if (body.length > charCap) {
    const parts = body.split('\n')
    while (parts.join('\n').length > charCap && parts.length > 4) parts.shift()
    body = parts.join('\n')
    if (body.length > charCap) body = `${body.slice(-charCap)}\n…（更早私聊已截断）`
  }
  return `${body}\n（↑ 近期私聊参考（本地消息摘录）；游标后暂无未总结片段时兜底，供线下剧情承接口吻与事实。）`
}

/**
 * 当前群会话：游标之后尚未写入群聊长期总结的本地消息摘录。
 */
export async function formatUnsummarizedCurrentGroupChatBlock(params: {
  groupId: string
  playerIdentityId: string
  group: GroupChatRow | null
  maxMessages?: number
  maxChars?: number
}): Promise<string> {
  const gid = params.groupId.trim()
  const pid = params.playerIdentityId.trim()
  if (!gid || !pid || pid === '__none__') return ''
  const ck = wechatGroupConversationKey(gid, pid)
  const cursor = await personaDb.getMemorySummaryCursorTimestamp(ck)
  const fromTs = (cursor ?? 0) + 1
  const lim = Math.max(
    1,
    Math.min(MEMORY_UNSUMMARIZED_GATHER_MESSAGE_LIMIT, Math.floor(params.maxMessages ?? MEMORY_UNSUMMARIZED_GATHER_MESSAGE_LIMIT)),
  )
  const rows = await personaDb.listWeChatChatMessagesFromTimestampAsc({
    conversationKey: ck,
    fromTimestampInclusive: fromTs,
    limit: lim,
  })
  if (!rows.length) return ''
  const lines: string[] = []
  for (const m of rows) {
    const line = formatGroupLineUnsummarized(m, params.group, undefined)
    if (line) lines.push(line)
  }
  if (!lines.length) return ''
  let body = lines.join('\n')
  const charCap = Math.max(400, Math.min(UNSUMMARIZED_BLOCK_CHAR_HARD_MAX, Math.floor(params.maxChars ?? 3600)))
  if (body.length > charCap) {
    const parts = body.split('\n')
    while (parts.join('\n').length > charCap && parts.length > 4) parts.shift()
    body = parts.join('\n')
    if (body.length > charCap) body = `${body.slice(-charCap)}\n…（更早未总结群聊已截断）`
  }
  return `${body}\n（↑ 本群尚未经自动总结落库的长期记忆材料；与气泡历史可能部分重叠。）`
}

/**
 * 私聊侧：该 NPC 与用户共同参与的各群中，游标之后未总结的群消息合并摘录。
 */
export async function buildNpcGroupChatsUnsummarizedDigestForPrivatePrompt(params: {
  npcCharacterId: string
  sessionPlayerIdentityId: string
  boundPlayerIdentityId?: string | null | undefined
  /** 与 {@link buildNpcGroupChatsRecentDigestForPrivatePrompt} 同源：优先铺该群未总结片段 */
  anchorGroupId?: string | null | undefined
  maxMessagesPerGroup?: number
  charCap?: number
  minMessageTimestamp?: number
  includeMessageTimestamps?: boolean
  groupFooterNote?: string
}): Promise<string> {
  const npcId = params.npcCharacterId.trim()
  if (!npcId) return ''

  const sid = params.sessionPlayerIdentityId.trim()
  const bid = params.boundPlayerIdentityId?.trim()
  const boundDiffersSession =
    !!bid && bid !== '__none__' && !!sid && sid !== '__none__' && bid !== sid
  const pid = boundDiffersSession ? bid! : sid
  if (!pid || pid === '__none__') return ''

  let groups: GroupChatRow[] = []
  try {
    groups = await personaDb.listGroupChatsForPlayerIdentity(pid)
  } catch {
    return ''
  }
  const relevant = groups.filter((g) => (g.members ?? []).some((m) => m.charId === npcId))
  if (!relevant.length) return ''

  const groupById = new Map(relevant.map((g) => [g.id.trim(), g]))
  const perLim = Math.max(8, Math.min(120, Math.floor(params.maxMessagesPerGroup ?? 60)))
  const charCapTotal = Math.max(800, Math.min(UNSUMMARIZED_BLOCK_CHAR_HARD_MAX, Math.floor(params.charCap ?? 4200)))
  const includeTs = params.includeMessageTimestamps === true
  const groupLineOpts = { includeTimestamp: includeTs }
  const defaultGroupFooter =
    params.groupFooterNote?.trim() ||
    `（↑ 各群「自动总结游标」之后尚未落库为长期记忆的片段；私聊回复时请承接群内语境。）\n【说话人｜勿混淆】前缀「用户」仅指真人玩家本人；「对方角色·某某」表示**当前私聊对象（会话对方角色）**在该群的发言，**不是**用户。**禁止**把对方角色在群里的原话误当成用户说的（例如不可写「你刚才在群里嚷着吃火锅」若实为对方角色发的）。其他群成员仅用群内昵称标注。\n`

  const anchorGid = params.anchorGroupId?.trim()
  if (anchorGid) {
    const anchorRow = relevant.find((g) => g.id.trim() === anchorGid)
    if (anchorRow && (anchorRow.members ?? []).some((m) => m.charId.trim() === npcId)) {
      const anchorCk = wechatGroupConversationKey(anchorGid, pid)
      let anchorBatch: WeChatChatMessage[] = []
      try {
        const cursor = await personaDb.getMemorySummaryCursorTimestamp(anchorCk)
        const fromTs = resolveUnsummarizedFromTimestamp(cursor, params.minMessageTimestamp)
        anchorBatch = await personaDb.listWeChatChatMessagesFromTimestampAsc({
          conversationKey: anchorCk,
          fromTimestampInclusive: fromTs,
          limit: perLim,
        })
      } catch {
        anchorBatch = []
      }
      const anchorLines: string[] = []
      for (const m of anchorBatch.sort((a, b) => a.timestamp - b.timestamp)) {
        const line = formatGroupLineUnsummarized(m, anchorRow, npcId, groupLineOpts)
        if (line) anchorLines.push(line)
      }
      const merged: WeChatChatMessage[] = []
      for (const g of relevant) {
        if (g.id.trim() === anchorGid) continue
        const ck = wechatGroupConversationKey(g.id, pid)
        try {
          const cursor = await personaDb.getMemorySummaryCursorTimestamp(ck)
          const fromTs = resolveUnsummarizedFromTimestamp(cursor, params.minMessageTimestamp)
          const batch = await personaDb.listWeChatChatMessagesFromTimestampAsc({
            conversationKey: ck,
            fromTimestampInclusive: fromTs,
            limit: perLim,
          })
          merged.push(...batch)
        } catch {
          /* ignore */
        }
      }
      const otherLines: string[] = []
      for (const m of merged.sort((a, b) => a.timestamp - b.timestamp)) {
        const gkey = parseGroupIdFromConversationKey(m.conversationKey)
        const g = gkey ? groupById.get(gkey) ?? null : null
        const line = formatGroupLineUnsummarized(m, g, npcId, groupLineOpts)
        if (line) otherLines.push(line)
      }

      const anchorBudget = Math.floor(charCapTotal * 0.72)
      let anchorBody = anchorLines.join('\n')
      if (anchorBody.length > anchorBudget) {
        const parts = anchorBody.split('\n')
        while (parts.join('\n').length > anchorBudget && parts.length > 4) parts.shift()
        anchorBody = parts.join('\n')
        if (anchorBody.length > anchorBudget) anchorBody = `${anchorBody.slice(-anchorBudget)}\n…（该群未总结片段已截断）`
      }
      let rest = otherLines.join('\n')
      const restBudget = charCapTotal - anchorBody.length - 80
      if (rest.length > restBudget && restBudget > 200) {
        const parts = rest.split('\n')
        while (parts.join('\n').length > restBudget && parts.length > 4) parts.shift()
        rest = parts.join('\n')
        if (rest.length > restBudget) rest = `${rest.slice(-restBudget)}\n…（其它群未总结已截断）`
      } else if (restBudget <= 200) {
        rest = ''
      }

      const gname = (anchorRow.remark || anchorRow.name || '').trim() || '该群'
      const chunks: string[] = []
      if (anchorBody.trim()) {
        chunks.push(
          `【优先：群「${gname}」内、自动总结游标之后尚未落库的长期记忆材料】\n${anchorBody.trim()}`,
        )
      }
      if (rest.trim()) {
        chunks.push(`【其它共同群·未总结节选】\n${rest.trim()}`)
      }
      if (!chunks.length) return ''
      let body = chunks.join('\n\n')
      if (body.length > charCapTotal) {
        body = `${body.slice(0, charCapTotal)}\n…（总长已截断）`
      }
      return `${body}\n（↑ 含你们离开群聊前该群的未总结片段；私聊回复时请承接群内语境。）\n【说话人｜勿混淆】前缀「用户」仅指真人玩家本人；「对方角色·某某」表示**当前私聊对象（会话对方角色）**在该群的发言，**不是**用户。**禁止**把对方角色在群里的原话误当成用户说的。其他群成员仅用群内昵称标注。\n`
    }
  }

  const merged: WeChatChatMessage[] = []
  for (const g of relevant) {
    const ck = wechatGroupConversationKey(g.id, pid)
    try {
      const cursor = await personaDb.getMemorySummaryCursorTimestamp(ck)
      const fromTs = resolveUnsummarizedFromTimestamp(cursor, params.minMessageTimestamp)
      const batch = await personaDb.listWeChatChatMessagesFromTimestampAsc({
        conversationKey: ck,
        fromTimestampInclusive: fromTs,
        limit: perLim,
      })
      merged.push(...batch)
    } catch {
      /* ignore */
    }
  }
  if (!merged.length) return ''

  const sorted = merged.sort((a, b) => a.timestamp - b.timestamp)
  const lines: string[] = []
  for (const m of sorted) {
    const gkey = parseGroupIdFromConversationKey(m.conversationKey)
    const g = gkey ? groupById.get(gkey) ?? null : null
    const line = formatGroupLineUnsummarized(m, g, npcId, groupLineOpts)
    if (line) lines.push(line)
  }
  if (!lines.length) return ''

  let body = lines.join('\n')
  const charCap = Math.max(800, Math.min(UNSUMMARIZED_BLOCK_CHAR_HARD_MAX, Math.floor(params.charCap ?? 4200)))
  if (body.length > charCap) {
    const parts = body.split('\n')
    while (parts.join('\n').length > charCap && parts.length > 8) parts.shift()
    body = parts.join('\n')
    if (body.length > charCap) body = `${body.slice(-charCap)}\n…（更早未总结群聊已截断）`
  }
  return `${body}\n${defaultGroupFooter}`
}

/**
 * 群聊多角色：某位 NPC 与用户私聊（可能含绑定身份会话）中、游标后尚未总结的合并摘录。
 */
export async function formatUnsummarizedPrivateDigestForGroupMember(params: {
  npcCharacterId: string
  sessionPlayerIdentityId: string
  boundPlayerIdentityId?: string | null | undefined
  /** 与 {@link buildNpcPrivateChatDigestForGroupPrompt} 的 anchorPrivateBoost 同源 */
  anchorPrivateBoost?: boolean
  maxMessagesPerKey?: number
  charCap?: number
}): Promise<string> {
  const cid = params.npcCharacterId.trim()
  if (!cid) return ''

  const keys = new Set<string>()
  const sid = params.sessionPlayerIdentityId.trim()
  const bid = params.boundPlayerIdentityId?.trim()
  const boundDiffersSession =
    !!bid && bid !== '__none__' && !!sid && sid !== '__none__' && bid !== sid

  if (boundDiffersSession) {
    keys.add(wechatConversationKey(cid, bid))
  } else {
    if (sid && sid !== '__none__') keys.add(wechatConversationKey(cid, sid))
    if (bid && bid !== '__none__' && bid !== sid) keys.add(wechatConversationKey(cid, bid))
  }

  if (!keys.size) return ''

  const boost = params.anchorPrivateBoost === true
  const baseLim = Math.max(4, Math.min(120, Math.floor(params.maxMessagesPerKey ?? 48)))
  const perLim = boost ? Math.min(120, Math.floor(baseLim * 1.35)) : baseLim
  const merged = new Map<string, WeChatChatMessage>()
  for (const ck of keys) {
    try {
      const cursor = await personaDb.getMemorySummaryCursorTimestamp(ck)
      const fromTs = (cursor ?? 0) + 1
      const batch = await personaDb.listWeChatChatMessagesFromTimestampAsc({
        conversationKey: ck,
        fromTimestampInclusive: fromTs,
        limit: perLim,
      })
      for (const m of batch) merged.set(m.id, m)
    } catch {
      /* ignore */
    }
  }
  if (!merged.size) return ''

  const sorted = [...merged.values()].sort((a, b) => a.timestamp - b.timestamp)
  const lines: string[] = []
  for (const m of sorted) {
    const line = formatPrivateLineUnsummarized(m)
    if (line) lines.push(line)
  }
  if (!lines.length) return ''

  let body = lines.join('\n')
  const baseCap = Math.max(400, Math.min(UNSUMMARIZED_BLOCK_CHAR_HARD_MAX, Math.floor(params.charCap ?? 2800)))
  const charCap = boost ? Math.min(UNSUMMARIZED_BLOCK_CHAR_HARD_MAX, Math.floor(baseCap * 1.45)) : baseCap
  if (body.length > charCap) {
    const parts = body.split('\n')
    while (parts.join('\n').length > charCap && parts.length > 4) parts.shift()
    body = parts.join('\n')
    if (body.length > charCap) body = `${body.slice(-charCap)}\n…（更早未总结私聊已截断）`
  }
  return `${body}\n（↑ 与该用户私聊中尚未写入长期记忆的片段；**仅本角色视角**知晓，勿在群内当众宣读私密细节。）`
}
