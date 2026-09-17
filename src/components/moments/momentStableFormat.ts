/**
 * 朋友圈模型输出：稳定纯文本行协议（标签｜内容），替代 JSON。
 * 分隔行短稳，字段可多行重复；正文内换行写成 \n。
 */

export const MOMENT_POST_MARKER = '---MOMENT---'
export const MOMENT_INTERACT_MARKER = '---互动---'
export const MOMENT_REPLY_MARKER = '---回复---'
export const MOMENT_THREAD_MARKER = '---评区---'
export const MOMENT_KEYWORDS_MARKER = '---关键词---'

export const MOMENT_STABLE_OUTPUT_HARD_RULES = `
【硬性输出约束】
- 只输出下方规定的分隔行 +「标签｜内容」行，禁止 JSON、禁止 Markdown 代码块、禁止前后解释、禁止思维链标签。
- 标签与内容之间用全角｜或半角|或冒号：分隔；一行一条字段。
- 正文/评论里若需换行，写成 \\n，不要真换行打断字段行。
- 不需要的字段可省略；明确「无」时写「无」或留空段。
`.trim()

/** 发布动态（角色发文 / 历史补发）字段说明 */
export const MOMENT_POST_STABLE_FORMAT_HINT = `
输出格式（从分隔行开始，不要其它废话）：
${MOMENT_POST_MARKER}
类型｜text 或 image 或 mixed 或 music
正文｜配文；无文字可写无；换行用 \\n
配图｜英文画面描述（可多行各一张；text/music 勿写）
地点｜真实地名，或不写/无
置顶｜是 或 否
权限｜public 或 only_user 或 hide_from
屏蔽｜characterId1,characterId2（仅 hide_from）
提醒用户｜是 或 否
提醒｜characterId1,characterId2（可选）
歌名｜曲名（仅 music）
歌手｜歌手名（仅 music）
自评｜追评正文｜延迟秒数（可选，0～3 条）
`.trim()

/** 即时生成：发文 + 互动 */
export const MOMENT_INSTANT_STABLE_FORMAT_HINT = `
输出格式：
${MOMENT_POST_MARKER}
（同发文：类型/正文/配图/地点/权限/屏蔽/提醒用户/提醒/歌名/歌手/自评）
${MOMENT_INTERACT_MARKER}
点赞｜authorId｜延迟秒数
评论｜authorId｜评论正文｜延迟秒数｜可选id如c_001
楼中楼｜authorId｜被回复互动id｜评论正文｜延迟秒数
发布者回｜被回复互动id｜回复正文｜延迟秒数
（无互动时本段可只写「（无）」）
`.trim()

export const MOMENT_AUTHOR_REPLY_STABLE_FORMAT_HINT = `
输出格式：
${MOMENT_REPLY_MARKER}
回复｜口语正文
（逐条模式：有 N 条评论就写 N 行「回复｜…」，顺序一一对应；整体模式只写 1 行）
`.trim()

export const MOMENT_THREAD_REPLY_STABLE_FORMAT_HINT = `
输出格式：
${MOMENT_THREAD_MARKER}
接话｜authorCharId｜replyToCommentId｜口语正文
（2～6 行为宜；无合适接话写「（无）」）
`.trim()

export const MOMENT_BATCH_INTERACT_STABLE_FORMAT_HINT = `
输出格式：
${MOMENT_INTERACT_MARKER}
点赞｜charId｜延迟秒数
评论｜charId｜评论正文｜延迟秒数
楼中楼｜charId｜replyToCharId｜评论正文｜延迟秒数
（无互动写「（无）」；禁止写 displayName，只写 charId）
`.trim()

export const MOMENT_PERSONA_INTERACT_STABLE_FORMAT_HINT = `
输出格式：
${MOMENT_INTERACT_MARKER}
点赞｜延迟秒数
评论｜评论正文｜延迟秒数
（可 0 条：只写「（无）」；禁止 type=viewed）
`.trim()

