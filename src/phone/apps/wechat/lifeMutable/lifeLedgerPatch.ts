/**
 * 主回复同请求内「人生账本」判断/更新（对齐尾声延展 / 私藏侧写模式）
 */

import { personaDb } from '../newFriendsPersona/idb'
import type { Character, PlayerIdentity } from '../newFriendsPersona/types'
import {
  alignLifeSheetToTimeline,
  emptyLifeMutableSheet,
  mergeLifeListFieldsFromAi,
  normalizeLifeMutableSheet,
  resolveLifeClock,
} from './compute'
import { loadCharacterStorySpan } from './load'
import { syncSharedSocialCircleBetweenSheets } from './sharedSocialCircle'
import { finalizeLifeMutableSheetForStore } from './promptRules'
import { appendLifeChangeHistory } from './lifeChangeHistory'
import { parseLifeListSectionsFromText } from './alignTextFormat'
import { buildLifeRelationStatusHardRule } from './lifeRelationSync'
import type { LifeMutableSheet, LifeStorySpan } from './types'

export const LIFE_LEDGER_PATCH_MARKER = '---LIFE_LEDGER_PATCH---'

export const LIFE_LEDGER_PATCH_UPDATED_EVENT = 'phone:life-ledger-patch-updated'

export type LifeLedgerPatchUpdatedEventDetail = {
  appliedPatchCount: number
  changedLabels?: string[]
  /** model_inline=主回复同请求；align=编辑器「按记忆对齐」 */
  source?: 'model_inline' | 'align'
}

export type LifeLedgerSubject = 'character' | 'player'

export type LifeLedgerInlinePatch = {
  subject: LifeLedgerSubject
  /** sheet 字段 overlay + 可选 currentAge */
  changes: Record<string, unknown>
}

const SCALAR_KEYS = new Set([
  'name',
  'gender',
  'genderChangeNote',
  'occupationMain',
  'occupationSide',
  'savings',
  'relationshipStatus',
  'educationTrack',
  'educationNote',
  'extraNote',
  'storyStartDay',
])

const ARRAY_KEYS = new Set(['realEstates', 'vehicles', 'family', 'socialCircle', 'pets'])

const FIELD_ALIASES: Record<string, string> = {
  subject: 'subject',
  主体: 'subject',
  对象: 'subject',
  name: 'name',
  姓名: 'name',
  名字: 'name',
  gender: 'gender',
  性别: 'gender',
  genderChangeNote: 'genderChangeNote',
  性别说明: 'genderChangeNote',
  occupationMain: 'occupationMain',
  主业: 'occupationMain',
  职业: 'occupationMain',
  occupationSide: 'occupationSide',
  副业: 'occupationSide',
  savings: 'savings',
  存款: 'savings',
  资产: 'savings',
  relationshipStatus: 'relationshipStatus',
  感情: 'relationshipStatus',
  感情状态: 'relationshipStatus',
  educationTrack: 'educationTrack',
  学历轨道: 'educationTrack',
  学历: 'educationTrack',
  educationGradeAtStart: 'educationGradeAtStart',
  开篇学年: 'educationGradeAtStart',
  educationNote: 'educationNote',
  学历备注: 'educationNote',
  extraNote: 'extraNote',
  补充: 'extraNote',
  备注: 'extraNote',
  storyStartDay: 'storyStartDay',
  开篇日: 'storyStartDay',
  ageAtStart: 'ageAtStart',
  开篇岁数: 'ageAtStart',
  currentAge: 'currentAge',
  当前年龄: 'currentAge',
  现在几岁: 'currentAge',
  realEstates: 'realEstates',
  房产: 'realEstates',
  住所: 'realEstates',
  可去住所: 'realEstates',
  vehicles: 'vehicles',
  车产: 'vehicles',
  车辆: 'vehicles',
  family: 'family',
  家庭: 'family',
  socialCircle: 'socialCircle',
  社交圈: 'socialCircle',
  人脉: 'socialCircle',
  pets: 'pets',
  宠物: 'pets',
}

