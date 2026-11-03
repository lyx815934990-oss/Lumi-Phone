/**
 * 线下约会主回复：稳定标签块提取（content / comments / synopsis / theater / thinking）。
 * 主推英文 XML；兼容【】【/】、中英别名、漏闭合、全角尖括号。
 */

export type DatingTaggedBlockKind = 'thinking' | 'content' | 'comments' | 'synopsis' | 'theater'

export type DatingTaggedBlocks = {
  thinking: string
  content: string
  comments: string
  synopsis: string
  theater: string
  /** 未归入已知块的剩余文本 */
  rest: string
  /** 是否命中过任一「正文」类标签（含空 content） */
  hadContentTag: boolean
}

/** 块语义 → 可识别的开标签名（不含括号） */
export const DATING_TAGGED_BLOCK_ALIASES: Record<DatingTaggedBlockKind, readonly string[]> = {
  thinking: ['thinking', 'think', 'reasoning', 'logicpass', '思维链', '场记'],
  content: ['content', 'body', 'plot', '正文', '剧情', '剧情正文'],
  comments: ['comments', 'comment', 'reader_comments', '读者评论', '读者评论区', '评论区'],
  synopsis: ['synopsis', 'summary', '本节梗概', '剧情摘要', '梗概'],
  theater: ['theater', 'theatre', 'plot_html', '小剧场', '剧情可视化', '物证映像'],
}

const KIND_ORDER: DatingTaggedBlockKind[] = [
  'thinking',
  'content',
  'comments',
  'synopsis',
  'theater',
]

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** 全角尖括号 → 半角，便于统一匹配 */
export function normalizeDatingTagAngles(s: string): string {
  return String(s ?? '')
    .replace(/\uFF1C/g, '<')
    .replace(/\uFF1E/g, '>')
    .replace(/＜/g, '<')
    .replace(/＞/g, '>')
}

function aliasAlternation(kind: DatingTaggedBlockKind): string {
  return DATING_TAGGED_BLOCK_ALIASES[kind].map(escapeRegExp).join('|')
}

type OpenHit = {
  kind: DatingTaggedBlockKind
  start: number
  end: number
}

/** 在 text[from..] 找最早出现的开标签 */
function findNextOpen(text: string, from: number): OpenHit | null {
  let best: OpenHit | null = null
  for (const kind of KIND_ORDER) {
    const names = aliasAlternation(kind)
    // <content ...> 或 【content】 / 【 正文 】
    const xml = new RegExp(`<\\s*(?:${names})\\b[^>]*>`, 'iu')
    const bracket = new RegExp(`【\\s*(?:${names})\\s*】`, 'iu')
    for (const re of [xml, bracket]) {
      re.lastIndex = 0
      const slice = text.slice(from)
      const m = slice.match(re)
      if (!m || m.index === undefined) continue
      const start = from + m.index
      const end = start + m[0].length
      if (!best || start < best.start) best = { kind, start, end }
    }
  }
  return best
}

/** 为开标签找闭合；找不到则吃到下一开标签或文末 */
function findCloseEnd(
  text: string,
  kind: DatingTaggedBlockKind,
  bodyStart: number,
): { bodyEnd: number; closeEnd: number } {
  const names = aliasAlternation(kind)
  const closers = [
    // </content>
    new RegExp(`<\\s*/\\s*(?:${names})\\s*>`, 'iu'),
    // 【/content】 【/正文】
    new RegExp(`【\\s*/\\s*(?:${names})\\s*】`, 'iu'),
    // 【content结束】 【正文 结束】 【读者评论结束】
    new RegExp(`【\\s*(?:${names})\\s*结束\\s*】`, 'iu'),
    // 【结束·正文】 少见
    new RegExp(`【\\s*结束\\s*[·・.\\-]?\\s*(?:${names})\\s*】`, 'iu'),
  ]
  let earliest: { bodyEnd: number; closeEnd: number } | null = null
  const searchFrom = bodyStart
  for (const re of closers) {
    re.lastIndex = 0
    const slice = text.slice(searchFrom)
    const m = slice.match(re)
    if (!m || m.index === undefined) continue
    const bodyEnd = searchFrom + m.index
    const closeEnd = bodyEnd + m[0].length
    if (!earliest || bodyEnd < earliest.bodyEnd) earliest = { bodyEnd, closeEnd }
  }
  if (earliest) return earliest

  const next = findNextOpen(text, bodyStart)
  if (next) return { bodyEnd: next.start, closeEnd: next.start }
  return { bodyEnd: text.length, closeEnd: text.length }
}

function emptyBlocks(): DatingTaggedBlocks {
  return {
    thinking: '',
    content: '',
    comments: '',
    synopsis: '',
    theater: '',
    rest: '',
    hadContentTag: false,
  }
}

/** 把 content（或指定块）内文换成续写后的完整稿，保留原开闭标签与其它块。 */
export function replaceDatingTaggedBlockInner(
  raw: string,
  kind: DatingTaggedBlockKind,
  inner: string,
): string {
  const text = normalizeDatingTagAngles(String(raw ?? ''))
  if (!text.trim()) return String(inner ?? '').trim()
  let cursor = 0
  while (cursor < text.length) {
    const open = findNextOpen(text, cursor)
    if (!open) break
    const { bodyEnd, closeEnd } = findCloseEnd(text, open.kind, open.end)
    if (open.kind === kind) {
      const body = String(inner ?? '').trim()
      return `${text.slice(0, open.end)}\n${body}\n${text.slice(bodyEnd)}`
    }
    cursor = closeEnd
  }
  return `${text.trim()}\n\n${String(inner ?? '').trim()}`.trim()
}

