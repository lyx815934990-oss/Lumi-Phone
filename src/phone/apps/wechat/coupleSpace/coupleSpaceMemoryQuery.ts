/**
 * 情侣空间 → {{char}} 记忆注入（查询层硬过滤）
 * 仅注入 memoryShare 已开模块；日记仍要求条目 includeInMemory。
 */

import { personaDb } from '../newFriendsPersona/idb'
import {
  resolveCouplePeriodPhase,
  PERIOD_FLOW_LABEL,
  PERIOD_MOOD_LABEL,
  PERIOD_PAIN_LABEL,
} from './couplePeriodLogic'
import {
  formatFlowChain,
  formatMoodChain,
  formatPainChain,
} from './couplePeriodDayRecords'
import {
  coupleMilestoneEffectiveDateKey,
  coupleDaysUntilDateKey,
} from './coupleMilestoneRemind'
import {
  COUPLE_SPACE_KV_KEY,
  coupleDaysTogether,
  emptyCoupleMemoryShareState,
  emptyCouplePeriodState,
  formatCoupleBoundDateLabel,
  normalizeCoupleMemoryShareState,
  normalizeCouplePeriodState,
  type CoupleDiaryEntry,
  type CoupleMemoryShareState,
  type CoupleMilestone,
  type CoupleSpacePersistedRoot,
  type CoupleSpaceRoom,
} from './coupleSpaceTypes'
import {
  formatCoupleDiaryMemoryBlock,
  listCoupleDiaryEntriesForCharMemory,
} from './coupleDiaryMemoryQuery'
import { useCoupleSpaceStore } from './useCoupleSpaceStore'

const MILESTONE_LIMIT = 6

const SHARE_RULES =
  `【引用铁律】\n` +
  `- 这些是「了解对方 / 你们关系」的背景素材，**不是**每轮必提的谈资；多数回合应完全不提。\n` +
  `- 仅当当前话题明显相关时才可轻提；禁止突兀插入。\n` +
  `- 措辞用「我记得」「你之前提过」这类**记得**语气；**禁止**「我翻到情侣空间」「我看到你记录」等监控式说法。\n` +
  `- 禁止复述整段原文；一笔带过即可。\n`

async function loadCoupleSpaceRoom(
  accountId: string,
  characterId: string,
): Promise<CoupleSpaceRoom | null> {
  const acc = accountId.trim()
  const cid = characterId.trim()
  if (!acc || !cid) return null

  const snap = useCoupleSpaceStore.getState()
  if (snap.hydrated && snap.currentAccountId === acc) {
    return snap.root.byAccount[acc]?.rooms[cid] ?? null
  }

  try {
    const raw = await personaDb.getPhoneKv(COUPLE_SPACE_KV_KEY)
    if (!raw || typeof raw !== 'object') return null
    const root = raw as CoupleSpacePersistedRoot
    return root.byAccount?.[acc]?.rooms?.[cid] ?? null
  } catch {
    return null
  }
}

function getMemoryShare(room: CoupleSpaceRoom | null): CoupleMemoryShareState {
  if (!room) return emptyCoupleMemoryShareState()
  return normalizeCoupleMemoryShareState(room.memoryShare)
}

function relationPhrase(daysUntil: number): string {
  if (daysUntil > 0) return `还有 ${daysUntil} 天`
  if (daysUntil < 0) return `已经 ${Math.abs(daysUntil)} 天`
  return '就是今天'
}

function formatMilestonesBlock(
  milestones: CoupleMilestone[],
  share: CoupleMemoryShareState,
): string {
  if (!share.modules.milestones) return ''
  let list = milestones.filter((m) => m && typeof m.id === 'string' && m.title.trim())
  if (share.milestoneIds !== 'all') {
    const allow = new Set(share.milestoneIds)
    list = list.filter((m) => allow.has(m.id))
  }
  if (!list.length) return ''

  const now = Date.now()
  const lines = list
    .slice()
    .sort((a, b) => a.dateKey.localeCompare(b.dateKey))
    .slice(0, MILESTONE_LIMIT)
    .map((m, i) => {
      const effective = coupleMilestoneEffectiveDateKey(m.dateKey, m.repeat ?? 'none', now)
      const daysUntil = coupleDaysUntilDateKey(effective, now)
      return `${i + 1}. 「${m.title.trim()}」${m.dateKey}（${relationPhrase(daysUntil)}）`
    })

  return (
    `【情侣空间·纪念日历（用户主动分享）】\n` +
    `以下纪念日由用户勾选同步进记忆；未勾选的你看不到。\n` +
    SHARE_RULES +
    lines.join('\n')
  )
}

