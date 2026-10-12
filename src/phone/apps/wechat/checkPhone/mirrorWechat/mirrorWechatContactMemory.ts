import type { ApiConfig } from '../../../api/types'
import { personaDb } from '../../newFriendsPersona/idb'
import type { CharacterMemory } from '../../newFriendsPersona/types'
import {
  buildMirrorChatSummaryJobs,
  buildMirrorGroupChatSummaryJobs,
  buildRuleBasedContactChatSummary,
  buildRuleBasedGroupChatSummary,
  convertMirrorFirstPersonToCharPlaceholder,
  formatMirrorGroupMemberMemoryLabels,
  resolveMirrorChatTimeSpan,
  summarizeMirrorChatsWithAi,
  summarizeMirrorGroupChatsWithAi,
} from './mirrorWechatChatMemoryAi'
import { isMirrorGroupContact, type MirrorWeChatContact } from './types'

/**
 * 与 `spyWechatAi.ts` 中 `playerContactId` 规则一致，用于在镜像通讯录中识别「用户」这一行（勿与无 characterId 的虚拟混用）
 */
export function getMirrorPlayerContactId(playerIdentityId: string) {
  const pi = String(playerIdentityId || '').trim()
  return `player:${pi || 'current'}`
}

/** 旧版仅「额外联系人」的备忘主键，写入新版时会删除以免两条并存 */
const LEGACY_MEMO_ID_PREFIX = 'mirrorWx.extraContactsMem.v1:'
const ADDRESS_BOOK_MEMO_ID_PREFIX = 'mirrorWx.addressBookMem.v1:'
/** 旧版整包聊天记忆；新版改为 meta + 按联系人拆条 */
const CHAT_MEMO_LEGACY_ID_PREFIX = 'mirrorWx.chatsMem.v1:'
const CHAT_MEMO_META_ID_PREFIX = 'mirrorWx.chatMemMeta.v1:'
const CHAT_MEMO_CONTACT_ID_PREFIX = 'mirrorWx.chatMemContact.v1:'
/** 群聊记忆：按群一条，不进通讯录备忘 */
const CHAT_MEMO_GROUP_ID_PREFIX = 'mirrorWx.chatMemGroup.v1:'

/** 记忆馆场景前缀：与 `parseMemorySourcePrefix` 的 `[通讯录]` 对齐 */
const ADDRESS_BOOK_SCENE_PREFIX = '[通讯录]'
const GROUP_CHAT_SCENE_PREFIX = '[群聊]'

function addressBookMemoId(characterId: string) {
  return `${ADDRESS_BOOK_MEMO_ID_PREFIX}${characterId.trim()}`
}
function legacyMemoId(characterId: string) {
  return `${LEGACY_MEMO_ID_PREFIX}${characterId.trim()}`
}
function chatMemoMetaId(characterId: string) {
  return `${CHAT_MEMO_META_ID_PREFIX}${characterId.trim()}`
}
function chatMemoContactId(characterId: string, contactId: string) {
  return `${CHAT_MEMO_CONTACT_ID_PREFIX}${characterId.trim()}:${contactId.trim()}`
}
function chatMemoGroupId(characterId: string, groupId: string) {
  return `${CHAT_MEMO_GROUP_ID_PREFIX}${characterId.trim()}:${groupId.trim()}`
}

function isMirrorChatMemoryId(id: string, characterId: string): boolean {
  const cid = characterId.trim()
  const mid = String(id || '')
  return (
    mid === `${CHAT_MEMO_LEGACY_ID_PREFIX}${cid}` ||
    mid === chatMemoMetaId(cid) ||
    mid.startsWith(`${CHAT_MEMO_CONTACT_ID_PREFIX}${cid}:`) ||
    mid.startsWith(`${CHAT_MEMO_GROUP_ID_PREFIX}${cid}:`)
  )
}

