import { useRef, useState } from 'react'
import { Camera, Check, ChevronRight, Pencil, RotateCcw, X } from 'lucide-react'

import { Pressable } from '../../../components/Pressable'
import { readForumAvatarFile } from '../forumAvatarUpload'
import { FORUM } from '../forumTheme'
import { useForumSocialStore } from '../forumSocialStore'
import { ForumAvatar } from './ui'

export function ForumMePage({
  userName,
  /** 微信头像（默认展示；自定义上传不会改写它） */
  wechatAvatarUrl,
  postCount,
  commentCount,
  favoriteCount = 0,
  commissionCount = 0,
  onOpenMyPosts,
  onOpenExplore,
  onOpenFollowing,
}: {
  userName: string
  wechatAvatarUrl?: string | null
  /** 账号下全部帖子（用户约稿产出） */
  postCount: number
  commentCount: number
  favoriteCount?: number
  commissionCount?: number
  onOpenMyPosts?: () => void
  onOpenExplore?: () => void
  /** 打开已关注大咖列表 */
  onOpenFollowing?: () => void
}) {
  const following = useForumSocialStore((s) => {
    const acc = s.currentAccountId
    if (!acc) return 0
    return s.root.byAccount[acc]?.followingWriterIds.length ?? 0
  })
  const customAvatar = useForumSocialStore((s) => {
    const acc = s.currentAccountId
    if (!acc) return ''
    return s.root.byAccount[acc]?.avatarDataUrl?.trim() ?? ''
  })
  const setPenName = useForumSocialStore((s) => s.setPenName)
  const setAvatarDataUrl = useForumSocialStore((s) => s.setAvatarDataUrl)
  const followerCountFn = useForumSocialStore((s) => s.followerCount)
  const fans = followerCountFn(postCount, commentCount)

  const fileRef = useRef<HTMLInputElement>(null)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(userName)
  const [avatarBusy, setAvatarBusy] = useState(false)

  const wechatUrl = wechatAvatarUrl?.trim() || ''
  const usingCustom = !!customAvatar
  const displayAvatar = customAvatar || wechatUrl || null

  const startEdit = () => {
    setDraft(userName)
    setEditing(true)
  }

  const cancelEdit = () => {
    setDraft(userName)
    setEditing(false)
  }

  const saveEdit = () => {
    const next = draft.trim()
    if (!next) {
      window.alert('笔名不能为空')
      return
    }
    setPenName(next)
    setEditing(false)
  }

  const onPickAvatar = async (file: File | null) => {
    if (!file || avatarBusy) return
    setAvatarBusy(true)
    try {
      const dataUrl = await readForumAvatarFile(file)
      setAvatarDataUrl(dataUrl)
    } catch (e) {
      window.alert(e instanceof Error ? e.message : '上传失败')
    } finally {
      setAvatarBusy(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const displayName = userName || '你的笔名'

  const metrics = [
    { label: '发文', value: postCount, onClick: onOpenMyPosts },
    { label: '获评', value: commentCount },
    { label: '收藏', value: favoriteCount },
    { label: '代笔', value: commissionCount || postCount },
  ]

  return (
    <div style={{ paddingLeft: FORUM.pagePadX, paddingRight: FORUM.pagePadX, paddingTop: 10 }}>
      {/* 报头：与首页电讯同构 */}
      <div className="rounded-md px-3 py-2.5" style={{ backgroundColor: FORUM.masthead }}>
        <p className="font-semibold tracking-wide" style={{ fontSize: 13, color: FORUM.surface2 }}>
          通讯社名片
        </p>
        <p style={{ fontSize: 10, color: 'rgba(255,253,246,0.55)', marginTop: 2 }}>
          笔名 · 头像 · 关注与稿件
        </p>
      </div>

      {/* 身份带：大头像 + 笔名，不做套娃卡片 */}
      <section style={{ marginTop: FORUM.sectionGap }}>
        <div className="flex items-end gap-3.5">
          <div className="relative shrink-0">
            <ForumAvatar
              size={FORUM.avatar.profile}
              name={displayName}
              imageUrl={displayAvatar}
              seed={`me:${displayName}`}
              borderWidth={0}
            />
            <Pressable
              type="button"
              disabled={avatarBusy}
              onClick={() => fileRef.current?.click()}
              className="absolute bottom-0 right-0 flex size-7 items-center justify-center rounded-full disabled:opacity-50"
              style={{
                backgroundColor: FORUM.accent,
                boxShadow: `0 0 0 2px ${FORUM.surface1}`,
              }}
              aria-label="上传通讯社头像"
            >
              <Camera className="size-3.5" strokeWidth={2.25} color={FORUM.surface2} />
            </Pressable>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/*"
              className="hidden"
              onChange={(e) => void onPickAvatar(e.target.files?.[0] ?? null)}
            />
          </div>

          <div className="min-w-0 flex-1 pb-0.5">
            {editing ? (
              <div className="flex items-center gap-1.5">
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value.slice(0, 24))}
                  maxLength={24}
                  autoFocus
                  placeholder="输入笔名"
                  className="min-w-0 flex-1 px-0 py-1 text-[18px] font-semibold outline-none"
                  style={{
                    backgroundColor: 'transparent',
                    color: FORUM.text,
                    borderBottom: `1.5px solid ${FORUM.accent}`,
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveEdit()
                    if (e.key === 'Escape') cancelEdit()
                  }}
                />
                <Pressable
                  type="button"
                  onClick={saveEdit}
                  className="flex size-8 shrink-0 items-center justify-center rounded-full"
                  style={{ backgroundColor: FORUM.accent }}
                  aria-label="保存笔名"
                >
                  <Check className="size-3.5" strokeWidth={2.5} color={FORUM.surface2} />
                </Pressable>
                <Pressable
                  type="button"
                  onClick={cancelEdit}
                  className="flex size-8 shrink-0 items-center justify-center rounded-full"
                  style={{ backgroundColor: FORUM.bgAccent }}
                  aria-label="取消"
                >
                  <X className="size-3.5" strokeWidth={2} color={FORUM.textMuted} />
                </Pressable>
              </div>
            ) : (
              <div className="flex items-baseline gap-2">
                <h1
                  className="min-w-0 truncate font-semibold"
                  style={{ fontSize: FORUM.font.profileName, color: FORUM.text, letterSpacing: '0.01em' }}
                >
                  {displayName}
                </h1>
                <Pressable
                  type="button"
                  onClick={startEdit}
                  className="inline-flex shrink-0 items-center gap-0.5 py-0.5 active:opacity-70"
                  aria-label="修改笔名"
                >
                  <Pencil className="size-3" strokeWidth={2} color={FORUM.textAccent} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: FORUM.textAccent }}>改笔名</span>
                </Pressable>
              </div>
            )}
            <p style={{ fontSize: 11.5, color: FORUM.textMuted, marginTop: 5, lineHeight: 1.45 }}>
              {editing
                ? '最多 24 字 · 仅通讯社展示'
                : usingCustom
                  ? '通讯社头像 · 与微信头像分开'
                  : wechatUrl
                    ? '正在用微信头像'
                    : '还没有通讯社头像'}
            </p>
            <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1">
              <Pressable
                type="button"
                disabled={avatarBusy}
                onClick={() => fileRef.current?.click()}
                className="text-[12px] font-semibold disabled:opacity-50 active:opacity-70"
                style={{ color: FORUM.accent }}
              >
                {avatarBusy ? '处理中…' : usingCustom ? '更换头像' : '上传头像'}
              </Pressable>
              {usingCustom ? (
                <Pressable
                  type="button"
                  disabled={avatarBusy}
                  onClick={() => setAvatarDataUrl(null)}
                  className="inline-flex items-center gap-1 text-[12px] font-medium disabled:opacity-50 active:opacity-70"
                  style={{ color: FORUM.textMuted }}
                >
                  <RotateCcw className="size-3" strokeWidth={2} />
                  恢复微信
                </Pressable>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {/* 关注 / 粉丝：一条分割线上的数字，不再套灰块 */}
      <section
        className="mt-4 flex items-stretch"
        style={{
          borderTop: `0.5px solid ${FORUM.hairline}`,
          borderBottom: `0.5px solid ${FORUM.hairline}`,
        }}
      >
        <button
          type="button"
          onClick={onOpenFollowing ?? onOpenExplore}
          className="flex flex-1 flex-col items-start gap-0.5 py-3.5 pr-3 text-left active:opacity-70"
        >
          <span className="font-semibold tabular-nums" style={{ fontSize: 22, color: FORUM.text, letterSpacing: '-0.03em' }}>
            {following}
          </span>
          <span style={{ fontSize: 11, color: FORUM.textMuted, fontWeight: 500 }}>关注写手</span>
        </button>
        <div className="w-px self-stretch my-3" style={{ backgroundColor: FORUM.hairline }} aria-hidden />
        <div className="flex flex-1 flex-col items-start gap-0.5 py-3.5 pl-3">
          <span className="font-semibold tabular-nums" style={{ fontSize: 22, color: FORUM.text, letterSpacing: '-0.03em' }}>
            {fans}
          </span>
          <span style={{ fontSize: 11, color: FORUM.textMuted, fontWeight: 500 }}>粉丝</span>
        </div>
      </section>

      {/* 稿件指标：横排数字栏，一节一事 */}
      <section style={{ marginTop: FORUM.sectionGap }}>
        <div className="mb-2 flex items-center gap-1.5">
          <div className="h-3 w-0.5 rounded-sm" style={{ backgroundColor: FORUM.masthead }} />
          <h2 className="font-semibold" style={{ fontSize: 12, color: FORUM.text }}>
            稿件一览
          </h2>
        </div>
        <div
          className="grid grid-cols-4"
          style={{
            backgroundColor: FORUM.surface2,
            borderRadius: 10,
            padding: '14px 6px',
          }}
        >
          {metrics.map((m, i) => {
            const inner = (
              <>
                <span
                  className="font-semibold tabular-nums"
                  style={{ fontSize: 18, color: FORUM.text, letterSpacing: '-0.02em', lineHeight: 1.1 }}
                >
                  {m.value}
                </span>
                <span style={{ fontSize: 10.5, color: FORUM.textMuted, marginTop: 4, fontWeight: 500 }}>
                  {m.label}
                </span>
              </>
            )
            if (m.onClick) {
              return (
                <button
                  key={m.label}
                  type="button"
                  onClick={m.onClick}
                  className="relative flex flex-col items-center active:opacity-70"
                  style={{
                    borderRight: i < metrics.length - 1 ? `0.5px solid ${FORUM.hairline}` : undefined,
                  }}
                >
                  {inner}
                </button>
              )
            }
            return (
              <div
                key={m.label}
                className="relative flex flex-col items-center"
                style={{
                  borderRight: i < metrics.length - 1 ? `0.5px solid ${FORUM.hairline}` : undefined,
                }}
              >
                {inner}
              </div>
            )
          })}
        </div>
      </section>

      {/* 去向：列表式入口，轻分隔 */}
      <section style={{ marginTop: FORUM.sectionGap }}>
        <div className="mb-2 flex items-center gap-1.5">
          <div className="h-3 w-0.5 rounded-sm" style={{ backgroundColor: FORUM.masthead }} />
          <h2 className="font-semibold" style={{ fontSize: 12, color: FORUM.text }}>
            快捷入口
          </h2>
        </div>
        <div style={{ backgroundColor: FORUM.surface2, borderRadius: 10, overflow: 'hidden' }}>
          <Pressable
            type="button"
            onClick={onOpenExplore}
            className="flex w-full items-center gap-3 px-3.5 py-3.5 text-left active:opacity-80"
          >
            <span className="min-w-0 flex-1">
              <span className="block font-semibold" style={{ fontSize: 14, color: FORUM.text }}>
                探索大咖写手
              </span>
              <span className="mt-0.5 block" style={{ fontSize: 11.5, color: FORUM.textMuted, lineHeight: 1.4 }}>
                关注驻站专栏，用 TA 的笔触约稿
              </span>
            </span>
            <ChevronRight className="size-4 shrink-0" strokeWidth={1.75} color={FORUM.textMuted} />
          </Pressable>
          <div style={{ height: 0.5, backgroundColor: FORUM.hairline, marginLeft: 14 }} />
          <Pressable
            type="button"
            onClick={onOpenMyPosts}
            className="flex w-full items-center gap-3 px-3.5 py-3.5 text-left active:opacity-80"
          >
            <span className="min-w-0 flex-1">
              <span className="block font-semibold" style={{ fontSize: 14, color: FORUM.text }}>
                我的电讯
              </span>
              <span className="mt-0.5 block" style={{ fontSize: 11.5, color: FORUM.textMuted, lineHeight: 1.4 }}>
                查看账号下已生成的同人文
              </span>
            </span>
            <ChevronRight className="size-4 shrink-0" strokeWidth={1.75} color={FORUM.textMuted} />
          </Pressable>
        </div>
      </section>

      <div className="h-8" />
    </div>
  )
}
