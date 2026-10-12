import { JAIL_TILE_ID, MONOPOLY_BOARD, pathPassedGo, tilesInColorGroup, walkPath, zoneLabelForGate } from './boardData'
import type {
  MonopolyColorGroup,
  MonopolyGameState,
  MonopolyItemId,
  MonopolyPlayerId,
  MonopolyPropertyState,
  MonopolyTileDef,
} from './monopolyTypes'
import {
  MONOPOLY_GO_SALARY,
  MONOPOLY_INITIAL_CASH,
  MONOPOLY_MAX_TURNS,
  ITEM_LABEL,
} from './monopolyTypes'

const ITEM_DROP_WEIGHTS: Array<{ id: MonopolyItemId; w: number }> = [
  { id: 'rent_free', w: 28 },
  { id: 'double_rent', w: 22 },
  { id: 'teleport', w: 18 },
  { id: 'freeze', w: 16 },
  { id: 'shield', w: 12 },
  { id: 'swap', w: 4 },
]

const EVENT_POOL: Array<{ text: string; cashDelta: number }> = [
  { text: '快递柜退回一笔运费', cashDelta: 400 },
  { text: '地铁卡自动充值失败，扣了一笔', cashDelta: -300 },
  { text: '同学聚会签到墙抽中红包', cashDelta: 600 },
  { text: '合租水电分账，你多付了', cashDelta: -500 },
  { text: '失物招领处领回耳机', cashDelta: 200 },
  { text: '航班延误赔付到账', cashDelta: 800 },
  { text: '只是路过天台，什么也没发生', cashDelta: 0 },
  { text: '咖啡馆赠送一张优惠券（折现）', cashDelta: 250 },
]

function emptyPropertyMap(): Record<number, MonopolyPropertyState> {
  const map: Record<number, MonopolyPropertyState> = {}
  for (const t of MONOPOLY_BOARD) {
    if (t.kind === 'property') {
      map[t.id] = { owner: null, houses: 0, mortgaged: false, shieldedUntilTurn: -1 }
    }
  }
  return map
}

export function createInitialMonopolyState(): MonopolyGameState {
  return {
    tiles: MONOPOLY_BOARD,
    properties: emptyPropertyMap(),
    players: {
      player: {
        id: 'player',
        cash: MONOPOLY_INITIAL_CASH,
        position: 0,
        items: [],
        jailed: false,
        jailTurns: 0,
        bankrupt: false,
      },
      char: {
        id: 'char',
        cash: MONOPOLY_INITIAL_CASH,
        position: 0,
        items: [],
        jailed: false,
        jailTurns: 0,
        bankrupt: false,
      },
    },
    turn: 'player',
    turnIndex: 0,
    phase: 'idle',
    lastDice: null,
    pendingBuy: null,
    pendingRent: null,
    pendingBranch: null,
    doubleRentArmedBy: null,
    freezeNext: null,
    lastFreezeTarget: null,
    winner: null,
    winReason: null,
    logLine: '掷骰开始吧。',
    animToken: 0,
    lastEvent: null,
    lastItemGot: null,
  }
}

export function rollTwoDice(): [number, number] {
  return [1 + Math.floor(Math.random() * 6), 1 + Math.floor(Math.random() * 6)]
}

export function calcRent(
  tile: MonopolyTileDef,
  prop: MonopolyPropertyState,
  properties: Record<number, MonopolyPropertyState>,
  doubleArmed: boolean,
): number {
  if (!tile.colorGroup || prop.mortgaged || !prop.owner) return 0
  let rent = tile.rentBase ?? 0
  if (prop.houses > 0 && tile.rentHouse) {
    rent = tile.rentHouse[Math.min(prop.houses, tile.rentHouse.length) - 1] ?? rent
  } else if (ownsFullColorSet(prop.owner, tile.colorGroup, properties)) {
    rent *= 2
  }
  if (doubleArmed) rent *= 2
  return rent
}

export function ownsFullColorSet(
  owner: MonopolyPlayerId,
  group: MonopolyColorGroup,
  properties: Record<number, MonopolyPropertyState>,
): boolean {
  const tiles = tilesInColorGroup(group)
  return tiles.every((t) => properties[t.id]?.owner === owner && !properties[t.id]?.mortgaged)
}

export function ownedPropertyIds(state: MonopolyGameState, who: MonopolyPlayerId): number[] {
  return Object.entries(state.properties)
    .filter(([, p]) => p.owner === who)
    .map(([id]) => Number(id))
}

