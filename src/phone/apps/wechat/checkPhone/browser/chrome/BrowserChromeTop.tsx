import { Home, Lock, RotateCw } from 'lucide-react'
import { forwardRef, type RefObject } from 'react'
import { Pressable } from '../../../../../components/Pressable'
import { shortenUrl } from '../seedData'

export const BrowserAddressBar = forwardRef<
  HTMLDivElement,
  {
    url: string
    loading?: boolean
    focused?: boolean
    placeholder?: string
    onFocusSearch?: () => void
    onRefresh?: () => void
    onBackToDesktop?: () => void
    desktopButtonRef?: RefObject<HTMLButtonElement | null>
  }
>(function BrowserAddressBar(
  {
    url,
    loading,
    focused,
    placeholder = '搜索或输入网址',
    onFocusSearch,
    onRefresh,
    onBackToDesktop,
    desktopButtonRef,
  },
  ref,
) {
  const display = url.trim() ? shortenUrl(url, 28) : placeholder
  return (
    <div ref={ref} className="flex shrink-0 items-center gap-2 px-4 pb-2 pt-1">
      {onBackToDesktop ? (
        <Pressable
          ref={desktopButtonRef}
          type="button"
          className="flex h-9 shrink-0 items-center gap-1 rounded-full border border-[var(--br-hairline)] bg-[var(--br-card)] px-2.5 text-[var(--br-ink)] shadow-[var(--br-shadow)]"
          onClick={onBackToDesktop}
          aria-label="返回查手机桌面"
          title="返回查手机桌面主页"
        >
          <Home size={14} strokeWidth={1.7} aria-hidden />
          <span className="text-[11px] leading-none">桌面</span>
        </Pressable>
      ) : null}
      <Pressable
        type="button"
        className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-[var(--br-radius-pill)] border bg-[var(--br-card)] px-3.5 shadow-[var(--br-shadow)]"
        style={{
          borderWidth: focused ? 1.5 : 1,
          borderColor: focused ? 'var(--br-fog)' : 'var(--br-hairline)',
          transition: 'border-color 200ms var(--br-ease)',
        }}
        onClick={onFocusSearch}
      >
        <Lock size={12} strokeWidth={1.7} className="shrink-0 text-[var(--br-mist)]" aria-hidden />
        <span className="browser-mono min-w-0 flex-1 truncate text-center text-[13px] text-[var(--br-mist)]">
          {display}
        </span>
        <span
          role="button"
          tabIndex={0}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[var(--br-mist)]"
          onClick={(e) => {
            e.stopPropagation()
            onRefresh?.()
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.stopPropagation()
              onRefresh?.()
            }
          }}
          aria-label={loading ? '停止' : '刷新'}
        >
          <RotateCw size={14} strokeWidth={1.7} />
        </span>
      </Pressable>
    </div>
  )
})
