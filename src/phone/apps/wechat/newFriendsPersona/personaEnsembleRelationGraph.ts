import type { ApiConfig } from '../../api/types'
import { openAiCompatibleChat } from './ai'
import { emitWeChatStorageChanged, personaDb } from './idb'
import { uid } from './utils'
import type { Character, PlayerNetworkLink, Relationship } from './types'

function pickStr(v: unknown, max: number): string {
  if (typeof v !== 'string') return ''
  return v.trim().slice(0, max)
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

function slotId(kind: 'R' | 'N', index: number): string {
  return `${kind}${index}`
}

function buildSlotMap(romance: Character[], npcs: Character[]): Map<string, Character> {
  const map = new Map<string, Character>()
  romance.forEach((ch, i) => map.set(slotId('R', i), ch))
  npcs.forEach((ch, i) => map.set(slotId('N', i), ch))
  return map
}

function resolveSlot(
  raw: unknown,
  slots: Map<string, Character>,
  byName: Map<string, Character>,
): Character | null {
  const key = String(raw ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')
  if (slots.has(key)) return slots.get(key) ?? null
  const name = String(raw ?? '').trim()
  if (!name) return null
  return byName.get(name) ?? null
}

async function replaceRelationshipsAmong(memberIds: string[], next: Relationship[]): Promise<void> {
  const pack = new Set(memberIds.map((x) => x.trim()).filter(Boolean))
  if (!pack.size) return
  const existing = await personaDb.listAllRelationships()
  for (const r of existing) {
    if (pack.has(r.fromCharacterId) && pack.has(r.toCharacterId)) {
      await personaDb.deleteRelationshipById(r.id)
    }
  }
  if (next.length) await personaDb.bulkPutRelationships(next)
}

function playerLinkFromAi(characterId: string, row: Record<string, unknown>): PlayerNetworkLink {
  return {
    id: uid('pl'),
    characterId,
    relationYouToThem: '',
    relationThemToYou: pickStr(row.relationThemToYou ?? row.relation, 24) || '认识',
    youSeeThem: '',
    theySeeYou: pickStr(row.theySeeYou ?? row.theySee, 400),
    youCallThem: '',
    theyCallYou: pickStr(row.theyCallYou ?? row.callYou, 24),
  }
}

/**
 * 多人卡落库后：按真实姓名补全角色↔角色双向关系，以及每人「对方看你」的玩家连线。
 * 不新建角色，只写关系图（与单人卡人脉 AI 的「关系 / 玩家连线」对齐）。
 */
export async function fillEnsembleRelationshipGraph(params: {
  apiConfig: ApiConfig
  romance: Character[]
  npcs: Character[]
  packTitle: string
  premise: string
  playerDisplayName: string
  signal?: AbortSignal
}): Promise<{ relationshipCount: number; playerLinkRoots: number }> {
  const romance = params.romance.filter((c) => c.id.trim())
  const npcs = params.npcs.filter((c) => c.id.trim())
  const people = [...romance, ...npcs]
  if (people.length < 2) return { relationshipCount: 0, playerLinkRoots: 0 }

  const slots = buildSlotMap(romance, npcs)
  const rosterLines = [
    ...romance.map(
      (c, i) =>
        `${slotId('R', i)} 可攻略 ${c.name || '未命名'}（${c.gender === 'male' ? '男' : c.gender === 'female' ? '女' : '其他'}；${c.identity || '身份未知'}）简介：${(c.bio || '').slice(0, 120)}`,
    ),
    ...npcs.map(
      (c, i) =>
        `${slotId('N', i)} NPC ${c.name || '未命名'}（${c.gender === 'male' ? '男' : c.gender === 'female' ? '女' : '其他'}；${c.identity || '身份未知'}）简介：${(c.bio || '').slice(0, 80)}`,
    ),
  ]

  const sys = `你是多人卡关系图设计师。只输出一个 JSON，不要解释。
已有角色名单不得改名、不得新增人。用槽位号 R0/N0 指人。
字段：
- relationships: 数组。每条无向对写成一条：from, to, relation（from 看 to 的关系词）, relationBack（to 看 from 的关系词，可与 relation 不同）, fromPerspective（from 对 to 的看法，一句，须出现双方姓名）, toPerspective（to 对 from 的看法，一句，须出现双方姓名）, fromCallsTo（from 当面叫 to）, toCallsFrom（to 当面叫 from）
- playerLinks: 数组。覆盖名单上每一个人。who 为槽位号；relationThemToYou（ta 是你的什么）；theySeeYou（ta 现在怎么看玩家「${params.playerDisplayName || '你'}」，一句）；theyCallYou（ta 怎么称呼玩家）
硬性：
- 所有可攻略彼此必须两两有关系（不要有人互相当空气）。
- 每个 NPC 至少连到 2 名可攻略（主持/导演连全员也可以）。
- 可攻略彼此平等，禁止全员是某一人的跟班。
- 看法要有温差：有竞争、有防备、有欣赏，不要全员同一句「还行」。
- 禁止用你/我/他/她代替姓名写 fromPerspective / toPerspective。`

  const user = [
    `节目：${params.packTitle || '多人卡'}`,
    params.premise.trim() ? `背景：${params.premise.trim().slice(0, 800)}` : '',
    '名单：',
    ...rosterLines,
    `玩家：${params.playerDisplayName || '你'}`,
  ]
    .filter(Boolean)
    .join('\n')

  const text = await openAiCompatibleChat(
    params.apiConfig,
    [
      { role: 'system', content: sys },
      { role: 'user', content: user },
    ],
    { signal: params.signal, response_format: 'json_object', max_tokens: 4000 },
  )
  const obj = extractJsonObject(text)
  if (!obj) throw new Error('关系图生成失败：没有可解析的 JSON')

  const byName = new Map<string, Character>()
  for (const ch of people) {
    const n = ch.name.trim()
    if (n) byName.set(n, ch)
  }

  const relRaw = Array.isArray(obj.relationships) ? obj.relationships : []
  const rels: Relationship[] = []
  const seenPair = new Set<string>()
  for (const row of relRaw) {
    if (!row || typeof row !== 'object') continue
    const r = row as Record<string, unknown>
    const from = resolveSlot(r.from, slots, byName)
    const to = resolveSlot(r.to, slots, byName)
    if (!from || !to || from.id === to.id) continue
    const key = [from.id, to.id].sort().join('\t')
    if (seenPair.has(key)) continue
    seenPair.add(key)
    const relation = pickStr(r.relation, 24) || '认识'
    const relationBack = pickStr(r.relationBack, 24) || relation
    const fromP = pickStr(r.fromPerspective, 400)
    const toP = pickStr(r.toPerspective, 400)
    const fromCall = pickStr(r.fromCallsTo, 24)
    const toCall = pickStr(r.toCallsFrom ?? r.toCallsTo, 24)
    rels.push({
      id: uid('rel'),
      fromCharacterId: from.id,
      toCharacterId: to.id,
      relation,
      fromPerspective: fromP,
      toPerspective: toP,
      fromCallsTo: fromCall,
    })
    rels.push({
      id: uid('rel'),
      fromCharacterId: to.id,
      toCharacterId: from.id,
      relation: relationBack,
      fromPerspective: toP,
      toPerspective: fromP,
      fromCallsTo: toCall,
    })
  }

  const memberIds = people.map((c) => c.id)
  if (rels.length) await replaceRelationshipsAmong(memberIds, rels)

  const linkRaw = Array.isArray(obj.playerLinks) ? obj.playerLinks : []
  const linkByCharId = new Map<string, PlayerNetworkLink>()
  for (const row of linkRaw) {
    if (!row || typeof row !== 'object') continue
    const r = row as Record<string, unknown>
    const who = resolveSlot(r.who ?? r.character ?? r.name, slots, byName)
    if (!who) continue
    linkByCharId.set(who.id, playerLinkFromAi(who.id, r))
  }

  for (const root of romance) {
    const links: PlayerNetworkLink[] = []
    for (const other of people) {
      if (other.id === root.id) continue
      const fromAi = linkByCharId.get(other.id)
      links.push(
        fromAi
          ? { ...fromAi, id: uid('pl'), characterId: other.id }
          : playerLinkFromAi(other.id, { relationThemToYou: '认识', theySeeYou: '', theyCallYou: '' }),
      )
    }
    await personaDb.putPlayerNetworkLinks(root.id, links)
  }

  emitWeChatStorageChanged()
  return { relationshipCount: rels.length, playerLinkRoots: romance.length }
}
