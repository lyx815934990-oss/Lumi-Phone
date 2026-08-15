import type { ApiConfig } from '../../../api/types'
import { openAiCompatibleChat, type OpenAiCompatibleMessage } from '../../newFriendsPersona/ai'
import { personaDb } from '../../newFriendsPersona/idb'
import type { Character, PlayerIdentity } from '../../newFriendsPersona/types'
import { loadOfflineDatingPlotsPromptBlock } from '../../dating/loadOfflineDatingPlotsForWechatPrompt'
import { resolveStoryCalendarAnchorFromPlots } from '../../memory/storyTimelineCalendarContext'
import {
  composeStoryTimelineCalendarAnchorLabel,
  formatGregorianStoryDayFromMs,
} from '../../memory/storyTimelineTypes'
import { formatWorldBackgroundForPrompt } from '../../newFriendsPersona/worldBackgroundFormat'
import { formatStoryTimeClockFromMs } from '../../time/applyOnlineChatTimeFusion'
import { loadDatingPlotsFromKv } from '../../unifiedMemoryAutoSummary'
import { buildSystemContent } from '../../wechatChatAi'
import {
  allConnectedCallsHaveTranscript,
  explainPhoneCallsReject,
  ensureSavedRecordings,
  isPhoneDatasetReady,
  normalizeCallTranscriptLabels,
  parsePhoneCallsOnly,
  parsePhoneContactsOnly,
  parsePhoneMarkup,
  PHONE_CALL_MARKUP_FORMAT,
  PHONE_CONTACT_MARKUP_FORMAT,
  salvageThinConnectedCalls,
} from './phoneMarkup'
import type { PhoneContact, PhoneDataset } from './types'

type PhoneGenClock = {
  source: 'story' | 'system'
  label: string
  dayLabel: string
  clockHm: string
}

function extractDayAndClockFromLabel(label: string): { dayLabel: string; clockHm: string } | null {
  const raw = String(label || '').trim()
  if (!raw) return null
  const segments = raw.split(/\s*-\s*/)
  for (let i = segments.length - 1; i >= 0; i--) {
    const seg = segments[i]!.trim()
    const day = seg.match(/^(\d{4}年\d{1,2}月\d{1,2}日)/)?.[1]
    if (!day) continue
    const clock = seg.match(/(\d{1,2}):(\d{2})/)
    const clockHm = clock
      ? `${String(Math.min(23, Math.max(0, Number(clock[1])))).padStart(2, '0')}:${clock[2]}`
      : '21:00'
    return { dayLabel: day, clockHm }
  }
  return null
}

/** 优先剧情「现在」；无剧情时间再退回设备系统时间 */
async function resolvePhoneGenerationClock(characterId: string): Promise<PhoneGenClock> {
  const cid = characterId.trim()
  if (cid) {
    try {
      const st = await personaDb.getStoryTimelineState(cid)
      const day = st?.currentStoryDay?.trim()
      if (day) {
        const timeRaw = st?.currentStoryTime?.trim() || ''
        const m = timeRaw.match(/^(\d{1,2}):(\d{2})$/)
        const clockHm = m
          ? `${String(Math.min(23, Math.max(0, Number(m[1])))).padStart(2, '0')}:${m[2]}`
          : '21:00'
        const label =
          composeStoryTimelineCalendarAnchorLabel({
            story_day: day,
            story_time: m ? clockHm : undefined,
          }).trim() || `${day} ${clockHm}`
        const parsed = extractDayAndClockFromLabel(label)
        return {
          source: 'story',
          label,
          dayLabel: parsed?.dayLabel || day,
          clockHm: parsed?.clockHm || clockHm,
        }
      }
    } catch {
      /* ignore */
    }

    try {
      const plots = await loadDatingPlotsFromKv(cid)
      const fromPlots = resolveStoryCalendarAnchorFromPlots(plots).trim()
      const parsedPlots = extractDayAndClockFromLabel(fromPlots)
      if (parsedPlots) {
        return {
          source: 'story',
          label: fromPlots,
          dayLabel: parsedPlots.dayLabel,
          clockHm: parsedPlots.clockHm,
        }
      }
    } catch {
      /* ignore */
    }
  }

  const now = Date.now()
  const dayLabel = formatGregorianStoryDayFromMs(now)
  const clockHm = formatStoryTimeClockFromMs(now)
  return {
    source: 'system',
    label: `${dayLabel} ${clockHm}`,
    dayLabel,
    clockHm,
  }
}

