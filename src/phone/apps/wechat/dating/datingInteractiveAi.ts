/**
 * 互动模式 · 多气泡动描回复
 * 内容全部由模型生成；本地只做 JSON 解析供 UI 展示，不重排、不过滤、不兜底拼装正文。
 */

import { openAiCompatibleChat } from '../newFriendsPersona/ai'
import type { ApiConfig } from '../../api/types'
import {
  buildDatingCharUserPerspectiveDirective,
  expandCharUserPlaceholders,
} from '../charUserPlaceholders'
import { parseDatingPlayerInput } from './formatDatingPlayerInputForPrompt'
import { buildUserReactionPromptBlock } from './userReactionPrompt'
import type { CharacterInfo, PlotItem } from './types'
import type { InteractiveBubble, InteractiveBubbleKind, InteractiveTurn } from './datingInteractiveTypes'
import {
  clampInteractiveMinBubbles,
  INTERACTIVE_MIN_BUBBLES_DEFAULT,
} from './datingInteractiveTypes'
import { splitDatingAssistantOutput } from './plotCoT'
import { extractVnVoiceParamsBlock } from './vnVoiceParamsStrip'
import { buildWorldbookContext } from '../../../worldbook/buildWorldbookContext'
import {
  getWorldbookLoreEntriesSnapshot,
} from '../../../worldbook/worldbookLoreStore'
import { personaDb } from '../newFriendsPersona/idb'
import { buildCharacterCard, buildWorldBookText } from '../wechatChatAi'
import { buildOfflineDatingSlimMustInjectBody } from './offlineDatingMustInjectPrompts'
import { getActiveCustomWritingInjectBody } from './datingWritingPresetStore'
import { resolveOfflineReplyStyleAppendix } from '../../thinkingChain/cotAssemble'
import { buildDatingStyleSystemAppend } from './datingStylePrompt'
import { loadDatingStyleTuning } from './styleTuningStorage'
import { PROSE_FORBIDDEN_LEXICON_PROMPT, PROSE_FORBIDDEN_TOP_PRIORITY_PIN } from '../proseForbiddenLexiconPrompt'

export type DatingInteractiveBridgeContext = {
  longTermMemory: string
  unsummarizedPrivateBlock: string
  unsummarizedGroupBlock: string
  unsummarizedOfflineBlock: string
  storyTimelineBlock: string
  storyNowLabel: string
  storyCalendarAnchor: string
}

function clip(text: string, max: number): string {
  const t = String(text ?? '').trim()
  if (!t) return ''
  if (t.length <= max) return t
  return `${t.slice(0, Math.max(0, max - 1))}…`
}

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function stripJsonFence(s: string): string {
  let t = String(s || '').trim().replace(/^\uFEFF/, '')
  while (t.includes('```')) {
    const start = t.indexOf('```')
    const afterLang = t.indexOf('\n', start)
    const close = t.indexOf('```', afterLang >= 0 ? afterLang + 1 : start + 3)
    if (afterLang < 0 || close < 0) {
      t = t.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
      break
    }
    t = t.slice(afterLang + 1, close).trim()
  }
  return t.trim()
}

function plotBody(p: PlotItem): string {
  const raw = String(p.content || '').trim()
  if (!raw) return ''
  if (p.type === 'ai') {
    return extractVnVoiceParamsBlock(splitDatingAssistantOutput(raw).content).cleanedText.trim()
  }
  return raw
}

function formatSessionTranscript(turns: InteractiveTurn[], charName: string): string {
  const lines: string[] = []
  for (const t of turns) {
    if (t.role === 'user') {
      const text = t.rawText?.trim() || t.bubbles.map((b) => b.text).join(' ')
      if (text) lines.push(`【你】${clip(text, 400)}`)
    } else {
      for (const b of t.bubbles) {
        const tag = b.kind === 'dialogue' ? '对白' : b.kind === 'thought' ? '内心' : '动描'
        lines.push(`【${charName}·${tag}】${clip(b.text, 280)}`)
      }
    }
  }
  return clip(lines.join('\n'), 3500)
}

