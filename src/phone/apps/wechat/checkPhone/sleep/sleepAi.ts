import type { ApiConfig } from '../../../api/types'
import { openAiCompatibleChat, type OpenAiCompatibleMessage } from '../../newFriendsPersona/ai'
import { personaDb } from '../../newFriendsPersona/idb'
import type { Character, PlayerIdentity } from '../../newFriendsPersona/types'
import { loadOfflineDatingPlotsPromptBlock } from '../../dating/loadOfflineDatingPlotsForWechatPrompt'
import { formatWorldBackgroundForPrompt } from '../../newFriendsPersona/worldBackgroundFormat'
import { buildSystemContent } from '../../wechatChatAi'
import {
  buildHeartRate,
  hashStr,
  historyFromNights,
  mulberry32,
  normalizeStageSegments,
  parseDateKey,
  qualityLabelFromScore,
  toDateKey,
} from './mockData'
import type { HeartRateSample, SleepDataset, SleepNightRecord, SleepStageSegment } from './types'

const SLEEP_SYNC_SYSTEM_APPENDIX = `
---
【任务：生成角色手机里的「睡眠监测」私密记录】
你现在要扮演该角色本人，基于角色档案、长期记忆、近期聊天与线下剧情，生成最近若干天的睡眠监测数据。
这是用户正在偷看角色手机健康 App 里的睡眠页，要像真实穿戴设备同步出的私密数据，同时 summary 要用角色语气（第一人称或极简旁白皆可，但必须贴合人设）。

输出要求：
1) 仅输出 JSON 对象，不要 Markdown，不要解释。
2) 输出格式必须为：
{
  "nights": [Night, ...]
}
3) Night 结构：
{
  "dateKey": "YYYY-MM-DD",          // 起床日
  "fellAsleepAt": "YYYY-MM-DD HH:mm", // 入睡时间（通常为前一晚）
  "wokeAt": "YYYY-MM-DD HH:mm",
  "qualityScore": 0-100,
  "qualityLabel": "香甜|良好|还行|一般|欠佳|或贴合角色的短词",
  "summary": "一句贴合人设的睡眠小结（15~40字，可带情绪/关系暗示）",
  "avgHeartRate": 48-72,
  "stages": [
    { "kind": "light|deep|rem|awake", "durationMin": 数字 }
  ]
}
4) nights 数量尽量接近用户要求的天数（建议 5~7），按 dateKey 从旧到新排序。
5) stages 需覆盖整晚（各段 durationMin 之和 ≈ 入睡到起床的总分钟），阶段顺序要像真实睡眠周期：浅睡→深睡→浅睡→REM，偶尔夹清醒，不要乱序堆砌。
6) 睡眠表现要贴合近期剧情与人设（熬夜追剧/失眠想你/睡得很沉/加班疲惫等），不要写成体检报告腔。
7) summary 是角色手机里的私人备注感，可俏皮、可压抑、可甜蜜，但不要写成 AI 旁白说明书。
8) 不要编造与既有记忆明显冲突的重大事件；轻微日常波动可以。
9) 设备归属硬约束：这是角色自己的睡眠数据，不是用户的。
`.trim()

function stripFence(s: string): string {
  return s
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()
}

function pad2(n: number) {
  return n < 10 ? `0${n}` : String(n)
}

function parseFlexibleDateTime(raw: unknown, fallback: Date): Date {
  if (typeof raw !== 'string' || !raw.trim()) return new Date(fallback.getTime())
  const s = raw.trim().replace('T', ' ')
  // YYYY-MM-DD HH:mm
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})[ ](\d{1,2}):(\d{2})/)
  if (m) {
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5]), 0, 0)
  }
  const iso = new Date(s)
  if (!Number.isNaN(iso.getTime())) return iso
  return new Date(fallback.getTime())
}

function defaultDateKeys(days: number, now = new Date()): string[] {
  const keys: string[] = []
  for (let offset = days - 1; offset >= 0; offset--) {
    const d = new Date(now)
    d.setHours(12, 0, 0, 0)
    d.setDate(d.getDate() - offset)
    keys.push(toDateKey(d))
  }
  return keys
}

