/**
 * AI 人设生成后：二次请求补全「角色本线 + 玩家本线」开局人生账本。
 * 输出为紧凑纯文本标记（非 JSON），降低 token；截断时已写出的行仍可解析。
 */

import type { ApiConfig } from '../../api/types'
import { openAiCompatibleChat } from './ai'
import type { PersonaAiGenerateForm } from './personaAiGenerateTypes'
import type { Character, PlayerIdentity } from './types'
import { genderLabelZh } from './utils'
import {
  PERSONA_AI_NPC_ROSTER_ENTRY_NAME,
  PERSONA_AI_RELATIONSHIP_HISTORY_ENTRY_NAME,
} from './personaAiWorldBooks'
import {
  emptyLifeMutableSheet,
  normalizeLifeMutableSheet,
} from '../lifeMutable/compute'
import {
  buildLifeLedgerAddressAndAcademicRules,
  finalizeLifeMutableSheetForStore,
} from '../lifeMutable/promptRules'
import {
  buildSharedSocialCircleConsistencyRule,
  syncSharedSocialCircleBetweenSheets,
} from '../lifeMutable/sharedSocialCircle'
import type { LifeEducationTrack, LifeMutableSheet } from '../lifeMutable/types'

function clip(s: string, max: number): string {
  const t = String(s ?? '').trim()
  if (t.length <= max) return t
  return `${t.slice(0, max)}…`
}

function pickWorldBookSnippet(character: Character, names: string[], maxEach = 360): string {
  const books = character.worldBooks ?? []
  const lines: string[] = []
  for (const name of names) {
    let body = ''
    for (const wb of books) {
      if (wb.enabled === false) continue
      const hit = (wb.items ?? []).find((it) => String(it.name ?? '').trim() === name)
      if (!hit || hit.enabled === false) continue
      body = String(hit.content ?? '').trim()
      if (body) break
    }
    if (!body) continue
    lines.push(`【${name}】\n${clip(body, maxEach)}`)
  }
  return lines.join('\n\n')
}

/** 玩家身份卡：家庭/兄弟姊妹等事实须进账本提示（开屏生成此前几乎没喂世界书） */
function pickPlayerIdentityFamilySocialEvidence(player: PlayerIdentity | null | undefined): string {
  if (!player) return ''
  const lines: string[] = []
  if (player.bio?.trim()) lines.push(`简介：${clip(player.bio, 280)}`)

  const preferName =
    /家庭|家人|人际|秘密|名片|周边|亲属|父母|兄|弟|姐|妹|社交|人脉|身世|背景|性格|能力与日常/
  const kinInText = /妹妹|姐姐|哥哥|弟弟|兄妹|姐弟|父母|父亲|母亲|家人|亲属|兄弟|姐妹/
  const preferred: string[] = []
  const fallback: string[] = []
  for (const wb of player.worldBooks ?? []) {
    if (wb.enabled === false) continue
    const wbName = String(wb.name ?? '').trim() || '世界书'
    for (const it of wb.items ?? []) {
      if (it.enabled === false) continue
      const name = String(it.name ?? '').trim()
      const content = String(it.content ?? '').trim()
      if (!content) continue
      const block = `【${wbName} · ${name || '条目'}】\n${clip(content, 420)}`
      const hit = preferName.test(name) || preferName.test(wbName) || kinInText.test(content)
      if (hit) preferred.push(block)
      else fallback.push(block)
    }
  }
  // 优先亲属相关条目；若筛不到（条目名不规范）则退回前若干条世界书，避免身份卡事实完全丢失
  const chunks = (preferred.length ? preferred : fallback).slice(0, 10)
  if (chunks.length) lines.push(...chunks)
  if (!lines.length) return ''
  return [
    '【玩家身份 · 家庭/社交事实（硬依据）】',
    '下列内容来自用户身份卡；写 ===玩家=== 的【家庭】【社交】时必须落实已点名的亲属（如妹妹、哥哥、弟弟等），禁止漏写或改成无关路人。',
    '角色账本【家庭】不要写玩家的家人；若剧情上玩家家人也认识角色，可写入双方【社交】且同名人客观信息一致。',
    ...lines,
  ].join('\n')
}

function genderForSheet(g: Character['gender'] | '' | undefined): LifeMutableSheet['gender'] {
  if (g === 'male' || g === 'female' || g === 'other') return g
  return ''
}

