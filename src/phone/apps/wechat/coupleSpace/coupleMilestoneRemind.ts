import type { CoupleMilestone, CoupleMilestoneRepeat } from './coupleSpaceTypes'
import { normalizeCoupleMilestoneTimeKey, toLocalDateKey } from './coupleSpaceTypes'

/** 提前提醒天数：undefined/未设 = 关闭；0 = 目标日当天 0:00；1/3/7 = 纪念日在提前第 N 天的 0:00 提醒（仅当天，不连弹） */
export type CoupleRemindOffsetDays = 0 | 1 | 3 | 7

export const COUPLE_REMIND_OPTIONS: Array<{
  value: CoupleRemindOffsetDays | null
  label: string
}> = [
  { value: null, label: '未设置' },
  { value: 0, label: '当天提醒' },
  { value: 1, label: '提前 1 天' },
  { value: 3, label: '提前 3 天' },
  { value: 7, label: '提前 7 天' },
]

export function coupleRemindLabel(offset: number | null | undefined): string {
  if (offset == null || !Number.isFinite(offset)) return '未设置'
  const hit = COUPLE_REMIND_OPTIONS.find((o) => o.value === offset)
  return hit?.label ?? '未设置'
}

function parseDateKey(dateKey: string): Date | null {
  const [y, m, d] = dateKey.split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d, 12, 0, 0, 0)
}

