import { personaDb } from '../../newFriendsPersona/idb'
import {
  ensureSavedRecordings,
  normalizeFictionalMobileNumber,
  sanitizeRemarkName,
  sortCallsNewestFirst,
} from './phoneMarkup'
import { emptyPhoneDataset } from './types'
import type { CallMedia, CallRecord, PhoneContact, PhoneDataset } from './types'

const PHONE_KV_PREFIX = 'checkPhone.phone.v1:'

function key(characterId: string) {
  return `${PHONE_KV_PREFIX}${String(characterId || 'unknown').trim()}`
}

function asMedia(raw: unknown): CallMedia {
  const s = String(raw || '').toLowerCase()
  if (s.includes('video') || s.includes('视频')) return 'video'
  return 'voice'
}

function normalizeContact(raw: unknown): PhoneContact | null {
  if (!raw || typeof raw !== 'object') return null
  const c = raw as Partial<PhoneContact>
  const remarkName = sanitizeRemarkName(String(c.remarkName || '').trim())
  const phoneRaw = String(c.phoneNumber || '').trim()
  if (!remarkName || !phoneRaw) return null
  const phoneNumber = normalizeFictionalMobileNumber(phoneRaw)
  const isUser = !!c.isUser
  return {
    id: String(c.id || remarkName).trim() || `c_${Math.random().toString(36).slice(2, 8)}`,
    remarkName,
    displayName: c.displayName?.trim() || undefined,
    phoneNumber,
    note: c.note?.trim() || undefined,
    isEmergency: !!c.isEmergency,
    isFavorite: !!c.isFavorite,
    isBlocked: !!c.isBlocked,
    blockedAt: c.blockedAt?.trim() || undefined,
    relationTag: c.relationTag?.trim() || undefined,
    avatarTone: c.avatarTone?.trim() || undefined,
    avatarGlyph: c.avatarGlyph?.trim() || undefined,
    // 用户联系人头像由界面注入微信头像，不存随机/网友图
    avatarUrl: isUser ? undefined : c.avatarUrl?.trim() || undefined,
    isUser,
    pinyinInitial: c.pinyinInitial?.trim() || undefined,
  }
}

function normalizeCall(raw: unknown): CallRecord | null {
  if (!raw || typeof raw !== 'object') return null
  const c = raw as Partial<CallRecord> & { media?: unknown }
  const remarkName = sanitizeRemarkName(String(c.remarkName || '').trim())
  const phoneRaw = String(c.phoneNumber || '').trim()
  const phoneNumber = phoneRaw && phoneRaw !== '未知号码' ? normalizeFictionalMobileNumber(phoneRaw) : phoneRaw
  if (!remarkName && !phoneNumber) return null
  const direction = c.direction === 'outgoing' || c.direction === 'missed' || c.direction === 'incoming' ? c.direction : 'incoming'
  return {
    id: String(c.id || `call_${Math.random().toString(36).slice(2, 8)}`).trim(),
    contactId: c.contactId?.trim() || undefined,
    remarkName: remarkName || phoneNumber,
    phoneNumber: phoneNumber || '未知号码',
    direction,
    media: asMedia(c.media),
    durationSec: typeof c.durationSec === 'number' ? c.durationSec : undefined,
    timeLabel: String(c.timeLabel || '刚刚').trim(),
    group: c.group === 'yesterday' || c.group === 'earlier' || c.group === 'today' ? c.group : 'today',
    dateLabel: c.dateLabel?.trim() || undefined,
    dateFull: c.dateFull?.trim() || undefined,
    transcript: Array.isArray(c.transcript) ? c.transcript : undefined,
    saved: c.saved === true,
  }
}

function normalizeDataset(raw: unknown): PhoneDataset {
  const empty = emptyPhoneDataset()
  if (!raw || typeof raw !== 'object') return empty
  const rec = raw as Partial<PhoneDataset>
  const base: PhoneDataset = {
    contacts: Array.isArray(rec.contacts) ? rec.contacts.map(normalizeContact).filter((x): x is PhoneContact => !!x) : [],
    calls: sortCallsNewestFirst(
      Array.isArray(rec.calls) ? rec.calls.map(normalizeCall).filter((x): x is CallRecord => !!x) : [],
    ),
  }
  // 旧数据若无「已存」标记，用含稿接通通话补齐，保证「已存录音」Tab 有内容
  return ensureSavedRecordings(base)
}

export function hasPhoneContent(dataset: PhoneDataset): boolean {
  return dataset.calls.length > 0 || dataset.contacts.length > 0
}

export async function loadPhoneDataset(characterId: string): Promise<PhoneDataset> {
  const raw = await personaDb.getPhoneKv(key(characterId))
  if (raw && typeof raw === 'object') return normalizeDataset(raw)
  return emptyPhoneDataset()
}

export async function savePhoneDataset(characterId: string, dataset: PhoneDataset): Promise<void> {
  await personaDb.setPhoneKv(key(characterId), normalizeDataset(dataset))
}

export async function clearPhoneDataset(characterId: string): Promise<void> {
  await personaDb.setPhoneKv(key(characterId), emptyPhoneDataset())
}