function stripOuterFence(raw: string): string {
  const t = String(raw ?? '').trim()
  const m = /^```(?:json|text|markdown)?\s*([\s\S]*?)```$/i.exec(t)
  return (m ? m[1] : t).trim()
}

function normalizeSubject(raw: string): LifeLedgerSubject | null {
  const t = raw.trim().toLowerCase()
  if (!t) return null
  if (
    t === 'character' ||
    t === 'char' ||
    t === '角色' ||
    t === '角色本线' ||
    t === 'npc' ||
    t.includes('角色')
  ) {
    return 'character'
  }
  if (
    t === 'player' ||
    t === 'user' ||
    t === '玩家' ||
    t === '玩家本线' ||
    t === '身份' ||
    t.includes('玩家')
  ) {
    return 'player'
  }
  return null
}

function parseMaybeJson(value: string): unknown {
  const t = value.trim()
  if (!t) return ''
  if ((t.startsWith('[') && t.endsWith(']')) || (t.startsWith('{') && t.endsWith('}'))) {
    try {
      return JSON.parse(t) as unknown
    } catch {
      return t
    }
  }
  if (/^\d{1,3}$/.test(t)) return Number(t)
  if (t === 'true') return true
  if (t === 'false') return false
  return t
}

function mergeSheetFromAiObject(prev: LifeMutableSheet, obj: Record<string, unknown>): LifeMutableSheet {
  const keys = new Set(Object.keys(obj))
  const parsed = normalizeLifeMutableSheet({ ...prev, ...obj })
  const next: LifeMutableSheet = { ...prev }
  for (const k of SCALAR_KEYS) {
    if (keys.has(k)) (next as unknown as Record<string, unknown>)[k] = parsed[k as keyof LifeMutableSheet]
  }
  if (keys.has('educationGradeAtStart')) next.educationGradeAtStart = parsed.educationGradeAtStart
  const lists = mergeLifeListFieldsFromAi(prev, parsed, keys)
  next.realEstates = lists.realEstates
  next.vehicles = lists.vehicles
  next.family = lists.family
  next.socialCircle = lists.socialCircle
  next.pets = lists.pets
  if (keys.has('storyStartDay') && parsed.storyStartDay.trim()) next.storyStartDay = parsed.storyStartDay
  if (keys.has('ageAtStart') && parsed.ageAtStart != null) next.ageAtStart = parsed.ageAtStart
  return next
}

function describeSheetDiff(before: LifeMutableSheet, after: LifeMutableSheet): string[] {
  const labels: [keyof LifeMutableSheet, string][] = [
    ['name', '姓名'],
    ['gender', '性别'],
    ['genderChangeNote', '性别说明'],
    ['occupationMain', '主业'],
    ['occupationSide', '副业'],
    ['savings', '存款'],
    ['relationshipStatus', '感情'],
    ['educationTrack', '学历轨道'],
    ['educationGradeAtStart', '开篇学年'],
    ['educationNote', '学历备注'],
    ['extraNote', '补充'],
    ['ageAtStart', '开篇岁数'],
    ['storyStartDay', '开篇日'],
  ]
  const out: string[] = []
  for (const [k, zh] of labels) {
    if (JSON.stringify(before[k]) !== JSON.stringify(after[k])) out.push(zh)
  }
  if (JSON.stringify(before.realEstates) !== JSON.stringify(after.realEstates)) out.push('住所')
  if (JSON.stringify(before.vehicles) !== JSON.stringify(after.vehicles)) out.push('车产')
  if (JSON.stringify(before.family) !== JSON.stringify(after.family)) out.push('家庭')
  if (JSON.stringify(before.socialCircle) !== JSON.stringify(after.socialCircle)) out.push('社交圈')
  if (JSON.stringify(before.pets) !== JSON.stringify(after.pets)) out.push('宠物')
  return out
}

