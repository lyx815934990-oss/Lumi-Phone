import type { WorldBook, WorldBookItem, WorldBookPriority } from './types'
import { rewriteMeetWorldbookNamesToPlaceholders } from '../../lumiMeet/meetWorldbookPlaceholders'
import { sanitizeEpilogueExtensionNewContent } from './epilogueExtensionToneRules'

/** 微信 AI 人设：单本世界书 */
export const PERSONA_AI_COMPACT_BOOK_TITLE = '角色人设档案'
export const PERSONA_AI_COMPACT_BOOK_KEY = 'main'

/**
 * 单本世界书固定 11 条（顺序即 item01–…），另恒含「过往感情史」序言（插在「亲密与恋爱观」后）。
 * 前 9 条默认序言介入；「对你的看法和态度」「对你的称呼」为尾声延展（可随剧情更新）。
 * 取向「可变」时另增「取向认同的当前快照」为尾声延展（插在「性格内核」后）。
 * 职业「可变」时另增「职业身份的当前快照」为尾声延展（插在「名片基础」后）。
 */
export const PERSONA_AI_COMPACT_ENTRY_NAMES = [
  '名片基础',
  '形象与气质',
  '性格内核',
  '能力与日常',
  '口语习惯',
  '亲密与恋爱观',
  '人际与秘密',
  '周边NPC',
  '相遇羁绊',
  '对你的看法和态度',
  '对你的称呼',
] as const

export type PersonaAiCompactEntryName = (typeof PERSONA_AI_COMPACT_ENTRY_NAMES)[number]

/** 尾声延展：对用户当下看法与态度（不含口语示例） */
export const PERSONA_AI_TOWARD_USER_ENTRY_NAME: PersonaAiCompactEntryName = '对你的看法和态度'

/** 尾声延展：只写对 {{user}} 怎么称呼（不含说话场景示例） */
export const PERSONA_AI_USER_SPEECH_ENTRY_NAME: PersonaAiCompactEntryName = '对你的称呼'

/** 序言：角色说话风格 + 中文场景引语（与「对你的称呼」完全分开） */
export const PERSONA_AI_SPEECH_HABIT_ENTRY_NAME: PersonaAiCompactEntryName = '口语习惯'

/** {{char}} 与 {{user}} 如何相识、及形成当下看法的成因（序言） */
export const PERSONA_AI_MEETING_BOND_ENTRY_NAME: PersonaAiCompactEntryName = '相遇羁绊'

/** 围绕角色的具名 NPC 简要档案 */
export const PERSONA_AI_NPC_ROSTER_ENTRY_NAME: PersonaAiCompactEntryName = '周边NPC'

/** 过往感情史（序言）：曾有好感/喜欢/交往过的对象，或母胎单身等；非与 {{user}} 当前关系 */
export const PERSONA_AI_RELATIONSHIP_HISTORY_ENTRY_NAME = '过往感情史'

export type PersonaAiEpilogueEntry = { name: string; content: string }

/**
 * @deprecated 旧版 vol10 五条；新生成合并为「对你的看法和态度」等尾声。
 * 仍导出供旧档识别 / 尾声同步兼容。
 */
export const PERSONA_AI_EPILOGUE_ENTRY_NAMES = [
  '对 {{user}} 的当前态度',
  '对 {{user}} 的称呼与聊天分寸',
  '与 {{user}} 的相处边界',
  '对 {{user}} 内心的真实分量',
  '如何赢得 {{char}} 的好感',
] as const

/** 攻略向：现与「对你的看法和态度」同条 */
export const PERSONA_AI_AFFECTION_GUIDE_EPILOGUE_NAME = PERSONA_AI_TOWARD_USER_ENTRY_NAME

/**
 * 取向「可变」时单独抽出的尾声延展条目（不把整条「性格内核」改成尾声）。
 * 正文仍写当下稳定认同；「可变」仅指本条 priority=after、可随剧情更新快照。
 */
export const PERSONA_AI_ORIENTATION_MUTABLE_EPILOGUE_NAME = '取向认同的当前快照'

/**
 * 职业「可变」时单独抽出的尾声延展条目（不把整条「名片基础」改成尾声）。
 * 正文仍写当下稳定职业/社会身份；「可变」仅指本条 priority=after、可随剧情更新快照。
 */
export const PERSONA_AI_OCCUPATION_MUTABLE_EPILOGUE_NAME = '职业身份的当前快照'

