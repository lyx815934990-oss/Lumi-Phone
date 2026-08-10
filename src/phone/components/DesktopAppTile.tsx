import { motion, type HTMLMotionProps } from 'framer-motion'
import type { AppSlot } from '../types'
import { AppIconTile } from './AppIconTile'
import { Pressable } from './Pressable'
import { useCustomization } from '../CustomizationContext'
import { useEffect, useState } from 'react'

type Props = {
  app: AppSlot
  onOpen: (id: AppSlot['id']) => void
  className?: string
  compact?: boolean
  /** 主屏 / Dock 角标（如微信未读） */
  badgeCount?: number
  isEditMode?: boolean
  isActiveDrag?: boolean
  isLongPressPrimed?: boolean
  isGhosted?: boolean
  /** 编辑态多选 */
  isSelected?: boolean
  pointerHandlers?: Pick<
    HTMLMotionProps<'button'>,
    'onPointerDown' | 'onPointerMove' | 'onPointerUp' | 'onPointerCancel' | 'onPointerLeave'
  >
}

export function DesktopAppTile({
  app,
  onOpen,
  className,
  compact = false,
  badgeCount = 0,
  isEditMode = false,
  isActiveDrag = false,
  isLongPressPrimed = false,
  isGhosted = false,
  isSelected = false,
  pointerHandlers,
}: Props) {
  const { state } = useCustomization()
  const { theme } = state
  const iconBg = compact ? 48 : 56
  const iconGlyph = compact ? 32 : 38
  const labelSize = compact ? 'clamp(9px, 1.2vh, 10px)' : 'clamp(10px, 1.35vh, 11px)'
  const [rejectPulse, setRejectPulse] = useState(false)

  useEffect(() => {
    if (!rejectPulse) return
    const timer = window.setTimeout(() => setRejectPulse(false), 220)
    return () => window.clearTimeout(timer)
  }, [rejectPulse])

  return (
    <Pressable
      data-desktop-tile="true"
      onClick={() => {
        if (isEditMode) {
          setRejectPulse(true)
          return
        }
        onOpen(app.id)
      }}
      className={`relative flex h-full w-full flex-col items-center justify-center gap-1 overflow-visible rounded-[var(--phone-radius-md)] bg-transparent px-0.5 py-0.5 ${className ?? ''}`}
      style={{
        background: 'transparent',
        color: theme.text,
        border: 'none',
        boxShadow: 'none',
        opacity: isGhosted ? 0.02 : 1,
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none',
        touchAction: 'none',
      }}
      whileTap={isEditMode ? { scale: 0.985, x: [0, -1.2, 1.2, 0] } : { scale: 0.96 }}
      animate={
        isActiveDrag || isLongPressPrimed
          ? {
              scale: 1.1,
              y: -2,
              filter: 'brightness(1.02)',
            }
          : rejectPulse
            ? {
                x: [0, -1.8, 1.8, -1, 1, 0],
                scale: 1,
              }
            : {
                x: 0,
                scale: 1,
                y: 0,
                filter: 'brightness(1)',
              }
      }
      transition={
        isActiveDrag || isLongPressPrimed
          ? { type: 'spring', stiffness: 340, damping: 28 }
          : rejectPulse
            ? { duration: 0.2, ease: 'easeOut' }
            : { type: 'spring', stiffness: 420, damping: 34 }
      }
      {...pointerHandlers}
      onContextMenu={(event) => event.preventDefault()}
    >
      <motion.div
        className="relative shrink-0 rounded-[22px]"
        animate={
          isActiveDrag || isLongPressPrimed
            ? {
                boxShadow: '0 20px 44px rgba(28, 28, 30, 0.22)',
              }
            : {
                boxShadow: isEditMode ? '0 10px 22px rgba(28, 28, 30, 0.08)' : '0 0 0 rgba(0,0,0,0)',
              }
        }
        transition={{ duration: 0.24, ease: 'easeOut' }}
      >
        <AppIconTile
          appId={app.id}
          bgSize={iconBg}
          glyphSize={iconGlyph}
          badgeCount={app.id === 'wechat' ? badgeCount : 0}
        />
        {isEditMode && isSelected ? (
          <span
            aria-hidden
            className="pointer-events-none absolute -right-1 -top-1 z-10 flex h-[18px] w-[18px] items-center justify-center rounded-full border border-white/85 bg-[#1c1c1e] text-[11px] font-bold leading-none text-white shadow-[0_2px_6px_rgba(0,0,0,0.35)]"
          >
            ✓
          </span>
        ) : null}
      </motion.div>
      <span
        className="w-full max-w-full shrink-0 px-0.5 text-center font-medium tracking-tight"
        style={{
          fontSize: labelSize,
          lineHeight: 1.3,
          color: theme.appLabelColor,
          opacity: isEditMode ? 0.94 : 1,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          overflowWrap: 'anywhere',
          wordBreak: 'break-word',
        }}
      >
        {app.label}
      </span>
    </Pressable>
  )
}
