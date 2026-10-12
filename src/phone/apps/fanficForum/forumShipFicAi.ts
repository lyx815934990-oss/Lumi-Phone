import type { ApiConfig } from '../api/types'
import {
  FORUM_COMMUNITY_RULES,
  FORUM_FIC_ALIVE_RULES,
  FORUM_PROSE_SHORT_BAN,
  buildForumFicWritingAlignBlock,
  extractJsonObject,
  forumChat,
  requireForumApi,
} from './forumAiShared'
import type { ForumPublicContext } from './forumPublicContext'
import type { NetizenPersona } from './netizenPersonas'

export type ShipFicGenerateResult = {
  title: string
  body: string
  authorPersonaId: string
}

/**
 * 生成本命同人文（user × char），作者人格来自固定库。
 */
export async function aiGenerateShipFanfic(params: {
  apiConfig: ApiConfig | null
  author: NetizenPersona
  publicContext: ForumPublicContext
}): Promise<ShipFicGenerateResult> {
  const apiConfig = requireForumApi(params.apiConfig)
  const author = params.author
  const ctx = params.publicContext
  const writingAlign = buildForumFicWritingAlignBlock({
    charName: ctx.charDisplayName,
    userName: ctx.userDisplayName,
    datingCharacterId: ctx.characterId,
  })

  const system = `你是 Lumi 同人创作论坛的虚拟网友写手。你必须严格扮演固定人格「${author.username}」（id=${author.id}，类型=${author.archetype}），用该人格的语气写一篇本命同人文。
${FORUM_COMMUNITY_RULES}
${author.personaPrompt}
【写作风格】${author.writingStylePrompt}
${FORUM_PROSE_SHORT_BAN}
${FORUM_FIC_ALIVE_RULES}
${writingAlign}

硬性规则：
1. 只写 ${ctx.userDisplayName} × ${ctx.charDisplayName} 的同人向短篇（约 550～1000 字中文）。
2. 必须遵守下方「网友可公开获知的信息」边界：根据蛛丝马迹脑补，禁止全知私聊剧透。
3. 转化性创作：可脑补公开场合可见的互动，勿逐字复刻任何版权作品台词。
4. 只输出 JSON 对象：{"title":"标题","body":"正文（可用换行分段）"}
5. 禁止在 JSON 外输出解释；禁止冒充其他网友或角色本人发帖。
6. 正文禁止出现「作为 AI」「作为语言模型」等出戏句。
7. 文风必须服从上方【文风对齐·与线下约会同规】与去油腻硬约束；人格风格不得压过禁词。`

  const user = `${ctx.promptBlock}

请以「${author.username}」身份发一篇本命同人文。
记住：像论坛太太半夜敲的，白描短句、去油腻；不要优秀作文，不要八股套路，不要霸总土味情话。从一个具体瞬间切开写即可。`

  const raw = await forumChat({
    apiConfig,
    system,
    user,
    temperature: 0.78,
    max_tokens: 3200,
    json: true,
  })
  const obj = extractJsonObject(raw)
  if (!obj) throw new Error('同人文生成结果解析失败，请重试')
  const title = typeof obj.title === 'string' ? obj.title.trim() : ''
  const body = typeof obj.body === 'string' ? obj.body.trim() : ''
  if (!title || !body) throw new Error('同人文缺少标题或正文，请重试')
  return {
    title: title.slice(0, 40),
    body,
    authorPersonaId: author.id,
  }
}