function buildRecentPlotTail(plots: PlotItem[]): string {
  const usable = plots
    .map((p) => ({ p, body: plotBody(p) }))
    .filter((x) => x.body)
    .slice(-4)
  if (!usable.length) return '（尚无推进剧情，从当前场景自然接戏）'
  return usable
    .map(({ p, body }) => `【${p.type === 'player' ? '玩家' : '剧情'}】\n${clip(body, 500)}`)
    .join('\n\n')
}

function formatBridgeContextForPrompt(bridge: DatingInteractiveBridgeContext | null | undefined): string {
  if (!bridge) return ''
  const parts: string[] = []
  const now = bridge.storyNowLabel.trim() || bridge.storyCalendarAnchor.trim()
  if (now) {
    parts.push(
      `【剧情时间锚点·须承接】故事「现在」= **${now}**。本拍互动须停在该时刻的当面场景，禁止无故跳时跳场；时刻可略往后，日期默认同日。`,
    )
  }
  if (bridge.storyTimelineBlock.trim()) {
    parts.push(`【剧情时间轴】\n${clip(bridge.storyTimelineBlock.trim(), 3200)}`)
  }
  if (bridge.unsummarizedOfflineBlock.trim()) {
    parts.push(`【尚未总结·线下剧情】\n${clip(bridge.unsummarizedOfflineBlock.trim(), 4000)}`)
  }
  if (bridge.unsummarizedPrivateBlock.trim()) {
    parts.push(
      `【尚未总结·线上私聊】（与线下同一人；事实优先，口吻仅辅助）\n${clip(
        bridge.unsummarizedPrivateBlock.trim(),
        2800,
      )}`,
    )
  }
  if (bridge.unsummarizedGroupBlock.trim()) {
    parts.push(`【尚未总结·群聊】\n${clip(bridge.unsummarizedGroupBlock.trim(), 1600)}`)
  }
  if (bridge.longTermMemory.trim()) {
    parts.push(`【长期记忆】\n${clip(bridge.longTermMemory.trim(), 2200)}`)
  }
  return parts.join('\n\n')
}

function normalizeKind(raw: unknown): InteractiveBubbleKind {
  const k = String(raw ?? '')
    .trim()
    .toLowerCase()
  if (k === 'dialogue' || k === '对白' || k === 'speech' || k === 'say') return 'dialogue'
  if (k === 'thought' || k === '内心' || k === 'os' || k === 'inner') return 'thought'
  return 'action'
}

/** 仅解析模型 JSON，不改写正文顺序/内容 */
function parseBubblesJson(raw: string): InteractiveBubble[] {
  const t = stripJsonFence(raw)
  let arr: unknown[] | null = null
  try {
    const parsed = JSON.parse(t) as unknown
    if (Array.isArray(parsed)) arr = parsed
    else if (parsed && typeof parsed === 'object' && Array.isArray((parsed as { bubbles?: unknown }).bubbles)) {
      arr = (parsed as { bubbles: unknown[] }).bubbles
    }
  } catch {
    throw new Error('互动回复解析失败：模型未返回可用 JSON')
  }
  if (!arr?.length) throw new Error('互动回复为空')

  const out: InteractiveBubble[] = []
  for (const row of arr) {
    if (!row || typeof row !== 'object') continue
    const r = row as { kind?: unknown; type?: unknown; text?: unknown; content?: unknown }
    const text = String(r.text ?? r.content ?? '').trim()
    if (!text) continue
    out.push({
      id: uid('b'),
      kind: normalizeKind(r.kind ?? r.type),
      text,
    })
  }
  if (!out.length) throw new Error('互动回复解析失败：没有有效气泡')
  return out
}

function userInputToBubbles(raw: string): InteractiveBubble[] {
  const segs = parseDatingPlayerInput(raw)
  if (!segs.length) {
    const t = raw.trim()
    return t ? [{ id: uid('b'), kind: 'action', text: t }] : []
  }
  return segs.map((s) => ({
    id: uid('b'),
    kind: s.kind === 'dialogue' ? 'dialogue' : s.kind === 'innerThought' ? 'thought' : 'action',
    text: s.text,
  }))
}

/** 从互动拍正文反解气泡（旧档无 interactiveBubbles 时回退） */
export function contentToInteractiveBubbles(content: string): InteractiveBubble[] {
  return userInputToBubbles(String(content || ''))
}