/** 取向正文所在条目名：固定→性格内核；可变→独立尾声快照 */
export function personaAiOrientationHostEntryName(orientationMutable?: boolean): string {
  return orientationMutable
    ? PERSONA_AI_ORIENTATION_MUTABLE_EPILOGUE_NAME
    : '性格内核'
}

/** 职业正文所在条目名：固定→名片基础；可变→独立尾声快照 */
export function personaAiOccupationHostEntryName(occupationMutable?: boolean): string {
  return occupationMutable
    ? PERSONA_AI_OCCUPATION_MUTABLE_EPILOGUE_NAME
    : '名片基础'
}

/** @deprecated 请用 personaAiOrientationHostEntryName；默认指向可变时的独立尾声名 */
export const PERSONA_AI_ORIENTATION_WORLD_BOOK_ITEM_NAME = PERSONA_AI_ORIENTATION_MUTABLE_EPILOGUE_NAME

/** @deprecated */
export const PERSONA_AI_INTIMATE_SPEECH_ITEM_NAME = '亲密口语习惯'

/**
 * NSFW 开启时单独写入的成人向条目（不并入「亲密与恋爱观」）。
 * 写敏感点、亲密偏好、接吻/抚摸/前戏/性爱时的动作场景与口语；可荤。
 */
export const PERSONA_AI_NSFW_ENTRY_NAME = '亲密身体与性爱偏好'

/** @deprecated 旧标题；识别时归并到 PERSONA_AI_NSFW_ENTRY_NAME */
export const PERSONA_AI_NSFW_WORLD_BOOK_ITEM_NAME = PERSONA_AI_NSFW_ENTRY_NAME

export function isPersonaAiOrientationEpilogueName(raw: string): boolean {
  const name = String(raw ?? '').trim()
  if (!name) return false
  if (name === PERSONA_AI_ORIENTATION_MUTABLE_EPILOGUE_NAME) return true
  return /取向认同|取向.*当前快照|性取向由来|取向与自我认同/.test(name)
}

export function isPersonaAiOccupationEpilogueName(raw: string): boolean {
  const name = String(raw ?? '').trim()
  if (!name) return false
  if (name === PERSONA_AI_OCCUPATION_MUTABLE_EPILOGUE_NAME) return true
  return /职业身份.*当前快照|职业.*当前快照|社会身份.*当前快照|当前职业/.test(name)
}

export function isPersonaAiRelationshipHistoryEntryName(raw: string): boolean {
  const name = String(raw ?? '').trim()
  if (!name) return false
  if (name === PERSONA_AI_RELATIONSHIP_HISTORY_ENTRY_NAME) return true
  return /过往感情|感情史|恋爱史|情史/.test(name) && !/亲密与恋爱观/.test(name)
}

export function isPersonaAiNsfwEntryName(raw: string): boolean {
  const name = String(raw ?? '').trim()
  if (!name) return false
  if (name === PERSONA_AI_NSFW_ENTRY_NAME) return true
  if (name === '亲密尺度与偏好（成人向）') return true
  return /亲密身体|性爱偏好|亲密尺度|成人向|NSFW|敏感点/.test(name) && !/亲密与恋爱观/.test(name)
}

/** 尾声模板：恒有看法态度 + 用语风格；取向/职业可变时另含对应快照 */
export function getPersonaAiEpilogueEntryTemplates(
  orientationMutable?: boolean,
  occupationMutable?: boolean,
): readonly string[] {
  const list: string[] = []
  if (occupationMutable) list.push(PERSONA_AI_OCCUPATION_MUTABLE_EPILOGUE_NAME)
  if (orientationMutable) list.push(PERSONA_AI_ORIENTATION_MUTABLE_EPILOGUE_NAME)
  list.push(PERSONA_AI_TOWARD_USER_ENTRY_NAME)
  list.push(PERSONA_AI_USER_SPEECH_ENTRY_NAME)
  return list
}

export function isPersonaAiPlatonicRelation(relationToUser: string): boolean {
  const rel = relationToUser.trim()
  if (!rel) return false
  return /同学|校友|同班|同事|同僚|朋友|好友|常聊|上司|下属|家人|亲戚|合租/.test(rel)
}

export function isPersonaAiRomanticRelation(relationToUser: string): boolean {
  const rel = relationToUser.trim()
  return /暧昧|恋人|交往|情侣|暗恋|稳定交往|前任/.test(rel)
}

