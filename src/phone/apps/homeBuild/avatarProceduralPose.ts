import type { Group, Object3D } from 'three'
import { Bone } from 'three'
import { restoreAvatarBaseRotation } from './avatarMeshPrep'

export type ProceduralPoseId = 'none' | 'picked-up' | 'sleep'

/** 取可旋转的外形节点：跳过 Bone，避免改到自动绑骨的髋骨 */
function poseTarget(root: Group): Object3D | null {
  for (const child of root.children) {
    if (child instanceof Bone) continue
    return child
  }
  return root.children[0] ?? null
}

function baseRotX(model: Object3D): number {
  return typeof model.userData.hbBaseRotX === 'number' ? model.userData.hbBaseRotX : 0
}

function baseRotZ(model: Object3D): number {
  return typeof model.userData.hbBaseRotZ === 'number' ? model.userData.hbBaseRotZ : 0
}

/** 无 Mixamo 骨骼时的简易姿态（整模明显倾斜，仍看得出「被拎着」） */
export function applyProceduralPose(root: Group, pose: ProceduralPoseId, _timeSec: number): void {
  const model = poseTarget(root)
  if (!model) return

  if (pose === 'picked-up') {
    model.rotation.x = baseRotX(model) - 0.55
    model.rotation.z = baseRotZ(model) + 0.18
    model.position.y = 0.08
    return
  }

  if (pose === 'sleep') {
    model.rotation.x = baseRotX(model) - 0.08
    model.rotation.z = baseRotZ(model)
    model.position.y = 0
    return
  }

  restoreAvatarBaseRotation(root)
}

export function resetProceduralPose(root: Group): void {
  applyProceduralPose(root, 'none', 0)
}
