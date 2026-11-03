import type { ApiConfig } from '../../api/types'
import { openAiCompatibleChat } from './ai'
import type { Character, Gender, PersonaPackPremiseKind } from './types'
import { personaPackPremiseLabel } from './personaPack'

export type EnsembleGenerateDraft = {
  title: string
  premiseKind: PersonaPackPremiseKind
  premise: string
  sharedRules: string
  romance: Array<{
    name: string
    gender: Gender
    identity: string
    bio: string
    relationToUser: string
    interests?: string[]
    painPoints?: string[]
  }>
  npcs: Array<{
    name: string
    gender: Gender
    identity: string
    bio: string
  }>
  relations: Array<{
    fromRomanceIndex?: number
    toRomanceIndex?: number
    fromNpcIndex?: number
    toNpcIndex?: number
    relation: string
    fromPerspective?: string
    toPerspective?: string
    fromCallsTo?: string
  }>
}

function parseGender(raw: unknown): Gender {
  const s = String(raw ?? '').trim().toLowerCase()
  if (s === 'male' || s === '男' || s === 'm') return 'male'
  if (s === 'female' || s === '女' || s === 'f') return 'female'
  if (s === 'other' || s === '其他') return 'other'
  return 'female'
}

function pickStr(v: unknown, max: number): string {
  if (typeof v !== 'string') return ''
  return v.trim().slice(0, max)
}

function pickStrList(v: unknown, maxItems: number, maxLen: number): string[] {
  if (!Array.isArray(v)) return []
  return v
    .filter((x): x is string => typeof x === 'string')
    .map((x) => x.trim().slice(0, maxLen))
    .filter(Boolean)
    .slice(0, maxItems)
}

function extractJsonObject(text: string): Record<string, unknown> | null {
  const raw = String(text ?? '').trim()
  if (!raw) return null
  const tryParse = (s: string) => {
    try {
      const v = JSON.parse(s) as unknown
      return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null
    } catch {
      return null
    }
  }
  const direct = tryParse(raw)
  if (direct) return direct
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fenced?.[1]) {
    const inner = tryParse(fenced[1].trim())
    if (inner) return inner
  }
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start >= 0 && end > start) return tryParse(raw.slice(start, end + 1))
  return null
}