function esc(s: string): string {
  return String(s ?? '').trim() || '（档案待补全）'
}

function mkItem(
  characterId: string,
  index: number,
  name: string,
  rawContent: string,
  nickname: string,
  realName: string,
  now: number,
  opts?: { priority?: WorldBookPriority; enabled?: boolean; userDisplayName?: string },
): WorldBookItem {
  const ids = {
    nickname,
    realName,
    userDisplayName: opts?.userDisplayName,
  }
  const body = rewriteMeetWorldbookNamesToPlaceholders(String(rawContent ?? ''), ids)
  const itemName = rewriteMeetWorldbookNamesToPlaceholders(String(name ?? ''), ids)
  const content = esc(body)
  const priority = opts?.priority ?? 'before'
  return {
    id: `persona-wb-${characterId}-${PERSONA_AI_COMPACT_BOOK_KEY}-item${String(index).padStart(2, '0')}`,
    name: itemName,
    enabled: opts?.enabled ?? true,
    priority,
    keywords: `AI人设 {{char}}`,
    content,
    updatedAt: now,
    collapsed: false,
    ...(priority === 'after' && content.trim() ? { contentInitial: content } : {}),
  }
}

function buildTowardUserDefault(relationToUser: string): string {
  const rel = relationToUser.trim() || '普通熟人'
  const crushLike = /暗恋|单相思|单方面/.test(rel)
  const crushRule = crushLike
    ? `关系原文含暗恋/单相思时：须写清**心里喜欢** + **可见破绽**（在意、暗戳戳吃醋、别扭多留意等）；口头可否说破跟人设走，但禁止写成「完全不在意的路人腔」。禁止越级写成已确认恋人的官宣口吻。`
    : `禁止默认往好感、暗恋、嘴硬心软或「其实有点在意」抬。`
  return `<toward_user>
当前看法与关系定位：须严格按开局关系「${rel}」的投入程度来写：原文偏淡就写不咋在意/低投入，原文已是暧昧或恋爱再写对应亲近。${crushRule}也禁止写成与原文矛盾的陌生人话术。
相处边界与可接受的亲近程度。
内心真实分量；相识过程见「相遇羁绊」，对 {{user}} 怎么叫见「${PERSONA_AI_USER_SPEECH_ENTRY_NAME}」，说话场景引语见「${PERSONA_AI_SPEECH_HABIT_ENTRY_NAME}」，本条勿堆口语引语。
</toward_user>`
}

function buildUserSpeechDefault(_relationToUser: string): string {
  return `<user_speech>
{{char}}对{{user}}怎么称呼（可随关系变化写清常用叫法；可附一两句何时换称呼）。
本条**只写称呼**，禁止写日常/生气等说话场景引语——那些只写在「${PERSONA_AI_SPEECH_HABIT_ENTRY_NAME}」。
</user_speech>`
}

function buildSpeechHabitDefault(_relationToUser: string): string {
  return `<speech_habit>
语气与口头禅概要。
日常：「……」「……」
生气：「……」
委屈：「……」
难过：「……」
撒娇：「……」
害羞：「……」
开心：「……」
亲密时：「……」
（本条写说话风格与中文场景引语；对{{user}}怎么叫见「${PERSONA_AI_USER_SPEECH_ENTRY_NAME}」，勿在本条写称呼分析；引语须平等活人感，禁止「听话」「别闹了」等爹味/油腻句）
</speech_habit>`
}

function buildMeetingBondDefault(_relationToUser: string): string {
  return `<meeting>
如何相识：写清{{char}}与{{user}}相识的场合与契机。
早期互动与过程节点。本条是**序言固定层**：只写相识过程与经历，**禁止**写当前关系标签、当前态度、称呼分寸、心里分量或「如今是…/开局关系为…」类总结——那些只属于尾声「${PERSONA_AI_TOWARD_USER_ENTRY_NAME}」与「${PERSONA_AI_USER_SPEECH_ENTRY_NAME}」，禁止与尾声冲突或抢写。
</meeting>`
}

