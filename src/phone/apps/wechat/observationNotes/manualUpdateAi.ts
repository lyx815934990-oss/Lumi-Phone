/**
 * 私藏侧写 · 手动更新（整份重填）
 * 证据：人设/身份卡 + 线上近端 10 轮 + 线下近端 10 轮 + 当前侧写原稿/上一版对照。
 * 不读长期记忆、不做向量召回（避免手动重生成被 embedding 拖慢）。
 */

import type { AnonymousQaWechatContext } from '../../../../components/anonymousQa/buildAnonymousQaPersonaContext'
import { isMeetImportedWeChatMessageId } from '../../lumiMeet/meetMemoryConstants'
import { formatRecentOfflinePlotsAiRoundsReference } from '../memory/recentAiRoundsReferencePrompt'
import {
  MEMORY_RECENT_AI_ROUNDS_REFERENCE,
  selectRecentWeChatMessagesAiRoundWindow,
} from '../memory/memorySummaryRetention'
import { openAiCompatibleChat, type OpenAiCompatibleMessage } from '../newFriendsPersona/ai'
import { personaDb } from '../newFriendsPersona/idb'
import type { Character, PlayerIdentity } from '../newFriendsPersona/types'
import { formatWorldBackgroundForPrompt } from '../newFriendsPersona/worldBackgroundFormat'
import { resolveActivePrivateChatSessionPlayerIdentityId } from '../wechatCharacterPlayerIdentity'
import { buildSystemContent } from '../wechatChatAi'
import { wechatAccountPrivateConversationKey } from '../wechatConversationKey'
import { formatPrivateLineUnsummarized } from '../wechatMemoryPromptBlocks'
import { formatKnownUserFactsForObservationNotes } from './knownUserFacts'
import {
  applyObservationNotesPatchesFromAi,
  extractObservationNotesPatchBlock,
  OBS_NOTES_PATCH_MARKER,
} from './obsNotesPatch'
import {
  formatObservationNotesUpdateContextBlock,
  formatObservationNotesManuscriptReferenceBlock,
} from './previousVersion'
import {
  createBlankObservationNotesDoc,
  loadObservationNotes,
} from './store'
import type { ObservationNotesDoc } from './types'

export type ObservationNotesManualUpdateResult =
  | { status: 'updated'; doc: ObservationNotesDoc; diffCount: number }
  | { status: 'no_change'; doc: ObservationNotesDoc }
  | { status: 'failed'; reason: string; doc?: ObservationNotesDoc }

const MANUAL_RECENT_ROUNDS = MEMORY_RECENT_AI_ROUNDS_REFERENCE
const MANUAL_BLOCK_CHAR_CAP = 8000

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

async function loadManualOnlineRecentBlock(conversationKey: string): Promise<string> {
  const ck = conversationKey.trim()
  if (!ck) return ''
  const rows = await personaDb.listWeChatChatMessagesRecent({ conversationKey: ck, limit: 240 })
  const window = selectRecentWeChatMessagesAiRoundWindow(
    rows.filter((m) => !isMeetImportedWeChatMessageId(m.id)),
    MANUAL_RECENT_ROUNDS,
  )
  if (!window.length) return ''
  const lines: string[] = []
  for (const m of window) {
    const line = formatPrivateLineUnsummarized(m, { includeTimestamp: true })
    if (line) lines.push(line)
  }
  if (!lines.length) return ''
  return (
    `【线上近端固定 · 最近 ${MANUAL_RECENT_ROUNDS} 轮角色回复及其间用户输入】\n` +
    clip(lines.join('\n'), MANUAL_BLOCK_CHAR_CAP)
  )
}

