import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useState } from 'react'

import { Pressable } from '../../components/Pressable'
import {
  LUMI_SHELL,
  LUMI_SHELL_NUM_STYLE,
} from './lumiShellTheme'
import { personaDb } from './newFriendsPersona/idb'
import type { Character, PlayerIdentity } from './newFriendsPersona/types'
import { computeCurrentAge, emptyLifeMutableSheet, resolveLifeClock } from './lifeMutable/compute'
import { loadCharacterStorySpan } from './lifeMutable/load'
import { LifeMutableEditor } from './lifeMutable/LifeMutableEditor'

const CARD = {
  paper: '#FAFAFA',
  inkSoft: '#2A2A2A',
  line: 'rgba(16,16,18,0.1)',
} as const

/**
 * 资料卡上的「人生账本」入口：通行证风格，展示本线当前年龄与时间跨度。
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
        })
      } catch {
        if (!cancelled) {
          setPreview({
            currentAge: character.age,
            startDay: null,
            nowDay: null,
            occupation: character.identity?.trim() || '',
          })
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [character.id, character.age, character.birthdayMD, character.identity, playerIdentityId])

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

  return (
    <Pressable
      type="button"
      onClick={onOpen}
      className="group relative mt-3 w-full overflow-hidden text-left active:opacity-95"
      style={{
        background: CARD.paper,
        borderRadius: 18,
        border: `1px solid ${CARD.line}`,
        boxShadow: '0 10px 28px rgba(16,16,18,0.05)',
      }}
      aria-label="打开人生账本"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.55]"
        style={{
          background:
            'linear-gradient(135deg, rgba(212,175,55,0.09) 0%, transparent 42%, rgba(16,16,18,0.03) 100%)',
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-6 -top-8 h-24 w-24 rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(212,175,55,0.18) 0%, transparent 70%)',
        }}
        aria-hidden
      />

      <div className="relative flex items-stretch">
        <div
          className="flex w-[4px] shrink-0 flex-col justify-center"
          style={{ background: 'linear-gradient(180deg, #D4AF37 0%, #1A1A1A 100%)' }}
          aria-hidden
        />
        <div className="min-w-0 flex-1 px-4 py-3.5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[9px] font-semibold tracking-[0.22em]" style={{ color: LUMI_SHELL.mist }}>
                04 · LIFE DOSSIER
              </p>
              <p className="mt-1 text-[15px] font-semibold tracking-tight" style={{ color: LUMI_SHELL.ink }}>
                人生档案本
              </p>
              <p className="mt-0.5 text-[11px] leading-relaxed" style={{ color: 'rgba(16,16,18,0.48)' }}>
                本角色线可变人生 · 每轮注入 · 与世界书同级
              </p>
            </div>
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
              style={{
                background: '#1A1A1A',
                boxShadow: '0 6px 14px rgba(16,16,18,0.18)',
              }}
            >
              <ChevronRight className="size-4 text-white" strokeWidth={2} />
            </div>
          </div>

          <div
            className="mt-3 flex items-end justify-between gap-3 border-t pt-3"
            style={{ borderColor: CARD.line }}
          >
            <div>
              <p className="text-[8px] font-medium tracking-[0.14em]" style={{ color: LUMI_SHELL.mist }}>
                NOW AGE
              </p>
              <p
                className="mt-0.5 text-[20px] font-semibold tabular-nums tracking-tight"
                style={{ color: CARD.inkSoft, ...LUMI_SHELL_NUM_STYLE }}
              >
                {ageText}
              </p>
            </div>
            <div className="min-w-0 flex-1 text-right">
              <p className="truncate text-[11px]" style={{ color: CARD.inkSoft }}>
                {roleText}
              </p>
              <p
                className="mt-0.5 truncate text-[10px] tabular-nums"
                style={{ color: LUMI_SHELL.mist, ...LUMI_SHELL_NUM_STYLE }}
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
      style={{
        background: '#E8DCC8',
        backgroundImage:
          'radial-gradient(rgba(90,70,40,0.08) 0.8px, transparent 0.8px)',
        backgroundSize: '16px 16px',
      }}
    >
      <header
        className="relative flex shrink-0 items-center justify-between px-1 pb-2 pt-[max(6px,env(safe-area-inset-top,0px))]"
        style={{
          background: 'linear-gradient(180deg, rgba(244,237,224,0.96) 0%, rgba(232,220,200,0.7) 100%)',
        }}
      >
        <Pressable
          type="button"
          aria-label="返回资料卡"
          onClick={onClose}
          className="flex h-11 items-center gap-0.5 rounded-full px-2 active:bg-black/[0.04]"
        >
          <ChevronLeft className="size-5" style={{ color: LUMI_SHELL.ink }} strokeWidth={1.6} />
          <span className="text-[15px] font-medium" style={{ color: LUMI_SHELL.ink }}>
            返回
          </span>
        </Pressable>
        <div className="min-w-0 flex-1 text-center">
          <p className="font-mono text-[9px] font-medium tracking-[0.22em]" style={{ color: '#8B2E2E' }}>
            LIFE DOSSIER
          </p>
          <p className="truncate text-[13px] font-semibold" style={{ color: LUMI_SHELL.ink }}>
            {character.remark?.trim() || character.wechatNickname?.trim() || character.name || '人生档案'}
          </p>
        </div>
        <div className="w-[64px]" aria-hidden />
        <div
          className="pointer-events-none absolute inset-x-8 bottom-0 h-px"
          style={{
            background: 'linear-gradient(90deg, transparent, #8B2E2E 50%, transparent)',
          }}
          aria-hidden
        />
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
