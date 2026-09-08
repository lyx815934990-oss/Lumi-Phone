/**
 * 人生账本：按人设世界书、玩家身份设定、线上/线下近端各 10 轮，手动对齐「当前」可变项。
 * 空白项会尽量补齐（现居、无车写「无」、家庭可合理补全含年龄/生日/职业）。不读长期记忆。
 */

import type { ApiConfig } from '../../api/types'
import { isMeetImportedWeChatMessageId } from '../../lumiMeet/meetMemoryConstants'
import { formatRecentOfflinePlotsAiRoundsReference } from '../memory/recentAiRoundsReferencePrompt'
import {
  MEMORY_RECENT_AI_ROUNDS_REFERENCE,
  selectRecentWeChatMessagesAiRoundWindow,
} from '../memory/memorySummaryRetention'
import { openAiCompatibleChat, type OpenAiCompatibleMessage } from '../newFriendsPersona/ai'
import { personaDb } from '../newFriendsPersona/idb'
import type { Character, PlayerIdentity } from '../newFriendsPersona/types'
import { genderLabelZh } from '../newFriendsPersona/utils'
import { loadAccountsBundle } from '../wechatAccountPersistence'
import {
  formatPlayerIdentityDisplayName,
  getCharacterLinkedPlayerIdentityIds,
  resolveActivePrivateChatSessionPlayerIdentityId,
} from '../wechatCharacterPlayerIdentity'
import { buildCharacterCard, buildWorldBookTextForPrompt } from '../wechatChatAi'
import {
  wechatAccountPrivateConversationKey,
  wechatConversationKey,
} from '../wechatConversationKey'
import { formatPrivateLineUnsummarized } from '../wechatMemoryPromptBlocks'
import {
  alignLifeSheetToTimeline,
  formatLifePromptBlock,
  normalizeLifeMutableSheet,
  resolveLifeClock,
  resolveLifeSnapshot,
  syncPeopleAgesToTimeline,
} from './compute'
import { buildLifeLedgerAddressAndAcademicRules, finalizeLifeMutableSheetForStore, sheetHasVagueLifePlaces } from './promptRules'
import {
  buildSharedSocialCircleConsistencyRule,
  formatCounterpartSocialCircleBlock,
} from './sharedSocialCircle'
import { ALIGN_TEXT_FORMAT_BLOCK, parseAlignText, parsePairAlignText } from './alignTextFormat'
import { appendLifeChangeHistory } from './lifeChangeHistory'
import type { LifeMutableSheet, LifeStorySpan } from './types'

export type LifeAlignSubject = 'character' | 'player'

export type LifeAlignFromMemoryResult =
  | { status: 'updated'; sheet: LifeMutableSheet; changed: string[] }
  | { status: 'no_change'; sheet: LifeMutableSheet }
  | { status: 'failed'; reason: string }

export type LifeAlignPairFromMemoryResult = {
  character: LifeAlignFromMemoryResult
  player: LifeAlignFromMemoryResult
}

export type LifeAlignProgressStage =
  | 'prepare'
  | 'load_memory'
  | 'request_model'
  | 'parse'
  | 'done'

const ALIGN_TIMEOUT_MS = 90_000
const ALIGN_PAIR_TIMEOUT_MS = 120_000
const ALIGN_RECENT_ROUNDS = MEMORY_RECENT_AI_ROUNDS_REFERENCE
const ALIGN_BLOCK_CHAR_CAP = 8000

function clip(s: string, cap: number): string {
  const t = String(s ?? '').trim()
  if (!t) return ''
  return t.length <= cap ? t : `${t.slice(0, cap)}\n…（已截断）`
}

function stripLeadingBracketTitle(raw: string): string {
  return String(raw ?? '')
    .trim()
    .replace(/^【[^】]+】\s*\n+/, '')
    .trim()
}

function truthyNoChange(v: unknown): boolean {
  if (v === true) return true
  if (typeof v === 'string') {
    const t = v.trim()
    return t === 'true' || t === '无变化' || t === 'no_change' || t === 'noChange'
  }
  return false
}

function mergeSheetFromAiObject(prev: LifeMutableSheet, obj: Record<string, unknown>): LifeMutableSheet {
  const keys = new Set(Object.keys(obj))
  const parsed = normalizeLifeMutableSheet({ ...prev, ...obj })
  const next: LifeMutableSheet = { ...prev }
  const scalars: (keyof LifeMutableSheet)[] = [
    'name',
    'gender',
    'genderChangeNote',
    'occupationMain',
    'occupationSide',
    'savings',
    'relationshipStatus',
    'educationTrack',
    'educationNote',
    'extraNote',
  ]
  for (const k of scalars) {
    if (keys.has(k)) (next as unknown as Record<string, unknown>)[k] = parsed[k]
  }
  if (keys.has('educationGradeAtStart')) next.educationGradeAtStart = parsed.educationGradeAtStart
  if (keys.has('realEstates')) next.realEstates = parsed.realEstates
  if (keys.has('vehicles')) next.vehicles = parsed.vehicles
  if (keys.has('family')) next.family = parsed.family
  if (keys.has('socialCircle')) next.socialCircle = parsed.socialCircle
  if (keys.has('pets')) next.pets = parsed.pets
  if (keys.has('storyStartDay') && parsed.storyStartDay.trim()) next.storyStartDay = parsed.storyStartDay
  if (keys.has('ageAtStart') && parsed.ageAtStart != null) next.ageAtStart = parsed.ageAtStart
  return next
}

function sheetNeedsBlankFill(sheet: LifeMutableSheet): boolean {
  return (
    !sheet.vehicles.length ||
    !sheet.realEstates.length ||
    !sheet.family.length ||
    !sheet.socialCircle.length ||
    sheet.vehicles.every((v) => !v.model.trim())
  )
}