export function buildInteractiveUserTurn(raw: string): InteractiveTurn {
  return {
    id: uid('tu'),
    role: 'user',
    rawText: raw.trim(),
    bubbles: userInputToBubbles(raw),
    createdAt: Date.now(),
  }
}

async function loadPersonaBlocks(character: CharacterInfo): Promise<{
  personaWb: string
  archiveBlock: string
  cardHint: string
}> {
  const datingWbIds = [character.id].map((x) => String(x ?? '').trim()).filter(Boolean)
  const archiveBlock = clip(
    buildWorldbookContext(datingWbIds, getWorldbookLoreEntriesSnapshot(), 'offline_plot').trim(),
    2800,
  )
  let personaWb = ''
  let cardHint = clip(character.prompt || '', 1600)
  try {
    const row = await personaDb.getCharacter(character.id)
    if (row) {
      personaWb = clip(buildWorldBookText(row, 2200), 2200)
      const card = buildCharacterCard(row).trim()
      if (card) cardHint = clip(card, 1600)
      else {
        const bits = [row.name?.trim(), row.wechatNickname?.trim(), row.bio?.trim(), row.identity?.trim()].filter(
          Boolean,
        )
        if (bits.length) cardHint = clip(bits.join('\n'), 1600)
      }
    }
  } catch {
    /* keep dating CharacterInfo.prompt */
  }
  return { personaWb, archiveBlock, cardHint }
}