export async function generateEnsemblePackWithAi(params: {
  apiConfig: ApiConfig
  premiseKind: PersonaPackPremiseKind
  titleHint: string
  premiseHint: string
  extraHint: string
  romanceCount: number
  npcCount: number
  playerDisplayName: string
  signal?: AbortSignal
}): Promise<EnsembleGenerateDraft> {
  const kindLabel = personaPackPremiseLabel(params.premiseKind)
  const romanceCount = Math.min(8, Math.max(2, params.romanceCount))
  const npcCount = Math.min(8, Math.max(0, params.npcCount))
  const sys = `你是演出卡策划。一次产出一张「多人卡」：可攻略席 + 可选 NPC 席 + 共用规则。
只输出一个 JSON 对象，不要 Markdown 解释。
字段：
- title 短标题
- sharedRules 节目/世界共用规则（淘汰、禁联系、公开镜头 vs 私下等），200–600 字
- romance 数组，长度必须为 ${romanceCount}。每项：name, gender(male|female|other), identity 身份职位, bio 80–160字人设, relationToUser 与玩家开局关系, interests 最多3个短词, painPoints 最多2个短词
- npcs 数组，长度必须为 ${npcCount}。每项：name, gender, identity, bio 40–100字。主持/导演/路人村民等，默认不可攻略
- relations 可少写几条作草稿（后续会再专画关系图）；有则用下标 fromRomanceIndex / toRomanceIndex / fromNpcIndex / toNpcIndex（0 起）
硬性：可攻略对象彼此平等，不要写成一个人的跟班；NPC 不要写成可攻略主线；不要全员同一性格。玩家称呼为「${params.playerDisplayName || '你'}」。`

  const user = [
    `卡种：${kindLabel}`,
    params.titleHint.trim() ? `标题倾向：${params.titleHint.trim()}` : '',
    params.premiseHint.trim() ? `背景：${params.premiseHint.trim()}` : `请自拟贴合「${kindLabel}」的背景。`,
    params.extraHint.trim() ? `额外要求：${params.extraHint.trim()}` : '',
    `可攻略人数：${romanceCount}；NPC人数：${npcCount}`,
  ]
    .filter(Boolean)
    .join('\n')

  const text = await openAiCompatibleChat(
    params.apiConfig,
    [
      { role: 'system', content: sys },
      { role: 'user', content: user },
    ],
    { signal: params.signal, response_format: 'json_object', max_tokens: 3500 },
  )
  const obj = extractJsonObject(text)
  if (!obj) throw new Error('多人卡生成失败：模型没有返回可解析的 JSON')

  const romanceRaw = Array.isArray(obj.romance) ? obj.romance : []
  const npcRaw = Array.isArray(obj.npcs) ? obj.npcs : []
  const relRaw = Array.isArray(obj.relations) ? obj.relations : []

  const romance = romanceRaw.slice(0, romanceCount).map((row) => {
    const r = row && typeof row === 'object' ? (row as Record<string, unknown>) : {}
    return {
      name: pickStr(r.name, 16) || '未命名',
      gender: parseGender(r.gender),
      identity: pickStr(r.identity, 32),
      bio: pickStr(r.bio, 400),
      relationToUser: pickStr(r.relationToUser, 120),
      interests: pickStrList(r.interests, 3, 12),
      painPoints: pickStrList(r.painPoints, 2, 16),
    }
  })
  while (romance.length < romanceCount) {
    romance.push({
      name: `选手${romance.length + 1}`,
      gender: 'female',
      identity: '',
      bio: '',
      relationToUser: '',
      interests: [],
      painPoints: [],
    })
  }

  const npcs = npcRaw.slice(0, npcCount).map((row) => {
    const r = row && typeof row === 'object' ? (row as Record<string, unknown>) : {}
    return {
      name: pickStr(r.name, 16) || 'NPC',
      gender: parseGender(r.gender),
      identity: pickStr(r.identity, 32),
      bio: pickStr(r.bio, 240),
    }
  })
  while (npcs.length < npcCount) {
    npcs.push({ name: `NPC${npcs.length + 1}`, gender: 'other', identity: '', bio: '' })
  }

  const relations: EnsembleGenerateDraft['relations'] = []
  for (const row of relRaw) {
    if (!row || typeof row !== 'object') continue
    const r = row as Record<string, unknown>
    const num = (k: string) => {
      const n = Number(r[k])
      return Number.isInteger(n) && n >= 0 ? n : undefined
    }
    relations.push({
      fromRomanceIndex: num('fromRomanceIndex'),
      toRomanceIndex: num('toRomanceIndex'),
      fromNpcIndex: num('fromNpcIndex'),
      toNpcIndex: num('toNpcIndex'),
      relation: pickStr(r.relation, 24) || '认识',
      fromPerspective: pickStr(r.fromPerspective, 200),
      toPerspective: pickStr(r.toPerspective, 200),
      fromCallsTo: pickStr(r.fromCallsTo, 16),
    })
  }

  for (let i = 0; i < romance.length; i++) {
    const rel = romance[i]!.relationToUser.trim()
    if (!rel) continue
    romance[i] = {
      ...romance[i]!,
      bio: romance[i]!.bio.trim()
        ? `${romance[i]!.bio.trim()}\n对你：${rel}`
        : `对你：${rel}`,
    }
  }

  return {
    title: pickStr(obj.title, 64) || params.titleHint.trim() || kindLabel,
    premiseKind: params.premiseKind,
    premise: pickStr(obj.premise, 2000) || params.premiseHint.trim(),
    sharedRules: pickStr(obj.sharedRules, 4000),
    romance,
    npcs,
    relations,
  }
}

export function ensembleRomanceToPersist(
  rows: EnsembleGenerateDraft['romance'],
): Array<Partial<Pick<Character, 'name' | 'gender' | 'identity' | 'bio' | 'interests' | 'painPoints'>>> {
  return rows.map((r) => ({
    name: r.name,
    gender: r.gender,
    identity: r.identity,
    bio: r.bio,
    interests: r.interests,
    painPoints: r.painPoints,
  }))
}
