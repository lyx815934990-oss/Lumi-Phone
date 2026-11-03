/**
 * 主回复同请求内「日历日程」判断/更新（对齐尾声延展 / 人生账本模式）
 */

import { personaDb } from '../newFriendsPersona/idb'
import type {
  Character,
  PlayerIdentity,
  ScheduleCalendarEvent,
  ScheduleCalendarEventStatus,
  ScheduleDurationUnit,
} from '../newFriendsPersona/types'
import {
  closePastScheduleCalendarEvents,
  formatGregorianStoryDay,
  normalizeScheduleCalendarEvents,
  parseGregorianStoryDayToMs,
  resolveCalendarAnchor,
  shiftGregorianStoryDay,
  type ScheduleCalendarAnchor,
} from './scheduleEntries'

export const SCHEDULE_CAL_PATCH_MARKER = '---SCHEDULE_CAL_PATCH---'

export const SCHEDULE_CAL_PATCH_UPDATED_EVENT = 'phone:schedule-cal-patch-updated'

export type ScheduleCalPatchUpdatedEventDetail = {
  appliedCount: number
  source?: 'model_inline'
  addedCount?: number
  updatedCount?: number
  /** status 标为 done / skipped 的条数 */
  completedCount?: number
  /** @deprecated 用 addedTitles / completedTitles / revisedTitles */
  titles?: string[]
  /** 新增事项名 */
  addedTitles?: string[]
  /** 已完成 / 已跳过事项名 */
  completedTitles?: string[]
  /** 其它修订（改备注/改状态为未到等） */
  revisedTitles?: string[]
}

function resolveScheduleOpTitle(
  op: ScheduleCalInlineOp,
  existingById?: Map<string, ScheduleCalendarEvent>,
): string {
  if (op.kind === 'add') {
    return op.activity?.trim() || '未命名行程'
  }
  const fromOp = op.activity?.trim() || op.note?.trim()
  if (fromOp) return fromOp
  const prev = existingById?.get(op.id)
  const fromExisting = prev?.activity?.trim() || prev?.note?.trim()
  if (fromExisting) return fromExisting
  if (op.status === 'done') return '行程已完成'
  if (op.status === 'skipped') return '行程已跳过'
  return '行程已更新'
}

/** 从 ops 汇总成就弹窗用摘要（新增 / 完成分区）；可传入写库前日程以解析 update 的真实事项名 */
export function summarizeScheduleCalOps(
  ops: ScheduleCalInlineOp[],
  existingEvents?: ScheduleCalendarEvent[] | null,
): {
  addedCount: number
  updatedCount: number
  completedCount: number
  titles: string[]
  addedTitles: string[]
  completedTitles: string[]
  revisedTitles: string[]
} {
  const existingById = new Map(
    (existingEvents ?? []).map((e) => [e.id, e] as const),
  )
  let addedCount = 0
  let updatedCount = 0
  let completedCount = 0
  const addedTitles: string[] = []
  const completedTitles: string[] = []
  const revisedTitles: string[] = []
  for (const op of ops) {
    if (op.kind === 'add') {
      addedCount += 1
      addedTitles.push(resolveScheduleOpTitle(op, existingById))
    } else {
      // 跳过库中不存在的 id，避免弹窗列出未真正写入的项
      if (existingById.size > 0 && !existingById.has(op.id)) continue
      updatedCount += 1
      const t = resolveScheduleOpTitle(op, existingById)
      if (op.status === 'done' || op.status === 'skipped') {
        completedCount += 1
        completedTitles.push(t)
      } else {
        revisedTitles.push(t)
      }
    }
  }
  const titles = [...addedTitles, ...completedTitles, ...revisedTitles].slice(0, 8)
  return {
    addedCount,
    updatedCount,
    completedCount,
    titles,
    addedTitles: addedTitles.slice(0, 6),
    completedTitles: completedTitles.slice(0, 6),
    revisedTitles: revisedTitles.slice(0, 6),
  }
}

export type ScheduleCalInlineAdd = {
  kind: 'add'
  storyDay: string
  startTime: string
  endTime?: string | null
  activity: string
  tag: string
  location: string
  durationAmount?: number | null
  durationUnit?: ScheduleDurationUnit | null
}

