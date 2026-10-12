import {
  Armchair,
  BookOpen,
  Brain,
  CalendarHeart,
  ChevronLeft,
  Droplets,
  Gift,
  MoonStar,
  Plane,
  Smile,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import type { WeChatPersonaContact } from '../../../types'
import { resolveCharacterAvatarUrl } from '../../../utils/characterAvatarUrl'
import { CoupleBondThread, CoupleFloatParticles } from './CoupleMotionDecor'
import { CoupleCalendarPage } from './CoupleCalendarPage'
import { CoupleContractPage } from './CoupleContractPage'
import { CoupleDiaryPage } from './CoupleDiaryPage'
import { CoupleMemorySharePage } from './CoupleMemorySharePage'
import { CouplePeriodPage } from './CouplePeriodPage'
import { CoupleRemindCeremonyModal } from './CoupleRemindCeremonyModal'
import { CoupleSpaceEmptyState } from './CoupleSpaceEmptyState'
import { CoupleSpaceInvitePickSheet } from './CoupleSpaceInvitePickSheet'
import { CoupleSpaceUnderDevPage } from './CoupleSpaceUnderDevPage'
import {
  CoupleUnbindConfirmModal,
  summarizeCoupleRoomForUnbind,
} from './CoupleUnbindConfirmModal'
import { buildCoupleTestRemindOffer } from './coupleMilestoneRemind'
import { requestCoupleSpaceInviteChat } from './coupleSpaceInviteNavigation'
import { personaDb } from '../newFriendsPersona/idb'
import {
  coupleDaysTogether,
  formatCoupleBoundDateLabel,
  isCoupleSpaceBound,
} from './coupleSpaceTypes'
import { useCoupleSpaceStore } from './useCoupleSpaceStore'
import './coupleSpaceTheme.css'

type SpaceView =
  | 'home'
  | 'diary'
  | 'calendar'
  | 'period'
  | 'memory'
  | 'contract'

type HomeTileId =
  | 'diary'
  | 'calendar'
  | 'period'
  | 'memory'
  | 'mood'
  | 'wish'
  | 'travel'
  | 'decor'
  | 'goodnight'

const HOME_TILES: Array<{
  id: HomeTileId
  title: string
  Icon: typeof BookOpen
  ready: boolean
  /** 开发中占位说明 */
  soonHint?: string
}> = [
  { id: 'diary', title: '共写日记', Icon: BookOpen, ready: true },
  { id: 'calendar', title: '纪念日历', Icon: CalendarHeart, ready: true },
  { id: 'period', title: '经期管理', Icon: Droplets, ready: true },
  { id: 'memory', title: '纳入记忆', Icon: Brain, ready: true },
  {
    id: 'mood',
    title: '心情牌',
    Icon: Smile,
    ready: false,
    soonHint: '每日心情牌与双向回应还在打磨，完成后可在此互诉今日心情。',
  },
  {
    id: 'wish',
    title: '心愿清单',
    Icon: Gift,
    ready: false,
    soonHint: '一起许愿、勾掉小心愿的清单还在筹备，完成后会在此接入。',
  },
  {
    id: 'travel',
    title: '一起旅行',
    Icon: Plane,
    ready: false,
    soonHint: '双人旅行行程与打卡还在规划路线，完成后可在此一起出发。',
  },
  {
    id: 'decor',
    title: '空间装饰',
    Icon: Armchair,
    ready: false,
    soonHint: '布置共同小窝、换墙纸与小摆件仍在打样，完成后可在此装饰。',
  },
  {
    id: 'goodnight',
    title: '晚安仪式',
    Icon: MoonStar,
    ready: false,
    soonHint: '睡前互道晚安与小仪式还在编写，完成后可在此轻轻收束一天。',
  },
]

function HomeHeroAvatar({
  url,
  name,
  side,
}: {
  url?: string
  name: string
  side: 'user' | 'char'
}) {
  const initial = (name.trim() || '?').slice(0, 1)
  const src = resolveCharacterAvatarUrl({ avatarUrl: url }) || url?.trim() || ''
  if (src) {
    return (
      <img
        src={src}
        alt=""
        className="cs-home-hero__avatar"
        style={{
          border: '2px solid color-mix(in oklab, var(--cs-gold) 55%, white)',
        }}
      />
    )
  }
  return (
    <div
      className="cs-home-hero__avatar cs-home-hero__avatar--fallback"
      style={{
        background:
          side === 'user'
            ? 'linear-gradient(145deg, #d4a5ad, #c4a574)'
            : 'linear-gradient(145deg, #b89bc8, #d4a5ad)',
        border: '2px solid color-mix(in oklab, var(--cs-gold) 55%, white)',
      }}
      aria-hidden
    >
      {initial}
    </div>
  )
}

export function CoupleSpaceApp({
  onBack,
  personaContacts = [],
  userDisplayName,
  userAvatarUrl,
  wechatAccountId,
  selectedCharacterId,
  onSelectCharacter,
}: {
  onBack: () => void
  personaContacts?: WeChatPersonaContact[]
  userDisplayName: string
  /** 当前用户微信头像 */
  userAvatarUrl?: string
  wechatAccountId?: string | null
  selectedCharacterId?: string | null
  onSelectCharacter?: (id: string | null) => void
}) {
  const bindAccount = useCoupleSpaceStore((s) => s.bindAccount)
  const ensureRoom = useCoupleSpaceStore((s) => s.ensureRoom)
  const unbind = useCoupleSpaceStore((s) => s.unbind)
  const hydrated = useCoupleSpaceStore((s) => s.hydrated)
  const root = useCoupleSpaceStore((s) => s.root)

  const [charId, setCharId] = useState<string | null>(selectedCharacterId?.trim() || null)
  const [view, setView] = useState<SpaceView>('home')
  const [soonTileId, setSoonTileId] = useState<HomeTileId | null>(null)
  const [invitePickOpen, setInvitePickOpen] = useState(false)
  const [unbindOpen, setUnbindOpen] = useState(false)
  const [remindPreviewOpen, setRemindPreviewOpen] = useState(false)
  const [charAvatarFromDb, setCharAvatarFromDb] = useState('')

  useEffect(() => {
    void bindAccount(wechatAccountId)
  }, [bindAccount, wechatAccountId])

  useEffect(() => {
    if (selectedCharacterId?.trim()) setCharId(selectedCharacterId.trim())
  }, [selectedCharacterId])

  const boundContacts = useMemo(() => {
    const acc = wechatAccountId?.trim()
    if (!acc || !hydrated) return []
    const rooms = root.byAccount[acc]?.rooms ?? {}
    return personaContacts.filter((c) => {
      const cid = c.characterId?.trim() || c.id?.trim()
      return cid ? isCoupleSpaceBound(rooms[cid]) : false
    })
  }, [hydrated, personaContacts, root, wechatAccountId])

  useEffect(() => {
    if (charId) return
    const first = boundContacts[0]
    const cid = first?.characterId?.trim() || first?.id?.trim()
    if (cid) {
      setCharId(cid)
      onSelectCharacter?.(cid)
    }
  }, [boundContacts, charId, onSelectCharacter])

  const room = charId && hydrated ? ensureRoom(charId) : null
  const contact =
    personaContacts.find((c) => (c.characterId?.trim() || c.id) === charId) ?? null
  const charName =
    contact?.remarkName?.trim() ||
    room?.binding?.charDisplayName ||
    '对方'
  const userName = userDisplayName.trim() || room?.binding?.userDisplayName || '我'
  const charAvatarUrl =
    resolveCharacterAvatarUrl({ avatarUrl: contact?.avatarUrl }) ||
    contact?.avatarUrl?.trim() ||
    charAvatarFromDb ||
    ''
  const selfAvatarUrl =
    resolveCharacterAvatarUrl({ avatarUrl: userAvatarUrl }) ||
    userAvatarUrl?.trim() ||
    ''

  useEffect(() => {
    const cid = charId?.trim()
    if (!cid) {
      setCharAvatarFromDb('')
      return
    }
    const fromContact =
      resolveCharacterAvatarUrl({ avatarUrl: contact?.avatarUrl }) ||
      contact?.avatarUrl?.trim() ||
      ''
    if (fromContact) {
      setCharAvatarFromDb('')
      return
    }
    let cancelled = false
    void personaDb.getCharacter(cid).then((ch) => {
      if (cancelled) return
      const url =
        resolveCharacterAvatarUrl({ avatarUrl: ch?.avatarUrl }) ||
        ch?.avatarUrl?.trim() ||
        ''
      setCharAvatarFromDb(url)
    })
    return () => {
      cancelled = true
    }
  }, [charId, contact?.avatarUrl])

  const remindPreviewPayload = useMemo(
    () =>
      buildCoupleTestRemindOffer({
        charName,
        userName,
        charAvatarUrl: charAvatarUrl || undefined,
        userAvatarUrl: selfAvatarUrl || undefined,
      }),
    [charAvatarUrl, charName, selfAvatarUrl, userName],
  )

  const bound = isCoupleSpaceBound(room)
  const daysTogether = room?.binding?.boundAt
    ? coupleDaysTogether(room.binding.boundAt)
    : 0

  if (view === 'diary' && charId && bound) {
    return (
      <CoupleDiaryPage
        characterId={charId}
        charName={charName}
        userName={userName}
        charAvatarUrl={charAvatarUrl || undefined}
        userAvatarUrl={selfAvatarUrl || undefined}
        onBack={() => setView('home')}
      />
    )
  }
  if (view === 'calendar' && charId && bound) {
    return (
      <CoupleCalendarPage characterId={charId} onBack={() => setView('home')} />
    )
  }
  if (view === 'period' && charId && bound) {
    return (
      <CouplePeriodPage
        characterId={charId}
        charName={charName}
        userName={userName}
        onBack={() => setView('home')}
      />
    )
  }
  if (view === 'memory' && charId && bound) {
    return <CoupleMemorySharePage characterId={charId} onBack={() => setView('home')} />
  }
  if (view === 'contract' && charId && bound && room?.binding) {
    return (
      <CoupleContractPage binding={room.binding} onBack={() => setView('home')} />
    )
  }

  if (soonTileId) {
    const tile = HOME_TILES.find((t) => t.id === soonTileId)
    return (
      <CoupleSpaceUnderDevPage
        title={tile?.title || '玩法'}
        hint={tile?.soonHint}
        onBack={() => setSoonTileId(null)}
      />
    )
  }

  if (!bound) {
    return (
      <div className="relative h-full min-h-0">
        <CoupleSpaceEmptyState
          onBack={onBack}
          boundContacts={boundContacts}
          onEnterBound={(cid) => {
            setCharId(cid)
            onSelectCharacter?.(cid)
          }}
          onInviteClick={() => setInvitePickOpen(true)}
        />
        <CoupleSpaceInvitePickSheet
          open={invitePickOpen}
          contacts={personaContacts}
          wechatAccountId={wechatAccountId}
          onClose={() => setInvitePickOpen(false)}
          onPick={(c) => {
            const cid = c.characterId?.trim() || c.id?.trim()
            if (!cid) return
            setInvitePickOpen(false)
            onBack()
            requestCoupleSpaceInviteChat(cid)
          }}
        />
      </div>
    )
  }

  const onTile = (id: HomeTileId, ready: boolean) => {
    if (!ready) {
      setSoonTileId(id)
      return
    }
    if (id === 'diary') setView('diary')
    if (id === 'calendar') setView('calendar')
    if (id === 'period') setView('period')
    if (id === 'memory') setView('memory')
  }

  const unbindSummary = summarizeCoupleRoomForUnbind(room)

  const handleConfirmUnbind = () => {
    if (!charId) return
    const leavingId = charId
    unbind(leavingId)
    setUnbindOpen(false)
    const nextBound = boundContacts.find((c) => {
      const cid = c.characterId?.trim() || c.id?.trim()
      return cid && cid !== leavingId
    })
    const nextId = nextBound?.characterId?.trim() || nextBound?.id?.trim() || null
    setCharId(nextId)
    onSelectCharacter?.(nextId)
  }

  return (
    <div className="couple-space-root relative">
      <header className="couple-space-header" style={{ paddingLeft: 18, paddingRight: 18 }}>
        <button
          type="button"
          onClick={onBack}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-[#FBEFEA] active:opacity-80"
          aria-label="返回"
        >
          <ChevronLeft className="h-[19px] w-[19px] text-[#4A3A35]" strokeWidth={1.75} />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="couple-space-title truncate text-[16px] text-[#4A3A35]">情侣空间</h1>
          <p className="truncate text-[11px] text-[#B99A8E]">已绑定 · 与{charName}</p>
        </div>
        <span className="h-9 w-9 shrink-0" aria-hidden />
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto pb-8">
        <button
          type="button"
          className="cs-home-hero"
          onClick={() => setView('contract')}
          aria-label="查看情侣契约"
        >
          <CoupleFloatParticles />
          <div className="cs-home-hero__pair mx-auto">
            <div className="cs-home-hero__avatars">
              <div className="cs-home-hero__person">
                <span className="cs-home-hero__avatar-glow" aria-hidden />
                <HomeHeroAvatar url={selfAvatarUrl} name={userName} side="user" />
                <span className="cs-home-hero__name">{userName}</span>
              </div>
              <span className="cs-home-hero__bond" aria-hidden>
                <CoupleBondThread />
              </span>
              <div className="cs-home-hero__person">
                <span className="cs-home-hero__avatar-glow" aria-hidden />
                <HomeHeroAvatar url={charAvatarUrl} name={charName} side="char" />
                <span className="cs-home-hero__name">{charName}</span>
              </div>
            </div>
          </div>
          <p className="mt-[14px] text-[12px] text-[#B99A8E]">在一起</p>
          <p className="mt-1 flex items-baseline justify-center gap-1">
            <span className="cs-shimmer-num text-[34px] font-bold leading-none tracking-tight">
              {daysTogether}
            </span>
            <span className="text-[12px] text-[#B99A8E]">天</span>
          </p>
          {room?.binding ? (
            <p className="mt-3 text-[10px] text-[#C9A99C]">
              绑定于 {formatCoupleBoundDateLabel(room.binding.boundAt)} · 轻触回看契约
            </p>
          ) : null}
        </button>

        <div className="cs-home-grid">
          {HOME_TILES.map(({ id, title, Icon, ready }) => (
            <button
              key={id}
              type="button"
              className={`cs-home-tile ${ready ? '' : 'cs-home-tile--soon'}`}
              onClick={() => onTile(id, ready)}
              aria-label={ready ? title : `${title}（开发中）`}
            >
              <Icon className="h-5 w-5 text-[#D9A9A0]" strokeWidth={1.6} aria-hidden />
              <span className="mt-2 text-[12.5px] text-[#4A3A35]">{title}</span>
              {!ready ? <span className="couple-soon-chip mt-1">开发中</span> : null}
            </button>
          ))}
        </div>

        {boundContacts.length > 1 ? (
          <div className="mx-5 mt-4 flex flex-wrap gap-2">
            {boundContacts.map((c) => {
              const cid = c.characterId?.trim() || c.id
              const label = c.remarkName?.trim() || '对方'
              return (
                <button
                  key={cid}
                  type="button"
                  onClick={() => {
                    setCharId(cid)
                    onSelectCharacter?.(cid)
                  }}
                  className={`rounded-full px-3 py-1 text-[11px] ${
                    cid === charId
                      ? 'bg-[#D99C90] text-white'
                      : 'bg-white/80 text-[#B99A8E]'
                  }`}
                >
                  {label}
                </button>
              )
            })}
          </div>
        ) : null}

        <button
          type="button"
          className="cs-remind-test-btn"
          onClick={() => setRemindPreviewOpen(true)}
        >
          预览提醒仪式
        </button>

        <button
          type="button"
          className="cs-home-unbind"
          onClick={() => setUnbindOpen(true)}
        >
          <span className="cs-home-unbind__label">解除绑定</span>
          <span className="cs-home-unbind__hint">将清空与对方的全部共同记忆</span>
        </button>
      </div>

      <CoupleRemindCeremonyModal
        open={remindPreviewOpen}
        payload={remindPreviewPayload}
        onClose={() => setRemindPreviewOpen(false)}
      />

      <CoupleUnbindConfirmModal
        open={unbindOpen}
        charName={charName}
        userName={userName}
        userAvatarUrl={selfAvatarUrl || undefined}
        charAvatarUrl={charAvatarUrl || undefined}
        summary={unbindSummary}
        onCancel={() => setUnbindOpen(false)}
        onConfirm={handleConfirmUnbind}
      />
    </div>
  )
}
