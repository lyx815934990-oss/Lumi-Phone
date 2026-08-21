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
  resolveActivePrivateChatSessionPlayerIdentityId,
} from '../wechatCharacterPlayerIdentity'
import { buildCharacterCard, buildWorldBookTextForPrompt } from '../wechatChatAi'
import { wechatAccountPrivateConversationKey } from '../wechatConversationKey'
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
import type { LifeMutableSheet, LifeStorySpan } from './types'

export type LifeAlignSubject = 'character' | 'player'

export type LifeAlignFromMemoryResult =
  | { status: 'updated'; sheet: LifeMutableSheet; changed: string[] }
  | { status: 'no_change'; sheet: LifeMutableSheet }
  | { status: 'failed'; reason: string }

export type LifeAlignProgressStage =
  | 'prepare'
  | 'load_memory'
  | 'request_model'
  | 'parse'
  | 'done'

const ALIGN_TIMEOUT_MS = 90_000
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

function parseAlignJson(text: string): Record<string, unknown> | null {
  const t = text.trim()
  if (!t) return null
  const fence = /```(?:json)?\s*([\s\S]*?)```/i.exec(t)
  const raw = (fence ? fence[1] : t).trim()
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start < 0 || end <= start) return null
  try {
    const parsed = JSON.parse(raw.slice(start, end + 1)) as unknown
    if (!parsed || typeof parsed !== 'object') return null
    const o = parsed as Record<string, unknown>
    if (o.sheet && typeof o.sheet === 'object') return o.sheet as Record<string, unknown>
    return o
  } catch {
    return null
  }
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

