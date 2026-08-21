/** 可变人生：按剧情公历推算当前年龄与学历进度。 */

import type { Character, Gender } from '../newFriendsPersona/types'
import { genderLabelZh } from '../newFriendsPersona/utils'
import {
  formatGregorianStoryDayFromMs,
  parseStoryCalendarDayStartMs,
} from '../memory/storyTimelineTypes'
import type {
  LifeEducationTrack,
  LifeMutableSheet,
  LifePayKind,
  LifePlaceKind,
  LifeResolvedSnapshot,
  LifeStorySpan,
} from './types'

export function emptyLifeMutableSheet(): LifeMutableSheet {
  return {
    name: '',
    gender: '',
    genderChangeNote: '',
    occupationMain: '',
    occupationSide: '',
    savings: '',
    relationshipStatus: '',
    educationTrack: '',
    educationGradeAtStart: null,
    educationNote: '',
    realEstates: [],
    vehicles: [],
    family: [],
    socialCircle: [],
    pets: [],
    extraNote: '',
    storyStartDay: '',
    ageAtStart: null,
  }
}

export function lifePlaceKindLabel(kind: LifePlaceKind | string): string {
  switch (kind) {
    case 'home':
      return '自家住所'
    case 'dorm':
      return '学校宿舍'
    case 'rent':
      return '租住'
    case 'family':
      return '家人处'
    case 'work':
      return '工作单位'
    case 'other':
      return '其他'
    default:
      return ''
  }
}

function normalizePlaceKind(raw: unknown): LifePlaceKind {
  const t = String(raw ?? '').trim()
  if (
    t === 'home' ||
    t === 'dorm' ||
    t === 'rent' ||
    t === 'family' ||
    t === 'work' ||
    t === 'other'
  ) {
    return t
  }
  if (/宿舍|dorm/i.test(t)) return 'dorm'
  if (/租|合租|rent/i.test(t)) return 'rent'
  if (/家人|父母|老家|family/i.test(t)) return 'family'
  if (/公司|单位|work/i.test(t)) return 'work'
  if (/家|自住|home/i.test(t)) return 'home'
  return ''
}

/** 把「季父/盛母/爸爸」这类关系称呼从姓名里拆出 */
export function splitFamilyKinshipName(nameRaw: string, relationRaw = ''): { name: string; relation: string } {
  let name = String(nameRaw ?? '').trim()
  let relation = String(relationRaw ?? '').trim()
  if (!name) return { name: '', relation }

  const fullKin =
    /^(?:我的|本人的)?(父亲|母亲|继父|继母|养父|养母|生父|生母|爷爷|奶奶|外公|外婆|伯父|叔父|叔叔|舅舅|姑姑|姨妈|阿姨|哥哥|姐姐|弟弟|妹妹|兄|姐|弟|妹)$/
  const mFull = name.match(fullKin)
  if (mFull) {
    return { name: '', relation: relation || mFull[1]! }
  }

  // 「季父」「盛母」「林爸」：姓 + 父/母/爸/妈
  const mXm = name.match(/^([\u4e00-\u9fff]{1,2})(父|母|爸|妈)$/)
  if (mXm) {
    const kin = mXm[2] === '父' || mXm[2] === '爸' ? '父亲' : '母亲'
    return { name: '', relation: relation || kin }
  }

  // 「父亲·季明远」「母亲 盛婉」
  const mPref = name.match(/^(父亲|母亲|继父|继母|养父|养母|哥哥|姐姐|弟弟|妹妹)[·・\s\-—]+(.+)$/)
  if (mPref) {
    return { name: mPref[2]!.trim(), relation: relation || mPref[1]! }
  }

  return { name, relation }
}

export function makePlayerLifeMutableId(playerIdentityId: string, characterId: string): string {
  return `${playerIdentityId.trim()}::${characterId.trim()}`
}

function parseBirthdayParts(birthdayMD: string | undefined): { month: number; day: number } | null {
  const raw = String(birthdayMD ?? '').trim()
  const m = raw.match(/^(\d{1,2})[-/.](\d{1,2})$/)
  if (!m) return null
  const month = Number(m[1])
  const day = Number(m[2])
  if (!Number.isFinite(month) || !Number.isFinite(day) || month < 1 || month > 12 || day < 1 || day > 31) {
    return null
  }
  return { month, day }
}

