import { useState } from 'react'
import { Heart, MessageCircle, Send } from 'lucide-react'

import { Pressable } from '../../../components/Pressable'
import { FORUM } from '../forumTheme'
import { getForumNotifItem } from '../forumDmSample'
import { getNetizenPersona } from '../netizenPersonas'
import { personaAvatarResolved } from '../personaAvatar'
import { getResidentWriter, isResidentWriterId } from '../residentWriters'
import { ForumAvatar } from './ui'

function resolvePerson(id: string) {
  const writer = getResidentWriter(id)
  if (writer) {
    return {
      id: writer.id,
      name: writer.username,
      imageUrl: personaAvatarResolved(writer.id, writer.username),
      isWriter: true as const,
    }
  }
  const nz = getNetizenPersona(id)
  return {
    id,
    name: nz?.username ?? '网友',
    imageUrl: personaAvatarResolved(id, nz?.username ?? '网友'),
    isWriter: false as const,
  }
}

function kindLabel(kind: 'reply' | 'like' | 'comment') {
  if (kind === 'like') return '点赞'
  if (kind === 'reply') return '回复'
  return '评论'
}

export function ForumNotifDetail({
  notifId,
  selfName,
  onBack,
  onOpenWriter,
  onOpenPost,
}: {
  notifId: string
  selfName: string
  onBack: () => void
  onOpenWriter?: (writerId: string) => void
  /** 有对应帖时可点电讯原文进帖 */
  onOpenPost?: () => void
}) {
  const item = getForumNotifItem(notifId)
  const [draft, setDraft] = useState('')
  const [sent, setSent] = useState<string[]>([])

  if (!item) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-6" style={{ backgroundColor: FORUM.surface1 }}>
        <p style={{ fontSize: 13.5, color: FORUM.textMuted }}>通知不存在</p>
        <Pressable
          type="button"
          onClick={onBack}
          className="rounded-full px-4 py-2 text-[13px] font-medium"
          style={{ backgroundColor: FORUM.bgAccent, color: FORUM.text }}
        >
          返回
        </Pressable>
      </div>
    )
  }

  const from = resolvePerson(item.fromId)
  const you = selfName.trim() || '我'
  const canOpenWriter = from.isWriter && isResidentWriterId(from.id) && !!onOpenWriter

  const send = () => {
    const t = draft.trim()
    if (!t) return
    setSent((prev) => [...prev, t])
    setDraft('')
  }

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
              互动详情
            </p>
            <p className="truncate font-semibold" style={{ fontSize: 15, color: FORUM.text, marginTop: 2 }}>
              {kindLabel(item.kind)} · 《{item.postTitle}》
            </p>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-[19px] py-3 [scrollbar-width:none]">
        {/* 帖子摘要：可进原帖 */}
        <button
          type="button"
          disabled={!onOpenPost}
          onClick={() => onOpenPost?.()}
          className="w-full rounded-[12px] px-3.5 py-3 text-left disabled:cursor-default active:opacity-90"
          style={{
            backgroundColor: FORUM.masthead,
          }}
        >
          <p style={{ fontSize: 10, color: 'rgba(255,253,246,0.55)', letterSpacing: '0.08em' }}>
            电讯原文{onOpenPost ? ' · 点此查看帖子' : ''}
          </p>
          <p className="mt-1 font-semibold" style={{ fontSize: 14, color: FORUM.surface2 }}>
            《{item.postTitle}》
          </p>
          <p className="mt-2" style={{ fontSize: 12.5, color: 'rgba(255,253,246,0.78)', lineHeight: 1.6 }}>
            {item.postExcerpt}
          </p>
        </button>

        {/* 互动链 */}
        <div className="mt-4">
          <div className="mb-2 flex items-center gap-1.5">
            <div className="h-3 w-0.5 rounded-sm" style={{ backgroundColor: FORUM.accent }} />
            <h2 className="font-semibold" style={{ fontSize: 12, color: FORUM.text }}>
              评论互动
            </h2>
          </div>

          {item.yourComment ? (
            <div
              className="mb-2.5 rounded-[12px] px-3 py-2.5"
              style={{
                backgroundColor: FORUM.surface2,
                border: `1px solid ${FORUM.hairline}`,
              }}
            >
              <div className="flex items-center gap-2">
                <ForumAvatar size={28} name={you} seed={`me:${you}`} />
                <div className="min-w-0">
                  <p className="font-semibold" style={{ fontSize: 12, color: FORUM.text }}>
                    {you}
                    <span style={{ fontSize: 10, color: FORUM.textMuted, fontWeight: 500 }}> · 你</span>
                  </p>
                </div>
              </div>
              <p className="mt-2" style={{ fontSize: 13, color: FORUM.text, lineHeight: 1.55 }}>
                {item.yourComment}
              </p>
            </div>
          ) : null}

          <div
            className="rounded-[12px] px-3 py-2.5"
            style={{
              backgroundColor: FORUM.surface2,
              border: `1.5px solid ${item.unread ? FORUM.accent : FORUM.hairline}`,
              marginLeft: item.yourComment ? 16 : 0,
            }}
          >
            <button
              type="button"
              disabled={!canOpenWriter}
              onClick={() => onOpenWriter?.(from.id)}
              className="flex w-full items-center gap-2 text-left disabled:cursor-default active:opacity-80"
            >
              <div className="relative shrink-0">
                <ForumAvatar size={28} name={from.name} imageUrl={from.imageUrl} seed={from.id} />
                <span
                  className="absolute -bottom-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full"
                  style={{
                    backgroundColor: FORUM.surface2,
                    border: `1px solid ${FORUM.hairline}`,
                  }}
                >
                  {item.kind === 'like' ? (
                    <Heart className="size-2.5" strokeWidth={2} color={FORUM.accent} fill={FORUM.accent} />
                  ) : (
                    <MessageCircle className="size-2.5" strokeWidth={2} color={FORUM.accent} />
                  )}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className="truncate font-semibold"
                  style={{ fontSize: 12, color: canOpenWriter ? FORUM.accent : FORUM.text }}
                >
                  {from.name}
                  {canOpenWriter ? ' · 进主页' : ''}
                </p>
                <p style={{ fontSize: 10, color: FORUM.textMuted }}>{item.time}</p>
              </div>
            </button>
            <p className="mt-2" style={{ fontSize: 12, color: FORUM.textSecondary }}>
              {item.text}
            </p>
            {item.kind !== 'like' ? (
              <p className="mt-2" style={{ fontSize: 13.5, color: FORUM.text, lineHeight: 1.55 }}>
                {item.theirContent}
              </p>
            ) : (
              <p className="mt-2 flex items-center gap-1" style={{ fontSize: 12.5, color: FORUM.accent }}>
                <Heart className="size-3.5" strokeWidth={2} fill={FORUM.accent} color={FORUM.accent} />
                赞了你的这条评论
              </p>
            )}
          </div>

          {sent.map((t, i) => (
            <div
              key={`${i}-${t.slice(0, 8)}`}
              className="mt-2.5 rounded-[12px] px-3 py-2.5"
              style={{
                backgroundColor: `${FORUM.accent}14`,
                border: `1px solid ${FORUM.accent}44`,
                marginLeft: 16,
              }}
            >
              <p className="font-semibold" style={{ fontSize: 12, color: FORUM.text }}>
                {you}
                <span style={{ fontSize: 10, color: FORUM.textMuted, fontWeight: 500 }}> · 刚刚</span>
              </p>
              <p className="mt-1.5" style={{ fontSize: 13, color: FORUM.text, lineHeight: 1.55 }}>
                {t}
              </p>
            </div>
          ))}
        </div>
        <div className="h-6" />
      </div>

      {item.kind !== 'like' ? (
        <div
          className="flex shrink-0 items-end gap-2 border-t px-[19px] pt-2"
          style={{
            borderColor: FORUM.hairline,
            backgroundColor: FORUM.surface2,
            paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
          }}
        >
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={1}
            placeholder={item.kind === 'reply' ? '回复这条评论…' : '追加一条回复…'}
            className="min-h-[40px] max-h-[96px] flex-1 resize-none px-3 py-2.5 text-[13.5px] outline-none"
            style={{
              borderRadius: 12,
              backgroundColor: FORUM.bgAccent,
              color: FORUM.text,
              border: `1px solid ${FORUM.hairline}`,
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                send()
              }
            }}
          />
          <Pressable
            type="button"
            onClick={send}
            disabled={!draft.trim()}
            className="flex size-10 shrink-0 items-center justify-center rounded-full disabled:opacity-40"
            style={{ backgroundColor: FORUM.accent }}
            aria-label="发送"
          >
            <Send className="size-4" strokeWidth={2} color={FORUM.surface2} />
          </Pressable>
        </div>
      ) : (
        <div
          className="shrink-0 border-t px-[19px] py-3 text-center"
          style={{
            borderColor: FORUM.hairline,
            backgroundColor: FORUM.surface2,
            paddingBottom: 'calc(14px + env(safe-area-inset-bottom, 0px))',
          }}
        >
          <p style={{ fontSize: 12, color: FORUM.textMuted }}>点赞无需回复 · 友好交流第一</p>
        </div>
      )}
    </div>
  )
}
