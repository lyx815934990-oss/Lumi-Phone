import { personaDb } from '../newFriendsPersona/idb'
import { loadDatingPlotsFromKv } from '../unifiedMemoryAutoSummary'

const KV = 'wechat-murmur-publish-settings:v1:'

/** 定时模式：发布间隔预设 */
export const MURMUR_PUBLISH_PRESETS = [
  { id: 'rare', label: '很少', seconds: 6 * 60 * 60, hint: '约 6 小时' },
  { id: 'normal', label: '适中', seconds: 3 * 60 * 60, hint: '约 3 小时' },
  { id: 'often', label: '频繁', seconds: 75 * 60, hint: '约 75 分钟' },
  { id: 'hourly', label: '每小时', seconds: 60 * 60, hint: '约 1 小时' },
] as const

/** 灵动模式：最短冷却 */
export const MURMUR_ADAPTIVE_COOLDOWN_PRESETS = [
  { id: 'cd30', label: '30 分', seconds: 30 * 60 },
  { id: 'cd60', label: '1 小时', seconds: 60 * 60 },
  { id: 'cd120', label: '2 小时', seconds: 2 * 60 * 60 },
  { id: 'cd180', label: '3 小时', seconds: 3 * 60 * 60 },
] as const

/** 灵动模式：无新剧情时最长等待（超时也不硬发，仅作展示上限） */
export const MURMUR_ADAPTIVE_MAX_WAIT_PRESETS = [
  { id: 'w6', label: '6 小时', seconds: 6 * 60 * 60 },
  { id: 'w12', label: '12 小时', seconds: 12 * 60 * 60 },
  { id: 'w24', label: '1 天', seconds: 24 * 60 * 60 },
] as const

export type MurmurPublishMode = 'fixed' | 'adaptive'

export type MurmurPublishSettings = {
  version: 2
  /** 是否允许角色主动发碎碎念 */
  enabled: boolean
  /**
   * fixed：按固定间隔尝试
   * adaptive：灵动——根据线上聊天 / 线下约会剧情新鲜度灵活尝试
   */
  mode: MurmurPublishMode
  /** 定时模式：发布间隔（秒） */
  intervalSeconds: number
  /** 灵动：最短冷却（秒），避免刷屏 */
  adaptiveMinCooldownSeconds: number
  /** 灵动：展示用最长等待（秒）；无新剧情时不硬发 */
  adaptiveMaxWaitSeconds: number
  /** 安静时段内不主动尝试 */
  quietHoursEnabled: boolean
  quietStartHour: number
  quietEndHour: number
  lastPublishedAt: number
  /** 最近一次引擎检查时间 */
  lastCheckedAt: number
  /** 估算的下次可尝试时间（UI / 引擎共用） */
  nextDueAt: number
}

export const DEFAULT_MURMUR_PUBLISH_SETTINGS: MurmurPublishSettings = {
  version: 2,
  enabled: false,
  mode: 'adaptive',
  intervalSeconds: MURMUR_PUBLISH_PRESETS[1].seconds,
  adaptiveMinCooldownSeconds: MURMUR_ADAPTIVE_COOLDOWN_PRESETS[1].seconds,
  adaptiveMaxWaitSeconds: MURMUR_ADAPTIVE_MAX_WAIT_PRESETS[1].seconds,
  quietHoursEnabled: true,
  quietStartHour: 0,
  quietEndHour: 7,
  lastPublishedAt: 0,
  lastCheckedAt: 0,
  nextDueAt: 0,
}

function clampHour(h: number): number {
  if (!Number.isFinite(h)) return 0
  return Math.min(23, Math.max(0, Math.round(h)))
}

function clampInterval(sec: number): number {
  if (!Number.isFinite(sec)) return DEFAULT_MURMUR_PUBLISH_SETTINGS.intervalSeconds
  return Math.min(48 * 60 * 60, Math.max(15 * 60, Math.round(sec)))
}

