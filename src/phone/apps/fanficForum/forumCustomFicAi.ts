import type { ApiConfig } from '../api/types'
import type { AnimeCharacterPick, ForumComment } from './forumTypes'
import {
  FORUM_COMMUNITY_RULES,
  FORUM_FIC_ALIVE_RULES,
  FORUM_FIC_MARKUP_RULES,
  FORUM_PROSE_SHORT_BAN,
  buildForumFicWritingAlignBlock,
  extractForumCommentsBlob,
  forumChat,
  forumFicMaxTokens,
  parseForumFicOutput,
  requireForumApi,
} from './forumAiShared'
import {
  formatForumCommentRoster,
  mountForumCommentsFromList,
  parseForumCommentsPayload,
  pickForumCommentPersonas,
} from './forumCommentsAi'
import type { NetizenPersona } from './netizenPersonas'
import { getResidentWriter, maxAuthorRepliesFor } from './residentWriters'

export type CustomFicGenerateResult = {
  title: string
  body: string
  authorPersonaId: string
  comments: ForumComment[]
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
 * 自定义同人文：正文 + 评论区一次生成。
 */
export async function aiGenerateCustomFanfic(params: {
  apiConfig: ApiConfig | null
  author: NetizenPersona
  picks: AnimeCharacterPick[]
  demand: string
  targetWordCount?: number
  commentCount?: number
  replyCount?: number
  seed?: string
}): Promise<CustomFicGenerateResult> {
  const apiConfig = requireForumApi(params.apiConfig)
  const author = params.author
  const demand = params.demand.trim()
  const targetWords = Math.max(1, Math.floor(params.targetWordCount ?? 700))
  if (!params.picks.length) throw new Error('请先选择至少一个角色')
  if (!demand) throw new Error('请填写一句话创作需求')

  const primary = params.picks[0]!
  const writingAlign = buildForumFicWritingAlignBlock({
    charName: primary.characterName,
    userName: '你',
  })

  const wordLo = Math.max(1, Math.floor(targetWords * 0.85))
  const wordHi = Math.max(wordLo, Math.floor(targetWords * 1.12))
  const topCount = Math.min(12, Math.max(2, Math.floor(params.commentCount ?? 6)))
  const replyCount = Math.min(6, Math.max(0, Math.floor(params.replyCount ?? 2)))
  const commentPersonas = pickForumCommentPersonas({
    postAuthorPersonaId: author.id,
    topCount,
    seed: params.seed ?? `custom:${author.id}:${Date.now()}`,
  })
  const commentRoster = formatForumCommentRoster(commentPersonas)
  const residentAuthor = getResidentWriter(author.id)
  const maxAuthorReplies = residentAuthor ? maxAuthorRepliesFor(residentAuthor) : 0
  const authorReplyHint =
    residentAuthor && maxAuthorReplies > 0
      ? `楼主可选择性回评最多 ${maxAuthorReplies} 条（personaId=${author.id}，必须带 replyToPersonaId）。`
      : `禁止冒充楼主 id=${author.id} 发评。`

  const useTagged = targetWords >= 800 || topCount + replyCount >= 6
  const outputRule = useTagged
    ? `5. 只按标签一次输出：
<<<TITLE>>>
标题
<<<BODY>>>
正文（对白「」嵌旁白，内心 **…**）
<<<COMMENTS>>>
{"comments":[{"personaId":"...","content":"...","replyToPersonaId":"可选"}]}
<<<END>>>`
    : `5. 只输出 JSON：{"title":"标题","body":"正文","comments":[...]}；body 内对白用「」，内心用 **…**。`

  const system = `你是 Lumi 同人创作论坛的虚拟网友写手。你必须严格扮演固定人格「${author.username}」（id=${author.id}，类型=${author.archetype}），一次写完同人文与楼下评论。
${FORUM_COMMUNITY_RULES}
${author.personaPrompt}
【写作风格】${author.writingStylePrompt}
${FORUM_PROSE_SHORT_BAN}
${FORUM_FIC_ALIVE_RULES}
${FORUM_FIC_MARKUP_RULES}
${writingAlign}

【字数硬性】正文汉字约 ${targetWords}（${wordLo}～${wordHi}），必须写够，禁止短打敷衍。

硬性规则：
1. 根据用户指定的作品角色与一句话需求，写一篇转化性同人；开篇须交代故事背景（谁、在哪、关系卡在哪）。
2. **转化性创作**：可借鉴人设气质与关系张力，禁止逐字复刻原作台词或大段原作情节。
3. 不同人格写同一梗味道必须不同——严格贴合你的写作风格，但不得压过上方去油腻/约会同规文风硬底线。
4. 对白用「」嵌进旁白，内心用 **…**（与线下约会同款）；禁止一句对白独占一段。
${outputRule}
6. **评论区一次写齐**：恰好 ${topCount} 条一级 + 恰好 ${replyCount} 条楼中楼；personaId 只能用名单；点正文细节；禁止空壳机评。${authorReplyHint}
7. 禁止在格式外输出解释；禁止出戏自称 AI。
8. 禁止霸总腔、品尝权、心跳撞胸口、感官堆砌等油腻套话。`

  const user = `【选中角色】
${formatPicksBlock(params.picks)}

【用户一句话需求】
${demand}

【评论人格名单】
${commentRoster}

请以「${author.username}」身份一次写完：同人文（约 ${targetWords} 字）+ ${topCount} 条一级评论 + ${replyCount} 条楼中楼。
先立住故事背景；对白「」、内心 **…**；白描、去油腻。
${
  useTagged
    ? '输出：<<<TITLE>>>…<<<BODY>>>…<<<COMMENTS>>>…<<<END>>>（不要整包当 JSON）。'
    : '只输出 JSON：{"title","body","comments"}。'
}`

  const raw = await forumChat({
    apiConfig,
    system,
    user,
    temperature: 0.78,
    max_tokens:
      forumFicMaxTokens(targetWords) + Math.max(1200, 900 + (topCount + replyCount) * 220),
    json: !useTagged,
  })
  const parsed = parseForumFicOutput(raw)
  if (!parsed.title || !parsed.body) {
    throw new Error('同人文缺少标题或正文，请重试')
  }

  let comments: ForumComment[] = []
  try {
    const blob = extractForumCommentsBlob(raw)
    const list = parseForumCommentsPayload(blob || raw)
    comments = mountForumCommentsFromList({
      list,
      personas: commentPersonas,
      postAuthorPersonaId: author.id,
      topCount,
      replyCount,
    })
  } catch {
    comments = []
  }

  return {
    title: parsed.title,
    body: parsed.body,
    authorPersonaId: author.id,
    comments,
  }
}
