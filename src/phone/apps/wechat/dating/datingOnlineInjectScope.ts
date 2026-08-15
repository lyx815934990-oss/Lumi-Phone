import {
  buildOfflinePlotGenerationTimelineRule,
  buildCrossChannelTimelineSnapshot,
  formatSystemRecordTime,
  resolveLastOfflineAiPlotTimestampMs,
} from '../wechatCrossChannelTimeline'
import { parseStoryCalendarDayStartMs } from '../memory/storyTimelineTypes'

export { resolveLastOfflineAiPlotTimestampMs }

/** 从故事内日历文案解析当日 0 点毫秒（如 `2025年10月8日 晚上`） */
function parseStoryCalendarLabelDayStartMs(label: string | null | undefined): number | null {
  const day = String(label ?? '').match(/(\d{4}年\d{1,2}月\d{1,2}日)/)?.[1]
  if (!day) return null
  return parseStoryCalendarDayStartMs(day)
}

/** 故事「现在」公历日是否已晚于线下末条 */
function isStoryNowCalendarAfterOfflineLast(
  storyNowLabel: string | null | undefined,
  offlineLastLabel: string | null | undefined,
): boolean {
  const nowMs = parseStoryCalendarLabelDayStartMs(storyNowLabel)
  const lastMs = parseStoryCalendarLabelDayStartMs(offlineLastLabel)
  if (nowMs == null || lastMs == null) return false
  return nowMs > lastMs
}

export function resolveDatingOnlineInjectMinTimestamp(params: {
  memorySummaryCursorTs: number | null
  lastOfflineAiPlotTs: number | null
}): number {
  const memFloor = (params.memorySummaryCursorTs ?? 0) + 1
  const plotFloor =
    params.lastOfflineAiPlotTs != null && Number.isFinite(params.lastOfflineAiPlotTs)
      ? params.lastOfflineAiPlotTs + 1
      : 0
  return Math.max(memFloor, plotFloor)
}

export type DatingOnlineInjectScopeMeta = {
  minMessageTimestamp: number
  lastOfflineAiPlotTs: number | null
  privateMessageCount: number
  onlineInjectMinTs: number | null
  onlineInjectMaxTs: number | null
  /** 线下末条故事内日历（参考锚点；未必等于「现在」） */
  storyCalendarAnchor?: string | null
  /** 故事内「现在」（剧情轴 / 线上推进后，可晚于线下末条） */
  storyNowLabel?: string | null
}

/** 从 prompt 方括号前缀提取故事内公历时刻（排除 `[…·落库]` 系统回退） */
export function extractStoryCalendarFromPromptBracket(text: string): string | null {
  for (const m of String(text ?? '').matchAll(/\[([^\]]+)\]/g)) {
    const inner = m[1]?.trim() ?? ''
    if (!inner || inner.includes('·落库')) continue
    if (/^\d{4}年/.test(inner)) return inner
  }
  return null
}

function resolveStoryNowAndOfflineLast(params: {
  storyCalendarAnchor?: string | null
  storyNowLabel?: string | null
}): { now: string; offlineLast: string } {
  const offlineLast = params.storyCalendarAnchor?.trim() || ''
  const now = params.storyNowLabel?.trim() || offlineLast
  return { now, offlineLast }
}

/** 线上日历日是否已晚于线下末条（跳时后常见） */
export function isOfflineStoryCalendarAdvanced(params: {
  storyCalendarAnchor?: string | null
  storyNowLabel?: string | null
}): boolean {
  const { now, offlineLast } = resolveStoryNowAndOfflineLast(params)
  if (!now || !offlineLast) return false
  return isStoryNowCalendarAfterOfflineLast(now, offlineLast)
}

/**
 * 线上跳时 / 剧情轴已推进后：线下开场不得续写末条国外酒店等现场。
 * 与「线下→线上」的时空错位铁律对称。
 */
