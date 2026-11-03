import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useState } from 'react'

import { Pressable } from '../../components/Pressable'
import { DEFAULT_PUBLIC_AVATAR_PATH } from '../../types'
import { resolveCharacterAvatarUrl } from '../../utils/characterAvatarUrl'
import { LUMI_SHELL_NUM_STYLE } from './lumiShellTheme'
import { personaDb } from './newFriendsPersona/idb'
import type { Character, PlayerIdentity } from './newFriendsPersona/types'
import { computeCurrentAge, emptyLifeMutableSheet, resolveLifeClock } from './lifeMutable/compute'
import { loadCharacterStorySpan } from './lifeMutable/load'
import { resolveLifeLedgerAvatarSrc } from './lifeMutable/ledgerAvatar'
import { LifeMutableEditor } from './lifeMutable/LifeMutableEditor'

/** 与人生档案本锐利杂志风同色板（轻量入口） */
const CARD = {
  bg: '#F3ECDD',
  page: '#FFFFFF',
  ink: '#2E271C',
  mist: '#9C8D6C',
} as const
const BORDER = '2px solid #2E271C'
const RADIUS = 10
const CARD_PAPER = '#FAFAF8'
const CARD_PAPER_BG = [
  'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'160\' height=\'160\' viewBox=\'0 0 160 160\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3CfeColorMatrix values=\'0 0 0 0 0.12 0 0 0 0 0.12 0 0 0 0 0.12 0 0 0 0.14 0\'/%3E%3C/filter%3E%3Crect width=\'160\' height=\'160\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',
  'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'6\' height=\'6\' viewBox=\'0 0 6 6\'%3E%3Cpath d=\'M0 3h6\' stroke=\'%232E271C\' stroke-opacity=\'0.028\' stroke-width=\'0.55\'/%3E%3C/svg%3E")',
  'linear-gradient(165deg, #FFFFFF 0%, #FAFAF8 55%, #F3F3F0 100%)',
].join(', ')

/**
 * 资料卡上的「人生账本」入口：锐利杂志风轻入口，展示本线当前年龄与时间跨度。
 */
