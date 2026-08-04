import { personaDb } from '../newFriendsPersona/idb'
import type { CharacterMemory } from '../newFriendsPersona/types'
import { logConsole } from '../consoleLogger'
import { formatOnlineMemorySummaryStorageBody } from '../memory/onlineMemorySummaryFormat'
import {
  composeStoryTimelineCalendarAnchorLabel,
  formatGregorianStoryDayFromMs,
  normalizeStoryTimelineRowKeyword,
  normalizeStoryTimelineRowKeywords,
  normalizeStoryTimelineRowTitle,
} from '../memory/storyTimelineTypes'
import {
  computeMemoryEmbeddingHash,
  buildMemoryEmbedText,
} from '../memory/memoryVectorRecall'
import {
  fetchEmbeddingVectorUnified,
  isMemoryEmbeddingAvailable,
} from '../memory/memoryEmbeddingProvider'
import { replaceBareTokenOutsidePlaceholders } from '../memory/memoryIdPlaceholderNormalize'
import {
  attachMemoryUserPlaceholderBindings,
  resolveMemoryUserInsertContextFromSource,
} from '../memoryUserPlaceholderBindings'
import type { WorldBookUserInsertContext } from '../charUserPlaceholders'
import { resolveCharacterStoryNowMs } from '../time/messagesTabStoryTime'
import { formatStoryTimeClockFromMs } from '../time/applyOnlineChatTimeFusion'

function clip(s: string, max: number): string {
  const t = s.trim()
  if (t.length <= max) return t
  return `${t.slice(0, Math.max(0, max - 1))}…`
}

/** 传话摘要标题：硬限制 10 字（避免半截长句） */
const RELAY_TITLE_MAX = 10

/** 元功能词 / 虚词 / 口语垫词：不要当触发关键词 */
const META_STOP = new Set([
  '传话',
  '联动',
  '共同好友',
  '知情',
  '人脉',
  '打听',
  '私下',
  '找过',
  '找我',
  '找他',
  '找她',
  '回复',
  '告诉',
  '转达',
  '询问',
  '记得',
  '当时',
  '对方',
  '用户',
  '事情',
  '经过',
  '内容',
  '消息',
  '聊天',
  '线上',
  '什么',
  '怎么',
  '一个',
  '这个',
  '那个',
  '没有',
  '不是',
  '可以',
  '因为',
  '所以',
  '但是',
  '如果',
  '已经',
  '还是',
  '就是',
  '自己',
  '我们',
  '他们',
  '她们',
  '刚又',
  '发话',
  '说你',
  '要是',
  '这样',
  '直接',
  '跟你',
  '这会儿',
  '好几条',
  '千万',
  '稳住',
])

/** 内容主题：命中后用于标题与关键词（完整语义，禁止切碎） */
const TOPIC_LEXICON: Array<{ patterns: RegExp[]; title: string; keywords: string[] }> = [
  {
    patterns: [/分手/, /绝交/, /分手吧/, /掰了/, /踹了/],
    title: '转告分手警告',
    keywords: ['分手', '警告'],
  },
  {
    patterns: [/复合/, /和好/, /原谅/],
    title: '转告复合意向',
    keywords: ['复合', '和好'],
  },
  {
    patterns: [/喜欢你/, /喜欢他/, /喜欢她/, /告白/, /表白/, /心动/],
    title: '转告心意试探',
    keywords: ['喜欢', '告白'],
  },
  {
    patterns: [/生病/, /请假/, /发烧/, /住院/, /没来上学/, /没来上课/],
    title: '打听缺席原因',
    keywords: ['生病', '缺席'],
  },
  {
    patterns: [/约会/, /见面/, /出来玩/, /吃饭/, /看电影/],
    title: '转告约见安排',
    keywords: ['约会', '见面'],
  },
  {
    patterns: [/生气/, /吵架/, /冷战/, /翻脸/, /不理/],
    title: '转告闹别扭',
    keywords: ['吵架', '冷战'],
  },
  {
    patterns: [/道歉/, /对不起/, /抱歉/, /认错/, /知道错了/],
    title: '转告认错态度',
    keywords: ['道歉', '认错'],
  },
  {
    patterns: [/借位/, /删戏/, /导演/, /通告/, /剧本/],
    title: '转告戏份变动',
    keywords: ['导演', '删戏'],
  },
  {
    patterns: [/秘密/, /别说/, /保密/, /泄露/, /捅破/],
    title: '转告保密一事',
    keywords: ['秘密', '保密'],
  },
  {
    patterns: [/吃醋/, /介意/],
    title: '转告吃醋情绪',
    keywords: ['吃醋', '介意'],
  },
]

