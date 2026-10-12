import { create } from 'zustand'

import { personaDb } from '../newFriendsPersona/idb'
import type { RelationshipStage } from '../wechatChatPrompt'
import { setPeriodEndOnCycles, setPeriodStartOnCycles } from './couplePeriodLogic'
import {
  normalizeCouplePeriodDays,
  migrateLegacyCycleMetrics,
  summarizeCycleMetricsFromDays,
  upsertPeriodDayEntry,
} from './couplePeriodDayRecords'
import {
  COUPLE_SPACE_KV_KEY,
  emptyNicknames,
  emptyRoom,
  normalizeCoupleDiaryEntry,
  normalizeCoupleMilestoneAccent,
  normalizeCoupleMilestoneTimeKey,
  normalizeCouplePeriodCycle,
  normalizeCouplePeriodSettings,
  normalizeCouplePeriodState,
  normalizeCoupleMemoryShareState,
  toLocalDateKey,
  uidCouple,
  type CoupleDiaryAuthor,
  type CoupleDiaryCharActionKind,
  type CoupleDiaryCharActions,
  type CoupleDiaryEntry,
  type CoupleMemoryShareModule,
  type CoupleMilestone,
  type CoupleMilestoneAccent,
  type CoupleMilestoneCategory,
  type CoupleMilestoneRepeat,
  type CoupleNicknameCard,
  type CouplePeriodCharActionKind,
  type CouplePeriodCharActions,
  type CouplePeriodCycle,
  type CouplePeriodDayEntry,
  type CouplePeriodFlow,
  type CouplePeriodMood,
  type CouplePeriodPain,
  type CouplePeriodSettings,
  normalizeCouplePeriodCharActions,
  type CoupleSpaceBinding,
  type CoupleSpacePersistedRoot,
  type CoupleSpaceRoom,
} from './coupleSpaceTypes'

type PeriodCycleWriteInput = {
  startDateKey: string
  endDateKey?: string | null
  flow?: CouplePeriodFlow | null
  pain?: CouplePeriodPain | null
  mood?: CouplePeriodMood | null
  days?: CouplePeriodDayEntry[] | null
  note?: string | null
}

function buildPeriodCycleRow(
  id: string,
  createdAt: number,
  input: PeriodCycleWriteInput,
  preserve?: Pick<CouplePeriodCycle, 'charActions' | 'days'>,
): CouplePeriodCycle | null {
  const startDateKey = input.startDateKey.trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDateKey)) return null
  const endDateKey =
    input.endDateKey === null || input.endDateKey === undefined
      ? undefined
      : (() => {
          const e = input.endDateKey.trim()
          return /^\d{4}-\d{2}-\d{2}$/.test(e) && e >= startDateKey ? e : undefined
        })()
  let days =
    input.days !== undefined
      ? normalizeCouplePeriodDays(input.days)
      : normalizeCouplePeriodDays(preserve?.days)
  // 无 days 时，整段 flow/pain/mood 落到开始日
  if (
    !days.length &&
    (input.flow != null || input.pain != null || input.mood != null)
  ) {
    days = upsertPeriodDayEntry([], startDateKey, {
      flow: input.flow ?? null,
      pain: input.pain ?? null,
      mood: input.mood ?? null,
    })
  }
  const summary = summarizeCycleMetricsFromDays(days)
  const note = String(input.note ?? '').trim().slice(0, 120)
  const charActions = normalizeCouplePeriodCharActions(preserve?.charActions)
  return {
    id,
    startDateKey,
    createdAt,
    ...(endDateKey ? { endDateKey } : {}),
    ...(summary.flow ? { flow: summary.flow } : {}),
    ...(summary.pain != null ? { pain: summary.pain } : {}),
    ...(summary.mood ? { mood: summary.mood } : {}),
    ...(days.length ? { days } : {}),
    ...(note ? { note } : {}),
    ...(charActions ? { charActions } : {}),
  }
}

type MilestoneWriteInput = {
  title: string
  dateKey: string
  kind?: CoupleMilestone['kind']
  pinned?: boolean
  repeat?: CoupleMilestoneRepeat
  category?: CoupleMilestoneCategory
  remindOffsetDays?: number | null
  endDateKey?: string | null
  timeKey?: string | null
  countFromNextDay?: boolean
  accent?: CoupleMilestoneAccent | null
  highlight?: boolean
}

function normalizeEndDateKey(startKey: string, raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined
  const end = raw.trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(end)) return undefined
  if (end < startKey) return undefined
  return end
}

function milestoneAdvancedFields(
  dateKey: string,
  input: {
    endDateKey?: string | null
    timeKey?: string | null
    countFromNextDay?: boolean
    accent?: CoupleMilestoneAccent | null
    highlight?: boolean
  },
): Pick<
  CoupleMilestone,
  'endDateKey' | 'timeKey' | 'countFromNextDay' | 'accent' | 'highlight'
