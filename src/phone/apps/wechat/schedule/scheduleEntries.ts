import type {
  ScheduleCalendarEvent,
  ScheduleCalendarEventStatus,
  ScheduleCategory,
  ScheduleDayOfWeek,
  ScheduleDurationUnit,
  ScheduleEntry,
  ScheduleTable,
  TableCell,
  TableCellStyle,
} from '../newFriendsPersona/types'

export type {
  ScheduleCalendarEvent,
  ScheduleCalendarEventStatus,
  ScheduleCategory,
  ScheduleDayOfWeek,
  ScheduleDurationUnit,
  ScheduleEntry,
}

export const SCHEDULE_TAG_PRESETS = ['工作', '学业', '社交', '休憩'] as const

const LEGACY_CATEGORY_TO_TAG: Record<ScheduleCategory, string> = {
  work: '工作',
  study: '学业',
  social: '社交',
  rest: '休憩',
  storyExclusive: '',
}

export type ScheduleClock = {
  day: ScheduleDayOfWeek
  time: string
  source: 'story' | 'system'
  /** 如「周三 15:20」 */
  label: string
}

const WEEKDAY_ZH = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'] as const
const WEEKDAY_HEADERS_SUN0 = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'] as const
const WEEKDAY_ALT_SUN0 = ['日', '一', '二', '三', '四', '五', '六'] as const

function pad2(n: number) {
  return String(n).padStart(2, '0')
}

function formatHHmm(d: Date): string {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

/** JS getDay()（0=周日）→ 周一=0 */
export function jsSundayDowToMonday0(jsDow: number): ScheduleDayOfWeek {
  return ((jsDow + 6) % 7) as ScheduleDayOfWeek
}

export function scheduleDayLabel(day: ScheduleDayOfWeek): string {
  return WEEKDAY_ZH[day] ?? '周一'
}

function cellText(v: unknown): string {
  if (v == null) return ''
  if (typeof v === 'string') return v.trim()
  if (typeof v === 'object' && v && 'content' in v) return String((v as { content?: unknown }).content ?? '').trim()
  return String(v).trim()
}

function parseHHmm(raw: string): string | null {
  const m = String(raw ?? '')
    .trim()
    .match(/^(\d{1,2}):(\d{2})$/)
  if (!m) return null
  const h = Number(m[1])
  const mi = Number(m[2])
  if (!Number.isFinite(h) || !Number.isFinite(mi) || h < 0 || h > 23 || mi < 0 || mi > 59) return null
  return `${pad2(h)}:${pad2(mi)}`
}

function parseTimeRange(raw: string): { startTime: string; endTime: string } | null {
  const t = raw.replace(/\s/g, '')
  const m = t.match(/^(\d{1,2}):(\d{2})\s*[-–—~～至到]\s*(\d{1,2}):(\d{2})$/)
  if (!m) return null
  const startTime = parseHHmm(`${m[1]}:${m[2]}`)
  const endTime = parseHHmm(`${m[3]}:${m[4]}`)
  if (!startTime || !endTime) return null
  return { startTime, endTime }
}

function findDayColumnIndex(headers: string[], monday0: ScheduleDayOfWeek): number {
  const sun0 = (monday0 + 1) % 7
  const want = WEEKDAY_HEADERS_SUN0[sun0]!
  const wantShort = WEEKDAY_ALT_SUN0[sun0]!
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i]!.trim()
    if (h === want || h.includes(want)) return i
    if (h === wantShort || h === `周${wantShort}`) return i
  }
  const en = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][sun0]!
  for (let i = 0; i < headers.length; i++) {
    if (headers[i]!.toLowerCase().startsWith(en.toLowerCase())) return i
  }
  return -1
}

function findTimeColumnIndex(headers: string[]): number {
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i]!.trim()
    if (h === '时间' || h.includes('时间') || h.toLowerCase() === 'time') return i
  }
  if (headers.some((h) => /节次|第.+节/.test(h))) {
    const idx = headers.findIndex((h) => /时间|time/i.test(h))
    if (idx >= 0) return idx
  }
  return 0
}

function stripLegacyExclusiveMarker(activity: string): string {
  return activity
    .trim()
    .replace(/^\[剧情\]|^【剧情】|^★剧情|^\[专属\]|^【专属】/u, '')
    .trim()
}

function inferTag(activity: string): string {
  const t = activity
  if (/课|学|考|作业|自习|图书馆|论文|复习/.test(t)) return '学业'
  if (/约|饭|聚|玩|派对|约会|见面|咖啡|逛街|朋友|聊天|视频|通话/.test(t)) return '社交'
  if (/睡|休|假|躺|宅|午休|放松|泡澡|电影/.test(t)) return '休憩'
  if (/工|班|会|开会|加班|上班|通勤|项目|写稿|办公/.test(t)) return '工作'
  return '工作'
}

function parseDurationUnit(raw: unknown): ScheduleDurationUnit | null {
  const u = String(raw ?? '')
    .trim()
    .toLowerCase()
  if (u === 'minute' || u === 'min' || u === '分钟' || u === '分') return 'minute'
  if (u === 'hour' || u === 'hr' || u === 'h' || u === '小时' || u === '时') return 'hour'
  if (u === 'day' || u === 'd' || u === '天' || u === '日') return 'day'
  return null
}

export function formatScheduleDuration(
  amount?: number | null,
  unit?: ScheduleDurationUnit | null,
): string {
  if (amount == null || !Number.isFinite(amount) || amount <= 0 || !unit) return ''
  const n = Math.round(amount * 10) / 10
  if (unit === 'minute') return `${n} 分钟`
  if (unit === 'hour') return `${n} 小时`
  return `${n} 天`
}

export function scheduleTagAccent(tag: string): { dot: string; card: string; label: string } {
  const t = tag.trim()
  if (t === '工作') return { dot: '#5B6B3A', card: '#5B6B3A', label: t }
  if (t === '学业' || t === '学习') return { dot: '#3D5A6C', card: '#3D5A6C', label: t || '学业' }
  if (t === '社交') return { dot: '#8B3A3A', card: '#8B3A3A', label: t }
  if (t === '休憩' || t === '休息') return { dot: '#6A6E76', card: '#6A6E76', label: t || '休憩' }
  if (!t) return { dot: '#A89C8C', card: '#A89C8C', label: '未分类' }
  let h = 0
  for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) >>> 0
  const palette = ['#B54A3C', '#2F6F7E', '#6B4E9B', '#C46B3A', '#4A6B5A', '#8A5A3A']
  const c = palette[h % palette.length]!
  return { dot: c, card: c, label: t }
}

function uid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function resolveEntryTag(o: {
  tag?: unknown
  category?: unknown
  activity?: string
}): string {
  const tag = String(o.tag ?? '').trim()
  if (tag) return tag.slice(0, 24)
  const cat = String(o.category ?? '') as ScheduleCategory
  if (cat && cat in LEGACY_CATEGORY_TO_TAG) {
    const mapped = LEGACY_CATEGORY_TO_TAG[cat]
    if (mapped) return mapped
  }
  return inferTag(String(o.activity ?? ''))
}

