import { listMutualFriendNetworkCharacterIds } from '../mutualFriend/listMutualFriendPeers'
import { personaDb } from '../newFriendsPersona/idb'
import { normalizeWeChatTimeConfig } from '../time/wechatTimeUtils'
import {
  composeStoryTimelineCalendarAnchorLabel,
  createEmptyStoryTimelineState,
  parseStoryCalendarDayStartMs,
  type StoryTimelineState,
} from './storyTimelineTypes'

/** 故事日 + HH:mm → 毫秒；无钟点则为当日 0 点 */
export function storyDayTimeToMs(
  storyDay?: string | null,
  storyTime?: string | null,
): number | null {
  const day = String(storyDay ?? '').trim()
  if (!day) return null
  const dayMs = parseStoryCalendarDayStartMs(day)
  if (dayMs == null) return null
  const clock = String(storyTime ?? '').trim().match(/^(\d{1,2}):(\d{2})$/)
  if (!clock) return dayMs
  const h = Math.min(23, Math.max(0, Number(clock[1])))
  const m = Math.min(59, Math.max(0, Number(clock[2])))
  return dayMs + h * 3_600_000 + m * 60_000
}

function stateNowMs(state: StoryTimelineState | null | undefined): number | null {
  if (!state) return null
  return storyDayTimeToMs(state.currentStoryDay, state.currentStoryTime)
}

/**
 * 将源角色的剧情「现在」（及可选线上 custom 时钟）单调同步到同人脉圈其它角色/NPC。
 * 只前进、不回拨；不覆盖对方服装/物品/伏笔等状态字段。
 */
export async function syncNetworkStoryNowFromPrimary(params: {
  sourceCharacterId: string
  storyDay?: string | null
  storyTime?: string | null
  /** 优先作为线上时钟对齐目标；缺省则由 day+time 推算 */
  storyNowMs?: number | null
  /** 默认 true：人脉成员若仍走系统钟或落后于剧情「现在」，对齐为 custom */
  syncOnlineClock?: boolean
}): Promise<{ syncedPeerIds: string[] }> {
  const sourceId = params.sourceCharacterId.trim()
  const storyDay = String(params.storyDay ?? '').trim()
  const storyTime = String(params.storyTime ?? '').trim()
  if (!sourceId || !storyDay) return { syncedPeerIds: [] }

  const sourceNowMs =
    (typeof params.storyNowMs === 'number' && Number.isFinite(params.storyNowMs) && params.storyNowMs > 0
      ? Math.round(params.storyNowMs)
      : null) ?? storyDayTimeToMs(storyDay, storyTime || null)
  if (sourceNowMs == null) return { syncedPeerIds: [] }

  let characterIds: string[] = []
  try {
    const ch = await personaDb.getCharacter(sourceId)
    const net = await listMutualFriendNetworkCharacterIds(ch)
    characterIds = net.characterIds
  } catch {
    return { syncedPeerIds: [] }
  }
  if (characterIds.length < 2) return { syncedPeerIds: [] }

  const syncClock = params.syncOnlineClock !== false
  const syncedPeerIds: string[] = []
  const wallNow = Date.now()

  for (const peerId of characterIds) {
    const pid = peerId.trim()
    if (!pid) continue
    try {
      const prev = (await personaDb.getStoryTimelineState(pid)) ?? createEmptyStoryTimelineState(pid)
      const peerMs = stateNowMs(prev)
      let wrote = false
      // 含源角色：源若仅推进了时钟而未写 state、或 fan-out 种子 NPC 尚无「现在」，一并对齐
      if (peerMs == null || peerMs < sourceNowMs) {
        const next: StoryTimelineState = {
          ...prev,
          characterId: pid,
          updatedAt: wallNow,
          currentStoryDay: storyDay,
          currentStoryTime: storyTime || prev.currentStoryTime || undefined,
        }
        await personaDb.putStoryTimelineState(next)
        wrote = true
      }

      if (syncClock) {
        const settings = await personaDb.getCharacterTimeSettings(pid)
        const mode = settings?.config?.mode ?? 'system'
        const peerLive =
          mode === 'custom' && typeof settings?.config?.customBaseTime === 'number'
            ? settings.config.customBaseTime
            : null
        const needsClock =
          mode !== 'custom' ||
          settings?.timePerceptionEnabled === false ||
          peerLive == null ||
          peerLive < sourceNowMs
        const clearDetach = settings?.preferSystemClockDespiteStoryFloor === true
        if (needsClock || clearDetach) {
          await personaDb.putCharacterTimeSettings({
            characterId: pid,
            config: needsClock
              ? normalizeWeChatTimeConfig({
                  mode: 'custom',
                  customBaseTime: sourceNowMs,
                  customAnchorRealTime: wallNow,
                  timeMultiplier: settings?.config?.timeMultiplier ?? 1,
                })
              : normalizeWeChatTimeConfig(settings?.config),
            timePerceptionEnabled: needsClock ? true : settings?.timePerceptionEnabled !== false,
            // 线下/人脉推进重新锁定线上时钟
            preferSystemClockDespiteStoryFloor: false,
          })
          wrote = true
        }
      }

      if (wrote && pid !== sourceId) syncedPeerIds.push(pid)
    } catch {
      /* ignore per-peer failures */
    }
  }

  return { syncedPeerIds }
}

/** 从已落库的源角色状态同步人脉「现在」（无 day 则跳过） */
export async function syncNetworkStoryNowFromCharacterState(
  sourceCharacterId: string,
  opts?: { storyNowMs?: number | null; syncOnlineClock?: boolean },
): Promise<{ syncedPeerIds: string[] }> {
  const cid = sourceCharacterId.trim()
  if (!cid) return { syncedPeerIds: [] }
  const state = await personaDb.getStoryTimelineState(cid)
  const day = state?.currentStoryDay?.trim()
  if (!day) return { syncedPeerIds: [] }
  return syncNetworkStoryNowFromPrimary({
    sourceCharacterId: cid,
    storyDay: day,
    storyTime: state?.currentStoryTime,
    storyNowMs: opts?.storyNowMs ?? storyDayTimeToMs(day, state?.currentStoryTime),
    syncOnlineClock: opts?.syncOnlineClock,
  })
}

/** 展示用：人脉剧情锚点文案 */
export function formatNetworkStoryNowLabel(storyDay?: string | null, storyTime?: string | null): string {
  return composeStoryTimelineCalendarAnchorLabel({
    story_day: String(storyDay ?? '').trim() || undefined,
    story_time: String(storyTime ?? '').trim() || undefined,
  })
}