function buildPhoneCallTimeAnchorBlock(clock: PhoneGenClock, timeSpanDays: number): string {
  const span = Math.max(1, Math.min(60, Math.round(timeSpanDays || 7)))
  if (clock.source === 'story') {
    return `【时间锚点·剧情时间｜最高优先级】
角色故事「现在」= ${clock.label}
- 「今天 / 分组 today / 日期：今天」的「完整日期」必须写「${clock.dayLabel}」（年月日与故事现在一致）。
- 「昨天 / yesterday」= 该日的前一天；earlier 落在更早几天内。
- 【跨度硬约束】全部通话须落在故事「现在」往回约 ${span} 天内；禁止超出该窗口或跳到无关年份。
- 「时间：HH:mm」贴近窗口内合理钟点；最新一条接近 ${clock.clockHm} 附近。
- 禁止乱编与剧情「现在」无关的日期。列表从新到旧。`
  }
  return `【时间锚点·系统时间｜退回】
当前无可用剧情时间，退回设备系统「现在」= ${clock.label}
- 「今天」的「完整日期」写「${clock.dayLabel}」；昨天/更早相对该日推算。
- 【跨度硬约束】全部通话须落在系统「现在」往回约 ${span} 天内。
- 最新通话接近 ${clock.clockHm}；从新到旧。`
}

function buildContactAppendix(): string {
  return `
---
【任务：只生成通讯录】
用户偷看角色手机「通话」App。请基于人设与剧情，生成角色本人存的联系人。

硬性：
1) 只输出 5~8 行 C|… ，不要写通话、不要解释。
2) 格式：C|id|备注|来电名|号码|拼音|关系|紧急|收藏|用户|拉黑|字 （开关位只写 0/1）
3) 备注=短叫法（可 emoji，禁止括号注释）；来电名=真名；必须有一条用户=1。
4) **号码必须恰好 13 位数字**（虚构手机号；禁止 11 位真实号形态；推荐以 20 开头，如 2013822109876）。

${PHONE_CONTACT_MARKUP_FORMAT}
`.trim()
}

function buildCallAppendix(callCount: number): string {
  const n = Math.max(4, Math.min(12, Math.round(callCount || 8)))
  return `
---
【任务：只生成通话记录】
已有通讯录如下，请只输出通话行，引用其中的 id/备注。

硬性：
1) 约 ${n} 组通话（允许 ${Math.max(4, n - 1)}～${Math.min(12, n + 1)}）：每组一行 K|… ，接通再跟 2~6 行 T|… ；不要再写联系人。
2) K|id|联系人id|备注|号码|方向|媒介|秒|HH:mm|分组|日签|完整日|已存
   方向=in/out/miss；媒介=v/vd；分组=t/y/e；已存=0/1；完整日如 2026-8-12；号码=13 位数字（与通讯录一致）
3) in/out 必须立刻写 T|R|台词|秒 与 T|O|台词|秒（≥2 行）；写不完改 miss。未接不要写 T。
4) 日期服从【时间锚点】；稿优先承接线下剧情；从新到旧。

${PHONE_CALL_MARKUP_FORMAT}
`.trim()
}

function contactsBrief(contacts: PhoneContact[]): string {
  return contacts
    .map((c) => {
      const em = c.isEmergency ? 1 : 0
      const fav = c.isFavorite ? 1 : 0
      const user = c.isUser ? 1 : 0
      const blocked = c.isBlocked ? 1 : 0
      const glyph = (c.avatarGlyph || c.remarkName || '通').slice(0, 1)
      return `C|${c.id}|${c.remarkName}|${c.displayName || c.remarkName}|${c.phoneNumber}|${c.pinyinInitial || '#'}|${c.relationTag || ''}|${em}|${fav}|${user}|${blocked}|${glyph}`
    })
    .join('\n')
}

async function chatOnce(
  cfg: ApiConfig,
  messages: OpenAiCompatibleMessage[],
  opts?: { temperature?: number },
): Promise<string> {
  // max_tokens 由 API 设置页「最大 Token」决定；留空则系统默认 12800
  return openAiCompatibleChat(cfg, messages, {
    ...(opts?.temperature != null ? { temperature: opts.temperature } : {}),
  })
}

