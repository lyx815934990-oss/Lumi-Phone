import { ChevronLeft, ChevronRight, MoreHorizontal, Share2, Square } from 'lucide-react'
import type { RefObject } from 'react'
import { Pressable } from '../../../../../components/Pressable'

export function BrowserBottomToolbar({
  canBack,
  canForward,
  tabCount,
  onBack,
  onForward,
  onSharedRecords,
  onTabs,
  onMore,
  backButtonRef,
  moreButtonRef,
}: {
  canBack: boolean
  canForward: boolean
  tabCount: number
  onBack: () => void
  onForward: () => void
  onSharedRecords: () => void
  onTabs: () => void
  onMore: () => void
  backButtonRef?: RefObject<HTMLButtonElement | null>
  moreButtonRef?: RefObject<HTMLButtonElement | null>
}) {
  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-center px-4"
      style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
    >
      <div className="pointer-events-auto flex h-14 w-full max-w-[360px] items-center justify-between rounded-[var(--br-radius-pill)] border border-[var(--br-hairline)] bg-[var(--br-card)] px-2 shadow-[var(--br-shadow)]">
        <Pressable
          ref={backButtonRef}
          type="button"
          className="browser-toolbar-btn !w-auto min-w-[52px] flex-col gap-0.5 !px-1.5"
          disabled={!canBack}
          onClick={onBack}
          aria-label="返回上一页"
          title="返回上一页（浏览器内后退）"
        >
          <ChevronLeft size={18} strokeWidth={1.6} />
          <span className="text-[9px] leading-none text-[var(--br-mist)]">上一页</span>
        </Pressable>
        <Pressable
          type="button"
          className="browser-toolbar-btn !w-auto min-w-[52px] flex-col gap-0.5 !px-1.5"
          disabled={!canForward}
          onClick={onForward}
          aria-label="前进"
          title="前进"
        >
          <ChevronRight size={18} strokeWidth={1.6} />
          <span className="text-[9px] leading-none text-[var(--br-mist)]">前进</span>
        </Pressable>
        <Pressable
          type="button"
          className="browser-toolbar-btn !w-auto min-w-[52px] flex-col gap-0.5 !px-1.5"
          onClick={onSharedRecords}
          aria-label="分享网页记录"
          title="查看角色分享网页记录"
        >
          <Share2 size={16} strokeWidth={1.6} />
          <span className="text-[9px] leading-none text-[var(--br-mist)]">分享</span>
        </Pressable>
        <Pressable
          type="button"
          className="browser-toolbar-btn !w-auto min-w-[52px] flex-col gap-0.5 !px-1.5"
          onClick={onTabs}
          aria-label="标签页"
          title="查看已打开标签"
        >
          <span className="relative flex h-4 w-4 items-center justify-center">
            <Square size={16} strokeWidth={1.6} className="absolute" />
            <span className="browser-mono relative text-[9px] leading-none">{Math.min(99, tabCount)}</span>
          </span>
          <span className="text-[9px] leading-none text-[var(--br-mist)]">标签</span>
        </Pressable>
        <Pressable
          ref={moreButtonRef}
          type="button"
          className="browser-toolbar-btn !w-auto min-w-[52px] flex-col gap-0.5 !px-1.5"
          onClick={onMore}
          aria-label="更多"
          title="更多"
        >
          <MoreHorizontal size={18} strokeWidth={1.6} />
          <span className="text-[9px] leading-none text-[var(--br-mist)]">更多</span>
        </Pressable>
      </div>
    </div>
  )
}