export const MOMENT_USER_THREAD_STABLE_FORMAT_HINT = `
输出格式：
${MOMENT_THREAD_MARKER}
接话｜charId｜replyToCharId｜口语正文｜延迟秒数
（0～5 条；无合适接话写「（无）」）
`.trim()

export const MOMENT_KEYWORDS_STABLE_FORMAT_HINT = `
输出格式：
${MOMENT_KEYWORDS_MARKER}
词｜关键词1
词｜关键词2
词｜关键词3
（3～5 个）
`.trim()

export const CHARACTER_MOMENT_PRIVACY_STABLE_HINT = `
权限｜public 或 only_user 或 hide_from
屏蔽｜characterId,…（仅 hide_from，最多 8 人）
提醒用户｜是 或 否
提醒｜characterId,…（可选，最多 5 人）
`.trim()

export const CHARACTER_MOMENT_MUSIC_STABLE_HINT = `
歌名｜晴天
歌手｜周杰伦
`.trim()

export const PUBLISHER_SELF_COMMENT_STABLE_HINT = `自评｜追评补充说明｜60`

function stripFence(raw: string): string {
  return String(raw ?? '')
    .replace(/^\uFEFF/, '')
    .replace(/^```(?:[\w-]*)?\s*\n?/i, '')
    .replace(/\n?```\s*$/i, '')
    .trim()
}

function unescapeFieldValue(v: string): string {
  return v
    .replace(/\\n/g, '\n')
    .replace(/\\｜/g, '｜')
    .replace(/\\\|/g, '|')
    .replace(/\\:/g, ':')
    .trim()
}

function parseBoolish(raw: string): boolean | undefined {
  const t = raw.trim().toLowerCase()
  if (!t || t === '无' || t === '空' || t === 'null' || t === 'undefined') return undefined
  if (['是', 'true', '1', 'yes', 'y', 'on'].includes(t)) return true
  if (['否', 'false', '0', 'no', 'n', 'off'].includes(t)) return false
  return undefined
}

function parsePrivacyMode(raw: string): 'public' | 'only_user' | 'hide_from' | '' {
  const t = raw.trim().toLowerCase().replace(/\s+/g, '')
  if (!t || t === '无') return ''
  if (t === 'public' || t === '公开' || t === '全部' || t === '所有人') return 'public'
  if (
    t === 'only_user' ||
    t === 'onlyuser' ||
    t === 'only-you' ||
    t === '仅用户' ||
    t === '私密' ||
    t === '仅自己' ||
    t === '仅对方'
  ) {
    return 'only_user'
  }
  if (t === 'hide_from' || t === 'hidefrom' || t === 'hidden_from' || t === '屏蔽' || t === '不给谁看') {
    return 'hide_from'
  }
  return ''
}

function splitIds(raw: string): string[] {
  return raw
    .split(/[,，、;\s]+/)
    .map((x) => x.trim())
    .filter((x) => x && x !== '无' && x !== '空')
}

function splitFieldLine(line: string): { label: string; rest: string } | null {
  const m = line.match(/^(.{1,16}?)\s*[｜|:：]\s*(.*)$/u)
  if (!m) return null
  return { label: (m[1] ?? '').trim(), rest: (m[2] ?? '').trim() }
}

function labelEquals(label: string, ...aliases: string[]): boolean {
  const n = label.replace(/\s+/g, '').toLowerCase()
  return aliases.some((a) => a.replace(/\s+/g, '').toLowerCase() === n)
}