function stripSummaryBody(content: string): string {
  let s = String(content || '').trim()
  if (s.startsWith(ADDRESS_BOOK_SCENE_PREFIX)) {
    s = s.slice(ADDRESS_BOOK_SCENE_PREFIX.length).replace(/^\s+/, '')
  }
  if (s.startsWith(GROUP_CHAT_SCENE_PREFIX)) {
    s = s.slice(GROUP_CHAT_SCENE_PREFIX.length).replace(/^\s+/, '')
  }
  // 去掉标题行，留给 AI 的「既往摘要」更干净
  s = s.replace(/^【查手机·镜像微信｜与「[^」]+」的私聊摘要】\s*/u, '')
  s = s.replace(/^【群聊·[^\n]+】\s*/u, '')
  s = s.replace(/^【私聊·[^\n]+】\s*/u, '')
  s = s.replace(/^与「[^」]+」[：:]\s*/u, '')
  s = s.replace(/^群名[：:][^\n]+\n?/u, '')
  s = s.replace(/^成员[：:][^\n]+\n?/u, '')
  s = s.replace(/^私聊时间[：:][^\n]+\n?/u, '')
  s = s.replace(/^群聊时间[：:][^\n]+\n?/u, '')
  s = s.replace(/^摘要[：:]\s*/u, '')
  s = s.replace(
    /（完整气泡原文仅存在于(?:\{\{char\}\}|我)手机聊天记录本地；本条为摘要要点，供相关话题时调用。）\s*$/u,
    '',
  )
  return s.trim()
}

const EMPTY_RELATION_RE =
  /^(星标好友|通讯录好友|微信好友|人脉联系人|普通联系|好友|联系人)$/u

/** 关系描述压到 ≤20 字；不是星标/置顶状态 */
function clampRelationDesc(raw: string, max = 20): string {
  const t = String(raw || '')
    .replace(/\s+/g, '')
    .replace(/[（(][^）)]*[）)]/g, '')
    .replace(/^(关系|与角色)[:：]/u, '')
    .trim()
  if (!t || EMPTY_RELATION_RE.test(t)) return ''
  return t.length <= max ? t : t.slice(0, max)
}

/** 备注括号里常是职务/关系（如 石川さん（エンジニア）） */
function relationFromRemarkParen(remark: string): string {
  const m = String(remark || '').match(/[（(]([^）)]{1,20})[）)]/)
  return clampRelationDesc(m?.[1] || '')
}

/** 通讯录极简一行：名（备注X）（与char关系）（置顶/星标/已拉黑） */
function formatAddressBookContactLine(c: MirrorWeChatContact, isUser: boolean): string {
  const nick = (c.nickname || '').trim() || '联系人'
  const remark = (c.remarkName || '').trim() || '未设'
  const name = isUser ? '{{user}}' : nick
  const rel =
    clampRelationDesc(c.relationshipNote || '') ||
    clampRelationDesc(c.remarkWhy || '') ||
    relationFromRemarkParen(remark) ||
    (isUser ? '主会话对象' : '')
  const tags: string[] = []
  if (c.isPinned) tags.push('置顶')
  if (c.isStarred) tags.push('星标')
  if (c.blocked) tags.push('已拉黑')
  const relPart = rel ? `（${rel}）` : ''
  const tagPart = tags.map((t) => `（${t}）`).join('')
  return `${name}（备注${remark}）${relPart}${tagPart}`
}

function mergeKeywords(...groups: Array<string[] | undefined | null>): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const g of groups) {
    for (const raw of g || []) {
      const kw = String(raw || '')
        .replace(/\s+/g, '')
        .trim()
        .slice(0, 16)
      if (!kw) continue
      const key = kw.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      out.push(kw)
      if (out.length >= 16) return out
    }
  }
  return out
}

export async function clearMirrorWeChatAddressBookMemory(characterId: string): Promise<void> {
  const cid = characterId.trim()
  if (!cid) return
  try {
    await personaDb.deleteCharacterMemory(addressBookMemoId(cid))
    await personaDb.deleteCharacterMemory(legacyMemoId(cid))
    await clearMirrorWeChatChatMemory(cid)
  } catch (e) {
    console.warn('清除查手机通讯录长期记忆失败:', e)
  }
}

