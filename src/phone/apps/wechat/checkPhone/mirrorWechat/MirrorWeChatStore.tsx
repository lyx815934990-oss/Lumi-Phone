import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

import type { SpyWechatGeneratedData } from '../spyWechatAi'
import { loadMirrorWeChatState, saveMirrorWeChatState } from './mirrorWechatStorage'
import type { MirrorWeChatMessage, MirrorWeChatState, MirrorWeChatTab } from './types'

type MirrorWeChatStoreValue = {
  state: MirrorWeChatState
  /** IndexedDB 水合完成前勿依赖本地缓存的完整性（避免竞态） */
  hydrated: boolean
  mergeGenerated: (scope: 'contacts' | 'chats' | 'moments' | 'me', data: SpyWechatGeneratedData, mode?: 'generate' | 'update') => void
  /** 清空指定联系人的会话气泡（通讯录行保留） */
  clearChatMessagesForContacts: (contactIds: readonly string[]) => void
  /** 从通讯录移除指定联系人（其聊天一并没了） */
  removeContactsByIds: (contactIds: readonly string[]) => void
  /** 按匹配条件改写某会话内一条消息（如红包 opened） */
  patchContactMessage: (
    contactId: string,
    match: (m: MirrorWeChatMessage, index: number) => boolean,
    patch: (m: MirrorWeChatMessage) => MirrorWeChatMessage,
  ) => void
  /** 向某会话末尾追加一条消息（如「你领取了…的红包」系统条） */
  appendContactMessage: (contactId: string, message: MirrorWeChatMessage) => void
  /**
   * 按当前页清除本地缓存：
   * - contacts：清空通讯录（聊天一并没了）
   * - chats：只清空各联系人消息，通讯录行保留
   * - moments / profile：只清对应页数据
   */
  clearByTab: (tab: MirrorWeChatTab) => void
  reset: () => void
}

const initialState: MirrorWeChatState = {
  profile: null,
  contacts: [],
  moments: [],
  bills: [],
  affectionCards: [],
  lastGeneratedAt: {},
}

const MirrorWeChatStoreContext = createContext<MirrorWeChatStoreValue | null>(null)

function isGroupRow(c: { kind?: string; id?: string } | null | undefined): boolean {
  if (!c) return false
  if (c.kind === 'group') return true
  return String(c.id || '').startsWith('group:')
}

function mergeChatMessages(
  prev: SpyWechatGeneratedData['contacts'][number]['messages'],
  next: SpyWechatGeneratedData['contacts'][number]['messages'],
): SpyWechatGeneratedData['contacts'][number]['messages'] {
  const all = [...(Array.isArray(prev) ? prev : []), ...(Array.isArray(next) ? next : [])]
  const dedup = new Map<string, SpyWechatGeneratedData['contacts'][number]['messages'][number]>()
  for (const m of all) {
    const key = `${m.from}|${m.senderKey || ''}|${m.timestamp}|${m.content}|${JSON.stringify(m.special || null)}`
    if (!dedup.has(key)) dedup.set(key, m)
  }
  return Array.from(dedup.values()).sort((a, b) => a.timestamp - b.timestamp)
}

function mergeContactsForUpdate(
  prev: MirrorWeChatState['contacts'],
  incoming: MirrorWeChatState['contacts'],
): MirrorWeChatState['contacts'] {
  const incomingById = new Map(incoming.map((c) => [c.id, c] as const))
  const merged = prev.map((oldC) => {
    const nextC = incomingById.get(oldC.id)
    if (!nextC) return oldC
    incomingById.delete(oldC.id)
    return {
      ...oldC,
      // 更新模式：优先保留现有联系人主体与 id，仅更新可变字段
      // 强保护：已有联系人昵称视作“身份锚点”，更新时不允许被模型改成另一个人
      nickname: isGroupRow(oldC) ? nextC.nickname || oldC.nickname : oldC.nickname,
      remarkName: nextC.remarkName || oldC.remarkName,
      isStarred: typeof nextC.isStarred === 'boolean' ? nextC.isStarred : oldC.isStarred,
      isPinned: typeof nextC.isPinned === 'boolean' ? nextC.isPinned : oldC.isPinned,
      blocked: typeof nextC.blocked === 'boolean' ? nextC.blocked : oldC.blocked,
      relationshipNote: nextC.relationshipNote || oldC.relationshipNote,
      remarkWhy: nextC.remarkWhy || oldC.remarkWhy,
      avatarUrl: oldC.avatarUrl || nextC.avatarUrl,
      kind: nextC.kind || oldC.kind,
      groupName: nextC.groupName || oldC.groupName,
      members: nextC.members?.length ? nextC.members : oldC.members,
      messages: mergeChatMessages(oldC.messages, nextC.messages),
    }
  })
  // 仅追加“确实新出现”的联系人
  for (const c of incomingById.values()) merged.push(c)
  return merged
}

