/**
 * 普通剧情页 · 业务动作面（无布局 UI）。
 * 从 0 重建布局时，在 DatingStoryPage 内挂载 `normalActions` 即可复接全部能力。
 */
import type { RefObject } from 'react'
import type { DatingLanguageSettingsValue } from './DatingLanguageSettingsPanel'
import type { DatingPlotFontSettings } from './datingPlotFontSettings'
import type { DatingPlotPaceSettings } from './datingPlotPace'
import type { DatingStoryAppearance } from './datingStoryAppearance'
import type { DatingStyleTuning } from './styleTuningStorage'
import type { DualNarrativeStoryFields } from '../memory/dualNarrativeTime'
import type {
  BranchOption,
  CharacterArchive,
  CharacterInfo,
  NarrativeGenOptions,
  NarrativePerspective,
  PlotDimensionKind,
  PlotItem,
} from './types'

export type DatingStoryNormalActions = {
  onBackToSelect: () => void

  input: string
  setInput: (v: string) => void
  inputRef: RefObject<HTMLTextAreaElement | null>
  composerRef: RefObject<HTMLDivElement | null>
  /** 剧情列表滚动容器（键盘顶起 / 滚到底部） */
  feedScrollRef: RefObject<HTMLDivElement | null>
  loading: boolean
  placeholder: string
  onSend: () => Promise<void>
  onInputKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
  onInputFocus: () => void
  insertQuotePair: (open: string, close: string) => void

  openContinueProbe: (target: 'normal' | 'vn') => void
  handleBranchPick: (x: BranchOption) => Promise<void>
  openRetryBiasPanel: (plotId: string) => void
  jumpToPlot: (plotId: string) => void

  perspective: NarrativePerspective
  setPerspective: (v: NarrativePerspective) => void
  narrativeGenOptions: NarrativeGenOptions

  lengthTargetChars: string
  setLengthTargetChars: (v: string) => void
  /** 传入刚改的字数可立即落盘；无参则用当前 lengthTargetChars（失焦场景） */
  blurPersistLengthTarget: (override?: string | number) => void
  plotPace: DatingPlotPaceSettings

  toggleThinkingChain: () => void
  thinkingChainEnabled: boolean
  godLocksNoInterrupt: boolean
  autoUserReaction: boolean

  composerCollapsed: boolean
  persistComposerCollapsed: (collapsed: boolean) => void
  /** 软键盘抬升输入栏的位移（px） */
  keyboardInsetPx: number
  /** 列表底部为键盘预留的额外留白（px） */
  keyboardPadPx: number
  /**
   * iOS 键盘顶起时 visualViewport.offsetTop：
   * 用于把顶栏钉在可视区域顶部，避免整页上推把标题栏顶出屏幕。
   */
  viewportOffsetTop: number

  plotTailVisible: number
  persistPlotTail: (n: number) => void
  floorsMax: number

  currentCharacter: CharacterInfo
  currentArchive: CharacterArchive
  plots: PlotItem[]
  displayAvatarUrl: string
  regeneratingPlotId: string | null
  branchesLoading: boolean

  languageSettingsValue: DatingLanguageSettingsValue
  plotFontSettings: DatingPlotFontSettings
  plotFontDataUrls: Record<string, string>
  storyAppearance: DatingStoryAppearance

  setGodPerspective: (v: boolean) => void
  setDirectorMode: (v: boolean) => void
  setMainCharacterOffstage: (v: boolean) => void
  setGenerateParallelOnSend: (v: boolean) => void
  setGenerateIfLineOnSend: (v: boolean) => void
  setCommentModeEnabled: (v: boolean) => void
  setPlotArtifactVisualEnabled: (v: boolean) => void
  setPlotArtifactVisualPresetId: (id: string) => void
  setAutoUserReaction: (v: boolean) => void
  setPlotPaceSettings: (partial: Partial<DatingPlotPaceSettings>) => void
  patchDatingLanguageSettings: (partial: Partial<DatingLanguageSettingsValue>) => void
  patchDatingPlotFontSettings: (next: DatingPlotFontSettings) => void
  setPlotFontDataUrls: (next: Record<string, string>) => void
  patchStoryAppearance: (next: Partial<DatingStoryAppearance>) => void
  patchPlotImageSettings: (patch: {
    plotImageGenEnabled?: boolean
    plotImageCountMin?: number
    plotImageCountMax?: number
  }) => void

  setMenuOpen: (v: boolean | ((prev: boolean) => boolean)) => void
  setEditOpen: (v: boolean) => void
  setSwitchOpen: (v: boolean | ((prev: boolean) => boolean)) => void
  setResetArchiveConfirmOpen: (v: boolean) => void
  setMode: (mode: 'normal' | 'vn') => void
  setBranchEnabled: (v: boolean) => void
  setOfflineDanmakuEnabled: (v: boolean) => void
  setCurrentCharacterId: (id: string) => void
  characters: CharacterInfo[]

  setHeartWhisperOpen: (v: boolean) => void
  setArchiveWbSheetOpen: (v: boolean) => void
  setWritingPresetsSheetOpen: (v: boolean) => void
  setStyleDrawerOpen: (v: boolean) => void
  setStyleTuning: (v: DatingStyleTuning) => void
  setPlotImageSettingsOpen: (v: boolean) => void
  setDirectorModeHelpOpen: (v: boolean) => void

  updatePlotItem: (id: string, patch: Partial<PlotItem>) => void
  updatePlotStoryTime: (
    plotId: string,
    fields: DualNarrativeStoryFields,
  ) => Promise<{ ok: true } | { ok: false; reason: string }>
  generatePlotDimension: (
    plotId: string,
    kind: PlotDimensionKind,
    writingGuide: string,
    lengthTargetChars: number,
    perspective?: NarrativePerspective,
  ) => Promise<void>
  setPlotVersionIndex: (plotId: string, index: number) => void
  deletePlotItem: (plotId: string) => void
  saveEditedPlotBody: (
    plotId: string,
    draftBody: string,
  ) => Promise<{ ok: true } | { ok: false; reason: string }>
  regenerateAiPlot: (
    plotId: string,
    perspective?: NarrativePerspective,
    genOptions?: NarrativeGenOptions,
    bias?: string,
  ) => Promise<void>

  plotImageGenEnabled: boolean
  imageGenConfigured: boolean
  plotImageCountNode: React.ReactNode
}
