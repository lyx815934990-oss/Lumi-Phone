export const BEAD_CRAFT_KV_KEY = 'lumi-bead-craft-v1'

export const BEAD_EMPTY = -1

export type BeadPatternSource = 'builtin' | 'upload'

export type BeadPattern = {
  id: string
  name: string
  width: number
  height: number
  palette: string[]
  /** 目标图案，每格为 palette 索引或 BEAD_EMPTY */
  cells: number[]
  source: BeadPatternSource
  authorName?: string
  createdAt: number
}

export type BeadCellOwner = 'user' | 'char'

export type BeadCraftSession = {
  id: string
  pattern: BeadPattern
  /** 当前填色状态 */
  filled: number[]
  owners: (BeadCellOwner | null)[]
  characterId: string
  characterName: string
  characterAvatarUrl?: string
  startedAt: number
  lastActiveAt: number
  activeDurationMs: number
  userBeadCount: number
  charBeadCount: number
  status: 'playing' | 'completed'
  completedAt?: number
}

export type BeadCollectionItem = {
  id: string
  patternName: string
  width: number
  height: number
  palette: string[]
  cells: number[]
  characterId: string
  characterName: string
  characterAvatarUrl?: string
  startedAt: number
  completedAt: number
  activeDurationMs: number
  userBeadCount: number
  charBeadCount: number
  note?: string
}

export type BeadCharacterStats = {
  characterId: string
  characterName: string
  characterAvatarUrl?: string
  completedCount: number
  activeDurationMs: number
  userBeadCount: number
  charBeadCount: number
  lastPlayedAt: number
}

export type BeadCraftStats = {
  totalCompleted: number
  totalActiveDurationMs: number
  totalUserBeads: number
  totalCharBeads: number
  byCharacter: Record<string, BeadCharacterStats>
}

export type BeadCraftAccountData = {
  collections: BeadCollectionItem[]
  stats: BeadCraftStats
  activeSession: BeadCraftSession | null
  uploadedPatterns: BeadPattern[]
}

export type BeadCraftPersistedRoot = {
  byAccount: Record<string, BeadCraftAccountData>
}

export type BeadCraftTab = 'plaza' | 'mine'

export type CharBeadPersonality = {
  baseIntervalMs: number
  jitterMs: number
  burstChance: number
  burstSize: number
}
