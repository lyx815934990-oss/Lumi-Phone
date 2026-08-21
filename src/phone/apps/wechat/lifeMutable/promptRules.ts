/**
 * 人生账本：住所地址细则 + 学年日历（生成 / 对齐 / 内联补丁共用）
 */

import type { LifeEducationTrack, LifeMutableSheet } from './types'
import { computeEducationLabel, normalizeLifeMutableSheet, parseLifeStoryDayMs } from './compute'

/** 禁止在无剧情依据时使用的现实地名（可扩展） */
const REAL_CITY_BLOCKLIST =
  /北京|上海|广州|深圳|杭州|成都|武汉|南京|重庆|天津|苏州|西安|长沙|郑州|青岛|大连|厦门|福州|济南|合肥|昆明|南昌|沈阳|哈尔滨|长春|石家庄|太原|南宁|海口|贵阳|兰州|银川|西宁|呼和浩特|乌鲁木齐|拉萨|香港|澳门|台北|东京|大阪|首尔|纽约|伦敦/

/** 整段就是笼统称呼 */
const VAGUE_PLACE =
  /^(重组家庭住所|家人处|家里|家中|自家|自家住所|学校宿舍|宿舍|租房|合租|市内|本市|某(?:市|城|区|高校|大学)|高档(?:住宅|小区)|核心区|市区内?|市中心)$/

/** 「某／某某／××」等糊弄占位（出现在任意位置即算模糊） */
const VAGUE_PLACEHOLDER =
  /某某|某市|某区|某县|某城|某镇|某街|某路|某巷|某校|某高校|某大学|某学院|某中学|某小学|某医院|某银行|某公司|某小区|某社区|某居民|某公寓|某宿舍|某楼|某号|旁某|附近某|\b某\b|某(?:高校|大学|学院|小区|社区)|×{1,2}|Ｘ{1,2}|x{2}/i

function academicYearIndex(ms: number): number {
  const d = new Date(ms)
  const y = d.getFullYear()
  const month = d.getMonth() + 1
  return month >= 9 ? y : y - 1
}

function trackMaxGrade(track: LifeEducationTrack): number {
  if (track === 'junior_high' || track === 'high_school' || track === 'master') return 3
  if (track === 'undergrad' || track === 'phd') return 4
  return 0
}

function gradeName(track: LifeEducationTrack, grade: number): string {
  if (track === 'junior_high') return `初${['一', '二', '三'][grade - 1] ?? grade}`
  if (track === 'high_school') return `高${['一', '二', '三'][grade - 1] ?? grade}`
  if (track === 'undergrad') return `大${['一', '二', '三', '四'][grade - 1] ?? grade}`
  if (track === 'master') return `研${['一', '二', '三'][grade - 1] ?? grade}`
  if (track === 'phd') return `博${['一', '二', '三', '四'][grade - 1] ?? grade}`
  return `${grade}年级`
}

/** 按开篇学年 + 剧情日推算「现在」年级数字；无法推算则 null */
export function resolveEducationGradeNow(params: {
  track: LifeEducationTrack
  gradeAtStart: number | null
  startDay?: string | null
  nowDay?: string | null
}): number | null {
  const { track, gradeAtStart } = params
  if (!track || track === 'working' || track === 'other') return null
  if (typeof gradeAtStart !== 'number' || !Number.isFinite(gradeAtStart) || gradeAtStart < 1) return null
  let grade = Math.round(gradeAtStart)
  const startMs = parseLifeStoryDayMs(params.startDay)
  const nowMs = parseLifeStoryDayMs(params.nowDay)
  if (startMs != null && nowMs != null && nowMs >= startMs) {
    grade += academicYearIndex(nowMs) - academicYearIndex(startMs)
  }
  return Math.max(1, grade)
}

const GRADE_TOKEN_RE = /大[一二三四]|研[一二三]|博[一二三四]|高[一二三]|初[一二三]/g

