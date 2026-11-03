import { BookUser, PenLine, Search, X } from 'lucide-react'

import { Pressable } from '../../../../components/Pressable'
import { FORUM_COACH_TARGET_ATTR } from '../../forumCoach'
import { FORUM } from '../../forumTheme'

export function PublishChoiceSheet({
  open,
  onClose,
  onPickContact,
  onSearchOriginal,
  contextCharName,
  /** 新手引导进行中：只展示选项，禁止点选跳走 */
  choicesLocked = false,
}: {
  open: boolean
  onClose: () => void
  /** 选通讯录好友写本命（无上下文时先进通讯录选择） */
  onPickContact: () => void
  /** 搜索原作角色写同人文（不依赖通讯录） */
  onSearchOriginal: () => void
  /** 当前已在某角色主页时，提示本命会落到该角色 */
  contextCharName?: string | null
  choicesLocked?: boolean
}) {
  if (!open) return null

  const shipTitle = contextCharName?.trim()
    ? `请网友写 · 本命 · ${contextCharName.trim()}`
    : '请网友写 · 本命'
  const shipHint = contextCharName?.trim()
    ? '基于公开蛛丝马迹，生成你与 TA 的本命同人文'
    : '选通讯录角色，固定人格代笔'

  const items = [
    {
      id: 'ship' as const,
      coachId: 'forum-publish-ship',
      title: shipTitle,
      desc: shipHint,
      hot: true,
      Icon: BookUser,
      onClick: () => {
        if (choicesLocked) return
        onClose()
        onPickContact()
      },
      // 引导中仍保持可视样式，只挡点击，避免高亮看起来发灰
      disabled: false,
      lockedHint: null as string | null,
    },
    {
      id: 'custom' as const,
      coachId: 'forum-publish-custom',
      title: '请网友写 · 搜索原作角色',
      desc: '搜索原作 → 多选角色 → 写一句想看的梗',
      hot: false,
      Icon: Search,
      onClick: () => {
        if (choicesLocked) return
        onClose()
        onSearchOriginal()
      },
      disabled: false,
      lockedHint: null as string | null,
    },
    {
      id: 'self' as const,
      coachId: 'forum-publish-self',
      title: '自己写 · 发帖',
      desc: '标题 / 正文 / 关联角色后发布到通讯社',
      hot: false,
      Icon: PenLine,
      onClick: () => undefined,
      disabled: true,
      lockedHint: '开发中，暂未开放',
    },
  ]

  return (
    <div
      className="absolute inset-0 z-50 flex flex-col"
      style={{ backgroundColor: FORUM.surface1 }}
      role="dialog"
      aria-label="通讯社投稿"
    >
      <div
        className="flex shrink-0 items-start justify-between gap-3 px-[19px]"
        style={{ paddingTop: `calc(${FORUM.headerPadTop} + 8px)` }}
      >
        <div className="min-w-0">
          <p
            className="font-semibold tracking-[0.12em]"
            style={{ fontSize: 10, color: FORUM.accent }}
          >
            发布台
          </p>
          <h2 className="font-semibold" style={{ fontSize: 19, color: FORUM.text, marginTop: 2 }}>
            投稿
          </h2>
          <p className="mt-1" style={{ fontSize: 12.5, color: FORUM.textSecondary, lineHeight: 1.5 }}>
            请网友人格（AI）代笔；自己写功能开发中
          </p>
        </div>
        <Pressable
          type="button"
          onClick={onClose}
          className="mt-1 flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1"
          style={{
            border: `1px solid ${FORUM.hairline}`,
            backgroundColor: FORUM.bgAccent,
            color: FORUM.text,
          }}
          aria-label="关闭"
        >
          <X className="size-3.5" strokeWidth={2} color={FORUM.textMuted} />
          <span style={{ fontSize: 11, fontWeight: 600 }}>关闭</span>
        </Pressable>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-[19px] pb-8 pt-4 [scrollbar-width:none]">
        <div className="flex flex-col gap-2.5">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              disabled={item.disabled}
              onClick={item.onClick}
              className="relative overflow-hidden rounded-[12px] px-3.5 py-3.5 text-left active:opacity-90 disabled:opacity-45"
              style={{
                backgroundColor: FORUM.surface2,
                border: `1.5px solid ${item.hot ? FORUM.accent : FORUM.hairline}`,
              }}
              {...{ [FORUM_COACH_TARGET_ATTR]: item.coachId }}
            >
              {item.hot ? (
                <span
                  className="absolute right-0 top-0 rounded-bl-lg px-2 py-0.5 font-bold"
                  style={{ fontSize: 9, backgroundColor: FORUM.accent, color: FORUM.surface2 }}
                >
                  常用
                </span>
              ) : null}
              {item.id === 'self' && item.disabled ? (
                <span
                  className="absolute right-0 top-0 rounded-bl-lg px-2 py-0.5 font-bold"
                  style={{ fontSize: 9, backgroundColor: FORUM.textMuted, color: FORUM.surface2 }}
                >
                  开发中
                </span>
              ) : null}
              <div className="flex items-start gap-3">
                <div
                  className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full"
                  style={{ backgroundColor: FORUM.bgAccent }}
                >
                  <item.Icon className="size-4" strokeWidth={1.75} color={FORUM.textAccent} />
                </div>
                <div className="min-w-0 flex-1 pr-6">
                  <p className="font-semibold" style={{ fontSize: 14, color: FORUM.text }}>
                    {item.title}
                  </p>
                  <p className="mt-1" style={{ fontSize: 12, color: FORUM.textMuted, lineHeight: 1.5 }}>
                    {item.desc}
                  </p>
                  {item.id === 'custom' && !item.disabled ? (
                    <p
                      className="mt-2 font-semibold"
                      style={{ fontSize: 12, color: FORUM.accent }}
                    >
                      去选角色 →
                    </p>
                  ) : null}
                  {item.lockedHint ? (
                    <p className="mt-2" style={{ fontSize: 11, color: FORUM.textMuted }}>
                      {item.lockedHint}
                    </p>
                  ) : null}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