function toDateKeyFromParts(y: number, m0: number, d: number): string {
  return `${y}-${String(m0 + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

function startOfLocalDay(ms: number = Date.now()): Date {
  const d = new Date(ms)
  d.setHours(0, 0, 0, 0)
  return d
}

/** 按重复规则得到下一目标日 */
export function coupleMilestoneEffectiveDateKey(
  dateKey: string,
  repeat: CoupleMilestoneRepeat = 'none',
  nowMs: number = Date.now(),
): string {
  const base = parseDateKey(dateKey)
  if (!base) return dateKey
  if (repeat === 'none') return dateKey

  const today = startOfLocalDay(nowMs)
  if (repeat === 'yearly') {
    let next = new Date(today.getFullYear(), base.getMonth(), base.getDate(), 12)
    if (startOfLocalDay(next.getTime()).getTime() < today.getTime()) {
      next = new Date(today.getFullYear() + 1, base.getMonth(), base.getDate(), 12)
    }
    return toDateKeyFromParts(next.getFullYear(), next.getMonth(), next.getDate())
  }

  let y = today.getFullYear()
  let m = today.getMonth()
  const day = base.getDate()
  const dim = new Date(y, m + 1, 0).getDate()
  let next = new Date(y, m, Math.min(day, dim), 12)
  if (startOfLocalDay(next.getTime()).getTime() < today.getTime()) {
    m += 1
    if (m > 11) {
      m = 0
      y += 1
    }
    const dim2 = new Date(y, m + 1, 0).getDate()
    next = new Date(y, m, Math.min(day, dim2), 12)
  }
  return toDateKeyFromParts(next.getFullYear(), next.getMonth(), next.getDate())
}

export function coupleDaysUntilDateKey(dateKey: string, nowMs: number = Date.now()): number {
  const target = parseDateKey(dateKey)
  if (!target) return 0
  const a = startOfLocalDay(target.getTime()).getTime()
  const b = startOfLocalDay(nowMs).getTime()
  return Math.round((a - b) / (24 * 3600 * 1000))
}

export type CoupleHomeRemindBanner = {
  id: string
  milestoneId: string
  title: string
  daysUntil: number
  eyebrow: string
  line: string
  soft: string
  isTest?: boolean
}

function pickWarmLines(params: {
  title: string
  charName: string
  daysUntil: number
}): Pick<CoupleHomeRemindBanner, 'eyebrow' | 'line' | 'soft'> {
  const title = params.title.trim() || '那个小日子'
  const who = params.charName.trim() || '对方'
  if (params.daysUntil <= 0) {
    const lines = [
      {
        eyebrow: '今天就是这一天',
        line: `「${title}」到啦。要不要轻轻跟 ${who} 提一句？`,
        soft: '不用很大声，一句就好。',
      },
      {
        eyebrow: '日子刚好落在今天',
        line: `记得吗——「${title}」。和 ${who} 一起，慢慢过就很甜。`,
        soft: '哪怕只是相视一笑，也算纪念。',
      },
    ]
    return lines[Math.abs(title.length) % lines.length]!
  }
  if (params.daysUntil === 1) {
    return {
      eyebrow: '明天就到了',
      line: `「${title}」只差一夜。要不要提前藏一点小心思给 ${who}？`,
      soft: '一张纸条、一句晚安，都足够温柔。',
    }
  }
  if (params.daysUntil <= 3) {
    return {
      eyebrow: `还有 ${params.daysUntil} 天`,
      line: `「${title}」正轻轻走近你们。和 ${who} 的日子，又要多一笔颜色了。`,
      soft: '可以开始想一件小小的事。',
    }
  }
  return {
    eyebrow: `还有 ${params.daysUntil} 天`,
    line: `日历上，「${title}」在向这边招手。别急，和 ${who} 慢慢等就好。`,
    soft: '提醒只是怕你们忙忘了彼此。',
  }
}

export function buildCoupleTestRemindBanner(charName: string): CoupleHomeRemindBanner {
  const who = charName.trim() || '对方'
  return {
    id: `test-${Date.now()}`,
    milestoneId: '__test__',
    title: '第一次牵手',
    daysUntil: 1,
    eyebrow: '提醒预览',
    line: `明天就是「第一次牵手」了…要不要提前跟 ${who} 说一声「我记得」？`,
    soft: '这只是测试横幅，关掉就好。真正的提醒会在日子快到时自己出现。',
    isTest: true,
  }
}

function dismissStorageKey(params: {
  accountId: string
  characterId: string
  milestoneId: string
  dayKey: string
}): string {
  return `couple-remind-dismiss:${params.accountId}:${params.characterId}:${params.milestoneId}:${params.dayKey}`
}

export function isCoupleRemindDismissed(params: {
  accountId: string
  characterId: string
  milestoneId: string
  dayKey?: string
}): boolean {
  try {
    const key = dismissStorageKey({
      ...params,
      dayKey: params.dayKey ?? toLocalDateKey(),
    })
    return localStorage.getItem(key) === '1'
  } catch {
    return false
  }
}

export function dismissCoupleRemind(params: {
  accountId: string
  characterId: string
  milestoneId: string
  dayKey?: string
}): void {
  try {
    const key = dismissStorageKey({
      ...params,
      dayKey: params.dayKey ?? toLocalDateKey(),
    })
    localStorage.setItem(key, '1')
  } catch {
    /* ignore */
  }
}

/** 是否按「提醒频率」计（纪念日 / 重复日）；普通一次性目标日仅目标日当天提醒 */
export function coupleMilestoneUsesRemindFrequency(m: {
  kind?: CoupleMilestone['kind']
  repeat?: CoupleMilestoneRepeat
  category?: CoupleMilestone['category']
}): boolean {
  if (m.repeat === 'yearly' || m.repeat === 'monthly') return true
  if (m.kind === 'binding' || m.kind === 'meet') return true
  if (m.category === 'memory') return true
  return false
}

/**
 * 今天（本地日）是否该弹出这条提醒。
 * - 普通目标日：仅目标日当天（daysUntil === 0）
 * - 纪念日 / 年/月重复：严格等于用户设置的提前天数（daysUntil === remindOffsetDays），只弹那一天
 * - 若设置 timeKey：须已过该时刻才弹；未设则当天 0:00 起可弹
 */
export function hasReachedCoupleMilestoneRemindTime(
  milestone: CoupleMilestone,
  nowMs: number = Date.now(),
): boolean {
  const tk = normalizeCoupleMilestoneTimeKey(milestone.timeKey)
  if (!tk) return true
  const [h, m] = tk.split(':').map(Number)
  const now = new Date(nowMs)
  const minsNow = now.getHours() * 60 + now.getMinutes()
  return minsNow >= (h ?? 0) * 60 + (m ?? 0)
}

export function shouldFireCoupleMilestoneRemind(params: {
  milestone: CoupleMilestone
  nowMs?: number
}): boolean {
  const m = params.milestone
  const offset = m.remindOffsetDays
  if (offset == null || !Number.isFinite(offset) || offset < 0) return false
  const nowMs = params.nowMs ?? Date.now()
  const effective = coupleMilestoneEffectiveDateKey(m.dateKey, m.repeat ?? 'none', nowMs)
  const daysUntil = coupleDaysUntilDateKey(effective, nowMs)
  if (daysUntil < 0) return false
  const dayHit = coupleMilestoneUsesRemindFrequency(m)
    ? daysUntil === offset
    : daysUntil === 0
  if (!dayHit) return false
  return hasReachedCoupleMilestoneRemindTime(m, nowMs)
}

/** 本地扫描：今天该响的纪念日提醒 → 全局仪式弹层 */
export function collectCoupleHomeRemindBanners(params: {
  milestones: readonly CoupleMilestone[]
  charName: string
  accountId: string
  characterId: string
  nowMs?: number
}): CoupleHomeRemindBanner[] {
  const nowMs = params.nowMs ?? Date.now()
  const dayKey = toLocalDateKey(nowMs)
  const out: CoupleHomeRemindBanner[] = []

  for (const m of params.milestones) {
    if (!shouldFireCoupleMilestoneRemind({ milestone: m, nowMs })) continue
    const effective = coupleMilestoneEffectiveDateKey(m.dateKey, m.repeat ?? 'none', nowMs)
    const daysUntil = coupleDaysUntilDateKey(effective, nowMs)
    if (
      isCoupleRemindDismissed({
        accountId: params.accountId,
        characterId: params.characterId,
        milestoneId: m.id,
        dayKey,
      })
    ) {
      continue
    }
    const warm = pickWarmLines({
      title: m.title,
      charName: params.charName,
      daysUntil,
    })
    out.push({
      id: `${m.id}-${dayKey}-${daysUntil}`,
      milestoneId: m.id,
      title: m.title,
      daysUntil,
      ...warm,
    })
  }

  out.sort((a, b) => a.daysUntil - b.daysUntil)
  return out
}

export type CoupleRemindOfferPayload = CoupleHomeRemindBanner & {
  characterId: string
  charName: string
  userName: string
  charAvatarUrl?: string
  userAvatarUrl?: string
  accountId: string
}

/** 扫当前微信账号下所有已绑定房间，取最紧迫的一条提醒（供全局仪式弹层） */
export async function loadActiveCoupleRemindOffer(): Promise<CoupleRemindOfferPayload | null> {
  const [
    { findAccountById, loadAccountsBundle },
    { useCoupleSpaceStore },
    { isCoupleSpaceBound },
    { personaDb },
    { resolveCharacterAvatarUrl },
  ] = await Promise.all([
    import('../wechatAccountPersistence'),
    import('./useCoupleSpaceStore'),
    import('./coupleSpaceTypes'),
    import('../newFriendsPersona/idb'),
    import('../../../utils/characterAvatarUrl'),
  ])

  const bundle = await loadAccountsBundle()
  if (!bundle) return null
  const account = findAccountById(bundle, bundle.currentAccountId)
  if (!account) return null
  const accountId = account.accountId.trim()
  if (!accountId) return null

  await useCoupleSpaceStore.getState().bindAccount(accountId)
  const rooms = useCoupleSpaceStore.getState().root.byAccount[accountId]?.rooms ?? {}
  const userName = account.nickname?.trim() || '我'
  const userAvatarUrl =
    resolveCharacterAvatarUrl({ avatarUrl: account.avatarUrl }) ||
    account.avatarUrl?.trim() ||
    undefined

  let best: CoupleRemindOfferPayload | null = null
  for (const [charId, room] of Object.entries(rooms)) {
    if (!charId.trim() || !room || !isCoupleSpaceBound(room)) continue
    const contact = account.personaContacts?.find(
      (c) => (c.characterId?.trim() || c.id?.trim()) === charId,
    )
    const charName =
      contact?.remarkName?.trim() ||
      room.binding?.charDisplayName?.trim() ||
      '对方'
    const banners = collectCoupleHomeRemindBanners({
      milestones: room.milestones,
      charName,
      accountId,
      characterId: charId,
    })
    const top = banners[0]
    if (!top) continue

    let charAvatarRaw = contact?.avatarUrl?.trim() || ''
    if (!charAvatarRaw) {
      try {
        const ch = await personaDb.getCharacter(charId)
        charAvatarRaw = ch?.avatarUrl?.trim() || ''
      } catch {
        /* ignore */
      }
    }
    const charAvatarUrl =
      resolveCharacterAvatarUrl({ avatarUrl: charAvatarRaw }) || charAvatarRaw || undefined

    const candidate: CoupleRemindOfferPayload = {
      ...top,
      characterId: charId,
      charName,
      userName,
      charAvatarUrl,
      userAvatarUrl,
      accountId,
    }
    if (!best || candidate.daysUntil < best.daysUntil) best = candidate
  }
  return best
}

export function buildCoupleTestRemindOffer(params?: {
  charName?: string
  userName?: string
  charAvatarUrl?: string
  userAvatarUrl?: string
}): CoupleRemindOfferPayload {
  // 动态 import 会让同步函数变复杂；解析放调用方 / 弹层 MiniAvatar 内
  const charName = params?.charName?.trim() || '对方'
  const base = buildCoupleTestRemindBanner(charName)
  return {
    ...base,
    characterId: '__test__',
    charName,
    userName: params?.userName?.trim() || '我',
    charAvatarUrl: params?.charAvatarUrl?.trim() || undefined,
    userAvatarUrl: params?.userAvatarUrl?.trim() || undefined,
    accountId: 'local',
  }
}