function gradeTokenToNumber(token: string, track: LifeEducationTrack): number | null {
  const t = token.trim()
  if (track === 'undergrad' || !track) {
    if (t === '大一') return 1
    if (t === '大二') return 2
    if (t === '大三') return 3
    if (t === '大四') return 4
  }
  if (track === 'high_school') {
    if (t === '高一') return 1
    if (t === '高二') return 2
    if (t === '高三') return 3
  }
  if (track === 'junior_high') {
    if (t === '初一') return 1
    if (t === '初二') return 2
    if (t === '初三') return 3
  }
  if (track === 'master') {
    if (t === '研一') return 1
    if (t === '研二') return 2
    if (t === '研三') return 3
  }
  if (track === 'phd') {
    if (t === '博一') return 1
    if (t === '博二') return 2
    if (t === '博三') return 3
    if (t === '博四') return 4
  }
  // 未指定 track 时仍识别大学年级
  if (t === '大一') return 1
  if (t === '大二') return 2
  if (t === '大三') return 3
  if (t === '大四') return 4
  return null
}

/** 文案里已写明的最高年级（近端/对齐可能已超前于剧情日推算） */
function detectMaxGradeInText(text: string, track: LifeEducationTrack): number | null {
  let max: number | null = null
  GRADE_TOKEN_RE.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = GRADE_TOKEN_RE.exec(text)) !== null) {
    const n = gradeTokenToNumber(m[0]!, track)
    if (n == null) continue
    max = max == null ? n : Math.max(max, n)
  }
  GRADE_TOKEN_RE.lastIndex = 0
  return max
}

function replaceGradeTokens(text: string, track: LifeEducationTrack, gradeNow: number): string {
  const max = trackMaxGrade(track)
  const token =
    max > 0 && gradeNow > max
      ? track === 'undergrad'
        ? '已毕业'
        : '已毕业'
      : gradeName(track, Math.min(gradeNow, max || gradeNow))
  if (!GRADE_TOKEN_RE.test(text)) return text
  GRADE_TOKEN_RE.lastIndex = 0
  return text.replace(GRADE_TOKEN_RE, token)
}

/**
 * 让 occupation / educationNote 中的「大一/大二…」与学历推算一致。
 * 9 月前不得提前写成下一学年年级。
 * 若文案已写更高年级（近端剧情已升学），不得用剧情日推算结果强行降级。
 */
export function syncSheetStudentGradeWording(
  sheet: LifeMutableSheet,
  startDay?: string | null,
  nowDay?: string | null,
): LifeMutableSheet {
  const track = sheet.educationTrack
  const gradeFromClock = resolveEducationGradeNow({
    track,
    gradeAtStart: sheet.educationGradeAtStart,
    startDay: startDay || sheet.storyStartDay,
    nowDay: nowDay || sheet.storyStartDay,
  })
  if (gradeFromClock == null || !track || track === 'working' || track === 'other') {
    return sheet
  }
  const detected = Math.max(
    detectMaxGradeInText(sheet.occupationMain, track) ?? 0,
    detectMaxGradeInText(sheet.occupationSide, track) ?? 0,
    detectMaxGradeInText(sheet.educationNote, track) ?? 0,
  )
  // 近端/对齐已写大四时，禁止因时钟仍停在大三而压回去
  const gradeNow = Math.max(gradeFromClock, detected || 0)
  const max = trackMaxGrade(track)
  const inSchool = max <= 0 || gradeNow <= max
  const gradeToken = inSchool ? gradeName(track, Math.min(gradeNow, max || gradeNow)) : ''

  let occupationMain = sheet.occupationMain
  let occupationSide = sheet.occupationSide
  let educationNote = sheet.educationNote

  // 去掉「待9月升大二 / 大一升大二」等过渡表述，再统一年级词
  if (inSchool && gradeToken) {
    educationNote = educationNote
      .replace(/暑假[，,]?\s*待\s*\d*\s*月?\s*升\s*(大[一二三四]|高[一二三]|初[一二三]|研[一二三])[^\s·，。；]*/g, `暑假 · ${gradeToken}在读`)
      .replace(/待\s*\d*\s*月?\s*升\s*(大[一二三四]|高[一二三]|初[一二三]|研[一二三])[^\s·，。；]*/g, `${gradeToken}在读`)
      .replace(/大[一二三四]\s*升\s*大[一二三四][^\s·，。；]*/g, `${gradeToken}在读`)
      .replace(/高[一二三]\s*升\s*高[一二三][^\s·，。；]*/g, `${gradeToken}在读`)
      .replace(/初[一二三]\s*升\s*初[一二三][^\s·，。；]*/g, `${gradeToken}在读`)
  }

  occupationMain = replaceGradeTokens(occupationMain, track, gradeNow)
  occupationSide = replaceGradeTokens(occupationSide, track, gradeNow)
  educationNote = replaceGradeTokens(educationNote, track, gradeNow)

  // 职业写「在读学生」却缺少年级时补上
  GRADE_TOKEN_RE.lastIndex = 0
  if (
    inSchool &&
    gradeToken &&
    /在读|学生|本科|大学/.test(occupationMain) &&
    !GRADE_TOKEN_RE.test(occupationMain)
  ) {
    occupationMain = occupationMain.replace(/(在读学生|大学生|本科生)/, `${gradeToken}$1`)
    GRADE_TOKEN_RE.lastIndex = 0
    if (!GRADE_TOKEN_RE.test(occupationMain)) {
      occupationMain = `${gradeToken} · ${occupationMain}`
    }
  }

  if (inSchool && gradeToken && !educationNote.trim()) {
    educationNote = `${gradeToken}在读`
  }

  return {
    ...sheet,
    occupationMain,
    occupationSide,
    educationNote,
  }
}

