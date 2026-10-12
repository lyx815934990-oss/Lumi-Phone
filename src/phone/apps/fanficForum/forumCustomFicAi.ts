import type { ApiConfig } from '../api/types'
import type { AnimeCharacterPick } from './forumTypes'
import {
  FORUM_COMMUNITY_RULES,
  FORUM_FIC_ALIVE_RULES,
  FORUM_PROSE_SHORT_BAN,
  buildForumFicWritingAlignBlock,
  extractJsonObject,
  forumChat,
  requireForumApi,
} from './forumAiShared'
import type { NetizenPersona } from './netizenPersonas'

export type CustomFicGenerateResult = {
  title: string
  body: string
  authorPersonaId: string
}

function formatPicksBlock(picks: AnimeCharacterPick[]): string {
  return picks
    .map((p, i) => {
      const bits = [
        `${i + 1}. 作品「${p.mediaTitle}」· 角色「${p.characterName}」`,
        p.characterBio ? `   简介：${p.characterBio.slice(0, 160)}` : '',
      ]
      return bits.filter(Boolean).join('\n')
    })
    .join('\n')
}

/**
 * 自定义同人文：其他作品角色 + 用户一句话需求；转化性创作，风格由网友人格决定。
 */
export async function aiGenerateCustomFanfic(params: {
  apiConfig: ApiConfig | null
  author: NetizenPersona
  picks: AnimeCharacterPick[]
  demand: string
}): Promise<CustomFicGenerateResult> {
  const apiConfig = requireForumApi(params.apiConfig)
  const author = params.author
  const demand = params.demand.trim()
  if (!params.picks.length) throw new Error('请先选择至少一个角色')
  if (!demand) throw new Error('请填写一句话创作需求')

  const primary = params.picks[0]!
  const writingAlign = buildForumFicWritingAlignBlock({
    charName: primary.characterName,
    userName: '你',
  })

  const system = `你是 Lumi 同人创作论坛的虚拟网友写手。你必须严格扮演固定人格「${author.username}」（id=${author.id}，类型=${author.archetype}）。
${FORUM_COMMUNITY_RULES}
${author.personaPrompt}
【写作风格】${author.writingStylePrompt}
${FORUM_PROSE_SHORT_BAN}
${FORUM_FIC_ALIVE_RULES}
${writingAlign}

硬性规则：
1. 根据用户指定的作品角色与一句话需求，写一篇转化性同人短篇（约 550～1000 字中文）。
2. **转化性创作**：可借鉴人设气质与关系张力，禁止逐字复刻原作台词或大段原作情节。
3. 不同人格写同一梗味道必须不同——严格贴合你的写作风格，但不得压过上方去油腻/约会同规文风硬底线。
4. 只输出 JSON：{"title":"标题","body":"正文（可用换行分段）"}
5. 禁止在 JSON 外输出解释；禁止出戏自称 AI。
6. 禁止霸总腔、品尝权、心跳撞胸口、感官堆砌等油腻套话。`

  const user = `【选中角色】
${formatPicksBlock(params.picks)}

【用户一句话需求】
${demand}

请以「${author.username}」身份写这篇同人文。
像论坛写手半夜敲的：白描、去油腻；不要优秀作文，不要误会→雨中→告白流水线；从一个具体场面切开写。`

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
