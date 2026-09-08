import { distPointToSegment } from './floorPlanGeometry'
import { floorBaseYByIndex, floorCeilingYByIndex, tileInCeilingHole } from './scene3dUtils'
import { hasFloorSupportAtCell } from './walkCollision'
import type { HomeBuildDraft } from './types'

export type RainHitKind = 'ground' | 'floor' | 'ceiling' | 'wall'

export type RainHit = {
  kind: RainHitKind
  x: number
  y: number
  z: number
  /** 墙面外法线（仅 wall） */
  nx?: number
  nz?: number
}

function cellInRoom(draft: HomeBuildDraft, floorIndex: number, worldX: number, worldZ: number): boolean {
  const floor = draft.floors[floorIndex]
  if (!floor) return false
  return floor.rooms.some((room) => {
    const { x, z, w, h } = room.rect
    return worldX >= x && worldX <= x + w && worldZ >= z && worldZ <= z + h
  })
}

/** 该格是否有天花板（房间内且未开洞）— 雨从上方打到屋顶 */
export function hasCeilingAt(
  draft: HomeBuildDraft,
  floorIndex: number,
  worldX: number,
  worldZ: number,
): boolean {
  const floor = draft.floors[floorIndex]
  if (!floor) return false
  if (!cellInRoom(draft, floorIndex, worldX, worldZ)) return false
  const gx = Math.floor(worldX)
  const gz = Math.floor(worldZ)
  return !tileInCeilingHole(gx, gz, floor.ceilingHoles ?? [])
}

/**
 * 雨滴从 prevY 落到 nextY（下降）时，求最先碰到的表面。
 * 检测顺序：自上而下天花板 → 地板 → 最终地面。
 */
export function findVerticalRainHit(
  draft: HomeBuildDraft,
  worldX: number,
  worldZ: number,
  prevY: number,
  nextY: number,
): RainHit | null {
  if (nextY >= prevY) return null

  const gx = Math.floor(worldX)
  const gz = Math.floor(worldZ)

  // 从上往下扫各层屋顶与地板
  for (let i = draft.floors.length - 1; i >= 0; i--) {
    const floorY = floorBaseYByIndex(draft, i)
    const ceilingY = floorCeilingYByIndex(draft, i)

    if (hasCeilingAt(draft, i, worldX, worldZ)) {
      if (prevY > ceilingY && nextY <= ceilingY) {
        return { kind: 'ceiling', x: worldX, y: ceilingY, z: worldZ }
      }
    }

    if (hasFloorSupportAtCell(draft, i, gx, gz)) {
      if (prevY > floorY && nextY <= floorY) {
        return { kind: 'floor', x: worldX, y: floorY, z: worldZ }
      }
    }
  }

  // 露天落到最底层地面
  if (prevY > 0 && nextY <= 0) {
    return { kind: 'ground', x: worldX, y: 0, z: worldZ }
  }

  return null
}

/**
 * 斜向雨滴与墙体碰撞（当前高度落在墙段高度内，且水平距离进入墙厚）。
 */
export function findWallRainHit(
  draft: HomeBuildDraft,
  worldX: number,
  worldY: number,
  worldZ: number,
): RainHit | null {
  let best: RainHit | null = null
  let bestDist = Infinity

  for (let i = 0; i < draft.floors.length; i++) {
    const floor = draft.floors[i]!
    const y0 = floorBaseYByIndex(draft, i)
    const y1 = floorCeilingYByIndex(draft, i)
    if (worldY < y0 - 0.05 || worldY > y1 + 0.05) continue

    for (const wall of floor.walls) {
      const hit = distPointToSegment({ x: worldX, z: worldZ }, wall.a, wall.b)
      const half = wall.thickness / 2 + 0.04
      if (hit.dist > half) continue
      if (hit.dist >= bestDist) continue

      const dx = wall.b.x - wall.a.x
      const dz = wall.b.z - wall.a.z
      const len = Math.hypot(dx, dz) || 1
      // 水平法线（指向点所在一侧）
      let nx = -dz / len
      let nz = dx / len
      const side = (worldX - hit.closest.x) * nx + (worldZ - hit.closest.z) * nz
      if (side < 0) {
        nx = -nx
        nz = -nz
      }

      bestDist = hit.dist
      best = {
        kind: 'wall',
        x: hit.closest.x + nx * (wall.thickness / 2 + 0.02),
        y: worldY,
        z: hit.closest.z + nz * (wall.thickness / 2 + 0.02),
        nx,
        nz,
      }
    }
  }

  return best
}