function applyCurrentAgeToSheet(params: {
  sheet: LifeMutableSheet
  currentAge: number
  birthdayMD?: string | null
  span: LifeStorySpan
}): LifeMutableSheet {
  const { sheet, currentAge, birthdayMD, span } = params
  if (!(currentAge >= 0 && currentAge <= 130)) return sheet
  const clock = resolveLifeClock(sheet.storyStartDay, span)
  const anchor = clock.startDay || span.startDay
  if (!anchor) return sheet
  return alignLifeSheetToTimeline({
    sheet,
    cardAge: currentAge,
    birthdayMD: birthdayMD ?? undefined,
    startDay: anchor,
    nowDay: clock.nowDay || span.nowDay,
    mode: 'cardAsNow',
    keepExistingStart: true,
  })
}

export function buildLifeLedgerPatchOutputAppendix(opts?: {
  hasPlayerLine?: boolean
}): string {
  const playerHint = opts?.hasPlayerLine !== false
    ? `
可对角色本线与玩家本线各交一块；玩家本线 subject 必须写 player。`
    : `
本会话无绑定玩家身份时，只交角色本线（subject：character）。`

  return `
---------------------
【同一回复内必须追加：人生账本·判断标记（开关已开时每轮必交；禁止 JSON / 代码围栏 / Markdown）】
写完全部可见聊天与其它补丁段后，另起一行输出（必须完全一致）：
${LIFE_LEDGER_PATCH_MARKER}

① 无实质更新（本轮剧情未改变当前姓名/年龄/性别/职业/资产/学历/感情/住所车产/家庭社交圈宠物等）：
   [LIFE_LEDGER]
status：无变化

② 有更新：每个主体一块（可重复），只写**有证据要改或要新增**的字段；禁止无依据编造，但**有明确剧情/聊天事实时必须入库（含新增家人/人脉/住所/车产）**。
列表用 @@段名 + 以“-”开头的条目行，字段用 键=值、分号分隔（与「按记忆对齐」同格式；**禁止 JSON 数组**）。
[LIFE_LEDGER_PATCH]
subject：character
occupationMain：新主业
savings：约50万
relationshipStatus：自由短句（按证据自拟，如「暗恋还没说破」）
currentAge：28
@@family
- name=真实姓名；relation=父亲；gender=男；age=50；occupationOrSchool=具体岗位；residence=具体地址；livesWithSubject=否
@@socialCircle
- name=真实姓名；relation=大学同学；gender=女；age=21；occupationOrSchool=…；residence=…；attitude=…
@@realEstates
- label=学校宿舍；placeKind=dorm；location=虚构市+区+校名+楼栋房间；ownedBySubject=否；isPrimary=是；valueWan=
@@vehicles
- model=无；note=无车产；valueWan=

字段可用英文键或中文别名：
subject / 主体（character=角色本线，player=玩家本线）
name/姓名，gender/性别，occupationMain/主业，occupationSide/副业，
savings/存款，relationshipStatus/感情，educationTrack/学历轨道，educationNote/学历备注，
extraNote/补充，currentAge/当前年龄（有「现在几岁」证据时写数字，由系统反推开篇岁数）
列表段名：@@realEstates|@@住所、@@vehicles|@@车产、@@family|@@家庭、@@socialCircle|@@社交圈、@@pets|@@宠物
- **允许且鼓励新增**：线上/线下本轮出现**明确新事实**（新具名家人、新朋友/同事、新可去住所、新车、新宠物等）时，**必须**写出对应 @@ 段并**追加**新条目；禁止因为「列表里已经有几条」就写 status：无变化。
- **旧条目默认保留**：无证据表明搬走/删友/卖车时，不要丢掉旧人旧房；可只交「本轮新出现的条目」（系统会与旧表合并追加），也可交「旧+新」整段。
- **禁止清空**。没看清原名就不要输出该 @@ 段。
车产项必须含 model；社交圈/家庭项必须含 name。住所 location 须「虚构市+区+具体校名或路门牌+楼栋+房间号」；**禁止**「某」占位与无依据默认城。
布尔写 是/否。placeKind：home|dorm|rent|family|work|other。
**共同好友**：角色与玩家两边社交圈若出现同名人，其学校/职业/住址/年龄/生日/性别必须一致（仅 relation/attitude/note 可不同）。
${playerHint}
规则：
- 建档卡开篇岁数/旧职业视为过去；只登记剧情「现在」。
- 学年：每年 9 月升段；9 月前勿提前写成下一学年。occupation 年级须与学历推算及近端明示的「现在」一致；世界书开篇年级不得压过近端已更新的大四/大二等表述。校名须具体虚构专名。
- 地址/校名/单位禁止「某／某某／××」糊弄写法；宿舍必须带楼栋号与房间号；禁止照抄提示词样板地名。
- 共同社交对象客观事实禁止角色侧与玩家侧各写一套学校。
- 标量字段没有证据不要写；**列表**：本轮未出现新人/新房/新车时可省略 @@ 段；一旦出现明确新事实 → 必须输出对应 @@ 段并新增，禁止用「无变化」糊弄。
${buildLifeRelationStatusHardRule()}
- 本段不得进入可见聊天气泡。
---------------------
`.trim()
}