/** 从旧版日程表解析结构化条目 */
export function parseScheduleTableToEntries(
  schedule: ScheduleTable | null | undefined,
  prior?: ScheduleEntry[] | null,
): ScheduleEntry[] {
  if (!schedule?.headers?.length || !schedule.rows?.length) return prior?.length ? [...prior] : []
  const headers = schedule.headers.map((h) => String(h ?? '').trim())
  const timeCol = findTimeColumnIndex(headers)
  const priorByKey = new Map<string, ScheduleEntry>()
  for (const e of prior ?? []) {
    priorByKey.set(`${e.dayOfWeek}|${e.startTime}|${e.endTime}`, e)
  }

  const out: ScheduleEntry[] = []
  for (let day = 0; day < 7; day++) {
    const dayCol = findDayColumnIndex(headers, day as ScheduleDayOfWeek)
    if (dayCol < 0) continue
    for (let ri = 0; ri < schedule.rows.length; ri++) {
      const row = schedule.rows[ri]
      if (!Array.isArray(row)) continue
      const rawAct = cellText(row[dayCol])
      if (!rawAct) continue
      const text = stripLegacyExclusiveMarker(rawAct)
      if (!text) continue
      const timeRaw = cellText(row[timeCol]) || cellText(row[0])
      const range = parseTimeRange(timeRaw)
      const startTime = range?.startTime ?? '00:00'
      const endTime = range?.endTime ?? '23:59'
      const key = `${day}|${startTime}|${endTime}`
      const prev = priorByKey.get(key)
      out.push({
        id: prev?.id ?? uid('sch'),
        dayOfWeek: day as ScheduleDayOfWeek,
        startTime,
        endTime,
        activity: text,
        tag: prev?.tag?.trim() || resolveEntryTag({ tag: prev?.tag, category: prev?.category, activity: text }),
        location: prev?.location?.trim() || '',
        durationAmount: prev?.durationAmount ?? null,
        durationUnit: prev?.durationUnit ?? null,
      })
    }
  }
  return out.sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime))
}

/** 规范化外部/AI 条目 */
export function normalizeScheduleEntries(raw: unknown): ScheduleEntry[] {
  if (!Array.isArray(raw)) return []
  const out: ScheduleEntry[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const o = item as Record<string, unknown>
    const dayRaw = Number(o.dayOfWeek)
    if (!Number.isFinite(dayRaw) || dayRaw < 0 || dayRaw > 6) continue
    const startTime = parseHHmm(String(o.startTime ?? '')) ?? null
    const endTime = parseHHmm(String(o.endTime ?? '')) ?? null
    if (!startTime || !endTime) continue
    let activity = stripLegacyExclusiveMarker(String(o.activity ?? ''))
    if (!activity) continue
    let location = String(o.location ?? '').trim()
    const amountRaw = o.durationAmount
    let durationAmount =
      amountRaw == null || amountRaw === ''
        ? null
        : Number.isFinite(Number(amountRaw)) && Number(amountRaw) > 0
          ? Number(amountRaw)
          : null
    let durationUnit = durationAmount != null ? parseDurationUnit(o.durationUnit) : null
    let tagFromField = String(o.tag ?? o.category ?? '').trim()
    // 历史错解析：#/@/~ 粘在活动名里 → 再剥离一次
    if (/[#@~～]/.test(activity)) {
      const extras = stripScheduleBodyExtras(activity)
      if (extras.activity) activity = extras.activity
      if (!tagFromField && extras.tag) tagFromField = extras.tag
      if (!location && extras.location) location = extras.location
      if (durationAmount == null && extras.durationAmount != null) {
        durationAmount = extras.durationAmount
        durationUnit = extras.durationUnit
      }
    }
    const tag = resolveEntryTag({ tag: tagFromField, category: o.category, activity })
    out.push({
      id: typeof o.id === 'string' && o.id.trim() ? o.id.trim() : uid('sch'),
      dayOfWeek: dayRaw as ScheduleDayOfWeek,
      startTime,
      endTime,
      activity: activity.slice(0, 120),
      tag: tag.slice(0, 24) || inferTag(activity),
      location: location.slice(0, 120),
      durationAmount,
      durationUnit: durationUnit ?? (durationAmount != null ? 'minute' : null),
    })
  }
  return out.sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime))
}

const CALENDAR_EVENT_STATUSES: ReadonlySet<ScheduleCalendarEventStatus> = new Set([
  'upcoming',
  'past',
  'done',
  'skipped',
])

function parseCalendarEventStatus(raw: unknown): ScheduleCalendarEventStatus {
  const s = String(raw ?? '').trim() as ScheduleCalendarEventStatus
  return CALENDAR_EVENT_STATUSES.has(s) ? s : 'upcoming'
}

/** 规范化日历形式日程（一次性 / 剧情安排） */
export function normalizeScheduleCalendarEvents(raw: unknown): ScheduleCalendarEvent[] {
  if (!Array.isArray(raw)) return []
  const out: ScheduleCalendarEvent[] = []
  const now = Date.now()
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const o = item as Record<string, unknown>
    const storyDay = String(o.storyDay ?? '').trim()
    if (!storyDay) continue
    const startTime = parseHHmm(String(o.startTime ?? '')) ?? null
    if (!startTime) continue
    const endRaw = o.endTime
    const endTime =
      endRaw == null || endRaw === ''
        ? null
        : parseHHmm(String(endRaw)) ?? null
    let activity = stripLegacyExclusiveMarker(String(o.activity ?? ''))
    if (!activity) continue
    let location = String(o.location ?? '').trim()
    const amountRaw = o.durationAmount
    let durationAmount =
      amountRaw == null || amountRaw === ''
        ? null
        : Number.isFinite(Number(amountRaw)) && Number(amountRaw) > 0
          ? Number(amountRaw)
          : null
    let durationUnit = durationAmount != null ? parseDurationUnit(o.durationUnit) : null
    let tagFromField = String(o.tag ?? o.category ?? '').trim()
    if (/[#@~～]/.test(activity)) {
      const extras = stripScheduleBodyExtras(activity)
      if (extras.activity) activity = extras.activity
      if (!tagFromField && extras.tag) tagFromField = extras.tag
      if (!location && extras.location) location = extras.location
      if (durationAmount == null && extras.durationAmount != null) {
        durationAmount = extras.durationAmount
        durationUnit = extras.durationUnit
      }
    }
    const sourceRaw = String(o.source ?? '').trim()
    const source: ScheduleCalendarEvent['source'] =
      sourceRaw === 'ai_auto' || sourceRaw === 'manual' ? sourceRaw : undefined
    const createdAt =
      typeof o.createdAt === 'number' && Number.isFinite(o.createdAt) ? o.createdAt : now
    const updatedAt =
      typeof o.updatedAt === 'number' && Number.isFinite(o.updatedAt) ? o.updatedAt : createdAt
    out.push({
      id: typeof o.id === 'string' && o.id.trim() ? o.id.trim() : uid('sce'),
      storyDay: storyDay.slice(0, 64),
      startTime,
      endTime,
      activity: activity.slice(0, 120),
      tag: resolveEntryTag({ tag: tagFromField, category: o.category, activity }),
      location: location.slice(0, 80),
      durationAmount,
      durationUnit: durationUnit ?? (durationAmount != null ? 'minute' : null),
      status: parseCalendarEventStatus(o.status),
      source,
      note: typeof o.note === 'string' ? o.note.trim().slice(0, 200) : undefined,
      createdAt,
      updatedAt,
    })
  }
  return out.sort(
    (a, b) =>
      a.storyDay.localeCompare(b.storyDay, 'zh-CN') ||
      a.startTime.localeCompare(b.startTime) ||
      a.createdAt - b.createdAt,
  )
}

