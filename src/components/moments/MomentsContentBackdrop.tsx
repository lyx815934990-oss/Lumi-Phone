import type { CSSProperties, ReactNode } from 'react'

type MomentsContentBackdropProps = {
  children: ReactNode
  className?: string
  style?: CSSProperties
}

/**
 * 钉在「朋友圈页」可视区域内的内容区底（不随列表滚动）。
 * 须放在 `relative overflow-hidden` 的页面根容器内，与 `overflow-y-auto` 滚动层为兄弟节点。
 * 默认纯白底，不再使用内容区壁纸图。
 */
export function MomentsContentBackgroundLayer() {
  return <div aria-hidden className="pointer-events-none absolute inset-0 z-0 bg-white" />
}

/** 封面下方正文区：内容叠在固定底色之上 */
export function MomentsContentBackdrop({
  children,
  className = '',
  style,
}: MomentsContentBackdropProps) {
  return (
    <div className={`relative z-[1] ${className}`.trim()} style={style}>
      {children}
    </div>
  )
}
