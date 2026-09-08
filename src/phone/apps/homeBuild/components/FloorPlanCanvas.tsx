import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BoxSelect, BrickWall, DoorOpen, Grid3x3, Hammer, Paintbrush, SquareStack } from 'lucide-react'
import {
  clampPlanGridSize,
  floorMaterialPreviewColor,
  GRID_CELL_METERS,
  PLAN_GRID_DEFAULT,
  uid,
} from '../defaults'
import {
  buildFloorTileMap,
  gridCellsInRect,
  materialIdForFloorCell,
  snapGridCell,
} from '../floorTileMaterials'
import { wallsMatchingSegment } from '../floorPlanGeometry'
import { ceilingHolesFromFloorBelow, tileInCeilingHole } from '../scene3dUtils'
import {
  findClosestWall,
  openingWorldPoint,
  snapWallEnd,
  wallAngle,
  wallLength,
  worldToCanvas,
  CANVAS_ORIGIN,
  PX_PER_M,
} from '../floorPlanCanvasDraw'
import { HOME_BUILD } from '../theme'
import { formatAreaM2, roomAreaM2 } from '../floorPlanArea'
import {
  defaultPlanView,
  panView,
  screenToWorld,
  zoomAtScreenPoint,
  clampZoom,
  type PlanView,
} from '../floorPlanView'
import {
  iterWallMeterSegments,
  materialIdForWallSegment,
  pointOnWall,
  wallMaterialPreviewColor,
  wallSegmentsBetween,
} from '../wallSegmentMaterials'
import { roomFloorTiles } from '../roomFloorRender'
import { activeFloor, snapPoint, useHomeBuildStore } from '../store'
import type { FloorPlanTool, Vec2, WallSegment } from '../types'
import { FloorPlanHint, FloorPlanSidebar } from './FloorPlanSidebar'
import { FloorPlanViewPanel } from './FloorPlanViewPanel'
import { MaterialPicker } from './MaterialPicker'
import { OpeningPicker, WallConfirmBar } from './OpeningPicker'
import { SelectionActionBar } from './SelectionActionBar'

const TOOLS: { id: FloorPlanTool; label: string; icon: typeof Grid3x3 }[] = [
  { id: 'wall', label: '画墙', icon: Grid3x3 },
  { id: 'demolish', label: '拆除', icon: Hammer },
  { id: 'room', label: '框选', icon: BoxSelect },
  { id: 'doorWindow', label: '门窗', icon: DoorOpen },
  { id: 'ceilingHole', label: '开洞', icon: SquareStack },
]

const MATERIAL_TOOLS = [
  { target: 'floor' as const, label: '地砖', icon: Paintbrush },
  { target: 'wall' as const, label: '墙面', icon: BrickWall },
]

type PendingWall = { start: Vec2; end: Vec2 }
type OpeningDraft = { wallId: string; t: number }
type SelectionRect = { x: number; z: number; w: number; h: number }

function cellInAnyRoom(gx: number, gz: number, rooms: ReturnType<typeof activeFloor>['rooms']): boolean {
  const center = { x: gx + 0.5, z: gz + 0.5 }
  return rooms.some((r) => {
    const { x, z, w, h } = r.rect
    return center.x >= x && center.x <= x + w && center.z >= z && center.z <= z + h
  })
}

function drawFloorCell(
  ctx: CanvasRenderingContext2D,
  gx: number,
  gz: number,
  materialId: string | undefined,
  ox: number,
  oy: number,
  highlight?: boolean,
) {
  const px = ox + gx * PX_PER_M
  const py = oy + gz * PX_PER_M
  ctx.fillStyle = highlight ? HOME_BUILD.planRoomSel : floorMaterialPreviewColor(materialId)
  ctx.fillRect(px, py, PX_PER_M, PX_PER_M)
  if (!highlight) {
    ctx.fillStyle = HOME_BUILD.planRoomFill
    ctx.fillRect(px, py, PX_PER_M, PX_PER_M)
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.06)'
  ctx.lineWidth = 0.5
  ctx.strokeRect(px + 0.5, py + 0.5, PX_PER_M - 1, PX_PER_M - 1)
}

function drawFloorVoidCell(
  ctx: CanvasRenderingContext2D,
  gx: number,
  gz: number,
  ox: number,
  oy: number,
) {
  const px = ox + gx * PX_PER_M
  const py = oy + gz * PX_PER_M
  const s = PX_PER_M

  ctx.fillStyle = 'rgba(255, 148, 40, 0.32)'
  ctx.fillRect(px, py, s, s)

  ctx.fillStyle = 'rgba(0, 0, 0, 0.42)'
  ctx.fillRect(px + 2, py + 2, s - 4, s - 4)

  ctx.save()
  ctx.beginPath()
  ctx.rect(px + 2, py + 2, s - 4, s - 4)
  ctx.clip()
  ctx.strokeStyle = 'rgba(255, 190, 90, 0.45)'
  ctx.lineWidth = 1
  for (let i = -s; i < s * 2; i += 5) {
    ctx.beginPath()
    ctx.moveTo(px + i, py)
    ctx.lineTo(px + i - s, py + s)
    ctx.stroke()
  }
  ctx.restore()

  ctx.strokeStyle = 'rgba(255, 200, 80, 0.55)'
  ctx.lineWidth = 1
  ctx.strokeRect(px + 2.5, py + 2.5, s - 5, s - 5)

  ctx.strokeStyle = '#ffb040'
  ctx.lineWidth = 2
  ctx.strokeRect(px + 1, py + 1, s - 2, s - 2)

  ctx.fillStyle = 'rgba(255, 210, 120, 0.95)'
  ctx.font = 'bold 10px PingFang SC, Inter, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('空', px + s / 2, py + s / 2)
}