/** @deprecated AI 现为整周替换；保留兼容旧调用 */
export function mergeScheduleEntriesPreservingExclusive(
  _existing: ScheduleEntry[],
  draft: ScheduleEntry[],
): ScheduleEntry[] {
  return normalizeScheduleEntries(draft)
}

function weekdayZhToMonday0(raw: string): ScheduleDayOfWeek | null {
  const t = raw.trim()
  for (let i = 0; i < WEEKDAY_ZH.length; i++) {
    if (t === WEEKDAY_ZH[i] || t.includes(WEEKDAY_ZH[i]!)) return i as ScheduleDayOfWeek
  }
  const short = t.match(/周([一二三四五六日天])/)
  if (short) {
    const map: Record<string, number> = { 一: 0, 二: 1, 三: 2, 四: 3, 五: 4, 六: 5, 日: 6, 天: 6 }
    const d = map[short[1]!]
    return d == null ? null : (d as ScheduleDayOfWeek)
  }
  return null
}

function parseDurationPhrase(
  raw: string,
): { amount: number; unit: ScheduleDurationUnit } | null {
  const t = raw.trim().replace(/\s+/g, '')
  if (!t || t === '-' || t === '无' || t === '未填') return null
  const m = t.match(/^(\d+(?:\.\d+)?)(分钟|分|小时|时|h|H|天|日|minute|min|hour|hr|day|d)$/i)
  if (!m) return null
  const amount = Number(m[1])
  if (!Number.isFinite(amount) || amount <= 0) return null
  const unit = parseDurationUnit(m[2])
  if (!unit) return null
  return { amount, unit }
}

const SCHEDULE_DURATION_UNIT_RE =
  '(?:分钟|分|小时|时|天|日|minute|min|hour|hr|h|H|day|d)'

/**
 * 从活动正文尾部剥离 #标签 / @地点 / ~时长（任意顺序，可重复剥离）。
 * 修复模型写 `~2h` 时旧正则只认「小时/分钟」导致地点时长全并进内容栏。
 */