function expandNameBanTokens(names: string[]): Set<string> {
  const ban = new Set<string>()
  for (const raw of names) {
    const n = String(raw ?? '').trim()
    if (n.length < 2) continue
    ban.add(n.toLowerCase())
    // 双字名末字叠词常见昵称：方吟 → 吟吟
    if (/^[\u4e00-\u9fff]{2,4}$/.test(n)) {
      const last = n.slice(-1)
      ban.add(`${last}${last}`.toLowerCase())
      if (n.length >= 2) ban.add(n.slice(-2).toLowerCase())
    }
  }
  return ban
}

function isBannedOrStop(token: string, ban: Set<string>): boolean {
  const t = token.trim()
  if (t.length < 2) return true
  const key = t.toLowerCase()
  if (ban.has(key) || META_STOP.has(t)) return true
  for (const b of ban) {
    if (b.length >= 2 && key.includes(b)) return true
  }
  return false
}

function findTopicHit(hay: string): (typeof TOPIC_LEXICON)[number] | null {
  for (const row of TOPIC_LEXICON) {
    if (row.patterns.some((re) => re.test(hay))) return row
  }
  return null
}

/**
 * 从传话正文提炼内容向关键词：优先主题词，其次完整短词块；禁止长句切头碎词。
 */
function extractContentKeywords(params: {
  asked: string
  replied: string
  nameBanList: string[]
}): string[] {
  const { asked, replied, nameBanList } = params
  const hay = `${asked} ${replied}`.replace(/[「」『』""'']/g, ' ')
  const ban = expandNameBanTokens(nameBanList)
  const out: string[] = []
  const seen = new Set<string>()

  const push = (raw: string | undefined | null) => {
    const kw = normalizeStoryTimelineRowKeyword(String(raw ?? ''))
    if (!kw || isBannedOrStop(kw, ban)) return
    for (const prev of out) {
      if (prev.includes(kw) || kw.includes(prev)) return
    }
    const key = kw.toLowerCase()
    if (seen.has(key)) return
    seen.add(key)
    out.push(kw)
  }

  const topic = findTopicHit(hay)
  if (topic) {
    for (const k of topic.keywords) push(k)
  }

  const chunks = hay
    .split(/[，,。！？!?\s、；;：:…~～（）()【】\[\]/\\|]+/)
    .map((x) => x.trim())
    .filter(Boolean)

  for (const chunk of chunks) {
    if (/^[\d.]+$/.test(chunk)) continue
    if (isBannedOrStop(chunk, ban)) continue
    // 叠字昵称开头的长句（如「吟吟刚又发话了」）整段跳过，勿切碎当词
    if (chunk.length > 4 && /^([\u4e00-\u9fff])\1/.test(chunk)) continue
    // 只收「整段就已是 2～5 字」的完整词块，绝不对长句做 5/4/3 字切头
    if (chunk.length >= 2 && chunk.length <= 5) push(chunk)
    if (out.length >= 5) break
  }

  if (out.length < 2 && topic) {
    for (const k of topic.keywords) push(k)
  }

  return normalizeStoryTimelineRowKeywords(out).slice(0, 5)
}

/**
 * 标题 ≤10 字：优先主题概括，其次取首个短句；禁止半截长句硬切。
 */