function finalizeAlignedSheet(sheet: LifeMutableSheet, span: LifeStorySpan): LifeMutableSheet {
  const clock = resolveLifeClock(sheet.storyStartDay, span)
  return finalizeLifeMutableSheetForStore(
    syncPeopleAgesToTimeline(
      normalizeLifeMutableSheet(sheet),
      clock.startDay || span.startDay,
      clock.nowDay || span.nowDay,
    ),
    {
      startDay: clock.startDay || span.startDay,
      nowDay: clock.nowDay || span.nowDay,
    },
  )
}

function applyAlignFromAiObject(params: {
  sheet: LifeMutableSheet
  obj: Record<string, unknown>
  span: LifeStorySpan
  subjectCard: Character | PlayerIdentity
}): LifeAlignFromMemoryResult {
  const { sheet, obj, span, subjectCard } = params
  const needsBlankFill = sheetNeedsBlankFill(sheet)
  const hasObviousVague = sheetHasVagueLifePlaces(sheet)
  // 模型说无变化，但账本仍空或缺项：忽略 noChange，继续走补齐（禁止因「某」字硬失败）
  const ignoreNoChange = needsBlankFill || hasObviousVague

  if (truthyNoChange(obj.noChange) && !ignoreNoChange) {
    const filledOnly = ensureAlignMinimumFills(sheet, span)
    const clockSynced = finalizeAlignedSheet(filledOnly, span)
    const filledDiff = describeSheetDiff(sheet, clockSynced)
    if (filledDiff.length) {
      return {
        status: 'updated',
        sheet: appendLifeChangeHistory(clockSynced, {
          before: sheet,
          summary: `按记忆对齐 · ${filledDiff.join('、')}`,
          source: 'align',
        }),
        changed: filledDiff,
      }
    }
    return { status: 'no_change', sheet }
  }

  let next =
    truthyNoChange(obj.noChange) && !ignoreNoChange ? { ...sheet } : mergeSheetFromAiObject(sheet, obj)
  const currentAgeRaw = obj.currentAge
  const currentAge =
    typeof currentAgeRaw === 'number' && Number.isFinite(currentAgeRaw)
      ? Math.round(currentAgeRaw)
      : typeof currentAgeRaw === 'string' && /^\d{1,3}$/.test(currentAgeRaw.trim())
        ? Number(currentAgeRaw.trim())
        : null
  if (currentAge != null && currentAge >= 0 && currentAge <= 130) {
    const clock = resolveLifeClock(next.storyStartDay, span)
    const anchor = clock.startDay || span.startDay
    if (anchor) {
      next = alignLifeSheetToTimeline({
        sheet: next,
        cardAge: currentAge,
        birthdayMD: subjectCard.birthdayMD,
        startDay: anchor,
        nowDay: clock.nowDay || span.nowDay,
        mode: 'cardAsNow',
        keepExistingStart: true,
      })
    }
  }

  next = ensureAlignMinimumFills(next, span)
  next = finalizeAlignedSheet(next, span)
  const changed = describeSheetDiff(sheet, next)
  if (!changed.length) {
    // 仍有明显「某大学」等占位时，提示可再试，但不要标失败卡住
    if (hasObviousVague || sheetHasVagueLifePlaces(next)) {
      return {
        status: 'no_change',
        sheet: next,
      }
    }
    return { status: 'no_change', sheet }
  }
  return {
    status: 'updated',
    sheet: appendLifeChangeHistory(next, {
      before: sheet,
      summary: `按记忆对齐 · ${changed.join('、')}`,
      source: 'align',
    }),
    changed,
  }
}

async function requestAlignModelRaw(
  cfg: ApiConfig,
  messages: OpenAiCompatibleMessage[],
  params: {
    signal: AbortSignal
  },
): Promise<{ ok: true; raw: string } | { ok: false; reason: string }> {
  try {
    const raw = await openAiCompatibleChat(cfg, messages, {
      temperature: 0.25,
      max_tokens: null,
      signal: params.signal,
    })
    return { ok: true, raw }
  } catch (e) {
    if (params.signal.aborted) {
      return { ok: false, reason: '对齐超时或已取消（可再点一次）' }
    }
    const msg = e instanceof Error && e.message.trim() ? e.message.trim() : '请求失败'
    return { ok: false, reason: msg }
  }
}

/** 对齐后兜底：车产空白→「无」；家庭/社交圈年龄按剧情日推到「现在」。 */
function ensureAlignMinimumFills(sheet: LifeMutableSheet, span: LifeStorySpan): LifeMutableSheet {
  const next: LifeMutableSheet = {
    ...sheet,
    realEstates: sheet.realEstates.map((h) => ({ ...h })),
    vehicles: sheet.vehicles.map((v) => ({ ...v })),
    family: sheet.family.map((f) => ({
      ...f,
      ageAtStart: f.ageAtStart ?? '',
      birthdayMD: f.birthdayMD ?? '',
    })),
    socialCircle: sheet.socialCircle.map((c) => ({
      ...c,
      ageAtStart: c.ageAtStart ?? '',
    })),
    pets: sheet.pets.map((p) => ({ ...p })),
  }

  if (!next.vehicles.length) {
    next.vehicles = [
      {
        id: 'car-none',
        boughtAt: '',
        model: '无',
        valueWan: '',
        payKind: '',
        loanRemaining: '',
        monthlyPayment: '',
        note: '无车产',
      },
    ]
  } else {
    const onlyBlank = next.vehicles.every(
      (v) => !v.model.trim() && !v.boughtAt.trim() && !v.note.trim(),
    )
    if (onlyBlank) {
      next.vehicles = [
        {
          id: next.vehicles[0]?.id || 'car-none',
          boughtAt: '',
          model: '无',
          valueWan: '',
          payKind: '',
          loanRemaining: '',
          monthlyPayment: '',
          note: '无车产',
        },
      ]
    }
  }

  const clock = resolveLifeClock(next.storyStartDay, span)
  return syncPeopleAgesToTimeline(
    normalizeLifeMutableSheet(next),
    clock.startDay || span.startDay,
    clock.nowDay || span.nowDay,
  )
}