function stripScheduleBodyExtras(bodyRaw: string): {
  activity: string
  tag: string
  location: string
  durationAmount: number | null
  durationUnit: ScheduleDurationUnit | null
} {
  let body = String(bodyRaw ?? '').trim()
  let tag = ''
  let location = ''
  let durationAmount: number | null = null
  let durationUnit: ScheduleDurationUnit | null = null

  for (let guard = 0; guard < 8; guard += 1) {
    const before = body
    const durM = body.match(
      new RegExp(`[~～]\\s*(\\d+(?:\\.\\d+)?\\s*${SCHEDULE_DURATION_UNIT_RE})\\s*$`, 'i'),
    )
    if (durM) {
      const d = parseDurationPhrase(durM[1]!)
      if (d) {
        durationAmount = d.amount
        durationUnit = d.unit
      }
      body = body.slice(0, durM.index).trim()
      continue
    }
    // 地点可含空格以外的长地址；遇 #/~ 截断
    const locM = body.match(/@\s*([^\n#~～]+?)\s*$/u)
    if (locM) {
      location = locM[1]!.trim()
      body = body.slice(0, locM.index).trim()
      continue
    }
    const tagM = body.match(/#\s*([^\s@~～]+)\s*$/u)
    if (tagM) {
      tag = tagM[1]!.trim()
      body = body.slice(0, tagM.index).trim()
      continue
    }
    const namedTag = body.match(/(?:标签|分类)\s*[:：]\s*([^\s]+)\s*$/)
    if (namedTag) {
      tag = namedTag[1]!.trim()
      body = body.slice(0, namedTag.index).trim()
      continue
    }
    const namedLoc = body.match(/地点\s*[:：]\s*(.+?)\s*$/)
    if (namedLoc) {
      location = namedLoc[1]!.trim()
      body = body.slice(0, namedLoc.index).trim()
      continue
    }
    if (body === before) break
  }

  return {
    activity: stripLegacyExclusiveMarker(body),
    tag,
    location,
    durationAmount,
    durationUnit,
  }
}

/** 规范化模型输出：去围栏/思维标签；若误出 JSON 则尽量摊成纯文本行 */
function preprocessScheduleAiPlainText(raw: string): string {
  let text = String(raw ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/<\/?thinking>/gi, '')
  // 去掉整段 markdown 代码围栏（含中间残留）
  text = text.replace(/```[\w]*\s*\n?([\s\S]*?)```/g, '$1')
  text = text.replace(/```/g, '')

  const trimmed = text.trim()
  if (!trimmed) return ''

  const flattenScheduleJson = (parsed: unknown): string | null => {
    let rows: unknown[] = []
    if (Array.isArray(parsed)) {
      rows = parsed
    } else if (parsed && typeof parsed === 'object') {
      const obj = parsed as Record<string, unknown>
      const nested =
        obj.entries ?? obj.events ?? obj.schedule ?? obj.items ?? obj.data ?? obj.rows
      if (Array.isArray(nested)) rows = nested
      else rows = Object.values(obj).flatMap((v) => (Array.isArray(v) ? v : [v]))
    }
    const lines: string[] = []
    for (const row of rows) {
      if (typeof row === 'string') {
        const s = row.trim()
        if (s) lines.push(s)
        continue
      }
      if (!row || typeof row !== 'object') continue
      const o = row as Record<string, unknown>
      const day = String(o.day ?? o.weekday ?? o.dayOfWeek ?? o.星期 ?? '').trim()
      const start = String(o.startTime ?? o.start ?? o.begin ?? '').trim()
      const end = String(o.endTime ?? o.end ?? '').trim()
      const timeRange = String(o.time ?? o.timeRange ?? o.时段 ?? '').trim()
      const activity = String(o.activity ?? o.title ?? o.name ?? o.content ?? o.事项 ?? '').trim()
      const tag = String(o.tag ?? o.标签 ?? '').trim()
      const location = String(o.location ?? o.place ?? o.地点 ?? '').trim()
      const storyDay = String(o.storyDay ?? o.date ?? o.日期 ?? '').trim()
      if (!activity) continue
      const range = timeRange || (start && end ? `${start}-${end}` : start || '')
      if (!range) continue
      const head = storyDay || day
      if (!head) continue
      const extras = [
        tag ? `#${tag.replace(/^#/, '')}` : '',
        location ? `@${location.replace(/^@/, '')}` : '',
      ]
        .filter(Boolean)
        .join(' ')
      lines.push(`${head} ${range} ${activity}${extras ? ` ${extras}` : ''}`.trim())
    }
    return lines.length ? lines.join('\n') : null
  }

  // 误出 JSON（整段或夹在说明文字中间）时，摊成纯文本行
  const tryJsonBlobs: string[] = []
  if (/^\s*[\[{]/.test(trimmed)) tryJsonBlobs.push(trimmed)
  const arrMatch = trimmed.match(/\[[\s\S]*\]/)
  if (arrMatch?.[0]) tryJsonBlobs.push(arrMatch[0])
  const objMatch = trimmed.match(/\{[\s\S]*\}/)
  if (objMatch?.[0]) tryJsonBlobs.push(objMatch[0])
  for (const blob of tryJsonBlobs) {
    try {
      const flat = flattenScheduleJson(JSON.parse(blob) as unknown)
      if (flat) return flat
    } catch {
      /* next */
    }
  }

  // 全角冒号/数字常见误写
  return text
    .replace(/：/g, ':')
    .replace(/[０-９]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xff10 + 0x30))
}

function addMinutesToHHmm(hhmm: string, minutes: number): string {
  const p = parseHHmm(hhmm)
  if (!p) return hhmm
  const [h0, m0] = p.split(':').map(Number)
  const total = (((h0 || 0) * 60 + (m0 || 0) + minutes) % (24 * 60) + 24 * 60) % (24 * 60)
  return `${pad2(Math.floor(total / 60))}:${pad2(total % 60)}`
}

/**
 * 解析 AI 整周日程纯文本（非 JSON）。
 * 每行一条，推荐：
 *   周一 08:30-09:00 晨间慢跑 #休憩 @小区北门跑道 ~30分钟
 * 也兼容管道分隔：周一|08:30-09:00|活动|#标签|@地点|~时长
 * 结束时刻可省略（默认 +60 分钟）。
 */
export function parseScheduleWeekPlainText(raw: string): ScheduleEntry[] {
  const text = preprocessScheduleAiPlainText(raw)
  const out: ScheduleEntry[] = []
  let currentDay: ScheduleDayOfWeek | null = null

  for (const line0 of text.split('\n')) {
    let line = line0.trim()
    if (!line) continue
    if (/^(SCHEDULE|日程|整周|输出|说明|格式|规则|身份锚定|硬约束)/i.test(line) && !/\d{1,2}:\d{2}/.test(line))
      continue
    if (/^[-*•、．.\d]+[.、)）]\s*/.test(line)) {
      line = line.replace(/^[-*•、．.\d]+[.、)）]\s*/, '')
    }

    // 单独的星期标题行：【周一】 / ## 周二 / 周三：
    const dayOnly = line.match(/^(?:#{1,3}\s*|【)?\s*(周[一二三四五六日天])\s*(?:】|:|：)?\s*$/)
    if (dayOnly) {
      currentDay = weekdayZhToMonday0(dayOnly[1]!)
      continue
    }

    let day: ScheduleDayOfWeek | null = null

    // 管道格式
    if (line.includes('|')) {
      const parts = line.split('|').map((x) => x.trim()).filter(Boolean)
      if (parts.length >= 3) {
        day = weekdayZhToMonday0(parts[0]!) ?? currentDay
        const range = parseTimeRange(parts[1]!)
        const startOnly = !range ? parseHHmm(parts[1]!) : null
        if (!day || (!range && !startOnly)) continue
        let activity = parts[2] ?? ''
        let tag = ''
        let location = ''
        let durationAmount: number | null = null
        let durationUnit: ScheduleDurationUnit | null = null
        for (let i = 3; i < parts.length; i++) {
          const p = parts[i]!
          if (p.startsWith('#')) tag = p.slice(1).trim()
          else if (p.startsWith('@')) location = p.slice(1).trim()
          else if (p.startsWith('~') || p.startsWith('～')) {
            const d = parseDurationPhrase(p.slice(1))
            if (d) {
              durationAmount = d.amount
              durationUnit = d.unit
            }
          } else if (!tag && !location) tag = p.replace(/^标签[:：]?/, '').trim()
          else if (!location) location = p.replace(/^地点[:：]?/, '').trim()
        }
        // 模型常把 #/@/~ 写进活动列；再剥离一次
        if (/[#@~～]/.test(activity)) {
          const extras = stripScheduleBodyExtras(activity)
          activity = extras.activity
          if (!tag && extras.tag) tag = extras.tag
          if (!location && extras.location) location = extras.location
          if (durationAmount == null && extras.durationAmount != null) {
            durationAmount = extras.durationAmount
            durationUnit = extras.durationUnit
          }
        }
        activity = stripLegacyExclusiveMarker(activity)
        if (!activity) continue
        const startTime = range?.startTime ?? startOnly!
        const endTime = range?.endTime ?? addMinutesToHHmm(startTime, 60)
        out.push({
          id: uid('sch'),
          dayOfWeek: day,
          startTime,
          endTime,
          activity: activity.slice(0, 120),
          tag: tag.slice(0, 24) || inferTag(activity),
          location: location.slice(0, 80),
          durationAmount,
          durationUnit,
        })
        continue
      }
    }

    // 空格格式：周一 08:30-09:00 活动…；结束时刻可省略
    const m = line.match(
      /^(周[一二三四五六日天])?\s*(\d{1,2}:\d{2})(?:\s*[-–—~～至到]\s*(\d{1,2}:\d{2}))?\s+(.+)$/,
    )
    if (!m) continue
    day = (m[1] ? weekdayZhToMonday0(m[1]) : null) ?? currentDay
    const startTime = parseHHmm(m[2]!)
    const endTime = m[3] ? parseHHmm(m[3]) : startTime ? addMinutesToHHmm(startTime, 60) : null
    if (day == null || !startTime || !endTime) continue

    const extras = stripScheduleBodyExtras(m[4]!)
    if (!extras.activity) continue
    out.push({
      id: uid('sch'),
      dayOfWeek: day,
      startTime,
      endTime,
      activity: extras.activity.slice(0, 120),
      tag: extras.tag.slice(0, 24) || inferTag(extras.activity),
      location: extras.location.slice(0, 120),
      durationAmount: extras.durationAmount,
      durationUnit: extras.durationUnit,
    })
  }

  return out.sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime))
}

/**
 * 解析 AI 日历日程纯文本（非 JSON）。
 * 每行一条，推荐：
 *   2026年10月22日 19:00-20:30 看电影 #社交 @万达 ~90分钟
 * 也兼容「明天 / 后天」等相对日（需传入锚点日换算）。
 */
export function parseScheduleCalendarPlainText(
  raw: string,
  anchorStoryDay?: string | null,
): ScheduleCalendarEvent[] {
  const text = preprocessScheduleAiPlainText(raw)
  const anchor =
    String(anchorStoryDay ?? '').trim() || formatGregorianStoryDay(new Date())
  const out: ScheduleCalendarEvent[] = []
  const now = Date.now()

  for (const line0 of text.split('\n')) {
    let line = line0.trim()
    if (!line) continue
    if (
      /^(SCHEDULE|日程|日历|输出|说明|格式|规则|身份锚定|硬约束)/i.test(line) &&
      !/\d{1,2}:\d{2}/.test(line)
    )
      continue
    if (/^[-*•、．.\d]+[.、)）]\s*/.test(line)) {
      line = line.replace(/^[-*•、．.\d]+[.、)）]\s*/, '')
    }

    let storyDay = ''
    let rest = line
    const abs = line.match(/^(\d{4}年\d{1,2}月\d{1,2}日)\s+(.+)$/)
    const absSlash = line.match(/^(\d{4}[-\/]\d{1,2}[-\/]\d{1,2})\s+(.+)$/)
    if (abs) {
      storyDay = abs[1]!
      rest = abs[2]!
    } else if (absSlash) {
      const bits = absSlash[1]!.split(/[-\/]/).map((x) => Number(x))
      if (bits.length === 3 && bits.every((n) => Number.isFinite(n))) {
        storyDay = `${bits[0]}年${bits[1]}月${bits[2]}日`
        rest = absSlash[2]!
      } else {
        continue
      }
    } else if (/^(今天|今日|今晚|今夜)\s+/.test(line)) {
      storyDay = anchor
      rest = line.replace(/^(今天|今日|今晚|今夜)\s+/, '')
    } else if (/^(明天|明日|明晚)\s+/.test(line)) {
      storyDay = shiftGregorianStoryDay(anchor, 1)
      rest = line.replace(/^(明天|明日|明晚)\s+/, '')
    } else if (/^后天\s+/.test(line)) {
      storyDay = shiftGregorianStoryDay(anchor, 2)
      rest = line.replace(/^后天\s+/, '')
    } else if (/^大后天\s+/.test(line)) {
      storyDay = shiftGregorianStoryDay(anchor, 3)
      rest = line.replace(/^大后天\s+/, '')
    } else {
      continue
    }

    const m = rest.match(/^(\d{1,2}:\d{2})(?:\s*[-–—~～至到]\s*(\d{1,2}:\d{2}))?\s+(.+)$/)
    if (!m) continue
    const startTime = parseHHmm(m[1]!)
    const endTime = m[2] ? parseHHmm(m[2]) : null
    if (!startTime) continue

    const extras = stripScheduleBodyExtras(m[3]!)
    if (!extras.activity) continue
    out.push({
      id: uid('sce'),
      storyDay: storyDay.slice(0, 64),
      startTime,
      endTime,
      activity: extras.activity.slice(0, 120),
      tag: extras.tag.slice(0, 24) || inferTag(extras.activity),
      location: extras.location.slice(0, 120),
      durationAmount: extras.durationAmount,
      durationUnit:
        extras.durationUnit ?? (extras.durationAmount != null ? 'minute' : null),
      status: 'upcoming',
      source: 'manual',
      createdAt: now,
      updatedAt: now,
    })
  }

  return normalizeScheduleCalendarEvents(out)
}