function extractSection(src: string, markers: string[]): string {
  const lower = src
  let bestIdx = -1
  let bestMarker = ''
  for (const marker of markers) {
    const i = lower.indexOf(marker)
    if (i >= 0 && (bestIdx < 0 || i < bestIdx)) {
      bestIdx = i
      bestMarker = marker
    }
  }
  if (bestIdx < 0) return src
  let tail = src.slice(bestIdx + bestMarker.length)
  const otherMarkers = [
    MOMENT_POST_MARKER,
    MOMENT_INTERACT_MARKER,
    MOMENT_REPLY_MARKER,
    MOMENT_THREAD_MARKER,
    MOMENT_KEYWORDS_MARKER,
  ].filter((m) => !markers.includes(m))
  let cut = tail.length
  for (const m of otherMarkers) {
    const i = tail.indexOf(m)
    if (i >= 0 && i < cut) cut = i
  }
  return tail.slice(0, cut).trim()
}

function isNoneBody(src: string): boolean {
  const t = src.trim()
  return !t || /^(（无）|\(无\)|无|无互动|无回复|无接话|无关键词)\s*$/u.test(t)
}

function iterFieldLines(section: string): Array<{ label: string; parts: string[] }> {
  const out: Array<{ label: string; parts: string[] }> = []
  for (const rawLine of section.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#') || /^---/.test(line)) continue
    if (isNoneBody(line)) continue
    const parsed = splitFieldLine(line)
    if (!parsed) continue
    const parts = parsed.rest.split(/[｜|]/).map((p) => unescapeFieldValue(p))
    out.push({ label: parsed.label, parts })
  }
  return out
}

function hasStableMomentMarkers(raw: string): boolean {
  return (
    raw.includes(MOMENT_POST_MARKER) ||
    raw.includes(MOMENT_INTERACT_MARKER) ||
    raw.includes(MOMENT_REPLY_MARKER) ||
    raw.includes(MOMENT_THREAD_MARKER) ||
    raw.includes(MOMENT_KEYWORDS_MARKER) ||
    /^(类型|正文|配图|权限|回复|点赞|评论|接话|词)\s*[｜|:：]/m.test(raw)
  )
}

/** 将稳定文本解析为旧 JSON 形态的发文字段对象，供 normalize* 复用 */
export function parseMomentPostObjectFromStableText(raw: string): Record<string, unknown> | null {
  const src = stripFence(raw)
  if (!src) return null
  const section = extractSection(src, [MOMENT_POST_MARKER])
  if (!section && !hasStableMomentMarkers(src)) return null

  const body = section || src
  if (isNoneBody(body) && !hasStableMomentMarkers(src)) return null

  const o: Record<string, unknown> = {}
  const images: string[] = []
  const selfComments: Array<{ content: string; delaySeconds?: number }> = []
  let musicTitle = ''
  let musicArtist = ''

  for (const { label, parts } of iterFieldLines(body)) {
    const v0 = parts[0] ?? ''
    if (labelEquals(label, '类型', 'postType', '载体')) {
      const t = v0.toLowerCase()
      if (t === 'text' || t === '纯文字' || t === '文字') o.postType = 'text'
      else if (t === 'image' || t === '纯图片' || t === '图片') o.postType = 'image'
      else if (t === 'music' || t === '音乐' || t === '歌曲') o.postType = 'music'
      else if (t === 'mixed' || t === '图文') o.postType = 'mixed'
    } else if (labelEquals(label, '正文', 'content', '配文', 'text', 'body')) {
      o.content = v0 === '无' || v0 === '空' ? '' : v0
    } else if (labelEquals(label, '配图', 'images', 'image', 'imagePrompts', '图')) {
      if (v0 && v0 !== '无') images.push(v0)
    } else if (labelEquals(label, '地点', 'location')) {
      o.location = !v0 || v0 === '无' || v0 === 'null' ? null : v0
    } else if (labelEquals(label, '置顶', 'isPinned', 'pin')) {
      const b = parseBoolish(v0)
      if (b != null) o.isPinned = b
    } else if (labelEquals(label, '权限', 'privacy', '可见')) {
      const mode = parsePrivacyMode(v0)
      if (mode) o.privacy = mode
    } else if (labelEquals(label, '屏蔽', 'hideFromCharacterIds', 'hideFrom', '不给看')) {
      o.hideFromCharacterIds = splitIds(parts.join(','))
    } else if (labelEquals(label, '提醒用户', 'mentionUser', '@用户')) {
      const b = parseBoolish(v0)
      if (b != null) o.mentionUser = b
    } else if (labelEquals(label, '提醒', 'mentionCharacterIds', '@好友', '提醒谁看')) {
      o.mentionCharacterIds = splitIds(parts.join(','))
    } else if (labelEquals(label, '歌名', 'title', '曲名', '歌曲')) {
      musicTitle = v0
    } else if (labelEquals(label, '歌手', 'artist', '演唱')) {
      musicArtist = v0
    } else if (labelEquals(label, '自评', 'publisherSelfComments', '追评')) {
      const content = v0
      if (!content || content === '无') continue
      const delayRaw = Number(parts[1])
      selfComments.push({
        content,
        ...(Number.isFinite(delayRaw) ? { delaySeconds: Math.floor(delayRaw) } : {}),
      })
    }
  }

  if (images.length) {
    o.images = images
    o.imagePrompts = images
  }
  if (musicTitle) {
    o.attachedMusic = { title: musicTitle, artist: musicArtist || '未知歌手' }
  }
  if (selfComments.length) o.publisherSelfComments = selfComments

  const hasSignal =
    o.postType != null ||
    typeof o.content === 'string' ||
    images.length > 0 ||
    musicTitle ||
    o.privacy != null ||
    selfComments.length > 0
  return hasSignal ? o : null
}

