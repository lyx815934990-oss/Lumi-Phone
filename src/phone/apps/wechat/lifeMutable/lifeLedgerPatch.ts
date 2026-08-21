/**
 * 主回复同请求内「人生账本」判断/更新（对齐尾声延展 / 私藏侧写模式）
 */

import { personaDb } from '../newFriendsPersona/idb'
import type { Character, PlayerIdentity } from '../newFriendsPersona/types'
import {
  alignLifeSheetToTimeline,
  emptyLifeMutableSheet,
  normalizeLifeMutableSheet,
  resolveLifeClock,
} from './compute'
import { loadCharacterStorySpan } from './load'
import { syncSharedSocialCircleBetweenSheets } from './sharedSocialCircle'
import { finalizeLifeMutableSheetForStore } from './promptRules'
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
  if (keys.has('realEstates')) next.realEstates = parsed.realEstates
  if (keys.has('vehicles')) next.vehicles = parsed.vehicles
  if (keys.has('family')) next.family = parsed.family
  if (keys.has('socialCircle')) next.socialCircle = parsed.socialCircle
  if (keys.has('pets')) next.pets = parsed.pets
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
【同一回复内必须追加：人生账本·判断标记（开关已开时每轮必交；禁止 JSON / 代码围栏）】
写完全部可见聊天与其它补丁段后，另起一行输出（必须完全一致）：
${LIFE_LEDGER_PATCH_MARKER}

① 无实质更新（本轮剧情未改变当前姓名/年龄/性别/职业/资产/学历/感情/住所车产/家庭社交圈宠物等）：
   [LIFE_LEDGER]
status：无变化

② 有更新：每个主体一块（可重复），只写**有证据要改**的字段；禁止编造。
[LIFE_LEDGER_PATCH]
subject：character
occupationMain：新主业
savings：约50万
relationshipStatus：热恋
currentAge：28

