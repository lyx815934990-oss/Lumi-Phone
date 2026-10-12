import { create } from 'zustand'

import { pathPassedGo, walkPath } from './boardData'
import {
  applyGoSalary,
  buyProperty,
  consumeFreezeIfNeeded,
  createInitialMonopolyState,
  endTurn,
  enterBranch,
  releaseJailIfNeeded,
  resolveLanding,
  rollTwoDice,
  settleRent,
  skipBranch,
  tryBuildHouse,
  useItem,
} from './monopolyEngine'
import type {
  MonopolyGameState,
  MonopolyItemId,
  MonopolyPlayerId,
} from './monopolyTypes'

type MonopolyStore = MonopolyGameState & {
  reset: () => void
  setPhase: (phase: MonopolyGameState['phase']) => void
  setLog: (line: string) => void
  setDice: (dice: [number, number] | null) => void
  setPosition: (who: MonopolyPlayerId, position: number) => void
  bumpAnim: () => void
  rollDiceFor: (who: MonopolyPlayerId) => [number, number] | 'frozen' | 'jailed' | 'game_over'
  afterMoveLand: (who: MonopolyPlayerId, passedGo: boolean) => void
  resolveBuy: (buy: boolean) => void
  resolveRent: (useRentFree: boolean) => void
  resolveBranch: (enter: boolean) => void
  finishTurn: () => void
  applyItem: (
    who: MonopolyPlayerId,
    item: MonopolyItemId,
    opts?: { targetTileId?: number; swapTileId?: number },
  ) => boolean
  buildOn: (who: MonopolyPlayerId, tileId: number) => void
  clearLastEvent: () => void
  clearLastItemGot: () => void
}

export const useMonopolyStore = create<MonopolyStore>((set, get) => ({
  ...createInitialMonopolyState(),

  reset: () => set({ ...createInitialMonopolyState() }),

  setPhase: (phase) => set({ phase }),

  setLog: (line) => set({ logLine: line }),

  setDice: (dice) => set({ lastDice: dice }),

  setPosition: (who, position) =>
    set((s) => ({
      players: { ...s.players, [who]: { ...s.players[who], position } },
    })),

  bumpAnim: () => set((s) => ({ animToken: s.animToken + 1 })),

  rollDiceFor: (who) => {
    const s = get()
    if (s.phase === 'game_over') return 'game_over'

    const frozen = consumeFreezeIfNeeded(s, who)
    if (frozen.skipped) {
      set(frozen.state)
      return 'frozen'
    }

    let state = releaseJailIfNeeded(frozen.state, who)
    if (state.players[who].jailed) {
      set({ ...state, phase: 'idle', logLine: `${who === 'player' ? '你' : '对方'}仍在谈话室` })
      return 'jailed'
    }

    const dice = rollTwoDice()
    set({ ...state, lastDice: dice, phase: 'rolling', logLine: `掷出 ${dice[0]} + ${dice[1]}` })
    return dice
  },

  afterMoveLand: (who, passedGo) => {
    let state: MonopolyGameState = get()
    if (passedGo) {
      state = applyGoSalary(state, who)
    }
    const landed = resolveLanding(state, who)
    set({ ...landed.state, animToken: state.animToken + 1 })
  },

  resolveBuy: (buy) => {
    set(buyProperty(get(), buy))
  },

  resolveRent: (useRentFree) => {
    set(settleRent(get(), useRentFree))
  },

  resolveBranch: (enter) => {
    if (enter) {
      const result = enterBranch(get())
      set({ ...result.state, animToken: get().animToken + 1 })
    } else {
      set(skipBranch(get()))
    }
  },

  finishTurn: () => {
    set(endTurn(get()))
  },

  applyItem: (who, item, opts) => {
    const before = get()
    const next = useItem(before, who, item, opts)
    if (next === before) return false
    set(next)
    return true
  },

  buildOn: (who, tileId) => {
    set(tryBuildHouse(get(), who, tileId))
  },

  clearLastEvent: () => set({ lastEvent: null }),

  clearLastItemGot: () => set({ lastItemGot: null }),
}))

export function previewMovePath(from: number, steps: number): number[] {
  return walkPath(from, steps)
}

export function computePassedGo(from: number, path: number[]): boolean {
  return pathPassedGo(from, path)
}
