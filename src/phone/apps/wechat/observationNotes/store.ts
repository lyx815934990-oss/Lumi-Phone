import { personaDb } from '../newFriendsPersona/idb'
import {
  affectionStageFromValue,
  clampPct,
  OBS_ABILITY_AXIS_LABELS,
  OBS_MBTI_AXIS_LABELS,
  type ObservationChangeEvent,
  type ObservationField,
  type ObservationFieldDiff,
  type ObservationLabeledField,
  type ObservationNotesDoc,
  type ObservationRadarAxis,
  type ObservationRadarBlock,
  type ObservationTimelineEntry,
  type ObservationVoice,
} from './types'

const KV_PREFIX = 'observation-notes:v1:'

function notesKvKey(conversationCharacterId: string, playerIdentityId: string): string {
  return `${KV_PREFIX}${conversationCharacterId}::${playerIdentityId}`
}

function asVoice(v: unknown): ObservationVoice {
  return v === 'marginalia' ? 'marginalia' : 'objective'
}

function normalizeField(input: unknown, fallback = '尚不清楚'): ObservationField {
  if (!input || typeof input !== 'object') {
    return { text: fallback, voice: 'objective' }
  }
  const r = input as Partial<ObservationField>
  const text = typeof r.text === 'string' && r.text.trim() ? r.text.trim() : fallback
  return { text, voice: asVoice(r.voice) }
}

function normalizeTimeline(_input: unknown): ObservationTimelineEntry[] {
  // 心动/深刻已下线：旧档加载时统一清空，改由向量记忆召回
  return []
}

function normalizeRadar(input: unknown, preferredLabels?: readonly string[]): ObservationRadarBlock {
  if (!input || typeof input !== 'object') {
    return {
      axes: (preferredLabels ?? []).map((label) => ({ label, value: 50 })),
      judged: false,
    }
  }
  const r = input as Partial<ObservationRadarBlock>
  const axes: ObservationRadarAxis[] = []
  if (Array.isArray(r.axes)) {
    for (const a of r.axes) {
      if (!a || typeof a !== 'object') continue
      const row = a as Partial<ObservationRadarAxis>
      const label = typeof row.label === 'string' ? row.label.trim() : ''
      if (!label) continue
      axes.push({ label, value: clampPct(Number(row.value)) })
    }
  }
  const note = typeof r.note === 'string' && r.note.trim() ? r.note.trim() : undefined

  let aligned: ObservationRadarAxis[]
  if (preferredLabels?.length) {
    const byLabel = new Map(axes.map((a) => [a.label, a.value]))
    aligned = preferredLabels.map((label, i) => ({
      label,
      value: byLabel.has(label)
        ? (byLabel.get(label) as number)
        : axes[i]
          ? axes[i]!.value
          : 50,
    }))
  } else {
    aligned = axes
  }

  const explicitJudged = r.judged === true
  const inferred =
    Boolean(note?.trim()) ||
    aligned.some((a) => a.value !== 50) ||
    (preferredLabels?.length ? axes.length > 0 && axes.some((a) => a.value !== 50) : axes.length > 0)

  return {
    axes: aligned,
    note,
    judged: explicitJudged || inferred,
  }
}

function normalizeDiffs(input: unknown): ObservationFieldDiff[] {
  if (!Array.isArray(input)) return []
  const out: ObservationFieldDiff[] = []
  for (const row of input) {
    if (!row || typeof row !== 'object') continue
    const r = row as Partial<ObservationFieldDiff>
    const path = typeof r.path === 'string' ? r.path.trim() : ''
    const label = typeof r.label === 'string' ? r.label.trim() : path
    const previousText = typeof r.previousText === 'string' ? r.previousText : ''
    const currentText = typeof r.currentText === 'string' ? r.currentText : ''
    if (!path) continue
    if (path === 'heartMoments' || path === 'deepMemories') continue
    out.push({ path, label, previousText, currentText })
  }
  return out
}

function normalizeHistory(input: unknown): ObservationChangeEvent[] {
  if (!Array.isArray(input)) return []
  const out: ObservationChangeEvent[] = []
  for (const row of input) {
    if (!row || typeof row !== 'object') continue
    const r = row as Partial<ObservationChangeEvent>
    const id = typeof r.id === 'string' && r.id.trim() ? r.id.trim() : `h_${out.length}`
    const at = typeof r.at === 'number' && Number.isFinite(r.at) ? r.at : Date.now()
    const summary = typeof r.summary === 'string' ? r.summary.trim() : ''
    out.push({ id, at, summary: summary || '内容有更新', diffs: normalizeDiffs(r.diffs) })
  }
  return out.sort((a, b) => b.at - a.at)
}

function normalizeIntimate(input: unknown): ObservationLabeledField[] {
  if (!Array.isArray(input)) return ensureDefaultIntimateSlots([])
  const out: ObservationLabeledField[] = []
  for (const row of input) {
    if (!row || typeof row !== 'object') continue
    const r = row as Partial<ObservationLabeledField> & { field?: unknown }
    const key = typeof r.key === 'string' && r.key.trim() ? r.key.trim() : `i_${out.length}`
    const label = typeof r.label === 'string' && r.label.trim() ? r.label.trim() : '未命名'
    out.push({ key, label, field: normalizeField(r.field) })
  }
  return ensureDefaultIntimateSlots(out)
}

