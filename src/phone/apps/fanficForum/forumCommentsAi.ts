import type { ApiConfig } from '../api/types'
import {
  FORUM_COMMUNITY_RULES,
  FORUM_PROSE_SHORT_BAN,
  extractJsonObject,
  forumChat,
  normalizeForumFicProse,
  requireForumApi,
} from './forumAiShared'
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
  replyToPersonaId?: string
}

function unescapeCommentText(s: string): string {
  return s
    .replace(/\\n/g, '\n')
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\')
    .trim()
}

/** 从完整或截断的 JSON 里尽量抠出 comments 条目 */
function scrapeCommentRows(raw: string): RawCommentRow[] {
  const rows: RawCommentRow[] = []
  const seen = new Set<string>()
  // 兼容字段顺序不一、replyTo 可缺省、截断前已闭合的对象
  const re =
    /\{\s*"personaId"\s*:\s*"([^"]+)"\s*,\s*"content"\s*:\s*"((?:\\.|[^"\\])*)"(?:\s*,\s*"replyToPersonaId"\s*:\s*"([^"]*)")?\s*\}/g
  const reAlt =
    /\{\s*"content"\s*:\s*"((?:\\.|[^"\\])*)"\s*,\s*"personaId"\s*:\s*"([^"]+)"(?:\s*,\s*"replyToPersonaId"\s*:\s*"([^"]*)")?\s*\}/g

  const push = (personaId: string, contentRaw: string, replyTo?: string) => {
    const content = normalizeForumFicProse(unescapeCommentText(contentRaw))
    const pid = personaId.trim()
    if (!pid || !content) return
    const key = `${pid}|${content}|${replyTo ?? ''}`
    if (seen.has(key)) return
    seen.add(key)
    rows.push({
      personaId: pid,
      content: content.slice(0, 160),
      ...(replyTo?.trim() ? { replyToPersonaId: replyTo.trim() } : {}),
    })
  }

  let m: RegExpExecArray | null
  while ((m = re.exec(raw)) != null) {
    push(m[1]!, m[2]!, m[3])
  }
  while ((m = reAlt.exec(raw)) != null) {
    push(m[2]!, m[1]!, m[3])
  }
  return rows
}

export function parseForumCommentsPayload(raw: string): unknown[] {
  const t = (raw ?? '').trim()
  if (!t) {
    throw new Error('模型返回为空（可能被截断或接口异常）')
  }
  const obj = extractJsonObject(t)
  if (obj && Array.isArray(obj.comments) && obj.comments.length) {
    return obj.comments
  }
  // comments 数组本身可解析（偶发裸数组）
  const arrStart = t.indexOf('[')
  const arrEnd = t.lastIndexOf(']')
  if (arrStart >= 0 && arrEnd > arrStart) {
    try {
      const parsed = JSON.parse(t.slice(arrStart, arrEnd + 1))
      if (Array.isArray(parsed) && parsed.length) return parsed
    } catch {
      /* fallthrough */
    }
  }
  const scraped = scrapeCommentRows(t)
  if (scraped.length) return scraped

  const preview = t.replace(/\s+/g, ' ').slice(0, 72)
  const hint = !t.includes('{')
    ? '返回里没有 JSON'
    : t.includes('"comments"') && !t.includes(']')
      ? 'comments 数组疑似被截断'
      : 'JSON 无法解析'
  throw new Error(`${hint}（约 ${t.length} 字）。开头：${preview}`)
}