function defaultCellStyle(): TableCellStyle {
  return {
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
    highlight: false,
    align: 'left',
  }
}

function makeCell(content: string): TableCell {
  return { content, style: defaultCellStyle(), colspan: 1, rowspan: 1 }
}

/** 将条目写回「时间 × 周一…周日」日常表（供表格编辑器） */
export function scheduleEntriesToDailyTable(
  entries: ScheduleEntry[],
  prev?: ScheduleTable | null,
): ScheduleTable {
  const now = Date.now()
  const headers = ['时间', '周一', '周二', '周三', '周四', '周五', '周六', '周日']
  const slotKeys = new Map<string, { start: string; end: string }>()
  for (const e of entries) {
    const k = `${e.startTime}-${e.endTime}`
    if (!slotKeys.has(k)) slotKeys.set(k, { start: e.startTime, end: e.endTime })
  }
  const slots = [...slotKeys.values()].sort((a, b) => a.start.localeCompare(b.start))
  if (!slots.length) {
    slots.push({ start: '09:00', end: '10:00' }, { start: '14:00', end: '15:00' }, { start: '20:00', end: '21:00' })
  }

  const bySlotDay = new Map<string, ScheduleEntry>()
  for (const e of entries) {
    bySlotDay.set(`${e.startTime}-${e.endTime}|${e.dayOfWeek}`, e)
  }

  const rows: TableCell[][] = slots.map((slot) => {
    const cells: TableCell[] = [makeCell(`${slot.start}-${slot.end}`)]
    for (let d = 0; d < 7; d++) {
      const e = bySlotDay.get(`${slot.start}-${slot.end}|${d}`)
      if (!e) {
        cells.push(makeCell(''))
        continue
      }
      cells.push(makeCell(e.activity))
    }
    return cells
  })

  return {
    id: prev?.id ?? `t-${now}`,
    name: prev?.name?.trim() || '日程表',
    headers,
    rows,
    columnWidths: headers.map((_, i) => (i === 0 ? 88 : 72)),
    rowHeights: rows.map(() => 44),
    style: prev?.style ?? { headerStyle: 'dark', borderStyle: 'solid', rowHeight: 'normal' },
    createdAt: prev?.createdAt ?? now,
    updatedAt: now,
  }
}

function tryParseStoryClock(storyDay?: string | null, storyTime?: string | null): ScheduleClock | null {
  const timeRaw = String(storyTime ?? '').trim()
  const timeMatch = timeRaw.match(/(\d{1,2})\s*[:：]\s*(\d{2})/)
  if (!timeMatch) return null
  const time = parseHHmm(`${timeMatch[1]}:${timeMatch[2]}`)
  if (!time) return null

  const dayRaw = String(storyDay ?? '').trim()
  let day: ScheduleDayOfWeek | null = null
  for (let i = 0; i < WEEKDAY_ZH.length; i++) {
    if (dayRaw.includes(WEEKDAY_ZH[i]!)) {
      day = i as ScheduleDayOfWeek
      break
    }
  }
  if (day == null) {
    const m = dayRaw.match(/(\d{4})[-/年.](\d{1,2})[-/月.](\d{1,2})/)
    if (m) {
      const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
      if (Number.isFinite(d.getTime())) day = jsSundayDowToMonday0(d.getDay())
    }
  }
  if (day == null) {
    // 仅有时段时用系统星期，但来源仍标剧情（时段来自剧情轴）
    day = jsSundayDowToMonday0(new Date().getDay())
  }
  return {
    day,
    time,
    source: 'story',
    label: `${scheduleDayLabel(day)} ${time}`,
  }
}