字段可用英文键或中文别名：
subject / 主体（character=角色本线，player=玩家本线）
name/姓名，gender/性别，occupationMain/主业，occupationSide/副业，
savings/存款，relationshipStatus/感情，educationTrack/学历轨道，educationNote/学历备注，
extraNote/补充，currentAge/当前年龄（有「现在几岁」证据时写数字，由系统反推开篇岁数）
住所/车产/家庭/社交圈/宠物若改，整表用一行 JSON 数组（无把握则整键省略，禁止清空）。
住所项可含 label/placeKind/ownedBySubject/isPrimary/location（location 须「虚构市+区+具体校名或路门牌+楼栋+房间号」；**禁止**某高校/某大学/某小区及任何「某」占位；勿用现实一线省会名除非剧情已写；**勿套固定示范城市，按证据自行新编**）；家庭项可含 name(真实姓名，禁X父/X母)/relation(父亲母亲等)/age/residence（同粒度，禁「某」）；社交圈项可含 name/relation(短称呼)/age/residence/attitude(关系补充长描述)/note。
**共同好友**：角色与玩家两边社交圈若出现同名人，其学校/职业/住址/年龄/生日/性别必须一致（仅 relation/attitude/note 可不同）。
${playerHint}
规则：
- 建档卡开篇岁数/旧职业视为过去；只登记剧情「现在」。
- 学年：每年 9 月升段；9 月前勿提前写成下一学年（如 8 月仍是大一）。occupation 年级须与学历推算一致；校名须具体虚构专名。
- 地址/校名/单位禁止「某／某某／××」糊弄写法；宿舍必须带楼栋号与房间号；禁止照抄提示词样板地名。
- 共同社交对象客观事实禁止角色侧与玩家侧各写一套学校。
- 没有证据的字段不要写。
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
  const lines = block.replace(/\r\n/g, '\n').split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || /^\[/.test(trimmed)) continue
    const m = /^([^：:]+)[：:]([\s\S]*)$/.exec(trimmed)
    if (!m) continue
    const rawKey = m[1]!.trim().replace(/\s+/g, '')
    const canon = FIELD_ALIASES[rawKey] || FIELD_ALIASES[rawKey.toLowerCase()]
    if (!canon || canon === 'subject') continue
    const val = parseMaybeJson(m[2] ?? '')
    if (canon === 'currentAge' || canon === 'ageAtStart' || canon === 'educationGradeAtStart') {
      if (typeof val === 'number') out[canon] = val
      else if (typeof val === 'string' && /^\d{1,3}$/.test(val.trim())) out[canon] = Number(val.trim())
      continue
    }
    if (ARRAY_KEYS.has(canon)) {
      out[canon] = val
      continue
    }
    if (SCALAR_KEYS.has(canon) || canon === 'educationGradeAtStart' || canon === 'ageAtStart') {
      out[canon] = val
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

export async function applyLifeLedgerInlinePatches(params: {
  character: Character
  playerIdentity: PlayerIdentity | null | undefined
  patches: LifeLedgerInlinePatch[]
}): Promise<{ applied: boolean; changedLabels: string[]; appliedCount: number }> {
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

  let latestChar: LifeMutableSheet | null = null
  let latestPlayer: LifeMutableSheet | null = null

  if (charPatches.length) {
    const row = await personaDb.getCharacterLifeMutable(cid)
    let sheet = row?.sheet ?? emptyLifeMutableSheet()
    const before = sheet
    for (const p of charPatches) {
      sheet = mergeSheetFromAiObject(sheet, p.changes)
      const ageRaw = p.changes.currentAge
      const currentAge =
        typeof ageRaw === 'number' && Number.isFinite(ageRaw)
          ? Math.round(ageRaw)
          : typeof ageRaw === 'string' && /^\d{1,3}$/.test(ageRaw.trim())
            ? Number(ageRaw.trim())
            : null
      if (currentAge != null) {
        sheet = applyCurrentAgeToSheet({
          sheet,
          currentAge,
          birthdayMD: character.birthdayMD,
          span,
        })
      }
    }
    {
      const clock = resolveLifeClock(sheet.storyStartDay, span)
      sheet = finalizeLifeMutableSheetForStore(sheet, {
        startDay: clock.startDay || span.startDay,
        nowDay: clock.nowDay || span.nowDay,
      })
    }
    latestChar = sheet
    const diff = describeSheetDiff(before, sheet)
    if (diff.length) {
      await personaDb.putCharacterLifeMutable(cid, sheet)
      changedLabels.push(...diff.map((x) => `角色·${x}`))
      appliedCount += 1
    }
  }

  const pid = params.playerIdentity?.id?.trim()
  if (playerPatches.length && pid) {
    const row = await personaDb.getPlayerLifeMutable(pid, cid)
    let sheet = row?.sheet ?? emptyLifeMutableSheet()
    const before = sheet
    for (const p of playerPatches) {
      sheet = mergeSheetFromAiObject(sheet, p.changes)
      const ageRaw = p.changes.currentAge
      const currentAge =
        typeof ageRaw === 'number' && Number.isFinite(ageRaw)
          ? Math.round(ageRaw)
          : typeof ageRaw === 'string' && /^\d{1,3}$/.test(ageRaw.trim())
            ? Number(ageRaw.trim())
            : null
      if (currentAge != null) {
        sheet = applyCurrentAgeToSheet({
          sheet,
          currentAge,
          birthdayMD: params.playerIdentity?.birthdayMD,
          span,
        })
      }
    }
    {
      const clock = resolveLifeClock(sheet.storyStartDay, span)
      sheet = finalizeLifeMutableSheetForStore(sheet, {
        startDay: clock.startDay || span.startDay,
        nowDay: clock.nowDay || span.nowDay,
      })
    }
    latestPlayer = sheet
    const diff = describeSheetDiff(before, sheet)
    if (diff.length) {
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
        const synced = syncSharedSocialCircleBetweenSheets(charSheet, playerSheet)
        if (synced.syncedNames.length) {
          await personaDb.putCharacterLifeMutable(cid, synced.character)
          await personaDb.putPlayerLifeMutable(pid, cid, synced.player)
          changedLabels.push(`共同社交圈·${synced.syncedNames.slice(0, 4).join('/')}`)
          appliedCount += 1
        }
      }
    } catch {
      /* ignore sync failures */
    }
  }

  return {
    applied: appliedCount > 0,
    changedLabels: [...new Set(changedLabels)],
    appliedCount,
  }
}
