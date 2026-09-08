import { create } from 'zustand'

import { personaDb } from '../wechat/newFriendsPersona/idb'
import { clonePattern } from './imageToPattern'
import {
  BEAD_CRAFT_KV_KEY,
  BEAD_EMPTY,
  type BeadCollectionItem,
  type BeadCraftAccountData,
  type BeadCraftPersistedRoot,
  type BeadCraftSession,
  type BeadCraftStats,
  type BeadPattern,
} from './types'

const EMPTY_STATS: BeadCraftStats = {
  totalCompleted: 0,
  totalActiveDurationMs: 0,
  totalUserBeads: 0,
  totalCharBeads: 0,
  byCharacter: {},
}

const EMPTY_ACCOUNT: BeadCraftAccountData = {
  collections: [],
  stats: { ...EMPTY_STATS, byCharacter: {} },
  activeSession: null,
  uploadedPatterns: [],
}

let persistTimer: ReturnType<typeof setTimeout> | null = null

function schedulePersist(root: BeadCraftPersistedRoot) {
  if (persistTimer) clearTimeout(persistTimer)
  persistTimer = setTimeout(() => {
    void personaDb.setPhoneKv(BEAD_CRAFT_KV_KEY, root)
  }, 280)
}

function ensureAccount(root: BeadCraftPersistedRoot, accountId: string): BeadCraftAccountData {
  if (!root.byAccount[accountId]) {
    root.byAccount[accountId] = {
      collections: [],
      stats: { ...EMPTY_STATS, byCharacter: {} },
      activeSession: null,
      uploadedPatterns: [],
    }
  }
  return root.byAccount[accountId]!
}

function createSession(
  pattern: BeadPattern,
  character: { id: string; name: string; avatarUrl?: string },
): BeadCraftSession {
  const now = Date.now()
  return {
    id: `session-${now}`,
    pattern: clonePattern(pattern),
    filled: pattern.cells.map(() => BEAD_EMPTY),
    owners: pattern.cells.map(() => null),
    characterId: character.id,
    characterName: character.name,
    characterAvatarUrl: character.avatarUrl,
    startedAt: now,
    lastActiveAt: now,
    activeDurationMs: 0,
    userBeadCount: 0,
    charBeadCount: 0,
    status: 'playing',
  }
}

type BeadCraftStore = {
  hydrated: boolean
  accountId: string | null
  root: BeadCraftPersistedRoot
  bindAccount: (accountId: string | null | undefined) => Promise<void>
  getAccountData: () => BeadCraftAccountData
  addUploadedPattern: (pattern: BeadPattern) => void
  removeUploadedPattern: (patternId: string) => void
  startSession: (
    pattern: BeadPattern,
    character: { id: string; name: string; avatarUrl?: string },
  ) => BeadCraftSession
  fillCell: (index: number, owner: 'user' | 'char') => boolean
  tickActiveDuration: () => void
  completeSession: () => BeadCollectionItem | null
  abandonSession: () => void
  removeCollection: (id: string) => void
  updateCollectionNote: (id: string, note: string) => void
}

const EMPTY_PATTERNS: BeadPattern[] = []
const EMPTY_COLLECTIONS: BeadCollectionItem[] = []

export function selectActiveSession(state: BeadCraftStore): BeadCraftSession | null {
  const id = state.accountId
  if (!id) return null
  return state.root.byAccount[id]?.activeSession ?? null
}

export function selectUploadedPatterns(state: BeadCraftStore): BeadPattern[] {
  const id = state.accountId
  if (!id) return EMPTY_PATTERNS
  return state.root.byAccount[id]?.uploadedPatterns ?? EMPTY_PATTERNS
}

export function selectCollections(state: BeadCraftStore): BeadCollectionItem[] {
  const id = state.accountId
  if (!id) return EMPTY_COLLECTIONS
  return state.root.byAccount[id]?.collections ?? EMPTY_COLLECTIONS
}