export function netWorth(state: MonopolyGameState, who: MonopolyPlayerId): number {
  const p = state.players[who]
  let worth = p.cash
  for (const [id, prop] of Object.entries(state.properties)) {
    if (prop.owner !== who) continue
    const tile = state.tiles[Number(id)]
    if (!tile) continue
    worth += Math.floor((tile.price ?? 0) * (prop.mortgaged ? 0.5 : 1))
    worth += prop.houses * (tile.houseCost ?? 0)
  }
  return worth
}

export function pickRandomItem(): MonopolyItemId {
  const total = ITEM_DROP_WEIGHTS.reduce((s, x) => s + x.w, 0)
  let r = Math.random() * total
  for (const row of ITEM_DROP_WEIGHTS) {
    r -= row.w
    if (r <= 0) return row.id
  }
  return 'rent_free'
}

export function pickRandomEvent(): { text: string; cashDelta: number } {
  return EVENT_POOL[Math.floor(Math.random() * EVENT_POOL.length)]!
}

export function advancePosition(from: number, steps: number): { position: number; passedGo: boolean } {
  const path = walkPath(from, steps)
  const position = path[path.length - 1] ?? from
  return { position, passedGo: pathPassedGo(from, path) }
}

export type LandResolveResult = {
  state: MonopolyGameState
  kind:
    | 'none'
    | 'buy_offer'
    | 'rent'
    | 'item'
    | 'event'
    | 'tax'
    | 'goto_jail'
    | 'parking'
    | 'jail_visit'
    | 'go'
    | 'gate'
    | 'branch_exit'
}

export function applyGoSalary(state: MonopolyGameState, who: MonopolyPlayerId): MonopolyGameState {
  const players = {
    ...state.players,
    [who]: { ...state.players[who], cash: state.players[who].cash + MONOPOLY_GO_SALARY },
  }
  return {
    ...state,
    players,
    logLine: `${who === 'player' ? '你' : '对方'}经过起点，领取 ¥${MONOPOLY_GO_SALARY}`,
  }
}

