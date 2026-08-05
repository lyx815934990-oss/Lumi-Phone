/**
 * 心语稳定 XML（闭合标签；禁止 JSON）。
 * 单聊：<heart_whisper>…</heart_whisper>
 * 群聊：<heart_whisper_group> + 多段 <character>…
 * 解析仍兼容上一版「[HEART_WHISPER] + 中文字段行」markup，便于过渡。
 */

export type HeartWhisperFields = {
  location: string
  action: string
  outfit: string
  innerThoughts: string
  userImpression: string
}

export type GroupHeartWhisperEntry = {
  character_id: string
  location: string
  clothing: string
  posture: string
  monologue: string
  impression_on_user: string
}

export const WECHAT_HEART_WHISPER_MARKUP_FORMAT = `
【输出格式】只输出下列 XML（标签名须一字不差）。禁止 JSON、禁止 markdown 代码围栏、禁止前后解释或思维链标签外露。

<heart_whisper>
<location>此刻具体地点（简短）</location>
<action>此刻一个微小或具体的肢体动作（简短）</action>
<outfit>此刻穿着（简短）</outfit>
<thoughts>
第一人称内心独白；可多行。基于刚才的回复延伸未说出口的想法；直白、不加修饰；至少 2～4 句，禁止只写一句空话。
</thoughts>
<view_on_user>
第三人称；客观描述此刻对 User 的看法或感觉；可多行。至少 1～2 句。禁止 ta，须用外部给定的「他」或「她」。
</view_on_user>
</heart_whisper>

【硬性完整】五个子标签都必须有实质内容且写完对应闭合标签；「thoughts」「view_on_user」不得为空、不得省略。若篇幅紧张，优先写完后两段再结束，禁止半截截断、禁止只输出前半段。
`.trim()

export const WECHAT_GROUP_HEART_WHISPER_MARKUP_FORMAT = `
【输出格式】只输出下列 XML（标签名须一字不差）。禁止 JSON、禁止 markdown 代码围栏、禁止前后解释。

<heart_whisper_group>
<character>
<id>必须与名单中的 character_id 完全一致</id>
<location>简短地点</location>
<outfit>简短着装</outfit>
<action>简短动作或姿态</action>
<thoughts>
第一人称独白；可多行；直白陈述
</thoughts>
<view_on_user>
转述句式：npc_pronoun + 觉得/认为 + 你 + …；禁止用户真名；可多行
</view_on_user>
</character>
<character>
<id>…</id>
<location>…</location>
<outfit>…</outfit>
<action>…</action>
<thoughts>…</thoughts>
<view_on_user>…</view_on_user>
</character>
</heart_whisper_group>

【硬性要求】
- <character> 段数必须等于名单 NPC 人数；每人恰好一段，不得遗漏 id，不得多出名单外的 id。
- id 必须与名单一致（大小写一致）。
- 所有字段不得为空；信息不足时用简短合理占位，禁止写 null。
`.trim()

function stripModelFences(raw: string): string {
  return String(raw ?? '')
    .replace(/^```(?:json|markdown|text|xml)?\s*\n?/i, '')
    .replace(/\n?```\s*$/i, '')
    .trim()
}

/** 推理模型常在 </thinking> 之后才输出正文 */
function thinkingAwareSearchBases(raw: string): string[] {
  const fenced = stripModelFences(String(raw ?? '').trim())
  if (!fenced) return ['']
  const closeTag = '</thinking>'
  const idx = fenced.lastIndexOf(closeTag)
  const ordered: string[] = []
  if (idx >= 0) {
    const tail = fenced.slice(idx + closeTag.length).trim()
    if (tail) ordered.push(tail)
  }
  ordered.push(fenced)
  return [...new Set(ordered)]
}

function txt(v: unknown): string {
  return String(v ?? '').trim()
}

