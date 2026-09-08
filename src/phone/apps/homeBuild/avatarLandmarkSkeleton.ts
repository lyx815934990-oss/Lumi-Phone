import { Bone, Group, Skeleton, Vector3 } from 'three'
import type { OcJointMap, JointVec3 } from './ocJointStore'
import { USER_JOINT_IDS } from './ocJointStore'

/**
 * 关键关节自定义骨骼（Mixamo 同名）
 * 关节位置由用户手动点击定位；中间骨由关键点推算。
 */
export type LandmarkId =
  | 'hips'
  | 'spine'
  | 'spine1'
  | 'spine2'
  | 'neck'
  | 'head'
  | 'leftShoulder'
  | 'leftArm'
  | 'leftForeArm'
  | 'leftHand'
  | 'rightShoulder'
  | 'rightArm'
  | 'rightForeArm'
  | 'rightHand'
  | 'leftUpLeg'
  | 'leftLeg'
  | 'leftFoot'
  | 'rightUpLeg'
  | 'rightLeg'
  | 'rightFoot'

/** Mixamo 标准骨名 —— 与内置动作包轨道一致 */
export const LANDMARK_MIXAMO_NAME: Record<LandmarkId, string> = {
  hips: 'mixamorigHips',
  spine: 'mixamorigSpine',
  spine1: 'mixamorigSpine1',
  spine2: 'mixamorigSpine2',
  neck: 'mixamorigNeck',
  head: 'mixamorigHead',
  leftShoulder: 'mixamorigLeftShoulder',
  leftArm: 'mixamorigLeftArm',
  leftForeArm: 'mixamorigLeftForeArm',
  leftHand: 'mixamorigLeftHand',
  rightShoulder: 'mixamorigRightShoulder',
  rightArm: 'mixamorigRightArm',
  rightForeArm: 'mixamorigRightForeArm',
  rightHand: 'mixamorigRightHand',
  leftUpLeg: 'mixamorigLeftUpLeg',
  leftLeg: 'mixamorigLeftLeg',
  leftFoot: 'mixamorigLeftFoot',
  rightUpLeg: 'mixamorigRightUpLeg',
  rightLeg: 'mixamorigRightLeg',
  rightFoot: 'mixamorigRightFoot',
}

type LandmarkParent = {
  id: LandmarkId
  parent: LandmarkId | null
}

/** 骨骼父子（与 Mixamo 层级一致） */
export const LANDMARK_HIERARCHY: LandmarkParent[] = [
  { id: 'hips', parent: null },
  { id: 'spine', parent: 'hips' },
  { id: 'spine1', parent: 'spine' },
  { id: 'spine2', parent: 'spine1' },
  { id: 'neck', parent: 'spine2' },
  { id: 'head', parent: 'neck' },
  { id: 'leftShoulder', parent: 'spine2' },
  { id: 'leftArm', parent: 'leftShoulder' },
  { id: 'leftForeArm', parent: 'leftArm' },
  { id: 'leftHand', parent: 'leftForeArm' },
  { id: 'rightShoulder', parent: 'spine2' },
  { id: 'rightArm', parent: 'rightShoulder' },
  { id: 'rightForeArm', parent: 'rightArm' },
  { id: 'rightHand', parent: 'rightForeArm' },
  { id: 'leftUpLeg', parent: 'hips' },
  { id: 'leftLeg', parent: 'leftUpLeg' },
  { id: 'leftFoot', parent: 'leftLeg' },
  { id: 'rightUpLeg', parent: 'hips' },
  { id: 'rightLeg', parent: 'rightUpLeg' },
  { id: 'rightFoot', parent: 'rightLeg' },
]

export type LandmarkSkeleton = {
  root: Group
  skeleton: Skeleton
  bones: Bone[]
  worldPoints: Record<LandmarkId, Vector3>
}

function v3(p: JointVec3): Vector3 {
  return new Vector3(p.x, p.y, p.z)
}

function lerpV(a: Vector3, b: Vector3, t: number): Vector3 {
  return new Vector3().lerpVectors(a, b, t)
}

