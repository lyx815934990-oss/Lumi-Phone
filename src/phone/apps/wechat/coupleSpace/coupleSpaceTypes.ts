import type { RelationshipStage } from '../wechatChatPrompt'

export const COUPLE_SPACE_KV_KEY = 'wechat-couple-space-v1'

/** 柔和乙女 spring：比成就/任务蜡封更高 damping、更慢 */
export const COUPLE_SPRING = {
  type: 'spring' as const,
  stiffness: 118,
  damping: 22,
  mass: 0.95,
}

export const COUPLE_SPRING_SLOW = {
  type: 'spring' as const,
  stiffness: 90,
  damping: 26,
  mass: 1.05,
}

export type CoupleDiaryAuthor = 'user' | 'char'

/** 用户主动请求角色对日记的操作（与「纳入记忆」互不耦合） */
export type CoupleDiaryCharActionKind = 'comment' | 'continue'

export type CoupleDiaryCharActions = {
  requested: CoupleDiaryCharActionKind[]
  /** 角色生成的评论或续写正文 */
  response?: string
  respondedAt?: number
}

export type CoupleSpaceBinding = {
  boundAt: number
  acceptedReplyText: string
  userDisplayName: string
  charDisplayName: string
  relationshipStageAtBind?: RelationshipStage
}

export type CoupleDiaryEntry = {
  id: string
  author: CoupleDiaryAuthor
  content: string
  createdAt: number
  /** 对方可见时间；未写完前为 undefined */
  revealedToPeerAt?: number
  /**
   * 是否纳入 {{char}} 记忆（聊天/约会等上下文查询层只取 true）。
   * 默认 false：日记先是私人碎碎念，分享须主动开启。
   */
  includeInMemory?: boolean
  /** 求评论 / 邀请续写（与 includeInMemory 独立） */
  charActions?: CoupleDiaryCharActions
}

export type CoupleMilestoneRepeat = 'none' | 'yearly' | 'monthly'

export type CoupleMilestoneCategory = 'life' | 'love' | 'memory'

/** 列表徽章 / 主卡点缀色（主题 token，非任意 hex） */
export type CoupleMilestoneAccent = 'rose' | 'gold' | 'lavender' | 'mint' | 'sky'

export const COUPLE_MILESTONE_ACCENT_OPTIONS: Array<{
  id: CoupleMilestoneAccent
  label: string
}> = [
  { id: 'rose', label: '玫瑰' },
  { id: 'gold', label: '鎏金' },
  { id: 'lavender', label: '雾紫' },
  { id: 'mint', label: '薄荷' },
  { id: 'sky', label: '晴空' },
]

export type CoupleMilestone = {
  id: string
  title: string
  /** YYYY-MM-DD（本地日） */
  dateKey: string
  kind: 'binding' | 'meet' | 'custom'
  createdAt: number
  /** 置顶到列表上方 / 优先作主日子 */
  pinned?: boolean
  /** 重复规则 */
  repeat?: CoupleMilestoneRepeat
  /** 分类（倒数本） */
  category?: CoupleMilestoneCategory
  /**
   * 本地定期提醒（全局仪式弹层）。
   * 未设置则不提醒；普通目标日仅在目标日当天 0:00 提醒；
   * 纪念日 / 年·月重复则按 remindOffsetDays：0=当天，1/3/7=提前第 N 天的 0:00（只弹那一天）。
   * 若设置 timeKey，则须到了该时刻后才弹。
   */
  remindOffsetDays?: number
  /** 结束日 YYYY-MM-DD（区间日子） */
  endDateKey?: string
  /** 精确时刻 HH:mm（提醒到点；缺省按当天 0:00） */
  timeKey?: string
  /** +1 日：已经过的天数少算起始日当天（从次日开始计） */
  countFromNextDay?: boolean
  /** 列表徽章强调色 */
  accent?: CoupleMilestoneAccent
  /** 列表高亮（浅底描边，可与置顶并存） */
  highlight?: boolean
}

