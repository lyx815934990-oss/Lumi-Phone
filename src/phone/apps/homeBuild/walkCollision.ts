import { distPointToSegment } from './floorPlanGeometry'
import { circleIntersectsAabbXZ, getFurnitureAabbs, hasClimbableId } from './furnitureBounds'
import { roomFloorTiles } from './roomFloorRender'
import { sampleStairSupportY } from './stairClimb'
import {
  floorBaseYByIndex,
  floorCeilingYByIndex,
  floorIndexAtWorldY,
  floorIndexOf,
  tileInCeilingHole,
} from './scene3dUtils'
import type { HomeBuildDraft, Vec2, WallSegment } from './types'

/** 约占 1 个网格（1m），略小于门宽 0.9m 以便通过 */
export const PLAYER_RADIUS = 0.38
export const EYE_HEIGHT = 1.65
export const GRAVITY = 22
export const MAX_FALL_SPEED = 28
/** 落地吸附容差（米） */
export const LANDING_SNAP = 0.12
/** 站在物体顶面时的贴合容差 */
export const PROP_TOP_EPS = 0.1
/** 低于此高度的矮物不挡水平移动（可跨过） */
export const STEP_OVER_HEIGHT = 0.45
/** 走上楼梯台阶 / 矮家具时允许的单次抬脚高度 */
export const STEP_UP_HEIGHT = 0.65
/** 可站立的家具顶面最小厚度，避免纸片碰撞体 */
export const MIN_STANDABLE_PROP_HEIGHT = 0.08

/**
 * 水平阻挡：站在顶面或跃过顶面时不挡；侧面碰撞仍挡。
 */
export function isFurnitureBlocked(p: Vec2, feetY: number): boolean {
  const headY = feetY + EYE_HEIGHT
  for (const box of getFurnitureAabbs()) {
    if (hasClimbableId(box.id)) continue
    // 已站上或高于顶面 → 可在其上移动 / 离开边缘
    if (feetY >= box.maxY - PROP_TOP_EPS) continue
    const height = box.maxY - box.minY
    if (height <= STEP_OVER_HEIGHT && box.maxY <= feetY + STEP_OVER_HEIGHT) continue
    if (box.maxY < feetY + 0.05 || box.minY > headY - 0.05) continue
    if (circleIntersectsAabbXZ(p, PLAYER_RADIUS, box)) return true
  }
  return false
}

export function isWalkBlocked(p: Vec2, walls: WallSegment[], feetY = 0): boolean {
  for (const wall of walls) {
    const hit = distPointToSegment(p, wall.a, wall.b)
    if (hit.dist < PLAYER_RADIUS + wall.thickness / 2) return true
  }
  if (isFurnitureBlocked(p, feetY)) return true
  return false
}

export function slideWalkPosition(
  from: Vec2,
  delta: Vec2,
  walls: WallSegment[],
  feetY = 0,
): Vec2 {
  const tryX = { x: from.x + delta.x, z: from.z }
  const afterX = isWalkBlocked(tryX, walls, feetY) ? from : tryX

  const tryZ = { x: afterX.x, z: from.z + delta.z }
  const afterZ = isWalkBlocked(tryZ, walls, feetY) ? afterX : tryZ

  return afterZ
}

export function playerFootCell(x: number, z: number): { gx: number; gz: number } {
  return { gx: Math.floor(x), gz: Math.floor(z) }
}

export function hasFloorSupportAtCell(
  draft: HomeBuildDraft,
  floorIndex: number,
  gx: number,
  gz: number,
): boolean {
  const floor = draft.floors[floorIndex]
  if (!floor) return false

  const holesBelow =
    floorIndex > 0 ? (draft.floors[floorIndex - 1]?.ceilingHoles ?? []) : []
  if (tileInCeilingHole(gx, gz, holesBelow)) return false

  for (const room of floor.rooms) {
    const tiles = roomFloorTiles(room)
    if (tiles.some((t) => t.x === gx && t.z === gz)) return true
  }

  return (floor.floorTileMaterials ?? []).some((tm) => tm.x === gx && tm.z === gz)
}