export function resolveLanding(state: MonopolyGameState, who: MonopolyPlayerId): LandResolveResult {
  const pos = state.players[who].position
  const tile = state.tiles.find((t) => t.id === pos) ?? state.tiles[pos]
  if (!tile) {
    return { state: { ...state, phase: 'idle', logLine: '未知格子' }, kind: 'none' }
  }
  let next = { ...state, phase: 'tile_resolve' as const }

  switch (tile.kind) {
    case 'go':
      return { state: { ...next, logLine: tile.flavor ?? '回到起点。', phase: 'idle' }, kind: 'go' }

    case 'parking':
    case 'jail':
      return {
        state: { ...next, logLine: tile.flavor ?? tile.name, phase: 'idle' },
        kind: tile.kind === 'jail' ? 'jail_visit' : 'parking',
      }

    case 'gate': {
      const entryId = tile.branchEntryId
      if (entryId == null) {
        return { state: { ...next, logLine: tile.flavor ?? tile.name, phase: 'idle' }, kind: 'gate' }
      }
      return {
        state: {
          ...next,
          pendingBranch: {
            forPlayer: who,
            gateId: tile.id,
            entryId,
            zoneLabel: zoneLabelForGate(tile.id),
          },
          phase: 'await_branch',
          logLine: `${tile.name} · 可进入「${zoneLabelForGate(tile.id)}」`,
        },
        kind: 'gate',
      }
    }

    case 'branch_exit': {
      // 出口格：直接走到 nextId（主路汇合点）并再结算一次
      const exitTo = tile.nextId
      const players = {
        ...next.players,
        [who]: { ...next.players[who], position: exitTo },
      }
      const after = { ...next, players, logLine: tile.flavor ?? '支线汇回主路', phase: 'idle' as const }
      return resolveLanding(after, who)
    }

    case 'goto_jail': {
      const players = {
        ...next.players,
        [who]: { ...next.players[who], position: JAIL_TILE_ID, jailed: true, jailTurns: 1 },
      }
      return {
        state: { ...next, players, logLine: tile.flavor ?? '前往谈话室。', phase: 'idle' },
        kind: 'goto_jail',
      }
    }

    case 'tax': {
      const amount = Math.min(800, Math.max(300, Math.floor(next.players[who].cash * 0.08)))
      const players = {
        ...next.players,
        [who]: { ...next.players[who], cash: next.players[who].cash - amount },
      }
      return {
        state: {
          ...next,
          players,
          logLine: `${tile.name}：支付 ¥${amount}`,
          phase: 'idle',
        },
        kind: 'tax',
      }
    }

    case 'item': {
      const item = pickRandomItem()
      const players = {
        ...next.players,
        [who]: { ...next.players[who], items: [...next.players[who].items, item] },
      }
      return {
        state: {
          ...next,
          players,
          lastItemGot: { item, forPlayer: who },
          logLine: `${who === 'player' ? '你' : '对方'}获得道具：${ITEM_LABEL[item]}`,
          phase: 'idle',
        },
        kind: 'item',
      }
    }

    case 'event': {
      const ev = pickRandomEvent()
      const players = {
        ...next.players,
        [who]: { ...next.players[who], cash: next.players[who].cash + ev.cashDelta },
      }
      const sign = ev.cashDelta > 0 ? `+¥${ev.cashDelta}` : ev.cashDelta < 0 ? `¥${ev.cashDelta}` : '无资金变动'
      return {
        state: {
          ...next,
          players,
          lastEvent: { text: ev.text, cashDelta: ev.cashDelta, forPlayer: who },
          logLine: `${ev.text}（${sign}）`,
          phase: 'idle',
        },
        kind: 'event',
      }
    }

    case 'property': {
      const prop = next.properties[tile.id]!
      if (!prop.owner) {
        return {
          state: {
            ...next,
            pendingBuy: { tileId: tile.id, price: tile.price ?? 0, forPlayer: who },
            phase: 'await_buy',
            logLine: `${tile.name} 可购入 · ¥${tile.price}`,
          },
          kind: 'buy_offer',
        }
      }
      if (prop.owner === who) {
        return { state: { ...next, logLine: `落到自己的「${tile.name}」`, phase: 'idle' }, kind: 'none' }
      }
      const double = next.doubleRentArmedBy === prop.owner
      const amount = calcRent(tile, prop, next.properties, double)
      return {
        state: {
          ...next,
          pendingRent: {
            from: who,
            to: prop.owner,
            amount,
            tileId: tile.id,
            canUseRentFree: next.players[who].items.includes('rent_free'),
          },
          doubleRentArmedBy: double ? null : next.doubleRentArmedBy,
          phase: 'await_item',
          logLine: `需支付租金 ¥${amount} 给对方`,
        },
        kind: 'rent',
      }
    }

    default:
      return { state: { ...next, phase: 'idle' }, kind: 'none' }
  }
}

/** 进入支线：走到入口格并结算 */
export function enterBranch(state: MonopolyGameState): LandResolveResult {
  const pending = state.pendingBranch
  if (!pending) return { state: { ...state, phase: 'idle' }, kind: 'none' }
  const who = pending.forPlayer
  const moved: MonopolyGameState = {
    ...state,
    pendingBranch: null,
    players: {
      ...state.players,
      [who]: { ...state.players[who], position: pending.entryId },
    },
    logLine: `进入「${pending.zoneLabel}」`,
    phase: 'tile_resolve',
  }
  return resolveLanding(moved, who)
}

/** 不进支线：沿主路 nextId 留下一格的感觉——直接结束本格，留在入口 */
export function skipBranch(state: MonopolyGameState): MonopolyGameState {
  if (!state.pendingBranch) return { ...state, phase: 'idle' }
  return {
    ...state,
    pendingBranch: null,
    phase: 'idle',
    logLine: '留在主路，未进入支线',
  }
}

export function buyProperty(state: MonopolyGameState, buy: boolean): MonopolyGameState {
  const pending = state.pendingBuy
  if (!pending) return { ...state, phase: 'idle' }
  if (!buy) {
    return { ...state, pendingBuy: null, phase: 'idle', logLine: '选择跳过购买。' }
  }
  const who = pending.forPlayer
  const player = state.players[who]
  if (player.cash < pending.price) {
    return { ...state, pendingBuy: null, phase: 'idle', logLine: '现金不足，无法购买。' }
  }
  const players = {
    ...state.players,
    [who]: { ...player, cash: player.cash - pending.price },
  }
  const properties = {
    ...state.properties,
    [pending.tileId]: { ...state.properties[pending.tileId]!, owner: who },
  }
  const tile = state.tiles[pending.tileId]!
  return {
    ...state,
    players,
    properties,
    pendingBuy: null,
    phase: 'idle',
    logLine: `${who === 'player' ? '你' : '对方'}买下了「${tile.name}」`,
  }
}

