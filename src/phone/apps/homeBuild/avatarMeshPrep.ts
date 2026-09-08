import { Bone, Box3, Group, Mesh, Object3D, SkinnedMesh, Vector3, type AnimationClip } from 'three'
import { clone as cloneSkinnedHierarchy } from 'three/examples/jsm/utils/SkeletonUtils.js'
import {
  computeReliableObjectBounds,
  houseFitAvatarHeightM,
  measureAvatarHeight,
} from './avatarBounds'
import { normalizeBoneKey } from './avatarRetarget'

export const AVATAR_TARGET_HEIGHT_M = 1.65
export const AVATAR_HARD_MAX_HEIGHT_M = 1.9
export const AVATAR_PREP_REV = 30

const _box = new Box3()
const _meshBox = new Box3()
const _geoBox = new Box3()
const _size = new Vector3()
const _hip = new Vector3()

export type PreparedAvatarMesh = {
  root: Group
  embeddedClips: AnimationClip[]
}

/** 扶正后写入，供 clearPickedUpRootLean / resetProceduralPose 还原，禁止再被清成 0 */
export function stampAvatarBaseRotation(model: Object3D): void {
  model.userData.hbBaseRotX = model.rotation.x
  model.userData.hbBaseRotY = model.rotation.y
  model.userData.hbBaseRotZ = model.rotation.z
  model.userData.hbBasePosY = model.position.y
}

export function restoreAvatarBaseRotation(root: Object3D): void {
  for (const child of root.children) {
    if (child instanceof Bone) continue
    // 混元蒙皮：若戳记丢失，强制 -90°，绝不能静默躺平
    const skinned = hasSkinnedDescendant(root)
    const mixamo = hasMixamoBoneName(root)
    if (skinned && !mixamo && typeof child.userData.hbBaseRotX !== 'number') {
      child.rotation.x = -Math.PI / 2
      child.rotation.y = 0
      child.rotation.z = 0
      stampAvatarBaseRotation(child)
      child.userData.hbUprightDone = true
      return
    }
    if (typeof child.userData.hbBaseRotX !== 'number') continue
    child.rotation.x = child.userData.hbBaseRotX
    child.rotation.y = typeof child.userData.hbBaseRotY === 'number' ? child.userData.hbBaseRotY : 0
    child.rotation.z = typeof child.userData.hbBaseRotZ === 'number' ? child.userData.hbBaseRotZ : 0
    if (typeof child.userData.hbBasePosY === 'number') {
      child.position.y = child.userData.hbBasePosY
    }
    return
  }
}

function hasSkinnedDescendant(root: Object3D): boolean {
  let found = false
  root.traverse((o) => {
    if (o instanceof SkinnedMesh) found = true
  })
  return found
}

function hasMixamoBoneName(root: Object3D): boolean {
  let found = false
  root.traverse((o) => {
    if (o instanceof Bone && /mixamorig/i.test(o.name)) found = true
    if (o instanceof SkinnedMesh) {
      for (const b of o.skeleton?.bones ?? []) {
        if (/mixamorig/i.test(b.name)) found = true
      }
    }
  })
  return found
}

/** 只用网格几何 AABB（忽略骨骼）。FBX 常把骨转成 Y-up，但蒙皮网格仍是 Z-up 躺姿。 */
function computeMeshOnlyBounds(root: Object3D, out: Box3): Box3 {
  out.makeEmpty()
  root.updateMatrixWorld(true)
  root.traverse((obj) => {
    if (!(obj instanceof Mesh) || !obj.geometry) return
    if (obj.type === 'SkeletonHelper' || obj.type === 'LineSegments') return
    const geo = obj.geometry
    if (!geo.boundingBox) geo.computeBoundingBox()
    if (!geo.boundingBox || geo.boundingBox.isEmpty()) return
    _geoBox.copy(geo.boundingBox).applyMatrix4(obj.matrixWorld)
    if (!_geoBox.isEmpty()) out.union(_geoBox)
  })
  return out
}

function cloneAvatarSource(group: Group): Group {
  let hasSkin = false
  group.traverse((o) => {
    if (o instanceof SkinnedMesh) hasSkin = true
  })
  return (hasSkin ? cloneSkinnedHierarchy(group) : group.clone(true)) as Group
}