export function MirrorWeChatStoreProvider({
  children,
  characterId,
  playerIdentityId,
}: {
  children: ReactNode
  characterId: string
  playerIdentityId: string
}) {
  const [state, setState] = useState<MirrorWeChatState>(initialState)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    let cancelled = false
    setHydrated(false)
    setState(initialState)
    void (async () => {
      const loaded = await loadMirrorWeChatState(characterId, playerIdentityId)
      if (cancelled) return
      if (loaded) {
        setState(loaded)
      } else {
        setState(initialState)
      }
      setHydrated(true)
    })()
    return () => {
      cancelled = true
    }
  }, [characterId, playerIdentityId])

  useEffect(() => {
    if (!hydrated) return
    void saveMirrorWeChatState(characterId, playerIdentityId, state)
  }, [state, hydrated, characterId, playerIdentityId])

  const value = useMemo<MirrorWeChatStoreValue>(
    () => ({
      state,
      hydrated,
      mergeGenerated(scope, data, mode = 'generate') {
        setState((prev) => {
          const normalizedIncoming = (data.contacts || []).map((contact) => ({
            ...contact,
            messages: Array.isArray(contact.messages) ? contact.messages : [],
          }))
          const nextContacts =
            scope === 'contacts'
              ? (() => {
                  // 通讯录：其它联系人保留旧消息；用户本行强制用本轮真实头像/备注/私聊（清掉历史编造）
                  // 群会话不在通讯录生成结果里，整表重做时要保留旧群
                  const isPlayerId = (id: string) => String(id || '').startsWith('player:')
                  const prevGroups = prev.contacts.filter((c) => isGroupRow(c))
                  if (mode === 'update') {
                    const dmIncoming = normalizedIncoming.filter((c) => !isGroupRow(c))
                    const merged = mergeContactsForUpdate(
                      prev.contacts.filter((c) => !isGroupRow(c)),
                      dmIncoming,
                    )
                    const withMsgs = merged.map((c) => {
                      const incoming = dmIncoming.find((x) => x.id === c.id)
                      if (isPlayerId(c.id) && incoming) {
                        return {
                          ...c,
                          nickname: incoming.nickname || c.nickname,
                          remarkName: incoming.remarkName || c.remarkName,
                          avatarUrl: incoming.avatarUrl || c.avatarUrl,
                          messages: incoming.messages || [],
                        }
                      }
                      const old = prev.contacts.find((x) => x.id === c.id)
                      return { ...c, messages: old?.messages?.length ? old.messages : [] }
                    })
                    return [...withMsgs, ...prevGroups]
                  }
                  // 生成（非更新）：整表替换私聊通讯录；非用户行清空旧聊天；旧群会话保留
                  const nextDms = normalizedIncoming
                    .filter((c) => !isGroupRow(c))
                    .map((c) => ({
                      ...c,
                      messages: isPlayerId(c.id) ? c.messages || [] : [],
                    }))
                  return [...nextDms, ...prevGroups]
                })()
              : scope === 'chats'
                ? (() => {
                    // chats：只更新消息；用户本行用系统复制的真实私聊整表替换（禁止与旧编造记录混拼）
                    // 新群会话（kind=group）按 id 追加/覆盖
                    const incomingById = new Map(normalizedIncoming.map((c) => [c.id, c] as const))
                    const merged = prev.contacts.map((oldC) => {
                      const incoming = incomingById.get(oldC.id)
                      if (!incoming) return oldC
                      incomingById.delete(oldC.id)
                      const isPlayerRow = String(oldC.id || '').startsWith('player:')
                      const asGroup = isGroupRow(incoming) || isGroupRow(oldC)
                      return {
                        ...oldC,
                        ...(asGroup
                          ? {
                              kind: 'group' as const,
                              groupName: incoming.groupName || oldC.groupName,
                              members: incoming.members?.length ? incoming.members : oldC.members,
                              nickname: incoming.nickname || oldC.nickname,
                              remarkName: incoming.remarkName || oldC.remarkName,
                              avatarUrl: incoming.avatarUrl || oldC.avatarUrl,
                              isPinned:
                                typeof incoming.isPinned === 'boolean'
                                  ? incoming.isPinned
                                  : oldC.isPinned,
                            }
                          : null),
                        messages: isPlayerRow
                          ? Array.isArray(incoming.messages)
                            ? incoming.messages
                            : []
                          : mode === 'generate'
                            ? Array.isArray(incoming.messages)
                              ? incoming.messages
                              : []
                            : mergeChatMessages(oldC.messages, incoming.messages),
                      }
                    })
                    for (const c of incomingById.values()) merged.push(c)
                    return merged
                  })()
                : prev.contacts
          const next: MirrorWeChatState = {
            ...prev,
            profile:
              scope === 'contacts' || scope === 'me'
                ? data.profile?.nickname
                  ? data.profile
                  : prev.profile
                : prev.profile,
            lastGeneratedAt: { ...prev.lastGeneratedAt, [scope]: Date.now() },
            contacts: nextContacts,
            moments: scope === 'moments' ? data.moments || [] : prev.moments,
            bills: scope === 'me' ? data.bills || [] : prev.bills,
            affectionCards: scope === 'me' ? data.affectionCards || [] : prev.affectionCards,
          }
          return next
        })
      },
      clearChatMessagesForContacts(contactIds) {
        const idSet = new Set(contactIds.map((x) => String(x || '').trim()).filter(Boolean))
        if (!idSet.size) return
        setState((prev) => ({
          ...prev,
          contacts: prev.contacts.map((c) =>
            idSet.has(c.id) ? { ...c, messages: [] } : c,
          ),
        }))
      },
      removeContactsByIds(contactIds) {
        const idSet = new Set(contactIds.map((x) => String(x || '').trim()).filter(Boolean))
        if (!idSet.size) return
        setState((prev) => ({
          ...prev,
          contacts: prev.contacts.filter((c) => !idSet.has(c.id)),
        }))
      },
      patchContactMessage(contactId, match, patch) {
        const cid = String(contactId || '').trim()
        if (!cid) return
        setState((prev) => ({
          ...prev,
          contacts: prev.contacts.map((c) => {
            if (c.id !== cid) return c
            let hit = false
            const messages = (c.messages || []).map((m, i) => {
              if (hit || !match(m, i)) return m
              hit = true
              return patch(m)
            })
            return hit ? { ...c, messages } : c
          }),
        }))
      },
      appendContactMessage(contactId, message) {
        const cid = String(contactId || '').trim()
        if (!cid) return
        setState((prev) => ({
          ...prev,
          contacts: prev.contacts.map((c) =>
            c.id === cid
              ? { ...c, messages: [...(c.messages || []), message] }
              : c,
          ),
        }))
      },
      clearByTab(tab) {
        setState((prev) => {
          if (tab === 'contacts') {
            const { contacts: _c, ...restAt } = prev.lastGeneratedAt
            const { chats: _ch, ...restAt2 } = restAt
            return {
              ...prev,
              contacts: [],
              lastGeneratedAt: restAt2,
            }
          }
          if (tab === 'chats') {
            const { chats: _ch, ...restAt } = prev.lastGeneratedAt
            return {
              ...prev,
              contacts: prev.contacts.map((c) => ({ ...c, messages: [] })),
              lastGeneratedAt: restAt,
            }
          }
          if (tab === 'moments') {
            const { moments: _m, ...restAt } = prev.lastGeneratedAt
            return {
              ...prev,
              moments: [],
              lastGeneratedAt: restAt,
            }
          }
          // profile / 我
          const { me: _me, ...restAt } = prev.lastGeneratedAt
          return {
            ...prev,
            profile: null,
            bills: [],
            affectionCards: [],
            lastGeneratedAt: restAt,
          }
        })
      },
      reset() {
        setState(initialState)
      },
    }),
    [state, hydrated],
  )

  return <MirrorWeChatStoreContext.Provider value={value}>{children}</MirrorWeChatStoreContext.Provider>
}

export function useMirrorWeChatStore() {
  const ctx = useContext(MirrorWeChatStoreContext)
  if (!ctx) throw new Error('useMirrorWeChatStore must be used within MirrorWeChatStoreProvider')
  return ctx
}