export function settleRent(state: MonopolyGameState, useRentFree: boolean): MonopolyGameState {
  const pending = state.pendingRent
  if (!pending) return { ...state, phase: 'idle' }
  const from = state.players[pending.from]
  const to = state.players[pending.to]

  if (useRentFree && from.items.includes('rent_free')) {
    const items = [...from.items]
    const idx = items.indexOf('rent_free')
    items.splice(idx, 1)
    return {
      ...state,
      players: { ...state.players, [pending.from]: { ...from, items } },
      pendingRent: null,
      phase: 'idle',
      logLine: `${pending.from === 'player' ? '你' : '对方'}使用免租卡，跳过支付`,
    }
  }

  const amount = pending.amount
  if (from.cash >= amount) {
    return {
      ...state,
      players: {
        ...state.players,
        [pending.from]: { ...from, cash: from.cash - amount },
        [pending.to]: { ...to, cash: to.cash + amount },
      },
      pendingRent: null,
      phase: 'idle',
      logLine: `支付租金 ¥${amount}`,
    }
  }

  // 尝试抵押周转
  let cash = from.cash
  const properties = { ...state.properties }
  const owned = ownedPropertyIds(state, pending.from)
  for (const id of owned) {
    if (cash >= amount) break
    const prop = properties[id]!
    if (prop.mortgaged) continue
    const tile = state.tiles[id]!
    const mortgageValue = Math.floor((tile.price ?? 0) / 2)
    properties[id] = { ...prop, mortgaged: true, houses: 0 }
    cash += mortgageValue
  }

  if (cash >= amount) {
    return {
      ...state,
      properties,
      players: {
        ...state.players,
        [pending.from]: { ...from, cash: cash - amount },
        [pending.to]: { ...to, cash: to.cash + amount },
      },
      pendingRent: null,
      phase: 'idle',
      logLine: `抵押地产后支付租金 ¥${amount}`,
    }
  }

  // 破产：地产转给债权人
  for (const id of owned) {
    properties[id] = {
      ...properties[id]!,
      owner: pending.to,
      mortgaged: false,
      houses: 0,
    }
  }
  return {
    ...state,
    properties,
    players: {
      ...state.players,
      [pending.from]: { ...from, cash: 0, bankrupt: true, items: [] },
      [pending.to]: { ...to, cash: to.cash + cash },
    },
    pendingRent: null,
    phase: 'game_over',
    winner: pending.to,
    winReason: 'bankrupt',
    logLine: `${pending.from === 'player' ? '你' : '对方'}破产了`,
  }
}

export function endTurn(state: MonopolyGameState): MonopolyGameState {
  if (state.phase === 'game_over') return state
  const nextTurnIndex = state.turnIndex + 1
  if (nextTurnIndex >= MONOPOLY_MAX_TURNS) {
    const pw = netWorth(state, 'player')
    const cw = netWorth(state, 'char')
    const winner: MonopolyPlayerId | null = pw === cw ? null : pw > cw ? 'player' : 'char'
    return {
      ...state,
      turnIndex: nextTurnIndex,
      phase: 'game_over',
      winner,
      winReason: 'turn_cap',
      logLine: winner
        ? `到达回合上限，资产更高者获胜（你 ¥${pw} / 对方 ¥${cw}）`
        : `到达回合上限，平局（各 ¥${pw}）`,
    }
  }

  const nextPlayer: MonopolyPlayerId = state.turn === 'player' ? 'char' : 'player'
  return {
    ...state,
    turn: nextPlayer,
    turnIndex: nextTurnIndex,
    phase: nextPlayer === 'char' ? 'ai_thinking' : 'idle',
    pendingBuy: null,
    pendingRent: null,
    pendingBranch: null,
    logLine: nextPlayer === 'player' ? '轮到你了' : '对方思考中…',
  }
}

export function tryBuildHouse(state: MonopolyGameState, who: MonopolyPlayerId, tileId: number): MonopolyGameState {
  const tile = state.tiles[tileId]
  const prop = state.properties[tileId]
  if (!tile?.colorGroup || !prop || prop.owner !== who || prop.mortgaged) return state
  if (!ownsFullColorSet(who, tile.colorGroup, state.properties)) return state
  if (prop.houses >= 5) return state
  const cost = tile.houseCost ?? 0
  const player = state.players[who]
  if (player.cash < cost) return state
  return {
    ...state,
    players: { ...state.players, [who]: { ...player, cash: player.cash - cost } },
    properties: {
      ...state.properties,
      [tileId]: { ...prop, houses: prop.houses + 1 },
    },
    logLine: `在「${tile.name}」加盖（${prop.houses + 1} 级）`,
  }
}

