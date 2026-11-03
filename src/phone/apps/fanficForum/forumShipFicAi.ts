import type { ApiConfig } from '../api/types'
import {
  FORUM_COMMUNITY_RULES,
  FORUM_FIC_ALIVE_RULES,
  FORUM_FIC_MARKUP_RULES,
  FORUM_PROSE_SHORT_BAN,
  buildForumAuthorNoteRules,
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
import type { ForumPublicContext } from './forumPublicContext'
import type { NetizenPersona } from './netizenPersonas'
import { getResidentWriter, maxAuthorRepliesFor } from './residentWriters'
import type { ForumComment } from './forumTypes'

export type ShipFicGenerateResult = {
  title: string
  body: string
  /** 作者的话：文简介 + 写手碎碎念，展示在正文前 */
  authorNote: string
  authorPersonaId: string
  /** 同一次生成附带的评论区（可能为空数组） */
  comments: ForumComment[]
}

/** 叙述人称 */
export type ForumFicPersonMode = 'first' | 'second' | 'third'

/**
 * 第一人称：「我」是谁（另一人用「你」）。
 * 第二人称：「你」是谁（另一人用名字或他/她）。
 */
export type ForumFicPersonAs = 'user' | 'char'

/** @deprecated 用 ForumFicPersonAs */
export type ForumFicFirstPersonAs = ForumFicPersonAs

export function buildForumFicPerspectiveRule(params: {
  personMode: ForumFicPersonMode
  /** 第一人称：我=…；第二人称：你=… */
  personAs?: ForumFicPersonAs
  userName: string
  charName: string
}): string {
  const user = params.userName.trim() || 'user'
  const char = params.charName.trim() || 'char'
  const asUser = (params.personAs ?? 'user') === 'user'
  if (params.personMode === 'third') {
    return `【人称·硬性】第三人称叙述：用名字（${user} / ${char}）或他/她；禁止通篇「我」「你」当叙述视角。`
  }
  if (params.personMode === 'second') {
    if (asUser) {
      return `【人称·硬性】第二人称叙述：正文以「你」为主视角推进；「你」= ${user}（user），${char} 用名字或他/她。禁止把「你」写成 ${char}，禁止改成「我」当叙述者。`
    }
    return `【人称·硬性】第二人称叙述：正文以「你」为主视角推进；「你」= ${char}（char），${user} 用名字或他/她。禁止把「你」写成 ${user}，禁止改成「我」当叙述者。`
  }
  if (asUser) {
    return `【人称·硬性】第一人称：「我」= ${user}（user），「你」= ${char}（char）。叙述者只能是「我」=${user}；对 ${char} 称「你」或名字。禁止改成 ${char} 当「我」。`
  }
  return `【人称·硬性】第一人称：「我」= ${char}（char），「你」= ${user}（user）。叙述者只能是「我」=${char}；对 ${user} 称「你」或名字。禁止改成 ${user} 当「我」。`
}

/**
 * 生成本命同人文（user × char），作者人格来自固定库。
 * 会参考公开上下文里的 user/char 人设；可选参考近期剧情 / 人脉群像。
 */
export async function aiGenerateShipFanfic(params: {
  apiConfig: ApiConfig | null
  author: NetizenPersona
  publicContext: ForumPublicContext
  /** 用户填写的生成要求 / 想看的梗 */
  demand?: string
  /** 目标正文汉字约数（不含作者的话），默认 700 */
  targetWordCount?: number
  /** 人称：一二三人称，默认第三人称 */
  personMode?: ForumFicPersonMode
  /**
   * 第一人称：我=user|char；第二人称：你=user|char。
   * 也兼容旧字段 firstPersonAs。
   */
  personAs?: ForumFicPersonAs
  /** @deprecated 用 personAs */
  firstPersonAs?: ForumFicPersonAs
  /** 一级评论条数 */
  commentCount?: number
  /** 楼中楼条数 */
  replyCount?: number
  seed?: string
}): Promise<ShipFicGenerateResult> {
  const apiConfig = requireForumApi(params.apiConfig)
  const author = params.author
  const ctx = params.publicContext
  const demand = (params.demand ?? '').trim()
  const targetWords = Math.max(1, Math.floor(params.targetWordCount ?? 700))
  const wordLo = Math.max(1, Math.floor(targetWords * 0.85))
  const wordHi = Math.max(wordLo, Math.floor(targetWords * 1.12))
  const personMode: ForumFicPersonMode = params.personMode ?? 'third'
  const personAs: ForumFicPersonAs = params.personAs ?? params.firstPersonAs ?? 'user'
  const perspectiveRule = buildForumFicPerspectiveRule({
    personMode,
    personAs,
    userName: ctx.userDisplayName,
    charName: ctx.charDisplayName,
  })
  const writingAlign = buildForumFicWritingAlignBlock({
    charName: ctx.charDisplayName,
    userName: ctx.userDisplayName,
    datingCharacterId: ctx.characterId,
  })

  const plotRule = ctx.includeRecentPlot
    ? `4. 用户已开启「参考近期剧情」：正文情节重心须与时间轴摘要的氛围/事件走向有呼应（改写成脑补画面），禁止复述私聊原文或做成剧情复盘。`
    : `4. 未开启近期剧情参考：不要编造重大未公开剧情转折；只凭人设气质与公开蛛丝马迹写一个具体瞬间。`

  const networkRule = ctx.includeNetworkCast
    ? `5. 用户已开启「人脉关系设定」：允许写成群像同人（多人同场），配角须来自人脉表与绑定 NPC 人设；主线情感重心仍落在 ${ctx.userDisplayName} × ${ctx.charDisplayName}，禁止另开表外 CP 或表外路人团；关系档位/称呼/看法须与表一致。`
    : `5. 未开启人脉参考：正文以双人线为主，勿硬塞无关群像路人。`

  const topCount = Math.min(12, Math.max(2, Math.floor(params.commentCount ?? 6)))
  const replyCount = Math.min(6, Math.max(0, Math.floor(params.replyCount ?? 2)))
  const commentPersonas = pickForumCommentPersonas({
    postAuthorPersonaId: author.id,
    topCount,
    seed: params.seed ?? `ship:${author.id}:${Date.now()}`,
  })
  const commentRoster = formatForumCommentRoster(commentPersonas)
  const residentAuthor = getResidentWriter(author.id)
  const maxAuthorReplies = residentAuthor ? maxAuthorRepliesFor(residentAuthor) : 0
  const authorReplyHint =
    residentAuthor && maxAuthorReplies > 0
      ? `楼主可选择性回评最多 ${maxAuthorReplies} 条（personaId=${author.id}，必须带 replyToPersonaId）。`
      : `禁止冒充楼主 id=${author.id} 发评。`

  // 长文用标签块；评论区放在 <<<COMMENTS>>> 的 JSON 里，一次吐完
  const useTagged = targetWords >= 800 || topCount + replyCount >= 6
  const outputRule = useTagged
    ? `9. 只按下列标签一次输出（正文+评论，不要其它前后缀）：
<<<TITLE>>>
标题
<<<AUTHOR_NOTE>>>
作者的话（同好口语碎碎念：情绪开场 + 背景简介 + 磕糖/心疼；禁作文腔）
<<<BODY>>>
正文（对白用「」，内心用 **…**，嵌进旁白；勿一句对白独占一段）
<<<COMMENTS>>>
{"comments":[{"personaId":"...","content":"...","replyToPersonaId":"可选"}]}
<<<END>>>
正文分段只用空行（\\n\\n）；禁止句中硬折行。COMMENTS 必须是合法 JSON。`
    : `9. 只输出一个 JSON：{"title":"标题","authorNote":"作者的话","body":"正文","comments":[{"personaId":"...","content":"...","replyToPersonaId":"可选"}]}；body 内段落用 \\n\\n；对白用「」，内心用 **…**（与线下约会同款）。`

  const fictionFrame = `【虚构创作声明】本文为成人向虚构同人文学创作（角色扮演/约稿），内容不指向现实伤害、不提供违法指导；请以文学白描完成，克制血腥细节。`

  const system = `你是 Lumi 同人创作论坛的虚拟网友写手。你必须严格扮演固定人格「${author.username}」（id=${author.id}，类型=${author.archetype}），用该人格的语气写一篇本命同人文，并在同一次输出里编好楼下评论区。
${fictionFrame}
${FORUM_COMMUNITY_RULES}
${author.personaPrompt}
【写作风格】${author.writingStylePrompt}
${FORUM_PROSE_SHORT_BAN}
${FORUM_FIC_ALIVE_RULES}
${FORUM_FIC_MARKUP_RULES}
${buildForumAuthorNoteRules({
  charName: ctx.charDisplayName,
  userName: ctx.userDisplayName,
})}
${writingAlign}

${perspectiveRule}

【字数·最高硬性·压过一切“写短就好”的旧习惯】
- 正文（BODY，不含标题与作者的话、不含评论）汉字目标 **${targetWords}**，合格区间 **${wordLo}～${wordHi}**。
- 必须写满合格区间；禁止偷懒短打。
- 统计时不算空白、引号与 ** 标记本身。

硬性规则：
1. 主 CP 为 ${ctx.userDisplayName} × ${ctx.charDisplayName}；以正文为准${ctx.includeNetworkCast ? '；可有绑定 NPC 入场的群像场面' : ''}。
2. **故事背景必须交代**：开篇 1～3 段内用场面写清——时代/场所气质、两人当前关系档位、眼下矛盾或未说破的那件事；**场所与职业须来自人设**（电竞/训练/赛场/宿舍等），禁止另编便利店员等换皮身份。
3. **必须贴合**下方 user / char 名片与世界书：身份、职业、气质、相处模式一律以人设为准；用行动与细节体现，禁止设定表朗读。人设偏娇软/黏人时禁止写成互损嘴炮二人转。
4. 必须遵守公开信息边界：脑补可，全知私聊剧透不可；勿逐字复刻版权台词。
${plotRule.replace(/^4\./, '5.')}
${networkRule.replace(/^5\./, '6.')}
7. 若用户给了「生成要求」，尽量贴合，但仍服从人称/字数/人设/去油腻硬性。
8. 「作者的话」必须严格服从上方【作者的话·口吻硬性】：同好口语、禁影评/作文腔。
${outputRule}
10. **评论区一次写齐**：恰好 ${topCount} 条一级（无 replyToPersonaId）+ 恰好 ${replyCount} 条楼中楼（必须 replyToPersonaId 指向某条一级的 personaId）；personaId 只能用下方名单；点正文细节；禁止「泪了」「笑死」空壳；content 内禁止句中换行（一条评一句连写）。${authorReplyHint}
11. 禁止格式外解释；禁止「作为 AI」出戏。
12. 文风服从去油腻；人格不得压过人设/禁词/人称/字数硬性。`

  const demandBlock = demand
    ? `\n【用户生成要求】\n${demand}\n（请围绕此要求展开；先立住故事背景，再推进场面。不要写成需求复述。）\n`
    : ''

  const plotHint = ctx.includeRecentPlot
    ? '\n（已开近期剧情参考：灵感可以从时间轴里某个瞬间歪出去写，但要像太太脑补，不是搬运剧情。）\n'
    : ''

  const networkHint = ctx.includeNetworkCast
    ? '\n（已开人脉参考：可以写成群像同人，把绑定 NPC 拉进场；关系与人设要对表，主 CP 别跑丢。）\n'
    : ''

  const formatReminder = useTagged
    ? `\n一次输出：<<<TITLE>>> / <<<AUTHOR_NOTE>>> / <<<BODY>>> / <<<COMMENTS>>> / <<<END>>>。对白用「」嵌旁白，内心用 **…**（约会同款）；勿一句对白独占一段。\n`
    : `\n一次输出 JSON：title / authorNote / body / comments。对白「」，内心 **…**。\n`

  const user = `${ctx.promptBlock}
${demandBlock}${plotHint}${networkHint}
【人称提醒】${perspectiveRule}
【字数提醒】正文必须约 ${targetWords} 字（${wordLo}～${wordHi}）。
【评论人格名单】（只能用这些 id）
${commentRoster}

请以「${author.username}」身份一次写完：同人文 + 作者的话 + ${topCount} 条一级评论 + ${replyCount} 条楼中楼。
作者的话要像太太喊宝宝们那样碎碎念，不要「本文试图／希望你感受到」；开篇立住故事背景；白描去油腻；评论要点细节、像真人楼下。
${formatReminder}`

  const maxTokens =
    forumFicMaxTokens(targetWords) + Math.max(1200, 900 + (topCount + replyCount) * 220)
  const callOnce = (userMsg: string) =>
    forumChat({
      apiConfig,
      system,
      user: userMsg,
      temperature: 0.82,
      max_tokens: maxTokens,
      json: !useTagged,
    })

  let raw: string
  try {
    raw = await callOnce(user)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (/content_filter|内容安全过滤/i.test(msg)) {
      const softUser = `${user}

【重试说明】上一轮被安全过滤。请把敏感情节改写成暗示/事后氛围/情绪后果，勿写血腥过程；仍须一次写完正文+评论。`
      try {
        raw = await callOnce(softUser)
      } catch (e2) {
        const msg2 = e2 instanceof Error ? e2.message : String(e2)
        if (/content_filter|内容安全过滤/i.test(msg2)) {
          throw new Error(
            '生成被接口内容安全过滤拦截了。你的生成要求里可能含死亡/替身等敏感点——请改成更含蓄的写法后重试，或换不过滤这么严的模型线路。',
          )
        }
        throw e2
      }
    } else {
      throw e
    }
  }

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
    // 正文已成：评论解析失败不整单作废，交给上层发空评帖
    comments = []
  }

  return {
    title: parsed.title,
    body: parsed.body,
    authorNote: parsed.authorNote,
    authorPersonaId: author.id,
    comments,
  }
}
