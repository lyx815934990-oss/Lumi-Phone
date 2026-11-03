import type { ApiConfig } from '../api/types'
import { openAiCompatibleChat } from '../wechat/newFriendsPersona/ai'
import { expandCharUserPlaceholders } from '../wechat/charUserPlaceholders'
import {
  PROSE_FORBIDDEN_LEXICON_PROMPT,
  PROSE_FORBIDDEN_TOP_PRIORITY_PIN,
} from '../wechat/proseForbiddenLexiconPrompt'
import { buildOfflineDatingSlimMustInjectBody } from '../wechat/dating/offlineDatingMustInjectPrompts'
import { getActiveCustomWritingInjectBody } from '../wechat/dating/datingWritingPresetStore'
import { buildDatingStyleSystemAppend } from '../wechat/dating/datingStylePrompt'
import { loadDatingStyleTuning } from '../wechat/dating/styleTuningStorage'

export function requireForumApi(cfg: ApiConfig | null | undefined): ApiConfig {
  if (!cfg?.apiUrl?.trim() || !cfg?.apiKey?.trim()) {
    throw new Error('请先在 API 设置中配置模型后再生成')
  }
  return cfg
}

export function extractJsonObject(raw: string): Record<string, unknown> | null {
  const t = raw.trim()
  const fence = /```(?:json)?\s*([\s\S]*?)```/i.exec(t)
  const body = fence ? fence[1]!.trim() : t
  const start = body.indexOf('{')
  const end = body.lastIndexOf('}')
  if (start < 0 || end <= start) return null
  try {
    const parsed = JSON.parse(body.slice(start, end + 1))
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null
  } catch {
    return null
  }
}

export type ForumFicParsed = {
  title: string
  body: string
  authorNote: string
}

function unescapeJsonStringFragment(s: string): string {
  return s
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\')
}

/** 从可能截断的 JSON 里抠 "key":"..." 字段（支持未闭合字符串） */
function scrapeJsonStringField(raw: string, key: string): string {
  const re = new RegExp(`"${key}"\\s*:\\s*"`, 'i')
  const m = re.exec(raw)
  if (!m || m.index == null) return ''
  let i = m.index + m[0].length
  let out = ''
  while (i < raw.length) {
    const ch = raw[i]!
    if (ch === '\\' && i + 1 < raw.length) {
      out += ch + raw[i + 1]!
      i += 2
      continue
    }
    if (ch === '"') break
    out += ch
    i += 1
  }
  return unescapeJsonStringFragment(out).trim()
}

function stripFicFence(raw: string): string {
  const t = raw.trim()
  const fence = /```(?:json|text|markdown)?\s*([\s\S]*?)```/i.exec(t)
  return (fence ? fence[1]! : t).trim()
}

/** 按多种标签切块：<<<TITLE>>> / 【标题】 / 标题： */
function takeTaggedSection(
  raw: string,
  startPatterns: RegExp[],
  endPatterns: RegExp[],
): string {
  let start = -1
  let startLen = 0
  for (const re of startPatterns) {
    const m = re.exec(raw)
    if (m && m.index != null && (start < 0 || m.index < start)) {
      start = m.index
      startLen = m[0].length
    }
  }
  if (start < 0) return ''
  const after = raw.slice(start + startLen)
  let end = after.length
  for (const re of endPatterns) {
    const m = re.exec(after)
    if (m && m.index != null && m.index < end) end = m.index
  }
  return after.slice(0, end).trim()
}

