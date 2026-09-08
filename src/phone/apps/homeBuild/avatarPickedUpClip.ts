import {
  AnimationClip,
  Bone,
  Euler,
  Matrix4,
  Object3D,
  Quaternion,
  QuaternionKeyframeTrack,
  SkinnedMesh,
  Vector3,
  type AnimationClip as AnimClip,
} from 'three'
import { restoreAvatarBaseRotation } from './avatarMeshPrep'

const _q = new Quaternion()
const _e = new Euler()
const _axis = new Vector3()
const _bindIdentity = new Matrix4()

/**
 * 被拎起定格 —— 针对「手动关节 / identity rest」骨架：
 * 用轴角直接拧手臂/腿，不依赖 Mixamo 绑定位姿约定。
 */
type PoseOp =
  | { kind: 'euler'; xyz: [number, number, number] }
  | { kind: 'axis'; axis: [number, number, number]; angle: number }

const PICKED_UP_POSE: Record<string, PoseOp> = {
  mixamorigHips: { kind: 'euler', xyz: [0.25, 0, 0.04] },
  mixamorigSpine: { kind: 'euler', xyz: [0.35, 0, 0] },
  // 混元 Spine1/2 bind 差 90°，不要再叠加 Mixamo 偏移
  mixamorigNeck: { kind: 'euler', xyz: [0.3, 0, 0] },
  mixamorigHead: { kind: 'euler', xyz: [0.3, 0, 0] },
  // 双臂上抬（绕前后轴拧起）
  mixamorigLeftShoulder: { kind: 'axis', axis: [0, 0, 1], angle: 1.15 },
  mixamorigRightShoulder: { kind: 'axis', axis: [0, 0, 1], angle: -1.15 },
  mixamorigLeftArm: { kind: 'axis', axis: [0, 0, 1], angle: 1.85 },
  mixamorigRightArm: { kind: 'axis', axis: [0, 0, 1], angle: -1.85 },
  mixamorigLeftForeArm: { kind: 'axis', axis: [0, 1, 0], angle: 0.9 },
  mixamorigRightForeArm: { kind: 'axis', axis: [0, 1, 0], angle: -0.9 },
  mixamorigLeftHand: { kind: 'euler', xyz: [0.2, 0, 0.3] },
  mixamorigRightHand: { kind: 'euler', xyz: [0.2, 0, -0.3] },
  // 腿蜷起
  mixamorigLeftUpLeg: { kind: 'euler', xyz: [1.05, 0.25, 0.2] },
  mixamorigRightUpLeg: { kind: 'euler', xyz: [1.05, -0.25, -0.2] },
  mixamorigLeftLeg: { kind: 'euler', xyz: [1.2, 0, 0] },
  mixamorigRightLeg: { kind: 'euler', xyz: [1.2, 0, 0] },
  mixamorigLeftFoot: { kind: 'euler', xyz: [-0.35, 0, 0] },
  mixamorigRightFoot: { kind: 'euler', xyz: [-0.35, 0, 0] },
}

function normalizeBoneKey(name: string): string {
  const raw = name.trim()
  const noColon = raw.replace(/^mixamorig:/i, 'mixamorig')
  if (PICKED_UP_POSE[noColon]) return noColon

  const lower = noColon.toLowerCase().replace(/[\s_\-.:]/g, '')

  const aliases: Array<[RegExp, string]> = [
    [/^mixamorighips$|^hips$|^pelvis$|^hip$/, 'mixamorigHips'],
    [/^mixamorigspine1$|^spine1$|^chest$/, 'mixamorigSpine1'],
    [/^mixamorigspine2$|^spine2$|^upperchest$/, 'mixamorigSpine2'],
    [/^mixamorigspine$|^spine$|^torso$/, 'mixamorigSpine'],
    [/^mixamorigneck$|^neck$/, 'mixamorigNeck'],
    [/^mixamorighead$|^head$/, 'mixamorigHead'],
    [/^mixamorigleftshoulder$|^leftshoulder$|^lshoulder$/, 'mixamorigLeftShoulder'],
    [/^mixamorigrightshoulder$|^rightshoulder$|^rshoulder$/, 'mixamorigRightShoulder'],
    [/^mixamorigleftarm$|^leftarm$|^luparm$|^leftupperarm$/, 'mixamorigLeftArm'],
    [/^mixamorigrightarm$|^rightarm$|^ruparm$|^rightupperarm$/, 'mixamorigRightArm'],
    [/^mixamorigleftforearm$|^leftforearm$|^lforearm$|^leftlowerarm$/, 'mixamorigLeftForeArm'],
    [/^mixamorigrightforearm$|^rightforearm$|^rforearm$|^rightlowerarm$/, 'mixamorigRightForeArm'],
    [/^mixamoriglefthand$|^lefthand$|^lhand$/, 'mixamorigLeftHand'],
    [/^mixamorigrighthand$|^righthand$|^rhand$/, 'mixamorigRightHand'],
    [/^mixamorigleftupleg$|^leftupleg$|^lthigh$|^leftthigh$|^leftupperleg$/, 'mixamorigLeftUpLeg'],
    [/^mixamorigrightupleg$|^rightupleg$|^rthigh$|^rightthigh$|^rightupperleg$/, 'mixamorigRightUpLeg'],
    [/^mixamorigleftleg$|^leftleg$|^lcalf$|^leftcalf$|^leftlowerleg$/, 'mixamorigLeftLeg'],
    [/^mixamorigrightleg$|^rightleg$|^rcalf$|^rightcalf$|^rightlowerleg$/, 'mixamorigRightLeg'],
    [/^mixamorigleftfoot$|^leftfoot$|^lfoot$/, 'mixamorigLeftFoot'],
    [/^mixamorigrightfoot$|^rightfoot$|^rfoot$/, 'mixamorigRightFoot'],
  ]
  for (const [re, key] of aliases) {
    if (re.test(lower)) return key
  }
  return noColon
}