const SECTION_DEFAULTS: Record<PersonaAiCompactEntryName, (rel: string) => string> = {
  名片基础: () =>
    `<profile_card>
身份一句话摘要
大致年龄层
职业身份（固定时详写；可变时写「详见职业快照」）
对外标签
雷点摘要
</profile_card>`,
  形象与气质: () =>
    `<appearance>
发色发型
身形体态
日常/通勤/正式或约会穿搭
气质气场与第一印象
</appearance>`,
  性格内核: () =>
    `<personality>
对外面具与私下底色
三观与优缺点
身世成因与情绪模式
反差萌点
性取向稳定认同（可变时写「详见取向快照」）
</personality>`,
  能力与日常: () =>
    `<lifestyle>
技能爱好
社交态度
生活癖好与小习惯
（口语口头禅见「${PERSONA_AI_SPEECH_HABIT_ENTRY_NAME}」）
</lifestyle>`,
  口语习惯: (rel) => buildSpeechHabitDefault(rel),
  亲密与恋爱观: () =>
    `<romance>
一般亲密观与边界（指恋人写「对方」）
恋爱前样子
恋爱后样子
吃醋样子
与恋人冲突时的样子
</romance>`,
  人际与秘密: () =>
    `<social_secret>
对不同关系（家人/友人/同事/对立面）的态度差异
自身秘密、软肋与反差萌（禁止与{{user}}相关）
</social_secret>`,
  周边NPC: () =>
    `<npc_roster>
姓名：与{{char}}关系；性格与近况；（必要时）对{{user}}
</npc_roster>`,
  相遇羁绊: (rel) => buildMeetingBondDefault(rel),
  对你的看法和态度: (rel) => buildTowardUserDefault(rel),
  对你的称呼: (rel) => buildUserSpeechDefault(rel),
}

/** 将模型/旧档条目标题归并为标准条目之一；旧 vol10 五条 /「对你现在」→「对你的看法和态度」 */
export function canonicalizePersonaAiCompactEntryName(raw: string): PersonaAiCompactEntryName | null {
  const name = String(raw ?? '').trim()
  if (!name) return null
  // 独立附加条：勿并入九/十条模板
  if (isPersonaAiOrientationEpilogueName(name)) return null
  if (isPersonaAiOccupationEpilogueName(name)) return null
  if (isPersonaAiRelationshipHistoryEntryName(name)) return null
  if (isPersonaAiNsfwEntryName(name)) return null
  if ((PERSONA_AI_COMPACT_ENTRY_NAMES as readonly string[]).includes(name)) {
    return name as PersonaAiCompactEntryName
  }
  const compact = name.replace(/\s+/g, '')
  for (const t of PERSONA_AI_COMPACT_ENTRY_NAMES) {
    if (t.replace(/\s+/g, '') === compact) return t
  }
  if (/名片|基础资料|身份名片/.test(name)) return '名片基础'
  if (/形象|气质|外貌|体态/.test(name)) return '形象与气质'
  if (/性格|内核|伪装|底色|心理|身世/.test(name)) return '性格内核'
  if (
    name === PERSONA_AI_SPEECH_HABIT_ENTRY_NAME ||
    (/口语习惯|口头禅|说话习惯|说话风格|用语习惯/.test(name) &&
      !/对你的称呼|对你.*口语/.test(name))
  ) {
    return PERSONA_AI_SPEECH_HABIT_ENTRY_NAME
  }
  if (/能力|日常|爱好|技能|生活习惯|癖好/.test(name) && !/对你的称呼|口语习惯|日常用语/.test(name)) {
    return '能力与日常'
  }
  if (/亲密|恋爱|欲念|fetish|contrast|反差/.test(name) && !/反差萌|亲密身体|性爱偏好|亲密尺度|成人向/.test(name)) {
    return '亲密与恋爱观'
  }
  if (/周边NPC|NPC简|关联人物|身边的人|周边人物|配角档案|人物简档/.test(name)) return '周边NPC'
  if (/相遇|相识过程|相识背景|如何相识|羁绊由来|初遇|结识/.test(name)) return '相遇羁绊'
  if (/人际|家庭|友人|秘密|软肋|反差萌|圈子/.test(name)) return '人际与秘密'
  if (
    name === PERSONA_AI_USER_SPEECH_ENTRY_NAME ||
    name === '对你的称呼以及日常用语和风格' ||
    /对你的称呼|日常用语和风格|用语和风格|聊天用语|对你.*叫/.test(name)
  ) {
    return PERSONA_AI_USER_SPEECH_ENTRY_NAME
  }
  if (
    name === PERSONA_AI_TOWARD_USER_ENTRY_NAME ||
    name === '对你现在' ||
    /对你的看法|对你现在|当前态度|相处边界|真实分量|如何赢得|攻略|加好感|聊天分寸/.test(name)
  ) {
    return PERSONA_AI_TOWARD_USER_ENTRY_NAME
  }
  return null
}