export type ScheduleCalInlineUpdate = {
  kind: 'update'
  id: string
  status?: ScheduleCalendarEventStatus
  note?: string
  activity?: string
  location?: string
  tag?: string
}

export type ScheduleCalInlineOp = ScheduleCalInlineAdd | ScheduleCalInlineUpdate

function uid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function parseHHmm(raw: string): string | null {
  const m = String(raw ?? '')
    .trim()
    .match(/^(\d{1,2}):(\d{2})$/)
  if (!m) return null
  const h = Number(m[1])
  const mi = Number(m[2])
  if (!Number.isFinite(h) || !Number.isFinite(mi) || h < 0 || h > 23 || mi < 0 || mi > 59) return null
  return `${String(h).padStart(2, '0')}:${String(mi).padStart(2, '0')}`
}

function parseDurationPhrase(
  raw: string,
): { amount: number; unit: ScheduleDurationUnit } | null {
  const t = raw.trim().replace(/\s+/g, '')
  if (!t) return null
  const m = t.match(/^(\d+(?:\.\d+)?)(分钟|分|小时|时|天|日|minute|min|hour|hr|day|d)$/i)
  if (!m) return null
  const amount = Number(m[1])
  if (!Number.isFinite(amount) || amount <= 0) return null
  const u = m[2]!.toLowerCase()
  let unit: ScheduleDurationUnit = 'minute'
  if (u === '小时' || u === '时' || u === 'hour' || u === 'hr' || u === 'h') unit = 'hour'
  else if (u === '天' || u === '日' || u === 'day' || u === 'd') unit = 'day'
  return { amount, unit }
}

function parseStatus(raw: string): ScheduleCalendarEventStatus | null {
  const t = raw.trim().toLowerCase()
  if (t === 'upcoming' || t === '未到' || t === '待办') return 'upcoming'
  if (t === 'past' || t === '已过期' || t === '已过') return 'past'
  if (t === 'done' || t === '已完成' || t === '完成') return 'done'
  if (t === 'skipped' || t === '已跳过' || t === '跳过' || t === '取消') return 'skipped'
  return null
}

/** 相对词 → 公历日（相对锚点） */
export function resolveRelativeStoryDay(
  raw: string,
  anchor: ScheduleCalendarAnchor,
): string | null {
  const t = raw.trim()
  if (!t) return null
  const abs = t.match(/(\d{4}年\d{1,2}月\d{1,2}日)/)?.[1]
  if (abs) return abs
  if (/今天|今日|今晚|今夜/.test(t)) return anchor.storyDay
  if (/明天|明日|明晚/.test(t)) return shiftGregorianStoryDay(anchor.storyDay, 1)
  if (/后天/.test(t)) return shiftGregorianStoryDay(anchor.storyDay, 2)
  if (/大后天/.test(t)) return shiftGregorianStoryDay(anchor.storyDay, 3)
  if (/昨天|昨日/.test(t)) return shiftGregorianStoryDay(anchor.storyDay, -1)
  if (/下周/.test(t)) return shiftGregorianStoryDay(anchor.storyDay, 7)
  return null
}

