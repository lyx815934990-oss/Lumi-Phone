import {
  AnimationClip,
  AnimationMixer,
  Bone,
  Object3D,
  QuaternionKeyframeTrack,
  Skeleton,
  SkinnedMesh,
  Vector3,
  VectorKeyframeTrack,
  type AnimationClip as AnimClip,
} from 'three'
import { retarget, retargetClip } from 'three/examples/jsm/utils/SkeletonUtils.js'
import {
  type MixamoCore,
  buildTargetToSourceNames,
  resolveCoreName,
} from './avatarBoneCore'

const MIN_MAPPED_CORE = 10

export { normalizeBoneKey, resolveCoreName, buildCoreBoneMap, MIXAMO_CORE } from './avatarBoneCore'

export type RetargetResult = {
  clip: AnimationClip
  /** retargetClip 输出轨是 `.bones[name].…`，必须绑在带 skeleton 的节点上 */
  bindRoot: Object3D
  mappedCount: number
}

export function findPrimarySkinnedMesh(root: Object3D): SkinnedMesh | null {
  let best: SkinnedMesh | null = null
  let bestCount = 0
  root.traverse((obj) => {
    if (!(obj instanceof SkinnedMesh) || !obj.skeleton?.bones?.length) return
    const n = obj.skeleton.bones.length
    if (n > bestCount) {
      best = obj
      bestCount = n
    }
  })
  return best
}

function collectBones(root: Object3D): Bone[] {
  const bones: Bone[] = []
  const seen = new Set<Bone>()
  root.traverse((obj) => {
    if (obj instanceof Bone && !seen.has(obj)) {
      seen.add(obj)
      bones.push(obj)
    }
  })
  return bones
}

export type MixamoSourcePack = {
  source: Object3D & { skeleton: Skeleton }
  hipName: string
  bones: Bone[]
}

/** 构建 Mixamo 源骨架包，供 retarget / 姿势采样使用 */
export function buildMixamoSourcePack(mixamoRoot: Object3D): MixamoSourcePack | null {
  const skin = findPrimarySkinnedMesh(mixamoRoot)
  let bones: Bone[]
  let skeleton: Skeleton

  if (skin?.skeleton?.bones?.length) {
    bones = skin.skeleton.bones
    skeleton = skin.skeleton
  } else {
    bones = collectBones(mixamoRoot)
    if (bones.length < 5) return null
    skeleton = new Skeleton(bones)
  }

  const hip =
    bones.find((b) => resolveCoreName(b.name) === 'Hips') ??
    bones.find((b) => /hips/i.test(b.name)) ??
    bones[0]!

  const source = mixamoRoot as Object3D & { skeleton: Skeleton }
  source.skeleton = skeleton

  return { source, hipName: hip.name, bones }
}

/**
 * names: { 目标骨名 → 源(Mixamo)骨名 }
 * Three.js retarget 约定：getBoneName(targetBone) 返回 source 名。
 */
export function buildTargetToSourceBoneMap(
  targetBones: Bone[],
  sourceBones: Bone[],
): { names: Record<string, string>; mappedCore: Set<MixamoCore> } {
  return buildTargetToSourceNames(targetBones, sourceBones)
}

function estimateRetargetScale(source: Object3D, target: Object3D): number {
  const srcH = approxHeight(source)
  const dstH = approxHeight(target)
  if (srcH < 1e-3 || dstH < 1e-3) return 1
  const ratio = dstH / srcH
  if (ratio > 0.001 && ratio < 10) return ratio
  return 1
}

function approxHeight(root: Object3D): number {
  root.updateMatrixWorld(true)
  let minY = Infinity
  let maxY = -Infinity
  root.traverse((obj) => {
    if (!(obj instanceof Bone) && !(obj instanceof SkinnedMesh)) return
    const p = new Vector3()
    obj.getWorldPosition(p)
    minY = Math.min(minY, p.y)
    maxY = Math.max(maxY, p.y)
  })
  if (!Number.isFinite(minY) || !Number.isFinite(maxY)) return 0
  return Math.max(0, maxY - minY)
}

function restoreBindPose(skin: SkinnedMesh): void {
  skin.skeleton.pose()
  skin.updateMatrixWorld(true)
}

/**
 * 把 Mixamo 动作 clip 重定向到目标蒙皮角色。
 * 短 clip 仍走烘焙，但定格类动作应优先用 avatarPoseLibrary。
 */
