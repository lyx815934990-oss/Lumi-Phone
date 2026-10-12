/**
 * 大富翁 AI 决策（纯函数，与对话生成解耦）
 * 启发式：资金阈值买地 + 凑齐同色优先 + 道具按情境使用 + 随机扰动
 */

import { calcRent, ownsFullColorSet, ownedPropertyIds } from './monopolyEngine'
import type {
  MonopolyAiAction,
  MonopolyGameState,
  MonopolyItemId,
  MonopolyPlayerId,
} from './monopolyTypes'
import { MONOPOLY_AI_CASH_BUY_THRESHOLD, MONOPOLY_AI_RANDOMNESS } from './monopolyTypes'

function chance(p: number): boolean {
  return Math.random() < p
}

function opponentOf(who: MonopolyPlayerId): MonopolyPlayerId {
  return who === 'player' ? 'char' : 'player'
}

/** 买地决策 */
export function decideBuy(state: MonopolyGameState): MonopolyAiAction {
  const pending = state.pendingBuy
  if (!pending || pending.forPlayer !== 'char') return { type: 'pass' }

  const me = state.players.char
  const tile = state.tiles[pending.tileId]!
  const price = pending.price
  const cashAfter = me.cash - price

  // 资金紧张：倾向不买
  if (cashAfter < MONOPOLY_AI_CASH_BUY_THRESHOLD * 0.45) {
    return { type: 'buy', buy: chance(MONOPOLY_AI_RANDOMNESS * 0.4) }
  }

  let score = 0.55
  if (tile.colorGroup) {
    const ownedInGroup = ownedPropertyIds(state, 'char').filter(
      (id) => state.tiles[id]?.colorGroup === tile.colorGroup,
    ).length
    const groupSize = state.tiles.filter((t) => t.colorGroup === tile.colorGroup).length
    if (ownedInGroup + 1 >= groupSize) score += 0.35
    else if (ownedInGroup > 0) score += 0.2
  }
  if (me.cash > MONOPOLY_AI_CASH_BUY_THRESHOLD) score += 0.15
  if (price > me.cash * 0.45) score -= 0.25

  // 随机扰动：偶尔做非最优选择
  if (chance(MONOPOLY_AI_RANDOMNESS)) score = 1 - score

  return { type: 'buy', buy: score >= 0.5 }
}

/** 租金：大额才用免租卡 */
export function decideRent(state: MonopolyGameState): MonopolyAiAction {
  const pending = state.pendingRent
  if (!pending || pending.from !== 'char') return { type: 'pass' }
  const me = state.players.char
  const useRentFree =
    pending.canUseRentFree &&
    (pending.amount >= Math.max(800, me.cash * 0.28) || me.cash < pending.amount)
  // 小扰动：偶尔舍不得用
  if (useRentFree && chance(MONOPOLY_AI_RANDOMNESS * 0.5)) {
    return { type: 'pay_rent', useRentFree: false }
  }
  return { type: 'pay_rent', useRentFree }
}

/** 回合开始前可选：用道具 / 盖房 */
export function decidePreTurn(state: MonopolyGameState): MonopolyAiAction {
  const me = state.players.char
  const items = me.items

  // 双倍租金：对手靠近自己高租金地产时更愿意用（简化：有高价值完整色组就启用）
  if (items.includes('double_rent') && chance(0.35)) {
    const hasStrongSet = state.tiles.some(
      (t) =>
        t.colorGroup &&
        ownsFullColorSet('char', t.colorGroup, state.properties) &&
        (t.rentBase ?? 0) >= 180,
    )
    if (hasStrongSet || me.cash > MONOPOLY_AI_CASH_BUY_THRESHOLD) {
      return { type: 'use_item', item: 'double_rent' }
    }
  }

  // 冻结：对手现金多或即将路过高价值区时（简化：对手现金 > 自己且回合后半段）
  if (
    items.includes('freeze') &&
    state.lastFreezeTarget !== 'player' &&
    state.players.player.cash > me.cash * 1.1 &&
    chance(0.25)
  ) {
    return { type: 'use_item', item: 'freeze' }
  }

  // 传送：落到对手高租金附近时回防到自己地产（简化：现金紧张时回自己地产）
  if (items.includes('teleport') && me.cash < MONOPOLY_AI_CASH_BUY_THRESHOLD * 0.6) {
    const owned = ownedPropertyIds(state, 'char')
    if (owned.length) {
      const safest = owned.reduce((best, id) => {
        const t = state.tiles[id]!
        const p = state.properties[id]!
        const rent = calcRent(t, p, state.properties, false)
        return rent > (best.rent ?? 0) ? { id, rent } : best
      }, { id: owned[0]!, rent: 0 })
      if (chance(0.4)) return { type: 'use_item', item: 'teleport', targetTileId: safest.id }
    }
  }

  // 偷天换日：稀有，只在对手有完整色组且自己没有时考虑
  if (items.includes('swap') && chance(0.5)) {
    const oppOwned = ownedPropertyIds(state, 'player')
    const myOwned = ownedPropertyIds(state, 'char')
    if (myOwned.length && oppOwned.length) {
      return { type: 'use_item', item: 'swap', targetTileId: myOwned[0] }
    }
  }

  // 盖房：资金充裕且有完整色组
  if (me.cash > MONOPOLY_AI_CASH_BUY_THRESHOLD) {
    for (const id of ownedPropertyIds(state, 'char')) {
      const tile = state.tiles[id]!
      const prop = state.properties[id]!
      if (!tile.colorGroup || prop.houses >= 5 || prop.mortgaged) continue
      if (!ownsFullColorSet('char', tile.colorGroup, state.properties)) continue
      const cost = tile.houseCost ?? 0
      if (me.cash - cost < MONOPOLY_AI_CASH_BUY_THRESHOLD * 0.5) continue
      if (chance(0.55 + (chance(MONOPOLY_AI_RANDOMNESS) ? -0.2 : 0.1))) {
        return { type: 'build', tileId: id }
      }
    }
  }

  return { type: 'pass' }
}

/** 落地后若轮到 AI 处理 await 阶段，统一入口 */
export function decideAwaitAction(state: MonopolyGameState): MonopolyAiAction {
  if (state.phase === 'await_buy' && state.pendingBuy?.forPlayer === 'char') {
    return decideBuy(state)
  }
  if (state.phase === 'await_item' && state.pendingRent?.from === 'char') {
    return decideRent(state)
  }
  return { type: 'pass' }
}

export function shouldAiPreferItem(item: MonopolyItemId, state: MonopolyGameState): boolean {
  void opponentOf
  if (item === 'rent_free') return false
  return decidePreTurn({ ...state, players: { ...state.players, char: { ...state.players.char, items: [item] } } }).type ===
    'use_item'
}