> {
  const endDateKey =
    input.endDateKey === null ? undefined : normalizeEndDateKey(dateKey, input.endDateKey)
  const timeKey =
    input.timeKey === null ? undefined : normalizeCoupleMilestoneTimeKey(input.timeKey)
  const accent =
    input.accent === null ? undefined : normalizeCoupleMilestoneAccent(input.accent)
  return {
    ...(endDateKey ? { endDateKey } : {}),
    ...(timeKey ? { timeKey } : {}),
    ...(input.countFromNextDay === true ? { countFromNextDay: true } : {}),
    ...(accent ? { accent } : {}),
    ...(input.highlight === true ? { highlight: true } : {}),
  }
}

type CoupleSpaceStore = {
  hydrated: boolean
  currentAccountId: string | null
  root: CoupleSpacePersistedRoot

  bindAccount: (accountId: string | null | undefined) => Promise<void>
  getRoom: (characterId: string) => CoupleSpaceRoom | null
  ensureRoom: (characterId: string) => CoupleSpaceRoom

  completeBinding: (params: {
    characterId: string
    acceptedReplyText: string
    userDisplayName: string
    charDisplayName: string
    relationshipStageAtBind?: RelationshipStage
    boundAt?: number
  }) => CoupleSpaceBinding | null

  unbind: (characterId: string) => void

  setNicknames: (
    characterId: string,
    patch: Partial<Pick<CoupleNicknameCard, 'userToChar' | 'charToUser'>>,
  ) => void

  appendDiaryEntry: (
    characterId: string,
    entry: Omit<CoupleDiaryEntry, 'id' | 'createdAt'> & { id?: string; createdAt?: number },
  ) => CoupleDiaryEntry | null

  revealDiaryEntry: (characterId: string, entryId: string) => void

  setDiaryIncludeInMemory: (characterId: string, entryId: string, includeInMemory: boolean) => void

  setAllDiaryIncludeInMemory: (characterId: string, include: boolean) => void

  setMemoryShareModule: (
    characterId: string,
    module: CoupleMemoryShareModule,
    enabled: boolean,
  ) => void

  setMemoryShareMilestoneIds: (
    characterId: string,
    ids: string[] | 'all',
  ) => void

  requestDiaryCharAction: (
    characterId: string,
    entryId: string,
    requested: CoupleDiaryCharActionKind[],
  ) => void

  setDiaryCharActionResponse: (
    characterId: string,
    entryId: string,
    response: string,
    opts?: { appendContinueAsCharPage?: boolean; keepPriorResponse?: boolean },
  ) => CoupleDiaryEntry | null

  requestPeriodCharAction: (
    characterId: string,
    cycleId: string,
    requested?: CouplePeriodCharActionKind[],
  ) => void

  setPeriodCharActionResponse: (
    characterId: string,
    cycleId: string,
    response: string,
    opts?: { autoCareDateKey?: string },
  ) => CouplePeriodCycle | null

  addMilestone: (characterId: string, input: MilestoneWriteInput) => CoupleMilestone | null

  updateMilestone: (
    characterId: string,
    milestoneId: string,
    input: MilestoneWriteInput,
  ) => CoupleMilestone | null

  removeMilestone: (characterId: string, milestoneId: string) => void

  addPeriodCycle: (
    characterId: string,
    input: PeriodCycleWriteInput,
  ) => CouplePeriodCycle | null

  updatePeriodCycle: (
    characterId: string,
    cycleId: string,
    input: PeriodCycleWriteInput,
  ) => CouplePeriodCycle | null

  /** 更新经期内某一天的流量/痛感/心情 */
  updatePeriodDay: (
    characterId: string,
    cycleId: string,
    dateKey: string,
    patch: {
      flow?: CouplePeriodFlow | null
      pain?: CouplePeriodPain | null
      mood?: CouplePeriodMood | null
    },
  ) => CouplePeriodCycle | null

  removePeriodCycle: (characterId: string, cycleId: string) => void

  /** 整表替换经期记录（测试种子 / 清空） */
  replacePeriodCycles: (
    characterId: string,
    inputs: PeriodCycleWriteInput[],
  ) => CouplePeriodCycle[]

  updatePeriodSettings: (
    characterId: string,
    patch: Partial<CouplePeriodSettings>,
  ) => CouplePeriodSettings | null

  /** 标记/取消「月经来了」（开始日） */
  setPeriodStartMarked: (
    characterId: string,
    dateKey: string,
    marked: boolean,
  ) => void

  /** 标记/取消「月经结束了」（结束日） */
  setPeriodEndMarked: (
    characterId: string,
    dateKey: string,
    marked: boolean,
  ) => void
}

const EMPTY_ROOT: CoupleSpacePersistedRoot = { byAccount: {} }

let persistTimer: ReturnType<typeof setTimeout> | null = null

function schedulePersist(root: CoupleSpacePersistedRoot) {
  if (persistTimer) clearTimeout(persistTimer)
  persistTimer = setTimeout(() => {
    void personaDb.setPhoneKv(COUPLE_SPACE_KV_KEY, root)
  }, 280)
}