/** 抽取闭合 XML 标签正文；无闭合时尽量截到下一标签，兼容输出截断。 */
function parseXmlTag(src: string, tag: string, nextTags: string[] = []): string {
  const closed = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}\\s*>`, 'i')
  const m = closed.exec(src)
  if (m) return txt(m[1])
  const open = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*)$`, 'i')
  const m2 = open.exec(src)
  if (!m2) return ''
  let rest = m2[1] ?? ''
  if (nextTags.length) {
    const stopRe = new RegExp(`<\\/?(?:${nextTags.join('|')})\\b`, 'i')
    const stop = rest.search(stopRe)
    if (stop >= 0) rest = rest.slice(0, stop)
  }
  return txt(rest)
}

function parseXmlBlock(src: string, tag: string): string | null {
  const closed = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}\\s*>`, 'i')
  const m = closed.exec(src)
  if (m) return m[1] ?? ''
  const open = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*)$`, 'i')
  const m2 = open.exec(src)
  return m2 ? m2[1] ?? '' : null
}

const PRIVATE_FIELD_NEXT = ['location', 'action', 'outfit', 'thoughts', 'view_on_user', 'heart_whisper']
const GROUP_FIELD_NEXT = [
  'id',
  'character_id',
  'location',
  'outfit',
  'clothing',
  'action',
  'posture',
  'thoughts',
  'view_on_user',
  'impression',
  'character',
]

function parsePrivateXmlInner(inner: string): HeartWhisperFields | null {
  const location = parseXmlTag(inner, 'location', PRIVATE_FIELD_NEXT)
  const action = parseXmlTag(inner, 'action', PRIVATE_FIELD_NEXT) || parseXmlTag(inner, 'posture', PRIVATE_FIELD_NEXT)
  const outfit = parseXmlTag(inner, 'outfit', PRIVATE_FIELD_NEXT) || parseXmlTag(inner, 'clothing', PRIVATE_FIELD_NEXT)
  const innerThoughts =
    parseXmlTag(inner, 'thoughts', PRIVATE_FIELD_NEXT) ||
    parseXmlTag(inner, 'monologue', PRIVATE_FIELD_NEXT) ||
    parseXmlTag(inner, 'inner_thoughts', PRIVATE_FIELD_NEXT)
  const userImpression =
    parseXmlTag(inner, 'view_on_user', PRIVATE_FIELD_NEXT) ||
    parseXmlTag(inner, 'impression', PRIVATE_FIELD_NEXT) ||
    parseXmlTag(inner, 'user_impression', PRIVATE_FIELD_NEXT)
  if (!location && !action && !outfit && !innerThoughts && !userImpression) return null
  return { location, action, outfit, innerThoughts, userImpression }
}

function parseGroupCharacterXml(inner: string): GroupHeartWhisperEntry | null {
  const character_id =
    parseXmlTag(inner, 'id', GROUP_FIELD_NEXT) || parseXmlTag(inner, 'character_id', GROUP_FIELD_NEXT)
  if (!character_id) return null
  const location = parseXmlTag(inner, 'location', GROUP_FIELD_NEXT)
  const clothing =
    parseXmlTag(inner, 'outfit', GROUP_FIELD_NEXT) || parseXmlTag(inner, 'clothing', GROUP_FIELD_NEXT)
  const posture =
    parseXmlTag(inner, 'action', GROUP_FIELD_NEXT) || parseXmlTag(inner, 'posture', GROUP_FIELD_NEXT)
  const monologue =
    parseXmlTag(inner, 'thoughts', GROUP_FIELD_NEXT) ||
    parseXmlTag(inner, 'monologue', GROUP_FIELD_NEXT) ||
    parseXmlTag(inner, 'inner_thoughts', GROUP_FIELD_NEXT)
  const impression_on_user =
    parseXmlTag(inner, 'view_on_user', GROUP_FIELD_NEXT) ||
    parseXmlTag(inner, 'impression', GROUP_FIELD_NEXT) ||
    parseXmlTag(inner, 'impression_on_user', GROUP_FIELD_NEXT)
  return { character_id, location, clothing, posture, monologue, impression_on_user }
}

