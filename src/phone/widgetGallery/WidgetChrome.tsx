import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import type { GalleryWidgetSize } from './types'
import {
  ACRYLIC_APPEARANCE,
  appearanceShellStyle,
  mutedFrom,
  parseAppearance,
  type WidgetAppearance,
} from './widgetAppearance'
import './desktopWidgetEngine.css'

type Props = {
  title?: string
  size: GalleryWidgetSize
  children: ReactNode
  isEditMode?: boolean
  isDragging?: boolean
  onPointerDown?: (e: React.PointerEvent) => void
  className?: string
  /** 关闭默认亚克力外壳（组件自带材质时） */
  bare?: boolean
  style?: React.CSSProperties
  /** 自定义外观；未传时用默认亚克力 */
  appearance?: WidgetAppearance
  /** 原始 config.appearance，与 appearance 二选一即可 */
  appearanceRaw?: unknown
}

/**
 * 统一外框：编辑态抖动提示、拖拽放大阴影、data 属性供主屏滑动忽略。
 */
export function WidgetChrome({
  title,
  size,
  children,
  isEditMode = false,
  isDragging = false,
  onPointerDown,
  className = '',
  bare = false,
  style,
  appearance: appearanceProp,
  appearanceRaw,
}: Props) {
  const appearance =
    appearanceProp ??
    parseAppearance(appearanceRaw, ACRYLIC_APPEARANCE)
  const shell = appearanceShellStyle(appearance)

  return (
    <motion.div
      data-desktop-gallery-widget="true"
      data-widget-size={size}
      className={`relative h-full w-full overflow-visible select-none ${className}`}
      style={{
        touchAction: isEditMode ? 'none' : undefined,
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none',
        ...style,
      }}
      animate={{
        scale: isDragging ? 1.04 : 1,
        zIndex: isDragging ? 30 : 1,
        boxShadow: isDragging
          ? '0 18px 40px rgba(28,28,30,0.22)'
          : bare
            ? undefined
            : '0 8px 22px rgba(28,28,30,0.08)',
      }}
      transition={{ duration: 0.28, ease: 'easeInOut' }}
      onPointerDown={onPointerDown}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div
        className={`h-full w-full ${isEditMode && !isDragging ? 'wg-jiggle' : ''}`}
      >
        {bare ? (
          children
        ) : (
          <div
            className="relative flex h-full w-full flex-col overflow-hidden rounded-[22px] border p-2.5 shadow-sm transition-[background,backdrop-filter,color] duration-300 ease-in-out"
            style={shell}
          >
            {title ? (
              <p
                className="mb-1 shrink-0 text-center text-[9px] uppercase tracking-[0.16em]"
                style={{ color: mutedFrom(appearance.textColor, 0.48) }}
              >
                {title}
              </p>
            ) : null}
            <div
              className="relative min-h-0 flex-1"
              style={{ color: appearance.textColor }}
            >
              {children}
            </div>
          </div>
        )}
      </div>
      {isEditMode ? (
        <span
          className="pointer-events-none absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-black/35"
          aria-hidden
        />
      ) : null}
    </motion.div>
  )
}