/** 生成/对齐提示词：地址要细 + 虚构城市 + 学年日历（不给具体示范地名，避免模型照抄） */
export function buildLifeLedgerAddressAndAcademicRules(): string {
  return `【家庭成员命名 · 硬规则】
- family[].name 必须是**真实姓名**，禁止「X父」「X母」「爸爸」「妈妈」「继父」等关系称呼当姓名。
- family[].relation 写与本人关系（父亲/母亲/继父/继母/哥哥/姐姐…）。
- 重组家庭可写不同姓，但姓名仍须是完整人名，关系放 relation。

【地址 / 校名 / 门牌 · 禁止模糊占位（硬）】
- realEstates[].location、family[].residence、socialCircle[].residence、occupationMain、educationNote、occupationOrSchool、note 等凡写地点/学校/单位：必须**编造具体专名**，像真通讯录地址一样可读。
- **禁止**任何「某／某某／某市／某区／某高校／某大学／某小区／某银行／××大学」等糊弄搭配。
- **禁止照抄本提示词里的示范地名/校名/路名**（本提示**不提供**可复用的城市或校名清单）。须按人设世界书、身份卡与近端证据**自行新编**；世界书/近端已有城市则沿用，无则另造，**不要**默认成同一个固定城市。
- 完整地址须达此粒度：「虚构市 + 区 + 路门牌或校名校区 + 楼栋号 + 房间号」。宿舍/公寓**必须**写清楼栋号与房间号；禁止只写「学生宿舍楼」「青年公寓」停在楼名。
- 学校须写**具体虚构校名**（可含学院类型），禁止「某大学」「大学」「高校」单独充数；label 可写「学校宿舍」，但 location 仍须带全校名+楼栋房间。
- 城市名须**虚构**；**禁止**现实一线/省会名（北京上海广州深圳杭州成都武汉南京重庆等），除非世界书/剧情正文已明确出现该城市。
- 同一主体/同一家庭共用住所时，城市、小区/校名、楼栋口径须全表一致。

【学年日历 · 年级必须自洽】
- **开篇 vs 现在（硬）**：相遇羁绊/名片等写的「大三学长」「大一新生」= **开篇年级**（写入 educationGradeAtStart / 开局主业），不是永远锁死「现在」。剧情推进或近端已写「大四学长」「大二」时，**现在**的 occupationMain / educationNote 必须跟「现在」证据走，禁止仍抄开篇大三/大一。
- **开局建档**（尚无近端剧情）：开篇年级必须与世界书一致；禁止擅自降级，也禁止臆造「待 9 月升大一」暗示尚未入学（除非世界书写未报到）。
- 每年 **9 月**起升入新学年；**9 月以前**仍属上一学年年级（例：证据写大一且剧情日在 8 月 → 仍写大一，不可提前写成大二）。
- **6 月**毕业季；**1–2 月**寒假；**7–8 月**暑假。
- 艺考**联考**约 **12–1 月**；艺术**校考**约联考后 **2–4 月**。
- educationTrack + educationGradeAtStart 记开篇档；occupationMain、educationNote 写**当前**年级，须与剧情日推算或近端明示一致，禁止一边大三一边大四。
- 开局日若在 7–8 月暑假且世界书已给年级：职业写该开篇年级「…大三在读…」；学历备注可写「暑假在读」；**禁止**用「待 9 月升大X」改掉世界书年级。
- 学生主业写法：\`具体虚构校名 + 当前年级 · 专业\`（校名须具体，禁止「某大学大二」）；校名从人设/身份推断新编，勿套固定样板。`
}