/**
 * 从模型整段输出中提取标签块。
 * 同一语义多段时拼接（换行）；rest 为从未被开标签吃掉的间隙文本。
 */
export function extractDatingTaggedBlocks(raw: string): DatingTaggedBlocks {
  const text = normalizeDatingTagAngles(String(raw ?? '')).trim()
  if (!text) return emptyBlocks()

  const out = emptyBlocks()
  const bags: Record<DatingTaggedBlockKind, string[]> = {
    thinking: [],
    content: [],
    comments: [],
    synopsis: [],
    theater: [],
  }
  const restChunks: string[] = []
  let cursor = 0

  while (cursor < text.length) {
    const open = findNextOpen(text, cursor)
    if (!open) {
      const tail = text.slice(cursor).trim()
      if (tail) restChunks.push(tail)
      break
    }
    const before = text.slice(cursor, open.start).trim()
    if (before) restChunks.push(before)
    if (open.kind === 'content') out.hadContentTag = true
    const { bodyEnd, closeEnd } = findCloseEnd(text, open.kind, open.end)
    const inner = text.slice(open.end, bodyEnd).trim()
    if (inner) bags[open.kind].push(inner)
    cursor = Math.max(closeEnd, open.end)
    if (cursor <= open.start) cursor = open.end + 1
  }

  out.thinking = bags.thinking.join('\n\n').trim()
  out.content = bags.content.join('\n\n').trim()
  out.comments = bags.comments.join('\n\n').trim()
  out.synopsis = bags.synopsis.join('\n').trim()
  out.theater = bags.theater.join('\n\n').trim()
  out.rest = restChunks.join('\n\n').trim()
  return out
}

/** 不用 \\b：汉字后接 】 时 JS word-boundary 不成立 */
const VN_PLOT_SCENE_OPEN_RE = /【\s*(?:旁白|对白|内心|心声|OS|os)(?=\s*[｜|】])/u

/**
 * 正文为空时：若 thinking 内已有 VN 剧情标签，从首个标签起提升为正文。
 * 返回提升后的 content；未提升返回 null。
 */
export function promotePlotBodyFromThinkingBlob(thinking: string): {
  content: string
  leftoverThinking: string
} | null {
  const t = String(thinking ?? '').trim()
  if (!t) return null
  const m = t.match(VN_PLOT_SCENE_OPEN_RE)
  if (!m || m.index === undefined) return null
  const content = t.slice(m.index).trim()
  if (!content) return null
  const leftoverThinking = t.slice(0, m.index).trim()
  return { content, leftoverThinking }
}

/** 从原文中删除某一语义的全部标签块（保留其它文本与标签） */
export function stripDatingTaggedKind(raw: string, kind: DatingTaggedBlockKind): string {
  const text = normalizeDatingTagAngles(String(raw ?? ''))
  if (!text.trim()) return ''
  const parts: string[] = []
  let cursor = 0
  while (cursor < text.length) {
    const open = findNextOpen(text, cursor)
    if (!open) {
      parts.push(text.slice(cursor))
      break
    }
    parts.push(text.slice(cursor, open.start))
    const { closeEnd } = findCloseEnd(text, open.kind, open.end)
    if (open.kind !== kind) {
      parts.push(text.slice(open.start, closeEnd))
    }
    cursor = Math.max(closeEnd, open.end)
    if (cursor <= open.start) cursor = open.end + 1
  }
  return parts.join('').replace(/\n{3,}/g, '\n\n').trim()
}

/** 提示词附录：标签块硬格式（短） */
export function buildDatingTaggedBlocksOutputAppendix(opts?: {
  comments?: boolean
  theater?: boolean
  thinking?: boolean
}): string {
  const thinkingOn = opts?.thinking !== false
  const commentsOn = opts?.comments === true
  const theaterOn = opts?.theater === true
  const lines = [
    `【硬性输出格式·标签块 · 最高优先】`,
    `客户端按标签切分；**可读剧情必须写在 content 内**，禁止只写 thinking、禁止把正文塞进思维链。`,
    thinkingOn
      ? `- 思维链（可选场记）：\`<thinking>…</thinking>\`（总汉字建议 ≤700；禁止写剧情正文）`
      : `- **禁止**输出 \`<thinking>\` / 思维链块`,
    `- 剧情正文（必填）：\`<content>…</content>\`（VN 的【旁白】/【对白】/【内心】写在 content 内）`,
  ]
  if (commentsOn) {
    lines.push(
      `- 读者评论：\`<comments>…</comments>\`（内文仍用 ★|昵称|赞|文案；正文里插【读者讨论位N】）`,
    )
  }
  lines.push(`- 本节梗概：\`<synopsis>…</synopsis>\`（8～20 汉字标题式摘要）`)
  if (theaterOn) {
    lines.push(`- 小剧场：\`<theater>…</theater>\`（内含可解析 HTML；禁止 JSON）`)
  }
  lines.push(
    `兼容写法：也接受 \`【正文】…【/正文】\`、\`【content】…【/content】\`、\`【读者评论】…【读者评论结束】\`、\`【本节梗概】…\`、\`【小剧场】…【小剧场结束】\`。`,
    `顺序建议：thinking（若开）→ content → comments（若开）→ synopsis → theater（若开）→ ---WB_AFTER_PATCH---。`,
  )
  return lines.join('\n')
}
