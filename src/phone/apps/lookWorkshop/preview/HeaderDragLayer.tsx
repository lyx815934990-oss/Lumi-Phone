import {
  useRef,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import { useLookWorkshopStore } from '../store'
import type { HeaderFreePos } from '../types'

export type HeaderDragTarget =
  | 'back'
  | 'time'
  | 'psyche'
  | 'more'
  | 'titleAvatar'
  | 'title'
  | 'subtitle'

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

function posPath(target: HeaderDragTarget): string {
  if (target === 'titleAvatar') return 'header.titleAvatarPos'
  if (target === 'title') return 'header.titlePos'
  if (target === 'subtitle') return 'header.subtitlePos'
  if (target === 'back') return 'header.backBtn.pos'
  if (target === 'more') return 'header.moreBtn.pos'
  if (target === 'time') return 'header.timeBtn.pos'
  return 'header.psycheBtn.pos'
}

type DragSession = {
  pointerId: number
  headerEl: HTMLElement
  live: HeaderFreePos
}

/**
 * 预览标题栏可拖元素：始终按 xPct/yPct 绝对定位，拖动时 rAF 同步写入草稿。
 */
export function DraggableHeaderItem({
  target,
  sizePx,
  pos,
  label,
  className = '',
  style,
  children,
  autoSize = false,
  'data-wx-chat-header-btn': btnAttr,
  'data-wx-chat-header-avatar': avatarAttr,
  'data-wx-chat-header-title': titleAttr,
  'data-wx-chat-header-sub': subAttr,
}: {
  target: HeaderDragTarget
  /** 方形按钮/头像尺寸；autoSize 时忽略 */
  sizePx?: number
  pos: HeaderFreePos
  label: string
  className?: string
  style?: CSSProperties
  children: ReactNode
  /** 文本类：宽高随内容 */
  autoSize?: boolean
  'data-wx-chat-header-btn'?: 'back' | 'time' | 'psyche' | 'more'
  'data-wx-chat-header-avatar'?: true
  'data-wx-chat-header-title'?: true
  'data-wx-chat-header-sub'?: true
}) {
  const patchPath = useLookWorkshopStore((s) => s.patchPath)
  const sessionRef = useRef<DragSession | null>(null)
  const rafRef = useRef(0)
  const pendingRef = useRef<HeaderFreePos | null>(null)

  const flush = () => {
    rafRef.current = 0
    const next = pendingRef.current
    pendingRef.current = null
    if (!next) return
    patchPath(posPath(target), next)
  }

  const scheduleWrite = (next: HeaderFreePos) => {
    pendingRef.current = next
    if (sessionRef.current) sessionRef.current.live = next
    if (!rafRef.current) rafRef.current = requestAnimationFrame(flush)
  }

  const applyDomPos = (el: HTMLElement, next: HeaderFreePos) => {
    el.style.left = `${next.xPct}%`
    el.style.top = `${next.yPct}%`
  }

  const onPointerDown = (e: ReactPointerEvent<HTMLElement>) => {
    if (e.button !== 0) return
    const el = e.currentTarget
    const headerEl = el.closest('[data-wx-chat-header]') as HTMLElement | null
    if (!headerEl) return
    e.preventDefault()
    e.stopPropagation()
    el.setPointerCapture(e.pointerId)

    const headerRect = headerEl.getBoundingClientRect()
    const x = clamp(e.clientX - headerRect.left, 0, headerRect.width)
    const y = clamp(e.clientY - headerRect.top, 0, headerRect.height)
    const next: HeaderFreePos = {
      free: true,
      xPct: clamp((x / Math.max(1, headerRect.width)) * 100, 0, 100),
      yPct: clamp((y / Math.max(1, headerRect.height)) * 100, 0, 100),
    }

    sessionRef.current = { pointerId: e.pointerId, headerEl, live: next }
    applyDomPos(el, next)
    el.style.zIndex = '40'
    scheduleWrite(next)
  }

  const onPointerMove = (e: ReactPointerEvent<HTMLElement>) => {
    const session = sessionRef.current
    if (!session || session.pointerId !== e.pointerId) return
    const headerRect = session.headerEl.getBoundingClientRect()
    const x = clamp(e.clientX - headerRect.left, 0, headerRect.width)
    const y = clamp(e.clientY - headerRect.top, 0, headerRect.height)
    const next: HeaderFreePos = {
      free: true,
      xPct: clamp((x / Math.max(1, headerRect.width)) * 100, 0, 100),
      yPct: clamp((y / Math.max(1, headerRect.height)) * 100, 0, 100),
    }
    applyDomPos(e.currentTarget, next)
    scheduleWrite(next)
  }

  const endDrag = (e: ReactPointerEvent<HTMLElement>) => {
    const session = sessionRef.current
    if (!session || session.pointerId !== e.pointerId) return
    sessionRef.current = null
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = 0
    }
    const finalPos = pendingRef.current ?? session.live
    pendingRef.current = null
    patchPath(posPath(target), finalPos)
    e.currentTarget.style.zIndex = '30'
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }
  }

  const boxStyle: CSSProperties = autoSize
    ? {
        width: 'auto',
        height: 'auto',
        maxWidth: '70%',
      }
    : {
        width: sizePx ?? 36,
        height: sizePx ?? 36,
      }

  return (
    <span
      role="button"
      tabIndex={0}
      aria-label={`${label}（拖动调整位置）`}
      data-wx-chat-header-btn={btnAttr}
      {...(avatarAttr ? { 'data-wx-chat-header-avatar': '' } : {})}
      {...(titleAttr ? { 'data-wx-chat-header-title': '' } : {})}
      {...(subAttr ? { 'data-wx-chat-header-sub': '' } : {})}
      data-lw-header-drag={target}
      className={`lw-header-drag absolute z-30 flex items-center justify-center touch-none select-none ${className}`}
      style={{
        ...boxStyle,
        left: `${pos.xPct}%`,
        top: `${pos.yPct}%`,
        transform: 'translate(-50%, -50%)',
        ...style,
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      {children}
    </span>
  )
}