export function buildOfflineCalendarAdvancedHandoffRule(params: {
  storyCalendarAnchor?: string | null
  storyNowLabel?: string | null
  peerName?: string | null
  hasOnlineInject?: boolean
}): string {
  const { now, offlineLast } = resolveStoryNowAndOfflineLast(params)
  if (!now || !offlineLast) return ''
  if (!isStoryNowCalendarAfterOfflineLast(now, offlineLast)) return ''
  const peer = params.peerName?.trim() || '约会对象'
  const onlineHint = params.hasOnlineInject
    ? `与「未总结·私聊」末条（学校/宿舍楼下见面等）`
    : `与线上已推进后的日常状态`
  return (
    `【线上跳时·线下开场铁律（最高优先级｜高于「最近剧情」末条场所）】\n` +
    `- 故事内「现在」= **${now}**，已**晚于**「最近剧情」末条日历 **${offlineLast}**（用户在聊天室改过剧情时间/地点，或线上时间设置往后跳过）。\n` +
    `- 「最近剧情」末条若仍在国外/酒店/旅途/当地交通，是 **数日前已发生** 的往事实录，**不是**本轮开场现场；**禁止**直接续写该现场、同梗旅游桥段或「还在国外继续玩」。\n` +
    `- **开场时空**：须落在 **${now}**，地点优先对照【剧情时间轴·当前状态】${onlineHint}；冲突时**丢弃**末条旅游现场。\n` +
    `- **间隔**：须用一两句旁白交代回国/到校/换日等间隔（即使正文未单独写过回国段）；**禁止**无过渡仍写「此刻仍在国外」。\n` +
    `- **[TIMELINE] / story_day**：公历年与日必须对齐「现在」= **${now}**（含年份）；**禁止**写成末条那年（例如现在已是 2027 却写 2026）。\n` +
    `- 态度、称呼、已发生事实仍可参考末条；但勿把末条同场接触写成此刻仍在发生。与 ${peer} 的当面戏按「现在」地点开场。\n\n`
  )
}

/** 线上→线下：故事内时刻对齐，防把设备 10:20 误读成剧情清晨 */
export function buildCrossChannelStoryTimeSyncRule(params: {
  storyCalendarAnchor?: string | null
  storyNowLabel?: string | null
  hasOnlineInject?: boolean
}): string {
  const { now, offlineLast } = resolveStoryNowAndOfflineLast(params)
  if (!now || params.hasOnlineInject === false) return ''
  const advanced = isStoryNowCalendarAfterOfflineLast(now, offlineLast)
  return (
    `【跨通道·故事内时刻对齐（最高优先级）】\n` +
    `- 当前故事内「现在」= **${now}**（以【剧情时间轴·当前状态】为准` +
    (offlineLast ? `；线下末条日历锚点参考：**${offlineLast}**` : '') +
    `）。\n` +
    (advanced
      ? `- 剧情轴当前锚点已**晚于**线下末条公历日（线上时间/聊天室推进过）：下方「尚未总结·私聊 / 近端原文」接在推进后的「现在」；**禁止**因末条是更早一夜/旅途而把线下开场拉回该夜或国外现场；正文与 timeline 年份须跟「现在」。\n`
      : `- 若剧情轴未相对末条推进：私聊在故事内理解为 **${now} 前后**（与线下末条同一时段/同一夜），是角色在该故事时刻**用手机远程发消息**。\n`) +
    `- 下方「未总结·私聊」为该角色**全部未总结线上原文**（与聊天室一致，**全部纳入、不按剧情日丢弃**）：跨日更早仍注入且角色已知，但**禁止**写成此刻刚聊。已写入记忆库的摘要见「已总结·长期记忆」。\n` +
    `- 若每条仍带方括号前缀，则为**设备真实发送/落库钟点**（你手机上几点点的发送），**不是**故事内剧情时刻；**禁止**把 10:20 等前缀误读成故事清晨、另一天或线下已过去的时段。\n` +
    `- 写线下承接时以 **${now}** 为时空锚；线上关没开「时间感知」也不改变本条对齐规则。\n\n`
  )
}