export function normalizeCoupleMilestoneTimeKey(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined
  const t = raw.trim()
  if (!/^\d{1,2}:\d{2}$/.test(t)) return undefined
  const [h, m] = t.split(':').map(Number)
  if (!Number.isFinite(h) || !Number.isFinite(m) || h! < 0 || h! > 23 || m! < 0 || m! > 59) {
    return undefined
  }
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function normalizeCoupleMilestoneAccent(raw: unknown): CoupleMilestoneAccent | undefined {
  if (raw === 'rose' || raw === 'gold' || raw === 'lavender' || raw === 'mint' || raw === 'sky') {
    return raw
  }
  return undefined
}

export function coupleMilestoneAccentLabel(accent?: CoupleMilestoneAccent | null): string {
  if (!accent) return '默认'
  return COUPLE_MILESTONE_ACCENT_OPTIONS.find((o) => o.id === accent)?.label ?? '默认'
}

/** 缺省色：按倒数本映射 */
export function coupleMilestoneResolvedAccent(m: {
  accent?: CoupleMilestoneAccent
  category?: CoupleMilestoneCategory
}): CoupleMilestoneAccent {
  if (m.accent) return m.accent
  if (m.category === 'love') return 'rose'
  if (m.category === 'memory') return 'gold'
  return 'lavender'
}

export type CoupleNicknameCard = {
  userToChar: string
  charToUser: string
  updatedAt: number
}

/** 第二三批占位 */
export type CoupleMoodEntry = {
  id: string
  author: CoupleDiaryAuthor
  dayKey: string
  label: string
  createdAt: number
}

export type CoupleWishItem = {
  id: string
  text: string
  done: boolean
  createdAt: number
  completedAt?: number
}

export type CoupleDecorItem = {
  id: string
  unlockKey: string
  placed: boolean
  x?: number
  y?: number
}

export type CoupleGoodnightLog = {
  dayKey: string
  userSaidAt?: number
  charSaidAt?: number
}

export type CouplePeriodFlow = 'light' | 'medium' | 'heavy'

export type CouplePeriodPain = 0 | 1 | 2 | 3

/** 经期心情（记录用，可纳入记忆） */
export type CouplePeriodMood =
  | 'calm'
  | 'low'
  | 'irritable'
  | 'sensitive'
  | 'tired'
  | 'anxious'

export const COUPLE_PERIOD_MOOD_OPTIONS: CouplePeriodMood[] = [
  'calm',
  'low',
  'irritable',
  'sensitive',
  'tired',
  'anxious',
]

/** 经期求角色暖心回复 */
export type CouplePeriodCharActionKind = 'warm_comment'

export type CouplePeriodCharActions = {
  requested: CouplePeriodCharActionKind[]
  response?: string
  respondedAt?: number
  /** 自动关心最近一次已触发的本地日 YYYY-MM-DD（同日不重复） */
  autoCareDateKey?: string
}

/** 经期内某一天的记录 */
export type CouplePeriodDayEntry = {
  dateKey: string
  flow?: CouplePeriodFlow
  pain?: CouplePeriodPain
  mood?: CouplePeriodMood
}

/** 一次经期周期记录 */
export type CouplePeriodCycle = {
  id: string
  /** 月经开始日 YYYY-MM-DD */
  startDateKey: string
  /** 结束日；未结束可空 */
  endDateKey?: string
  /**
   * 整段摘要（兼容旧数据 / 记忆注入）：有 `days` 时由峰值等回填。
   * 新写入以 `days` 为准。
   */
  flow?: CouplePeriodFlow
  pain?: CouplePeriodPain
  mood?: CouplePeriodMood
  /** 按天流量 / 痛感 / 心情 */
  days?: CouplePeriodDayEntry[]
  note?: string
  /** 角色暖心回复（房间内互动，与纳入记忆无关） */
  charActions?: CouplePeriodCharActions
  createdAt: number
}

export type CouplePeriodSettings = {
  /** 平均周期长度（天），默认 28 */
  avgCycleDays: number
  /** 平均经期长度（天），默认 5 */
  avgPeriodDays: number
  /** 经期将至本地提醒：null/未设=关；0=当天；1/2/3=提前 N 天 */
  remindBeforeDays?: number | null
  /** 经期进行中时自动生成 TA 的关心（默认关） */
  autoCare?: boolean
  /**
   * 自动关心每天触发时刻 HH:mm（本地时区）。
   * 开了 autoCare 但未设时按 09:00；到点未在线则之后上线补一次。
   */
  autoCareTimeKey?: string
}

export type CouplePeriodState = {
  cycles: CouplePeriodCycle[]
  settings: CouplePeriodSettings
}

export function defaultCouplePeriodSettings(): CouplePeriodSettings {
  return { avgCycleDays: 28, avgPeriodDays: 5 }
}

export function emptyCouplePeriodState(): CouplePeriodState {
  return { cycles: [], settings: defaultCouplePeriodSettings() }
}

export function normalizeCouplePeriodSettings(raw: unknown): CouplePeriodSettings {
  const base = defaultCouplePeriodSettings()
  if (!raw || typeof raw !== 'object') return base
  const r = raw as Partial<CouplePeriodSettings>
  const avgCycleDays =
    typeof r.avgCycleDays === 'number' && Number.isFinite(r.avgCycleDays)
      ? Math.min(45, Math.max(21, Math.round(r.avgCycleDays)))
      : base.avgCycleDays
  const avgPeriodDays =
    typeof r.avgPeriodDays === 'number' && Number.isFinite(r.avgPeriodDays)
      ? Math.min(10, Math.max(2, Math.round(r.avgPeriodDays)))
      : base.avgPeriodDays
  const remindRaw = r.remindBeforeDays
  const remindBeforeDays =
    remindRaw === 0 || remindRaw === 1 || remindRaw === 2 || remindRaw === 3
      ? remindRaw
      : undefined
  const autoCareTimeKey =
    r.autoCare === true ? normalizeCoupleMilestoneTimeKey(r.autoCareTimeKey) : undefined
  return {
    avgCycleDays,
    avgPeriodDays,
    ...(remindBeforeDays != null ? { remindBeforeDays } : {}),
    ...(r.autoCare === true ? { autoCare: true } : {}),
    ...(autoCareTimeKey ? { autoCareTimeKey } : {}),
  }
}

export function normalizeCouplePeriodCycle(raw: unknown): CouplePeriodCycle | null {
  if (!raw || typeof raw !== 'object') return null
  const c = raw as Partial<CouplePeriodCycle>
  if (typeof c.id !== 'string' || !c.id.trim()) return null
  const startDateKey = String(c.startDateKey ?? '').trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDateKey)) return null
  const endRaw = typeof c.endDateKey === 'string' ? c.endDateKey.trim() : ''
  const endDateKey =
    /^\d{4}-\d{2}-\d{2}$/.test(endRaw) && endRaw >= startDateKey ? endRaw : undefined
  const flow =
    c.flow === 'light' || c.flow === 'medium' || c.flow === 'heavy' ? c.flow : undefined
  const pain =
    c.pain === 0 || c.pain === 1 || c.pain === 2 || c.pain === 3 ? c.pain : undefined
  const mood =
    c.mood === 'calm' ||
    c.mood === 'low' ||
    c.mood === 'irritable' ||
    c.mood === 'sensitive' ||
    c.mood === 'tired' ||
    c.mood === 'anxious'
      ? c.mood
      : undefined
  const note = String(c.note ?? '').trim().slice(0, 120)
  const charActions = normalizeCouplePeriodCharActions(c.charActions)
  let days = Array.isArray(c.days)
    ? c.days
        .map((d) => {
          if (!d || typeof d !== 'object') return null
          const dateKey = String((d as CouplePeriodDayEntry).dateKey ?? '').trim()
          if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return null
          const df = (d as CouplePeriodDayEntry).flow
          const dp = (d as CouplePeriodDayEntry).pain
          const dm = (d as CouplePeriodDayEntry).mood
          const dayFlow =
            df === 'light' || df === 'medium' || df === 'heavy' ? df : undefined
          const dayPain =
            dp === 0 || dp === 1 || dp === 2 || dp === 3 ? dp : undefined
          const dayMood =
            dm === 'calm' ||
            dm === 'low' ||
            dm === 'irritable' ||
            dm === 'sensitive' ||
            dm === 'tired' ||
            dm === 'anxious'
              ? dm
              : undefined
          if (!dayFlow && dayPain == null && !dayMood) return null
          return {
            dateKey,
            ...(dayFlow ? { flow: dayFlow } : {}),
            ...(dayPain != null ? { pain: dayPain } : {}),
            ...(dayMood ? { mood: dayMood } : {}),
          } satisfies CouplePeriodDayEntry
        })
        .filter((d): d is CouplePeriodDayEntry => !!d)
        .sort((a, b) => a.dateKey.localeCompare(b.dateKey))
    : []
  // 旧数据只有整段字段：落到开始日
  if (!days.length && (flow || pain != null || mood)) {
    days = [
      {
        dateKey: startDateKey,
        ...(flow ? { flow } : {}),
        ...(pain != null ? { pain } : {}),
        ...(mood ? { mood } : {}),
      },
    ]
  }
  return {
    id: c.id.trim(),
    startDateKey,
    createdAt:
      typeof c.createdAt === 'number' && Number.isFinite(c.createdAt) ? c.createdAt : Date.now(),
    ...(endDateKey ? { endDateKey } : {}),
    ...(flow ? { flow } : {}),
    ...(pain != null ? { pain } : {}),
    ...(mood ? { mood } : {}),
    ...(days.length ? { days } : {}),
    ...(note ? { note } : {}),
    ...(charActions ? { charActions } : {}),
  }
}