function normalizeRoot(raw: unknown): CoupleSpacePersistedRoot {
  if (!raw || typeof raw !== 'object') return { byAccount: {} }
  const byAccount = (raw as CoupleSpacePersistedRoot).byAccount
  if (!byAccount || typeof byAccount !== 'object') return { byAccount: {} }
  const next: CoupleSpacePersistedRoot = { byAccount: {} }
  for (const [acc, data] of Object.entries(byAccount)) {
    if (!acc.trim() || !data || typeof data !== 'object') continue
    const rooms: Record<string, CoupleSpaceRoom> = {}
    const rawRooms = (data as { rooms?: Record<string, CoupleSpaceRoom> }).rooms ?? {}
    for (const [charId, room] of Object.entries(rawRooms)) {
      if (!charId.trim() || !room || typeof room !== 'object') continue
      const binding =
        room.binding && typeof room.binding.boundAt === 'number' && room.binding.boundAt > 0
          ? {
              boundAt: room.binding.boundAt,
              acceptedReplyText: String(room.binding.acceptedReplyText ?? '').trim(),
              userDisplayName: String(room.binding.userDisplayName ?? '').trim() || '我',
              charDisplayName: String(room.binding.charDisplayName ?? '').trim() || '对方',
              ...(room.binding.relationshipStageAtBind
                ? { relationshipStageAtBind: room.binding.relationshipStageAtBind }
                : {}),
            }
          : null
      const diary = Array.isArray(room.diary)
        ? room.diary.map((e) => normalizeCoupleDiaryEntry(e)).filter((e): e is CoupleDiaryEntry => !!e)
        : []
      const milestones = Array.isArray(room.milestones)
        ? room.milestones
            .filter((m) => m && typeof m === 'object' && typeof m.id === 'string')
            .map((m) => {
              const kind: CoupleMilestone['kind'] =
                m.kind === 'meet' || m.kind === 'custom' || m.kind === 'binding' ? m.kind : 'custom'
              const repeat: CoupleMilestoneRepeat =
                m.repeat === 'yearly' || m.repeat === 'monthly' ? m.repeat : 'none'
              const category: CoupleMilestoneCategory =
                m.category === 'love' || m.category === 'memory' ? m.category : 'life'
              const remindRaw = (m as { remindOffsetDays?: unknown }).remindOffsetDays
              const remindOffsetDays =
                typeof remindRaw === 'number' &&
                Number.isFinite(remindRaw) &&
                (remindRaw === 0 || remindRaw === 1 || remindRaw === 3 || remindRaw === 7)
                  ? remindRaw
                  : undefined
              const dateKey = String(m.dateKey ?? '').trim() || toLocalDateKey()
              const endDateKey = normalizeEndDateKey(
                dateKey,
                (m as { endDateKey?: unknown }).endDateKey,
              )
              const timeKey = normalizeCoupleMilestoneTimeKey(
                (m as { timeKey?: unknown }).timeKey,
              )
              const accent = normalizeCoupleMilestoneAccent((m as { accent?: unknown }).accent)
              return {
                id: m.id,
                title: String(m.title ?? '').trim() || '纪念日',
                dateKey,
                kind,
                createdAt: typeof m.createdAt === 'number' ? m.createdAt : Date.now(),
                ...(m.pinned === true ? { pinned: true } : {}),
                ...(repeat !== 'none' ? { repeat } : {}),
                ...(category !== 'life' ? { category } : {}),
                ...(remindOffsetDays != null ? { remindOffsetDays } : {}),
                ...(endDateKey ? { endDateKey } : {}),
                ...(timeKey ? { timeKey } : {}),
                ...((m as { countFromNextDay?: unknown }).countFromNextDay === true
                  ? { countFromNextDay: true }
                  : {}),
                ...(accent ? { accent } : {}),
                ...((m as { highlight?: unknown }).highlight === true ? { highlight: true } : {}),
              }
            })
        : []
      const nick = room.nicknames
      rooms[charId] = {
        characterId: charId,
        binding,
        diary,
        milestones,
        nicknames: {
          userToChar: String(nick?.userToChar ?? '').trim(),
          charToUser: String(nick?.charToUser ?? '').trim(),
          updatedAt: typeof nick?.updatedAt === 'number' ? nick.updatedAt : 0,
        },
        moods: Array.isArray(room.moods) ? room.moods : [],
        wishes: Array.isArray(room.wishes) ? room.wishes : [],
        decor: Array.isArray(room.decor) ? room.decor : [],
        goodnight: Array.isArray(room.goodnight) ? room.goodnight : [],
        period: normalizeCouplePeriodState((room as { period?: unknown }).period),
        memoryShare: normalizeCoupleMemoryShareState(
          (room as { memoryShare?: unknown }).memoryShare,
        ),
      }
    }
    next.byAccount[acc] = { rooms }
  }
  return next
}

