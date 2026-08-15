import { ThumbsUp } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Pressable } from '../../../../../components/Pressable'
import { resolvePublicImageUrl } from '../../../../../../publicAssetUrl'
import { resolveCharacterAvatarUrl, resolveProfileAvatarPreviewUrl } from '../../../../../utils/characterAvatarUrl'
import { pickStablePulseNetizenAvatarPath } from '../../../../lumiPulse/pulseNetizenAvatar'
import type { ForumPage } from '../types'

function nickLooksLikeCharacter(nick: string, aliases: string[]): boolean {
  const n = nick.trim().toLowerCase()
  if (!n) return false
  for (const raw of aliases) {
    const a = String(raw || '').trim().toLowerCase()
    if (!a) continue
    if (n === a || n.includes(a) || a.includes(n)) return true
  }
  return false
}

function resolveForumAvatarUrl(params: {
  isCharacter?: boolean
  nick: string
  seed: string
  characterAvatarUrl?: string
  characterAliases: string[]
}): string {
  const byFlag = params.isCharacter
  const byNick = nickLooksLikeCharacter(params.nick, params.characterAliases)
  const isChar = byFlag === true || (byFlag !== false && byNick)
  if (isChar) {
    return (
      resolveCharacterAvatarUrl({ avatarUrl: params.characterAvatarUrl }) ||
      resolveProfileAvatarPreviewUrl(params.characterAvatarUrl)
    )
  }
  const path = pickStablePulseNetizenAvatarPath(params.seed || params.nick || 'netizen')
  return resolvePublicImageUrl(path) || path
}

function ForumAvatar({
  src,
  label,
}: {
  src: string
  label: string
}) {
  return (
    <div className="relative z-[1] h-10 w-10 shrink-0 overflow-hidden rounded-full bg-[var(--br-hairline)]">
      {src ? (
        <img src={src} alt={label} className="h-full w-full object-cover" draggable={false} />
      ) : null}
    </div>
  )
}

export function ForumScreen({
  page,
  characterAvatarUrl,
  characterAliases = [],
}: {
  page: ForumPage
  characterAvatarUrl?: string
  characterAliases?: string[]
}) {
  const [likes, setLikes] = useState(() => Object.fromEntries(page.replies.map((r) => [r.id, { n: r.likes, on: !!r.liked }])))

  const opAvatar = useMemo(
    () =>
      resolveForumAvatarUrl({
        isCharacter: page.opIsCharacter,
        nick: page.opNick,
        seed: `${page.id}:op:${page.opNick}`,
        characterAvatarUrl,
        characterAliases,
      }),
    [page.id, page.opIsCharacter, page.opNick, characterAvatarUrl, characterAliases],
  )

  return (
    <div className="browser-scroll h-full overflow-y-auto px-4 pb-28 pt-2">
      <div className="browser-mono text-[12px] text-[var(--br-mist)]">{page.siteName}</div>

      <div className="mt-4 flex gap-3">
        <ForumAvatar src={opAvatar} label={page.opNick} />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="text-[14px] font-medium text-[var(--br-ink)]">{page.opNick}</span>
            {page.opIsCharacter || nickLooksLikeCharacter(page.opNick, characterAliases) ? (
              <span className="rounded-full bg-[var(--br-hairline)] px-1.5 py-0.5 text-[10px] text-[var(--br-mist)]">本人</span>
            ) : null}
            <span className="browser-mono text-[11px] text-[var(--br-mist)]">{page.opTime}</span>
          </div>
          <p className="mt-2 text-[16px] leading-[1.7] text-[var(--br-ink)]">{page.opContent}</p>
        </div>
      </div>

      <div className="mt-6 border-t border-[var(--br-hairline)] pt-4">
        <div className="text-[12px] text-[var(--br-mist)]">回复 {page.replies.length}</div>
        <div className="mt-3 space-y-0">
          {page.replies.map((r) => {
            const st = likes[r.id] ?? { n: r.likes, on: false }
            const isChar = r.isCharacter === true || (r.isCharacter !== false && nickLooksLikeCharacter(r.nick, characterAliases))
            const avatar = resolveForumAvatarUrl({
              isCharacter: r.isCharacter,
              nick: r.nick,
              seed: `${page.id}:r:${r.id}:${r.nick}`,
              characterAvatarUrl,
              characterAliases,
            })
            return (
              <div key={r.id} className="relative flex gap-3 py-4">
                <div className="absolute bottom-0 left-[19px] top-0 w-px bg-[var(--br-hairline)]" aria-hidden />
                <ForumAvatar src={avatar} label={r.nick} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="text-[13px] font-medium text-[var(--br-ink)]">{r.nick}</span>
                    {isChar ? (
                      <span className="rounded-full bg-[var(--br-hairline)] px-1.5 py-0.5 text-[10px] text-[var(--br-mist)]">本人</span>
                    ) : null}
                    <span className="browser-mono text-[11px] text-[var(--br-mist)]">{r.time}</span>
                  </div>
                  <p className="mt-1.5 text-[15px] leading-[1.6] text-[var(--br-ink)]">{r.content}</p>
                  <Pressable
                    type="button"
                    className="mt-2 inline-flex items-center gap-1 text-[var(--br-mist)]"
                    onClick={() =>
                      setLikes((prev) => {
                        const cur = prev[r.id] ?? { n: r.likes, on: false }
                        return {
                          ...prev,
                          [r.id]: cur.on ? { n: cur.n - 1, on: false } : { n: cur.n + 1, on: true },
                        }
                      })
                    }
                  >
                    <ThumbsUp
                      size={13}
                      strokeWidth={1.6}
                      fill={st.on ? 'var(--br-fog)' : 'none'}
                      color={st.on ? 'var(--br-fog)' : 'currentColor'}
                    />
                    <span className="browser-mono text-[11px]" style={{ color: st.on ? 'var(--br-fog)' : undefined }}>
                      {st.n}
                    </span>
                  </Pressable>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