function formatBindingBlock(room: CoupleSpaceRoom): string {
  const b = room.binding
  if (!b?.boundAt) return ''
  const days = coupleDaysTogether(b.boundAt)
  const userName = b.userDisplayName?.trim() || '用户'
  const charName = b.charDisplayName?.trim() || '你'
  return (
    `【情侣空间·绑定关系（用户主动分享）】\n` +
    SHARE_RULES +
    `- ${userName} 与 ${charName} 已开通情侣空间\n` +
    `- 绑定日：${formatCoupleBoundDateLabel(b.boundAt)}\n` +
    `- 在一起约 ${days} 天（含绑定当日）`
  )
}

function formatPeriodStageBlock(room: CoupleSpaceRoom): string {
  const period = normalizeCouplePeriodState(room.period ?? emptyCouplePeriodState())
  if (!period.cycles.length) return ''
  const phase = resolveCouplePeriodPhase({
    cycles: period.cycles,
    settings: period.settings,
  })
  const lines: string[] = []
  if (phase.kind === 'in_period') {
    lines.push(`当前大致处于经期第 ${phase.dayIndex} 天前后。`)
  } else if (phase.kind === 'upcoming') {
    lines.push(
      phase.daysUntil === 0
        ? `预计经期可能临近。`
        : `预计大约还有 ${phase.daysUntil} 天迎来经期。`,
    )
  } else if (phase.kind === 'late') {
    lines.push(`相对往常节奏，经期似乎推迟了约 ${phase.daysLate} 天。`)
  } else {
    return ''
  }

  // 进行中用当前段；否则用最近一段有记录的流量/痛感/心情
  const detailCycle =
    phase.kind === 'in_period'
      ? phase.cycle
      : period.cycles.find((c) => c.flow || c.pain != null || c.mood || c.days?.length) ??
        period.cycles[0]
  if (detailCycle) {
    const flowChain = formatFlowChain(detailCycle)
    const painChain = formatPainChain(detailCycle)
    const moodChain = formatMoodChain(detailCycle)
    if (flowChain) lines.push(`流量（按天）：${flowChain}`)
    else if (detailCycle.flow) {
      lines.push(`流量：${PERIOD_FLOW_LABEL[detailCycle.flow] ?? detailCycle.flow}`)
    }
    if (painChain) lines.push(`痛感（按天）：${painChain}`)
    else if (detailCycle.pain != null) {
      lines.push(`痛感：${PERIOD_PAIN_LABEL[detailCycle.pain] ?? String(detailCycle.pain)}`)
    }
    if (moodChain) lines.push(`心情（按天）：${moodChain}`)
    else if (detailCycle.mood) {
      lines.push(`心情：${PERIOD_MOOD_LABEL[detailCycle.mood] ?? detailCycle.mood}`)
    }
  }

  return (
    `【情侣空间·经期（用户主动分享）】\n` +
    `用户授权同步经期阶段，以及已填写的流量、痛感、心情（可按天）；**不要追问**未提供的具体日期或私密备注。\n` +
    `经期期间对方可能情绪敏感、起伏大、易怒或身体不适；宜温柔体贴，少抬杠。一般不建议劝对方吃冰；若痛感明显，可关心要不要热水袋或休息（勿做医疗诊断）。\n` +
    SHARE_RULES +
    lines.map((l) => `- ${l}`).join('\n')
  )
}

/**
 * 统一入口：线上私聊 / 线下约会长期记忆拼接用。
 * 模块总闸关闭的块根本不生成。
 */
export async function buildCoupleSpaceMemoryInjection(params: {
  accountId: string | null | undefined
  characterId: string
  queryText?: string | null
  diaryLimit?: number
}): Promise<string> {
  const acc = params.accountId?.trim()
  const cid = params.characterId.trim()
  if (!acc || !cid) return ''

  const room = await loadCoupleSpaceRoom(acc, cid)
  if (!room) return ''
  const share = getMemoryShare(room)
  const blocks: string[] = []

  if (share.modules.binding) {
    const b = formatBindingBlock(room)
    if (b) blocks.push(b)
  }

  if (share.modules.milestones) {
    const m = formatMilestonesBlock(room.milestones ?? [], share)
    if (m) blocks.push(m)
  }

  if (share.modules.diary) {
    const entries = await listCoupleDiaryEntriesForCharMemory({
      accountId: acc,
      characterId: cid,
      queryText: params.queryText,
      limit: params.diaryLimit,
    })
    const d = formatCoupleDiaryMemoryBlock(entries)
    if (d) blocks.push(d)
  }

  if (share.modules.period) {
    const p = formatPeriodStageBlock(room)
    if (p) blocks.push(p)
  }

  return blocks.join('\n\n').trim()
}

/** @deprecated 请用 buildCoupleSpaceMemoryInjection；保留兼容旧调用 */
export async function buildCoupleDiaryMemoryInjectionCompat(params: {
  accountId: string | null | undefined
  characterId: string
  queryText?: string | null
  limit?: number
}): Promise<string> {
  return buildCoupleSpaceMemoryInjection({
    accountId: params.accountId,
    characterId: params.characterId,
    queryText: params.queryText,
    diaryLimit: params.limit,
  })
}

export type { CoupleDiaryEntry }