function poseOpToQuat(op: PoseOp, out: Quaternion): Quaternion {
  if (op.kind === 'euler') {
    _e.set(op.xyz[0], op.xyz[1], op.xyz[2], 'XYZ')
    return out.setFromEuler(_e)
  }
  _axis.set(op.axis[0], op.axis[1], op.axis[2]).normalize()
  return out.setFromAxisAngle(_axis, op.angle)
}

/** 在绑定/休息姿态上叠加拎起偏移，避免整模揉成一团 */
function applyPoseOpOnRest(bone: Bone, op: PoseOp, rest: Quaternion): void {
  poseOpToQuat(op, _q)
  bone.quaternion.copy(rest).multiply(_q)
}

export function findMixamoBoneNames(root: Object3D): Set<string> {
  const names = new Set<string>()
  root.traverse((obj) => {
    if (obj instanceof Bone || /mixamorig/i.test(obj.name)) {
      names.add(obj.name)
    }
  })
  return names
}

export function hasMixamoBones(root: Object3D): boolean {
  let found = false
  root.traverse((obj) => {
    if (found) return
    if (obj instanceof Bone && /mixamorig/i.test(obj.name)) found = true
  })
  return found
}

function collectSkinned(root: Object3D): SkinnedMesh[] {
  const list: SkinnedMesh[] = []
  root.traverse((obj) => {
    if (obj instanceof SkinnedMesh) list.push(obj)
  })
  return list
}

/**
 * 整网兜底已废弃在蒙皮路径上使用：旋转 SkinnedMesh 会搞坏 attached 蒙皮。
 * 若必须兜底，请转 root Group，而不是 SkinnedMesh。
 */
export function applyPickedUpMeshFallback(root: Object3D): void {
  // 只对非蒙皮子节点做轻微后仰；有 SkinnedMesh 时不碰它的 rotation
  const skinned = new Set(collectSkinned(root))
  for (const child of root.children) {
    if (skinned.has(child as SkinnedMesh)) continue
    if (child instanceof Bone) continue
    child.rotation.x = -0.2
    child.rotation.z = 0.06
  }
}

export function clearPickedUpMeshFallback(root: Object3D): void {
  const skinned = new Set(collectSkinned(root))
  for (const child of root.children) {
    if (skinned.has(child as SkinnedMesh)) {
      child.rotation.set(0, 0, 0)
      child.position.y = 0
      continue
    }
    if (child instanceof Bone) continue
    child.rotation.set(0, 0, 0)
    child.position.y = 0
  }
  for (const mesh of skinned) {
    mesh.rotation.set(0, 0, 0)
    mesh.position.y = 0
  }
}

/** 外层后仰已废弃：用户要的是骨骼「被拎起」姿势，不要假晃动 */
export function applyPickedUpRootLean(_root: Object3D, _timeSec = 0): void {
  /* no-op */
}

export function applyPickedUpCarryMotion(_root: Object3D, _timeSec = 0): void {
  /* no-op */
}

export function clearPickedUpRootLean(root: Object3D): void {
  root.rotation.x = 0
  root.rotation.z = 0
  // 必须还原混元 Z-up 扶正角，不能写死 0（否则每帧躺平）
  restoreAvatarBaseRotation(root)
}

