/** 判断「尚未总结」块是否含足够实质内容（供其它模块判断注入质量）。 */

const MIN_UNSUMMARIZED_BODY_CHARS = 80

function stripInjectionFooter(raw: string): string {
  return String(raw ?? '')
    .replace(/（↑[\s\S]*$/m, '')
    .replace(/【说话人[\s\S]*$/m, '')
    .trim()
}

export function hasMeaningfulUnsummarizedBlock(raw: string | undefined | null): boolean {
  const body = stripInjectionFooter(String(raw ?? ''))
  if (body.length < MIN_UNSUMMARIZED_BODY_CHARS) return false
  const lines = body.split('\n').filter((l) => l.trim().startsWith('- '))
  return lines.length >= 2 || body.length >= MIN_UNSUMMARIZED_BODY_CHARS + 40
}

export type OnlinePrivateInjectDedupeMode = 'uns_only' | 'recent_only' | 'both' | 'merged' | 'empty'

export type OnlinePrivateInjectDedupePlan = {
  mode: OnlinePrivateInjectDedupeMode
  /** 并集消息 id（时间序）；merged / 覆盖判定用 */
  unionMessageIds: string[]
}

/**
 * 未总结(A) 与固定近端(B) 按消息 id 去重规划：
 * - B ⊆ A → 只注 A（uns_only）
 * - A ⊆ B → 只注 B（recent_only）
 * - 无交集 → 两块都注（both）
 * - 部分重合 → 合成一块并集（merged），避免 C 注两遍
 */
export function planUnsummarizedVsRecentPrivateDedupe(params: {
  unsummarizedMessageIds: readonly string[]
  recentMessageIds: readonly string[]
}): OnlinePrivateInjectDedupePlan {
  const unsIds = [...new Set(params.unsummarizedMessageIds.map((x) => String(x ?? '').trim()).filter(Boolean))]
  const recentIds = [...new Set(params.recentMessageIds.map((x) => String(x ?? '').trim()).filter(Boolean))]
  if (!unsIds.length && !recentIds.length) {
    return { mode: 'empty', unionMessageIds: [] }
  }
  if (!recentIds.length) {
    return { mode: 'uns_only', unionMessageIds: unsIds }
  }
  if (!unsIds.length) {
    return { mode: 'recent_only', unionMessageIds: recentIds }
  }
  const unsSet = new Set(unsIds)
  const recentSet = new Set(recentIds)
  const allRecentInUns = recentIds.every((id) => unsSet.has(id))
  const allUnsInRecent = unsIds.every((id) => recentSet.has(id))
  if (allRecentInUns) {
    return { mode: 'uns_only', unionMessageIds: unsIds }
  }
  if (allUnsInRecent) {
    return { mode: 'recent_only', unionMessageIds: recentIds }
  }
  let overlap = 0
  for (const id of recentIds) {
    if (unsSet.has(id)) overlap++
  }
  const union: string[] = []
  const seen = new Set<string>()
  for (const id of [...unsIds, ...recentIds]) {
    if (seen.has(id)) continue
    seen.add(id)
    union.push(id)
  }
  if (overlap === 0) {
    return { mode: 'both', unionMessageIds: union }
  }
  return { mode: 'merged', unionMessageIds: union }
}

/**
 * 近端「最近 N 轮线上原文」与未总结块：按消息 id 并集去重后返回最终注入正文。
 * （未总结管游标后增量；固定近端管刚说过的原话；重合只留一份。）
 */
export function dedupeUnsummarizedVsRecentAiRounds(params: {
  unsummarized: string
  recentAiRounds: string
  unsummarizedMessageIds?: readonly string[]
  recentMessageIds?: readonly string[]
  /** partial overlap 时由调用方预生成的并集块 */
  mergedBlockText?: string
}): {
  unsummarized: string
  recentAiRounds: string
  mode: OnlinePrivateInjectDedupeMode
  privateRecentOmitted: boolean
  unsummarizedCoveredByRecent: boolean
  usedMergedBlock: boolean
} {
  const uns = params.unsummarized.trim()
  const recent = params.recentAiRounds.trim()
  const unsIds = params.unsummarizedMessageIds ?? []
  const recentIds = params.recentMessageIds ?? []

  if (!unsIds.length && !recentIds.length) {
    // 无 id 时保持兼容：两块都留（旧调用方）
    return {
      unsummarized: uns,
      recentAiRounds: recent,
      mode: uns || recent ? (uns && recent ? 'both' : uns ? 'uns_only' : 'recent_only') : 'empty',
      privateRecentOmitted: false,
      unsummarizedCoveredByRecent: false,
      usedMergedBlock: false,
    }
  }

  const plan = planUnsummarizedVsRecentPrivateDedupe({
    unsummarizedMessageIds: unsIds,
    recentMessageIds: recentIds,
  })

  switch (plan.mode) {
    case 'empty':
      return {
        unsummarized: '',
        recentAiRounds: '',
        mode: 'empty',
        privateRecentOmitted: false,
        unsummarizedCoveredByRecent: false,
        usedMergedBlock: false,
      }
    case 'uns_only':
      return {
        unsummarized: uns,
        recentAiRounds: '',
        mode: 'uns_only',
        privateRecentOmitted: !!recent,
        unsummarizedCoveredByRecent: false,
        usedMergedBlock: false,
      }
    case 'recent_only':
      return {
        unsummarized: '',
        recentAiRounds: recent,
        mode: 'recent_only',
        privateRecentOmitted: false,
        unsummarizedCoveredByRecent: !!uns,
        usedMergedBlock: false,
      }
    case 'both':
      return {
        unsummarized: uns,
        recentAiRounds: recent,
        mode: 'both',
        privateRecentOmitted: false,
        unsummarizedCoveredByRecent: false,
        usedMergedBlock: false,
      }
    case 'merged': {
      const merged = (params.mergedBlockText?.trim() || recent || uns).trim()
      return {
        unsummarized: '',
        recentAiRounds: merged,
        mode: 'merged',
        privateRecentOmitted: false,
        unsummarizedCoveredByRecent: false,
        usedMergedBlock: true,
      }
    }
  }
}
