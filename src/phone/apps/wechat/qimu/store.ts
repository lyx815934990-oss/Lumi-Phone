import { create } from 'zustand'
import {
  buildInitialActorStatuses,
  refreshActorStatusesOnAdvance,
  resolveQuestLocations,
} from './locations'
import { cloneQuest, CURTAIN_QUEST_PRESETS } from './presets'
import type {
  CurtainCastAssignment,
  CurtainChannel,
  CurtainDiveState,
  CurtainFoldPoint,
  CurtainMessage,
  CurtainPartner,
  CurtainQuest,
  CurtainView,
} from './types'
import { applyCastToQuestRoles, resolveNpcSlots } from './types'

function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

function narrate(content: string): CurtainMessage {
  return {
    id: uid('nar'),
    role: 'system',
    content,
    channel: 'stage',
    isMeta: false,
    tone: 'narration',
    createdAt: Date.now(),
  }
}

/** 入幕高亮教程步骤（逐条点按前进） */
export const CURTAIN_TUTORIAL_STEPS = [
  '顶部是幕令环：余日/余轮与主线进度。点「落幕」可随时退出本笺。',
  '主界面一次只显示一条 VN 对话框。点击对话框或场景可继续下一句。',
  '「幕前」用戏中身份说话；切到「幕间」摘下戏服耳语，NPC 冻结听不见。',
  '功能栏可推进时间、前往地点、选择结伴、查看角色状态；「历史」打开 LOG 回顾全部台词。',
  '输入换行会拆成多句，需逐句点进；主线折点按日程弹出。幕令是软锚，勿忘终点。',
] as const

/** 开篇故事 → 写入全屏前提面板的正文（不含 file/theme 标题行） */
export function buildPrologueBody(
  quest: CurtainQuest,
  assignment?: CurtainCastAssignment,
): string {
  const npcTitles = resolveNpcSlots(quest, assignment).map((s) => s.title)
  const span =
    quest.timeLimit >= 40
      ? `日程约 ${quest.timeLimit} 日——一轮约等于一日。`
      : `本笺软倒计时 ${quest.timeLimit} 轮。`

  const story = (quest.prologue ?? quest.synopsis)?.trim() ?? ''
  const extras = [
    `你是「${quest.roles.userRole}」。同行者是「${quest.roles.charRole}」。`,
    npcTitles.length > 0 ? `未入选席位已化为场上 NPC：${npcTitles.join('、')}。` : '',
    span,
    `幕令：${quest.mainGoal}`,
  ]

  return [story, ...extras.map((s) => s.trim()).filter(Boolean)].filter(Boolean).join('\n\n')
}

type CurtainStore = {
  view: CurtainView
  selectedQuest: CurtainQuest | null
  dive: CurtainDiveState | null
  sending: boolean
  lastError: string | null

  setView: (view: CurtainView) => void
  selectQuest: (quest: CurtainQuest) => void
  clearSelection: () => void
  setSending: (v: boolean) => void
  setLastError: (msg: string | null) => void

  startDive: (params: {
    partner: CurtainPartner
    personaBrief: string
    castAssignment?: CurtainCastAssignment
  }) => void
  abortDive: () => void
  setChannel: (channel: CurtainChannel) => void
  appendMessage: (msg: Omit<CurtainMessage, 'id' | 'createdAt'> & { id?: string }) => void
  bumpProgress: (delta: number) => void
  nextTurn: () => void
  maybeSpawnFoldPoint: () => void
  resolveFoldPoint: (choiceId: string) => void
  clearFoldPoint: () => void
  advanceTutorial: () => void
  skipTutorial: () => void
  dismissPrologue: () => void
  advanceTime: () => void
  goToLocation: (locationId: string) => void
  setCompanions: (slotIds: string[]) => void
}

const FOLD_TRIGGERS = new Set([4, 9, 14, 19])

