import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import { createPortal } from 'react-dom'
import { useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'
import {
  clampOrigin,
  originsOverlap,
  pointerToOriginFromCanvas,
  resolveGridOrigin,
  spanOf,
  type GridOrigin,
  GALLERY_GRID_GAP,
} from '../galleryGrid'
import { useWidgetGallery } from '../WidgetGalleryContext'
import type { GalleryWidgetPlacement } from '../types'
import { renderGalleryWidget } from './registry'

type Props = {
  placement: GalleryWidgetPlacement
  isEditMode: boolean
  cellSize: number
  canvasRef: React.RefObject<HTMLDivElement | null>
  /** 松手时落到的主屏页（支持跨页拖） */
  dropPage: number
  /** 与主屏 1fr 网格对齐时铺满格子，不写死像素高 */
  fillGrid?: boolean
  onHoverOrigin: (id: string, origin: GridOrigin | null) => void
  onDragActiveChange?: (active: boolean) => void
  /** 拖拽贴边停留后请求翻页（与图标同一套逻辑） */
  onDragEdgePageFlip?: (dir: -1 | 1) => boolean
}

/** 与主屏图标拖拽一致：贴边停留满 0.5 秒翻页 */
const DRAG_EDGE_HOLD_MS = 500

type DragSession = {
  pointerId: number
  /** 按下点相对组件左上角，避免鬼影跳到手指中心造成错位 */
  offsetX: number
  offsetY: number
  width: number
  height: number
}

export function GridSlotWidgetTile({
  placement,
  isEditMode,
  cellSize,
  canvasRef,
  dropPage,
  fillGrid = false,
  onHoverOrigin,
  onDragActiveChange,
  onDragEdgePageFlip,
}: Props) {
  const { removeWidget, movePlacementToPage, swapPlacementOrigins, state } =
    useWidgetGallery()
  const origin = resolveGridOrigin(placement)
  const span = spanOf(placement.size)
  const [dragging, setDragging] = useState(false)
  const [ghost, setGhost] = useState<{ x: number; y: number } | null>(null)
  const sessionRef = useRef<DragSession | null>(null)
  const edgeHoldRef = useRef<{ side: 'left' | 'right' | null; since: number }>({
    side: null,
    since: 0,
  })
  const nodeRef = useRef<HTMLDivElement | null>(null)
  const width = cellSize * span.w + GALLERY_GRID_GAP * (span.w - 1)
  const height = cellSize * span.h + GALLERY_GRID_GAP * (span.h - 1)

  const shell =
    typeof document !== 'undefined'
      ? document.querySelector('[data-phone-shell="true"]')
      : null

  const style: CSSProperties = {
    gridColumn: `${origin.col + 1} / span ${span.w}`,
    gridRow: `${origin.row + 1} / span ${span.h}`,
    width: '100%',
    height: fillGrid ? '100%' : height,
    minHeight: fillGrid ? 0 : height,
    zIndex: dragging ? 40 : 1,
    opacity: dragging ? 0.28 : 1,
    // 非编辑态交给主屏翻页；编辑态才禁用浏览器手势以便拖拽
    touchAction: isEditMode ? 'none' : 'pan-y',
    cursor: isEditMode ? 'grab' : undefined,
  }

  const tryEdgePageFlip = (clientX: number) => {
    if (!onDragEdgePageFlip) return
    const viewport =
      (typeof document !== 'undefined'
        ? (document.querySelector(
            '[data-home-pager-viewport="true"]',
          ) as HTMLElement | null)
        : null) ?? null
    if (!viewport) return
    const rect = viewport.getBoundingClientRect()
    const zone = Math.max(56, rect.width * 0.22)
    const nearLeft = clientX <= rect.left + zone
    const nearRight = clientX >= rect.right - zone
    const side: 'left' | 'right' | null = nearLeft ? 'left' : nearRight ? 'right' : null
    const hold = edgeHoldRef.current
    if (side !== hold.side) {
      edgeHoldRef.current = { side, since: side ? Date.now() : 0 }
      return
    }
    if (!side || Date.now() - hold.since < DRAG_EDGE_HOLD_MS) return
    const flipped = onDragEdgePageFlip(side === 'right' ? 1 : -1)
    if (flipped) {
      edgeHoldRef.current = { side, since: Date.now() }
    }
  }

  const onPointerDown = (e: ReactPointerEvent) => {
    if (!isEditMode) return
    const target = e.target as HTMLElement | null
    if (target?.closest?.('[data-widget-add-ui="true"]')) return
    e.stopPropagation()
    e.preventDefault()

    const rect = nodeRef.current?.getBoundingClientRect()
    const offsetX = rect ? e.clientX - rect.left : width / 2
    const offsetY = rect ? e.clientY - rect.top : height / 2

    sessionRef.current = {
      pointerId: e.pointerId,
      offsetX,
      offsetY,
      width: rect?.width ?? width,
      height: rect?.height ?? height,
    }
    edgeHoldRef.current = { side: null, since: 0 }
    setDragging(true)
    onDragActiveChange?.(true)
    setGhost({
      x: e.clientX - offsetX,
      y: e.clientY - offsetY,
    })
    ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
  }

  const onPointerMove = (e: ReactPointerEvent) => {
    const s = sessionRef.current
    if (!s || s.pointerId !== e.pointerId) return
    e.stopPropagation()
    setGhost({
      x: e.clientX - s.offsetX,
      y: e.clientY - s.offsetY,
    })
    tryEdgePageFlip(e.clientX)
    const canvasEl =
      (document.querySelector(
        `[data-home-widget-canvas="${dropPage}"]`,
      ) as HTMLDivElement | null) ?? canvasRef.current
    if (!canvasEl) return
    const next = pointerToOriginFromCanvas(
      e.clientX,
      e.clientY,
      canvasEl.getBoundingClientRect(),
      placement.size,
    )
    onHoverOrigin(placement.id, next)
  }

  const endDrag = (e: ReactPointerEvent) => {
    const s = sessionRef.current
    if (!s || s.pointerId !== e.pointerId) return
    e.stopPropagation()
    sessionRef.current = null
    edgeHoldRef.current = { side: null, since: 0 }
    setDragging(false)
    onDragActiveChange?.(false)
    setGhost(null)
    onHoverOrigin(placement.id, null)

    const targetPage = Math.max(0, Math.min(2, dropPage))
    const canvasEl =
      (document.querySelector(
        `[data-home-widget-canvas="${targetPage}"]`,
      ) as HTMLDivElement | null) ?? canvasRef.current
    if (!canvasEl) return
    const target = clampOrigin(
      pointerToOriginFromCanvas(
        e.clientX,
        e.clientY,
        canvasEl.getBoundingClientRect(),
        placement.size,
      ),
      placement.size,
    )

    const pageItems = state.placements.filter(
      (p) => p.enabled && p.page === targetPage,
    )

    const hit = pageItems.find((p) => {
      if (p.id === placement.id) return false
      const o = resolveGridOrigin(p)
      return originsOverlap(target, placement.size, o, p.size)
    })

    if (hit && targetPage === placement.page) {
      const sameSize =
        spanOf(placement.size).w === spanOf(hit.size).w &&
        spanOf(placement.size).h === spanOf(hit.size).h
      if (sameSize) {
        swapPlacementOrigins(placement.id, hit.id)
        return
      }
    }

    movePlacementToPage(placement.id, targetPage, target.col, target.row)
  }

  return (
    <motion.div
      ref={nodeRef}
      data-desktop-gallery-widget="true"
      style={style}
      className="relative pointer-events-auto"
      layout={false}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      {renderGalleryWidget({
        placement,
        isEditMode,
        isDragging: dragging,
      })}
      {isEditMode && !dragging ? (
        <button
          type="button"
          data-widget-add-ui="true"
          aria-label="移除组件"
          className="absolute -right-1 -top-1 z-50 flex h-6 w-6 items-center justify-center rounded-full border border-white/70 bg-[#2c2c2e]/88 text-white shadow-md"
          onPointerDown={(ev) => {
            ev.stopPropagation()
            ev.preventDefault()
          }}
          onClick={(ev) => {
            ev.stopPropagation()
            removeWidget(placement.id)
          }}
        >
          <X size={11} strokeWidth={2.4} />
        </button>
      ) : null}

      {dragging && ghost && shell
        ? createPortal(
            <div
              className="pointer-events-none fixed z-[95]"
              style={{
                left: ghost.x,
                top: ghost.y,
                width: sessionRef.current?.width ?? width,
                height: sessionRef.current?.height ?? height,
                filter: 'drop-shadow(0 12px 22px rgba(28,28,30,0.22))',
              }}
            >
              {renderGalleryWidget({
                placement,
                isEditMode: true,
                isDragging: true,
              })}
            </div>,
            shell,
          )
        : null}
    </motion.div>
  )
}
