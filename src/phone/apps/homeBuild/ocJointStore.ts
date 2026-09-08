import type { Box3 } from 'three'
import type { LandmarkId } from './avatarLandmarkSkeleton'
import { emitOcJointChange } from './ocModelEvents'

const LS_PREFIX = 'lumi.homeBuild.ocJoints.v1.'

/** 用户需要手动点击定位的关键关节（其余由这些点推算） */
export const USER_JOINT_IDS = [
  'hips',
  'head',
  'leftShoulder',
  'rightShoulder',
  'leftArm',
  'rightArm',
  'leftHand',
  'rightHand',
  'leftLeg',
  'rightLeg',
  'leftFoot',
  'rightFoot',
] as const satisfies readonly LandmarkId[]

export type UserJointId = (typeof USER_JOINT_IDS)[number]

export const USER_JOINT_LABELS: Record<UserJointId, string> = {
  hips: '髋部中心',
  head: '头',
  leftShoulder: '左肩',
  rightShoulder: '右肩',
  leftArm: '左肘',
  rightArm: '右肘',
  leftHand: '左腕',
  rightHand: '右腕',
  leftLeg: '左膝',
  rightLeg: '右膝',
  leftFoot: '左踝',
  rightFoot: '右踝',
}

/** 编辑器连线（示例骨架可视化） */
export const USER_JOINT_EDGES: [UserJointId, UserJointId][] = [
  ['hips', 'head'],
  ['hips', 'leftShoulder'],
  ['hips', 'rightShoulder'],
  ['leftShoulder', 'rightShoulder'],
  ['leftShoulder', 'leftArm'],
  ['leftArm', 'leftHand'],
  ['rightShoulder', 'rightArm'],
  ['rightArm', 'rightHand'],
  ['hips', 'leftLeg'],
  ['leftLeg', 'leftFoot'],
  ['hips', 'rightLeg'],
  ['rightLeg', 'rightFoot'],
]

export type JointVec3 = { x: number; y: number; z: number }

export type OcJointMap = Partial<Record<LandmarkId, JointVec3>>

function lsKey(characterId: string): string {
  return `${LS_PREFIX}${characterId.trim()}`
}

function pt(x: number, y: number, z: number): JointVec3 {
  return { x, y, z }
}

/** 把关节中心钳制在模型包围盒内，并预留体积块半边长，保证整块不越界 */
export function clampJointToModelBox(
  point: JointVec3,
  box: Box3,
  blockHalf = 0.03,
): JointVec3 {
  const pad = Math.max(blockHalf, 0.001)
  const minX = box.min.x + pad
  const maxX = box.max.x - pad
  const minY = box.min.y + pad
  const maxY = box.max.y - pad
  const minZ = box.min.z + pad
  const maxZ = box.max.z - pad
  // 盒太薄时退化为中心面
  const cx = (box.min.x + box.max.x) * 0.5
  const cy = (box.min.y + box.max.y) * 0.5
  const cz = (box.min.z + box.max.z) * 0.5
  return {
    x: minX <= maxX ? Math.min(maxX, Math.max(minX, point.x)) : cx,
    y: minY <= maxY ? Math.min(maxY, Math.max(minY, point.y)) : cy,
    z: minZ <= maxZ ? Math.min(maxZ, Math.max(minZ, point.z)) : cz,
  }
}

export function jointBlockSizeForBox(box: Box3): number {
  const h = Math.max(box.max.y - box.min.y, 0.1)
  return Math.min(0.12, Math.max(0.045, h * 0.048))
}

export function clampJointsMapToBox(joints: OcJointMap, box: Box3, blockHalf?: number): OcJointMap {
  const half = blockHalf ?? jointBlockSizeForBox(box) * 0.5
  const out: OcJointMap = {}
  for (const id of USER_JOINT_IDS) {
    const p = joints[id]
    if (!p) continue
    out[id] = clampJointToModelBox(p, box, half)
  }
  return out
}