function normalizeHeartRate(raw: unknown, totalMin: number, seed: number, avgHint?: number): HeartRateSample[] {
  const rand = mulberry32(seed ^ 0x51)
  if (Array.isArray(raw) && raw.length >= 3) {
    const samples: HeartRateSample[] = []
    for (const item of raw) {
      if (!item || typeof item !== 'object') continue
      const rec = item as Record<string, unknown>
      const atMin = Math.round(Number(rec.atMin))
      const bpm = Math.round(Number(rec.bpm))
      if (!Number.isFinite(atMin) || !Number.isFinite(bpm)) continue
      samples.push({ atMin: Math.max(0, atMin), bpm: Math.max(40, Math.min(100, bpm)) })
    }
    if (samples.length >= 3) return samples.sort((a, b) => a.atMin - b.atMin)
  }
  const base = typeof avgHint === 'number' && Number.isFinite(avgHint) ? avgHint : 52 + Math.floor(rand() * 10)
  return buildHeartRate(rand, totalMin, base)
}

export function normalizeSleepNight(raw: unknown, idx: number, fallbackDateKey: string): SleepNightRecord | null {
  if (!raw || typeof raw !== 'object') return null
  const rec = raw as Record<string, unknown>
  const dateKey =
    typeof rec.dateKey === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(rec.dateKey.trim())
      ? rec.dateKey.trim()
      : fallbackDateKey

  const wakeFallback = parseDateKey(dateKey)
  wakeFallback.setHours(7, 30, 0, 0)
  const fellFallback = new Date(wakeFallback)
  fellFallback.setDate(fellFallback.getDate() - 1)
  fellFallback.setHours(23, 20, 0, 0)

  const fell = parseFlexibleDateTime(rec.fellAsleepAt, fellFallback)
  let woke = parseFlexibleDateTime(rec.wokeAt, wakeFallback)
  if (woke.getTime() <= fell.getTime()) {
    woke = new Date(fell.getTime() + 7.5 * 60 * 60_000)
  }

  let totalSleepMin = Math.round((woke.getTime() - fell.getTime()) / 60_000)
  if (!Number.isFinite(totalSleepMin) || totalSleepMin < 180) totalSleepMin = 420
  if (totalSleepMin > 720) totalSleepMin = 720
  woke = new Date(fell.getTime() + totalSleepMin * 60_000)

  const seed = hashStr(`${dateKey}:${idx}`)
  const stages: SleepStageSegment[] = normalizeStageSegments(rec.stages, totalSleepMin, seed)

  let qualityScore = Math.round(Number(rec.qualityScore))
  if (!Number.isFinite(qualityScore)) qualityScore = 72
  qualityScore = Math.max(30, Math.min(98, qualityScore))

  const qualityLabel =
    typeof rec.qualityLabel === 'string' && rec.qualityLabel.trim()
      ? rec.qualityLabel.trim().slice(0, 8)
      : qualityLabelFromScore(qualityScore)

  const summary =
    typeof rec.summary === 'string' && rec.summary.trim()
      ? rec.summary.trim().slice(0, 120)
      : '昨晚的睡眠记录已同步。'

  const avgHint = Number(rec.avgHeartRate)
  const heartRate = normalizeHeartRate(rec.heartRate, totalSleepMin, seed, avgHint)

  return {
    dateKey,
    fellAsleepAt: fell.toISOString(),
    wokeAt: woke.toISOString(),
    totalSleepMin,
    qualityScore,
    qualityLabel,
    stages,
    heartRate,
    summary,
  }
}

