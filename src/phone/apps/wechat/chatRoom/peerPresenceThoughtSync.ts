import type { ApiConfig } from '../../api/types'
import { openAiCompatibleChat } from '../newFriendsPersona/ai'
import { personaDb } from '../newFriendsPersona/idb'
import type { Character } from '../newFriendsPersona/types'
import { resolveAutoSummaryApiConfigFromSettings } from '../memory/memorySummaryApi'
import type { FriendPresence } from '../messagesPulse/types'
import {
  DEFAULT_PEER_PRESENCE_THOUGHT,
  dispatchPeerPresenceThoughtToast,
  loadPeerPresenceAutoUpdate,
  loadPeerPresenceThought,
  savePeerPresenceThought,
  type PeerPresenceThoughtStatus,
} from './peerPresenceThoughtStorage'

const LATEST_BODY_MAX_CHARS = 4500
/** 想法对外状态文案：极短，朋友圈式 */
const THOUGHT_TEXT_MAX = 12
/**
 * 想法软冷却：冷却期内默认少换文案；
 * 若在线档位或活动场景明显切换，仍允许换想法（不硬锁死）。
 */
const THOUGHT_SOFT_COOLDOWN_MS = 12 * 60_000

const PRESENCE_LABEL_CN: Record<FriendPresence, string> = {
  online: '在线',
  away: '离开',
  offline: '离线',
}

