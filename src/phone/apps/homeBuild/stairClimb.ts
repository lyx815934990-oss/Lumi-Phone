import type { Object3D } from 'three'
import { WALL_HEIGHT } from './sceneConstants'
import type { PlacedFurniture } from './types'
import { getLocalBounds } from './furnitureBounds'

/** 可攀爬楼梯体积（沿模型长轴的斜面） */
export type ClimbVolume = {
  id: string
  originX: number
  originZ: number
  dirX: number
  dirZ: number
  length: number
  halfWidth: number
  yBottom: number
  yTop: number
}

const climbById = new Map<string, ClimbVolume>()

export function isStairFurniture(item: Pick<PlacedFurniture, 'catalogId' | 'name'>): boolean {
  return /楼梯|stair/i.test(`${item.catalogId}${item.name}`)
}

export function removeClimbVolume(id: string): void {
  climbById.delete(id)
}

export function clearClimbVolumes(): void {
  climbById.clear()
}

export function getClimbVolumes(): ClimbVolume[] {
  return Array.from(climbById.values())
}

export function hasClimbVolume(id: string): boolean {
  return climbById.has(id)
}

export type ClimbFloorContext = {
  /** 本层楼板高度 */
  floorY: number
  /** 本层墙高 / 层高 */
  wallHeight: number
}

/**
 * 根据放置根节点与局部尺寸，注册楼梯攀爬斜面。
 * 高度至少接到上一层楼板，便于上楼。
 */
export function refreshClimbVolumeFromObject(
  item: PlacedFurniture,
  root: Object3D,
  floorCtx?: ClimbFloorContext,
): ClimbVolume | null {
  if (!isStairFurniture(item)) {
    removeClimbVolume(item.id)
    return null
  }

  const local = getLocalBounds(item.modelPath)
  if (!local) {
    removeClimbVolume(item.id)
    return null
  }

  const sx = Math.abs(root.scale.x) || 1
  const sy = Math.abs(root.scale.y) || 1
  const sz = Math.abs(root.scale.z) || 1

  const alongX = local.size.x >= local.size.z
  const length = (alongX ? local.size.x : local.size.z) * (alongX ? sx : sz)
  const width = (alongX ? local.size.z : local.size.x) * (alongX ? sz : sx)
  const meshRise = local.size.y * sy

  // 异常模型（未归零的超大坐标）直接跳过
  if (!(length > 0.35 && length < 40 && width > 0.2 && width < 40 && meshRise > 0.25 && meshRise < 40)) {
    removeClimbVolume(item.id)
    return null
  }

  const yaw = root.rotation.y
  // three.js Y 旋转：local +X → (cos, -sin)，local +Z → (sin, cos)
  const dirX = alongX ? Math.cos(yaw) : Math.sin(yaw)
  const dirZ = alongX ? -Math.sin(yaw) : Math.cos(yaw)

  const yBottom = root.position.y
  const floorY = floorCtx?.floorY ?? Math.floor((yBottom + 0.05) / WALL_HEIGHT) * WALL_HEIGHT
  const rise = floorCtx?.wallHeight ?? WALL_HEIGHT
  const yTop = Math.max(yBottom + meshRise, floorY + rise)

  const vol: ClimbVolume = {
    id: item.id,
    originX: root.position.x,
    originZ: root.position.z,
    dirX,
    dirZ,
    length,
    halfWidth: width * 0.5,
    yBottom,
    yTop,
  }
  climbById.set(item.id, vol)
  return vol
}

/** 在 (x,z) 处楼梯表面高度；不在楼梯上则 null */
export function sampleStairSupportY(x: number, z: number, radius = 0.35): number | null {
  let best: number | null = null
  for (const vol of climbById.values()) {
    const rx = x - vol.originX
    const rz = z - vol.originZ
    const along = rx * vol.dirX + rz * vol.dirZ
    const across = rx * -vol.dirZ + rz * vol.dirX
    const halfLen = vol.length * 0.5
    if (along < -halfLen - radius || along > halfLen + radius) continue
    if (Math.abs(across) > vol.halfWidth + radius) continue

    const t = Math.min(1, Math.max(0, (along + halfLen) / vol.length))
    const y = vol.yBottom + t * (vol.yTop - vol.yBottom)
    if (best == null || y > best) best = y
  }
  return best
}