/** 账本/开篇日宽松解析：允许「2026年」「2026年3月」「2026-03-01」。 */
export function normalizeLifeStoryDayLabel(raw: string | null | undefined): string | null {
  const t = String(raw ?? '').trim()
  if (!t) return null
  const full = t.match(/(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日?/)
  if (full) return `${full[1]}年${Number(full[2])}月${Number(full[3])}日`
  const ym = t.match(/(\d{4})\s*年\s*(\d{1,2})\s*月/)
  if (ym) return `${ym[1]}年${Number(ym[2])}月1日`
  const y = t.match(/(\d{4})\s*年/)
  if (y) return `${y[1]}年1月1日`
  const iso = t.match(/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/)
  if (iso) return `${iso[1]}年${Number(iso[2])}月${Number(iso[3])}日`
  if (/^\d{4}$/.test(t)) return `${t}年1月1日`
  const ms = parseStoryCalendarDayStartMs(t)
  if (ms != null) return formatGregorianStoryDayFromMs(ms)
  return t.includes('年') ? t : null
}

export function parseLifeStoryDayMs(raw: string | null | undefined): number | null {
  const label = normalizeLifeStoryDayLabel(raw)
  if (!label) return null
  const fromStd = parseStoryCalendarDayStartMs(label)
  if (fromStd != null) return fromStd
  const m = label.match(/^(\d{4})年(\d{1,2})月(\d{1,2})日$/)
  if (!m) return null
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  return Number.isNaN(d.getTime()) ? null : d.getTime()
}

function countBirthdaysInclusive(params: {
  startMs: number
  nowMs: number
  birthdayMD: string
}): number {
  if (params.nowMs < params.startMs) return 0
  const bd = parseBirthdayParts(params.birthdayMD)
  const start = new Date(params.startMs)
  const now = new Date(params.nowMs)
  const bMonth = bd?.month ?? start.getMonth() + 1
  const bDay = bd?.day ?? start.getDate()
  let n = 0
  for (let y = start.getFullYear(); y <= now.getFullYear(); y += 1) {
    const hit = new Date(y, bMonth - 1, bDay).getTime()
    if (hit > params.startMs && hit <= params.nowMs) n += 1
  }
  return n
}

/** 按开篇日周年计算过了几岁（2026-01-01 → 2028-01-01 = 2）。 */
function countStartAnniversaries(startMs: number, nowMs: number): number {
  if (nowMs < startMs) return 0
  const start = new Date(startMs)
  const now = new Date(nowMs)
  let y = now.getFullYear() - start.getFullYear()
  const reached =
    now.getMonth() > start.getMonth() ||
    (now.getMonth() === start.getMonth() && now.getDate() >= start.getDate())
  if (!reached) y -= 1
  return Math.max(0, y)
}

export function computeCurrentAge(params: {
  ageAtStart: number | null | undefined
  birthdayMD?: string
  startDay?: string | null
  nowDay?: string | null
}): number | null {
  const base = params.ageAtStart
  if (typeof base !== 'number' || !Number.isFinite(base)) return null
  const startMs = parseLifeStoryDayMs(params.startDay)
  const nowMs = parseLifeStoryDayMs(params.nowDay)
  if (startMs == null || nowMs == null) return Math.round(base)
  const byAnniversary = countStartAnniversaries(startMs, nowMs)
  const byBirthday = parseBirthdayParts(params.birthdayMD)
    ? countBirthdaysInclusive({
        startMs,
        nowMs,
        birthdayMD: params.birthdayMD ?? '',
      })
    : byAnniversary
  // 有生日时以生日为准；若生日漏算（同日开篇等）而周年已过，取较大值，避免 2026→2028 仍停在开篇岁数。
  const gained = Math.max(byBirthday, byAnniversary)
  return Math.max(0, Math.round(base) + gained)
}

/** 解析「19」「19岁」等为数字年龄 */
export function parseLifeAgeNumber(raw: string | null | undefined): number | null {
  const m = String(raw ?? '')
    .trim()
    .match(/^(\d{1,3})/)
  if (!m) return null
  const n = Number(m[1])
  return Number.isFinite(n) && n >= 0 && n <= 130 ? Math.round(n) : null
}

/**
 * 家庭/社交圈年龄对齐剧情日：
 * - 有开篇年龄 → 推算「现在」写入 age
 * - 仅有 age：视为开篇年龄回填 ageAtStart，再推算现在（修复停在开篇岁数）
 * - AI 只写了现在年龄且已过年：倒推 ageAtStart = 现在 − 过年数
 */
export function syncPeopleAgesToTimeline(
  sheet: LifeMutableSheet,
  startDay: string | null | undefined,
  nowDay: string | null | undefined,
): LifeMutableSheet {
  const years = approxElapsedStoryYears(startDay, nowDay) ?? 0
  const hasClock = Boolean(parseLifeStoryDayMs(startDay) && parseLifeStoryDayMs(nowDay))

  const syncPerson = (age: string, ageAtStart: string, birthdayMD: string) => {
    let startN = parseLifeAgeNumber(ageAtStart)
    const ageN = parseLifeAgeNumber(age)

    if (startN == null && ageN != null) {
      if (hasClock && years > 0 && ageN >= years) {
        // 常见：只填了「现在」→ 倒推开篇；若其实是卡住的开篇岁，倒推后仍会在下方用周年推正
        // 优先把仅有的数字当开篇（历史数据多半停在开篇）
        startN = ageN
      } else {
        startN = ageN
      }
    }

    if (startN == null) {
      return { age, ageAtStart: ageAtStart.trim() }
    }

    // 若开篇未填、但 age 明显像「现在」且与过年数吻合：倒推开篇
    // （例如过了 2 年、age=21、ageAtStart 空 → 开篇 19）
    if (!ageAtStart.trim() && ageN != null && years > 0 && ageN === startN && ageN >= years) {
      // 无法区分「卡住的开篇19」与「已是现在21」：默认按开篇处理（用户痛点是停在19）
    }

    const current = computeCurrentAge({
      ageAtStart: startN,
      birthdayMD,
      startDay,
      nowDay,
    })
    return {
      ageAtStart: String(startN),
      age: current != null ? String(current) : String(startN),
    }
  }

  return {
    ...sheet,
    family: sheet.family.map((f) => {
      const next = syncPerson(f.age, f.ageAtStart ?? '', f.birthdayMD)
      return { ...f, ...next }
    }),
    socialCircle: sheet.socialCircle.map((c) => {
      const next = syncPerson(c.age, c.ageAtStart ?? '', c.birthdayMD)
      return { ...c, ...next }
    }),
  }
}

function academicYearIndex(ms: number): number {
  const d = new Date(ms)
  const y = d.getFullYear()
  const month = d.getMonth() + 1
  return month >= 9 ? y : y - 1
}

const TRACK_LABEL: Record<Exclude<LifeEducationTrack, ''>, string> = {
  junior_high: '初中',
  high_school: '高中',
  undergrad: '大学本科',
  master: '硕士',
  phd: '博士',
  working: '已工作（非在读）',
  other: '其他',
}

function gradeName(track: LifeEducationTrack, grade: number): string {
  if (track === 'junior_high') return `初${['一', '二', '三'][grade - 1] ?? grade}`
  if (track === 'high_school') return `高${['一', '二', '三'][grade - 1] ?? grade}`
  if (track === 'undergrad') return `大${['一', '二', '三', '四'][grade - 1] ?? grade}`
  if (track === 'master') return `研${['一', '二', '三'][grade - 1] ?? grade}`
  if (track === 'phd') return `博${['一', '二', '三', '四'][grade - 1] ?? grade}`
  return `${grade}年级`
}

function trackMaxGrade(track: LifeEducationTrack): number {
  if (track === 'junior_high' || track === 'high_school' || track === 'master') return 3
  if (track === 'undergrad' || track === 'phd') return 4
  return 0
}

export function computeEducationLabel(params: {
  track: LifeEducationTrack
  gradeAtStart: number | null
  startDay?: string | null
  nowDay?: string | null
  note?: string
}): string {
  const note = String(params.note ?? '').trim()
  if (params.track === '' || params.track === 'working' || params.track === 'other') {
    const head = params.track ? TRACK_LABEL[params.track] : ''
    return [head, note].filter(Boolean).join(' · ')
  }
  const startMs = parseLifeStoryDayMs(params.startDay)
  const nowMs = parseLifeStoryDayMs(params.nowDay)
  const g0 = params.gradeAtStart
  if (typeof g0 !== 'number' || !Number.isFinite(g0) || g0 < 1) {
    return [TRACK_LABEL[params.track], note].filter(Boolean).join(' · ')
  }
  let grade = Math.round(g0)
  if (startMs != null && nowMs != null && nowMs >= startMs) {
    grade += academicYearIndex(nowMs) - academicYearIndex(startMs)
  }
  const max = trackMaxGrade(params.track)
  let stage = ''
  if (max > 0 && grade > max) {
    if (params.track === 'high_school') stage = '高中已毕业（高考已结束）'
    else if (params.track === 'undergrad') stage = '大学已毕业'
    else if (params.track === 'junior_high') stage = '初中已毕业'
    else if (params.track === 'master') stage = '硕士已毕业'
    else if (params.track === 'phd') stage = '博士已毕业'
    else stage = '该学段已结束'
  } else {
    stage = `${TRACK_LABEL[params.track]} · ${gradeName(params.track, Math.max(1, grade))}`
  }
  return [stage, note].filter(Boolean).join(' · ')
}

export function pickEarlierStoryDay(a: string | null | undefined, b: string | null | undefined): string | null {
  const aa = String(a ?? '').trim()
  const bb = String(b ?? '').trim()
  if (!aa) return bb || null
  if (!bb) return aa
  const am = parseLifeStoryDayMs(aa)
  const bm = parseLifeStoryDayMs(bb)
  if (am == null) return bb
  if (bm == null) return aa
  return am <= bm ? aa : bb
}

export function pickLaterStoryDay(a: string | null | undefined, b: string | null | undefined): string | null {
  const aa = String(a ?? '').trim()
  const bb = String(b ?? '').trim()
  if (!aa) return bb || null
  if (!bb) return aa
  const am = parseLifeStoryDayMs(aa)
  const bm = parseLifeStoryDayMs(bb)
  if (am == null) return bb
  if (bm == null) return aa
  return am >= bm ? aa : bb
}

/** 一段文案里可能含「2026年1月1日 - 2028年3月15日」：取出最早/最晚公历日。 */
export function extractLifeStoryDayBounds(raw: string | null | undefined): {
  first: string | null
  last: string | null
} {
  const t = String(raw ?? '').trim()
  if (!t) return { first: null, last: null }
  const found: string[] = []
  const seen = new Set<string>()
  const re = /(\d{4})\s*年(?:\s*(\d{1,2})\s*月(?:\s*(\d{1,2})\s*日?)?)?|(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/g
  let m: RegExpExecArray | null
  while ((m = re.exec(t))) {
    const label = normalizeLifeStoryDayLabel(m[0])
    if (!label || seen.has(label)) continue
    seen.add(label)
    found.push(label)
  }
  if (!found.length) {
    const one = normalizeLifeStoryDayLabel(t)
    return { first: one, last: one }
  }
  let first = found[0]
  let last = found[0]
  for (const d of found) {
    first = pickEarlierStoryDay(first, d) ?? first
    last = pickLaterStoryDay(last, d) ?? last
  }
  return { first, last }
}

/**
 * 开篇日：手填账本优先；若手填日已经等于「现在」而时间轴另有更早原点（2026→2028），改用原点。
 * 禁止把「现在」回填成开篇，否则开篇 21 岁会永远停在 21。
 */
export function resolveLifeClock(
  sheetStartDay: string | null | undefined,
  span: LifeStorySpan,
): { startDay: string | null; nowDay: string | null } {
  const origin = normalizeLifeStoryDayLabel(span.startDay)
  const nowDay = normalizeLifeStoryDayLabel(span.nowDay)
  const ledger = normalizeLifeStoryDayLabel(sheetStartDay)
  let startDay = ledger || origin
  if (ledger && origin && nowDay) {
    const ledgerMs = parseLifeStoryDayMs(ledger)
    const originMs = parseLifeStoryDayMs(origin)
    const nowMs = parseLifeStoryDayMs(nowDay)
    if (ledgerMs != null && originMs != null && nowMs != null && ledgerMs >= nowMs && originMs < nowMs) {
      startDay = origin
    }
  }
  return { startDay, nowDay: nowDay || startDay }
}

export function normalizeStoryDayLabel(raw: string | null | undefined): string | null {
  return normalizeLifeStoryDayLabel(raw)
}

/** 约略过了几个完整公历年（用于「人设卡年龄当现在」反推开篇） */
export function approxElapsedStoryYears(
  startDay: string | null | undefined,
  nowDay: string | null | undefined,
): number | null {
  const a = parseLifeStoryDayMs(startDay)
  const b = parseLifeStoryDayMs(nowDay)
  if (a == null || b == null || b < a) return null
  return countStartAnniversaries(a, b)
}

/**
 * 已有剧情对齐：
 * - mode=cardAsStart：人设卡年龄=故事开头岁数（最常见：卡上还写着 21，其实已过两年）
 * - mode=cardAsNow：人设卡年龄=你现在想要的岁数，反推开篇
 */
export function alignLifeSheetToTimeline(params: {
  sheet: LifeMutableSheet
  cardAge: number | null
  birthdayMD?: string
  startDay: string | null
  nowDay: string | null
  mode: 'cardAsStart' | 'cardAsNow'
  /** true：已手填的开篇日不被时间轴最早日覆盖（早期记忆年份记错时用） */
  keepExistingStart?: boolean
}): LifeMutableSheet {
  const start = normalizeStoryDayLabel(params.startDay)
  const now = normalizeStoryDayLabel(params.nowDay) || start
  if (!start) return params.sheet
  const existingStart = normalizeStoryDayLabel(params.sheet.storyStartDay)
  const next = {
    ...params.sheet,
    storyStartDay: params.keepExistingStart && existingStart ? existingStart : start,
  }
  const finish = (sheet: LifeMutableSheet) =>
    syncPeopleAgesToTimeline(sheet, sheet.storyStartDay || start, now)

  if (params.mode === 'cardAsStart') {
    if (typeof params.cardAge === 'number' && Number.isFinite(params.cardAge)) {
      next.ageAtStart = Math.round(params.cardAge)
    }
    return finish(next)
  }
  // cardAsNow：当前想要的岁数写在人设卡上，反推开篇
  if (typeof params.cardAge !== 'number' || !Number.isFinite(params.cardAge)) return finish(next)
  const epoch = next.storyStartDay
  const years = approxElapsedStoryYears(epoch, now)
  if (years == null) {
    next.ageAtStart = Math.round(params.cardAge)
    return finish(next)
  }
  // 用生日精确回推：先设 ageAtStart=cardAge-years，再微调到 computeCurrentAge === cardAge
  let guess = Math.max(0, Math.round(params.cardAge) - years)
  for (let i = 0; i < 4; i += 1) {
    const cur = computeCurrentAge({
      ageAtStart: guess,
      birthdayMD: params.birthdayMD,
      startDay: epoch,
      nowDay: now,
    })
    if (cur == null) break
    if (cur === Math.round(params.cardAge)) break
    guess += Math.round(params.cardAge) - cur
    guess = Math.max(0, guess)
  }
  next.ageAtStart = guess
  return finish(next)
}

export function resolveLifeSnapshot(params: {
  cardName: string
  cardAge: number | null
  cardGender: Gender | '' | undefined
  cardIdentity?: string
  birthdayMD?: string
  sheet: LifeMutableSheet
  span: LifeStorySpan
}): LifeResolvedSnapshot {
  const clock = resolveLifeClock(params.sheet.storyStartDay, params.span)
  const startDay = clock.startDay
  const nowDay = clock.nowDay
  const sheet = syncPeopleAgesToTimeline(params.sheet, startDay, nowDay)
  const ageAtStart =
    typeof sheet.ageAtStart === 'number' && Number.isFinite(sheet.ageAtStart)
      ? sheet.ageAtStart
      : params.cardAge
  const currentAge = computeCurrentAge({
    ageAtStart,
    birthdayMD: params.birthdayMD,
    startDay,
    nowDay,
  })
  const displayName = sheet.name.trim() || params.cardName.trim() || '未命名'
  const gender = sheet.gender || params.cardGender || ''
  const occupationMain = sheet.occupationMain.trim() || String(params.cardIdentity ?? '').trim()
  const educationLabel = computeEducationLabel({
    track: sheet.educationTrack,
    gradeAtStart: sheet.educationGradeAtStart,
    startDay,
    nowDay,
    note: sheet.educationNote,
  })
  return {
    displayName,
    cardName: params.cardName.trim() || '未命名',
    currentAge,
    ageAtStart,
    gender,
    cardGender: params.cardGender || '',
    startDay,
    nowDay,
    educationLabel,
    occupationMain,
    occupationSide: sheet.occupationSide.trim(),
    sheet,
  }
}

function payLabel(kind: string, remaining: string, monthly: string): string {
  if (kind === 'full') return '全款'
  if (kind === 'loan') {
    const bits = ['贷款']
    if (remaining.trim()) bits.push(`剩余${remaining.trim()}`)
    if (monthly.trim()) bits.push(`月供${monthly.trim()}`)
    return bits.join(' · ')
  }
  return ''
}

export function formatLifePromptBlock(params: {
  title: string
  subject: 'character' | 'player'
  snapshot: LifeResolvedSnapshot
}): string {
  const s = params.snapshot
  const sheet = s.sheet
  const lines: string[] = []
  lines.push(
    `【${params.title}】（**最高设定同级**：本线当前生理/资产/学历事实，与角色档案、人设世界书、全局档案室同级。` +
      `冲突时：当前姓名/年龄/性别/职业/资产/学历以本账本为准；性格禁忌与关系站位仍以世界书为准。` +
      `建档卡与世界书开篇岁数视为过去，禁止再说建档岁数。）`,
  )
  lines.push(`当前姓名：${s.displayName}${s.displayName !== s.cardName ? `（建档名 ${s.cardName}）` : ''}`)
  if (s.currentAge != null) {
    const clock =
      s.startDay && s.nowDay
        ? `（建档/开篇 ${s.ageAtStart ?? '未知'} 岁 · ${s.startDay} → 今日 ${s.nowDay}）`
        : s.ageAtStart != null
          ? `（开篇 ${s.ageAtStart} 岁）`
          : ''
    lines.push(`当前年龄：${s.currentAge}岁${clock}`)
  }
  const gNow = s.gender ? genderLabelZh(s.gender as Character['gender']) : '未设定'
  const gCard = s.cardGender ? genderLabelZh(s.cardGender as Character['gender']) : ''
  lines.push(
    `当前性别：${gNow}${gCard && gNow !== genderLabelZh(s.cardGender as Character['gender']) ? `（建档 ${gCard}）` : ''}`,
  )
  if (sheet.genderChangeNote.trim()) lines.push(`性别变动说明：${sheet.genderChangeNote.trim()}`)
  if (s.educationLabel) lines.push(`学历进度：${s.educationLabel}`)
  if (s.occupationMain) lines.push(`主业：${s.occupationMain}`)
  if (s.occupationSide) lines.push(`副业：${s.occupationSide}`)
  if (sheet.savings.trim()) lines.push(`存款：${sheet.savings.trim()}`)
  if (sheet.relationshipStatus.trim()) lines.push(`感情状态：${sheet.relationshipStatus.trim()}`)

  if (sheet.realEstates.length) {
    lines.push('可去住所（本人可住/可去的地点，可多项；学生常含宿舍+自家）：')
    for (const h of sheet.realEstates) {
      const kind = lifePlaceKindLabel(h.placeKind) || h.label.trim() || ''
      const label = h.label.trim() && h.label.trim() !== kind ? h.label.trim() : ''
      const tenure = h.tenure === 'own' ? '购买' : h.tenure === 'rent' ? '租赁' : ''
      const owned = h.ownedBySubject ? '产权归本人名下' : '产权不在本人名下'
      const primary = h.isPrimary ? '当前主居' : ''
      const pay = payLabel(h.payKind, h.loanRemaining, h.monthlyPayment)
      lines.push(
        `- ${[
          kind,
          label,
          h.location,
          tenure,
          owned,
          primary,
          h.area,
          h.layout,
          h.floor ? `${h.floor}层` : '',
          pay,
          h.note,
        ]
          .map((x) => String(x).trim())
          .filter(Boolean)
          .join(' · ') || '（未填）'}`,
      )
    }
  }
  if (sheet.vehicles.length) {
    lines.push('车产：')
    for (const v of sheet.vehicles) {
      const pay = payLabel(v.payKind, v.loanRemaining, v.monthlyPayment)
      lines.push(
        `- ${[v.boughtAt && `购于${v.boughtAt}`, v.model, pay, v.note]
          .map((x) => String(x).trim())
          .filter(Boolean)
          .join(' · ') || '（未填）'}`,
      )
    }
  }
  if (sheet.family.length) {
    lines.push('家庭成员：')
    for (const f of sheet.family) {
      const alive = f.alive ? '在世' : '已故'
      const ageBit = f.age.trim() ? `${f.age.trim()}岁` : ''
      const startAge = f.ageAtStart.trim() && f.ageAtStart.trim() !== f.age.trim() ? `开篇${f.ageAtStart.trim()}岁` : ''
      const bday = f.birthdayMD.trim() ? `生日${f.birthdayMD.trim()}` : ''
      const home = f.residence.trim() ? `住所${f.residence.trim()}` : '住所未填'
      const cohabit = f.livesWithSubject ? '与本人同居' : '不同居'
      lines.push(
        `- ${[
          f.name,
          f.relation,
          f.gender,
          ageBit,
          startAge,
          bday,
          alive,
          f.health,
          f.occupationOrSchool,
          home,
          cohabit,
        ]
          .map((x) => String(x).trim())
          .filter(Boolean)
          .join(' · ')}`,
      )
    }
  }
  if (sheet.socialCircle.length) {
    lines.push('社交圈：')
    for (const c of sheet.socialCircle) {
      const ageBit = c.age.trim() ? `${c.age.trim()}岁` : ''
      const startAge = c.ageAtStart.trim() && c.ageAtStart.trim() !== c.age.trim() ? `开篇${c.ageAtStart.trim()}岁` : ''
      const bday = c.birthdayMD.trim() ? `生日${c.birthdayMD.trim()}` : ''
      const home = c.residence.trim() ? `住所${c.residence.trim()}` : ''
      lines.push(
        `- ${[
          c.name,
          c.relation,
          c.gender,
          ageBit,
          startAge,
          bday,
          c.occupationOrSchool,
          home,
          c.attitude,
          c.note,
        ]
          .map((x) => String(x).trim())
          .filter(Boolean)
          .join(' · ')}`,
      )
    }
  }
  if (sheet.pets.length) {
    lines.push('宠物：')
    for (const p of sheet.pets) {
      lines.push(
        `- ${[p.name, p.species, p.age, p.acquiredAt && `于${p.acquiredAt}领取/购买`, p.acquiredPlace]
          .map((x) => String(x).trim())
          .filter(Boolean)
          .join(' · ')}`,
      )
    }
  }
  if (sheet.extraNote.trim()) lines.push(`补充：${sheet.extraNote.trim()}`)
  if (params.subject === 'player') {
    lines.push('说明：同一张玩家身份卡在不同角色线上年龄/资产互相独立，只使用本线这份。')
  }
  return lines.join('\n')
}

export function overlayFromSnapshot(s: LifeResolvedSnapshot): {
  name?: string
  age?: number
  gender?: Gender
  identity?: string
} {
  return {
    name: s.displayName || undefined,
    age: s.currentAge ?? undefined,
    gender: s.gender || undefined,
    identity: [s.occupationMain, s.occupationSide].filter(Boolean).join(' / ') || undefined,
  }
}

function asStr(v: unknown, max = 400): string {
  return typeof v === 'string' ? v.trim().slice(0, max) : ''
}

export function normalizeLifeMutableSheet(raw: unknown): LifeMutableSheet {
  const base = emptyLifeMutableSheet()
  if (!raw || typeof raw !== 'object') return base
  const o = raw as Record<string, unknown>
  const gender = o.gender
  const track = o.educationTrack
  const ageAtStart = o.ageAtStart
  return {
    ...base,
    name: asStr(o.name, 64),
    gender: gender === 'male' || gender === 'female' || gender === 'other' ? gender : '',
    genderChangeNote: asStr(o.genderChangeNote, 240),
    occupationMain: asStr(o.occupationMain, 120),
    occupationSide: asStr(o.occupationSide, 120),
    savings: asStr(o.savings, 80),
    relationshipStatus: asStr(o.relationshipStatus, 120),
    educationTrack:
      track === 'junior_high' ||
      track === 'high_school' ||
      track === 'undergrad' ||
      track === 'master' ||
      track === 'phd' ||
      track === 'working' ||
      track === 'other'
        ? track
        : '',
    educationGradeAtStart:
      typeof o.educationGradeAtStart === 'number' && Number.isFinite(o.educationGradeAtStart)
        ? Math.round(o.educationGradeAtStart)
        : null,
    educationNote: asStr(o.educationNote, 240),
    realEstates: Array.isArray(o.realEstates)
      ? o.realEstates
          .map((x, i) => {
            if (!x || typeof x !== 'object') return null
            const h = x as Record<string, unknown>
            const placeKind = normalizePlaceKind(h.placeKind ?? h.kind ?? h['地点类型'])
            const tenure: 'own' | 'rent' | '' =
              h.tenure === 'own' || h.tenure === 'rent'
                ? h.tenure
                : placeKind === 'rent'
                  ? 'rent'
                  : placeKind === 'home' && h.ownedBySubject === true
                    ? 'own'
                    : ''
            const ownedBySubject =
              h.ownedBySubject === true ||
              h.ownedBySubject === 'true' ||
              h['产权归本人'] === true ||
              (tenure === 'own' && h.ownedBySubject !== false)
            const payKind: LifePayKind =
              h.payKind === 'full' || h.payKind === 'loan' ? h.payKind : ''
            return {
              id: asStr(h.id, 64) || `house-${i}`,
              label: asStr(h.label ?? h.name ?? h['称呼'] ?? h['地点名'], 40),
              placeKind,
              tenure,
              ownedBySubject,
              isPrimary: h.isPrimary === true || h.isPrimary === 'true' || h['主居'] === true,
              location: asStr(h.location, 200),
              area: asStr(h.area, 40),
              layout: asStr(h.layout, 40),
              floor: asStr(h.floor, 24),
              payKind,
              loanRemaining: asStr(h.loanRemaining, 40),
              monthlyPayment: asStr(h.monthlyPayment, 40),
              note: asStr(h.note, 160),
            }
          })
          .filter((x): x is NonNullable<typeof x> => !!x)
          .slice(0, 16)
      : [],
    vehicles: Array.isArray(o.vehicles)
      ? o.vehicles
          .map((x, i) => {
            if (!x || typeof x !== 'object') return null
            const v = x as Record<string, unknown>
            const payKind: LifePayKind =
              v.payKind === 'full' || v.payKind === 'loan' ? v.payKind : ''
            return {
              id: asStr(v.id, 64) || `car-${i}`,
              boughtAt: asStr(v.boughtAt, 40),
              model: asStr(v.model, 80),
              payKind,
              loanRemaining: asStr(v.loanRemaining, 40),
              monthlyPayment: asStr(v.monthlyPayment, 40),
              note: asStr(v.note, 160),
            }
          })
          .filter((x): x is NonNullable<typeof x> => !!x)
          .slice(0, 12)
      : [],
    family: Array.isArray(o.family)
      ? o.family
          .map((x, i) => {
            if (!x || typeof x !== 'object') return null
            const f = x as Record<string, unknown>
            const age = asStr(f.age, 16)
            const ageAtStart = asStr(f.ageAtStart ?? f['开篇年龄'] ?? f['开篇岁数'], 16) || age
            const split = splitFamilyKinshipName(
              asStr(f.name, 40),
              asStr(f.relation ?? f.relationship ?? f['关系'] ?? f['称谓'], 24),
            )
            return {
              id: asStr(f.id, 64) || `fam-${i}`,
              name: split.name,
              relation: split.relation,
              gender: asStr(f.gender, 16),
              age,
              ageAtStart,
              birthdayMD: asStr(f.birthdayMD ?? f.birthday ?? f['生日'], 24),
              alive: f.alive !== false,
              health: asStr(f.health, 80),
              occupationOrSchool: asStr(
                f.occupationOrSchool ?? f.occupation ?? f['职业'] ?? f['学业'],
                80,
              ),
              residence: asStr(f.residence, 160),
              livesWithSubject: f.livesWithSubject === true,
            }
          })
          .filter((x): x is NonNullable<typeof x> => !!x)
          .slice(0, 20)
      : [],
    socialCircle: (() => {
      const rawList = Array.isArray(o.socialCircle)
        ? o.socialCircle
        : Array.isArray(o['社交圈'])
          ? o['社交圈']
          : null
      if (!rawList) return []
      return rawList
        .map((x, i) => {
          if (!x || typeof x !== 'object') return null
          const c = x as Record<string, unknown>
          const age = asStr(c.age, 16)
          const ageAtStart = asStr(c.ageAtStart ?? c['开篇年龄'] ?? c['开篇岁数'], 16) || age
          let relation = asStr(c.relation ?? c.relationship ?? c['关系'], 40)
          let attitude = asStr(c.attitude ?? c['态度'] ?? c['亲疏'] ?? c['关系补充'], 200)
          const note = asStr(c.note, 160)
          // AI 常把整句态度塞进 relation：像句子（含标点或过长）则挪到关系补充
          const relChars = [...relation]
          const relationLooksLikeFlavor =
            relChars.length > 14 ||
            /[，。；;！!？?]/.test(relation) ||
            (relChars.length > 10 && !/[\/／·|]/.test(relation))
          if (relationLooksLikeFlavor) {
            const spilled = relation
            relation = ''
            attitude = attitude ? `${attitude}；${spilled}` : spilled
          }
          return {
            id: asStr(c.id, 64) || `soc-${i}`,
            name: asStr(c.name, 40),
            gender: asStr(c.gender, 16),
            age,
            ageAtStart,
            birthdayMD: asStr(c.birthdayMD ?? c.birthday ?? c['生日'], 24),
            relation,
            occupationOrSchool: asStr(
              c.occupationOrSchool ?? c.occupation ?? c['职业'] ?? c['学业'],
              80,
            ),
            residence: asStr(c.residence, 160),
            attitude,
            note,
          }
        })
        .filter((x): x is NonNullable<typeof x> => !!x)
        .slice(0, 24)
    })(),
    pets: Array.isArray(o.pets)
      ? o.pets
          .map((x, i) => {
            if (!x || typeof x !== 'object') return null
            const p = x as Record<string, unknown>
            return {
              id: asStr(p.id, 64) || `pet-${i}`,
              acquiredAt: asStr(p.acquiredAt, 40),
              acquiredPlace: asStr(p.acquiredPlace, 40),
              species: asStr(p.species, 40),
              name: asStr(p.name, 40),
              age: asStr(p.age, 16),
            }
          })
          .filter((x): x is NonNullable<typeof x> => !!x)
          .slice(0, 12)
      : [],
    extraNote: asStr(o.extraNote, 800),
    storyStartDay: asStr(o.storyStartDay, 40),
    ageAtStart:
      typeof ageAtStart === 'number' && Number.isFinite(ageAtStart) ? Math.round(ageAtStart) : null,
  }
}

