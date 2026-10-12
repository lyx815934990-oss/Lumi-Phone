import { BookUser, Search, X } from 'lucide-react'

import { Pressable } from '../../../../components/Pressable'
import { FORUM } from '../../forumTheme'
import { SoftCard } from './SoftCard'

export function PublishChoiceSheet({
  open,
  onClose,
  onPickContact,
  onSearchOriginal,
  contextCharName,
}: {
  open: boolean
  onClose: () => void
  /** 选通讯录好友写本命（无上下文时先进通讯录选择） */
  onPickContact: () => void
  /** 搜索原作角色写同人文（不依赖通讯录） */
  onSearchOriginal: () => void
  /** 当前已在某角色主页时，提示本命会落到该角色 */
  contextCharName?: string | null
}) {
  if (!open) return null

  const shipTitle = contextCharName?.trim()
    ? `本命同人 · ${contextCharName.trim()}`
    : '选通讯录好友'
  const shipHint = contextCharName?.trim()
    ? '基于公开蛛丝马迹，生成你与 TA 的本命同人文'
    : '从通讯录点选好友，再生成你×TA 的本命同人文'

  return (
    <div className="absolute inset-0 z-50 flex items-end justify-center" style={{ background: 'rgba(44,40,37,0.28)' }}>
      <button type="button" className="absolute inset-0 cursor-default" aria-label="关闭" onClick={onClose} />
      <div
        className="relative z-10 w-full max-w-[520px] px-[19px] pb-[calc(18px+env(safe-area-inset-bottom,0px))] pt-2"
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0 pt-1">
            <p className="font-semibold" style={{ fontSize: 16, color: FORUM.text }}>
              发布同人文
            </p>
            <p className="mt-1" style={{ fontSize: 12.5, color: FORUM.textMuted, lineHeight: 1.5 }}>
              可直接选好友写本命，或搜索原作角色写同人文；也可先去写手主页用 TA 的笔触写。
            </p>
          </div>
          <Pressable
            type="button"
            onClick={onClose}
            className="flex size-8 shrink-0 items-center justify-center rounded-full"
            style={{ backgroundColor: FORUM.surface2 }}
            aria-label="关闭"
          >
            <X className="size-4" strokeWidth={1.75} color={FORUM.textMuted} />
          </Pressable>
        </div>
        <div className="flex flex-col gap-[10px]">
          <SoftCard
            onClick={() => {
              onClose()
              onPickContact()
            }}
            paddingY={16}
          >
            <div className="flex items-center gap-3">
              <div
                className="flex size-10 items-center justify-center rounded-full"
                style={{ backgroundColor: FORUM.bgAccent }}
              >
                <BookUser className="size-[18px]" strokeWidth={1.75} color={FORUM.textAccent} />
              </div>
              <div className="min-w-0">
                <p className="font-medium" style={{ fontSize: 15, color: FORUM.text }}>
                  {shipTitle}
                </p>
                <p className="mt-0.5" style={{ fontSize: 12.5, color: FORUM.textMuted, lineHeight: 1.5 }}>
                  {shipHint}
                </p>
              </div>
            </div>
          </SoftCard>
          <SoftCard
            onClick={() => {
              onClose()
              onSearchOriginal()
            }}
            paddingY={16}
          >
            <div className="flex items-center gap-3">
              <div
                className="flex size-10 items-center justify-center rounded-full"
                style={{ backgroundColor: FORUM.bgAccent }}
              >
                <Search className="size-[18px]" strokeWidth={1.75} color={FORUM.textAccent} />
              </div>
              <div className="min-w-0">
                <p className="font-medium" style={{ fontSize: 15, color: FORUM.text }}>
                  搜索原作角色
                </p>
                <p className="mt-0.5" style={{ fontSize: 12.5, color: FORUM.textMuted, lineHeight: 1.5 }}>
                  AniList / Jikan 选角 + 一句话梗，由网友写同人文（不绑定通讯录）
                </p>
              </div>
            </div>
          </SoftCard>
        </div>
      </div>
    </div>
  )
}
