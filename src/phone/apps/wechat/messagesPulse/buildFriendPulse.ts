import type { ScheduleTable } from '../newFriendsPersona/types'
import { parseScheduleTodaySlots } from './parseScheduleToday'
import { clampMoodLevel } from './moodFaces'
import type {
  FriendMoodLevel,
  FriendPresence,
  FriendPulseContact,
  FriendPulseRow,
  PulseHourBucket,
} from './types'

function hashStr(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** 由人设 id + 日期种子出稳定「伪随机」心情轨（无 AI 日更时的占位） */
export function synthesizeMoodHistory(characterId: string, days = 28, todayMood?: number): FriendMoodLevel[] {
  const out: FriendMoodLevel[] = []
  const today = new Date()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setHours(12, 0, 0, 0)
    d.setDate(d.getDate() - i)
    let level = moodLevelForDate(characterId, d)
    if (i === 0 && typeof todayMood === 'number' && Number.isFinite(todayMood)) {
      level = clampMoodLevel(Math.round((todayMood / 100) * 5))
    }
    out.push(level)
  }
  return out
}

/** 某日心情（稳定种子）；今日可被 todayMoodOverride 0–5 覆盖 */
export function moodLevelForDate(
  characterId: string,
  date: Date,
  todayMoodOverride?: FriendMoodLevel | null,
): FriendMoodLevel {
  const d = new Date(date)
  d.setHours(12, 0, 0, 0)
  const today = new Date()
  today.setHours(12, 0, 0, 0)
  const isToday = d.getTime() === today.getTime()
  if (isToday && todayMoodOverride != null) return clampMoodLevel(todayMoodOverride)
  const key = `${characterId}:${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
  return clampMoodLevel(hashStr(key) % 6)
}

export function inferPresence(opts: {
  characterId: string
  lastActiveMs?: number
  nowMs?: number
}): FriendPresence {
  const now = opts.nowMs ?? Date.now()
  if (opts.lastActiveMs != null && opts.lastActiveMs > 0) {
    const age = now - opts.lastActiveMs
    if (age <= 12 * 60_000) return 'online'
    if (age <= 90 * 60_000) return 'away'
  }
  // 无会话痕迹时：按小时段 + id 做「此刻感」占位（白天更易在线）
  const hour = new Date(now).getHours()
  const h = hashStr(`${opts.characterId}:${Math.floor(now / (20 * 60_000))}`)
  const roll = h % 100
  if (hour >= 0 && hour < 7) return roll < 18 ? 'online' : roll < 35 ? 'away' : 'offline'
  if (hour >= 23) return roll < 28 ? 'online' : roll < 50 ? 'away' : 'offline'
  if (roll < 42) return 'online'
  if (roll < 68) return 'away'
  return 'offline'
}

export function buildFriendPulseRow(opts: {
  contact: FriendPulseContact
  schedule?: ScheduleTable | null
  psycheMood?: number
  lastActiveMs?: number
  now?: Date
}): FriendPulseRow {
  const now = opts.now ?? new Date()
  const moodHistory = synthesizeMoodHistory(opts.contact.characterId, 28, opts.psycheMood)
  return {
    characterId: opts.contact.characterId,
    remarkName: opts.contact.remarkName,
    avatarUrl: opts.contact.avatarUrl,
    presence: inferPresence({
      characterId: opts.contact.characterId,
      lastActiveMs: opts.lastActiveMs,
      nowMs: now.getTime(),
    }),
    moodToday: moodHistory[moodHistory.length - 1] ?? 2,
    moodHistory,
    slots: parseScheduleTodaySlots(opts.schedule, now),
    lastActiveMs: opts.lastActiveMs,
  }
}

/** 把多人当日行程折成「按小时」时间轴 */
export function buildHourBuckets(rows: FriendPulseRow[], filterCharacterId?: string | null): PulseHourBucket[] {
  const list = filterCharacterId
    ? rows.filter((r) => r.characterId === filterCharacterId)
    : rows
  const map = new Map<number, PulseHourBucket>()
  for (let h = 6; h <= 23; h++) {
    map.set(h, { hour: h, label: `${String(h).padStart(2, '0')}:00`, entries: [] })
  }
  // 凌晨段
  for (const h of [0, 1, 2, 3, 4, 5]) {
    map.set(h, { hour: h, label: `${String(h).padStart(2, '0')}:00`, entries: [] })
  }

  for (const row of list) {
    for (const slot of row.slots) {
      const startH = Math.floor((slot.startMin % (24 * 60)) / 60)
      const bucket = map.get(startH)
      if (!bucket) continue
      bucket.entries.push({
        characterId: row.characterId,
        remarkName: row.remarkName,
        avatarUrl: row.avatarUrl,
        activity: slot.label,
        timeLabel: slot.timeLabel,
      })
    }
  }

  // 展示顺序：从早 6 点滚到次日 5 点，且跳过空桶（保留当前小时附近空桶以示「此刻」）
  const order = [...Array.from({ length: 18 }, (_, i) => i + 6), 0, 1, 2, 3, 4, 5]
  const nowH = new Date().getHours()
  return order
    .map((h) => map.get(h)!)
    .filter((b) => b.entries.length > 0 || b.hour === nowH)
}