function describeSheetDiff(before: LifeMutableSheet, after: LifeMutableSheet): string[] {
  const labels: [keyof LifeMutableSheet, string][] = [
    ['name', '姓名'],
    ['gender', '性别'],
    ['genderChangeNote', '性别说明'],
    ['occupationMain', '主业'],
    ['occupationSide', '副业'],
    ['savings', '存款'],
    ['relationshipStatus', '感情'],
    ['educationTrack', '学历轨道'],
    ['educationGradeAtStart', '开篇学年'],
    ['educationNote', '学历备注'],
    ['extraNote', '补充'],
    ['ageAtStart', '开篇岁数'],
    ['storyStartDay', '开篇日'],
  ]
  const out: string[] = []
  for (const [k, zh] of labels) {
    if (JSON.stringify(before[k]) !== JSON.stringify(after[k])) out.push(zh)
  }
  if (JSON.stringify(before.realEstates) !== JSON.stringify(after.realEstates)) out.push('住所')
  if (JSON.stringify(before.vehicles) !== JSON.stringify(after.vehicles)) out.push('车产')
  if (JSON.stringify(before.family) !== JSON.stringify(after.family)) out.push('家庭')
  if (JSON.stringify(before.socialCircle) !== JSON.stringify(after.socialCircle)) out.push('社交圈')
  if (JSON.stringify(before.pets) !== JSON.stringify(after.pets)) out.push('宠物')
  return out
}

async function resolveAlignWechatAccountId(character: Character): Promise<string | null> {
  const own = character.wechatAccountId?.trim()
  if (own) return own
  try {
    const bundle = await loadAccountsBundle()
    return bundle?.currentAccountId?.trim() || bundle?.accounts[0]?.accountId?.trim() || null
  } catch {
    return null
  }
}

function cardFactLine(card: Character | PlayerIdentity): string {
  const age = typeof card.age === 'number' && Number.isFinite(card.age) ? `${card.age}岁（建档卡，可能是开篇）` : '未填'
  const g = card.gender ? genderLabelZh(card.gender) : '未填'
  return [
    `建档姓名：${card.name?.trim() || '未填'}`,
    `建档年龄：${age}`,
    `建档性别：${g}`,
    `建档身份/职业：${card.identity?.trim() || '未填'}`,
    `生日：${card.birthdayMD?.trim() || '未填'}`,
  ].join('\n')
}

/** 收集可能存过私聊的会话键（马甲键 + 旧无马甲键 + 多身份），避免线上近端空窗导致只剩线下。 */
function collectAlignOnlineConversationKeys(params: {
  characterId: string
  wechatAccountId: string | null
  sessionPid: string
  boundPlayerId?: string | null
  character?: Character | null
}): string[] {
  const cid = params.characterId.trim()
  const acc = params.wechatAccountId?.trim() || ''
  if (!cid) return []
  const pids = new Set<string>()
  const addPid = (raw: string | null | undefined) => {
    const p = raw?.trim()
    if (p && p !== '__none__') pids.add(p)
  }
  addPid(params.sessionPid)
  addPid(params.boundPlayerId)
  for (const lid of getCharacterLinkedPlayerIdentityIds(params.character)) addPid(lid)
  pids.add('__none__')

  const keys: string[] = []
  const seen = new Set<string>()
  const push = (k: string) => {
    const t = k.trim()
    if (!t || seen.has(t)) return
    seen.add(t)
    keys.push(t)
  }
  for (const pid of pids) {
    if (acc) push(wechatAccountPrivateConversationKey(acc, cid, pid))
    push(wechatConversationKey(cid, pid))
  }
  return keys
}

async function formatAlignOnlineLinesFromRows(
  rows: Awaited<ReturnType<typeof personaDb.listWeChatChatMessagesRecent>>,
): Promise<string> {
  const window = selectRecentWeChatMessagesAiRoundWindow(
    rows.filter((m) => !isMeetImportedWeChatMessageId(m.id)),
    ALIGN_RECENT_ROUNDS,
  )
  if (!window.length) return ''
  const lines: string[] = []
  for (const m of window) {
    const line = formatPrivateLineUnsummarized(m, { includeTimestamp: true })
    if (line) lines.push(line)
  }
  if (!lines.length) return ''
  return clip(lines.join('\n'), ALIGN_BLOCK_CHAR_CAP)
}

/**
 * 加载线上近端：多会话键择优；若仍空则按角色扫最近私聊，避免「只有线下有料」。
 */
async function loadAlignOnlineRecentBlock(params: {
  characterId: string
  wechatAccountId: string | null
  sessionPid: string
  boundPlayerId?: string | null
  character?: Character | null
}): Promise<{ text: string; source: 'session' | 'character_scan' | 'empty'; msgHint: string }> {
  const keys = collectAlignOnlineConversationKeys(params)
  let bestRows: Awaited<ReturnType<typeof personaDb.listWeChatChatMessagesRecent>> = []
  let bestScore = -1
  for (const key of keys) {
    const rows = await personaDb.listWeChatChatMessagesRecent({ conversationKey: key, limit: 200 })
    if (!rows.length) continue
    const latest = rows.reduce((m, x) => Math.max(m, x.timestamp || 0), 0)
    const score = latest * 10_000 + rows.length
    if (score > bestScore) {
      bestScore = score
      bestRows = rows
    }
  }
  let text = await formatAlignOnlineLinesFromRows(bestRows)
  if (text) {
    return {
      text,
      source: 'session',
      msgHint: `线上近端已载入（约 ${bestRows.length} 条会话尾）`,
    }
  }

  // 核后备：按角色扫最近私聊（可能跨身份），总比空窗只剩线下好
  try {
    const byChar = await personaDb.listWeChatChatMessagesRecentByCharacter({
      characterId: params.characterId.trim(),
      limit: 200,
    })
    text = await formatAlignOnlineLinesFromRows(byChar)
    if (text) {
      return {
        text,
        source: 'character_scan',
        msgHint: `线上近端已用角色私聊扫尾载入（约 ${byChar.length} 条）`,
      }
    }
  } catch {
    /* ignore */
  }
  return { text: '', source: 'empty', msgHint: '线上近端为空（将主要依赖线下与身份卡）' }
}

