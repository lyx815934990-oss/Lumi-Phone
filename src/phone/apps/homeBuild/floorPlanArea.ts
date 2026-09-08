import { GRID_CELL_METERS } from './defaults'
import type { FloorLevel, HomeBuildDraft, RoomZone } from './types'

/** 房间面积（㎡） */
export function roomAreaM2(room: RoomZone): number {
  if (room.tiles?.length) {
    return room.tiles.length * GRID_CELL_METERS * GRID_CELL_METERS
  }
  return Math.max(0, room.rect.w * room.rect.h)
}

/** 单层所有房间面积之和（㎡） */
export function floorAreaM2(floor: FloorLevel): number {
  return floor.rooms.reduce((sum, room) => sum + roomAreaM2(room), 0)
}

/** 全楼所有楼层面积之和（㎡） */
export function homeAreaM2(draft: HomeBuildDraft): number {
  return draft.floors.reduce((sum, floor) => sum + floorAreaM2(floor), 0)
}

export function formatAreaM2(area: number): string {
  if (!Number.isFinite(area) || area <= 0) return '0'
  if (area < 10) return area.toFixed(1)
  if (area < 100) return area.toFixed(1)
  return Math.round(area).toString()
}
