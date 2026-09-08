import { Box3, Bone, Mesh, Object3D, SkinnedMesh, Vector3 } from 'three'
import { WALL_HEIGHT } from './sceneConstants'

const _box = new Box3()
const _geoBox = new Box3()
const _size = new Vector3()
const _p = new Vector3()

const BONE_NAME_RE = /bone|joint|hips|spine|neck|head|arm|leg|foot|hand|shoulder|mixamo|root|pelvis|thigh|calf|elbow|knee|wrist|ankle/i

function isBoneLike(obj: Object3D): boolean {
  if (obj instanceof Bone) return true
  if (!obj.name) return false
  return BONE_NAME_RE.test(obj.name)
}

/**
 * 人模可靠包围盒：几何 AABB ∪ 骨骼/关节世界坐标。
 * 蒙皮 FBX 上 setFromObject 常严重偏小，不能单独用。
 */
export function computeReliableObjectBounds(root: Object3D, out = new Box3()): Box3 {
  out.makeEmpty()
  root.updateWorldMatrix(true, true)

  root.traverse((obj) => {
    if (obj.type === 'SkeletonHelper' || obj.type === 'LineSegments') return

    if (isBoneLike(obj)) {
      obj.updateWorldMatrix(true, false)
      _p.setFromMatrixPosition(obj.matrixWorld)
      if (Number.isFinite(_p.x) && Number.isFinite(_p.y) && Number.isFinite(_p.z)) {
        out.expandByPoint(_p)
      }
    }

    if (!(obj instanceof Mesh) || !obj.geometry) return
    const geo = obj.geometry
    if (!geo.boundingBox) geo.computeBoundingBox()
    if (!geo.boundingBox || geo.boundingBox.isEmpty()) return
    _geoBox.copy(geo.boundingBox).applyMatrix4(obj.matrixWorld)
    if (!_geoBox.isEmpty()) out.union(_geoBox)
  })

  if (out.isEmpty()) {
    try {
      out.setFromObject(root)
    } catch {
      /* ignore */
    }
  }
  return out
}

/** 只看骨骼链的高度（更接近蒙皮后真实身高） */
export function computeSkeletonHeight(root: Object3D): number {
  let minY = Infinity
  let maxY = -Infinity
  root.updateWorldMatrix(true, true)
  root.traverse((obj) => {
    if (!isBoneLike(obj)) return
    obj.updateWorldMatrix(true, false)
    _p.setFromMatrixPosition(obj.matrixWorld)
    if (!Number.isFinite(_p.y)) return
    minY = Math.min(minY, _p.y)
    maxY = Math.max(maxY, _p.y)
  })
  if (!Number.isFinite(minY) || !Number.isFinite(maxY) || maxY <= minY) return 0
  return maxY - minY
}

/** 只看网格几何的高度 */
export function computeMeshGeometryHeight(root: Object3D): number {
  _box.makeEmpty()
  root.updateWorldMatrix(true, true)
  root.traverse((obj) => {
    if (!(obj instanceof Mesh) || !obj.geometry) return
    if (obj.type === 'SkeletonHelper') return
    const geo = obj.geometry
    if (!geo.boundingBox) geo.computeBoundingBox()
    if (!geo.boundingBox || geo.boundingBox.isEmpty()) return
    _geoBox.copy(geo.boundingBox).applyMatrix4(obj.matrixWorld)
    _box.union(_geoBox)
  })
  if (_box.isEmpty()) return 0
  return Math.abs(_box.max.y - _box.min.y)
}

/**
 * 取「网格高 / 骨骼高 / skeleton.bones 世界高」里最大的，
 * 避免某一侧偏小导致没缩小、场景里仍是巨人。
 */
export function measureAvatarHeight(root: Object3D): number {
  const skelH = computeSkeletonHeight(root)
  const meshH = computeMeshGeometryHeight(root)
  const boneListH = (() => {
    let minY = Infinity
    let maxY = -Infinity
    root.updateWorldMatrix(true, true)
    root.traverse((obj) => {
      if (!(obj instanceof SkinnedMesh) || !obj.skeleton?.bones?.length) return
      try {
        obj.skeleton.update()
      } catch {
        /* ignore */
      }
      for (const b of obj.skeleton.bones) {
        b.updateWorldMatrix(true, false)
        _p.setFromMatrixPosition(b.matrixWorld)
        if (!Number.isFinite(_p.y)) continue
        minY = Math.min(minY, _p.y)
        maxY = Math.max(maxY, _p.y)
      }
    })
    if (!Number.isFinite(minY) || maxY <= minY) return 0
    return maxY - minY
  })()
  const unionH = (() => {
    computeReliableObjectBounds(root, _box)
    if (_box.isEmpty()) return 0
    return Math.abs(_box.max.y - _box.min.y)
  })()
  const h = Math.max(skelH, meshH, boneListH, unionH)
  return Number.isFinite(h) ? h : 0
}

export function getReliableSize(root: Object3D, out = new Vector3()): Vector3 {
  computeReliableObjectBounds(root, _box)
  _box.getSize(out)
  return out
}

export function getReliableCenter(root: Object3D, out = new Vector3()): Vector3 {
  computeReliableObjectBounds(root, _box)
  _box.getCenter(out)
  return out
}

export function getReliableMaxDim(root: Object3D): number {
  getReliableSize(root, _size)
  const m = Math.max(Math.abs(_size.x), Math.abs(_size.y), Math.abs(_size.z))
  return Number.isFinite(m) ? m : 0
}

export function getReliableHeight(root: Object3D): number {
  return measureAvatarHeight(root)
}

export function countSkinnedBones(root: Object3D): number {
  let maxBones = 0
  root.traverse((obj) => {
    if (obj instanceof SkinnedMesh && obj.skeleton?.bones?.length) {
      maxBones = Math.max(maxBones, obj.skeleton.bones.length)
    }
  })
  return maxBones
}

/** 相对房屋层高的合理身高（米） */
export function houseFitAvatarHeightM(wallHeight = WALL_HEIGHT): number {
  // 人约占层高 55%～60%，默认墙 2.8m → ≈1.6m
  return Math.min(1.75, Math.max(1.45, wallHeight * 0.58))
}