function seedSheetFromCard(card: Character, extras?: Partial<LifeMutableSheet>): LifeMutableSheet {
  return normalizeLifeMutableSheet({
    ...emptyLifeMutableSheet(),
    name: card.name?.trim() || '',
    gender: genderForSheet(card.gender),
    occupationMain: card.identity?.trim() || '',
    ageAtStart: typeof card.age === 'number' && Number.isFinite(card.age) ? Math.round(card.age) : null,
    ...extras,
  })
}

/** 用户提示里只塞必要种子，不 dump 空数组 JSON */
function compactSeedLines(sheet: LifeMutableSheet): string {
  const g =
    sheet.gender === 'male' ? '男' : sheet.gender === 'female' ? '女' : sheet.gender === 'other' ? '其他' : ''
  return [
    sheet.name ? `姓名：${sheet.name}` : '',
    g ? `性别：${g}` : '',
    sheet.ageAtStart != null ? `开篇年龄：${sheet.ageAtStart}` : '',
    sheet.occupationMain ? `主业：${sheet.occupationMain}` : '',
    sheet.relationshipStatus ? `感情：${sheet.relationshipStatus}` : '',
  ]
    .filter(Boolean)
    .join('\n')
}

function sheetBrief(sheet: LifeMutableSheet): string {
  const bits = [
    sheet.name && `姓名 ${sheet.name}`,
    sheet.occupationMain && `主业 ${sheet.occupationMain}`,
    sheet.relationshipStatus && `感情 ${sheet.relationshipStatus}`,
    sheet.family.length ? `家庭 ${sheet.family.length}人` : '',
    sheet.socialCircle.length ? `社交 ${sheet.socialCircle.length}人` : '',
    sheet.realEstates.length ? `住所 ${sheet.realEstates.length}` : '',
    sheet.vehicles.length ? `车产 ${sheet.vehicles.length}` : '',
  ].filter(Boolean)
  return bits.join(' · ') || '（空表）'
}

export type PersonaAiLifeLedgers = {
  characterLifeSheet: LifeMutableSheet
  playerLifeSheet: LifeMutableSheet | null
}

/** 供预览一行摘要 */
export function summarizePersonaAiLifeLedgers(ledgers: PersonaAiLifeLedgers | null | undefined): string {
  if (!ledgers?.characterLifeSheet) return ''
  const charLine = `角色：${sheetBrief(ledgers.characterLifeSheet)}`
  if (!ledgers.playerLifeSheet) return charLine
  return `${charLine}\n玩家本线：${sheetBrief(ledgers.playerLifeSheet)}`
}

function parseGenderToken(raw: string): LifeMutableSheet['gender'] {
  const t = raw.trim().toLowerCase()
  if (t === 'male' || t === '男' || t === 'm') return 'male'
  if (t === 'female' || t === '女' || t === 'f') return 'female'
  if (t === 'other' || t === '其他' || t === '其它') return 'other'
  return ''
}

function parseEducationTrack(raw: string): LifeEducationTrack {
  const t = raw.trim()
  if (!t) return ''
  if (t === 'junior_high' || /初中/.test(t)) return 'junior_high'
  if (t === 'high_school' || /高中/.test(t)) return 'high_school'
  if (t === 'undergrad' || /本科|大学|大专/.test(t)) return 'undergrad'
  if (t === 'master' || /硕士|研究生|研/.test(t)) return 'master'
  if (t === 'phd' || /博士|博/.test(t)) return 'phd'
  if (t === 'working' || /在职|工作|已工作|社会/.test(t)) return 'working'
  if (t === 'other' || /其他|其它/.test(t)) return 'other'
  return ''
}

function parseBoolToken(raw: string): boolean {
  const t = raw.trim().toLowerCase()
  return t === '1' || t === 'true' || t === '是' || t === '主' || t === 'yes' || t === 'y'
}

function splitPipeRow(line: string): string[] {
  return line.split('|').map((c) => c.trim())
}

const LIST_HEADERS: Record<string, 'realEstates' | 'vehicles' | 'family' | 'socialCircle' | 'pets'> = {
  住所: 'realEstates',
  房产: 'realEstates',
  车: 'vehicles',
  车辆: 'vehicles',
  车产: 'vehicles',
  家庭: 'family',
  家人: 'family',
  社交: 'socialCircle',
  社交圈: 'socialCircle',
  宠物: 'pets',
}

