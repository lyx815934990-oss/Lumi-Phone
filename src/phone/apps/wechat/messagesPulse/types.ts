/** 信息页「动态」：好友在线 / 心情 / 当日行程 */

export type FriendPresence = 'online' | 'away' | 'offline'

/** 0 生气 · 1 哭泣 · 2 难过 · 3 平静 · 4 微笑 · 5 大笑 */
export type FriendMoodLevel = 0 | 1 | 2 | 3 | 4 | 5

export type FriendPulseContact = {
  characterId: string
  remarkName: string
  avatarUrl?: string
}

/** 当日某一时间段活动 */
export type DayScheduleSlot = {
  startMin: number
  endMin: number
  label: string
  timeLabel: string
}

export type FriendPulseRow = {
  characterId: string
  remarkName: string
  avatarUrl?: string
  presence: FriendPresence
  /** 0–5，今日心情（生气→大笑） */
  moodToday: FriendMoodLevel
  /** 近 28 天心情（含今日，末项为今日） */
  moodHistory: FriendMoodLevel[]
  /** 人设日程表解析出的今日行程；无表则为空 */
  slots: DayScheduleSlot[]
  /** 最近会话活跃时间（用于在线推断） */
  lastActiveMs?: number
  /** 用户本人条目 */
  isSelf?: boolean
  /** 漫画状态气泡：emoji（Unicode 或 [经典表情]）——想法 */
  statusEmoji?: string
  /** 漫画状态气泡文案——想法 */
  statusText?: string
  /** 自定义在线状态，如「工作中」；空则用 presence 默认文案 */
  presenceLabel?: string
  /** 用户状态是否对外发布 */
  statusPublished?: boolean
  /** 状态最近修改时间 */
  statusUpdatedAt?: number
  /** 状态修改时间线 */
  statusHistory?: Array<{
    at: number
    presence: FriendPresence
    presenceLabel: string
    statusEmoji: string
    statusText: string
    moodToday: FriendMoodLevel
  }>
}

export type PulseHourBucket = {
  hour: number
  label: string
  entries: Array<{
    characterId: string
    remarkName: string
    avatarUrl?: string
    activity: string
    timeLabel: string
  }>
}
