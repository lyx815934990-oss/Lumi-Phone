import { create } from 'zustand'
import type { DirectorActionId, StoryNode, StoryRpgSettings } from '../types'
import { DEFAULT_STORY_RPG_SETTINGS } from '../types'

type StoryRpgState = {
  characterName: string
  characterAvatarUrl: string
  floor: number
  worldBookLabel: string
  nodes: StoryNode[]
  settings: StoryRpgSettings
  activeDirectorAction: DirectorActionId | null
  composerText: string
  advancedSheetOpen: boolean
  headerCompact: boolean
  commentsExpandedId: string | null

  setCharacter: (name: string, avatarUrl?: string) => void
  setFloor: (floor: number) => void
  setWorldBookLabel: (label: string) => void
  setNodes: (nodes: StoryNode[]) => void
  appendNode: (node: StoryNode) => void
  updateNodeTimeLabel: (id: string, label: string) => void
  patchSettings: (patch: Partial<StoryRpgSettings>) => void
  setActiveDirectorAction: (id: DirectorActionId | null) => void
  toggleDirectorAction: (id: DirectorActionId) => void
  setComposerText: (text: string) => void
  setAdvancedSheetOpen: (open: boolean) => void
  setHeaderCompact: (compact: boolean) => void
  setCommentsExpandedId: (id: string | null) => void
  resetProgress: () => void
}

export const useStoryRpgStore = create<StoryRpgState>((set, get) => ({
  characterName: '纪旌',
  characterAvatarUrl: '',
  floor: 42,
  worldBookLabel: '默认世界书',
  nodes: [],
  settings: { ...DEFAULT_STORY_RPG_SETTINGS },
  activeDirectorAction: null,
  composerText: '',
  advancedSheetOpen: false,
  headerCompact: false,
  commentsExpandedId: null,

  setCharacter: (name, avatarUrl = '') =>
    set({ characterName: name, characterAvatarUrl: avatarUrl }),
  setFloor: (floor) => set({ floor }),
  setWorldBookLabel: (label) => set({ worldBookLabel: label }),
  setNodes: (nodes) => set({ nodes }),
  appendNode: (node) => set({ nodes: [...get().nodes, node] }),
  updateNodeTimeLabel: (id, label) =>
    set({
      nodes: get().nodes.map((n) => (n.id === id ? { ...n, storyTimeLabel: label } : n)),
    }),
  patchSettings: (patch) => set({ settings: { ...get().settings, ...patch } }),
  setActiveDirectorAction: (id) => set({ activeDirectorAction: id }),
  toggleDirectorAction: (id) =>
    set({ activeDirectorAction: get().activeDirectorAction === id ? null : id }),
  setComposerText: (text) => set({ composerText: text }),
  setAdvancedSheetOpen: (open) => set({ advancedSheetOpen: open }),
  setHeaderCompact: (compact) => set({ headerCompact: compact }),
  setCommentsExpandedId: (id) => set({ commentsExpandedId: id }),
  resetProgress: () => set({ nodes: [], floor: 1, commentsExpandedId: null }),
}))
