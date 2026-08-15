import { personaDb } from '../../newFriendsPersona/idb'
import { emptyHealthDataset, hasHealthContent, type HealthDataset } from './types'

const HEALTH_KV_PREFIX = 'checkPhone.health.v1:'

function healthKey(characterId: string) {
  return `${HEALTH_KV_PREFIX}${String(characterId || 'unknown').trim()}`
}

export function normalizeHealthDataset(raw: unknown): HealthDataset {
  if (!raw || typeof raw !== 'object') return emptyHealthDataset()
  const r = raw as Partial<HealthDataset>
  const base = emptyHealthDataset()
  return {
    ...base,
    profile: r.profile && typeof r.profile === 'object' ? r.profile : {},
    latestVisitId: typeof r.latestVisitId === 'string' ? r.latestVisitId : undefined,
    visits: Array.isArray(r.visits)
      ? r.visits.filter((x) => x && typeof x === 'object' && typeof (x as { id?: string }).id === 'string')
      : [],
    bodySections: Array.isArray(r.bodySections)
      ? r.bodySections.filter((x) => x && typeof x === 'object' && typeof (x as { id?: string }).id === 'string')
      : [],
    checkups: Array.isArray(r.checkups)
      ? r.checkups.filter((x) => x && typeof x === 'object' && typeof (x as { id?: string }).id === 'string')
      : [],
    medications: Array.isArray(r.medications)
      ? r.medications.filter((x) => x && typeof x === 'object' && typeof (x as { id?: string }).id === 'string')
      : [],
    consults: Array.isArray(r.consults)
      ? r.consults
          .map((x) => {
            if (!x || typeof x !== 'object') return null
            const row = x as {
              id?: string
              hospital?: string
              department?: string
              doctor?: string
              consultedAtLabel?: string
              topic?: string
              linkedVisitId?: string
              turns?: unknown
              chart?: unknown
            }
            if (typeof row.id !== 'string' || !row.id.trim()) return null
            const turns = Array.isArray(row.turns)
              ? row.turns
                  .map((t) => {
                    if (!t || typeof t !== 'object') return null
                    const turn = t as { speaker?: string; text?: string }
                    const speaker =
                      turn.speaker === 'doctor' || turn.speaker === 'patient' ? turn.speaker : null
                    const text = typeof turn.text === 'string' ? turn.text.trim() : ''
                    if (!speaker || !text) return null
                    const doctorLabel = row.doctor ? String(row.doctor).trim() : ''
                    // 过滤误把「医生：姓名」吃进对白的脏数据
                    if (doctorLabel && text === doctorLabel) return null
                    return { speaker, text }
                  })
                  .filter((t): t is { speaker: 'patient' | 'doctor'; text: string } => !!t)
              : []
            const chartRaw =
              row.chart && typeof row.chart === 'object' ? (row.chart as Record<string, unknown>) : null
            const inquiry = Array.isArray(chartRaw?.inquiry)
              ? chartRaw!.inquiry
                  .map((s) => String(s || '').trim())
                  .filter(Boolean)
                  .slice(0, 16)
              : undefined
            const rxLines = Array.isArray(chartRaw?.rxLines)
              ? chartRaw!.rxLines
                  .flatMap((line) => {
                    if (!line || typeof line !== 'object') return []
                    const L = line as { text?: string; note?: string }
                    const text = String(L.text || '').trim()
                    if (!text) return []
                    const note = String(L.note || '').trim()
                    return note ? [{ text, note }] : [{ text }]
                  })
                  .slice(0, 24)
              : undefined
            const chart =
              chartRaw &&
              (chartRaw.gender ||
                chartRaw.ageBody ||
                chartRaw.reason ||
                (inquiry && inquiry.length) ||
                chartRaw.pulse ||
                chartRaw.inspection ||
                chartRaw.tongue ||
                chartRaw.diagnosis ||
                (rxLines && rxLines.length) ||
                chartRaw.prepNote ||
                chartRaw.explanation ||
                chartRaw.remark)
                ? {
                    gender: chartRaw.gender ? String(chartRaw.gender).trim() : undefined,
                    ageBody: chartRaw.ageBody ? String(chartRaw.ageBody).trim() : undefined,
                    reason: chartRaw.reason ? String(chartRaw.reason).trim() : undefined,
                    inquiry,
                    pulse: chartRaw.pulse ? String(chartRaw.pulse).trim() : undefined,
                    inspection: chartRaw.inspection ? String(chartRaw.inspection).trim() : undefined,
                    tongue: chartRaw.tongue ? String(chartRaw.tongue).trim() : undefined,
                    diagnosis: chartRaw.diagnosis ? String(chartRaw.diagnosis).trim() : undefined,
                    rxTitle: chartRaw.rxTitle ? String(chartRaw.rxTitle).trim() : undefined,
                    rxLines,
                    prepNote: chartRaw.prepNote ? String(chartRaw.prepNote).trim() : undefined,
                    explanation: chartRaw.explanation ? String(chartRaw.explanation).trim() : undefined,
                    remark: chartRaw.remark ? String(chartRaw.remark).trim() : undefined,
                  }
                : undefined
            return {
              id: row.id.trim(),
              hospital: String(row.hospital || '医院').trim() || '医院',
              department: String(row.department || '门诊').trim() || '门诊',
              doctor: row.doctor ? String(row.doctor).trim() : undefined,
              consultedAtLabel: String(row.consultedAtLabel || '近期').trim() || '近期',
              topic: String(row.topic || '面诊').trim() || '面诊',
              linkedVisitId: row.linkedVisitId ? String(row.linkedVisitId).trim() : undefined,
              turns,
              ...(chart ? { chart } : {}),
            }
          })
          .filter((x): x is NonNullable<typeof x> => !!x)
      : [],
  }
}

export async function loadHealthDataset(characterId: string): Promise<HealthDataset> {
  const raw = await personaDb.getPhoneKv(healthKey(characterId))
  return normalizeHealthDataset(raw)
}

export async function saveHealthDataset(characterId: string, dataset: HealthDataset): Promise<void> {
  await personaDb.setPhoneKv(healthKey(characterId), normalizeHealthDataset(dataset))
}

export async function clearHealthDataset(characterId: string): Promise<void> {
  await saveHealthDataset(characterId, emptyHealthDataset())
}

export { hasHealthContent }