function buildRelayTitle(asked: string, replied: string): string {
  const hay = `${asked} ${replied}`.replace(/[「」『』""']/g, '')
  const topic = findTopicHit(hay)
  if (topic) {
    return normalizeStoryTimelineRowTitle(topic.title.slice(0, RELAY_TITLE_MAX)) || '人脉往来'
  }

  const clauses = hay
    .split(/[，,。！？!?\s、；;：:…~～]+/)
    .map((x) => x.replace(/\s+/g, '').trim())
    .filter((x) => x.length >= 2)

  for (const c of clauses) {
    if (c.length <= RELAY_TITLE_MAX && !/^(说你|要是|刚又|然后|就是)/.test(c)) {
      return normalizeStoryTimelineRowTitle(c) || '人脉往来'
    }
  }

  for (const c of clauses) {
    const core = c.replace(/^(刚又|说你|要是再|要是|已经|这会儿)/, '').slice(0, 4)
    if (core.length >= 2) {
      const titled = `转告${core}`.slice(0, RELAY_TITLE_MAX)
      return normalizeStoryTimelineRowTitle(titled) || '人脉往来'
    }
  }

  return '人脉往来'
}

/** 传话发生时刻：角色剧情「现在」优先，否则系统墙钟 */
async function resolveRelayStoryStamp(characterId: string): Promise<{
  storyDay: string
  storyTime: string
  storyTimeLabel: string
  usedStoryClock: boolean
}> {
  const storyNow = await resolveCharacterStoryNowMs(characterId)
  const usedStoryClock = storyNow != null
  const eventMs = storyNow != null && storyNow > 0 ? storyNow : Date.now()
  const storyDay = formatGregorianStoryDayFromMs(eventMs)
  const storyTime = formatStoryTimeClockFromMs(eventMs)
  const storyTimeLabel =
    composeStoryTimelineCalendarAnchorLabel({
      story_day: storyDay,
      story_time: storyTime,
    }).trim() || `${storyDay} ${storyTime}`
  return { storyDay, storyTime, storyTimeLabel, usedStoryClock }
}

async function embedMemoryBestEffort(row: CharacterMemory): Promise<CharacterMemory> {
  try {
    const settings = await personaDb.getMemorySettings()
    if (!isMemoryEmbeddingAvailable(settings, null)) return row
    const hit = await fetchEmbeddingVectorUnified(settings, null, buildMemoryEmbedText(row))
    if (!hit?.vec?.length) return row
    return {
      ...row,
      memoryEmbedding: hit.vec,
      memoryEmbeddingHash: computeMemoryEmbeddingHash(row),
      updatedAt: Date.now(),
    }
  } catch {
    return row
  }
}

/** 发起方记忆：本角 {{char}}，对方 {{id:toId}}，玩家 {{user}} */
function formatFromBody(params: {
  toIdPh: string
  asked: string
  replied: string
}): string {
  const { toIdPh, asked, replied } = params
  const lines: string[] = []
  if (asked) {
    lines.push(`{{char}}私下找到${toIdPh}，跟对方说起：`)
    lines.push(`「${asked}」`)
  } else {
    lines.push(`{{char}}私下找过${toIdPh}。`)
  }
  lines.push('')
  if (replied) {
    lines.push(`${toIdPh}当时这样回{{char}}：`)
    lines.push(`「${replied}」`)
    lines.push('')
    lines.push(
      '之后和{{user}}聊天时，要记得自己已经知道这件事，别再装不知道、也别装没问过。',
    )
  } else {
    lines.push(`当时${toIdPh}没有给{{char}}留下明确答复。`)
  }
  return lines.join('\n').trim()
}

/** 接收方记忆：本角 {{char}}，来访者 {{id:fromId}}，玩家 {{user}} */
function formatToBody(params: {
  fromIdPh: string
  asked: string
  replied: string
}): string {
  const { fromIdPh, asked, replied } = params
  const lines: string[] = []
  if (asked) {
    lines.push(`${fromIdPh}私下找到{{char}}，跟{{char}}说起：`)
    lines.push(`「${asked}」`)
  } else {
    lines.push(`${fromIdPh}私下找过{{char}}。`)
  }
  lines.push('')
  if (replied) {
    lines.push(`{{char}}当时这样回复${fromIdPh}：`)
    lines.push(`「${replied}」`)
    lines.push('')
    lines.push(
      '{{char}}记得自己说过这些话。{{user}}若问起，可以自然提起，别装没回过，也别前后矛盾。',
    )
  } else {
    lines.push('{{char}}当时没有给对方留下明确答复。')
    lines.push('')
    lines.push(
      '但{{char}}仍记得对方来找过。{{user}}若问起，可以自然提起，别装不知情。',
    )
  }
  return lines.join('\n').trim()
}

/**
 * 传话记忆专用消毒：只把已知显示名收成表达式。
 * **禁止**把引号里的「我」收成 {{user}}——那是说话人自称（常为对方 NPC），收成 user 会全变成玩家名。
 */
function sanitizeRelayMemoryNames(params: {
  body: string
  ownerDisplayName: string
  otherId: string
  otherDisplayName: string
  playerNames: string[]
}): string {
  let s = String(params.body ?? '')
  const rules: Array<{ token: string; ph: string }> = []
  for (const n of params.playerNames) {
    const t = n.trim()
    if (t.length >= 2) rules.push({ token: t, ph: '{{user}}' })
  }
  const owner = params.ownerDisplayName.trim()
  if (owner.length >= 2) rules.push({ token: owner, ph: '{{char}}' })
  const other = params.otherDisplayName.trim()
  const otherId = params.otherId.trim()
  if (other.length >= 2 && otherId) rules.push({ token: other, ph: `{{id:${otherId}}}` })
  // 长名优先，避免短名误伤
  rules.sort((a, b) => b.token.length - a.token.length)
  for (const { token, ph } of rules) {
    s = replaceBareTokenOutsidePlaceholders(s, token, ph)
  }
  return s
}

async function finalizeRelayMemoryBody(params: {
  body: string
  ownerDisplayName: string
  otherId: string
  otherDisplayName: string
  playerNames: string[]
  userBindCtx: WorldBookUserInsertContext | null
}): Promise<{ content: string; userPlaceholderBindings: NonNullable<CharacterMemory['userPlaceholderBindings']> }> {
  const named = sanitizeRelayMemoryNames({
    body: params.body,
    ownerDisplayName: params.ownerDisplayName,
    otherId: params.otherId,
    otherDisplayName: params.otherDisplayName,
    playerNames: params.playerNames,
  })
  const bound = attachMemoryUserPlaceholderBindings(
    { content: named, userPlaceholderBindings: [] },
    params.userBindCtx,
  )
  return {
    content: bound.content,
    userPlaceholderBindings: bound.userPlaceholderBindings ?? [],
  }
}

/**
 * 联动传话成功后：给发起方与接收方各写一条内容向关键词记忆（可进向量召回，非始终注入）。
 * 正文用人设表达式 {{char}} / {{id:…}} / {{user}}，改名后展示与注入会同步展开。
 */
export async function writeMutualFriendRelayMemories(params: {
  fromRoleId: string
  toRoleId: string
  fromDisplayName: string
  toDisplayName: string
  /** 玩家显示名/昵称，用于关键词屏蔽叠称 */
  playerDisplayName?: string
  relayedMessage: string
  heardBack?: string
  playerIdentityId?: string | null
  wechatAccountId?: string | null
}): Promise<void> {
  const fromId = params.fromRoleId.trim()
  const toId = params.toRoleId.trim()
  const asked = clip(params.relayedMessage, 280)
  const replied = clip(params.heardBack ?? '', 280)
  if (!fromId || !toId || (!asked && !replied)) return

  const fromName = clip(params.fromDisplayName, 32) || '对方'
  const toName = clip(params.toDisplayName, 32) || '对方'
  const playerName = clip(params.playerDisplayName ?? '', 32)
  const fromIdPh = `{{id:${fromId}}}`
  const toIdPh = `{{id:${toId}}}`
  const now = Date.now()
  const stamp = `${now.toString(36)}-${Math.random().toString(36).slice(2, 7)}`
  const account = String(params.wechatAccountId ?? '').trim() || undefined
  const sessionPid = String(params.playerIdentityId ?? '').trim() || undefined

  const [fromStamp, toStamp, userBindCtx] = await Promise.all([
    resolveRelayStoryStamp(fromId),
    resolveRelayStoryStamp(toId),
    resolveMemoryUserInsertContextFromSource(account, sessionPid),
  ])

  const rowTitle = buildRelayTitle(asked, replied)
  const contentKeywords = extractContentKeywords({
    asked,
    replied,
    nameBanList: [fromName, toName, playerName, userBindCtx?.displayName ?? ''].filter(Boolean),
  })
  const rowKeywords =
    contentKeywords.length > 0
      ? contentKeywords
      : normalizeStoryTimelineRowKeywords(
          [rowTitle.replace(/^转告|^打听/, '').slice(0, 5) || '往来', '往来'].filter(Boolean),
        ).slice(0, 3)

  const precise =
    normalizeStoryTimelineRowKeyword(rowKeywords[0]) ||
    normalizeStoryTimelineRowKeyword(rowTitle.replace(/^转告|^打听/, '').slice(0, 5)) ||
    '往来'
  const emotionNeed = rowKeywords.slice(1, 4)

  const fromRaw = formatOnlineMemorySummaryStorageBody(
    formatFromBody({ toIdPh, asked, replied }),
    {
      rowTitle,
      rowKeywords,
      storyTimeLabel: fromStamp.storyTimeLabel,
    },
  )
  const toRaw = formatOnlineMemorySummaryStorageBody(
    formatToBody({ fromIdPh, asked, replied }),
    {
      rowTitle,
      rowKeywords,
      storyTimeLabel: toStamp.storyTimeLabel,
    },
  )

  const playerNames = [playerName, userBindCtx?.displayName ?? ''].filter((x) => x.trim().length >= 2)

  // 只替换显示名→表达式；绝不把引号里的「我」收成 {{user}}
  const [fromSanitized, toSanitized] = await Promise.all([
    finalizeRelayMemoryBody({
      body: fromRaw,
      ownerDisplayName: fromName,
      otherId: toId,
      otherDisplayName: toName,
      playerNames,
      userBindCtx,
    }),
    finalizeRelayMemoryBody({
      body: toRaw,
      ownerDisplayName: toName,
      otherId: fromId,
      otherDisplayName: fromName,
      playerNames,
      userBindCtx,
    }),
  ])

  const baseMeta = {
    createdAt: now,
    updatedAt: now,
    isAutoGenerated: true as const,
    memoryScope: 'private' as const,
    memoryTriggerMode: 'keyword' as const,
    memoryTriggerCategory: precise,
    memoryTriggerPrecise: precise,
    ...(emotionNeed.length ? { memoryTriggerEmotionNeed: emotionNeed } : {}),
    memoryKeywords: rowKeywords,
    ...(account ? { sourceWechatAccountId: account } : {}),
    ...(sessionPid ? { sourceSessionPlayerIdentityId: sessionPid } : {}),
  }

  let fromRow: CharacterMemory = {
    id: `mf-relay-from-${fromId}-${toId}-${stamp}`,
    characterId: fromId,
    content: fromSanitized.content,
    userPlaceholderBindings: fromSanitized.userPlaceholderBindings,
    ...baseMeta,
    storyDay: fromStamp.storyDay,
    storyTime: fromStamp.storyTime,
    storyTimeLabel: fromStamp.storyTimeLabel,
  }

  let toRow: CharacterMemory = {
    id: `mf-relay-to-${toId}-${fromId}-${stamp}`,
    characterId: toId,
    content: toSanitized.content,
    userPlaceholderBindings: toSanitized.userPlaceholderBindings,
    ...baseMeta,
    storyDay: toStamp.storyDay,
    storyTime: toStamp.storyTime,
    storyTimeLabel: toStamp.storyTimeLabel,
  }

  fromRow = await embedMemoryBestEffort(fromRow)
  toRow = await embedMemoryBestEffort(toRow)

  for (const row of [fromRow, toRow]) {
    try {
      await personaDb.upsertCharacterMemory(row)
    } catch (e) {
      logConsole(
        'ai',
        `联动聊天：写入角色记忆失败（${row.characterId}）：${e instanceof Error ? e.message : String(e)}`,
      )
    }
  }

  const summary = replied
    ? `${fromName}问「${clip(asked || '…', 24)}」→${toName}回「${clip(replied, 24)}」`
    : `${fromName}→${toName}：「${clip(asked, 36)}」（无回复记录）`
  const timeNote = fromStamp.usedStoryClock || toStamp.usedStoryClock ? '剧情时' : '系统时'
  logConsole(
    'ai',
    `联动聊天：已写入双方内容关键词记忆（${rowTitle}｜${rowKeywords.join('、') || '无'}；指称 {{char}}/{{id:…}}/{{user}}；${summary}；${timeNote} ${fromStamp.storyTimeLabel}）`,
  )
}
