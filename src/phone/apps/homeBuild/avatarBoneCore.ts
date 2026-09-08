import type { Bone } from 'three'

/** Mixamo 人型核心骨（逻辑名） */
export const MIXAMO_CORE = [
  'Hips',
  'Spine',
  'Spine1',
  'Spine2',
  'Neck',
  'Head',
  'LeftShoulder',
  'LeftArm',
  'LeftForeArm',
  'LeftHand',
  'RightShoulder',
  'RightArm',
  'RightForeArm',
  'RightHand',
  'LeftUpLeg',
  'LeftLeg',
  'LeftFoot',
  'LeftToeBase',
  'RightUpLeg',
  'RightLeg',
  'RightFoot',
  'RightToeBase',
] as const

export type MixamoCore = (typeof MIXAMO_CORE)[number]

/** 混元 / 其它自动绑骨常见别名 → Mixamo 规范名（不含 root，避免双骨盆） */
const ALIAS_TO_CORE: Record<string, MixamoCore> = {
  hips: 'Hips',
  pelvis: 'Hips',
  hip: 'Hips',
  spine: 'Spine',
  spine1: 'Spine1',
  spine2: 'Spine2',
  spine3: 'Spine2',
  chest: 'Spine2',
  neck: 'Neck',
  head: 'Head',
  leftshoulder: 'LeftShoulder',
  rightshoulder: 'RightShoulder',
  leftarm: 'LeftArm',
  leftupperarm: 'LeftArm',
  upperarm_l: 'LeftArm',
  l_upperarm: 'LeftArm',
  rightarm: 'RightArm',
  rightupperarm: 'RightArm',
  upperarm_r: 'RightArm',
  r_upperarm: 'RightArm',
  leftforearm: 'LeftForeArm',
  leftlowerarm: 'LeftForeArm',
  lowerarm_l: 'LeftForeArm',
  l_forearm: 'LeftForeArm',
  rightforearm: 'RightForeArm',
  rightlowerarm: 'RightForeArm',
  lowerarm_r: 'RightForeArm',
  r_forearm: 'RightForeArm',
  lefthand: 'LeftHand',
  hand_l: 'LeftHand',
  l_hand: 'LeftHand',
  righthand: 'RightHand',
  hand_r: 'RightHand',
  r_hand: 'RightHand',
  leftupleg: 'LeftUpLeg',
  leftthigh: 'LeftUpLeg',
  leftupperleg: 'LeftUpLeg',
  upperleg_l: 'LeftUpLeg',
  l_upleg: 'LeftUpLeg',
  rightupleg: 'RightUpLeg',
  rightthigh: 'RightUpLeg',
  rightupperleg: 'RightUpLeg',
  upperleg_r: 'RightUpLeg',
  r_upleg: 'RightUpLeg',
  leftleg: 'LeftLeg',
  leftcalf: 'LeftLeg',
  leftlowerleg: 'LeftLeg',
  lowerleg_l: 'LeftLeg',
  l_leg: 'LeftLeg',
  rightleg: 'RightLeg',
  rightcalf: 'RightLeg',
  rightlowerleg: 'RightLeg',
  lowerleg_r: 'RightLeg',
  r_leg: 'RightLeg',
  leftfoot: 'LeftFoot',
  foot_l: 'LeftFoot',
  l_foot: 'LeftFoot',
  rightfoot: 'RightFoot',
  foot_r: 'RightFoot',
  r_foot: 'RightFoot',
  lefttoebase: 'LeftToeBase',
  lefttoe: 'LeftToeBase',
  righttoebase: 'RightToeBase',
  righttoe: 'RightToeBase',
}

export function normalizeBoneKey(name: string): string {
  return name
    .replace(/^mixamorig[:_\-]?/i, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase()
}

export function resolveCoreName(boneName: string): MixamoCore | null {
  const key = normalizeBoneKey(boneName)
  if (!key || key === 'root') return null
  for (const core of MIXAMO_CORE) {
    if (normalizeBoneKey(core) === key) return core
  }
  return ALIAS_TO_CORE[key] ?? null
}

function isPrimaryHipsBone(name: string): boolean {
  const key = normalizeBoneKey(name)
  return key === 'hips' || key === 'pelvis'
}

/**
 * 每个 Mixamo 核心骨只保留一根目标骨。
 * 混元常见 root+Hips 双骨盆：Hips 优先于 root。
 */
export function buildCoreBoneMap(bones: Bone[]): Map<MixamoCore, Bone> {
  const buckets = new Map<MixamoCore, Bone[]>()

  for (const bone of bones) {
    const core = resolveCoreName(bone.name)
    if (!core) continue
    const list = buckets.get(core) ?? []
    list.push(bone)
    buckets.set(core, list)
  }

  const map = new Map<MixamoCore, Bone>()
  for (const [core, list] of buckets) {
    if (core === 'Hips' && list.length > 1) {
      const preferred =
        list.find((b) => isPrimaryHipsBone(b.name)) ??
        list.find((b) => !/^root$/i.test(b.name)) ??
        list[0]!
      map.set(core, preferred)
    } else {
      map.set(core, list[0]!)
    }
  }
  return map
}

/** 目标骨名 → 源骨名（每核心骨仅一条映射） */
export function buildTargetToSourceNames(
  targetBones: Bone[],
  sourceBones: Bone[],
): { names: Record<string, string>; mappedCore: Set<MixamoCore> } {
  const targetMap = buildCoreBoneMap(targetBones)
  const sourceMap = buildCoreBoneMap(sourceBones)
  const names: Record<string, string> = {}
  const mappedCore = new Set<MixamoCore>()

  for (const [core, targetBone] of targetMap) {
    const src = sourceMap.get(core)
    if (!src) continue
    names[targetBone.name] = src.name
    mappedCore.add(core)
  }

  return { names, mappedCore }
}
