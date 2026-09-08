import { GRID_CELL_METERS } from './defaults'
import { pointInRoomTiles } from './autoFloorFill'
import type { RoomZone, Vec2 } from './types'

export function roomFloorTiles(room: RoomZone): Vec2[] {
  if (room.tiles?.length) return room.tiles
  const tiles: Vec2[] = []
  const minGx = Math.floor(room.rect.x)
  const minGz = Math.floor(room.rect.z)
  const maxGx = Math.ceil(room.rect.x + room.rect.w) - 1
  const maxGz = Math.ceil(room.rect.z + room.rect.h) - 1
  for (let gx = minGx; gx <= maxGx; gx++) {
    for (let gz = minGz; gz <= maxGz; gz++) {
      const cx = gx + 0.5
      const cz = gz + 0.5
      if (
        cx >= room.rect.x &&
        cx <= room.rect.x + room.rect.w &&
        cz >= room.rect.z &&
        cz <= room.rect.z + room.rect.h
      ) {
        tiles.push({ x: gx, z: gz })
      }
    }
  }
  return tiles
}

export function findRoomAtPoint(rooms: RoomZone[], p: Vec2): RoomZone | undefined {
  return rooms.find((room) => pointInRoomTiles(p, room))
}

export { pointInRoomTiles }

export const FLOOR_TILE_SIZE = GRID_CELL_METERS