export function buildScheduleCalendarPatchOutputAppendix(opts?: {
  anchorLabel?: string | null
  existingEventsHint?: string | null
}): string {
  const anchor = opts?.anchorLabel?.trim()
    ? `当前时间锚点（推算「明天/今晚」时以此为准）：${opts.anchorLabel.trim()}`
    : '当前时间锚点：见上文剧情/系统时间；推算相对日时优先剧情「现在」。'
  const existing = opts?.existingEventsHint?.trim()
    ? `\n已有日历事项（更新时请用 id）：\n${opts.existingEventsHint.trim().slice(0, 2500)}\n`
    : ''

  return `
---------------------
【同一回复内必须追加：日历日程·判断标记（开关已开时每轮必交）】
**格式硬禁**：整段只用下面这种「标签 + 中文冒号字段」纯文本；**禁止 JSON**、禁止 \`\`\` 代码围栏、禁止 { } 对象、禁止数组。新增与**更新**同规则。
写完全部可见聊天与其它补丁段后，另起一行输出（必须完全一致）：
${SCHEDULE_CAL_PATCH_MARKER}

${anchor}
${existing}
① 无明确新安排、也无需改状态：
[SCHEDULE_CAL]
status：无变化

② 新增明确安排（可重复多个 ADD）：
[SCHEDULE_CAL_ADD]
day：2026年10月22日
time：19:00
end：20:30
activity：事项名称
tag：社交
location：地点
duration：90分钟

③ 更新已有事项（可重复；用于标完成/跳过/改备注）——同样禁止 JSON，只用字段行：
[SCHEDULE_CAL_UPDATE]
id：（上文已有事项 id）
status：已完成
note：简短依据

字段说明：
- day：公历「YYYY年M月D日」；也可用 今天/明天/后天/下周（系统会按锚点换算）
- time：HH:mm；end / duration 可选
- status：未到 / 已过期 / 已完成 / 已跳过（也可用 upcoming/past/done/skipped）
- **应写入**：角色自己决定、或对话里可核对的「时间+事项」安排
- **勿写入**：玩笑、模糊「改天再说」、无时间锚点的空口计划
- 「已过期」仅表示时刻已过；是否做过请用「已完成/已跳过」或留「已过期」由上下文判断——无明确完成证据勿写「已完成」
- 本段不得进入可见聊天气泡；无变化也必须交卷
---------------------
`.trim()
}

function isNoChangeBody(src: string): boolean {
  const t = src.trim()
  if (!t) return false
  if (/\[SCHEDULE_CAL\]/i.test(t) && /无变化|无更新|unchanged/i.test(t) && !/\[SCHEDULE_CAL_ADD\]/i.test(t) && !/\[SCHEDULE_CAL_UPDATE\]/i.test(t)) {
    return true
  }
  if (/status\s*[:：]\s*(无变化|无更新)/i.test(t) && !/\[SCHEDULE_CAL_ADD\]/i.test(t) && !/\[SCHEDULE_CAL_UPDATE\]/i.test(t)) {
    return true
  }
  return false
}

function parseFieldMap(block: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const line of block.split('\n')) {
    const m = line.match(/^([A-Za-z_\u4e00-\u9fff]+)\s*[:：]\s*(.*)$/)
    if (!m) continue
    const key = m[1]!.trim().toLowerCase()
    const val = m[2]!.trim()
    const aliases: Record<string, string> = {
      day: 'day',
      日期: 'day',
      日: 'day',
      time: 'time',
      时间: 'time',
      开始: 'time',
      end: 'end',
      结束: 'end',
      activity: 'activity',
      活动: 'activity',
      事项: 'activity',
      tag: 'tag',
      标签: 'tag',
      分类: 'tag',
      location: 'location',
      地点: 'location',
      duration: 'duration',
      时长: 'duration',
      id: 'id',
      status: 'status',
      状态: 'status',
      note: 'note',
      备注: 'note',
      说明: 'note',
    }
    const canon = aliases[key] ?? key
    out[canon] = val
  }
  return out
}

