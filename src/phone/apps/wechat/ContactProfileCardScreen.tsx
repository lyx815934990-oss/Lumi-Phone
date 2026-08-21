import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, MessageCircle, MoreHorizontal, Phone } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react'

import { Pressable } from '../../components/Pressable'
import { useCustomization } from '../../CustomizationContext'
import {
  ContactProfileGenderGlyph,
  type ContactProfileGenderUi,
} from './ContactProfileGenderIcons'
import { ContactMomentsSnapshot } from '../../../components/moments/ContactMomentsSnapshot'
import type { MomentContactRef } from '../../../components/moments/newMomentTypes'

const EMPTY_MOMENT_CONTACTS: MomentContactRef[] = []
import { personaDb } from './newFriendsPersona/idb'
import type { Character, PlayerIdentity } from './newFriendsPersona/types'
import { WECHAT_LUMI_PEER_CHARACTER_ID, WECHAT_SELF_PEER_CHARACTER_ID } from './wechatConversationKey'
import { resolveCharacterBoundUserIdentity } from './charUserPlaceholders'
import type { WechatProfile } from './wechatProfileTypes'

import { resolveCharacterAvatarUrl } from '../../utils/characterAvatarUrl'
import { LUMI_ASSISTANT_AVATAR_URL } from './lumiAssistantAssets'
import {
  LUMI_SHELL,
  LUMI_SHELL_FONT,
  LUMI_SHELL_NUM_STYLE,
} from './lumiShellTheme'
import { ContactProfileRadarCharts } from './ContactProfileRadarCharts'
import {
  UniqueIdentityQrMark,
  UniqueIdentityQrWatermark,
  resolveIdentityQrMeta,
} from './ContactProfileIdentityQr'
import {
  ContactProfileLifeLedgerEntry,
  ContactProfileLifeLedgerSheet,
} from './ContactProfileLifeLedgerEntry'
import type { AnonymousQaWechatContext } from '../../../components/anonymousQa/buildAnonymousQaPersonaContext'
import { ObservationNotesEntryCard } from './observationNotes/ObservationNotesEntryCard'
import { ObservationNotesScreen } from './observationNotes/ObservationNotesScreen'
import { OBS_NOTES_UPDATED_EVENT } from './observationNotes/obsNotesPatch'
import { looksLikeLegacySampleObservationNotes } from './observationNotes/previousVersion'
import {
  clearObservationNotes,
  createBlankObservationNotesDoc,
  getObservationEntryPreview,
  loadObservationNotes,
  saveObservationNotes,
  type ObservationNotesEntryPreview,
} from './observationNotes/store'
import type { ObservationNotesDoc } from './observationNotes/types'

export type ContactProfileTarget =
  | { kind: 'lumi' }
  | { kind: 'persona'; characterId: string }
  | { kind: 'self' }

export type ContactProfileCardScreenProps = {
  target: ContactProfileTarget
  remarkName: string
  avatarUrl?: string
  onBack: () => void
  onOpenChat: () => void
  onOpenProfileSettings: () => void
  onOpenContactSettings: (characterId: string) => void
  onOpenMoments?: () => void
  accountId?: string | null
  /** 当前玩家身份（观察笔记按 char×player 存档） */
  playerIdentityId?: string | null
  /** 手动更新侧写所需 */
  wechatCtx?: AnonymousQaWechatContext | null
  momentContacts?: MomentContactRef[]
  /** 本人资料卡：当前微信马甲资料（kind === 'self' 时使用） */
  selfAccountProfile?: Pick<WechatProfile, 'nickname' | 'wechatId' | 'signature' | 'avatarUrl' | 'gender'> | null
}

const CARD = {
  paper: '#FAFAFA',
  paperSoft: '#F2F2F2',
  inkSoft: '#2A2A2A',
  line: 'rgba(16,16,18,0.1)',
  stamp: '#EDEDED',
  band: '#1A1A1A',
} as const

function mapGender(g: Character['gender'] | undefined | null): ContactProfileGenderUi {
  if (g === 'male') return 'male'
  if (g === 'female') return 'female'
  return 'private'
}

function genderLabel(g: ContactProfileGenderUi): string {
  if (g === 'male') return '男'
  if (g === 'female') return '女'
  return '私密'
}