function parseSheetMarkupBlock(block: string): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  const realEstates: Record<string, unknown>[] = []
  const vehicles: Record<string, unknown>[] = []
  const family: Record<string, unknown>[] = []
  const socialCircle: Record<string, unknown>[] = []
  const pets: Record<string, unknown>[] = []

  let listKey: 'realEstates' | 'vehicles' | 'family' | 'socialCircle' | 'pets' | null = null

  const pushList = (cells: string[]) => {
    if (!listKey || !cells.some((c) => c)) return
    if (listKey === 'realEstates') {
      // 标签|类型|产权本人|主居|地址|户型|备注
      const [label, placeKind, owned, primary, location, layout, note] = cells
      if (!label && !location) return
      realEstates.push({
        label: label || '',
        placeKind: placeKind || '',
        ownedBySubject: parseBoolToken(owned || ''),
        isPrimary: parseBoolToken(primary || ''),
        location: location || '',
        layout: layout || '',
        note: note || '',
      })
      return
    }
    if (listKey === 'vehicles') {
      // 型号|备注
      const [model, note] = cells
      if (!model) return
      vehicles.push({ model, note: note || '' })
      return
    }
    if (listKey === 'family') {
      // 姓名|关系|性别|年龄|生日|职业|住址|同住
      const [name, relation, gender, age, birthdayMD, occupationOrSchool, residence, livesWith] = cells
      if (!name && !relation) return
      family.push({
        name: name || '',
        relation: relation || '',
        gender: gender || '',
        age: age || '',
        ageAtStart: age || '',
        birthdayMD: birthdayMD || '',
        occupationOrSchool: occupationOrSchool || '',
        residence: residence || '',
        livesWithSubject: parseBoolToken(livesWith || ''),
        alive: true,
      })
      return
    }
    if (listKey === 'socialCircle') {
      // 姓名|关系|性别|年龄|生日|职业|住址|态度
      const [name, relation, gender, age, birthdayMD, occupationOrSchool, residence, attitude] = cells
      if (!name) return
      socialCircle.push({
        name,
        relation: relation || '',
        gender: gender || '',
        age: age || '',
        ageAtStart: age || '',
        birthdayMD: birthdayMD || '',
        occupationOrSchool: occupationOrSchool || '',
        residence: residence || '',
        attitude: attitude || '',
        note: '',
      })
      return
    }
    if (listKey === 'pets') {
      // 种|名|年龄|入手
      const [species, name, age, acquiredAt] = cells
      if (!species && !name) return
      pets.push({
        species: species || '',
        name: name || '',
        age: age || '',
        acquiredAt: acquiredAt || '',
        acquiredPlace: '',
      })
    }
  }

  for (const rawLine of block.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line) continue

    const bracket = /^【\s*([^】]+?)\s*】$/.exec(line)
    const colonHead = /^([^：:\n]{1,12})\s*[：:]\s*$/.exec(line)
    const headName = (bracket?.[1] || colonHead?.[1] || '').trim()
    if (headName && LIST_HEADERS[headName]) {
      listKey = LIST_HEADERS[headName]!
      continue
    }

    // 「住所：宿舍|…」同行写法
    const inlineList = /^([^：:\n]{1,12})\s*[：:]\s*(.+)$/.exec(line)
    if (inlineList && LIST_HEADERS[inlineList[1]!.trim()]) {
      listKey = LIST_HEADERS[inlineList[1]!.trim()]!
      const rest = inlineList[2]!.trim()
      if (rest.includes('|') || listKey === 'vehicles') pushList(splitPipeRow(rest))
      continue
    }

    if (listKey && line.includes('|')) {
      pushList(splitPipeRow(line))
      continue
    }
    if (listKey === 'vehicles' && !line.includes('：') && !line.includes(':') && !/^【/.test(line)) {
      pushList([line])
      continue
    }

    // 离开列表模式后的标量
    const kv = /^\s*([^：:\n]{1,16})\s*[：:]\s*(.*)$/.exec(line)
    if (!kv) continue
    listKey = null
    const key = kv[1]!.trim()
    const value = (kv[2] ?? '').trim()
    if (!value) continue

    switch (key) {
      case '姓名':
      case 'name':
        out.name = value
        break
      case '性别':
      case 'gender':
        out.gender = parseGenderToken(value)
        break
      case '开篇年龄':
      case '年龄':
      case 'ageAtStart': {
        const n = Number.parseInt(value.replace(/\D/g, ''), 10)
        if (Number.isFinite(n)) out.ageAtStart = n
        break
      }
      case '开篇日':
      case '故事日':
      case 'storyStartDay':
        out.storyStartDay = value
        break
      case '主业':
      case '职业':
      case 'occupationMain':
        out.occupationMain = value
        break
      case '副业':
      case 'occupationSide':
        out.occupationSide = value
        break
      case '存款':
      case 'savings':
        out.savings = value
        break
      case '感情':
      case '感情状态':
      case 'relationshipStatus':
        out.relationshipStatus = value
        break
      case '学历':
      case '学历轨道':
      case 'educationTrack':
        out.educationTrack = parseEducationTrack(value)
        break
      case '开篇年级':
      case 'educationGradeAtStart': {
        const n = Number.parseInt(value.replace(/\D/g, ''), 10)
        if (Number.isFinite(n)) out.educationGradeAtStart = n
        break
      }
      case '学历备注':
      case 'educationNote':
        out.educationNote = value
        break
      case '备注':
      case 'extraNote':
        out.extraNote = value
        break
      case '性别备注':
      case 'genderChangeNote':
        out.genderChangeNote = value
        break
      default:
        break
    }
  }

  if (realEstates.length) out.realEstates = realEstates
  if (vehicles.length) out.vehicles = vehicles
  if (family.length) out.family = family
  if (socialCircle.length) out.socialCircle = socialCircle
  if (pets.length) out.pets = pets
  return out
}