export async function clearMirrorWeChatChatMemory(characterId: string): Promise<void> {
  const cid = characterId.trim()
  if (!cid) return
  try {
    const rows = await personaDb.listCharacterMemoriesForCharacter(cid)
    for (const m of rows) {
      if (isMirrorChatMemoryId(m.id, cid)) {
        await personaDb.deleteCharacterMemory(m.id)
      }
    }
  } catch (e) {
    console.warn('清除查手机聊天长期记忆失败:', e)
  }
}

/** 按联系人/群 id 删除镜像私聊或群聊摘要记忆（清除会话气泡时同步调用） */
export async function deleteMirrorWeChatChatMemoryForContacts(
  characterId: string,
  contactIds: readonly string[],
): Promise<void> {
  const cid = characterId.trim()
  if (!cid || !contactIds.length) return
  try {
    for (const raw of contactIds) {
      const id = String(raw || '').trim()
      if (!id) continue
      await personaDb.deleteCharacterMemory(chatMemoContactId(cid, id))
      await personaDb.deleteCharacterMemory(chatMemoGroupId(cid, id))
    }
    const rows = await personaDb.listCharacterMemoriesForCharacter(cid)
    const contactPrefix = `${CHAT_MEMO_CONTACT_ID_PREFIX}${cid}:`
    const groupPrefix = `${CHAT_MEMO_GROUP_ID_PREFIX}${cid}:`
    const remain = rows.filter(
      (m) => m.id.startsWith(contactPrefix) || m.id.startsWith(groupPrefix),
    )
    if (!remain.length) {
      await personaDb.deleteCharacterMemory(`${CHAT_MEMO_LEGACY_ID_PREFIX}${cid}`)
    }
    await personaDb.deleteCharacterMemory(chatMemoMetaId(cid))
  } catch (e) {
    console.warn('按联系人/群删除查手机聊天记忆失败:', e)
  }
}

/**
 * 将镜像微信「信息页」私聊 + 群聊纳入角色长期记忆（摘要 + 关键词触发）。
 *
 * 策略：
 * 1) 每联系人一条私聊摘要；每个群一条群聊摘要（成员不进通讯录备忘）
 * 2) 私聊含：备注、私聊时间（首末气泡）、内容摘要；群聊含：群名、成员、群聊时间、内容摘要
 * 3) 关键词由模型提炼；失败时回退备注/群名
 * 4) 不整库清空：只覆盖本轮有消息的会话
 */