export type StableInstantInteractionRow = {
  type: 'like' | 'comment'
  authorId: string
  delaySeconds?: number
  id?: string
  content?: string
  replyTo?: string
  reply?: { content: string; delaySeconds?: number }
}

export function parseMomentInstantInteractionsFromStableText(raw: string): StableInstantInteractionRow[] {
  const src = stripFence(raw)
  const section = extractSection(src, [MOMENT_INTERACT_MARKER])
  if (!section || isNoneBody(section)) return []

  const rows: StableInstantInteractionRow[] = []
  const publisherReplies: Array<{ replyTo: string; content: string; delaySeconds?: number }> = []

  for (const { label, parts } of iterFieldLines(section)) {
    if (labelEquals(label, '点赞', 'like')) {
      const authorId = (parts[0] ?? '').trim()
      if (!authorId) continue
      const delayRaw = Number(parts[1])
      rows.push({
        type: 'like',
        authorId,
        ...(Number.isFinite(delayRaw) ? { delaySeconds: Math.floor(delayRaw) } : {}),
      })
      continue
    }
    if (labelEquals(label, '评论', 'comment')) {
      // 评论｜authorId｜内容｜delay｜id?
      const authorId = (parts[0] ?? '').trim()
      const content = (parts[1] ?? '').trim()
      const delayRaw = Number(parts[2])
      const id = (parts[3] ?? '').trim()
      if (!authorId || !content) continue
      rows.push({
        type: 'comment',
        authorId,
        content,
        ...(Number.isFinite(delayRaw) ? { delaySeconds: Math.floor(delayRaw) } : {}),
        ...(id ? { id } : {}),
      })
      continue
    }
    if (labelEquals(label, '楼中楼', '回复评', '接评')) {
      // 楼中楼｜authorId｜replyToId｜内容｜delay
      const authorId = (parts[0] ?? '').trim()
      const replyTo = (parts[1] ?? '').trim()
      const content = (parts[2] ?? '').trim()
      const delayRaw = Number(parts[3])
      if (!authorId || !replyTo || !content) continue
      rows.push({
        type: 'comment',
        authorId,
        content,
        replyTo,
        ...(Number.isFinite(delayRaw) ? { delaySeconds: Math.floor(delayRaw) } : {}),
      })
      continue
    }
    if (labelEquals(label, '发布者回', '作者回', '自评回')) {
      const replyTo = (parts[0] ?? '').trim()
      const content = (parts[1] ?? '').trim()
      const delayRaw = Number(parts[2])
      if (!replyTo || !content) continue
      publisherReplies.push({
        replyTo,
        content,
        ...(Number.isFinite(delayRaw) ? { delaySeconds: Math.floor(delayRaw) } : {}),
      })
    }
  }

  for (const pr of publisherReplies) {
    const row = rows.find((r) => r.type === 'comment' && r.id === pr.replyTo)
    if (!row) continue
    row.reply = {
      content: pr.content,
      ...(pr.delaySeconds != null ? { delaySeconds: pr.delaySeconds } : {}),
    }
  }

  return rows
}