function parsePrivateFromXml(raw: string): HeartWhisperFields | null {
  for (const base of thinkingAwareSearchBases(raw)) {
    if (!/<heart_whisper\b/i.test(base)) continue
    const inner = parseXmlBlock(base, 'heart_whisper')
    if (inner == null) continue
    const parsed = parsePrivateXmlInner(inner)
    if (parsed) return parsed
  }
  return null
}

function parseGroupFromXml(raw: string): GroupHeartWhisperEntry[] | null {
  for (const base of thinkingAwareSearchBases(raw)) {
    if (!/<heart_whisper_group\b/i.test(base) && !/<character\b/i.test(base)) continue
    const body = parseXmlBlock(base, 'heart_whisper_group') ?? base
    const out: GroupHeartWhisperEntry[] = []
    const charRe = /<character\b[^>]*>([\s\S]*?)<\/character\s*>/gi
    let m: RegExpExecArray | null
    let lastEnd = 0
    while ((m = charRe.exec(body))) {
      const entry = parseGroupCharacterXml(m[1] ?? '')
      if (entry) out.push(entry)
      lastEnd = m.index + m[0].length
    }
    // 截断：最后一个未闭合 <character>
    const openTail = body.slice(lastEnd).match(/<character\b[^>]*>([\s\S]*)$/i)
    if (openTail?.[1]) {
      const entry = parseGroupCharacterXml(openTail[1])
      if (entry && !out.some((x) => x.character_id === entry.character_id)) out.push(entry)
    }
    if (out.length) return out
  }
  return null
}

/* ── 兼容旧版「[HEART_WHISPER] + 中文字段行」── */

const LEGACY_PRIVATE_BLOCK_RE =
  /\[HEART_WHISPER\](?![_\w])\s*([\s\S]*?)(?=\n\s*\[HEART_WHISPER_GROUP\]|$)/i
const LEGACY_GROUP_BLOCK_RE = /\[HEART_WHISPER_GROUP\]\s*([\s\S]*)$/i
const LEGACY_ROLE_SPLIT_RE = /(?:^|\n)\s*\[角色\]\s*/i

function fieldLine(block: string, keys: string[]): string {
  const lines = block.split(/\r?\n/)
  for (const key of keys) {
    const re = new RegExp(`^\\s*${key}\\s*[:：]\\s*(.*)$`, 'i')
    for (const line of lines) {
      const m = re.exec(line.trim())
      if (!m) continue
      return (m[1] ?? '').trim()
    }
  }
  return ''
}

