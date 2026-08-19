/**
 * 七夕告白信 · AI 生成
 * 上下文仅：人设世界书（含尾声延展）+ 线上/线下最近 5 轮模型输出原文。
 */

import type { ApiConfig } from '../api/types'
import { openAiCompatibleChat, type OpenAiCompatibleMessage } from '../wechat/newFriendsPersona/ai'
import { personaDb } from '../wechat/newFriendsPersona/idb'
import type { Character, PlayerIdentity } from '../wechat/newFriendsPersona/types'
import { formatPlayerIdentityDisplayName } from '../wechat/wechatCharacterPlayerIdentity'
import { buildWorldBookTextForPrompt } from '../wechat/wechatChatAi'
import { expandCharUserPlaceholders } from '../wechat/charUserPlaceholders'
import {
  formatRecentAiRoundsPrivateChatByCharacter,
  formatRecentOfflinePlotsAiRoundsReference,
} from '../wechat/memory/recentAiRoundsReferencePrompt'
/** 提示词规定篇幅；不够也不二次请求扩写 */
export const QIXI_LETTER_MIN_CHARS = 1000
export const QIXI_LETTER_TARGET_CHARS = 1500

/** 线上 / 线下各取最近 N 轮 AI 输出原文 */
const QIXI_CONTEXT_AI_ROUNDS = 5

export type QixiLetterResult = {
  title: string
  greeting: string
  body: string
  closing: string
  signature: string
  /** 落款时间，如 2026年8月19日 14:32 */
  signedAt: string
  charCount: number
}