async function loadAlignOnlineRecentBlock(conversationKey: string): Promise<string> {
  const ck = conversationKey.trim()
  if (!ck) return ''
  const rows = await personaDb.listWeChatChatMessagesRecent({ conversationKey: ck, limit: 240 })
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
    const conversationKey = wechatAccountId
      ? wechatAccountPrivateConversationKey(wechatAccountId, cid, sessionPid)
      : `${cid}::${sessionPid}`

    const [charWorldBook, playerWorldBook, onlineRecent, offlineRecent] = await Promise.all([
      buildWorldBookTextForPrompt(character, 6000),
      boundPlayer
        ? buildWorldBookTextForPrompt(boundPlayer, 4000, { voice: 'player_identity' })
        : Promise.resolve(''),
      loadAlignOnlineRecentBlock(conversationKey),
      formatRecentOfflinePlotsAiRoundsReference(
        cid,
        character.name,
        ALIGN_BLOCK_CHAR_CAP,
        null,
        ALIGN_RECENT_ROUNDS,
      ),
    ])
    if (signal.aborted) return { status: 'failed', reason: '已取消或超时（加载近端上下文阶段）' }

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
【玩家身份修订优先（硬 · 最高优先级）】
- 下方「玩家身份设定」与建档卡中的姓名/性别/身份职业/学校专业/学历简介，是玩家**当前权威设定**（用户可随时改卡）。
- 若「当前账本 JSON」、线上/线下近端仍写**旧**学校/专业/身份（例：普通大学、非艺术生），而身份设定已改为艺术生/艺术大学等：**必须以身份设定为准**改写 occupationMain、educationTrack、educationNote、学校宿舍/校园住所、社交圈同学所在学校与专业口径。
- 近端对话与旧账本里的旧身份表述＝修订前残留，**不得**压过身份卡；不得因「账本里已有普通大学且看起来合理」就输出 noChange 或原样保留。
- 感情状态、存款、车产、宠物、近期剧情推进的住址变动等非「身份背景」项，仍可参考近端剧情；但学校/专业/主业身份口径冲突时一律跟身份卡。
`
        : `
【玩家身份仅作对照】
- 对齐的是角色本人账本；玩家身份设定只作关系对照，勿把玩家学校/专业写进角色主业。
`

    const system = `你是人生账本校对员，不是角色扮演。根据证据更新「当前」登记；空白项必须尽量补齐，勿整表留空。

${subjectHint}
${playerIdentityPriorityRule}
可用证据：人设世界书、玩家身份设定、线上近端固定 ${ALIGN_RECENT_ROUNDS} 轮、线下近端固定 ${ALIGN_RECENT_ROUNDS} 轮。禁止臆造长期记忆/向量召回。

规则：
1. ${
      params.subject === 'player'
        ? `玩家身份设定/建档身份职业=**当前权威背景**（学校/专业/主业身份以此为准）；近端 ${ALIGN_RECENT_ROUNDS} 轮主要补感情、存款、住址推进等「现在」动态。年龄以剧情时钟推算为准。`
        : `人设世界书与建档卡=开篇/人设锚点；近端 ${ALIGN_RECENT_ROUNDS} 轮=「现在」证据。建档卡年龄/职业视为开篇，可能已过时（剧情推进后以近端为准）。`
    }
2. 账本填剧情「现在」：职业、存款、感情、可去住所、车产、家庭、社交圈、宠物、当前姓名性别。
3. **补齐空白（硬）**：当前账本某字段为空、或列表为空时，须根据人设/世界书/近端推断填出**至少一点可用内容**，不要省略该键让空白继续空着。已有合理内容且与**更高优先级证据**一致的字段可省略；与身份卡冲突的旧内容必须改，不可省略。
4. **可去住所 realEstates**：列出本人**所有可住/可去**的地点（可多项），不是只写一个「现居」。学生常见：学校宿舍 + 自家住所；上班族可有租房 + 老家等。每条须含：label（称呼，如「学校宿舍」）、placeKind（home|dorm|rent|family|work|other）、location（**虚构市+区+具体校名或路门牌+楼栋+房间号**；**禁止**「某高校/某大学/某小区」及任何含「某」的地址；**勿套用固定示范城市**，按人设/世界书自行新编）、ownedBySubject（产权是否归本人名下，布尔）、isPrimary（是否当前主居，通常仅一条 true）、tenure（own|rent|""）。面积户型不明可空。宿舍/家人处一般 ownedBySubject=false；自购商品房 true。
5. **车产 vehicles**：有车写品牌车型；**明确无车或完全无依据时，须输出 1 条且 model 为「无」**（note 可写「无车产」），禁止空数组。
6. **家庭 family**：世界书有父母/兄弟姐妹等则照写。**若世界书几乎没写家庭**：须合理补全 2～4 名核心亲属（通常含父母，可按年龄段补兄弟姐妹），贴合角色年龄阶层与背景，勿离谱网文设定。每位必须含：name（**真实姓名**，禁止「X父/X母/爸爸/妈妈」）、relation（父亲/母亲/继父…）、gender、ageAtStart（开篇岁数）、age（**剧情现在**岁数）、birthdayMD（月日，如「3月12日」或「03-12」）、occupationOrSchool、alive、residence（须具体到虚构城市+路门牌+楼栋房间，勿只写「重组家庭住所」或「某小区」）、livesWithSubject。健康可简写。
   - **职业须具体**：禁止「普通职工/上班族/职员/务工/工作/自由职业」等空话。须写到行业+岗位（如中学语文老师、社区护士、物流仓管、个体店主、银行柜员等口径，**自行编具体单位名与虚构城市**，勿复用提示词样板地名）。学生写「具体虚构校名 + 当前年级 · 专业」（年级须与剧情日一致；学校/专业须与主体身份设定一致；**禁止「某大学」「××大学」**）。
   - **年龄须对齐现在**：若主体开篇 19、现已 21，同学/同龄亲友不得仍写 19；age=现在，ageAtStart=开篇。禁止整表停在开篇岁数。
6b. **社交圈 socialCircle**：同学/同事/朋友/前任等（非核心家属）。世界书有周边 NPC/人脉则照写；几乎没有时合理补 2～5 人，贴合身份场景。每位须含：name、relation、gender、ageAtStart、age（现在）、birthdayMD、occupationOrSchool（具体岗位/专业年级，禁「某」）、residence（具体虚构地址含门牌）、attitude、note。禁止与 family 重复。同学同龄人年龄必须随主体一起长过的年数推进。
   - **共同好友硬一致**：若对方账本社交圈已有同名之人，本账本该人的性别/年龄/生日/学校或职业/住址必须与对方完全一致；仅 relation/attitude/note 可不同。禁止同人不同校。
   - **relation**：短关系称呼（≤8字），如「恋人」「大学同学」「前任」「酒吧老板」；复合可用「恋人/同学」。禁止把整句性格/态度写进 relation。
   - **attitude**：关系补充（态度/亲疏/相处现状），可写完整句子；勿把 attitude 当作短标签。
   - **note**：职业语境外的其他备注；与 attitude 不重复。
7. educationTrack / educationGradeAtStart 是开篇学年；现在读到哪写在 educationNote；occupationMain 的年级必须与按剧情日推算的当前年级一致；学校/专业口径须与权威身份设定一致，且校名为具体虚构专名。
8. storyStartDay / 主体 ageAtStart 默认勿动。近端明确「现在几岁」可另输出 currentAge。
9. 证据矛盾：${
      params.subject === 'player'
        ? '学校/专业/主业身份 → 玩家身份设定优先；其余动态事实取更近更具体的近端。'
        : '取更近更具体；职业感情等有依据才改。'
    }空白补齐允许轻度合理推断。共同社交对象客观事实以「对方账本社交圈锚点」为准，不得另编一套学校。
10. 仅当账本**已无空白且**与证据完全一致、且**地址/校名无「某」等模糊占位**、且**共同好友客观事实与对方账本一致**时才输出 {"noChange":true}。仍有空住所/空车产/空家庭/空社交圈、或家庭/社交圈年龄仍停在开篇、或职业仍是空话、或住所/家庭地址仍笼统/含「某」、或宿舍缺楼栋房间号、或共同好友学校与对方不一致、或**玩家账本学校/专业仍与身份卡冲突**时**禁止** noChange。
11. 只输出一个 JSON 对象，不要 Markdown、不要聊天。

${buildSharedSocialCircleConsistencyRule()}

${buildLifeLedgerAddressAndAcademicRules()}`

    const cardHeader =
      params.subject === 'player'
        ? '【建档卡 · 玩家身份权威背景（学校/专业/身份职业以此为准；勿当过时忽略）】'
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
    ? '（可能含修订前旧学校/旧专业；若与身份卡冲突，必须改写，禁止原样保留）\n'
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
    ? '（权威；学校/专业/身份冲突时压过当前账本与近端旧表述）\n'
    : ''
}${clip(playerIdentityBlock, 5000) || '（未绑定玩家身份）'}

${formatCounterpartSocialCircleBlock(
  params.counterpartSheet,
  params.subject === 'player' ? '角色本线' : '玩家本线',
)}

【线上近端固定 · 最近 ${ALIGN_RECENT_ROUNDS} 轮】
${
  params.subject === 'player'
    ? '（其中旧学校/旧身份表述视为修订残留，不得压过身份卡）\n'
    : ''
}${onlineRecent || '（暂无近端线上原文）'}

【线下近端固定 · 最近 ${ALIGN_RECENT_ROUNDS} 轮】
${
  params.subject === 'player'
    ? '（同上：旧身份残留不得压过身份卡）\n'
    : ''
}${clip(stripLeadingBracketTitle(offlineRecent), ALIGN_BLOCK_CHAR_CAP) || '（暂无近端线下原文）'}

请输出 JSON。允许的键：
noChange, currentAge,
name, gender("male"|"female"|"other"|""), genderChangeNote,
occupationMain, occupationSide, savings, relationshipStatus,
educationTrack(""|"junior_high"|"high_school"|"undergrad"|"master"|"phd"|"working"|"other"),
educationGradeAtStart, educationNote,
realEstates, vehicles, family, socialCircle, pets, extraNote,
storyStartDay, ageAtStart

数组字段说明：
- realEstates[]：{ id, label, placeKind:"home"|"dorm"|"rent"|"family"|"work"|"other"|"", tenure:"own"|"rent"|"", ownedBySubject, isPrimary, location, area, layout, floor, payKind, loanRemaining, monthlyPayment, note }；列齐可去地点（学生至少宿舍+自家），ownedBySubject=是否归本人名下
- vehicles[]：{ id, boughtAt, model, payKind, loanRemaining, monthlyPayment, note }；无车则 model:"无"
- family[]：{ id, name, relation, gender, ageAtStart, age, birthdayMD, alive, health, occupationOrSchool, residence, livesWithSubject }；name=真实姓名禁「X父/X母」；relation=父亲/母亲等；age=现在岁，ageAtStart=开篇岁；职业须具体岗位，禁「普通职工」
- socialCircle[]：{ id, name, gender, ageAtStart, age, birthdayMD, relation, occupationOrSchool, residence, attitude, note }；relation≤8字短称呼；attitude=关系补充长描述；年龄开篇/现在分开，须随主体过年数推进
- pets[]：沿用现有字段`

    const messages: OpenAiCompatibleMessage[] = [
      { role: 'system', content: system },
      { role: 'user', content: userTask },
    ]

    report('request_model', '正在请求模型判断（约 30～90 秒，请勿离开）…')
    let raw = ''
    try {
      raw = await openAiCompatibleChat(cfg, messages, {
        temperature: 0.25,
        max_tokens: 3600,
        response_format: 'json_object',
        signal,
      })
    } catch (e) {
      if (signal.aborted) {
        return { status: 'failed', reason: '对齐超时或已取消（可再点一次）' }
      }
      const msg = e instanceof Error && e.message.trim() ? e.message.trim() : '请求失败'
      if (/response_format|json_object|unsupported/i.test(msg)) {
        report('request_model', '接口不支持强制 JSON，正在降级重试…')
        try {
          raw = await openAiCompatibleChat(cfg, messages, {
            temperature: 0.25,
            max_tokens: 3600,
            signal,
          })
        } catch (e2) {
          if (signal.aborted) {
            return { status: 'failed', reason: '对齐超时或已取消' }
          }
          const msg2 = e2 instanceof Error && e2.message.trim() ? e2.message.trim() : msg
          return { status: 'failed', reason: msg2 }
        }
      } else {
        return { status: 'failed', reason: msg }
      }
    }

    report('parse', '正在解析模型结果…')
    const obj = parseAlignJson(raw)
    if (!obj) return { status: 'failed', reason: '模型未返回可解析的账本 JSON（可再试一次）' }

    const needsBlankFill =
      !params.sheet.vehicles.length ||
      !params.sheet.realEstates.length ||
      !params.sheet.family.length ||
      !params.sheet.socialCircle.length ||
      params.sheet.vehicles.every((v) => !v.model.trim()) ||
      sheetHasVagueLifePlaces(params.sheet)

    if (truthyNoChange(obj.noChange) && !needsBlankFill) {
      const filledOnly = ensureAlignMinimumFills(params.sheet, params.span)
      const clockSynced = (() => {
        const clock = resolveLifeClock(filledOnly.storyStartDay, params.span)
        return finalizeLifeMutableSheetForStore(
          syncPeopleAgesToTimeline(
            normalizeLifeMutableSheet(filledOnly),
            clock.startDay || params.span.startDay,
            clock.nowDay || params.span.nowDay,
          ),
          {
            startDay: clock.startDay || params.span.startDay,
            nowDay: clock.nowDay || params.span.nowDay,
          },
        )
      })()
      const filledDiff = describeSheetDiff(params.sheet, clockSynced)
      if (filledDiff.length) {
        report('done', `已按当前剧情日重算：${filledDiff.join('、')}`)
        return { status: 'updated', sheet: clockSynced, changed: filledDiff }
      }
      report('done', '无实质变化')
      return { status: 'no_change', sheet: params.sheet }
    }

    if (truthyNoChange(obj.noChange) && sheetHasVagueLifePlaces(params.sheet)) {
      const onlyNoChange =
        Object.keys(obj).filter((k) => k !== 'noChange' && obj[k] !== undefined).length === 0
      if (onlyNoChange) {
        return {
          status: 'failed',
          reason: '当前住所/校名仍含「某」等模糊写法，模型未改写；请再点一次对齐',
        }
      }
    }

    let next = truthyNoChange(obj.noChange) && !needsBlankFill
      ? { ...params.sheet }
      : mergeSheetFromAiObject(params.sheet, obj)
    const currentAgeRaw = obj.currentAge
    const currentAge =
      typeof currentAgeRaw === 'number' && Number.isFinite(currentAgeRaw)
        ? Math.round(currentAgeRaw)
        : typeof currentAgeRaw === 'string' && /^\d{1,3}$/.test(currentAgeRaw.trim())
          ? Number(currentAgeRaw.trim())
          : null
    if (currentAge != null && currentAge >= 0 && currentAge <= 130) {
      const clock = resolveLifeClock(next.storyStartDay, params.span)
      const anchor = clock.startDay || params.span.startDay
      if (anchor) {
        next = alignLifeSheetToTimeline({
          sheet: next,
          cardAge: currentAge,
          birthdayMD: subjectCard.birthdayMD,
          startDay: anchor,
          nowDay: clock.nowDay || params.span.nowDay,
          mode: 'cardAsNow',
          keepExistingStart: true,
        })
      }
    }

    next = ensureAlignMinimumFills(next, params.span)
    {
      const clock = resolveLifeClock(next.storyStartDay, params.span)
      next = finalizeLifeMutableSheetForStore(
        syncPeopleAgesToTimeline(
          normalizeLifeMutableSheet(next),
          clock.startDay || params.span.startDay,
          clock.nowDay || params.span.nowDay,
        ),
        {
          startDay: clock.startDay || params.span.startDay,
          nowDay: clock.nowDay || params.span.nowDay,
        },
      )
    }
    const changed = describeSheetDiff(params.sheet, next)
    if (!changed.length) {
      report('done', '无实质变化')
      return { status: 'no_change', sheet: params.sheet }
    }
    report('done', `已更新 ${changed.length} 项`)
    return { status: 'updated', sheet: next, changed }
  } finally {
    window.clearTimeout(timer)
    if (outerSignal) outerSignal.removeEventListener('abort', onOuterAbort)
  }
}