export function normalizeCouplePeriodCharActions(
  raw: unknown,
): CouplePeriodCharActions | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const r = raw as CouplePeriodCharActions
  const requested = Array.isArray(r.requested)
    ? r.requested.filter((k): k is CouplePeriodCharActionKind => k === 'warm_comment')
    : []
  const response = String(r.response ?? '').trim().slice(0, 1200)
  const respondedAt =
    typeof r.respondedAt === 'number' && Number.isFinite(r.respondedAt) ? r.respondedAt : undefined
  const autoCareDateKeyRaw = String(r.autoCareDateKey ?? '').trim()
  const autoCareDateKey = /^\d{4}-\d{2}-\d{2}$/.test(autoCareDateKeyRaw)
    ? autoCareDateKeyRaw
    : undefined
  if (!requested.length && !response && respondedAt == null && !autoCareDateKey) return undefined
  return {
    requested,
    ...(response ? { response } : {}),
    ...(respondedAt != null ? { respondedAt } : {}),
    ...(autoCareDateKey ? { autoCareDateKey } : {}),
  }
}

export function normalizeCouplePeriodState(raw: unknown): CouplePeriodState {
  if (!raw || typeof raw !== 'object') return emptyCouplePeriodState()
  const r = raw as Partial<CouplePeriodState>
  const cycles = Array.isArray(r.cycles)
    ? r.cycles
        .map((c) => normalizeCouplePeriodCycle(c))
        .filter((c): c is CouplePeriodCycle => !!c)
        .sort((a, b) => b.startDateKey.localeCompare(a.startDateKey))
    : []
  return {
    cycles,
    settings: normalizeCouplePeriodSettings(r.settings),
  }
}