function parseOpsFromBody(body: string, anchor: ScheduleCalendarAnchor): ScheduleCalInlineOp[] {
  const ops: ScheduleCalInlineOp[] = []
  const addRe = /\[SCHEDULE_CAL_ADD\]([\s\S]*?)(?=\[SCHEDULE_CAL_ADD\]|\[SCHEDULE_CAL_UPDATE\]|\[SCHEDULE_CAL\]|$)/gi
  const updRe = /\[SCHEDULE_CAL_UPDATE\]([\s\S]*?)(?=\[SCHEDULE_CAL_ADD\]|\[SCHEDULE_CAL_UPDATE\]|\[SCHEDULE_CAL\]|$)/gi
  let m: RegExpExecArray | null
  while ((m = addRe.exec(body))) {
    const f = parseFieldMap(m[1] ?? '')
    const dayRaw = f.day ?? ''
    const storyDay =
      resolveRelativeStoryDay(dayRaw, anchor) ||
      dayRaw.match(/(\d{4}年\d{1,2}月\d{1,2}日)/)?.[1] ||
      ''
    const startTime = parseHHmm(f.time ?? '')
    const activity = (f.activity ?? '').trim()
    if (!storyDay || !startTime || !activity) continue
    const endTime = f.end ? parseHHmm(f.end) : null
    const dur = f.duration ? parseDurationPhrase(f.duration) : null
    ops.push({
      kind: 'add',
      storyDay,
      startTime,
      endTime,
      activity: activity.slice(0, 120),
      tag: (f.tag ?? '').trim().slice(0, 24),
      location: (f.location ?? '').trim().slice(0, 80),
      durationAmount: dur?.amount ?? null,
      durationUnit: dur?.unit ?? null,
    })
  }
  while ((m = updRe.exec(body))) {
    const f = parseFieldMap(m[1] ?? '')
    const id = (f.id ?? '').trim()
    if (!id) continue
    const status = f.status ? parseStatus(f.status) : undefined
    ops.push({
      kind: 'update',
      id,
      status: status ?? undefined,
      note: f.note?.trim().slice(0, 200),
      activity: f.activity?.trim().slice(0, 120),
      location: f.location?.trim().slice(0, 80),
      tag: f.tag?.trim().slice(0, 24),
    })
  }
  return ops
}

export function extractScheduleCalendarPatchBlock(
  raw: string,
  anchor?: ScheduleCalendarAnchor | null,
): {
  rest: string
  judged: boolean
  noChange: boolean
  ops: ScheduleCalInlineOp[]
} {
  const src = String(raw ?? '')
  const idx = src.indexOf(SCHEDULE_CAL_PATCH_MARKER)
  if (idx < 0) {
    return { rest: src, judged: false, noChange: false, ops: [] }
  }
  const head = src.slice(0, idx)
  const tail = src.slice(idx + SCHEDULE_CAL_PATCH_MARKER.length).trimStart()
  const cutMarkers = [
    '---WB_AFTER_PATCH---',
    '---OBS---',
    '---OBS_NOTES_PATCH---',
    '---LIFE_LEDGER_PATCH---',
    '<<<DATING_UNIFIED_MEMORY>>>',
    '<<<DATING_UNIFIED_MEMORY_JSON>>>',
    SCHEDULE_CAL_PATCH_MARKER,
  ]
  let cut = tail.length
  for (const m of cutMarkers) {
    const i = tail.indexOf(m)
    if (i >= 0 && i < cut) cut = i
  }
  const section = tail.slice(0, cut)
  const afterSection = tail.slice(cut)
  const clock =
    anchor ??
    resolveCalendarAnchor({ currentTimeMs: Date.now(), currentTimeIsStory: false })
  const rest =
    head.trimEnd() +
    (afterSection ? (head.endsWith('\n') ? '' : '\n') + afterSection.trimStart() : '')
  if (isNoChangeBody(section)) {
    return { rest, judged: true, noChange: true, ops: [] }
  }
  const ops = parseOpsFromBody(section, clock)
  return { rest, judged: true, noChange: ops.length === 0, ops }
}

export function mergeScheduleCalendarOps(
  existing: ScheduleCalendarEvent[],
  ops: ScheduleCalInlineOp[],
  anchor: ScheduleCalendarAnchor,
): ScheduleCalendarEvent[] {
  let next = [...existing]
  const now = Date.now()
  for (const op of ops) {
    if (op.kind === 'add') {
      next.push({
        id: uid('sce'),
        storyDay: op.storyDay,
        startTime: op.startTime,
        endTime: op.endTime ?? null,
        activity: op.activity,
        tag: op.tag || '工作',
        location: op.location,
        durationAmount: op.durationAmount ?? null,
        durationUnit: op.durationUnit ?? null,
        status: 'upcoming',
        source: 'ai_auto',
        createdAt: now,
        updatedAt: now,
      })
    } else {
      const i = next.findIndex((e) => e.id === op.id)
      if (i < 0) continue
      const prev = next[i]!
      next[i] = {
        ...prev,
        status: op.status ?? prev.status,
        note: op.note !== undefined ? op.note : prev.note,
        activity: op.activity?.trim() || prev.activity,
        location: op.location !== undefined ? op.location : prev.location,
        tag: op.tag !== undefined ? op.tag : prev.tag,
        updatedAt: now,
      }
    }
  }
  next = normalizeScheduleCalendarEvents(next)
  return closePastScheduleCalendarEvents(next, anchor)
}

