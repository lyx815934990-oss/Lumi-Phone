/** 读取角色时间轴公历跨度，并组装可变人生提示词块。 */

import { personaDb } from '../newFriendsPersona/idb'
import type { Character, PlayerIdentity } from '../newFriendsPersona/types'
import {
  composeStoryTimelineCalendarAnchorLabel,
  formatGregorianStoryDayFromMs,
  formatStoryTimelineListTimeLabel,
} from '../memory/storyTimelineTypes'
import { resolveCharacterStoryNowMs } from '../time/messagesTabStoryTime'
import {
  emptyLifeMutableSheet,
  extractLifeStoryDayBounds,
  formatLifePromptBlock,
  overlayFromSnapshot,
  parseLifeStoryDayMs,
  pickEarlierStoryDay,
  pickLaterStoryDay,
  resolveLifeSnapshot,
} from './compute'
import type { LifeCardOverlay, LifeMutableSheet, LifeStorySpan } from './types'

export async function loadCharacterStorySpan(characterId: string): Promise<LifeStorySpan> {
  const cid = characterId.trim()
  if (!cid) return { startDay: null, nowDay: null }
  const [state, rows, storyNowMs, timeRow, globalSettings] = await Promise.all([
    personaDb.getStoryTimelineState(cid),
    personaDb.listStoryTimelinePlotRowsByCharacterId(cid),
    resolveCharacterStoryNowMs(cid).catch(() => null),
    personaDb.getCharacterTimeSettings(cid).catch(() => null),
    personaDb.getGlobalSettings().catch(() => null),
  ])
  let startDay: string | null = null
  let nowFromRows: string | null = null
  let nowDay: string | null = null

  const absorbStart = (raw: string | null | undefined) => {
    const { first } = extractLifeStoryDayBounds(raw)
    startDay = pickEarlierStoryDay(startDay, first)
  }
  const absorbNowCandidate = (raw: string | null | undefined, into: 'rows' | 'now') => {
    const { last } = extractLifeStoryDayBounds(raw)
    if (into === 'rows') nowFromRows = pickLaterStoryDay(nowFromRows, last)
    else nowDay = pickLaterStoryDay(nowDay, last)
  }

  for (const row of rows) {
    const label = formatStoryTimelineListTimeLabel(row.rowText ?? '')
    absorbStart(label)
    absorbNowCandidate(label, 'rows')
  }

  const stateLabel = composeStoryTimelineCalendarAnchorLabel({
    story_day: state?.currentStoryDay,
    story_time: state?.currentStoryTime,
  })
  absorbStart(stateLabel)
  absorbStart(state?.currentStoryDay)

  // 「现在」优先取摘要行/剧情锚点的较晚日；state 仅在不晚于行锚点时并入，
  // 避免误生成到 2029 后手改回 2028，state 仍钉死更高年份。
  nowDay = nowFromRows
  const stateNowMs = parseLifeStoryDayMs(state?.currentStoryDay)
  const rowsNowMs = parseLifeStoryDayMs(nowFromRows)
  if (state?.currentStoryDay?.trim()) {
    if (rowsNowMs == null || stateNowMs == null || stateNowMs <= rowsNowMs) {
      nowDay = pickLaterStoryDay(nowDay, state.currentStoryDay.trim())
    }
  }

  if (typeof storyNowMs === 'number' && Number.isFinite(storyNowMs) && storyNowMs > 0) {
    const liveDay = formatGregorianStoryDayFromMs(storyNowMs)
    const liveMs = parseLifeStoryDayMs(liveDay)
    // 线上拨钟若明显晚于全部线下摘要（常见：错推进一年后未拨回），不单独抬高账本「现在」
    if (liveMs != null && (rowsNowMs == null || liveMs <= rowsNowMs + 86400000 * 45)) {
      nowDay = pickLaterStoryDay(nowDay, liveDay)
    } else if (rowsNowMs == null) {
      nowDay = pickLaterStoryDay(nowDay, liveDay)
    }
  }

  /** 自定义时钟的拨钟原点 = 用户设定的开篇时间，不能把「现在」当成开篇。 */
  const clockCfg = timeRow?.config?.mode === 'custom' ? timeRow.config : globalSettings?.globalTimeConfig
  if (clockCfg?.mode === 'custom') {
    const originMs = clockCfg.customBaseTime
    if (typeof originMs === 'number' && Number.isFinite(originMs) && originMs > 0) {
      const originDay = formatGregorianStoryDayFromMs(originMs)
      const originParsed = parseLifeStoryDayMs(originDay)
      const nowParsed = parseLifeStoryDayMs(nowDay)
      if (originParsed != null && (nowParsed == null || originParsed < nowParsed)) {
        startDay = pickEarlierStoryDay(startDay, originDay)
      }
    }
  }

  if (!nowDay) nowDay = startDay
  return { startDay, nowDay }
}