export function formatDatingOnlineInjectScopeFooter(meta: DatingOnlineInjectScopeMeta): string {
  if (meta.privateMessageCount <= 0) return ''
  const anchor =
    meta.lastOfflineAiPlotTs != null
      ? `上一轮线下 AI（${formatSystemRecordTime(meta.lastOfflineAiPlotTs)}·落库）`
      : '记忆总结游标'
  const span =
    meta.onlineInjectMinTs != null &&
    meta.onlineInjectMaxTs != null &&
    meta.onlineInjectMinTs !== meta.onlineInjectMaxTs
      ? `；设备落库跨度 ${formatSystemRecordTime(meta.onlineInjectMinTs)} → ${formatSystemRecordTime(meta.onlineInjectMaxTs)}`
      : meta.onlineInjectMaxTs != null
        ? `；末条设备落库 ${formatSystemRecordTime(meta.onlineInjectMaxTs)}`
        : ''
  const { now, offlineLast } = resolveStoryNowAndOfflineLast(meta)
  const calendarAdvanced = isStoryNowCalendarAfterOfflineLast(now, offlineLast)
  const timeNote = now
    ? `故事内「现在」= **${now}**` +
      (calendarAdvanced
        ? `（剧情轴已相对线下末条 **${offlineLast}** 推进；末条旅途/酒店为往事；**禁止**倒回）`
        : offlineLast
          ? `（与线下末条对齐）`
          : '') +
      `；${meta.onlineInjectMinTs != null ? '设备落库钟点见各行前缀或本注' : '本块按发送顺序排列'}，**勿把设备钟点当剧情时刻**`
    : `每条前缀为**系统落库时刻**（真实钟点，非剧情时间）`
  return (
    `（↑ 未总结私聊全部纳入（约 ${meta.privateMessageCount} 条；自${anchor}相关时段起参考）${span}；` +
    `${timeNote}。跨日更早亦保留，仅禁止当此刻；已总结摘要见长期记忆块。）`
  )
}

export function formatDatingGroupOnlineInjectScopeFooter(params: {
  lastOfflineAiPlotTs: number | null
  lineCount: number
}): string {
  if (params.lineCount <= 0) return ''
  const anchor =
    params.lastOfflineAiPlotTs != null
      ? `上一轮线下 AI（${formatSystemRecordTime(params.lastOfflineAiPlotTs)}）`
      : '记忆总结游标'
  return (
    `（↑ 本块仅含自${anchor}之后至本次线下生成前的未总结群聊；每条前缀为**系统落库时刻**（真实钟点，非剧情时间）。` +
    `更早内容禁止自行引用，除非长期记忆/向量召回已命中。）`
  )
}

/** 约会 system prompt：系统落库时刻·跨通道先后 + 线上时间窗 */
export function formatDatingOnlineTemporalScopePromptRule(
  meta: DatingOnlineInjectScopeMeta,
  generationTs = Date.now(),
): string {
  if (meta.privateMessageCount <= 0 && meta.lastOfflineAiPlotTs == null) return ''
  const snap = buildCrossChannelTimelineSnapshot({
    lastOfflineAiPlotTs: meta.lastOfflineAiPlotTs,
    onlineInjectMinTs: meta.onlineInjectMinTs,
    onlineInjectMaxTs: meta.onlineInjectMaxTs,
    generationTs,
  })
  return buildOfflinePlotGenerationTimelineRule(snap)
}

/** 取私聊注入块末尾若干条，供线上→线下开场锚点。 */
export function extractLatestOnlineChatAnchor(body: string, maxLines = 6): string {
  const lines = String(body ?? '')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.startsWith('- ') && l.includes('[私聊・'))
  if (!lines.length) return ''
  return lines
    .slice(-Math.max(1, maxLines))
    .map((l) => (l.length > 280 ? `…${l.slice(-280)}` : l))
    .join('\n')
}