/** @deprecated 兼容旧名；新档请用 canonicalizePersonaAiCompactEntryName */
export function canonicalizePersonaAiEpilogueEntryName(
  raw: string,
  _orientationMutable?: boolean,
): string | null {
  const c = canonicalizePersonaAiCompactEntryName(raw)
  if (!c) return null
  if ((PERSONA_AI_EPILOGUE_ENTRY_NAMES as readonly string[]).includes(String(raw ?? '').trim())) {
    return PERSONA_AI_TOWARD_USER_ENTRY_NAME
  }
  return c
}

export function normalizePersonaAiCompactSections(
  entries: PersonaAiEpilogueEntry[] | null | undefined,
  opts?: { relationToUser?: string },
): PersonaAiEpilogueEntry[] {
  const relationToUser = String(opts?.relationToUser ?? '').trim()
  const byName = new Map<PersonaAiCompactEntryName, string>()
  for (const e of entries ?? []) {
    const content = sanitizeEpilogueExtensionNewContent(String(e?.content ?? '').trim())
    if (!content) continue
    const rawName = String(e?.name ?? '')
    if (isPersonaAiOrientationEpilogueName(rawName)) continue
    if (isPersonaAiOccupationEpilogueName(rawName)) continue
    if (isPersonaAiRelationshipHistoryEntryName(rawName)) continue
    if (isPersonaAiNsfwEntryName(rawName)) continue
    const canonical = canonicalizePersonaAiCompactEntryName(rawName)
    if (!canonical) continue
    const prev = byName.get(canonical)
    if (!prev || content.length > prev.length) byName.set(canonical, content)
  }
  return PERSONA_AI_COMPACT_ENTRY_NAMES.map((name) => ({
    name,
    content: byName.get(name) ?? SECTION_DEFAULTS[name](relationToUser),
  }))
}

/** 从条目列表取出取向尾声正文（最长者胜） */
export function pickPersonaAiOrientationEpilogueContent(
  entries: PersonaAiEpilogueEntry[] | null | undefined,
): string {
  let best = ''
  for (const e of entries ?? []) {
    const name = String(e?.name ?? '')
    if (!isPersonaAiOrientationEpilogueName(name)) continue
    const content = sanitizeEpilogueExtensionNewContent(String(e?.content ?? '').trim())
    if (content.length > best.length) best = content
  }
  return best
}

/** 从条目列表取出职业尾声正文（最长者胜） */
export function pickPersonaAiOccupationEpilogueContent(
  entries: PersonaAiEpilogueEntry[] | null | undefined,
): string {
  let best = ''
  for (const e of entries ?? []) {
    const name = String(e?.name ?? '')
    if (!isPersonaAiOccupationEpilogueName(name)) continue
    const content = sanitizeEpilogueExtensionNewContent(String(e?.content ?? '').trim())
    if (content.length > best.length) best = content
  }
  return best
}

/** 从条目列表取出过往感情史正文（最长者胜） */
export function pickPersonaAiRelationshipHistoryContent(
  entries: PersonaAiEpilogueEntry[] | null | undefined,
): string {
  let best = ''
  for (const e of entries ?? []) {
    const name = String(e?.name ?? '')
    if (!isPersonaAiRelationshipHistoryEntryName(name)) continue
    const content = sanitizeEpilogueExtensionNewContent(String(e?.content ?? '').trim())
    if (content.length > best.length) best = content
  }
  return best
}

/** 从条目列表取出 NSFW 成人向正文（最长者胜；不做尾声中性词清洗） */
export function pickPersonaAiNsfwContent(
  entries: PersonaAiEpilogueEntry[] | null | undefined,
): string {
  let best = ''
  for (const e of entries ?? []) {
    const name = String(e?.name ?? '')
    if (!isPersonaAiNsfwEntryName(name)) continue
    const content = String(e?.content ?? '').trim()
    if (content.length > best.length) best = content
  }
  return best
}

