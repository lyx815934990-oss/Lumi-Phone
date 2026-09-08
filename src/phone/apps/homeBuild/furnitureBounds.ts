import { Box3, Object3D, Vector3 } from 'three'

export type FurnitureAabb = {
  id: string
  minX: number
  maxX: number
  minY: number
  maxY: number
  minZ: number
  maxZ: number
}

/** 模型局部包围：用于底面贴地 + 平面居中（纠正 GLB 轴心偏移） */
export type LocalModelBounds = {
  minY: number
  maxY: number
  /** 底面中心 X（局部） */
  centerX: number
  /** 底面中心 Z（局部） */
  centerZ: number
  size: Vector3
}

const aabbById = new Map<string, FurnitureAabb>()
const localBoundsByPath = new Map<string, LocalModelBounds>()
const climbableIds = new Set<string>()

const _box = new Box3()
const _size = new Vector3()
const _center = new Vector3()

export function cacheLocalBoundsFromObject(modelPath: string, root: Object3D): LocalModelBounds {
  root.updateWorldMatrix(true, true)
  _box.setFromObject(root)
  _box.getCenter(_center)
  const bounds: LocalModelBounds = {
    minY: _box.min.y,
    maxY: _box.max.y,
    centerX: _center.x,
    centerZ: _center.z,
    size: _box.getSize(_size.clone()),
  }
  localBoundsByPath.set(modelPath, bounds)
  return bounds
}

export function getLocalBounds(modelPath: string): LocalModelBounds | undefined {
  return localBoundsByPath.get(modelPath)
}

export function clearLocalBoundsCache(modelPath?: string): void {
  if (modelPath) localBoundsByPath.delete(modelPath)
  else localBoundsByPath.clear()
}

export function upsertFurnitureAabb(aabb: FurnitureAabb): void {
  aabbById.set(aabb.id, aabb)
}

export function removeFurnitureAabb(id: string): void {
  aabbById.delete(id)
  climbableIds.delete(id)
}

export function getFurnitureAabbs(): FurnitureAabb[] {
  return Array.from(aabbById.values())
}

export function clearFurnitureAabbs(): void {
  aabbById.clear()
  climbableIds.clear()
}

export function markFurnitureClimbable(id: string, climbable: boolean): void {
  if (climbable) climbableIds.add(id)
  else climbableIds.delete(id)
}

export function hasClimbableId(id: string): boolean {
  return climbableIds.has(id)
}

/** 从已挂到场景的 object 刷新世界 AABB（调用前需 updateWorldMatrix） */
export function refreshFurnitureAabbFromObject(id: string, root: Object3D): FurnitureAabb {
  root.updateWorldMatrix(true, true)
  _box.setFromObject(root)
  const aabb: FurnitureAabb = {
    id,
    minX: _box.min.x,
    maxX: _box.max.x,
    minY: _box.min.y,
    maxY: _box.max.y,
    minZ: _box.min.z,
    maxZ: _box.max.z,
  }
  upsertFurnitureAabb(aabb)
  return aabb
}

export function circleIntersectsAabbXZ(
  p: { x: number; z: number },
  radius: number,
  box: Pick<FurnitureAabb, 'minX' | 'maxX' | 'minZ' | 'maxZ'>,
): boolean {
  const cx = Math.max(box.minX, Math.min(p.x, box.maxX))
  const cz = Math.max(box.minZ, Math.min(p.z, box.maxZ))
  const dx = p.x - cx
  const dz = p.z - cz
  return dx * dx + dz * dz < radius * radius
}