function drawVoidHoleHighlight(
  ctx: CanvasRenderingContext2D,
  rect: { x: number; z: number; w: number; h: number },
  ox: number,
  oy: number,
  label: string,
) {
  const px = ox + rect.x * PX_PER_M
  const py = oy + rect.z * PX_PER_M
  const pw = rect.w * PX_PER_M
  const ph = rect.h * PX_PER_M

  ctx.fillStyle = 'rgba(255, 148, 40, 0.12)'
  ctx.fillRect(px, py, pw, ph)

  ctx.strokeStyle = 'rgba(255, 180, 60, 0.65)'
  ctx.lineWidth = 1.5
  ctx.setLineDash([5, 4])
  ctx.strokeRect(px + 0.5, py + 0.5, pw - 1, ph - 1)
  ctx.setLineDash([])

  ctx.strokeStyle = '#ffaa33'
  ctx.lineWidth = 2.5
  ctx.strokeRect(px, py, pw, ph)

  ctx.fillStyle = '#ffc870'
  ctx.font = 'bold 10px PingFang SC, Inter, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(label, px + pw / 2, py + ph / 2)
}

function drawWallSegmentLine(
  ctx: CanvasRenderingContext2D,
  wall: WallSegment,
  t0: number,
  t1: number,
  ox: number,
  oy: number,
  color: string,
  lineWidth: number,
) {
  const p0 = pointOnWall(wall, t0)
  const p1 = pointOnWall(wall, t1)
  const a = worldToCanvas(p0, ox, oy)
  const b = worldToCanvas(p1, ox, oy)
  ctx.strokeStyle = color
  ctx.lineWidth = lineWidth
  ctx.lineCap = 'butt'
  ctx.beginPath()
  ctx.moveTo(a.x, a.y)
  ctx.lineTo(b.x, b.y)
  ctx.stroke()
}

function drawOpenings(
  ctx: CanvasRenderingContext2D,
  walls: WallSegment[],
  openings: ReturnType<typeof activeFloor>['openings'],
  ox: number,
  oy: number,
) {
  for (const op of openings) {
    const wall = walls.find((w) => w.id === op.wallId)
    if (!wall) continue
    const len = wallLength(wall)
    if (len < 0.1) continue
    const angle = wallAngle(wall)
    const center = openingWorldPoint(wall, op.t)
    const c = worldToCanvas(center, ox, oy)
    const halfW = ((op.width / len) * len * PX_PER_M) / 2

    ctx.save()
    ctx.translate(c.x, c.y)
    ctx.rotate(angle)

    if (op.kind === 'door') {
      ctx.strokeStyle = HOME_BUILD.planWall
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(-halfW, 0, halfW * 2, -Math.PI / 2, 0)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(-halfW, 0)
      ctx.lineTo(halfW, 0)
      ctx.stroke()
    } else {
      ctx.strokeStyle = 'rgba(120, 180, 255, 0.9)'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(-halfW, 0)
      ctx.lineTo(halfW, 0)
      ctx.stroke()
      ctx.lineWidth = 1
      ctx.strokeStyle = 'rgba(120, 180, 255, 0.5)'
      ctx.beginPath()
      ctx.moveTo(-halfW, -3)
      ctx.lineTo(halfW, -3)
      ctx.moveTo(-halfW, 3)
      ctx.lineTo(halfW, 3)
      ctx.stroke()
    }
    ctx.restore()
  }
}

