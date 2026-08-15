import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Bookmark,
  ChevronLeft,
  Clock,
  Home,
  MoreHorizontal,
  Search,
  Sparkles,
  Star,
  Trash2,
  Users,
} from 'lucide-react'
import { useCurrentApiConfig } from '../../../api/ApiSettingsContext'
import { Pressable } from '../../../../components/Pressable'
import { personaDb } from '../../newFriendsPersona/idb'
import type { PlayerIdentity } from '../../newFriendsPersona/types'
import { generatePhoneDatasetWithAi } from './phoneAi'
import { PhoneAIGenerateModal, type PhoneGenerateForm } from './PhoneAIGenerateModal'
import { PhoneAvatarProvider } from './components/GeometricAvatar'
import { normalizeCallTranscriptLabels } from './phoneMarkup'
import {
  clearPhoneDataset,
  hasPhoneContent,
  loadPhoneDataset,
  savePhoneDataset,
} from './phoneStorage'
import { CallLogScreen } from './screens/CallLogScreen'
import { CallTranscriptScreen } from './screens/CallTranscriptScreen'
import { BlockedScreen } from './screens/BlockedScreen'
import { ContactDetailScreen } from './screens/ContactDetailScreen'
import { ContactsHubScreen } from './screens/ContactsHubScreen'
import { ContactsListScreen } from './screens/ContactsListScreen'
import { EmergencyScreen } from './screens/EmergencyScreen'
import { FavoritesScreen } from './screens/FavoritesScreen'
import { SavedLogsScreen } from './screens/SavedLogsScreen'
import { emptyPhoneDataset } from './types'
import type {
  CallRecord,
  ContactsScreen,
  FavoritesScreenNav,
  PhoneContact,
  PhoneDataset,
  PhoneTab,
  RecentsScreen,
  SavedScreenNav,
} from './types'
import './phoneApp.css'

const EASE = [0.25, 0.1, 0.25, 1] as const

