import { hexToRgba, imageBlurStyle } from '../widgetAppearance'

type Props = {
  bgColor: string
  bgImage?: string
  /** 毛玻璃：有图时模糊底图；无图时 backdrop 模糊壁纸 */
  frostBlur?: number
  className?: string
}

/**
 * 播放器底层背景：背景色 与 背景图 互斥，二选一。
 */
export function MusicCardBackground({
  bgColor,
  bgImage = '',
  frostBlur = 14,
  className = '',
}: Props) {
  const frost = Math.max(0, frostBlur)

  if (bgImage) {
    return (
      <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden>
        <img
          src={bgImage}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          style={imageBlurStyle(frost)}
          draggable={false}
        />
      </div>
    )
  }

  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden>
      <span
        className="absolute inset-0"
        style={{
          background: hexToRgba(bgColor, frost > 0 ? 0.72 : 1),
          backdropFilter: frost > 0 ? `blur(${frost}px)` : undefined,
          WebkitBackdropFilter: frost > 0 ? `blur(${frost}px)` : undefined,
        }}
      />
    </div>
  )
}