function isNoChangeBody(src: string): boolean {
  const t = src.trim()
  if (!t) return false
  if (/^(无变化|无更新|不变|没有变化|无需更新)\s*$/u.test(t)) return true
  if (/\[LIFE_LEDGER\]/i.test(t) && /无变化|无更新|unchanged|no[_ ]?change/i.test(t) && !/\[LIFE_LEDGER_PATCH\]/i.test(t)) {
    return true
  }
  if (/status\s*[:：]\s*(无变化|无更新|unchanged|no[_ ]?change)/i.test(t) && !/\[LIFE_LEDGER_PATCH\]/i.test(t)) {
    return true
  }
  return false
}

function parseKvLines(block: string): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  const lists = parseLifeListSectionsFromText(block)
  if (lists.realEstates) out.realEstates = lists.realEstates
  if (lists.vehicles) out.vehicles = lists.vehicles
  if (lists.family) out.family = lists.family
  if (lists.socialCircle) out.socialCircle = lists.socialCircle
  if (lists.pets) out.pets = lists.pets

  const lines = block.replace(/\r\n/g, '\n').split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || /^\[/.test(trimmed) || /^@@/.test(trimmed) || /^[-•*]/.test(trimmed)) continue
    const m = /^([^：:]+)[：:]([\s\S]*)$/.exec(trimmed)
    if (!m) continue
    const rawKey = m[1]!.trim().replace(/\s+/g, '')
    const canon = FIELD_ALIASES[rawKey] || FIELD_ALIASES[rawKey.toLowerCase()]
    if (!canon || canon === 'subject') continue
    const rawVal = (m[2] ?? '').trim()
    if (canon === 'currentAge' || canon === 'ageAtStart' || canon === 'educationGradeAtStart') {
      if (/^\d{1,3}$/.test(rawVal)) out[canon] = Number(rawVal)
      continue
    }
    if (ARRAY_KEYS.has(canon)) {
      // 列表优先走 @@ 段；仍兼容旧版「键：JSON数组」一行
      if (out[canon]) continue
      const val = parseMaybeJson(rawVal)
      if (Array.isArray(val)) out[canon] = val
      continue
    }
    if (SCALAR_KEYS.has(canon) || canon === 'educationGradeAtStart' || canon === 'ageAtStart') {
      out[canon] = parseMaybeJson(rawVal)
    }
  }
  return out
}

function parseSubjectFromBlock(block: string): LifeLedgerSubject | null {
  const lines = block.replace(/\r\n/g, '\n').split('\n')
  for (const line of lines) {
    const m = /^(subject|主体|对象)\s*[：:]\s*(.+)$/i.exec(line.trim())
    if (!m) continue
    return normalizeSubject(m[2] ?? '')
  }
  return null
}

