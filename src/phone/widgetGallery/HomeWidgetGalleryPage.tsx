import { useCallback, useEffect, useRef, useState } from 'react'
import {
  GALLERY_GRID_COLS,
  GALLERY_GRID_GAP,
  GALLERY_GRID_ROWS,
  spanOf,
  type GridOrigin,
} from './galleryGrid'
import { useWidgetGallery } from './WidgetGalleryContext'
import { GridSlotWidgetTile } from './widgets/GridSlotWidgetTile'

type Props = {
  /** 主屏页码 0/1/2，对应组件 page 字段 */
  page: number
  /** 当前可视主屏页（拖拽落点页） */
  activeHomePage: number
  isEditMode: boolean
  onEnterEditMode: () => void
  onExitEditMode?: () => void
  onDragActiveChange?: (active: boolean, widgetId: string | null) => void
  /** 拖组件贴边停留后翻页（与图标同一套） */
  onDragEdgePageFlip?: (dir: -1 | 1) => boolean
  /** 叠在图标页上：空白穿透点击，仅组件可点；网格与主屏 4×7 对齐 */
  overlay?: boolean
}

export function HomeWidgetGalleryPage({
  page,
  activeHomePage,
  isEditMode,
  onEnterEditMode,
  onDragActiveChange,
  onDragEdgePageFlip,
  overlay = false,
}: Props) {
  const { enabledOnPage } = useWidgetGallery()
  const items = enabledOnPage(page)

  const canvasRef = useRef<HTMLDivElement>(null)
  const [cellSize, setCellSize] = useState(72)
  const [hover, setHover] = useState<{ id: string; origin: GridOrigin } | null>(
    null,
  )
  const longPressTimer = useRef<number | null>(null)

  useEffect(() => {
    const el = canvasRef.current
    if (!el) return

    const measure = () => {
      const w = el.clientWidth
      const h = el.clientHeight
      if (w <= 0 || h <= 0) return
      const byW = Math.floor(
        (w - GALLERY_GRID_GAP * (GALLERY_GRID_COLS - 1)) / GALLERY_GRID_COLS,
      )
      const byH = Math.floor(
        (h - GALLERY_GRID_GAP * (GALLERY_GRID_ROWS - 1)) / GALLERY_GRID_ROWS,
      )
      const next = Math.max(40, Math.min(byW, byH))
      setCellSize((prev) => (prev === next ? prev : next))
    }

    measure()
    const ro = new ResizeObserver(() => {
      measure()
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const clearLongPress = useCallback(() => {
    if (longPressTimer.current != null) {
      window.clearTimeout(longPressTimer.current)
    }
    longPressTimer.current = null
  }, [])

  const handlePointerDownCapture = useCallback(
    (e: React.PointerEvent) => {
      if (isEditMode) return
      const target = e.target as HTMLElement | null
      if (target?.closest?.('[data-widget-editing="true"]')) return
      if (target?.closest?.('[data-widget-add-ui="true"]')) return
      if (!target?.closest?.('[data-desktop-gallery-widget="true"]')) {
        return
      }
      clearLongPress()
      longPressTimer.current = window.setTimeout(() => {
        window.getSelection()?.removeAllRanges()
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          navigator.vibrate(12)
        }
        onEnterEditMode()
      }, 480)
    },
    [clearLongPress, isEditMode, onEnterEditMode],
  )

  const hoverPlacement = hover
    ? items.find((p) => p.id === hover.id) ?? null
    : null
  const hoverSpan = hoverPlacement ? spanOf(hoverPlacement.size) : null

  return (
    <div
      className={`relative flex h-full min-h-0 flex-col select-none ${
        overlay ? 'pointer-events-none' : 'px-3 pb-2 pt-2'
      }`}
      style={{
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none',
        touchAction: overlay ? undefined : 'none',
      }}
      onContextMenu={(e) => e.preventDefault()}
      onPointerDownCapture={handlePointerDownCapture}
      onPointerUpCapture={clearLongPress}
      onPointerCancelCapture={clearLongPress}
      onPointerMoveCapture={(e) => {
        if (!longPressTimer.current) return
        if (Math.abs(e.movementX) + Math.abs(e.movementY) > 12) clearLongPress()
      }}
    >
      {!overlay && items.length === 0 ? (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-4">
          <p className="text-center text-[12px] text-white/55">
            {isEditMode
              ? '点右上角 + 添加桌面组件'
              : '长按桌面进入编辑，再点右上角 + 添加'}
          </p>
        </div>
      ) : null}

      <div
        ref={canvasRef}
        data-home-widget-canvas={String(page)}
        className={`relative min-h-0 overflow-hidden ${
          overlay
            ? 'h-full w-full'
            : `flex-1 ${items.length === 0 ? 'pointer-events-none opacity-0' : ''}`
        }`}
        style={
          overlay
            ? {
                display: 'grid',
                gridTemplateColumns: `repeat(${GALLERY_GRID_COLS}, minmax(0, 1fr))`,
                gridTemplateRows: `repeat(${GALLERY_GRID_ROWS}, minmax(0, 1fr))`,
                gap: GALLERY_GRID_GAP,
                touchAction: undefined,
              }
            : {
                display: 'grid',
                gridTemplateColumns: `repeat(${GALLERY_GRID_COLS}, ${cellSize}px)`,
                gridTemplateRows: `repeat(${GALLERY_GRID_ROWS}, ${cellSize}px)`,
                gap: GALLERY_GRID_GAP,
                justifyContent: 'center',
                alignContent: 'start',
                touchAction: 'none',
              }
        }
      >
        {hover && hoverSpan ? (
          <div
            className="pointer-events-none rounded-[18px] border border-dashed border-white/55 bg-white/12"
            style={{
              gridColumn: `${hover.origin.col + 1} / span ${hoverSpan.w}`,
              gridRow: `${hover.origin.row + 1} / span ${hoverSpan.h}`,
              zIndex: 0,
            }}
          />
        ) : null}

        {items.map((placement) => (
          <GridSlotWidgetTile
            key={placement.id}
            placement={placement}
            isEditMode={isEditMode}
            cellSize={cellSize}
            canvasRef={canvasRef}
            dropPage={activeHomePage}
            fillGrid={overlay}
            onHoverOrigin={(id, origin) => {
              setHover(origin ? { id, origin } : null)
            }}
            onDragActiveChange={(active) => {
              onDragActiveChange?.(active, active ? placement.id : null)
            }}
            onDragEdgePageFlip={onDragEdgePageFlip}
          />
        ))}
      </div>
    </div>
  )
}
