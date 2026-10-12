import { useMemo, useState } from 'react'

import type { WeChatPersonaContact } from '../../../types'
import { resolveCharacterAvatarUrl } from '../../../utils/characterAvatarUrl'
import { FORUM, forumKindLabel } from '../forumTheme'
import { getNetizenPersona } from '../netizenPersonas'
import type { ForumPost } from '../forumTypes'
import { ForumAvatar, SoftCard, StatRow } from './ui'

export function ForumCharProfile({
  contact,
  displayName,
  posts,
  commentCountFor,
  onBack,
  onOpenPost,
}: {
  contact: WeChatPersonaContact
  /** 优先真实姓名；缺省回退通讯录备注 */
  displayName?: string
  posts: ForumPost[]
  commentCountFor: (postId: string) => number
  onBack: () => void
  onOpenPost: (postId: string) => void
}) {
  const [tab, setTab] = useState<'ship' | 'custom'>('ship')
  const name = displayName?.trim() || contact.remarkName.trim() || '未命名'
  const cid = contact.characterId.trim()
  const avatar = resolveCharacterAvatarUrl({ avatarUrl: contact.avatarUrl })

  const filtered = useMemo(
    () => posts.filter((p) => (tab === 'ship' ? p.kind === 'ship' : p.kind === 'custom')),
    [posts, tab],
  )

  const shipCount = posts.filter((p) => p.kind === 'ship').length
  const customCount = posts.filter((p) => p.kind === 'custom').length
  const interaction = posts.reduce((n, p) => n + commentCountFor(p.id), 0)

  return (
    <div className="min-h-full" style={{ backgroundColor: FORUM.surface1 }}>
      {/* 顶部色块封面 */}
      <div
        className="relative"
        style={{
          height: 88,
          paddingTop: FORUM.safeTop,
          background: `linear-gradient(135deg, ${FORUM.coverFrom} 0%, ${FORUM.coverTo} 100%)`,
          boxSizing: 'content-box',
        }}
      >
        <button
          type="button"
          onClick={onBack}
          className="absolute left-3 z-10 rounded-full px-2.5 py-1 text-[12px] font-medium active:opacity-70"
          style={{
            top: `calc(${FORUM.safeTop} + 10px)`,
            backgroundColor: 'rgba(246,244,241,0.72)',
            color: FORUM.text,
          }}
        >
          返回
        </button>
      </div>

      {/* 头像叠在封面下方 */}
      <div style={{ paddingLeft: FORUM.pagePadX, paddingRight: FORUM.pagePadX }}>
        <div style={{ marginTop: -36 }}>
          <ForumAvatar
            size={FORUM.avatar.profile}
            name={name}
            imageUrl={avatar}
            seed={cid}
            borderWidth={4}
            borderColor={FORUM.surface1}
          />
        </div>

        <h1
          className="font-semibold"
          style={{ fontSize: FORUM.font.profileName, color: FORUM.text, marginTop: 10 }}
        >
          {name}
        </h1>
        <p style={{ fontSize: 12.5, color: FORUM.textMuted, marginTop: 3, lineHeight: 1.5 }}>
          {name} × 你 · 同人创作专区
        </p>

        <StatRow
          className="mt-[14px]"
          items={[
            { value: posts.length, label: '帖子' },
            { value: interaction, label: '互动' },
          ]}
        />

        {/* Tab */}
        <div className="mt-5 flex items-center" style={{ gap: 22 }}>
          <ProfileTab
            label={`本命同人文${shipCount ? ` ${shipCount}` : ''}`}
            active={tab === 'ship'}
            onClick={() => setTab('ship')}
          />
          <ProfileTab
            label={`自定义请求${customCount ? ` ${customCount}` : ''}`}
            active={tab === 'custom'}
            onClick={() => setTab('custom')}
          />
        </div>

        <div className="mt-3 flex flex-col pb-8" style={{ gap: FORUM.cardGap }}>
          {filtered.length === 0 ? (
            <p style={{ fontSize: FORUM.font.body, color: FORUM.textMuted, paddingTop: 20, lineHeight: 1.7 }}>
              {tab === 'ship' ? '还没有本命同人文。点底部 + 生成一篇。' : '还没有自定义请求帖。'}
            </p>
          ) : (
            filtered.map((p) => {
              const author = getNetizenPersona(p.authorPersonaId)
              const authorName = author?.username ?? '网友'
              const comments = commentCountFor(p.id)
              return (
                <SoftCard key={p.id} onClick={() => onOpenPost(p.id)}>
                  <p className="font-medium" style={{ fontSize: 14, color: FORUM.text }}>
                    {p.title}
                  </p>
                  <p style={{ fontSize: 12, color: FORUM.textMuted, marginTop: 4 }}>
                    {authorName} · 评 {comments} · {forumKindLabel(p.kind)}
                  </p>
                </SoftCard>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

function ProfileTab({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button type="button" onClick={onClick} className="relative pb-2">
      <span
        className="font-medium"
        style={{
          fontSize: FORUM.font.tab,
          color: active ? FORUM.textAccent : FORUM.textMuted,
        }}
      >
        {label}
      </span>
      {active ? (
        <span
          className="absolute bottom-0 left-0 right-0"
          style={{ height: 2, backgroundColor: FORUM.accent, borderRadius: 1 }}
        />
      ) : null}
    </button>
  )
}