export function selectStats(state: BeadCraftStore): BeadCraftStats {
  const id = state.accountId
  if (!id) return EMPTY_STATS
  return state.root.byAccount[id]?.stats ?? EMPTY_STATS
}

export const useBeadCraftStore = create<BeadCraftStore>((set, get) => ({
  hydrated: false,
  accountId: null,
  root: { byAccount: {} },

  bindAccount: async (accountId) => {
    const id = accountId?.trim() || null
    if (!id) {
      set({ hydrated: true, accountId: null })
      return
    }
    try {
      const raw = await personaDb.getPhoneKv(BEAD_CRAFT_KV_KEY)
      const root =
        raw && typeof raw === 'object' && 'byAccount' in (raw as object)
          ? (raw as BeadCraftPersistedRoot)
          : { byAccount: {} }
      ensureAccount(root, id)
      set({ hydrated: true, accountId: id, root })
    } catch {
      set({ hydrated: true, accountId: id, root: { byAccount: { [id]: { ...EMPTY_ACCOUNT } } } })
    }
  },

  getAccountData: () => {
    const { accountId, root } = get()
    if (!accountId) return EMPTY_ACCOUNT
    return ensureAccount(root, accountId)
  },

  addUploadedPattern: (pattern) => {
    const { accountId, root } = get()
    if (!accountId) return
    const acc = ensureAccount(root, accountId)
    const uploadedPatterns = [clonePattern(pattern), ...acc.uploadedPatterns].slice(0, 24)
    schedulePersist({
      ...root,
      byAccount: {
        ...root.byAccount,
        [accountId]: { ...acc, uploadedPatterns },
      },
    })
    set({
      root: {
        ...root,
        byAccount: {
          ...root.byAccount,
          [accountId]: { ...acc, uploadedPatterns },
        },
      },
    })
  },

  removeUploadedPattern: (patternId) => {
    const { accountId, root } = get()
    if (!accountId) return
    const acc = ensureAccount(root, accountId)
    const uploadedPatterns = acc.uploadedPatterns.filter((p) => p.id !== patternId)
    schedulePersist({
      ...root,
      byAccount: {
        ...root.byAccount,
        [accountId]: { ...acc, uploadedPatterns },
      },
    })
    set({
      root: {
        ...root,
        byAccount: {
          ...root.byAccount,
          [accountId]: { ...acc, uploadedPatterns },
        },
      },
    })
  },

  startSession: (pattern, character) => {
    const { accountId, root } = get()
    if (!accountId) throw new Error('未绑定账号')
    const acc = ensureAccount(root, accountId)
    const session = createSession(pattern, character)
    acc.activeSession = session
    schedulePersist(root)
    set({
      root: {
        ...root,
        byAccount: { ...root.byAccount, [accountId]: { ...acc } },
      },
    })
    return session
  },

  fillCell: (index, owner) => {
    const { accountId, root } = get()
    if (!accountId) return false
    const acc = ensureAccount(root, accountId)
    const session = acc.activeSession
    if (!session || session.status !== 'playing') return false
    const target = session.pattern.cells[index]
    if (target === undefined || target < 0) return false
    if (session.filled[index]! >= 0) return false

    const filled = session.filled.slice()
    const owners = session.owners.slice()
    filled[index] = target
    owners[index] = owner

    const nextSession: BeadCraftSession = {
      ...session,
      filled,
      owners,
      userBeadCount: owner === 'user' ? session.userBeadCount + 1 : session.userBeadCount,
      charBeadCount: owner === 'char' ? session.charBeadCount + 1 : session.charBeadCount,
      lastActiveAt: Date.now(),
    }
    acc.activeSession = nextSession
    schedulePersist(root)
    set({
      root: {
        ...root,
        byAccount: { ...root.byAccount, [accountId]: { ...acc, activeSession: nextSession } },
      },
    })
    return true
  },

  tickActiveDuration: () => {
    const { accountId, root } = get()
    if (!accountId) return
    const acc = ensureAccount(root, accountId)
    const session = acc.activeSession
    if (!session || session.status !== 'playing') return
    const now = Date.now()
    const delta = now - session.lastActiveAt
    if (delta <= 0 || delta >= 5000) return

    const nextSession: BeadCraftSession = {
      ...session,
      activeDurationMs: session.activeDurationMs + delta,
      lastActiveAt: now,
    }
    acc.activeSession = nextSession
    schedulePersist(root)
    set({
      root: {
        ...root,
        byAccount: { ...root.byAccount, [accountId]: { ...acc, activeSession: nextSession } },
      },
    })
  },

  completeSession: () => {
    const { accountId, root } = get()
    if (!accountId) return null
    const acc = ensureAccount(root, accountId)
    const session = acc.activeSession
    if (!session || session.status !== 'playing') return null

    const completedAt = Date.now()
    session.status = 'completed'
    session.completedAt = completedAt

    const item: BeadCollectionItem = {
      id: session.id,
      patternName: session.pattern.name,
      width: session.pattern.width,
      height: session.pattern.height,
      palette: [...session.pattern.palette],
      cells: session.filled.map((c) => (c >= 0 ? c : BEAD_EMPTY)),
      characterId: session.characterId,
      characterName: session.characterName,
      characterAvatarUrl: session.characterAvatarUrl,
      startedAt: session.startedAt,
      completedAt,
      activeDurationMs: session.activeDurationMs,
      userBeadCount: session.userBeadCount,
      charBeadCount: session.charBeadCount,
    }

    acc.collections = [item, ...acc.collections]
    acc.activeSession = null

    const stats = acc.stats
    stats.totalCompleted++
    stats.totalActiveDurationMs += item.activeDurationMs
    stats.totalUserBeads += item.userBeadCount
    stats.totalCharBeads += item.charBeadCount

    const charStats = stats.byCharacter[item.characterId] ?? {
      characterId: item.characterId,
      characterName: item.characterName,
      characterAvatarUrl: item.characterAvatarUrl,
      completedCount: 0,
      activeDurationMs: 0,
      userBeadCount: 0,
      charBeadCount: 0,
      lastPlayedAt: 0,
    }
    charStats.characterName = item.characterName
    charStats.characterAvatarUrl = item.characterAvatarUrl
    charStats.completedCount++
    charStats.activeDurationMs += item.activeDurationMs
    charStats.userBeadCount += item.userBeadCount
    charStats.charBeadCount += item.charBeadCount
    charStats.lastPlayedAt = completedAt
    stats.byCharacter[item.characterId] = charStats

    schedulePersist(root)
    set({ root: { ...root } })
    return item
  },

  abandonSession: () => {
    const { accountId, root } = get()
    if (!accountId) return
    const acc = ensureAccount(root, accountId)
    acc.activeSession = null
    schedulePersist(root)
    set({ root: { ...root } })
  },

  removeCollection: (id) => {
    const { accountId, root } = get()
    if (!accountId) return
    const acc = ensureAccount(root, accountId)
    acc.collections = acc.collections.filter((c) => c.id !== id)
    schedulePersist(root)
    set({ root: { ...root } })
  },

  updateCollectionNote: (id, note) => {
    const { accountId, root } = get()
    if (!accountId) return
    const acc = ensureAccount(root, accountId)
    const item = acc.collections.find((c) => c.id === id)
    if (!item) return
    item.note = note.trim() || undefined
    schedulePersist(root)
    set({ root: { ...root } })
  },
}))

export function formatBeadDuration(ms: number): string {
  const totalSec = Math.max(0, Math.round(ms / 1000))
  if (totalSec < 60) return `${totalSec} 秒`
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  if (min < 60) return sec ? `${min} 分 ${sec} 秒` : `${min} 分钟`
  const hr = Math.floor(min / 60)
  const remMin = min % 60
  return remMin ? `${hr} 小时 ${remMin} 分` : `${hr} 小时`
}

export function formatBeadDate(ts: number): string {
  const d = new Date(ts)
  return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`
}
