import { buildOpenAiChatCompletionsEndpoint } from '../../api/openAiCompatibleEndpoints'
import type { ApiConfig } from '../../api/types'
import { bumpLumiSysTokensFromChatResponse } from './ai'
import type { Character, Gender, PlayerIdentity, PlayerNetworkLink, Relationship, WorldBook, WorldBookItem } from './types'
import { formatWorldBookItemLineForPrompt, worldBookPronounGuideAnnotation } from './worldBookPronounGuide'
import { daysInMonth, formatMD, genderLabelZh, uid, zodiacFromMD } from './utils'
import { DEFAULT_WORLD_BACKGROUND_ID } from './worldBackgroundConstants'
import {
  NPC_AI_HEIGHT_WEIGHT_MOTTO_RULES_CORE,
  NPC_NETWORK_AI_AGE_AND_BIRTHDAY_RULES,
  npcNetworkAiMottoStyleTail,
} from './npcBasicProfileAiRules'

type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string }

async function openAiCompatibleChat(cfg: ApiConfig, messages: ChatMessage[]): Promise<string> {
  const endpoint = buildOpenAiChatCompletionsEndpoint(cfg.apiUrl)
  const resp = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cfg.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: cfg.modelId || undefined,
      messages,
      temperature: 0.65,
    }),
  })
  const data = (await resp.json()) as { error?: { message?: string }; message?: string; choices?: { message?: { content?: string } }[] }
  if (!resp.ok) {
    const msg = data?.error?.message ?? data?.message ?? `请求失败（HTTP ${resp.status}）`
    throw new Error(typeof msg === 'string' ? msg : '请求失败')
  }
  bumpLumiSysTokensFromChatResponse(data)
  const text = data?.choices?.[0]?.message?.content
  if (typeof text !== 'string') throw new Error('返回格式不符合预期')
  return text.trim()
}

function stripJsonFence(raw: string): string {
  const t = raw.trim()
  const m = t.match(/```(?:json)?\s*([\s\S]*?)```/i)
  return m ? m[1].trim() : t
}

function stripModelNoise(raw: string): string {
  return String(raw ?? '')
    .replace(/^\uFEFF/, '')
    .replace(/```(?:text|markdown|md)?\s*/gi, '')
    .replace(/```/g, '')
    .trim()
}

