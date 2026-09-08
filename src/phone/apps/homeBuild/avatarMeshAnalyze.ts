import { Bone, Group, Mesh, SkinnedMesh } from 'three'

/** 上传模型与 Mixamo 内置骨骼的兼容程度 */
export type AvatarMeshRigKind = 'none' | 'static' | 'skinned' | 'mixamo'

export function analyzeAvatarMeshRig(group: Group): AvatarMeshRigKind {
  let hasMesh = false
  let hasSkinned = false
  let hasMixamo = false
  let hasBones = false

  group.traverse((obj) => {
    if (obj instanceof Mesh) hasMesh = true
    if (obj instanceof Bone) {
      hasBones = true
      if (/mixamorig/i.test(obj.name)) hasMixamo = true
    }
    if (obj instanceof SkinnedMesh && obj.skeleton?.bones?.length) {
      hasSkinned = true
      for (const bone of obj.skeleton.bones) {
        if (/mixamorig/i.test(bone.name)) {
          hasMixamo = true
          break
        }
      }
    }
  })

  if (hasMixamo) return 'mixamo'
  if (hasSkinned || hasBones) return 'skinned'
  if (hasMesh) return 'static'
  return 'none'
}

export function rigKindLabel(kind: AvatarMeshRigKind): string {
  switch (kind) {
    case 'mixamo':
      return 'Mixamo 骨骼（可播内置动作）'
    case 'skinned':
      return '含骨骼（将自动重定向内置动作）'
    case 'static':
      return '纯网格（无骨骼，请导入混元绑骨蒙皮 FBX）'
    default:
      return '未知'
  }
}

export function usesBuiltinSkeletonForAnim(kind: AvatarMeshRigKind): boolean {
  return kind === 'static' || kind === 'none'
}