/** 为评论区挑固定人格库（与单独生成评论同一套） */
export function pickForumCommentPersonas(params: {
  postAuthorPersonaId: string
  topCount: number
  seed?: string
  personas?: NetizenPersona[]
}): NetizenPersona[] {
  const postAuthorId = params.postAuthorPersonaId.trim()
  const topCount = Math.min(12, Math.max(2, Math.floor(params.topCount)))
  const personaPool = Math.max(topCount + 1, 4)
  const personas =
    params.personas?.length && params.personas.length >= 3
      ? params.personas.slice(0, personaPool)
      : pickPersonasForThread({
          count: personaPool,
          preferArchetypes: [...FORUM_DISSENT_ARCHETYPES],
          excludeIds: [postAuthorId],
          seed: params.seed ?? `comments:${Date.now()}`,
        })

  if (!personas.some((p) => FORUM_DISSENT_ARCHETYPES.includes(p.archetype))) {
    const dissent = pickPersonasForThread({
      count: 1,
      preferArchetypes: [...FORUM_DISSENT_ARCHETYPES],
      excludeIds: [postAuthorId, ...personas.map((p) => p.id)],
      seed: `dissent:${params.seed ?? 'x'}`,
    })
    if (dissent[0]) {
      personas[personas.length - 1] = dissent[0]
    }
  }
  return personas
}

export function formatForumCommentRoster(personas: NetizenPersona[]): string {
  return personas
    .map(
      (p) =>
        `- id=${p.id} | 用户名=${p.username} | 类型=${p.archetype}\n  人设：${p.personaPrompt}\n  评论风格：${p.commentStylePrompt}`,
    )
    .join('\n')
}

/** 把模型吐的 comments 列表挂成楼中楼结构 */
export function mountForumCommentsFromList(params: {
  list: unknown[]
  personas: NetizenPersona[]
  postAuthorPersonaId: string
  topCount: number
  replyCount: number
}): ForumComment[] {
  const topCount = Math.min(12, Math.max(2, Math.floor(params.topCount)))
  const replyCount = Math.min(6, Math.max(0, Math.floor(params.replyCount)))
  const postAuthorId = params.postAuthorPersonaId.trim()
  const residentAuthor = getResidentWriter(postAuthorId)
  const maxAuthorReplies = residentAuthor ? maxAuthorRepliesFor(residentAuthor) : 0
  const personas = params.personas
  const byId = new Map(personas.map((p) => [p.id, p]))
  const allowed = new Set(personas.map((p) => p.id))
  if (residentAuthor) allowed.add(residentAuthor.id)
  const byName = new Map(personas.map((p) => [p.username, p.id]))

  const topRows: RawCommentRow[] = []
  const replyRows: RawCommentRow[] = []
  const authorRows: RawCommentRow[] = []
  let authorReplyCount = 0

  for (const item of params.list) {
    if (!item || typeof item !== 'object') continue
    const r = item as Record<string, unknown>
    let personaId = typeof r.personaId === 'string' ? r.personaId.trim() : ''
    if (!allowed.has(personaId) && byName.has(personaId)) {
      personaId = byName.get(personaId)!
    }
    const content =
      typeof r.content === 'string' ? normalizeForumFicProse(r.content) : ''
    if (!personaId || !content || !allowed.has(personaId)) continue

    const replyToRaw =
      typeof r.replyToPersonaId === 'string' ? r.replyToPersonaId.trim() : ''
    const isAuthor = personaId === postAuthorId

    if (isAuthor) {
      if (!residentAuthor || authorReplyCount >= maxAuthorReplies) continue
      if (!replyToRaw || !allowed.has(replyToRaw) || replyToRaw === postAuthorId) continue
      authorRows.push({ personaId, content, replyToPersonaId: replyToRaw })
      authorReplyCount += 1
      continue
    }

    if (!byId.has(personaId)) continue

    if (
      replyToRaw &&
      allowed.has(replyToRaw) &&
      replyToRaw !== personaId &&
      replyToRaw !== postAuthorId
    ) {
      if (replyRows.length >= replyCount) continue
      replyRows.push({ personaId, content, replyToPersonaId: replyToRaw })
    } else {
      if (topRows.length >= topCount) continue
      if (topRows.some((t) => t.personaId === personaId)) continue
      topRows.push({ personaId, content })
    }
  }

  if (topRows.length < Math.min(2, topCount)) {
    throw new Error(
      `评论区一级有效条目过少（仅 ${topRows.length} 条，需要至少 ${Math.min(2, topCount)}）`,
    )
  }

  const topCommentIdByPersona = new Map<string, string>()
  const out: ForumComment[] = []
  const now = Date.now()
  let i = 0
  const gaps = [
    8_000, 25_000, 41_000, 70_000, 95_000, 130_000, 180_000, 240_000, 300_000, 360_000, 420_000,
    480_000,
  ]

  for (const row of topRows) {
    const id = createForumCommentId()
    topCommentIdByPersona.set(row.personaId, id)
    out.push({
      id,
      postId: '',
      authorPersonaId: row.personaId,
      content: normalizeForumFicProse(row.content),
      createdAt: now + (gaps[i] ?? i * 50_000),
    })
    i += 1
  }

  let nested = 0
  for (const row of replyRows) {
    if (nested >= replyCount) break
    const parentId = row.replyToPersonaId
      ? topCommentIdByPersona.get(row.replyToPersonaId)
      : undefined
    if (!parentId) continue
    out.push({
      id: createForumCommentId(),
      postId: '',
      authorPersonaId: row.personaId,
      content: normalizeForumFicProse(row.content),
      createdAt: now + (gaps[i] ?? i * 50_000),
      parentCommentId: parentId,
    })
    nested += 1
    i += 1
  }

  for (const row of authorRows) {
    const parentId = row.replyToPersonaId
      ? topCommentIdByPersona.get(row.replyToPersonaId)
      : undefined
    if (!parentId) continue
    out.push({
      id: createForumCommentId(),
      postId: '',
      authorPersonaId: row.personaId,
      content: normalizeForumFicProse(row.content),
      createdAt: now + (gaps[i] ?? i * 50_000) + 40_000,
      parentCommentId: parentId,
    })
    i += 1
  }

  return out
}