/** 纳入记忆：功能模块 */
export type CoupleMemoryShareModule =
  | 'diary'
  | 'milestones'
  | 'binding'
  | 'period'

export const COUPLE_MEMORY_SHARE_MODULES: CoupleMemoryShareModule[] = [
  'diary',
  'milestones',
  'binding',
  'period',
]

export type CoupleMemoryShareState = {
  /** 模块总开关；关则整块不注入 */
  modules: Record<CoupleMemoryShareModule, boolean>
  /**
   * 纪念日分区勾选：
   * - 'all'：模块开时注入全部纪念日
   * - string[]：仅这些 id（可为空 = 模块开也不注条目）
   */
  milestoneIds: string[] | 'all'
}

export function defaultCoupleMemoryShareModules(): Record<CoupleMemoryShareModule, boolean> {
  return {
    diary: false,
    milestones: false,
    binding: false,
    period: false,
  }
}

export function emptyCoupleMemoryShareState(): CoupleMemoryShareState {
  return {
    modules: defaultCoupleMemoryShareModules(),
    milestoneIds: 'all',
  }
}

export function normalizeCoupleMemoryShareState(raw: unknown): CoupleMemoryShareState {
  const base = emptyCoupleMemoryShareState()
  if (!raw || typeof raw !== 'object') return base
  const r = raw as Partial<CoupleMemoryShareState>
  const modules = { ...base.modules }
  if (r.modules && typeof r.modules === 'object') {
    for (const key of COUPLE_MEMORY_SHARE_MODULES) {
      modules[key] = (r.modules as Record<string, unknown>)[key] === true
    }
  }
  let milestoneIds: string[] | 'all' = 'all'
  if (r.milestoneIds === 'all') {
    milestoneIds = 'all'
  } else if (Array.isArray(r.milestoneIds)) {
    milestoneIds = r.milestoneIds
      .filter((id): id is string => typeof id === 'string' && !!id.trim())
      .map((id) => id.trim())
  }
  return { modules, milestoneIds }
}