function buildNsfwIntimateDefault(hint?: string): string {
  const seed = String(hint ?? '').trim()
  const seedLine = seed
    ? `用户 XP 种子「${seed}」须落实到敏感点与各场景偏好里，可写得更直白。`
    : '按人设自洽补全敏感点与性爱偏好，须直白带荤。'
  return `<intimate_nsfw>
${seedLine}
身体敏感点：……（写清哪里一碰就软/喘/发抖，可写胸口、腰侧、大腿内侧、耳后、性器等）
亲密偏好：……（主动/被压、节奏快慢、dirty talk、留痕等）
接吻：动作与反应…… 口语：「……」
被抚摸：…… 口语：「……」
抚摸对方：…… 口语：「……」
前戏：…… 口语：「……」
发生关系时：体位/节奏/失控反应…… 口语：「……」「……」
（整体偏荤、可写器官与动作；偶可夹一两句纯情；指恋人写「对方」；双方自愿）
</intimate_nsfw>`
}

/**
 * 若模型仍把取向写进「性格内核」，尽量剥出独立段，避免与尾声条重复。
 * 匹配以「性取向 / 取向认同 / 自我认同」等起头的段落。
 */
export function peelOrientationParagraphFromCore(coreRaw: string): {
  core: string
  peeled: string
} {
  const core = String(coreRaw ?? '').trim()
  if (!core) return { core: '', peeled: '' }

  const parts = core.split(/\n{2,}/)
  const kept: string[] = []
  const peeledParts: string[] = []
  for (const p of parts) {
    const t = p.trim()
    if (!t) continue
    if (/^(?:性取向|取向认同|取向与自我|自我认同(?:与取向)?|对自我性取向)/.test(t) || /性取向[/／与]*自我认同/.test(t.slice(0, 40))) {
      peeledParts.push(t)
      continue
    }
    kept.push(t)
  }
  if (!peeledParts.length) return { core, peeled: '' }
  return {
    core: kept.join('\n\n').trim() || core,
    peeled: peeledParts.join('\n\n').trim(),
  }
}

function buildOrientationEpilogueDefault(orientationLabel?: string): string {
  const label = String(orientationLabel ?? '').trim()
  if (label) {
    return `<orientation_snapshot>
{{char}}当前对自我性取向的认同可概括为「${label}」。只写当下稳定自我认同与由来，不因与{{user}}的互动写成取向动摇。
本条为尾声延展快照，可随剧情更新表述，但不等于开局即写「取向不确定」。
</orientation_snapshot>`
  }
  return `<orientation_snapshot>
{{char}}对自我性取向有清晰、当下稳定的认同表述（含由来）。禁止因勾选「可变」或欣赏{{user}}外貌写成取向动摇。
本条为尾声延展快照，可随剧情更新。
</orientation_snapshot>`
}

/**
 * 若模型仍把职业详述写进「名片基础」，尽量剥出独立段，避免与尾声条重复。
 */
export function peelOccupationParagraphFromCard(cardRaw: string): {
  card: string
  peeled: string
} {
  const card = String(cardRaw ?? '').trim()
  if (!card) return { card: '', peeled: '' }

  const parts = card.split(/\n{2,}/)
  const kept: string[] = []
  const peeledParts: string[] = []
  for (const p of parts) {
    const t = p.trim()
    if (!t) continue
    if (
      /^(?:职业|社会身份|当前职业|工作身份|职场身份)/.test(t) ||
      /职业[/／与]*社会身份|社会身份[/／与]*职业/.test(t.slice(0, 40))
    ) {
      peeledParts.push(t)
      continue
    }
    kept.push(t)
  }
  if (!peeledParts.length) return { card, peeled: '' }
  return {
    card: kept.join('\n\n').trim() || card,
    peeled: peeledParts.join('\n\n').trim(),
  }
}

function buildOccupationEpilogueDefault(occupationLabel?: string): string {
  const label = String(occupationLabel ?? '').trim()
  if (label) {
    return `<occupation_snapshot>
{{char}}当前职业/社会身份可概括为「${label}」。只写当下稳定的工作内容与对外身份。
日常节奏；本条为尾声延展快照，可随剧情更新表述，但不等于开局即写「职业悬空/待定」。
</occupation_snapshot>`
  }
  return `<occupation_snapshot>
{{char}}有清晰、当下稳定的职业/社会身份表述（含工作内容与对外标签）。禁止因勾选「可变」写成开局职业悬空。
日常节奏；本条为尾声延展快照，可随剧情更新。
</occupation_snapshot>`
}