/** 亲密板块固定四栏（性向身体亲密）：节奏偏好 / XP / 身体敏感处 / 喜欢的亲密方式 */
export const OBS_INTIMATE_SLOT_DEFS = [
  { key: 'pref', label: '亲密偏好' },
  { key: 'xp', label: '亲密 XP' },
  { key: 'sensitive', label: '身体敏感处' },
  { key: 'ways', label: '喜欢的亲密方式' },
] as const

export function ensureDefaultIntimateSlots(rows: ObservationLabeledField[]): ObservationLabeledField[] {
  const byKey = new Map(rows.map((r) => [r.key, r]))
  const fixed = OBS_INTIMATE_SLOT_DEFS.map((def) => {
    const existing = byKey.get(def.key)
    return {
      key: def.key,
      label: def.label,
      field: existing?.field ?? { text: '尚不清楚', voice: 'marginalia' as const },
    }
  })
  const fixedKeys = new Set(OBS_INTIMATE_SLOT_DEFS.map((d) => d.key))
  const rest = rows.filter((r) => !fixedKeys.has(r.key as (typeof OBS_INTIMATE_SLOT_DEFS)[number]['key']))
  return [...fixed, ...rest]
}

export function normalizeObservationNotesDoc(input: unknown): ObservationNotesDoc | null {
  if (!input || typeof input !== 'object') return null
  const r = input as Partial<ObservationNotesDoc>
  const cid = typeof r.conversationCharacterId === 'string' ? r.conversationCharacterId.trim() : ''
  const pid = typeof r.playerIdentityId === 'string' ? r.playerIdentityId.trim() : ''
  if (!cid || !pid) return null

  const basicRaw = (r.basic ?? {}) as Partial<ObservationNotesDoc['basic']>
  const affection = clampPct(Number(r.affection))
  const strengths = Array.isArray(r.strengths)
    ? r.strengths.filter((x): x is string => typeof x === 'string' && x.trim().length > 0).map((x) => x.trim())
    : []
  const weaknesses = Array.isArray(r.weaknesses)
    ? r.weaknesses.filter((x): x is string => typeof x === 'string' && x.trim().length > 0).map((x) => x.trim())
    : []

  return {
    conversationCharacterId: cid,
    playerIdentityId: pid,
    title: typeof r.title === 'string' && r.title.trim() ? r.title.trim() : '私藏侧写',
    charDisplayName: typeof r.charDisplayName === 'string' && r.charDisplayName.trim() ? r.charDisplayName.trim() : 'TA',
    updatedAt: typeof r.updatedAt === 'number' && Number.isFinite(r.updatedAt) ? r.updatedAt : Date.now(),
    basic: {
      name: normalizeField(basicRaw.name),
      gender: normalizeField(basicRaw.gender, '私密'),
      orientation: normalizeField(basicRaw.orientation),
      favoriteFoods: normalizeField(basicRaw.favoriteFoods),
      taboos: normalizeField(basicRaw.taboos),
      hobbies: normalizeField(basicRaw.hobbies),
    },
    intimate: normalizeIntimate(r.intimate),
    strengths,
    weaknesses,
    remarkNickname: typeof r.remarkNickname === 'string' ? r.remarkNickname.trim() : '',
    preferredAddress: typeof r.preferredAddress === 'string' ? r.preferredAddress.trim() : '',
    heartMoments: normalizeTimeline(r.heartMoments),
    deepMemories: normalizeTimeline(r.deepMemories),
    personalityRadar: normalizeRadar(r.personalityRadar, OBS_MBTI_AXIS_LABELS),
    abilityRadar: normalizeRadar(r.abilityRadar, OBS_ABILITY_AXIS_LABELS),
    overallEvaluation: typeof r.overallEvaluation === 'string' ? r.overallEvaluation.trim() : '',
    affection,
    affectionStageLabel:
      typeof r.affectionStageLabel === 'string' && r.affectionStageLabel.trim()
        ? r.affectionStageLabel.trim()
        : affectionStageFromValue(affection),
    relationshipLabel:
      typeof r.relationshipLabel === 'string' && r.relationshipLabel.trim()
        ? r.relationshipLabel.trim()
        : '关系未明',
    pendingDiffs: normalizeDiffs(r.pendingDiffs),
    changeHistory: normalizeHistory(r.changeHistory),
    lastSeenAt: typeof r.lastSeenAt === 'number' && Number.isFinite(r.lastSeenAt) ? r.lastSeenAt : null,
  }
}

export type ObservationNotesEntryPreview = {
  updatedAt: number
  pendingCount: number
  hasUnread: boolean
  title: string
}

