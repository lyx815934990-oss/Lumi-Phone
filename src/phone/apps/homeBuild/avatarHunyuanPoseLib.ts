/**
 * 混元原生姿势库（在混元 bind 上按实测局部轴叠加）。
 * 禁止套用 Mixamo 局部旋转数字——骨轴不一致。
 *
 * 「被拎起」对齐 D:/示例1/建模模型/骨骼/被拎起来移动.fbx 语义：
 *   上身前倾、双臂下垂身侧、双腿自然垂下略弯（不是举手/抱膝）
 *
 * 混元扶正后实测轴：
 * - 躯干前倾(头 +Z): Spine z+
 * - 左臂下垂: LeftArm z+
 * - 右臂下垂: RightArm z-
 */
import { Object3D, Quaternion, SkinnedMesh, Vector3 } from 'three'
import { buildCoreBoneMap, type MixamoCore } from './avatarBoneCore'
import { restoreAvatarBaseRotation } from './avatarMeshPrep'

export type HunyuanPoseId = 'picked-up' | 'fall-air' | 'fall-land'

type AxisOp = {
  core: MixamoCore
  axis: [number, number, number]
  angle: number
}

/**
 * 被拎起 —— 对齐 Mixamo「被拎起来移动」定格：
 * 前倾悬空，手在头下方，脚仍接近地面高度（下垂）。
 */
const PICKED_UP: AxisOp[] = [
  { core: 'Spine', axis: [0, 0, 1], angle: 0.55 },
  { core: 'Neck', axis: [0, 0, 1], angle: 0.15 },
  { core: 'Head', axis: [0, 0, 1], angle: 0.12 },
  { core: 'LeftArm', axis: [0, 0, 1], angle: 0.65 },
  { core: 'RightArm', axis: [0, 0, -1], angle: 0.65 },
  { core: 'LeftForeArm', axis: [0, 0, 1], angle: 0.1 },
  { core: 'RightForeArm', axis: [0, 0, -1], angle: 0.25 },
  { core: 'LeftUpLeg', axis: [1, 0, 0], angle: 0.2 },
  { core: 'RightUpLeg', axis: [1, 0, 0], angle: 0.25 },
  { core: 'LeftLeg', axis: [1, 0, 0], angle: 0.1 },
  { core: 'RightLeg', axis: [1, 0, 0], angle: 0.12 },
  { core: 'LeftFoot', axis: [1, 0, 0], angle: -0.4 },
  { core: 'RightFoot', axis: [1, 0, 0], angle: -0.55 },
]

/** 下落过程：轻微张臂失衡感，腿仍下垂 */
const FALL_AIR: AxisOp[] = [
  { core: 'Spine', axis: [0, 0, 1], angle: 0.12 },
  { core: 'LeftArm', axis: [0, 0, -1], angle: 0.25 },
  { core: 'RightArm', axis: [0, 0, 1], angle: 0.25 },
  { core: 'LeftUpLeg', axis: [1, 0, 0], angle: 0.15 },
  { core: 'RightUpLeg', axis: [1, 0, 0], angle: 0.18 },
  { core: 'LeftLeg', axis: [1, 0, 0], angle: 0.12 },
  { core: 'RightLeg', axis: [1, 0, 0], angle: 0.15 },
]

/** 着地：轻微蹲姿 */
const FALL_LAND: AxisOp[] = [
  { core: 'Spine', axis: [0, 0, 1], angle: 0.2 },
  { core: 'LeftArm', axis: [0, 0, 1], angle: 0.2 },
  { core: 'RightArm', axis: [0, 0, -1], angle: 0.2 },
  { core: 'LeftUpLeg', axis: [0, 0, 1], angle: 0.45 },
  { core: 'RightUpLeg', axis: [0, 0, -1], angle: 0.45 },
  { core: 'LeftLeg', axis: [0, 0, 1], angle: 0.7 },
  { core: 'RightLeg', axis: [0, 0, 1], angle: 0.7 },
]

const POSES: Record<HunyuanPoseId, AxisOp[]> = {
  'picked-up': PICKED_UP,
  'fall-air': FALL_AIR,
  'fall-land': FALL_LAND,
}

const _q = new Quaternion()
const _axis = new Vector3()

function collectSkinned(root: Object3D): SkinnedMesh[] {
  const list: SkinnedMesh[] = []
  root.traverse((o) => {
    if (o instanceof SkinnedMesh) list.push(o)
  })
  return list
}

function resetToBind(root: Object3D): void {
  const seen = new Set<import('three').Skeleton>()
  for (const mesh of collectSkinned(root)) {
    if (!mesh.skeleton || seen.has(mesh.skeleton)) continue
    seen.add(mesh.skeleton)
    mesh.skeleton.pose()
    mesh.skeleton.update()
  }
  root.updateMatrixWorld(true)
}

export function applyHunyuanPose(root: Object3D, poseId: HunyuanPoseId): number {
  const skin =
    collectSkinned(root).sort(
      (a, b) => (b.skeleton?.bones.length ?? 0) - (a.skeleton?.bones.length ?? 0),
    )[0] ?? null
  if (!skin?.skeleton?.bones?.length) return 0

  resetToBind(root)
  restoreAvatarBaseRotation(root)

  const coreMap = buildCoreBoneMap(skin.skeleton.bones)
  let applied = 0

  for (const op of POSES[poseId]) {
    const bone = coreMap.get(op.core)
    if (!bone) continue
    _axis.set(op.axis[0], op.axis[1], op.axis[2]).normalize()
    _q.setFromAxisAngle(_axis, op.angle)
    bone.quaternion.multiply(_q)
    bone.matrixAutoUpdate = true
    applied += 1
  }

  root.updateMatrixWorld(true)
  skin.skeleton.update()
  return applied
}

export function applyHunyuanPoseIfChanged(
  root: Object3D,
  poseId: HunyuanPoseId,
  lastPose: { current: HunyuanPoseId | null },
): number {
  if (lastPose.current === poseId) return 0
  const n = applyHunyuanPose(root, poseId)
  lastPose.current = poseId
  if (import.meta.env?.DEV) {
    console.info('[homeBuild] 混元姿势库', { poseId, bones: n, style: 'hang-forward' })
  }
  return n
}

export function clearHunyuanPose(root: Object3D): void {
  resetToBind(root)
  restoreAvatarBaseRotation(root)
}