function buildManualFullRewriteAppendix(charName: string): string {
  return `
---
【系统任务：私藏侧写·整份重填】
你是 ${charName}。这不是中性档案员填表，而是**你本人**用第一人称整理「我对 {{user}} 的私藏侧写」。
必须用你**线上私聊回复 {{user}} 时的同款语气与亲密浓度**交卷。

硬性要求：
- **整份重写（全量覆盖）**：禁止只写「无变化」；禁止只改一两项。必须按下列标签**整份交卷**。
- **第一人称 · 贴人设 · 贴关系（最高优先级口吻）**：
  - 侧写=「我」怎么看/叫/对待对方，**禁止**百科词条、中立简介、第三方旁白。
  - 「称呼 / 关系 / 评价 / 优点 / 缺点 / 线上备注 / 人格注 / 能力注」必须带**你的态度与亲密感**；关系越深，表述越该像你会说出口的话，**禁止**压成干标签。
  - **反例（禁止）**：关系｜热恋；称呼｜盛小亦；评价｜性格很好。
  - **正例（须达到同等浓度）**：关系｜名正言顺的热恋男朋友，谁来都撬不走的那种；称呼｜盛小亦、盛老师（按你人设可多称）；评价｜一两句带你口癖与私下看法的活人话。
  - 原稿/上一版里已有的亲昵、戏谑、占有、软乎表述：若近端**没有**关系降温或用户纠正 → **必须保留同等亲密浓度与人设口吻**，禁止「瘦身摘要」。
- **原稿 / 上一版用法**：
  - **口吻、关系量级、亲昵浓度**：默认继承，近端无冲突勿降级。
  - **客观事实**（本名、性别、学校/专业/职业、食物/雷点/爱好等）：以身份卡 + 近端为准；冲突则改事实，但仍用你的口吻转述。
  - **亲密四栏**（身体亲密）：本轮材料没提 →「尚不清楚／暂时不知道」；**不要**把「态度栏瘦身」也当成「不知道」。
- **可用证据（仅此）**：身份卡、人设世界书、线上近端固定 ${MANUAL_RECENT_ROUNDS} 轮、线下近端固定 ${MANUAL_RECENT_ROUNDS} 轮、当前侧写原稿与上一版对照。**禁止**臆造长期记忆/向量召回。
- **玩家身份卡修订优先**：学校/专业/职业等客观背景以「已知档案线索」身份卡为准。
- **禁止**聊天正文、JSON、代码围栏、解释。
- **只**输出：
${OBS_NOTES_PATCH_MARKER}
然后逐行「标签｜内容」。

【必须交的标签（缺一不可）】
姓名｜…（本名/常用本名；可加你怎么记在心里的一句，但别把口头称呼整段塞进姓名）
性别｜…
性取向｜…（无依据→「尚不清楚／暂时不知道」类；近端有则用你的口吻写）
食物｜…（同上）
雷点｜…（同上）
爱好｜…（同上）
线上备注｜…（通讯录备注；跟好感/关系对齐；像你会取的；禁XX狗/XX猫）
称呼｜…（你口头怎么叫；可多项；须像你会说出口）
好感｜0-100 数字
关系｜…（**禁止**只写「热恋/暧昧/好友」单标签；须带你对这段关系的态度）
评价｜一两句（第一人称，贴人设）
优点｜…｜…（可用｜分隔；主观，勿公文）
缺点｜…｜…
人格｜外向N 直觉N 理性N 决断N 开放N 共情N
人格注｜…（一句主观手记）
能力｜智商N 情商N 胆商N 逆商N 创商N 健商N
能力注｜…（一句主观手记）
亲密｜…
XP｜…
敏感处｜…
亲密方式｜…

【亲密四栏 · 性向身体亲密】
- 写身体接触/吻触/爱抚节奏与部位癖好，禁止感情节奏空话。
- 例：亲密｜喜欢热烈的、慢慢的、引导的、半推半就的
- 例：XP｜喜欢锁骨、脚踝、小腹、亲密时放音乐
- 例：敏感处｜小腹、耳后、嘴唇
- 例：亲密方式｜温柔的接吻、被从背后抱然后被亲耳朵和脖子
- **暂时不知道通则（仅事实栏）**：食物/雷点/爱好/性取向/亲密四栏等无依据时可写「尚不清楚」「暂时不知道」类，禁止瞎编。
- **态度栏不适用「不知道瘦身」**：称呼/关系/评价/备注等有原稿或近端关系证据时，必须写满贴人设的第一人称，禁止偷懒短标签。
- **禁止照抄无证据旧亲密身体认知**：原稿里旧的亲密/XP/敏感处/方式，本轮材料没提 → 改成不知道类。
- **不要写心动瞬间 / 深刻往事**：侧写只记稳定认知与态度。

【口吻检查（交卷前自检）】
- 若把「关系 / 称呼 / 评价」里的态度词、亲昵与人设口癖删掉后仍像百科 → 不合格，重写到像你在跟对方相处。
- 活人感，禁止 OOC / 公文 / 百科腔 / 中立档案员腔。
`.trim()
}

