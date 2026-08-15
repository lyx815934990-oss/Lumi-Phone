import type { HeartRateSample, SleepDataset, SleepHistoryDay, SleepNightRecord, SleepStageSegment } from './types'

/** 简单确定性伪随机，保证同一角色数据稳定可复现 */
function mulberry32(seed: number) {
  let t = seed >>> 0
  return () => {
    t += 0x6d2b79f5
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

function hashStr(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function pad2(n: number) {
  return n < 10 ? `0${n}` : String(n)
}

export function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1, 12, 0, 0, 0)
}

export function formatChineseDate(d: Date): string {
  const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
  return `${d.getMonth() + 1}月${d.getDate()}日 ${weekdays[d.getDay()]}`
}

export function formatDuration(totalMin: number): { hours: number; minutes: number; label: string } {
  const hours = Math.floor(totalMin / 60)
  const minutes = Math.round(totalMin % 60)
  return { hours, minutes, label: `${hours}小时${minutes}分钟` }
}

export function formatClock(iso: string): string {
  const d = new Date(iso)
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

export function qualityLabelFromScore(score: number): string {
  if (score >= 88) return '香甜'
  if (score >= 75) return '良好'
  if (score >= 60) return '还行'
  if (score >= 45) return '一般'
  return '欠佳'
}

const SUMMARIES = [
  '昨晚睡得很沉，只醒了一次，看起来休息得不错。',
  '中间醒了几回，但后来又很快睡着了，整体还算安稳。',
  '入睡有点晚，深睡偏少，白天大概会有点昏沉。',
  'REM 时段挺充足的，梦境大概会比较生动吧。',
  '睡得不算久，但质量还可以，醒来时精神还行。',
  '浅睡偏多，翻来覆去的，夜里不太踏实。',
  '几乎一整夜都很安静，像被夜色轻轻盖住了。',
]

export function buildStages(rand: () => number, totalMin: number): SleepStageSegment[] {
  const segments: SleepStageSegment[] = []
  let cursor = 0
  const kindsCycle: Array<'light' | 'deep' | 'light' | 'rem' | 'light' | 'awake' | 'rem' | 'deep'> = [
    'light',
    'deep',
    'light',
    'rem',
    'light',
    'awake',
    'rem',
    'deep',
  ]
  let i = 0
  while (cursor < totalMin - 8) {
    const kind = kindsCycle[i % kindsCycle.length]!
    i += 1
    const remain = totalMin - cursor
    let dur =
      kind === 'awake'
        ? 4 + Math.floor(rand() * 10)
        : kind === 'deep'
          ? 28 + Math.floor(rand() * 36)
          : kind === 'rem'
            ? 18 + Math.floor(rand() * 28)
            : 22 + Math.floor(rand() * 40)
    dur = Math.min(dur, remain)
    if (dur < 3) break
    segments.push({ kind, startMin: cursor, durationMin: dur })
    cursor += dur
  }
  if (cursor < totalMin) {
    segments.push({ kind: 'light', startMin: cursor, durationMin: totalMin - cursor })
  }
  return segments
}

export function buildHeartRate(rand: () => number, totalMin: number, baseBpm?: number): HeartRateSample[] {
  const samples: HeartRateSample[] = []
  const base = typeof baseBpm === 'number' && Number.isFinite(baseBpm) ? baseBpm : 52 + Math.floor(rand() * 10)
  for (let m = 0; m <= totalMin; m += 8) {
    const wave = Math.sin(m / 55) * 6 + Math.sin(m / 17) * 3
    const noise = (rand() - 0.5) * 4
    const dip = m > totalMin * 0.25 && m < totalMin * 0.55 ? -4 : 0
    samples.push({
      atMin: m,
      bpm: Math.round(Math.max(42, Math.min(88, base + wave + noise + dip))),
    })
  }
  return samples
}

/** 将 stages 补齐 startMin，并按总时长裁剪/补齐 */
export function normalizeStageSegments(raw: unknown, totalMin: number, seed: number): SleepStageSegment[] {
  const rand = mulberry32(seed)
  const kinds = new Set(['deep', 'light', 'rem', 'awake'])
  if (!Array.isArray(raw) || raw.length === 0) return buildStages(rand, totalMin)

  const segments: SleepStageSegment[] = []
  let cursor = 0
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const rec = item as Record<string, unknown>
    const kind = String(rec.kind ?? '').trim()
    if (!kinds.has(kind)) continue
    let durationMin = Math.round(Number(rec.durationMin))
    if (!Number.isFinite(durationMin) || durationMin < 1) continue
    if (cursor >= totalMin) break
    durationMin = Math.min(durationMin, totalMin - cursor)
    const startMin =
      typeof rec.startMin === 'number' && Number.isFinite(rec.startMin) ? Math.max(0, Math.round(rec.startMin)) : cursor
    segments.push({
      kind: kind as SleepStageSegment['kind'],
      startMin,
      durationMin,
    })
    cursor = startMin + durationMin
  }

  if (!segments.length) return buildStages(rand, totalMin)
  // 重新按顺序铺平 startMin，避免 AI 给出重叠
  let t = 0
  const flattened = segments.map((s) => {
    const next = { ...s, startMin: t }
    t += s.durationMin
    return next
  })
  if (t < totalMin) {
    flattened.push({ kind: 'light', startMin: t, durationMin: totalMin - t })
  } else if (t > totalMin) {
    let remain = totalMin
    const clipped: SleepStageSegment[] = []
    for (const s of flattened) {
      if (remain <= 0) break
      const dur = Math.min(s.durationMin, remain)
      clipped.push({ ...s, startMin: totalMin - remain, durationMin: dur })
      remain -= dur
    }
    return clipped
  }
  return flattened
}

export function historyFromNights(nights: SleepNightRecord[]): SleepHistoryDay[] {
  return nights.map((n) => ({
    dateKey: n.dateKey,
    totalSleepMin: n.totalSleepMin,
    qualityScore: n.qualityScore,
  }))
}

export function emptySleepDataset(): SleepDataset {
  return { nights: [], history: [] }
}

export { hashStr, mulberry32 }

function buildNight(params: {
  dateKey: string
  seed: number
  bedHour: number
  bedMin: number
  sleepHours: number
}): SleepNightRecord {
  const rand = mulberry32(params.seed)
  const wake = parseDateKey(params.dateKey)
  const fell = new Date(wake)
  fell.setHours(params.bedHour, params.bedMin, 0, 0)
  if (params.bedHour >= 18) {
    // 前一天晚上入睡
    fell.setDate(fell.getDate() - 1)
  }
  const totalSleepMin = Math.round(params.sleepHours * 60)
  const woke = new Date(fell.getTime() + totalSleepMin * 60_000)
  const stages = buildStages(rand, totalSleepMin)
  const deepMin = stages.filter((s) => s.kind === 'deep').reduce((a, s) => a + s.durationMin, 0)
  const awakeMin = stages.filter((s) => s.kind === 'awake').reduce((a, s) => a + s.durationMin, 0)
  const qualityScore = Math.max(
    38,
    Math.min(96, Math.round(62 + (deepMin / totalSleepMin) * 40 - (awakeMin / totalSleepMin) * 50 + rand() * 8)),
  )
  return {
    dateKey: params.dateKey,
    fellAsleepAt: fell.toISOString(),
    wokeAt: woke.toISOString(),
    totalSleepMin,
    qualityScore,
    qualityLabel: qualityLabelFromScore(qualityScore),
    stages,
    heartRate: buildHeartRate(rand, totalSleepMin),
    summary: SUMMARIES[Math.floor(rand() * SUMMARIES.length)]!,
  }
}

/** 生成最近 7 天（含今天/昨晚）的模拟睡眠数据 */
export function createMockSleepDataset(characterId: string, now = new Date()): SleepDataset {
  const baseSeed = hashStr(characterId || 'anonymous')
  const nights: SleepNightRecord[] = []
  const history: SleepHistoryDay[] = []

  for (let offset = 6; offset >= 0; offset--) {
    const day = new Date(now)
    day.setHours(12, 0, 0, 0)
    day.setDate(day.getDate() - offset)
    const dateKey = toDateKey(day)
    const rand = mulberry32(baseSeed ^ (offset * 9973))
    const bedHour = rand() > 0.55 ? 23 : 22
    const bedMin = Math.floor(rand() * 50)
    const sleepHours = 6.2 + rand() * 2.4
    const night = buildNight({
      dateKey,
      seed: baseSeed ^ hashStr(dateKey),
      bedHour,
      bedMin,
      sleepHours,
    })
    nights.push(night)
    history.push({
      dateKey,
      totalSleepMin: night.totalSleepMin,
      qualityScore: night.qualityScore,
    })
  }

  return { nights, history }
}

export function findNight(dataset: SleepDataset, dateKey: string): SleepNightRecord | undefined {
  return dataset.nights.find((n) => n.dateKey === dateKey)
}

export function stageDurations(stages: SleepStageSegment[]) {
  const map = { deep: 0, light: 0, rem: 0, awake: 0 }
  for (const s of stages) map[s.kind] += s.durationMin
  const total = Object.values(map).reduce((a, b) => a + b, 0) || 1
  return {
    deep: map.deep,
    light: map.light,
    rem: map.rem,
    awake: map.awake,
    total,
    pct: {
      deep: Math.round((map.deep / total) * 100),
      light: Math.round((map.light / total) * 100),
      rem: Math.round((map.rem / total) * 100),
      awake: Math.round((map.awake / total) * 100),
    },
  }
}
