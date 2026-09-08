/**
 * 读者评论模式：优先与剧情同轮输出；若主回复漏块，则落库后另开短请求补齐（不计入正文字数）。
 *
 * 期望模型尾部格式（正文之后）：
 * 【读者评论】
 * #1
 * ★|昵称|点赞|评论文案
 * ·|昵称|点赞|评论文案
 * #2
 * ★|昵称|点赞|评论文案
 * 【读者评论结束】
 *
 * ★ = 高光向评论；· = 普通。
 * 正文中可多处插入「【读者讨论位】」（或【读者讨论位1】…），评论只点评该锚点之前刚发生的情节。
 */

export type PlotReaderComment = {
  id: string
  nick: string
  text: string
  likes: number
  /** 是否针对高光瞬间 */
  highlight?: boolean
  /** 0–359，用于头像底色 */
  hue: number
  /**
   * 对应第几个讨论位（从 0 起）。
   * 与正文中第 N 个【读者讨论位】对齐；缺省时按解析顺序归组。
   */
  slot?: number
}

export type ReaderCommentBodySegment =
  | { type: 'text'; text: string }
  | { type: 'comments'; slot: number; comments: PlotReaderComment[] }

export const READER_COMMENT_ANCHOR = '【读者讨论位】'

/** 匹配【读者讨论位】或【读者讨论位1】… */
const ANCHOR_TOKEN_RE = /【\s*读者讨论位\s*\d*\s*】|⟦\s*读者讨论\s*\d*\s*⟧/gu

const BLOCK_RE =
  /【\s*读者评论(?:区|块|模式)?\s*】\s*([\s\S]*?)【\s*读者评论(?:区|块|模式)?\s*结束\s*】/iu
const BLOCK_OPEN_RE = /【\s*读者评论(?:区|块|模式)?\s*】\s*([\s\S]*)$/iu
const BLOCK_XML_RE =
  /<reader_comments\b[^>]*>([\s\S]*?)<\/reader_comments>/i