export async function syncMirrorWeChatChatsToCharacterMemory(
  characterId: string,
  playerIdentityId: string,
  contacts: readonly MirrorWeChatContact[],
  opts?: {
    apiConfig?: ApiConfig | null
    /**
     * 是否用模型生成/整合长期记忆摘要（与私聊自动总结同逻辑）。
     * 默认 true：一次请求批量输出各联系人摘要；无 API 或失败时回退规则摘要。
     */
    useAiSummary?: boolean
  },
): Promise<void> {
  const cid = characterId.trim()
  if (!cid) return
  const playerId = getMirrorPlayerContactId(playerIdentityId)

  const chatRows = contacts.filter(
    (c) =>
      c.id !== playerId &&
      !isMirrorGroupContact(c) &&
      Array.isArray(c.messages) &&
      c.messages.length > 0,
  )
  const groupRows = contacts.filter(
    (c) => isMirrorGroupContact(c) && Array.isArray(c.messages) && c.messages.length > 0,
  )

  // 仅清旧版整包键 / 重复的私聊备忘索引，保留按联系人/群拆条以便整合覆盖
  try {
    await personaDb.deleteCharacterMemory(`${CHAT_MEMO_LEGACY_ID_PREFIX}${cid}`)
    await personaDb.deleteCharacterMemory(chatMemoMetaId(cid))
  } catch {
    /* ignore */
  }

  if (!chatRows.length && !groupRows.length) {
    return
  }

  const now = Date.now()
  const MAX_CONTACTS = 24
  const MAX_GROUPS = 12
  const picked = chatRows.slice(0, MAX_CONTACTS)
  const pickedGroups = groupRows.slice(0, MAX_GROUPS)
  const useAi = opts?.useAiSummary !== false

  // 读取既往摘要供整合
  const previousByContactId = new Map<string, string>()
  const previousByGroupId = new Map<string, string>()
  try {
    const existing = await personaDb.listCharacterMemoriesForCharacter(cid)
    const contactPrefix = `${CHAT_MEMO_CONTACT_ID_PREFIX}${cid}:`
    const groupPrefix = `${CHAT_MEMO_GROUP_ID_PREFIX}${cid}:`
    for (const m of existing) {
      if (m.id.startsWith(contactPrefix)) {
        const contactId = m.id.slice(contactPrefix.length)
        if (contactId) previousByContactId.set(contactId, stripSummaryBody(m.content))
      } else if (m.id.startsWith(groupPrefix)) {
        const groupId = m.id.slice(groupPrefix.length)
        if (groupId) previousByGroupId.set(groupId, stripSummaryBody(m.content))
      }
    }
  } catch (e) {
    console.warn('读取既有镜像聊天摘要失败:', e)
  }

  if (picked.length) {
    const jobs = buildMirrorChatSummaryJobs(picked, previousByContactId, playerId)
    const summaryMap = useAi
      ? await summarizeMirrorChatsWithAi({ apiConfig: opts?.apiConfig, jobs })
      : new Map(jobs.map((j) => [j.contactId, buildRuleBasedContactChatSummary(j)] as const))

    for (const c of picked) {
      const label = (c.remarkName || c.nickname || '联系人').trim() || '联系人'
      const nick = (c.nickname || '').trim()
      const timeLabel = resolveMirrorChatTimeSpan(c).label
      const ai = summaryMap.get(c.id)
      const summaryBody =
        ai?.summary.trim() ||
        convertMirrorFirstPersonToCharPlaceholder(`{{char}} 与 ${label} 有私聊往来。`)
      /** 与群聊同构：场景前缀 + 标题 + 时间 + 摘要，避免引用记忆时丢失时序 */
      const content = convertMirrorFirstPersonToCharPlaceholder(
        [
          ADDRESS_BOOK_SCENE_PREFIX,
          `【私聊·${label}】`,
          `私聊时间：${timeLabel}`,
          `摘要：${summaryBody}`,
        ].join('\n'),
      )
      const keywords = mergeKeywords(
        ai?.keywords,
        [label, nick].filter((x) => x.length >= 1 && x.length <= 16),
      )

      const row: CharacterMemory = {
        id: chatMemoContactId(cid, c.id),
        characterId: cid,
        content,
        createdAt: now,
        updatedAt: now,
        isAutoGenerated: true,
        memoryTriggerMode: 'keyword',
        memoryTriggerCategory: '通讯录',
        memoryTriggerPrecise: label.slice(0, 24),
        memoryKeywords: keywords.length ? keywords : [label],
      }
      try {
        await personaDb.upsertCharacterMemory(row)
      } catch (e) {
        console.warn('写入查手机联系人聊天摘要失败:', e)
      }
    }
  }

  if (pickedGroups.length) {
    const groupJobs = buildMirrorGroupChatSummaryJobs(pickedGroups, previousByGroupId)
    const groupSummaryMap = useAi
      ? await summarizeMirrorGroupChatsWithAi({ apiConfig: opts?.apiConfig, jobs: groupJobs })
      : new Map(groupJobs.map((j) => [j.groupId, buildRuleBasedGroupChatSummary(j)] as const))

    for (const g of pickedGroups) {
      const groupName = (g.groupName || g.remarkName || g.nickname || '群聊').trim() || '群聊'
      const memberLabels = formatMirrorGroupMemberMemoryLabels(g)
      const timeLabel = resolveMirrorChatTimeSpan(g).label
      const ai = groupSummaryMap.get(g.id)
      const summaryBody =
        ai?.summary.trim() ||
        convertMirrorFirstPersonToCharPlaceholder(`{{char}} 在群「${groupName}」中有群聊往来。`)
      const membersLine = memberLabels.length ? memberLabels.join('、') : '（成员未标注）'
      /** 按群一条：群名 / 成员 / 时间 / 摘要 —— 成员不进通讯录备忘 */
      const content = convertMirrorFirstPersonToCharPlaceholder(
        [
          GROUP_CHAT_SCENE_PREFIX,
          `【群聊·${groupName}】`,
          `群名：${groupName}`,
          `成员：${membersLine}`,
          `群聊时间：${timeLabel}`,
          `摘要：${summaryBody}`,
        ].join('\n'),
      )
      const keywords = mergeKeywords(
        ai?.keywords,
        [groupName, '群聊', ...memberLabels.slice(0, 4)].filter(
          (x) => x.length >= 1 && x.length <= 16,
        ),
      )

      const row: CharacterMemory = {
        id: chatMemoGroupId(cid, g.id),
        characterId: cid,
        content,
        createdAt: now,
        updatedAt: now,
        isAutoGenerated: true,
        memoryTriggerMode: 'keyword',
        memoryTriggerCategory: '群聊',
        memoryTriggerPrecise: groupName.slice(0, 24),
        memoryKeywords: keywords.length ? keywords : [groupName, '群聊'],
      }
      try {
        await personaDb.upsertCharacterMemory(row)
      } catch (e) {
        console.warn('写入查手机群聊摘要失败:', e)
      }
    }
  }
}