export function formatQixiSignedAt(d = new Date()): string {
  const y = d.getFullYear()
  const m = d.getMonth() + 1
  const day = d.getDate()
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${y}年${m}月${day}日 ${hh}:${mm}`
}

function looksLikeConfirmedLovers(hay: string): boolean {
  return /已确认恋人|已确认恋爱|恋爱后|情侣|男女朋友|女朋友|男朋友|恋人关系|我们在一起|确认交往|正式交往/.test(
    hay,
  )
}

function intimateSignName(charName: string): string {
  const n = charName.trim()
  if (!n) return '我'
  if (/^[\u4e00-\u9fff]+$/.test(n) && n.length >= 3) return n.slice(-2)
  return n
}

function intimateCallName(userName: string): string {
  const n = userName.trim()
  if (!n) return '你'
  if (/^[\u4e00-\u9fff]+$/.test(n) && n.length >= 3) return n.slice(-2)
  return n
}

function ensureLetterColon(s: string): string {
  const t = s.trim().replace(/[：:]\s*$/, '')
  return t ? `${t}：` : t
}

const INTIMATE_GREETING_MARK = /亲爱的|我的|最爱|最最喜欢|宝贝|宝宝|心肝|乖乖|小可爱|专属|心上人/

function pickIntimateGreeting(userName: string, charName: string): string {
  const userPet = intimateCallName(userName)
  const charPet = intimateSignName(charName)
  const options = [
    `亲爱的${userPet}`,
    `我最最喜欢的${userPet}`,
    `${charPet}最爱的${userPet}`,
    `我最爱的${userPet}`,
    `亲爱的${userName}`,
  ]
  return options[(userName.length + charName.length) % options.length]
}

function softenGreeting(raw: string, userName: string, charName: string, lovers: boolean): string {
  const t = raw.trim()
  if (!lovers) return t ? ensureLetterColon(t) : ensureLetterColon(userName)
  const fallback = pickIntimateGreeting(userName, charName)
  if (!t) return ensureLetterColon(fallback)
  const core = t.replace(/[：:]\s*$/, '').trim()
  if (INTIMATE_GREETING_MARK.test(core) && core.length >= 4) return ensureLetterColon(core)
  const userPet = intimateCallName(userName)
  if (
    core === userName ||
    core === userPet ||
    core === `你好，${userName}` ||
    core === `你好，${userPet}` ||
    /^[\u4e00-\u9fff]{1,4}$/.test(core)
  ) {
    return ensureLetterColon(fallback)
  }
  return ensureLetterColon(`亲爱的${core}`)
}

function softenSignature(raw: string, charName: string, lovers: boolean): string {
  const t = raw.trim()
  const short = intimateSignName(charName)
  if (!t) return lovers ? `爱你的${short}` : charName
  if (!lovers) return t
  if (t === charName || t === short) return `爱你的${short}`
  return t
}

function countCjk(text: string): number {
  const m = String(text ?? '').match(/[\u4e00-\u9fff]/g)
  return m ? m.length : 0
}

function stripFence(s: string): string {
  const t = String(s ?? '').trim()
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fence?.[1]) return fence[1].trim()
  return t
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()
}

function parseQixiLetterModelText(raw: string): {
  title: string
  greeting: string
  content: string
  signature: string
} {
  const t = stripFence(raw)
  const start = t.indexOf('{')
  const end = t.lastIndexOf('}')
  if (start < 0 || end <= start) throw new Error('模型未返回 JSON')
  let obj: Record<string, unknown>
  try {
    obj = JSON.parse(t.slice(start, end + 1)) as Record<string, unknown>
  } catch {
    throw new Error('告白信 JSON 解析失败')
  }
  const title = String(obj.title ?? '').trim() || '写给你的七夕'
  const greeting = String(obj.greeting ?? '').trim()
  let content = String(obj.content ?? obj.body ?? '').trim()
  if (!content) throw new Error('模型未返回正文')
  if (greeting) {
    const g = greeting.replace(/[：:]\s*$/, '')
    const re = new RegExp(`^${g.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[：:]?\\s*\\n*`, 'u')
    content = content.replace(re, '').trim()
  }
  return {
    title,
    greeting,
    content,
    signature: String(obj.signature ?? '').trim(),
  }
}

function buildQixiLetterAppendix(params: {
  charName: string
  userName: string
  signedAt: string
  lovers: boolean
}): string {
  const loverBlock = params.lovers
    ? `
- 【恋人向】材料显示你们已是确认恋人/情侣。请写得更温柔、更真诚、更直球：把爱意说清楚，不要绕弯、不要高冷装没事、不要油腻霸总腔。可以说想、可以说爱、可以记具体相处；克制也可以，但必须让对方明确感到被爱。
- 【抬头必须亲密】greeting **禁止**只写对方姓名或昵称（如「${params.userName}：」）。必须带亲昵修饰，优先写成下面这类（把××换成爱称、小名，或名字里更亲的那一截）：「亲爱的××：」「我最最喜欢的××：」「${intimateSignName(params.charName)}最爱的××：」「我最爱的××：」「我的××：」。可以叠词、可以撒娇，不要证件式、不要「尊敬的 / 你好，××」。`
    : `
- 口吻贴合当前关系阶段；尚未确认为恋人时不要越级官宣，可写在意与心动，仍须真诚。
- greeting 可用你们日常会叫的称呼；没有亲密称呼时再退回名字，不要突然「亲爱的宝宝」。`

  return `
---
【系统任务：七夕告白信】
今天是七夕。你是「${params.charName}」，以第一人称写给对方一封私密告白信（对方档案名「${params.userName}」仅作身份对照，**不是**必须出现在抬头的称呼）。
**仅**依据下方【人设世界书】（含序言介入与尾声延展）与【线上/线下最近 ${QIXI_CONTEXT_AI_ROUNDS} 轮原文】把握人设与关系；不要编造与之矛盾的设定。
${loverBlock}

要求：
- 温柔、真诚；仪式感靠具体相处细节，不要空喊口号、不要注水排比。
- 禁止 OOC、油腻霸总腔、病态占有独白。
- 正文完整收束，段间用 \\n\\n。
- 【篇幅硬性】content 汉字**不少于 ${QIXI_LETTER_MIN_CHARS} 字**，目标约 ${QIXI_LETTER_TARGET_CHARS} 字；用具体相处与真心话写满，禁止注水空话、禁止同义反复。一次写完，不要偷工减料。
- content 不要重复 greeting，也不要写落款日期（系统会另加）。
- 【结尾】收束写对往后的盼望、想一起过的日子、慢慢来的约定即可。**禁止**写马上见面的线下指令：不要「把门打开」「我已经在门口/楼下」「等会儿见」「宵夜拎来了」「立刻热吻」这类像此刻就要赴约的句子。即使近期剧情有线下，信末也只许写成对未来的期望，不当成当场行程单。
- 【颜文字】正文里适量点缀可爱颜文字（不是 emoji 表情符号），让信更软、更亲。可穿插在段末、撒娇处、结尾期许旁，例如 (≧▽≦) (´▽`ʃ♡ƪ) (〃'▽'〃) (´∀｀)♡ (๑´ㅂ`๑) ⁄(⁄ ⁄•⁄ω⁄•⁄ ⁄)⁄ (づ￣ 3￣)づ ♡。全文大约 4～8 处即可，不要每句都加，也不要连成一串；口吻偏克制时少用、偏黏人时多用，仍须贴合人设。
- 【落款】signature 要有感情，不要只用证件全名。恋人可写「爱你的××」「最爱你的××」「永远偏心你的××」；可用小名、昵称或名字里更亲的那一截，不必全名。非恋人不要硬套「爱你的」，可贴合关系写克制落款。落款旁也可跟一个很轻的颜文字。
- 严格返回 JSON，不要 Markdown，不要解释：
{
  "title": "短标题",
  "greeting": "亲密抬头（含冒号，如：亲爱的××：／我最最喜欢的××：／${intimateSignName(params.charName)}最爱的××：）",
  "content": "信的正文（不要再写抬头）",
  "signature": "有感情的落款（如：爱你的××／最爱你的××）"
}
`.trim()
}

export async function generateQixiConfessionLetter(params: {
  character: Character
  playerIdentity: PlayerIdentity | null
  playerDisplayName: string
  wechatAccountId: string | null
  apiConfig: ApiConfig
}): Promise<QixiLetterResult> {
  const cfg = params.apiConfig
  if (!cfg.apiUrl?.trim() || !cfg.apiKey?.trim() || !cfg.modelId?.trim()) {
    throw new Error('未配置 AI API')
  }

  const character = params.character
  const cid = character.id.trim()
  const charName = character.name?.trim() || character.wechatNickname?.trim() || '我'
  const userName =
    params.playerDisplayName.trim() ||
    (params.playerIdentity
      ? formatPlayerIdentityDisplayName(params.playerIdentity, params.playerIdentity.id)
      : '你')

  const [worldBookRaw, onlineBlock, offlineBlock] = await Promise.all([
    buildWorldBookTextForPrompt(character),
    formatRecentAiRoundsPrivateChatByCharacter({
      characterId: cid,
      retainAiRounds: QIXI_CONTEXT_AI_ROUNDS,
      maxChars: 8000,
    }),
    formatRecentOfflinePlotsAiRoundsReference(cid, userName, 8000, null, QIXI_CONTEXT_AI_ROUNDS),
  ])

  const worldBookText = expandCharUserPlaceholders(worldBookRaw || '', {
    charName,
    userName,
  }).trim()

  const contextParts = [
    worldBookText
      ? `【人设世界书（含序言介入 / 尾声延展）】\n${worldBookText}`
      : '【人设世界书】\n（暂无启用条目）',
    onlineBlock.trim() ||
      `【最近线上私聊原文（最近 ${QIXI_CONTEXT_AI_ROUNDS} 轮）】\n（暂无）`,
    offlineBlock.trim() ||
      `【最近线下剧情原文（最近 ${QIXI_CONTEXT_AI_ROUNDS} 轮）】\n（暂无）`,
  ]

  const lovers = looksLikeConfirmedLovers(`${worldBookText}\n${onlineBlock}\n${offlineBlock}`)
  const signedAt = formatQixiSignedAt()

  const appendix = buildQixiLetterAppendix({ charName, userName, signedAt, lovers })
  const system = `你正在扮演「${charName}」写信给「${userName}」。\n\n${appendix}`
  const userTask = `请根据下列材料写七夕告白信。${
    lovers
      ? `你们已是恋人：请温柔、真诚、直球地把爱意写清楚。抬头必须写成「亲爱的××」「我最最喜欢的××」「${intimateSignName(charName)}最爱的××」这类，禁止只写昵称或档案名「${userName}」。落款写成「爱你的××」「最爱你的××」这类，不必全名。`
      : '落款可贴合你们当前关系，不要硬套恋人腔。'
  } 信的最后一段只写对未来的期望，不要写马上见面、开门、在门口等着这类线下约定。正文里请适量加可爱颜文字（如 (≧▽≦) (´∀｀)♡），不要用 emoji。\n\n${contextParts.join('\n\n')}`

  const messages: OpenAiCompatibleMessage[] = [
    { role: 'system', content: system },
    { role: 'user', content: userTask },
  ]

  const chatOpts = { temperature: 0.78, max_tokens: 5000 }
  const raw = await openAiCompatibleChat(cfg, messages, chatOpts)
  const parsed = parseQixiLetterModelText(raw)

  const body = parsed.content
  return {
    title: parsed.title,
    greeting: softenGreeting(parsed.greeting, userName, charName, lovers),
    body,
    closing: '',
    signature: softenSignature(parsed.signature, charName, lovers),
    signedAt,
    charCount: countCjk(body),
  }
}

export async function listQixiEnvelopeCharacters(): Promise<Character[]> {
  const all = await personaDb.listCharacters()
  return all
    .filter((c) => !c.generatedForCharacterId && !c.isPlayerIdentity)
    .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))
}
