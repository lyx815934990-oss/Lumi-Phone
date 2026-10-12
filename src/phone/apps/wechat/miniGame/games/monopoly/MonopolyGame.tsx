import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

import { useCurrentApiConfig } from '../../../../api/ApiSettingsContext'
import { Pressable } from '../../../../../components/Pressable'
import { personaDb } from '../../../newFriendsPersona/idb'
import type { Character } from '../../../newFriendsPersona/types'
import { loadObservationNotes } from '../../../observationNotes/store'
import {
  inferWeChatRelationshipStage,
  type RelationshipStage,
} from '../../../wechatChatPrompt'
import { fetchGameReaction } from '../../miniGameAi'
import type { GameEventEmitter, MonopolyReactionKey } from '../../types'
import { decideAwaitAction, decidePreTurn } from './aiTurnEngine'
import { BoardView } from './components/BoardView'
import { BranchEnterModal } from './components/BranchEnterModal'
import { BuildHouseSheet, type BuildCandidate } from './components/BuildHouseSheet'
import { DiceRoller } from './components/DiceRoller'
import { EventModal } from './components/EventModal'
import { ItemFxOverlay } from './components/ItemFxOverlay'
import { PlayerPanel } from './components/PlayerPanel'
import { PropertyBuyModal } from './components/PropertyBuyModal'
import { pickMonopolyBanter } from './monopolyBanter'
import { ownsFullColorSet } from './monopolyEngine'
import {
  ITEM_LABEL,
  MONOPOLY_MAX_TURNS,
  type MonopolyItemId,
  type MonopolyPlayerId,
} from './monopolyTypes'
import {
  computePassedGo,
  previewMovePath,
  useMonopolyStore,
} from './useMonopolyStore'

const STEP_MS = 380
const AI_THINK_MS = 700
const ITEM_FX_MS = 900
const CAMERA_ZOOM = 2.15

