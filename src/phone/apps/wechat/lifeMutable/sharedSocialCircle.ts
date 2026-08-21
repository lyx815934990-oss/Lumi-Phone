/**
 * 角色本线 ↔ 玩家本线：同名共同社交对象的客观事实必须一致。
 * relation / attitude / note 可因对主体关系不同而不同。
 */

import type { LifeMutableSheet, LifeSocialContact } from './types'
import { isVagueLifePlaceText } from './promptRules'

const SHARED_FACT_KEYS = [
  'gender',
  'age',
  'ageAtStart',
  'birthdayMD',
  'occupationOrSchool',
  'residence',
] as const

type SharedFactKey = (typeof SHARED_FACT_KEYS)[number]

export function normalizeLifePersonName(name: string): string {
  return String(name ?? '')
    .trim()
    .replace(/\s+/g, '')
    .replace(/[·•．.]/g, '')
    .toLowerCase()
}

function factLooksVague(key: SharedFactKey, value: string): boolean {
  const t = value.trim()
  if (!t) return true
  if (/某|某某|×{1,2}/.test(t)) return true
  if (key === 'occupationOrSchool' || key === 'residence') {
    if (isVagueLifePlaceText(t)) return true
    if (/^(大学|高校|学校|同学|同事|朋友)$/.test(t)) return true
  }
  return false
}

/** 两边都有值时选更具体、更不糊的一侧；同等则偏向前置（角色侧作锚） */
export function pickSharedSocialFact(preferred: string, other: string, key: SharedFactKey): string {
  const a = preferred.trim()
  const b = other.trim()
  if (!a) return b
  if (!b) return a
  const vagueA = factLooksVague(key, a)
  const vagueB = factLooksVague(key, b)
  if (vagueA && !vagueB) return b
  if (!vagueA && vagueB) return a
  if (b.length >= a.length + 4) return b
  return a
}

function unifyContactFacts(anchor: LifeSocialContact, other: LifeSocialContact): LifeSocialContact {
  const next: LifeSocialContact = { ...other }
  for (const key of SHARED_FACT_KEYS) {
    next[key] = pickSharedSocialFact(anchor[key], other[key], key)
  }
  return next
}

function applyUnifiedFacts(contact: LifeSocialContact, facts: Pick<LifeSocialContact, SharedFactKey>): LifeSocialContact {
  return {
    ...contact,
    gender: facts.gender,
    age: facts.age,
    ageAtStart: facts.ageAtStart,
    birthdayMD: facts.birthdayMD,
    occupationOrSchool: facts.occupationOrSchool,
    residence: facts.residence,
  }
}

/**
 * 按姓名对齐两边社交圈的客观事实（学校/职业/住址/年龄/生日/性别）。
 * 返回改写后的两份账本，以及被同步的姓名列表。
 */
export function syncSharedSocialCircleBetweenSheets(
  characterSheet: LifeMutableSheet,
  playerSheet: LifeMutableSheet,
): { character: LifeMutableSheet; player: LifeMutableSheet; syncedNames: string[] } {
  const charMap = new Map<string, LifeSocialContact>()
  for (const c of characterSheet.socialCircle) {
    const key = normalizeLifePersonName(c.name)
    if (key) charMap.set(key, c)
  }
  const playerMap = new Map<string, LifeSocialContact>()
  for (const c of playerSheet.socialCircle) {
    const key = normalizeLifePersonName(c.name)
    if (key) playerMap.set(key, c)
  }

  const sharedKeys = [...charMap.keys()].filter((k) => playerMap.has(k))
  if (!sharedKeys.length) {
    return { character: characterSheet, player: playerSheet, syncedNames: [] }
  }

  const unifiedByKey = new Map<string, Pick<LifeSocialContact, SharedFactKey>>()
  const syncedNames: string[] = []
  for (const key of sharedKeys) {
    const charC = charMap.get(key)!
    const playerC = playerMap.get(key)!
    const unified = unifyContactFacts(charC, playerC)
    const facts: Pick<LifeSocialContact, SharedFactKey> = {
      gender: unified.gender,
      age: unified.age,
      ageAtStart: unified.ageAtStart,
      birthdayMD: unified.birthdayMD,
      occupationOrSchool: unified.occupationOrSchool,
      residence: unified.residence,
    }
    const changed = SHARED_FACT_KEYS.some(
      (k) => charC[k].trim() !== facts[k].trim() || playerC[k].trim() !== facts[k].trim(),
    )
    if (changed) syncedNames.push(charC.name.trim() || playerC.name.trim() || key)
    unifiedByKey.set(key, facts)
  }

  if (!syncedNames.length) {
    return { character: characterSheet, player: playerSheet, syncedNames: [] }
  }

  return {
    character: {
      ...characterSheet,
      socialCircle: characterSheet.socialCircle.map((c) => {
        const k = normalizeLifePersonName(c.name)
        const facts = unifiedByKey.get(k)
        return facts ? applyUnifiedFacts(c, facts) : c
      }),
    },
    player: {
      ...playerSheet,
      socialCircle: playerSheet.socialCircle.map((c) => {
        const k = normalizeLifePersonName(c.name)
        const facts = unifiedByKey.get(k)
        return facts ? applyUnifiedFacts(c, facts) : c
      }),
    },
    syncedNames,
  }
}

/** 注入对齐/生成提示：对方账本里的社交圈客观事实 */
export function formatCounterpartSocialCircleBlock(
  counterpart: LifeMutableSheet | null | undefined,
  label: string,
): string {
  const list = counterpart?.socialCircle ?? []
  if (!list.length) {
    return `【${label}社交圈】\n（暂无；若本账本写出共同好友，须自洽具体校名/职业/住址）`
  }
  const lines = list.slice(0, 24).map((c, i) => {
    const bits = [
      c.name.trim() || '（无名）',
      c.gender.trim() ? `性别 ${c.gender.trim()}` : '',
      c.age.trim() ? `现在${c.age.trim()}岁` : '',
      c.ageAtStart.trim() ? `开篇${c.ageAtStart.trim()}岁` : '',
      c.birthdayMD.trim() ? `生日 ${c.birthdayMD.trim()}` : '',
      c.occupationOrSchool.trim() ? `学校/职业 ${c.occupationOrSchool.trim()}` : '',
      c.residence.trim() ? `住址 ${c.residence.trim()}` : '',
    ].filter(Boolean)
    return `${i + 1}. ${bits.join('｜')}`
  })
  return [
    `【${label}社交圈·客观事实锚点】`,
    '同名共同好友的性别/年龄/生日/学校或职业/住址必须与下列完全一致；relation/attitude/note 可按对本主体关系改写。',
    '禁止同人同名却写成不同学校/不同单位。',
    ...lines,
  ].join('\n')
}

export function buildSharedSocialCircleConsistencyRule(): string {
  return `【共同社交圈一致性 · 硬】
- 角色本线与玩家本线若出现**同名**社交对象（共同好友/共同同学等），其客观事实必须两边一致：gender、age、ageAtStart、birthdayMD、occupationOrSchool、residence。
- 允许不同的仅有：relation、attitude、note（因「对角色」与「对玩家」关系可以不同）。
- 禁止同一个人在角色账本读 B 校、在玩家账本读 C 校；学校/单位/住址专名必须同一套。
- 生成或改写时：先定共同好友的唯一客观档案，再分别写入两边社交圈。`
}
