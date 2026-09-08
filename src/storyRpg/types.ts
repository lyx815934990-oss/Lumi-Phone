/** H5 AI 剧情互动 · 核心数据模型 */

export type StoryDisplayMode = 'normal' | 'vn'

export type NarrativePerspective = 'first' | 'second' | 'third'

export type DirectorActionId =
  | 'god'
  | 'director'
  | 'side'
  | 'parallel'
  | 'if-line'
  | 'continue'
  | 'npc'

export type DirectorAction = {
  id: DirectorActionId
  label: string
  description?: string
}

export type StoryImage = {
  id: string
  url: string
  alt?: string
  caption?: string
}

export type StoryComment = {
  id: string
  nick: string
  avatarHue: number
  text: string
  likes: number
  /** 针对高光瞬间的评论 */
  highlight?: boolean
  /** 对应第几个讨论位（从 0 起） */
  slot?: number
}

export type StoryHtmlVisual = {
  title: string
  html: string
  emoji?: string
}

export type StoryNodeKind = 'player' | 'ai'

export type StoryNode = {
  id: string
  kind: StoryNodeKind
  /** Markdown 正文 */
  content: string
  /** 剧情时间胶囊文案，如 "19:30 PM, 雨" */
  storyTimeLabel: string
  /** 本段摘要大标题（与记忆管理页线下摘要 rowTitle 同源） */
  summary?: string
  /** 完整摘要正文（折叠展开；与记忆管理页展开区同源） */
  summaryBody?: string
  /** 是否已有平行事件正文 */
  hasParallelEvent?: boolean
  /** 是否已有 IF 线正文 */
  hasIfLine?: boolean
  /** 是否为高光节点 */
  isHighlight?: boolean
  /** Lumi / CoT 思维链原文 */
  chainOfThought?: string
  images?: StoryImage[]
  comments?: StoryComment[]
  /** 剧情相关 HTML 可视化（折叠预览） */
  htmlVisual?: StoryHtmlVisual
  /** AI 多版本：版本总数（≥2 时可切换回退） */
  versionCount?: number
  /** AI 多版本：当前展示下标（0-based） */
  currentVersionIndex?: number
  createdAt: number
  /** 玩家输入条：当轮生效场控标签 */
  activeControlTags?: Array<{ id: string; label: string }>
}

export type DanmakuBullet = {
  id: string
  text: string
  top: number
  durationSec: number
  hue: number
  /** 优先于 hue 的具体颜色（rgba / hex） */
  color?: string
  /** 开场延迟秒 */
  startDelaySec?: number
}

export type StoryRpgSettings = {
  mode: StoryDisplayMode
  danmakuEnabled: boolean
  thinkingChainEnabled: boolean
  autoUserReaction: boolean
  commentModeEnabled: boolean
  /** 小剧场：HTML 剧情可视化 */
  plotArtifactVisualEnabled: boolean
  /** 小剧场类型：random 或预设 id */
  plotArtifactVisualPresetId: string
  perspective: NarrativePerspective
  lengthTargetChars: number
  heartWhisperMode: boolean
  translateEnabled: boolean
  outputLanguage: string
}

export type StoryRpgSession = {
  characterId: string
  characterName: string
  characterAvatarUrl?: string
  floor: number
  worldBookLabel?: string
  nodes: StoryNode[]
  settings: StoryRpgSettings
}

export const DIRECTOR_ACTIONS: DirectorAction[] = [
  { id: 'god', label: '上帝视角', description: '屏外旁白，主角色不可同场' },
  { id: 'director', label: '导演模式', description: '输入为下一段演出指引' },
  { id: 'side', label: '侧面叙写', description: '主角色不在场的侧幕' },
  { id: 'parallel', label: '平行事件', description: '同刻异场景切片' },
  { id: 'if-line', label: 'IF线', description: '从锚点分歧的假设分支' },
  { id: 'continue', label: '续写方向', description: '指定剧情推进走向' },
  { id: 'npc', label: '人脉NPC插入', description: '@ 指定人脉角色出场' },
]

export const DEFAULT_STORY_RPG_SETTINGS: StoryRpgSettings = {
  mode: 'normal',
  danmakuEnabled: false,
  thinkingChainEnabled: true,
  autoUserReaction: false,
  commentModeEnabled: true,
  /** 小剧场：HTML 剧情可视化 */
  plotArtifactVisualEnabled: true,
  plotArtifactVisualPresetId: 'random',
  perspective: 'second',
  lengthTargetChars: 500,
  heartWhisperMode: false,
  translateEnabled: false,
  outputLanguage: 'zh-CN',
}
