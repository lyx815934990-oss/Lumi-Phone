import { ChevronRight } from 'lucide-react'

import { Pressable } from '../../../components/Pressable'
import { FORUM } from '../forumTheme'
import { useForumSocialStore } from '../forumSocialStore'
import { personaAvatarResolved } from '../personaAvatar'
import { getResidentWriter, listResidentWriters } from '../residentWriters'
import { ForumAvatar, SoftCard } from './ui'

/** Zustand 选择器勿 `?? []`：每次新引用会 Maximum update depth */
const EMPTY_FOLLOWING_IDS: readonly string[] = Object.freeze([])

/** 个人中心 · 已关注的大咖写手列表 */
export function ForumFollowingList({
  onBack,
  onOpenWriter,
}: {
  onBack: () => void
  onOpenWriter: (writerId: string) => void
}) {
  const followingIds = useForumSocialStore((s) => {
    const acc = s.currentAccountId
    if (!acc) return EMPTY_FOLLOWING_IDS
    return s.root.byAccount[acc]?.followingWriterIds ?? EMPTY_FOLLOWING_IDS
  })

  const writers = followingIds
    .map((id) => getResidentWriter(id))
    .filter((w): w is NonNullable<typeof w> => !!w)

  const fallback = writers.length === 0 ? listResidentWriters().slice(0, 0) : writers

  return (
    <div className="flex h-full min-h-0 flex-col" style={{ backgroundColor: FORUM.surface1 }}>
      <div
        className="shrink-0 border-b px-[19px] pb-3"
        style={{
          paddingTop: `calc(${FORUM.headerPadTop} + 4px)`,
          borderColor: FORUM.hairline,
          backgroundColor: FORUM.surface2,
        }}
      >
        <div className="flex items-center gap-2">
          <Pressable
            type="button"
            onClick={onBack}
            className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
            style={{
              border: `1px solid ${FORUM.hairline}`,
              backgroundColor: FORUM.bgAccent,
              color: FORUM.text,
            }}
          >
            返回
          </Pressable>
          <div className="min-w-0 flex-1">
            <p className="font-semibold tracking-[0.12em]" style={{ fontSize: 10, color: FORUM.accent }}>
              关注列表
            </p>
            <p className="font-semibold" style={{ fontSize: 16, color: FORUM.text, marginTop: 2 }}>
              大咖写手 · {fallback.length}
            </p>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-[19px] py-3 [scrollbar-width:none]">
        {fallback.length === 0 ? (
          <p style={{ fontSize: 13.5, color: FORUM.textMuted, lineHeight: 1.7, paddingTop: 24 }}>
            还没有关注写手。去探索点大咖头像或主页「关注」。
          </p>
        ) : (
          <ul className="flex flex-col" style={{ gap: FORUM.cardGap }}>
            {fallback.map((w) => {
              const avatar = personaAvatarResolved(w.id, w.username)
              return (
                <li key={w.id}>
                  <SoftCard onClick={() => onOpenWriter(w.id)} paddingY={13}>
                    <div className="flex items-center gap-3">
                      <ForumAvatar size={44} name={w.username} imageUrl={avatar} seed={w.id} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold" style={{ fontSize: 14, color: FORUM.text }}>
                          {w.username}
                        </p>
                        <p className="truncate" style={{ fontSize: 11.5, color: FORUM.textAccent, marginTop: 2 }}>
                          {w.tagline}
                        </p>
                        <p className="truncate" style={{ fontSize: 11, color: FORUM.textMuted, marginTop: 2 }}>
                          {w.specialties.slice(0, 3).join(' · ') || '驻站写手'}
                        </p>
                      </div>
                      <ChevronRight className="size-4 shrink-0" strokeWidth={1.75} color={FORUM.textMuted} />
                    </div>
                  </SoftCard>
                </li>
              )
            })}
          </ul>
        )}
        <div className="h-6" />
      </div>
    </div>
  )
}