function parseFicTaggedBlocks(raw: string): ForumFicParsed | null {
  const text = stripFicFence(raw)
  const title = takeTaggedSection(
    text,
    [
      /<<<\s*TITLE\s*>>>/i,
      /【\s*标题\s*】/,
      /^#{1,3}\s*标题\s*/m,
      /^标题\s*[：:]\s*/m,
    ],
    [
      /<<<\s*AUTHOR_NOTE\s*>>>/i,
      /<<<\s*BODY\s*>>>/i,
      /【\s*作者的话\s*】/,
      /【\s*正文\s*】/,
      /^作者的话\s*[：:]/m,
      /^正文\s*[：:]/m,
    ],
  )
  const bodyCutters = [
    /(?:<<<|＜＜＜)\s*COMMENTS?\s*(?:>>>|＞＞＞)/i,
    /(?:<<<|＜＜＜)\s*评论(?:区)?\s*(?:>>>|＞＞＞)/i,
    /【\s*评论(?:区)?\s*】/,
    /(?:<<<|＜＜＜)\s*END\s*(?:>>>|＞＞＞)/i,
    /\{\s*["']comments["']\s*:\s*\[/,
  ]
  let authorNote = takeTaggedSection(
    text,
    [
      /<<<\s*AUTHOR_NOTE\s*>>>/i,
      /【\s*作者的话\s*】/,
      /^作者的话\s*[：:]\s*/m,
    ],
    [/<<<\s*BODY\s*>>>/i, /【\s*正文\s*】/, /^正文\s*[：:]/m, ...bodyCutters],
  )
  let body = takeTaggedSection(
    text,
    [/<<<\s*BODY\s*>>>/i, /【\s*正文\s*】/, /^正文\s*[：:]\s*/m],
    bodyCutters,
  )
  // 缺 <<<BODY>>>：AUTHOR_NOTE 到评论区之间可能是「短碎碎念 + 长正文」，按空行切开
  if (body.length < 40) {
    const blended = takeTaggedSection(
      text,
      [
        /<<<\s*AUTHOR_NOTE\s*>>>/i,
        /【\s*作者的话\s*】/,
        /^作者的话\s*[：:]\s*/m,
      ],
      bodyCutters,
    )
    if (blended.length >= 40) {
      const parts = blended.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)
      if (parts.length >= 2 && parts[0]!.length <= 400) {
        authorNote = parts[0]!
        body = parts.slice(1).join('\n\n')
      } else {
        body = blended
        authorNote = authorNote.length <= 400 ? authorNote : ''
      }
    }
  }
  body = stripForumFicTrailingMeta(body)
  // 有正文即可；标题可缺省
  if (body.length >= 40) {
    return {
      title: (title || '无题').replace(/\s+/g, ' ').slice(0, 40),
      body,
      authorNote: stripForumFicTrailingMeta(authorNote).slice(0, 400),
    }
  }
  return null
}

/** 模型完全不按格式时：把整段当正文保住 */
function salvagePlainFic(raw: string): ForumFicParsed | null {
  const text = stripForumFicTrailingMeta(
    stripFicFence(raw)
      .replace(/^(作为|好的|以下是)[^\n]{0,40}\n+/u, '')
      .trim(),
  )
  const chars = [...text]
  if (chars.length < 80) return null
  const lines = text.split(/\n+/).map((l) => l.trim()).filter(Boolean)
  const first = lines[0] ?? ''
  const looksLikeTitle =
    first.length > 0 &&
    first.length <= 36 &&
    !/[。！？!?]/.test(first) &&
    !/^<<<|^【|^#/.test(first)
  if (looksLikeTitle && lines.length >= 2) {
    return {
      title: first.slice(0, 40),
      body: lines.slice(1).join('\n\n').trim(),
      authorNote: '',
    }
  }
  return {
    title: '无题',
    body: text,
    authorNote: '',
  }
}

function previewRaw(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim().slice(0, 72)
}

/**
 * 去掉模型按行宽硬折的「假换行」，保留空行分段。
 * 例：「搬\n走了」→「搬走了」；「……。\n\n他」仍分段。
 */
export function normalizeForumFicProse(text: string): string {
  const t = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim()
  if (!t) return ''
  return t
    .split(/\n{2,}/)
    .map((para) =>
      para
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .join(''),
    )
    .filter(Boolean)
    .join('\n\n')
}

/**
 * 砍掉正文尾部漏进来的评论区 / END / comments JSON，避免 <<<COMMENTS>>> 原文进帖。
 */
export function stripForumFicTrailingMeta(text: string): string {
  let s = String(text ?? '').replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  if (!s.trim()) return ''
  const cutRes = [
    /(?:<<<|＜＜＜)\s*COMMENTS?\s*(?:>>>|＞＞＞)/i,
    /(?:<<<|＜＜＜)\s*评论(?:区)?\s*(?:>>>|＞＞＞)/i,
    /【\s*评论(?:区)?\s*】/,
    /(?:<<<|＜＜＜)\s*END\s*(?:>>>|＞＞＞)/i,
    /\n\s*\{\s*["']comments["']\s*:\s*\[/,
    /\n\s*["']comments["']\s*:\s*\[/,
  ]
  let cut = s.length
  for (const re of cutRes) {
    const m = re.exec(s)
    if (m && m.index != null && m.index < cut) cut = m.index
  }
  s = s.slice(0, cut).trim()
  // 无换行时仍可能贴着 {"comments":
  const inline = /\{\s*["']comments["']\s*:\s*\[/.exec(s)
  if (inline && inline.index != null && inline.index > 40) {
    s = s.slice(0, inline.index).trim()
  }
  return s
}

function finalizeFicParsed(p: ForumFicParsed): ForumFicParsed {
  return {
    title: p.title.replace(/\s+/g, ' ').trim().slice(0, 40) || '无题',
    body: normalizeForumFicProse(stripForumFicTrailingMeta(p.body)),
    authorNote: normalizeForumFicProse(stripForumFicTrailingMeta(p.authorNote)).slice(0, 400),
  }
}

/**
 * 解析同人文：JSON → 标签块 → 残缺 JSON 字段 → 纯文本兜底。
 * 长文场景优先保住正文，不要再甩「不是 JSON」这种废话。
 */
export function parseForumFicOutput(raw: string): ForumFicParsed {
  const t = (raw ?? '').trim()
  if (!t) {
    throw new Error('同人文生成结果解析失败：模型返回为空（可能字数过大被接口掐断，请调低字数重试）')
  }

  // 1) 标签块（长文主路径）
  const tagged = parseFicTaggedBlocks(t)
  if (tagged) return finalizeFicParsed(tagged)

  // 2) 完整 JSON
  const obj = extractJsonObject(t)
  if (obj) {
    const title = typeof obj.title === 'string' ? obj.title.trim() : ''
    const body = typeof obj.body === 'string' ? obj.body.trim() : ''
    const authorNote =
      typeof obj.authorNote === 'string' ? obj.authorNote.trim().slice(0, 400) : ''
    if (body.length >= 40) {
      return finalizeFicParsed({ title: title || '无题', body, authorNote })
    }
  }

  // 3) 残缺 JSON 刮字段
  const scrapedTitle = scrapeJsonStringField(t, 'title')
  const scrapedNote = scrapeJsonStringField(t, 'authorNote').slice(0, 400)
  const scrapedBody = scrapeJsonStringField(t, 'body')
  if (scrapedBody.length >= 40) {
    return finalizeFicParsed({
      title: scrapedTitle || '无题',
      body: scrapedBody,
      authorNote: scrapedNote,
    })
  }

  // 4) 纯文本兜底：有字就收，别整篇作废
  const plain = salvagePlainFic(t)
  if (plain && plain.body.length >= 40) return finalizeFicParsed(plain)

  throw new Error(
    `同人文生成结果解析失败：看不出标题/正文（返回约 ${t.length} 字）。开头：${previewRaw(t)}`,
  )
}

/** 长文输出预算：按目标字数等比预留，不加人为上限（由上游 API / 模型自己卡） */
export function forumFicMaxTokens(targetWords: number): number {
  const w = Math.max(1, Math.floor(targetWords))
  // 中文约 1～2 token/字，按 3× + 开销留余量
  return Math.max(1600, Math.floor(w * 3) + 1200)
}

export function extractJsonArray(raw: string): unknown[] | null {
  const t = raw.trim()
  const fence = /```(?:json)?\s*([\s\S]*?)```/i.exec(t)
  const body = fence ? fence[1]!.trim() : t
  const start = body.indexOf('[')
  const end = body.lastIndexOf(']')
  if (start < 0 || end <= start) return null
  try {
    const parsed = JSON.parse(body.slice(start, end + 1))
    return Array.isArray(parsed) ? parsed : null
  } catch {
    return null
  }
}

export async function forumChat(params: {
  apiConfig: ApiConfig
  system: string
  user: string
  temperature?: number
  max_tokens?: number
  json?: boolean
}): Promise<string> {
  return openAiCompatibleChat(
    params.apiConfig,
    [
      { role: 'system', content: params.system },
      { role: 'user', content: params.user },
    ],
    {
      temperature: params.temperature ?? 0.78,
      max_tokens: params.max_tokens ?? 2800,
      ...(params.json ? { response_format: 'json_object' as const } : {}),
    },
  )
}

/** 同人社区第一原则：友好交流与尊重 */
export const FORUM_COMMUNITY_RULES = `
【同人社区准则——最高优先级，高于一切人设脾气】
本论坛是同人交流社区。友好交流与互相尊重是第一原则。
- 可以对作品提不同意见、抠细节、开玩笑，但必须对事不对人：只谈文、谈设定、谈磕点，禁止人身攻击、辱骂、嘲讽作者本人、引战、踩一捧一。
- 禁止歧视、骚扰、羞辱、恶意阴阳；禁止「你这种人」「垃圾文」「滚」等出圈话。
- 锐评可以犀利，但要像同好聊天：可损情节，不可伤人；留余地，像在认识的太太楼下说话。
- 楼内整体氛围友好：多数是真诚互动与分享，分歧是少数且克制；禁止整楼火药味。
- 尊重转化性创作与不同口味：不强迫他人接受自家解读，不审判他人 CP/取向偏好。
- 回评同样遵守：写手可有个性，但不能对评论者失礼。
`.trim()

/** 同人论坛通用禁词：忌油腻堆砌 */
export const FORUM_PROSE_SHORT_BAN = `
【文风硬约束·去油腻】
- 禁止通篇堆砌「啊啊啊啊」「！！！！」「呜呜呜」；激动最多一处短反应。
- 禁止网文油腻套话：邪魅一笑、矜贵、沉沦、沦陷、死死、低哑、滚烫、霸道、狠狠、发疯、压抑、陷进、扫荡、破碎、呜咽、疯狂、猛地、发红的眼角、喉结滚动、气息喷在耳侧、品尝权、整个人都是你的、心跳撞胸口/撞击肋骨、耳朵红得滴血等。
- 亲密可写具体动作与短对白，禁止感官散文开场、性感弧度、发狠抠痕、本能挺腰口是心非八股。
- 禁止 Unicode emoji；可用少量中文口语。
- 禁止 Markdown 标题 / 代码围栏；正文用约定标签 + 纯文本段落。
`.trim()

/**
 * 同人文「活人感」：像论坛太太随手发的文，不像模型作文。
 * 注意：字数目标由调用方硬性指定，此处禁止再写「短篇即可」之类冲突指令。
 */
export const FORUM_FIC_ALIVE_RULES = `
【活人感 / 反 AI 八股——最高优先级】
你是论坛里某个有脾气的网友在发文，不是作文机器人，也不是模板同人机。

要像人写的：
- 句子长短参差；可有口语、半截念头、具体小动作；少用排比与对仗。
- 对话要像真人说话：有停顿、岔开、答非所问、没说完；禁止每人一轮完美表达心意。
- 开场先交代清楚「这是谁的世界、两人什么关系、眼下卡在哪」——用场面带出设定，不要说明书条目。
- 场景从生活碎片进（等灯、掏钥匙、外卖凉了、耳机线缠住），不要「清晨阳光洒进窗」空开场。
- 情绪靠具体细节漏出来，不要旁白宣布「他心动了」「空气变得暧昧」。
- 允许一点不完美：节奏偶尔跳、留白、突然收住；结尾可戛然而止或随手一句，不必升华。

严禁八股结构：
- 禁止「相遇→误会→雨中→对视→告白→HE」流水线；禁止三段式起承转合说明书。
- 禁止每段都以「他/她看着对方」起手；禁止连续心理独白说明书。
- 禁止万能抒情：时间仿佛静止、心跳漏了一拍、世界只剩下我们、不知为何眼眶发热。
- 禁止书面腔：不禁、竟是、那一刻、令人、宛如、仿佛置身、细细想来。
- 标题也要活人：短、怪、具体，像微博文案；禁止「命运的转角」「未说出口的爱」。
`.trim()

/**
 * 「作者的话」：同好太太碎碎念，禁止作文腔/影评腔。
 * 结构：开场情绪 → 一两句故事背景简介 → 心疼/磕糖碎碎念；可带论坛口语。
 */
export function buildForumAuthorNoteRules(opts?: {
  charName?: string
  userName?: string
}): string {
  const char = (opts?.charName ?? '').trim() || 'char'
  const user = (opts?.userName ?? '').trim() || 'user'
  return `
【作者的话·口吻硬性｜最高优先级】
这是论坛太太发文前的碎碎念，不是影评、不是作文结尾、不是「本文试图探讨…」。
必含：①开场情绪（为啥提笔）②故事背景简介 1～2 句（不剧透结局）③对 ${char}/${user} 的心疼或磕糖碎碎念。
口吻：口语、带感叹、可叠词可省略号可「！！」；可喊宝宝们、掉小珍珠、BE/HE、99、心疼你等同人圈说法——按本文情绪选用，禁止整段照搬固定模板。
约 80～220 字；用 ${char}、${user} 真名，禁止写「角色A」「用户」。
禁止：本文试图 / 希望你能感受到 / 湿漉漉的空气 / 长影与回声式升华 / 文学评论腔 / 自称 AI 或作者本人人设崩成老师讲课。
正例气质（勿照抄句式）：「宝宝们最近看他俩互动手又痒了！背景是……写到一半自己差点掉小珍珠……${char}我心疼你！但是！${char}和${user}必须99！！」
反例（禁止）：「这是一次关于『替代与重启』的尝试。希望你能感受到那种潮湿而安静的空气。」
`.trim()
}

/**
 * 对白 / 内心：与线下约会「普通剧情」同一套管线。
 * 对白用直角/弯引号嵌进旁白；内心用半角 **…**；禁止单独成行的气泡块。
 */
export const FORUM_FIC_MARKUP_RULES = `
【正文标记·硬性——与线下约会同款】
下游按约会普通剧情解析：引号=对白富文本，**…**=内心 OS。禁止另造标签块、禁止一句对白独占一整段。
1. **对白**：说出口的话必须包在「…」或 “…” 里，嵌在旁白句子中。例：他把找零递回去，「抱歉，我周末有课。」她眨了眨眼，「那周一呢？」
2. **内心 OS**：未说出口的念头用半角双星号：**……**（英文 * 连按两次）。例：**她的眼神怎么有点像盛亦。**
3. 旁白、动作、环境不套引号、不加 **；说话人可用旁白带出，勿写成「姓名：」独占一行的剧本格式。
4. **禁止** <dlg></dlg>、<os></os>、【对白】、【内心】等块级标签；禁止一句对白单独起一段（像聊天气泡）。
5. 一篇里对白与内心都要有；对白须织进叙事节奏，读起来像约会页正文，不是台词表。
`.trim()

/** 旧稿 <dlg>/<os> → 约会行内标记，便于同一套渲染 */
export function convertForumLegacyMarkupToDatingProse(raw: string): string {
  let s = normalizeForumFicProse(stripForumFicTrailingMeta(raw))
  if (!s) return ''
  s = s.replace(/<(os|thought)\b[^>]*>([\s\S]*?)<\/\1>/gi, (_m, _tag, inner: string) => {
    const t = String(inner ?? '').trim()
    if (!t) return ''
    if (/^\*\*[\s\S]*\*\*$/.test(t)) return t
    return `**${t.replace(/^\*\*|\*\*$/g, '').trim()}**`
  })
  s = s.replace(/<(dlg|dialogue)\b[^>]*>([\s\S]*?)<\/\1>/gi, (_m, _tag, inner: string) => {
    const t = String(inner ?? '').trim()
    if (!t) return ''
    if (/[「“"\u201C\u201D]/.test(t)) return t
    return `「${t}」`
  })
  return normalizeForumFicProse(s)
}

/** 统计正文有效汉字（去空白与标记标签） */
export function countForumFicBodyChars(body: string): number {
  const plain = body
    .replace(/<\/?(?:dlg|dialogue|os|thought)\b[^>]*>/gi, '')
    .replace(/\*\*/g, '')
    .replace(/\s+/g, '')
  return [...plain].length
}

/** 从整包输出里抠评论区 JSON 片段（<<<COMMENTS>>> 或同级 comments 字段） */
export function extractForumCommentsBlob(raw: string): string {
  const text = stripFicFence(raw)
  const tagged = takeTaggedSection(
    text,
    [/<<<\s*COMMENTS?\s*>>>/i, /【\s*评论(?:区)?\s*】/],
    [/<<<\s*END\s*>>>/i],
  )
  if (tagged.trim()) return tagged.trim()
  const obj = extractJsonObject(text)
  if (obj && Array.isArray(obj.comments)) {
    return JSON.stringify({ comments: obj.comments })
  }
  return ''
}

/**
 * 与线下约会推进同一套：扮演核心 + 禁词 +（可选）文风白描。
 * 人格写作风格只决定语气/切入，不得压过去油腻硬底线。
 */
export function buildForumFicWritingAlignBlock(opts?: {
  charName?: string
  userName?: string
  /** 本命同人时可传入约会角色 id，套用该角色文风设定 */
  datingCharacterId?: string
}): string {
  const customWritingPrompt = getActiveCustomWritingInjectBody()
  const slimMustInject = buildOfflineDatingSlimMustInjectBody({ customWritingPrompt })
  const usingCustomWriting = typeof customWritingPrompt === 'string'
  const proseTail = usingCustomWriting
    ? `\n\n${PROSE_FORBIDDEN_TOP_PRIORITY_PIN}\n\n${PROSE_FORBIDDEN_LEXICON_PROMPT}`
    : ''

  let styleAppend = ''
  const datingId = opts?.datingCharacterId?.trim()
  if (datingId) {
    const tuning = loadDatingStyleTuning(datingId)
    styleAppend = buildDatingStyleSystemAppend({
      stylePrompt: tuning.stylePrompt,
      referenceSnippet: tuning.referenceSnippet,
    })
  } else {
    // 无约会角色时仍给默认白描底线，避免退回油腻网文腔
    styleAppend = buildDatingStyleSystemAppend()
  }

  const body = expandCharUserPlaceholders(`${slimMustInject}${styleAppend}${proseTail}`, {
    charName: opts?.charName?.trim() || '角色',
    userName: opts?.userName?.trim() || '你',
  })

  return `【文风对齐·与线下约会同规｜最高优先级】
同人文正文必须服从下方【线下剧情扮演总规则】、写作禁词与文风白描——与约会页普通剧情/互动模式同一套管线。
- 人格「写作风格」只决定这家太太的语气、切入角度与甜/刀偏好，**不得**借此放开油腻套话或禁词。
- 禁止另开霸总腔、土味情话、感官堆砌；直白亲密 ≠ 油腻八股。

${body}`
}