export function retargetMixamoClipToTarget(
  targetRoot: Object3D,
  mixamoAnimRoot: Object3D,
  sourceClip: AnimClip,
): RetargetResult | null {
  const targetSkin = findPrimarySkinnedMesh(targetRoot)
  if (!targetSkin?.skeleton?.bones?.length) return null

  const sourceRoot = mixamoAnimRoot.clone(true)
  const pack = buildMixamoSourcePack(sourceRoot)
  if (!pack) return null

  const { names, mappedCore } = buildTargetToSourceBoneMap(
    targetSkin.skeleton.bones,
    pack.bones,
  )

  if (mappedCore.size < MIN_MAPPED_CORE || !mappedCore.has('Hips')) {
    if (import.meta.env?.DEV) {
      console.warn('[homeBuild] 骨骼映射不足，跳过重定向', {
        mapped: [...mappedCore],
        targetBones: targetSkin.skeleton.bones.map((b) => b.name),
        sourceBones: pack.bones.map((b) => b.name),
      })
    }
    return null
  }

  const scale = estimateRetargetScale(mixamoAnimRoot, targetRoot)
  const options = {
    hip: pack.hipName,
    names,
    scale,
    preserveBonePositions: true,
    preserveBoneMatrix: true,
    useFirstFramePosition: true,
    hipInfluence: new Vector3(0, 1, 0),
  }

  try {
    sourceRoot.updateMatrixWorld(true)
    targetSkin.updateMatrixWorld(true)

    const shortPose = sourceClip.duration <= 0.12 || isMostlySingleKeyframe(sourceClip)
    const outClip = shortPose
      ? bakeRetargetedPoseClip(targetSkin, pack.source, sourceClip, options)
      : safeRetargetClip(targetSkin, pack.source, sourceClip, options)

    restoreBindPose(targetSkin)

    if (import.meta.env?.DEV) {
      console.info('[homeBuild] Mixamo→混元 重定向成功', {
        clip: sourceClip.name,
        mapped: mappedCore.size,
        tracks: outClip.tracks.length,
        scale: Number(scale.toFixed(4)),
        shortPose,
      })
    }

    return { clip: outClip, bindRoot: targetSkin, mappedCount: mappedCore.size }
  } catch (err) {
    restoreBindPose(targetSkin)
    if (import.meta.env?.DEV) {
      console.warn('[homeBuild] 重定向失败', sourceClip.name, err)
    }
    return null
  }
}

function isMostlySingleKeyframe(clip: AnimationClip): boolean {
  let maxKeys = 0
  for (const t of clip.tracks) maxKeys = Math.max(maxKeys, t.times.length)
  return maxKeys <= 2
}

function safeRetargetClip(
  targetSkin: SkinnedMesh,
  source: Object3D & { skeleton: Skeleton },
  clip: AnimationClip,
  options: Record<string, unknown>,
): AnimationClip {
  let working = clip
  const fpsGuess =
    typeof options.fps === 'number'
      ? options.fps
      : Math.max(30, Math.max(...clip.tracks.map((t) => t.times.length)) / Math.max(clip.duration, 1e-3))
  const minDur = 2 / fpsGuess
  if (clip.duration < minDur) {
    working = extendClipDuration(clip, minDur)
  }
  const retargeted = retargetClip(targetSkin, source, working, {
    ...options,
    fps: fpsGuess,
  })
  retargeted.name = `${clip.name || 'mixamo'}_retarget`
  return retargeted
}

function extendClipDuration(clip: AnimationClip, duration: number): AnimationClip {
  const tracks = clip.tracks.map((track) => {
    const times = Array.from(track.times)
    const values = Array.from(track.values)
    const stride = Math.max(1, Math.floor(values.length / Math.max(times.length, 1)))
    if (times.length === 0) return track.clone()
    const lastT = times[times.length - 1]!
    if (lastT < duration - 1e-6) {
      times.push(duration)
      for (let i = 0; i < stride; i++) {
        values.push(values[(times.length - 2) * stride + i]!)
      }
    }
    const Ctor = track.constructor as new (
      name: string,
      times: number[],
      values: number[],
    ) => typeof track
    return new Ctor(track.name, times, values)
  })
  return new AnimationClip(clip.name, duration, tracks)
}

function bakeRetargetedPoseClip(
  targetSkin: SkinnedMesh,
  source: Object3D & { skeleton: Skeleton },
  sourceClip: AnimationClip,
  options: Record<string, unknown>,
): AnimationClip {
  const mixer = new AnimationMixer(source)
  const action = mixer.clipAction(sourceClip)
  action.play()
  mixer.setTime(Math.max(0, sourceClip.duration - 1e-4))
  source.updateMatrixWorld(true)

  retarget(targetSkin, source, options)
  targetSkin.updateMatrixWorld(true)

  const duration = Math.max(sourceClip.duration, 0.1)
  const tracks: Array<QuaternionKeyframeTrack | VectorKeyframeTrack> = []
  const hipName = String(options.hip ?? '')

  for (const bone of targetSkin.skeleton.bones) {
    const srcName = (options.names as Record<string, string> | undefined)?.[bone.name]
    if (!srcName) continue

    const q = bone.quaternion
    tracks.push(
      new QuaternionKeyframeTrack(
        `.bones[${bone.name}].quaternion`,
        [0, duration],
        [q.x, q.y, q.z, q.w, q.x, q.y, q.z, q.w],
      ),
    )

    if (srcName === hipName || resolveCoreName(bone.name) === 'Hips') {
      const p = bone.position
      tracks.push(
        new VectorKeyframeTrack(
          `.bones[${bone.name}].position`,
          [0, duration],
          [p.x, p.y, p.z, p.x, p.y, p.z],
        ),
      )
    }
  }

  mixer.stopAllAction()
  mixer.uncacheRoot(source)

  return new AnimationClip(`${sourceClip.name || 'pose'}_retarget`, duration, tracks)
}

/** 诊断：目标骨架能映射到多少 Mixamo 核心骨 */
export function countRetargetableBones(targetRoot: Object3D): number {
  const skin = findPrimarySkinnedMesh(targetRoot)
  if (!skin) return 0
  let n = 0
  for (const bone of skin.skeleton.bones) {
    if (resolveCoreName(bone.name)) n += 1
  }
  return n
}
