import { floorPlanBounds } from './floorPlanGeometry'
import { tileInCeilingHole } from './scene3dUtils'
import type { CeilingHole, FloorLevel, RoomZone } from './types'

/** 该水平坐标是否露天（无天花板遮挡） */
export function isOpenToSky(
  worldX: number,
  worldZ: number,
  rooms: RoomZone[],
  ceilingHoles: CeilingHole[] = [],
): boolean {
  const gx = Math.floor(worldX)
  const gz = Math.floor(worldZ)
  if (tileInCeilingHole(gx, gz, ceilingHoles)) return true

  const inRoom = rooms.some((room) => {
    const { x, z, w, h } = room.rect
    return worldX >= x && worldX <= x + w && worldZ >= z && worldZ <= z + h
  })
  return !inRoom
}

/** 生成可_spawn 雨/雪的露天采样点（格心坐标） */
export function buildOutdoorSpawnPoints(floor: FloorLevel, padding = 2): { x: number; z: number }[] {
  const b = floorPlanBounds(floor)
  const minGx = Math.floor(b.minX) - padding
  const maxGx = Math.ceil(b.maxX) + padding
  const minGz = Math.floor(b.minZ) - padding
  const maxGz = Math.ceil(b.maxZ) + padding
  const pts: { x: number; z: number }[] = []

  for (let gx = minGx; gx <= maxGx; gx++) {
    for (let gz = minGz; gz <= maxGz; gz++) {
      const cx = gx + 0.5
      const cz = gz + 0.5
      if (isOpenToSky(cx, cz, floor.rooms, floor.ceilingHoles)) {
        pts.push({ x: cx, z: cz })
      }
    }
  }

  if (!pts.length) {
    pts.push(
      { x: b.minX - 1, z: (b.minZ + b.maxZ) / 2 },
      { x: b.maxX + 1, z: (b.minZ + b.maxZ) / 2 },
      { x: (b.minX + b.maxX) / 2, z: b.minZ - 1 },
      { x: (b.minX + b.maxX) / 2, z: b.maxZ + 1 },
    )
  }
  return pts
}

export function pickOutdoorSpawn(
  spawnPoints: { x: number; z: number }[],
): { x: number; z: number } {
  return spawnPoints[Math.floor(Math.random() * spawnPoints.length)]!
}
