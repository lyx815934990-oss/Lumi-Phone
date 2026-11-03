import type { LangStudyState, LangStudyWord, WordMastery } from './langStudyTypes'

/** 艾宾浩斯简化间隔（天）：level 0..5 → 下次间隔 */
export const SRS_INTERVAL_DAYS = [0, 1, 3, 7, 14, 30] as const

const DAY_MS = 86_400_000

export function intervalDaysForLevel(level: WordMastery['level']): number {
  return SRS_INTERVAL_DAYS[Math.min(SRS_INTERVAL_DAYS.length - 1, Math.max(0, level))] ?? 1
}

export function nextReviewAtFrom(level: WordMastery['level'], fromMs: number): number {
  const days = intervalDaysForLevel(level)
  if (days <= 0) return fromMs
  return fromMs + days * DAY_MS
}

/** 兼容旧 progress（仅有 level/lastAt） */
export function normalizeMastery(raw: unknown, _now = Date.now()): WordMastery | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Partial<WordMastery> & { level?: number; lastAt?: number }
  if (typeof o.lastAt !== 'number' || !Number.isFinite(o.lastAt)) return null
  const levelNum = typeof o.level === 'number' ? Math.max(0, Math.min(5, Math.floor(o.level))) : 0
  const level = levelNum as WordMastery['level']
  const introduced =
    typeof o.introduced === 'boolean' ? o.introduced : true /* 旧数据视为已学过 */
  const reps =
    typeof o.reps === 'number' && Number.isFinite(o.reps) ? Math.max(0, Math.floor(o.reps)) : level
  const nextReviewAt =
    typeof o.nextReviewAt === 'number' && Number.isFinite(o.nextReviewAt)
      ? o.nextReviewAt
      : nextReviewAtFrom(level > 0 ? level : 1, o.lastAt)
  return { level, lastAt: o.lastAt, nextReviewAt, introduced, reps }
}

export function isDueForReview(m: WordMastery | undefined, now = Date.now()): boolean {
  if (!m?.introduced) return false
  return m.nextReviewAt <= now
}

export function isIntroduced(m: WordMastery | undefined): boolean {
  return !!m?.introduced
}

/** 今日到期复习队列（先到期优先） */
export function listDueReviewWords(
  words: LangStudyWord[],
  progress: Record<string, WordMastery> | undefined,
  now = Date.now(),
  limit = 80,
): LangStudyWord[] {
  const prog = progress ?? {}
  const due = words.filter((w) => isDueForReview(prog[w.id], now))
  due.sort((a, b) => {
    const na = prog[a.id]?.nextReviewAt ?? 0
    const nb = prog[b.id]?.nextReviewAt ?? 0
    if (na !== nb) return na - nb
    const la = a.lesson ?? 9999
    const lb = b.lesson ?? 9999
    return la - lb
  })
  return due.slice(0, limit)
}

/** 未学过的新词（课序优先） */
export function listNewWords(
  words: LangStudyWord[],
  progress: Record<string, WordMastery> | undefined,
  limit: number,
): LangStudyWord[] {
  const prog = progress ?? {}
  const fresh = words.filter((w) => !isIntroduced(prog[w.id]))
  fresh.sort((a, b) => {
    const la = a.lesson ?? 9999
    const lb = b.lesson ?? 9999
    if (la !== lb) return la - lb
    return 0
  })
  return fresh.slice(0, Math.max(0, limit))
}

export function countDueReviews(
  state: LangStudyState,
  bookId: string,
  words: LangStudyWord[],
  now = Date.now(),
): number {
  return listDueReviewWords(words, state.progress[bookId], now, 10_000).length
}

export function countNewRemaining(
  state: LangStudyState,
  bookId: string,
  words: LangStudyWord[],
): number {
  return listNewWords(words, state.progress[bookId], 10_000).length
}

/** 学新词：首次认识 → level1，次日复习；模糊 → level0，约 10 分钟后再看 */
export function gradeAfterLearn(
  prev: WordMastery | undefined,
  remembered: boolean,
  now = Date.now(),
): WordMastery {
  if (remembered) {
    const level = 1 as WordMastery['level']
    return {
      level,
      lastAt: now,
      nextReviewAt: nextReviewAtFrom(level, now),
      introduced: true,
      reps: Math.max(1, (prev?.reps ?? 0) + 1),
    }
  }
  return {
    level: 0,
    lastAt: now,
    nextReviewAt: now + 10 * 60 * 1000,
    introduced: true,
    reps: prev?.reps ?? 0,
  }
}

/**
 * 复习评分（遗忘曲线）：
 * - known：升档，拉长间隔
 * - forgotten：掉回 0，约 10 分钟后重来
 */
export function gradeAfterReview(
  prev: WordMastery | undefined,
  known: boolean,
  now = Date.now(),
): WordMastery {
  if (!known) {
    return {
      level: 0,
      lastAt: now,
      nextReviewAt: now + 10 * 60 * 1000,
      introduced: true,
      reps: prev?.reps ?? 0,
    }
  }
  const prevLevel = prev?.level ?? 0
  const level = Math.min(5, Math.max(1, prevLevel + 1)) as WordMastery['level']
  return {
    level,
    lastAt: now,
    nextReviewAt: nextReviewAtFrom(level, now),
    introduced: true,
    reps: (prev?.reps ?? 0) + 1,
  }
}

export function formatNextReviewHint(m: WordMastery | undefined, now = Date.now()): string {
  if (!m?.introduced) return '未学'
  const diff = m.nextReviewAt - now
  if (diff <= 0) return '待复习'
  const mins = Math.round(diff / 60_000)
  if (mins < 60) return `${mins} 分钟后`
  const hours = Math.round(mins / 60)
  if (hours < 36) return `${hours} 小时后`
  const days = Math.round(hours / 24)
  return `${days} 天后`
}