function patchRoom(
  root: CoupleSpacePersistedRoot,
  accountId: string,
  charId: string,
  recipe: (room: CoupleSpaceRoom) => CoupleSpaceRoom,
): CoupleSpacePersistedRoot {
  const acc = root.byAccount[accountId] ?? { rooms: {} }
  const current = acc.rooms[charId] ?? emptyRoom(charId)
  return {
    byAccount: {
      ...root.byAccount,
      [accountId]: {
        rooms: {
          ...acc.rooms,
          [charId]: recipe(current),
        },
      },
    },
  }
}

function mergeCharActions(
  prev: CoupleDiaryCharActions | undefined,
  patch: Partial<CoupleDiaryCharActions>,
): CoupleDiaryCharActions | undefined {
  const requested = Array.isArray(patch.requested)
    ? patch.requested.filter((k): k is CoupleDiaryCharActionKind => k === 'comment' || k === 'continue')
    : prev?.requested ?? []
  const response =
    typeof patch.response === 'string' ? patch.response.trim() : prev?.response?.trim() || ''
  const respondedAt =
    typeof patch.respondedAt === 'number' && Number.isFinite(patch.respondedAt)
      ? patch.respondedAt
      : prev?.respondedAt
  if (!requested.length && !response && respondedAt == null) return undefined
  return {
    requested,
    ...(response ? { response } : {}),
    ...(respondedAt != null ? { respondedAt } : {}),
  }
}

function mergePeriodCharActions(
  prev: CouplePeriodCharActions | undefined,
  patch: Partial<CouplePeriodCharActions>,
): CouplePeriodCharActions | undefined {
  const requested = Array.isArray(patch.requested)
    ? patch.requested.filter((k): k is CouplePeriodCharActionKind => k === 'warm_comment')
    : prev?.requested ?? []
  const response =
    typeof patch.response === 'string' ? patch.response.trim() : prev?.response?.trim() || ''
  const respondedAt =
    typeof patch.respondedAt === 'number' && Number.isFinite(patch.respondedAt)
      ? patch.respondedAt
      : prev?.respondedAt
  const autoCareDateKeyRaw =
    typeof patch.autoCareDateKey === 'string'
      ? patch.autoCareDateKey.trim()
      : prev?.autoCareDateKey?.trim() || ''
  const autoCareDateKey = /^\d{4}-\d{2}-\d{2}$/.test(autoCareDateKeyRaw)
    ? autoCareDateKeyRaw
    : undefined
  if (!requested.length && !response && respondedAt == null && !autoCareDateKey) return undefined
  return {
    requested,
    ...(response ? { response } : {}),
    ...(respondedAt != null ? { respondedAt } : {}),
    ...(autoCareDateKey ? { autoCareDateKey } : {}),
  }
}

