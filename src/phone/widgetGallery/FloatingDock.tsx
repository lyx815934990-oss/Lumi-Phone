import type { ReactNode } from 'react'

type Props = {
  children: ReactNode
  className?: string
}

/**
 * 底部悬浮毛玻璃 Dock 容器（Dreamcore 亚克力胶囊）。
 * 主屏仍由 `Dock` + `DockCapsule` 承载图标；本组件供预览/独立场景复用同款材质。
 */
export function FloatingDock({ children, className = '' }: Props) {
  return (
    <div
      className={`mx-4 mb-4 rounded-[32px] border border-white/50 bg-white/50 p-4 shadow-[0_16px_40px_rgba(28,28,30,0.12)] backdrop-blur-2xl ${className}`}
    >
      {children}
    </div>
  )
}