export function getObservationEntryPreview(doc: ObservationNotesDoc | null): ObservationNotesEntryPreview | null {
  if (!doc) return null
  const pendingCount = doc.pendingDiffs.length
  const hasUnread =
    pendingCount > 0 && (doc.lastSeenAt == null || doc.updatedAt > doc.lastSeenAt)
  return {
    updatedAt: doc.updatedAt,
    pendingCount,
    hasUnread,
    title: doc.title,
  }
}

export async function loadObservationNotes(params: {
  conversationCharacterId: string
  playerIdentityId: string
  charDisplayName: string
  /**
   * 无存档时是否创建空白侧写（不再写入 mock 样例）。
   * false：返回 null；true：创建并持久化空白档。
   */
  seedIfEmpty?: boolean
}): Promise<ObservationNotesDoc | null> {
  const cid = params.conversationCharacterId.trim()
  const pid = params.playerIdentityId.trim() || '__default__'
  if (!cid) return null

  const raw = await personaDb.getPhoneKv(notesKvKey(cid, pid))
  const existing = normalizeObservationNotesDoc(raw)
  if (existing) {
    if (params.charDisplayName.trim() && existing.charDisplayName !== params.charDisplayName.trim()) {
      existing.charDisplayName = params.charDisplayName.trim()
    }
    return existing
  }

  if (params.seedIfEmpty === false) return null

  const blank = createBlankObservationNotesDoc({
    conversationCharacterId: cid,
    playerIdentityId: pid,
    charDisplayName: params.charDisplayName,
  })
  await personaDb.setPhoneKv(notesKvKey(cid, pid), blank)
  return blank
}

/** 清除某角色×身份的侧写存档（用于清掉旧 mock） */
export async function clearObservationNotes(params: {
  conversationCharacterId: string
  playerIdentityId: string
}): Promise<void> {
  const cid = params.conversationCharacterId.trim()
  const pid = params.playerIdentityId.trim()
  if (!cid || !pid) return
  await personaDb.deletePhoneKv(notesKvKey(cid, pid))
}

export async function saveObservationNotes(doc: ObservationNotesDoc): Promise<void> {
  const normalized = normalizeObservationNotesDoc(doc)
  if (!normalized) return
  await personaDb.setPhoneKv(
    notesKvKey(normalized.conversationCharacterId, normalized.playerIdentityId),
    normalized,
  )
}

/** 无示意样例的空白侧写（供自动更新首次落库） */
export function createBlankObservationNotesDoc(params: {
  conversationCharacterId: string
  playerIdentityId: string
  charDisplayName: string
}): ObservationNotesDoc {
  const now = Date.now()
  return {
    conversationCharacterId: params.conversationCharacterId.trim(),
    playerIdentityId: params.playerIdentityId.trim(),
    title: '私藏侧写',
    charDisplayName: params.charDisplayName.trim() || 'TA',
    updatedAt: now,
    basic: {
      name: { text: '尚不清楚', voice: 'objective' },
      gender: { text: '私密', voice: 'objective' },
      orientation: { text: '尚不清楚', voice: 'objective' },
      favoriteFoods: { text: '尚不清楚', voice: 'objective' },
      taboos: { text: '尚不清楚', voice: 'objective' },
      hobbies: { text: '尚不清楚', voice: 'objective' },
    },
    intimate: ensureDefaultIntimateSlots([]),
    strengths: [],
    weaknesses: [],
    remarkNickname: '',
    preferredAddress: '',
    heartMoments: [],
    deepMemories: [],
    personalityRadar: {
      axes: OBS_MBTI_AXIS_LABELS.map((label) => ({ label, value: 50 })),
      judged: false,
    },
    abilityRadar: {
      axes: OBS_ABILITY_AXIS_LABELS.map((label) => ({ label, value: 50 })),
      judged: false,
    },
    overallEvaluation: '',
    affection: 20,
    affectionStageLabel: affectionStageFromValue(20),
    relationshipLabel: '关系未明',
    pendingDiffs: [],
    changeHistory: [],
    lastSeenAt: null,
  }
}

/** 打开笔记并完成阅读后：清除未读，保留 pendingDiffs 供展开对比直至下次新更新覆盖 */
export async function markObservationNotesSeen(doc: ObservationNotesDoc): Promise<ObservationNotesDoc> {
  const next: ObservationNotesDoc = {
    ...doc,
    lastSeenAt: Date.now(),
  }
  await saveObservationNotes(next)
  return next
}

/** 主页字段是否仍带「已更新」标记（与入口未读红点无关；红点由 lastSeenAt 控制） */
export function isPathPending(doc: ObservationNotesDoc, path: string): boolean {
  if (!doc.pendingDiffs.length) return false
  return doc.pendingDiffs.some(
    (d) => d.path === path || d.path.startsWith(`${path}.`) || path.startsWith(`${d.path}.`),
  )
}

export function findPendingDiff(doc: ObservationNotesDoc, path: string): ObservationFieldDiff | null {
  return (
    doc.pendingDiffs.find((d) => d.path === path) ||
    doc.pendingDiffs.find((d) => path.startsWith(`${d.path}.`) || d.path.startsWith(`${path}.`)) ||
    null
  )
}
