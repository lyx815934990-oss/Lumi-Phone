import { CalendarHeart, ChevronRight, Clock } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { personaDb } from '../newFriendsPersona/idb'
import { resolveCharacterAvatarUrl } from '../../../utils/characterAvatarUrl'
import {
  LUMI_LIQUID_NAV_CONTENT_PAD_BOTTOM,
  LUMI_SHELL,
  LUMI_SHELL_FONT,
  LUMI_SHELL_NUM_FONT,
  LUMI_THREAD_CAPSULE,
  lumiThreadCapsuleStyle,
} from '../lumiShellTheme'
import { useDating } from './DatingContext'

/** 列表副标题：与简介/签名存库一致，展开 {{id:…}} / {{user}} 等为可读名 */
function DatingListSignatureLine({ characterId, text }: { characterId: string; text: string }) {
  const raw = String(text ?? '')
  const [display, setDisplay] = useState(raw)
  useEffect(() => {
    if (!raw.includes('{{') || !characterId.trim()) {
      setDisplay(raw)
      return
    }
    let cancelled = false
    void personaDb.expandCharacterFieldPlaceholderPreview(raw, characterId).then((out) => {
      if (!cancelled) setDisplay((out ?? raw).trim() || raw)
    })
    return () => {
      cancelled = true
    }
  }, [characterId, raw])
  return (
    <p className="line-clamp-1 text-[13px]" style={{ color: LUMI_SHELL.mist }}>
      {display}
    </p>
  )
}

type Props = {
  onEnterStory: () => void
  /** 无可用角色时：跳转「角色人设」管理页 */
  onOpenPersonaManager?: () => void
}

const softCard = {
  background: LUMI_SHELL.card,
  borderRadius: LUMI_SHELL.cardRadiusPx,
  border: `1px solid ${LUMI_SHELL.hairline}`,
  boxShadow: '0 8px 28px rgba(16,16,18,0.045)',
} as const