export async function generateSleepDatasetWithAi(params: {
  apiConfig: ApiConfig | null
  characterId: string
  playerIdentityId: string
  playerDisplayName: string
  useLumiProjectAssistantPrompt: boolean
  days: number
  bias: string
  current?: SleepDataset | null
}): Promise<SleepDataset> {
  const cfg = params.apiConfig
  if (!cfg?.apiUrl?.trim() || !cfg.apiKey?.trim() || !cfg.modelId?.trim()) {
    throw new Error('未配置 AI API')
  }

  const cid = params.characterId.trim()
  const piid = params.playerIdentityId.trim()
  const character = cid ? ((await personaDb.getCharacter(cid)) as Character | null) : null
  const playerIdentity =
    piid && piid !== '__none__' ? ((await personaDb.getPlayerIdentity(piid)) as PlayerIdentity | null) : null
  const memoryNotes = (await personaDb.formatCharacterMemoriesForPrompt(cid)).trim() || undefined

  let worldBackgroundPrompt: string | undefined
  if (character?.worldBackgroundId?.trim()) {
    const bg = await personaDb.getWorldBackground(character.worldBackgroundId.trim())
    const block = formatWorldBackgroundForPrompt(bg)
    if (block.trim()) worldBackgroundPrompt = block
  }

  const promptMode = params.useLumiProjectAssistantPrompt ? 'lumi-assistant' : 'persona'
  const offlineDatingPlotsContext =
    promptMode === 'persona' && cid ? await loadOfflineDatingPlotsPromptBlock(cid, character?.name ?? null) : ''

  const wbNotesIds = [cid].map((x) => String(x ?? '').trim()).filter((x) => x && x !== '__none__')
  const baseSystem = buildSystemContent({
    character,
    playerIdentity,
    playerDisplayName: params.playerDisplayName.trim() || '朋友',
    promptMode,
    longTermMemoryNotes: memoryNotes,
    worldBackgroundPrompt,
    offlineDatingPlotsContext: offlineDatingPlotsContext || undefined,
    chatMemberIds: wbNotesIds,
  })

  const recentChatRows = cid ? await personaDb.listWeChatChatMessagesRecentByCharacter({ characterId: cid, limit: 40 }) : []
  const recentChatBrief = recentChatRows
    .slice(-24)
    .map((m) => {
      const text = String(m.content || '').replace(/\s+/g, ' ').trim()
      if (!text) return null
      const dir = m.type === 'character' ? '[角色]' : '[用户]'
      return `${dir} ${text.slice(0, 80)}`
    })
    .filter((x): x is string => !!x)
    .join('\n')

  const days = Math.min(7, Math.max(3, Math.round(params.days)))
  const expectedKeys = defaultDateKeys(days)
  const todayKey = toDateKey(new Date())
  const existingBrief = (params.current?.nights ?? [])
    .slice(-7)
    .map((n) => `${n.dateKey} score=${n.qualityScore} ${n.qualityLabel} · ${n.summary}`)
    .join('\n')

  const userTask = `请生成角色手机睡眠监测数据。
期望天数：${days}（dateKey 建议覆盖：${expectedKeys.join(', ')}，最后一天尽量是今天 ${todayKey} 对应的「昨晚」起床日）。
内容偏向：${params.bias.trim() || '贴合近期情绪与作息，可带一点私密小心思'}。

【已有睡眠记录（可参考风格，本次请整体重写 nights）】
${existingBrief || '（暂无）'}

【近期聊天摘要（用于推断作息/情绪）】
${recentChatBrief || '（暂无）'}

请只输出 JSON：{ "nights": [ ... ] }`

  const messages: OpenAiCompatibleMessage[] = [
    { role: 'system', content: `${baseSystem}\n\n${SLEEP_SYNC_SYSTEM_APPENDIX}` },
    { role: 'user', content: userTask },
  ]

  const raw = await openAiCompatibleChat(cfg, messages, { temperature: 0.78 })
  const parsed = JSON.parse(stripFence(raw))
  if (!parsed || typeof parsed !== 'object') throw new Error('AI 返回格式异常')

  const list = Array.isArray((parsed as { nights?: unknown }).nights)
    ? (parsed as { nights: unknown[] }).nights
    : Array.isArray(parsed)
      ? (parsed as unknown[])
      : null
  if (!list) throw new Error('AI 未返回 nights')

  const nights: SleepNightRecord[] = []
  for (let i = 0; i < list.length; i++) {
    const fallbackKey = expectedKeys[Math.min(i, expectedKeys.length - 1)] ?? todayKey
    const night = normalizeSleepNight(list[i], i, fallbackKey)
    if (night) nights.push(night)
  }
  if (!nights.length) throw new Error('AI 睡眠数据为空')

  nights.sort((a, b) => a.dateKey.localeCompare(b.dateKey))
  // 去重同日，保留后者
  const byKey = new Map<string, SleepNightRecord>()
  for (const n of nights) byKey.set(n.dateKey, n)
  const unique = Array.from(byKey.values()).sort((a, b) => a.dateKey.localeCompare(b.dateKey)).slice(-7)

  return {
    nights: unique,
    history: historyFromNights(unique),
  }
}

/** 调试/展示用：格式化入睡时间字符串 */
export function formatLocalDateTime(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}