function clampCooldown(sec: number): number {
  if (!Number.isFinite(sec)) return DEFAULT_MURMUR_PUBLISH_SETTINGS.adaptiveMinCooldownSeconds
  return Math.min(12 * 60 * 60, Math.max(10 * 60, Math.round(sec)))
}

function clampMaxWait(sec: number): number {
  if (!Number.isFinite(sec)) return DEFAULT_MURMUR_PUBLISH_SETTINGS.adaptiveMaxWaitSeconds
  return Math.min(72 * 60 * 60, Math.max(60 * 60, Math.round(sec)))
}

function normalizeMode(raw: unknown): MurmurPublishMode {
  return raw === 'fixed' ? 'fixed' : 'adaptive'
}

export function normalizeMurmurPublishSettings(raw: unknown): MurmurPublishSettings {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_MURMUR_PUBLISH_SETTINGS }
  const o = raw as Record<string, unknown>
  return {
    version: 2,
    enabled: o.enabled === true,
    mode: normalizeMode(o.mode),
    intervalSeconds: clampInterval(
      typeof o.intervalSeconds === 'number' ? o.intervalSeconds : DEFAULT_MURMUR_PUBLISH_SETTINGS.intervalSeconds,
    ),
    adaptiveMinCooldownSeconds: clampCooldown(
      typeof o.adaptiveMinCooldownSeconds === 'number'
        ? o.adaptiveMinCooldownSeconds
        : DEFAULT_MURMUR_PUBLISH_SETTINGS.adaptiveMinCooldownSeconds,
    ),
    adaptiveMaxWaitSeconds: clampMaxWait(
      typeof o.adaptiveMaxWaitSeconds === 'number'
        ? o.adaptiveMaxWaitSeconds
        : DEFAULT_MURMUR_PUBLISH_SETTINGS.adaptiveMaxWaitSeconds,
    ),
    quietHoursEnabled: o.quietHoursEnabled !== false,
    quietStartHour: clampHour(
      typeof o.quietStartHour === 'number' ? o.quietStartHour : DEFAULT_MURMUR_PUBLISH_SETTINGS.quietStartHour,
    ),
    quietEndHour: clampHour(
      typeof o.quietEndHour === 'number' ? o.quietEndHour : DEFAULT_MURMUR_PUBLISH_SETTINGS.quietEndHour,
    ),
    lastPublishedAt:
      typeof o.lastPublishedAt === 'number' && Number.isFinite(o.lastPublishedAt) ? o.lastPublishedAt : 0,
    lastCheckedAt:
      typeof o.lastCheckedAt === 'number' && Number.isFinite(o.lastCheckedAt) ? o.lastCheckedAt : 0,
    nextDueAt: typeof o.nextDueAt === 'number' && Number.isFinite(o.nextDueAt) ? o.nextDueAt : 0,
  }
}

export async function loadMurmurPublishSettings(characterId: string): Promise<MurmurPublishSettings> {
  const cid = characterId.trim()
  if (!cid) return { ...DEFAULT_MURMUR_PUBLISH_SETTINGS }
  try {
    return normalizeMurmurPublishSettings(await personaDb.getPhoneKv(`${KV}${cid}`))
  } catch {
    return { ...DEFAULT_MURMUR_PUBLISH_SETTINGS }
  }
}