export function parseMomentInstantObjectFromStableText(raw: string): Record<string, unknown> | null {
  const post = parseMomentPostObjectFromStableText(raw)
  const interactions = parseMomentInstantInteractionsFromStableText(raw)
  if (!post && !interactions.length) return null
  const o: Record<string, unknown> = { ...(post ?? {}) }
  if (interactions.length) o.interactions = interactions
  return o
}

export function parseAuthorRepliesFromStableText(raw: string, expectedCount: number): string[] | null {
  const src = stripFence(raw)
  if (!src) return null
  const section = extractSection(src, [MOMENT_REPLY_MARKER])
  const body = section || src
  if (isNoneBody(body) && src.includes(MOMENT_REPLY_MARKER)) {
    return expectedCount > 0 ? Array.from({ length: expectedCount }, () => '') : []
  }

  const replies: string[] = []
  for (const { label, parts } of iterFieldLines(body)) {
    if (labelEquals(label, '回复', 'reply', 'content', '正文')) {
      const content = (parts[0] ?? '').trim()
      if (content) replies.push(content)
    }
  }
  if (replies.length) return replies

  // 无标签时：非 JSON 纯文本整段当作一条
  if (!src.trimStart().startsWith('{') && !hasStableMomentMarkers(src)) {
    const t = src.trim()
    if (t) return [t]
  }
  return replies.length ? replies : null
}

export type StableThreadReplyRow = {
  authorCharId: string
  replyToCommentId: string
  content: string
}

export function parseThreadRepliesFromStableText(raw: string): StableThreadReplyRow[] {
  const src = stripFence(raw)
  const section = extractSection(src, [MOMENT_THREAD_MARKER, MOMENT_REPLY_MARKER])
  const body = section || src
  if (!body || isNoneBody(body)) return []

  const out: StableThreadReplyRow[] = []
  for (const { label, parts } of iterFieldLines(body)) {
    if (!labelEquals(label, '接话', '回复', 'reply', '楼中楼')) continue
    const authorCharId = (parts[0] ?? '').trim()
    const replyToCommentId = (parts[1] ?? '').trim()
    const content = (parts[2] ?? '').trim()
    if (!authorCharId || !replyToCommentId || !content) continue
    out.push({ authorCharId, replyToCommentId, content })
  }
  return out
}

export type StableBatchInteractionRow = {
  charId: string
  type: 'like' | 'comment'
  content?: string
  delaySeconds?: number
  replyToCharId?: string
}

