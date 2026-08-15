import type { ScheduleTable } from '../newFriendsPersona/types'
import type { DayScheduleSlot } from './types'

const WEEKDAY_HEADERS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'] as const
const WEEKDAY_ALT = ['日', '一', '二', '三', '四', '五', '六'] as const

function cellText(v: unknown): string {
  if (v == null) return ''
  if (typeof v === 'string') return v.trim()
  if (typeof v === 'object' && v && 'content' in v) return String((v as { content?: unknown }).content ?? '').trim()
  return String(v).trim()
}

function parseTimeRange(raw: string): { startMin: number; endMin: number; timeLabel: string } | null {
  const t = raw.replace(/\s/g, '')
  const m = t.match(/^(\d{1,2}):(\d{2})\s*[-–—~～至到]\s*(\d{1,2}):(\d{2})$/)
  if (!m) return null
  const sh = Number(m[1])
  const sm = Number(m[2])
  const eh = Number(m[3])
  const em = Number(m[4])
  if (![sh, sm, eh, em].every((n) => Number.isFinite(n))) return null
  let startMin = sh * 60 + sm
  let endMin = eh * 60 + em
  if (endMin <= startMin) endMin += 24 * 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return {
    startMin,
    endMin,
    timeLabel: `${pad(sh)}:${pad(sm)}-${pad(eh % 24)}:${pad(em)}`,
  }
}

function findDayColumnIndex(headers: string[], now = new Date()): number {
  const dow = now.getDay() // 0 Sun
  const want = WEEKDAY_HEADERS[dow]!
  const wantShort = WEEKDAY_ALT[dow]!
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i]!.trim()
    if (h === want || h.includes(want)) return i
    if (h === wantShort || h === `周${wantShort}`) return i
  }
  // 英文缩写
  const en = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dow]!
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
  // 学生课表常把时间放在第 2 列
  if (headers.some((h) => /节次|第.+节/.test(h))) {
    const idx = headers.findIndex((h) => /时间|time/i.test(h))
    if (idx >= 0) return idx
  }
  return 0
}

/** 从人设 ScheduleTable 抽出「今天」各时段活动 */
export function parseScheduleTodaySlots(schedule: ScheduleTable | null | undefined, now = new Date()): DayScheduleSlot[] {
  if (!schedule?.headers?.length || !schedule.rows?.length) return []
  const headers = schedule.headers.map((h) => String(h ?? '').trim())
  const dayCol = findDayColumnIndex(headers, now)
  if (dayCol < 0) return []
  const timeCol = findTimeColumnIndex(headers)

  const out: DayScheduleSlot[] = []
  for (const row of schedule.rows) {
    if (!Array.isArray(row) || row.length === 0) continue
    const activity = cellText(row[dayCol])
    if (!activity) continue
    const timeRaw = cellText(row[timeCol]) || cellText(row[0])
    const range = parseTimeRange(timeRaw)
    if (!range) {
      out.push({
        startMin: out.length * 60,
        endMin: out.length * 60 + 60,
        label: activity,
        timeLabel: timeRaw || '全天',
      })
      continue
    }
    out.push({
      startMin: range.startMin,
      endMin: range.endMin,
      label: activity,
      timeLabel: range.timeLabel,
    })
  }
  return out.sort((a, b) => a.startMin - b.startMin)
}
