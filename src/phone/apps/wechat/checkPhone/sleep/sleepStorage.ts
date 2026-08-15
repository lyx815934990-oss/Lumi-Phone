import { personaDb } from '../../newFriendsPersona/idb'
import { emptySleepDataset, historyFromNights } from './mockData'
import type { SleepDataset, SleepNightRecord } from './types'

const SLEEP_KV_PREFIX = 'checkPhone.sleep.v1:'

function sleepKey(characterId: string) {
  return `${SLEEP_KV_PREFIX}${String(characterId || 'unknown').trim()}`
}

function isNightRecord(v: unknown): v is SleepNightRecord {
  if (!v || typeof v !== 'object') return false
  const r = v as Partial<SleepNightRecord>
  return (
    typeof r.dateKey === 'string' &&
    typeof r.fellAsleepAt === 'string' &&
    typeof r.wokeAt === 'string' &&
    typeof r.totalSleepMin === 'number' &&
    Array.isArray(r.stages)
  )
}

export async function loadSleepDataset(characterId: string): Promise<SleepDataset> {
  const raw = await personaDb.getPhoneKv(sleepKey(characterId))
  if (!raw || typeof raw !== 'object') return emptySleepDataset()
  const rec = raw as Partial<SleepDataset>
  const nights = Array.isArray(rec.nights) ? rec.nights.filter(isNightRecord) : []
  nights.sort((a, b) => a.dateKey.localeCompare(b.dateKey))
  return {
    nights,
    history: Array.isArray(rec.history) && rec.history.length ? rec.history : historyFromNights(nights),
  }
}

export async function saveSleepDataset(characterId: string, dataset: SleepDataset): Promise<void> {
  const nights = Array.isArray(dataset.nights) ? dataset.nights.filter(isNightRecord) : []
  nights.sort((a, b) => a.dateKey.localeCompare(b.dateKey))
  const normalized: SleepDataset = {
    nights,
    history: historyFromNights(nights),
  }
  await personaDb.setPhoneKv(sleepKey(characterId), normalized)
}

export async function clearSleepDataset(characterId: string): Promise<void> {
  await saveSleepDataset(characterId, emptySleepDataset())
}