function formatJoined(ms?: number): string {
  if (!ms || ms <= 0) return '—'
  const d = new Date(ms)
  return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`
}

function IdInfoRow({
  index,
  title,
  en,
  value,
}: {
  index: string
  title: string
  en: string
  value: string
}) {
  return (
    <div className="flex gap-3 border-t px-4 py-3" style={{ borderColor: CARD.line }}>
      <div className="w-[72px] shrink-0">
        <p className="text-[11px] font-semibold tracking-wide" style={{ color: CARD.inkSoft }}>
          <span className="mr-1 tabular-nums" style={LUMI_SHELL_NUM_STYLE}>
            {index}
          </span>
          {title}
        </p>
        <p className="mt-0.5 text-[8px] font-medium tracking-[0.12em]" style={{ color: LUMI_SHELL.mist }}>
          {en}
        </p>
      </div>
      <p
        className="min-w-0 flex-1 pt-0.5 text-[13px] leading-snug"
        style={{ color: LUMI_SHELL.ink, fontFamily: LUMI_SHELL_NUM_STYLE.fontFamily }}
      >
        {value || '—'}
      </p>
    </div>
  )
}

/** 挂在脖子上的通行证：顶部挂环 + 镂空插槽 */
function PassLanyardSlot() {
  return (
    <div className="pointer-events-none relative z-[2] flex flex-col items-center" aria-hidden>
      {/* 挂环（金属环感） */}
      <div
        className="relative -mb-[7px] h-[22px] w-[18px]"
        style={{
          borderRadius: 999,
          border: '2.5px solid rgba(16,16,18,0.55)',
          background:
            'linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(220,220,220,0.2) 45%, rgba(16,16,18,0.06) 100%)',
          boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.7), 0 1px 2px rgba(16,16,18,0.12)',
        }}
      />
      {/* 镂空插槽：露出页面底纹 */}
      <div
        className="relative z-[1] h-[11px] w-[42px] rounded-full"
        style={{
          background: '#F5F5F5',
          backgroundImage: 'radial-gradient(rgba(16,16,18,0.06) 0.7px, transparent 0.7px)',
          backgroundSize: '14px 14px',
          backgroundPosition: 'center',
          boxShadow:
            'inset 0 1.5px 3px rgba(16,16,18,0.22), inset 0 -1px 1px rgba(255,255,255,0.65), 0 0 0 1.5px rgba(16,16,18,0.18)',
        }}
      />
    </div>
  )
}

export function ContactProfileCardScreen({
  target,
  remarkName,
  avatarUrl: avatarUrlProp,
  onBack,
  onOpenChat,
  onOpenProfileSettings,
  onOpenContactSettings: _onOpenContactSettings,
  onOpenMoments,
  accountId,
  playerIdentityId: playerIdentityIdProp = null,
  wechatCtx = null,
  momentContacts = EMPTY_MOMENT_CONTACTS,
  selfAccountProfile = null,
}: ContactProfileCardScreenProps) {
  const { state } = useCustomization()
  const disableTransitions = state.ui.disablePageTransitions
  const [character, setCharacter] = useState<Character | null>(null)
  const [boundPlayerIdentity, setBoundPlayerIdentity] = useState<PlayerIdentity | null>(null)
  const [callPanelOpen, setCallPanelOpen] = useState(false)
  const [avatarPreviewOpen, setAvatarPreviewOpen] = useState(false)
  const [lifeLedgerOpen, setLifeLedgerOpen] = useState(false)
  const [obsNotesOpen, setObsNotesOpen] = useState(false)
  const [obsNotesDoc, setObsNotesDoc] = useState<ObservationNotesDoc | null>(null)
  const [obsNotesPreview, setObsNotesPreview] = useState<ObservationNotesEntryPreview | null>(null)
  const [displayAge, setDisplayAge] = useState<number | null>(null)

  const isSelf = target.kind === 'self'
  const characterId =
    target.kind === 'persona'
      ? target.characterId
      : target.kind === 'self'
        ? WECHAT_SELF_PEER_CHARACTER_ID
        : WECHAT_LUMI_PEER_CHARACTER_ID

  const obsPlayerIdentityId = useMemo(() => {
    const bound = boundPlayerIdentity?.id?.trim()
    if (bound) return bound
    return playerIdentityIdProp?.trim() || ''
  }, [boundPlayerIdentity?.id, playerIdentityIdProp])

  useEffect(() => {
    if (isSelf) {
      setCharacter(null)
      setBoundPlayerIdentity(null)
      setDisplayAge(null)
      return
    }
    let cancelled = false
    const load = async () => {
      try {
        const c = await personaDb.getCharacter(characterId)
        if (cancelled) return
        const identity = c ? await resolveCharacterBoundUserIdentity(c) : null
        const fresh = c ? ((await personaDb.getCharacter(c.id)) ?? c) : null
        if (cancelled) return
        setCharacter(fresh)
        setBoundPlayerIdentity(identity)
        if (c) {
          const span = await import('./lifeMutable/load').then((m) => m.loadCharacterStorySpan(c.id))
          const row = await personaDb.getCharacterLifeMutable(c.id)
          const sheet = row?.sheet
          const ageAtStart =
            typeof sheet?.ageAtStart === 'number' && Number.isFinite(sheet.ageAtStart)
              ? sheet.ageAtStart
              : c.age
          const { computeCurrentAge, resolveLifeClock } = await import('./lifeMutable/compute')
          const clock = resolveLifeClock(sheet?.storyStartDay, span)
          const age = computeCurrentAge({
            ageAtStart,
            birthdayMD: c.birthdayMD,
            startDay: clock.startDay,
            nowDay: clock.nowDay,
          })
          if (!cancelled) setDisplayAge(age ?? c.age)
        } else if (!cancelled) {
          setDisplayAge(null)
        }
      } catch {
        if (!cancelled) {
          setCharacter(null)
          setBoundPlayerIdentity(null)
          setDisplayAge(null)
        }
      }
    }
    void load()
    const onStorage = () => void load()
    window.addEventListener('wechat-storage-changed', onStorage)
    return () => {
      cancelled = true
      window.removeEventListener('wechat-storage-changed', onStorage)
    }
  }, [characterId, isSelf])

  const reloadObsPreview = useCallback(async () => {
    if (target.kind !== 'persona' || !obsPlayerIdentityId) {
      setObsNotesPreview(null)
      return
    }
    try {
      const doc = await loadObservationNotes({
        conversationCharacterId: characterId,
        playerIdentityId: obsPlayerIdentityId,
        charDisplayName: remarkName.trim() || character?.name?.trim() || '未命名',
        seedIfEmpty: false,
      })
      setObsNotesPreview(getObservationEntryPreview(doc))
    } catch {
      setObsNotesPreview(null)
    }
  }, [target.kind, obsPlayerIdentityId, characterId, remarkName, character?.name])

  useEffect(() => {
    void reloadObsPreview()
  }, [reloadObsPreview])

  useEffect(() => {
    const onChange = () => void reloadObsPreview()
    window.addEventListener(OBS_NOTES_UPDATED_EVENT, onChange)
    return () => window.removeEventListener(OBS_NOTES_UPDATED_EVENT, onChange)
  }, [reloadObsPreview])

  const openObservationNotes = useCallback(async () => {
    if (target.kind !== 'persona' || !obsPlayerIdentityId) return
    const charDisplayName = remarkName.trim() || character?.name?.trim() || '未命名'
    let doc = await loadObservationNotes({
      conversationCharacterId: characterId,
      playerIdentityId: obsPlayerIdentityId,
      charDisplayName,
      seedIfEmpty: false,
    })
    if (doc && looksLikeLegacySampleObservationNotes(doc)) {
      await clearObservationNotes({
        conversationCharacterId: characterId,
        playerIdentityId: obsPlayerIdentityId,
      })
      doc = null
    }
    if (!doc) {
      doc = createBlankObservationNotesDoc({
        conversationCharacterId: characterId,
        playerIdentityId: obsPlayerIdentityId,
        charDisplayName,
      })
      await saveObservationNotes(doc)
    }
    setObsNotesDoc(doc)
    setObsNotesOpen(true)
  }, [target.kind, obsPlayerIdentityId, characterId, remarkName, character?.name])

  const wechatNickLine = useMemo(() => {
    if (target.kind === 'lumi') return 'Lumi'
    if (target.kind === 'self') {
      return selfAccountProfile?.nickname?.trim() || remarkName.trim() || '未设置'
    }
    const nick = character?.wechatNickname?.trim()
    const name = character?.name?.trim()
    return nick || name || '未设置'
  }, [target.kind, character, selfAccountProfile?.nickname, remarkName])

  const headlineName = useMemo(() => {
    if (target.kind === 'self') return wechatNickLine
    const r = character?.remark?.trim() || remarkName.trim()
    if (r) return r
    return wechatNickLine
  }, [target.kind, character?.remark, remarkName, wechatNickLine])

  const wechatIdDisplay = useMemo(() => {
    if (target.kind === 'self') {
      return selfAccountProfile?.wechatId?.trim() || '未设置'
    }
    const raw = character?.wechatId?.trim()
    if (raw) return raw
    const slug = characterId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 16) || 'user'
    return `wxid_${slug}`
  }, [target.kind, character, characterId, selfAccountProfile?.wechatId])

  const serialNo = useMemo(() => {
    const raw = wechatIdDisplay.replace(/^wxid_/i, '').replace(/[^a-zA-Z0-9]/g, '')
    if (!raw) return '001'
    let h = 0
    for (let i = 0; i < raw.length; i++) h = (h * 31 + raw.charCodeAt(i)) >>> 0
    return String((h % 900) + 100)
  }, [wechatIdDisplay])

  const genderUi = useMemo(() => {
    if (target.kind === 'self') {
      if (selfAccountProfile?.gender === 'male') return 'male' as const
      if (selfAccountProfile?.gender === 'female') return 'female' as const
      return 'private' as const
    }
    return mapGender(character?.gender)
  }, [target.kind, character?.gender, selfAccountProfile?.gender])

  const avatarSrc = useMemo(() => {
    if (target.kind === 'lumi') {
      return (
        resolveCharacterAvatarUrl({ avatarUrl: avatarUrlProp }) ||
        LUMI_ASSISTANT_AVATAR_URL
      )
    }
    const a =
      avatarUrlProp?.trim() ||
      (target.kind === 'self' ? selfAccountProfile?.avatarUrl?.trim() : character?.avatarUrl?.trim())
    return resolveCharacterAvatarUrl({ avatarUrl: a }) || a || ''
  }, [avatarUrlProp, character?.avatarUrl, selfAccountProfile?.avatarUrl, target.kind])

  const onAvatarClick = useCallback(() => {
    setAvatarPreviewOpen(true)
  }, [])

  const onMoments = useCallback(() => {
    if (onOpenMoments) {
      onOpenMoments()
      return
    }
    window.alert('朋友圈开发中')
  }, [onOpenMoments])

  const summaryRegion = target.kind === 'self' ? '' : character?.wechatRegion?.trim() || ''

  const personalLine = useMemo(() => {
    if (target.kind === 'self' || target.kind === 'lumi') {
      return [genderLabel(genderUi), summaryRegion || null].filter(Boolean).join(' / ') || genderLabel(genderUi)
    }
    const parts = [
      genderLabel(genderUi),
      displayAge != null ? `${displayAge}` : character?.age != null ? `${character.age}` : null,
      character?.zodiac?.trim() || null,
      character?.mbti?.trim()?.toUpperCase() || null,
    ].filter(Boolean)
    return parts.join(' / ') || '—'
  }, [target.kind, genderUi, summaryRegion, displayAge, character?.age, character?.zodiac, character?.mbti])

  const roleLine = useMemo(() => {
    if (target.kind === 'lumi') return '智能助理'
    if (target.kind === 'self') return '本人账号'
    return character?.identity?.trim() || character?.remark?.trim() || '联系人'
  }, [target.kind, character?.identity, character?.remark])

  const joinedLine = useMemo(() => {
    if (target.kind === 'self') return '—'
    if (summaryRegion) return summaryRegion
    return formatJoined(character?.createdAt)
  }, [target.kind, summaryRegion, character?.createdAt])

  const joinedTitle = summaryRegion && target.kind !== 'self' ? '地区' : '建档'
  const joinedEn = summaryRegion && target.kind !== 'self' ? 'REGION' : 'SINCE'

  const cardBanner =
    target.kind === 'self' ? '【我的资料证】' : target.kind === 'lumi' ? '【Lumi 通行卡】' : '【微信联系人证】'

  const fingerprintSeed = `${characterId}|${wechatIdDisplay}|${serialNo}`
  const qrMeta = resolveIdentityQrMeta(fingerprintSeed)

  const idCardStyle: CSSProperties = {
    background: CARD.paper,
    borderRadius: 22,
    border: `1px solid ${CARD.line}`,
    boxShadow: '0 18px 48px rgba(16,16,18,0.1), 0 2px 8px rgba(16,16,18,0.05)',
    overflow: 'hidden',
    position: 'relative',
  }

  return (
    <motion.div
      initial={disableTransitions ? false : { opacity: 0, x: 18 }}
      animate={{ opacity: 1, x: 0 }}
      exit={disableTransitions ? { opacity: 1, x: 0 } : { opacity: 0, x: 18 }}
      transition={disableTransitions ? { duration: 0 } : { duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
      className="relative flex h-full min-h-0 flex-col"
      style={{
        background: '#F5F5F5',
        fontFamily: LUMI_SHELL_FONT,
        backgroundImage:
          'radial-gradient(rgba(16,16,18,0.06) 0.7px, transparent 0.7px)',
        backgroundSize: '14px 14px',
      }}
    >
      <header className="relative z-[1] flex shrink-0 items-center justify-between px-1 pb-1 pt-[max(6px,env(safe-area-inset-top,0px))]">
        <Pressable
          type="button"
          aria-label="返回"
          onClick={onBack}
          className="flex h-11 w-11 items-center justify-center rounded-full active:bg-black/[0.04]"
        >
          <ChevronLeft className="size-6" style={{ color: LUMI_SHELL.ink }} strokeWidth={1.5} />
        </Pressable>
        <div className="min-w-0 flex-1 text-center">
          <p className="text-[9px] font-medium tracking-[0.22em]" style={{ color: LUMI_SHELL.mist }}>
            PASS
          </p>
        </div>
        <Pressable
          type="button"
          aria-label="设置与备注"
          onClick={onOpenProfileSettings}
          className="flex h-11 w-11 items-center justify-center rounded-full active:bg-black/[0.04]"
        >
          <MoreHorizontal className="size-[18px]" style={{ color: LUMI_SHELL.ink }} strokeWidth={1.8} />
        </Pressable>
      </header>

      <div className="relative z-[1] flex min-h-0 flex-1 flex-col overflow-y-auto">
        <div className="px-4 pb-2 pt-1">
          {/* 挂绳通行证 */}
          <div className="relative pt-2">
            <div className="absolute left-1/2 top-0 z-[3] -translate-x-1/2">
              <PassLanyardSlot />
            </div>

            <div className="pt-4" style={idCardStyle}>
              {/* 顶部留白让镂空落在卡内 */}
              <div className="relative z-[1] h-3" aria-hidden />

              {/* 唯一身份二维码底纹 */}
              <div
                className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
                aria-hidden
              >
                <div className="absolute -right-2 top-14 h-[180px] w-[180px] rotate-[-8deg] opacity-[0.1]">
                  <UniqueIdentityQrWatermark seedKey={fingerprintSeed} />
                </div>
                <div className="absolute -left-6 bottom-8 h-[120px] w-[120px] rotate-[12deg] opacity-[0.06]">
                  <UniqueIdentityQrWatermark seedKey={`${fingerprintSeed}|alt`} />
                </div>
              </div>

              <div
                className="relative z-[1] flex items-start justify-between gap-3 px-4 pb-3 pt-1"
                style={{ borderBottom: `1px solid ${CARD.line}` }}
              >
                <div>
                  <p className="text-[15px] font-semibold tracking-[0.04em]" style={{ color: CARD.inkSoft }}>
                    ACCESS PASS
                  </p>
                  <p className="mt-0.5 text-[9px] font-medium tracking-[0.16em]" style={{ color: LUMI_SHELL.mist }}>
                    QR LOCKED
                  </p>
                </div>
                <p
                  className="shrink-0 pt-0.5 text-[11px] tabular-nums"
                  style={{ color: LUMI_SHELL.mist, ...LUMI_SHELL_NUM_STYLE }}
                >
                  编号 · {serialNo}
                </p>
              </div>

              <div
                className="relative z-[1] flex flex-col items-center px-4 pb-5 pt-6"
                style={{
                  background: `linear-gradient(165deg, rgba(237,237,237,0.92) 0%, rgba(250,250,250,0.88) 55%, rgba(250,250,250,0.75) 100%)`,
                }}
              >
                <Pressable
                  type="button"
                  onClick={onAvatarClick}
                  className="relative z-[1] h-[108px] w-[108px] overflow-hidden rounded-full active:opacity-92"
                  style={{
                    background: '#fff',
                    boxShadow:
                      '0 12px 28px rgba(16,16,18,0.14), 0 0 0 4px rgba(255,255,255,0.95), 0 0 0 5px rgba(16,16,18,0.18)',
                  }}
                  aria-label="查看头像"
                >
                  {avatarSrc ? (
                    <img src={avatarSrc} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div
                      className="flex h-full w-full items-center justify-center text-[26px]"
                      style={{ color: LUMI_SHELL.mist }}
                    >
                      ?
                    </div>
                  )}
                </Pressable>

                <div className="relative z-[1] mt-4 flex max-w-full items-center justify-center gap-1.5 px-2">
                  <h1
                    className="truncate text-[22px] font-semibold tracking-tight"
                    style={{ color: LUMI_SHELL.ink }}
                  >
                    【{headlineName}】
                  </h1>
                  {genderUi !== 'private' ? <ContactProfileGenderGlyph kind={genderUi} /> : null}
                </div>
                {wechatNickLine && wechatNickLine !== headlineName ? (
                  <p
                    className="relative z-[1] mt-1 max-w-full truncate px-3 text-[13px] italic tracking-wide"
                    style={{ color: 'rgba(16,16,18,0.5)' }}
                  >
                    {wechatNickLine}
                  </p>
                ) : (
                  <p
                    className="relative z-[1] mt-1 text-[11px] tracking-[0.14em]"
                    style={{ color: LUMI_SHELL.mist }}
                  >
                    WECHAT PROFILE
                  </p>
                )}
              </div>

              <div className="relative z-[1]">
                <IdInfoRow index="01" title="个人信息" en="INFO" value={personalLine} />
                <IdInfoRow index="02" title="身份" en="ROLE" value={roleLine} />
                <IdInfoRow index="03" title={joinedTitle} en={joinedEn} value={joinedLine} />
              </div>

              <div
                className="relative z-[1] flex items-end justify-between gap-3 px-4 pb-3.5 pt-3"
                style={{ borderTop: `1px solid ${CARD.line}`, background: 'rgba(242,242,242,0.72)' }}
              >
                <div className="min-w-0">
                  <p className="text-[9px] font-medium tracking-[0.14em]" style={{ color: LUMI_SHELL.mist }}>
                    QR · {qrMeta.code}
                  </p>
                  <p
                    className="mt-1 truncate text-[11px] tabular-nums"
                    style={{ color: CARD.inkSoft, ...LUMI_SHELL_NUM_STYLE }}
                  >
                    {wechatIdDisplay}
                  </p>
                </div>
                <UniqueIdentityQrMark seedKey={fingerprintSeed} />
              </div>

              <div
                className="relative z-[1] flex items-center justify-center px-3 py-2.5"
                style={{ background: CARD.band }}
              >
                <p className="text-[12px] font-semibold tracking-wide" style={{ color: '#F5F5F5' }}>
                  {cardBanner}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-3">
            <ContactProfileRadarCharts
              characterId={characterId}
              mbtiRaw={
                target.kind === 'lumi'
                  ? 'INFJ'
                  : target.kind === 'self'
                    ? null
                    : character?.mbti
              }
            />
          </div>

          {target.kind === 'persona' && character ? (
            <ContactProfileLifeLedgerEntry
              character={character}
              playerIdentityId={boundPlayerIdentity?.id}
              onOpen={() => setLifeLedgerOpen(true)}
            />
          ) : null}

          {target.kind === 'persona' && obsPlayerIdentityId ? (
            <div className="mt-3">
              <ObservationNotesEntryCard
                preview={obsNotesPreview}
                onOpen={() => void openObservationNotes()}
              />
            </div>
          ) : null}

          {/* 朋友圈 */}
          <div
            className="mt-3 overflow-hidden"
            style={{
              background: CARD.paper,
              borderRadius: 18,
              border: `1px solid ${CARD.line}`,
              boxShadow: '0 10px 28px rgba(16,16,18,0.05)',
            }}
          >
            <ContactMomentsSnapshot
              characterId={characterId}
              accountId={accountId}
              momentContacts={momentContacts}
              onOpenArchive={onMoments}
            />
          </div>
        </div>

        <div className="mt-4 space-y-2.5 px-4 pb-[max(18px,env(safe-area-inset-bottom,0px))]">
          <Pressable
            type="button"
            onClick={onOpenChat}
            className="flex h-[48px] w-full items-center justify-center gap-2 rounded-[16px] active:opacity-90"
            style={{
              background: LUMI_SHELL.ink,
              color: '#fff',
              boxShadow: '0 10px 24px rgba(16,16,18,0.16)',
            }}
          >
            <MessageCircle className="size-[17px]" strokeWidth={1.8} />
            <span className="text-[15px] font-medium tracking-wide">发消息</span>
          </Pressable>
          {target.kind !== 'self' ? (
            <Pressable
              type="button"
              onClick={() => setCallPanelOpen(true)}
              className="flex h-[48px] w-full items-center justify-center gap-2 rounded-[16px] active:bg-black/[0.03]"
              style={{
                color: LUMI_SHELL.ink,
                background: CARD.paper,
                border: `1px solid ${CARD.line}`,
                boxShadow: '0 6px 20px rgba(16,16,18,0.04)',
              }}
            >
              <Phone className="size-[17px]" strokeWidth={1.8} />
              <span className="text-[15px] font-medium tracking-wide">音视频通话</span>
            </Pressable>
          ) : null}
        </div>
      </div>

      <AnimatePresence>
        {avatarPreviewOpen ? (
          <motion.div
            key="avatar-preview"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[90] flex items-center justify-center bg-black/92 px-5"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setAvatarPreviewOpen(false)
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="max-h-[82vh] max-w-[82vw] overflow-hidden rounded-[24px]"
            >
              {avatarSrc ? (
                <img src={avatarSrc} alt="" className="h-full w-full object-contain" />
              ) : (
                <div className="flex h-[220px] w-[220px] items-center justify-center rounded-[24px] bg-[#222] text-[24px] text-[#8f8f8f]">
                  ?
                </div>
              )}
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {callPanelOpen ? (
        <div className="fixed inset-0 z-[80] flex flex-col justify-end bg-black/25">
          <Pressable type="button" className="min-h-0 flex-1" aria-label="关闭" onClick={() => setCallPanelOpen(false)}>
            {null}
          </Pressable>
          <div
            className="px-4 pb-[max(16px,env(safe-area-inset-bottom,0px))] pt-5 text-center"
            style={{
              borderRadius: '24px 24px 0 0',
              background: 'rgba(250,250,250,0.98)',
              borderTop: `1px solid ${CARD.line}`,
              boxShadow: '0 -12px 40px rgba(16,16,18,0.08)',
            }}
          >
            <div
              className="mx-auto mb-4 h-1 w-9 rounded-full"
              style={{ background: 'rgba(16,16,18,0.12)' }}
              aria-hidden
            />
            <p className="text-[15px] font-semibold" style={{ color: LUMI_SHELL.ink }}>
              音视频通话
            </p>
            <p className="mt-2 text-[13px] leading-relaxed" style={{ color: LUMI_SHELL.mist }}>
              当前版本仅保留入口，通话页待接入
            </p>
            <Pressable
              type="button"
              onClick={() => setCallPanelOpen(false)}
              className="mt-5 h-11 w-full rounded-[14px] text-[15px] font-medium active:opacity-90"
              style={{
                background: LUMI_SHELL.ink,
                color: '#fff',
              }}
            >
              知道了
            </Pressable>
          </div>
        </div>
      ) : null}

      {lifeLedgerOpen && target.kind === 'persona' && character ? (
        <ContactProfileLifeLedgerSheet
          character={character}
          playerIdentity={boundPlayerIdentity}
          onClose={() => setLifeLedgerOpen(false)}
        />
      ) : null}

      <ObservationNotesScreen
        open={obsNotesOpen}
        doc={obsNotesDoc}
        onClose={() => {
          setObsNotesOpen(false)
          setObsNotesDoc(null)
          void reloadObsPreview()
        }}
        onDocChange={setObsNotesDoc}
        accountId={accountId}
        wechatCtx={wechatCtx}
        disableTransitions={disableTransitions}
      />
    </motion.div>
  )
}