export type CoupleSpaceRoom = {
  characterId: string
  binding: CoupleSpaceBinding | null
  diary: CoupleDiaryEntry[]
  milestones: CoupleMilestone[]
  nicknames: CoupleNicknameCard
  moods: CoupleMoodEntry[]
  wishes: CoupleWishItem[]
  decor: CoupleDecorItem[]
  goodnight: CoupleGoodnightLog[]
  /** 经期管理（默认私密，仅本房间本地） */
  period: CouplePeriodState
  /** 纳入记忆：模块总闸 + 纪念日分区 */
  memoryShare: CoupleMemoryShareState
}

export type CoupleSpaceAccountData = {
  rooms: Record<string, CoupleSpaceRoom>
}

export type CoupleSpacePersistedRoot = {
  byAccount: Record<string, CoupleSpaceAccountData>
}

export function emptyNicknames(): CoupleNicknameCard {
  return { userToChar: '', charToUser: '', updatedAt: 0 }
}

export function emptyRoom(characterId: string): CoupleSpaceRoom {
  return {
    characterId,
    binding: null,
    diary: [],
    milestones: [],
    nicknames: emptyNicknames(),
    moods: [],
    wishes: [],
    decor: [],
    goodnight: [],
    period: emptyCouplePeriodState(),
    memoryShare: emptyCoupleMemoryShareState(),
  }
}

export function normalizeCoupleDiaryCharActions(raw: unknown): CoupleDiaryCharActions | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const r = raw as CoupleDiaryCharActions
  const requested = Array.isArray(r.requested)
    ? r.requested.filter((k): k is CoupleDiaryCharActionKind => k === 'comment' || k === 'continue')
    : []
  const response = String(r.response ?? '').trim()
  const respondedAt =
    typeof r.respondedAt === 'number' && Number.isFinite(r.respondedAt) ? r.respondedAt : undefined
  if (!requested.length && !response && respondedAt == null) return undefined
  return {
    requested,
    ...(response ? { response } : {}),
    ...(respondedAt != null ? { respondedAt } : {}),
  }
}

export function normalizeCoupleDiaryEntry(raw: unknown): CoupleDiaryEntry | null {
  if (!raw || typeof raw !== 'object') return null
  const e = raw as CoupleDiaryEntry
  if (typeof e.id !== 'string' || !e.id.trim()) return null
  const content = String(e.content ?? '').trim()
  if (!content) return null
  const charActions = normalizeCoupleDiaryCharActions(e.charActions)
  return {
    id: e.id.trim(),
    author: e.author === 'char' ? 'char' : 'user',
    content,
    createdAt: typeof e.createdAt === 'number' && Number.isFinite(e.createdAt) ? e.createdAt : Date.now(),
    ...(typeof e.revealedToPeerAt === 'number' && Number.isFinite(e.revealedToPeerAt)
      ? { revealedToPeerAt: e.revealedToPeerAt }
      : {}),
    includeInMemory: e.includeInMemory === true,
    ...(charActions ? { charActions } : {}),
  }
}

export function isCoupleSpaceBound(room: CoupleSpaceRoom | null | undefined): boolean {
  return room?.binding?.boundAt != null && room.binding.boundAt > 0
}

export function toLocalDateKey(ms: number = Date.now()): string {
  const d = new Date(ms)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function formatCoupleBoundDateLabel(ms: number): string {
  const d = new Date(ms)
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
}

/** 绑定日起算的在一起天数（含当天为第 1 天） */
export function coupleDaysTogether(boundAt: number, nowMs: number = Date.now()): number {
  if (!boundAt || boundAt <= 0) return 0
  const start = new Date(boundAt)
  start.setHours(0, 0, 0, 0)
  const now = new Date(nowMs)
  now.setHours(0, 0, 0, 0)
  const diff = Math.floor((now.getTime() - start.getTime()) / (24 * 3600 * 1000))
  return Math.max(1, diff + 1)
}

export function formatCoupleBookmarkLabel(dateKey: string): string {
  const [, m, d] = dateKey.split('-')
  if (!m || !d) return dateKey
  return `${Number(m)}/${Number(d)}`
}

export function uidCouple(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}
