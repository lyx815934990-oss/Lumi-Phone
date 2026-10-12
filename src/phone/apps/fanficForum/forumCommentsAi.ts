import type { ApiConfig } from '../api/types'
import { FORUM_COMMUNITY_RULES, FORUM_PROSE_SHORT_BAN, extractJsonObject, forumChat, requireForumApi } from './forumAiShared'
import {
  FORUM_DISSENT_ARCHETYPES,
  pickPersonasForThread,
  type NetizenPersona,
} from './netizenPersonas'
import {
  getResidentWriter,
  maxAuthorRepliesFor,
  type ResidentWriter,
} from './residentWriters'
import { createForumCommentId } from './useForumStore'
import type { ForumComment } from './forumTypes'

type RawCommentRow = {
  personaId: string
  content: string
  /** 指向同批中更早出现的 personaId，形成楼中楼 */
  replyToPersonaId?: string
}

/**
 * 为帖子生成有观点分歧的评论区（最多二层楼中楼）。
 * 若楼主是常驻写手，可选择性插入 0～N 条楼主回复。
 */
export async function aiGenerateForumComments(params: {
  apiConfig: ApiConfig | null
  postTitle: string
  postBody: string
  postAuthorPersonaId: string
  /** 可选：指定本楼出场人格；缺省则自动抽取 */
  personas?: NetizenPersona[]
  count?: number
  seed?: string
}): Promise<ForumComment[]> {
  const apiConfig = requireForumApi(params.apiConfig)
  const count = Math.min(8, Math.max(5, Math.floor(params.count ?? 6)))
  const postAuthorId = params.postAuthorPersonaId.trim()
  const residentAuthor = getResidentWriter(postAuthorId)
  const maxAuthorReplies = residentAuthor ? maxAuthorRepliesFor(residentAuthor) : 0

  const personas =
    params.personas?.length && params.personas.length >= 3
      ? params.personas.slice(0, count)
      : pickPersonasForThread({
          count,
          preferArchetypes: [...FORUM_DISSENT_ARCHETYPES],
          excludeIds: [postAuthorId],
          seed: params.seed ?? `${params.postTitle}:${Date.now()}`,
        })

  if (!personas.some((p) => FORUM_DISSENT_ARCHETYPES.includes(p.archetype))) {
    const dissent = pickPersonasForThread({
      count: 1,
      preferArchetypes: [...FORUM_DISSENT_ARCHETYPES],
      excludeIds: [postAuthorId, ...personas.map((p) => p.id)],
      seed: `dissent:${params.seed ?? params.postTitle}`,
    })
    if (dissent[0]) {
      personas[personas.length - 1] = dissent[0]
    }
  }

  const roster = personas
    .map(
      (p) =>
        `- id=${p.id} | 用户名=${p.username} | 类型=${p.archetype}\n  人设：${p.personaPrompt}\n  评论风格：${p.commentStylePrompt}`,
    )
    .join('\n')

  const authorReplyBlock =
    residentAuthor && maxAuthorReplies > 0
      ? buildAuthorReplyRules(residentAuthor, maxAuthorReplies)
      : `4. 禁止冒充楼主 id=${postAuthorId}（本楼楼主不回评）。`

  const system = `你是同人创作论坛评论区编导。必须使用下方「固定人格库」中的网友发言，禁止发明新用户名或新 id。
${FORUM_COMMUNITY_RULES}
${FORUM_PROSE_SHORT_BAN}

【活人感】
评论要像同好半夜刷到随手回的，不像 AI、不像读后感、不像客服。
- 口语碎、语气词随便来：啊、呃、草、绝了、好家伙、笑死、不行了、有点……、就、其实、吧、嘛、哈。
- 可省略主语、半截话、问句；允许轻微语病，像打字很快。
- 必须点到正文里的某个具体细节（一句对白、一个动作、一个场景），禁止空夸「写得真好」「氛围绝了」这类万能句。
- 楼内语气要参差：有的短夸、有的嗑、有的礼貌提意见；禁止条条结构雷同。
- 禁止书面腔：首先/其次、总的来说、笔者认为、令人动容、细腻描写、情感真挚、令人共情。
- 禁止每条都用「这段」「这篇」「作者」开头；禁止整齐排比。
- 仍保持短：多数 6～28 字；全楼最多 1 条 ≤45 字；潜水党 2～6 字。
- 禁止 Unicode emoji；感叹号最多一个，能不用就不用。

硬性规则：
1. 生成约 ${count} 条网友评论；personaId 必须是名单里的 id，每人尽量只冒一次泡。
2. 允许友善分歧：至少 1 条考据/锐评对「文本身」提不同看法；禁止全员彩虹屁，也禁止整楼开喷。
3. 1～2 条网友可设 replyToPersonaId 顶楼上某条（仅一层），像同好接话/补充，不是互撕。
${authorReplyBlock}
5. 只输出 JSON：{"comments":[{"personaId":"...","content":"...","replyToPersonaId":"可选"}]}`

  const user = `【原帖标题】${params.postTitle}
【原帖正文（抠细节用，不要复述成长段）】
${params.postBody.slice(0, 1400)}

【本楼可用人格】
${roster}
${
  residentAuthor
    ? `\n【楼主写手（仅用于选择性回评，勿当普通灌水网友）】\nid=${residentAuthor.id} | ${residentAuthor.username}\n${residentAuthor.replyStylePrompt}`
    : ''
}

请生成一楼同人社区风短评。像同好半夜刷到随手回：有温度、有磕点/槽点，但尊重楼主，别像机器人，也别开撕。`

  const raw = await forumChat({
    apiConfig,
    system,
    user,
    temperature: 1.05,
    max_tokens: 1100,
    json: true,
  })
  const obj = extractJsonObject(raw)
  const list = obj && Array.isArray(obj.comments) ? obj.comments : null
  if (!list?.length) throw new Error('评论区生成结果解析失败，请重试')

  const byId = new Map(personas.map((p) => [p.id, p]))
  const allowed = new Set(personas.map((p) => p.id))
  if (residentAuthor) allowed.add(residentAuthor.id)

  const rows: RawCommentRow[] = []
  let authorReplyCount = 0
  for (const item of list) {
    if (!item || typeof item !== 'object') continue
    const r = item as Record<string, unknown>
    const personaId = typeof r.personaId === 'string' ? r.personaId.trim() : ''
    let content = typeof r.content === 'string' ? r.content.trim() : ''
    if (!personaId || !content || !allowed.has(personaId)) continue

    const isAuthor = personaId === postAuthorId
    if (isAuthor) {
      if (!residentAuthor || authorReplyCount >= maxAuthorReplies) continue
      // 楼主只能回评，不能灌水一级
      const replyTo =
        typeof r.replyToPersonaId === 'string' ? r.replyToPersonaId.trim() : ''
      if (!replyTo || !allowed.has(replyTo) || replyTo === postAuthorId) continue
      content = scrubCommentAlive(content).slice(0, 42)
      if (content.length < 1) continue
      rows.push({ personaId, content, replyToPersonaId: replyTo })
      authorReplyCount += 1
      continue
    }

    content = scrubCommentAlive(content).slice(0, 48)
    if (content.length < 1) continue
    const replyTo =
      typeof r.replyToPersonaId === 'string' ? r.replyToPersonaId.trim() : undefined
    rows.push({
      personaId,
      content,
      ...(replyTo && allowed.has(replyTo) && replyTo !== personaId && replyTo !== postAuthorId
        ? { replyToPersonaId: replyTo }
        : {}),
    })
    if (rows.length >= count + maxAuthorReplies + 2) break
  }
  if (rows.filter((r) => r.personaId !== postAuthorId).length < 3) {
    throw new Error('评论区有效条目过少，请重试')
  }

  // 映射楼中楼：replyToPersonaId → 该人格第一条一级评论的 id
  const topCommentIdByPersona = new Map<string, string>()
  const out: ForumComment[] = []
  const now = Date.now()
  let i = 0
  const gaps = [8_000, 25_000, 41_000, 70_000, 95_000, 130_000, 180_000, 240_000, 300_000, 360_000]

  // 先落网友一级/互回，再落楼主回评（时间更晚一点更像真人陆续回）
  const netizenRows = rows.filter((r) => r.personaId !== postAuthorId)
  const authorRows = rows.filter((r) => r.personaId === postAuthorId)

  for (const row of [...netizenRows, ...authorRows]) {
    if (row.personaId !== postAuthorId && !byId.has(row.personaId)) continue
    let parentCommentId: string | undefined
    if (row.replyToPersonaId) {
      const parentId = topCommentIdByPersona.get(row.replyToPersonaId)
      if (parentId) parentCommentId = parentId
      else if (row.personaId === postAuthorId) continue // 楼主必须回得到具体楼
    }
    const id = createForumCommentId()
    if (!parentCommentId && !topCommentIdByPersona.has(row.personaId)) {
      topCommentIdByPersona.set(row.personaId, id)
    }
    out.push({
      id,
      postId: '',
      authorPersonaId: row.personaId,
      content: row.content,
      createdAt: now + (gaps[i] ?? i * 50_000),
      ...(parentCommentId ? { parentCommentId } : {}),
    })
    i += 1
  }
  return out
}

