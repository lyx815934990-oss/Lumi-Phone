import type { StoryDisplayMode } from '../../types'
import { DATING_STORY_COACH_TARGET_ATTR } from '../../../phone/apps/wechat/dating/datingStoryLayoutCoach'

const OPTIONS: { value: StoryDisplayMode; label: string }[] = [
  { value: 'normal', label: '普通' },
  { value: 'vn', label: 'VN' },
]

type Props = {
  mode: StoryDisplayMode
  onModeChange: (mode: StoryDisplayMode) => void
  /** @deprecated 保留兼容；样式已固定，不再随 compact 变高 */
  compact?: boolean
  /** overlay：VN 等全屏背景上的半透明样式 */
  variant?: 'story' | 'overlay'
}

/** 标题栏 · 普通 / VN 显示模式切换（固定胶囊高度，不随滚动拉高） */
export function StoryModeSwitch({
  mode,
  onModeChange,
  variant = 'story',
}: Props) {
  const isOverlay = variant === 'overlay'

  return (
    <div
      className={`inline-flex h-7 shrink-0 items-center rounded-full p-0.5 ${
        isOverlay
          ? 'border border-white/25 bg-black/40 backdrop-blur-md'
          : 'border border-[var(--sr-border)] bg-[var(--sr-panel)]'
      }`}
      role="tablist"
      aria-label="显示模式"
      {...{ [DATING_STORY_COACH_TARGET_ATTR]: 'sr-mode-switch' }}
    >
      {OPTIONS.map((o) => {
        const active = mode === o.value
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onModeChange(o.value)}
            className={`inline-flex h-6 min-w-[2.5rem] shrink-0 items-center justify-center rounded-full px-2.5 text-[10px] font-medium leading-none transition ${
              active
                ? isOverlay
                  ? 'bg-white/92 text-[#1c1c1e] shadow-sm'
                  : 'bg-[var(--sr-gold)] text-[var(--sr-gold-on)] shadow-[0_1px_6px_var(--sr-gold-glow)]'
                : isOverlay
                  ? 'text-white/72 hover:text-white'
                  : 'text-[var(--sr-text-soft)] hover:text-[var(--sr-text)]'
            }`}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