/**
 * 将镜像微信通讯录同步为极简长期记忆：
 * 每人一行「名（备注X）（关系≤20字）」；用户本行名为 {{user}}。
 * 无规范说明 / 分段标题 / 调用提示。
 */
export async function syncMirrorWeChatAddressBookToCharacterMemory(
  characterId: string,
  playerIdentityId: string,
  contacts: readonly MirrorWeChatContact[],
  _opts?: {
    apiConfig?: ApiConfig | null
    useAiKeywords?: boolean
  },
): Promise<void> {
  const cid = characterId.trim()
  if (!cid) return
  const newId = addressBookMemoId(cid)
  const playerId = getMirrorPlayerContactId(playerIdentityId)

  const dmOnly = contacts.filter(
    (c) => c.kind !== 'group' && !String(c.id || '').startsWith('group:'),
  )
  const ordered = [
    ...dmOnly.filter((c) => c.id === playerId),
    ...dmOnly.filter((c) => c.id !== playerId),
  ]
  if (!ordered.length) {
    try {
      await personaDb.deleteCharacterMemory(newId)
      await personaDb.deleteCharacterMemory(legacyMemoId(cid))
    } catch (e) {
      console.warn('删除查手机通讯录长期记忆失败:', e)
    }
    return
  }

  // 仅私聊通讯录行；群成员（含非联系人）一律写在群聊记忆里，禁止混入通讯录备忘
  const bodyLines = ordered.map((c) => formatAddressBookContactLine(c, c.id === playerId))
  const content = convertMirrorFirstPersonToCharPlaceholder(
    [ADDRESS_BOOK_SCENE_PREFIX, ...bodyLines].join('\n'),
  )

  const nameKeywords = ordered
    .flatMap((c) => [c.remarkName, c.nickname])
    .map((x) => String(x || '').trim())
    .filter((x) => x.length >= 1 && x.length <= 24)
    .slice(0, 14)
  const memoryKeywords = mergeKeywords(['通讯录'], nameKeywords)

  const now = Date.now()
  const row: CharacterMemory = {
    id: newId,
    characterId: cid,
    content,
    createdAt: now,
    updatedAt: now,
    isAutoGenerated: true,
    memoryTriggerMode: 'always',
    memoryTriggerCategory: '通讯录',
    memoryKeywords: memoryKeywords.length ? memoryKeywords : ['通讯录'],
  }
  try {
    await personaDb.upsertCharacterMemory(row)
    await personaDb.deleteCharacterMemory(legacyMemoId(cid))
    await personaDb.deleteCharacterMemory(chatMemoMetaId(cid))
  } catch (e) {
    console.warn('写入查手机通讯录长期记忆失败:', e)
  }
}