export async function generateInteractiveCharReply(params: {
  apiConfig: ApiConfig | null
  character: CharacterInfo
  plots: PlotItem[]
  priorTurns: InteractiveTurn[]
  latestUserText: string
  /** 与线下推进同一套桥接上下文（时间轴 / 线上未总结 / 长期记忆） */
  bridgeContext?: DatingInteractiveBridgeContext | null
  /** 每轮至少气泡条数（下限，可多于） */
  minBubbles?: number
}): Promise<InteractiveBubble[]> {
  const { character, plots, priorTurns, latestUserText, bridgeContext } = params
  const charName = character.realName?.trim() || '角色'
  const api = params.apiConfig
  const minBubbles = clampInteractiveMinBubbles(
    params.minBubbles ?? INTERACTIVE_MIN_BUBBLES_DEFAULT,
  )
  const softMaxHint = Math.min(12, minBubbles + 4)

  if (!api?.apiUrl?.trim() || !api?.apiKey?.trim() || !api?.modelId?.trim()) {
    throw new Error('请先配置聊天 API，再使用互动模式')
  }

  const directive = buildDatingCharUserPerspectiveDirective(charName, '你')
  const plotTail = buildRecentPlotTail(plots)
  const sessionLog = formatSessionTranscript(priorTurns, charName)
  const bridgeBlock = formatBridgeContextForPrompt(bridgeContext)
  const { personaWb, archiveBlock, cardHint } = await loadPersonaBlocks(character)

  const noUserProxyBlock = buildUserReactionPromptBlock({
    autoUserReaction: false,
    godPerspective: false,
    userDisplayName: '你',
    characterRealName: charName,
    isVnMode: false,
    narrativePerspective: 'third',
  })

  /** 与普通约会推进同一套：扮演核心 + 写作板块 / 自定义写作 + 文风白描 + 禁词 */
  const customWritingPrompt = getActiveCustomWritingInjectBody()
  const slimMustInject = buildOfflineDatingSlimMustInjectBody({
    customWritingPrompt,
    replyStyleOverride: resolveOfflineReplyStyleAppendix(),
  })
  const usingCustomWriting = typeof customWritingPrompt === 'string'
  const proseTail = usingCustomWriting
    ? `\n\n${PROSE_FORBIDDEN_TOP_PRIORITY_PIN}\n\n${PROSE_FORBIDDEN_LEXICON_PROMPT}`
    : ''
  const styleTuning = loadDatingStyleTuning(character.id)
  const styleAppend = buildDatingStyleSystemAppend({
    stylePrompt: styleTuning.stylePrompt,
    referenceSnippet: styleTuning.referenceSnippet,
  })

  const systemRaw = `${directive}

你正在「线下互动模式」：慢节奏、短拍。**只写旁白动描 + ${charName} 的对白**，二者穿插。不是整章剧情，也不是微信气泡堆。

【文风对齐·与普通约会同规｜最高优先级】
互动模式与普通约会推进**共用同一套写作规则**：下方【线下剧情扮演总规则】、写作禁词、文风白描必须全文服从。
- **禁止**另开油腻网文/霸总腔：品尝权、整个人都是你的、心跳撞胸口、耳朵红得滴血、低沉压抑发狠、老板玩梗宠溺称等一律禁。
- 亲密可写，但只写可见动作与短口语；对白须像真人当面会说的话，禁止台词化撩拨与土味情话堆砌。
- 句法跟文风白描；通道仍是短气泡 JSON，**不是**换一套更油的文风。

客户端会原样展示你返回的 bubbles（顺序与正文均不改写）。请一次输出完整、可用的 JSON。

【衔接铁则】须承接下方「剧情时间锚点 / 时间轴 / 尚未总结·线下 / 线上私聊」与近期剧情；与从推进模式切到当面互动时一致——人物关系、地点、已发生事实不得断层；禁止装作线上聊天或线下剧情未发生。

【不抢话｜最高优先级·互动模式锁死】
${noUserProxyBlock}
- 互动模式**永久关闭抢话**：玩家任何新动作、神态、选择、开口，**必须等用户自己下一条输入**；你**不得**替用户做任何反应。
- 动描里**角色**用第三人称（${charName}/他/她）；**称呼玩家必须用第二人称「你/你的」**，**禁止**在动描里写玩家真名、昵称、小名、姓氏（例：须写「他看向你」，禁止「他看向某某」）。
- **禁止代写玩家新动作**：不要写「你伸手…」「你点头…」「你开口说…」这类尚未由用户输入的玩家行为；玩家上一拍已输入的内容只当作已发生事实来接，可写 ${charName} 对此的反应（如「他听见你这么说，顿了顿」）。
- 对白只能是 **${charName} 说出口的话**；禁止替玩家编引号台词。
- **禁止学用户说话**：对白必须是 ${charName} 本人的口吻与人设，不得套用玩家用词习惯、句式或语气来「像用户」。
- 玩家上一拍已输入的内容：只当作「已经发生、你已感知」的事实来接戏，**不要再代写一遍玩家动作**。

【贴人设铁则】
- 对白的词、态度、亲密度、口癖，必须像同一人在当面会说的话（服从角色档案 / 人设世界书 / 档案室）。
- **禁止**客服腔、油腻霸总、爹味说教、无端读心、土味情话模板。

${slimMustInject}
${styleAppend}${proseTail}

【通道格式｜互动专用】
1. 只输出 JSON：{"bubbles":[{"kind":"action"|"dialogue","text":"..."}, ...]}
2. **禁止** kind=thought / 内心 OS；不要写玩家视角旁白长文。
3. bubbles **至少 ${minBubbles} 条**（下限硬约束）：可以是 ${minBubbles}、${minBubbles + 1}、… 乃至约 ${softMaxHint} 条；**禁止少于 ${minBubbles} 条**。条数随戏份自然浮动，不是固定死 ${minBubbles}。
4. **必须穿插**：优先 \`action → dialogue → action → dialogue …\`。
5. **action（动描）**：写 ${charName} 的动作/神态/呼吸/视线或环境反馈；白描短句；**指玩家一律用「你」**；禁止引号对白；禁止代写玩家新动作；禁止油腻感官堆砌。
6. **dialogue（对白）**：纯口播，不要外加引号、不要（括号神态）；短句口语、贴人设；一条 ≈ 当面一句短话。禁止品尝权/整个人都是你的/心跳撞出胸口一类油句。
7. 单条 text ≤ 60 汉字；紧接玩家最新输入；禁止跳时跳场；禁止一次写完整场戏。
8. 禁止思维链、禁止 JSON 外解释。

角色：${charName}
【人设/档案摘要】
${cardHint || '（无额外摘要，严格按世界书）'}
${personaWb ? `\n【人设世界书】\n${personaWb}` : ''}
${archiveBlock ? `\n【档案室·线下】\n${archiveBlock}` : ''}
`

  const system = expandCharUserPlaceholders(systemRaw, { charName, userName: '你' })

  const user = `${bridgeBlock ? `${bridgeBlock}\n\n` : ''}【近期剧情锚点】
${plotTail}

【本段互动已发生】
${sessionLog || '（刚进入互动，尚无对戏）'}

【玩家最新输入】（仅事实；勿代写玩家下一拍；动描里称呼玩家用「你」勿用人名）
${latestUserText.trim()}

请只输出 ${charName} 侧：旁白动描 + 对白穿插的 JSON（bubbles 至少 ${minBubbles} 条、可更多；须服从普通约会同款文风与禁词；动描指玩家用「你」；禁止抢话 / 禁止代写玩家 / 禁止油腻腔）。`

  const callOnce = async (extraUserHint?: string) => {
    const raw = await openAiCompatibleChat(
      api,
      [
        { role: 'system', content: system },
        {
          role: 'user',
          content: extraUserHint ? `${user}\n\n${extraUserHint}` : user,
        },
      ],
      { temperature: 0.72, max_tokens: 900, response_format: 'json_object' },
    )
    return parseBubblesJson(String(raw || ''))
  }

  let bubbles = await callOnce()
  if (bubbles.length < minBubbles) {
    bubbles = await callOnce(
      `【补足条数】上一稿只有 ${bubbles.length} 条，不足下限。请重写整份 JSON：bubbles 必须 ≥ ${minBubbles} 条（可为 ${minBubbles}～${softMaxHint}+），仍穿插 action/dialogue，禁止注水空话。`,
    )
  }
  if (bubbles.length < minBubbles) {
    throw new Error(`对方这拍只有 ${bubbles.length} 条，未达到至少 ${minBubbles} 条，请重试或调低下限`)
  }
  return bubbles
}