export function resolveScheduleClock(opts?: {
  currentTimeMs?: number
  storyDay?: string | null
  storyTime?: string | null
  /** 如「2026年10月11日 15:20」或带区间的锚点标签 */
  storyNowLabel?: string | null
  /** true：currentTimeMs 来自剧情/自定义微信时钟（非墙钟兜底） */
  currentTimeIsStory?: boolean
}): ScheduleClock {
  const fromFields = tryParseStoryClock(opts?.storyDay, opts?.storyTime)
  if (fromFields) return fromFields

  const label = String(opts?.storyNowLabel ?? '').trim()
  if (label) {
    const dayMatch = label.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/)
    const clocks = label.match(/(\d{1,2}):(\d{2})/g)
    const lastClock = clocks?.[clocks.length - 1]
    const time = lastClock ? parseHHmm(lastClock) : null
    if (dayMatch) {
      const d = new Date(Number(dayMatch[1]), Number(dayMatch[2]) - 1, Number(dayMatch[3]))
      if (Number.isFinite(d.getTime())) {
        const day = jsSundayDowToMonday0(d.getDay())
        const t = time ?? '12:00'
        return {
          day,
          time: t,
          source: 'story',
          label: `${scheduleDayLabel(day)} ${t}`,
        }
      }
    }
    // 仅有「周三 15:20」类
    for (let i = 0; i < WEEKDAY_ZH.length; i++) {
      if (label.includes(WEEKDAY_ZH[i]!)) {
        const t = time ?? '12:00'
        return {
          day: i as ScheduleDayOfWeek,
          time: t,
          source: 'story',
          label: `${WEEKDAY_ZH[i]} ${t}`,
        }
      }
    }
  }

  const ts = Number(opts?.currentTimeMs)
  const safe = Number.isFinite(ts) && ts > 0 ? ts : Date.now()
  const d = new Date(safe)
  const day = jsSundayDowToMonday0(d.getDay())
  const time = formatHHmm(d)
  return {
    day,
    time,
    source: opts?.currentTimeIsStory ? 'story' : 'system',
    label: `${scheduleDayLabel(day)} ${time}`,
  }
}

export function findCurrentScheduleSlot(
  entries: ScheduleEntry[],
  current: { day: number; time: string },
): ScheduleEntry | null {
  const t = parseHHmm(current.time) ?? current.time
  return (
    entries.find(
      (e) => e.dayOfWeek === current.day && e.startTime <= t && t < e.endTime,
    ) ?? null
  )
}

export function entriesForDay(entries: ScheduleEntry[], day: ScheduleDayOfWeek): ScheduleEntry[] {
  return entries
    .filter((e) => e.dayOfWeek === day)
    .sort((a, b) => a.startTime.localeCompare(b.startTime))
}

function hhmmToMin(t: string): number {
  const p = parseHHmm(t)
  if (!p) return 0
  const [h, m] = p.split(':').map(Number)
  return (h ?? 0) * 60 + (m ?? 0)
}

function formatEntryLine(e: ScheduleEntry): string {
  const loc = e.location?.trim() ? ` @${e.location.trim()}` : ''
  const dur = formatScheduleDuration(e.durationAmount, e.durationUnit)
  const durSeg = dur ? ` ·${dur}` : ''
  const tag = e.tag?.trim() ? ` 〔${e.tag.trim()}〕` : ''
  return `- ${e.startTime}-${e.endTime} ${e.activity}${loc}${durSeg}${tag}`
}

/**
 * 收集时间跨度内会碰到的日程条目。
 * - 同日：只取与 [startTime, endTime) 有交集的时段
 * - 跨日：按星期滚动，每天取全日条目（起止日再按时刻裁切）
 * - 跨度 > 7 天：退回「整周周期作息」各星期各一份，避免刷屏
 */
export function collectEntriesForTimeSpan(
  entries: ScheduleEntry[],
  start: ScheduleClock,
  end: ScheduleClock,
): { mode: 'span' | 'weeklyCycle'; items: ScheduleEntry[]; dayCount: number } {
  const startAbs = start.day * 24 * 60 + hhmmToMin(start.time)
  let endDay = end.day
  let endMin = hhmmToMin(end.time)
  let endAbs = endDay * 24 * 60 + endMin
  // 允许跨周：若结束「看起来更早」，按前进理解（最多加 7 天一轮，循环加直到 >= start）
  let guard = 0
  while (endAbs <= startAbs && guard < 8) {
    endAbs += 7 * 24 * 60
    guard += 1
  }
  const spanMinutes = Math.max(0, endAbs - startAbs)
  const spanDays = Math.ceil(spanMinutes / (24 * 60))

  if (spanDays > 7) {
    const byDow = new Map<ScheduleDayOfWeek, ScheduleEntry[]>()
    for (const e of entries) {
      const list = byDow.get(e.dayOfWeek) ?? []
      list.push(e)
      byDow.set(e.dayOfWeek, list)
    }
    const items: ScheduleEntry[] = []
    for (let d = 0; d < 7; d++) {
      const day = d as ScheduleDayOfWeek
      const list = (byDow.get(day) ?? []).sort((a, b) => a.startTime.localeCompare(b.startTime))
      items.push(...list)
    }
    return { mode: 'weeklyCycle', items, dayCount: spanDays }
  }

  const items: ScheduleEntry[] = []
  const seen = new Set<string>()
  for (let offset = 0; offset <= spanDays; offset++) {
    const day = ((start.day + offset) % 7) as ScheduleDayOfWeek
    const dayEntries = entriesForDay(entries, day)
    const isFirst = offset === 0
    const isLast = offset === spanDays
    for (const e of dayEntries) {
      const eStart = hhmmToMin(e.startTime)
      const eEnd = hhmmToMin(e.endTime) <= eStart ? hhmmToMin(e.endTime) + 24 * 60 : hhmmToMin(e.endTime)
      if (isFirst && isLast) {
        const winStart = hhmmToMin(start.time)
        const winEnd = hhmmToMin(end.time) <= winStart ? hhmmToMin(end.time) + 24 * 60 : hhmmToMin(end.time)
        if (eEnd <= winStart || eStart >= winEnd) continue
      } else if (isFirst) {
        if (eEnd <= hhmmToMin(start.time)) continue
      } else if (isLast) {
        if (eStart >= hhmmToMin(end.time) && hhmmToMin(end.time) > 0) continue
      }
      const key = `${e.id}|${day}|${e.startTime}`
      if (seen.has(key)) continue
      seen.add(key)
      items.push(e)
    }
  }
  return { mode: 'span', items, dayCount: spanDays }
}

/** 从推进速度估算结束时钟（auto → null，表示按「时刻点」只注当日） */
export function estimateScheduleSpanEnd(
  start: ScheduleClock,
  pace?: {
    preset?: string
    customAmount?: number
    customUnit?: string
  } | null,
): ScheduleClock | null {
  const preset = pace?.preset ?? 'auto'
  if (preset === 'auto' || !pace) return null

  let addMinutes = 0
  if (preset === 'slow') addMinutes = 12 * 60
  else if (preset === 'medium') addMinutes = 7 * 24 * 60
  else if (preset === 'fast') addMinutes = 90 * 24 * 60
  else if (preset === 'custom') {
    const n = Math.max(0.1, Number(pace.customAmount) || 1)
    const u = pace.customUnit
    if (u === 'hour') addMinutes = n * 60
    else if (u === 'day') addMinutes = n * 24 * 60
    else if (u === 'month') addMinutes = n * 30 * 24 * 60
    else if (u === 'year') addMinutes = n * 365 * 24 * 60
    else addMinutes = n * 24 * 60
  } else return null

  const startMin = start.day * 24 * 60 + hhmmToMin(start.time)
  const endTotal = startMin + Math.round(addMinutes)
  const day = Math.floor(endTotal / (24 * 60)) % 7
  const tod = endTotal % (24 * 60)
  const hh = Math.floor(tod / 60)
  const mm = tod % 60
  const time = `${pad2(hh)}:${pad2(mm)}`
  const dayOfWeek = ((day % 7) + 7) % 7
  return {
    day: dayOfWeek as ScheduleDayOfWeek,
    time,
    source: start.source,
    label: `${scheduleDayLabel(dayOfWeek as ScheduleDayOfWeek)} ${time}`,
  }
}