export function parseLifeLedgerPatchBody(raw: string): {
  ok: boolean
  patches: LifeLedgerInlinePatch[]
} {
  const src = stripOuterFence(raw)
  if (!src.trim()) return { ok: false, patches: [] }
  if (isNoChangeBody(src)) return { ok: true, patches: [] }

  const patches: LifeLedgerInlinePatch[] = []
  const parts = src.split(/\[LIFE_LEDGER_PATCH\]/i)
  for (let i = 1; i < parts.length; i++) {
    const block = parts[i] ?? ''
    const subject = parseSubjectFromBlock(block) ?? 'character'
    const changes = parseKvLines(block)
    // 去掉误入的 subject 键
    delete changes.subject
    if (!Object.keys(changes).length) continue
    patches.push({ subject, changes })
  }

  if (patches.length) return { ok: true, patches }

  // 兼容：无块头但有 status 无变化
  if (isNoChangeBody(src)) return { ok: true, patches: [] }

  // 兼容旧 JSON：{ "patches": [ { "subject", ...fields } ] } 或 { "character": {...}, "player": {...} }
  try {
    const start = src.indexOf('{')
    const end = src.lastIndexOf('}')
    if (start >= 0 && end > start) {
      const obj = JSON.parse(src.slice(start, end + 1)) as Record<string, unknown>
      if (obj.noChange === true || obj['无变化'] === true) return { ok: true, patches: [] }
      if (Array.isArray(obj.patches)) {
        for (const row of obj.patches) {
          if (!row || typeof row !== 'object') continue
          const r = row as Record<string, unknown>
          const subject = normalizeSubject(String(r.subject ?? r['主体'] ?? 'character')) ?? 'character'
          const { subject: _s, 主体: _z, ...rest } = r
          if (!Object.keys(rest).length) continue
          patches.push({ subject, changes: rest })
        }
        if (patches.length || obj.patches.length === 0) return { ok: true, patches }
      }
      const charObj = obj.character ?? obj['角色']
      const playerObj = obj.player ?? obj['玩家']
      if (charObj && typeof charObj === 'object') {
        patches.push({ subject: 'character', changes: charObj as Record<string, unknown> })
      }
      if (playerObj && typeof playerObj === 'object') {
        patches.push({ subject: 'player', changes: playerObj as Record<string, unknown> })
      }
      if (patches.length) return { ok: true, patches }
    }
  } catch {
    /* ignore */
  }

  return { ok: false, patches: [] }
}

/**
 * 从模型输出中移除 LIFE_LEDGER 段。
 * judged=true：分隔行存在且结构可识别（含「无变化」或至少一块有效补丁）。
 */
export function extractLifeLedgerPatchBlock(raw: string): {
  rest: string
  patches: LifeLedgerInlinePatch[]
  judged: boolean
} {
  const src = String(raw ?? '')
  const marker = '---LIFE_LEDGER_PATCH---'
  const idx = src.indexOf(marker)
  if (idx < 0) return { rest: src, patches: [], judged: false }

  const head = src.slice(0, idx)
  const tail = src.slice(idx + marker.length).trimStart()

  const cutMarkers = [
    '---WB_AFTER_PATCH---',
    '---OBS---',
    '---OBS_NOTES_PATCH---',
    '<<<DATING_UNIFIED_MEMORY>>>',
    '<<<DATING_UNIFIED_MEMORY_JSON>>>',
    '---LIFE_LEDGER_PATCH---',
  ]
  let cut = tail.length
  for (const m of cutMarkers) {
    const i = tail.indexOf(m)
    if (i >= 0 && i < cut) cut = i
  }
  const section = tail.slice(0, cut)
  const afterSection = tail.slice(cut)

  const { ok, patches } = parseLifeLedgerPatchBody(section)
  const rest =
    head.trimEnd() +
    (afterSection ? (head.endsWith('\n') ? '' : '\n') + afterSection.trimStart() : '')
  return { rest, patches, judged: ok }
}

/** 删剧情 / 重生时回滚用：本轮落库前两侧账本快照 + 本轮补丁 */
export type LifeLedgerPlotRevert = {
  characterId: string
  playerIdentityId: string
  /** 本轮补丁落库前的角色本线快照（有角色补丁时必有） */
  characterSheetBefore?: LifeMutableSheet
  /** 本轮补丁落库前的玩家本线快照（有玩家补丁时必有） */
  playerSheetBefore?: LifeMutableSheet
  patches: LifeLedgerInlinePatch[]
}

