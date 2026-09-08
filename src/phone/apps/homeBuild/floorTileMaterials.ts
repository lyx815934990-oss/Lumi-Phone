import { GRID_CELL_METERS } from './defaults'
import type { FloorLevel, RoomZone, Vec2 } from './types'

export type FloorTileMaterial = {
  x: number
  z: number
  materialId: string
}

export function floorTileKey(x: number, z: number): string {
  return `${x},${z}`
}

export function snapGridCell(p: Vec2): Vec2 {
  return { x: Math.floor(p.x), z: Math.floor(p.z) }
}

export function gridCellsInRect(rect: { x: number; z: number; w: number; h: number }): Vec2[] {
  const cells: Vec2[] = []
  const minGx = Math.floor(rect.x)
  const minGz = Math.floor(rect.z)
  const maxGx = Math.floor(rect.x + Math.max(GRID_CELL_METERS, rect.w) - 0.001)
  const maxGz = Math.floor(rect.z + Math.max(GRID_CELL_METERS, rect.h) - 0.001)
  for (let gx = minGx; gx <= maxGx; gx++) {
    for (let gz = minGz; gz <= maxGz; gz++) {
      cells.push({ x: gx, z: gz })
    }
  }
  return cells
}

export function buildFloorTileMap(floor: FloorLevel): Map<string, string> {
  const map = new Map<string, string>()
  for (const t of floor.floorTileMaterials ?? []) {
    map.set(floorTileKey(t.x, t.z), t.materialId)
  }
  return map
}

export function materialIdForFloorCell(
  gx: number,
  gz: number,
  tileMap: Map<string, string>,
  rooms: RoomZone[],
): string | undefined {
  const painted = tileMap.get(floorTileKey(gx, gz))
  if (painted) return painted
  const center = { x: gx + 0.5, z: gz + 0.5 }
  const room = rooms.find((r) => pointInRoomRect(center, r))
  return room?.floorMaterialId
}

function pointInRoomRect(p: Vec2, room: RoomZone): boolean {
  const { x, z, w, h } = room.rect
  return p.x >= x && p.x <= x + w && p.z >= z && p.z <= z + h
}

export function mergeFloorTileMaterials(
  existing: FloorTileMaterial[] | undefined,
  cells: Vec2[],
  materialId: string,
  max = 2000,
): FloorTileMaterial[] {
  const map = new Map<string, FloorTileMaterial>()
  for (const t of existing ?? []) {
    map.set(floorTileKey(t.x, t.z), t)
  }
  for (const c of cells) {
    map.set(floorTileKey(c.x, c.z), { x: c.x, z: c.z, materialId })
  }
  return Array.from(map.values()).slice(0, max)
}

export function cellCenterInRect(
  gx: number,
  gz: number,
  rect: { x: number; z: number; w: number; h: number },
): boolean {
  const cx = gx + 0.5
  const cz = gz + 0.5
  return cx >= rect.x && cx <= rect.x + rect.w && cz >= rect.z && cz <= rect.z + rect.h
}

export function filterFloorTilesOutsideRect(
  tiles: FloorTileMaterial[] | undefined,
  rect: { x: number; z: number; w: number; h: number },
): FloorTileMaterial[] {
  return (tiles ?? []).filter((t) => !cellCenterInRect(t.x, t.z, rect))
}

export function hasFloorTilesInRect(
  tiles: FloorTileMaterial[] | undefined,
  rect: { x: number; z: number; w: number; h: number },
): boolean {
  return (tiles ?? []).some((t) => cellCenterInRect(t.x, t.z, rect))
}
