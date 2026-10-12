import { ChevronLeft } from 'lucide-react'
import type { ReactNode } from 'react'

import { Pressable } from '../../../components/Pressable'
import { FORUM } from '../forumTheme'

/** 顶栏：柔和、无硬描边；详情页用 */
export function ForumChrome({
  title,
  onBack,
  right,
  children,
  className = '',
  hideHeader,
}: {
  title?: string
  onBack?: () => void
  right?: ReactNode
  children: ReactNode
  className?: string
  hideHeader?: boolean
}) {
  return (
    <div
      className={`flex h-full min-h-0 flex-col ${className}`}
      style={{ backgroundColor: FORUM.surface1, fontFamily: 'inherit' }}
    >
      {!hideHeader ? (
        <header
          className="flex shrink-0 items-center gap-1 pb-2"
          style={{
            paddingLeft: FORUM.pagePadX - 8,
            paddingRight: FORUM.pagePadX - 8,
            paddingTop: FORUM.headerPadTop,
          }}
        >
          {onBack ? (
            <Pressable
              type="button"
              onClick={onBack}
              className="flex h-9 w-9 items-center justify-center rounded-full active:opacity-70"
              aria-label="返回"
            >
              <ChevronLeft className="size-5" strokeWidth={1.75} color={FORUM.text} />
            </Pressable>
          ) : (
            <div className="w-9" />
          )}
          <h1
            className="min-w-0 flex-1 truncate text-center font-medium"
            style={{ fontSize: FORUM.font.navTitle, color: FORUM.text }}
          >
            {title ?? ''}
          </h1>
          <div className="flex h-9 min-w-9 items-center justify-end">{right ?? null}</div>
        </header>
      ) : null}
      <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {children}
      </div>
    </div>
  )
}