/** 解析紧凑账本标记；兼容偶发 JSON */
export function parsePersonaAiLifeLedgerMarkup(text: string): {
  character: Record<string, unknown> | null
  player: Record<string, unknown> | null
} {
  const raw = String(text ?? '').trim()
  if (!raw) return { character: null, player: null }

  // JSON 兼容（旧模型仍输出时）
  if (raw.includes('{') && /"character"|"player"|"角色"|"姓名"|"name"/.test(raw)) {
    try {
      const fence = /```(?:json)?\s*([\s\S]*?)```/i.exec(raw)
      const body = (fence ? fence[1] : raw).trim()
      const start = body.indexOf('{')
      const end = body.lastIndexOf('}')
      if (start >= 0 && end > start) {
        const obj = JSON.parse(body.slice(start, end + 1)) as Record<string, unknown>
        const characterRaw =
          (obj.character as Record<string, unknown>) ||
          (obj['角色'] as Record<string, unknown>) ||
          (obj.characterLife as Record<string, unknown>) ||
          null
        const playerRaw =
          (obj.player as Record<string, unknown>) ||
          (obj['玩家'] as Record<string, unknown>) ||
          (obj.playerLife as Record<string, unknown>) ||
          null
        if (characterRaw || playerRaw) {
          return { character: characterRaw, player: playerRaw }
        }
        // 整包即角色表
        if (obj.name || obj.occupationMain || obj.realEstates) {
          return { character: obj, player: null }
        }
      }
    } catch {
      /* fallthrough */
    }
  }

  const sectionRe = /(?:^|\n)\s*(?:===|【)\s*(角色|玩家|character|player)\s*(?:===|】)\s*/gi
  const parts: { who: 'character' | 'player'; body: string }[] = []
  let m: RegExpExecArray | null
  const hits: { who: 'character' | 'player'; index: number; end: number }[] = []
  while ((m = sectionRe.exec(raw)) !== null) {
    const token = m[1]!.toLowerCase()
    const who: 'character' | 'player' = token === '玩家' || token === 'player' ? 'player' : 'character'
    hits.push({ who, index: m.index, end: m.index + m[0].length })
  }

  if (hits.length) {
    for (let i = 0; i < hits.length; i++) {
      const h = hits[i]!
      const bodyEnd = i + 1 < hits.length ? hits[i + 1]!.index : raw.length
      parts.push({ who: h.who, body: raw.slice(h.end, bodyEnd) })
    }
  } else {
    // 无分区头：整段当角色账本
    parts.push({ who: 'character', body: raw })
  }

  let character: Record<string, unknown> | null = null
  let player: Record<string, unknown> | null = null
  for (const p of parts) {
    const parsed = parseSheetMarkupBlock(p.body)
    if (!Object.keys(parsed).length) continue
    if (p.who === 'player') player = parsed
    else character = parsed
  }
  return { character, player }
}