export const useCurtainStore = create<CurtainStore>((set, get) => ({
  view: 'lobby',
  selectedQuest: null,
  dive: null,
  sending: false,
  lastError: null,

  setView: (view) => set({ view }),
  selectQuest: (quest) => set({ selectedQuest: cloneQuest(quest), view: 'invite' }),
  clearSelection: () => set({ selectedQuest: null, view: 'lobby' }),
  setSending: (sending) => set({ sending }),
  setLastError: (lastError) => set({ lastError }),

  startDive: ({ partner, personaBrief, castAssignment }) => {
    const raw = get().selectedQuest
    if (!raw) return
    const quest = castAssignment
      ? applyCastToQuestRoles(cloneQuest(raw), castAssignment)
      : cloneQuest(raw)
    const locations = resolveQuestLocations(quest)
    const prologueBody = buildPrologueBody(quest, castAssignment)
    const partnerSlotId = castAssignment?.partnerSlotId
    set({
      view: 'stage',
      dive: {
        isActive: true,
        partnerId: partner.characterId,
        partnerName: partner.displayName,
        partnerAvatarUrl: partner.avatarUrl,
        partnerPersonaBrief: personaBrief,
        quest,
        castAssignment,
        currentTurn: 0,
        mainStoryProgress: 0,
        channel: 'stage',
        messages: [],
        activeFoldPoint: null,
        tutorialSteps: [...CURTAIN_TUTORIAL_STEPS],
        tutorialStepIndex: 0,
        prologueOpen: true,
        prologueBody,
        currentLocationId: locations[0]?.id ?? null,
        companionSlotIds: partnerSlotId ? [partnerSlotId] : [],
        actorStatuses: buildInitialActorStatuses(quest, castAssignment, locations),
        startedAt: Date.now(),
      },
      lastError: null,
    })
  },

  abortDive: () =>
    set({
      dive: null,
      selectedQuest: null,
      view: 'lobby',
      sending: false,
      lastError: null,
    }),

  setChannel: (channel) => {
    const dive = get().dive
    if (!dive) return
    set({ dive: { ...dive, channel } })
  },

  appendMessage: (partial) => {
    const dive = get().dive
    if (!dive) return
    const msg: CurtainMessage = {
      id: partial.id ?? uid('msg'),
      role: partial.role,
      content: partial.content,
      channel: partial.channel,
      isMeta: partial.isMeta,
      tone: partial.tone,
      createdAt: Date.now(),
    }
    set({ dive: { ...dive, messages: [...dive.messages, msg] } })
  },

  bumpProgress: (delta) => {
    const dive = get().dive
    if (!dive) return
    const next = Math.max(0, Math.min(100, dive.mainStoryProgress + delta))
    set({ dive: { ...dive, mainStoryProgress: next } })
  },

  nextTurn: () => {
    const dive = get().dive
    if (!dive) return
    set({ dive: { ...dive, currentTurn: dive.currentTurn + 1 } })
  },

  maybeSpawnFoldPoint: () => {
    const dive = get().dive
    if (!dive || dive.activeFoldPoint) return
    if (dive.prologueOpen || dive.tutorialSteps.length > 0) return
    const pool = dive.quest.foldPoints ?? []
    if (!pool.length) return

    const scheduled = pool.filter((fp) => typeof fp.triggerAt === 'number')
    let point: CurtainFoldPoint | undefined
    if (scheduled.length > 0) {
      point = scheduled.find((fp) => fp.triggerAt === dive.currentTurn)
    } else {
      if (!FOLD_TRIGGERS.has(dive.currentTurn)) return
      const idx = Math.min(pool.length - 1, Math.floor(dive.currentTurn / 5) % pool.length)
      point = pool[idx]
    }
    if (!point) return
    set({
      dive: {
        ...dive,
        activeFoldPoint: { ...point, choices: point.choices.map((c) => ({ ...c })) },
      },
    })
  },

  resolveFoldPoint: (choiceId) => {
    const dive = get().dive
    if (!dive?.activeFoldPoint) return
    const choice = dive.activeFoldPoint.choices.find((c) => c.id === choiceId)
    const delta = choice?.progressDelta ?? 8
    const label = choice?.label ?? '已抉择'
    set({
      dive: {
        ...dive,
        activeFoldPoint: null,
        mainStoryProgress: Math.max(0, Math.min(100, dive.mainStoryProgress + delta)),
        messages: [...dive.messages, narrate(`折点已落定：${label}。幕线随之偏移。`)],
      },
    })
  },

  clearFoldPoint: () => {
    const dive = get().dive
    if (!dive) return
    set({ dive: { ...dive, activeFoldPoint: null } })
  },

  advanceTutorial: () => {
    const dive = get().dive
    if (!dive || dive.tutorialSteps.length === 0) return
    const next = dive.tutorialStepIndex + 1
    if (next >= dive.tutorialSteps.length) {
      set({
        dive: {
          ...dive,
          tutorialSteps: [],
          tutorialStepIndex: 0,
          messages: [...dive.messages, narrate('准备好了。从幕前说出第一句话吧。')],
        },
      })
      return
    }
    set({ dive: { ...dive, tutorialStepIndex: next } })
  },

  skipTutorial: () => {
    const dive = get().dive
    if (!dive) return
    set({
      dive: {
        ...dive,
        tutorialSteps: [],
        tutorialStepIndex: 0,
        messages: [...dive.messages, narrate('准备好了。从幕前说出第一句话吧。')],
      },
    })
  },

  dismissPrologue: () => {
    const dive = get().dive
    if (!dive || !dive.prologueOpen) return
    set({
      dive: {
        ...dive,
        prologueOpen: false,
        messages: [...dive.messages, narrate('幕已拉开。')],
      },
    })
  },

  advanceTime: () => {
    const dive = get().dive
    if (!dive || dive.prologueOpen || dive.tutorialSteps.length > 0 || dive.activeFoldPoint) return
    if (dive.currentTurn >= dive.quest.timeLimit) {
      set({
        dive: {
          ...dive,
          messages: [...dive.messages, narrate('日程已近尾声，无法再推进时间。')],
        },
      })
      return
    }
    const nextTurn = dive.currentTurn + 1
    const locations = resolveQuestLocations(dive.quest)
    const unit = dive.quest.timeLimit >= 40 ? `第 ${nextTurn} 日` : `第 ${nextTurn} 轮`
    const refreshed = refreshActorStatusesOnAdvance(dive.actorStatuses, locations, nextTurn)
    const locName =
      locations.find((l) => l.id === dive.currentLocationId)?.name ?? refreshed[0]?.whereabouts
    const actorStatuses = refreshed.map((a) =>
      a.kind === 'partner' && dive.companionSlotIds.includes(a.slotId) && locName
        ? { ...a, whereabouts: locName, status: '与你结伴同行' }
        : a,
    )

    set({
      dive: {
        ...dive,
        currentTurn: nextTurn,
        actorStatuses,
        messages: [...dive.messages, narrate(`时间推进——${unit}。光影与行踪随之挪移。`)],
      },
    })
    queueMicrotask(() => get().maybeSpawnFoldPoint())
  },

  goToLocation: (locationId) => {
    const dive = get().dive
    if (!dive || dive.prologueOpen || dive.tutorialSteps.length > 0) return
    const locations = resolveQuestLocations(dive.quest)
    const target = locations.find((l) => l.id === locationId)
    if (!target) return
    if (dive.currentLocationId === locationId) {
      set({
        dive: {
          ...dive,
          messages: [...dive.messages, narrate(`仍在「${target.name}」。`)],
        },
      })
      return
    }
    const companionNames = dive.companionSlotIds
      .map((id) => dive.actorStatuses.find((a) => a.slotId === id)?.title)
      .filter(Boolean)
    const withPart =
      companionNames.length > 0 ? `与 ${companionNames.join('、')} 一道，` : '独自'
    const actorStatuses = dive.actorStatuses.map((a) =>
      dive.companionSlotIds.includes(a.slotId)
        ? { ...a, whereabouts: target.name, status: '与你同往此处' }
        : a,
    )
    set({
      dive: {
        ...dive,
        currentLocationId: locationId,
        actorStatuses,
        messages: [
          ...dive.messages,
          narrate(`${withPart}前往「${target.name}」。${target.brief ? target.brief : ''}`.trim()),
        ],
      },
    })
  },

  setCompanions: (slotIds) => {
    const dive = get().dive
    if (!dive || dive.prologueOpen || dive.tutorialSteps.length > 0) return
    const valid = new Set(dive.actorStatuses.map((a) => a.slotId))
    const next = slotIds.filter((id) => valid.has(id))
    const names = next
      .map((id) => dive.actorStatuses.find((a) => a.slotId === id)?.title)
      .filter(Boolean) as string[]
    const locName = resolveQuestLocations(dive.quest).find(
      (l) => l.id === dive.currentLocationId,
    )?.name
    const actorStatuses = dive.actorStatuses.map((a) => {
      if (next.includes(a.slotId)) {
        return {
          ...a,
          status: '与你结伴',
          whereabouts: locName ?? a.whereabouts,
        }
      }
      if (dive.companionSlotIds.includes(a.slotId) && !next.includes(a.slotId)) {
        return { ...a, status: '已分开行动' }
      }
      return a
    })
    set({
      dive: {
        ...dive,
        companionSlotIds: next,
        actorStatuses,
        messages: [
          ...dive.messages,
          narrate(names.length > 0 ? `结伴变更为：${names.join('、')}。` : '你选择独自行动。'),
        ],
      },
    })
  },
}))

export function listCurtainPresets(): CurtainQuest[] {
  return CURTAIN_QUEST_PRESETS
}

export type { CurtainFoldPoint }