/** 校验地址/地点文案是否过糊 */
export function isVagueLifePlaceText(raw: string): boolean {
  const t = String(raw ?? '').trim()
  if (!t) return true
  if (t.length < 6) return true
  if (VAGUE_PLACE.test(t)) return true
  if (VAGUE_PLACEHOLDER.test(t)) return true
  if (/某/.test(t)) return true
  if (!/[市州盟]/.test(t) && !/区|路|街|巷|弄|苑|园|村|栋|号|室|宿舍|公寓/.test(t)) return true
  // 宿舍/公寓类：有楼名却无楼栋或房间号，仍算过糊
  if (/(宿舍|公寓)/.test(t) && !/(?:\d+\s*号?\s*楼|\d+\s*栋|[A-Za-z]\s*栋)/.test(t)) return true
  if (/(宿舍|公寓|栋|号楼)/.test(t) && !/\d+\s*室/.test(t)) return true
  return false
}

/** 账本里住所/住址/职业学校字段是否仍含「某」等糊弄写法 */
export function sheetHasVagueLifePlaces(sheet: LifeMutableSheet): boolean {
  const texts: string[] = [
    sheet.occupationMain,
    sheet.occupationSide,
    sheet.educationNote,
    sheet.extraNote,
    ...sheet.realEstates.flatMap((h) => [h.label, h.location, h.note]),
    ...sheet.family.flatMap((f) => [f.occupationOrSchool, f.residence]),
    ...sheet.socialCircle.flatMap((c) => [c.occupationOrSchool, c.residence, c.note]),
  ]
  return texts.some((t) => {
    const s = String(t ?? '').trim()
    if (!s) return false
    if (/某|某某|×{1,2}/.test(s)) return true
    if (hLooksLikeAddressField(s) && isVagueLifePlaceText(s)) return true
    return false
  })
}

function hLooksLikeAddressField(s: string): boolean {
  return /市|区|路|街|宿舍|公寓|小区|苑|园|栋|号楼|室/.test(s)
}

export function mentionsBlockedRealCity(raw: string): boolean {
  return REAL_CITY_BLOCKLIST.test(String(raw ?? ''))
}

/** 落库前：年级措辞对齐 + normalize */
export function finalizeLifeMutableSheetForStore(
  sheet: LifeMutableSheet,
  opts?: { startDay?: string | null; nowDay?: string | null },
): LifeMutableSheet {
  const start = opts?.startDay || sheet.storyStartDay
  const now = opts?.nowDay || sheet.storyStartDay
  return normalizeLifeMutableSheet(syncSheetStudentGradeWording(sheet, start, now))
}

/** 调试/预览：当前学历一行 */
export function previewEducationLine(sheet: LifeMutableSheet, nowDay?: string | null): string {
  return computeEducationLabel({
    track: sheet.educationTrack,
    gradeAtStart: sheet.educationGradeAtStart,
    startDay: sheet.storyStartDay,
    nowDay: nowDay || sheet.storyStartDay,
    note: sheet.educationNote,
  })
}