function buildRelationshipHistoryDefault(hint?: string): string {
  const seed = String(hint ?? '').trim()
  if (seed) {
    return `<love_history>
围绕用户种子「${seed}」扩写{{char}}的过往感情史：须写清曾有好感、喜欢过、或在一起过的对象（可化名/简述关系与结局），以及分手余波、模式与雷区。只写过去与第三人，禁止写成与{{user}}的当前关系；也禁止把{{user}}写成前任。若种子指向单身/无恋爱：写明母胎单身或从未认真喜欢过人。
</love_history>`
  }
  return `<love_history>
{{char}}的过往感情史：须写清曾有好感、喜欢过、或在一起过的对象（可化名/简述关系与结局）及留下的模式影响。只写过去，禁止写成与{{user}}的当前关系。若从未心动也未恋爱：明确写「母胎单身/未认真喜欢过人」。
</love_history>`
}

/**
 * 将 AI 人设写成**一本**世界书、固定条目。
 * 「对你的看法和态度」「对你的称呼」恒为尾声延展；「口语习惯」为序言；「相遇羁绊」为序言；「过往感情史」恒为序言；取向/职业「可变」时另增对应快照尾声。
 */
export function buildPersonaAiWorldBooks(
  characterId: string,
  nickname: string,
  /** 真实姓名（用于裸名→{{char}}；勿再传旧九维对象） */
  realNameOrUnused: string | null | unknown,
  now: number,
  sectionsOrEpilogue: PersonaAiEpilogueEntry[] | null,
  userDisplayName?: string,
  opts?: {
    orientationMutable?: boolean
    occupationMutable?: boolean
    relationToUser?: string
    /** 顶层「性取向」短标签，作取向尾声缺省正文参考 */
    orientationLabel?: string
    /** 顶层「职业」短标签，作职业尾声缺省正文参考 */
    occupationLabel?: string
    /** 恒为 true：始终写入「过往感情史」序言条（保留参数兼容旧调用） */
    includeRelationshipHistory?: boolean
    relationshipHistoryHint?: string
    /** true = 写入「亲密身体与性爱偏好」成人向条目 */
    nsfwEnabled?: boolean
    nsfwHint?: string
  },
): WorldBook[] {
  const orientationMutable = opts?.orientationMutable ?? false
  const occupationMutable = opts?.occupationMutable ?? false
  const includeHistory = opts?.includeRelationshipHistory !== false
  const nsfwEnabled = opts?.nsfwEnabled ?? false
  const relationToUser = String(opts?.relationToUser ?? '').trim()
  const sections = normalizePersonaAiCompactSections(sectionsOrEpilogue, { relationToUser })
  // 旧调用曾把九维对象塞进第 3 参；仅接受非空字符串作为真实姓名
  const rn =
    typeof realNameOrUnused === 'string' && realNameOrUnused.trim()
      ? realNameOrUnused.trim()
      : nickname
  const itemOpts = userDisplayName?.trim() ? { userDisplayName: userDisplayName.trim() } : undefined

  let occupationExtra: string | null = null
  if (occupationMutable) {
    let occ = pickPersonaAiOccupationEpilogueContent(sectionsOrEpilogue) || ''
    const cardIdx = sections.findIndex((s) => s.name === '名片基础')
    if (cardIdx >= 0) {
      const peeled = peelOccupationParagraphFromCard(sections[cardIdx]!.content)
      if (peeled.peeled) {
        if (!occ || peeled.peeled.length > occ.length) occ = peeled.peeled
        sections[cardIdx] = { name: '名片基础', content: peeled.card }
      }
    }
    occupationExtra = occ.trim() || buildOccupationEpilogueDefault(opts?.occupationLabel)
  }

  let orientationExtra: string | null = null
  if (orientationMutable) {
    let orient = pickPersonaAiOrientationEpilogueContent(sectionsOrEpilogue) || ''
    const coreIdx = sections.findIndex((s) => s.name === '性格内核')
    if (coreIdx >= 0) {
      const peeled = peelOrientationParagraphFromCore(sections[coreIdx]!.content)
      if (peeled.peeled) {
        if (!orient || peeled.peeled.length > orient.length) orient = peeled.peeled
        sections[coreIdx] = { name: '性格内核', content: peeled.core }
      }
    }
    orientationExtra = orient.trim() || buildOrientationEpilogueDefault(opts?.orientationLabel)
  }

  let historyExtra: string | null = null
  if (includeHistory) {
    historyExtra =
      pickPersonaAiRelationshipHistoryContent(sectionsOrEpilogue).trim() ||
      buildRelationshipHistoryDefault(opts?.relationshipHistoryHint)
  }

  let nsfwExtra: string | null = null
  if (nsfwEnabled) {
    nsfwExtra =
      pickPersonaAiNsfwContent(sectionsOrEpilogue).trim() ||
      buildNsfwIntimateDefault(opts?.nsfwHint)
  }

  const items: WorldBookItem[] = []
  let itemIndex = 0
  for (const e of sections) {
    const name = e.name as PersonaAiCompactEntryName
    const isAfterEpilogue =
      name === PERSONA_AI_TOWARD_USER_ENTRY_NAME || name === PERSONA_AI_USER_SPEECH_ENTRY_NAME
    const priority: WorldBookPriority = isAfterEpilogue ? 'after' : 'before'
    itemIndex += 1
    items.push(
      mkItem(characterId, itemIndex, name, e.content, nickname, rn, now, {
        ...itemOpts,
        priority,
      }),
    )
    // 插在「名片基础」后：独立职业尾声
    if (occupationMutable && name === '名片基础' && occupationExtra) {
      itemIndex += 1
      items.push(
        mkItem(
          characterId,
          itemIndex,
          PERSONA_AI_OCCUPATION_MUTABLE_EPILOGUE_NAME,
          occupationExtra,
          nickname,
          rn,
          now,
          { ...itemOpts, priority: 'after' },
        ),
      )
    }
    // 插在「性格内核」后：独立取向尾声
    if (orientationMutable && name === '性格内核' && orientationExtra) {
      itemIndex += 1
      items.push(
        mkItem(
          characterId,
          itemIndex,
          PERSONA_AI_ORIENTATION_MUTABLE_EPILOGUE_NAME,
          orientationExtra,
          nickname,
          rn,
          now,
          { ...itemOpts, priority: 'after' },
        ),
      )
    }
    // 插在「亲密与恋爱观」后：过往感情史（序言）+ NSFW 成人向（若开启）
    if (name === '亲密与恋爱观') {
      if (includeHistory && historyExtra) {
        itemIndex += 1
        items.push(
          mkItem(
            characterId,
            itemIndex,
            PERSONA_AI_RELATIONSHIP_HISTORY_ENTRY_NAME,
            historyExtra,
            nickname,
            rn,
            now,
            { ...itemOpts, priority: 'before' },
          ),
        )
      }
      if (nsfwEnabled && nsfwExtra) {
        itemIndex += 1
        items.push(
          mkItem(
            characterId,
            itemIndex,
            PERSONA_AI_NSFW_ENTRY_NAME,
            nsfwExtra,
            nickname,
            rn,
            now,
            { ...itemOpts, priority: 'before' },
          ),
        )
      }
    }
  }

  return [
    {
      id: `persona-wb-${characterId}-${PERSONA_AI_COMPACT_BOOK_KEY}`,
      name: PERSONA_AI_COMPACT_BOOK_TITLE,
      enabled: true,
      collapsed: false,
      items,
    },
  ]
}

