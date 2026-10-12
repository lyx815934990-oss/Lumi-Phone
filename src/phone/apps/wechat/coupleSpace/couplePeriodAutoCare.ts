/**
 * 经期自动关心：每日定点触发 + 错过时刻后上线补一次（全局，不依赖经期页打开）
 */

import type { ApiConfig } from '../../api/types'
import { resolveCouplePeriodPhase } from './couplePeriodLogic'
import {
  isCoupleSpaceBound,
  normalizeCoupleMilestoneTimeKey,
  toLocalDateKey,
  type CouplePeriodCycle,
  type CouplePeriodSettings,
} from './coupleSpaceTypes'

export const DEFAULT_PERIOD_AUTO_CARE_TIME = '09:00'

/** 解析每日触发时刻；开了自动关心但未设时间时用默认 09:00 */
export function resolvePeriodAutoCareTimeKey(
  settings: Pick<CouplePeriodSettings, 'autoCare' | 'autoCareTimeKey'> | null | undefined,
): string | null {
  if (settings?.autoCare !== true) return null
  return (
    normalizeCoupleMilestoneTimeKey(settings.autoCareTimeKey) ?? DEFAULT_PERIOD_AUTO_CARE_TIME
  )
}

export function hasReachedPeriodAutoCareTime(
  timeKey: string,
  nowMs: number = Date.now(),
): boolean {
  const tk = normalizeCoupleMilestoneTimeKey(timeKey) ?? DEFAULT_PERIOD_AUTO_CARE_TIME
  const [h, m] = tk.split(':').map(Number)
  const now = new Date(nowMs)
  const minsNow = now.getHours() * 60 + now.getMinutes()
  return minsNow >= (h ?? 0) * 60 + (m ?? 0)
}

/**
 * 今天是否该自动生成关心：
 * - 开了自动关心
 * - 该段经期进行中
 * - 本地时刻已过设定点（含离线补发：上线时若已过点且今日未写过）
 * - 今日尚未自动触发过（autoCareDateKey !== today）
 */
export function isPeriodAutoCareDue(params: {
  settings: CouplePeriodSettings
  cycle: CouplePeriodCycle
  nowMs?: number
}): boolean {
  const timeKey = resolvePeriodAutoCareTimeKey(params.settings)
  if (!timeKey) return false
  const nowMs = params.nowMs ?? Date.now()
  const today = toLocalDateKey(nowMs)
  const cycle = params.cycle
  if (cycle.startDateKey > today) return false
  if (cycle.endDateKey && cycle.endDateKey < today) return false
  if (cycle.charActions?.autoCareDateKey === today) return false
  if (!hasReachedPeriodAutoCareTime(timeKey, nowMs)) return false
  return true
}

export type PeriodAutoCareJob = {
  characterId: string
  cycle: CouplePeriodCycle
  settings: CouplePeriodSettings
  charName: string
  userName: string
  relationshipStage?: string | null
}

const inflight = new Set<string>()
/** 本会话内今日已尝试失败的任务，避免空回复/报错时每 45s 狂刷 */
const failedToday = new Set<string>()

function jobKey(characterId: string, cycleId: string, dateKey: string): string {
  return `${characterId.trim()}::${cycleId.trim()}::${dateKey}`
}

function pruneFailedToday(today: string) {
  for (const k of failedToday) {
    if (!k.endsWith(`::${today}`)) failedToday.delete(k)
  }
}