function readWorldHeight(root: Object3D): number {
  root.updateMatrixWorld(true)
  const h = measureAvatarHeight(root)
  return Number.isFinite(h) && h > 0 ? h : 0
}

/**
 * 混元绑骨 FBX：静止绑定姿是 Z-up 躺着 → 绕 X 扶成竖直。
 * 先固定 -90°；若头在脚下面（倒立）再 +180°。
 * 已做过则只还原戳记，绝不能把当前的 0 再写进戳记。
 */
export function forceUprightByMeshAabb(root: Object3D, model?: Object3D): void {
  const target =
    model ?? root.children.find((c) => !(c instanceof Bone)) ?? null
  if (!target) return

  // Mixamo 本身是 Y-up，不要转
  if (hasMixamoBoneName(root)) {
    target.userData.hbUprightDone = true
    stampAvatarBaseRotation(target)
    return
  }

  // 非蒙皮静态模：仍用包围盒判断
  if (!hasSkinnedDescendant(root)) {
    if (target.userData.hbUprightDone) {
      target.rotation.x =
        typeof target.userData.hbBaseRotX === 'number' ? target.userData.hbBaseRotX : target.rotation.x
      return
    }
    computeMeshOnlyBounds(root, _meshBox)
    if (!_meshBox.isEmpty()) {
      _meshBox.getSize(_size)
      if (_size.z > _size.y * 0.85) {
        target.rotation.x = -Math.PI / 2
      }
    }
    target.userData.hbUprightDone = true
    stampAvatarBaseRotation(target)
    return
  }

  if (target.userData.hbUprightDone) {
    target.rotation.x =
      typeof target.userData.hbBaseRotX === 'number' ? target.userData.hbBaseRotX : -Math.PI / 2
    target.rotation.y =
      typeof target.userData.hbBaseRotY === 'number' ? target.userData.hbBaseRotY : 0
    target.rotation.z =
      typeof target.userData.hbBaseRotZ === 'number' ? target.userData.hbBaseRotZ : 0
    return
  }

  // 混元蒙皮：先 -90° 拉竖直，再用头/脚判定要不要翻成头朝上
  target.rotation.x = -Math.PI / 2
  target.rotation.y = 0
  target.rotation.z = 0
  target.updateMatrixWorld(true)
  root.updateMatrixWorld(true)
  if (isHeadBelowFeet(root)) {
    target.rotation.x += Math.PI
    target.updateMatrixWorld(true)
    root.updateMatrixWorld(true)
  }
  target.userData.hbUprightDone = true
  stampAvatarBaseRotation(target)
}

/** 竖直后：头骨世界 Y 是否明显低于脚骨（倒立） */
function isHeadBelowFeet(root: Object3D): boolean {
  let headY = NaN
  let footY = Infinity
  root.traverse((obj) => {
    if (!(obj instanceof Bone)) return
    const key = normalizeBoneKey(obj.name)
    obj.getWorldPosition(_hip)
    if (!Number.isFinite(_hip.y)) return
    if (key === 'head' || key === 'neck') {
      if (!Number.isFinite(headY)) headY = _hip.y
    }
    if (key.includes('foot') || key.includes('toe')) {
      footY = Math.min(footY, _hip.y)
    }
  })
  if (!Number.isFinite(headY) || !Number.isFinite(footY) || footY === Infinity) {
    // 无脚骨：用包围盒中心偏置粗判 —— 不可靠则不翻
    return false
  }
  return headY < footY - 0.05
}

function fitByOuterScale(root: Object3D, userScale: number): void {
  let height = readWorldHeight(root)

  if (height >= 50 && height <= 500) {
    root.scale.multiplyScalar(0.01)
    height = readWorldHeight(root)
  } else if (height > 500) {
    let guard = 0
    while (height > 5 && guard < 8) {
      root.scale.multiplyScalar(0.1)
      height = readWorldHeight(root)
      guard += 1
    }
    if (height >= 50) {
      root.scale.multiplyScalar(0.01)
      height = readWorldHeight(root)
    }
  } else if (height > 3.5) {
    root.scale.multiplyScalar(0.01)
    height = readWorldHeight(root)
  }

  const target =
    houseFitAvatarHeightM() * (Number.isFinite(userScale) && userScale > 0 ? userScale : 1)

  if (height > 1e-4) {
    root.scale.multiplyScalar(target / height)
    height = readWorldHeight(root)
  }

  const hardMax =
    AVATAR_HARD_MAX_HEIGHT_M * (Number.isFinite(userScale) && userScale > 0 ? Math.max(userScale, 1) : 1)
  if (height > hardMax && height > 1e-4) {
    root.scale.multiplyScalar(hardMax / height)
  }
}

