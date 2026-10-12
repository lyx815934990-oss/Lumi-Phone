import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Sparkles, RefreshCw, Trash2 } from 'lucide-react'

import { Pressable } from '../../../../components/Pressable'
import {
  WECHAT_CHAT_LANGUAGE_OPTIONS,
  type WeChatChatLanguageCode,
} from '../../wechatChatLanguage'
import type { MirrorWeChatContact } from './types'
import { isMirrorGroupContact } from './types'
import { MirrorChatListAvatar } from './WeChatGroupAvatarMosaic'
import type { SpyChatTimeSpanUnit } from '../spyWechatAi'

const CODE_LINES = [
  'bind_relations();',
  'decrypt_fragments();',
  'index_private_nodes();',
  'render_mirror_state();',
] as const

const RELATION_PRESETS = ['家人', '同事', '朋友', '死党', '暧昧', '恋人', '网友'] as const
const CHAT_BIAS_PRESETS = ['日常琐事', '工作学业', '吐槽八卦', '暧昧拉扯', '关心照顾', '约见面', '冷战和解'] as const

export type MirrorSyncAction = 'generate' | 'update' | 'delete'
export type MirrorSyncScope = 'contacts' | 'chats' | 'moments' | 'me'

const SCOPE_META: Array<{ id: MirrorSyncScope; label: string; needContacts: boolean }> = [
  { id: 'contacts', label: '通讯录', needContacts: false },
  { id: 'chats', label: '信息', needContacts: true },
  { id: 'moments', label: '朋友圈', needContacts: true },
  { id: 'me', label: '我', needContacts: true },
]

function CompactSlider({
  label,
  value,
  min,
  max,
  onChange,
  valueSuffix = '',
}: {
  label: string
  value: number
  min: number
  max: number
  onChange: (n: number) => void
  valueSuffix?: string
}) {
  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between gap-2">
        <div className="truncate text-[11px] text-[#8b8e93]">{label}</div>
        <div className="shrink-0 text-[13px] font-medium tabular-nums text-[#121315]">
          {value}
          {valueSuffix}
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={1}
        value={value}
        onChange={(e) => onChange(Math.round(Number(e.target.value)))}
        className="mt-1 h-6 w-full cursor-pointer accent-[#16171a]"
      />
      <div className="-mt-0.5 flex justify-between text-[10px] text-[#b0b3b8]">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  )
}