/**
 * 根据已生成人设 + 绑定玩家身份，生成开局人生账本（角色必出；有绑定身份则含玩家本线）。
 */
export async function generatePersonaAiLifeLedgers(params: {
  apiConfig: ApiConfig
  character: Character
  form: PersonaAiGenerateForm
  playerIdentity?: PlayerIdentity | null
  signal?: AbortSignal
}): Promise<PersonaAiLifeLedgers> {
  const cfg = params.apiConfig
  if (!cfg?.apiUrl?.trim() || !cfg?.apiKey?.trim() || !cfg?.modelId?.trim()) {
    throw new Error('未配置 AI API')
  }

  const ch = params.character
  const form = params.form
  const player = params.playerIdentity ?? null
  const hasPlayer = Boolean(player?.id)

  const charSeed = seedSheetFromCard(ch, {
    relationshipStatus: form.relationToUser.trim().includes('恋人')
      ? '恋爱中'
      : form.relationshipHistoryHint.trim() || '',
  })
  const playerSeed = player
    ? seedSheetFromCard(player, {
        relationshipStatus: form.relationToUser.trim() || '',
      })
    : null

  const wbCtx = [
    pickWorldBookSnippet(
      ch,
      [
        '名片基础',
        '人际与秘密',
        PERSONA_AI_NPC_ROSTER_ENTRY_NAME,
        PERSONA_AI_RELATIONSHIP_HISTORY_ENTRY_NAME,
        '对你现在',
      ],
      320,
    ),
    // 相遇羁绊常写明学长/大一等开篇年级，给足篇幅，避免截断丢年级
    pickWorldBookSnippet(ch, ['相遇羁绊'], 720),
  ]
    .filter(Boolean)
    .join('\n\n')

  const playerCardLine = player
    ? [
        `姓名：${player.name || '未命名'}`,
        `性别：${player.gender ? genderLabelZh(player.gender) : '未填'}`,
        `年龄：${player.age ?? '未填'}`,
        `职业：${player.identity || '未填'}`,
        player.bio?.trim() ? `简介：${clip(player.bio, 180)}` : '',
      ]
        .filter(Boolean)
        .join('\n')
    : '（未绑定玩家：勿输出===玩家===）'

  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  const system = `你是人生账本建档员。根据角色档案输出开局「现在」可变人生账本。
**禁止 JSON**、禁止 Markdown 围栏、禁止解释。只用下方紧凑纯文本；能短则短。

【输出格式】
===角色===
姓名：
性别：男|女|其他
开篇年龄：数字
开篇日：YYYY-MM-DD
主业：具体岗位/年级（禁上班族）
副业：
存款：短句
感情：短句
学历：初中|高中|本科|硕士|博士|在职|其他
开篇年级：数字（在职可空；大一=1，大二=2，大三=3…）
学历备注：短句（具体虚构校名，禁「某大学」；年级须与主业一致）
备注：可空

【住所】
标签|类型|产权本人|主居|地址|户型|备注
（类型=home|dorm|rent|family|work|other；产权本人/主居=是|否；地址=虚构市+区+路门牌+楼栋房间；1～2行；学生常宿舍+自家）

【车】
型号|备注
（无车写：无|）

【家庭】
姓名|关系|性别|年龄|生日|职业|住址|同住
（2～4行；姓名真人名禁「爸爸」；同住=是|否；生日如03-12；**玩家侧须含身份卡已写明的兄/姐/弟/妹等亲属**）

【社交】
姓名|关系|性别|年龄|生日|职业|住址|态度
（2～5行；可对齐周边NPC/感情史对象；关系≤8字）

【宠物】
种|名|年龄|入手
（无则整段省略）
${hasPlayer ? '\n===玩家===\n（字段与列表格式同角色；为本角色线独立账本；家庭/社交以玩家身份卡事实为准；年级以相遇羁绊/身份为准）\n' : ''}
规则：
1. 开篇年龄对齐卡面；开篇日可用 ${todayStr}；列表人 age=开篇年龄。
2. 禁「某/某某/××」地名；勿套固定示范城；按人设新编。
3. 禁止把玩家写进角色家庭；共同社交圈同名人两侧基础信息须一致。
4. **身份卡对齐（最高优先）**：若【玩家身份 · 家庭/社交事实】已写明妹妹/哥哥/弟弟/父母等具名或可点名亲属，===玩家===【家庭】必须写出对应条目（有姓名用原名；仅称谓则补合理真名+关系）；禁止用无关父母模板顶替而漏掉已写明的兄弟姐妹。
5. **年级对齐（最高优先）**：【相遇羁绊】/名片等若写角色「大三」、玩家「大一」等，双方主业与开篇年级必须照写；禁止因开局日在暑假就改成大二，或写成「待9月升大一/大二」。暑假仅可注明「暑假在读」，年级本身不变。
6. 只输出标记正文，勿复述种子。

${buildSharedSocialCircleConsistencyRule()}

${buildLifeLedgerAddressAndAcademicRules()}`

  const playerFamilyEvidence = pickPlayerIdentityFamilySocialEvidence(player)

  const user = `【角色卡】
姓名：${ch.name}
性别：${ch.gender ? genderLabelZh(ch.gender) : '未填'}
年龄：${ch.age ?? '未填'}
生日：${ch.birthdayMD || '未填'}
职业：${ch.identity || '未填'}
与玩家：${form.relationToUser.trim() || '普通熟人'}
感情史种子：${clip(form.relationshipHistoryHint.trim() || '（未填）', 120)}

【世界书摘录】
${wbCtx || '（无）'}

【角色种子】
${compactSeedLines(charSeed)}

【玩家身份】
${playerCardLine}
${playerFamilyEvidence ? `\n${playerFamilyEvidence}\n` : ''}
${hasPlayer && playerSeed ? `\n【玩家种子】\n${compactSeedLines(playerSeed)}\n` : ''}
请按格式输出纯文本账本。`

  const raw = await openAiCompatibleChat(
    cfg,
    [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    {
      temperature: 0.35,
      signal: params.signal,
    },
  )

  const { character: characterRaw, player: playerRaw } = parsePersonaAiLifeLedgerMarkup(raw)
  if (!characterRaw && !playerRaw) throw new Error('人生账本标记解析失败')

  let characterLifeSheet = finalizeLifeMutableSheetForStore(
    normalizeLifeMutableSheet({
      ...charSeed,
      ...(characterRaw ?? {}),
    }),
  )
  if (!characterLifeSheet.name.trim()) characterLifeSheet = { ...characterLifeSheet, name: ch.name }
  if (!characterLifeSheet.occupationMain.trim() && ch.identity) {
    characterLifeSheet = finalizeLifeMutableSheetForStore({
      ...characterLifeSheet,
      occupationMain: ch.identity,
    })
  }
  if (characterLifeSheet.ageAtStart == null && typeof ch.age === 'number') {
    characterLifeSheet = {
      ...characterLifeSheet,
      ageAtStart: Math.round(ch.age),
    }
  }
  if (!characterLifeSheet.storyStartDay.trim()) {
    characterLifeSheet = { ...characterLifeSheet, storyStartDay: todayStr }
  }
  characterLifeSheet = finalizeLifeMutableSheetForStore(characterLifeSheet)

  let playerLifeSheet: LifeMutableSheet | null = null
  if (hasPlayer && player) {
    const merged = normalizeLifeMutableSheet({
      ...playerSeed,
      ...(playerRaw ?? {}),
    })
    playerLifeSheet = finalizeLifeMutableSheetForStore({
      ...merged,
      name: merged.name.trim() || player.name || '',
      occupationMain: merged.occupationMain.trim() || player.identity || '',
      ageAtStart:
        merged.ageAtStart ??
        (typeof player.age === 'number' && Number.isFinite(player.age) ? Math.round(player.age) : null),
      gender: merged.gender || genderForSheet(player.gender),
      storyStartDay: merged.storyStartDay.trim() || todayStr,
    })
  }

  if (playerLifeSheet) {
    const synced = syncSharedSocialCircleBetweenSheets(characterLifeSheet, playerLifeSheet)
    characterLifeSheet = synced.character
    playerLifeSheet = synced.player
  }

  return { characterLifeSheet, playerLifeSheet }
}