export function enforceAvatarHouseScale(root: Object3D): void {
  let height = readWorldHeight(root)
  if (height > AVATAR_HARD_MAX_HEIGHT_M && height > 1e-4) {
    root.scale.multiplyScalar(AVATAR_TARGET_HEIGHT_M / height)
    root.updateMatrixWorld(true)
  }
}

export function avatarFeetOffsetY(root: Object3D): number {
  const parent = root.parent
  if (parent) parent.remove(root)
  const keepY = root.position.y
  root.position.y = 0
  root.updateMatrixWorld(true)
  const minY = measureLowestPointY(root)
  const offset = Number.isFinite(minY) ? -minY : 0
  root.position.y = keepY
  if (parent) parent.add(root)
  return Math.abs(offset) < 1e-4 ? 0 : offset
}

/** 当前姿势下最低点（脚骨优先，其次可靠包围盒） */
function measureLowestPointY(root: Object3D): number {
  root.updateMatrixWorld(true)
  // 先更新蒙皮骨骼矩阵
  root.traverse((obj) => {
    if (obj instanceof SkinnedMesh) {
      try {
        obj.skeleton?.update()
      } catch {
        /* ignore */
      }
    }
  })
  root.updateMatrixWorld(true)

  let minY = Infinity
  root.traverse((obj) => {
    if (!(obj instanceof Bone)) return
    const key = normalizeBoneKey(obj.name)
    if (
      !(
        key.includes('foot') ||
        key.includes('toe') ||
        key === 'leftleg' ||
        key === 'rightleg' ||
        key.endsWith('leg')
      )
    ) {
      return
    }
    // 小腿不算脚底，只要 foot/toe
    if (!key.includes('foot') && !key.includes('toe')) return
    obj.getWorldPosition(_hip)
    if (Number.isFinite(_hip.y)) minY = Math.min(minY, _hip.y)
  })

  computeReliableObjectBounds(root, _box)
  if (!_box.isEmpty() && Number.isFinite(_box.min.y)) {
    minY = Math.min(minY, _box.min.y)
  }
  computeMeshOnlyBounds(root, _meshBox)
  if (!_meshBox.isEmpty() && Number.isFinite(_meshBox.min.y)) {
    minY = Math.min(minY, _meshBox.min.y)
  }

  return Number.isFinite(minY) ? minY : 0
}

/** 导入时量一次：父级 group.position.y 需加此值，脚才贴地 */
export function stampAvatarFeetLift(root: Object3D): void {
  root.userData.hbFeetLift = computeAvatarFeetLift(root)
}

export function getAvatarFeetLift(root: Object3D): number {
  const v = root.userData.hbFeetLift
  return typeof v === 'number' && Number.isFinite(v) ? v : 0
}

/** 绑定姿 + 扶正后，最低点相对 root 原点的抬升量（只量不写入 root.position） */
export function computeAvatarFeetLift(root: Object3D): number {
  const parent = root.parent
  if (parent) parent.remove(root)
  const keep = root.position.clone()
  root.position.set(0, 0, 0)
  root.updateMatrixWorld(true)

  // 蒙皮绑定姿
  root.traverse((obj) => {
    if (obj instanceof SkinnedMesh && obj.skeleton) {
      try {
        obj.skeleton.pose()
        obj.skeleton.update()
      } catch {
        /* ignore */
      }
    }
  })
  root.updateMatrixWorld(true)

  let minY = measureFootBoneMinY(root)
  if (minY === null) {
    computeMeshOnlyBounds(root, _meshBox)
    if (!_meshBox.isEmpty() && Number.isFinite(_meshBox.min.y)) {
      minY = _meshBox.min.y
    } else {
      computeReliableObjectBounds(root, _box)
      minY = !_box.isEmpty() && Number.isFinite(_box.min.y) ? _box.min.y : 0
    }
  }

  root.position.copy(keep)
  if (parent) parent.add(root)
  root.updateMatrixWorld(true)
  return Number.isFinite(minY) ? -minY : 0
}

