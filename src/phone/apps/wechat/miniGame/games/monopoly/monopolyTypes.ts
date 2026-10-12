/** Lumi 大富翁 · 核心类型 */

export type MonopolyPlayerId = 'player' | 'char'

export type MonopolyTileKind =
  | 'go'
  | 'property'
  | 'item'
  | 'event'
  | 'jail'
  | 'parking'
  | 'goto_jail'
  | 'tax'
  /** 主路入口：落到此处进入支线功能区 */
  | 'gate'
  /** 支线出口（通常立刻接回主路，不单独停留） */
  | 'branch_exit'

export type MonopolyTileShape = 'rect' | 'round' | 'diamond' | 'capsule' | 'hex'

export type MonopolyZone = 'main' | 'memory' | 'life_path' | 'func_yard'

export type MonopolyColorGroup =
  | 'campus'
  | 'arts'
  | 'daily'
  | 'date'
  | 'life'
  | 'memory'
  | 'work'
  | 'special'

export type MonopolyItemId =
  | 'rent_free'
  | 'double_rent'
  | 'teleport'
  | 'freeze'
  | 'shield'
  | 'swap'

export type MonopolyTileDef = {
  id: number
  name: string
  kind: MonopolyTileKind
  /** 沿路径的下一格 id */
  nextId: number
  /** 布局：棋盘百分比坐标（中心点） */
  x: number
  y: number
  zone: MonopolyZone
  shape?: MonopolyTileShape
  /** 落地短台词 */
  flavor?: string
  colorGroup?: MonopolyColorGroup
  price?: number
  rentBase?: number
  rentHouse?: number[]
  houseCost?: number
  /** gate：进入支线的第一格 */
  branchEntryId?: number
}

export type MonopolyPropertyState = {
  owner: MonopolyPlayerId | null
  houses: number
  mortgaged: boolean
  shieldedUntilTurn: number
}

export type MonopolyPlayerState = {
  id: MonopolyPlayerId
  cash: number
  position: number
  items: MonopolyItemId[]
  jailed: boolean
  jailTurns: number
  bankrupt: boolean
}

export type MonopolyPhase =
  | 'idle'
  | 'rolling'
  | 'moving'
  | 'tile_resolve'
  | 'await_buy'
  | 'await_item'
  | 'await_branch'
  | 'ai_thinking'
  | 'game_over'

export type MonopolyPendingBuy = {
  tileId: number
  price: number
  forPlayer: MonopolyPlayerId
}

export type MonopolyPendingRent = {
  from: MonopolyPlayerId
  to: MonopolyPlayerId
  amount: number
  tileId: number
  canUseRentFree: boolean
}

export type MonopolyPendingBranch = {
  forPlayer: MonopolyPlayerId
  gateId: number
  entryId: number
  zoneLabel: string
}

export type MonopolyGameState = {
  tiles: MonopolyTileDef[]
  properties: Record<number, MonopolyPropertyState>
  players: Record<MonopolyPlayerId, MonopolyPlayerState>
  turn: MonopolyPlayerId
  turnIndex: number
  phase: MonopolyPhase
  lastDice: [number, number] | null
  pendingBuy: MonopolyPendingBuy | null
  pendingRent: MonopolyPendingRent | null
  pendingBranch: MonopolyPendingBranch | null
  doubleRentArmedBy: MonopolyPlayerId | null
  freezeNext: MonopolyPlayerId | null
  lastFreezeTarget: MonopolyPlayerId | null
  winner: MonopolyPlayerId | null
  winReason: 'bankrupt' | 'turn_cap' | null
  logLine: string | null
  animToken: number
  lastEvent: { text: string; cashDelta: number; forPlayer: MonopolyPlayerId } | null
  lastItemGot: { item: MonopolyItemId; forPlayer: MonopolyPlayerId } | null
}

export type MonopolyAiAction =
  | { type: 'buy'; buy: boolean }
  | { type: 'use_item'; item: MonopolyItemId; targetTileId?: number }
  | { type: 'build'; tileId: number }
  | { type: 'pass' }
  | { type: 'pay_rent'; useRentFree: boolean }
  | { type: 'enter_branch'; enter: boolean }

export const MONOPOLY_INITIAL_CASH = 12_000
export const MONOPOLY_GO_SALARY = 2_000
export const MONOPOLY_MAX_TURNS = 60
export const MONOPOLY_AI_CASH_BUY_THRESHOLD = 3_500
export const MONOPOLY_AI_RANDOMNESS = 0.18

export const COLOR_GROUP_LABEL: Record<MonopolyColorGroup, string> = {
  campus: '校园',
  arts: '文艺',
  daily: '日常',
  date: '约会',
  life: '生活',
  memory: '回忆',
  work: '职场',
  special: '特殊',
}

export const COLOR_GROUP_HEX: Record<MonopolyColorGroup, string> = {
  campus: '#8B6914',
  arts: '#93C5FD',
  daily: '#F9A8D4',
  date: '#FB923C',
  life: '#F87171',
  memory: '#FACC15',
  work: '#4ADE80',
  special: '#1E3A5F',
}

export const ZONE_LABEL: Record<MonopolyZone, string> = {
  main: '主环',
  memory: '记忆回廊',
  life_path: '生活小径',
  func_yard: '功能庭院',
}

export const ITEM_LABEL: Record<MonopolyItemId, string> = {
  rent_free: '免租卡',
  double_rent: '双倍租金卡',
  teleport: '传送卡',
  freeze: '冻结卡',
  shield: '地产保护罩',
  swap: '偷天换日卡',
}

export const ITEM_DESC: Record<MonopolyItemId, string> = {
  rent_free: '拒绝支付一次租金',
  double_rent: '下一笔你收的租金翻倍',
  teleport: '传送到你已拥有的任意地产',
  freeze: '让对手下一回合停走一回合',
  shield: '本回合保护一块地产免强制拍卖',
  swap: '与对手交换一块地产（稀有）',
}