export function FloorPlanCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const paintSizeRef = useRef({ w: 0, h: 0 })
  const paintFrameRef = useRef(0)
  const capturePointerRef = useRef<number | null>(null)

  const draft = useHomeBuildStore((s) => s.draft)
  const floorTool = useHomeBuildStore((s) => s.floorTool)
  const selectedRoomId = useHomeBuildStore((s) => s.selectedRoomId)
  const selectedWallId = useHomeBuildStore((s) => s.selectedWallId)
  const floorTransition = useHomeBuildStore((s) => s.floorTransition)
  const selectWall = useHomeBuildStore((s) => s.selectWall)
  const addWall = useHomeBuildStore((s) => s.addWall)
  const addWallsForRect = useHomeBuildStore((s) => s.addWallsForRect)
  const demolishWalls = useHomeBuildStore((s) => s.demolishWalls)
  const demolishInRect = useHomeBuildStore((s) => s.demolishInRect)
  const addCeilingHole = useHomeBuildStore((s) => s.addCeilingHole)
  const setMaterialOpen = useHomeBuildStore((s) => s.setMaterialOpen)
  const setMaterialTarget = useHomeBuildStore((s) => s.setMaterialTarget)
  const materialTarget = useHomeBuildStore((s) => s.materialTarget)
  const selectedFloorTiles = useHomeBuildStore((s) => s.selectedFloorTiles)
  const selectedWallSegments = useHomeBuildStore((s) => s.selectedWallSegments)
  const setSelectedFloorTiles = useHomeBuildStore((s) => s.setSelectedFloorTiles)
  const setSelectedWallSegments = useHomeBuildStore((s) => s.setSelectedWallSegments)
  const clearFloorTileSelection = useHomeBuildStore((s) => s.clearFloorTileSelection)
  const clearWallSegmentSelection = useHomeBuildStore((s) => s.clearWallSegmentSelection)
  const setMode = useHomeBuildStore((s) => s.setMode)
  const save = useHomeBuildStore((s) => s.save)

  const floor = activeFloor(draft)
  const [drag, setDrag] = useState<{ start: Vec2; end: Vec2 } | null>(null)
  const [pendingWall, setPendingWall] = useState<PendingWall | null>(null)
  const [pendingDemolish, setPendingDemolish] = useState<PendingWall | null>(null)
  const [selectionRect, setSelectionRect] = useState<SelectionRect | null>(null)
  const [openingDraft, setOpeningDraft] = useState<OpeningDraft | null>(null)
  const [showHint, setShowHint] = useState(true)
  const [view, setView] = useState<PlanView>(defaultPlanView)
  const [panMode, setPanMode] = useState(false)
  const [viewPanning, setViewPanning] = useState(false)
  const [wallSelectDrag, setWallSelectDrag] = useState<{ wallId: string; tStart: number; tEnd: number } | null>(
    null,
  )
  const viewPanRef = useRef<{ sx: number; sy: number; panX: number; panY: number } | null>(null)
  const pinchRef = useRef<{ dist: number; scale: number; midX: number; midY: number } | null>(null)
  const spaceHeldRef = useRef(false)
  const panModeRef = useRef(panMode)
  panModeRef.current = panMode
  const containerRef = useRef<HTMLDivElement>(null)

  const demolishPreviewIds = useMemo(() => {
    const line = pendingDemolish ?? (drag && floorTool === 'demolish' ? drag : null)
    if (!line) return new Set<string>()
    const end = snapWallEnd(line.start, line.end)
    return new Set(wallsMatchingSegment(floor.walls, line.start, end))
  }, [pendingDemolish, drag, floorTool, floor.walls])

  const draftRef = useRef(draft)
  draftRef.current = draft
  const floorToolRef = useRef(floorTool)
  floorToolRef.current = floorTool
  const selectedRoomIdRef = useRef(selectedRoomId)
  selectedRoomIdRef.current = selectedRoomId
  const selectedWallIdRef = useRef(selectedWallId)
  selectedWallIdRef.current = selectedWallId
  const dragRef = useRef(drag)
  dragRef.current = drag
  const pendingWallRef = useRef(pendingWall)
  pendingWallRef.current = pendingWall
  const pendingDemolishRef = useRef(pendingDemolish)
  pendingDemolishRef.current = pendingDemolish
  const selectionRectRef = useRef(selectionRect)
  selectionRectRef.current = selectionRect
  const demolishPreviewIdsRef = useRef(demolishPreviewIds)
  demolishPreviewIdsRef.current = demolishPreviewIds
  const viewRef = useRef(view)
  viewRef.current = view
  const selectedFloorTilesRef = useRef(selectedFloorTiles)
  selectedFloorTilesRef.current = selectedFloorTiles
  const selectedWallSegmentsRef = useRef(selectedWallSegments)
  selectedWallSegmentsRef.current = selectedWallSegments
  const wallSelectDragRef = useRef(wallSelectDrag)
  wallSelectDragRef.current = wallSelectDrag

  const ox = CANVAS_ORIGIN.x
  const oy = CANVAS_ORIGIN.y

  const paint = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const draft = draftRef.current
    const floor = activeFloor(draft)
    const floorIdx = draft.floors.findIndex((f) => f.id === draft.activeFloorId)
    const holesFromBelow = floorIdx > 0 ? draft.floors[floorIdx - 1]!.ceilingHoles : []
    const floorTool = floorToolRef.current
    const selectedRoomId = selectedRoomIdRef.current
    const selectedWallId = selectedWallIdRef.current
    const drag = dragRef.current
    const pendingWall = pendingWallRef.current
    const pendingDemolish = pendingDemolishRef.current
    const selectionRect = selectionRectRef.current
    const demolishPreviewIds = demolishPreviewIdsRef.current

    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    const cssW = Math.max(1, Math.floor(rect.width))
    const cssH = Math.max(1, Math.floor(rect.height))
    const bufW = Math.floor(cssW * dpr)
    const bufH = Math.floor(cssH * dpr)
    if (paintSizeRef.current.w !== bufW || paintSizeRef.current.h !== bufH) {
      canvas.width = bufW
      canvas.height = bufH
      paintSizeRef.current = { w: bufW, h: bufH }
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    const w = cssW
    const h = cssH

    ctx.fillStyle = HOME_BUILD.planBg
    ctx.fillRect(0, 0, w, h)

    const view = viewRef.current
    ctx.save()
    ctx.translate(view.panX, view.panY)
    ctx.scale(view.scale, view.scale)

    ctx.strokeStyle = HOME_BUILD.planGrid
    ctx.lineWidth = 1
    const gridSize = clampPlanGridSize(draft.planGridSize ?? PLAN_GRID_DEFAULT)
    for (let x = 0; x <= gridSize; x++) {
      const px = ox + x * PX_PER_M
      ctx.beginPath()
      ctx.moveTo(px, oy)
      ctx.lineTo(px, oy + gridSize * PX_PER_M)
      ctx.stroke()
    }
    for (let y = 0; y <= gridSize; y++) {
      const py = oy + y * PX_PER_M
      ctx.beginPath()
      ctx.moveTo(ox, py)
      ctx.lineTo(ox + gridSize * PX_PER_M, py)
      ctx.stroke()
    }
    // 可建造区域外框
    ctx.strokeStyle = 'rgba(255,255,255,0.22)'
    ctx.lineWidth = 1.5
    ctx.strokeRect(ox, oy, gridSize * PX_PER_M, gridSize * PX_PER_M)

    for (const f of draft.floors) {
      if (f.id === draft.activeFloorId) continue
      ctx.setLineDash([4, 6])
      ctx.strokeStyle = 'rgba(255,255,255,0.15)'
      ctx.lineWidth = 1
      for (const wall of f.walls) {
        const a = worldToCanvas(wall.a, ox, oy)
        const b = worldToCanvas(wall.b, ox, oy)
        ctx.beginPath()
        ctx.moveTo(a.x, a.y)
        ctx.lineTo(b.x, b.y)
        ctx.stroke()
      }
      ctx.setLineDash([])
    }

    for (const room of floor.rooms) {
      const r = room.rect
      const isSel = room.id === selectedRoomId
      const tileMap = buildFloorTileMap(floor)
      const tiles = room.tiles?.length && room.tiles.length <= 200 ? room.tiles : roomFloorTiles(room)

      for (const t of tiles) {
        if (tileInCeilingHole(t.x, t.z, holesFromBelow)) {
          drawFloorVoidCell(ctx, t.x, t.z, ox, oy)
          continue
        }
        const matId = materialIdForFloorCell(t.x, t.z, tileMap, floor.rooms)
        drawFloorCell(ctx, t.x, t.z, matId, ox, oy, isSel)
      }

      ctx.fillStyle = HOME_BUILD.planLabel
      ctx.font = '11px PingFang SC, Inter, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(
        room.name,
        ox + (r.x + r.w / 2) * PX_PER_M,
        oy + (r.z + r.h / 2) * PX_PER_M - 4,
      )
      const areaLabel = `${formatAreaM2(roomAreaM2(room))}㎡`
      ctx.fillStyle = 'rgba(255, 255, 255, 0.55)'
      ctx.font = '10px PingFang SC, Inter, sans-serif'
      ctx.fillText(
        areaLabel,
        ox + (r.x + r.w / 2) * PX_PER_M,
        oy + (r.z + r.h / 2) * PX_PER_M + 10,
      )
    }

    for (const tm of floor.floorTileMaterials ?? []) {
      if (cellInAnyRoom(tm.x, tm.z, floor.rooms)) continue
      if (tileInCeilingHole(tm.x, tm.z, holesFromBelow)) continue
      drawFloorCell(ctx, tm.x, tm.z, tm.materialId, ox, oy)
    }

    const selectedTiles = selectedFloorTilesRef.current
    for (const t of selectedTiles) {
      ctx.strokeStyle = HOME_BUILD.planWallActive
      ctx.lineWidth = 2
      ctx.setLineDash([])
      ctx.strokeRect(ox + t.x * PX_PER_M + 1, oy + t.z * PX_PER_M + 1, PX_PER_M - 2, PX_PER_M - 2)
    }

    for (const hole of holesFromBelow) {
      drawVoidHoleHighlight(ctx, hole.rect, ox, oy, '挑空')
    }

    for (const hole of floor.ceilingHoles) {
      const r = hole.rect
      ctx.save()
      ctx.beginPath()
      ctx.rect(ox + r.x * PX_PER_M, oy + r.z * PX_PER_M, r.w * PX_PER_M, r.h * PX_PER_M)
      ctx.clip()
      ctx.strokeStyle = 'rgba(255, 180, 80, 0.45)'
      for (let i = -20; i < 200; i += 8) {
        ctx.beginPath()
        ctx.moveTo(ox + r.x * PX_PER_M + i, oy + r.z * PX_PER_M)
        ctx.lineTo(ox + r.x * PX_PER_M + i - 40, oy + (r.z + r.h) * PX_PER_M)
        ctx.stroke()
      }
      ctx.restore()
      ctx.fillStyle = 'rgba(255, 200, 120, 0.7)'
      ctx.font = '10px PingFang SC, Inter, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(
        hole.label,
        ox + (r.x + r.w / 2) * PX_PER_M,
        oy + (r.z + r.h / 2) * PX_PER_M,
      )
    }

    for (const wall of floor.walls) {
      const isSel = wall.id === selectedWallId
      const isDemolish = demolishPreviewIds.has(wall.id)
      const segments = iterWallMeterSegments(wall)
      for (const seg of segments) {
        const matId = materialIdForWallSegment(
          wall,
          seg.t0,
          seg.t1,
          floor.wallSegmentMaterials,
          floor.rooms,
        )
        const color = isDemolish
          ? '#FF6B6B'
          : isSel
            ? HOME_BUILD.planWallActive
            : wallMaterialPreviewColor(matId)
        drawWallSegmentLine(ctx, wall, seg.t0, seg.t1, ox, oy, color, isDemolish || isSel ? 4 : 3)
      }
    }

    const wallDrag = wallSelectDragRef.current
    if (wallDrag) {
      const wall = floor.walls.find((w) => w.id === wallDrag.wallId)
      if (wall) {
        for (const seg of wallSegmentsBetween(wall, wallDrag.tStart, wallDrag.tEnd)) {
          drawWallSegmentLine(ctx, wall, seg.t0, seg.t1, ox, oy, HOME_BUILD.planWallActive, 5)
        }
      }
    }

    const selectedWallSegs = selectedWallSegmentsRef.current
    for (const seg of selectedWallSegs) {
      const wall = floor.walls.find((w) => w.id === seg.wallId)
      if (!wall) continue
      drawWallSegmentLine(ctx, wall, seg.t0, seg.t1, ox, oy, 'rgba(229, 72, 77, 0.35)', 8)
      drawWallSegmentLine(ctx, wall, seg.t0, seg.t1, ox, oy, HOME_BUILD.planWallActive, 4)
    }

    drawOpenings(ctx, floor.walls, floor.openings, ox, oy)

    const previewWall = pendingWall ?? (drag && floorTool === 'wall' ? drag : null)
    if (previewWall) {
      const snappedEnd = snapWallEnd(previewWall.start, previewWall.end)
      const a = worldToCanvas(previewWall.start, ox, oy)
      const b = worldToCanvas(snappedEnd, ox, oy)
      ctx.strokeStyle = HOME_BUILD.planWallActive
      ctx.lineWidth = 3
      ctx.setLineDash([])
      ctx.beginPath()
      ctx.moveTo(a.x, a.y)
      ctx.lineTo(b.x, b.y)
      ctx.stroke()
    }

    const previewDemolish = pendingDemolish ?? (drag && floorTool === 'demolish' ? drag : null)
    if (previewDemolish) {
      const snappedEnd = snapWallEnd(previewDemolish.start, previewDemolish.end)
      const a = worldToCanvas(previewDemolish.start, ox, oy)
      const b = worldToCanvas(snappedEnd, ox, oy)
      ctx.strokeStyle = '#FF6B6B'
      ctx.lineWidth = 3
      ctx.setLineDash([6, 4])
      ctx.beginPath()
      ctx.moveTo(a.x, a.y)
      ctx.lineTo(b.x, b.y)
      ctx.stroke()
      ctx.setLineDash([])
    }

    if (selectionRect) {
      ctx.strokeStyle = HOME_BUILD.planWallActive
      ctx.fillStyle = 'rgba(44, 111, 173, 0.12)'
      ctx.lineWidth = 1.5
      ctx.setLineDash([6, 4])
      ctx.fillRect(
        ox + selectionRect.x * PX_PER_M,
        oy + selectionRect.z * PX_PER_M,
        selectionRect.w * PX_PER_M,
        selectionRect.h * PX_PER_M,
      )
      ctx.strokeRect(
        ox + selectionRect.x * PX_PER_M,
        oy + selectionRect.z * PX_PER_M,
        selectionRect.w * PX_PER_M,
        selectionRect.h * PX_PER_M,
      )
      ctx.setLineDash([])
    }

    if (drag && floorTool === 'room') {
      const x = Math.min(drag.start.x, drag.end.x)
      const z = Math.min(drag.start.z, drag.end.z)
      const rw = Math.abs(drag.end.x - drag.start.x)
      const rh = Math.abs(drag.end.z - drag.start.z)
      ctx.strokeStyle = HOME_BUILD.planWallActive
      ctx.lineWidth = 1.5
      ctx.setLineDash([6, 4])
      ctx.strokeRect(ox + x * PX_PER_M, oy + z * PX_PER_M, rw * PX_PER_M, rh * PX_PER_M)
      ctx.setLineDash([])
    }

    if (drag && floorTool === 'demolish') {
      const x = Math.min(drag.start.x, drag.end.x)
      const z = Math.min(drag.start.z, drag.end.z)
      const rw = Math.abs(drag.end.x - drag.start.x)
      const rh = Math.abs(drag.end.z - drag.start.z)
      if (rw >= 0.5 && rh >= 0.5) {
        ctx.strokeStyle = '#FF6B6B'
        ctx.fillStyle = 'rgba(255, 107, 107, 0.12)'
        ctx.lineWidth = 1.5
        ctx.setLineDash([6, 4])
        ctx.fillRect(ox + x * PX_PER_M, oy + z * PX_PER_M, rw * PX_PER_M, rh * PX_PER_M)
        ctx.strokeRect(ox + x * PX_PER_M, oy + z * PX_PER_M, rw * PX_PER_M, rh * PX_PER_M)
        ctx.setLineDash([])
      }
    }

    if (drag && floorTool === 'ceilingHole') {
      const x = Math.min(drag.start.x, drag.end.x)
      const z = Math.min(drag.start.z, drag.end.z)
      const rw = Math.abs(drag.end.x - drag.start.x)
      const rh = Math.abs(drag.end.z - drag.start.z)
      ctx.strokeStyle = HOME_BUILD.planWallActive
      ctx.lineWidth = 1.5
      ctx.setLineDash([6, 4])
      ctx.strokeRect(ox + x * PX_PER_M, oy + z * PX_PER_M, rw * PX_PER_M, rh * PX_PER_M)
      ctx.setLineDash([])
    }

    if (drag && floorTool === 'material') {
      const x = Math.min(drag.start.x, drag.end.x)
      const z = Math.min(drag.start.z, drag.end.z)
      const rw = Math.abs(drag.end.x - drag.start.x)
      const rh = Math.abs(drag.end.z - drag.start.z)
      ctx.strokeStyle = '#7eb8f0'
      ctx.fillStyle = 'rgba(44, 111, 173, 0.15)'
      ctx.lineWidth = 1.5
      ctx.setLineDash([4, 4])
      ctx.fillRect(ox + x * PX_PER_M, oy + z * PX_PER_M, rw * PX_PER_M, rh * PX_PER_M)
      ctx.strokeRect(ox + x * PX_PER_M, oy + z * PX_PER_M, rw * PX_PER_M, rh * PX_PER_M)
      ctx.setLineDash([])
    }

    ctx.restore()
  }, [ox, oy])

  const schedulePaint = useCallback(() => {
    cancelAnimationFrame(paintFrameRef.current)
    paintFrameRef.current = requestAnimationFrame(() => {
      try {
        paint()
      } catch {
        /* ignore */
      }
    })
  }, [paint])

  useEffect(() => {
    schedulePaint()
  }, [
    schedulePaint,
    draft.updatedAt,
    draft.activeFloorId,
    drag,
    pendingWall,
    pendingDemolish,
    selectionRect,
    demolishPreviewIds,
    selectedRoomId,
    selectedWallId,
    floorTool,
    view,
    selectedFloorTiles,
    selectedWallSegments,
    wallSelectDrag,
  ])

  useEffect(() => {
    const canvas = canvasRef.current
    const target = canvas?.parentElement
    if (!target || typeof ResizeObserver === 'undefined') return

    let lastW = 0
    let lastH = 0
    const ro = new ResizeObserver(() => {
      const rect = target.getBoundingClientRect()
      const w = Math.floor(rect.width)
      const h = Math.floor(rect.height)
      if (w === lastW && h === lastH) return
      lastW = w
      lastH = h
      schedulePaint()
    })
    ro.observe(target)
    return () => ro.disconnect()
  }, [schedulePaint])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        spaceHeldRef.current = true
        e.preventDefault()
      }
      if (e.key !== 'Escape') return
      setPendingWall(null)
      setPendingDemolish(null)
      setSelectionRect(null)
      setOpeningDraft(null)
      setDrag(null)
      viewPanRef.current = null
      setViewPanning(false)
      setWallSelectDrag(null)
      clearFloorTileSelection()
      clearWallSegmentSelection()
      setMaterialOpen(false)
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        spaceHeldRef.current = false
        if (viewPanRef.current) {
          viewPanRef.current = null
          setViewPanning(false)
        }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [])

  const applyZoom = useCallback((nextScale: number, anchorX?: number, anchorY?: number) => {
    const canvas = canvasRef.current
    if (!canvas) {
      setView((v) => ({ ...v, scale: clampZoom(nextScale) }))
      return
    }
    const rect = canvas.getBoundingClientRect()
    const ax = anchorX ?? rect.left + rect.width / 2
    const ay = anchorY ?? rect.top + rect.height / 2
    setView((v) => zoomAtScreenPoint(v, ax, ay, rect, nextScale))
  }, [])

  const resetView = useCallback(() => setView(defaultPlanView()), [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      if (e.ctrlKey || e.metaKey) {
        const factor = e.deltaY > 0 ? 0.9 : 1.1
        applyZoom(clampZoom(viewRef.current.scale * factor), e.clientX, e.clientY)
        return
      }
      if (e.shiftKey || Math.abs(e.deltaX) > 0) {
        setView((v) => panView(v, -e.deltaX, -e.deltaY))
        return
      }
      const factor = e.deltaY > 0 ? 0.9 : 1.1
      applyZoom(clampZoom(viewRef.current.scale * factor), e.clientX, e.clientY)
    }
    canvas.addEventListener('wheel', onWheel, { passive: false })
    return () => canvas.removeEventListener('wheel', onWheel)
  }, [applyZoom])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 2) return
      const [a, b] = [e.touches[0]!, e.touches[1]!]
      pinchRef.current = {
        dist: Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY),
        scale: viewRef.current.scale,
        midX: (a.clientX + b.clientX) / 2,
        midY: (a.clientY + b.clientY) / 2,
      }
    }

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 2 || !pinchRef.current) return
      e.preventDefault()
      const [a, b] = [e.touches[0]!, e.touches[1]!]
      const dist = Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY)
      const midX = (a.clientX + b.clientX) / 2
      const midY = (a.clientY + b.clientY) / 2
      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const dx = midX - pinchRef.current.midX
      const dy = midY - pinchRef.current.midY
      const ratio = dist / pinchRef.current.dist
      const nextScale = clampZoom(pinchRef.current.scale * ratio)
      setView((v) => zoomAtScreenPoint(panView(v, dx, dy), midX, midY, rect, nextScale))
      pinchRef.current = { dist, scale: nextScale, midX, midY }
    }

    const onTouchEnd = () => {
      pinchRef.current = null
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('touchend', onTouchEnd)
    el.addEventListener('touchcancel', onTouchEnd)
    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
      el.removeEventListener('touchcancel', onTouchEnd)
    }
  }, [])

  useEffect(() => {
    resetView()
  }, [draft.activeFloorId, resetView])

  const pointerToWorld = (clientX: number, clientY: number): Vec2 => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const p = screenToWorld(clientX, clientY, rect, viewRef.current)
    const snapped = snapPoint(p, GRID_CELL_METERS)
    const gridSize = clampPlanGridSize(draftRef.current.planGridSize ?? PLAN_GRID_DEFAULT)
    return {
      x: Math.max(0, Math.min(gridSize, snapped.x)),
      z: Math.max(0, Math.min(gridSize, snapped.z)),
    }
  }

  const pointerToWorldRaw = (clientX: number, clientY: number): Vec2 => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    return screenToWorld(clientX, clientY, rect, viewRef.current)
  }

  const beginViewPan = (clientX: number, clientY: number, pointerId: number) => {
    viewPanRef.current = {
      sx: clientX,
      sy: clientY,
      panX: viewRef.current.panX,
      panY: viewRef.current.panY,
    }
    setViewPanning(true)
    capturePointerRef.current = pointerId
    canvasRef.current?.setPointerCapture(pointerId)
  }

  const moveViewPan = (clientX: number, clientY: number) => {
    const pan = viewPanRef.current
    if (!pan) return
    const dx = clientX - pan.sx
    const dy = clientY - pan.sy
    setView({ ...viewRef.current, panX: pan.panX + dx, panY: pan.panY + dy })
  }

  const endViewPan = (e?: React.PointerEvent) => {
    const canvas = canvasRef.current
    if (e && capturePointerRef.current === e.pointerId) {
      try {
        canvas?.releasePointerCapture(e.pointerId)
      } catch {
        /* ignore */
      }
      capturePointerRef.current = null
    }
    viewPanRef.current = null
    setViewPanning(false)
  }

  const onPointerDown = (e: React.PointerEvent) => {
    const panGesture =
      panModeRef.current || spaceHeldRef.current || e.button === 1 || e.button === 2

    if (panGesture) {
      e.preventDefault()
      beginViewPan(e.clientX, e.clientY, e.pointerId)
      return
    }

    if (openingDraft || selectionRect) return

    if (pendingWall || pendingDemolish) {
      setPendingWall(null)
      setPendingDemolish(null)
      return
    }

    setShowHint(false)
    const p = pointerToWorld(e.clientX, e.clientY)

    if (floorTool === 'material') {
      if (materialTarget === 'wall') {
        const hit = findClosestWall(pointerToWorldRaw(e.clientX, e.clientY), floor.walls, 0.85)
        if (hit) {
          clearFloorTileSelection()
          setWallSelectDrag({ wallId: hit.wall.id, tStart: hit.t, tEnd: hit.t })
          capturePointerRef.current = e.pointerId
          canvasRef.current?.setPointerCapture(e.pointerId)
        }
        return
      }
      setDrag({ start: p, end: p })
      capturePointerRef.current = e.pointerId
      canvasRef.current?.setPointerCapture(e.pointerId)
      return
    }

    if (floorTool === 'doorWindow') {
      const hit = findClosestWall(p, floor.walls)
      if (hit) {
        selectWall(hit.wall.id)
        setOpeningDraft({ wallId: hit.wall.id, t: hit.t })
      }
      return
    }

    if (floorTool === 'wall' || floorTool === 'demolish') {
      setDrag({ start: p, end: p })
      capturePointerRef.current = e.pointerId
      canvasRef.current?.setPointerCapture(e.pointerId)
      return
    }

    setDrag({ start: p, end: p })
    capturePointerRef.current = e.pointerId
    canvasRef.current?.setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (viewPanRef.current) {
      moveViewPan(e.clientX, e.clientY)
      return
    }
    if (wallSelectDrag) {
      const wall = floor.walls.find((w) => w.id === wallSelectDrag.wallId)
      if (wall) {
        const hit = findClosestWall(pointerToWorldRaw(e.clientX, e.clientY), [wall], 2)
        if (hit) {
          setWallSelectDrag({ wallId: wall.id, tStart: wallSelectDrag.tStart, tEnd: hit.t })
        }
      }
      return
    }
    if (!drag) return
    const p = pointerToWorld(e.clientX, e.clientY)
    if (floorTool === 'wall' || floorTool === 'demolish') {
      setDrag({ start: drag.start, end: snapWallEnd(drag.start, p) })
      return
    }
    setDrag({ ...drag, end: p })
  }

  const finishDrag = (e?: React.PointerEvent) => {
    if (viewPanRef.current) {
      endViewPan(e)
      return
    }

    if (wallSelectDrag) {
      const canvas = canvasRef.current
      if (e && capturePointerRef.current === e.pointerId) {
        try {
          canvas?.releasePointerCapture(e.pointerId)
        } catch {
          /* ignore */
        }
        capturePointerRef.current = null
      }
      const wall = floor.walls.find((w) => w.id === wallSelectDrag.wallId)
      if (wall) {
        const segments = wallSegmentsBetween(wall, wallSelectDrag.tStart, wallSelectDrag.tEnd)
        setSelectedWallSegments(segments)
        clearFloorTileSelection()
        setMaterialTarget('wall')
        setMaterialOpen(true)
      }
      setWallSelectDrag(null)
      return
    }

    const canvas = canvasRef.current
    if (e && capturePointerRef.current === e.pointerId) {
      try {
        canvas?.releasePointerCapture(e.pointerId)
      } catch {
        /* ignore */
      }
      capturePointerRef.current = null
    }

    if (!drag) return
    const start = drag.start
    const end =
      floorTool === 'wall' || floorTool === 'demolish' ? snapWallEnd(drag.start, drag.end) : drag.end
    setDrag(null)

    if (floorTool === 'wall') {
      if (Math.hypot(end.x - start.x, end.z - start.z) < 0.3) return
      setPendingWall({ start, end })
      return
    }

    if (floorTool === 'demolish') {
      const x = Math.min(start.x, end.x)
      const z = Math.min(start.z, end.z)
      const rw = Math.abs(end.x - start.x)
      const rh = Math.abs(end.z - start.z)
      if (rw >= 0.5 && rh >= 0.5) {
        demolishInRect({ x, z, w: rw, h: rh })
        save()
        return
      }
      if (Math.hypot(end.x - start.x, end.z - start.z) < 0.3) return
      setPendingDemolish({ start, end })
      return
    }

    const x = Math.min(start.x, end.x)
    const z = Math.min(start.z, end.z)
    const rw = Math.abs(end.x - start.x)
    const rh = Math.abs(end.z - start.z)

    if (floorTool === 'material') {
      const holesBelow = ceilingHolesFromFloorBelow(draft, draft.activeFloorId)
      const cells = (
        rw < 0.5 && rh < 0.5
          ? [snapGridCell(start)]
          : gridCellsInRect({ x, z, w: Math.max(GRID_CELL_METERS, rw), h: Math.max(GRID_CELL_METERS, rh) })
      ).filter((c) => !tileInCeilingHole(c.x, c.z, holesBelow))
      if (!cells.length) return
      setSelectedFloorTiles(cells)
      setMaterialTarget('floor')
      setMaterialOpen(true)
      return
    }

    if (rw < 0.5 || rh < 0.5) return

    if (floorTool === 'room') {
      setSelectionRect({ x, z, w: rw, h: rh })
      return
    }
    if (floorTool === 'ceilingHole') {
      addCeilingHole({ x, z, w: rw, h: rh })
      save()
    }
  }

  const confirmWall = () => {
    if (!pendingWall) return
    const { start, end } = pendingWall
    addWall({
      id: uid('wall'),
      a: start,
      b: end,
      thickness: 0.2,
    })
    save()
    setPendingWall(null)
  }

  const confirmDemolish = () => {
    if (!pendingDemolish) return
    const { start, end } = pendingDemolish
    const ids = wallsMatchingSegment(floor.walls, start, end)
    demolishWalls(ids)
    save()
    setPendingDemolish(null)
  }

  const buildWallsInSelection = () => {
    if (!selectionRect) return
    addWallsForRect(selectionRect)
    save()
    setSelectionRect(null)
  }

  const demolishSelection = () => {
    if (!selectionRect) return
    demolishInRect(selectionRect)
    save()
    setSelectionRect(null)
  }

  const pendingIsDemolish = Boolean(pendingDemolish)

  return (
    <div
      ref={containerRef}
      className={`hb-plan-canvas relative z-0 min-h-0 flex-1 touch-none ${floorTransition ? 'hb-floor-transition' : ''}`}
      data-pan-mode={panMode ? 'true' : undefined}
      data-panning={viewPanning ? 'true' : undefined}
    >
      <canvas
        ref={canvasRef}
        className="relative z-0 block h-full w-full touch-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
        onContextMenu={(e) => e.preventDefault()}
      />

      {showHint && floor.rooms.length <= 1 && floor.walls.length <= 4 ? <FloorPlanHint /> : null}

      <FloorPlanViewPanel
        view={view}
        panMode={panMode}
        onTogglePanMode={() => setPanMode((v) => !v)}
        onZoom={applyZoom}
        onResetView={resetView}
      />

      <FloorPlanSidebar
        onSwitch3D={() => {
          setMode('ghost')
        }}
      />

      {floorTool === 'material' ? (
        <div
          className="pointer-events-none absolute inset-x-0 bottom-[calc(64px+max(8px,env(safe-area-inset-bottom)))] z-30 flex justify-center px-4"
        >
          <p className="rounded-full bg-black/55 px-3 py-1 text-[11px] text-white/75 backdrop-blur-sm">
            {materialTarget === 'wall'
              ? '点击或沿墙体拖动，选择要粉饰的墙段'
              : '点击或框选地砖格子，选择地板材质'}
          </p>
        </div>
      ) : null}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex justify-center gap-1 px-2 pb-[max(8px,env(safe-area-inset-bottom))]">
        <div className="hb-plan-toolbar pointer-events-auto flex max-w-full gap-1 overflow-x-auto rounded-2xl px-2 py-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {TOOLS.slice(0, 4).map((t) => (
            <button
              key={t.id}
              type="button"
              className="hb-plan-tool-btn"
              data-active={floorTool === t.id}
              onClick={() => {
                useHomeBuildStore.getState().setFloorTool(t.id)
                setPendingWall(null)
                setPendingDemolish(null)
                setOpeningDraft(null)
                setSelectionRect(null)
                clearFloorTileSelection()
                clearWallSegmentSelection()
                setMaterialOpen(false)
              }}
            >
              <t.icon className="size-5" strokeWidth={1.5} />
              {t.label}
            </button>
          ))}
          {MATERIAL_TOOLS.map((t) => (
            <button
              key={t.target}
              type="button"
              className="hb-plan-tool-btn"
              data-active={floorTool === 'material' && materialTarget === t.target}
              onClick={() => {
                useHomeBuildStore.getState().setFloorTool('material')
                setMaterialTarget(t.target)
                setPendingWall(null)
                setPendingDemolish(null)
                setOpeningDraft(null)
                setSelectionRect(null)
                clearFloorTileSelection()
                clearWallSegmentSelection()
                setMaterialOpen(false)
              }}
            >
              <t.icon className="size-5" strokeWidth={1.5} />
              {t.label}
            </button>
          ))}
          {TOOLS.slice(4).map((t) => (
            <button
              key={t.id}
              type="button"
              className="hb-plan-tool-btn"
              data-active={floorTool === t.id}
              onClick={() => {
                useHomeBuildStore.getState().setFloorTool(t.id)
                setPendingWall(null)
                setPendingDemolish(null)
                setOpeningDraft(null)
                setSelectionRect(null)
                clearFloorTileSelection()
                clearWallSegmentSelection()
                setMaterialOpen(false)
              }}
            >
              <t.icon className="size-5" strokeWidth={1.5} />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {pendingWall || pendingDemolish ? (
        <WallConfirmBar
          variant={pendingIsDemolish ? 'demolish' : 'wall'}
          onConfirm={pendingIsDemolish ? confirmDemolish : confirmWall}
          onCancel={() => {
            if (pendingIsDemolish) setPendingDemolish(null)
            else setPendingWall(null)
          }}
        />
      ) : null}

      {selectionRect ? (
        <SelectionActionBar
          rect={selectionRect}
          view={view}
          onBuildWalls={buildWallsInSelection}
          onDemolish={demolishSelection}
          onCancel={() => setSelectionRect(null)}
        />
      ) : null}

      {openingDraft ? (
        <OpeningPicker
          wallId={openingDraft.wallId}
          t={openingDraft.t}
          onClose={() => setOpeningDraft(null)}
        />
      ) : null}

      <MaterialPicker />
    </div>
  )
}