/** 从模型输出解析世界书各段正文 */
export function parsePersonaAiCompactSectionsFromParsed(
  parsed: Record<string, unknown>,
): PersonaAiEpilogueEntry[] {
  const out: PersonaAiEpilogueEntry[] = []

  const arr = parsed.worldBookEntries
  if (Array.isArray(arr)) {
    for (const x of arr) {
      if (!x || typeof x !== 'object') continue
      const o = x as Record<string, unknown>
      const name = String(o.name ?? '').trim()
      const content = String(o.content ?? '').trim()
      if (!name || !content) continue
      out.push({ name, content })
    }
  }

  const obj = parsed.worldBookSections
  if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      const content = String(v ?? '').trim()
      if (!content) continue
      out.push({ name: k, content })
    }
  }

  // 兼容旧 epilogueEntries：并入「对你的看法和态度」
  const epi = parsed.epilogueEntries
  if (Array.isArray(epi) && epi.length) {
    const chunks: string[] = []
    for (const x of epi) {
      if (!x || typeof x !== 'object') continue
      const o = x as Record<string, unknown>
      const name = String(o.name ?? '').trim()
      const content = String(o.content ?? '').trim()
      if (!content) continue
      chunks.push(name ? `【${name}】${content}` : content)
    }
    if (chunks.length) out.push({ name: PERSONA_AI_TOWARD_USER_ENTRY_NAME, content: chunks.join('\n') })
  }

  return out
}