function buildAuthorReplyRules(writer: ResidentWriter, maxReplies: number): string {
  return `4. 楼主是常驻写手 id=${writer.id}（${writer.username}），可选择性回评：
   - 最多 ${maxReplies} 条；personaId 必须用楼主 id；每条必须带 replyToPersonaId 指向某条网友一级评。
   - 禁止楼主发一级灌水；禁止条条都回；要挑：有信息量的夸、友善质疑、认真提问。
   - 回评风格：${writer.replyStylePrompt}
   - 回评也要口语短，6～28 字；语气友好尊重，可有个性，不可怼人。`
}

/** 去掉书面腔开场，保留口语碎感 */
function scrubCommentAlive(raw: string): string {
  let s = raw.replace(/\s+/g, ' ').trim()
  s = s.replace(/^(这段|这篇|作者|楼主|文里|首先|总的来说|说实话|不得不说)[，,：:\s]*/u, '')
  s = s.replace(/[！!]{2,}/g, '！')
  s = s.replace(/[。.]{2,}/g, '…')
  return s.trim()
}

/** 给评论补上 postId */
export function bindCommentsToPost(comments: ForumComment[], postId: string): ForumComment[] {
  const pid = postId.trim()
  return comments.map((c) => ({ ...c, postId: pid }))
}
