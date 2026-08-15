export type CallDirection = 'incoming' | 'outgoing' | 'missed'
export type CallGroup = 'today' | 'yesterday' | 'earlier'
export type CallMedia = 'voice' | 'video'

export type PhoneContact = {
  id: string
  remarkName: string
  displayName?: string
  phoneNumber: string
  note?: string
  isEmergency?: boolean
  isFavorite?: boolean
  isBlocked?: boolean
  blockedAt?: string
  relationTag?: string
  avatarTone?: string
  avatarGlyph?: string
  avatarUrl?: string
  /** 是否为用户（玩家）在角色手机里的联系人条目 */
  isUser?: boolean
  pinyinInitial?: string
}

export type CallTranscriptLine = {
  id: string
  /** self = 手机主人(角色)，other = 对方 */
  speaker: 'self' | 'other'
  speakerLabel: string
  text: string
  atSec?: number
}

export type CallRecord = {
  id: string
  contactId?: string
  remarkName: string
  phoneNumber: string
  direction: CallDirection
  media: CallMedia
  durationSec?: number
  timeLabel: string
  group: CallGroup
  dateLabel?: string
  /** 完整日期文案，如 2026年8月11日 */
  dateFull?: string
  transcript?: CallTranscriptLine[]
  /** 角色手机里已存档（AI 痕迹，只读展示） */
  saved?: boolean
}

export type PhoneDataset = {
  contacts: PhoneContact[]
  calls: CallRecord[]
}

export type PhoneTab = 'favorites' | 'recents' | 'contacts' | 'saved'

export type RecentsScreen =
  | { kind: 'callLog' }
  | { kind: 'contactDetail'; contactId: string }
  | { kind: 'transcript'; callId: string }

export type ContactsScreen =
  | { kind: 'hub' }
  | { kind: 'emergency' }
  | { kind: 'favorites' }
  | { kind: 'blocked' }
  | { kind: 'all' }
  | { kind: 'contactDetail'; contactId: string }
  | { kind: 'transcript'; callId: string }

export type FavoritesScreenNav = { kind: 'grid' } | { kind: 'contactDetail'; contactId: string }

export type SavedScreenNav = { kind: 'list' } | { kind: 'transcript'; callId: string }

export function emptyPhoneDataset(): PhoneDataset {
  return { contacts: [], calls: [] }
}