export function parseBatchInteractionsFromStableText(raw: string): StableBatchInteractionRow[] {
  const src = stripFence(raw)
  const section = extractSection(src, [MOMENT_INTERACT_MARKER])
  const body = section || src
  if (!body || isNoneBody(body)) return []

  const out: StableBatchInteractionRow[] = []
  for (const { label, parts } of iterFieldLines(body)) {
    if (labelEquals(label, '点赞', 'like')) {
      const charId = (parts[0] ?? '').trim()
      if (!charId) continue
      const delayRaw = Number(parts[1])
      out.push({
        type: 'like',
        charId,
        ...(Number.isFinite(delayRaw) ? { delaySeconds: Math.floor(delayRaw) } : {}),
      })
      continue
    }
    if (labelEquals(label, '评论', 'comment')) {
      const charId = (parts[0] ?? '').trim()
      const content = (parts[1] ?? '').trim()
      const delayRaw = Number(parts[2])
      if (!charId || !content) continue
      out.push({
        type: 'comment',
        charId,
        content,
        ...(Number.isFinite(delayRaw) ? { delaySeconds: Math.floor(delayRaw) } : {}),
      })
      continue
    }
    if (labelEquals(label, '楼中楼', '接话', '回复评')) {
      const charId = (parts[0] ?? '').trim()
      const replyToCharId = (parts[1] ?? '').trim()
      const content = (parts[2] ?? '').trim()
      const delayRaw = Number(parts[3])
      if (!charId || !replyToCharId || !content) continue
      out.push({
        type: 'comment',
        charId,
        replyToCharId,
        content,
        ...(Number.isFinite(delayRaw) ? { delaySeconds: Math.floor(delayRaw) } : {}),
      })
    }
  }
  return out
}

export type StablePersonaInteractionRow = {
  type: 'like' | 'comment'
  content?: string
  delaySeconds?: number
}

export function parsePersonaInteractionsFromStableText(raw: string): StablePersonaInteractionRow[] {
  const src = stripFence(raw)
  const section = extractSection(src, [MOMENT_INTERACT_MARKER])
  const body = section || src
  if (!body || isNoneBody(body)) return []

  const out: StablePersonaInteractionRow[] = []
  for (const { label, parts } of iterFieldLines(body)) {
    if (labelEquals(label, '点赞', 'like')) {
      const delayRaw = Number(parts[0])
      out.push({
        type: 'like',
        ...(Number.isFinite(delayRaw) ? { delaySeconds: Math.floor(delayRaw) } : {}),
      })
      continue
    }
    if (labelEquals(label, '评论', 'comment')) {
      const content = (parts[0] ?? '').trim()
      const delayRaw = Number(parts[1])
      if (!content) continue
      out.push({
        type: 'comment',
        content,
        ...(Number.isFinite(delayRaw) ? { delaySeconds: Math.floor(delayRaw) } : {}),
      })
    }
  }
  return out
}

export type StableUserThreadRow = {
  charId: string
  replyToCharId: string
  content: string
  delaySeconds?: number
}

export function parseUserMomentThreadFromStableText(raw: string): StableUserThreadRow[] {
  const src = stripFence(raw)
  const section = extractSection(src, [MOMENT_THREAD_MARKER, MOMENT_INTERACT_MARKER])
  const body = section || src
  if (!body || isNoneBody(body)) return []

  const out: StableUserThreadRow[] = []
  for (const { label, parts } of iterFieldLines(body)) {
    if (!labelEquals(label, '接话', '回复', '楼中楼', 'reply')) continue
    const charId = (parts[0] ?? '').trim()
    const replyToCharId = (parts[1] ?? '').trim()
    const content = (parts[2] ?? '').trim()
    const delayRaw = Number(parts[3])
    if (!charId || !replyToCharId || !content) continue
    out.push({
      charId,
      replyToCharId,
      content,
      ...(Number.isFinite(delayRaw) ? { delaySeconds: Math.floor(delayRaw) } : {}),
    })
  }
  return out
}

export function parseKeywordsFromStableText(raw: string): string[] {
  const src = stripFence(raw)
  const section = extractSection(src, [MOMENT_KEYWORDS_MARKER])
  const body = section || src
  if (!body || isNoneBody(body)) return []

  const out: string[] = []
  for (const { label, parts } of iterFieldLines(body)) {
    if (!labelEquals(label, '词', '关键词', 'keyword', 'keywords')) continue
    const t = (parts[0] ?? '').replace(/\s+/g, ' ').trim()
    if (!t || t.length > 16) continue
    if (!out.includes(t)) out.push(t)
    if (out.length >= 5) break
  }
  return out
}

export function looksLikeMomentStableText(raw: string): boolean {
  return hasStableMomentMarkers(stripFence(raw))
}