/**
 * 注入「周循环·生活习惯」（与日历特殊事件并用）。
 * 周循环 = 无重大特殊事项时的日常作息底色；同日冲突时日历优先。
 */
export function formatScheduleNowPromptBlock(params: {
  roleLabel: '角色' | '用户'
  entries: ScheduleEntry[]
  clock: ScheduleClock
  /** 线下跨度结束点；有则按跨度注入 */
  spanEnd?: ScheduleClock | null
}): string {
  const sourceZh = params.clock.source === 'story' ? '剧情时间' : '系统时间'
  const lines: string[] = [
    `【${params.roleLabel}周循环·生活习惯】`,
    `定位：无重大特殊事项时的日常作息/生活习惯（按「周几」对照，每周重复）。`,
    `与日历关系：若同段另有【日历安排】，具体公历日上的特殊事件**优先于**本表；冲突时段以日历为准，周循环退为背景或改口。`,
    `时间基准：${params.clock.label}（${sourceZh}）`,
    `匹配星期：${scheduleDayLabel(params.clock.day)}`,
  ]

  const spanEnd = params.spanEnd
  if (spanEnd && (spanEnd.day !== params.clock.day || spanEnd.time !== params.clock.time)) {
    lines.push(`本轮覆盖时段：${params.clock.label} → ${spanEnd.label}`)
    const { mode, items, dayCount } = collectEntriesForTimeSpan(params.entries, params.clock, spanEnd)
    if (!items.length) {
      lines.push(
        `该时段内没有周循环固定安排，${params.roleLabel}习惯上偏自由——若日历亦无特殊事件，可更随性接话；勿编造未登记的硬安排。`,
      )
      return lines.join('\n')
    }
    if (mode === 'weeklyCycle') {
      lines.push(
        `跨度约 ${dayCount} 天：下列为**一周周期习惯参考**（按星期几对照，勿把整表当成同一天发生）：`,
      )
      let lastDay: number | null = null
      for (const e of items) {
        if (e.dayOfWeek !== lastDay) {
          lastDay = e.dayOfWeek
          lines.push(`${scheduleDayLabel(e.dayOfWeek)}：`)
        }
        lines.push(formatEntryLine(e))
      }
      return lines.join('\n')
    }
    lines.push(`该跨度内相关周循环习惯：`)
    let lastDay: number | null = null
    for (const e of items) {
      if (e.dayOfWeek !== lastDay) {
        lastDay = e.dayOfWeek
        lines.push(`${scheduleDayLabel(e.dayOfWeek)}：`)
      }
      lines.push(formatEntryLine(e))
    }
    return lines.join('\n')
  }

  const today = entriesForDay(params.entries, params.clock.day)
  const slot = findCurrentScheduleSlot(params.entries, params.clock)
  if (slot) {
    const loc = slot.location?.trim() ? ` ·${slot.location.trim()}` : ''
    lines.push(
      `${params.roleLabel}此刻（周循环习惯）：${slot.activity}${loc}` +
        `（${slot.startTime}-${slot.endTime}；若日历同刻有特殊事件则让位日历）`,
    )
  } else {
    lines.push(
      `当前时刻没有周循环固定习惯，${params.roleLabel}习惯上偏自由——勿假装不知道时间；有日历特殊事件时仍须服从日历。`,
    )
  }
  if (today.length) {
    lines.push(`${scheduleDayLabel(params.clock.day)}习惯安排：`)
    for (const e of today) lines.push(formatEntryLine(e))
  } else {
    lines.push(`${scheduleDayLabel(params.clock.day)}暂无登记周循环习惯。`)
  }

  if (params.entries.length) {
    lines.push(`一周习惯总表（按「周几」对照）：`)
    for (let d = 0; d < 7; d++) {
      const day = d as ScheduleDayOfWeek
      const list = entriesForDay(params.entries, day)
      if (!list.length) continue
      lines.push(`${scheduleDayLabel(day)}：`)
      for (const e of list) lines.push(formatEntryLine(e))
    }
  }
  return lines.join('\n')
}

export function resolveCharacterScheduleEntries(character: {
  schedule?: ScheduleTable | null
  scheduleEntries?: ScheduleEntry[] | null
}): ScheduleEntry[] {
  const prior = normalizeScheduleEntries(character.scheduleEntries)
  // 有结构化条目时优先用（含地点/时长/标签）；表格仅作无条目时的回退
  if (prior.length) return prior
  if (character.schedule) {
    return parseScheduleTableToEntries(character.schedule, null)
  }
  return []
}

/** @deprecated 用 scheduleTagAccent(entry.tag) */
export const SCHEDULE_CATEGORY_ACCENT: Record<
  ScheduleCategory,
  { dot: string; card: string; label: string }
> = {
  work: { dot: '#5B6B3A', card: '#5B6B3A', label: '工作' },
  study: { dot: '#3D5A6C', card: '#3D5A6C', label: '学习' },
  social: { dot: '#8B3A3A', card: '#8B3A3A', label: '社交' },
  rest: { dot: '#6A6E76', card: '#6A6E76', label: '休息' },
  storyExclusive: { dot: '#A89C8C', card: '#A89C8C', label: '未分类' },
}

/** 日历日程时间锚点（公历日 + 时刻；剧情优先 / 系统兜底） */
export type ScheduleCalendarAnchor = {
  storyDay: string
  time: string
  source: 'story' | 'system'
  label: string
  dayOfWeek: ScheduleDayOfWeek
  ms: number
}

export function formatGregorianStoryDay(d: Date): string {
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
}

/** 解析「2026年10月21日」(+ 可选 HH:mm) → 毫秒 */
export function parseGregorianStoryDayToMs(
  storyDay: string | null | undefined,
  time?: string | null,
): number | null {
  const dayRaw = String(storyDay ?? '').trim()
  const m = dayRaw.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/)
  if (!m) return null
  const y = Number(m[1])
  const mo = Number(m[2])
  const day = Number(m[3])
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(day)) return null
  const t = parseHHmm(String(time ?? '').trim()) ?? '00:00'
  const [hh, mm] = t.split(':').map(Number)
  const d = new Date(y, mo - 1, day, hh ?? 0, mm ?? 0, 0, 0)
  const ms = d.getTime()
  return Number.isFinite(ms) ? ms : null
}

export function shiftGregorianStoryDay(storyDay: string, deltaDays: number): string {
  const ms = parseGregorianStoryDayToMs(storyDay, '12:00')
  if (ms == null) return storyDay
  const d = new Date(ms + deltaDays * 24 * 60 * 60 * 1000)
  return formatGregorianStoryDay(d)
}

/**
 * 解析日历显示/收束用的公历锚点。
 * 优先 storyDay/storyTime 或 storyNowLabel；否则 currentTimeMs / 墙钟。
 */
