import { useRef } from 'react'

type Props = {
  progress: number
  currentTime: number
  duration: number
  ink: string
  muted?: string
  isEditMode?: boolean
  formatTime: (sec: number) => string
  onSeekRatio: (ratio: number) => void
  /** 是否显示时间戳 */
  showTimes?: boolean
  /**
   * below：进度条下方左右时间（默认）
   * inline：时间夹在进度条两侧（更适合横卡）
   */
  timeLayout?: 'below' | 'inline'
  /** 紧凑：更矮命中区 */
  compact?: boolean
  className?: string
}

/**
 * 桌面音乐组件共用进度条：点击 / 拖动均可跳转。
 * progress 约定为 0–1。
 */
export function MusicProgressBar({
  progress,
  currentTime,
  duration,
  ink,
  muted,
  isEditMode = false,
  formatTime,
  onSeekRatio,
  showTimes = true,
  timeLayout = 'below',
  compact = false,
  className = '',
}: Props) {
  const trackRef = useRef<HTMLDivElement>(null)
  const draggingRef = useRef(false)

  const seekFromClientX = (clientX: number) => {
    const el = trackRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const ratio = (clientX - rect.left) / Math.max(1, rect.width)
    onSeekRatio(Math.max(0, Math.min(1, ratio)))
  }

  const ratio = Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 0))
  const pct = `${ratio * 100}%`
  const timeColor = muted ?? `${ink}99`
  const remain = Math.max(0, (duration || 0) - currentTime)
  const curLabel = formatTime(currentTime)
  const remainLabel = formatTime(remain)
  const totalLabel = formatTime(duration || 0)

  const track = (
    <div
      ref={trackRef}
      role="slider"
      aria-label="播放进度"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(ratio * 100)}
      data-widget-add-ui="true"
      className={`relative flex min-w-0 flex-1 cursor-pointer items-center ${
        compact ? 'h-3' : 'h-4'
      }`}
      style={{ touchAction: 'none' }}
      onPointerDown={(e) => {
        if (isEditMode) return
        e.stopPropagation()
        e.preventDefault()
        draggingRef.current = true
        ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
        seekFromClientX(e.clientX)
      }}
      onPointerMove={(e) => {
        if (!draggingRef.current || isEditMode) return
        e.stopPropagation()
        seekFromClientX(e.clientX)
      }}
      onPointerUp={(e) => {
        if (!draggingRef.current) return
        e.stopPropagation()
        draggingRef.current = false
        try {
          ;(e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId)
        } catch {
          /* ignore */
        }
      }}
      onPointerCancel={(e) => {
        draggingRef.current = false
        try {
          ;(e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId)
        } catch {
          /* ignore */
        }
      }}
    >
      <div
        className={`pointer-events-none relative w-full overflow-visible rounded-full ${
          compact ? 'h-[2.5px]' : 'h-[3px]'
        }`}
        style={{ background: `${ink}28` }}
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ width: pct, background: ink }}
        />
        <span
          className={`absolute top-1/2 -translate-y-1/2 rounded-full ${
            compact ? 'h-2 w-2' : 'h-2.5 w-2.5'
          }`}
          style={{
            left: pct,
            marginLeft: compact ? -4 : -5,
            background: ink,
            boxShadow: '0 1px 3px rgba(0,0,0,0.28)',
          }}
        />
      </div>
    </div>
  )

  if (showTimes && timeLayout === 'inline') {
    return (
      <div className={`flex min-w-0 shrink-0 items-center gap-1.5 ${className}`}>
        <span
          className="w-[28px] shrink-0 text-right text-[8px] tabular-nums leading-none"
          style={{ color: timeColor }}
        >
          {curLabel}
        </span>
        {track}
        <span
          className="w-[28px] shrink-0 text-left text-[8px] tabular-nums leading-none"
          style={{ color: timeColor }}
        >
          {totalLabel}
        </span>
      </div>
    )
  }

  return (
    <div className={`min-w-0 shrink-0 ${className}`}>
      {track}
      {showTimes ? (
        <div
          className="mt-0.5 flex justify-between text-[8px] tabular-nums leading-none"
          style={{ color: timeColor }}
        >
          <span>{curLabel}</span>
          <span>-{remainLabel}</span>
        </div>
      ) : null}
    </div>
  )
}