function splitListField(value: string): string[] {
  return String(value ?? '')
    .split(/[,，、;/|｜]+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

function parseKvBlock(body: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const line of String(body ?? '').split(/\r?\n/)) {
    const m = /^\s*([^：:\n]{1,32})\s*[：:]\s*(.*)$/.exec(line)
    if (!m) continue
    const key = m[1]!.trim()
    const val = (m[2] ?? '').trim()
    if (!key || !val) continue
    out[key] = val
  }
  return out
}

function pickKv(map: Record<string, string>, aliases: string[]): string {
  for (const a of aliases) {
    const hit = map[a]
    if (hit?.trim()) return hit.trim()
  }
  // 宽松：去空格后匹配
  const norm = (s: string) => s.replace(/\s+/g, '').toLowerCase()
  const aliasSet = new Set(aliases.map(norm))
  for (const [k, v] of Object.entries(map)) {
    if (aliasSet.has(norm(k)) && v.trim()) return v.trim()
  }
  return ''
}

/** 分段纯文本 → 与旧 JSON 同形；失败返回 null（再回退 JSON） */
function parseNpcNetworkMarkup(raw: string): AiPayload | null {
  const text = stripModelNoise(raw)
  if (!text) return null

  const sectionRe =
    /(?:^|\n)\s*(?:===|【)\s*(NPC|关系|玩家连线|npcs?|relationships?|playerLinks?)\s*(?:===|】)\s*/gi
  type Hit = { kind: 'npc' | 'rel' | 'player'; end: number; index: number }
  const hits: Hit[] = []
  let m: RegExpExecArray | null
  while ((m = sectionRe.exec(text)) !== null) {
    const token = m[1]!.toLowerCase()
    let kind: Hit['kind'] | null = null
    if (token === 'npc' || token === 'npcs') kind = 'npc'
    else if (token === '关系' || token === 'relationship' || token === 'relationships') kind = 'rel'
    else if (
      token === '玩家连线' ||
      token === 'playerlink' ||
      token === 'playerlinks'
    ) {
      kind = 'player'
    }
    if (!kind) continue
    hits.push({ kind, index: m.index, end: m.index + m[0].length })
  }
  if (!hits.length) return null

  const npcs: AiNpcJson[] = []
  const relationships: AiRelJson[] = []
  const playerLinks: AiPlayerLinkJson[] = []

  for (let i = 0; i < hits.length; i++) {
    const h = hits[i]!
    const body = text.slice(h.end, i + 1 < hits.length ? hits[i + 1]!.index : text.length).trim()
    if (!body) continue

    if (h.kind === 'npc') {
      // 顶层键值 + 【条目】块
      const blockRe = /【\s*([^】]+?)\s*】/g
      const headers: { title: string; index: number; end: number }[] = []
      let bm: RegExpExecArray | null
      while ((bm = blockRe.exec(body)) !== null) {
        headers.push({ title: bm[1]!.trim(), index: bm.index, end: bm.index + bm[0].length })
      }
      const headText = headers.length ? body.slice(0, headers[0]!.index) : body
      const kv = parseKvBlock(headText)
      const name = pickKv(kv, ['姓名', 'name', '名字'])
      if (!name) continue
      const ageRaw = pickKv(kv, ['年龄', 'age'])
      const age = Number.parseInt(ageRaw.replace(/\D/g, ''), 10)
      const interests = splitListField(pickKv(kv, ['兴趣', '兴趣爱好', 'interests']))
      const painPoints = splitListField(pickKv(kv, ['雷点', 'painPoints', '痛点']))
      let bio = pickKv(kv, ['简介', 'bio'])
      if (!bio) {
        const bioM = /(?:^|\n)\s*(?:简介|bio)\s*[：:]\s*([\s\S]*)$/i.exec(headText)
        if (bioM) bio = bioM[1]!.trim()
      }
      const basicSettingEntries: { name: string; content: string }[] = []
      const firstImpressionEntries: { name: string; content: string }[] = []
      for (let j = 0; j < headers.length; j++) {
        const title = headers[j]!.title
        const content = body
          .slice(headers[j]!.end, j + 1 < headers.length ? headers[j + 1]!.index : body.length)
          .trim()
        if (!content) continue
        const t = title.replace(/\s+/g, '')
        if (
          /^当前对你的态度|^对你的态度|^firstImpression/i.test(t) ||
          (/对你|态度/.test(t) && /当前|印象|态度/.test(t))
        ) {
          const entryName = title.includes('·') ? title.split('·').slice(1).join('·').trim() || '对你' : title
          firstImpressionEntries.push({ name: entryName || '对你', content })
          continue
        }
        if (/^基础设定|^背景|^相识|^固定人设|^basic/i.test(t) || t.includes('相识') || t.includes('人设')) {
          const entryName = title.includes('·')
            ? title.split('·').slice(1).join('·').trim() || title
            : title.replace(/^基础设定[·・\-]*/, '').trim() || title
          basicSettingEntries.push({ name: entryName || '设定', content })
          continue
        }
        // 其它【块】默认进基础设定
        basicSettingEntries.push({ name: title, content })
      }
      npcs.push({
        name,
        gender: pickKv(kv, ['性别', 'gender']) || 'other',
        age: Number.isFinite(age) ? age : 0,
        height: pickKv(kv, ['身高', 'height']),
        weight: pickKv(kv, ['体重', 'weight']),
        motto: pickKv(kv, ['座右铭', 'motto']),
        birthdayMD: pickKv(kv, ['生日', 'birthdayMD', '生日MD']),
        avatarCategory: (normalizeAvatarCategory(pickKv(kv, ['头像分类', 'avatarCategory'])) ||
          '抽象搞笑男女通用') as AiNpcJson['avatarCategory'],
        occupation: pickKv(kv, ['职业', '身份', 'occupation', 'identity']),
        interests: interests.length ? interests.slice(0, 5) : ['阅读'],
        painPoints: painPoints.length ? painPoints.slice(0, 5) : ['敷衍'],
        mbti: pickKv(kv, ['MBTI', 'mbti']).toUpperCase(),
        bio: bio || `${name}的简介待补充`,
        basicSettingEntries,
        firstImpressionEntries,
      })
      continue
    }

    if (h.kind === 'rel') {
      const kv = parseKvBlock(body)
      const fromName = pickKv(kv, ['from', 'fromName', '起点', '从', 'A'])
      const toName = pickKv(kv, ['to', 'toName', '终点', '到', 'B'])
      // 支持「方向：A→B」
      if ((!fromName || !toName) && pickKv(kv, ['方向', 'direction'])) {
        const dir = pickKv(kv, ['方向', 'direction'])
        const parts = dir.split(/\s*(?:→|->|=>|＞|>|→)\s*/)
        if (parts.length >= 2) {
          relationships.push({
            fromName: (fromName || parts[0]!).trim(),
            toName: (toName || parts[1]!).trim(),
            relation: pickKv(kv, ['关系词', 'relation', '关系']),
            fromPerspective: pickKv(kv, ['视角正', 'fromPerspective', '正视角', 'A看B']),
            toPerspective: pickKv(kv, ['视角反', 'toPerspective', '反视角', 'B看A']),
            fromCallsTo: pickKv(kv, ['称呼', 'fromCallsTo', '怎么叫']),
          })
          continue
        }
      }
      if (!fromName || !toName) continue
      relationships.push({
        fromName,
        toName,
        relation: pickKv(kv, ['关系词', 'relation', '关系']),
        fromPerspective: pickKv(kv, ['视角正', 'fromPerspective', '正视角', 'from看to']),
        toPerspective: pickKv(kv, ['视角反', 'toPerspective', '反视角', 'to看from']),
        fromCallsTo: pickKv(kv, ['称呼', 'fromCallsTo', '怎么叫']),
      })
      continue
    }

    if (h.kind === 'player') {
      const kv = parseKvBlock(body)
      const characterName = pickKv(kv, ['角色', 'characterName', '姓名', 'name'])
      if (!characterName) continue
      playerLinks.push({
        characterName,
        relationThemToYou: pickKv(kv, ['对方看你关系词', 'relationThemToYou', '关系词']),
        theySeeYou: pickKv(kv, ['对方看你', 'theySeeYou', '看法']),
        theyCallYou: pickKv(kv, ['对方称呼你', 'theyCallYou', '称呼']),
      })
    }
  }

  if (!npcs.length) return null
  return { npcs, relationships, playerLinks }
}

function parseNpcNetworkPayload(raw: string): AiPayload {
  const markup = parseNpcNetworkMarkup(raw)
  if (markup?.npcs?.length) return markup

  // 兼容旧模型偶发 JSON
  try {
    const payload = JSON.parse(stripJsonFence(raw)) as AiPayload
    if (payload?.npcs && Array.isArray(payload.npcs)) return payload
  } catch {
    /* fallthrough */
  }
  throw new Error('AI 返回无法解析（请重试；已改用分段纯文本，勿再输出 JSON）')
}

export type NpcGenerateInput = {
  main: Character
  playerIdentity?: PlayerIdentity | null
  count: number
  relationBiases: string[]
  customNote: string
  /** 主角关联的世界背景（优先于泛化常识，次于主角世界书） */
  worldBackgroundSummary?: string
}

type AiNpcJson = {
  name: string
  gender: string
  age: number
  /** 身高：建议格式如 "170cm"（允许 "170" / "170厘米" / "1.70m"） */
  height: string
  /** 体重：建议格式如 "55kg"（允许 "55" / "55公斤"） */
  weight: string
  /** 座右铭：短句，<=15 字 */
  motto: string
  /** 月-日，如 "08-03"，须与 age、主角年龄时间线自洽 */
  birthdayMD: string
  /** 头像分类：由 AI 按人设智能选择（落库为 /image/<分类>/…，勿用 Vite /assets 哈希） */
  avatarCategory:
    | '40岁以上长辈头像男'
    | '40岁以上长辈头像女'
    | '微信头像男E型阳光'
    | '微信头像男I型清冷'
    | '微信头像女清冷和御姐'
    | '抽象搞笑男女通用'
    | '微信头像女可爱活泼'
  occupation: string
  interests: string[]
  painPoints: string[]
  mbti: string
  bio: string
  basicSettingEntries: { name: string; content: string }[]
  /** 世界书「当前对你的态度」条目（JSON 字段名保留以兼容旧版提示） */
  firstImpressionEntries: { name: string; content: string }[]
}

type AiRelJson = {
  fromName: string
  toName: string
  relation: string
  fromPerspective: string
  toPerspective: string
  /** fromName 当面如何称呼 toName（短；可与 relation 不同） */
  fromCallsTo?: string
}

/** 操作者「你」与图中角色；characterName 须为主角名或某 NPC 的 name，精确匹配。只产出「对方→你」一侧，不写玩家视角。 */
type AiPlayerLinkJson = {
  characterName: string
  /** 该角色→你 的连线中间词；语义为「你是对方的 relationThemToYou」 */
  relationThemToYou: string
  /** 【该角色看你】完整一句 */
  theySeeYou: string
  /** 该角色通常如何称呼你（口语，短；如：哥、姑娘、小+姓） */
  theyCallYou?: string
}

type AiPayload = { npcs: AiNpcJson[]; relationships: AiRelJson[]; playerLinks?: AiPlayerLinkJson[] }

/** 只扫文件名，落库用可移植的 /image/… 路径（勿 eager default，否则变成 /assets 哈希，展示会被换成随机网友头像） */
function listImageDirAvatarPaths(folder: string, globKeys: string[]): string[] {
  const prefix = `/image/${folder}/`
  const paths = globKeys
    .map((key) => {
      const file = key.replace(/\\/g, '/').split('/').pop()?.split('?')[0]?.trim()
      if (!file) return ''
      return `${prefix}${file}`
    })
    .filter(Boolean)
  paths.sort()
  return paths
}

const AVATAR_OLDER_MALE = listImageDirAvatarPaths(
  '40岁以上长辈头像男',
  Object.keys(import.meta.glob('../../../../../image/40岁以上长辈头像男/*.{png,jpg,jpeg,webp,gif}')),
)
const AVATAR_OLDER_FEMALE = listImageDirAvatarPaths(
  '40岁以上长辈头像女',
  Object.keys(import.meta.glob('../../../../../image/40岁以上长辈头像女/*.{png,jpg,jpeg,webp,gif}')),
)
const AVATAR_MALE_E_SUNNY = listImageDirAvatarPaths(
  '微信头像男E型阳光',
  Object.keys(import.meta.glob('../../../../../image/微信头像男E型阳光/*.{png,jpg,jpeg,webp,gif}')),
)
const AVATAR_MALE_I_COOL = listImageDirAvatarPaths(
  '微信头像男I型清冷',
  Object.keys(import.meta.glob('../../../../../image/微信头像男I型清冷/*.{png,jpg,jpeg,webp,gif}')),
)
const AVATAR_FEMALE_COOL = listImageDirAvatarPaths(
  '微信头像女清冷和御姐',
  Object.keys(import.meta.glob('../../../../../image/微信头像女清冷和御姐/*.{png,jpg,jpeg,webp,gif}')),
)
const AVATAR_ABSTRACT_UNISEX = listImageDirAvatarPaths(
  '抽象搞笑男女通用',
  Object.keys(import.meta.glob('../../../../../image/抽象搞笑男女通用/*.{png,jpg,jpeg,webp,gif}')),
)
const AVATAR_FEMALE_CUTE = listImageDirAvatarPaths(
  '微信头像女可爱活泼',
  Object.keys(import.meta.glob('../../../../../image/微信头像女可爱活泼/*.{png,jpg,jpeg,webp,gif}')),
)

function parseGender(g: string): Gender {
  const x = (g || '').toLowerCase()
  if (x === '男' || x === 'male' || x === 'm') return 'male'
  if (x === '女' || x === 'female' || x === 'f') return 'female'
  return 'other'
}

function pickOne(list: string[]): string {
  if (!list.length) return ''
  return list[Math.floor(Math.random() * list.length)] || ''
}

const ALL_AVATAR_POOL = [
  ...AVATAR_OLDER_MALE,
  ...AVATAR_OLDER_FEMALE,
  ...AVATAR_MALE_E_SUNNY,
  ...AVATAR_MALE_I_COOL,
  ...AVATAR_FEMALE_COOL,
  ...AVATAR_ABSTRACT_UNISEX,
  ...AVATAR_FEMALE_CUTE,
]

/** 同一批生成内头像 URL 不重复；本池用尽再扩到全库，仍用尽则允许重复兜底 */
function pickFromUnused(pool: string[], used: Set<string>): string | null {
  const free = pool.filter((u) => u && !used.has(u))
  if (!free.length) return null
  const url = pickOne(free)
  if (url) used.add(url)
  return url
}

function normalizeAvatarCategory(raw: unknown): AiNpcJson['avatarCategory'] | '' {
  const t = String(raw ?? '').trim()
  switch (t) {
    case '40岁以上长辈头像男':
    case '40岁以上长辈头像女':
    case '微信头像男E型阳光':
    case '微信头像男I型清冷':
    case '微信头像女清冷和御姐':
    case '抽象搞笑男女通用':
    case '微信头像女可爱活泼':
      return t
    default:
      return ''
  }
}

/** 模型漏写/写错分类时，按性别+年龄兜底到对应图库（仍不走随机网友池） */
function fallbackPoolsByGenderAge(gender: Gender, age: number): string[][] {
  const elder = Number.isFinite(age) && age >= 40
  if (gender === 'male') {
    if (elder) return [[...AVATAR_OLDER_MALE], [...AVATAR_MALE_I_COOL, ...AVATAR_MALE_E_SUNNY]]
    return [[...AVATAR_MALE_I_COOL, ...AVATAR_MALE_E_SUNNY], [...AVATAR_ABSTRACT_UNISEX]]
  }
  if (gender === 'female') {
    if (elder) return [[...AVATAR_OLDER_FEMALE], [...AVATAR_FEMALE_COOL, ...AVATAR_FEMALE_CUTE]]
    return [[...AVATAR_FEMALE_COOL, ...AVATAR_FEMALE_CUTE], [...AVATAR_ABSTRACT_UNISEX]]
  }
  return [[...AVATAR_ABSTRACT_UNISEX], [...ALL_AVATAR_POOL]]
}

function pickNpcAvatar(npc: AiNpcJson, gender: Gender, used: Set<string>): string {
  const tryPools = (pools: string[][]): string => {
    for (const p of pools) {
      const u = pickFromUnused(p, used)
      if (u) return u
    }
    return ''
  }

  const category = normalizeAvatarCategory(npc.avatarCategory)
  const primary: string[][] = (() => {
    switch (category) {
      case '40岁以上长辈头像男':
        return [[...AVATAR_OLDER_MALE], [...AVATAR_MALE_E_SUNNY, ...AVATAR_MALE_I_COOL, ...AVATAR_ABSTRACT_UNISEX]]
      case '40岁以上长辈头像女':
        return [[...AVATAR_OLDER_FEMALE], [...AVATAR_FEMALE_COOL, ...AVATAR_FEMALE_CUTE, ...AVATAR_ABSTRACT_UNISEX]]
      case '微信头像男E型阳光':
        return [[...AVATAR_MALE_E_SUNNY], [...AVATAR_MALE_I_COOL, ...AVATAR_ABSTRACT_UNISEX, ...AVATAR_OLDER_MALE]]
      case '微信头像男I型清冷':
        return [[...AVATAR_MALE_I_COOL], [...AVATAR_MALE_E_SUNNY, ...AVATAR_ABSTRACT_UNISEX, ...AVATAR_OLDER_MALE]]
      case '微信头像女清冷和御姐':
        return [[...AVATAR_FEMALE_COOL], [...AVATAR_FEMALE_CUTE, ...AVATAR_ABSTRACT_UNISEX]]
      case '抽象搞笑男女通用':
        return [[...AVATAR_ABSTRACT_UNISEX]]
      case '微信头像女可爱活泼':
        return [[...AVATAR_FEMALE_CUTE], [...AVATAR_FEMALE_COOL, ...AVATAR_ABSTRACT_UNISEX]]
      default:
        return fallbackPoolsByGenderAge(gender, Number(npc.age))
    }
  })()

  let url = tryPools(primary)
  if (url) return url

  url = tryPools(fallbackPoolsByGenderAge(gender, Number(npc.age)))
  if (url) return url

  url = pickFromUnused([...ALL_AVATAR_POOL], used) || ''
  if (url) return url

  if (gender === 'male') {
    return (
      pickOne(AVATAR_MALE_I_COOL) ||
      pickOne(AVATAR_MALE_E_SUNNY) ||
      pickOne(AVATAR_ABSTRACT_UNISEX) ||
      pickOne(ALL_AVATAR_POOL)
    )
  }
  if (gender === 'female') {
    return pickOne(AVATAR_FEMALE_COOL) || pickOne(AVATAR_FEMALE_CUTE) || pickOne(ALL_AVATAR_POOL)
  }
  return pickOne(ALL_AVATAR_POOL)
}

/** 正文中不出现「玩家」，统一为占位符「{{user}}」（修正模型偶发用词；注入会话时再展开为玩家身份名） */
function noPlayerWord(s: string): string {
  return String(s || '').replace(/玩家/g, '{{user}}')
}

/** 世界书/bio 中指根档案主角：用 {{id:主角人设UUID}}，避免写死汉字姓名（split/join 规避正则特殊字符） */
function scrubMainNameWithRootPlaceholder(text: string, mainName: string, mainId: string): string {
  const mn = String(mainName ?? '').trim()
  const mid = String(mainId ?? '').trim()
  if (!mn || !mid || !text) return text
  return text.split(mn).join(`{{id:${mid}}}`)
}

function scrubNpcAnchorsForMain(npc: AiNpcJson, main: Character): AiNpcJson {
  const mn = String(main.name ?? '').trim()
  const mid = String(main.id ?? '').trim()
  if (!mn || !mid) return npc
  const fix = (s: string) => scrubMainNameWithRootPlaceholder(s, mn, mid)
  const entries = (xs: { name: string; content: string }[]) =>
    (xs || []).map((e) => ({ name: fix(e.name), content: fix(e.content) }))
  return {
    ...npc,
    bio: fix(String(npc.bio || '')),
    motto: fix(String(npc.motto || '').trim()),
    basicSettingEntries: entries(npc.basicSettingEntries || []),
    firstImpressionEntries: entries(npc.firstImpressionEntries || []),
  }
}

function normalizeRelationPerspective(fromName: string, toName: string, raw: unknown): string {
  const s = String(raw ?? '').trim()
  if (!s) return ''
  // 关系视角句应直呼双方姓名：尽量把常见代词兜底替换掉，避免出现「你/他/她/我」等。
  // 约定：fromPerspective =「fromName看toName」，因此「我」应指 fromName，「你/他/她/TA/对方」倾向指 toName。
  const safeFrom = (fromName || '').trim() || '此人'
  const safeTo = (toName || '').trim() || '对方'
  return s
    .replace(/玩家/g, safeTo)
    .replace(/(?<![\u4e00-\u9fffA-Za-z0-9_])我(?![\u4e00-\u9fffA-Za-z0-9_])/g, safeFrom)
    .replace(/(?<![\u4e00-\u9fffA-Za-z0-9_])你(?![\u4e00-\u9fffA-Za-z0-9_])/g, safeTo)
    .replace(/(?<![\u4e00-\u9fffA-Za-z0-9_])(他|她|TA|ta|对方)(?![\u4e00-\u9fffA-Za-z0-9_])/g, safeTo)
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeNameKey(raw: unknown): string {
  return String(raw ?? '')
    .trim()
    .replace(/\s+/g, '')
    .toLowerCase()
}

/**
 * 人脉 NPC 的 name 须户籍式全名；拦截「阿木」「徐姐」等小名/称呼当姓名。
 * （称呼应落在 fromCallsTo / theyCallYou，不进 name。）
 */
export function isIncompleteNpcLegalName(name: unknown): boolean {
  const n = String(name ?? '').trim()
  if (!n) return true
  if (n.length < 2) return true
  if (/^[阿小][\u4e00-\u9fff]{1,2}$/u.test(n)) return true
  if (/^[\u4e00-\u9fff]{1,2}(?:姐|哥|叔|婶|姨|总|婆|公)$/u.test(n)) return true
  if (
    /^(?:老师|女士|先生|经理|同学|阿姨|叔叔|学长|学姐|班主任|保安|店长|医生|前台|姐|哥|叔|婶|姨)$/u.test(
      n,
    )
  ) {
    return true
  }
  if (
    /^[\u4e00-\u9fff]{1,2}(?:老师|女士|先生|经理|主任|医生|同学|学长|学姐|老板)$/u.test(n)
  ) {
    return true
  }
  return false
}

/** 将 AI 返回的月日规范为 MM-DD，非法则返回空串 */
function normalizeBirthdayMD(raw: unknown): string {
  const t = String(raw ?? '').trim()
  const m = t.match(/^(\d{1,2})[-/](\d{1,2})$/)
  if (!m) return ''
  const mo = Math.min(12, Math.max(1, parseInt(m[1], 10)))
  const maxD = daysInMonth(mo)
  const day = Math.min(maxD, Math.max(1, parseInt(m[2], 10)))
  return formatMD(mo, day)
}

function buildWorldBooks(npc: AiNpcJson): WorldBook[] {
  const now = Date.now()
  const mkItem = (name: string, content: string, priority: 'before' | 'after'): WorldBookItem => ({
    id: uid('it'),
    name,
    enabled: true,
    priority,
    keywords: '',
    content,
    updatedAt: now,
    collapsed: true,
  })

  const basicItems = (npc.basicSettingEntries || []).map((e) => mkItem(noPlayerWord(e.name), noPlayerWord(e.content), 'before'))
  const firstItems = (npc.firstImpressionEntries || []).map((e) => mkItem(noPlayerWord(e.name), noPlayerWord(e.content), 'after'))

  return [
    {
      id: uid('wb'),
      name: '基础设定',
      enabled: true,
      collapsed: true,
      items: basicItems,
    },
    {
      id: uid('wb'),
      name: '当前对你的态度',
      enabled: true,
      collapsed: true,
      items: firstItems,
    },
  ]
}

function characterFromAiNpc(npc: AiNpcJson, main: Character, usedAvatarUrls: Set<string>): Character {
  const now = Date.now()
  const interests = (npc.interests || []).slice(0, 5).map(noPlayerWord)
  const painPoints = (npc.painPoints || []).slice(0, 5).map(noPlayerWord)
  const birthdayMD = normalizeBirthdayMD(npc.birthdayMD)
  const gender = parseGender(npc.gender)
  const height = String(npc.height || '').trim()
  const weight = String(npc.weight || '').trim()
  const mottoRaw = noPlayerWord(String(npc.motto || '').trim())
  const motto = mottoRaw.length > 15 ? mottoRaw.slice(0, 15) : mottoRaw
  return {
    id: uid('ch'),
    createdAt: now,
    updatedAt: now,
    name: npc.name || '未命名',
    gender,
    age: Number.isFinite(npc.age) ? npc.age : null,
    height,
    weight,
    birthdayMD,
    zodiac: birthdayMD ? zodiacFromMD(birthdayMD) : '',
    identity: noPlayerWord(npc.occupation || '未知'),
    mbti: npc.mbti || '',
    bio: noPlayerWord(npc.bio || ''),
    motto,
    avatarUrl: pickNpcAvatar(npc, gender, usedAvatarUrls),
    worldBooks: buildWorldBooks(npc),
    generatedForCharacterId: main.id,
    worldBackgroundId: main.worldBackgroundId?.trim() || DEFAULT_WORLD_BACKGROUND_ID,
    interests,
    painPoints,
  }
}

export async function generateNpcNetworkWithAi(
  apiConfig: ApiConfig,
  input: NpcGenerateInput,
): Promise<{ characters: Character[]; relationships: Relationship[]; playerLinks: PlayerNetworkLink[] }> {
  const cfg = apiConfig
  if (!cfg?.apiUrl || !cfg?.apiKey) throw new Error('未配置 AI API')

  const main = input.main
  const mainNameForWb = String(main.name ?? '').trim() || '该角色'
  const wbDump = main.worldBooks
    .filter((w) => w.enabled)
    .map((w) => {
      const lines = w.items
        .filter((it) => it.enabled && String(it.content || '').trim())
        .map((it) =>
          formatWorldBookItemLineForPrompt({
            priority: it.priority,
            name: it.name,
            content: String(it.content).trim(),
            pronounGuide: it.pronounGuide,
            subjectName: mainNameForWb,
            voice: 'character_card',
          }),
        )
        .join('\n')
      return lines ? `${w.name}\n${lines}` : ''
    })
    .filter(Boolean)
    .join('\n\n')

  /** 人脉 NPC 世界书中指「绑定根人设主角」须用的占位符（注入会话时替换为姓名） */
  const mainRootPh = `{{id:${main.id}}}`

  const system = `你是中文小说向角色关系设计师。必须输出且仅输出**分段纯文本**（禁止 JSON、禁止 markdown 代码围栏、禁止解释前言）。

输出骨架（严格按块，可重复）：
===NPC===
姓名：户籍式全名
性别：男/女/其他
年龄：数字
身高：如 170cm
体重：如 55kg
座右铭：<=15字
生日：MM-DD
职业：……
头像分类：必须从下列枚举选一——40岁以上长辈头像男 / 40岁以上长辈头像女 / 微信头像男E型阳光 / 微信头像男I型清冷 / 微信头像女清冷和御姐 / 抽象搞笑男女通用 / 微信头像女可爱活泼
兴趣：恰好3个，用顿号分隔
雷点：恰好2个，用顿号分隔
MBTI：四字母大写
简介：约100字第三人称；凡提绑定档案主角须用「${mainRootPh}」，禁止写汉字姓名「${main.name}」
【基础设定·固定人设】
……（第三人称；NPC本人用{{char}}；玩家身份用{{user}}；档案主角用${mainRootPh}）
【基础设定·背景故事】
……
【基础设定·与主角相识】
……（主角侧全程 ${mainRootPh}）
【基础设定·与用户相识】
……（玩家侧全程 {{user}}）
【当前对你的态度·对你】
……（只写该 NPC 对 {{user}} 的当前态度）

===关系===
from：真实姓名
to：真实姓名
关系词：箭头中间词（语义：to 是 from 的「关系词」）
称呼：from当面怎么叫to（短词）
视角正：【from看to】完整一句，必须出现双方姓名字面，禁用你/我/他/她
视角反：【to看from】完整一句，必须出现双方姓名字面

===玩家连线===
角色：主角名或某NPC姓名
对方看你关系词：……
对方看你：完整一句
对方称呼你：短称呼

数量硬约束：
- ===NPC=== 块数必须等于用户要求的数量。
- 任意发生联系的 A/B：必须分别给 A→B 与 B→A 两条 ===关系===（关系词可不对称）。
- ===玩家连线=== 必须覆盖「主角 ${main.name}」+ 每一个 NPC（条数 = 1 + NPC 数）；只写对方如何看你/称呼你，禁止写你如何看对方。

${NPC_NETWORK_AI_AGE_AND_BIRTHDAY_RULES}

头像分类按性别/年龄/气质选：男清冷内向→男I型清冷；男阳光外向→男E型阳光；女御姐清冷→女清冷和御姐；女元气可爱→女可爱活泼；40+长辈→对应长辈池；沙雕梗→抽象搞笑。

NPC 人设异质性（最高优先级，与姓名铁律并列）：
- **严禁**生成与档案主角「换个名字就算新人」的 NPC：禁止照搬或轻度改写主角的职业、简介、MBTI、兴趣爱好、身高体重组合；每个 NPC 须在「职业定位 / 年龄阶段矛盾 / 叙事功能」上至少一项与主角**显著不同**。
- 禁止把主角的世界书或简介改几个词当作 NPC 简介；禁止「平行主角」式 NPC。

姓名铁律（最高优先级）：
- name 必须是户籍式全名（姓+名），默认 2～4 个汉字；禁止小名/外号/「姓+姐哥叔姨总」当姓名；禁止老师/经理等头衔当姓名。
- 当面怎么叫只写在「称呼 / 对方称呼你」里，禁止写进姓名。

${NPC_AI_HEIGHT_WEIGHT_MOTTO_RULES_CORE}
${npcNetworkAiMottoStyleTail(mainRootPh)}

你与主角区分：
- 正文提档案主角一律「${mainRootPh}」，不得写「${main.name}」；操作者一律「{{user}}」，禁止「玩家」二字。
- 【当前对你的态度】只写对 {{user}}，禁止写成对档案主角。
- 「与主角相识」与「与用户相识」须分开、不可互相替代。

操作者身份一致性：必须完整参考用户消息里的操作者身份全部字段；NPC 对你的看法不得无铺垫反向设定。

【周边NPC / 原著同作关系 · 硬约束】
- 主角世界书若含「周边NPC」等：须落实该配角对 {{user}} / 配角彼此关系，禁止改成互不相识或只挂主角线。

还需包含 NPC 之间合理间接关系，保证全员与主角人设、世界书逻辑自洽。
世界书条目行末若带「本条代词」括注，必须按括注解读「我/你/他」。`

  const user = `【主角人设】
（NPC 世界书/bio 中指该主角须写占位符「${mainRootPh}」，勿写姓名汉字）
姓名：${main.name}
性别：${genderLabelZh(main.gender)}
年龄：${main.age != null && Number.isFinite(main.age) ? `${main.age}岁` : '未知'}
生日：${main.birthdayMD?.trim() ? main.birthdayMD : '未填写'}（未填写时仍请结合简介与世界书推断合理时间线；已填写时请作为 NPC 年龄/生日推算的重要参考）
星座：${main.zodiac?.trim() || '—'}
身份：${main.identity}
MBTI：${main.mbti || '未知'}
简介：${main.bio || '无'}
${input.worldBackgroundSummary?.trim() ? `【世界背景（次于下方世界书；NPC 与关系须与此一致）】\n${input.worldBackgroundSummary.trim()}\n` : ''}
世界书摘要：
${wbDump || '（主角暂无世界书正文，请仍基于姓名身份与世界背景自洽生成）'}

【生成参数】
数量：${input.count}
关系偏向（多选参考）：${input.relationBiases.join('、') || '无'}
补充说明：${input.customNote.trim() || '无'}
输出格式：分段纯文本（===NPC=== / ===关系=== / ===玩家连线===），禁止 JSON。

【操作者身份参考（必须完整参考以下全部字段）】
${input.playerIdentity?.name ? `姓名：${input.playerIdentity.name}` : '姓名：你'}
${input.playerIdentity ? `性别：${genderLabelZh(input.playerIdentity.gender)}` : '性别：未设定'}
${input.playerIdentity?.age != null && Number.isFinite(input.playerIdentity.age) ? `年龄：${input.playerIdentity.age}岁` : '年龄：未设定'}
${input.playerIdentity?.birthdayMD ? `生日：${input.playerIdentity.birthdayMD}` : '生日：未设定'}
${input.playerIdentity?.zodiac ? `星座：${input.playerIdentity.zodiac}` : '星座：未设定'}
${input.playerIdentity?.identity ? `职业/身份：${input.playerIdentity.identity}` : '职业/身份：未设定'}
${input.playerIdentity?.mbti ? `MBTI：${input.playerIdentity.mbti}` : 'MBTI：未设定'}
${input.playerIdentity?.bio ? `简介：${input.playerIdentity.bio}` : '简介：未设定'}
${input.playerIdentity?.interests?.length ? `兴趣爱好：${input.playerIdentity.interests.join('、')}` : '兴趣爱好：未设定'}
${input.playerIdentity?.painPoints?.length ? `雷点：${input.playerIdentity.painPoints.join('、')}` : '雷点：未设定'}
${input.playerIdentity?.worldBooks?.length ? `所有世界书条目：${(() => {
    const idName = String(input.playerIdentity?.name ?? '').trim() || '用户'
    return input.playerIdentity!.worldBooks!
      .map((w) => {
        const wbName = String(w?.name || '未命名世界书')
        const wbEnabled = w?.enabled ? '开启' : '关闭'
        const items = (w?.items || []).map((it) => {
          const itName = String(it?.name || '未命名条目')
          const itEnabled = it?.enabled ? '开启' : '关闭'
          const pr = it?.priority === 'after' ? '尾声延展' : '序言介入'
          const keywords = String(it?.keywords || '')
          const content = String(it?.content || '')
          const ann =
            content.trim() ? worldBookPronounGuideAnnotation(it?.pronounGuide, idName, 'player_identity') : ''
          return `[${wbName}|${wbEnabled}] 条目:${itName} | 状态:${itEnabled} | 优先级:${pr} | 关键词:${keywords || '无'} | 内容:${content || '空'}${ann ? ` ${ann}` : ''}`
        })
        return items.join('；')
      })
      .filter(Boolean)
      .join('；')
  })()}` : '所有世界书条目：未设定'}` 

  const raw = await openAiCompatibleChat(cfg, [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ])

  const payload = parseNpcNetworkPayload(raw)
  if (!payload?.npcs || !Array.isArray(payload.npcs)) throw new Error('AI 返回缺少 NPC 分段')
  if (!payload?.relationships || !Array.isArray(payload.relationships)) {
    throw new Error('AI 返回缺少关系分段')
  }
  const rawPlayerLinks = Array.isArray(payload.playerLinks) ? payload.playerLinks : []

  const nameToCharacter = new Map<string, Character>()
  const characters: Character[] = []
  const usedAvatarUrls = new Set<string>()
  const mainNameKey = normalizeNameKey(main.name)
  const seenNpcNameKeys = new Set<string>()
  const incompleteNames: string[] = []
  for (const n of payload.npcs) {
    const rawName = String((n as AiNpcJson)?.name ?? '').trim()
    if (rawName && isIncompleteNpcLegalName(rawName)) {
      incompleteNames.push(rawName)
      continue
    }
    const npcNameKey = normalizeNameKey(rawName)
    if (!npcNameKey) continue
    // AI 偶发把主角重复生成为 NPC：在落库前直接过滤。
    if (mainNameKey && npcNameKey === mainNameKey) continue
    // 同批生成内按姓名去重，避免重复卡片。
    if (seenNpcNameKeys.has(npcNameKey)) continue
    seenNpcNameKeys.add(npcNameKey)
    const ch = characterFromAiNpc(scrubNpcAnchorsForMain(n as AiNpcJson, main), main, usedAvatarUrls)
    characters.push(ch)
    nameToCharacter.set(ch.name, ch)
  }
  if (incompleteNames.length > 0) {
    throw new Error(
      `人脉 NPC 姓名须为户籍式全名（姓+名），禁止小名/称呼当姓名。不合规：${incompleteNames.join('、')}。请重新生成。`,
    )
  }
  if (characters.length === 0) {
    throw new Error('人脉 NPC 生成结果为空或姓名全部不合规，请重新生成。')
  }
  if (!nameToCharacter.has(main.name)) {
    // 主角不在 npc列表，手动加入映射
    nameToCharacter.set(main.name, main)
  }

  const relationships: Relationship[] = []
  for (const r of payload.relationships) {
    const from = nameToCharacter.get(r.fromName)
    const to = nameToCharacter.get(r.toName)
    if (!from || !to) continue
    relationships.push({
      id: uid('rel'),
      fromCharacterId: from.id,
      toCharacterId: to.id,
      relation: noPlayerWord(r.relation || ''),
      fromPerspective: normalizeRelationPerspective(from.name, to.name, r.fromPerspective),
      toPerspective: normalizeRelationPerspective(to.name, from.name, r.toPerspective),
      fromCallsTo: noPlayerWord(String(r.fromCallsTo ?? '').trim()),
    })
  }

  const expectedNames = new Set<string>([main.name, ...characters.map((c) => c.name)])
  const playerLinks: PlayerNetworkLink[] = []
  for (const pl of rawPlayerLinks) {
    const name = String(pl?.characterName ?? '').trim()
    if (!name || !expectedNames.has(name)) continue
    const ch = nameToCharacter.get(name)
    if (!ch) continue
    playerLinks.push({
      id: uid('pl'),
      characterId: ch.id,
      relationYouToThem: '',
      relationThemToYou: noPlayerWord(pl.relationThemToYou || ''),
      youSeeThem: '',
      theySeeYou: noPlayerWord(pl.theySeeYou || ''),
      youCallThem: '',
      theyCallYou: noPlayerWord(String(pl.theyCallYou ?? '').trim()),
    })
  }

  return { characters, relationships, playerLinks }
}
