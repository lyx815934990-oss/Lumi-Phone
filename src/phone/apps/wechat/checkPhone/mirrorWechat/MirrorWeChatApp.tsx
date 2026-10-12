import {
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type UIEvent as ReactUIEvent,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { motion } from 'framer-motion'
import {
  CircleUserRound,
  Image as ImageIcon,
  Lock,
  MessageSquareText,
  Phone,
  Sparkles,
  UserRound,
  Wallet,
} from 'lucide-react'

import { Pressable } from '../../../../components/Pressable'
import { MomentsContentBackdrop } from '../../../../../components/moments/MomentsContentBackdrop'
import { MomentsCover } from '../../../../../components/moments/MomentsCover'
import { MomentsFeed } from '../../../../../components/moments/MomentsFeed'
import { resolveMomentsCoverDisplayUrl } from '../../../../../components/moments/momentsCoverDefaults'
import { useCustomization } from '../../../../CustomizationContext'
import { useCurrentApiConfig } from '../../../api/ApiSettingsContext'
import {
  DEFAULT_PUBLIC_AVATAR_URL,
  resolveBubbleShowAvatar,
  type WeChatBubbleTheme,
  type WeChatTheme,
} from '../../../../types'
import { wrapWeChatChatSkinScopedCss } from '../../bubblePack/scopedCss'
import { LocationChatRow } from '../../location/LocationChatRow'
import {
  formatWeChatChatTimestamp,
  formatWeChatMessagesTabTimestamp,
  shouldRenderWeChatTimestamp,
} from '../../time/wechatTimeUtils'
import { RedPacketChatRow } from '../../redPacket/RedPacketChatRow'
import { TransferBubbleFace } from '../../transfer/TransferBubble'
import { getLumiTransferFresh, upsertLumiTransfer } from '../../transfer/lumiTransferStorage'
import { resolveCharacterStoryNowMs } from '../../time/messagesTabStoryTime'
import { CallStatusBubble } from '../../voiceCall/CallStatusBubble'
import { formatCallStatusLabel, fmtCallStatusDuration } from '../../voiceCall/callStatusLabel'
import {
  WECHAT_CHAT_DEFAULT_REPLY_LANGUAGE,
  WECHAT_CHAT_DEFAULT_TRANSLATION_LANGUAGE,
  type WeChatChatLanguageCode,
} from '../../wechatChatLanguage'
import { WeChatAvatarChromeProvider } from '../../WeChatAvatarChromeWrap'
import { WeChatChatSkinEngineProvider } from '../../WeChatChatSkinEngineContext'
import { WeChatMessageBubbleRow } from '../../WeChatMessageBubbleRow'
import {
  isTwitterXNightMode,
  isTwitterXPresetActive,
  isWechatClassicNightMode,
  migrateMislabeledLumiDefaultBubble,
} from '../../wechatBubblePresets'
import { TWITTER_X_COLORS } from '../../wechatBubbleTwitterUi'
import {
  WECHAT_CLASSIC,
  WECHAT_CLASSIC_AVATAR_SIZE_PX,
  wechatClassicSpecialSkinOverrides,
} from '../../wechatBubbleWechatUi'
import { chatBubbleSideFontCssVars } from '../../wechatBubbleSideFonts'
import { resolveMessengerBubbleStyle } from '../../wechatMessengerSpecialBubbles'
import {
  generateSpyWechatData,
  summarizeMirrorChatForAppend,
  type SpyChatTimeSpanUnit,
  type SpyExistingChatTranscript,
} from '../spyWechatAi'
import { inferSpySpecialFromContent, reconcileMirrorCallDurationSec } from '../spyWechatMarkup'
import { DataSyncModal, type MirrorSyncScope } from './DataSyncModal'
import {
  clearMirrorWeChatAddressBookMemory,
  clearMirrorWeChatChatMemory,
  deleteMirrorWeChatChatMemoryForContacts,
  getMirrorPlayerContactId,
  syncMirrorWeChatAddressBookToCharacterMemory,
  syncMirrorWeChatChatsToCharacterMemory,
} from './mirrorWechatContactMemory'
import { MirrorVoiceCallDetailModal } from './MirrorVoiceCallDetailModal'
import {
  mirrorContactsToMomentRefs,
  mirrorMomentsToFeedItems,
} from './mirrorMomentsFeedItems'
import { enrichMirrorMessagesWithClaimReceipts } from './mirrorSpecialClaimReceipts'
import { MirrorWeChatStoreProvider, useMirrorWeChatStore } from './MirrorWeChatStore'
import { MirrorChatListAvatar } from './WeChatGroupAvatarMosaic'
import {
  findMirrorDmContactByName,
  isMirrorGroupContact,
  type MirrorWeChatContact,
  type MirrorWeChatMessage,
  type MirrorWeChatTab,
} from './types'
import { WeChatChatMixedText } from '../../WeChatChatMixedText'

function bubbleForRole(theme: WeChatTheme, roleKey: string): WeChatBubbleTheme {
  const by = theme.bubbleByRole?.[roleKey]
  return by || theme.bubbleGlobal
}

const LETTER_INDEX = [
  'A',
  'B',
  'C',
  'D',
  'E',
  'F',
  'G',
  'H',
  'I',
  'J',
  'K',
  'L',
  'M',
  'N',
  'O',
  'P',
  'Q',
  'R',
  'S',
  'T',
  'U',
  'V',
  'W',
  'X',
  'Y',
  'Z',
  '#',
] as const

type LetterKey = (typeof LETTER_INDEX)[number]

const ZH_PINYIN_INITIAL_BOUNDARIES: Array<{ letter: Exclude<LetterKey, '#'>; start: string }> = [
  { letter: 'A', start: '阿' },
  { letter: 'B', start: '芭' },
  { letter: 'C', start: '擦' },
  { letter: 'D', start: '搭' },
  { letter: 'E', start: '蛾' },
  { letter: 'F', start: '发' },
  { letter: 'G', start: '噶' },
  { letter: 'H', start: '哈' },
  { letter: 'J', start: '击' },
  { letter: 'K', start: '喀' },
  { letter: 'L', start: '垃' },
  { letter: 'M', start: '妈' },
  { letter: 'N', start: '拿' },
  { letter: 'O', start: '哦' },
  { letter: 'P', start: '啪' },
  { letter: 'Q', start: '期' },
  { letter: 'R', start: '然' },
  { letter: 'S', start: '撒' },
  { letter: 'T', start: '塌' },
  { letter: 'W', start: '挖' },
  { letter: 'X', start: '昔' },
  { letter: 'Y', start: '压' },
  { letter: 'Z', start: '匝' },
]

function getZhPinyinInitial(ch: string): LetterKey {
  for (let i = ZH_PINYIN_INITIAL_BOUNDARIES.length - 1; i >= 0; i -= 1) {
    const item = ZH_PINYIN_INITIAL_BOUNDARIES[i]
    if (ch.localeCompare(item.start, 'zh-CN-u-co-pinyin') >= 0) return item.letter
  }
  return '#'
}

function getGroupLetter(name: string): LetterKey {
  const first = (name || '').trim().charAt(0)
  if (!first) return '#'
  const upper = first.toUpperCase()
  if (/^[A-Z]$/.test(upper)) return upper as LetterKey
  if (/^[\u4e00-\u9fff]$/.test(first)) return getZhPinyinInitial(first)
  return '#'
}

function formatMoney(amount: number) {
  const abs = Math.abs(amount).toFixed(2)
  return `${amount >= 0 ? '+' : '-'}${abs}`
}

function tabLabel(tab: MirrorWeChatTab) {
  switch (tab) {
    case 'chats':
      return '信息'
    case 'contacts':
      return '通讯录'
    case 'moments':
      return '朋友圈'
    case 'profile':
      return '我'
  }
}

function Main({
  characterId,
  playerIdentityId,
  playerDisplayName,
  playerWechatAvatarUrl,
  playerWechatNickname,
  useLumiProjectAssistantPrompt,
  onClose,
  onToast,
}: {
  characterId: string
  playerIdentityId: string
  playerDisplayName: string
  playerWechatAvatarUrl?: string
  playerWechatNickname?: string
  useLumiProjectAssistantPrompt: boolean
  onClose: () => void
  onToast: (msg: string) => void
}) {
  const apiConfig = useCurrentApiConfig('chatCard')
  const {
    state,
    mergeGenerated,
    hydrated,
    clearByTab,
    clearChatMessagesForContacts,
    removeContactsByIds,
  } = useMirrorWeChatStore()
  const [tab, setTab] = useState<MirrorWeChatTab>('chats')
  const [syncOpen, setSyncOpen] = useState(false)
  const [syncBusy, setSyncBusy] = useState(false)
  const [syncBusyLabel, setSyncBusyLabel] = useState('')
  const [fabCoachOpen, setFabCoachOpen] = useState(false)
  const [chatOpenId, setChatOpenId] = useState<string | null>(null)
  const [walletOpen, setWalletOpen] = useState(false)
  const [minMessagesPerContact, setMinMessagesPerContact] = useState(8)
  const [chatTimeSpanUnit, setChatTimeSpanUnit] = useState<SpyChatTimeSpanUnit>('day')
  const [chatTimeSpanValue, setChatTimeSpanValue] = useState(7)
  const [plotNowLabel, setPlotNowLabel] = useState('')
  const [plotNowMs, setPlotNowMs] = useState<number | null>(null)
  const [walletBias, setWalletBias] = useState('')
  const [selectedRelations, setSelectedRelations] = useState<string[]>([])
  const [contactCount, setContactCount] = useState(12)
  const [contactCustomBias, setContactCustomBias] = useState('')
  const [selectedChatBiases, setSelectedChatBiases] = useState<string[]>([])
  const [chatCustomBias, setChatCustomBias] = useState('')
  const [generateRelatedGroups, setGenerateRelatedGroups] = useState(false)
  const [relatedGroupsCount, setRelatedGroupsCount] = useState(2)
  const [groupChatCustomBias, setGroupChatCustomBias] = useState('')
  const [voiceCallDetail, setVoiceCallDetail] = useState<{
    durationSec: number
    peerName: string
    peerAvatarUrl?: string
    characterName?: string
    characterAvatarUrl?: string
    lines: Array<{ role: 'character' | 'player'; text: string; translation?: string }>
  } | null>(null)
  /** 窥探只读：红包详情（不可代领） */
  const [redPacketDetail, setRedPacketDetail] = useState<{
    amountYuan: number
    remark: string
    senderName: string
    senderAvatarUrl?: string
    claimerName?: string
    peerLabel: string
    selfLabel: string
    fromSelf: boolean
    opened: boolean
  } | null>(null)
  /** 窥探只读：转账详情（不可代收） */
  const [transferDetail, setTransferDetail] = useState<{
    amountYuan: number
    note: string
    senderName: string
    senderAvatarUrl?: string
    peerLabel: string
    selfLabel: string
    fromSelf: boolean
    status: 'pending' | 'accepted' | 'returned'
  } | null>(null)
  const [includeHideFromUser, setIncludeHideFromUser] = useState(true)
  const [includeOnlyTaVisible, setIncludeOnlyTaVisible] = useState(true)
  const [ingestChatToMemory, setIngestChatToMemory] = useState(false)
  const [generateLanguage, setGenerateLanguage] = useState<WeChatChatLanguageCode>(
    WECHAT_CHAT_DEFAULT_REPLY_LANGUAGE,
  )
  const [syncTranslation, setSyncTranslation] = useState(false)
  const [translationLanguage, setTranslationLanguage] = useState<WeChatChatLanguageCode>(
    WECHAT_CHAT_DEFAULT_TRANSLATION_LANGUAGE,
  )
  const [includeSpecialMessages, setIncludeSpecialMessages] = useState(false)
  const [openMirrorTranslations, setOpenMirrorTranslations] = useState<Record<string, boolean>>({})
  const playerContactId = useMemo(
    () => getMirrorPlayerContactId(playerIdentityId),
    [playerIdentityId],
  )
  const hasContacts = state.contacts.some((c) => !isMirrorGroupContact(c))
  const [activeLetter, setActiveLetter] = useState<LetterKey>('A')
  const groupRefs = useRef<Partial<Record<LetterKey, HTMLDivElement | null>>>({})
  const indexNavRef = useRef<HTMLDivElement | null>(null)
  const chatScrollRef = useRef<HTMLDivElement | null>(null)
  /** 各会话上次上滑阅读位置；贴底离开则清除，下次进房默认到底 */
  const chatScrollMemoryRef = useRef<Record<string, number>>({})
  const syncAbortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const ms = await resolveCharacterStoryNowMs(characterId)
      if (cancelled) return
      if (typeof ms === 'number' && Number.isFinite(ms) && ms > 0) {
        setPlotNowMs(ms)
        const d = new Date(ms)
        const pad = (x: number) => String(x).padStart(2, '0')
        setPlotNowLabel(
          `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`,
        )
      } else {
        setPlotNowMs(null)
        setPlotNowLabel('')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [characterId, syncOpen])

  const FAB_COACH_SEEN_KEY = 'mirrorWechat.fabCoach.seen.v1'
  const dismissFabCoach = () => {
    try {
      window.localStorage.setItem(FAB_COACH_SEEN_KEY, '1')
    } catch {
      /* ignore */
    }
    setFabCoachOpen(false)
  }
  useEffect(() => {
    if (!hydrated || chatOpenId || syncOpen) return
    try {
      if (window.localStorage.getItem(FAB_COACH_SEEN_KEY) === '1') return
    } catch {
      /* show coach anyway */
    }
    const id = window.setTimeout(() => setFabCoachOpen(true), 480)
    return () => window.clearTimeout(id)
  }, [hydrated, chatOpenId, syncOpen])

  const { state: customization } = useCustomization()
  const wechatTheme = customization.wechatTheme
  const currentChat = useMemo(() => state.contacts.find((item) => item.id === chatOpenId) || null, [chatOpenId, state.contacts])
  const roleAvatarUrl = useMemo(() => state.profile?.avatarUrl || DEFAULT_PUBLIC_AVATAR_URL, [state.profile?.avatarUrl])
  const mirrorMomentsAuthorName = useMemo(
    () => state.profile?.nickname?.trim() || playerWechatNickname?.trim() || '角色',
    [playerWechatNickname, state.profile?.nickname],
  )
  const mirrorMomentsFeedItems = useMemo(
    () =>
      mirrorMomentsToFeedItems(state.moments, {
        authorName: mirrorMomentsAuthorName,
        authorAvatar: roleAvatarUrl,
        authorCharacterId: characterId,
        nowMs: plotNowMs ?? undefined,
      }),
    [characterId, mirrorMomentsAuthorName, plotNowMs, roleAvatarUrl, state.moments],
  )
  const mirrorMomentContacts = useMemo(
    () => mirrorContactsToMomentRefs(state.contacts),
    [state.contacts],
  )
  const mirrorMomentsCoverUrl = useMemo(() => resolveMomentsCoverDisplayUrl(null), [])
  const mirrorBubbleTheme = useMemo(
    () => migrateMislabeledLumiDefaultBubble(bubbleForRole(wechatTheme, characterId)),
    [wechatTheme, characterId],
  )
  const messengerStyle = useMemo(
    () => resolveMessengerBubbleStyle(mirrorBubbleTheme, wechatTheme.chatSkinEngine),
    [mirrorBubbleTheme, wechatTheme.chatSkinEngine],
  )
  const bubblePrefs = useMemo(() => {
    const g = mirrorBubbleTheme
    const groupOpen = !!(currentChat && isMirrorGroupContact(currentChat))
    return {
      /** 群聊强制对方头像；己方仍跟主题（X 等私信风可无头像） */
      showAvatarOther: groupOpen || resolveBubbleShowAvatar(g, 'other'),
      showAvatarSelf: resolveBubbleShowAvatar(g, 'self'),
      mergeConsecutiveAvatarGroup:
        g.bubbleTailStyle === 'wechat' ? false : g.mergeConsecutiveAvatarGroup !== false,
    }
  }, [mirrorBubbleTheme, currentChat])
  const wechatClassicNight = isWechatClassicNightMode(wechatTheme)
  const twitterDmActive = isTwitterXPresetActive(wechatTheme)
  const twitterDmNight = twitterDmActive && isTwitterXNightMode(wechatTheme)
  const chatNightMode = wechatClassicNight || twitterDmNight
  const showChatTimestamps = wechatTheme.timestampStyle !== 'hidden'
  const dmContacts = useMemo(
    () => state.contacts.filter((item) => !isMirrorGroupContact(item)),
    [state.contacts],
  )
  const dmContactById = useMemo(() => {
    const map = new Map<string, MirrorWeChatContact>()
    for (const c of dmContacts) map.set(c.id, c)
    return map
  }, [dmContacts])
  const mirrorChatScopeStyle = useMemo(() => {
    const roomBg = chatNightMode
      ? wechatClassicNight
        ? WECHAT_CLASSIC.chatBgNight
        : TWITTER_X_COLORS.bgNight
      : '#EDEDED'
    return {
      ...chatBubbleSideFontCssVars(mirrorBubbleTheme),
      ...(wechatClassicNight ? wechatClassicSpecialSkinOverrides(true) : {}),
      '--wx-self-bubble-bg': mirrorBubbleTheme.selfBubbleBg,
      '--wx-self-bubble-text': wechatTheme.selfBubbleText || '#191919',
      '--wx-self-bubble-radius': `${mirrorBubbleTheme.selfBubbleRadiusPx}px`,
      '--wx-other-bubble-bg': mirrorBubbleTheme.otherBubbleBg,
      '--wx-other-bubble-text':
        wechatTheme.otherBubbleText || (chatNightMode ? WECHAT_CLASSIC.textNight : '#191919'),
      '--wx-other-bubble-radius': `${mirrorBubbleTheme.otherBubbleRadiusPx}px`,
      '--wx-avatar-radius': `${mirrorBubbleTheme.avatarRadiusPx}px`,
      '--wx-chat-room-bg': roomBg,
      '--wx-text-muted': chatNightMode ? WECHAT_CLASSIC.mutedNight : '#888888',
      '--wx-timestamp-text':
        wechatTheme.timestampText ||
        (chatNightMode ? WECHAT_CLASSIC.timestampTextNight : '#888'),
      background: `var(--wx-chat-room-bg, ${roomBg})`,
    } as CSSProperties
  }, [mirrorBubbleTheme, wechatTheme, chatNightMode, wechatClassicNight])

  const chatDisplayName = (item: MirrorWeChatContact) =>
    isMirrorGroupContact(item)
      ? (item.groupName || item.remarkName || item.nickname || '群聊').trim() || '群聊'
      : (item.remarkName || item.nickname || '对话').trim() || '对话'
  const starredContacts = useMemo(
    () =>
      dmContacts
        .filter((item) => !!item.isStarred)
        .sort((a, b) => (a.remarkName || a.nickname || '').localeCompare(b.remarkName || b.nickname || '', 'zh-CN-u-co-pinyin')),
    [dmContacts],
  )
  const contactsGrouped = useMemo(() => {
    const map = new Map<LetterKey, typeof state.contacts>()
    for (const letter of LETTER_INDEX) map.set(letter, [])
    for (const item of dmContacts) {
      const key = getGroupLetter(item.remarkName || item.nickname || '')
      map.get(key)?.push(item)
    }
    for (const [k, list] of map) {
      list.sort((a, b) => (a.remarkName || a.nickname || '').localeCompare(b.remarkName || b.nickname || '', 'zh-CN-u-co-pinyin'))
      if (!list.length) map.delete(k)
    }
    return map
  }, [dmContacts])
  const contactVisibleLetters = useMemo(() => Array.from(contactsGrouped.keys()), [contactsGrouped])

  useEffect(() => {
    if (tab !== 'contacts') return
    if (!contactVisibleLetters.length) return
    if (!contactVisibleLetters.includes(activeLetter)) setActiveLetter(contactVisibleLetters[0])
  }, [activeLetter, contactVisibleLetters, tab])

  /** 将「用户 / NPC / 新增」三类备注同步到同一条长期记忆；仅「新增」带 relationship 描述字段 */
  useEffect(() => {
    if (!hydrated) return
    if (!characterId.trim()) return
    void syncMirrorWeChatAddressBookToCharacterMemory(characterId, playerIdentityId, state.contacts)
  }, [hydrated, characterId, playerIdentityId, state.contacts])

  const jumpToLetter = (letter: LetterKey) => {
    setActiveLetter(letter)
    groupRefs.current[letter]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const pickLetterByClientY = (clientY: number): LetterKey | null => {
    const root = indexNavRef.current
    if (!root) return null
    const items = Array.from(root.querySelectorAll<HTMLButtonElement>('button[data-letter]'))
    if (!items.length) return null
    let picked: LetterKey | null = null
    let minDist = Number.POSITIVE_INFINITY
    for (const btn of items) {
      const rect = btn.getBoundingClientRect()
      const centerY = rect.top + rect.height / 2
      const d = Math.abs(clientY - centerY)
      if (d < minDist) {
        minDist = d
        picked = (btn.dataset.letter as LetterKey) ?? null
      }
    }
    return picked
  }

  const onIndexPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!(e.buttons & 1)) return
    const letter = pickLetterByClientY(e.clientY)
    if (letter && letter !== activeLetter) jumpToLetter(letter)
  }

  const onIndexPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    const letter = pickLetterByClientY(e.clientY)
    if (letter) jumpToLetter(letter)
  }

  const onIndexPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId)
  }

  const runSyncScopes = async (payload: {
    action: 'generate' | 'update'
    scopes: MirrorSyncScope[]
    contactIds: string[]
  }) => {
    const { action: mode, scopes, contactIds } = payload
    if (scopes.some((s) => s !== 'contacts') && !hasContacts) {
      onToast('请先生成通讯录，才能操作其它数据。')
      return
    }
    if (scopes.includes('chats') && !contactIds.length) {
      onToast('请至少勾选一个联系人再生成聊天。')
      return
    }
    if (mode === 'generate' && typeof window !== 'undefined') {
      const hasContactsData = scopes.includes('contacts') && hasContacts
      const hasChatData = scopes.includes('chats') && state.contacts.some((x) => x.messages.length > 0)
      const hasMomentsData = scopes.includes('moments') && state.moments.length > 0
      const hasMeData =
        scopes.includes('me') &&
        Boolean(state.profile?.nickname || state.bills.length || state.affectionCards.length)
      if (hasContactsData) {
        const hasAnyChats = state.contacts.some((x) => x.messages.length > 0)
        const proceed = window.confirm(
          [
            '当前通讯录已有数据。',
            '',
            '继续「生成」会整表重新生成通讯录（不是追加更新）。',
            hasAnyChats
              ? '已有的联系人聊天记录也会被清空；对应记忆摘要会一并清除。'
              : '若之后再生成聊天，将基于新通讯录重新铺开。',
            '',
            '若只想在现有名单上增量调整，请改用「更新」。',
            '',
            '确认继续生成吗？',
          ].join('\n'),
        )
        if (!proceed) return
      } else if (hasChatData || hasMomentsData || hasMeData) {
        const proceed = window.confirm(
          '所选范围已有数据。「生成」会覆盖对应范围；若想追加请改用「更新」。\n\n确认继续生成吗？',
        )
        if (!proceed) return
      }
    }

    syncAbortRef.current?.abort()
    const ac = new AbortController()
    syncAbortRef.current = ac
    setSyncBusy(true)
    setSyncBusyLabel('准备中…')
    let stoppedByUser = false
    try {
      const toSnapshot = (list: typeof state.contacts) =>
        list.map((c) => ({
          id: c.id,
          nickname: c.nickname,
          remarkName: c.remarkName,
          characterId: c.characterId,
          isStarred: c.isStarred,
          isPinned: c.isPinned,
          blocked: c.blocked,
          kind: c.kind,
          avatarUrl: c.avatarUrl,
          relationshipNote: c.relationshipNote,
        }))
      let liveSnapshot = toSnapshot(state.contacts)
      let liveContacts = state.contacts
      // 通讯录优先，便于同一次勾选后其它范围依赖最新名单
      const ordered = (['contacts', 'chats', 'moments', 'me'] as MirrorSyncScope[]).filter((s) =>
        scopes.includes(s),
      )
      let wroteChatMemory = false
      for (const scope of ordered) {
        if (ac.signal.aborted) {
          stoppedByUser = true
          break
        }
        const scopeLabel =
          scope === 'me' ? '我' : scope === 'chats' ? '信息' : scope === 'moments' ? '朋友圈' : '通讯录'
        setSyncBusyLabel(`正在${mode === 'update' ? '更新' : '生成'}「${scopeLabel}」…`)
        const userContactBias = [
          selectedRelations.length ? `关系偏向：${selectedRelations.join('、')}` : '',
          contactCustomBias.trim() ? `自定义要求：${contactCustomBias.trim()}` : '',
        ]
          .filter(Boolean)
          .join('\n')
        const userChatBias = [
          selectedChatBiases.length ? `内容偏向：${selectedChatBiases.join('、')}` : '',
          chatCustomBias.trim() ? `自定义要求：${chatCustomBias.trim()}` : '',
        ]
          .filter(Boolean)
          .join('\n')
        const updateBias =
          scope === 'contacts'
            ? '仅基于当前已存在通讯录与用户-角色近期对话/线下剧情做增量更新；总体联系人保持稳定，仅在剧情明确出现“新认识的人”时新增。'
            : scope === 'chats'
              ? '续写追加硬项：承接该会话已有聊天末尾往下写；禁止重复已问过的开场/同一问题（如已问「有没有喜欢的人」禁止再问）；新戳须晚于旧末条并贴近剧情「现在」。'
              : '仅基于当前已有数据与近期剧情推进增量更新。'
        const contactBiasForScope =
          scope === 'contacts'
            ? [mode === 'update' ? updateBias : '', userContactBias].filter(Boolean).join('\n')
            : scope === 'me'
              ? walletBias.trim()
              : ''
        const chatBiasForScope =
          scope === 'chats'
            ? [mode === 'update' ? updateBias : '', userChatBias].filter(Boolean).join('\n')
            : undefined
        const existingChatTranscriptsByContactId: Record<string, SpyExistingChatTranscript> | undefined =
          scope === 'chats' && mode === 'update'
            ? (() => {
                const map: Record<string, SpyExistingChatTranscript> = {}
                const ids =
                  contactIds.length > 0
                    ? contactIds
                    : liveContacts.filter((c) => !isMirrorGroupContact(c)).map((c) => c.id)
                for (const id of ids) {
                  const row = liveContacts.find((c) => c.id === id)
                  if (!row || isMirrorGroupContact(row)) continue
                  const summary = summarizeMirrorChatForAppend(row.messages || [])
                  if (summary) map[id] = summary
                }
                return map
              })()
            : undefined
        let data
        try {
          data = await generateSpyWechatData({
            apiConfig,
            characterId,
            playerIdentityId,
            playerDisplayName,
            playerWechatAvatarUrl,
            playerWechatNickname: playerWechatNickname || playerDisplayName,
            useLumiProjectAssistantPrompt,
            scope,
            signal: ac.signal,
            onProgress: (msg) => setSyncBusyLabel(msg),
            options: {
              contactCount:
                scope === 'contacts'
                  ? Math.min(30, Math.max(4, contactCount || 12))
                  : mode === 'update'
                    ? Math.min(
                        30,
                        Math.max(4, liveContacts.filter((c) => !isMirrorGroupContact(c)).length || 4),
                      )
                    : Math.min(30, Math.max(4, contactCount || 12)),
              contactBias: contactBiasForScope,
              chatBias: chatBiasForScope,
              currentContactsSnapshot:
                scope === 'chats' || scope === 'moments' || mode === 'update' ? liveSnapshot : [],
              includeBlocked: true,
              includeMomentsHideFromUser: mode === 'update' ? true : includeHideFromUser,
              includeMomentsOnlyTaVisibleWithoutUser: mode === 'update' ? true : includeOnlyTaVisible,
              minMessagesPerContact: Math.min(80, Math.max(1, minMessagesPerContact || 8)),
              chatContactsCount: contactIds.length || 1,
              chatTargetContactIds: scope === 'chats' ? contactIds : undefined,
              chatTimeSpanUnit,
              chatTimeSpanValue: Math.max(1, chatTimeSpanValue || 1),
              generateRelatedGroups: scope === 'chats' ? generateRelatedGroups : false,
              relatedGroupsCount: scope === 'chats' ? relatedGroupsCount : undefined,
              groupChatCustomBias: scope === 'chats' ? groupChatCustomBias : undefined,
              generateLanguage,
              syncTranslation,
              translationLanguage,
              includeSpecialMessages: scope === 'chats' ? includeSpecialMessages : false,
              chatsAppend: scope === 'chats' && mode === 'update',
              existingChatTranscriptsByContactId,
            },
          })
        } catch (e) {
          const aborted =
            ac.signal.aborted ||
            (e instanceof Error &&
              (e.name === 'AbortError' || /aborted|已停止/i.test(e.message || '')))
          if (aborted) {
            stoppedByUser = true
            break
          }
          throw e
        }
        mergeGenerated(scope, data, mode)
        if (scope === 'contacts' && Array.isArray(data.contacts) && data.contacts.length) {
          liveContacts = data.contacts.map((c) => ({
            ...c,
            messages:
              mode === 'generate' && !String(c.id || '').startsWith('player:')
                ? []
                : Array.isArray(c.messages)
                  ? c.messages
                  : [],
          }))
          liveSnapshot = toSnapshot(liveContacts)
          if (mode === 'generate') {
            await clearMirrorWeChatChatMemory(characterId)
            setChatOpenId(null)
          }
          await syncMirrorWeChatAddressBookToCharacterMemory(
            characterId,
            playerIdentityId,
            liveContacts,
          )
        }
        if (scope === 'chats') {
          const incomingById = new Map((data.contacts || []).map((c) => [c.id, c] as const))
          const mergedAfterChats = liveContacts.map((oldC) => {
            const incoming = incomingById.get(oldC.id)
            if (!incoming) return oldC
            return {
              ...oldC,
              kind: incoming.kind || oldC.kind,
              groupName: incoming.groupName || oldC.groupName,
              members: incoming.members?.length ? incoming.members : oldC.members,
              messages:
                oldC.id === playerContactId || mode === 'generate'
                  ? incoming.messages || []
                  : [...(oldC.messages || []), ...(incoming.messages || [])],
            }
          })
          for (const c of incomingById.values()) {
            if (!mergedAfterChats.some((x) => x.id === c.id)) {
              mergedAfterChats.push({
                ...c,
                messages: Array.isArray(c.messages) ? c.messages : [],
              })
            }
          }
          liveContacts = mergedAfterChats
          // 用户已点停止则不再打记忆摘要轮；群聊按群单独写入，不进通讯录备忘
          if (ingestChatToMemory && !ac.signal.aborted) {
            setSyncBusyLabel('正在写入长期记忆摘要…\n（私聊按人 · 群聊按群，各整批一轮）')
            await syncMirrorWeChatChatsToCharacterMemory(
              characterId,
              playerIdentityId,
              mergedAfterChats,
              {
                apiConfig,
                useAiSummary: true,
              },
            )
            wroteChatMemory = true
          }
        }
        if (ac.signal.aborted) {
          stoppedByUser = true
          break
        }
      }
      setSyncOpen(false)
      if (stoppedByUser) {
        onToast('已停止生成；已完成的内容已保留')
      } else {
        const labels = ordered
          .map((s) => (s === 'me' ? '我' : s === 'chats' ? '信息' : s === 'moments' ? '朋友圈' : '通讯录'))
          .join('、')
        onToast(
          `${mode === 'update' ? '已更新' : '已生成'}：${labels}${wroteChatMemory ? '（含记忆）' : ''}`,
        )
      }
    } catch (error) {
      const aborted =
        syncAbortRef.current?.signal.aborted ||
        (error instanceof Error &&
          (error.name === 'AbortError' || /aborted|已停止/i.test(error.message || '')))
      if (aborted) onToast('已停止生成；已完成的内容已保留')
      else onToast(error instanceof Error ? error.message : '同步失败')
    } finally {
      syncAbortRef.current = null
      setSyncBusy(false)
      setSyncBusyLabel('')
    }
  }

  const stopSyncGeneration = () => {
    if (!syncAbortRef.current) return
    setSyncBusyLabel('正在停止…\n已生成的内容会保留')
    syncAbortRef.current.abort()
  }

  const runDeleteScopes = async (payload: { scopes: MirrorSyncScope[]; contactIds: string[] }) => {
    const { scopes, contactIds } = payload
    if (!scopes.length) return
    if (typeof window !== 'undefined') {
      const labels = scopes
        .map((s) => (s === 'me' ? '我' : s === 'chats' ? '信息' : s === 'moments' ? '朋友圈' : '通讯录'))
        .join('、')
      const confirmed = window.confirm(
        `确认删除所选范围（${labels}）${
          contactIds.length ? `，涉及 ${contactIds.length} 个会话/联系人` : ''
        }？此操作不可撤销。`,
      )
      if (!confirmed) return
    }
    setSyncBusy(true)
    try {
      if (scopes.includes('contacts')) {
        const nonPlayer = state.contacts.filter((c) => c.id !== playerContactId)
        const deletingPartial =
          contactIds.length > 0 && contactIds.length < nonPlayer.length
        if (deletingPartial) {
          const remain = state.contacts.filter((c) => !contactIds.includes(c.id))
          removeContactsByIds(contactIds)
          await deleteMirrorWeChatChatMemoryForContacts(characterId, contactIds)
          await syncMirrorWeChatAddressBookToCharacterMemory(
            characterId,
            playerIdentityId,
            remain,
          )
        } else {
          clearByTab('contacts')
          await clearMirrorWeChatAddressBookMemory(characterId)
        }
        setChatOpenId(null)
      } else if (scopes.includes('chats')) {
        const ids = contactIds.length
          ? contactIds
          : state.contacts.filter((c) => c.id !== playerContactId).map((c) => c.id)
        clearChatMessagesForContacts(ids)
        await deleteMirrorWeChatChatMemoryForContacts(characterId, ids)
        if (chatOpenId && ids.includes(chatOpenId)) setChatOpenId(null)
      }
      if (scopes.includes('moments')) clearByTab('moments')
      if (scopes.includes('me')) {
        clearByTab('profile')
        setWalletOpen(false)
      }
      setSyncOpen(false)
      onToast('已按所选范围删除')
    } catch (error) {
      onToast(error instanceof Error ? error.message : '删除失败')
    } finally {
      setSyncBusy(false)
    }
  }

  const chats = useMemo(() => {
    const list = state.contacts.filter((item) => item.messages.length)
    return [...list].sort((a, b) => {
      const ap = a.isPinned ? 1 : 0
      const bp = b.isPinned ? 1 : 0
      if (ap !== bp) return bp - ap
      const at = a.messages.at(-1)?.timestamp || 0
      const bt = b.messages.at(-1)?.timestamp || 0
      return bt - at
    })
  }, [state.contacts])

  useEffect(() => {
    if (!chatOpenId || !currentChat) return
    const conversationKey = `mirror:${chatOpenId}`
    currentChat.messages.forEach((msg, index) => {
      const special = msg.special?.kind === 'transfer' ? msg.special : inferSpySpecialFromContent(msg.content)
      if (special?.kind !== 'transfer') return
      const transferId =
        (special.transferId || '').trim() || `mirror-transfer:${conversationKey}:${msg.timestamp}:${index}`
      const existing = getLumiTransferFresh(transferId, () => Date.now())
      const amount =
        Number(special.amountYuan) > 0
          ? Number(special.amountYuan)
          : Number(existing?.amount) > 0
            ? Number(existing!.amount)
            : 88
      upsertLumiTransfer({
        id: transferId,
        amount,
        remark: special.note || msg.content || existing?.remark || '微信转账',
        senderId: msg.from === 'character' ? 'mirror-role' : 'mirror-peer',
        receiverId: msg.from === 'character' ? 'mirror-peer' : 'mirror-role',
        status: special.status || existing?.status || 'pending',
        createdAt: Number(msg.timestamp || existing?.createdAt || Date.now()),
        expiresAt: Number(msg.timestamp || Date.now()) + 24 * 60 * 60 * 1000,
        conversationKey,
        messageId: `mirror-msg:${msg.timestamp}:${index}`,
      })
    })
  }, [chatOpenId, currentChat])

  const mirrorVoiceCallDurationSec = (special: {
    durationSec?: number
    lines?: unknown[]
  }) => {
    const n = Array.isArray(special.lines) ? special.lines.length : 0
    const dur = Math.max(0, Number(special.durationSec) || 0)
    const aligned = reconcileMirrorCallDurationSec(dur, n)
    return Math.max(1, aligned || dur || 1)
  }

  const openVoiceCallDetail = (msg: MirrorWeChatMessage) => {
    if (msg.special?.kind !== 'voice_call') return
    const peer =
      currentChat && isMirrorGroupContact(currentChat)
        ? chatDisplayName(currentChat)
        : currentChat?.remarkName || currentChat?.nickname || '对方'
    const lines = Array.isArray(msg.special.lines) ? msg.special.lines : []
    setVoiceCallDetail({
      durationSec: mirrorVoiceCallDurationSec(msg.special),
      peerName: peer,
      peerAvatarUrl: currentChat?.avatarUrl,
      characterName: state.profile?.nickname?.trim() || '角色',
      characterAvatarUrl: roleAvatarUrl,
      lines,
    })
  }

  const mirrorSelfLabel = () =>
    state.profile?.nickname?.trim() || playerWechatNickname?.trim() || '角色'

  /** 点红包：窥探模式只读查看金额/备注/领取态，不可代领 */
  const openMirrorRedPacket = (
    msg: MirrorWeChatMessage,
    _index: number,
    isSelf: boolean,
    peerLabel: string,
    leftAvatar: string,
  ) => {
    if (!chatOpenId) return
    const special = msg.special?.kind === 'red_packet' ? msg.special : undefined
    if (!special) return
    const amountYuan = Number(special.amountYuan) > 0 ? Number(special.amountYuan) : 8.88
    const remark = (special.remark || '恭喜发财，大吉大利').trim() || '恭喜发财，大吉大利'
    const selfLabel = mirrorSelfLabel()
    const senderName = isSelf ? selfLabel : peerLabel
    const senderAvatarUrl = isSelf ? roleAvatarUrl : leftAvatar
    setRedPacketDetail({
      amountYuan,
      remark,
      senderName,
      senderAvatarUrl,
      claimerName: special.opened ? (isSelf ? peerLabel : selfLabel) : undefined,
      peerLabel,
      selfLabel,
      fromSelf: isSelf,
      opened: !!special.opened,
    })
  }

  /** 点转账：窥探模式只读查看金额/备注/收款态，不可代收 */
  const openMirrorTransfer = (
    msg: MirrorWeChatMessage,
    index: number,
    isSelf: boolean,
    peerLabel: string,
    leftAvatar: string,
  ) => {
    if (!chatOpenId) return
    const special =
      msg.special?.kind === 'transfer' ? msg.special : inferSpySpecialFromContent(msg.content)
    if (special?.kind !== 'transfer') return
    const transferId =
      (special.transferId || '').trim() ||
      `mirror-transfer:mirror:${chatOpenId}:${msg.timestamp}:${index}`
    const stored = getLumiTransferFresh(transferId, () => Date.now())
    const amountYuan =
      Number(special.amountYuan) > 0
        ? Number(special.amountYuan)
        : Number(stored?.amount) > 0
          ? Number(stored!.amount)
          : 88
    const status = special.status || stored?.status || 'pending'
    const note = (special.note || stored?.remark || '').trim() || '微信转账'
    const selfLabel = mirrorSelfLabel()
    setTransferDetail({
      amountYuan,
      note,
      senderName: isSelf ? selfLabel : peerLabel,
      senderAvatarUrl: isSelf ? roleAvatarUrl : leftAvatar,
      peerLabel,
      selfLabel,
      fromSelf: isSelf,
      status,
    })
  }

  /** 特殊消息卡片（无整行头像）；文字气泡走 WeChatMessageBubbleRow */
  const renderSpecialCard = (
    msg: MirrorWeChatMessage,
    isSelf: boolean,
    index: number,
    leftAvatar: string,
  ) => {
    const special = msg.special || inferSpySpecialFromContent(msg.content)
    if (special?.kind === 'voice_call') {
      const data =
        special.status === 'duration'
          ? {
              status: 'duration' as const,
              durationSec: mirrorVoiceCallDurationSec(special),
            }
          : { status: special.status }
      return (
        <CallStatusBubble
          data={data}
          initiatedBySelf={isSelf}
          twitterStyle={twitterDmActive}
          onClickDuration={
            special.status === 'duration' ? () => openVoiceCallDetail(msg) : undefined
          }
        />
      )
    }
    if (special?.kind === 'red_packet') {
      // 红包走 RedPacketChatRow（窥探只读详情）
      return null
    }
    if (special?.kind === 'transfer') {
      const transferId =
        (special.transferId || '').trim() ||
        `mirror-transfer:mirror:${chatOpenId || 'chat'}:${msg.timestamp}:${index}`
      const stored = getLumiTransferFresh(transferId, () => Date.now())
      const amountYuan =
        Number(special.amountYuan) > 0
          ? Number(special.amountYuan)
          : Number(stored?.amount) > 0
            ? Number(stored!.amount)
            : 88
      const status = special.status || stored?.status || 'pending'
      const remark = special.note || stored?.remark || undefined
      const peerLabel =
        (currentChat?.remarkName || currentChat?.nickname || '对方').trim() || '对方'
      return (
        <Pressable
          type="button"
          className="block max-w-full text-left"
          onClick={() => openMirrorTransfer(msg, index, isSelf, peerLabel, leftAvatar)}
        >
          <TransferBubbleFace
            status={status}
            amountYuan={amountYuan}
            remark={remark}
            perspective={isSelf ? 'outgoing' : 'incoming'}
            messengerStyle={messengerStyle}
          />
        </Pressable>
      )
    }
    if (msg.special?.kind === 'sticker') {
      const stickerUrl = msg.special.imageUrl
      const r = isSelf
        ? mirrorBubbleTheme.selfBubbleRadiusPx
        : mirrorBubbleTheme.otherBubbleRadiusPx
      return stickerUrl ? (
        <div
          className="inline-block overflow-hidden select-none"
          style={{
            borderRadius: `${r}px`,
            border: isSelf ? 'none' : '1px solid rgba(0,0,0,0.08)',
            background: isSelf ? 'transparent' : 'var(--wx-other-bubble-bg, #fff)',
          }}
        >
          <img
            src={stickerUrl}
            alt=""
            className="block h-auto w-[160px] max-w-[46vw] select-none object-cover"
            draggable={false}
          />
        </div>
      ) : (
        <div
          className="inline-flex h-[96px] w-[96px] items-center justify-center overflow-hidden select-none"
          style={{
            borderRadius: `${r}px`,
            border: isSelf ? 'none' : '1px solid rgba(0,0,0,0.08)',
            background: isSelf ? 'transparent' : 'var(--wx-other-bubble-bg, #fff)',
          }}
        >
          <span className="text-[28px]" aria-label="表情包">
            🙂
          </span>
        </div>
      )
    }
    if (msg.special?.kind === 'image' && msg.special.imageUrl) {
      return (
        <div className="overflow-hidden rounded-[12px] border border-black/5 bg-white">
          <img src={msg.special.imageUrl} alt="" className="max-h-56 w-44 object-cover" />
          {msg.content ? <div className="px-2 py-1 text-[12px] text-[#60636a]">{msg.content}</div> : null}
        </div>
      )
    }
    return null
  }

  const getChatPreviewText = (
    msg?: MirrorWeChatContact['messages'][number],
    opts?: { isGroup?: boolean },
  ) => {
    if (!msg) return '暂无聊天碎片'
    const special = msg.special || inferSpySpecialFromContent(msg.content)
    let body = ''
    if (special?.kind === 'red_packet') {
      body = special.opened
        ? `[微信红包] 已领取`
        : `[微信红包] ${special.remark || ''}`.trim()
    } else if (special?.kind === 'transfer') {
      const amt = Number(special.amountYuan)
      const amtText = Number.isFinite(amt) && amt > 0 ? `¥${amt.toFixed(2)}` : ''
      body = `[微信转账] ${amtText} ${special.note || ''}`.trim()
    } else if (special?.kind === 'voice_call') {
      body =
        special.status === 'duration'
          ? `[语音通话] ${fmtCallStatusDuration(mirrorVoiceCallDurationSec(special))}`
          : special.status === 'rejected'
            ? '[语音通话] 已拒绝'
            : '[语音通话] 未接听'
    } else if (special?.kind === 'location') body = `[位置] ${special.name || ''}`.trim()
    else if (msg.special?.kind === 'sticker') body = '[表情包]'
    else if (msg.special?.kind === 'image') body = '[图片]'
    else body = msg.content || '暂无聊天碎片'
    if (opts?.isGroup && msg.from !== 'character') {
      const who = (msg.senderNickname || '').trim()
      if (who) return `${who}：${body}`
    }
    return body
  }

  const currentChatMessages = useMemo(() => {
    if (!currentChat) return []
    const sorted = [...currentChat.messages].sort((a, b) => a.timestamp - b.timestamp)
    const peerLabel =
      (currentChat.remarkName || currentChat.nickname || '对方').trim() || '对方'
    return enrichMirrorMessagesWithClaimReceipts(sorted, {
      peerLabel,
      selfLabel: state.profile?.nickname?.trim() || playerWechatNickname?.trim() || '角色',
    })
  }, [currentChat, playerWechatNickname, state.profile?.nickname])

  const CHAT_NEAR_BOTTOM_PX = 56

  const rememberChatScroll = (contactId: string | null) => {
    const id = (contactId || '').trim()
    const el = chatScrollRef.current
    if (!id || !el) return
    const remain = el.scrollHeight - (el.scrollTop + el.clientHeight)
    if (remain <= CHAT_NEAR_BOTTOM_PX) {
      delete chatScrollMemoryRef.current[id]
    } else {
      chatScrollMemoryRef.current[id] = el.scrollTop
    }
  }

  const openMirrorChat = (contactId: string) => {
    setChatOpenId(contactId)
  }

  const closeMirrorChat = () => {
    rememberChatScroll(chatOpenId)
    setChatOpenId(null)
  }

  const onChatScrollBody = (e: ReactUIEvent<HTMLDivElement>) => {
    if (!chatOpenId) return
    const el = e.currentTarget
    const remain = el.scrollHeight - (el.scrollTop + el.clientHeight)
    if (remain <= CHAT_NEAR_BOTTOM_PX) {
      delete chatScrollMemoryRef.current[chatOpenId]
    } else {
      chatScrollMemoryRef.current[chatOpenId] = el.scrollTop
    }
  }

  // 进入会话：有上滑记忆则还原，否则滚到最底部
  useLayoutEffect(() => {
    if (!chatOpenId || !currentChat) return
    const el = chatScrollRef.current
    if (!el) return
    const saved = chatScrollMemoryRef.current[chatOpenId]
    const apply = () => {
      if (typeof saved === 'number' && Number.isFinite(saved) && saved >= 0) {
        el.scrollTop = saved
      } else {
        el.scrollTop = el.scrollHeight
      }
    }
    apply()
    // 等气泡布局完成后再贴一次，避免高度未算准
    requestAnimationFrame(() => {
      requestAnimationFrame(apply)
    })
  }, [chatOpenId, currentChat, currentChatMessages.length])

  if (!hydrated) {
    return (
      <motion.div
        className="fixed inset-0 z-[1410] flex flex-col items-center justify-center overflow-hidden bg-[#fbfbfc] text-[#8a8d94]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="text-[14px] tracking-[0.08em]">载入本地数据…</div>
      </motion.div>
    )
  }

  return (
    <motion.div
      className={`fixed inset-0 z-[1410] overflow-hidden ${
        chatOpenId && chatNightMode ? 'bg-[#111111] text-[#E5E5E5]' : 'bg-[#fbfbfc] text-[#141517]'
      }`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {!(chatOpenId && chatNightMode) ? (
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(178,23,23,0.05),transparent_28%),radial-gradient(circle_at_bottom,rgba(155,118,42,0.06),transparent_30%)]" />
      ) : null}

      <div className="relative flex h-full flex-col">
        <div
          className={`sticky top-0 z-20 border-b px-4 pb-3 backdrop-blur-xl ${
            chatOpenId && chatNightMode
              ? 'border-white/10 bg-[#111111]/92'
              : 'border-[#ececef] bg-white/80'
          }`}
          style={{ paddingTop: 'max(14px, env(safe-area-inset-top))' }}
        >
          <div className="flex items-center justify-between gap-3">
            <Pressable
              type="button"
              onClick={chatOpenId ? closeMirrorChat : onClose}
              className={`rounded-[14px] border px-3 py-2 text-[13px] ${
                chatOpenId && chatNightMode
                  ? 'border-white/12 bg-white/8 text-[#E5E5E5]'
                  : 'border-[#e6e7eb] bg-white text-[#4d5056]'
              }`}
            >
              返回
            </Pressable>
            <div
              className={`min-w-0 flex-1 truncate px-2 text-center text-[16px] font-medium tracking-[0.12em] ${
                chatOpenId && chatNightMode ? 'text-[#E5E5E5]' : 'text-[#111214]'
              }`}
            >
              {chatOpenId && currentChat
                ? chatDisplayName(currentChat)
                : chatOpenId
                  ? '对话'
                  : `镜像微信 · ${tabLabel(tab)}`}
            </div>
            {/* 与左侧返回对称占位，标题居中；生成改悬浮钮 */}
            <div className="w-[52px] shrink-0" aria-hidden />
          </div>
        </div>

        <div
          ref={chatScrollRef}
          className="relative flex-1 overflow-y-auto overflow-x-hidden pb-24"
          onScroll={onChatScrollBody}
        >
          {chatOpenId && currentChat ? (
            <WeChatChatSkinEngineProvider engine={wechatTheme.chatSkinEngine}>
              <WeChatAvatarChromeProvider chrome={wechatTheme.avatarChrome}>
                <div
                  data-wx-chat-skin-scope
                  {...(wechatClassicNight ? { 'data-wx-wechat-night': '1' } : {})}
                  className="relative min-h-full px-0 pb-5 pt-2"
                  style={mirrorChatScopeStyle}
                >
                  {chatNightMode ? (
                    <div
                      className="pointer-events-none absolute inset-0 z-0"
                      style={{
                        backgroundColor: twitterDmNight
                          ? TWITTER_X_COLORS.wallpaperDimNight
                          : WECHAT_CLASSIC.wallpaperDimNight,
                      }}
                      aria-hidden
                    />
                  ) : null}
                  {wechatTheme.chatSkinScopedCss?.trim() ? (
                    <style
                      dangerouslySetInnerHTML={{
                        __html: wrapWeChatChatSkinScopedCss(wechatTheme.chatSkinScopedCss),
                      }}
                    />
                  ) : null}
                  <div className="relative z-[1] overflow-x-visible">
                    {(() => {
                      let previousShownTimeMs: number | null = null
                      const nowMs = plotNowMs && plotNowMs > 0 ? plotNowMs : Date.now()
                      const isGroupChat = isMirrorGroupContact(currentChat)
                      /** 与主微信 ChatRoom.messageBlockSpacing 同规则 */
                      const wechatClassicGap = mirrorBubbleTheme.bubbleTailStyle === 'wechat'
                      const msgGapClass = (index: number, showStamp: boolean) => {
                        if (index <= 0) return ''
                        if (showStamp) return wechatClassicGap ? 'mt-6' : 'mt-4'
                        const prevMsg = currentChatMessages[index - 1]
                        const cur = currentChatMessages[index]
                        const same =
                          !!prevMsg &&
                          prevMsg.from === cur.from &&
                          (prevMsg.senderKey || '') === (cur.senderKey || '')
                        if (same) {
                          if (twitterDmActive) return 'mt-1'
                          if (wechatClassicGap) return 'mt-4'
                          return 'mt-2'
                        }
                        if (twitterDmActive) return 'mt-3'
                        if (wechatClassicGap) return 'mt-7'
                        return 'mt-4'
                      }
                      return currentChatMessages.map((msg, index) => {
                        const showTimestamp = shouldRenderWeChatTimestamp(
                          previousShownTimeMs,
                          msg.timestamp,
                        )
                        if (showTimestamp) previousShownTimeMs = msg.timestamp
                        const isSelf = msg.from === 'character'
                        const prev = index > 0 ? currentChatMessages[index - 1] : null
                        const sameSender =
                          !!prev &&
                          prev.from === msg.from &&
                          (prev.senderKey || '') === (msg.senderKey || '')
                        const rowGap = msgGapClass(index, showTimestamp)
                        const sideShowAvatar = isSelf
                          ? bubblePrefs.showAvatarSelf
                          : bubblePrefs.showAvatarOther
                        const showAvatarColumn =
                          sideShowAvatar &&
                          (!bubblePrefs.mergeConsecutiveAvatarGroup || !prev || !sameSender)
                        const senderMemberRaw =
                          isGroupChat && !isSelf
                            ? currentChat.members?.find((m) => m.key === msg.senderKey) ||
                              currentChat.members?.find(
                                (m) =>
                                  m.nickname === msg.senderNickname ||
                                  m.remarkName === msg.senderNickname,
                              )
                            : undefined
                        /** 群内同名陌生人挂回通讯录，共用头像/备注 */
                        const linkedDm =
                          isGroupChat && !isSelf
                            ? (senderMemberRaw?.contactId
                                ? dmContactById.get(senderMemberRaw.contactId)
                                : undefined) ||
                              (msg.senderKey ? dmContactById.get(msg.senderKey) : undefined) ||
                              findMirrorDmContactByName(
                                dmContacts,
                                msg.senderNickname ||
                                  senderMemberRaw?.nickname ||
                                  msg.senderKey ||
                                  '',
                              )
                            : undefined
                        const senderIsContact = !!(
                          linkedDm ||
                          senderMemberRaw?.isContact ||
                          msg.isContactSender
                        )
                        const leftAvatar =
                          (isGroupChat
                            ? linkedDm?.avatarUrl ||
                              (senderMemberRaw?.contactId
                                ? dmContactById.get(senderMemberRaw.contactId)?.avatarUrl
                                : undefined) ||
                              msg.senderAvatarUrl ||
                              senderMemberRaw?.avatarUrl
                            : currentChat.avatarUrl) || DEFAULT_PUBLIC_AVATAR_URL
                        const rightAvatar = roleAvatarUrl
                        const senderLabelRaw =
                          isGroupChat && !isSelf
                            ? (
                                (linkedDm
                                  ? linkedDm.remarkName || linkedDm.nickname
                                  : undefined) ||
                                msg.senderNickname ||
                                senderMemberRaw?.remarkName ||
                                senderMemberRaw?.nickname ||
                                ''
                              ).trim()
                            : ''
                        const senderRel =
                          isGroupChat && !isSelf && !senderIsContact
                            ? (senderMemberRaw?.relationshipNote || '').trim()
                            : ''
                        /** 与主微信一致：仅在本行显示头像时挂昵称（连发同人只标首条） */
                        const senderLabel =
                          !isSelf && showAvatarColumn ? senderLabelRaw : ''
                        const special = msg.special || inferSpySpecialFromContent(msg.content)
                        const tr = (msg.translation || '').trim()
                        const trKey = `${chatOpenId}:${index}`
                        const trOpen = !!openMirrorTranslations[trKey]

                        const stampText = formatWeChatChatTimestamp(msg.timestamp, nowMs)
                        const stampParts = stampText.split(' ')
                        const stampLeft = stampParts.slice(0, -1).join(' ')
                        const stampTime = stampParts.at(-1) ?? stampText
                        const stamp =
                          showChatTimestamps && showTimestamp ? (
                            <div className="my-2 flex justify-center">
                              <span
                                data-wx-timestamp
                                className={
                                  twitterDmActive
                                    ? 'px-2 py-0.5 text-[12px]'
                                    : 'px-3 py-1 text-[12px]'
                                }
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  color: twitterDmActive
                                    ? 'var(--wx-timestamp-text, #536471)'
                                    : wechatClassicNight
                                      ? WECHAT_CLASSIC.timestampTextNight
                                      : 'var(--wx-timestamp-text, #999999)',
                                  lineHeight: 1.1,
                                  borderRadius: twitterDmActive
                                    ? 0
                                    : 'var(--wx-chat-timestamp-radius, 9999px)',
                                  fontFamily: 'var(--wx-chat-timestamp-font, inherit)',
                                  background: twitterDmActive
                                    ? 'transparent'
                                    : wechatClassicNight
                                      ? WECHAT_CLASSIC.timestampBgNight
                                      : 'var(--wx-chat-timestamp-bg, #f2f2f2)',
                                }}
                              >
                                {twitterDmActive ? (
                                  <WeChatChatMixedText text={stampText} />
                                ) : stampLeft ? (
                                  <>
                                    <WeChatChatMixedText text={stampLeft} />
                                    &nbsp;
                                    <WeChatChatMixedText text={stampTime} />
                                  </>
                                ) : (
                                  <WeChatChatMixedText text={stampTime} />
                                )}
                              </span>
                            </div>
                          ) : null

                        // 系统条：领取红包等（居中灰字，与主微信一致）
                        if (!special && /^【系统】/.test(String(msg.content || '').trim())) {
                          return (
                            <div key={`${msg.timestamp}-${index}`} className={rowGap}>
                              {stamp}
                              <div className="my-1.5 flex justify-center px-6">
                                <span
                                  className="max-w-[90%] text-center text-[12px] leading-snug"
                                  style={{
                                    color: wechatClassicNight
                                      ? WECHAT_CLASSIC.timestampTextNight
                                      : 'var(--wx-timestamp-text, #999999)',
                                  }}
                                >
                                  {String(msg.content || '')
                                    .replace(/^【系统】/, '')
                                    .trim()}
                                </span>
                              </div>
                            </div>
                          )
                        }

                        if (special?.kind === 'red_packet') {
                          const peerLabel =
                            (isGroupChat
                              ? senderLabelRaw || senderMemberRaw?.nickname || '对方'
                              : currentChat.remarkName || currentChat.nickname || '对方'
                            ).trim() || '对方'
                          // 窥探只读：不用本地「已拆」UI store，避免误显示为可代领后的已领态
                          const rpId = `mirror-rp-ro:${chatOpenId || 'chat'}:${msg.timestamp}:${index}`
                          return (
                            <div key={`${msg.timestamp}-${index}`} className={rowGap}>
                              {stamp}
                              <RedPacketChatRow
                                id={rpId}
                                isSelf={isSelf}
                                data={{
                                  amountYuan: Number(special.amountYuan || 0) || 8.88,
                                  opened: !!special.opened,
                                  remark: special.remark || '恭喜发财，大吉大利',
                                }}
                                bubble={mirrorBubbleTheme}
                                showAvatar={sideShowAvatar}
                                showAvatarColumn={showAvatarColumn}
                                chatSelfAvatarUrl={rightAvatar}
                                chatOtherAvatarUrl={leftAvatar}
                                chatOtherSenderNickname={
                                  senderLabel
                                    ? senderRel
                                      ? `${senderLabel} · ${senderRel}`
                                      : senderLabel
                                    : undefined
                                }
                                onOpen={() =>
                                  openMirrorRedPacket(msg, index, isSelf, peerLabel, leftAvatar)
                                }
                              />
                            </div>
                          )
                        }

                        if (special?.kind === 'location') {
                          return (
                            <div key={`${msg.timestamp}-${index}`} className={rowGap}>
                              {stamp}
                              <LocationChatRow
                                id={`mirror-loc:${chatOpenId}:${index}`}
                                isSelf={isSelf}
                                data={{
                                  locationId: `mirror-loc:${chatOpenId}:${msg.timestamp}`,
                                  name: special.name || '位置',
                                  address: special.address,
                                  distance: special.distance || '附近',
                                }}
                                bubble={mirrorBubbleTheme}
                                showAvatar={sideShowAvatar}
                                showAvatarColumn={showAvatarColumn}
                                chatSelfAvatarUrl={rightAvatar}
                                chatOtherAvatarUrl={leftAvatar}
                                chatOtherSenderNickname={
                                  senderLabel
                                    ? senderRel
                                      ? `${senderLabel} · ${senderRel}`
                                      : senderLabel
                                    : undefined
                                }
                                variant="chat"
                              />
                            </div>
                          )
                        }

                        if (
                          special?.kind === 'voice_call' ||
                          special?.kind === 'transfer' ||
                          msg.special?.kind === 'sticker' ||
                          msg.special?.kind === 'image'
                        ) {
                          const card = renderSpecialCard(msg, isSelf, index, leftAvatar)
                          if (special?.kind === 'voice_call') {
                            return (
                              <div key={`${msg.timestamp}-${index}`} className={rowGap}>
                                {stamp}
                                <WeChatMessageBubbleRow
                                  messageText={formatCallStatusLabel(
                                    special.status,
                                    isSelf,
                                    mirrorVoiceCallDurationSec(special),
                                  )}
                                  messagePrefixIcon={<Phone size={16} className="shrink-0 opacity-80" />}
                                  isSelf={isSelf}
                                  bubble={mirrorBubbleTheme}
                                  showAvatar={sideShowAvatar}
                                  showAvatarColumn={showAvatarColumn}
                                  showBubbleTail={false}
                                  twitterStyle={twitterDmActive}
                                  variant="chat"
                                  avatarSizePx={
                                    mirrorBubbleTheme.bubbleTailStyle === 'wechat'
                                      ? WECHAT_CLASSIC_AVATAR_SIZE_PX
                                      : undefined
                                  }
                                  chatSelfAvatarUrl={rightAvatar}
                                  chatOtherAvatarUrl={leftAvatar}
                                  chatOtherSenderNickname={
                                    senderLabel
                                      ? senderRel
                                        ? `${senderLabel} · ${senderRel}`
                                        : senderLabel
                                      : undefined
                                  }
                                  onBubbleTap={
                                    special.status === 'duration'
                                      ? () => openVoiceCallDetail(msg)
                                      : undefined
                                  }
                                />
                              </div>
                            )
                          }
                          return (
                            <div key={`${msg.timestamp}-${index}`} className={rowGap}>
                              {stamp}
                              <div
                                className={`flex w-full ${isSelf ? 'justify-end' : 'justify-start'} px-4`}
                              >
                                <div
                                  className={`flex max-w-[75%] items-start gap-3 ${
                                    isSelf ? 'flex-row-reverse' : 'flex-row'
                                  }`}
                                >
                                  {sideShowAvatar ? (
                                    showAvatarColumn ? (
                                      <img
                                        src={isSelf ? rightAvatar : leftAvatar}
                                        alt=""
                                        className="h-10 w-10 shrink-0 object-cover"
                                        style={{
                                          borderRadius: `var(--wx-avatar-radius, 4px)`,
                                        }}
                                      />
                                    ) : (
                                      <div className="h-10 w-10 shrink-0" aria-hidden />
                                    )
                                  ) : null}
                                  <div
                                    className={`flex min-w-0 flex-col ${
                                      isSelf ? 'items-end' : 'items-start'
                                    }`}
                                  >
                                    {senderLabel ? (
                                      <div className="mb-0.5 max-w-full truncate px-0.5 text-[11px] text-[color:var(--wx-timestamp-text,#9a9da3)]">
                                        {senderLabel}
                                        {senderRel ? (
                                          <span className="opacity-70"> · {senderRel}</span>
                                        ) : null}
                                      </div>
                                    ) : null}
                                    {card}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        }

                        return (
                          <div key={`${msg.timestamp}-${index}`} className={rowGap}>
                            {stamp}
                            <WeChatMessageBubbleRow
                              messageText={msg.content || ''}
                              isSelf={isSelf}
                              bubble={mirrorBubbleTheme}
                              showAvatar={sideShowAvatar}
                              showAvatarColumn={showAvatarColumn}
                              showBubbleTail={!!mirrorBubbleTheme.showBubbleTail}
                              twitterStyle={twitterDmActive}
                              variant="chat"
                              avatarSizePx={
                                mirrorBubbleTheme.bubbleTailStyle === 'wechat'
                                  ? WECHAT_CLASSIC_AVATAR_SIZE_PX
                                  : undefined
                              }
                              chatSelfAvatarUrl={rightAvatar}
                              chatOtherAvatarUrl={leftAvatar}
                              chatOtherSenderNickname={
                                senderLabel
                                  ? senderRel
                                    ? `${senderLabel} · ${senderRel}`
                                    : senderLabel
                                  : undefined
                              }
                              translationText={tr || undefined}
                              translationExpanded={trOpen}
                              onTranslationToggle={
                                tr
                                  ? () =>
                                      setOpenMirrorTranslations((prev) => ({
                                        ...prev,
                                        [trKey]: !prev[trKey],
                                      }))
                                  : undefined
                              }
                            />
                          </div>
                        )
                      })
                    })()}
                  </div>
                  <div className="mx-4 mt-4 rounded-[20px] border border-black/5 bg-white/70 px-4 py-3 text-[13px] italic text-black/45">
                    *Observer mode active. (窥探模式)*
                  </div>
                </div>
              </WeChatAvatarChromeProvider>
            </WeChatChatSkinEngineProvider>
          ) : tab === 'chats' ? (
            <div className="px-4 pt-4">
              <div className="space-y-2.5">
                {chats.length ? (
                  chats.map((item) => (
                    <Pressable
                      key={item.id}
                      type="button"
                      onClick={() => openMirrorChat(item.id)}
                      className={`flex w-full min-w-0 items-center gap-3 overflow-hidden rounded-[22px] border px-3 py-3 shadow-[0_10px_24px_rgba(18,18,18,0.04)] ${
                        item.isPinned
                          ? 'border-[#e8dfc8] bg-[#fffdf6]/95'
                          : 'border-[#ececef] bg-white/88'
                      }`}
                    >
                      <MirrorChatListAvatar
                        contact={item}
                        selfAvatarUrl={roleAvatarUrl}
                        resolveContactAvatar={(id) => dmContactById.get(id)?.avatarUrl}
                        size={48}
                        radius={12}
                      />
                      <div className="min-w-0 flex-1 overflow-hidden">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-1.5">
                            {item.isPinned ? (
                              <span className="shrink-0 rounded-full bg-[#f0e6c8] px-1.5 py-0.5 text-[10px] text-[#8a6a23]">
                                置顶
                              </span>
                            ) : null}
                            {isMirrorGroupContact(item) ? (
                              <span className="shrink-0 rounded-full bg-[#e8eef8] px-1.5 py-0.5 text-[10px] text-[#3d5a80]">
                                群
                              </span>
                            ) : null}
                            <div className="truncate text-[15px] font-medium text-[#15161a]">{chatDisplayName(item)}</div>
                          </div>
                          <div className="text-[11px] text-[#9a9da3]">
                            {item.messages.at(-1)?.timestamp
                              ? formatWeChatMessagesTabTimestamp(
                                  item.messages.at(-1)!.timestamp,
                                  plotNowMs && plotNowMs > 0 ? plotNowMs : Date.now(),
                                )
                              : ''}
                          </div>
                        </div>
                        <div className="mt-1 text-left truncate text-[13px] text-[#73767d]">
                          {getChatPreviewText(item.messages.at(-1), { isGroup: isMirrorGroupContact(item) })}
                        </div>
                      </div>
                    </Pressable>
                  ))
                ) : (
                  <div className="rounded-[24px] border border-[#ececef] bg-white px-5 py-8 text-center text-[14px] leading-7 text-[#7a7d84]">
                    暂无聊天碎片。<br />
                    {hasContacts ? '点右下角悬浮钮，勾选联系人生成信息。' : '请先用悬浮钮生成通讯录。'}
                  </div>
                )}
              </div>
            </div>
          ) : tab === 'contacts' ? (
            <div className="px-4 pt-4">
              <div className="mb-3 space-y-2">
                <div className="flex items-center justify-between rounded-[20px] border border-[#ececef] bg-white px-4 py-3">
                  <div className="flex items-center gap-3"><UserRound size={17} className="text-[#a08d62]" /><span className="text-[14px] text-[#212327]">新的朋友</span></div>
                </div>
                <div className="flex items-center justify-between rounded-[20px] border border-[#ececef] bg-white px-4 py-3">
                  <div className="flex items-center gap-3"><Lock size={17} className="text-[#8c2431]" /><span className="text-[14px] text-[#212327]">黑名单</span></div>
                  <span className="text-[12px] text-[#8a8d94]">{dmContacts.filter((item) => item.blocked).length}</span>
                </div>
              </div>
              {starredContacts.length ? (
                <div className="mb-4">
                  <div className="mb-2 px-1 text-[11px] tracking-[0.18em] text-[#9a9da3]">星标朋友</div>
                  <div className="space-y-2">
                    {starredContacts.map((item) => (
                      <div key={`star-${item.id}`} className="flex items-center gap-3 rounded-[20px] border border-[#ececef] bg-white/90 px-3 py-3">
                        <img src={item.avatarUrl} alt="" className="h-11 w-11 rounded-xl object-cover" />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[14px] text-[#1b1c1f]">{item.remarkName}</div>
                          <div className="truncate text-[12px] text-[#8c8f95]">{item.nickname}</div>
                        </div>
                        <span className="rounded-full bg-[#f5ecd2] px-2 py-1 text-[11px] text-[#8a6a23]">Starred</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
              <div className="space-y-5">
                {contactVisibleLetters.map((letter) => {
                  const list = contactsGrouped.get(letter) || []
                  return (
                    <div
                      key={letter}
                      ref={(el) => {
                        groupRefs.current[letter] = el
                      }}
                    >
                      <div className="mb-2 px-1 text-[11px] tracking-[0.18em] text-[#9a9da3]">{letter}</div>
                      <div className="space-y-2">
                        {list.map((item) => (
                          <div key={item.id} className="flex items-center gap-3 rounded-[20px] border border-[#ececef] bg-white/90 px-3 py-3">
                            <img src={item.avatarUrl} alt="" className="h-11 w-11 rounded-xl object-cover" />
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-[14px] text-[#1b1c1f]">{item.remarkName}</div>
                              <div className="truncate text-[12px] text-[#8c8f95]">{item.nickname}</div>
                            </div>
                            {item.blocked ? <span className="rounded-full bg-[#6b0f1a]/8 px-2 py-1 text-[11px] text-[#8f1b2a]">Blocked</span> : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
              {contactVisibleLetters.length ? (
                <nav
                  ref={indexNavRef}
                  className="fixed right-2 top-1/2 z-20 -translate-y-1/2 select-none touch-none"
                  aria-label="通讯录字母索引"
                  onPointerDown={onIndexPointerDown}
                  onPointerMove={onIndexPointerMove}
                  onPointerUp={onIndexPointerUp}
                  onPointerCancel={onIndexPointerUp}
                >
                  <ul className="flex flex-col items-center">
                    {contactVisibleLetters.map((letter) => {
                      const isActive = activeLetter === letter
                      return (
                        <li key={letter}>
                          <button
                            type="button"
                            onClick={() => jumpToLetter(letter)}
                            data-letter={letter}
                            className="block px-1 py-0.5 text-[12px] leading-4 transition-colors duration-150"
                            style={{ color: isActive ? '#262626' : '#8e8e8e' }}
                          >
                            {letter}
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </nav>
              ) : null}
            </div>
          ) : tab === 'moments' ? (
            <div className="relative bg-white text-[#111827] pb-6">
              <div className="relative mx-auto max-w-[560px]">
                <MomentsCover
                  coverUrl={mirrorMomentsCoverUrl}
                  nickname={mirrorMomentsAuthorName}
                  avatarUrl={roleAvatarUrl}
                  signature={state.profile?.signature}
                />
                <MomentsContentBackdrop>
                  <MomentsFeed
                    moments={mirrorMomentsFeedItems}
                    currentUserName={mirrorMomentsAuthorName}
                    currentUserAvatarUrl={roleAvatarUrl}
                    momentContacts={mirrorMomentContacts}
                    playerIdentityId={playerIdentityId}
                    emptyMessage="暂无朋友圈镜像数据。"
                  />
                </MomentsContentBackdrop>
              </div>
            </div>
          ) : (
            <div className="px-4 pt-4">
              <div className="rounded-[28px] border border-[#ececef] bg-white/94 p-4 shadow-[0_12px_30px_rgba(0,0,0,0.04)]">
                <div className="flex items-center gap-3">
                  {state.profile?.avatarUrl ? <img src={state.profile.avatarUrl} alt="" className="h-14 w-14 rounded-2xl object-cover" /> : <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#eff1f4]"><CircleUserRound size={24} /></div>}
                  <div>
                    <div className="text-[18px] font-medium text-[#15161a]">{state.profile?.nickname || '未同步身份信息'}</div>
                    <div className="mt-1 text-[12px] text-[#8e9198]">{state.profile?.signature || 'Signature not available'}</div>
                  </div>
                </div>
              </div>
              <div className="mt-4 space-y-3">
                <Pressable type="button" onClick={() => onToast('暂无访问权限')} className="flex items-center justify-between rounded-[22px] border border-[#ececef] bg-white px-4 py-4">
                  <div className="flex items-center gap-3"><Lock size={18} className="text-[#8f1d2a]" /><span className="text-[14px] text-[#1d1e22]">收藏</span></div>
                  <span className="text-[12px] text-[#9a9da3]">暂无访问权限</span>
                </Pressable>
                <Pressable type="button" onClick={() => setWalletOpen((v) => !v)} className="flex items-center justify-between rounded-[22px] border border-[#ececef] bg-white px-4 py-4">
                  <div className="flex items-center gap-3"><Wallet size={18} className="text-[#8b6a2a]" /><span className="text-[14px] text-[#1d1e22]">卡包 / 钱包</span></div>
                  <span className="text-[12px] text-[#9a9da3]">{walletOpen ? '收起' : '展开'}</span>
                </Pressable>
                {walletOpen ? (
                  <div className="rounded-[24px] border border-[#ececef] bg-white/94 p-4">
                    <div className="text-[13px] tracking-[0.16em] text-[#8e9198]">WALLET MIRROR</div>
                    <div className="mt-2 text-[28px] font-medium text-[#121316]">
                      ¥
                      {state.bills.reduce((sum, item) => sum + item.amount, 0).toFixed(2)}
                    </div>
                    <div className="mt-4 text-[12px] text-[#9a9da3]">亲情卡记录</div>
                    <div className="mt-2 space-y-2">
                      {state.affectionCards.length ? state.affectionCards.map((item) => (
                        <div key={item.id} className="rounded-[18px] bg-[#f6f7f8] px-4 py-3 text-[13px] text-[#44474c]">
                          {item.holder} · 额度 ¥{item.limit} · 已用 ¥{item.spent}
                        </div>
                      )) : <div className="rounded-[18px] bg-[#f6f7f8] px-4 py-3 text-[13px] text-[#7f8288]">暂无亲情卡记录</div>}
                    </div>
                    <div className="mt-4 text-[12px] text-[#9a9da3]">账单流水</div>
                    <div className="mt-2 space-y-2">
                      {state.bills.length ? state.bills.map((item) => (
                        <div key={item.id} className="flex items-center justify-between rounded-[18px] bg-[#f6f7f8] px-4 py-3">
                          <div>
                            <div className="text-[13px] text-[#1e2024]">{item.target}</div>
                            <div className="mt-1 text-[11px] text-[#8a8d93]">{item.date} · {item.remark}</div>
                          </div>
                          <div className={`text-[14px] ${item.amount >= 0 ? 'text-[#0f766e]' : 'text-[#7f1d1d]'}`}>{formatMoney(item.amount)}</div>
                        </div>
                      )) : <div className="rounded-[18px] bg-[#f6f7f8] px-4 py-3 text-[13px] text-[#7f8288]">暂无账单流水</div>}
                    </div>
                  </div>
                ) : null}
              </div>
              <div className="mt-4 rounded-[20px] border border-[#e8e9ec] bg-white/88 px-4 py-3 text-[13px] italic text-[#8a8d93]">
                *Observer mode active. (窥探模式)*
              </div>
            </div>
          )}
        </div>

        {!chatOpenId ? (
          <>
            <Pressable
              type="button"
              onClick={() => {
                if (fabCoachOpen) dismissFabCoach()
                setSyncOpen(true)
              }}
              className={`absolute flex h-14 w-14 items-center justify-center rounded-full bg-[#16171a] text-white shadow-[0_12px_28px_rgba(0,0,0,0.22)] ${
                fabCoachOpen
                  ? 'z-[40] animate-pulse ring-4 ring-[#f5d76e] ring-offset-2 ring-offset-[#fbfbfc]'
                  : 'z-30'
              }`}
              style={{
                right: 18,
                bottom: 'calc(72px + env(safe-area-inset-bottom))',
              }}
              aria-label="生成、更新或删除"
              title="生成 / 更新 / 删除"
              data-mirror-fab="sync"
            >
              <Sparkles size={22} />
            </Pressable>
            {fabCoachOpen ? (
              <div className="absolute inset-0 z-[35]">
                <button
                  type="button"
                  className="absolute inset-0 bg-black/50"
                  aria-label="关闭指引"
                  onClick={dismissFabCoach}
                />
                <div
                  className="pointer-events-auto absolute right-3 max-w-[250px] rounded-[18px] border border-[#ece1c6] bg-[#fffdfa] px-3.5 py-3 shadow-[0_12px_28px_rgba(0,0,0,0.18)]"
                  style={{ bottom: 'calc(148px + env(safe-area-inset-bottom))' }}
                >
                  <div className="text-[13px] font-medium text-[#1b1c1f]">点右下角悬浮钮</div>
                  <div className="mt-1 text-[12px] leading-[1.45] text-[#6b6e74]">
                    打开生成 / 更新 / 删除面板。没有通讯录时请先生成通讯录，再生成聊天等信息。
                  </div>
                  <div className="mt-2.5 flex gap-2">
                    <Pressable
                      type="button"
                      onClick={dismissFabCoach}
                      className="h-8 flex-1 rounded-full border border-[#e4e6ea] bg-white text-[12px] text-[#5b5e64]"
                    >
                      知道了
                    </Pressable>
                    <Pressable
                      type="button"
                      onClick={() => {
                        dismissFabCoach()
                        setSyncOpen(true)
                      }}
                      className="h-8 flex-1 rounded-full bg-[#16171a] text-[12px] text-white"
                    >
                      去生成
                    </Pressable>
                  </div>
                </div>
              </div>
            ) : null}
            <div
              className="absolute bottom-0 left-0 right-0 z-20 border-t border-white/70 bg-white/80 px-4 pb-3 pt-2 backdrop-blur-xl"
              style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
            >
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 'chats', label: '信息', Icon: MessageSquareText },
                  { id: 'contacts', label: '通讯录', Icon: UserRound },
                  { id: 'moments', label: '朋友圈', Icon: ImageIcon },
                  { id: 'profile', label: '我', Icon: CircleUserRound },
                ].map(({ id, label, Icon }) => {
                  const active = tab === id
                  return (
                    <Pressable key={id} type="button" onClick={() => setTab(id as MirrorWeChatTab)} className="flex flex-col items-center gap-1 rounded-[18px] py-2">
                      <Icon size={18} className={active ? 'text-[#131417]' : 'text-[#9699a0]'} />
                      <span className={`text-[11px] ${active ? 'text-[#131417]' : 'text-[#9699a0]'}`}>{label}</span>
                    </Pressable>
                  )
                })}
              </div>
            </div>
          </>
        ) : null}
      </div>

      <DataSyncModal
        open={syncOpen}
        busy={syncBusy}
        busyLabel={syncBusyLabel}
        hasContacts={hasContacts}
        contacts={state.contacts}
        selfAvatarUrl={roleAvatarUrl}
        playerContactId={playerContactId}
        plotNowLabel={plotNowLabel || undefined}
        minMessagesPerContact={minMessagesPerContact}
        onMinMessagesPerContactChange={setMinMessagesPerContact}
        chatTimeSpanUnit={chatTimeSpanUnit}
        chatTimeSpanValue={chatTimeSpanValue}
        onChatTimeSpanUnitChange={(unit) => {
          setChatTimeSpanUnit(unit)
          if (unit === 'day') setChatTimeSpanValue(7)
          else if (unit === 'week') setChatTimeSpanValue(2)
          else if (unit === 'month') setChatTimeSpanValue(3)
          else setChatTimeSpanValue(1)
        }}
        onChatTimeSpanValueChange={setChatTimeSpanValue}
        includeHideFromUser={includeHideFromUser}
        onIncludeHideFromUserChange={setIncludeHideFromUser}
        includeOnlyTaVisible={includeOnlyTaVisible}
        onIncludeOnlyTaVisibleChange={setIncludeOnlyTaVisible}
        ingestChatToMemory={ingestChatToMemory}
        onIngestChatToMemoryChange={setIngestChatToMemory}
        generateLanguage={generateLanguage}
        onGenerateLanguageChange={setGenerateLanguage}
        syncTranslation={syncTranslation}
        onSyncTranslationChange={(on) => {
          setSyncTranslation(on)
          if (on && translationLanguage === generateLanguage) {
            setTranslationLanguage(generateLanguage === 'zh-CN' ? 'en' : 'zh-CN')
          }
        }}
        translationLanguage={translationLanguage}
        onTranslationLanguageChange={setTranslationLanguage}
        selectedRelations={selectedRelations}
        onSelectedRelationsChange={setSelectedRelations}
        contactCount={contactCount}
        onContactCountChange={setContactCount}
        contactCustomBias={contactCustomBias}
        onContactCustomBiasChange={setContactCustomBias}
        selectedChatBiases={selectedChatBiases}
        onSelectedChatBiasesChange={setSelectedChatBiases}
        chatCustomBias={chatCustomBias}
        onChatCustomBiasChange={setChatCustomBias}
        generateRelatedGroups={generateRelatedGroups}
        onGenerateRelatedGroupsChange={setGenerateRelatedGroups}
        relatedGroupsCount={relatedGroupsCount}
        onRelatedGroupsCountChange={setRelatedGroupsCount}
        groupChatCustomBias={groupChatCustomBias}
        onGroupChatCustomBiasChange={setGroupChatCustomBias}
        includeSpecialMessages={includeSpecialMessages}
        onIncludeSpecialMessagesChange={setIncludeSpecialMessages}
        walletBiasText={walletBias}
        onWalletBiasTextChange={setWalletBias}
        onClose={() => {
          if (syncBusy) return
          setSyncOpen(false)
        }}
        onStopGeneration={stopSyncGeneration}
        onConfirmGenerateOrUpdate={(p) => void runSyncScopes(p)}
        onConfirmDelete={(p) => void runDeleteScopes(p)}
      />

      <MirrorVoiceCallDetailModal
        open={!!voiceCallDetail}
        durationSec={voiceCallDetail?.durationSec || 0}
        peerName={voiceCallDetail?.peerName || '对方'}
        peerAvatarUrl={voiceCallDetail?.peerAvatarUrl}
        characterName={voiceCallDetail?.characterName}
        characterAvatarUrl={voiceCallDetail?.characterAvatarUrl}
        lines={voiceCallDetail?.lines || []}
        onClose={() => setVoiceCallDetail(null)}
      />

      {redPacketDetail ? (
        <div
          className="fixed inset-0 z-[210] flex items-end justify-center bg-black/35 px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-10 sm:items-center"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setRedPacketDetail(null)
          }}
        >
          <div
            className="w-full max-w-[360px] overflow-hidden rounded-[20px] border border-[#e8e2d8] bg-[#faf9f6] shadow-[0_20px_50px_rgba(0,0,0,0.18)]"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="border-b border-[#efe9e0] px-4 py-3 text-center text-[13px] font-medium tracking-[0.16em] text-[#8a8580]">
              红包详情
            </div>
            <div className="px-5 pb-5 pt-4">
              <div className="flex flex-col items-center text-center">
                {redPacketDetail.senderAvatarUrl ? (
                  <img
                    src={redPacketDetail.senderAvatarUrl}
                    alt=""
                    className="h-14 w-14 rounded-2xl object-cover"
                  />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#eee] text-[#999]">
                    ?
                  </div>
                )}
                <p className="mt-2.5 text-[15px] font-medium text-[#1a1a1a]">
                  {redPacketDetail.senderName}
                </p>
                <p className="mt-1 text-[12px] text-[#8c877c]">
                  {redPacketDetail.opened
                    ? '已领取'
                    : redPacketDetail.fromSelf
                      ? `${redPacketDetail.peerLabel}还未领取`
                      : `${redPacketDetail.selfLabel}还未领取`}
                </p>
                {!redPacketDetail.opened ? (
                  <p className="mt-1 text-[11px] text-[#b0aaa0]">窥探模式不可代领</p>
                ) : null}
              </div>
              <p className="mt-5 text-center text-[11px] tracking-[0.2em] text-[#9a958c]">AMOUNT</p>
              <p className="mt-1 text-center text-[36px] tabular-nums leading-none text-[#1c1c1c]">
                ¥{redPacketDetail.amountYuan.toFixed(2)}
              </p>
              <div className="mt-5 rounded-[14px] border border-[#e8e2d8] bg-white px-3.5 py-3">
                <div className="text-[11px] tracking-[0.12em] text-[#9a958c]">备注</div>
                <div className="mt-1 text-[14px] text-[#3d3d3d]">
                  {redPacketDetail.remark || '—'}
                </div>
              </div>
              {redPacketDetail.opened ? (
                <div className="mt-3 rounded-[14px] border border-[#e8e2d8] bg-white px-3.5 py-3 text-[13px] text-[#4a4a4a]">
                  <div className="flex justify-between gap-2">
                    <span>{redPacketDetail.claimerName || '领取人'}</span>
                    <span className="tabular-nums font-medium text-[#9a7b4a]">
                      ¥{redPacketDetail.amountYuan.toFixed(2)}
                    </span>
                  </div>
                  <p className="mt-1 text-[12px] text-[#8c877c]">已领取</p>
                </div>
              ) : null}
              <Pressable
                type="button"
                onClick={() => setRedPacketDetail(null)}
                className="mt-4 w-full rounded-[12px] bg-[#16171a] py-2.5 text-center text-[14px] text-white"
              >
                关闭
              </Pressable>
            </div>
          </div>
        </div>
      ) : null}

      {transferDetail ? (
        <div
          className="fixed inset-0 z-[210] flex items-end justify-center bg-black/35 px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-10 sm:items-center"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setTransferDetail(null)
          }}
        >
          <div
            className="w-full max-w-[360px] overflow-hidden rounded-[20px] border border-[#e8e2d8] bg-[#faf9f6] shadow-[0_20px_50px_rgba(0,0,0,0.18)]"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="border-b border-[#efe9e0] px-4 py-3 text-center text-[13px] font-medium tracking-[0.16em] text-[#8a8580]">
              转账详情
            </div>
            <div className="px-5 pb-5 pt-4">
              <div className="flex flex-col items-center text-center">
                {transferDetail.senderAvatarUrl ? (
                  <img
                    src={transferDetail.senderAvatarUrl}
                    alt=""
                    className="h-14 w-14 rounded-2xl object-cover"
                  />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#eee] text-[#999]">
                    ?
                  </div>
                )}
                <p className="mt-2.5 text-[15px] font-medium text-[#1a1a1a]">
                  {transferDetail.senderName}
                </p>
                <p className="mt-1 text-[12px] text-[#8c877c]">
                  {transferDetail.status === 'accepted'
                    ? '已收款'
                    : transferDetail.status === 'returned'
                      ? '已退还'
                      : transferDetail.fromSelf
                        ? `${transferDetail.peerLabel}还未收款`
                        : `${transferDetail.selfLabel}还未收款`}
                </p>
                {transferDetail.status === 'pending' ? (
                  <p className="mt-1 text-[11px] text-[#b0aaa0]">窥探模式不可代收</p>
                ) : null}
              </div>
              <p className="mt-5 text-center text-[11px] tracking-[0.2em] text-[#9a958c]">AMOUNT</p>
              <p className="mt-1 text-center text-[36px] tabular-nums leading-none text-[#1c1c1c]">
                ¥{transferDetail.amountYuan.toFixed(2)}
              </p>
              <div className="mt-5 rounded-[14px] border border-[#e8e2d8] bg-white px-3.5 py-3">
                <div className="text-[11px] tracking-[0.12em] text-[#9a958c]">备注</div>
                <div className="mt-1 text-[14px] text-[#3d3d3d]">
                  {transferDetail.note || '—'}
                </div>
              </div>
              <Pressable
                type="button"
                onClick={() => setTransferDetail(null)}
                className="mt-4 w-full rounded-[12px] bg-[#16171a] py-2.5 text-center text-[14px] text-white"
              >
                关闭
              </Pressable>
            </div>
          </div>
        </div>
      ) : null}
    </motion.div>
  )
}

export function MirrorWeChatApp(props: {
  characterId: string
  playerIdentityId: string
  playerDisplayName: string
  playerWechatAvatarUrl?: string
  playerWechatNickname?: string
  useLumiProjectAssistantPrompt: boolean
  onClose: () => void
  onToast: (msg: string) => void
}) {
  return (
    <MirrorWeChatStoreProvider characterId={props.characterId} playerIdentityId={props.playerIdentityId}>
      <Main {...props} />
    </MirrorWeChatStoreProvider>
  )
}
