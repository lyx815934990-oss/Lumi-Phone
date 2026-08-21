import {
  WECHAT_CHARACTER_SELF_NARRATIVE_CONSISTENCY,
  WECHAT_CROSS_ACCOUNT_OBJECTIVE_FACTS_RULES,
  WECHAT_NON_PRIMARY_SPEAKER_IRON_RULES,
  WECHAT_STRANGER_CONTACT_CAUSALITY_RULES,
  WECHAT_THIRD_PARTY_PSYCHOLOGY_RULES,
} from './wechatAltAccountPrompt'
import { WECHAT_MEMORY_LINE_SCOPE_RULES } from './wechatMemoryLineScopeRules'
import {
  STORY_TIMELINE_HISTORICAL_ROW_TEMPORAL_RULES,
  STORY_TIMELINE_VECTOR_RECALL_CANON_RULES,
  VECTOR_RECALL_PAST_EVENT_HARD_RULE,
} from './memory/storyTimelineTypes'

const POLICY_LITERAL_BLOCKS = [
  WECHAT_MEMORY_LINE_SCOPE_RULES,
  WECHAT_CROSS_ACCOUNT_OBJECTIVE_FACTS_RULES,
  WECHAT_NON_PRIMARY_SPEAKER_IRON_RULES,
  WECHAT_THIRD_PARTY_PSYCHOLOGY_RULES,
  WECHAT_STRANGER_CONTACT_CAUSALITY_RULES,
  WECHAT_CHARACTER_SELF_NARRATIVE_CONSISTENCY,
  VECTOR_RECALL_PAST_EVENT_HARD_RULE,
  STORY_TIMELINE_VECTOR_RECALL_CANON_RULES,
  STORY_TIMELINE_HISTORICAL_ROW_TEMPORAL_RULES,
]

function removeLiteralBlock(text: string, block: string): string {
  const b = block.trim()
  if (!b || !text.includes(b)) return text
  return text.split(b).join('\n')
}

/**
 * 思维溯源 UI：去掉仅注入模型用的分线铁则/跨号说明，保留未总结聊天摘录等实质内容。
 * 不影响 ChatRoom 拼进 prompt 的原文。
 */