/** 兼容模型用 ## / 【评论】 等半成品标题 */
const BLOCK_ALT_RE =
  /(?:^|\n)\s*(?:#{1,3}\s*)?(?:读者评论|评论区)\s*[:：]?\s*\n([\s\S]*?)(?=\n\s*【\s*(?:小剧场|本节梗概|VN\s*语音|读者评论结束)|<<<DATING_UNIFIED_MEMORY|$)/iu

const SLOT_HEADER_RE = /^(?:#|＠|@|位)\s*(\d{1,2})\s*[:：]?$/u
const SLOT_PREFIX_RE = /^(?:#|＠|@|位)?\s*(\d{1,2})\s*[|｜]/u

const MEMORY_DELIMITER_MARKERS = ['<<<DATING_UNIFIED_MEMORY>>>', '<<<DATING_UNIFIED_MEMORY_JSON>>>']

function trimBeforeMemoryDelimiter(text: string): string {
  let s = String(text || '')
  for (const marker of MEMORY_DELIMITER_MARKERS) {
    const idx = s.indexOf(marker)
    if (idx >= 0) s = s.slice(0, idx)
  }
  return s.trim()
}

function normalizeCommentLineRaw(line: string): string {
  return String(line || '')
    .replace(/\uFF0C/g, ',')
    .replace(/[｜]/g, '|')
    .trim()
}

function hashHue(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h % 360
}

function uidComment(i: number, nick: string): string {
  return `rc-${i}-${hashHue(nick).toString(36)}`
}

function parseLikes(raw: string): number {
  const n = Number(String(raw || '').replace(/[^\d]/g, ''))
  if (!Number.isFinite(n) || n < 0) return 0
  return Math.min(999_999, Math.round(n))
}

function parseCommentLine(line: string, index: number, slot: number): PlotReaderComment | null {
  let t = normalizeCommentLineRaw(line)
  if (!t) return null
  // 纯注释行；带槽位/管道的「#1|★|…」仍解析
  if (t.startsWith('#') && !/[|｜]/.test(t) && !SLOT_HEADER_RE.test(t) && !SLOT_PREFIX_RE.test(t)) {
    return null
  }

  let lineSlot = slot
  const slotPref = t.match(SLOT_PREFIX_RE)
  // 「1|★|nick|likes|text」：首位是槽位号（后面至少还有 3 段）
  if (slotPref) {
    const rest = t.slice(slotPref[0].length)
    const probe = rest.split('|')
    if (probe.length >= 3) {
      lineSlot = Math.max(0, parseInt(slotPref[1]!, 10) - 1)
      t = rest
    }
  }

  // 兼容模型把 ★/· 与昵称粘在一起：★昵称|赞|文 → ★|昵称|赞|文
  t = t.replace(/^(★|＊|\*|·|•|・|高光|HOT|hot|热)\s*(?=[^|｜])/u, '$1|')

  const parts = t.split('|').map((p) => p.trim())
  if (parts.length >= 4) {
    const flag = parts[0]!
    const nick = parts[1]!.slice(0, 16) || '匿名读者'
    const likes = parseLikes(parts[2]!)
    const text = parts.slice(3).join('|').trim()
    if (!text) return null
    const highlight =
      flag === '★' ||
      flag === '*' ||
      flag === '＊' ||
      flag === '高光' ||
      /^highlight$/i.test(flag) ||
      flag === '1' ||
      flag === '热' ||
      flag === 'HOT'
    return {
      id: uidComment(index, nick),
      nick,
      text: text.slice(0, 280),
      likes,
      highlight,
      hue: hashHue(nick),
      slot: lineSlot,
    }
  }
  // ★|昵称|文案（漏写点赞）
  if (parts.length === 3) {
    const flag = parts[0]!
    const looksFlag =
      flag === '★' ||
      flag === '*' ||
      flag === '＊' ||
      flag === '·' ||
      flag === '•' ||
      flag === '・' ||
      flag === '-' ||
      flag === '高光' ||
      flag === '热' ||
      /^highlight$/i.test(flag) ||
      flag === 'HOT'
    if (looksFlag) {
      const nick = parts[1]!.slice(0, 16) || '匿名读者'
      const text = parts[2]!.trim()
      if (!text) return null
      return {
        id: uidComment(index, nick),
        nick,
        text: text.slice(0, 280),
        likes: 0,
        highlight: flag === '★' || flag === '*' || flag === '＊' || flag === '高光' || flag === '热' || flag === 'HOT',
        hue: hashHue(nick),
        slot: lineSlot,
      }
    }
  }
  const m = t.match(/^@?\s*([^\s👍·★]{1,16})\s*(?:·|👍|赞)?\s*(\d{0,6})\s*[：:\s]+(.+)$/u)
  if (m) {
    const nick = m[1]!.trim()
    const text = m[3]!.trim()
    if (!text) return null
    return {
      id: uidComment(index, nick),
      nick,
      text: text.slice(0, 280),
      likes: parseLikes(m[2] || '0'),
      highlight: t.includes('★') || t.startsWith('高光'),
      hue: hashHue(nick),
      slot: lineSlot,
    }
  }
  return null
}

function findReaderCommentBlock(text: string): { inner: string; start: number; end: number } | null {
  const src = String(text || '')
  const xml = src.match(BLOCK_XML_RE)
  if (xml && xml.index !== undefined) {
    return { inner: xml[1] || '', start: xml.index, end: xml.index + xml[0].length }
  }
  const closed = src.match(BLOCK_RE)
  if (closed && closed.index !== undefined) {
    return { inner: closed[1] || '', start: closed.index, end: closed.index + closed[0].length }
  }
  const open = src.match(BLOCK_OPEN_RE)
  if (open && open.index !== undefined) {
    let inner = String(open[1] || '')
    // 未闭合评论块时，勿吞掉其后的小剧场 / 梗概 / VN
    const cutRes =
      /【\s*小剧场\s*】/u.exec(inner) ||
      /【\s*(?:剧情可视化|物证映像)\s*】/u.exec(inner) ||
      /【\s*本节梗概\s*】/u.exec(inner) ||
      /【\s*VN\s*语音参数\s*】/iu.exec(inner) ||
      /<<<DATING_UNIFIED_MEMORY/u.exec(inner)
    let end = src.length
    if (cutRes && cutRes.index !== undefined) {
      end = open.index + open[0].length - inner.length + cutRes.index
      inner = inner.slice(0, cutRes.index)
    }
    inner = trimBeforeMemoryDelimiter(inner)
    if (!inner.trim()) return null
    return { inner, start: open.index, end }
  }
  const alt = src.match(BLOCK_ALT_RE)
  if (alt && alt.index !== undefined && String(alt[1] || '').trim()) {
    return { inner: alt[1] || '', start: alt.index, end: alt.index + alt[0].length }
  }
  return null
}

/** 模型偶发把评论块写成 JSON：尽量抢救成可展示条目（仍应优先用 ★|昵称|点赞|文案） */
function tryParseCommentsFromJsonBlob(inner: string): PlotReaderComment[] {
  let s = String(inner || '').trim()
  if (!s) return []
  const fenced = s.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fenced?.[1]) s = fenced[1].trim()
  const start = s.search(/[\[{]/)
  if (start < 0) return []
  s = s.slice(start)
  let data: unknown
  try {
    data = JSON.parse(s)
  } catch {
    // 截到最后一个 ] 或 } 再试
    const endArr = s.lastIndexOf(']')
    const endObj = s.lastIndexOf('}')
    const end = Math.max(endArr, endObj)
    if (end <= 0) return []
    try {
      data = JSON.parse(s.slice(0, end + 1))
    } catch {
      return []
    }
  }
  const rows: unknown[] = Array.isArray(data)
    ? data
    : data && typeof data === 'object'
      ? Array.isArray((data as { comments?: unknown }).comments)
        ? ((data as { comments: unknown[] }).comments as unknown[])
        : Array.isArray((data as { items?: unknown }).items)
          ? ((data as { items: unknown[] }).items as unknown[])
          : Object.values(data as Record<string, unknown>).flatMap((v) => (Array.isArray(v) ? v : []))
      : []
  const out: PlotReaderComment[] = []
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue
    const o = row as Record<string, unknown>
    const nick = String(o.nick ?? o.nickname ?? o.name ?? o.user ?? o.author ?? '').trim().slice(0, 16)
    const text = String(o.text ?? o.content ?? o.comment ?? o.body ?? '').trim()
    if (!nick || !text) continue
    const likes = parseLikes(String(o.likes ?? o.like ?? o.thumbs ?? '0'))
    const highlight = !!(o.highlight || o.hot || o.star || o.featured)
    const slotRaw = o.slot ?? o.index ?? o.pos ?? o.anchor
    const slot =
      typeof slotRaw === 'number' && Number.isFinite(slotRaw)
        ? Math.max(0, Math.floor(slotRaw) - (slotRaw >= 1 ? 1 : 0))
        : undefined
    out.push({
      id: uidComment(out.length, nick),
      nick,
      text: text.slice(0, 280),
      likes,
      highlight,
      hue: hashHue(nick),
      ...(slot != null ? { slot } : {}),
    })
    if (out.length >= 24) break
  }
  return out
}

function parseCommentBlockInner(inner: string): PlotReaderComment[] {
  const lines = String(inner || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
  const out: PlotReaderComment[] = []
  let currentSlot = 0
  let sawSlotHeader = false

  for (const line of lines) {
    if (line.startsWith('[') || line.startsWith('{')) continue
    const header = line.match(SLOT_HEADER_RE)
    if (header) {
      currentSlot = Math.max(0, parseInt(header[1]!, 10) - 1)
      sawSlotHeader = true
      continue
    }
    // 兼容旧格式：无槽位头时，按出现顺序暂记 slot=0，稍后均分
    const c = parseCommentLine(line, out.length, sawSlotHeader ? currentSlot : 0)
    if (c) {
      if (!sawSlotHeader) delete c.slot
      out.push(c)
    }
  }

  // 管线行解析为空时，再尝试 JSON 抢救（禁止当规范格式，仅兜底展示）
  if (!out.length) {
    const fromJson = tryParseCommentsFromJsonBlob(inner)
    if (fromJson.length) return fromJson
  }

  // 旧格式（无 #1/#2）：不强制改 slot，留给 UI 按锚点数均分
  out.sort((a, b) => {
    const as = a.slot ?? 0
    const bs = b.slot ?? 0
    if (as !== bs) return as - bs
    const ah = a.highlight ? 1 : 0
    const bh = b.highlight ? 1 : 0
    if (ah !== bh) return bh - ah
    return b.likes - a.likes
  })
  return out.slice(0, 24)
}

/** 从模型正文拆出读者评论块；返回去掉评论块后的正文（保留讨论位锚点） */
export function extractAndStripReaderComments(raw: string): {
  content: string
  comments: PlotReaderComment[]
} {
  const text = String(raw || '')
  const block = findReaderCommentBlock(text)
  if (!block) return { content: text.trim(), comments: [] }
  const comments = parseCommentBlockInner(block.inner)
  const content = (text.slice(0, block.start) + text.slice(block.end)).trim()
  return { content, comments }
}

/** 从多个候选片段中提取读者评论（plotRaw / 完整回复 / 思维链等） */
export function extractReaderCommentsFromModelOutput(sources: string[]): PlotReaderComment[] {
  for (const src of sources) {
    const t = String(src || '').trim()
    if (!t) continue
    const { comments } = extractAndStripReaderComments(t)
    if (comments.length) return comments
  }
  return []
}

function listAnchorMatches(src: string): { index: number; length: number; slot: number }[] {
  const out: { index: number; length: number; slot: number }[] = []
  const re = new RegExp(ANCHOR_TOKEN_RE.source, 'gu')
  let m: RegExpExecArray | null
  let appearance = 0
  while ((m = re.exec(src)) !== null) {
    const num = m[0].match(/(\d+)\s*[】⟧]/u)
    const slot = num ? Math.max(0, parseInt(num[1]!, 10) - 1) : appearance
    out.push({ index: m.index, length: m[0].length, slot })
    appearance += 1
  }
  return out
}

/** 正文是否已有讨论位锚点 */
export function countReaderCommentAnchorsInBody(body: string): number {
  return listAnchorMatches(String(body || '')).length
}

/**
 * 若正文缺少【读者讨论位N】，按段落高光点自动插入 2～3 处，供评论穿插展示。
 * 已有锚点则原样返回。
 */
export function ensureReaderCommentAnchorsInBody(
  body: string,
  desiredSlots = 2,
): { body: string; slotCount: number; changed: boolean } {
  const raw = String(body || '').trim()
  if (!raw) return { body: '', slotCount: 0, changed: false }
  const existing = listAnchorMatches(raw)
  if (existing.length > 0) {
    const maxSlot = Math.max(...existing.map((a) => a.slot)) + 1
    return { body: raw, slotCount: Math.max(existing.length, maxSlot), changed: false }
  }

  const cleaned = stripReaderCommentAnchors(raw)
  const paras = cleaned
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
  const slotN = Math.max(2, Math.min(3, desiredSlots, Math.max(2, Math.floor(paras.length / 2) || 2)))

  if (paras.length <= 1) {
    // 单段：在约 55% / 85% 处按句号切开插锚点
    const text = cleaned
    const breaks: number[] = []
    const re = /[。！？!?]/gu
    let m: RegExpExecArray | null
    while ((m = re.exec(text)) !== null) breaks.push(m.index + 1)
    const picks: number[] = []
    if (breaks.length >= 2) {
      picks.push(breaks[Math.floor(breaks.length * 0.45)] ?? breaks[0]!)
      picks.push(breaks[Math.floor(breaks.length * 0.8)] ?? breaks[breaks.length - 1]!)
    } else if (breaks.length === 1) {
      picks.push(breaks[0]!)
      picks.push(text.length)
    } else {
      const mid = Math.max(24, Math.floor(text.length * 0.5))
      picks.push(mid, text.length)
    }
    const uniq = [...new Set(picks)].sort((a, b) => a - b).slice(0, slotN)
    let out = ''
    let cursor = 0
    uniq.forEach((at, i) => {
      const end = Math.min(text.length, Math.max(cursor, at))
      out += text.slice(cursor, end).trimEnd()
      out += `\n\n【读者讨论位${i + 1}】\n\n`
      cursor = end
    })
    out += text.slice(cursor).trimStart()
    return { body: out.replace(/\n{3,}/g, '\n\n').trim(), slotCount: uniq.length, changed: true }
  }

  // 多段：均匀选段落后插入锚点（避开首段开头与末段之后空插）
  const indices: number[] = []
  for (let s = 1; s <= slotN; s++) {
    const idx = Math.min(paras.length - 1, Math.max(0, Math.round((paras.length * s) / (slotN + 1)) - 1))
    if (!indices.includes(idx)) indices.push(idx)
  }
  while (indices.length < slotN && indices.length < paras.length) {
    for (let i = 0; i < paras.length && indices.length < slotN; i++) {
      if (!indices.includes(i)) indices.push(i)
    }
  }
  indices.sort((a, b) => a - b)

  const parts: string[] = []
  let slot = 1
  paras.forEach((p, i) => {
    parts.push(p)
    if (indices.includes(i) && slot <= slotN) {
      parts.push(`【读者讨论位${slot}】`)
      slot += 1
    }
  })
  // 若仍不足，在末尾补
  while (slot <= slotN) {
    parts.push(`【读者讨论位${slot}】`)
    slot += 1
  }
  return {
    body: parts.join('\n\n').replace(/\n{3,}/g, '\n\n').trim(),
    slotCount: slotN,
    changed: true,
  }
}

/** 把无 slot / 乱序评论按组均分到 0..slotCount-1 */
export function redistributeReaderCommentsToSlots(
  comments: PlotReaderComment[],
  slotCount: number,
): PlotReaderComment[] {
  const n = Math.max(1, slotCount)
  const list = [...comments]
  if (!list.length) return list
  const tagged = list.filter((c) => typeof c.slot === 'number' && c.slot >= 0 && c.slot < n)
  if (tagged.length === list.length) return list
  // 按出现顺序均分
  return list.map((c, i) => ({
    ...c,
    slot: Math.min(n - 1, Math.floor((i * n) / list.length)),
  }))
}

/** 正文是否含讨论锚点；返回拆分后的前后段（仅首个锚点；兼容旧调用） */
export function splitBodyAtReaderCommentAnchor(body: string): {
  before: string
  after: string
  hasAnchor: boolean
} {
  const src = String(body || '')
  const anchors = listAnchorMatches(src)
  if (!anchors.length) return { before: src, after: '', hasAnchor: false }
  const first = anchors[0]!
  return {
    before: src.slice(0, first.index).trimEnd(),
    after: src.slice(first.index + first.length).trimStart(),
    hasAnchor: true,
  }
}

/** 去掉正文里残留的讨论锚点（禁止当普通文字展示） */
export function stripReaderCommentAnchors(body: string): string {
  return String(body || '')
    .replace(ANCHOR_TOKEN_RE, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/**
 * 翻译/外发前保护锚点：换成私用区占位，译完再还原，避免锚点丢失。
 */
export function protectReaderCommentAnchors(body: string): {
  text: string
  restore: (translated: string) => string
} {
  const src = String(body || '')
  const tokens: string[] = []
  const text = src.replace(ANCHOR_TOKEN_RE, (tok) => {
    const i = tokens.length
    tokens.push(tok)
    return `\uE000RC${i}\uE001`
  })
  return {
    text,
    restore: (translated: string) =>
      String(translated || '').replace(/\uE000RC(\d+)\uE001/g, (_, n) => tokens[Number(n)] ?? READER_COMMENT_ANCHOR),
  }
}

function commentsForSlot(
  all: PlotReaderComment[],
  slot: number,
  slotCount: number,
): PlotReaderComment[] {
  const maxSlot = Math.max(0, slotCount - 1)
  // 槽位越界（模型写 #5 但只有 2 个锚点）→ 钳到末位，避免评论整组「消失」
  const normalized = all.map((c) => {
    if (typeof c.slot !== 'number') return c
    if (c.slot >= 0 && c.slot <= maxSlot) return c
    return { ...c, slot: maxSlot }
  })
  const tagged = normalized.filter((c) => typeof c.slot === 'number')
  const untagged = normalized.filter((c) => typeof c.slot !== 'number')

  // 有任一槽位标记：严格按 slot 对齐；未标记的只挂到最后一个讨论位，避免把后文评论提前塞进前文
  if (tagged.length > 0) {
    const matched = tagged.filter((c) => (c.slot ?? 0) === slot)
    if (untagged.length && slot === maxSlot) {
      return [...matched, ...untagged]
    }
    return matched
  }

  // 完全无槽位标记：禁止均分到各锚点（易把评后文的句子插到前文后面）
  // 全部集中到最后一个讨论位；只有单锚点时才整组展示
  if (slotCount <= 1) return normalized
  return slot === maxSlot ? normalized : []
}

/** 从评论文案抽出可能对应正文的指纹（引号句、较长中文片断） */
function extractCommentSpoilFingerprints(commentText: string, bodyText: string): string[] {
  const comment = String(commentText || '')
  const body = String(bodyText || '')
  if (!comment || !body) return []
  const bodyCompact = body.replace(/[^\u4e00-\u9fff0-9a-zA-Z]/g, '')
  const found = new Set<string>()

  const hit = (p: string): boolean => {
    if (!p) return false
    if (body.includes(p)) return true
    const pc = p.replace(/[^\u4e00-\u9fff0-9a-zA-Z]/g, '')
    return pc.length >= 3 && bodyCompact.includes(pc)
  }

  for (const m of comment.matchAll(/[「『“"']([^」』”"']{2,48})[」』”"']/gu)) {
    const p = m[1]!.trim()
    if (hit(p)) found.add(p)
  }

  const cjkRuns = comment.match(/[\u4e00-\u9fff]{2,12}/gu) ?? []
  for (const run of cjkRuns) {
    if (hit(run)) found.add(run)
    if (run.length > 4) {
      for (let len = Math.min(8, run.length); len >= 4; len--) {
        for (let i = 0; i <= run.length - len; i++) {
          const w = run.slice(i, i + len)
          if (hit(w)) found.add(w)
        }
      }
    }
  }

  const all = [...found].filter((p) => p.length >= 2 && !/^(啊+|哈+|嗯+|哦+|救命+|真的|这个|那个)$/u.test(p))
  const long = all.filter((p) => p.length >= 4)
  // 优先用长指纹，避免「餐具」过早命中；没有长指纹时才用 2～3 字
  return long.length ? long : all
}

function prefixHasFingerprint(prefix: string, phrase: string): boolean {
  if (prefix.includes(phrase)) return true
  const pc = phrase.replace(/[^\u4e00-\u9fff0-9a-zA-Z]/g, '')
  const px = prefix.replace(/[^\u4e00-\u9fff0-9a-zA-Z]/g, '')
  return pc.length >= 3 && px.includes(pc)
}

function commentStillSpoils(commentText: string, prefix: string, fullBody: string): boolean {
  const fps = extractCommentSpoilFingerprints(commentText, fullBody)
  const relevant = fps.filter((p) => prefixHasFingerprint(fullBody, p) || fullBody.includes(p))
  if (!relevant.length) return false
  return relevant.some((p) => !prefixHasFingerprint(prefix, p))
}

/** 哨兵槽：评论须挂在全文末尾（所有锚点之后的正文也读完） */
export const READER_COMMENT_END_SLOT = 9999

/**
 * 若评论引用的正文只出现在某锚点之后，则把该评论推到「引用内容已出现」的最早锚点；
 * 若引用内容在最后一个锚点之后的尾巴里，则推到文末。
 */
function remapCommentsSlotsAgainstSpoilers(
  rawBody: string,
  comments: PlotReaderComment[],
  anchors: { index: number; length: number; slot: number }[],
): PlotReaderComment[] {
  if (!comments.length || !anchors.length) return comments
  const full = stripReaderCommentAnchors(rawBody)
  const prefixes = anchors.map((a) => stripReaderCommentAnchors(rawBody.slice(0, a.index)))
  const lastIdx = anchors.length - 1
  const lastSlot = anchors[lastIdx]!.slot
  const lastPrefix = prefixes[lastIdx]!

  return comments.map((c) => {
    const fingerprints = extractCommentSpoilFingerprints(c.text, full)
    const relevant = fingerprints.filter((p) => prefixHasFingerprint(full, p) || full.includes(p))
    if (!relevant.length) return c

    let safeSlot: number | null = null
    for (let i = 0; i < anchors.length; i++) {
      if (relevant.every((p) => prefixHasFingerprint(prefixes[i]!, p))) {
        safeSlot = anchors[i]!.slot
        break
      }
    }

    // 指纹在正文里，但不在任何锚点之前 → 落在末锚点之后的尾巴，必须挂文末
    if (safeSlot == null) {
      return { ...c, slot: READER_COMMENT_END_SLOT }
    }

    // 模型槽位过早：只能后移
    const desired = typeof c.slot === 'number' ? c.slot : 0
    let nextSlot = Math.max(desired, safeSlot)

    // 即使挂在末锚点，若末锚点前文仍缺指纹（尾巴才有），改挂文末
    if (nextSlot >= lastSlot && commentStillSpoils(c.text, lastPrefix, full)) {
      nextSlot = READER_COMMENT_END_SLOT
    }

    if (nextSlot === c.slot) return c
    return { ...c, slot: nextSlot }
  })
}

/**
 * 按多个讨论位把正文切成「正文段 / 评论段」交替序列。
 * 有锚点：每个锚点处插入对应槽位评论；无锚点但有评论：挂在文末。
 */
export function splitPlotBodyIntoReaderCommentSegments(
  body: string,
  comments: PlotReaderComment[],
  enabled: boolean,
): ReaderCommentBodySegment[] {
  const raw = String(body || '')
  if (!enabled || !comments.length) {
    const cleaned = stripReaderCommentAnchors(raw)
    return cleaned ? [{ type: 'text', text: cleaned }] : []
  }

  const anchors = listAnchorMatches(raw)
  if (anchors.length > 0) {
    const segments: ReaderCommentBodySegment[] = []
    let cursor = 0
    const slotCount = Math.max(
      anchors.length,
      ...anchors.map((a) => a.slot + 1),
      ...comments.map((c) =>
        typeof c.slot === 'number' && c.slot < READER_COMMENT_END_SLOT ? c.slot + 1 : 1,
      ),
    )
    const remapped = remapCommentsSlotsAgainstSpoilers(raw, comments, anchors)
    const endComments = remapped.filter((c) => c.slot === READER_COMMENT_END_SLOT)
    const midComments = remapped.filter((c) => c.slot !== READER_COMMENT_END_SLOT)

    anchors.forEach((a) => {
      const chunk = stripReaderCommentAnchors(raw.slice(cursor, a.index)).trim()
      if (chunk) segments.push({ type: 'text', text: chunk })
      const slotComments = commentsForSlot(midComments, a.slot, slotCount)
      if (slotComments.length) {
        segments.push({ type: 'comments', slot: a.slot, comments: slotComments })
      }
      cursor = a.index + a.length
    })
    const tail = stripReaderCommentAnchors(raw.slice(cursor)).trim()
    if (tail) segments.push({ type: 'text', text: tail })
    if (endComments.length) {
      segments.push({ type: 'comments', slot: READER_COMMENT_END_SLOT, comments: endComments })
    }
    return segments.length ? segments : [{ type: 'text', text: stripReaderCommentAnchors(raw) }]
  }

  // 无锚点回退：整组评论挂在文末，避免按段落均分导致「评后文却插在前文后」
  const cleaned = stripReaderCommentAnchors(raw)
  if (!cleaned) {
    return [{ type: 'comments', slot: 0, comments }]
  }
  return [
    { type: 'text', text: cleaned },
    { type: 'comments', slot: 0, comments },
  ]
}

/**
 * 为评论折叠条切分正文：优先锚点；无锚点但有评论时按段落中段切开。
 * @deprecated 优先使用 {@link splitPlotBodyIntoReaderCommentSegments}
 */
export function splitPlotBodyForReaderComments(
  body: string,
  hasComments: boolean,
): { before: string; after: string; insertFold: boolean } {
  const segs = splitPlotBodyIntoReaderCommentSegments(
    body,
    hasComments ? [{ id: 'x', nick: 'x', text: 'x', likes: 0, hue: 0 }] : [],
    hasComments,
  )
  if (!hasComments) {
    const t = segs.find((s) => s.type === 'text')
    return { before: t && t.type === 'text' ? t.text : stripReaderCommentAnchors(body), after: '', insertFold: false }
  }
  const firstCommentIdx = segs.findIndex((s) => s.type === 'comments')
  if (firstCommentIdx < 0) {
    return { before: stripReaderCommentAnchors(body), after: '', insertFold: true }
  }
  const before = segs
    .slice(0, firstCommentIdx)
    .filter((s): s is { type: 'text'; text: string } => s.type === 'text')
    .map((s) => s.text)
    .join('\n\n')
  const after = segs
    .slice(firstCommentIdx + 1)
    .filter((s): s is { type: 'text'; text: string } => s.type === 'text')
    .map((s) => s.text)
    .join('\n\n')
  return { before, after, insertFold: true }
}

export function buildDatingReaderCommentsAppendix(enabled: boolean): string {
  if (!enabled) return ''
  return (
    `【读者评论模式·同轮输出｜强制】本轮开启「小说随笔式读者评论」。须在**同一则回复**内完成：正文多处插入锚点 + 文末按位分组的评论块；**禁止**另开请求、禁止只写评论不写剧情、禁止只写锚点不写评论块。` +
    `**与思维链开关无关**：即使界面已关闭思维链（直出模式），本块仍须输出，禁止省略。\n` +
    `**格式硬禁**：读者评论**只能**用下方【读者评论】中文标记 + \`★|昵称|点赞|文案\` / \`·|昵称|点赞|文案\` 纯文本行；` +
    `**禁止** JSON、JSON 数组、\`\`\`json 代码块、{ "nick": ... } 对象；**禁止**写进 <thinking> 或 <<<DATING_UNIFIED_MEMORY>>> 记忆 JSON。\n` +
    `1）正文**必须**插入 **2～4 处**编号锚点：「【读者讨论位1】」「【读者讨论位2】」…（数字从 1 起，与文末 #1 #2 严格同号）。` +
    `锚点须紧跟在**本拍已经写完**的高光对白/动作/情绪转折**之后**的空行（读者读完这拍再看见评论）；**禁止**插在半句对白中间，**禁止**插在「即将发生」的情节之前。锚点本身不展示给读者。\n` +
    `2）**禁止剧透（最高优先·展示层也会后移，但你仍须写对）**：写 #N 组评论时，只回看「【读者讨论位N】之前、【读者讨论位N-1】之后」已出现的正文；评论里的对白原文、道具、动作**必须已经写在该窗口内**。\n` +
    `   - **禁止**在锚点前评论锚点后才出现的对白（反例：锚点在「我没怂」后，却评论「没怂就上车」——后者还没出现 = 剧透）。\n` +
    `   - **禁止**整章复盘、禁止「后面他会…」。\n` +
    `   - 正确：先写完整拍（含要被评论的那句对白）→ 再插讨论位 → 再写只评这拍的评论。\n` +
    `3）正文结束后**必须**输出（不要包在 thinking 里），用 #1 #2 … 与锚点编号一一对应（禁止打乱顺序、禁止合并成一大段无编号评论）：\n` +
    `【读者评论】\n` +
    `#1\n` +
    `★|昵称|点赞整数|只点评讨论位1之前刚发生的事\n` +
    `·|昵称|点赞整数|同上局部\n` +
    `#2\n` +
    `★|昵称|点赞整数|只点评讨论位2之前、讨论位1之后刚发生的事\n` +
    `【读者评论结束】\n` +
    `4）每处锚点 1～3 条评论；全文合计 4～10 条。★ 为高光向热评（每处尽量 1 条），· 为普通；昵称像真人网友（2～6 字，勿用角色名）；点赞为合理整数；文案短、口语、像追更弹幕。\n` +
    `5）评论块与锚点**不计入**目标正文字数。\n` +
    `6）输出顺序（同轮一次写完）：剧情正文（含讨论位）→【读者评论】…【读者评论结束】→（若开小剧场）【小剧场】…【小剧场结束】→（VN 时）语音参数块 → 记忆分隔符。` +
    `【读者评论】须在记忆分隔符**之前**；**禁止**放进 <thinking> 或记忆 markup；**禁止**另开请求补评论。\n`
  )
}

export function normalizePlotReaderComments(raw: unknown): PlotReaderComment[] {
  if (!Array.isArray(raw)) return []
  const out: PlotReaderComment[] = []
  for (let i = 0; i < raw.length && out.length < 24; i++) {
    const o = raw[i]
    if (!o || typeof o !== 'object') continue
    const r = o as Record<string, unknown>
    const nick = String(r.nick ?? r.name ?? '').trim().slice(0, 16) || '匿名读者'
    const text = String(r.text ?? r.content ?? '').trim().slice(0, 280)
    if (!text) continue
    const likes = parseLikes(String(r.likes ?? r.like ?? 0))
    const hue =
      typeof r.hue === 'number' && Number.isFinite(r.hue) ? Math.abs(Math.round(r.hue)) % 360 : hashHue(nick)
    const slotRaw = r.slot ?? r.anchor ?? r.index
    const slot =
      typeof slotRaw === 'number' && Number.isFinite(slotRaw)
        ? Math.max(0, Math.round(slotRaw))
        : typeof slotRaw === 'string' && /^\d+$/.test(slotRaw.trim())
          ? Math.max(0, parseInt(slotRaw.trim(), 10))
          : undefined
    out.push({
      id: String(r.id || uidComment(i, nick)),
      nick,
      text,
      likes,
      highlight: r.highlight === true || r.isHighlight === true,
      hue,
      ...(slot !== undefined ? { slot } : {}),
    })
  }
  return out
}
