import { loadDatingPlotsFromKv } from '../unifiedMemoryAutoSummary'
import { resolveStoryCalendarAnchorFromPlots } from '../memory/storyTimelineCalendarContext'
import {
  composeStoryTimelineCalendarAnchorLabel,
  createEmptyStoryTimelineState,
  formatGregorianStoryDayFromMs,
  formatStoryTimelineListTimeLabel,
  parseStoryCalendarDayStartMs,
  type StoryTimelineState,
} from '../memory/storyTimelineTypes'
import { personaDb } from '../newFriendsPersona/idb'
import {
  syncNetworkStoryNowFromPrimary,
} from '../memory/storyTimelineNetworkNowSync'
import type { WeChatTimeConfig } from '../newFriendsPersona/types'
import { normalizeWeChatTimeConfig } from './wechatTimeUtils'

export type StoryTimeFloorInfo = {
  /** 用户可见剧情锚点文案 */
  label: string
  /** 不可早于该毫秒（含钟点；无钟点则为当日 0 点） */
  floorMs: number | null
  hasFloor: boolean
}

const WALL_CLOCK_SLACK_MS = 3 * 60_000
const STORY_AHEAD_OF_FLOOR_SLACK_MS = 2 * 60_000

/** 是否仍紧贴真实墙钟（用于识别「未按剧情对齐的系统时间」） */
export function looksLikeRealWallClockMs(
  ms: number,
  nowMs: number = Date.now(),
  slackMs: number = WALL_CLOCK_SLACK_MS,
): boolean {
  if (!Number.isFinite(ms) || !Number.isFinite(nowMs) || ms <= 0) return false
  return Math.abs(ms - nowMs) <= Math.max(0, slackMs)
}

/**
 * 自定义时钟是否已落在「剧情锚点往后」的故事日历上。
 * 系统墙钟即使数值大于剧情日（含同年：真实 2026-08-04 vs 剧情 2026-08-03），也不算对齐。
 */
export function isWeChatClockAlignedWithStoryFloor(
  liveMs: number,
  floorMs: number,
  mode: WeChatTimeConfig['mode'],
  opts?: { customBaseTime?: number; nowMs?: number },
): boolean {
  if (mode !== 'custom') return false
  if (!Number.isFinite(liveMs) || !Number.isFinite(floorMs) || liveMs < floorMs) return false

  const now = typeof opts?.nowMs === 'number' && Number.isFinite(opts.nowMs) ? opts.nowMs : Date.now()
  const base =
    typeof opts?.customBaseTime === 'number' && Number.isFinite(opts.customBaseTime)
      ? opts.customBaseTime
      : null

  // 自定义基点仍是「刚从真实墙钟抄来」且明显晚于剧情锚点 → 未对齐，应对齐到锚点
  if (
    base != null &&
    looksLikeRealWallClockMs(base, now) &&
    base - floorMs > STORY_AHEAD_OF_FLOOR_SLACK_MS
  ) {
    return false
  }
  // 未提供基点时：live 本身贴墙钟且远超锚点，同样视为未对齐（防误把剧情「现在」推到系统时间）
  if (
    base == null &&
    looksLikeRealWallClockMs(liveMs, now) &&
    liveMs - floorMs > STORY_AHEAD_OF_FLOOR_SLACK_MS
  ) {
    return false
  }

  const floorY = new Date(floorMs).getFullYear()
  const liveY = new Date(liveMs).getFullYear()
  if (liveY === floorY) return true
  // 允许跨年推进（如年末→次日清晨），但限制在锚点后 180 天内
  if (liveY === floorY + 1 && liveMs - floorMs <= 180 * 86_400_000) return true
  return false
}

function pad2(n: number) {
  return String(n).padStart(2, '0')
}

