import { Repeat, Repeat1, Shuffle } from 'lucide-react'
import type { LocalPlayMode } from './desktopMusicEngine'
import { LOCAL_PLAY_MODE_LABELS } from './desktopMusicEngine'

type Props = {
  mode: LocalPlayMode
  onCycle: () => void
  disabled?: boolean
  size?: number
  className?: string
  /** 图标颜色 */
  color?: string
}

/** 桌面播放器：列表循环 → 单曲循环 → 随机 */
export function MusicPlayModeButton({
  mode,
  onCycle,
  disabled = false,
  size = 13,
  className = '',
  color,
}: Props) {
  const label = LOCAL_PLAY_MODE_LABELS[mode] ?? '播放模式'
  const Icon = mode === 'repeatOne' ? Repeat1 : mode === 'shuffle' ? Shuffle : Repeat

  return (
    <button
      type="button"
      data-widget-add-ui="true"
      disabled={disabled}
      className={`flex items-center justify-center ${className}`}
      style={color ? { color } : undefined}
      aria-label={`播放模式：${label}，点击切换`}
      title={label}
      onClick={(e) => {
        e.stopPropagation()
        if (!disabled) onCycle()
      }}
    >
      <Icon size={size} strokeWidth={1.85} />
    </button>
  )
}