export async function runObservationNotesManualUpdate(params: {
  conversationCharacterId: string
  playerIdentityId: string
  charDisplayName: string
  wechatCtx: AnonymousQaWechatContext
}): Promise<ObservationNotesManualUpdateResult> {
  const cfg = params.wechatCtx.apiConfig
  if (!cfg?.apiUrl?.trim() || !cfg.apiKey?.trim() || !cfg.modelId?.trim()) {
    return { status: 'failed', reason: '未配置 AI API' }
  }

  const cid = params.conversationCharacterId.trim()
  const pid = params.playerIdentityId.trim()
  if (!cid || !pid || pid === '__none__') {
    return { status: 'failed', reason: '无效角色或身份' }
  }

  const character = (await personaDb.getCharacter(cid)) as Character | null
  if (!character) return { status: 'failed', reason: '角色不存在' }

  const charName =
    params.charDisplayName.trim() ||
    character.name?.trim() ||
    character.wechatNickname?.trim() ||
    'TA'

  const doc =
    (await loadObservationNotes({
      conversationCharacterId: cid,
      playerIdentityId: pid,
      charDisplayName: charName,
      seedIfEmpty: false,
    })) ??
    createBlankObservationNotesDoc({
      conversationCharacterId: cid,
      playerIdentityId: pid,
      charDisplayName: charName,
    })

  const acc = params.wechatCtx.wechatAccountId?.trim() || ''
  const sessionPid = await resolveActivePrivateChatSessionPlayerIdentityId({
    characterId: cid,
    wechatAccountId: acc || null,
    appPlayerIdentityId: pid,
  })
  const conversationKey = acc
    ? wechatAccountPrivateConversationKey(acc, cid, sessionPid)
    : `${cid}::${sessionPid}`

  const playerIdentity =
    sessionPid && sessionPid !== '__none__'
      ? ((await personaDb.getPlayerIdentity(sessionPid)) as PlayerIdentity | null)
      : null

  let worldBackgroundPrompt: string | undefined
  if (character.worldBackgroundId?.trim()) {
    const bg = await personaDb.getWorldBackground(character.worldBackgroundId.trim())
    const block = formatWorldBackgroundForPrompt(bg)
    if (block.trim()) worldBackgroundPrompt = block
  }

  const [onlineRecent, offlineRecent] = await Promise.all([
    loadManualOnlineRecentBlock(conversationKey),
    formatRecentOfflinePlotsAiRoundsReference(
      cid,
      character.name,
      MANUAL_BLOCK_CHAR_CAP,
      null,
      MANUAL_RECENT_ROUNDS,
    ),
  ])

  const offlineRecentBlock = offlineRecent.trim()
    ? `【线下近端固定 · 最近 ${MANUAL_RECENT_ROUNDS} 轮 AI 剧情及其间玩家输入】\n${clip(
        stripLeadingBracketTitle(offlineRecent),
        MANUAL_BLOCK_CHAR_CAP,
      )}`
    : ''

  const knownFacts = formatKnownUserFactsForObservationNotes(
    playerIdentity,
    params.wechatCtx.playerDisplayName,
    { evidenceMode: 'recent_rounds' },
  )

  const manuscriptRef = formatObservationNotesManuscriptReferenceBlock(doc, { evidenceMode: 'recent_rounds' })
  const notesContext = formatObservationNotesUpdateContextBlock(doc, {
    knownUserFactsBlock: knownFacts,
    evidenceMode: 'recent_rounds',
  })

  const recentContext = [onlineRecent, offlineRecentBlock].filter(Boolean).join('\n\n')

  const baseSystem = buildSystemContent({
    character,
    playerIdentity,
    playerDisplayName: params.wechatCtx.playerDisplayName.trim() || '你',
    promptMode: 'persona',
    worldBackgroundPrompt,
    // 手动重生成：不注入长期记忆 / 剧情时间轴向量召回；近端轮次只放在下方 user 任务
    longTermMemoryNotes: undefined,
    storyTimelineNotes: undefined,
    offlineDatingPlotsContext: undefined,
    unsummarizedPrivateNotes: undefined,
    unsummarizedGroupNotes: undefined,
    userDeepCognitionNotes: notesContext,
    chatMemberIds: [cid],
  })

  const appendix = buildManualFullRewriteAppendix(charName)
  const userTask = `请对照下列「即将被替换的当前侧写原稿」+ 线上/线下近端各 ${MANUAL_RECENT_ROUNDS} 轮，用你（角色）的**第一人称、贴人设、贴当前亲密关系**的语气**整份重写**侧写。

硬优先级：
1) **口吻**：称呼 / 关系 / 评价 / 备注 / 优缺点 / 人格注·能力注 必须像你在私藏笔记里写对方，**禁止**中性短标签（如把「名正言顺的热恋男朋友…」压成「热恋」）。
2) **态度栏继承**：原稿里已有的亲昵浓度，近端无降温/纠正时必须保留同等浓度，禁止瘦身。
3) **事实栏重判**：本名、学校/专业、食物/雷点/爱好、亲密四栏按身份卡+近端；没提的亲密身体偏好写成「暂时不知道」。
本任务**不使用**向量召回与长期记忆。
只输出 ---OBS--- 后的标签行。

${manuscriptRef}

---
【近端参考（线上 / 线下各至多 ${MANUAL_RECENT_ROUNDS} 轮）】
${recentContext || '（暂无近端线上/线下原文）'}`

  const messages: OpenAiCompatibleMessage[] = [
    { role: 'system', content: `${baseSystem}\n\n${appendix}` },
    { role: 'user', content: userTask },
  ]

  let raw = ''
  try {
    raw = await openAiCompatibleChat(cfg, messages, {
      temperature: 0.68,
      max_tokens: 4500,
    })
  } catch (e) {
    const msg = e instanceof Error && e.message.trim() ? e.message.trim() : '请求失败'
    return { status: 'failed', reason: msg }
  }

  const { patches, judged } = extractObservationNotesPatchBlock(raw)
  if (!judged) {
    return { status: 'failed', reason: '模型未按协议交卷（缺少合法侧写标记）' }
  }
  if (!patches.length) {
    return { status: 'failed', reason: '整份重填未写出字段，请重试' }
  }

  const applied = await applyObservationNotesPatchesFromAi({
    conversationCharacterId: cid,
    playerIdentityId: pid,
    charDisplayName: charName,
    patches,
    playerDisplayName: params.wechatCtx.playerDisplayName.trim() || undefined,
    rewriteFromBlank: true,
    eventSource: 'manual',
  })

  const next =
    (await loadObservationNotes({
      conversationCharacterId: cid,
      playerIdentityId: pid,
      charDisplayName: charName,
      seedIfEmpty: false,
    })) ?? doc

  if (!applied.applied) {
    return {
      status: 'failed',
      reason: '整份重填未能写入，请重试',
      doc: next,
    }
  }

  return { status: 'updated', doc: next, diffCount: applied.diffCount }
}