export function useItem(
  state: MonopolyGameState,
  who: MonopolyPlayerId,
  item: MonopolyItemId,
  opts?: { targetTileId?: number; swapTileId?: number },
): MonopolyGameState {
  const player = state.players[who]
  const idx = player.items.indexOf(item)
  if (idx < 0) return state
  const items = [...player.items]
  items.splice(idx, 1)
  let next: MonopolyGameState = {
    ...state,
    players: { ...state.players, [who]: { ...player, items } },
  }

  switch (item) {
    case 'double_rent':
      next = { ...next, doubleRentArmedBy: who, logLine: `${who === 'player' ? '你' : '对方'}启用了双倍租金卡` }
      break
    case 'freeze': {
      const target: MonopolyPlayerId = who === 'player' ? 'char' : 'player'
      if (next.lastFreezeTarget === target) {
        // 退回道具：不允许连续冻结同一人
        return state
      }
      next = {
        ...next,
        freezeNext: target,
        lastFreezeTarget: target,
        logLine: `${who === 'player' ? '你' : '对方'}使用冻结卡`,
      }
      break
    }
    case 'teleport': {
      const owned = ownedPropertyIds(next, who)
      const dest = opts?.targetTileId ?? owned[0]
      if (dest == null || !owned.includes(dest)) return state
      next = {
        ...next,
        players: {
          ...next.players,
          [who]: { ...next.players[who], position: dest },
        },
        logLine: `传送到「${next.tiles[dest]!.name}」`,
      }
      break
    }
    case 'shield': {
      const owned = ownedPropertyIds(next, who)
      const tid = opts?.targetTileId ?? owned[0]
      if (tid == null || !owned.includes(tid)) return state
      next = {
        ...next,
        properties: {
          ...next.properties,
          [tid]: { ...next.properties[tid]!, shieldedUntilTurn: next.turnIndex + 1 },
        },
        logLine: `为「${next.tiles[tid]!.name}」套上保护罩`,
      }
      break
    }
    case 'swap': {
      const myOwned = ownedPropertyIds(next, who)
      const opp: MonopolyPlayerId = who === 'player' ? 'char' : 'player'
      const theirOwned = ownedPropertyIds(next, opp)
      if (!myOwned.length || !theirOwned.length) return state
      const myTile = opts?.targetTileId ?? myOwned[0]!
      const theirTile = opts?.swapTileId ?? theirOwned[0]!
      if (!myOwned.includes(myTile) || !theirOwned.includes(theirTile)) return state
      if (next.properties[theirTile]!.shieldedUntilTurn >= next.turnIndex) {
        return { ...state, logLine: '对方地产有保护罩，交换失败' }
      }
      next = {
        ...next,
        properties: {
          ...next.properties,
          [myTile]: { ...next.properties[myTile]!, owner: opp, houses: 0 },
          [theirTile]: { ...next.properties[theirTile]!, owner: who, houses: 0 },
        },
        logLine: `偷天换日：交换了「${next.tiles[myTile]!.name}」与「${next.tiles[theirTile]!.name}」`,
      }
      break
    }
    default:
      break
  }
  return next
}

export function consumeFreezeIfNeeded(state: MonopolyGameState, who: MonopolyPlayerId): {
  state: MonopolyGameState
  skipped: boolean
} {
  if (state.freezeNext !== who) return { state, skipped: false }
  return {
    state: {
      ...state,
      freezeNext: null,
      logLine: `${who === 'player' ? '你' : '对方'}被冻结，跳过本回合`,
      phase: 'idle',
    },
    skipped: true,
  }
}

export function releaseJailIfNeeded(state: MonopolyGameState, who: MonopolyPlayerId): MonopolyGameState {
  const p = state.players[who]
  if (!p.jailed) return state
  if (p.jailTurns <= 0) {
    return {
      ...state,
      players: { ...state.players, [who]: { ...p, jailed: false } },
    }
  }
  return {
    ...state,
    players: {
      ...state.players,
      [who]: { ...p, jailTurns: p.jailTurns - 1, jailed: p.jailTurns - 1 > 0 },
    },
    logLine: `${who === 'player' ? '你' : '对方'}在谈话室停留`,
  }
}