export async function runLifeAlignFromMemory(params: {
  character: Character
  boundPlayer: PlayerIdentity | null
  subject: LifeAlignSubject
  sheet: LifeMutableSheet
  span: LifeStorySpan
  apiConfig: ApiConfig | null
  /** 另一侧账本：共同社交圈客观事实须与此一致 */
  counterpartSheet?: LifeMutableSheet | null
  /** 进度提示（加载上下文 / 请求模型等） */
  onProgress?: (stage: LifeAlignProgressStage, detail: string) => void
  signal?: AbortSignal
}): Promise<LifeAlignFromMemoryResult> {
  const report = (stage: LifeAlignProgressStage, detail: string) => {
    try {
      params.onProgress?.(stage, detail)
    } catch {
      /* ignore */
    }
  }

  const cfg = params.apiConfig
  if (!cfg?.apiUrl?.trim() || !cfg?.apiKey?.trim() || !cfg?.modelId?.trim()) {
    return {
      status: 'failed',
      reason: '未配置可用的 AI（请到 API 设置里配置主聊天或「聊天记录卡片」接口）',
    }
  }

  const character = params.character
  const cid = character.id.trim()
  if (!cid) return { status: 'failed', reason: '无效角色' }

  if (params.subject === 'player' && !params.boundPlayer?.id) {
    return { status: 'failed', reason: '未绑定玩家身份卡，无法对齐玩家本线' }
  }

  // 对齐时再读一遍身份卡，确保用的是用户刚改过的最新内容
  let boundPlayer = params.boundPlayer
  if (boundPlayer?.id) {
    try {
      const fresh = (await personaDb.getPlayerIdentity(boundPlayer.id)) as PlayerIdentity | null
      if (fresh?.id) boundPlayer = fresh
    } catch {
      /* keep params.boundPlayer */
    }
  }

  const outerSignal = params.signal
  const timeoutCtrl = new AbortController()
  const onOuterAbort = () => timeoutCtrl.abort()
  if (outerSignal) {
    if (outerSignal.aborted) return { status: 'failed', reason: '已取消' }
    outerSignal.addEventListener('abort', onOuterAbort, { once: true })
  }
  const timer = window.setTimeout(() => timeoutCtrl.abort(), ALIGN_TIMEOUT_MS)
  const signal = timeoutCtrl.signal

  try {
    report('prepare', '准备对齐…')
    const subjectCard = params.subject === 'player' ? boundPlayer! : character
    const subjectName =
      params.subject === 'player'
        ? formatPlayerIdentityDisplayName(boundPlayer!, boundPlayer!.id)
        : character.name?.trim() || character.wechatNickname?.trim() || '角色'
    const pid = boundPlayer?.id?.trim() || character.playerIdentityId?.trim() || ''
    const wechatAccountId = await resolveAlignWechatAccountId(character)
    if (signal.aborted) return { status: 'failed', reason: '已取消或超时' }

    report('load_memory', '正在读取人设世界书、身份设定与近端 10 轮…')
    const sessionPid = await resolveActivePrivateChatSessionPlayerIdentityId({
      characterId: cid,
      wechatAccountId: wechatAccountId || null,
      appPlayerIdentityId: pid || '__none__',
    })

    const [charWorldBook, playerWorldBook, onlinePack, offlineRecent] = await Promise.all([
      buildWorldBookTextForPrompt(character, 6000),
      boundPlayer
        ? buildWorldBookTextForPrompt(boundPlayer, 4000, { voice: 'player_identity' })
        : Promise.resolve(''),
      loadAlignOnlineRecentBlock({
        characterId: cid,
        wechatAccountId: wechatAccountId || null,
        sessionPid,
        boundPlayerId: boundPlayer?.id,
        character,
      }),
      formatRecentOfflinePlotsAiRoundsReference(
        cid,
        character.name,
        ALIGN_BLOCK_CHAR_CAP,
        null,
        ALIGN_RECENT_ROUNDS,
      ),
    ])
    const onlineRecent = onlinePack.text
    if (signal.aborted) return { status: 'failed', reason: '已取消或超时（加载近端上下文阶段）' }
    report('load_memory', onlinePack.msgHint)

    const snapshot = resolveLifeSnapshot({
      cardName: subjectCard.name,
      cardAge: subjectCard.age,
      cardGender: subjectCard.gender,
      cardIdentity: subjectCard.identity,
      birthdayMD: subjectCard.birthdayMD,
      sheet: params.sheet,
      span: params.span,
    })
    const ledgerBlock = formatLifePromptBlock({
      title:
        params.subject === 'player'
          ? '玩家身份可变人生·本角色线（待对齐）'
          : '角色可变人生·本线当前（待对齐）',
      subject: params.subject,
      snapshot,
    })

    const playerIdentityBlock = boundPlayer
      ? [
          buildCharacterCard(boundPlayer, { bioMaxChars: 900 }).trim(),
          playerWorldBook.trim() ? `【玩家身份世界书】\n${playerWorldBook.trim()}` : '',
        ]
          .filter(Boolean)
          .join('\n\n')
      : ''

    const subjectHint =
      params.subject === 'player'
        ? `对齐对象是玩家「${subjectName}」在本角色线上的人生账本（不是角色本人）。只改玩家当前事实。`
        : `对齐对象是角色「${subjectName}」本人的人生账本。只改角色当前事实。`

    const playerIdentityPriorityRule =
      params.subject === 'player'
        ? `
【玩家账本 · 证据优先级（硬 · 防对不上）】
- **近端线上/线下「现在」事实优先于旧账本**：感情状态、存款、住址/同住/搬家、分手或在一起、明确升学年级、转专业、换工作等——近端有写就必须改账本；禁止用旧账本压近端，也禁止因身份卡没写细就 noChange。
- **身份卡/世界书 = 背景基线**：近端完全没提学校/专业/主业时，用身份卡补齐空白或校正明显过时项。
- **仅当身份卡已修订、且近端仍在复读修订前旧校名/旧专业**时，才以身份卡压过近端旧表述；近端若明确「现在已经…」则以近端为准。
- **禁止**把整段线上近端当成可忽略的旧残留——对不上信息的常见原因就是漏读线上。
- 亲属（妹妹/哥哥等）身份卡已写明的须写入 family；感情/存款等动态仍跟近端。
`
        : `
【玩家身份仅作对照】
- 对齐的是角色本人账本；玩家身份设定只作关系对照，勿把玩家学校/专业写进角色主业。角色近端自述（线上/线下）优先于旧账本。
`

    const system = `你是人生账本校对员，不是角色扮演。根据证据更新「当前」登记；空白项必须尽量补齐，勿整表留空。

${subjectHint}
${playerIdentityPriorityRule}
可用证据：人设世界书、玩家身份设定、线上近端固定 ${ALIGN_RECENT_ROUNDS} 轮、线下近端固定 ${ALIGN_RECENT_ROUNDS} 轮。禁止臆造长期记忆/向量召回。

规则：
1. ${
      params.subject === 'player'
        ? `近端线上/线下=「现在」动态的第一证据（感情、存款、住址、升学/换工作等）；身份卡=近端未提及时的背景基线。年龄以剧情时钟推算为准。`
        : `人设世界书与建档卡=开篇/人设锚点；近端线上/线下 ${ALIGN_RECENT_ROUNDS} 轮=「现在」证据。建档卡年龄/职业视为开篇，可能已过时（剧情推进后以近端为准）。`
    }
2. 账本填剧情「现在」：职业、存款、感情、可去住所、车产、家庭、社交圈、宠物、当前姓名性别。
3. **补齐空白（硬）**：当前账本某字段为空、或列表为空时，须根据人设/世界书/近端推断填出**至少一点可用内容**，不要省略该键让空白继续空着。已有合理内容且与**更高优先级证据**一致的字段可省略；与身份卡冲突的旧内容必须改，不可省略。
4. **可去住所 realEstates**：列出本人**所有可住/可去**的地点（可多项），不是只写一个「现居」。学生常见：学校宿舍 + 自家住所；上班族可有租房 + 老家等。每条须含：label（称呼，如「学校宿舍」）、placeKind（home|dorm|rent|family|work|other）、location（**虚构市+区+具体校名或路门牌+楼栋+房间号**；**禁止**「某高校/某大学/某小区」及任何含「某」的地址；**勿套用固定示范城市**，按人设/世界书自行新编）、ownedBySubject（产权是否归本人名下，布尔）、isPrimary（是否当前主居，通常仅一条 true）、tenure（own|rent|""）、valueWan（估值，单位万元，数字字符串，如「280」；宿舍/租住可空或写月租相关估值）。面积户型不明可空。宿舍/家人处一般 ownedBySubject=false；自购商品房 true。
5. **车产 vehicles**：有车写**完整品牌车型**（如奥迪A6L）并填 valueWan（估值，单位万元，如「45」）；**禁止**空 model。新车追加条目并写清车型与价值。明确无车或完全无依据时，须输出 1 条且 model 为「无」（note 可写「无车产」，valueWan 可空），禁止空数组。
6. **家庭 family**：世界书有父母/兄弟姐妹等则照写。**若世界书几乎没写家庭**：须合理补全 2～4 名核心亲属（通常含父母，可按年龄段补兄弟姐妹），贴合角色年龄阶层与背景，勿离谱网文设定。每位必须含：name（**真实姓名**，禁止「X父/X母/爸爸/妈妈」）、relation（父亲/母亲/继父…）、gender、ageAtStart（开篇岁数）、age（**剧情现在**岁数）、birthdayMD（月日，如「3月12日」或「03-12」）、occupationOrSchool、alive、residence（须具体到虚构城市+路门牌+楼栋房间，勿只写「重组家庭住所」或「某小区」）、livesWithSubject。健康可简写。
   - **职业须具体**：禁止「普通职工/上班族/职员/务工/工作/自由职业」等空话。须写到行业+岗位（如中学语文老师、社区护士、物流仓管、个体店主、银行柜员等口径，**自行编具体单位名与虚构城市**，勿复用提示词样板地名）。学生写「具体虚构校名 + 当前年级 · 专业」（年级须与剧情日一致；学校/专业须与主体身份设定一致；**禁止「某大学」「××大学」**）。
   - **年龄须对齐现在**：若主体开篇 19、现已 21，同学/同龄亲友不得仍写 19；age=现在，ageAtStart=开篇。禁止整表停在开篇岁数。
6b. **社交圈 socialCircle**：同学/同事/朋友/前任等（非核心家属）。世界书有周边 NPC/人脉则照写；几乎没有时合理补 2～5 人，贴合身份场景。每位须含：name、relation、gender、ageAtStart、age（现在）、birthdayMD、occupationOrSchool（具体岗位/专业年级，禁「某」）、residence（具体虚构地址含门牌）、attitude、note。禁止与 family 重复。同学同龄人年龄必须随主体一起长过的年数推进。
   - **共同好友硬一致**：若对方账本社交圈已有同名之人，本账本该人的性别/年龄/生日/学校或职业/住址必须与对方完全一致；仅 relation/attitude/note 可不同。禁止同人不同校。
   - **relation**：短关系称呼（≤8字），如「恋人」「大学同学」「前任」「酒吧老板」；复合可用「恋人/同学」。禁止把整句性格/态度写进 relation。
   - **attitude**：关系补充（态度/亲疏/相处现状），可写完整句子；勿把 attitude 当作短标签。
   - **note**：职业语境外的其他备注；与 attitude 不重复。
7. educationTrack / educationGradeAtStart 是**开篇**学年；现在读到哪写在 educationNote 与 occupationMain。**近端剧情 / 剧情日推算的当前年级优先于世界书开篇年级**（例：相遇羁绊开篇大三，近端已称大四学长 → 账本现在必须大四，不可因世界书仍写大三而 noChange）。开局建档时禁止把世界书大三改成大二，或把已是大一写成「待升大一」。近端未提及时学校/专业口径可跟身份设定，且校名为具体虚构专名。
8. storyStartDay / 主体 ageAtStart 默认勿动。近端明确「现在几岁」可另输出 currentAge。
9. 证据矛盾：${
      params.subject === 'player'
        ? '近端线上/线下已写明的「现在」事实（感情、存款、住址、升学/换工作、明确的新校名新专业）优先；身份卡仅在近端未提及时作背景基线。仅当身份卡已修订而近端仍复读旧校名时，才以身份卡压过近端旧表述。'
        : '年级「现在」口径 → 近端明示与剧情日优先于世界书开篇；其余取更近更具体；职业感情等有依据才改。'
    }空白补齐允许轻度合理推断。共同社交对象客观事实以「对方账本社交圈锚点」为准，不得另编一套学校。
10. 仅当账本**已无空白且**与证据完全一致、且**地址/校名无「某」等模糊占位**、且**共同好友客观事实与对方账本一致**、且**occupation/学历年级已是「现在」而非停在开篇**、且**未漏掉近端已写明的感情/住址/升学等动态**时才写 status：无变化。仍有空住所/空车产/空家庭/空社交圈、或家庭/社交圈年龄仍停在开篇、或职业仍是空话、或住所/家庭地址仍笼统/含「某」、或宿舍缺楼栋房间号、或共同好友学校与对方不一致、或**近端已写大四/大二而账本仍大三/大一**、或**近端已写分手/同居等而账本未改**时**禁止**无变化。
11. 只输出 LIFE_ALIGN 纯文本块（见用户消息格式说明），不要 JSON、不要 Markdown、不要聊天。

${buildSharedSocialCircleConsistencyRule()}

${buildLifeLedgerAddressAndAcademicRules()}`

    const cardHeader =
      params.subject === 'player'
        ? '【建档卡 · 玩家身份背景基线（近端未提及时用来补齐；近端已有「现在」事实时勿压过近端）】'
        : '【建档卡（年龄/职业可能随剧情推进过时，仅作开篇对照）】'

    const userTask = `${cardHeader}
${cardFactLine(subjectCard)}

${ledgerBlock}

【剧情时钟（年龄对齐硬依据）】
开篇日：${snapshot.startDay || '未知'}
当前剧情日：${snapshot.nowDay || '未知'}
主体开篇年龄：${snapshot.ageAtStart ?? '未知'}
主体现在年龄：${snapshot.currentAge ?? '未知'}
→ 家庭/社交圈的 age 必须是「现在」；若主体已长大 N 岁，同龄人不得仍停在开篇岁数。

【当前账本 JSON】
${
  params.subject === 'player'
    ? '（若与近端「现在」事实冲突，以近端为准改写；近端未提及时再用身份卡补空白）\n'
    : ''
}${
  sheetHasVagueLifePlaces(params.sheet)
    ? '（⚠ 当前含「某／某某／某大学」等模糊地址或缺宿舍门牌：本轮必须全部改写成具体虚构校名+楼栋房间号，禁止 noChange）\n'
    : ''
}${JSON.stringify(params.sheet)}

【人设世界书】
${clip(charWorldBook, 6000) || '（无人设世界书）'}

【玩家身份设定】
${
  params.subject === 'player'
    ? '（背景基线：近端未提学校/专业/主业时用来补齐；近端已写「现在」动态时勿整段忽略近端）\n'
    : ''
}${clip(playerIdentityBlock, 5000) || '（未绑定玩家身份）'}

${formatCounterpartSocialCircleBlock(
  params.counterpartSheet,
  params.subject === 'player' ? '角色本线' : '玩家本线',
)}

【线上近端固定 · 最近 ${ALIGN_RECENT_ROUNDS} 轮】
${
  params.subject === 'player'
    ? '（须认真对照：感情/存款/住址/升学换工作等「现在」事实优先写入玩家账本）\n'
    : '（须认真对照：角色自述的「现在」事实优先于旧账本）\n'
}${onlineRecent || '（暂无近端线上原文）'}

【线下近端固定 · 最近 ${ALIGN_RECENT_ROUNDS} 轮】
${
  params.subject === 'player'
    ? '（同上：近端「现在」事实优先）\n'
    : ''
}${clip(stripLeadingBracketTitle(offlineRecent), ALIGN_BLOCK_CHAR_CAP) || '（暂无近端线下原文）'}

请按下列文本格式输出（禁止 JSON）：
${ALIGN_TEXT_FORMAT_BLOCK}`

    const messages: OpenAiCompatibleMessage[] = [
      { role: 'system', content: system },
      { role: 'user', content: userTask },
    ]

    report('request_model', '正在请求模型判断（约 30～90 秒，请勿离开）…')
    const modelRes = await requestAlignModelRaw(cfg, messages, {
      signal,
    })
    if (!modelRes.ok) return { status: 'failed', reason: modelRes.reason }

    report('parse', '正在解析模型结果…')
    const obj = parseAlignText(modelRes.raw)
    if (!obj) return { status: 'failed', reason: '模型未返回可解析的 LIFE_ALIGN 文本（可再试一次）' }

    const applied = applyAlignFromAiObject({
      sheet: params.sheet,
      obj,
      span: params.span,
      subjectCard,
    })
    if (applied.status === 'updated') {
      report('done', `已更新 ${applied.changed.length} 项`)
    } else if (applied.status === 'no_change') {
      report('done', '无实质变化')
    }
    return applied
  } finally {
    window.clearTimeout(timer)
    if (outerSignal) outerSignal.removeEventListener('abort', onOuterAbort)
  }
}

