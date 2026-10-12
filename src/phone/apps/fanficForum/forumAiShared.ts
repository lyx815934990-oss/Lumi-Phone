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
- 禁止输出 Markdown 标题围栏以外的代码块；正文用纯文本段落。
`.trim()

/**
 * 同人文「活人感」：像论坛太太随手发的文，不像模型作文。
 */
export const FORUM_FIC_ALIVE_RULES = `
【活人感 / 反 AI 八股——最高优先级】
你是论坛里某个有脾气的网友在发文，不是作文机器人，也不是模板同人机。

要像人写的：
- 句子长短参差；可有口语、半截念头、具体小动作；少用排比与对仗。
- 对话要像真人说话：有停顿、岔开、答非所问、没说完；禁止每人一轮完美表达心意。
- 场景从生活碎片进（等灯、掏钥匙、外卖凉了、耳机线缠住），不要「清晨阳光洒进窗」开场。
- 情绪靠具体细节漏出来，不要旁白宣布「他心动了」「空气变得暧昧」。
- 允许一点不完美：节奏偶尔跳、留白、突然收住；结尾可戛然而止或随手一句，不必升华。

严禁八股结构：
- 禁止「相遇→误会→雨中→对视→告白→HE」流水线；禁止三段式起承转合说明书。
- 禁止每段都以「他/她看着对方」起手；禁止连续心理独白说明书。
- 禁止万能抒情：时间仿佛静止、心跳漏了一拍、世界只剩下我们、不知为何眼眶发热。
- 禁止书面腔：不禁、竟是、那一刻、令人、宛如、仿佛置身、细细想来。
- 标题也要活人：短、怪、具体，像微博文案；禁止「命运的转角」「未说出口的爱」。

字数约 550～1000 字即可，写满注水不如写短写准。
`.trim()

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