/** 单拍 → 剧情正文（与普通页 parsePlotRichText 标记一致） */
export function formatInteractiveTurnForPlot(turn: InteractiveTurn, charName: string): string {
  const lines: string[] = []
  if (turn.role === 'user') {
    const raw = turn.rawText?.trim()
    if (raw) return raw
    for (const b of turn.bubbles) {
      if (b.kind === 'dialogue') lines.push(`"${b.text}"`)
      else if (b.kind === 'thought') lines.push(`**${b.text}**`)
      else lines.push(b.text)
    }
    return lines.join('\n')
  }
  for (const b of turn.bubbles) {
    if (b.kind === 'dialogue') lines.push(`"${b.text}"`)
    else if (b.kind === 'thought') lines.push(`**${b.text}**`)
    else lines.push(b.text)
  }
  const body = lines.join('\n').trim()
  return body || `（${charName} 本拍无输出）`
}

/** 把整段互动收成可写入 plots 的正文（兼容旧收束；现以按拍同步为主） */
export function formatInteractiveSessionForPlots(
  turns: InteractiveTurn[],
  charName: string,
): { playerContent: string; aiContent: string } {
  const playerParts: string[] = []
  const aiParts: string[] = []

  for (const t of turns) {
    if (t.role === 'user') {
      const raw = t.rawText?.trim()
      if (raw) {
        playerParts.push(raw)
        continue
      }
      for (const b of t.bubbles) {
        if (b.kind === 'dialogue') playerParts.push(`"${b.text}"`)
        else if (b.kind === 'thought') playerParts.push(`**${b.text}**`)
        else playerParts.push(b.text)
      }
    } else {
      for (const b of t.bubbles) {
        if (b.kind === 'dialogue') aiParts.push(`"${b.text}"`)
        else if (b.kind === 'thought') aiParts.push(`**${b.text}**`)
        else aiParts.push(b.text)
      }
    }
  }

  const playerContent =
    playerParts.length > 0
      ? `【互动模式·玩家】\n${playerParts.join('\n')}`
      : '【互动模式·玩家】（本段无玩家发言，仅角色侧接戏）'

  const aiContent =
    aiParts.length > 0
      ? `【互动模式·现场纪要 · ${charName}】\n${aiParts.join('\n')}`
      : `【互动模式·现场纪要 · ${charName}】（本段几乎没有角色输出）`

  return { playerContent, aiContent }
}