const _restQuat = new WeakMap<Bone, Quaternion>()

/**
 * 把骨骼摆成「被拎起」定格：rest ⊗ 偏移（不是绝对覆盖）。
 */
export function applyPickedUpBonePose(root: Object3D): number {
  let applied = 0
  const skinned = collectSkinned(root)
  const boneSet = new Set<Bone>()
  for (const mesh of skinned) {
    for (const bone of mesh.skeleton?.bones ?? []) boneSet.add(bone)
  }
  if (boneSet.size === 0) {
    root.traverse((obj) => {
      if (obj instanceof Bone) boneSet.add(obj)
    })
  }

  for (const bone of boneSet) {
    const key = normalizeBoneKey(bone.name)
    const op = PICKED_UP_POSE[key]
    if (!op) continue
    let rest = _restQuat.get(bone)
    if (!rest) {
      rest = bone.quaternion.clone()
      _restQuat.set(bone, rest)
    }
    applyPoseOpOnRest(bone, op, rest)
    bone.matrixAutoUpdate = true
    applied += 1
  }

  if (applied > 0) {
    root.updateMatrixWorld(true)
    for (const mesh of skinned) {
      mesh.skeleton?.update()
    }
  }
  return applied
}

export function resetBoneQuaternionsToIdentity(root: Object3D): void {
  root.traverse((obj) => {
    if (!(obj instanceof Bone)) return
    const rest = _restQuat.get(obj)
    if (rest) {
      obj.quaternion.copy(rest)
      _restQuat.delete(obj)
    }
  })
  root.updateMatrixWorld(true)
  for (const mesh of collectSkinned(root)) {
    mesh.skeleton?.update()
  }
  clearPickedUpMeshFallback(root)
  clearPickedUpRootLean(root)
}

/**
 * identity bind + detached：
 * - 顶点已在骨架空间
 * - 禁止用 mesh.rotation 当「拎起」效果（会搞坏 attached 蒙皮）
 */
export function bindSkinnedInPlace(mesh: SkinnedMesh, skeleton: import('three').Skeleton): void {
  if (!skeleton?.bones?.length) {
    throw new Error('bindSkinnedInPlace: skeleton 无效')
  }
  mesh.updateMatrixWorld(true)
  mesh.bindMode = 'detached'
  mesh.bind(skeleton, _bindIdentity)
  mesh.normalizeSkinWeights()
  mesh.skeleton?.calculateInverses()
  mesh.skeleton?.update()
}

export function createPickedUpSkeletalClip(root: Object3D): AnimClip | null {
  const baked = createPickedUpRelativeClip(root)
  return baked?.clip ?? null
}

/**
 * 混元等非 Mixamo 骨：在绑定姿上叠加拎起偏移并烘焙 clip（禁止 retarget 单帧，会拧成一团）。
 */
export function createPickedUpRelativeClip(
  root: Object3D,
): { clip: AnimClip; bindRoot: SkinnedMesh } | null {
  const skinned = collectSkinned(root)
  if (!skinned.length) return null
  let mesh = skinned[0]!
  for (const m of skinned) {
    if ((m.skeleton?.bones?.length ?? 0) > (mesh.skeleton?.bones?.length ?? 0)) mesh = m
  }
  const skeleton = mesh.skeleton
  if (!skeleton?.bones?.length) return null

  skeleton.pose()
  mesh.updateMatrixWorld(true)

  const duration = 0.12
  const tracks: QuaternionKeyframeTrack[] = []

  for (const bone of skeleton.bones) {
    const key = normalizeBoneKey(bone.name)
    const op = PICKED_UP_POSE[key]
    if (!op) continue
    const rest = bone.quaternion.clone()
    applyPoseOpOnRest(bone, op, rest)
    const q = bone.quaternion
    tracks.push(
      new QuaternionKeyframeTrack(
        `.bones[${bone.name}].quaternion`,
        [0, duration],
        [q.x, q.y, q.z, q.w, q.x, q.y, q.z, q.w],
      ),
    )
  }

  skeleton.pose()
  mesh.updateMatrixWorld(true)

  if (!tracks.length) return null
  return {
    clip: new AnimationClip('picked-up-hunyuan', duration, tracks),
    bindRoot: mesh,
  }
}

export function isUsefulAvatarClip(
  clip: AnimationClip | null | undefined,
  minDuration = 0.25,
): boolean {
  return Boolean(clip && clip.duration >= minDuration && clip.tracks.length > 0)
}

export function isUsefulPickedUpClip(clip: AnimationClip | null | undefined): boolean {
  return Boolean(clip && clip.tracks.length > 0 && clip.duration >= 0.01)
}
