import type { FriendMoodLevel } from './types'

/** 0 生气 → 5 大笑 */
export const MOOD_FACE: Record<FriendMoodLevel, string> = {
  0: '😠',
  1: '😭',
  2: '😔',
  3: '😐',
  4: '🙂',
  5: '😄',
}

export const MOOD_LABEL: Record<FriendMoodLevel, string> = {
  0: '生气',
  1: '哭泣',
  2: '难过',
  3: '平静',
  4: '微笑',
  5: '大笑',
}

export const MOOD_LEVELS: FriendMoodLevel[] = [0, 1, 2, 3, 4, 5]

export function clampMoodLevel(n: unknown): FriendMoodLevel {
  const v = Math.round(Number(n))
  if (!Number.isFinite(v) || v <= 0) return 0
  if (v === 1) return 1
  if (v === 2) return 2
  if (v === 3) return 3
  if (v === 4) return 4
  return 5
}