export function stripPromptPolicyBlocksForTraceDisplay(text: string): string {
  let s = String(text ?? '').trim()
  if (!s) return ''

  s = s.replace(/\n*（↑[^）\n]*）[\s\S]*$/m, '').trim()

  const anchorIdx = s.indexOf('【私聊记忆注入 · 分线锚点')
  if (anchorIdx >= 0) {
    const nextSection = s.slice(anchorIdx).search(/\n【(?!私聊记忆注入)/)
    if (nextSection >= 0) {
      s = (s.slice(0, anchorIdx) + s.slice(anchorIdx + nextSection)).trim()
    } else {
      s = s.slice(0, anchorIdx).trim()
    }
  }

  const crossIntro = '【其它微信号 · 未总结私聊摘录 · 分线参考】'
  const crossIntroIdx = s.indexOf(crossIntro)
  if (crossIntroIdx >= 0) {
    const excerptStart = s.indexOf('【其它微信线 ·', crossIntroIdx)
    if (excerptStart >= 0) {
      s = s.slice(excerptStart).trim()
    }
  }

  for (const block of POLICY_LITERAL_BLOCKS) {
    s = removeLiteralBlock(s, block)
  }

  s = s
    .replace(/\*\*再次确认\*\*：[^\n]+\n?/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  return s
}

/** 尚未总结·私聊/群聊摘录行前的系统落库时刻；仅用于思维溯源等 UI，不影响 prompt 注入 */
const UNS_ONLINE_LINE_TS_RE =
  /(^|\n)(- )\[(?:\d{4}年\d{1,2}月\d{1,2}日 星期[一二三四五六日] \d{2}:\d{2}|（时刻未知）)\] (?=\[(?:私聊|群))/gm

export function stripUnsummarizedOnlineTimestampsForDisplay(text: string): string {
  const s = String(text ?? '')
  if (!s.trim()) return ''
  return s.replace(UNS_ONLINE_LINE_TS_RE, '$1$2')
}

/**
 * 思维溯源正文清洗：只保留「参考内容」本身，去掉给模型看的规则/时效说明/板块括号旁白。
 * 不影响实际注入 prompt 的原文。
 */
export function sanitizeMemoryTraceDisplayText(text: string): string {
  let s = stripPromptPolicyBlocksForTraceDisplay(text)
  if (!s) return ''

  for (const block of POLICY_LITERAL_BLOCKS) {
    s = removeLiteralBlock(s, block)
  }

  // 整段规则 / 铁律标题（含同行长说明）
  s = s
    .replace(/^【向量召回·已发生硬规则】[^\n]*\n?/gm, '')
    .replace(/^【历史回忆·事实铁律】[^\n]*\n?/gm, '')
    .replace(/^【历史摘要·时效铁律】[^\n]*\n?/gm, '')
    .replace(/^【剧情时间轴·时效铁律】[^\n]*\n?/gm, '')
    .replace(/^【跨通道·故事内时刻对齐[^\n]*】\n?(?:- .+\n?)*/gm, '')
    .replace(/^【线上跳时·线下开场铁律[^\n]*】\n?(?:- .+\n?)*/gm, '')
    .replace(/^【线上→线下·承接铁律[^\n]*】\n?(?:- .+\n?)*/gm, '')
    .replace(/^【线下→线上·[^\n]*】\n?(?:- .+\n?)*/gm, '')
    .replace(/^【线上末条锚点[^\n]*】\n?/gm, '')
    .replace(/^【最新线下末尾锚点[^\n]*】\n?/gm, '')
    .replace(/^【线下末条·仅作往事参考[^\n]*】\n?/gm, '')
    .replace(/^【剧情时间锚点[^\n]*】[^\n]*\n?/gm, '')
    .replace(/^【板块·剧情时间轴·当前状态】\s*\n?/gm, '')
    .replace(/^【板块·近端·线下摘要】\s*\n?/gm, '')
    .replace(/^【板块·向量召回·历史剧情摘要】\s*\n?/gm, '')
    .replace(/^【当前状态·合并快照】\s*\n?/gm, '')
    .replace(/^【近端剧情摘要[^\n]*】\s*\n?/gm, '')
    .replace(/^【语义召回·历史剧情摘要[^\n]*】\s*\n?/gm, '')

  // 【时效·已发生】整行横幅（含禁止写成…）
  s = s.replace(/^【时效·已发生】[^\n]*\n?/gm, '')
  s = s.replace(/【时效·已发生】[^。\n]*。?/g, '')

  // 板块标题后的括号说明：（相关性最高…禁止…）等
  s = s.replace(/【([^】]+)】（[^）\n]{0,200}）/g, '【$1】')

  // 文末 / 独立大段圆括号旁白
  s = s.replace(/\n*（剧情时间轴[^）]*）\s*/gs, '\n')
  s = s.replace(/\n*（↑[^）]*）\s*/gs, '\n')
  s = s.replace(/\n*（以上含[^）]*）\s*/gs, '\n')
  s = s.replace(/\n*（向量召回条目均为已发生历史[^）]*）\s*/gs, '\n')
  s = s.replace(/\n*（近期「[^」]+」的线下剧情中，未找到[^）]*）\s*/gs, '\n')

  // 常见注入旁白句（整行；避免误删聊天原文）
  const noiseLineRes = [
    /^【[^】\n]*由自动总结[^】\n]*】[^\n]*$/gm,
    /^【[^】\n]*时效[·・]?已发生[^】\n]*】[^\n]*$/gm,
    /^【时效·已发生】[^\n]*$/gm,
    /^(?:[-*•]\s*)?禁止写成[^\n]*$/gm,
    /^(?:[-*•]\s*)?禁止复述[^\n]*$/gm,
    /^(?:[-*•]\s*)?禁止重演[^\n]*$/gm,
    /^【[^】\n]*与聊天室一致[^】\n]*】[^\n]*$/gm,
    /^(?:[-*•]\s*)?与聊天室一致[^\n]*$/gm,
    /^(?:[-*•]\s*)?自上一轮[^\n]*$/gm,
    /^(?:[-*•]\s*)?须与末尾情绪方向一致[^\n]*$/gm,
    /^(?:[-*•]\s*)?不得覆盖上方[^\n]*$/gm,
    /^(?:[-*•]\s*)?优先级最低[^\n]*$/gm,
    /^(?:[-*•]\s*)?仅可回溯[^\n]*$/gm,
    /^(?:[-*•]\s*)?仅可.*一笔带过[^\n]*$/gm,
    /^(?:[-*•]\s*)?不依赖[「"]?尚未总结[」"]?[^\n]*$/gm,
    /^(?:[-*•]\s*)?更早段由[^\n]*$/gm,
    /^(?:[-*•]\s*)?分线阅读规则仅注入模型[^\n]*$/gm,
    /^(?:[-*•]\s*)?与 system prompt 注入顺序对齐[^\n]*$/gm,
    /^(?:[-*•]\s*)?承接剧情时优先对照本块[^\n]*$/gm,
    /^(?:[-*•]\s*)?锚点公历日早于当前剧情日[^\n]*$/gm,
    /^(?:[-*•]\s*)?带「历史」标记[^\n]*$/gm,
    /^(?:[-*•]\s*)?正文内【时效[^\n]*$/gm,
    /^(?:[-*•]\s*)?指约会页剧情条数[^\n]*$/gm,
    /^(?:[-*•]\s*)?不是[^\n]*线上私聊条数[^\n]*$/gm,
    /^每条前缀优先为\*\*故事内公历时刻\*\*[^\n]*$/gm,
    /^须全文承接近端事实[^\n]*$/gm,
    /^故事「现在」已到[^\n]*$/gm,
    /^- 故事内「现在」[^\n]*$/gm,
    /^- 「未总结·私聊」[^\n]*$/gm,
    /^- \*\*地点[^\n]*$/gm,
    /^- \*\*空间[^\n]*$/gm,
    /^- \*\*时序[^\n]*$/gm,
    /^- 微信是\*\*远程消息\*\*[^\n]*$/gm,
    /^- 【尾声延展】[^\n]*$/gm,
  ]
  for (const re of noiseLineRes) {
    s = s.replace(re, '')
  }

  // 行内残留说明短语（保留前后实质内容）
  s = s
    .replace(/（相关性最高至多[^）]*）/g, '')
    .replace(/（已发生往事[^）]*）/g, '')
    .replace(/（已发生历史[^）]*）/g, '')
    .replace(/（必注全文）/g, '')
    .replace(/（关联主角；必注全文）/g, '')
    .replace(/（不含[^）]*近\s*2\s*轮[^）]*）/g, '')
    .replace(/（最近\s*\d+\s*轮模型摘要[^）]*）/g, '')
    .replace(/由自动总结[；;，,、]?/g, '')
    .replace(/由旧到新；?/g, '')
    .replace(/\*\*[^*]{1,40}\*\*/g, (m) => m.replace(/\*\*/g, ''))

  // 召回分隔头 → 简洁标题
  s = s.replace(
    /---\s*(?:摘要|召回)\s*\d+\s*·\s*(.+?)\s*·\s*(?:相似\s*[\d.]+%|近端固定|向量命中)\s*---/g,
    '· $1',
  )

  s = s
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  return s
}

/** 注入条目末尾的占位符/人称说明（仅模型用；思维溯源不展示） */
const WORLD_BOOK_TRACE_META_NOTES = [
  '（占位符「{{char}}」=当前会话绑定人设的真实姓名，「{{user}}」=该人设绑定的玩家身份姓名；注入前替换，避免与角色设定混淆。）',
  '（玩家身份条目：正文均指玩家本人，与聊天中的虚构人设设定无关。）',
]

const WORLD_BOOK_TRACE_META_NOTE_RE =
  /\s*（(?:占位符「\{\{char\}\}」[^）]*|玩家身份条目：[^）]*)）\s*$/g

export type PersonaWorldBookTraceEntry = {
  priority: '序言' | '尾声' | string
  name: string
  content: string
}

export type PersonaWorldBookTraceBook = {
  title: string
  entries: PersonaWorldBookTraceEntry[]
}

function stripWorldBookTraceMetaNotes(text: string): string {
  let s = String(text ?? '')
  for (const note of WORLD_BOOK_TRACE_META_NOTES) {
    if (note && s.includes(note)) s = s.split(note).join('')
  }
  s = s.replace(WORLD_BOOK_TRACE_META_NOTE_RE, '')
  return s.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
}

function isHiddenPersonaWorldBookTraceEntry(name: string, content: string): boolean {
  const n = name.trim()
  if (n === '使用说明（参考偏向）' || n.includes('参考偏向')) return true
  const c = content.trim()
  if (c.includes('【参考偏向】') && c.includes('【严禁出戏】')) return true
  return false
}

/**
 * 思维溯源「人设世界书」：去掉占位符说明 / 参考偏向·严禁出戏套话，并拆成卷→条目。
 * 不影响实际注入 prompt 的原文。
 */
export function parsePersonaWorldBookForTraceDisplay(raw: string): PersonaWorldBookTraceBook[] {
  const cleaned = stripWorldBookTraceMetaNotes(sanitizeMemoryTraceDisplayText(String(raw ?? '')))
  if (!cleaned) return []

  const books: PersonaWorldBookTraceBook[] = []
  const state: { current: PersonaWorldBookTraceBook | null } = { current: null }

  const pushBook = () => {
    const cur = state.current
    if (!cur) return
    if (cur.entries.length > 0 || cur.title) books.push(cur)
    state.current = null
  }

  const ensureBook = (title: string) => {
    const cur = state.current
    if (cur && cur.title === title) return
    pushBook()
    state.current = { title: title.trim() || '世界书', entries: [] }
  }

  const entryLineRe = /^- \[(序言介入|尾声延展)\]\s*([^：:\n]+)[：:]\s*([\s\S]*)$/

  for (const line of cleaned.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue

    const bookMatch = trimmed.match(/^《([^》]+)》$/)
    if (bookMatch) {
      ensureBook(bookMatch[1] ?? '世界书')
      continue
    }

    const entryMatch = trimmed.match(entryLineRe)
    if (entryMatch) {
      const priorityRaw = entryMatch[1] ?? ''
      const name = String(entryMatch[2] ?? '').trim()
      let content = stripWorldBookTraceMetaNotes(String(entryMatch[3] ?? '').trim())
      content = content
        .replace(/^【参考偏向】[\s\S]*?(?=【严禁出戏】|$)/, '')
        .replace(/^【严禁出戏】[\s\S]*$/, '')
        .trim()
      if (isHiddenPersonaWorldBookTraceEntry(name, String(entryMatch[3] ?? ''))) continue
      if (!state.current) ensureBook('人设世界书')
      state.current?.entries.push({
        priority: priorityRaw === '尾声延展' ? '尾声' : '序言',
        name: name || '未命名条目',
        content,
      })
      continue
    }

    // `INFP人格设定` 等无书名号的卷标题（MBTI 注入文本）
    if (
      !trimmed.startsWith('-') &&
      trimmed.length <= 40 &&
      /(人格设定|世界书)$/.test(trimmed) &&
      !trimmed.includes('：') &&
      !trimmed.includes(':')
    ) {
      ensureBook(trimmed)
      continue
    }

    // 续行正文：并入上一条
    const curBook = state.current
    if (curBook && curBook.entries.length) {
      const last = curBook.entries[curBook.entries.length - 1]!
      last.content = `${last.content}\n${stripWorldBookTraceMetaNotes(trimmed)}`.trim()
    } else {
      ensureBook('人设世界书')
      state.current?.entries.push({ priority: '序言', name: '正文', content: trimmed })
    }
  }

  pushBook()
  return books.filter((b) => b.entries.length > 0)
}

/** 人设世界书溯源纯文本（无条目结构时的回退） */
export function sanitizePersonaWorldBookForTraceDisplay(raw: string): string {
  const books = parsePersonaWorldBookForTraceDisplay(raw)
  if (!books.length) {
    return stripWorldBookTraceMetaNotes(sanitizeMemoryTraceDisplayText(String(raw ?? '')))
      .replace(/^- \[序言介入\]\s*使用说明（参考偏向）[：:][^\n]*\n?/gm, '')
      .replace(/【参考偏向】[^\n]*/g, '')
      .replace(/【严禁出戏】[^\n]*/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  }
  return books
    .map((b) => {
      const lines = b.entries.map((e) => `- [${e.priority}] ${e.name}：${e.content}`).join('\n')
      return `《${b.title}》\n${lines}`
    })
    .join('\n\n')
}