function ContactPickList({
  contacts,
  selectedIds,
  onChange,
  emptyHint,
  title = '勾选联系人',
  selfAvatarUrl,
}: {
  contacts: MirrorWeChatContact[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
  emptyHint: string
  title?: string
  selfAvatarUrl?: string
}) {
  if (!contacts.length) {
    return (
      <div className="rounded-[12px] bg-[#f5f6f8] px-3 py-3 text-center text-[12px] text-[#8a8d93]">
        {emptyHint}
      </div>
    )
  }
  const allSelected = contacts.every((c) => selectedIds.includes(c.id))
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <div className="text-[11px] text-[#8b8e93]">
          {title}（{selectedIds.length}/{contacts.length}）
        </div>
        <Pressable
          type="button"
          onClick={() => onChange(allSelected ? [] : contacts.map((c) => c.id))}
          className="text-[11px] text-[#5b5e64]"
        >
          {allSelected ? '取消全选' : '全选'}
        </Pressable>
      </div>
      <div className="max-h-[168px] space-y-1 overflow-y-auto overscroll-contain rounded-[12px] border border-[#eceef1] bg-white p-1.5">
        {contacts.map((c) => {
          const on = selectedIds.includes(c.id)
          const isGroup = isMirrorGroupContact(c)
          const name = isGroup
            ? (c.groupName || c.remarkName || c.nickname || '群聊').trim() || '群聊'
            : (c.remarkName || c.nickname || '联系人').trim()
          const sub = isGroup
            ? `群聊 · ${(c.members?.length || 0) > 0 ? `${c.members!.length} 人` : '会话'}`
            : c.nickname && c.nickname !== name
              ? c.nickname
              : '联系人'
          return (
            <Pressable
              key={c.id}
              type="button"
              onClick={() =>
                onChange(on ? selectedIds.filter((x) => x !== c.id) : [...selectedIds, c.id])
              }
              className={`flex w-full items-center gap-2.5 rounded-[10px] px-2 py-1.5 text-left ${
                on ? 'bg-[#f0f7fb]' : 'bg-transparent'
              }`}
            >
              <span
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] ${
                  on ? 'border-[#0284c7] bg-[#0284c7] text-white' : 'border-[#c5c8ce] bg-white text-transparent'
                }`}
                aria-hidden
              >
                ✓
              </span>
              <MirrorChatListAvatar
                contact={c}
                selfAvatarUrl={selfAvatarUrl}
                resolveContactAvatar={(id) =>
                  contacts.find((x) => x.id === id && !isMirrorGroupContact(x))?.avatarUrl
                }
                size={32}
                radius={8}
              />
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-1.5">
                  <div className="truncate text-[13px] text-[#1b1c1f]">{name}</div>
                  {isGroup ? (
                    <span className="shrink-0 rounded-full bg-[#e8eef8] px-1.5 py-0.5 text-[10px] text-[#3d5a80]">
                      群
                    </span>
                  ) : null}
                  {c.blocked ? (
                    <span className="shrink-0 rounded-full bg-[#6b0f1a]/10 px-1.5 py-0.5 text-[10px] text-[#8f1b2a]">
                      被拉黑
                    </span>
                  ) : null}
                  {c.isPinned ? (
                    <span className="shrink-0 rounded-full bg-[#f0e6c8] px-1.5 py-0.5 text-[10px] text-[#8a6a23]">
                      置顶
                    </span>
                  ) : null}
                </div>
                <div className="truncate text-[10px] text-[#9a9da3]">{sub}</div>
              </div>
            </Pressable>
          )
        })}
      </div>
    </div>
  )
}

export function DataSyncModal({
  open,
  busy,
  busyLabel,
  hasContacts,
  contacts,
  selfAvatarUrl,
  playerContactId,
  plotNowLabel,
  minMessagesPerContact,
  onMinMessagesPerContactChange,
  chatTimeSpanUnit,
  chatTimeSpanValue,
  onChatTimeSpanUnitChange,
  onChatTimeSpanValueChange,
  includeHideFromUser,
  onIncludeHideFromUserChange,
  includeOnlyTaVisible,
  onIncludeOnlyTaVisibleChange,
  ingestChatToMemory,
  onIngestChatToMemoryChange,
  generateLanguage,
  onGenerateLanguageChange,
  syncTranslation,
  onSyncTranslationChange,
  translationLanguage,
  onTranslationLanguageChange,
  selectedRelations,
  onSelectedRelationsChange,
  contactCount,
  onContactCountChange,
  contactCustomBias,
  onContactCustomBiasChange,
  selectedChatBiases,
  onSelectedChatBiasesChange,
  chatCustomBias,
  onChatCustomBiasChange,
  generateRelatedGroups,
  onGenerateRelatedGroupsChange,
  relatedGroupsCount,
  onRelatedGroupsCountChange,
  groupChatCustomBias,
  onGroupChatCustomBiasChange,
  includeSpecialMessages,
  onIncludeSpecialMessagesChange,
  walletBiasText,
  onWalletBiasTextChange,
  onClose,
  onStopGeneration,
  onConfirmGenerateOrUpdate,
  onConfirmDelete,
}: {
  open: boolean
  busy: boolean
  /** 忙碌时的进度说明（如正在批量生成聊天） */
  busyLabel?: string
  hasContacts: boolean
  contacts: MirrorWeChatContact[]
  /** 角色本人头像：群九宫格拼进第一格 */
  selfAvatarUrl?: string
  playerContactId: string
  plotNowLabel?: string
  /** 通讯录生成目标人数（含用户本行 + NPC + 额外） */
  contactCount: number
  onContactCountChange: (n: number) => void
  minMessagesPerContact: number
  onMinMessagesPerContactChange: (n: number) => void
  chatTimeSpanUnit: SpyChatTimeSpanUnit
  chatTimeSpanValue: number
  onChatTimeSpanUnitChange: (v: SpyChatTimeSpanUnit) => void
  onChatTimeSpanValueChange: (n: number) => void
  includeHideFromUser: boolean
  onIncludeHideFromUserChange: (v: boolean) => void
  includeOnlyTaVisible: boolean
  onIncludeOnlyTaVisibleChange: (v: boolean) => void
  ingestChatToMemory: boolean
  onIngestChatToMemoryChange: (v: boolean) => void
  generateLanguage: WeChatChatLanguageCode
  onGenerateLanguageChange: (v: WeChatChatLanguageCode) => void
  syncTranslation: boolean
  onSyncTranslationChange: (v: boolean) => void
  translationLanguage: WeChatChatLanguageCode
  onTranslationLanguageChange: (v: WeChatChatLanguageCode) => void
  selectedRelations: string[]
  onSelectedRelationsChange: (next: string[]) => void
  contactCustomBias: string
  onContactCustomBiasChange: (v: string) => void
  selectedChatBiases: string[]
  onSelectedChatBiasesChange: (next: string[]) => void
  chatCustomBias: string
  onChatCustomBiasChange: (v: string) => void
  generateRelatedGroups: boolean
  onGenerateRelatedGroupsChange: (v: boolean) => void
  relatedGroupsCount: number
  onRelatedGroupsCountChange: (n: number) => void
  groupChatCustomBias: string
  onGroupChatCustomBiasChange: (v: string) => void
  /** 信息生成：强制穿插语音通话/位置/红包/转账 */
  includeSpecialMessages: boolean
  onIncludeSpecialMessagesChange: (v: boolean) => void
  walletBiasText: string
  onWalletBiasTextChange: (v: string) => void
  onClose: () => void
  /** 忙碌中停止生成；已完成部分会保留 */
  onStopGeneration?: () => void
  onConfirmGenerateOrUpdate: (payload: {
    action: 'generate' | 'update'
    scopes: MirrorSyncScope[]
    contactIds: string[]
  }) => void
  onConfirmDelete: (payload: {
    scopes: MirrorSyncScope[]
    contactIds: string[]
  }) => void
}) {
  const [action, setAction] = useState<MirrorSyncAction | null>(null)
  const [scopes, setScopes] = useState<MirrorSyncScope[]>([])
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([])

  const hasGroupSessions = useMemo(
    () => contacts.some((c) => isMirrorGroupContact(c)),
    [contacts],
  )

  /** 生成/更新信息：只勾私聊；删除「信息」时可勾私聊 + 群聊 */
  const pickableContacts = useMemo(() => {
    const deleteChats = action === 'delete' && scopes.includes('chats')
    return contacts.filter((c) => {
      if (c.id === playerContactId || String(c.id || '').startsWith('player:')) return false
      if (isMirrorGroupContact(c)) return deleteChats
      return true
    })
  }, [contacts, playerContactId, action, scopes])

  const pickableIdsKey = useMemo(
    () => pickableContacts.map((c) => c.id).join('|'),
    [pickableContacts],
  )

  useEffect(() => {
    if (!open) {
      setAction(null)
      setScopes([])
      setSelectedContactIds([])
    }
  }, [open])

  useEffect(() => {
    // 切换动作时重置范围；有通讯录默认信息；仅群会话删信息；否则通讯录
    if (!action) return
    if (hasContacts) setScopes(['chats'])
    else if (action === 'delete' && hasGroupSessions) setScopes(['chats'])
    else setScopes(['contacts'])
  }, [action, hasContacts, hasGroupSessions])

  useEffect(() => {
    // 无通讯录时：生成/更新禁止保留信息/朋友圈/我
    if (hasContacts) return
    if (action !== 'generate' && action !== 'update') return
    setScopes((prev) => {
      const next = prev.filter((id) => id === 'contacts')
      if (next.length === prev.length && next.length > 0) return prev
      return next.length ? next : ['contacts']
    })
  }, [hasContacts, action])

  useEffect(() => {
    const needPick =
      scopes.includes('chats') ||
      (action === 'delete' && (scopes.includes('contacts') || scopes.includes('chats')))
    if (!needPick) {
      setSelectedContactIds([])
      return
    }
    setSelectedContactIds(pickableIdsKey ? pickableIdsKey.split('|') : [])
  }, [scopes, action, pickableIdsKey])

  const spanMax =
    chatTimeSpanUnit === 'day' ? 90 : chatTimeSpanUnit === 'week' ? 52 : chatTimeSpanUnit === 'month' ? 36 : 10
  const spanVal = Math.min(spanMax, Math.max(1, chatTimeSpanValue))
  const spanUnitLabel =
    chatTimeSpanUnit === 'week'
      ? '周'
      : chatTimeSpanUnit === 'month'
        ? '月'
        : chatTimeSpanUnit === 'year'
          ? '年'
          : '天'

  const isScopeDisabled = (id: MirrorSyncScope) => {
    const meta = SCOPE_META.find((s) => s.id === id)
    if (!meta?.needContacts) return false
    // 无通讯录：生成/更新时信息·朋友圈·我不可选
    if (!hasContacts) {
      // 删除「信息」：仅有群会话时也允许勾选删除
      if (action === 'delete' && id === 'chats' && hasGroupSessions) return false
      return true
    }
    return false
  }

  const toggleScope = (id: MirrorSyncScope) => {
    if (isScopeDisabled(id)) return
    setScopes((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const toggleChip = (list: string[], label: string, onChange: (next: string[]) => void) => {
    onChange(list.includes(label) ? list.filter((x) => x !== label) : [...list, label])
  }

  const needContactPick =
    scopes.includes('chats') ||
    (action === 'delete' && (scopes.includes('contacts') || scopes.includes('chats')))

  const canSubmit = (() => {
    if (!action || !scopes.length) return false
    if (action === 'generate' || action === 'update') {
      if (!hasContacts && scopes.some((s) => s !== 'contacts')) return false
      if (scopes.includes('chats') && !selectedContactIds.length) return false
      return true
    }
    // delete：无私聊通讯录时不能删「通讯录」；仅有群时可删「信息」
    if (!hasContacts && scopes.includes('contacts')) return false
    if (!hasContacts && scopes.includes('chats') && !hasGroupSessions && !pickableContacts.length) {
      return false
    }
    if ((scopes.includes('chats') || scopes.includes('contacts')) && !selectedContactIds.length) {
      // 删朋友圈/我可不勾联系人
      if (scopes.every((s) => s === 'moments' || s === 'me')) return true
      return false
    }
    return true
  })()

  const actionTitle =
    action === 'generate' ? '生成' : action === 'update' ? '更新' : action === 'delete' ? '删除' : '数据操作'

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[1460] flex items-end justify-center bg-black/22 px-3 pb-[max(10px,env(safe-area-inset-bottom))] pt-10 sm:items-center sm:px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !busy) onClose()
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.99 }}
            transition={{ type: 'spring', stiffness: 280, damping: 28, mass: 0.55 }}
            className="flex w-full max-w-[420px] max-h-[min(82vh,640px)] flex-col overflow-hidden rounded-[24px] border border-[#d9dadd] bg-white/95 shadow-[0_24px_80px_rgba(10,10,10,0.14)] backdrop-blur-xl"
          >
            {busy ? (
              <div className="px-5 py-6">
                <div className="text-center text-[11px] tracking-[0.24em] text-[#8d8f95]">数据同步中</div>
                <div className="mt-2 whitespace-pre-line text-center text-[16px] font-medium leading-6 text-[#18191b]">
                  {busyLabel?.trim() || `${actionTitle}中…`}
                </div>
                {plotNowLabel?.trim() ? (
                  <div className="mt-1.5 text-center text-[11px] text-[#7a7d84]">
                    剧情现在：{plotNowLabel.trim()}（消息不会晚于此）
                  </div>
                ) : null}
                <div className="mt-2 text-center text-[11px] leading-[1.45] text-[#9a9da3]">
                  信息整批只打一轮；遗漏也整批补一轮。勾选「写入记忆」时另打摘要（私聊按人、群聊按群）。
                </div>
                <div className="mt-5 rounded-[20px] bg-[#f4f5f7] p-4">
                  <div className="space-y-2 font-mono text-[12px] leading-6 text-[#585b61]">
                    {CODE_LINES.map((line, index) => (
                      <motion.div
                        key={line}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0.25, 1, 0.55] }}
                        transition={{ duration: 1.1, delay: index * 0.12, repeat: Infinity, repeatDelay: 0.3 }}
                      >
                        {`> ${line}`}
                      </motion.div>
                    ))}
                  </div>
                </div>
                {onStopGeneration ? (
                  <Pressable
                    type="button"
                    onClick={onStopGeneration}
                    className="mt-5 w-full rounded-[16px] border border-[#e4e6ea] bg-white px-4 py-3 text-center text-[14px] font-medium text-[#8f1b2a]"
                  >
                    停止生成
                  </Pressable>
                ) : null}
              </div>
            ) : (
              <>
                <div className="shrink-0 border-b border-[#eceef1] px-4 pb-2.5 pt-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[10px] tracking-[0.2em] text-[#9a9da3]">MIRROR WECHAT</div>
                      <div className="mt-0.5 text-[17px] font-medium text-[#151618]">
                        {action ? actionTitle : '生成 / 更新 / 删除'}
                      </div>
                    </div>
                    <Pressable
                      type="button"
                      onClick={() => {
                        if (action) setAction(null)
                        else onClose()
                      }}
                      className="shrink-0 rounded-full px-2 py-1 text-[12px] text-[#8a8d93]"
                    >
                      {action ? '返回' : '关闭'}
                    </Pressable>
                  </div>
                  {!hasContacts ? (
                    <div className="mt-1 text-[11px] leading-[1.4] text-[#a16207]">
                      {action === 'delete' && hasGroupSessions
                        ? '尚无私聊通讯录：删除时可勾选「信息」清理群聊会话；朋友圈 / 我 / 通讯录仍需先有通讯录。'
                        : '尚未有通讯录：请先生成通讯录，信息 / 朋友圈 / 我 暂不可选。'}
                    </div>
                  ) : (
                    <div className="mt-1 text-[11px] leading-[1.4] text-[#7a7d84]">
                      {action === 'delete'
                        ? '勾选要删除的数据范围；信息可勾选私聊与群聊会话。'
                        : '勾选要操作的数据范围；信息相关可再勾选具体联系人。'}
                    </div>
                  )}
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3">
                  {!action ? (
                    <div className="grid grid-cols-3 gap-2">
                      {(
                        [
                          { id: 'generate' as const, label: '生成', Icon: Sparkles, hint: '新建或覆盖' },
                          { id: 'update' as const, label: '更新', Icon: RefreshCw, hint: '增量追加' },
                          { id: 'delete' as const, label: '删除', Icon: Trash2, hint: '部分清除' },
                        ] as const
                      ).map(({ id, label, Icon, hint }) => (
                        <Pressable
                          key={id}
                          type="button"
                          onClick={() => setAction(id)}
                          className="flex flex-col items-center gap-1.5 rounded-[16px] border border-[#e6e7eb] bg-[#fafbfc] px-2 py-4"
                        >
                          <Icon size={18} className="text-[#3a3c42]" />
                          <span className="text-[14px] font-medium text-[#151618]">{label}</span>
                          <span className="text-[10px] text-[#9a9da3]">{hint}</span>
                        </Pressable>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <div className="mb-1.5 text-[11px] text-[#8b8e93]">数据范围（可多选）</div>
                        <div className="grid grid-cols-4 gap-1.5">
                          {SCOPE_META.map((s) => {
                            // 无通讯录时：仅「通讯录」可选；信息/朋友圈/我灰掉
                            const disabled = isScopeDisabled(s.id)
                            const on = scopes.includes(s.id)
                            return (
                              <Pressable
                                key={s.id}
                                type="button"
                                disabled={disabled}
                                onClick={() => toggleScope(s.id)}
                                title={
                                  disabled
                                    ? action === 'delete' && s.id === 'chats' && !hasGroupSessions
                                      ? '请先生成通讯录或群聊'
                                      : '请先生成通讯录'
                                    : undefined
                                }
                                className={`rounded-[12px] px-1.5 py-2.5 text-center text-[12px] transition-colors ${
                                  disabled
                                    ? 'cursor-not-allowed border border-[#eceef1] bg-[#f3f4f6] text-[#b0b3b8]'
                                    : on
                                      ? 'bg-[#16171a] text-white'
                                      : 'border border-[#e4e6ea] bg-white text-[#3a3c42]'
                                }`}
                              >
                                {s.label}
                              </Pressable>
                            )
                          })}
                        </div>
                        {!hasContacts ? (
                          <div className="mt-1.5 text-[10px] text-[#a8abb1]">
                            {action === 'delete' && hasGroupSessions
                              ? '无通讯录时仍可删「信息」中的群聊；生成/更新则只能先选「通讯录」'
                              : '无通讯录时，生成/更新只能选「通讯录」；信息 / 朋友圈 / 我需先有通讯录'}
                          </div>
                        ) : null}
                        {action === 'generate' && hasContacts && scopes.includes('contacts') ? (
                          <div className="mt-2 rounded-[12px] bg-[#fff6f0] px-3 py-2 text-[11px] leading-[1.45] text-[#9a3412]">
                            通讯录已有数据。「生成」会整表重做，不是追加；已有聊天记录也会被清空。若要保留现有名单与聊天，请改用「更新」。
                          </div>
                        ) : null}
                      </div>

                      {action !== 'delete' &&
                      scopes.some((s) => s === 'contacts' || s === 'chats' || s === 'moments') ? (
                        <div className="space-y-2 rounded-[14px] border border-[#eceef1] bg-white px-3 py-2.5">
                          <div className="flex items-baseline justify-between gap-2">
                            <div className="text-[11px] text-[#8b8e93]">生成语言</div>
                            <div className="text-[10px] text-[#b0b3b8]">
                              {scopes.includes('chats')
                                ? '气泡 / 备注 / 朋友圈'
                                : scopes.includes('contacts')
                                  ? '备注与昵称'
                                  : '朋友圈正文'}
                            </div>
                          </div>
                          <select
                            value={generateLanguage}
                            onChange={(e) =>
                              onGenerateLanguageChange(e.target.value as WeChatChatLanguageCode)
                            }
                            className="w-full rounded-[12px] border border-[#e4e6ea] bg-[#fafbfc] px-3 py-2 text-[13px] text-[#121315] outline-none"
                          >
                            {WECHAT_CHAT_LANGUAGE_OPTIONS.map((opt) => (
                              <option key={opt.code} value={opt.code}>
                                {opt.label}（{opt.native}）
                              </option>
                            ))}
                          </select>
                          {!scopes.includes('chats') ? (
                            <div className="text-[10px] leading-[1.4] text-[#a8abb1]">
                              {scopes.includes('contacts')
                                ? '通讯录只影响备注/昵称用哪种语言写，没有「附译文」；关系字段仍为中文。'
                                : '朋友圈正文用上方语言；「自带翻译」仅作用于聊天气泡。'}
                            </div>
                          ) : null}
                          {/* 自带翻译只写入聊天气泡，与通讯录/朋友圈无关 */}
                          {scopes.includes('chats') ? (
                            <>
                              <label className="flex items-center justify-between gap-3 rounded-[12px] bg-[#f5f6f8] px-3 py-2 text-[12px] text-[#25272b]">
                                <span className="min-w-0">
                                  <span className="block">自带翻译</span>
                                  <span className="mt-0.5 block text-[10px] text-[#9a9da3]">
                                    气泡原文用上方语言；勾选后每条文字气泡附译文（可点「翻译」展开）
                                  </span>
                                </span>
                                <input
                                  type="checkbox"
                                  checked={syncTranslation}
                                  onChange={(e) => onSyncTranslationChange(e.target.checked)}
                                />
                              </label>
                              {syncTranslation ? (
                                <div>
                                  <div className="mb-1 text-[11px] text-[#8b8e93]">译文语言</div>
                                  <select
                                    value={translationLanguage}
                                    onChange={(e) =>
                                      onTranslationLanguageChange(
                                        e.target.value as WeChatChatLanguageCode,
                                      )
                                    }
                                    className="w-full rounded-[12px] border border-[#e4e6ea] bg-[#fafbfc] px-3 py-2 text-[13px] text-[#121315] outline-none"
                                  >
                                    {WECHAT_CHAT_LANGUAGE_OPTIONS.map((opt) => (
                                      <option key={opt.code} value={opt.code}>
                                        {opt.label}（{opt.native}）
                                      </option>
                                    ))}
                                  </select>
                                  {translationLanguage === generateLanguage ? (
                                    <div className="mt-1.5 text-[10px] leading-[1.4] text-[#a16207]">
                                      译文语言与生成语言相同，将不会写入翻译行；请另选目标语言。
                                    </div>
                                  ) : null}
                                </div>
                              ) : null}
                            </>
                          ) : null}
                        </div>
                      ) : null}

                      {action !== 'delete' && scopes.includes('contacts') ? (
                        <div className="space-y-2 rounded-[14px] border border-[#eceef1] bg-white px-3 py-2.5">
                          <CompactSlider
                            label="生成联系人数量"
                            value={Math.min(30, Math.max(4, contactCount || 12))}
                            min={4}
                            max={30}
                            onChange={onContactCountChange}
                            valueSuffix=" 人"
                          />
                          <div className="-mt-1 text-[10px] leading-[1.4] text-[#a8abb1]">
                            含用户本行与固定 NPC；总数约为该值，实际可能略有浮动
                          </div>
                          <div className="flex items-baseline justify-between gap-2">
                            <div className="text-[11px] text-[#8b8e93]">关系偏向（可多选）</div>
                            <div className="text-[10px] text-[#b0b3b8]">不选则随机组合</div>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {RELATION_PRESETS.map((label) => {
                              const on = selectedRelations.includes(label)
                              return (
                                <Pressable
                                  key={label}
                                  type="button"
                                  onClick={() => toggleChip(selectedRelations, label, onSelectedRelationsChange)}
                                  className={`rounded-full px-2.5 py-1 text-[12px] ${
                                    on ? 'bg-[#16171a] text-white' : 'border border-[#e4e6ea] bg-white text-[#3a3c42]'
                                  }`}
                                >
                                  {label}
                                </Pressable>
                              )
                            })}
                          </div>
                          <div className="text-[11px] text-[#8b8e93]">自定义要求（可选）</div>
                          <textarea
                            rows={2}
                            value={contactCustomBias}
                            onChange={(e) => onContactCustomBiasChange(e.target.value)}
                            placeholder="例如：多几个同学、少网友；备注偏正式。也可点名：把「小周」设为死党…"
                            className="w-full resize-none rounded-[12px] border border-[#e4e6ea] bg-[#fafbfc] px-3 py-2 text-[13px] text-[#121315] outline-none placeholder:text-[#b4b7bd]"
                          />
                        </div>
                      ) : null}

                      {needContactPick ? (
                        <ContactPickList
                          contacts={pickableContacts}
                          selectedIds={selectedContactIds}
                          onChange={setSelectedContactIds}
                          selfAvatarUrl={selfAvatarUrl}
                          title={
                            action === 'delete' && scopes.includes('chats')
                              ? '勾选要删的会话（含群聊）'
                              : '勾选联系人'
                          }
                          emptyHint={
                            pickableContacts.length
                              ? '没有可选会话'
                              : hasContacts || hasGroupSessions
                                ? '没有可选会话'
                                : '请先生成通讯录或群聊'
                          }
                        />
                      ) : null}

                      {action !== 'delete' && scopes.includes('chats') ? (
                        <>
                          <div className="space-y-2 rounded-[14px] border border-[#eceef1] bg-white px-3 py-2.5">
                            <div className="flex items-baseline justify-between gap-2">
                              <div className="text-[11px] text-[#8b8e93]">聊天内容偏向（可多选）</div>
                              <div className="text-[10px] text-[#b0b3b8]">不选则按关系自然写</div>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {CHAT_BIAS_PRESETS.map((label) => {
                                const on = selectedChatBiases.includes(label)
                                return (
                                  <Pressable
                                    key={label}
                                    type="button"
                                    onClick={() =>
                                      toggleChip(selectedChatBiases, label, onSelectedChatBiasesChange)
                                    }
                                    className={`rounded-full px-2.5 py-1 text-[12px] ${
                                      on ? 'bg-[#16171a] text-white' : 'border border-[#e4e6ea] bg-white text-[#3a3c42]'
                                    }`}
                                  >
                                    {label}
                                  </Pressable>
                                )
                              })}
                            </div>
                            <div className="text-[11px] text-[#8b8e93]">自定义要求（可选）</div>
                            <textarea
                              rows={2}
                              value={chatCustomBias}
                              onChange={(e) => onChatCustomBiasChange(e.target.value)}
                              placeholder="可点名联系人，如：林悦多暧昧；老王偏工作吐槽。未点名的作通则。"
                              className="w-full resize-none rounded-[12px] border border-[#e4e6ea] bg-[#fafbfc] px-3 py-2 text-[13px] text-[#121315] outline-none placeholder:text-[#b4b7bd]"
                            />
                            <div className="text-[10px] leading-[1.4] text-[#a8abb1]">
                              一次请求生成全部勾选联系人；点名到谁的条款只进谁的会话，避免串台。
                            </div>
                          </div>
                          <CompactSlider
                            label="每个联系人最少气泡数"
                            value={minMessagesPerContact}
                            min={1}
                            max={80}
                            onChange={onMinMessagesPerContactChange}
                          />
                          <div className="rounded-[14px] bg-[#f5f6f8] px-3 py-2.5">
                            <div className="flex items-center justify-between gap-2">
                              <div className="text-[11px] text-[#8b8e93]">聊天时间跨度</div>
                              <div className="text-[12px] font-medium tabular-nums text-[#121315]">
                                {spanVal}
                                {spanUnitLabel}内
                              </div>
                            </div>
                            {plotNowLabel ? (
                              <div className="mt-0.5 truncate text-[10px] text-[#a8abb1]" title={plotNowLabel}>
                                剧情现在 {plotNowLabel}
                              </div>
                            ) : null}
                            <div className="mt-1.5 flex gap-1.5">
                              {(
                                [
                                  ['day', '天'],
                                  ['week', '周'],
                                  ['month', '月'],
                                  ['year', '年'],
                                ] as const
                              ).map(([id, label]) => {
                                const on = chatTimeSpanUnit === id
                                return (
                                  <Pressable
                                    key={id}
                                    type="button"
                                    onClick={() => onChatTimeSpanUnitChange(id)}
                                    className={`h-7 flex-1 rounded-full text-[12px] ${
                                      on ? 'bg-[#16171a] text-white' : 'border border-[#e4e6ea] bg-white text-[#3a3c42]'
                                    }`}
                                  >
                                    {label}
                                  </Pressable>
                                )
                              })}
                            </div>
                            <input
                              type="range"
                              min={1}
                              max={spanMax}
                              step={1}
                              value={spanVal}
                              onChange={(e) =>
                                onChatTimeSpanValueChange(Math.round(Number(e.target.value)))
                              }
                              className="mt-1.5 h-6 w-full cursor-pointer accent-[#16171a]"
                            />
                          </div>
                          <label className="flex items-start justify-between gap-3 rounded-[12px] bg-[#f5f6f8] px-3 py-2 text-[12px] text-[#25272b]">
                            <span className="min-w-0">
                              <span className="block">特殊消息卡片</span>
                              <span className="mt-0.5 block text-[10px] leading-[1.4] text-[#9a9da3]">
                                勾选后每人会话至少穿插 2 种：语音通话、位置、红包、转账（会显示对应卡片，可点开通话详情）。不勾则多为纯文字，模型很少主动写这些。
                              </span>
                            </span>
                            <input
                              type="checkbox"
                              className="mt-1"
                              checked={includeSpecialMessages}
                              onChange={(e) => onIncludeSpecialMessagesChange(e.target.checked)}
                            />
                          </label>
                          <label className="flex items-center justify-between gap-3 rounded-[12px] bg-[#f5f6f8] px-3 py-2 text-[12px] text-[#25272b]">
                            <span className="min-w-0">
                              <span className="block">生成相关群聊</span>
                              <span className="mt-0.5 block text-[10px] text-[#9a9da3]">
                                按勾选私聊联系人再生成相关群（信息页显示群名）
                              </span>
                            </span>
                            <input
                              type="checkbox"
                              checked={generateRelatedGroups}
                              onChange={(e) => onGenerateRelatedGroupsChange(e.target.checked)}
                            />
                          </label>
                          {generateRelatedGroups ? (
                            <div className="space-y-2 rounded-[14px] border border-[#eceef1] bg-white px-3 py-2.5">
                              <CompactSlider
                                label="相关群聊数量"
                                value={Math.min(8, Math.max(1, relatedGroupsCount || 2))}
                                min={1}
                                max={8}
                                onChange={onRelatedGroupsCountChange}
                                valueSuffix=" 个"
                              />
                              <div className="text-[11px] text-[#8b8e93]">群聊自定义要求（可选）</div>
                              <textarea
                                rows={2}
                                value={groupChatCustomBias}
                                onChange={(e) => onGroupChatCustomBiasChange(e.target.value)}
                                placeholder="例如：一个项目工作群、一个同学群；群里多吐槽少灌水。"
                                className="w-full resize-none rounded-[12px] border border-[#e4e6ea] bg-[#fafbfc] px-3 py-2 text-[13px] text-[#121315] outline-none placeholder:text-[#b4b7bd]"
                              />
                            </div>
                          ) : null}
                          <label className="flex items-center justify-between gap-3 rounded-[12px] bg-[#f5f6f8] px-3 py-2 text-[12px] text-[#25272b]">
                            <span className="min-w-0">
                              <span className="block">写入角色记忆</span>
                              <span className="mt-0.5 block text-[10px] text-[#9a9da3]">
                                私聊按人、群聊按群写摘要（群名/成员/时间/内容）；群成员不进通讯录备忘
                              </span>
                            </span>
                            <input
                              type="checkbox"
                              checked={ingestChatToMemory}
                              onChange={(e) => onIngestChatToMemoryChange(e.target.checked)}
                            />
                          </label>
                        </>
                      ) : null}

                      {action !== 'delete' && scopes.includes('moments') ? (
                        <div className="space-y-1.5">
                          <label className="flex items-center justify-between gap-3 rounded-[12px] bg-[#f5f6f8] px-3 py-2 text-[12px] text-[#25272b]">
                            <span>生成“屏蔽了你”朋友圈</span>
                            <input
                              type="checkbox"
                              checked={includeHideFromUser}
                              onChange={(e) => onIncludeHideFromUserChange(e.target.checked)}
                            />
                          </label>
                          <label className="flex items-center justify-between gap-3 rounded-[12px] bg-[#f5f6f8] px-3 py-2 text-[12px] text-[#25272b]">
                            <span>生成“仅 XX 可见”黑盒动态</span>
                            <input
                              type="checkbox"
                              checked={includeOnlyTaVisible}
                              onChange={(e) => onIncludeOnlyTaVisibleChange(e.target.checked)}
                            />
                          </label>
                        </div>
                      ) : null}

                      {action !== 'delete' && scopes.includes('me') ? (
                        <div>
                          <div className="text-[11px] text-[#8b8e93]">钱包 / 账单补充（可选）</div>
                          <textarea
                            rows={2}
                            value={walletBiasText}
                            onChange={(e) => onWalletBiasTextChange(e.target.value)}
                            placeholder="不填则按人设自然生成"
                            className="mt-1 w-full resize-none rounded-[12px] border border-[#e4e6ea] bg-white px-3 py-2 text-[13px] text-[#121315] outline-none placeholder:text-[#b4b7bd]"
                          />
                        </div>
                      ) : null}

                      {action === 'delete' && scopes.includes('contacts') ? (
                        <div className="rounded-[12px] bg-[#fff6f6] px-3 py-2 text-[11px] leading-[1.4] text-[#8f4f56]">
                          删除通讯录联系人时，其聊天记录与对应记忆也会一并清除。
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>

                {action ? (
                  <div className="shrink-0 border-t border-[#eceef1] px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <Pressable
                        type="button"
                        onClick={onClose}
                        className="h-10 flex-1 rounded-[14px] border border-[#dfe1e5] text-[13px] text-[#60636a]"
                      >
                        取消
                      </Pressable>
                      <Pressable
                        type="button"
                        disabled={!canSubmit}
                        onClick={() => {
                          if (!action || !canSubmit) return
                          if (action === 'delete') {
                            onConfirmDelete({ scopes, contactIds: selectedContactIds })
                          } else {
                            onConfirmGenerateOrUpdate({
                              action,
                              scopes,
                              contactIds: selectedContactIds,
                            })
                          }
                        }}
                        className={`h-10 flex-1 rounded-[14px] text-[13px] ${
                          canSubmit
                            ? action === 'delete'
                              ? 'bg-[#8f4f56] text-white'
                              : 'bg-[#16171a] text-white'
                            : 'bg-[#e8e9ec] text-[#b0b3b8]'
                        }`}
                      >
                        确认{actionTitle}
                      </Pressable>
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