async function generateContactsWithRetry(
  cfg: ApiConfig,
  baseSystem: string,
  userTask: string,
): Promise<PhoneContact[]> {
  const contactAppendix = buildContactAppendix()
  let lastRaw = ''
  for (let i = 0; i < 3; i += 1) {
    const raw = await chatOnce(
      cfg,
      [
        { role: 'system', content: `${baseSystem}\n\n${contactAppendix}` },
        { role: 'user', content: userTask },
      ],
      { temperature: i === 0 ? 0.75 : 0.5 },
    )
    lastRaw = raw
    const contacts = parsePhoneContactsOnly(raw)
    const hasUser = contacts.some((c) => c.isUser)
    // 紧急/收藏/拉黑不强制；有用户联系人且人数够即可
    if (contacts.length >= 4 && hasUser) return contacts
  }
  throw new Error(`通讯录格式不稳定（多次重试失败）：${lastRaw.slice(0, 180)}`)
}

async function generateCallsWithRetry(
  cfg: ApiConfig,
  baseSystem: string,
  contacts: PhoneContact[],
  bias: string,
  clock: PhoneGenClock,
  offlinePlotsBrief: string,
  opts: { callCount: number; timeSpanDays: number },
): Promise<PhoneDataset['calls']> {
  const callCount = Math.max(4, Math.min(12, Math.round(opts.callCount || 8)))
  const timeSpanDays = Math.max(1, Math.min(60, Math.round(opts.timeSpanDays || 7)))
  const minAccept = Math.max(4, callCount - 2)
  const maxAccept = Math.min(14, callCount + 2)
  let lastRaw = ''
  const roster = contactsBrief(contacts)
  const timeBlock = buildPhoneCallTimeAnchorBlock(clock, timeSpanDays)
  const callAppendix = buildCallAppendix(callCount)
  const offlineBlock = offlinePlotsBrief.trim()
    ? `【线下约会剧情摘录·须承接】\n${offlinePlotsBrief.trim()}\n`
    : `【线下约会剧情摘录】（暂无；可据人设与近期聊天合理发挥，仍须像角色本人手机里的真实通话）\n`
  const userTask = `内容偏向：${bias.trim() || '深夜未接、关系试探、家人催促'}。
目标通话条数：约 ${callCount} 条（允许 ${minAccept}～${maxAccept}）。
时间跨度：故事「现在」往回约 ${timeSpanDays} 天。

${timeBlock}

${offlineBlock}
请只输出纯文字通话行（K/T）。必须引用下列通讯录：
${roster}

务必：
- 至少 2 通 in/out，每通 K 后立刻 ≥2 行 T|R|… 与 T|O|… ；其余可 miss。
- 台词短（2~6 行/通）；写不完对白就改 miss；2~3 条已存=1。
- 含 1~2 条用户联系人通话；完整日服从时间锚点；事由优先承接线下剧情。`

  let lastReject = ''
  for (let i = 0; i < 4; i += 1) {
    const repairHint =
      i === 0 || !lastReject
        ? ''
        : `\n\n【上次未过验收·必须改正】${lastReject}
改正：①接通补 T|R|台词|秒 与 T|O|台词|秒（≥2）；②或把缺稿改成方向 miss；③至少 2 通有对白接通，总条数 ${minAccept}～${maxAccept}。只重新输出全部 K/T 行。`
    const raw = await chatOnce(
      cfg,
      [
        { role: 'system', content: `${baseSystem}\n\n${callAppendix}\n\n${timeBlock}` },
        { role: 'user', content: `${userTask}${repairHint}` },
      ],
      { temperature: i === 0 ? 0.55 : 0.35 },
    )
    lastRaw = raw
    const fromCalls = parsePhoneCallsOnly(raw)
    const fromFull = parsePhoneMarkup(raw)?.calls ?? []
    const parsed = fromCalls.length >= fromFull.length ? fromCalls : fromFull
    // 缺稿接通降为未接，避免截断导致整包失败
    const calls = salvageThinConnectedCalls(parsed)
    lastReject = explainPhoneCallsReject(calls, { minAccept, maxAccept })
    if (calls.length < minAccept || calls.length > maxAccept + 2) continue
    const connected = calls.filter((c) => c.direction !== 'missed')
    if (connected.length < 2) continue
    if (!allConnectedCallsHaveTranscript(calls)) continue
    return calls
  }
  throw new Error(
    `通话记录生成未过验收（${lastReject || '多次重试失败'}）。末段：${lastRaw.slice(0, 120)}`,
  )
}