export type PairLifePromptContext = {
  characterOverlay: LifeCardOverlay | null
  playerOverlay: LifeCardOverlay | null
  characterBlock: string
  playerBlock: string
}

function seedSheetClock(sheet: LifeMutableSheet, span: LifeStorySpan, cardAge: number | null): LifeMutableSheet {
  const next = { ...sheet }
  const originEarlierThanNow =
    Boolean(span.startDay) &&
    Boolean(span.nowDay) &&
    span.startDay !== span.nowDay &&
    (parseLifeStoryDayMs(span.startDay) ?? 0) < (parseLifeStoryDayMs(span.nowDay) ?? Number.POSITIVE_INFINITY)
  if (!next.storyStartDay.trim() && originEarlierThanNow && span.startDay) {
    next.storyStartDay = span.startDay
  }
  if (next.ageAtStart == null && typeof cardAge === 'number' && Number.isFinite(cardAge)) {
    next.ageAtStart = cardAge
  }
  return next
}

export async function loadPairLifePromptContext(params: {
  character: Character | null
  playerIdentity: PlayerIdentity | null
}): Promise<PairLifePromptContext> {
  const character = params.character
  const player = params.playerIdentity
  if (!character?.id) {
    return { characterOverlay: null, playerOverlay: null, characterBlock: '', playerBlock: '' }
  }
  const span = await loadCharacterStorySpan(character.id)
  const [charRow, playerRow] = await Promise.all([
    personaDb.getCharacterLifeMutable(character.id),
    player?.id
      ? personaDb.getPlayerLifeMutable(player.id, character.id)
      : Promise.resolve(null),
  ])

  const charSheet = seedSheetClock(charRow?.sheet ?? emptyLifeMutableSheet(), span, character.age)
  const charSnap = resolveLifeSnapshot({
    cardName: character.name,
    cardAge: character.age,
    cardGender: character.gender,
    cardIdentity: character.identity,
    birthdayMD: character.birthdayMD,
    sheet: charSheet,
    span,
  })
  const characterBlock = formatLifePromptBlock({
    title: '角色可变人生·本线当前',
    subject: 'character',
    snapshot: charSnap,
  })

  let playerBlock = ''
  let playerOverlay: LifeCardOverlay | null = null
  if (player?.id) {
    const pSheet = seedSheetClock(playerRow?.sheet ?? emptyLifeMutableSheet(), span, player.age)
    const pSnap = resolveLifeSnapshot({
      cardName: player.name,
      cardAge: player.age,
      cardGender: player.gender,
      cardIdentity: player.identity,
      birthdayMD: player.birthdayMD,
      sheet: pSheet,
      span,
    })
    playerBlock = formatLifePromptBlock({
      title: '玩家身份可变人生·本角色线',
      subject: 'player',
      snapshot: pSnap,
    })
    playerOverlay = overlayFromSnapshot(pSnap)
  }

  return {
    characterOverlay: overlayFromSnapshot(charSnap),
    playerOverlay,
    characterBlock,
    playerBlock,
  }
}