function measureFootBoneMinY(root: Object3D): number | null {
  let minY = Infinity
  root.traverse((obj) => {
    if (!(obj instanceof Bone)) return
    const key = normalizeBoneKey(obj.name)
    if (!key.includes('foot') && !key.includes('toe')) return
    obj.getWorldPosition(_hip)
    if (Number.isFinite(_hip.y)) minY = Math.min(minY, _hip.y)
  })
  return Number.isFinite(minY) && minY !== Infinity ? minY : null
}

/** @deprecated 改用 stampAvatarFeetLift + 外层 group.y */
export function stampAvatarGroundY(root: Object3D): void {
  stampAvatarFeetLift(root)
}

export function restoreAvatarGroundY(root: Object3D): void {
  root.position.x = 0
  root.position.z = 0
  root.position.y = 0
}

/**
 * @deprecated 改用 stampAvatarFeetLift；不再改 root.position.y（会和外层 feet 叠双层浮空）
 */
export function groundAvatarToMeshFeet(root: Object3D): void {
  stampAvatarFeetLift(root)
  root.position.x = 0
  root.position.z = 0
  root.position.y = 0
}

export function groundSkinnedContent(root: Object3D): void {
  root.updateMatrixWorld(true)
  computeReliableObjectBounds(root, _box)
  if (_box.isEmpty() || !Number.isFinite(_box.min.y)) return
  if (Math.abs(_box.min.y) < 1e-5) return
  root.position.y -= _box.min.y
  root.updateMatrixWorld(true)
}

export function prepareCustomAvatarMesh(
  group: Group,
  userScale = 1,
  embeddedClips: AnimationClip[] = [],
): PreparedAvatarMesh {
  const root = new Group()
  root.name = 'oc-avatar-root'

  const model = cloneAvatarSource(group)
  model.name = 'oc-avatar-model'
  model.traverse((obj) => {
    if (obj instanceof Mesh) {
      obj.castShadow = false
      obj.receiveShadow = false
      obj.frustumCulled = false
    }
    if (obj instanceof SkinnedMesh && obj.geometry && !obj.geometry.boundingBox) {
      obj.geometry.computeBoundingBox()
    }
  })

  root.add(model)
  // 混元蒙皮：直接 -90°，不再依赖 AABB 猜
  forceUprightByMeshAabb(root, model)
  fitByOuterScale(root, userScale)
  forceUprightByMeshAabb(root, model) // 已 done 则只还原戳记
  stampAvatarFeetLift(root)
  root.position.set(0, 0, 0)

  if (import.meta.env?.DEV) {
    computeMeshOnlyBounds(root, _meshBox)
    _meshBox.getSize(_size)
    console.info('[homeBuild] OC 外层缩放后身高(m)=', readWorldHeight(root).toFixed(3), {
      modelRotX: model.rotation.x,
      modelRotZ: model.rotation.z,
      rootY: root.position.y,
      feetLift: getAvatarFeetLift(root),
      meshSize: { x: +_size.x.toFixed(3), y: +_size.y.toFixed(3), z: +_size.z.toFixed(3) },
    })
  }

  return { root, embeddedClips: [...embeddedClips] }
}

export function groundAvatarRoot(root: Object3D): void {
  const parent = root.parent
  const prev = root.position.clone()
  if (parent) parent.remove(root)
  root.position.x = 0
  root.position.z = 0
  const keepScale = root.scale.clone()
  const keepRotX = root.rotation.x
  const keepRotY = root.rotation.y
  const keepRotZ = root.rotation.z
  root.position.y = 0
  root.updateMatrixWorld(true)
  computeReliableObjectBounds(root, _box)
  if (Number.isFinite(_box.min.y) && Math.abs(_box.min.y) >= 1e-5) {
    root.position.y = -_box.min.y
  } else {
    root.position.copy(prev)
  }
  root.scale.copy(keepScale)
  root.rotation.set(keepRotX, keepRotY, keepRotZ)
  root.updateMatrixWorld(true)
  if (parent) parent.add(root)
}