export async function generatePhoneDatasetWithAi(params: {
  apiConfig: ApiConfig | null
  characterId: string
  playerIdentityId: string
  playerDisplayName: string
  useLumiProjectAssistantPrompt: boolean
  bias: string
  /** 通话条数，默认 8 */
  callCount?: number
  /** 相对「现在」往回天数，默认 7 */
  timeSpanDays?: number
}): Promise<PhoneDataset> {
  const cfg = params.apiConfig
  if (!cfg?.apiUrl?.trim() || !cfg.apiKey?.trim() || !cfg.modelId?.trim()) {
    throw new Error('未配置 AI API')
  }

  const cid = params.characterId.trim()
  const piid = params.playerIdentityId.trim()
  const character = cid ? ((await personaDb.getCharacter(cid)) as Character | null) : null
  const playerIdentity =
    piid && piid !== '__none__' ? ((await personaDb.getPlayerIdentity(piid)) as PlayerIdentity | null) : null
  const memoryNotes = (await personaDb.formatCharacterMemoriesForPrompt(cid)).trim() || undefined

  let worldBackgroundPrompt: string | undefined
  if (character?.worldBackgroundId?.trim()) {
    const bg = await personaDb.getWorldBackground(character.worldBackgroundId.trim())
    const block = formatWorldBackgroundForPrompt(bg)
    if (block.trim()) worldBackgroundPrompt = block
  }

  const promptMode = params.useLumiProjectAssistantPrompt ? 'lumi-assistant' : 'persona'
  // 通话内容须承接线下：无论是否 Lumi 助手模式都注入线下剧情块
  const offlineDatingPlotsContext = cid
    ? await loadOfflineDatingPlotsPromptBlock(cid, character?.name ?? null)
    : ''
  const offlinePlotsBrief = offlineDatingPlotsContext.trim().slice(0, 6000)

  const baseSystem = buildSystemContent({
    character,
    playerIdentity,
    playerDisplayName: params.playerDisplayName.trim() || '朋友',
    promptMode,
    longTermMemoryNotes: memoryNotes,
    worldBackgroundPrompt,
    offlineDatingPlotsContext: offlineDatingPlotsContext || undefined,
    chatMemberIds: [cid].filter(Boolean),
  })

  const recentChatRows = cid
    ? await personaDb.listWeChatChatMessagesRecentByCharacter({ characterId: cid, limit: 36 })
    : []
  const recentChatBrief = recentChatRows
    .slice(-20)
    .map((m) => {
      const text = String(m.content || '').replace(/\s+/g, ' ').trim()
      if (!text) return null
      return `${m.type === 'character' ? '[角色]' : '[用户]'} ${text.slice(0, 72)}`
    })
    .filter((x): x is string => !!x)
    .join('\n')

  const playerName = params.playerDisplayName.trim() || '朋友'
  const bias = params.bias.trim() || '深夜未接、关系试探、家人催促'
  const callCount = Math.max(4, Math.min(12, Math.round(params.callCount ?? 8)))
  const timeSpanDays = Math.max(1, Math.min(60, Math.round(params.timeSpanDays ?? 7)))
  const genClock = await resolvePhoneGenerationClock(cid)
  const contactTask = `内容偏向：${bias}。

只生成通讯录（5~8 人），不要写通话。
- 必须有一条用户：是；来电名可用「${playerName}」；备注是「${character?.name || '角色'}」私下叫法（短、直接、可含 emoji、不要括号/不要塞微信昵称）。
- 备注禁止括号注释；备注语字段多数不要写。
- 紧急 / 收藏 / 拉黑按人设自行安排，可有可无，不必凑数。

【近期聊天】
${recentChatBrief || '（暂无）'}

角色名：${character?.name || '未知'}
用户显示名：${playerName}`

  const contacts = await generateContactsWithRetry(cfg, baseSystem, contactTask)
  const rawCalls = await generateCallsWithRetry(cfg, baseSystem, contacts, bias, genClock, offlinePlotsBrief, {
    callCount,
    timeSpanDays,
  })
  const ownerName = String(character?.name || '').trim() || '我'
  const calls = normalizeCallTranscriptLabels(rawCalls, ownerName, contacts)

  const merged = ensureSavedRecordings({ contacts, calls })
  if (isPhoneDatasetReady(merged)) return merged
  // 放宽：仍要求每一通接通都有稿；条数贴近用户设定
  const minCalls = Math.max(4, callCount - 1)
  if (
    merged.contacts.length >= 4 &&
    merged.calls.length >= minCalls &&
    allConnectedCallsHaveTranscript(merged.calls)
  ) {
    return merged
  }
  throw new Error('通讯录与通话拼装未达标，请重试')
}