function multilineAfter(block: string, keys: string[]): string {
  const lines = block.split(/\r?\n/)
  const keyRe = new RegExp(`^\\s*(?:${keys.join('|')})\\s*[:：]\\s*(.*)$`, 'i')
  const stopRe =
    /^\s*(?:地点|动作|着装|姿态|内心|对用户看法|对你看法|id|character_id|location|action|outfit|clothing|posture|inner_thoughts|view_on_user|impression_on_user|monologue)\s*[:：]/i
  for (let i = 0; i < lines.length; i++) {
    const m = keyRe.exec(lines[i]!.trim())
    if (!m) continue
    const parts: string[] = []
    const first = (m[1] ?? '').trim()
    if (first) parts.push(first)
    for (let j = i + 1; j < lines.length; j++) {
      const rawLine = lines[j]!
      const t = rawLine.trim()
      if (!t) {
        parts.push('')
        continue
      }
      if (stopRe.test(t) && !keyRe.test(t)) break
      if (/^\[角色\]/i.test(t) || /^\[HEART_WHISPER/i.test(t)) break
      parts.push(rawLine)
    }
    return parts.join('\n').replace(/\n+$/g, '').trim()
  }
  return ''
}

function parsePrivateMarkupBlock(block: string): HeartWhisperFields | null {
  const location = fieldLine(block, ['地点', 'location'])
  const action = fieldLine(block, ['动作', 'action', '姿态', 'posture'])
  const outfit = fieldLine(block, ['着装', 'outfit', 'clothing', '服装'])
  const innerThoughts =
    multilineAfter(block, ['内心', '内心独白', 'inner_thoughts', 'innerThoughts', 'monologue']) ||
    fieldLine(block, ['内心', '内心独白', 'inner_thoughts', 'innerThoughts'])
  const userImpression =
    multilineAfter(block, [
      '对用户看法',
      '对你看法',
      'view_on_user',
      'userImpression',
      'impression_on_user',
    ]) ||
    fieldLine(block, ['对用户看法', '对你看法', 'view_on_user', 'userImpression'])

  if (!location && !action && !outfit && !innerThoughts && !userImpression) return null
  return { location, action, outfit, innerThoughts, userImpression }
}

function parseGroupRoleBlock(block: string): GroupHeartWhisperEntry | null {
  const character_id = fieldLine(block, ['id', 'character_id', 'charId', 'characterId'])
  if (!character_id) return null
  const location = fieldLine(block, ['地点', 'location'])
  const clothing = fieldLine(block, ['着装', 'clothing', 'outfit', '服装'])
  const posture = fieldLine(block, ['姿态', '动作', 'posture', 'action'])
  const monologue =
    multilineAfter(block, ['内心', '内心独白', 'monologue', 'inner_thoughts']) ||
    fieldLine(block, ['内心', '内心独白', 'monologue', 'inner_thoughts'])
  const impression_on_user =
    multilineAfter(block, ['对你看法', '对用户看法', 'impression_on_user', 'view_on_user']) ||
    fieldLine(block, ['对你看法', '对用户看法', 'impression_on_user', 'view_on_user'])
  return { character_id, location, clothing, posture, monologue, impression_on_user }
}

function parsePrivateFromLegacyMarkup(raw: string): HeartWhisperFields | null {
  for (const base of thinkingAwareSearchBases(raw)) {
    if (!/\[HEART_WHISPER\]/i.test(base) && !/地点\s*[:：]/.test(base)) continue
    const m = LEGACY_PRIVATE_BLOCK_RE.exec(base)
    const block = (m?.[1] ?? base).trim()
    const parsed = parsePrivateMarkupBlock(block)
    if (parsed) return parsed
  }
  return null
}

function parseGroupFromLegacyMarkup(raw: string): GroupHeartWhisperEntry[] | null {
  for (const base of thinkingAwareSearchBases(raw)) {
    if (!/\[HEART_WHISPER_GROUP\]/i.test(base) && !/\[角色\]/i.test(base)) continue
    const m = LEGACY_GROUP_BLOCK_RE.exec(base)
    const body = (m?.[1] ?? base).trim()
    const chunks = body.split(LEGACY_ROLE_SPLIT_RE).map((s) => s.trim()).filter(Boolean)
    const out: GroupHeartWhisperEntry[] = []
    for (const chunk of chunks) {
      const cleaned = chunk.replace(/^\[HEART_WHISPER_GROUP\]\s*/i, '').trim()
      const entry = parseGroupRoleBlock(cleaned)
      if (entry) out.push(entry)
    }
    if (out.length) return out
  }
  return null
}

export function parseHeartWhisperOutput(raw: string): HeartWhisperFields {
  const xml = parsePrivateFromXml(raw)
  if (xml) return xml
  const legacy = parsePrivateFromLegacyMarkup(raw)
  if (legacy) return legacy
  throw new Error('心语解析失败：模型未返回约定的 <heart_whisper> XML（可能混入思维链、截断或仍输出 JSON）。请重试或更换模型。')
}

export function parseGroupHeartWhisperOutput(raw: string): GroupHeartWhisperEntry[] {
  const xml = parseGroupFromXml(raw)
  if (xml?.length) return xml
  const legacy = parseGroupFromLegacyMarkup(raw)
  if (legacy?.length) return legacy
  throw new Error(
    '群聊心语解析失败：模型未返回约定的 <heart_whisper_group> XML（可能混入思维链、截断或仍输出 JSON）。请重试或更换模型。',
  )
}