export async function runLifeAlignPairFromMemory(params: {
  character: Character
  boundPlayer: PlayerIdentity
  characterSheet: LifeMutableSheet
  playerSheet: LifeMutableSheet
  span: LifeStorySpan
  apiConfig: ApiConfig | null
  onProgress?: (stage: LifeAlignProgressStage, detail: string) => void
  signal?: AbortSignal
}): Promise<LifeAlignPairFromMemoryResult> {
  const report = (stage: LifeAlignProgressStage, detail: string) => {
    try {
      params.onProgress?.(stage, detail)
    } catch {
      /* ignore */
    }
  }

  const failBoth = (reason: string): LifeAlignPairFromMemoryResult => ({
    character: { status: 'failed', reason },
    player: { status: 'failed', reason },
  })

  const cfg = params.apiConfig
  if (!cfg?.apiUrl?.trim() || !cfg?.apiKey?.trim() || !cfg?.modelId?.trim()) {
    return failBoth('未配置可用的 AI（请到 API 设置里配置主聊天或「聊天记录卡片」接口）')
  }

  const character = params.character
  const cid = character.id.trim()
  if (!cid) return failBoth('无效角色')
  if (!params.boundPlayer?.id) return failBoth('未绑定玩家身份卡，无法对齐玩家本线')

  let boundPlayer = params.boundPlayer
  try {
    const fresh = (await personaDb.getPlayerIdentity(boundPlayer.id)) as PlayerIdentity | null
    if (fresh?.id) boundPlayer = fresh
  } catch {
    /* keep */
  }

  const outerSignal = params.signal
  const timeoutCtrl = new AbortController()
  const onOuterAbort = () => timeoutCtrl.abort()
  if (outerSignal) {
    if (outerSignal.aborted) return failBoth('已取消')
    outerSignal.addEventListener('abort', onOuterAbort, { once: true })
  }
  const timer = window.setTimeout(() => timeoutCtrl.abort(), ALIGN_PAIR_TIMEOUT_MS)
  const signal = timeoutCtrl.signal

  try {
    report('prepare', '准备对齐角色与玩家…')
    const charName = character.name?.trim() || character.wechatNickname?.trim() || '角色'
    const playerName = formatPlayerIdentityDisplayName(boundPlayer, boundPlayer.id)
    const pid = boundPlayer.id.trim()
    const wechatAccountId = await resolveAlignWechatAccountId(character)
    if (signal.aborted) return failBoth('已取消或超时')

    report('load_memory', '正在读取人设世界书、身份设定与近端 10 轮…')
    const sessionPid = await resolveActivePrivateChatSessionPlayerIdentityId({
      characterId: cid,
      wechatAccountId: wechatAccountId || null,
      appPlayerIdentityId: pid || '__none__',
    })

    const [charWorldBook, playerWorldBook, onlinePack, offlineRecent] = await Promise.all([
      buildWorldBookTextForPrompt(character, 6000),
      buildWorldBookTextForPrompt(boundPlayer, 4000, { voice: 'player_identity' }),
      loadAlignOnlineRecentBlock({
        characterId: cid,
        wechatAccountId: wechatAccountId || null,
        sessionPid,
        boundPlayerId: boundPlayer.id,
        character,
      }),
      formatRecentOfflinePlotsAiRoundsReference(cid, character.name, ALIGN_BLOCK_CHAR_CAP, null, ALIGN_RECENT_ROUNDS),
    ])
    const onlineRecent = onlinePack.text
    if (signal.aborted) return failBoth('已取消或超时（加载近端上下文阶段）')
    report('load_memory', onlinePack.msgHint)

    const charSnapshot = resolveLifeSnapshot({
      cardName: character.name,
      cardAge: character.age,
      cardGender: character.gender,
      cardIdentity: character.identity,
      birthdayMD: character.birthdayMD,
      sheet: params.characterSheet,
      span: params.span,
    })
    const playerSnapshot = resolveLifeSnapshot({
      cardName: boundPlayer.name,
      cardAge: boundPlayer.age,
      cardGender: boundPlayer.gender,
      cardIdentity: boundPlayer.identity,
      birthdayMD: boundPlayer.birthdayMD,
      sheet: params.playerSheet,
      span: params.span,
    })
    const charLedgerBlock = formatLifePromptBlock({
      title: '角色可变人生·本线当前（待对齐）',
      subject: 'character',
      snapshot: charSnapshot,
    })
    const playerLedgerBlock = formatLifePromptBlock({
      title: '玩家身份可变人生·本角色线（待对齐）',
      subject: 'player',
      snapshot: playerSnapshot,
    })
    const playerIdentityBlock = [
      buildCharacterCard(boundPlayer, { bioMaxChars: 900 }).trim(),
      playerWorldBook.trim() ? `【玩家身份世界书】\n${playerWorldBook.trim()}` : '',
    ]
      .filter(Boolean)
      .join('\n\n')

    const system = `你是人生账本校对员，不是角色扮演。本轮**一次**校对角色与玩家两边「当前」登记；空白项必须尽量补齐。

【对齐对象（硬）】
- 角色「${charName}」本人的人生账本：只改角色当前事实。
- 玩家「${playerName}」在本角色线上的人生账本：只改玩家当前事实；不是角色本人。

【证据优先级（硬 · 防对不上）】
- **近端线上/线下「现在」事实优先于旧账本**（两边都适用）：感情、存款、住址/同住/搬家、分手或在一起、明确升学年级、转专业、换工作——近端有写就必须改对应主体账本。
- **玩家身份卡 = 背景基线**：近端完全没提学校/专业/主业时，用身份卡补齐玩家空白；仅当身份卡已修订而近端仍复读旧校名时，才以身份卡压过近端旧表述。
- **禁止**把整段线上近端当成可忽略的旧残留。
- 角色账本：玩家身份设定只作关系对照，勿把玩家学校/专业写进角色主业。

可用证据：人设世界书、玩家身份设定、线上近端固定 ${ALIGN_RECENT_ROUNDS} 轮、线下近端固定 ${ALIGN_RECENT_ROUNDS} 轮。禁止臆造长期记忆/向量召回。

规则（两边共用，按主体适用）：
1. 角色：人设世界书与建档卡=开篇锚点；近端线上/线下=「现在」证据。玩家：近端=「现在」动态第一证据；身份卡=近端未提及时的背景基线。
2. 账本填剧情「现在」：职业、存款、感情、可去住所、车产、家庭、社交圈、宠物、当前姓名性别。
3. **补齐空白（硬）**：字段或列表为空时须推断填出至少一点可用内容。
4. **可去住所 realEstates**：列齐可住/可去地点；location 须虚构市+区+具体校名或路门牌+楼栋房间；禁止含「某」；有产权/可估时填 valueWan（万元）。
5. **车产 vehicles**：有车写完整品牌车型与 valueWan（万元）；禁止空 model；新车追加并写清车型。无车须 1 条 model「无」，禁止空数组。
6. **家庭 family** / **社交圈 socialCircle**：须具体职业/校名；age=现在岁，ageAtStart=开篇岁；同龄人随主体过年数推进。
7. **共同好友硬一致（硬）**：两边社交圈同名之人，性别/年龄/生日/学校或职业/住址必须完全一致；仅 relation/attitude/note 可不同。
8. educationTrack/educationGradeAtStart 是开篇学年；现在年级写在 educationNote 与 occupationMain；近端与剧情日优先于世界书开篇年级。
9. storyStartDay / ageAtStart 默认勿动；近端明确现在几岁可输出 currentAge。
10. 某侧账本已无空白、与证据一致、地址无「某」、共同好友与对方一致、年级已是「现在」、且未漏掉近端已写明动态时，该侧写 status：无变化；否则禁止无变化。
11. 只输出 LIFE_ALIGN 纯文本块：同一 <<<LIFE_ALIGN>>> 包络内连续两个 [LIFE_ALIGN]（subject 分别为 character 与 player），不要 JSON、不要 Markdown、不要聊天。

${buildSharedSocialCircleConsistencyRule()}

${buildLifeLedgerAddressAndAcademicRules()}`

    const userTask = `【角色 · 建档卡（年龄/职业可能随剧情推进过时，仅作开篇对照）】
${cardFactLine(character)}

${charLedgerBlock}

【角色 · 当前账本 JSON】${
      sheetHasVagueLifePlaces(params.characterSheet)
        ? '\n（⚠ 含模糊地址：本轮必须改写成具体虚构校名+楼栋房间号，禁止 noChange）\n'
        : ''
    }${JSON.stringify(params.characterSheet)}

【玩家 · 建档卡 · 背景基线（近端未提及时补齐；近端已有「现在」事实时勿压过近端）】
${cardFactLine(boundPlayer)}

${playerLedgerBlock}

【玩家 · 当前账本 JSON】
（若与近端「现在」事实冲突，以近端为准；近端未提及时再用身份卡补空白）${
      sheetHasVagueLifePlaces(params.playerSheet)
        ? '\n（⚠ 含模糊地址：本轮必须改写成具体虚构校名+楼栋房间号，禁止 noChange）\n'
        : ''
    }${JSON.stringify(params.playerSheet)}

【剧情时钟（年龄对齐硬依据 · 两边共用）】
开篇日：${charSnapshot.startDay || '未知'}
当前剧情日：${charSnapshot.nowDay || '未知'}
角色开篇年龄：${charSnapshot.ageAtStart ?? '未知'}；角色现在年龄：${charSnapshot.currentAge ?? '未知'}
玩家开篇年龄：${playerSnapshot.ageAtStart ?? '未知'}；玩家现在年龄：${playerSnapshot.currentAge ?? '未知'}
→ 家庭/社交圈的 age 必须是「现在」；同龄人不得仍停在开篇岁数。

【人设世界书（角色）】
${clip(charWorldBook, 6000) || '（无人设世界书）'}

【玩家身份设定（背景基线）】
${clip(playerIdentityBlock, 5000) || '（未绑定玩家身份）'}

【线上近端固定 · 最近 ${ALIGN_RECENT_ROUNDS} 轮】
（须认真对照两边主体：感情/存款/住址/升学换工作等「现在」事实优先写入对应账本）
${onlineRecent || '（暂无近端线上原文）'}

【线下近端固定 · 最近 ${ALIGN_RECENT_ROUNDS} 轮】
${clip(stripLeadingBracketTitle(offlineRecent), ALIGN_BLOCK_CHAR_CAP) || '（暂无近端线下原文）'}

请按下列文本格式输出（禁止 JSON；同一包络内写 character 与 player 两个 [LIFE_ALIGN] 块）：
${ALIGN_TEXT_FORMAT_BLOCK}`

    const messages: OpenAiCompatibleMessage[] = [
      { role: 'system', content: system },
      { role: 'user', content: userTask },
    ]

    report('request_model', '正在一次请求对齐角色+玩家（约 60～120 秒，请勿离开）…')
    const modelRes = await requestAlignModelRaw(cfg, messages, {
      signal,
    })
    if (!modelRes.ok) return failBoth(modelRes.reason)

    report('parse', '正在解析模型结果…')
    const pairObj = parsePairAlignText(modelRes.raw)
    if (!pairObj) {
      return failBoth('模型未返回可解析的双主体 LIFE_ALIGN 文本（可再试一次）')
    }

    const characterResult = applyAlignFromAiObject({
      sheet: params.characterSheet,
      obj: pairObj.character,
      span: params.span,
      subjectCard: character,
    })
    const playerResult = applyAlignFromAiObject({
      sheet: params.playerSheet,
      obj: pairObj.player,
      span: params.span,
      subjectCard: boundPlayer,
    })
    report('done', '角色与玩家对齐完成')
    return { character: characterResult, player: playerResult }
  } finally {
    window.clearTimeout(timer)
    if (outerSignal) outerSignal.removeEventListener('abort', onOuterAbort)
  }
}