export function PhoneApp({
  onClose,
  characterId,
  characterName,
  playerIdentityId,
  playerDisplayName,
  playerWechatAvatarUrl,
  useLumiProjectAssistantPrompt,
  onToast,
}: {
  onClose: () => void
  characterId: string
  characterName?: string
  playerIdentityId: string
  playerDisplayName: string
  /** 本聊天单独头像 → 全局微信头像（与聊天气泡己方头像同源） */
  playerWechatAvatarUrl?: string
  useLumiProjectAssistantPrompt: boolean
  onToast?: (msg: string) => void
}) {
  const apiConfig = useCurrentApiConfig('chatCard')
  const [dataset, setDataset] = useState<PhoneDataset>(() => emptyPhoneDataset())
  const [loaded, setLoaded] = useState(false)
  const [tab, setTab] = useState<PhoneTab>('recents')
  const [recentsFilter, setRecentsFilter] = useState<'all' | 'missed'>('all')
  const [recentsStack, setRecentsStack] = useState<RecentsScreen[]>([{ kind: 'callLog' }])
  const [contactsStack, setContactsStack] = useState<ContactsScreen[]>([{ kind: 'hub' }])
  const [favoritesStack, setFavoritesStack] = useState<FavoritesScreenNav[]>([{ kind: 'grid' }])
  const [savedStack, setSavedStack] = useState<SavedScreenNav[]>([{ kind: 'list' }])
  const [query, setQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [overlay, setOverlay] = useState<'none' | 'more'>('none')
  const [genOpen, setGenOpen] = useState(false)
  const [genBusy, setGenBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [playerAvatarUrl, setPlayerAvatarUrl] = useState('')
  const [playerNames, setPlayerNames] = useState<string[]>(() =>
    [playerDisplayName].map((x) => x.trim()).filter(Boolean),
  )

  const hasContent = hasPhoneContent(dataset)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const data = await loadPhoneDataset(characterId)
      if (cancelled) return
      const ch = characterId.trim()
        ? await personaDb.getCharacter(characterId.trim())
        : null
      const ownerName =
        String((ch as { realName?: string; name?: string } | null)?.realName || '').trim() ||
        String((ch as { name?: string } | null)?.name || '').trim() ||
        String(characterName || '').trim() ||
        '我'
      const fixedCalls = normalizeCallTranscriptLabels(data.calls, ownerName, data.contacts)
      const next = { ...data, calls: fixedCalls }
      setDataset(next)
      setLoaded(true)
      // 静默回写纠正后的说话方标签，修旧档「全是对方名字」
      const changed = fixedCalls.some((c, i) => {
        const prev = data.calls[i]
        if (!prev) return true
        const a = JSON.stringify(prev.transcript || [])
        const b = JSON.stringify(c.transcript || [])
        return a !== b
      })
      if (changed) void savePhoneDataset(characterId, next)
    })()
    return () => {
      cancelled = true
    }
  }, [characterId, characterName])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const piid = playerIdentityId.trim()
      const identity =
        piid && piid !== '__none__'
          ? ((await personaDb.getPlayerIdentity(piid)) as PlayerIdentity | null)
          : null
      if (cancelled) return
      const names = [
        playerDisplayName,
        identity?.name,
        identity?.wechatNickname,
      ]
        .map((x) => String(x || '').trim())
        .filter(Boolean)
      setPlayerNames(Array.from(new Set(names)))
      // 优先本聊天单独头像 / 全局微信头像；身份卡头像仅作最后兜底（不用随机网友图）
      const fromChat = String(playerWechatAvatarUrl || '').trim()
      const fromIdentity = String(identity?.avatarUrl || '').trim()
      setPlayerAvatarUrl(fromChat || fromIdentity)
    })()
    return () => {
      cancelled = true
    }
  }, [playerIdentityId, playerDisplayName, playerWechatAvatarUrl])

  const persist = async (next: PhoneDataset) => {
    setDataset(next)
    await savePhoneDataset(characterId, next)
  }

  const stackDepth = useMemo(() => {
    if (tab === 'recents') return recentsStack.length
    if (tab === 'contacts') return contactsStack.length
    if (tab === 'favorites') return favoritesStack.length
    return savedStack.length
  }, [tab, recentsStack, contactsStack, favoritesStack, savedStack])

  const canBack = stackDepth > 1 || overlay !== 'none'

  const goBack = () => {
    if (overlay !== 'none') {
      setOverlay('none')
      return
    }
    if (tab === 'recents' && recentsStack.length > 1) {
      setRecentsStack((s) => s.slice(0, -1))
      return
    }
    if (tab === 'contacts' && contactsStack.length > 1) {
      setContactsStack((s) => s.slice(0, -1))
      return
    }
    if (tab === 'favorites' && favoritesStack.length > 1) {
      setFavoritesStack((s) => s.slice(0, -1))
      return
    }
    if (tab === 'saved' && savedStack.length > 1) {
      setSavedStack((s) => s.slice(0, -1))
    }
  }

  const switchTab = (next: PhoneTab) => {
    setTab(next)
    setQuery('')
    setSearchOpen(false)
    setOverlay('none')
  }

  const openTranscript = (call: CallRecord, where: PhoneTab = tab) => {
    if (where === 'recents') setRecentsStack((s) => [...s, { kind: 'transcript', callId: call.id }])
    else if (where === 'contacts') setContactsStack((s) => [...s, { kind: 'transcript', callId: call.id }])
    else if (where === 'saved') setSavedStack((s) => [...s, { kind: 'transcript', callId: call.id }])
  }

  const openContact = (c: PhoneContact, where: PhoneTab = tab) => {
    if (where === 'recents') setRecentsStack((s) => [...s, { kind: 'contactDetail', contactId: c.id }])
    else if (where === 'contacts') setContactsStack((s) => [...s, { kind: 'contactDetail', contactId: c.id }])
    else if (where === 'favorites') setFavoritesStack((s) => [...s, { kind: 'contactDetail', contactId: c.id }])
  }

  const onGenerate = async (form: PhoneGenerateForm) => {
    setGenBusy(true)
    setError(null)
    try {
      const next = await generatePhoneDatasetWithAi({
        apiConfig,
        characterId,
        playerIdentityId,
        playerDisplayName,
        useLumiProjectAssistantPrompt,
        bias: form.bias,
        callCount: form.callCount,
        timeSpanDays: form.timeSpanDays,
      })
      await persist(next)
      setRecentsStack([{ kind: 'callLog' }])
      setContactsStack([{ kind: 'hub' }])
      setFavoritesStack([{ kind: 'grid' }])
      setSavedStack([{ kind: 'list' }])
      setTab('recents')
      setGenOpen(false)
      onToast?.('通话痕迹已更新')
    } catch (e) {
      setError(e instanceof Error ? e.message : '生成失败')
    } finally {
      setGenBusy(false)
    }
  }

  const showSegment =
    hasContent && tab === 'recents' && recentsStack[recentsStack.length - 1]?.kind === 'callLog'

  const showSearch =
    hasContent &&
    ((tab === 'recents' && recentsStack[recentsStack.length - 1]?.kind === 'callLog') ||
      (tab === 'contacts' &&
        (contactsStack[contactsStack.length - 1]?.kind === 'hub' ||
          contactsStack[contactsStack.length - 1]?.kind === 'all')))

  const screenKey = (() => {
    if (tab === 'recents') {
      const s = recentsStack[recentsStack.length - 1]!
      return `r-${s.kind}-${'contactId' in s ? s.contactId : ''}${'callId' in s ? s.callId : ''}`
    }
    if (tab === 'contacts') {
      const s = contactsStack[contactsStack.length - 1]!
      return `c-${s.kind}-${'contactId' in s ? s.contactId : ''}${'callId' in s ? s.callId : ''}`
    }
    if (tab === 'favorites') {
      const s = favoritesStack[favoritesStack.length - 1]!
      return `f-${s.kind}-${'contactId' in s ? s.contactId : ''}`
    }
    const s = savedStack[savedStack.length - 1]!
    return `s-${s.kind}-${'callId' in s ? s.callId : ''}`
  })()

  const renderTranscript = (callId: string) => {
    const call = dataset.calls.find((c) => c.id === callId)
    if (!call) return <div className="p-6 text-[13px] text-[var(--ph-mist)]">记录不存在</div>
    const contact = call.contactId ? dataset.contacts.find((c) => c.id === call.contactId) : undefined
    return <CallTranscriptScreen call={call} contact={contact} />
  }

  const renderContactDetail = (contactId: string, where: 'recents' | 'contacts') => {
    const contact = dataset.contacts.find((c) => c.id === contactId)
    if (!contact) return <div className="p-6 text-[13px] text-[var(--ph-mist)]">联系人不存在</div>
    return (
      <ContactDetailScreen
        contact={contact}
        calls={dataset.calls}
        onOpenCall={(call) => openTranscript(call, where)}
      />
    )
  }

  const openCallFromFavoritesContact = (call: CallRecord) => {
    setTab('recents')
    setRecentsStack([{ kind: 'callLog' }, { kind: 'transcript', callId: call.id }])
  }

  return (
    <PhoneAvatarProvider playerAvatarUrl={playerAvatarUrl} playerNames={playerNames}>
    <motion.div
      className="phone-app"
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -12 }}
      transition={{ duration: 0.2, ease: EASE }}
    >
      <div className="flex shrink-0 items-center gap-2 px-3 pb-2 pt-1">
        <Pressable
          type="button"
          className="phone-glass flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--ph-ink)]"
          onClick={onClose}
          aria-label="返回查手机桌面"
          title="返回查手机桌面主页"
        >
          <Home size={15} strokeWidth={1.7} aria-hidden />
        </Pressable>

        {canBack ? (
          <Pressable
            type="button"
            className="flex h-9 shrink-0 items-center gap-0.5 rounded-full px-1.5 text-[var(--ph-ink)]"
            onClick={goBack}
            aria-label="上一页"
          >
            <ChevronLeft size={18} strokeWidth={1.7} />
            <span className="text-[12px]">上一页</span>
          </Pressable>
        ) : (
          <div className="w-2" />
        )}

        <div className="min-w-0 flex-1" />

        {showSearch ? (
          <Pressable
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--ph-mist)]"
            onClick={() => setSearchOpen((v) => !v)}
            aria-label="搜索"
          >
            <Search size={16} strokeWidth={1.7} />
          </Pressable>
        ) : (
          <div className="w-9" />
        )}

        <Pressable
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--ph-mist)]"
          onClick={() => setOverlay('more')}
          aria-label="更多"
        >
          <MoreHorizontal size={18} strokeWidth={1.7} />
        </Pressable>
      </div>

      {showSegment ? (
        <div className="px-4 pb-2">
          <div className="phone-segment">
            <button type="button" data-active={recentsFilter === 'all' ? 'true' : 'false'} onClick={() => setRecentsFilter('all')}>
              所有通话
            </button>
            <button
              type="button"
              data-active={recentsFilter === 'missed' ? 'true' : 'false'}
              onClick={() => setRecentsFilter('missed')}
            >
              未接来电
            </button>
          </div>
        </div>
      ) : null}

      {searchOpen && showSearch ? (
        <div className="px-4 pb-2">
          <div className="phone-glass flex h-10 items-center gap-2 rounded-full px-3.5">
            <Search size={14} strokeWidth={1.7} className="text-[var(--ph-mist)]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={tab === 'recents' ? '搜索通话' : '搜索联系人'}
              className="min-w-0 flex-1 bg-transparent text-[13px] text-[var(--ph-ink)] outline-none placeholder:text-[var(--ph-mist)]"
            />
          </div>
        </div>
      ) : null}

      <div className="relative min-h-0 flex-1">
        {!loaded ? (
          <div className="flex h-full items-center justify-center text-[13px] text-[var(--ph-mist)]">加载中…</div>
        ) : !hasContent ? (
          <div className="flex h-full flex-col items-center justify-center px-6 pb-28 text-center">
            <div className="text-[11px] tracking-[0.14em] text-[var(--ph-mist)]">PHONE</div>
            <div className="mt-3 text-[17px] font-semibold text-[var(--ph-ink)]">还没有通话痕迹</div>
            <p className="mt-2 max-w-[280px] text-[13px] leading-relaxed text-[var(--ph-mist)]">
              用 AI 根据{characterName ? `${characterName}的` : '角色'}人设与近期剧情生成通话记录、通讯录与通话文字稿。
            </p>
            <Pressable
              type="button"
              className="mt-6 inline-flex h-11 items-center gap-2 rounded-full bg-[var(--ph-ink)] px-5 text-[13px] font-medium text-white shadow-[var(--ph-shadow)]"
              onClick={() => setGenOpen(true)}
            >
              <Sparkles size={15} strokeWidth={1.6} />
              AI 生成通话痕迹
            </Pressable>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={screenKey}
              className="absolute inset-0"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2, ease: EASE }}
            >
              {tab === 'recents' && recentsStack[recentsStack.length - 1]?.kind === 'callLog' ? (
                <CallLogScreen
                  calls={dataset.calls}
                  contacts={dataset.contacts}
                  query={query}
                  filter={recentsFilter}
                  onOpenCall={(call) => openTranscript(call, 'recents')}
                  onOpenInfo={(call) => openTranscript(call, 'recents')}
                />
              ) : null}

              {tab === 'recents' && recentsStack[recentsStack.length - 1]?.kind === 'contactDetail'
                ? renderContactDetail(
                    (recentsStack[recentsStack.length - 1] as Extract<RecentsScreen, { kind: 'contactDetail' }>)
                      .contactId,
                    'recents',
                  )
                : null}

              {tab === 'recents' && recentsStack[recentsStack.length - 1]?.kind === 'transcript'
                ? renderTranscript(
                    (recentsStack[recentsStack.length - 1] as Extract<RecentsScreen, { kind: 'transcript' }>).callId,
                  )
                : null}

              {tab === 'favorites' && favoritesStack[favoritesStack.length - 1]?.kind === 'grid' ? (
                <FavoritesScreen contacts={dataset.contacts} onOpenContact={(c) => openContact(c, 'favorites')} />
              ) : null}

              {tab === 'favorites' && favoritesStack[favoritesStack.length - 1]?.kind === 'contactDetail' ? (
                (() => {
                  const id = (
                    favoritesStack[favoritesStack.length - 1] as Extract<FavoritesScreenNav, { kind: 'contactDetail' }>
                  ).contactId
                  const contact = dataset.contacts.find((c) => c.id === id)
                  if (!contact) return <div className="p-6 text-[13px] text-[var(--ph-mist)]">联系人不存在</div>
                  return (
                    <ContactDetailScreen
                      contact={contact}
                      calls={dataset.calls}
                      onOpenCall={openCallFromFavoritesContact}
                    />
                  )
                })()
              ) : null}

              {tab === 'contacts' && contactsStack[contactsStack.length - 1]?.kind === 'hub' ? (
                <ContactsHubScreen
                  contacts={dataset.contacts}
                  onOpenEmergency={() => setContactsStack((s) => [...s, { kind: 'emergency' }])}
                  onOpenFavorites={() => setTab('favorites')}
                  onOpenBlocked={() => setContactsStack((s) => [...s, { kind: 'blocked' }])}
                  onOpenAll={() => setContactsStack((s) => [...s, { kind: 'all' }])}
                  onOpenContact={(c) => openContact(c, 'contacts')}
                />
              ) : null}

              {tab === 'contacts' && contactsStack[contactsStack.length - 1]?.kind === 'emergency' ? (
                <EmergencyScreen contacts={dataset.contacts} onOpenContact={(c) => openContact(c, 'contacts')} />
              ) : null}

              {tab === 'contacts' && contactsStack[contactsStack.length - 1]?.kind === 'favorites' ? (
                <FavoritesScreen contacts={dataset.contacts} onOpenContact={(c) => openContact(c, 'contacts')} />
              ) : null}

              {tab === 'contacts' && contactsStack[contactsStack.length - 1]?.kind === 'blocked' ? (
                <BlockedScreen contacts={dataset.contacts} onOpenContact={(c) => openContact(c, 'contacts')} />
              ) : null}

              {tab === 'contacts' && contactsStack[contactsStack.length - 1]?.kind === 'all' ? (
                <ContactsListScreen
                  contacts={dataset.contacts}
                  query={query}
                  onOpenContact={(c) => openContact(c, 'contacts')}
                />
              ) : null}

              {tab === 'contacts' && contactsStack[contactsStack.length - 1]?.kind === 'contactDetail'
                ? renderContactDetail(
                    (contactsStack[contactsStack.length - 1] as Extract<ContactsScreen, { kind: 'contactDetail' }>)
                      .contactId,
                    'contacts',
                  )
                : null}

              {tab === 'contacts' && contactsStack[contactsStack.length - 1]?.kind === 'transcript'
                ? renderTranscript(
                    (contactsStack[contactsStack.length - 1] as Extract<ContactsScreen, { kind: 'transcript' }>).callId,
                  )
                : null}

              {tab === 'saved' && savedStack[savedStack.length - 1]?.kind === 'list' ? (
                <SavedLogsScreen
                  calls={dataset.calls}
                  contacts={dataset.contacts}
                  onOpenCall={(call) => openTranscript(call, 'saved')}
                />
              ) : null}

              {tab === 'saved' && savedStack[savedStack.length - 1]?.kind === 'transcript'
                ? renderTranscript(
                    (savedStack[savedStack.length - 1] as Extract<SavedScreenNav, { kind: 'transcript' }>).callId,
                  )
                : null}
            </motion.div>
          </AnimatePresence>
        )}

        <div className="phone-tabbar phone-glass">
          {(
            [
              { id: 'favorites' as const, label: '收藏', Icon: Star },
              { id: 'recents' as const, label: '最近通话', Icon: Clock },
              { id: 'contacts' as const, label: '通讯录', Icon: Users },
              { id: 'saved' as const, label: '已存录音', Icon: Bookmark },
            ] as const
          ).map((item) => {
            const active = tab === item.id
            return (
              <Pressable
                key={item.id}
                type="button"
                className="phone-tabbar-item"
                data-active={active ? 'true' : 'false'}
                onClick={() => switchTab(item.id)}
              >
                <item.Icon
                  size={18}
                  strokeWidth={active ? 2 : 1.6}
                  fill={item.id === 'favorites' && active ? 'currentColor' : 'none'}
                />
                <span>{item.label}</span>
              </Pressable>
            )
          })}
        </div>

        <AnimatePresence>
          {overlay === 'more' ? (
            <motion.div
              className="absolute inset-0 z-40 flex items-end bg-black/20 p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onMouseDown={(e) => {
                if (e.target === e.currentTarget) setOverlay('none')
              }}
            >
              <motion.div
                className="phone-sheet w-full"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 14, opacity: 0 }}
                transition={{ duration: 0.15, ease: EASE }}
              >
                {[
                  {
                    label: 'AI 生成通话痕迹',
                    icon: Sparkles,
                    run: () => {
                      setOverlay('none')
                      setGenOpen(true)
                    },
                  },
                  {
                    label: '清除通话数据',
                    icon: Trash2,
                    run: () => {
                      void (async () => {
                        const next = emptyPhoneDataset()
                        await clearPhoneDataset(characterId)
                        await persist(next)
                        setRecentsStack([{ kind: 'callLog' }])
                        setContactsStack([{ kind: 'hub' }])
                        setFavoritesStack([{ kind: 'grid' }])
                        setSavedStack([{ kind: 'list' }])
                        onToast?.('已清除通话痕迹')
                        setOverlay('none')
                      })()
                    },
                  },
                ].map((opt, i) => (
                  <div key={opt.label}>
                    {i > 0 ? <div className="h-px bg-[var(--ph-line)]" /> : null}
                    <Pressable
                      type="button"
                      className="flex h-12 w-full items-center gap-3 px-4 text-[14px] text-[var(--ph-ink)]"
                      onClick={opt.run}
                    >
                      <opt.icon size={15} strokeWidth={1.6} className="text-[var(--ph-mist)]" />
                      {opt.label}
                    </Pressable>
                  </div>
                ))}
              </motion.div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      <PhoneAIGenerateModal
        open={genOpen}
        busy={genBusy}
        error={error}
        onClose={() => {
          if (!genBusy) setGenOpen(false)
        }}
        onSubmit={onGenerate}
      />
    </motion.div>
    </PhoneAvatarProvider>
  )
}