export function MonopolyGame({
  emitEvent,
  charId,
  charName,
  avatarUrl,
  playerAvatarUrl,
  playerIdentityId,
}: {
  emitEvent: GameEventEmitter
  charId?: string
  charName?: string
  avatarUrl?: string
  playerAvatarUrl?: string
  playerIdentityId?: string
}) {
  const store = useMonopolyStore()
  const apiConfig = useCurrentApiConfig('chatCard')
  const [rolling, setRolling] = useState(false)
  const [busy, setBusy] = useState(false)
  const [highlightId, setHighlightId] = useState<number | null>(null)
  const [banter, setBanter] = useState<string | null>(null)
  const [rentPrompt, setRentPrompt] = useState(false)
  const [buildOpen, setBuildOpen] = useState(false)
  const [fxItem, setFxItem] = useState<MonopolyItemId | null>(null)
  const [fxMode, setFxMode] = useState<'use' | 'got'>('use')
  const [eventOpen, setEventOpen] = useState(false)
  const busyRef = useRef(false)
  const usedLinesRef = useRef<Set<string>>(new Set())
  const startedRef = useRef(false)
  const aiRanRef = useRef(false)
  const settledRef = useRef(false)
  const stageRef = useRef<RelationshipStage | null>(null)
  const characterRef = useRef<Character | null>(null)
  const pendingAfterModalRef = useRef<(() => void) | null>(null)
  const fxTimerRef = useRef<number | null>(null)

  const peer = charName?.trim() || '对方'

  const setBusyBoth = useCallback((v: boolean) => {
    busyRef.current = v
    setBusy(v)
  }, [])

  const playItemFx = useCallback((item: MonopolyItemId, mode: 'use' | 'got' = 'use') => {
    if (fxTimerRef.current) window.clearTimeout(fxTimerRef.current)
    setFxMode(mode)
    setFxItem(item)
    fxTimerRef.current = window.setTimeout(() => {
      setFxItem(null)
      fxTimerRef.current = null
    }, ITEM_FX_MS)
  }, [])

  useEffect(() => {
    store.reset()
    usedLinesRef.current = new Set()
    startedRef.current = false
    settledRef.current = false
    return () => {
      store.reset()
      if (fxTimerRef.current) window.clearTimeout(fxTimerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount once per game session
  }, [])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const cid = charId?.trim()
      if (!cid) return
      try {
        const [char, notes] = await Promise.all([
          personaDb.getCharacter(cid),
          loadObservationNotes({
            conversationCharacterId: cid,
            playerIdentityId: playerIdentityId?.trim() || '__default__',
            charDisplayName: peer,
            seedIfEmpty: false,
          }),
        ])
        if (cancelled) return
        characterRef.current = char
        stageRef.current = inferWeChatRelationshipStage({
          affection: notes?.affection,
          relationshipLabel: notes?.relationshipLabel,
        })
      } catch {
        /* ignore */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [charId, peer, playerIdentityId])

  const say = useCallback(
    (key: MonopolyReactionKey, detail?: string) => {
      const local = pickMonopolyBanter(key, usedLinesRef.current)
      setBanter(local)
      emitEvent({
        type: key === 'win' || key === 'lose' ? 'gameOver' : key === 'thinking' ? 'milestone' : 'opponentMove',
        detail: detail ?? local,
        won: key === 'lose' ? true : key === 'win' ? false : undefined,
        monopolyKey: key,
      })
      // 关系阶段语气：后台用 LLM 润色气泡（失败则保留本地台词）
      void (async () => {
        const text = await fetchGameReaction({
          api: apiConfig,
          character: characterRef.current,
          gameType: 'monopoly',
          eventType: key === 'win' || key === 'lose' ? 'gameOver' : key === 'thinking' ? 'milestone' : 'opponentMove',
          eventDetail: `${key}${detail ? ` · ${detail}` : ''}`,
          relationshipStage: stageRef.current,
        })
        if (text) setBanter(text)
      })()
    },
    [apiConfig, emitEvent],
  )

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    say('gameStart')
  }, [say])

  useEffect(() => {
    if (store.phase !== 'game_over' || settledRef.current) return
    settledRef.current = true
    if (store.winner === 'player') say('lose', store.logLine ?? undefined)
    else if (store.winner === 'char') say('win', store.logLine ?? undefined)
    else {
      emitEvent({ type: 'gameOver', detail: store.logLine ?? '平局', won: undefined })
    }
  }, [emitEvent, say, store.phase, store.winner, store.logLine])

  const animateMove = useCallback(async (who: MonopolyPlayerId, steps: number) => {
    const from = useMonopolyStore.getState().players[who].position
    const path = previewMovePath(from, steps)
    for (const pos of path) {
      useMonopolyStore.getState().setPosition(who, pos)
      setHighlightId(pos)
      await new Promise((r) => setTimeout(r, STEP_MS))
    }
    setHighlightId(null)
    const passedGo = computePassedGo(from, path)
    useMonopolyStore.getState().afterMoveLand(who, passedGo)
    return passedGo
  }, [])

  /** 落地后若有事件/道具揭晓，先弹窗再结束回合 */
  const continueAfterLand = useCallback(
    (who: MonopolyPlayerId, onDone: () => void) => {
      const s = useMonopolyStore.getState()
      if (s.lastEvent && s.lastEvent.forPlayer === who) {
        if (who === 'player') {
          setEventOpen(true)
          pendingAfterModalRef.current = () => {
            useMonopolyStore.getState().clearLastEvent()
            say('eventTrigger', s.lastEvent?.text)
            onDone()
          }
          return
        }
        useMonopolyStore.getState().clearLastEvent()
        say('eventTrigger')
      }
      if (s.lastItemGot && s.lastItemGot.forPlayer === who) {
        playItemFx(s.lastItemGot.item, 'got')
        say('gotItem', ITEM_LABEL[s.lastItemGot.item])
        useMonopolyStore.getState().clearLastItemGot()
      }
      onDone()
    },
    [playItemFx, say],
  )

  const runPlayerRoll = useCallback(async () => {
    if (busyRef.current) return
    const s0 = useMonopolyStore.getState()
    if (s0.turn !== 'player' || s0.phase !== 'idle') return

    setBusyBoth(true)
    setRolling(true)
    const result = useMonopolyStore.getState().rollDiceFor('player')
    await new Promise((r) => setTimeout(r, 560))
    setRolling(false)

    if (result === 'frozen' || result === 'jailed') {
      say('badRoll')
      useMonopolyStore.getState().finishTurn()
      setBusyBoth(false)
      return
    }
    if (result === 'game_over') {
      setBusyBoth(false)
      return
    }

    const steps = result[0] + result[1]
    if (steps >= 10) say('goodRoll')
    else if (steps <= 4) say('badRoll')

    await animateMove('player', steps)
    const s = useMonopolyStore.getState()

    if (s.phase === 'await_buy' && s.pendingBuy?.forPlayer === 'player') {
      setBusyBoth(false)
      return
    }
    if (s.phase === 'await_item' && s.pendingRent?.from === 'player') {
      setRentPrompt(true)
      setBusyBoth(false)
      return
    }
    if (s.phase === 'await_branch' && s.pendingBranch?.forPlayer === 'player') {
      setBusyBoth(false)
      return
    }

    continueAfterLand('player', () => {
      if (pendingAfterModalRef.current) {
        setBusyBoth(false)
        return
      }
      useMonopolyStore.getState().finishTurn()
      setBusyBoth(false)
    })
  }, [animateMove, continueAfterLand, say, setBusyBoth])

  const handleBranch = useCallback(
    async (enter: boolean) => {
      const pending = useMonopolyStore.getState().pendingBranch
      if (enter && pending) {
        useMonopolyStore.getState().setPosition(pending.forPlayer, pending.entryId)
        setHighlightId(pending.entryId)
        await new Promise((r) => setTimeout(r, STEP_MS))
        setHighlightId(null)
      }
      useMonopolyStore.getState().resolveBranch(enter)
      if (enter) say('eventTrigger', pending?.zoneLabel)
      const s = useMonopolyStore.getState()
      if (s.phase === 'await_buy' && s.pendingBuy?.forPlayer === 'player') return
      if (s.phase === 'await_item' && s.pendingRent?.from === 'player') {
        setRentPrompt(true)
        return
      }
      continueAfterLand('player', () => {
        if (pendingAfterModalRef.current) return
        if (useMonopolyStore.getState().phase !== 'game_over') {
          useMonopolyStore.getState().finishTurn()
        }
      })
    },
    [continueAfterLand, say],
  )

  const handleEventDismiss = useCallback(() => {
    setEventOpen(false)
    const fn = pendingAfterModalRef.current
    pendingAfterModalRef.current = null
    fn?.()
    setBusyBoth(false)
  }, [setBusyBoth])

  const handleBuy = useCallback(
    (buy: boolean) => {
      useMonopolyStore.getState().resolveBuy(buy)
      if (buy) say('playerBought')
      useMonopolyStore.getState().finishTurn()
    },
    [say],
  )

  const handleRent = useCallback(
    (useRentFree: boolean) => {
      setRentPrompt(false)
      if (useRentFree) playItemFx('rent_free', 'use')
      useMonopolyStore.getState().resolveRent(useRentFree)
      if (useRentFree) say('usedItem')
      else say('paidRent')
      if (useMonopolyStore.getState().phase !== 'game_over') useMonopolyStore.getState().finishTurn()
    },
    [playItemFx, say],
  )

  const handleUseItem = useCallback(
    (item: MonopolyItemId) => {
      const ok = useMonopolyStore.getState().applyItem('player', item)
      if (ok) {
        playItemFx(item, 'use')
        say('usedItem', ITEM_LABEL[item])
      }
    },
    [playItemFx, say],
  )

  const buildCandidates = ((): BuildCandidate[] => {
    const me = store.players.player
    const list: BuildCandidate[] = []
    for (const [idStr, prop] of Object.entries(store.properties)) {
      if (prop.owner !== 'player' || prop.mortgaged) continue
      const tile = store.tiles[Number(idStr)]
      if (!tile?.colorGroup || !tile.houseCost) continue
      if (!ownsFullColorSet('player', tile.colorGroup, store.properties)) continue
      list.push({
        tile,
        houses: prop.houses,
        cost: tile.houseCost,
        canAfford: me.cash >= tile.houseCost && prop.houses < 5,
      })
    }
    return list
  })()

  // AI 回合
  useEffect(() => {
    if (store.turn !== 'char' || store.phase === 'game_over') {
      aiRanRef.current = false
      return
    }
    if (store.phase !== 'ai_thinking' && store.phase !== 'idle') return
    if (store.turn === 'char' && store.phase === 'idle' && store.pendingBuy) return
    if (busyRef.current || eventOpen) return
    if (aiRanRef.current) return
    aiRanRef.current = true

    let cancelled = false
    void (async () => {
      setBusyBoth(true)
      say('thinking')
      await new Promise((r) => setTimeout(r, AI_THINK_MS))
      if (cancelled) return

      const pre = decidePreTurn(useMonopolyStore.getState())
      if (pre.type === 'use_item') {
        const ok = useMonopolyStore.getState().applyItem('char', pre.item, { targetTileId: pre.targetTileId })
        if (ok) {
          playItemFx(pre.item, 'use')
          say('usedItem')
        }
        await new Promise((r) => setTimeout(r, 450))
      } else if (pre.type === 'build') {
        useMonopolyStore.getState().buildOn('char', pre.tileId)
        await new Promise((r) => setTimeout(r, 300))
      }

      setRolling(true)
      const result = useMonopolyStore.getState().rollDiceFor('char')
      await new Promise((r) => setTimeout(r, 560))
      setRolling(false)

      if (result === 'frozen' || result === 'jailed') {
        useMonopolyStore.getState().finishTurn()
        setBusyBoth(false)
        aiRanRef.current = false
        return
      }
      if (result === 'game_over' || typeof result === 'string') {
        setBusyBoth(false)
        aiRanRef.current = false
        return
      }

      await animateMove('char', result[0] + result[1])
      if (cancelled) return

      let guard = 0
      while (guard++ < 6) {
        const s = useMonopolyStore.getState()
        if (s.phase === 'game_over') break
        if (s.phase === 'await_branch' && s.pendingBranch?.forPlayer === 'char') {
          const entry = s.pendingBranch.entryId
          const zoneLabel = s.pendingBranch.zoneLabel
          useMonopolyStore.getState().setPosition('char', entry)
          setHighlightId(entry)
          await new Promise((r) => setTimeout(r, STEP_MS))
          setHighlightId(null)
          useMonopolyStore.getState().resolveBranch(true)
          say('eventTrigger', zoneLabel)
          await new Promise((r) => setTimeout(r, 300))
          continue
        }
        if (s.phase === 'await_buy' || s.phase === 'await_item') {
          const act = decideAwaitAction(s)
          if (act.type === 'buy') {
            useMonopolyStore.getState().resolveBuy(act.buy)
            if (act.buy) say('boughtProperty')
          } else if (act.type === 'pay_rent') {
            if (act.useRentFree) playItemFx('rent_free', 'use')
            useMonopolyStore.getState().resolveRent(act.useRentFree)
            if (act.useRentFree) say('usedItem')
            else say('collectedRent')
          } else {
            if (s.phase === 'await_buy') useMonopolyStore.getState().resolveBuy(false)
            if (s.phase === 'await_item') useMonopolyStore.getState().resolveRent(false)
          }
          await new Promise((r) => setTimeout(r, 350))
          continue
        }
        break
      }

      await new Promise<void>((resolve) => {
        continueAfterLand('char', () => resolve())
      })

      if (useMonopolyStore.getState().phase !== 'game_over') {
        useMonopolyStore.getState().finishTurn()
      }
      setBusyBoth(false)
      aiRanRef.current = false
    })()

    return () => {
      cancelled = true
    }
  }, [
    animateMove,
    continueAfterLand,
    eventOpen,
    playItemFx,
    say,
    setBusyBoth,
    store.phase,
    store.turn,
    store.turnIndex,
  ])

  const owners: Record<number, MonopolyPlayerId | null | undefined> = {}
  const houses: Record<number, number> = {}
  for (const [id, prop] of Object.entries(store.properties)) {
    owners[Number(id)] = prop.owner
    houses[Number(id)] = prop.houses
  }

  const buyTile = store.pendingBuy ? store.tiles[store.pendingBuy.tileId] ?? null : null
  const canRoll =
    store.turn === 'player' &&
    store.phase === 'idle' &&
    !rolling &&
    !busy &&
    !store.pendingBuy &&
    !store.pendingBranch &&
    !rentPrompt &&
    !eventOpen
  const pendingRent = store.pendingRent
  const eventPayload = store.lastEvent
  const branchPending = store.pendingBranch
  const branchGate = branchPending
    ? store.tiles.find((t) => t.id === branchPending.gateId)
    : null

  return (
    <div className="relative flex h-full w-full max-w-[min(96vw,440px)] flex-col gap-2">
      <AnimatePresence>
        {banter ? (
          <motion.div
            key={banter}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mx-auto max-w-[90%] rounded-2xl rounded-tl-md border border-white/70 bg-white/90 px-3 py-2 text-center text-[12px] leading-snug text-stone-800 shadow-sm"
            style={{ fontFamily: 'var(--phone-font, "Noto Serif SC", serif)' }}
          >
            {peer}：{banter}
          </motion.div>
        ) : (
          <div className="h-[36px]" />
        )}
      </AnimatePresence>

      <div className="flex gap-2 px-0.5">
        <PlayerPanel
          who="player"
          name="你"
          cash={store.players.player.cash}
          items={store.players.player.items}
          avatarUrl={playerAvatarUrl}
          active={store.turn === 'player'}
          canUseItems={store.turn === 'player' && store.phase === 'idle' && !eventOpen && !store.pendingBranch}
          onUseItem={handleUseItem}
        />
        <PlayerPanel
          who="char"
          name={peer}
          cash={store.players.char.cash}
          items={store.players.char.items}
          avatarUrl={avatarUrl}
          active={store.turn === 'char'}
          canUseItems={false}
        />
      </div>

      <div className="relative min-h-0 flex-1">
        <BoardView
          tiles={store.tiles}
          playerPos={store.players.player.position}
          charPos={store.players.char.position}
          owners={owners}
          houses={houses}
          highlightId={highlightId}
          followTileId={
            highlightId ??
            (store.turn === 'char' ? store.players.char.position : store.players.player.position)
          }
          zoom={CAMERA_ZOOM}
        />
        <PropertyBuyModal
          open={!!store.pendingBuy && store.pendingBuy.forPlayer === 'player'}
          tile={buyTile}
          price={store.pendingBuy?.price ?? 0}
          flavor={buyTile?.flavor}
          onBuy={() => handleBuy(true)}
          onSkip={() => handleBuy(false)}
        />
        <EventModal
          open={eventOpen && !!eventPayload && eventPayload.forPlayer === 'player'}
          text={eventPayload?.text ?? ''}
          cashDelta={eventPayload?.cashDelta ?? 0}
          onDismiss={handleEventDismiss}
        />
        <BranchEnterModal
          open={!!branchPending && branchPending.forPlayer === 'player'}
          zoneLabel={branchPending?.zoneLabel ?? '支线'}
          gateName={branchGate?.name ?? '入口'}
          onEnter={() => void handleBranch(true)}
          onSkip={() => void handleBranch(false)}
        />
        <BuildHouseSheet
          open={buildOpen}
          candidates={buildCandidates}
          onBuild={(tileId) => {
            useMonopolyStore.getState().buildOn('player', tileId)
          }}
          onClose={() => setBuildOpen(false)}
        />
        <ItemFxOverlay item={fxItem} mode={fxMode} />
        <AnimatePresence>
          {rentPrompt && pendingRent?.from === 'player' ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-30 flex items-center justify-center bg-black/25 px-5 backdrop-blur-[2px]"
            >
              <div className="w-full max-w-[280px] rounded-2xl border border-stone-200 bg-white p-4 shadow-xl">
                <p className="text-[13px] text-stone-500">租金到期</p>
                <p
                  className="mt-1 text-[22px] font-semibold tabular-nums"
                  style={{ fontFamily: 'var(--phone-font, "Noto Serif SC", serif)' }}
                >
                  ¥{pendingRent.amount.toLocaleString()}
                </p>
                <div className="mt-4 flex flex-col gap-2">
                  {pendingRent.canUseRentFree ? (
                    <Pressable
                      onClick={() => handleRent(true)}
                      className="flex h-10 items-center justify-center rounded-xl border border-amber-200 bg-amber-50 text-[14px] text-amber-900"
                    >
                      使用免租卡
                    </Pressable>
                  ) : null}
                  <Pressable
                    onClick={() => handleRent(false)}
                    className="flex h-10 items-center justify-center rounded-xl bg-[#0A0A0C] text-[14px] text-white"
                  >
                    支付租金
                  </Pressable>
                </div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      <div className="flex flex-col items-center gap-1.5 pb-1">
        <div className="flex items-center gap-2">
          <DiceRoller
            dice={store.lastDice}
            rolling={rolling}
            disabled={!canRoll}
            onRoll={() => void runPlayerRoll()}
          />
          <Pressable
            disabled={store.turn !== 'player' || store.phase !== 'idle' || busy || eventOpen || !!store.pendingBranch}
            onClick={() => setBuildOpen(true)}
            className={`rounded-2xl px-3 py-2.5 text-[13px] font-medium ${
              store.turn === 'player' && store.phase === 'idle' && !busy && !eventOpen
                ? 'border border-stone-300 bg-white text-stone-800 active:opacity-90'
                : 'border border-stone-200 bg-stone-100 text-stone-400'
            }`}
          >
            盖房
          </Pressable>
        </div>
        <p className="text-center text-[11px] text-stone-500">
          {store.logLine ?? '—'} · 第 {Math.min(store.turnIndex + 1, MONOPOLY_MAX_TURNS)}/{MONOPOLY_MAX_TURNS} 回合
        </p>
      </div>
    </div>
  )
}
