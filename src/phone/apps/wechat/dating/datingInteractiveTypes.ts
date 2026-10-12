/** 线下约会 · 互动模式：慢节奏多气泡动描对戏（拍写入 plots，与普通剧情同页可见） */

export type InteractiveBubbleKind = 'action' | 'dialogue' | 'thought'

export type InteractiveBubble = {
  id: string
  kind: InteractiveBubbleKind
  text: string
}

export type InteractiveTurn = {
  id: string
  role: 'user' | 'char'
  /** 用户原始输入（含引号 / **）或角色气泡列表 */
  rawText?: string
  bubbles: InteractiveBubble[]
  createdAt: number
  /** 已同步到剧情页的 PlotItem.id；收束后普通页仍以互动气泡样式展示 */
  plotId?: string
  /** 同用户输入下的重骰版本（仅 char 轮） */
  versions?: InteractiveBubble[][]
  currentVersionIndex?: number
}

export type DatingInteractiveSession = {
  id: string
  characterId: string
  characterName: string
  startedAt: number
  turns: InteractiveTurn[]
}

/** 每轮角色侧气泡「至少」条数（可多于该值） */
export const INTERACTIVE_MIN_BUBBLES_DEFAULT = 4
export const INTERACTIVE_MIN_BUBBLES_MIN = 2
export const INTERACTIVE_MIN_BUBBLES_MAX = 10

export function clampInteractiveMinBubbles(n: unknown): number {
  const v = typeof n === 'number' ? n : Number(n)
  if (!Number.isFinite(v)) return INTERACTIVE_MIN_BUBBLES_DEFAULT
  return Math.max(
    INTERACTIVE_MIN_BUBBLES_MIN,
    Math.min(INTERACTIVE_MIN_BUBBLES_MAX, Math.round(v)),
  )
}