/**
 * 站立 + 双臂展开（T 字）示例关节 —— 仅作初值，用户再二次调整。
 * 全部落在模型包围盒内（预留体积块边距）。
 */
export function createStandingArmsOutJoints(box: Box3): OcJointMap {
  const block = jointBlockSizeForBox(box)
  const half = block * 0.5
  const min = box.min
  const max = box.max
  const cx = (min.x + max.x) * 0.5
  const cz = (min.z + max.z) * 0.5
  const h = Math.max(max.y - min.y, 0.1)
  const usableHalfW = Math.max((max.x - min.x) * 0.5 - half, h * 0.08)
  const y = (t: number) => min.y + t * h
  const armY = y(0.78)
  // 双臂展开但不超出盒宽
  const handSpan = usableHalfW * 0.92
  const elbowSpan = usableHalfW * 0.62
  const shoulderSpan = usableHalfW * 0.38

  const raw: OcJointMap = {
    hips: pt(cx, y(0.52), cz),
    head: pt(cx, y(0.92), cz),
    leftShoulder: pt(cx - shoulderSpan, armY, cz),
    rightShoulder: pt(cx + shoulderSpan, armY, cz),
    leftArm: pt(cx - elbowSpan, armY, cz),
    rightArm: pt(cx + elbowSpan, armY, cz),
    leftHand: pt(cx - handSpan, armY, cz),
    rightHand: pt(cx + handSpan, armY, cz),
    leftLeg: pt(cx - usableHalfW * 0.22, y(0.28), cz),
    rightLeg: pt(cx + usableHalfW * 0.22, y(0.28), cz),
    leftFoot: pt(cx - usableHalfW * 0.22, y(0.06), cz + Math.min(usableHalfW * 0.15, h * 0.03)),
    rightFoot: pt(cx + usableHalfW * 0.22, y(0.06), cz + Math.min(usableHalfW * 0.15, h * 0.03)),
  }
  return clampJointsMapToBox(raw, box, half)
}

export function loadOcJoints(characterId: string): OcJointMap {
  const cid = characterId.trim()
  if (!cid) return {}
  try {
    const raw = localStorage.getItem(lsKey(cid))
    if (!raw) return {}
    const parsed = JSON.parse(raw) as OcJointMap
    if (!parsed || typeof parsed !== 'object') return {}
    const out: OcJointMap = {}
    for (const id of USER_JOINT_IDS) {
      const p = parsed[id]
      if (
        p &&
        Number.isFinite(p.x) &&
        Number.isFinite(p.y) &&
        Number.isFinite(p.z)
      ) {
        out[id] = { x: p.x, y: p.y, z: p.z }
      }
    }
    return out
  } catch {
    return {}
  }
}

export function saveOcJoints(characterId: string, joints: OcJointMap): void {
  const cid = characterId.trim()
  if (!cid) return
  const cleaned: OcJointMap = {}
  for (const id of USER_JOINT_IDS) {
    const p = joints[id]
    if (
      p &&
      Number.isFinite(p.x) &&
      Number.isFinite(p.y) &&
      Number.isFinite(p.z)
    ) {
      cleaned[id] = { x: p.x, y: p.y, z: p.z }
    }
  }
  try {
    localStorage.setItem(lsKey(cid), JSON.stringify(cleaned))
  } catch {
    /* quota */
  }
  emitOcJointChange(cid)
}

export function clearOcJoints(characterId: string): void {
  const cid = characterId.trim()
  if (!cid) return
  try {
    localStorage.removeItem(lsKey(cid))
  } catch {
    /* ignore */
  }
  emitOcJointChange(cid)
}

export function countPlacedUserJoints(joints: OcJointMap): number {
  let n = 0
  for (const id of USER_JOINT_IDS) {
    if (joints[id]) n += 1
  }
  return n
}

export function hasCompleteUserJoints(joints: OcJointMap): boolean {
  return USER_JOINT_IDS.every((id) => Boolean(joints[id]))
}
