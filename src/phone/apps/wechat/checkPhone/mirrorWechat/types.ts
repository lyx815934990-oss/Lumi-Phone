export type MirrorWeChatTab = 'chats' | 'contacts' | 'moments' | 'profile'

export type MirrorWeChatGroupMember = {
  /** 稳定键：通讯录 contactId，或 stranger:昵称 */
  key: string
  /** 若在通讯录中则填联系人 id */
  contactId?: string
  /** 微信公开昵称（陌生人仅显示此项） */
  nickname: string
  /** 角色给对方的备注（仅通讯录成员） */
  remarkName?: string
  avatarUrl?: string
  isContact: boolean
  /**
   * 与角色的关系简述（≤20 字）。
   * 非通讯录成员必填语义：如「前同事·已删好友」「同城网友」——删好友但仍同群等。
   * 通讯录成员可复用联系人 relationshipNote。
   */
  relationshipNote?: string
}

export type MirrorWeChatMessage = {
  from: 'player' | 'character'
  content: string
  timestamp: number
  /** 同步翻译译文（生成时勾选「自带翻译」由模型写入） */
  translation?: string
  /** 群聊：非角色发言者键（通讯录 id 或 stranger:…） */
  senderKey?: string
  senderNickname?: string
  senderAvatarUrl?: string
  /** 发言者是否通讯录好友（群聊展示用） */
  isContactSender?: boolean
  special?:
    | { kind: 'red_packet'; amountYuan?: number; remark?: string; opened?: boolean }
    | { kind: 'transfer'; transferId?: string; amountYuan?: number; note?: string; status?: 'pending' | 'accepted' | 'returned' }
    | { kind: 'sticker'; label?: string; imageUrl?: string }
    | { kind: 'image'; imageUrl?: string; mime?: string }
    | {
        kind: 'voice_call'
        status: 'rejected' | 'no_answer' | 'duration'
        durationSec?: number
        /** 通话片段：半角 () 内为听觉旁白；translation 为同步译文 */
        lines?: Array<{ role: 'character' | 'player'; text: string; translation?: string }>
      }
    | {
        kind: 'location'
        name: string
        address?: string
        distance?: string
      }
}

export type MirrorWeChatContact = {
  id: string
  nickname: string
  remarkName: string
  avatarUrl?: string
  /** 通讯录星标朋友（≠ 信息页置顶） */
  isStarred?: boolean
  /** 信息页会话置顶（≠ 星标） */
  isPinned?: boolean
  blocked?: boolean
  characterId?: string
  /** 额外联系人：与生成同次模型输出，供长期记忆 */
  relationshipNote?: string
  remarkWhy?: string
  /** 缺省为私聊；group = 群会话（仍挂在 contacts 列表里便于信息页统一渲染） */
  kind?: 'dm' | 'group'
  /** 群聊显示名 */
  groupName?: string
  /** 群成员（含通讯录好友与陌生人） */
  members?: MirrorWeChatGroupMember[]
  messages: MirrorWeChatMessage[]
}

export type MirrorWeChatMoment = {
  id: string
  content: string
  visibility: string
  likes: string[]
  comments: Array<{ from: string; content: string }>
}

export type MirrorWeChatBill = {
  id: string
  date: string
  target: string
  amount: number
  remark: string
}

export type MirrorWeChatAffectionCard = {
  id: string
  holder: string
  limit: number
  spent: number
}

export type MirrorWeChatProfile = {
  nickname: string
  avatarUrl?: string
  signature: string
}

export type MirrorWeChatState = {
  profile: MirrorWeChatProfile | null
  contacts: MirrorWeChatContact[]
  moments: MirrorWeChatMoment[]
  bills: MirrorWeChatBill[]
  affectionCards: MirrorWeChatAffectionCard[]
  /** 含 `me`（我页）等与同步 scope 对应的键，便于与 IndexedDB 缓存一致 */
  lastGeneratedAt: Partial<Record<string, number>>
}

export type MirrorWeChatGenerateForm = {
  count: number
  bias: string
  includeBlocked?: boolean
  includeHideFromUser?: boolean
  includeOnlyTaVisible?: boolean
}

export function isMirrorGroupContact(c: Pick<MirrorWeChatContact, 'kind' | 'id'> | null | undefined): boolean {
  if (!c) return false
  if (c.kind === 'group') return true
  return String(c.id || '').startsWith('group:')
}

/** 去掉括号后缀与分隔符，便于「林思佳」命中「林思佳（管弦教研室）」 */
export function normalizeMirrorPersonName(raw: string): string {
  return String(raw || '')
    .trim()
    .replace(/（[^）]*）/g, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/[·•・\s\-—_／/|｜]+/g, '')
    .toLowerCase()
}

/**
 * 用昵称/备注把群里的「同名陌生人」挂回通讯录私聊联系人。
 * 优先精确归一化匹配，再允许前缀包含（最短命中段 ≥2 字，单字仅精确）。
 */
export function findMirrorDmContactByName(
  contacts: Array<Pick<MirrorWeChatContact, 'id' | 'nickname' | 'remarkName' | 'avatarUrl' | 'relationshipNote' | 'kind'>>,
  nameHint: string,
): (typeof contacts)[number] | undefined {
  const hintRaw = String(nameHint || '')
    .trim()
    .replace(/^s:/i, '')
  const hint = normalizeMirrorPersonName(hintRaw)
  if (!hint) return undefined
  const dms = contacts.filter((c) => !isMirrorGroupContact(c as MirrorWeChatContact))
  const candidatesOf = (c: (typeof contacts)[number]) =>
    [c.remarkName, c.nickname].map((x) => String(x || '').trim()).filter(Boolean)

  for (const c of dms) {
    for (const cand of candidatesOf(c)) {
      if (normalizeMirrorPersonName(cand) === hint) return c
    }
  }

  if (hint.length < 2) return undefined
  let best: (typeof contacts)[number] | undefined
  let bestScore = 0
  for (const c of dms) {
    for (const cand of candidatesOf(c)) {
      const cn = normalizeMirrorPersonName(cand)
      if (!cn || cn.length < 2) continue
      if (cn.startsWith(hint) || hint.startsWith(cn)) {
        const score = Math.min(cn.length, hint.length)
        if (score > bestScore) {
          bestScore = score
          best = c
        }
      }
    }
  }
  return best
}
