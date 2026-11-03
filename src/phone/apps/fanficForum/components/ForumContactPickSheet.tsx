import { ChevronRight, X } from 'lucide-react'

import { Pressable } from '../../../components/Pressable'
import type { WeChatPersonaContact } from '../../../types'
import { resolveCharacterAvatarUrl } from '../../../utils/characterAvatarUrl'
import { FORUM } from '../forumTheme'
import { ForumAvatar, SoftCard } from './ui'

/** 从广场发布：挑选通讯录好友作为本命对象；也可用于分享到微信私聊 */
export function ForumContactPickSheet({
  open,
  onClose,
  contacts,
  displayNameById = {},
  onPick,
  eyebrow = '本命约稿',
  title = '选择通讯录好友',
  hint = '本命同人文将围绕你与 TA 的公开互动来写',
  rowHint = '本命同人对象',
  emptyHint = '通讯录暂无角色。也可改用「搜索原作角色」直接写同人文。',
  busy = false,
}: {
  open: boolean
  onClose: () => void
  contacts: WeChatPersonaContact[]
  displayNameById?: Record<string, string>
  onPick: (contact: WeChatPersonaContact) => void
  eyebrow?: string
  title?: string
  hint?: string
  rowHint?: string
  emptyHint?: string
  busy?: boolean
}) {
  if (!open) return null

  return (
    <div
      className="absolute inset-0 z-[60] flex flex-col"
      style={{ backgroundColor: FORUM.surface1 }}
      role="dialog"
      aria-label="选择本命角色"
    >
      <div
        className="flex shrink-0 items-start justify-between gap-3 px-[19px]"
        style={{ paddingTop: `calc(${FORUM.headerPadTop} + 8px)` }}
      >
        <div className="min-w-0">
          <p className="font-semibold tracking-[0.12em]" style={{ fontSize: 10, color: FORUM.accent }}>
            {eyebrow}
          </p>
          <h2 className="font-semibold" style={{ fontSize: 18, color: FORUM.text, marginTop: 2 }}>
            {title}
          </h2>
          <p className="mt-1" style={{ fontSize: 12.5, color: FORUM.textMuted, lineHeight: 1.5 }}>
            {busy ? '发送中…' : hint}
          </p>
        </div>
        <Pressable
          type="button"
          onClick={onClose}
          className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: FORUM.bgAccent }}
          aria-label="关闭"
        >
          <X className="size-4" strokeWidth={1.75} color={FORUM.textMuted} />
        </Pressable>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-[19px] py-3">
          {contacts.length === 0 ? (
            <p style={{ fontSize: 13.5, color: FORUM.textMuted, paddingTop: 24, lineHeight: 1.7 }}>
              {emptyHint}
            </p>
          ) : (
            <ul className="flex flex-col" style={{ gap: FORUM.cardGap }}>
              {contacts.map((c) => {
                const cid = c.characterId.trim()
                const name = displayNameById[cid]?.trim() || c.remarkName.trim() || '未命名'
                const avatar = resolveCharacterAvatarUrl({ avatarUrl: c.avatarUrl })
                return (
                  <li key={cid}>
                    <SoftCard
                      onClick={() => {
                        if (busy) return
                        onPick(c)
                      }}
                      paddingY={13}
                    >
                      <div className="flex items-center gap-3">
                        <ForumAvatar size={FORUM.avatar.plaza} name={name} imageUrl={avatar} seed={cid} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium" style={{ fontSize: 15, color: FORUM.text }}>
                            {name}
                          </p>
                          <p style={{ fontSize: 11.5, color: FORUM.textMuted, marginTop: 2 }}>{rowHint}</p>
                        </div>
                        <ChevronRight className="size-4 shrink-0" strokeWidth={1.75} color={FORUM.textMuted} />
                      </div>
                    </SoftCard>
                  </li>
                )
              })}
            </ul>
          )}
      </div>
    </div>
  )
}
