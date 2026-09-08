import { GRID_CELL_METERS, WALL_MATERIALS } from './defaults'
import { wallLength } from './floorPlanGeometry'
import { findRoomAtPoint } from './roomFloorRender'
import type { RoomZone, WallSegment } from './types'

export type WallSegmentPaint = {
  wallId: string
  t0: number
  t1: number
  materialId: string
}

export type WallSegmentSelection = {
  wallId: string
  t0: number
  t1: number
}

export function wallSegmentKey(wallId: string, t0: number, t1: number): string {
  return `${wallId}:${t0.toFixed(4)}:${t1.toFixed(4)}`
}

export function pointOnWall(wall: WallSegment, t: number): { x: number; z: number } {
  return {
    x: wall.a.x + (wall.b.x - wall.a.x) * t,
    z: wall.a.z + (wall.b.z - wall.a.z) * t,
  }
}

export function snapWallSegmentAt(wall: WallSegment, t: number): WallSegmentSelection {
  const len = wallLength(wall)
  if (len < 0.01) return { wallId: wall.id, t0: 0, t1: 1 }
  const segCount = Math.max(1, Math.ceil(len / GRID_CELL_METERS))
  const meters = t * len
  const idx = Math.min(Math.floor(meters / GRID_CELL_METERS), segCount - 1)
  const t0 = (idx * GRID_CELL_METERS) / len
  const t1 = Math.min(1, ((idx + 1) * GRID_CELL_METERS) / len)
  return { wallId: wall.id, t0, t1 }
}

export function wallSegmentsBetween(wall: WallSegment, tA: number, tB: number): WallSegmentSelection[] {
  const lo = Math.min(tA, tB)
  const hi = Math.max(tA, tB)
  const len = wallLength(wall)
  if (len < 0.01) return [{ wallId: wall.id, t0: 0, t1: 1 }]
  const segCount = Math.max(1, Math.ceil(len / GRID_CELL_METERS))
  const out: WallSegmentSelection[] = []
  for (let i = 0; i < segCount; i++) {
    const t0 = (i * GRID_CELL_METERS) / len
    const t1 = Math.min(1, ((i + 1) * GRID_CELL_METERS) / len)
    const mid = (t0 + t1) / 2
    if (mid >= lo - 0.001 && mid <= hi + 0.001) {
      out.push({ wallId: wall.id, t0, t1 })
    }
  }
  return out.length ? out : [snapWallSegmentAt(wall, lo)]
}

export function iterWallMeterSegments(wall: WallSegment): WallSegmentSelection[] {
  return wallSegmentsBetween(wall, 0, 1)
}

export function mergeWallSegmentMaterials(
  existing: WallSegmentPaint[] | undefined,
  segments: WallSegmentSelection[],
  materialId: string,
  max = 2000,
): WallSegmentPaint[] {
  const map = new Map<string, WallSegmentPaint>()
  for (const s of existing ?? []) {
    map.set(wallSegmentKey(s.wallId, s.t0, s.t1), s)
  }
  for (const seg of segments) {
    map.set(wallSegmentKey(seg.wallId, seg.t0, seg.t1), { ...seg, materialId })
  }
  return Array.from(map.values()).slice(0, max)
}

function roomMaterialForWallPoint(wall: WallSegment, t: number, rooms: RoomZone[]): string | undefined {
  const mid = pointOnWall(wall, t)
  const len = wallLength(wall)
  const dx = wall.b.x - wall.a.x
  const dz = wall.b.z - wall.a.z
  if (len < 0.01) return undefined
  const nx = -dz / len
  const nz = dx / len
  const room =
    findRoomAtPoint(rooms, { x: mid.x + nx * 0.3, z: mid.z + nz * 0.3 }) ??
    findRoomAtPoint(rooms, { x: mid.x - nx * 0.3, z: mid.z - nz * 0.3 })
  return room?.wallMaterialId
}

export function materialIdForWallSegment(
  wall: WallSegment,
  t0: number,
  t1: number,
  paints: WallSegmentPaint[] | undefined,
  rooms: RoomZone[],
): string | undefined {
  const mid = (t0 + t1) / 2
  const painted = paints?.find((p) => p.wallId === wall.id && p.t0 <= mid + 0.001 && p.t1 >= mid - 0.001)
  if (painted) return painted.materialId
  return roomMaterialForWallPoint(wall, mid, rooms)
}

export function wallMaterialPreviewColor(materialId?: string): string {
  return WALL_MATERIALS.find((m) => m.id === materialId)?.color ?? '#f5f5f5'
}

export function filterWallSegmentsOutsideRect(
  paints: WallSegmentPaint[] | undefined,
  walls: WallSegment[],
  rect: { x: number; z: number; w: number; h: number },
): WallSegmentPaint[] {
  const inRect = (x: number, z: number) =>
    x >= rect.x && x <= rect.x + rect.w && z >= rect.z && z <= rect.z + rect.h
  return (paints ?? []).filter((p) => {
    const wall = walls.find((w) => w.id === p.wallId)
    if (!wall) return false
    const mid = pointOnWall(wall, (p.t0 + p.t1) / 2)
    return !inRect(mid.x, mid.z)
  })
}

export function hasWallSegmentsInRect(
  paints: WallSegmentPaint[] | undefined,
  walls: WallSegment[],
  rect: { x: number; z: number; w: number; h: number },
): boolean {
  const inRect = (x: number, z: number) =>
    x >= rect.x && x <= rect.x + rect.w && z >= rect.z && z <= rect.z + rect.h
  return (paints ?? []).some((p) => {
    const wall = walls.find((w) => w.id === p.wallId)
    if (!wall) return false
    const mid = pointOnWall(wall, (p.t0 + p.t1) / 2)
    return inRect(mid.x, mid.z)
  })
}
