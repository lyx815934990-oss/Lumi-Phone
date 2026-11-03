import { useState } from 'react'

import { Pressable } from '../../../components/Pressable'
import { FORUM } from '../forumTheme'
import { FORUM_PLAZA_BOARD_ID } from '../forumTypes'
import { createForumPostId, useForumStore } from '../useForumStore'

/** 自己写 · 发帖（通讯社投稿台第三项） */
export function ForumSelfWriteSheet({
  open,
  onClose,
  boardId = FORUM_PLAZA_BOARD_ID,
  authorPersonaId = 'forum-self',
  onGenerated,
}: {
  open: boolean
  onClose: () => void
  boardId?: string
  /** 落库作者 id；展示时识别为自己 */
  authorPersonaId?: string
  onGenerated: (postId: string) => void
}) {
  const addPost = useForumStore((s) => s.addPost)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)

  if (!open) return null

  const submit = () => {
    if (busy) return
    const t = title.trim() || '无题'
    const b = body.trim()
    if (!b) {
      window.alert('请填写正文')
      return
    }
    setBusy(true)
    try {
      const postId = createForumPostId()
      addPost(boardId, {
        id: postId,
        kind: 'char',
        characterId: boardId,
        authorPersonaId,
        title: t,
        body: b,
        createdAt: Date.now(),
      })
      setTitle('')
      setBody('')
      onGenerated(postId)
      onClose()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="absolute inset-0 z-[60] flex flex-col"
      style={{ backgroundColor: FORUM.surface1 }}
      role="dialog"
      aria-label="自己写发帖"
    >
      <div
        className="flex shrink-0 items-start justify-between gap-3 px-[19px]"
        style={{ paddingTop: `calc(${FORUM.headerPadTop} + 8px)` }}
      >
        <div>
          <p className="font-semibold tracking-[0.12em]" style={{ fontSize: 10, color: FORUM.accent }}>
            自己执笔
          </p>
          <h2 className="font-semibold" style={{ fontSize: 18, color: FORUM.text, marginTop: 2 }}>
            发帖
          </h2>
          <p className="mt-1" style={{ fontSize: 12, color: FORUM.textMuted }}>
            标题与正文将出现在今日电讯
          </p>
        </div>
        <Pressable
          type="button"
          onClick={busy ? undefined : onClose}
          className="mt-1 rounded-full px-2.5 py-1 text-[11px] font-semibold"
          style={{
            border: `1px solid ${FORUM.hairline}`,
            backgroundColor: FORUM.bgAccent,
            color: FORUM.text,
          }}
        >
          关闭
        </Pressable>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-[19px] py-4">
        <label className="font-medium" style={{ fontSize: 11, color: FORUM.textMuted }}>
          标题
        </label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={busy}
          placeholder="例如：雨夜车站"
          className="mt-1.5 w-full px-3 py-2.5 text-[14px] outline-none disabled:opacity-60"
          style={{
            borderRadius: 10,
            backgroundColor: FORUM.surface2,
            color: FORUM.text,
            border: `1px solid ${FORUM.hairline}`,
          }}
        />
        <label className="mt-4 block font-medium" style={{ fontSize: 11, color: FORUM.textMuted }}>
          正文
        </label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          disabled={busy}
          placeholder="写你的同人段落…"
          rows={12}
          className="mt-1.5 w-full resize-none px-3 py-2.5 text-[14px] leading-relaxed outline-none disabled:opacity-60"
          style={{
            borderRadius: 10,
            backgroundColor: FORUM.surface2,
            color: FORUM.text,
            border: `1px solid ${FORUM.hairline}`,
          }}
        />
      </div>

      <div
        className="shrink-0 px-[19px] pt-2"
        style={{ paddingBottom: 'calc(14px + env(safe-area-inset-bottom, 0px))' }}
      >
        <Pressable
          type="button"
          disabled={busy}
          onClick={submit}
          className="w-full rounded-[12px] py-3 text-center text-[14px] font-bold disabled:opacity-60"
          style={{ backgroundColor: FORUM.accent, color: FORUM.surface2 }}
        >
          {busy ? '发布中…' : '发布到通讯社'}
        </Pressable>
      </div>
    </div>
  )
}