function cloneLifeSheet(sheet: LifeMutableSheet): LifeMutableSheet {
  return JSON.parse(JSON.stringify(sheet)) as LifeMutableSheet
}

function parseCurrentAgeFromChanges(changes: Record<string, unknown>): number | null {
  const ageRaw = changes.currentAge
  if (typeof ageRaw === 'number' && Number.isFinite(ageRaw)) return Math.round(ageRaw)
  if (typeof ageRaw === 'string' && /^\d{1,3}$/.test(ageRaw.trim())) return Number(ageRaw.trim())
  return null
}

/** 纯内存合并（供写库与删改后重放共用） */
export function mergeLifeLedgerInlinePatchesOntoSheets(params: {
  characterSheet: LifeMutableSheet
  playerSheet: LifeMutableSheet
  patches: LifeLedgerInlinePatch[]
  characterBirthdayMD?: string | null
  playerBirthdayMD?: string | null
  span: LifeStorySpan
}): { characterSheet: LifeMutableSheet; playerSheet: LifeMutableSheet } {
  let characterSheet = params.characterSheet
  let playerSheet = params.playerSheet
  const span = params.span

  for (const p of params.patches.filter((x) => x.subject === 'character')) {
    characterSheet = mergeSheetFromAiObject(characterSheet, p.changes)
    const currentAge = parseCurrentAgeFromChanges(p.changes)
    if (currentAge != null) {
      characterSheet = applyCurrentAgeToSheet({
        sheet: characterSheet,
        currentAge,
        birthdayMD: params.characterBirthdayMD,
        span,
      })
    }
  }
  {
    const clock = resolveLifeClock(characterSheet.storyStartDay, span)
    characterSheet = finalizeLifeMutableSheetForStore(characterSheet, {
      startDay: clock.startDay || span.startDay,
      nowDay: clock.nowDay || span.nowDay,
    })
  }

  for (const p of params.patches.filter((x) => x.subject === 'player')) {
    playerSheet = mergeSheetFromAiObject(playerSheet, p.changes)
    const currentAge = parseCurrentAgeFromChanges(p.changes)
    if (currentAge != null) {
      playerSheet = applyCurrentAgeToSheet({
        sheet: playerSheet,
        currentAge,
        birthdayMD: params.playerBirthdayMD,
        span,
      })
    }
  }
  {
    const clock = resolveLifeClock(playerSheet.storyStartDay, span)
    playerSheet = finalizeLifeMutableSheetForStore(playerSheet, {
      startDay: clock.startDay || span.startDay,
      nowDay: clock.nowDay || span.nowDay,
    })
  }

  return { characterSheet, playerSheet }
}