export function hasFloorSupportAtPoint(
  draft: HomeBuildDraft,
  floorIndex: number,
  x: number,
  z: number,
): boolean {
  const { gx, gz } = playerFootCell(x, z)
  return hasFloorSupportAtCell(draft, floorIndex, gx, gz)
}

export type WalkSupport = {
  floorY: number
  floorIndex: number
  kind: 'floor' | 'stair' | 'ground' | 'prop'
}

/** 脚下家具顶面（最高且可达） */
export function sampleFurnitureSupportY(x: number, z: number, feetY: number): number | null {
  let best: number | null = null
  for (const box of getFurnitureAabbs()) {
    if (hasClimbableId(box.id)) continue
    if (box.maxY - box.minY < MIN_STANDABLE_PROP_HEIGHT) continue
    if (!circleIntersectsAabbXZ({ x, z }, PLAYER_RADIUS * 0.85, box)) continue
    const top = box.maxY
    // 顶面远高于脚（超过可抬脚/落地吸附）→ 够不着
    if (top > feetY + STEP_UP_HEIGHT) continue
    if (best == null || top > best) best = top
  }
  return best
}

/**
 * 在脚底高度附近，找最高的可站立支撑（楼板 / 楼梯 / 家具顶 / 室外地平面）。
 */
export function findSupportBelow(
  draft: HomeBuildDraft,
  x: number,
  z: number,
  feetY: number,
): WalkSupport {
  const { gx, gz } = playerFootCell(x, z)
  let bestY = 0
  let bestIndex = -1
  let kind: WalkSupport['kind'] = 'ground'

  for (let i = 0; i < draft.floors.length; i++) {
    const floorY = floorBaseYByIndex(draft, i)
    if (floorY > feetY + LANDING_SNAP) continue
    if (!hasFloorSupportAtCell(draft, i, gx, gz)) continue
    if (floorY >= bestY) {
      bestY = floorY
      bestIndex = i
      kind = 'floor'
    }
  }

  const propY = sampleFurnitureSupportY(x, z, feetY)
  if (propY != null && propY >= bestY - 0.01) {
    bestY = propY
    bestIndex = floorIndexAtWorldY(draft, propY)
    kind = 'prop'
  }

  const stairY = sampleStairSupportY(x, z, PLAYER_RADIUS)
  if (stairY != null && stairY <= feetY + STEP_UP_HEIGHT && stairY >= bestY - 0.01) {
    bestY = stairY
    bestIndex = floorIndexAtWorldY(draft, stairY)
    kind = 'stair'
  }

  return { floorY: bestY, floorIndex: bestIndex, kind }
}

export function wallsOverlappingBody(draft: HomeBuildDraft, feetY: number): WallSegment[] {
  const headY = feetY + EYE_HEIGHT
  const walls: WallSegment[] = []
  for (let i = 0; i < draft.floors.length; i++) {
    const y0 = floorBaseYByIndex(draft, i)
    const y1 = floorCeilingYByIndex(draft, i)
    if (headY < y0 - 0.05 || feetY > y1 + 0.05) continue
    walls.push(...draft.floors[i]!.walls)
  }
  return walls
}

export function resolveWalkFloorIndex(draft: HomeBuildDraft, preferredFloorId?: string): number {
  if (preferredFloorId) {
    const idx = floorIndexOf(draft, preferredFloorId)
    if (idx >= 0) return idx
  }
  return 0
}

export function spawnFeetY(draft: HomeBuildDraft, x: number, z: number, preferredFloorId: string): number {
  const prefer = resolveWalkFloorIndex(draft, preferredFloorId)
  const preferY = floorBaseYByIndex(draft, prefer)
  if (hasFloorSupportAtPoint(draft, prefer, x, z)) {
    return preferY
  }
  return findSupportBelow(draft, x, z, preferY + 0.5).floorY
}
