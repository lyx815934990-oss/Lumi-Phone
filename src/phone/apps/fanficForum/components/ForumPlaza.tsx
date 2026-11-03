import { ChevronRight } from 'lucide-react'

import type { WeChatPersonaContact } from '../../../types'
import { resolveCharacterAvatarUrl } from '../../../utils/characterAvatarUrl'
import { FORUM_COACH_TARGET_ATTR } from '../forumCoach'
import { FORUM, formatForumRelativeTime } from '../forumTheme'
import { personaAvatarResolved } from '../personaAvatar'
import {
  formatWriterFans,
  isResidentWriterId,
  listResidentWriters,
  writerFanCount,
} from '../residentWriters'
import { ForumAvatar, SoftCard } from './ui'

export type ForumFeedItem = {
  postId: string
  characterId: string
  charName: string
  title: string
  authorName: string
  authorPersonaId: string
  kindLabel: string
  commentCount: number
  createdAt: number
}

/** 首页 · 通讯社电讯 */
export function ForumPlaza({
  contacts,
  displayNameById = {},
  hydrated,
  postCount,
  feedItems,
  onOpenCharacter,
  onOpenPost,
  onOpenWriter,
}: {
  contacts: WeChatPersonaContact[]
  displayNameById?: Record<string, string>
  hydrated: boolean
  postCount: (characterId: string) => number
  feedItems: ForumFeedItem[]
  onOpenCharacter: (characterId: string) => void
  onOpenPost: (characterId: string, postId: string) => void
  /** 点驻站写手名进主页 */
  onOpenWriter?: (writerId: string) => void
}) {
  const telegraph = feedItems.slice(0, 12)

  return (
    <div style={{ paddingLeft: FORUM.pagePadX, paddingRight: FORUM.pagePadX, paddingTop: 10 }}>
      {/* 报头 */}
      <div
        className="rounded-md px-3 py-2.5"
        style={{ backgroundColor: FORUM.masthead }}
        {...{ [FORUM_COACH_TARGET_ATTR]: 'forum-masthead' }}
      >
        <p className="font-semibold tracking-wide" style={{ fontSize: 13, color: FORUM.surface2 }}>
          同人通讯社
        </p>
        <p style={{ fontSize: 10, color: 'rgba(255,253,246,0.55)', marginTop: 2 }}>
          号外头条 · 今日电讯
        </p>
      </div>

      {/* 今日电讯 */}
      <section style={{ marginTop: FORUM.sectionGap }} {...{ [FORUM_COACH_TARGET_ATTR]: 'forum-feed' }}>
        <div className="mb-2 flex items-center gap-1.5">
          <div className="h-3 w-0.5 rounded-sm" style={{ backgroundColor: FORUM.masthead }} />
          <h2 className="font-semibold" style={{ fontSize: 12, color: FORUM.text }}>
            今日电讯
          </h2>
          <span style={{ fontSize: 10, color: FORUM.textMuted }}>网友同人文</span>
        </div>

        {!hydrated ? (
          <p style={{ fontSize: FORUM.font.body, color: FORUM.textMuted, paddingTop: 12 }}>加载中…</p>
        ) : telegraph.length === 0 ? (
          <p style={{ fontSize: FORUM.font.body, color: FORUM.textMuted, paddingTop: 12, lineHeight: 1.7 }}>
            还没有电讯。点左下角「投稿」，或去探索找大咖写手代笔。
          </p>
        ) : (
          <ul>
            {telegraph.map((it, i) => {
              const writerId = isResidentWriterId(it.authorPersonaId) ? it.authorPersonaId : null
              return (
                <li key={`${it.characterId}:${it.postId}`}>
                  <div
                    className="flex w-full gap-2 border-b py-2.5 text-left"
                    style={{
                      borderColor: FORUM.hairline,
                      backgroundColor: i === 0 ? FORUM.bgAccent : 'transparent',
                      paddingLeft: i === 0 ? 6 : 0,
                      paddingRight: i === 0 ? 6 : 0,
                      borderRadius: i === 0 ? 6 : 0,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => onOpenPost(it.characterId, it.postId)}
                      className="flex min-w-0 flex-1 gap-2 text-left active:opacity-75"
                    >
                      <span
                        className="w-7 shrink-0 font-semibold tabular-nums"
                        style={{ fontSize: 11, color: FORUM.accent }}
                      >
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold" style={{ fontSize: 12.5, color: FORUM.text }}>
                          {it.title}
                        </p>
                        <p style={{ fontSize: 10.5, color: FORUM.textMuted, marginTop: 2 }}>
                          {it.kindLabel}
                          {it.commentCount > 0 ? ` · 评 ${it.commentCount}` : ''}
                        </p>
                      </div>
                    </button>
                    {writerId && onOpenWriter ? (
                      <button
                        type="button"
                        onClick={() => onOpenWriter(writerId)}
                        className="shrink-0 self-center rounded-full px-2 py-1 active:opacity-80"
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: FORUM.accent,
                          backgroundColor: FORUM.surface2,
                          border: `1px solid ${FORUM.accent}44`,
                        }}
                      >
                        驻站 {it.authorName}
                      </button>
                    ) : (
                      <span
                        className="shrink-0 self-center px-1"
                        style={{ fontSize: 10, color: FORUM.textMuted }}
                      >
                        {it.authorName}
                      </span>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {/* 本命角色区（通讯录） */}
      <section style={{ marginTop: 22 }}>
        <div className="mb-2.5 flex items-center gap-1.5">
          <div className="h-3 w-0.5 rounded-sm" style={{ backgroundColor: FORUM.accent }} />
          <h2 className="font-semibold" style={{ fontSize: 12, color: FORUM.text }}>
            本命角色区
          </h2>
          <span style={{ fontSize: 10, color: FORUM.textMuted }}>通讯录</span>
        </div>
        {!hydrated ? null : contacts.length === 0 ? (
          <p style={{ fontSize: FORUM.font.body, color: FORUM.textMuted, lineHeight: 1.7 }}>
            通讯录暂无角色。可先去探索点大咖写手，或投稿搜索原作角色写一篇。
          </p>
        ) : (
          <ul className="flex flex-col" style={{ gap: FORUM.cardGap }}>
            {contacts.slice(0, 8).map((c) => {
              const cid = c.characterId.trim()
              const name = displayNameById[cid]?.trim() || c.remarkName.trim() || '未命名'
              const count = postCount(cid)
              const avatar = resolveCharacterAvatarUrl({ avatarUrl: c.avatarUrl })
              return (
                <li key={cid}>
                  <SoftCard onClick={() => onOpenCharacter(cid)} paddingY={12}>
                    <div className="flex items-center gap-3">
                      <ForumAvatar size={40} name={name} imageUrl={avatar} seed={cid} />
                      <div className="min-w-0 flex-1">
                        <p
                          className="truncate font-medium"
                          style={{ fontSize: FORUM.font.cardTitle, color: FORUM.text }}
                        >
                          {name}
                        </p>
                        <p style={{ fontSize: FORUM.font.meta, color: FORUM.textMuted, marginTop: 2 }}>
                          {count > 0 ? `${count} 篇同人文` : '暂无帖子'}
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
      </section>
      <div className="h-6" />
    </div>
  )
}

const EXPLORE_TOPICS = ['本命向', 'BE美学', '甜而不腻', '白描', '雨天', '车站', '接单中', '选角同人']

/** 探索 · 大咖写手 + 话题 + 精选 */
export function ForumDiscoverFeed({
  items,
  onOpenPost,
  onOpenWriter,
}: {
  items: ForumFeedItem[]
  onOpenPost: (characterId: string, postId: string) => void
  onOpenWriter: (writerId: string) => void
}) {
  const writers = listResidentWriters()

  return (
    <div style={{ paddingLeft: FORUM.pagePadX, paddingRight: FORUM.pagePadX, paddingTop: 10 }}>
      <p
        className="font-semibold tracking-[0.12em]"
        style={{ fontSize: 10, color: FORUM.accent }}
      >
        EXPLORE
      </p>
      <h1 className="font-semibold" style={{ fontSize: FORUM.font.pageTitle, color: FORUM.text, marginTop: 2 }}>
        探索
      </h1>
      <p className="mt-1" style={{ fontSize: 12.5, color: FORUM.textSecondary, lineHeight: 1.55 }}>
        大咖写手 · 话题 · 精选电讯
      </p>

      <div
        className="mt-3 rounded-[10px] px-3 py-2.5"
        style={{ backgroundColor: FORUM.bgAccent, color: FORUM.textMuted, fontSize: 12 }}
      >
        搜索写手 / 标题 / 标签…
      </div>

      <section style={{ marginTop: 16 }}>
        <div className="mb-2 flex items-center gap-1.5">
          <div className="h-3 w-0.5 rounded-sm" style={{ backgroundColor: FORUM.accent }} />
          <h2 className="font-semibold" style={{ fontSize: 12, color: FORUM.text }}>
            大咖写手
          </h2>
          <span style={{ fontSize: 10, color: FORUM.textMuted }}>专栏驻站</span>
        </div>
        <div
          className="flex gap-2.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{
            marginLeft: -FORUM.pagePadX,
            marginRight: -FORUM.pagePadX,
            paddingLeft: FORUM.pagePadX,
            paddingRight: FORUM.pagePadX,
          }}
        >
          {writers.map((w) => {
            const avatar = personaAvatarResolved(w.id, w.username)
            return (
              <button
                key={w.id}
                type="button"
                onClick={() => onOpenWriter(w.id)}
                className="flex w-[78px] shrink-0 flex-col items-center gap-1 rounded-xl px-1.5 py-2.5 active:opacity-75"
                style={{
                  backgroundColor: FORUM.surface2,
                  border: `1px solid ${FORUM.hairline}`,
                }}
              >
                <ForumAvatar size={44} name={w.username} imageUrl={avatar} seed={w.id} />
                <span
                  className="w-full truncate text-center font-semibold"
                  style={{ fontSize: 10, color: FORUM.text }}
                >
                  {w.username}
                </span>
                <span
                  className="w-full truncate text-center"
                  style={{ fontSize: 9, color: FORUM.textMuted }}
                >
                  {w.specialties[0] ?? '写手'}
                </span>
                <span className="font-semibold" style={{ fontSize: 9, color: FORUM.accent }}>
                  {formatWriterFans(writerFanCount(w.id))} 粉
                </span>
              </button>
            )
          })}
        </div>
      </section>

      <section style={{ marginTop: 16 }}>
        <div className="mb-2 flex items-center gap-1.5">
          <div className="h-3 w-0.5 rounded-sm" style={{ backgroundColor: FORUM.masthead }} />
          <h2 className="font-semibold" style={{ fontSize: 12, color: FORUM.text }}>
            热门话题
          </h2>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {EXPLORE_TOPICS.map((t) => (
            <span
              key={t}
              className="rounded-full px-2.5 py-1"
              style={{
                fontSize: 11,
                color: FORUM.textAccent,
                backgroundColor: FORUM.bgAccent,
                border: `1px solid ${FORUM.hairline}`,
              }}
            >
              {t}
            </span>
          ))}
        </div>
      </section>

      <section style={{ marginTop: 16 }}>
        <div className="mb-2 flex items-center gap-1.5">
          <div className="h-3 w-0.5 rounded-sm" style={{ backgroundColor: FORUM.accent }} />
          <h2 className="font-semibold" style={{ fontSize: 12, color: FORUM.text }}>
            精选发现
          </h2>
        </div>
        {items.length === 0 ? (
          <p style={{ fontSize: FORUM.font.body, color: FORUM.textMuted, paddingTop: 8, lineHeight: 1.7 }}>
            还没有帖子。点大咖写手，让 TA 用笔触写一篇。
          </p>
        ) : (
          <ul className="flex flex-col" style={{ gap: FORUM.cardGap }}>
            {items.map((it) => {
              const writerId = isResidentWriterId(it.authorPersonaId) ? it.authorPersonaId : null
              return (
                <li key={`${it.characterId}:${it.postId}`}>
                  <SoftCard onClick={() => onOpenPost(it.characterId, it.postId)}>
                    <p className="font-medium" style={{ fontSize: 14, color: FORUM.text }}>
                      {it.title}
                    </p>
                    <div
                      className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-1"
                      style={{ fontSize: 12, color: FORUM.textMuted }}
                    >
                      <span>{it.charName}</span>
                      <span>·</span>
                      {writerId ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            onOpenWriter(writerId)
                          }}
                          className="font-semibold active:opacity-80"
                          style={{ color: FORUM.accent }}
                        >
                          {it.authorName}
                        </button>
                      ) : (
                        <span>{it.authorName}</span>
                      )}
                      <span>·</span>
                      <span>{it.kindLabel}</span>
                      <span>·</span>
                      <span>评 {it.commentCount}</span>
                      {it.createdAt ? (
                        <>
                          <span>·</span>
                          <span>{formatForumRelativeTime(it.createdAt)}</span>
                        </>
                      ) : null}
                    </div>
                  </SoftCard>
                </li>
              )
            })}
          </ul>
        )}
      </section>
      <div className="h-6" />
    </div>
  )
}
