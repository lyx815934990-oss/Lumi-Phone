/** 微信信息页会话行（Lumi 机主界面） */

export type MessagesThreadRow =
  | {
      key: 'lumi'
      kind: 'lumi'
      conversationKey: string
      peerCharacterId: string
      isPinned: boolean
      name: string
      time: string
      preview: string
      avatarUrl: string
      unread: number
      draftPreview?: string
    }
  | {
      key: 'self'
      kind: 'self'
      conversationKey: string
      peerCharacterId: string
      isPinned: boolean
      name: string
      time: string
      preview: string
      avatarUrl: string
      unread: number
      draftPreview?: string
    }
  | {
      key: string
      kind: 'persona'
      conversationKey: string
      peerCharacterId: string
      characterId: string
      isPinned: boolean
      name: string
      time: string
      preview: string
      avatarUrl?: string
      unread: number
      draftPreview?: string
    }
  | {
      key: string
      kind: 'group'
      groupId: string
      conversationKey: string
      peerCharacterId: string
      isPinned: boolean
      name: string
      time: string
      preview: string
      avatarUrl?: string
      unread: number
      draftPreview?: string
    }

export type WxActiveChat =
  | { kind: 'lumi' }
  | { kind: 'self' }
  | { kind: 'persona'; characterId: string }
  | { kind: 'group'; groupId: string }

export type MessagesCategoryFilter = 'all' | 'friends' | 'groups' | 'service'

export function isServiceThread(t: MessagesThreadRow): boolean {
  return t.kind === 'lumi' || t.kind === 'self'
}

export function isFriendThread(t: MessagesThreadRow): boolean {
  return t.kind === 'persona'
}

export function isGroupThread(t: MessagesThreadRow): boolean {
  return t.kind === 'group'
}

export function threadMatchesCategory(t: MessagesThreadRow, cat: MessagesCategoryFilter): boolean {
  if (cat === 'all') return true
  if (cat === 'friends') return isFriendThread(t)
  if (cat === 'groups') return isGroupThread(t)
  return isServiceThread(t)
}