export function DatingRoleSelectPage({ onEnterStory, onOpenPersonaManager }: Props) {
  const { characters, allArchives, setCurrentCharacterId } = useDating()

  const lastPlayed = useMemo(() => {
    return characters
      .map((c) => ({ c, t: allArchives[c.id]?.lastDateAt ?? 0 }))
      .sort((a, b) => b.t - a.t)[0]
  }, [allArchives, characters])

  const hasCharacters = characters.length > 0

  return (
    <div
      className="h-full min-h-0 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      style={{ fontFamily: LUMI_SHELL_FONT, paddingBottom: LUMI_LIQUID_NAV_CONTENT_PAD_BOTTOM }}
    >
      <div className="mx-auto flex w-full max-w-[520px] flex-col px-4 pt-3" style={{ gap: 20 }}>
        <div className="flex items-start justify-between gap-3 px-0.5">
          <div className="min-w-0">
            <p
              className="text-[22px] font-semibold tracking-tight"
              style={{ color: LUMI_SHELL.ink, letterSpacing: '-0.02em' }}
            >
              约会
            </p>
            <p className="mt-1 text-[13px] leading-relaxed" style={{ color: LUMI_SHELL.mist }}>
              选择角色，开启线下剧情
            </p>
          </div>
          <button
            type="button"
            className="flex size-9 shrink-0 items-center justify-center rounded-full transition-colors"
            style={{ color: LUMI_SHELL.mist, background: 'rgba(16,16,18,0.04)' }}
            aria-label="最近"
          >
            <Clock className="size-4" strokeWidth={1.7} />
          </button>
        </div>

        {lastPlayed?.t ? (
          <section aria-label="继续上次约会">
            <div
              className="px-1 pb-2.5 pt-0.5 text-[11px] font-semibold tracking-[0.08em]"
              style={{ color: LUMI_SHELL.mist }}
            >
              继续上次
            </div>
            <button
              type="button"
              onClick={() => {
                setCurrentCharacterId(lastPlayed.c.id)
                onEnterStory()
              }}
              className="relative flex w-full items-center gap-3 overflow-hidden px-4 py-4 text-left transition-transform active:scale-[0.992]"
              style={softCard}
            >
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    'radial-gradient(120% 80% at 0% 0%, rgba(16,16,18,0.035) 0%, transparent 55%)',
                }}
              />
              <img
                src={resolveCharacterAvatarUrl({ avatarUrl: lastPlayed.c.avatarUrl })}
                alt=""
                className="relative h-[56px] w-[56px] shrink-0 rounded-full object-cover"
                style={{
                  border: `1px solid ${LUMI_SHELL.hairline}`,
                  boxShadow: '0 4px 14px rgba(16,16,18,0.08)',
                }}
              />
              <div className="relative min-w-0 flex-1 text-left">
                <p className="truncate text-[15px] font-semibold" style={{ color: LUMI_SHELL.ink }}>
                  {lastPlayed.c.realName}
                </p>
                <p className="mt-1 text-[12px]" style={{ color: LUMI_SHELL.mist }}>
                  上次约会：
                  <span
                    className="ml-0.5 tabular-nums"
                    style={{ fontFamily: LUMI_SHELL_NUM_FONT }}
                  >
                    {new Date(lastPlayed.t).toLocaleString('zh-CN', { hour12: false })}
                  </span>
                </p>
              </div>
              <span
                className="relative ml-auto flex shrink-0 items-center gap-0.5 text-[13px] font-medium"
                style={{ color: LUMI_SHELL.mist }}
              >
                继续
                <ChevronRight className="size-4" />
              </span>
            </button>
          </section>
        ) : null}

        {hasCharacters ? (
          <section aria-label="可约会角色">
            <div
              className="px-1 pb-2.5 pt-0.5 text-[11px] font-semibold tracking-[0.08em]"
              style={{ color: LUMI_SHELL.mist }}
            >
              角色
            </div>
            <div className="flex flex-col" style={{ gap: LUMI_THREAD_CAPSULE.gapPx }}>
              {characters.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setCurrentCharacterId(c.id)
                    onEnterStory()
                  }}
                  className="flex w-full items-center gap-3 px-3.5 py-3 text-left transition-transform active:scale-[0.992]"
                  style={lumiThreadCapsuleStyle()}
                >
                  <img
                    src={resolveCharacterAvatarUrl({ avatarUrl: c.avatarUrl })}
                    alt=""
                    className="h-[48px] w-[48px] shrink-0 rounded-full object-cover"
                    style={{
                      border: `1px solid ${LUMI_SHELL.hairline}`,
                      boxShadow: '0 1px 3px rgba(16,16,18,0.04)',
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-semibold" style={{ color: LUMI_SHELL.ink }}>
                      {c.realName}
                    </p>
                    <DatingListSignatureLine characterId={c.id} text={c.signature} />
                  </div>
                  <ChevronRight className="size-4 shrink-0" style={{ color: LUMI_SHELL.mist }} />
                </button>
              ))}
            </div>
          </section>
        ) : (
          <div className="flex min-h-[50vh] flex-col items-center justify-center px-6 text-center">
            <span
              className="flex size-14 items-center justify-center rounded-full"
              style={{ background: 'rgba(16,16,18,0.04)' }}
            >
              <CalendarHeart className="size-7" strokeWidth={1.7} style={{ color: LUMI_SHELL.mist }} />
            </span>
            <p className="mt-4 text-[15px] font-medium" style={{ color: LUMI_SHELL.ink }}>
              暂无可约会的角色
            </p>
            <p className="mt-2 text-[13px] leading-relaxed" style={{ color: LUMI_SHELL.mist }}>
              创建角色人设后，即可开启专属约会剧情
            </p>
            <button
              type="button"
              onClick={() => onOpenPersonaManager?.()}
              className="mt-5 rounded-full px-6 py-2.5 text-[13px] font-medium text-white"
              style={{ background: LUMI_SHELL.ink }}
            >
              创建角色
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