export async function applyLifeLedgerInlinePatches(params: {
  character: Character
  playerIdentity: PlayerIdentity | null | undefined
  patches: LifeLedgerInlinePatch[]
}): Promise<{
  applied: boolean
  changedLabels: string[]
  appliedCount: number
  revert?: LifeLedgerPlotRevert
}> {
  const character = params.character
  const cid = character.id?.trim()
  if (!cid || !params.patches.length) {
    return { applied: false, changedLabels: [], appliedCount: 0 }
  }

  const span = await loadCharacterStorySpan(cid)
  const changedLabels: string[] = []
  let appliedCount = 0

  const charPatches = params.patches.filter((p) => p.subject === 'character')
  const playerPatches = params.patches.filter((p) => p.subject === 'player')
  const pid = params.playerIdentity?.id?.trim() || ''

  const charRowBefore = await personaDb.getCharacterLifeMutable(cid)
  const characterSheetBefore = cloneLifeSheet(charRowBefore?.sheet ?? emptyLifeMutableSheet())
  const playerRowBefore =
    pid ? await personaDb.getPlayerLifeMutable(pid, cid) : null
  const playerSheetBefore = cloneLifeSheet(playerRowBefore?.sheet ?? emptyLifeMutableSheet())

  let latestChar: LifeMutableSheet | null = null
  let latestPlayer: LifeMutableSheet | null = null

  if (charPatches.length) {
    const before = characterSheetBefore
    let sheet = cloneLifeSheet(before)
    const merged = mergeLifeLedgerInlinePatchesOntoSheets({
      characterSheet: sheet,
      playerSheet: playerSheetBefore,
      patches: charPatches,
      characterBirthdayMD: character.birthdayMD,
      playerBirthdayMD: params.playerIdentity?.birthdayMD,
      span,
    })
    sheet = merged.characterSheet
    latestChar = sheet
    const diff = describeSheetDiff(before, sheet)
    if (diff.length) {
      sheet = appendLifeChangeHistory(sheet, {
        before,
        summary: `同请求同步 · ${diff.join('、')}`,
        source: 'inline',
      })
      latestChar = sheet
      await personaDb.putCharacterLifeMutable(cid, sheet)
      changedLabels.push(...diff.map((x) => `角色·${x}`))
      appliedCount += 1
    }
  }

  if (playerPatches.length && pid) {
    const before = playerSheetBefore
    let sheet = cloneLifeSheet(before)
    const merged = mergeLifeLedgerInlinePatchesOntoSheets({
      characterSheet: latestChar ?? characterSheetBefore,
      playerSheet: sheet,
      patches: playerPatches,
      characterBirthdayMD: character.birthdayMD,
      playerBirthdayMD: params.playerIdentity?.birthdayMD,
      span,
    })
    sheet = merged.playerSheet
    latestPlayer = sheet
    const diff = describeSheetDiff(before, sheet)
    if (diff.length) {
      sheet = appendLifeChangeHistory(sheet, {
        before,
        summary: `同请求同步 · ${diff.join('、')}`,
        source: 'inline',
      })
      latestPlayer = sheet
      await personaDb.putPlayerLifeMutable(pid, cid, sheet)
      changedLabels.push(...diff.map((x) => `玩家·${x}`))
      appliedCount += 1
    }
  }

  // 有任一侧更新时，把同名共同好友的客观事实同步到两边
  if (pid && (latestChar || latestPlayer || appliedCount > 0)) {
    try {
      const charRow = latestChar
        ? { sheet: latestChar }
        : await personaDb.getCharacterLifeMutable(cid)
      const playerRow = latestPlayer
        ? { sheet: latestPlayer }
        : await personaDb.getPlayerLifeMutable(pid, cid)
      const charSheet = charRow?.sheet
      const playerSheet = playerRow?.sheet
      if (charSheet && playerSheet) {
        const beforeChar = charSheet
        const beforePlayer = playerSheet
        const synced = syncSharedSocialCircleBetweenSheets(charSheet, playerSheet)
        if (synced.syncedNames.length) {
          const names = synced.syncedNames.slice(0, 4).join('/')
          const nextChar = appendLifeChangeHistory(synced.character, {
            before: beforeChar,
            summary: `共同社交圈 · ${names}`,
            source: 'sync_circle',
          })
          const nextPlayer = appendLifeChangeHistory(synced.player, {
            before: beforePlayer,
            summary: `共同社交圈 · ${names}`,
            source: 'sync_circle',
          })
          await personaDb.putCharacterLifeMutable(cid, nextChar)
          await personaDb.putPlayerLifeMutable(pid, cid, nextPlayer)
          changedLabels.push(`共同社交圈·${synced.syncedNames.slice(0, 4).join('/')}`)
          appliedCount += 1
        }
      }
    } catch {
      /* ignore sync failures */
    }
  }

  const revert: LifeLedgerPlotRevert | undefined =
    appliedCount > 0 && pid
      ? {
          characterId: cid,
          playerIdentityId: pid,
          characterSheetBefore: charPatches.length ? characterSheetBefore : undefined,
          playerSheetBefore: playerPatches.length ? playerSheetBefore : undefined,
          patches: params.patches.filter((p) =>
            p.subject === 'character'
              ? charPatches.length > 0
              : p.subject === 'player'
                ? playerPatches.length > 0 && !!pid
                : false,
          ),
        }
      : undefined

  return {
    applied: appliedCount > 0,
    changedLabels: [...new Set(changedLabels)],
    appliedCount,
    revert,
  }
}