export function formatExistingCalendarEventsHint(events: ScheduleCalendarEvent[]): string {
  return events
    .slice(0, 40)
    .map(
      (e) =>
        `- id=${e.id} · ${e.storyDay} ${e.startTime} ${e.activity} 〔${e.status}〕`,
    )
    .join('\n')
}

function countApplicableScheduleOps(
  existing: ScheduleCalendarEvent[],
  ops: ScheduleCalInlineOp[],
): { appliedOps: ScheduleCalInlineOp[]; appliedCount: number } {
  const ids = new Set(existing.map((e) => e.id))
  const appliedOps: ScheduleCalInlineOp[] = []
  for (const op of ops) {
    if (op.kind === 'add') {
      appliedOps.push(op)
      continue
    }
    if (ids.has(op.id)) appliedOps.push(op)
  }
  return { appliedOps, appliedCount: appliedOps.length }
}

export async function applyScheduleCalendarInlinePatches(params: {
  character: Character | null
  playerIdentity?: PlayerIdentity | null
  /** 补丁目标：默认角色 */
  subject?: 'character' | 'player'
  ops: ScheduleCalInlineOp[]
  anchor: ScheduleCalendarAnchor
}): Promise<{
  applied: boolean
  appliedCount: number
  /** 实际会写入的 ops（跳过找不到的 update id） */
  appliedOps: ScheduleCalInlineOp[]
  /** 写库前日程快照，供弹窗解析事项名 */
  existingBefore: ScheduleCalendarEvent[]
}> {
  if (!params.ops.length) {
    return { applied: false, appliedCount: 0, appliedOps: [], existingBefore: [] }
  }
  const subject = params.subject ?? 'character'
  if (subject === 'player') {
    const pi = params.playerIdentity
    if (!pi?.id) {
      return { applied: false, appliedCount: 0, appliedOps: [], existingBefore: [] }
    }
    const existingBefore = pi.scheduleCalendarEvents ?? []
    const { appliedOps, appliedCount } = countApplicableScheduleOps(existingBefore, params.ops)
    if (!appliedCount) {
      return { applied: false, appliedCount: 0, appliedOps: [], existingBefore }
    }
    const merged = mergeScheduleCalendarOps(existingBefore, appliedOps, params.anchor)
    await personaDb.upsertPlayerIdentity({
      ...pi,
      scheduleCalendarEvents: merged,
      updatedAt: Date.now(),
    })
    return { applied: true, appliedCount, appliedOps, existingBefore }
  }
  const ch = params.character
  if (!ch?.id) {
    return { applied: false, appliedCount: 0, appliedOps: [], existingBefore: [] }
  }
  const existingBefore = ch.scheduleCalendarEvents ?? []
  const { appliedOps, appliedCount } = countApplicableScheduleOps(existingBefore, params.ops)
  if (!appliedCount) {
    return { applied: false, appliedCount: 0, appliedOps: [], existingBefore }
  }
  const merged = mergeScheduleCalendarOps(existingBefore, appliedOps, params.anchor)
  await personaDb.upsertCharacter({
    ...ch,
    scheduleCalendarEvents: merged,
    updatedAt: Date.now(),
  })
  return { applied: true, appliedCount, appliedOps, existingBefore }
}

export function buildCalendarAnchorFromStoryLabel(opts: {
  storyNowLabel?: string | null
  storyDay?: string | null
  storyTime?: string | null
  currentTimeMs?: number
  currentTimeIsStory?: boolean
}): ScheduleCalendarAnchor {
  return resolveCalendarAnchor(opts)
}

/** 兜底：无剧情日时用今天 */
export function fallbackStoryDayToday(ms = Date.now()): string {
  return formatGregorianStoryDay(new Date(ms))
}

export function eventStartMs(e: ScheduleCalendarEvent): number | null {
  return parseGregorianStoryDayToMs(e.storyDay, e.startTime)
}