/** 墙钟毫秒 → 剧情时段 HH:mm */
export function formatStoryTimeClockFromMs(ms: number): string {
  const d = new Date(ms)
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

/** 从「2025年10月1日 … 22:30」类锚点解析毫秒（优先区间末段；含钟点） */
export function parseStoryAnchorLabelToMs(anchor: string | null | undefined): number | null {
  const raw = String(anchor ?? '').trim()
  if (!raw) return null
  const segments = raw.split(/\s*-\s*/)
  for (let i = segments.length - 1; i >= 0; i--) {
    const seg = segments[i]!.trim()
    const dayPart = seg.match(/^(\d{4}年\d{1,2}月\d{1,2}日)/)?.[1]
    if (!dayPart) continue
    const dayMs = parseStoryCalendarDayStartMs(dayPart)
    if (dayMs == null) continue
    const clock = seg.match(/(\d{1,2}):(\d{2})/)
    if (!clock) return dayMs
    const h = Math.min(23, Math.max(0, Number(clock[1])))
    const m = Math.min(59, Math.max(0, Number(clock[2])))
    return dayMs + h * 3_600_000 + m * 60_000
  }
  return null
}

function labelFromState(state: StoryTimelineState | null | undefined): string {
  if (!state) return ''
  return composeStoryTimelineCalendarAnchorLabel({
    story_day: state.currentStoryDay,
    story_time: state.currentStoryTime,
  }).trim()
}

async function resolvePlotDerivedStoryFloor(characterId: string): Promise<StoryTimeFloorInfo | null> {
  const cid = characterId.trim()
  if (!cid) return null

  try {
    const plots = await loadDatingPlotsFromKv(cid)
    const plotLabel = resolveStoryCalendarAnchorFromPlots(
      plots.map((p) => ({
        type: p.type,
        timelineDelta: p.type === 'ai' ? p.timelineDelta : undefined,
        timelineSnapshot: p.timelineSnapshot,
      })),
    ).trim()
    if (plotLabel) {
      const floorMs = parseStoryAnchorLabelToMs(plotLabel)
      if (floorMs != null) {
        return { label: plotLabel, floorMs, hasFloor: true }
      }
    }
  } catch {
    /* ignore plot load failures */
  }

  try {
    const rows = await personaDb.listStoryTimelinePlotRowsByCharacterId(cid)
    for (let i = rows.length - 1; i >= 0; i -= 1) {
      const label = formatStoryTimelineListTimeLabel(rows[i]?.rowText ?? '').trim()
      if (!label) continue
      const floorMs = parseStoryAnchorLabelToMs(label)
      if (floorMs == null) continue
      // 跳过已贴墙钟的行，优先找回真实剧情锚点
      if (looksLikeRealWallClockMs(floorMs)) continue
      return { label, floorMs, hasFloor: true }
    }
  } catch {
    /* ignore row load failures */
  }

  return null
}

/** 线上时钟是否已主动脱离剧情 floor（重置为系统时间后） */
export function isPreferSystemClockDespiteStoryFloor(
  row: { preferSystemClockDespiteStoryFloor?: boolean } | null | undefined,
): boolean {
  return row?.preferSystemClockDespiteStoryFloor === true
}

/**
 * 该角色私聊会话中最新一条消息的时间戳（含玩家气泡）。
 * 用于防止线上「现在」拨到比已发出消息更早，导致时间戳倒序。
 */
export async function resolveCharacterChatMessageTimeFloor(
  characterId: string,
): Promise<{ floorMs: number | null; hasFloor: boolean }> {
  const cid = characterId.trim()
  if (!cid) return { floorMs: null, hasFloor: false }
  try {
    const maxTs = await personaDb.peekLatestTimestampInPeerPrivateChats(cid)
    if (maxTs == null || !Number.isFinite(maxTs) || maxTs <= 0) {
      return { floorMs: null, hasFloor: false }
    }
    // +60s：允许紧挨最后一条消息继续聊，避免与同毫秒消息抢序
    return { floorMs: maxTs + 60_000, hasFloor: true }
  } catch {
    return { floorMs: null, hasFloor: false }
  }
}

/**
 * 将本角色线上时钟重置为设备本地时间，并解除剧情锚点对线上时钟的锁定。
 * 不改写线下摘要 / 约会剧情正文；下次线下推进 syncOnlineClock 时会重新锁定。
 *
 * 若系统墙钟早于该角色私聊最后一条消息时间戳，会钳到「最后消息 + 1 分钟」，
 * 避免新消息带着更早时间戳插回历史 / 时间戳倒序（22:16 后面出现 13:30）。
 */
export async function resetOnlineClockToSystemTime(
  characterId: string,
): Promise<{ chosenTimeMs: number; clampedToLastMessage: boolean }> {
  const cid = characterId.trim()
  if (!cid) throw new Error('missing_character_id')

  const wallNow = Date.now()
  const chatFloor = await resolveCharacterChatMessageTimeFloor(cid)
  let chosen = wallNow
  let clampedToLastMessage = false
  if (chatFloor.hasFloor && chatFloor.floorMs != null && chosen < chatFloor.floorMs) {
    chosen = chatFloor.floorMs
    clampedToLastMessage = true
  }

  const prev = (await personaDb.getStoryTimelineState(cid)) ?? createEmptyStoryTimelineState(cid)
  const next: StoryTimelineState = {
    ...prev,
    characterId: cid,
    updatedAt: wallNow,
    todos: [],
  }
  delete (next as { currentStoryDay?: string }).currentStoryDay
  delete (next as { currentStoryTime?: string }).currentStoryTime
  await personaDb.putStoryTimelineState(next)

  const settings = await personaDb.getCharacterTimeSettings(cid)
  // 被会话消息钳住时必须用 custom，否则 system 模式会立刻又跟墙钟跑回更早时刻
  const mode: WeChatTimeConfig['mode'] = clampedToLastMessage ? 'custom' : 'system'
  await personaDb.putCharacterTimeSettings({
    characterId: cid,
    config: normalizeWeChatTimeConfig({
      mode,
      customBaseTime: chosen,
      customAnchorRealTime: wallNow,
      timeMultiplier: settings?.config?.timeMultiplier ?? 1,
    }),
    timePerceptionEnabled: settings?.timePerceptionEnabled !== false,
    preferSystemClockDespiteStoryFloor: !clampedToLastMessage,
  })

  return { chosenTimeMs: chosen, clampedToLastMessage }
}

/**
 * 将线上时钟重新对齐到当前剧情时间点（线下摘要 / plot / 人脉锚点），并恢复剧情锁定。
 * 用于手误「重置为系统时间」后的撤销。
 */
export async function restoreOnlineClockToStoryTime(
  characterId: string,
): Promise<{ storyLabel: string; chosenTimeMs: number }> {
  const cid = characterId.trim()
  if (!cid) throw new Error('missing_character_id')

  const settings = await personaDb.getCharacterTimeSettings(cid)
  // 先清脱离标记，否则 fusion 仍会把 floor 当成无效
  await personaDb.putCharacterTimeSettings({
    characterId: cid,
    config: normalizeWeChatTimeConfig(settings?.config),
    timePerceptionEnabled: true,
    preferSystemClockDespiteStoryFloor: false,
  })

  const floor = await resolveCharacterStoryTimeFloor(cid)
  if (!floor.hasFloor || floor.floorMs == null) {
    throw new Error('no_story_floor')
  }

  const result = await applyOnlineChatTimeFusion({
    characterId: cid,
    chosenTimeMs: floor.floorMs,
    timeMultiplier: settings?.config?.timeMultiplier ?? 1,
    timePerceptionEnabled: true,
    mode: 'custom',
  })

  return {
    storyLabel: result.storyLabel || floor.label,
    chosenTimeMs: result.chosenTimeMs,
  }
}

/** 解析角色当前剧情时间下限（state 优先，否则线下 plot / 时间轴行锚点） */
export async function resolveCharacterStoryTimeFloor(characterId: string): Promise<StoryTimeFloorInfo> {
  const cid = characterId.trim()
  if (!cid) return { label: '', floorMs: null, hasFloor: false }

  const state = await personaDb.getStoryTimelineState(cid)
  const stateLabel = labelFromState(state)
  const stateMs = stateLabel ? parseStoryAnchorLabelToMs(stateLabel) : null
  const plotFloor = await resolvePlotDerivedStoryFloor(cid)

  // state「现在」已被墙钟污染时，回退到剧情条目/线下锚点（如 8/3 17:30）
  if (
    stateMs != null &&
    looksLikeRealWallClockMs(stateMs) &&
    plotFloor?.floorMs != null &&
    !looksLikeRealWallClockMs(plotFloor.floorMs) &&
    plotFloor.floorMs < stateMs
  ) {
    return plotFloor
  }

  if (stateLabel && stateMs != null) {
    return { label: stateLabel, floorMs: stateMs, hasFloor: true }
  }

  // 人脉根剧情锚点：当前角色尚无「现在」时，回退到同人脉主角，避免 NPC 落到系统墙钟
  try {
    const self = await personaDb.getCharacter(cid)
    const rootId = self?.generatedForCharacterId?.trim()
    if (rootId && rootId !== cid) {
      const rootState = await personaDb.getStoryTimelineState(rootId)
      const rootLabel = labelFromState(rootState)
      if (rootLabel) {
        const floorMs = parseStoryAnchorLabelToMs(rootLabel)
        if (floorMs != null && !looksLikeRealWallClockMs(floorMs)) {
          return { label: rootLabel, floorMs, hasFloor: true }
        }
      }
    }
  } catch {
    /* ignore */
  }

  if (plotFloor) return plotFloor

  if (state?.currentStoryDay?.trim() || state?.currentStoryTime?.trim()) {
    const fallback = [state.currentStoryDay?.trim(), state.currentStoryTime?.trim()].filter(Boolean).join(' ')
    return { label: fallback, floorMs: parseStoryAnchorLabelToMs(fallback), hasFloor: true }
  }

  return { label: '', floorMs: null, hasFloor: false }
}

export type ApplyOnlineChatTimeFusionParams = {
  characterId: string
  /** 设定的线上/故事「现在」墙钟毫秒 */
  chosenTimeMs: number
  timeMultiplier: number
  /**
   * 无剧情锚点时保留用户对「时间感知」的选择；
   * 有剧情锚点时强制 true。
   */
  timePerceptionEnabled?: boolean
  /** 无剧情锚点时是否允许 system 模式；有锚点时强制 custom */
  mode?: WeChatTimeConfig['mode']
}

/**
 * 保存线上时间设置。
 * - 有剧情锚点：强制 custom + 时间感知开；两边一起推（时钟 + storyTimelineState）；chosen 不得早于 floor。
 * - 无剧情锚点：仅写角色时钟设置（与旧版一致），不改剧情轴。
 */
export async function applyOnlineChatTimeFusion(
  params: ApplyOnlineChatTimeFusionParams,
): Promise<{ clamped: boolean; chosenTimeMs: number; storyLabel: string; advancedStory: boolean }> {
  const cid = params.characterId.trim()
  if (!cid) throw new Error('missing_character_id')

  const settings = await personaDb.getCharacterTimeSettings(cid)
  const preferSystem = isPreferSystemClockDespiteStoryFloor(settings)
  const floor = await resolveCharacterStoryTimeFloor(cid)
  const chatFloor = await resolveCharacterChatMessageTimeFloor(cid)
  let chosen = Math.round(params.chosenTimeMs)
  if (!Number.isFinite(chosen) || chosen <= 0) chosen = Date.now()
  let clamped = false
  // 已主动脱离剧情锁定时：线上时钟不受剧情 floor 钳制 / 强制 custom
  const hasFloor = !preferSystem && floor.hasFloor && floor.floorMs != null
  if (hasFloor && floor.floorMs != null && chosen < floor.floorMs) {
    chosen = floor.floorMs
    clamped = true
  }
  // 无论是否脱离剧情锁定：都不能早于该角色私聊最后一条消息（防时间戳倒序）
  if (chatFloor.hasFloor && chatFloor.floorMs != null && chosen < chatFloor.floorMs) {
    chosen = chatFloor.floorMs
    clamped = true
  }

  const mode: WeChatTimeConfig['mode'] = hasFloor ? 'custom' : params.mode === 'system' ? 'system' : 'custom'
  const perception = hasFloor ? true : params.timePerceptionEnabled !== false
  const now = Date.now()
  const config = normalizeWeChatTimeConfig({
    mode,
    customBaseTime: mode === 'custom' ? chosen : now,
    customAnchorRealTime: now,
    timeMultiplier: params.timeMultiplier,
  })

  await personaDb.putCharacterTimeSettings({
    characterId: cid,
    config,
    timePerceptionEnabled: perception,
    preferSystemClockDespiteStoryFloor: hasFloor ? false : preferSystem,
  })

  if (!hasFloor) {
    return { clamped, chosenTimeMs: chosen, storyLabel: floor.label, advancedStory: false }
  }

  const storyDay = formatGregorianStoryDayFromMs(chosen)
  const storyTime = formatStoryTimeClockFromMs(chosen)
  const prev = (await personaDb.getStoryTimelineState(cid)) ?? createEmptyStoryTimelineState(cid)
  const next: StoryTimelineState = {
    ...prev,
    characterId: cid,
    updatedAt: now,
    currentStoryDay: storyDay,
    currentStoryTime: storyTime,
    todos: [],
  }
  await personaDb.putStoryTimelineState(next)
  try {
    await syncNetworkStoryNowFromPrimary({
      sourceCharacterId: cid,
      storyDay,
      storyTime,
      storyNowMs: chosen,
      syncOnlineClock: true,
    })
  } catch {
    /* ignore */
  }

  const storyLabel = composeStoryTimelineCalendarAnchorLabel({
    story_day: storyDay,
    story_time: storyTime,
  })

  return { clamped, chosenTimeMs: chosen, storyLabel, advancedStory: true }
}

/**
 * 将剧情轴「现在」与线上流动时钟对齐（仅前进、不早于剧情锚点）。
 * - 无剧情锚点 / 非 custom / 时间感知关 / 墙钟未落在故事日历上：不写库。
 * - 供私聊 AI 注入、控制台展示等在「时钟已流逝但未点保存」时补同步。
 */
export async function syncStoryTimelineNowFromOnlineClock(params: {
  characterId: string
  liveTimeMs: number
}): Promise<{ storyLabel: string; synced: boolean }> {
  const cid = params.characterId.trim()
  if (!cid) return { storyLabel: '', synced: false }

  const live = Math.round(params.liveTimeMs)
  if (!Number.isFinite(live) || live <= 0) return { storyLabel: '', synced: false }

  const floor = await resolveCharacterStoryTimeFloor(cid)
  if (!floor.hasFloor || floor.floorMs == null) {
    return { storyLabel: floor.label, synced: false }
  }

  const settings = await personaDb.getCharacterTimeSettings(cid)
  if (isPreferSystemClockDespiteStoryFloor(settings)) {
    return { storyLabel: floor.label, synced: false }
  }
  const mode = settings?.config?.mode ?? 'system'
  if (mode !== 'custom' || settings?.timePerceptionEnabled === false) {
    return { storyLabel: floor.label, synced: false }
  }

  let chosen = live
  if (chosen < floor.floorMs) chosen = floor.floorMs

  const cfg = normalizeWeChatTimeConfig(settings?.config)
  if (
    !isWeChatClockAlignedWithStoryFloor(chosen, floor.floorMs, 'custom', {
      customBaseTime: cfg.customBaseTime,
    })
  ) {
    return { storyLabel: floor.label, synced: false }
  }

  const storyDay = formatGregorianStoryDayFromMs(chosen)
  const storyTime = formatStoryTimeClockFromMs(chosen)
  const storyLabel = composeStoryTimelineCalendarAnchorLabel({
    story_day: storyDay,
    story_time: storyTime,
  })

  const prev = (await personaDb.getStoryTimelineState(cid)) ?? createEmptyStoryTimelineState(cid)
  const prevDay = prev.currentStoryDay?.trim() || ''
  const prevTime = prev.currentStoryTime?.trim() || ''
  if (prevDay === storyDay && prevTime === storyTime) {
    return { storyLabel, synced: false }
  }

  const next: StoryTimelineState = {
    ...prev,
    characterId: cid,
    updatedAt: Date.now(),
    currentStoryDay: storyDay,
    currentStoryTime: storyTime,
    todos: [],
  }
  await personaDb.putStoryTimelineState(next)
  try {
    await syncNetworkStoryNowFromPrimary({
      sourceCharacterId: cid,
      storyDay,
      storyTime,
      storyNowMs: chosen,
      syncOnlineClock: true,
    })
  } catch {
    /* ignore */
  }
  return { storyLabel, synced: true }
}