/**
 * 用用户手动点的关键关节，推算完整 Mixamo 同名骨架点。
 * 不会按包围盒自动估点——缺用户点直接失败。
 */
export function expandUserJointsToFull(joints: OcJointMap): Record<LandmarkId, Vector3> | null {
  for (const id of USER_JOINT_IDS) {
    if (!joints[id]) return null
  }

  const hips = v3(joints.hips!)
  const head = v3(joints.head!)
  const leftShoulder = v3(joints.leftShoulder!)
  const rightShoulder = v3(joints.rightShoulder!)
  const leftArm = v3(joints.leftArm!)
  const rightArm = v3(joints.rightArm!)
  const leftHand = v3(joints.leftHand!)
  const rightHand = v3(joints.rightHand!)
  const leftLeg = v3(joints.leftLeg!)
  const rightLeg = v3(joints.rightLeg!)
  const leftFoot = v3(joints.leftFoot!)
  const rightFoot = v3(joints.rightFoot!)

  const spine = lerpV(hips, head, 0.18)
  const spine1 = lerpV(hips, head, 0.38)
  const spine2 = lerpV(hips, head, 0.55)
  const shoulderMid = lerpV(leftShoulder, rightShoulder, 0.5)
  spine2.lerp(shoulderMid, 0.35)
  const neck = lerpV(spine2, head, 0.55)

  const leftForeArm = lerpV(leftArm, leftHand, 0.5)
  const rightForeArm = lerpV(rightArm, rightHand, 0.5)
  const leftUpLeg = lerpV(hips, leftLeg, 0.22)
  const rightUpLeg = lerpV(hips, rightLeg, 0.22)

  return {
    hips,
    spine,
    spine1,
    spine2,
    neck,
    head,
    leftShoulder,
    leftArm,
    leftForeArm,
    leftHand,
    rightShoulder,
    rightArm,
    rightForeArm,
    rightHand,
    leftUpLeg,
    leftLeg,
    leftFoot,
    rightUpLeg,
    rightLeg,
    rightFoot,
  }
}

/** 仅根据用户手动关节生成骨骼（禁止包围盒自动定位） */
export function createLandmarkSkeletonFromUserJoints(
  joints: OcJointMap,
): LandmarkSkeleton | null {
  const worldPoints = expandUserJointsToFull(joints)
  if (!worldPoints) return null

  const root = new Group()
  root.name = 'UserLandmarkMixamoRig'

  const boneById = {} as Record<LandmarkId, Bone>
  const bones: Bone[] = []

  for (const { id } of LANDMARK_HIERARCHY) {
    const bone = new Bone()
    bone.name = LANDMARK_MIXAMO_NAME[id]
    boneById[id] = bone
    bones.push(bone)
  }

  for (const { id, parent } of LANDMARK_HIERARCHY) {
    const bone = boneById[id]
    const world = worldPoints[id]
    if (!parent) {
      bone.position.copy(world)
      root.add(bone)
    } else {
      bone.position.copy(world).sub(worldPoints[parent])
      boneById[parent].add(bone)
    }
  }

  root.updateMatrixWorld(true)
  return { root, skeleton: new Skeleton(bones), bones, worldPoints }
}

/** 关键关节线段（用于包络绑骨） */
export function landmarkBoneSegments(
  skeleton: Skeleton,
): { a: Vector3; b: Vector3; boneIndex: number }[] {
  const segments: { a: Vector3; b: Vector3; boneIndex: number }[] = []
  const bones = skeleton.bones

  for (let i = 0; i < bones.length; i++) {
    const bone = bones[i]!
    bone.updateWorldMatrix(true, false)
    const a = new Vector3().setFromMatrixPosition(bone.matrixWorld)

    let childBone: Bone | null = null
    for (const c of bone.children) {
      if (c instanceof Bone) {
        childBone = c
        break
      }
    }

    if (childBone) {
      childBone.updateWorldMatrix(true, false)
      const b = new Vector3().setFromMatrixPosition(childBone.matrixWorld)
      segments.push({ a, b, boneIndex: i })
    } else {
      const b = a.clone().add(new Vector3(0, -0.04, 0.02))
      segments.push({ a, b, boneIndex: i })
    }
  }

  return segments
}