export function resolveCalendarAnchor(opts?: {
  currentTimeMs?: number
  currentTimeIsStory?: boolean
  storyDay?: string | null
  storyTime?: string | null
  storyNowLabel?: string | null
}): ScheduleCalendarAnchor {
  const label = String(opts?.storyNowLabel ?? '').trim()
  const fromLabelDay = label.match(/(\d{4}年\d{1,2}月\d{1,2}日)/)?.[1]
  const clocks = label.match(/(\d{1,2}):(\d{2})/g)
  const fromLabelTime = clocks?.[clocks.length - 1] ?? null

  const storyDayField = String(opts?.storyDay ?? '').trim()
  const storyTimeField = String(opts?.storyTime ?? '').trim()
  const dayPart = storyDayField.match(/(\d{4}年\d{1,2}月\d{1,2}日)/)?.[1] || fromLabelDay || ''
  const timePart =
    parseHHmm(storyTimeField) ||
    (fromLabelTime ? parseHHmm(fromLabelTime) : null) ||
    null

  if (dayPart) {
    const t = timePart ?? '12:00'
    const ms = parseGregorianStoryDayToMs(dayPart, t)
    if (ms != null) {
      const d = new Date(ms)
      return {
        storyDay: dayPart,
        time: t,
        source: 'story',
        label: `${dayPart} ${t}`,
        dayOfWeek: jsSundayDowToMonday0(d.getDay()),
        ms,
      }
    }
  }

  const ts = Number(opts?.currentTimeMs)
  const safe = Number.isFinite(ts) && ts > 0 ? ts : Date.now()
  const d = new Date(safe)
  const storyDay = formatGregorianStoryDay(d)
  const time = formatHHmm(d)
  return {
    storyDay,
    time,
    source: opts?.currentTimeIsStory ? 'story' : 'system',
    label: `${storyDay} ${time}`,
    dayOfWeek: jsSundayDowToMonday0(d.getDay()),
    ms: safe,
  }
}

/** upcoming 且严格早于锚点 → past（不擅自改 done） */
export function closePastScheduleCalendarEvents(
  events: ScheduleCalendarEvent[],
  anchor: ScheduleCalendarAnchor,
): ScheduleCalendarEvent[] {
  const nowMs = anchor.ms
  const updatedAt = Date.now()
  return events.map((e) => {
    if (e.status !== 'upcoming') return e
    const eventMs = parseGregorianStoryDayToMs(e.storyDay, e.startTime)
    if (eventMs == null || eventMs >= nowMs) return e
    return { ...e, status: 'past' as const, updatedAt }
  })
}

export function eventsForCalendarDay(
  events: ScheduleCalendarEvent[],
  storyDay: string,
): ScheduleCalendarEvent[] {
  const day = storyDay.trim()
  return events
    .filter((e) => e.storyDay.trim() === day)
    .sort((a, b) => a.startTime.localeCompare(b.startTime))
}

const CAL_STATUS_ZH: Record<ScheduleCalendarEventStatus, string> = {
  upcoming: '未到',
  past: '已过期',
  done: '已完成',
  skipped: '已跳过',
}

function formatCalendarEventLine(e: ScheduleCalendarEvent): string {
  const end = e.endTime ? `-${e.endTime}` : ''
  const loc = e.location?.trim() ? ` @${e.location.trim()}` : ''
  const dur = formatScheduleDuration(e.durationAmount, e.durationUnit)
  const durSeg = dur ? ` ·${dur}` : ''
  const tag = e.tag?.trim() ? ` 〔${e.tag.trim()}〕` : ''
  const st = CAL_STATUS_ZH[e.status] ?? e.status
  return `- ${e.storyDay} ${e.startTime}${end} ${e.activity}${loc}${durSeg}${tag} 〔${st}〕`
}

/**
 * 注入日历特殊事件（优先于周循环）。
 * 不按固定天数截断：登记中的未到期事项尽量全给；由模型按提问与人设分享欲决定开口说多久。
 */
export function formatScheduleCalendarPromptBlock(params: {
  roleLabel: '角色' | '用户'
  events: ScheduleCalendarEvent[]
  anchor: ScheduleCalendarAnchor
  /** @deprecated 不再按天数截断；保留参数以免旧调用报错 */
  lookaheadDays?: number
}): string {
  const closed = closePastScheduleCalendarEvents(params.events, params.anchor)
  if (!closed.length) return ''
  const sourceZh = params.anchor.source === 'story' ? '剧情时间' : '系统时间'
  const day = params.anchor.storyDay
  const yesterday = shiftGregorianStoryDay(day, -1)
  const yesterdayMs = parseGregorianStoryDayToMs(yesterday, '00:00') ?? params.anchor.ms

  // 昨日及之后全部事项 + 所有仍为「未到」的事项（不限天数）
  const relevant = closed
    .filter((e) => {
      if (e.status === 'upcoming') return true
      const ms = parseGregorianStoryDayToMs(e.storyDay, e.startTime)
      return ms != null && ms >= yesterdayMs
    })
    .sort(
      (a, b) =>
        a.storyDay.localeCompare(b.storyDay, 'zh-CN') ||
        a.startTime.localeCompare(b.startTime),
    )
  // 仅防极端过长撑爆上下文；优先保留更近的
  const MAX = 80
  const listed =
    relevant.length <= MAX
      ? relevant
      : (() => {
          const upcoming = relevant.filter((e) => e.status === 'upcoming')
          const rest = relevant.filter((e) => e.status !== 'upcoming')
          const keep = [...upcoming, ...rest].slice(0, MAX)
          return keep.sort(
            (a, b) =>
              a.storyDay.localeCompare(b.storyDay, 'zh-CN') ||
              a.startTime.localeCompare(b.startTime),
          )
        })()

  const lines: string[] = [
    `【${params.roleLabel}日历安排·特殊事件（优先于周循环）】`,
    `时间锚点：${params.anchor.label}（${sourceZh}）`,
    `定位：具体公历日上的特殊/重大安排（约会、考试、演出、出差、约定等）。与【周循环·生活习惯】并用时：**日历优先**；无日历冲突的日子才按周循环习惯过日子。`,
    `开口范围（由你判断，客户端不截固定天数）：下列为已登记清单（含较远未到期项）。先回应用户问到的时段；再按人设分享欲决定要不要顺带提更远事项——分享欲强可多提一点已登记内容，内敛则点到为止。**禁止**编造清单外硬安排；**禁止**否认清单内事项；用户问「有没有安排」时不得装作完全不知道已登记内容。`,
    `状态：未到=尚未发生；已过期=时刻已过、是否做过未定；已完成/已跳过=已标记。`,
  ]
  if (listed.length) {
    lines.push(`已登记特殊事件（共 ${listed.length} 条${relevant.length > MAX ? `，近端优先截取自 ${relevant.length}` : ''}）：`)
    for (const e of listed) lines.push(formatCalendarEventLine(e))
  } else {
    lines.push(`暂无登记的日历特殊事件——近期具体日安排可回落到周循环习惯。`)
  }
  return lines.join('\n')
}