export async function saveMurmurPublishSettings(
  characterId: string,
  patch: Partial<MurmurPublishSettings>,
): Promise<MurmurPublishSettings> {
  const cid = characterId.trim()
  if (!cid) return { ...DEFAULT_MURMUR_PUBLISH_SETTINGS }
  const prev = await loadMurmurPublishSettings(cid)
  const merged: MurmurPublishSettings = {
    version: 2,
    enabled: patch.enabled ?? prev.enabled,
    mode: patch.mode ?? prev.mode,
    intervalSeconds: clampInterval(patch.intervalSeconds ?? prev.intervalSeconds),
    adaptiveMinCooldownSeconds: clampCooldown(
      patch.adaptiveMinCooldownSeconds ?? prev.adaptiveMinCooldownSeconds,
    ),
    adaptiveMaxWaitSeconds: clampMaxWait(patch.adaptiveMaxWaitSeconds ?? prev.adaptiveMaxWaitSeconds),
    quietHoursEnabled: patch.quietHoursEnabled ?? prev.quietHoursEnabled,
    quietStartHour: clampHour(patch.quietStartHour ?? prev.quietStartHour),
    quietEndHour: clampHour(patch.quietEndHour ?? prev.quietEndHour),
    lastPublishedAt:
      typeof patch.lastPublishedAt === 'number' ? patch.lastPublishedAt : prev.lastPublishedAt,
    lastCheckedAt: typeof patch.lastCheckedAt === 'number' ? patch.lastCheckedAt : prev.lastCheckedAt,
    nextDueAt: typeof patch.nextDueAt === 'number' ? patch.nextDueAt : prev.nextDueAt,
  }
  const next = {
    ...merged,
    nextDueAt: computeMurmurNextDueAt(merged),
  }
  await personaDb.setPhoneKv(`${KV}${cid}`, next)
  return next
}

/** 当前是否落在安静时段（支持跨午夜，如 23→7） */
export function isMurmurQuietHours(settings: MurmurPublishSettings, now = Date.now()): boolean {
  if (!settings.quietHoursEnabled) return false
  const start = settings.quietStartHour
  const end = settings.quietEndHour
  if (start === end) return false
  const hour = new Date(now).getHours()
  if (start < end) return hour >= start && hour < end
  return hour >= start || hour < end
}

/** 安静时段结束后的下一刻（毫秒） */
export function nextMurmurQuietEndMs(settings: MurmurPublishSettings, now = Date.now()): number {
  if (!settings.quietHoursEnabled) return now
  const end = settings.quietEndHour
  const d = new Date(now)
  const curH = d.getHours()
  const start = settings.quietStartHour
  const inQuiet =
    start === end ? false : start < end ? curH >= start && curH < end : curH >= start || curH < end
  if (!inQuiet) return now
  const next = new Date(now)
  next.setMinutes(0, 0, 0)
  next.setHours(end)
  if (next.getTime() <= now) next.setDate(next.getDate() + 1)
  return next.getTime()
}

/**
 * 最近剧情活动时间：线上私聊 + 线下约会剧情落库时刻。
 * 灵动模式用它判断「有没有值得发碎碎念的新线索」。
 */
export async function getMurmurLatestActivityMs(characterId: string): Promise<number> {
  const cid = characterId.trim()
  if (!cid) return 0
  let latest = 0
  try {
    const rows = await personaDb.listWeChatChatMessagesRecentByCharacter({
      characterId: cid,
      limit: 8,
    })
    for (const m of rows) {
      const ts = typeof m.timestamp === 'number' ? m.timestamp : 0
      if (ts > latest) latest = ts
    }
  } catch {
    /* ignore */
  }
  try {
    const plots = await loadDatingPlotsFromKv(cid)
    for (const p of plots.slice(-12)) {
      const ts = typeof p.timestamp === 'number' ? p.timestamp : 0
      if (ts > latest) latest = ts
    }
  } catch {
    /* ignore */
  }
  return latest
}

export function computeMurmurNextDueAt(settings: MurmurPublishSettings, now = Date.now()): number {
  if (!settings.enabled) return 0
  const last = settings.lastPublishedAt > 0 ? settings.lastPublishedAt : 0
  let due: number
  if (settings.mode === 'adaptive') {
    const cool = settings.adaptiveMinCooldownSeconds * 1000
    due = last > 0 ? last + cool : now
  } else {
    const gap = settings.intervalSeconds * 1000
    due = last > 0 ? last + gap : now
  }
  if (due < now) due = now
  if (isMurmurQuietHours(settings, due)) {
    due = Math.max(due, nextMurmurQuietEndMs(settings, due))
  }
  return due
}