/**
 * 为帖子生成有观点分歧的评论区（最多二层楼中楼）。
 * 风格与数量全靠提示词约束模型输出；本地只做 JSON 解析与楼中楼挂载。
 * count = 一级评论；replyCount = 楼中楼接话。
 */
export async function aiGenerateForumComments(params: {
  apiConfig: ApiConfig | null
  postTitle: string
  postBody: string
  postAuthorPersonaId: string
  personas?: NetizenPersona[]
  /** 一级评论条数，默认 6，范围 2～12 */
  count?: number
  /** 楼中楼互动条数，默认 2，范围 0～6 */
  replyCount?: number
  seed?: string
}): Promise<ForumComment[]> {
  const apiConfig = requireForumApi(params.apiConfig)
  const topCount = Math.min(12, Math.max(2, Math.floor(params.count ?? 6)))
  const replyCount = Math.min(6, Math.max(0, Math.floor(params.replyCount ?? 2)))
  const postAuthorId = params.postAuthorPersonaId.trim()
  const residentAuthor = getResidentWriter(postAuthorId)
  const maxAuthorReplies = residentAuthor ? maxAuthorRepliesFor(residentAuthor) : 0
  const personas = pickForumCommentPersonas({
    postAuthorPersonaId: postAuthorId,
    topCount,
    seed: params.seed ?? `${params.postTitle}:${Date.now()}`,
    personas: params.personas,
  })
  const roster = formatForumCommentRoster(personas)

  const authorReplyBlock =
    residentAuthor && maxAuthorReplies > 0
      ? buildAuthorReplyRules(residentAuthor, maxAuthorReplies)
      : `4. 禁止冒充楼主 id=${postAuthorId}（本楼楼主不回评）。`

  const system = `你是同人创作论坛（Lofter / 贴吧 / 太太文楼下混风）评论区编导。必须使用下方「固定人格库」中的网友发言，禁止发明新用户名或新 id。
你直接输出合格评论内容；下游不会再改写你的措辞——请一次写对。
${FORUM_COMMUNITY_RULES}
${FORUM_PROSE_SHORT_BAN}

【同人社区互动风 · 活人感——最高优先级】
像同好半夜刷到太太文随手回：有磕点、有槽点、会接话。不像客服、不像弹幕机、不像读后感机器人。

必须：
- 每条都点到正文里的一个具体细节（半句对白、一个动作、一个物件、一个时间点）。
- 楼中楼是「接着楼上聊」：补充、抬杠半句、追问细节、顺着磕、礼貌纠错；禁止复读「同意」「+1」。
- 语气参差：口语碎 / 短毒舌 / 小声嗑 / 考据；禁止全楼一个句式。
- 可省略主语、半截话、轻微语病；感叹号能不用就不用；禁止 Unicode emoji。

禁止机感空壳（不要单独成句，也不要当整句主体）：
泪了、笑死、绝了、好家伙、呜呜、啊啊啊、哈哈哈、破防了、磕到了、氛围绝了、写得真好、爱了、太甜了、太刀了、路过、+1、同上、蹲一个、马克。
也不要用「这段写得……」「作者真会……」开场八股。

硬性数量（必须凑齐）：
1. 恰好 ${topCount} 条【一级评论】：不要带 replyToPersonaId；personaId 用名单 id，每人尽量只冒一次一级泡。
2. 恰好 ${replyCount} 条【楼中楼】：必须带 replyToPersonaId，指向上面某条一级评论的 personaId（仅一层）。${
    replyCount === 0 ? '（本次楼中楼为 0，不要写 replyToPersonaId。）' : ''
  }
3. 友善分歧：${topCount >= 4 ? '一级里至少 1 条' : '尽量有'}考据/锐评对文本身提不同看法；禁止全员彩虹屁，也禁止整楼开喷。
${authorReplyBlock}
5. 只输出 JSON：{"comments":[{"personaId":"...","content":"...","replyToPersonaId":"可选"}]}；content 禁止句中 \\n 硬折行，一条评连写成一行。
6. 一级多数 8～36 字；楼中楼 6～28 字；全楼最多 1 条 ≤48 字。`

  const user = `【原帖标题】${params.postTitle}
【原帖正文（抠细节用，不要复述成长段）】
${params.postBody.slice(0, 1600)}

【本楼可用人格】
${roster}
${
  residentAuthor
    ? `\n【楼主写手（仅用于选择性回评）】\nid=${residentAuthor.id} | ${residentAuthor.username}\n${residentAuthor.replyStylePrompt}`
    : ''
}

请一次性输出合格评论：${topCount} 条一级 + ${replyCount} 条楼中楼。
内容要像同人社区真人互动；禁止「泪了」「笑死」一类空壳机评。
只输出 JSON，不要其它前后缀。`

  // 按条数等比给 token，不加人为上限
  const maxTokens = Math.max(1400, 1400 + (topCount + replyCount) * 220)

  let list: unknown[]
  try {
    const raw = await forumChat({
      apiConfig,
      system,
      user,
      temperature: 1.08,
      max_tokens: maxTokens,
      json: true,
    })
    list = parseForumCommentsPayload(raw)
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e)
    throw new Error(`评论区生成结果解析失败：${detail}`)
  }

  try {
    return mountForumCommentsFromList({
      list,
      personas,
      postAuthorPersonaId: postAuthorId,
      topCount,
      replyCount,
    })
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e)
    throw new Error(`评论区生成结果解析失败：${detail}`)
  }
}

function buildAuthorReplyRules(writer: ResidentWriter, maxReplies: number): string {
  return `4. 楼主是常驻写手 id=${writer.id}（${writer.username}），可选择性回评：
   - 最多 ${maxReplies} 条；personaId 必须用楼主 id；每条必须带 replyToPersonaId 指向某条网友一级评。
   - 禁止楼主发一级灌水；禁止条条都回；要挑有信息量的夸、友善质疑、认真提问。
   - 回评风格：${writer.replyStylePrompt}
   - 回评口语短，6～28 字；友好尊重；禁止「泪了」「笑死」空壳。`
}

/** 给评论补上 postId */
export function bindCommentsToPost(comments: ForumComment[], postId: string): ForumComment[] {
  const pid = postId.trim()
  return comments.map((c) => ({ ...c, postId: pid }))
}