/** 拒绝私聊口吻 / 对「你」说话的想法 */
function sanitizePublicThoughtText(raw: string, opts?: { allowUserDirected?: boolean }): string {
  let t = String(raw ?? '')
    .trim()
    .replace(/^["'「『]|["'」』]$/g, '')
    .slice(0, THOUGHT_TEXT_MAX)
  if (!t) return ''
  // 面向列表的公开状态，禁止点名用户、邀约私聊句（用户点名挂「我爱你」类文案时放行）
  if (!opts?.allowUserDirected) {
    if (
      /接你|给你|陪你|找你|约你|等你|爱你|想你|哄你|带你|喊你|叫你|回你|回复你|私聊|今晚见|来接/.test(
        t,
      ) ||
      /^(你|您)/.test(t)
    ) {
      return ''
    }
  } else if (/^(你|您)/.test(t) || /私聊|回你消息|回复你/.test(t)) {
    return ''
  }
  return t
}

export type PeerPresenceThoughtAiPatch = {
  shouldUpdate: boolean
  presence: FriendPresence
  presenceLabel: string
  thoughtEmoji: string
  thoughtText: string
}

export type PeerPresenceThoughtSyncOutcome =
  | { status: 'skipped'; reason: string }
  | { status: 'no_change' }
  | { status: 'applied'; statusSnapshot: PeerPresenceThoughtStatus }
  | { status: 'failed'; reason: string }

function stripFences(raw: string): string {
  return String(raw ?? '')
    .replace(/^```(?:[\w-]*)?\s*\n?/i, '')
    .replace(/\n?```\s*$/i, '')
    .trim()
}

function fieldLine(block: string, keys: string[]): string {
  const lines = block.split(/\r?\n/)
  for (const key of keys) {
    const re = new RegExp(`^\\s*${key}\\s*[:：]\\s*(.*)$`, 'i')
    for (const line of lines) {
      const m = re.exec(line.trim())
      if (!m) continue
      return (m[1] ?? '').trim()
    }
  }
  return ''
}

function extractPresenceBlock(raw: string): string {
  const text = stripFences(raw)
  const m = text.match(/\[PRESENCE\]([\s\S]*?)(?=\n\s*\[[A-Z_]+\]|$)/i)
  if (m) return (m[1] ?? '').trim()
  // 模型漏写块头时：整段按字段行解析
  if (/^\s*(?:更新|在线|状态|活动|想法)/m.test(text)) return text.trim()
  return text.trim()
}

function normalizePresence(raw: string): FriendPresence | null {
  const s = raw.trim().toLowerCase()
  if (!s) return null
  if (s === 'online' || s === '在线' || s.includes('在线')) return 'online'
  if (s === 'away' || s === '离开' || s === '忙碌' || s.includes('离开') || s.includes('忙碌')) return 'away'
  if (s === 'offline' || s === '离线' || s === '隐身' || s.includes('离线') || s.includes('隐身')) {
    return 'offline'
  }
  return null
}

function parseYesNo(raw: string): boolean | null {
  const s = raw.trim().toLowerCase()
  if (!s) return null
  if (/^(是|要|更新|true|yes|1|y)$/i.test(s)) return true
  if (/^(否|不|无需|不用|false|no|0|n)$/i.test(s)) return false
  if (s.includes('无需') || s.includes('不更新') || s.includes('不用')) return false
  if (s.includes('更新') || s.includes('需要')) return true
  return null
}

/** 解析稳定 markup（禁止依赖 JSON） */
export function parsePeerPresenceThoughtAiMarkup(raw: string): PeerPresenceThoughtAiPatch | null {
  const block = extractPresenceBlock(raw)
  if (!block) return null

  const shouldUpdate =
    parseYesNo(fieldLine(block, ['更新', '是否更新', 'need_update', 'should_update', 'update'])) ?? false

  const presence =
    normalizePresence(fieldLine(block, ['在线', '状态', 'presence', 'online'])) ?? 'offline'

  const presenceLabel = fieldLine(block, ['活动', '活动文案', 'presence_label', 'activity']).slice(0, 8)

  const thoughtEmoji = fieldLine(block, ['想法表情', '表情', 'thought_emoji', 'emoji']).slice(0, 16)

  const thoughtText = sanitizePublicThoughtText(
    fieldLine(block, ['想法', '想法文案', 'thought_text', 'thought', 'status']),
  )

  return { shouldUpdate, presence, presenceLabel, thoughtEmoji, thoughtText }
}

/** @deprecated 旧名；请用 parsePeerPresenceThoughtAiMarkup */
export const parsePeerPresenceThoughtAiJson = parsePeerPresenceThoughtAiMarkup

function buildPeerPresenceThoughtPerRoundSystemPrompt(): string {
  return `
你是「角色在线状态与想法」判断助手。用户会提供角色当前状态快照，以及**仅本轮**最新回复/剧情正文。
你的任务：判断角色此刻对外展示的在线状态 / 活动 / 想法是否值得改；默认不改。

【想法是什么】
- 想法 = 角色发在「自己状态列表 / 朋友圈式状态」上的短文案，所有好友可见。
- **不是**私聊对用户说的话，**不是**约会邀约，**不是**心里独白长句。
- 文案要短：≤8 个汉字（可带感叹号），像状态贴纸。
- 正例：「准备吃饭」「快收工！」「困了」「加班中」「出门」「到家了」
- 反例（禁止）：「收工后接你去吃饭」「想你了」「等你回消息」「今晚陪你逛街」

【更新频率】
- **默认「更新：否」**。同场景续聊、语气微调、纯闲聊 → 不更新。
- 在线档位或活动场景**明显切换**时才「更新：是」（如下班→吃饭、出门→到家、清醒→睡觉）。
- **想法宜稳**：不要每轮换；场景未大变时照抄快照或留空表示不改。
- 若提示「想法宜稳」：优先保留原想法；但场景已明显切换时，仍可换成匹配新场景的短状态句。
- **用户点名例外（最高优先）**：若材料写明用户明确要求改在线/活动/想法，或提示「用户点名须更新」→ **必须「更新：是」**。请**自行阅读用户原话**，智能理解对方想挂的想法/活动文案：有具体语句则尽量原样写入「想法」字段（可略去引号），禁止擅自改成出门/加班等无关短句；仅要求「改一下想法」而未给文案时，再结合本轮角色回复语气自拟贴切短句。此时忽略「想法宜稳 / 默认不改」。

【字段】
- 在线：只能「在线」「离开」「离线」。
- 活动：≤8 字，如「工作中」「听歌中」；无则留空。
- 想法表情：一个 emoji；无则留空。
- 想法：≤8 字公开状态短句；无则留空。用户点名挂表白/昵称类短句时允许；仍禁止「你/您」开头的对用户喊话长句。

【输出格式】禁止 JSON、禁止 markdown 代码围栏、禁止前后解释。只输出：

[PRESENCE]
更新：是
在线：离开
活动：工作中
想法表情：😮
想法：快收工！

无变化时只输出：

[PRESENCE]
更新：否
`.trim()
}

function formatCurrentSnapshotMarkup(cur: PeerPresenceThoughtStatus): string {
  return [
    '[PRESENCE]',
    `在线：${PRESENCE_LABEL_CN[cur.presence] ?? cur.presence}`,
    `活动：${cur.presenceLabel || '（空）'}`,
    `想法表情：${cur.thoughtEmoji || '（空）'}`,
    `想法：${cur.thoughtText || '（空）'}`,
  ].join('\n')
}

export async function requestPeerPresenceThoughtPerRoundPatch(params: {
  apiConfig: ApiConfig | null
  character: Character
  latestRoundBody: string
  current: PeerPresenceThoughtStatus
  /** 用户本轮明确要求改状态/想法 */
  userRequested?: boolean
  userRequestText?: string
}): Promise<PeerPresenceThoughtAiPatch | null> {
  const ch = params.character
  if (!ch?.id?.trim()) return null

  const settings = await personaDb.getMemorySettings()
  const cfg = resolveAutoSummaryApiConfigFromSettings(settings, params.apiConfig)
  if (!cfg?.apiUrl?.trim() || !cfg.apiKey?.trim() || !cfg.modelId?.trim()) {
    throw new Error('未配置自动总结 / 状态判断 API（记忆配置页）')
  }

  let latest = String(params.latestRoundBody ?? '').trim()
  if (!latest || latest.length < 4) return null
  if (latest.length > LATEST_BODY_MAX_CHARS) {
    latest = `${latest.slice(0, LATEST_BODY_MAX_CHARS)}\n\n（以下因长度已截断）`
  }

  const name = String(ch.name ?? ch.wechatNickname ?? '').trim() || '角色'
  const cur = params.current
  const userRequested = !!params.userRequested
  const thoughtSoftCooldown =
    !userRequested &&
    (cur.thoughtUpdatedAt ?? cur.updatedAt) > 0 &&
    Date.now() - (cur.thoughtUpdatedAt ?? cur.updatedAt) < THOUGHT_SOFT_COOLDOWN_MS &&
    !!(cur.thoughtText || cur.thoughtEmoji)
  const userContent = [
    '【角色】',
    `${name}（id=${ch.id.trim()}）`,
    '',
    '【当前对外状态快照】',
    formatCurrentSnapshotMarkup(cur),
    '',
    userRequested
      ? [
          '【用户点名须更新 · 最高优先】',
          '用户本轮明确要求角色更改在线状态和/或想法。你必须输出「更新：是」。',
          '请自行阅读下方「用户原话」，智能判断对方想改哪一项、想法应写成什么短句；有具体内容则尽量原样写入「想法」，勿改写成无关状态。',
          '未点名的字段可保留快照。',
          params.userRequestText?.trim()
            ? `用户原话：\n${params.userRequestText.trim().slice(0, 400)}`
            : '',
        ]
          .filter(Boolean)
          .join('\n')
      : thoughtSoftCooldown
        ? '【想法宜稳】距上次想法更新未久：优先保留原想法；仅当在线/活动场景明显切换时，才可换成匹配新场景的短状态句。'
        : '【提醒】想法是公开状态短句（如「准备吃饭」），不是对用户说的话；无大场景变化请「更新：否」。',
    '',
    '【本轮最新回复 / 剧情正文（仅此一轮，勿臆造未出现事实）】',
    latest,
    '',
    userRequested
      ? '必须「更新：是」；想法文案由你根据用户原话智能判定。禁止 JSON。'
      : '无变化则输出「更新：否」。禁止 JSON。',
  ].join('\n')

  const raw = await openAiCompatibleChat(cfg, [
    { role: 'system', content: buildPeerPresenceThoughtPerRoundSystemPrompt() },
    { role: 'user', content: userContent },
  ])
  if (!raw.trim()) {
    throw new Error('在线状态判断模型返回为空')
  }
  return parsePeerPresenceThoughtAiMarkup(raw)
}

/**
 * 每轮 AI 落库后：若会话开启「角色自行更新在线状态与想法」，则额外请求一次判断（与尾声延展同模式）。
 * force / userRequested：用户点名改状态时跳过开关与想法软冷却。
 */
export async function finalizePeerPresenceThoughtPerAiRound(params: {
  apiConfig: ApiConfig | null
  conversationKey: string
  character: Character | null
  latestRoundBody: string
  displayName?: string
  force?: boolean
  /** 用户明确要求改在线/想法 */
  userRequested?: boolean
  userRequestText?: string
}): Promise<PeerPresenceThoughtSyncOutcome> {
  const ch = params.character
  const cid = ch?.id?.trim() || ''
  if (!cid || !ch) return { status: 'skipped', reason: '无人设' }

  const ck = params.conversationKey.trim()
  const userRequested = !!params.userRequested
  if (!params.force && !userRequested) {
    if (!ck) return { status: 'skipped', reason: '无会话' }
    const enabled = await loadPeerPresenceAutoUpdate(ck)
    if (!enabled) return { status: 'skipped', reason: '未开启自行更新' }
  }

  const latest = String(params.latestRoundBody ?? '').trim()
  if (!latest || latest.length < 4) return { status: 'skipped', reason: '本轮正文过短' }

  try {
    const current = await loadPeerPresenceThought(cid)
    const patch = await requestPeerPresenceThoughtPerRoundPatch({
      apiConfig: params.apiConfig,
      character: ch,
      latestRoundBody: latest,
      current,
      userRequested,
      userRequestText: params.userRequestText,
    })
    if (!patch) return { status: 'skipped', reason: '无法解析' }
    if (!patch.shouldUpdate && !userRequested) return { status: 'no_change' }
    // 用户点名但模型仍否：强制按本轮正文再判一次不够时，至少抬到「更新」并保留可用字段
    const effectivePatch =
      !patch.shouldUpdate && userRequested
        ? { ...patch, shouldUpdate: true }
        : patch
    if (!effectivePatch.shouldUpdate) return { status: 'no_change' }

    const lastThoughtAt = current.thoughtUpdatedAt ?? current.updatedAt
    const thoughtSoftCooldown =
      !userRequested &&
      lastThoughtAt > 0 &&
      Date.now() - lastThoughtAt < THOUGHT_SOFT_COOLDOWN_MS &&
      !!(current.thoughtText || current.thoughtEmoji)

    const sanitizedThought = sanitizePublicThoughtText(effectivePatch.thoughtText, {
      allowUserDirected: userRequested,
    })
    const rejectedAsPrivate = !!effectivePatch.thoughtText.trim() && !sanitizedThought

    const presenceChanged = effectivePatch.presence !== current.presence
    const activityChanged =
      (effectivePatch.presenceLabel.trim() || '') !== (current.presenceLabel.trim() || '')
    /** 软冷却：场景未切则保留旧想法；场景切了 / 用户点名则允许新想法 */
    const allowThoughtRefresh =
      userRequested || !thoughtSoftCooldown || presenceChanged || activityChanged

    let thoughtEmoji = (effectivePatch.thoughtEmoji || '').trim()
    let thoughtText = sanitizedThought
    if (rejectedAsPrivate || (!thoughtText && !thoughtEmoji) || !allowThoughtRefresh) {
      thoughtEmoji = current.thoughtEmoji
      thoughtText = current.thoughtText
    }

    const presenceSame = !presenceChanged && !activityChanged
    const thoughtSame =
      (thoughtEmoji || '') === (current.thoughtEmoji || '') &&
      (thoughtText || '') === (current.thoughtText || '')
    if (presenceSame && thoughtSame) return { status: 'no_change' }

    const now = Date.now()
    const next = await savePeerPresenceThought(cid, {
      updatedAt: now,
      thoughtUpdatedAt: thoughtSame ? current.thoughtUpdatedAt ?? current.updatedAt : now,
      presence: effectivePatch.presence,
      presenceLabel: effectivePatch.presenceLabel,
      thoughtEmoji,
      thoughtText,
    })
    if (!thoughtSame && (thoughtText || thoughtEmoji)) {
      const displayName =
        params.displayName?.trim() ||
        String(ch.name ?? ch.wechatNickname ?? '').trim() ||
        '对方'
      dispatchPeerPresenceThoughtToast({
        characterId: cid,
        displayName,
        thoughtEmoji,
        thoughtText,
        presenceLabel: effectivePatch.presenceLabel,
      })
    }
    return { status: 'applied', statusSnapshot: next }
  } catch (e) {
    const reason = e instanceof Error ? e.message : String(e)
    return { status: 'failed', reason: reason || '判断失败' }
  }
}

export { DEFAULT_PEER_PRESENCE_THOUGHT }
