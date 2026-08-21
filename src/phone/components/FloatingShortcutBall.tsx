import { animate, motion, useMotionValue } from 'framer-motion'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useCustomization } from '../CustomizationContext'
import type { AppSlot, FloatingShortcutItem } from '../types'
import {
  labelForWeChatShortcutPage,
  requestOpenWeChatShortcutPage,
} from '../apps/wechat/wechatShortcutPageNavigation'
import { AppIconTile } from './AppIconTile'

const ORB_SIZE = 48
const EDGE_MARGIN = 10
const DRAG_THRESHOLD_PX = 6
const SPRING = { type: 'spring' as const, stiffness: 320, damping: 28, mass: 0.75 }

function openApp(id: AppSlot['id']) {
  window.dispatchEvent(new CustomEvent<{ id: AppSlot['id'] }>('phone:open-app', { detail: { id } }))
}

function shortcutLabel(item: FloatingShortcutItem, apps: AppSlot[]): string {
  if (item.wechatPage) return labelForWeChatShortcutPage(item.wechatPage)
  if (item.appId) return apps.find((a) => a.id === item.appId)?.label ?? item.appId
  return '快捷'
}

function runShortcut(item: FloatingShortcutItem) {
  if (item.wechatPage) {
    requestOpenWeChatShortcutPage(item.wechatPage)
    return
  }
  if (item.appId) openApp(item.appId)
}

/** 桌面悬浮球：展开后跳转自定义应用 / 微信内页面 */
export function FloatingShortcutBall() {
  const { state } = useCustomization()
  const ball = state.ui.floatingShortcutBall
  const apps = state.apps
  const enabled = ball?.enabled === true
  const shortcuts = ball?.shortcuts ?? []

  const containerRef = useRef<HTMLDivElement>(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const snapSideRef = useRef<'left' | 'right'>('right')
  const dragMovedRef = useRef(false)
  const [open, setOpen] = useState(false)
  const [ready, setReady] = useState(false)

  const snapToNearestEdge = useCallback(() => {
    const bounds = containerRef.current?.getBoundingClientRect()
    if (!bounds) return
    const currentX = x.get()
    const centerX = currentX + ORB_SIZE / 2
    const snapLeft = EDGE_MARGIN
    const snapRight = bounds.width - ORB_SIZE - EDGE_MARGIN
    const toLeft = centerX < bounds.width / 2
    snapSideRef.current = toLeft ? 'left' : 'right'
    void animate(x, toLeft ? snapLeft : snapRight, SPRING)
  }, [x])

  useEffect(() => {
    if (!enabled || !containerRef.current) {
      setReady(false)
      setOpen(false)
      return
    }
    const bounds = containerRef.current.getBoundingClientRect()
    x.set(bounds.width - ORB_SIZE - EDGE_MARGIN - 4)
    y.set(Math.max(EDGE_MARGIN, bounds.height * 0.55))
    snapSideRef.current = 'right'
    setReady(true)
  }, [enabled, x, y])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  if (!enabled) return null

  const menuOnLeft = snapSideRef.current === 'right'

  return (
    <div
      ref={containerRef}
      className="pointer-events-none absolute inset-0 z-[10001] overflow-visible"
      aria-hidden={!enabled}
    >
      {open ? (
        <button
          type="button"
          className="pointer-events-auto absolute inset-0 z-0 cursor-default bg-black/20"
          aria-label="关闭悬浮球菜单"
          onClick={() => setOpen(false)}
        />
      ) : null}

      <motion.div
        drag={!open}
        dragMomentum={false}
        dragElastic={0.08}
        dragConstraints={containerRef}
        style={{ x, y, touchAction: 'none' }}
        onDragStart={() => {
          dragMovedRef.current = false
          setOpen(false)
        }}
        onDrag={(_, info) => {
          if (
            Math.abs(info.offset.x) > DRAG_THRESHOLD_PX ||
            Math.abs(info.offset.y) > DRAG_THRESHOLD_PX
          ) {
            dragMovedRef.current = true
          }
        }}
        onDragEnd={() => {
          snapToNearestEdge()
        }}
        className="pointer-events-auto absolute left-0 top-0 z-[1]"
      >
        {open && shortcuts.length > 0 ? (
          <div
            className="absolute top-1/2 flex -translate-y-1/2 flex-col gap-2"
            style={
              menuOnLeft
                ? { right: ORB_SIZE + 10 }
                : { left: ORB_SIZE + 10 }
            }
          >
            {shortcuts.map((item) => {
              const label = shortcutLabel(item, apps)
              const iconAppId: AppSlot['id'] = item.appId ?? 'wechat'
              return (
                <button
                  key={item.id}
                  type="button"
                  className="flex items-center gap-2 rounded-full border px-2 py-1.5 shadow-md"
                  style={{
                    borderColor: 'var(--phone-border)',
                    background: 'var(--phone-surface)',
                    color: 'var(--phone-text)',
                    flexDirection: menuOnLeft ? 'row-reverse' : 'row',
                  }}
                  onClick={() => {
                    setOpen(false)
                    runShortcut(item)
                  }}
                >
                  <AppIconTile appId={iconAppId} bgSize={36} glyphSize={24} />
                  <span className="max-w-[7.5rem] truncate text-[12px] font-medium whitespace-nowrap">
                    {label}
                  </span>
                </button>
              )
            })}
          </div>
        ) : null}

        <motion.button
          type="button"
          aria-label={open ? '收起快捷菜单' : '打开快捷悬浮球'}
          aria-expanded={open}
          disabled={!ready}
          onPointerDown={() => {
            dragMovedRef.current = false
          }}
          onClick={() => {
            if (dragMovedRef.current) return
            setOpen((v) => !v)
          }}
          className="flex h-12 w-12 items-center justify-center rounded-full"
          style={{
            width: ORB_SIZE,
            height: ORB_SIZE,
            border: '0.5px solid rgba(255,255,255,0.55)',
            background: 'rgba(255,255,255,0.42)',
            color: 'rgba(60,60,67,0.75)',
            boxShadow: '0 2px 10px rgba(0,0,0,0.12)',
          }}
          whileTap={{ scale: 0.94 }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
            <circle cx="7" cy="7" r="2.15" fill="currentColor" />
            <circle cx="17" cy="7" r="2.15" fill="currentColor" />
            <circle cx="7" cy="17" r="2.15" fill="currentColor" />
            <circle cx="17" cy="17" r="2.15" fill="currentColor" />
          </svg>
        </motion.button>
      </motion.div>
    </div>
  )
}