export function isMurmurPublishDue(settings: MurmurPublishSettings, now = Date.now()): boolean {
  if (!settings.enabled) return false
  if (isMurmurQuietHours(settings, now)) return false
  if (settings.mode === 'adaptive') {
    // 同步路径无法读活动；仅作冷却门槛。真正是否该发见 isMurmurAdaptivePublishDue。
    if (settings.lastPublishedAt <= 0) return true
    return now - settings.lastPublishedAt >= settings.adaptiveMinCooldownSeconds * 1000
  }
  if (settings.lastPublishedAt <= 0) return true
  return now - settings.lastPublishedAt >= settings.intervalSeconds * 1000
}

/** 灵动：冷却已过 + 有新于上次发布的线上/线下活动 */
export async function isMurmurAdaptivePublishDue(
  characterId: string,
  settings: MurmurPublishSettings,
  now = Date.now(),
): Promise<boolean> {
  if (!settings.enabled) return false
  if (isMurmurQuietHours(settings, now)) return false
  if (settings.mode !== 'adaptive') return isMurmurPublishDue(settings, now)

  const last = settings.lastPublishedAt
  if (last > 0 && now - last < settings.adaptiveMinCooldownSeconds * 1000) return false

  const activityMs = await getMurmurLatestActivityMs(characterId)
  if (activityMs <= 0) return false
  // 首次：有任意剧情活动即可尝试
  if (last <= 0) return true
  // 有新于上次发布的聊天 / 约会剧情
  return activityMs > last
}

export function formatMurmurDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds))
  if (s < 60) return `${s} 秒`
  if (s < 3600) return `${Math.round(s / 60)} 分钟`
  if (s < 48 * 3600) {
    const h = Math.floor(s / 3600)
    const m = Math.round((s % 3600) / 60)
    return m > 0 ? `${h} 小时 ${m} 分` : `${h} 小时`
  }
  const d = Math.floor(s / 86400)
  const h = Math.round((s % 86400) / 3600)
  return h > 0 ? `${d} 天 ${h} 小时` : `${d} 天`
}

function formatClock(ms: number): string {
  const d = new Date(ms)
  const now = new Date()
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  const hm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  if (sameDay) return `今天 ${hm}`
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const isTomorrow =
    d.getFullYear() === tomorrow.getFullYear() &&
    d.getMonth() === tomorrow.getMonth() &&
    d.getDate() === tomorrow.getDate()
  if (isTomorrow) return `明天 ${hm}`
  return `${d.getMonth() + 1}/${d.getDate()} ${hm}`
}

/** 设置页展示：下次发布预估文案 */
export function formatMurmurNextPublishHint(
  settings: MurmurPublishSettings,
  opts?: { activityMs?: number; now?: number },
): string {
  if (!settings.enabled) return '未开启主动发布'
  const now = opts?.now ?? Date.now()
  if (isMurmurQuietHours(settings, now)) {
    const end = nextMurmurQuietEndMs(settings, now)
    return `安静时段中 · 约 ${formatClock(end)} 后再尝试`
  }

  const due = computeMurmurNextDueAt(settings, now)

  if (settings.mode === 'fixed') {
    if (due <= now + 30_000) return '定时 · 即将尝试发布'
    return `定时 · 下次约 ${formatClock(due)}`
  }

  // adaptive
  const last = settings.lastPublishedAt
  const coolEnd = last > 0 ? last + settings.adaptiveMinCooldownSeconds * 1000 : now
  const activityMs = opts?.activityMs ?? 0
  const hasFresh = activityMs > 0 && (last <= 0 || activityMs > last)

  if (now < coolEnd) {
    return hasFresh
      ? `灵动 · 已有新剧情，冷却至约 ${formatClock(coolEnd)}`
      : `灵动 · 冷却至约 ${formatClock(coolEnd)}，之后有新剧情才发`
  }
  if (hasFresh) return '灵动 · 已有新剧情，随时可能发布'
  return '灵动 · 等待新的线上聊天或线下约会后再发'
}

export function murmurModeLabel(mode: MurmurPublishMode): string {
  return mode === 'adaptive' ? '灵动发布' : '定时发布'
}