export function ContactProfileLifeLedgerEntry({
  character,
  playerIdentityId,
  onOpen,
}: {
  character: Character
  playerIdentityId?: string | null
  onOpen: () => void
}) {
  const [preview, setPreview] = useState<{
    currentAge: number | null
    startDay: string | null
    nowDay: string | null
    occupation: string
    ledgerAvatar: string
  } | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const span = await loadCharacterStorySpan(character.id)
        const row = await personaDb.getCharacterLifeMutable(character.id)
        const sheet = row?.sheet ?? emptyLifeMutableSheet()
        const ageAtStart =
          typeof sheet.ageAtStart === 'number' && Number.isFinite(sheet.ageAtStart)
            ? sheet.ageAtStart
            : character.age
        const clock = resolveLifeClock(sheet.storyStartDay, span)
        const currentAge = computeCurrentAge({
          ageAtStart,
          birthdayMD: character.birthdayMD,
          startDay: clock.startDay,
          nowDay: clock.nowDay,
        })
        const occupation = sheet.occupationMain.trim() || character.identity?.trim() || ''
        if (cancelled) return
        setPreview({
          currentAge,
          startDay: clock.startDay,
          nowDay: clock.nowDay,
          occupation,
          ledgerAvatar: sheet.ledgerAvatar || '',
        })
      } catch {
        if (!cancelled) {
          setPreview({
            currentAge: character.age,
            startDay: null,
            nowDay: null,
            occupation: character.identity?.trim() || '',
            ledgerAvatar: '',
          })
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [character.id, character.age, character.birthdayMD, character.identity, character.avatarUrl, playerIdentityId])

  const ageText =
    preview?.currentAge != null
      ? `${preview.currentAge} 岁`
      : character.age != null
        ? `${character.age} 岁`
        : '待对齐'
  const spanText =
    preview?.startDay && preview?.nowDay
      ? `${preview.startDay.replace(/年|月/g, '.').replace(/日/, '')} → ${preview.nowDay.replace(/年|月/g, '.').replace(/日/, '')}`
      : '随剧情日自动增长'
  const roleText = preview?.occupation?.trim() || '生理 · 资产 · 学历'
  const avatarSrc = resolveLifeLedgerAvatarSrc(preview?.ledgerAvatar, character.avatarUrl)

  return (
    <Pressable
      type="button"
      onClick={onOpen}
      className="group relative mt-3 w-full overflow-hidden text-left active:opacity-95"
      style={{
        backgroundColor: CARD_PAPER,
        backgroundImage: CARD_PAPER_BG,
        backgroundSize: '160px 160px, 6px 6px, auto',
        borderRadius: RADIUS,
        border: BORDER,
      }}
      aria-label="打开人生账本"
    >
      <div className="relative flex items-stretch">
        <div className="min-w-0 flex-1 px-4 py-3.5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-2.5">
              <div
                className="size-[36px] shrink-0 overflow-hidden"
                style={{ border: BORDER, borderRadius: 2 }}
                aria-hidden
              >
                <img
                  src={avatarSrc}
                  alt=""
                  className="size-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src =
                      resolveCharacterAvatarUrl({ avatarUrl: DEFAULT_PUBLIC_AVATAR_PATH }) || avatarSrc
                  }}
                />
              </div>
              <div className="min-w-0">
                <p
                  className="text-[15px] font-extrabold uppercase tracking-[0.03em]"
                  style={{ color: CARD.ink }}
                >
                  LIFE DOSSIER
                </p>
                <p className="mt-0.5 text-[10px] tracking-[0.1em]" style={{ color: CARD.mist }}>
                  人生档案本 · 可变现状
                </p>
              </div>
            </div>
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center"
              style={{
                background: CARD.page,
                border: BORDER,
                borderRadius: 2,
              }}
            >
              <ChevronRight className="size-4" style={{ color: CARD.ink }} strokeWidth={2} />
            </div>
          </div>

          <div
            className="mt-3 flex items-end justify-between gap-3 pt-3"
            style={{ borderTop: '1.5px solid #2E271C' }}
          >
            <div>
              <p className="font-mono text-[8px] font-medium tracking-[0.14em]" style={{ color: CARD.mist }}>
                NOW AGE
              </p>
              <p
                className="mt-0.5 text-[20px] font-semibold tabular-nums tracking-tight"
                style={{ color: CARD.ink, ...LUMI_SHELL_NUM_STYLE }}
              >
                {ageText}
              </p>
            </div>
            <div className="min-w-0 flex-1 text-right">
              <p className="truncate text-[11px]" style={{ color: CARD.ink }}>
                {roleText}
              </p>
              <p
                className="mt-0.5 truncate font-mono text-[10px] tabular-nums"
                style={{ color: CARD.mist, ...LUMI_SHELL_NUM_STYLE }}
              >
                {spanText}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Pressable>
  )
}

export function ContactProfileLifeLedgerSheet({
  character,
  playerIdentity,
  onClose,
}: {
  character: Character
  playerIdentity: PlayerIdentity | null
  onClose: () => void
}) {
  return (
    <div
      className="absolute inset-0 z-[40] flex flex-col"
      style={{ background: CARD.bg }}
    >
      <header
        className="relative flex shrink-0 items-center justify-between px-1 pb-2 pt-[max(6px,env(safe-area-inset-top,0px))]"
        style={{
          background: 'rgba(243,236,221,0.96)',
          borderBottom: BORDER,
        }}
      >
        <Pressable
          type="button"
          aria-label="返回资料卡"
          onClick={onClose}
          className="flex h-11 items-center gap-0.5 px-2 active:bg-black/[0.04]"
        >
          <ChevronLeft className="size-5" style={{ color: CARD.ink }} strokeWidth={1.6} />
          <span className="text-[15px] font-medium" style={{ color: CARD.ink }}>
            返回
          </span>
        </Pressable>
        <div className="min-w-0 flex-1 text-center">
          <p className="font-mono text-[9px] font-medium tracking-[0.18em]" style={{ color: CARD.mist }}>
            LIFE DOSSIER
          </p>
          <p className="truncate text-[13px] font-semibold" style={{ color: CARD.ink }}>
            {character.remark?.trim() || character.wechatNickname?.trim() || character.name || '人生档案'}
          </p>
        </div>
        <div className="w-[64px]" aria-hidden />
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-[max(20px,env(safe-area-inset-bottom,0px))] pt-2">
        <LifeMutableEditor
          character={character}
          playerIdentity={playerIdentity}
          variant="passport"
        />
      </div>
    </div>
  )
}