/** 扫描当前账号下所有已绑定房间，收集今日到期的自动关心任务 */
export async function collectDuePeriodAutoCareJobs(
  nowMs: number = Date.now(),
): Promise<PeriodAutoCareJob[]> {
  const [
    { findAccountById, loadAccountsBundle },
    { useCoupleSpaceStore },
  ] = await Promise.all([
    import('../wechatAccountPersistence'),
    import('./useCoupleSpaceStore'),
  ])

  const bundle = await loadAccountsBundle()
  if (!bundle) return []
  const account = findAccountById(bundle, bundle.currentAccountId)
  if (!account) return []
  const accountId = account.accountId.trim()
  if (!accountId) return []

  await useCoupleSpaceStore.getState().bindAccount(accountId)
  const rooms = useCoupleSpaceStore.getState().root.byAccount[accountId]?.rooms ?? {}
  const userName = account.nickname?.trim() || '我'
  const out: PeriodAutoCareJob[] = []

  for (const [charId, room] of Object.entries(rooms)) {
    if (!charId.trim() || !room || !isCoupleSpaceBound(room)) continue
    const period = room.period
    if (!period?.settings?.autoCare) continue
    const phase = resolveCouplePeriodPhase({
      cycles: period.cycles ?? [],
      settings: period.settings,
      nowMs,
    })
    if (phase.kind !== 'in_period') continue
    if (!isPeriodAutoCareDue({ settings: period.settings, cycle: phase.cycle, nowMs })) {
      continue
    }
    const contact = account.personaContacts?.find(
      (c) => (c.characterId?.trim() || c.id?.trim()) === charId,
    )
    const charName =
      contact?.remarkName?.trim() ||
      room.binding?.charDisplayName?.trim() ||
      '对方'
    out.push({
      characterId: charId,
      cycle: phase.cycle,
      settings: period.settings,
      charName,
      userName,
      relationshipStage: room.binding?.relationshipStageAtBind,
    })
  }
  return out
}

/** 执行到期任务：生成关心并写入；同日同段防并发重入 */
export async function runDuePeriodAutoCareJobs(params?: {
  nowMs?: number
  apiConfig?: ApiConfig | null
}): Promise<number> {
  const nowMs = params?.nowMs ?? Date.now()
  const today = toLocalDateKey(nowMs)
  pruneFailedToday(today)
  const jobs = await collectDuePeriodAutoCareJobs(nowMs)
  if (!jobs.length) return 0

  const [{ loadResolvedApiConfig }, { personaDb }, { fetchCouplePeriodCharCare }, { useCoupleSpaceStore }] =
    await Promise.all([
      import('../../api/loadResolvedApiConfig'),
      import('../newFriendsPersona/idb'),
      import('./couplePeriodCharAi'),
      import('./useCoupleSpaceStore'),
    ])

  const api =
    params?.apiConfig ??
    (await loadResolvedApiConfig('chatCard').catch(() => null))
  if (!api?.apiUrl?.trim() || !api?.apiKey?.trim()) return 0

  const store = useCoupleSpaceStore.getState()
  let done = 0

  for (const job of jobs) {
    const key = jobKey(job.characterId, job.cycle.id, today)
    if (inflight.has(key) || failedToday.has(key)) continue
    // 再读一遍，避免并发/页面手动生成后重复
    const room = store.getRoom(job.characterId)
    const live = room?.period?.cycles?.find((c) => c.id === job.cycle.id)
    if (!live || live.charActions?.autoCareDateKey === today) continue
    if (
      !isPeriodAutoCareDue({
        settings: room?.period?.settings ?? job.settings,
        cycle: live,
        nowMs,
      })
    ) {
      continue
    }

    inflight.add(key)
    try {
      store.requestPeriodCharAction(job.characterId, live.id, ['warm_comment'])
      const ch = await personaDb.getCharacter(job.characterId).catch(() => null)
      const phase = resolveCouplePeriodPhase({
        cycles: room?.period?.cycles ?? [live],
        settings: room?.period?.settings ?? job.settings,
        nowMs,
      })
      const dayIndex =
        phase.kind === 'in_period' && phase.cycle.id === live.id ? phase.dayIndex : null
      const res = await fetchCouplePeriodCharCare({
        api,
        cycle: live,
        dayIndex,
        character: ch,
        charDisplayName: job.charName,
        userDisplayName: job.userName,
        relationshipStage: job.relationshipStage as
          | import('../wechatChatPrompt').RelationshipStage
          | null
          | undefined,
      })
      const text = res?.text?.trim() ?? ''
      if (!text) {
        failedToday.add(key)
        continue
      }
      store.setPeriodCharActionResponse(job.characterId, live.id, text, {
        autoCareDateKey: today,
      })
      done += 1
    } catch {
      failedToday.add(key)
    } finally {
      inflight.delete(key)
    }
  }
  return done
}
