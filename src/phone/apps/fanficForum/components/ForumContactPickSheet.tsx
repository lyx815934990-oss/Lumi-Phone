import { ChevronRight, X } from 'lucide-react'

import { Pressable } from '../../../components/Pressable'
import type { WeChatPersonaContact } from '../../../types'
import { resolveCharacterAvatarUrl } from '../../../utils/characterAvatarUrl'
import { FORUM } from '../forumTheme'
import { ForumAvatar, SoftCard } from './ui'

/** 从广场发布：挑选通讯录好友作为本命对象 */
export function ForumContactPickSheet({
  open,
  onClose,
  contacts,
  displayNameById = {},
  onPick,
}: {
  open: boolean
  onClose: () => void
  contacts: WeChatPersonaContact[]
  displayNameById?: Record<string, string>
  onPick: (contact: WeChatPersonaContact) => void
}) {
  if (!open) return null

  return (
    <div className="absolute inset-0 z-[60] flex items-end justify-center" style={{ background: 'rgba(44,40,37,0.28)' }}>
      <button type="button" className="absolute inset-0 cursor-default" aria-label="关闭" onClick={onClose} />
      <div
        className="relative z-10 flex max-h-[78%] w-full max-w-[520px] flex-col"
        style={{
          backgroundColor: FORUM.surface1,
          borderTopLeftRadius: 22,
          borderTopRightRadius: 22,
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        <div className="flex shrink-0 items-center justify-between px-4 pt-4">
          <div>
            <h2 className="font-semibold" style={{ fontSize: 16, color: FORUM.text }}>
              选择通讯录好友
            </h2>
            <p className="mt-1" style={{ fontSize: 12.5, color: FORUM.textMuted, lineHeight: 1.5 }}>
              本命同人文将围绕你与 TA 的公开互动来写（显示真实姓名）
            </p>
          </div>
          <Pressable
            type="button"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-full"
            style={{ backgroundColor: FORUM.surface2 }}
            aria-label="关闭"
          >
            <X className="size-4" strokeWidth={1.75} color={FORUM.textMuted} />
          </Pressable>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {contacts.length === 0 ? (
            <p style={{ fontSize: 13.5, color: FORUM.textMuted, paddingTop: 24, lineHeight: 1.7 }}>
              通讯录暂无角色。也可改用「搜索原作角色」直接写同人文。
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
                        onClose()
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
                          <p style={{ fontSize: 11.5, color: FORUM.textMuted, marginTop: 2 }}>本命同人对象</p>
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
    </div>
  )
}