/** 约会页生成线下剧情：线上末条空间/待兑现须直接承接，防无过渡跳次日。 */
export function buildOfflineOnlineSpatialContinuityRule(params: {
  unsPrivBlock: string
  onlineInjectScope?: DatingOnlineInjectScopeMeta | null
  peerName?: string | null
}): string {
  const scope = params.onlineInjectScope
  if (!scope) return ''
  const peer = params.peerName?.trim() || '约会对象'
  const anchor = extractLatestOnlineChatAnchor(params.unsPrivBlock)
  const hasOnlineMaterial =
    scope.privateMessageCount > 0 || Boolean(String(params.unsPrivBlock ?? '').trim())
  if (!hasOnlineMaterial) return ''
  const { now, offlineLast } = resolveStoryNowAndOfflineLast(scope)
  const calendarAdvanced = isStoryNowCalendarAfterOfflineLast(now, offlineLast)
  const countLabel =
    scope.privateMessageCount > 0 ? String(scope.privateMessageCount) : '近端'
  const lines = [
    `【线上→线下·承接铁律（最高优先级）】`,
    ...(now
      ? [
          `- **故事内时刻**：故事「现在」= **${now}**` +
            (calendarAdvanced
              ? `（线下末条参考 **${offlineLast}**；公历日已推进，**禁止**倒回末条夜/旅途；timeline 年份跟「现在」）`
              : offlineLast && offlineLast !== now
                ? `（线下末条参考 **${offlineLast}**；轴文案已变，仍按「现在」理解）`
                : offlineLast
                  ? `（与线下末条 **${offlineLast}** 对齐）`
                  : '') +
            `；下列微信在故事内接在该「现在」前后，不是设备落库钟点所示的另一天。`,
        ]
      : []),
    `- 「未总结·私聊」含**全部未总结线上原文**（约 ${countLabel} 条；与聊天室一致）：角色**已知**；本轮线下须承接。跨日更早勿当此刻刚聊。已总结摘要见长期记忆。`,
    ...(calendarAdvanced
      ? [
          `- **地点（跳时后）**：以【剧情时间轴·当前状态】与线上末条为准（如已回学校/宿舍楼下见面）；「最近剧情」末条国外/酒店仅为往事，**禁止**线下开场仍续写该旅途。`,
          `- **空间/待兑现**：线上末条若已约定当面见面/在校见面等，线下须**直接承接该约定**；**禁止**因旧线下稿仍在国外而无视线上已回国后的约定。`,
        ]
      : [
          `- **空间/待兑现**：线上末条若表明 ${peer} 在**门外/远程**、或已说出口「进去/过来/陪睡/别冻着/再不睡就进去」等待兑现，线下开场须**直接承接**（推门、隔门、进门、兑现或明确拒绝），**禁止**无视线上末条**无过渡**跳地点、或 ${peer} 像从未离线又端着全新道具出现。`,
        ]),
    `- **时序**：剧情轴未推进时，禁止把同一晚线上刚结束的情节无旁白清零成清晨；**若剧情轴当前锚点已推进到次日/新时段**，线下须按推进后的「现在」开场，并用旁白交代间隔，**禁止**倒回推进前的末夜。`,
    `- 微信是**远程消息**：线上 ${peer} 说「进去」= 稍后可能**真人进入**同一物理空间；若用户在线上**升级请求**（如「想陪睡」），线下须响应该升级，勿只重复旧版「门外守夜」桥段。`,
    `- 【尾声延展】/【剧情时间轴】旧摘要只约束态度/背景，**不得**覆盖线上末条待兑现承诺与空间事实` +
      (calendarAdvanced ? `；亦**不得**用旧线下旅游摘要覆盖跳时后的「现在」地点` : '') +
      `。`,
  ]
  if (anchor) {
    lines.push('', `【线上末条锚点（开场须承接）】`, anchor)
  }
  return `${lines.join('\n')}\n`
}