export const useCoupleSpaceStore = create<CoupleSpaceStore>((set, get) => ({
  hydrated: false,
  currentAccountId: null,
  root: EMPTY_ROOT,

  async bindAccount(accountId) {
    const acc = accountId?.trim() || null
    if (acc === get().currentAccountId && get().hydrated) return
    if (!acc) {
      set({ currentAccountId: null, root: EMPTY_ROOT, hydrated: true })
      return
    }
    const raw = await personaDb.getPhoneKv(COUPLE_SPACE_KV_KEY)
    set({
      currentAccountId: acc,
      root: normalizeRoot(raw),
      hydrated: true,
    })
  },

  getRoom(characterId) {
    const acc = get().currentAccountId
    const cid = characterId.trim()
    if (!acc || !cid) return null
    return get().root.byAccount[acc]?.rooms[cid] ?? null
  },

  ensureRoom(characterId) {
    const acc = get().currentAccountId
    const cid = characterId.trim()
    if (!acc || !cid) return emptyRoom(cid || 'unknown')
    const existing = get().root.byAccount[acc]?.rooms[cid]
    if (existing) return existing
    const room = emptyRoom(cid)
    const next = patchRoom(get().root, acc, cid, () => room)
    set({ root: next })
    schedulePersist(next)
    return room
  },

  completeBinding(params) {
    const acc = get().currentAccountId
    const cid = params.characterId.trim()
    if (!acc || !cid) return null
    const boundAt = params.boundAt ?? Date.now()
    const binding: CoupleSpaceBinding = {
      boundAt,
      acceptedReplyText: params.acceptedReplyText.trim(),
      userDisplayName: params.userDisplayName.trim() || '我',
      charDisplayName: params.charDisplayName.trim() || '对方',
      ...(params.relationshipStageAtBind
        ? { relationshipStageAtBind: params.relationshipStageAtBind }
        : {}),
    }
    const bindingMilestone: CoupleMilestone = {
      id: uidCouple('ms'),
      title: '情侣空间绑定日',
      dateKey: toLocalDateKey(boundAt),
      kind: 'binding',
      createdAt: boundAt,
    }
    const next = patchRoom(get().root, acc, cid, (room) => {
      const hasBindingMs = room.milestones.some((m) => m.kind === 'binding')
      return {
        ...room,
        binding,
        milestones: hasBindingMs ? room.milestones : [bindingMilestone, ...room.milestones],
        nicknames: room.nicknames.updatedAt
          ? room.nicknames
          : {
              ...emptyNicknames(),
              userToChar: room.nicknames.userToChar,
              charToUser: room.nicknames.charToUser,
            },
      }
    })
    set({ root: next })
    schedulePersist(next)
    return binding
  },

  unbind(characterId) {
    const acc = get().currentAccountId
    const cid = characterId.trim()
    if (!acc || !cid) return
    // 解绑即清零该角色情侣空间全部共同数据（不可恢复）
    const next = patchRoom(get().root, acc, cid, () => emptyRoom(cid))
    set({ root: next })
    schedulePersist(next)
  },

  setNicknames(characterId, patch) {
    const acc = get().currentAccountId
    const cid = characterId.trim()
    if (!acc || !cid) return
    const next = patchRoom(get().root, acc, cid, (room) => ({
      ...room,
      nicknames: {
        userToChar:
          typeof patch.userToChar === 'string' ? patch.userToChar.trim() : room.nicknames.userToChar,
        charToUser:
          typeof patch.charToUser === 'string' ? patch.charToUser.trim() : room.nicknames.charToUser,
        updatedAt: Date.now(),
      },
    }))
    set({ root: next })
    schedulePersist(next)
  },

  appendDiaryEntry(characterId, entry) {
    const acc = get().currentAccountId
    const cid = characterId.trim()
    if (!acc || !cid) return null
    const content = String(entry.content ?? '').trim()
    if (!content) return null
    const author: CoupleDiaryAuthor = entry.author === 'char' ? 'char' : 'user'
    const row: CoupleDiaryEntry = {
      id: entry.id?.trim() || uidCouple('diary'),
      author,
      content,
      createdAt: entry.createdAt ?? Date.now(),
      ...(typeof entry.revealedToPeerAt === 'number'
        ? { revealedToPeerAt: entry.revealedToPeerAt }
        : {}),
      includeInMemory: entry.includeInMemory === true,
      ...(entry.charActions ? { charActions: entry.charActions } : {}),
    }
    const next = patchRoom(get().root, acc, cid, (room) => ({
      ...room,
      diary: [row, ...room.diary],
    }))
    set({ root: next })
    schedulePersist(next)
    return row
  },

  revealDiaryEntry(characterId, entryId) {
    const acc = get().currentAccountId
    const cid = characterId.trim()
    const eid = entryId.trim()
    if (!acc || !cid || !eid) return
    const now = Date.now()
    const next = patchRoom(get().root, acc, cid, (room) => ({
      ...room,
      diary: room.diary.map((e) =>
        e.id === eid && e.revealedToPeerAt == null ? { ...e, revealedToPeerAt: now } : e,
      ),
    }))
    set({ root: next })
    schedulePersist(next)
  },

  setDiaryIncludeInMemory(characterId, entryId, includeInMemory) {
    const acc = get().currentAccountId
    const cid = characterId.trim()
    const eid = entryId.trim()
    if (!acc || !cid || !eid) return
    const next = patchRoom(get().root, acc, cid, (room) => ({
      ...room,
      diary: room.diary.map((e) => (e.id === eid ? { ...e, includeInMemory: includeInMemory === true } : e)),
    }))
    set({ root: next })
    schedulePersist(next)
  },

  setAllDiaryIncludeInMemory(characterId, include) {
    const acc = get().currentAccountId
    const cid = characterId.trim()
    if (!acc || !cid) return
    const on = include === true
    const next = patchRoom(get().root, acc, cid, (room) => ({
      ...room,
      diary: room.diary.map((e) =>
        e.author === 'user' ? { ...e, includeInMemory: on } : e,
      ),
    }))
    set({ root: next })
    schedulePersist(next)
  },

  setMemoryShareModule(characterId, module, enabled) {
    const acc = get().currentAccountId
    const cid = characterId.trim()
    if (!acc || !cid) return
    const next = patchRoom(get().root, acc, cid, (room) => {
      const memoryShare = normalizeCoupleMemoryShareState(room.memoryShare)
      return {
        ...room,
        memoryShare: {
          ...memoryShare,
          modules: {
            ...memoryShare.modules,
            [module]: enabled === true,
          },
        },
      }
    })
    set({ root: next })
    schedulePersist(next)
  },

  setMemoryShareMilestoneIds(characterId, ids) {
    const acc = get().currentAccountId
    const cid = characterId.trim()
    if (!acc || !cid) return
    const milestoneIds: string[] | 'all' =
      ids === 'all'
        ? 'all'
        : Array.isArray(ids)
          ? ids.filter((id) => typeof id === 'string' && !!id.trim()).map((id) => id.trim())
          : []
    const next = patchRoom(get().root, acc, cid, (room) => {
      const memoryShare = normalizeCoupleMemoryShareState(room.memoryShare)
      return {
        ...room,
        memoryShare: {
          ...memoryShare,
          milestoneIds,
        },
      }
    })
    set({ root: next })
    schedulePersist(next)
  },

  requestDiaryCharAction(characterId, entryId, requested) {
    const acc = get().currentAccountId
    const cid = characterId.trim()
    const eid = entryId.trim()
    if (!acc || !cid || !eid) return
    const kinds = requested.filter((k): k is CoupleDiaryCharActionKind => k === 'comment' || k === 'continue')
    const next = patchRoom(get().root, acc, cid, (room) => ({
      ...room,
      diary: room.diary.map((e) => {
        if (e.id !== eid) return e
        const charActions = mergeCharActions(e.charActions, { requested: kinds })
        if (!charActions) {
          const rest = { ...e }
          delete rest.charActions
          return rest
        }
        return { ...e, charActions }
      }),
    }))
    set({ root: next })
    schedulePersist(next)
  },

  setDiaryCharActionResponse(characterId, entryId, response, opts) {
    const acc = get().currentAccountId
    const cid = characterId.trim()
    const eid = entryId.trim()
    const text = response.trim()
    if (!acc || !cid || !eid || !text) return null
    const now = Date.now()
    let updatedUser: CoupleDiaryEntry | null = null
    let continuePage: CoupleDiaryEntry | null = null
    const next = patchRoom(get().root, acc, cid, (room) => {
      const diary = room.diary.map((e) => {
        if (e.id !== eid) return e
        const keepPrior = opts?.keepPriorResponse === true && !!e.charActions?.response?.trim()
        const charActions = mergeCharActions(e.charActions, {
          ...(keepPrior ? {} : { response: text, respondedAt: now }),
          requested: e.charActions?.requested ?? [],
        })
        updatedUser = { ...e, ...(charActions ? { charActions } : {}) }
        return updatedUser
      })
      if (opts?.appendContinueAsCharPage && updatedUser) {
        const dayKey = toLocalDateKey(updatedUser.createdAt)
        const latestSameDay = diary.reduce((max, e) => {
          if (toLocalDateKey(e.createdAt) !== dayKey) return max
          return Math.max(max, e.createdAt)
        }, updatedUser.createdAt)
        let createdAt = latestSameDay + 1
        if (toLocalDateKey(createdAt) !== dayKey) createdAt = latestSameDay
        continuePage = {
          id: uidCouple('diary'),
          author: 'char',
          content: text,
          createdAt,
          revealedToPeerAt: now,
          includeInMemory: false,
        }
        return { ...room, diary: [continuePage, ...diary] }
      }
      return { ...room, diary }
    })
    set({ root: next })
    schedulePersist(next)
    return continuePage ?? updatedUser
  },

  requestPeriodCharAction(characterId, cycleId, requested = ['warm_comment']) {
    const acc = get().currentAccountId
    const cid = characterId.trim()
    const pid = cycleId.trim()
    if (!acc || !cid || !pid) return
    const kinds = requested.filter((k): k is CouplePeriodCharActionKind => k === 'warm_comment')
    if (!kinds.length) return
    const next = patchRoom(get().root, acc, cid, (room) => {
      const period = normalizeCouplePeriodState(room.period)
      return {
        ...room,
        period: {
          ...period,
          cycles: period.cycles.map((c) => {
            if (c.id !== pid) return c
            const charActions = mergePeriodCharActions(c.charActions, { requested: kinds })
            if (!charActions) {
              const rest = { ...c }
              delete rest.charActions
              return rest
            }
            return { ...c, charActions }
          }),
        },
      }
    })
    set({ root: next })
    schedulePersist(next)
  },

  setPeriodCharActionResponse(characterId, cycleId, response, opts) {
    const acc = get().currentAccountId
    const cid = characterId.trim()
    const pid = cycleId.trim()
    const text = response.trim()
    if (!acc || !cid || !pid || !text) return null
    const now = Date.now()
    const autoCareDateKeyRaw = String(opts?.autoCareDateKey ?? '').trim()
    const autoCareDateKey = /^\d{4}-\d{2}-\d{2}$/.test(autoCareDateKeyRaw)
      ? autoCareDateKeyRaw
      : undefined
    let updated: CouplePeriodCycle | null = null
    const next = patchRoom(get().root, acc, cid, (room) => {
      const period = normalizeCouplePeriodState(room.period)
      return {
        ...room,
        period: {
          ...period,
          cycles: period.cycles.map((c) => {
            if (c.id !== pid) return c
            const charActions = mergePeriodCharActions(c.charActions, {
              requested: c.charActions?.requested?.length
                ? c.charActions.requested
                : ['warm_comment'],
              response: text,
              respondedAt: now,
              ...(autoCareDateKey ? { autoCareDateKey } : {}),
            })
            updated = { ...c, ...(charActions ? { charActions } : {}) }
            return updated
          }),
        },
      }
    })
    if (!updated) return null
    set({ root: next })
    schedulePersist(next)
    return updated
  },

  addMilestone(characterId, input) {
    const acc = get().currentAccountId
    const cid = characterId.trim()
    if (!acc || !cid) return null
    const title = input.title.trim()
    const dateKey = input.dateKey.trim()
    if (!title || !dateKey) return null
    const repeat: CoupleMilestoneRepeat =
      input.repeat === 'yearly' || input.repeat === 'monthly' ? input.repeat : 'none'
    const category: CoupleMilestoneCategory =
      input.category === 'love' || input.category === 'memory' ? input.category : 'life'
    const remindOffsetDays =
      input.remindOffsetDays === 0 ||
      input.remindOffsetDays === 1 ||
      input.remindOffsetDays === 3 ||
      input.remindOffsetDays === 7
        ? input.remindOffsetDays
        : undefined
    const row: CoupleMilestone = {
      id: uidCouple('ms'),
      title,
      dateKey,
      kind: input.kind === 'meet' || input.kind === 'binding' ? input.kind : 'custom',
      createdAt: Date.now(),
      ...(input.pinned === true ? { pinned: true } : {}),
      ...(repeat !== 'none' ? { repeat } : {}),
      ...(category !== 'life' ? { category } : {}),
      ...(remindOffsetDays != null ? { remindOffsetDays } : {}),
      ...milestoneAdvancedFields(dateKey, input),
    }
    const next = patchRoom(get().root, acc, cid, (room) => ({
      ...room,
      milestones: [row, ...room.milestones],
    }))
    set({ root: next })
    schedulePersist(next)
    return row
  },

  updateMilestone(characterId, milestoneId, input) {
    const acc = get().currentAccountId
    const cid = characterId.trim()
    const mid = milestoneId.trim()
    if (!acc || !cid || !mid) return null
    const title = input.title.trim()
    const dateKey = input.dateKey.trim()
    if (!title || !dateKey) return null
    const repeat: CoupleMilestoneRepeat =
      input.repeat === 'yearly' || input.repeat === 'monthly' ? input.repeat : 'none'
    const category: CoupleMilestoneCategory =
      input.category === 'love' || input.category === 'memory' ? input.category : 'life'
    const remindOffsetDays =
      input.remindOffsetDays === 0 ||
      input.remindOffsetDays === 1 ||
      input.remindOffsetDays === 3 ||
      input.remindOffsetDays === 7
        ? input.remindOffsetDays
        : undefined

    let updated: CoupleMilestone | null = null
    const next = patchRoom(get().root, acc, cid, (room) => ({
      ...room,
      milestones: room.milestones.map((m) => {
        if (m.id !== mid) return m
        const row: CoupleMilestone = {
          id: m.id,
          title,
          dateKey,
          kind: m.kind,
          createdAt: m.createdAt,
          ...(input.pinned === true ? { pinned: true } : {}),
          ...(repeat !== 'none' ? { repeat } : {}),
          ...(category !== 'life' ? { category } : {}),
          ...(remindOffsetDays != null ? { remindOffsetDays } : {}),
          ...milestoneAdvancedFields(dateKey, input),
        }
        updated = row
        return row
      }),
    }))
    if (!updated) return null
    set({ root: next })
    schedulePersist(next)
    return updated
  },

  removeMilestone(characterId, milestoneId) {
    const acc = get().currentAccountId
    const cid = characterId.trim()
    const mid = milestoneId.trim()
    if (!acc || !cid || !mid) return
    const next = patchRoom(get().root, acc, cid, (room) => ({
      ...room,
      milestones: room.milestones.filter((m) => m.id !== mid),
    }))
    set({ root: next })
    schedulePersist(next)
  },

  addPeriodCycle(characterId, input) {
    const acc = get().currentAccountId
    const cid = characterId.trim()
    if (!acc || !cid) return null
    const row = buildPeriodCycleRow(uidCouple('pd'), Date.now(), input)
    if (!row) return null
    const next = patchRoom(get().root, acc, cid, (room) => {
      const period = normalizeCouplePeriodState(room.period)
      const cycles = [row, ...period.cycles.filter((c) => c.id !== row.id)].sort((a, b) =>
        b.startDateKey.localeCompare(a.startDateKey),
      )
      return { ...room, period: { ...period, cycles } }
    })
    set({ root: next })
    schedulePersist(next)
    return row
  },

  updatePeriodCycle(characterId, cycleId, input) {
    const acc = get().currentAccountId
    const cid = characterId.trim()
    const id = cycleId.trim()
    if (!acc || !cid || !id) return null
    let updated: CouplePeriodCycle | null = null
    const next = patchRoom(get().root, acc, cid, (room) => {
      const period = normalizeCouplePeriodState(room.period)
      const cycles = period.cycles
        .map((c) => {
          if (c.id !== id) return c
          const row = buildPeriodCycleRow(c.id, c.createdAt, input, {
            charActions: c.charActions,
            days: c.days,
          })
          if (!row) return c
          updated = row
          return row
        })
        .sort((a, b) => b.startDateKey.localeCompare(a.startDateKey))
      return { ...room, period: { ...period, cycles } }
    })
    if (!updated) return null
    set({ root: next })
    schedulePersist(next)
    return updated
  },

  updatePeriodDay(characterId, cycleId, dateKey, patch) {
    const acc = get().currentAccountId
    const cid = characterId.trim()
    const id = cycleId.trim()
    const key = dateKey.trim()
    if (!acc || !cid || !id || !/^\d{4}-\d{2}-\d{2}$/.test(key)) return null
    let updated: CouplePeriodCycle | null = null
    const next = patchRoom(get().root, acc, cid, (room) => {
      const period = normalizeCouplePeriodState(room.period)
      const cycles = period.cycles.map((c) => {
        if (c.id !== id) return c
        const days = upsertPeriodDayEntry(migrateLegacyCycleMetrics(c), key, patch)
        const summary = summarizeCycleMetricsFromDays(days)
        updated = {
          ...c,
          days,
          flow: summary.flow,
          pain: summary.pain,
          mood: summary.mood,
        }
        if (!updated.flow) delete updated.flow
        if (updated.pain == null) delete updated.pain
        if (!updated.mood) delete updated.mood
        if (!days.length) delete updated.days
        return updated
      })
      return { ...room, period: { ...period, cycles } }
    })
    if (!updated) return null
    set({ root: next })
    schedulePersist(next)
    return updated
  },

  removePeriodCycle(characterId, cycleId) {
    const acc = get().currentAccountId
    const cid = characterId.trim()
    const id = cycleId.trim()
    if (!acc || !cid || !id) return
    const next = patchRoom(get().root, acc, cid, (room) => {
      const period = normalizeCouplePeriodState(room.period)
      return {
        ...room,
        period: {
          ...period,
          cycles: period.cycles.filter((c) => c.id !== id),
        },
      }
    })
    set({ root: next })
    schedulePersist(next)
  },

  replacePeriodCycles(characterId, inputs) {
    const acc = get().currentAccountId
    const cid = characterId.trim()
    if (!acc || !cid) return []
    const now = Date.now()
    const cycles = inputs
      .map((input, i) => buildPeriodCycleRow(uidCouple('pd'), now - i, input))
      .filter((c): c is CouplePeriodCycle => !!c)
      .sort((a, b) => b.startDateKey.localeCompare(a.startDateKey))
    const next = patchRoom(get().root, acc, cid, (room) => {
      const period = normalizeCouplePeriodState(room.period)
      return { ...room, period: { ...period, cycles } }
    })
    set({ root: next })
    schedulePersist(next)
    return cycles
  },

  updatePeriodSettings(characterId, patch) {
    const acc = get().currentAccountId
    const cid = characterId.trim()
    if (!acc || !cid) return null
    let settings: CouplePeriodSettings | null = null
    const next = patchRoom(get().root, acc, cid, (room) => {
      const period = normalizeCouplePeriodState(room.period)
      settings = normalizeCouplePeriodSettings({
        ...period.settings,
        ...patch,
        ...(patch.remindBeforeDays === null ? { remindBeforeDays: undefined } : {}),
        ...(patch.autoCare === false
          ? { autoCare: undefined, autoCareTimeKey: undefined }
          : {}),
        ...(patch.autoCareTimeKey === null ? { autoCareTimeKey: undefined } : {}),
      })
      return { ...room, period: { ...period, settings } }
    })
    if (!settings) return null
    set({ root: next })
    schedulePersist(next)
    return settings
  },

  setPeriodStartMarked(characterId, dateKey, marked) {
    const acc = get().currentAccountId
    const cid = characterId.trim()
    const key = dateKey.trim()
    if (!acc || !cid || !/^\d{4}-\d{2}-\d{2}$/.test(key)) return
    const next = patchRoom(get().root, acc, cid, (room) => {
      const period = normalizeCouplePeriodState(room.period)
      const cycles = setPeriodStartOnCycles(period.cycles, key, marked)
        .map((c) => normalizeCouplePeriodCycle(c))
        .filter((c): c is CouplePeriodCycle => !!c)
      return { ...room, period: { ...period, cycles } }
    })
    set({ root: next })
    schedulePersist(next)
  },

  setPeriodEndMarked(characterId, dateKey, marked) {
    const acc = get().currentAccountId
    const cid = characterId.trim()
    const key = dateKey.trim()
    if (!acc || !cid || !/^\d{4}-\d{2}-\d{2}$/.test(key)) return
    const next = patchRoom(get().root, acc, cid, (room) => {
      const period = normalizeCouplePeriodState(room.period)
      const cycles = setPeriodEndOnCycles(period.cycles, key, marked)
        .map((c) => normalizeCouplePeriodCycle(c))
        .filter((c): c is CouplePeriodCycle => !!c)
      return { ...room, period: { ...period, cycles } }
    })
    set({ root: next })
    schedulePersist(next)
  },
}))

/** 供非 React 注入路径读取（查询层）；须已 bindAccount */
export function readCoupleSpaceRoomSnapshot(
  accountId: string | null | undefined,
  characterId: string,
): CoupleSpaceRoom | null {
  const acc = accountId?.trim()
  const cid = characterId.trim()
  if (!acc || !cid) return null
  const state = useCoupleSpaceStore.getState()
  if (state.currentAccountId === acc && state.hydrated) {
    return state.root.byAccount[acc]?.rooms[cid] ?? null
  }
  return null
}
