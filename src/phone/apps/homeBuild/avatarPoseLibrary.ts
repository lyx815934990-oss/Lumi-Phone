import {
  AnimationClip,
  AnimationMixer,
  Bone,
  Object3D,
  Quaternion,
  QuaternionKeyframeTrack,
  SkinnedMesh,
  Vector3,
  VectorKeyframeTrack,
  type AnimationClip as AnimClip,
} from 'three'
import { MIXAMO_CORE, type MixamoCore, buildCoreBoneMap } from './avatarBoneCore'
import { buildMixamoSourcePack, findPrimarySkinnedMesh } from './avatarRetarget'
import type { HomeAvatarClipId } from './avatarAnimations'

const _qA = new Quaternion()
const _vA = new Vector3()

export type PoseSampleTime = number | 'start' | 'end'

/** 定格类动作：从 Mixamo 采样一帧，按局部旋转 delta 烘焙到目标 bind */
export const HUNYUAN_POSE_CLIP_IDS = ['picked-up', 'fall-land'] as const satisfies readonly HomeAvatarClipId[]

/** 多帧动作：逐帧局部 delta 烘焙（下落过程等） */
export const HUNYUAN_MOTION_CLIP_IDS = ['fall-air'] as const satisfies readonly HomeAvatarClipId[]

export type HunyuanPoseClipId = (typeof HUNYUAN_POSE_CLIP_IDS)[number]
export type HunyuanMotionClipId = (typeof HUNYUAN_MOTION_CLIP_IDS)[number]

const POSE_SAMPLE: Record<HunyuanPoseClipId, PoseSampleTime> = {
  'picked-up': 'end',
  'fall-land': 'end',
}

type BoneSample = {
  bindLocalQ: Quaternion
  bindLocalPos: Vector3
  poseLocalQ: Quaternion
  poseLocalPos: Vector3
}

function resolveSampleTime(clip: AnimationClip, when: PoseSampleTime): number {
  if (when === 'start') return 0
  if (when === 'end') return Math.max(0, clip.duration - 1e-4)
  return Math.max(0, Math.min(when, clip.duration))
}

/** targetLocal = targetBindLocal × inv(mixamoBindLocal) × mixamoPoseLocal */
function applyLocalRotDelta(
  mixamoBindLocal: Quaternion,
  mixamoPoseLocal: Quaternion,
  targetBindLocal: Quaternion,
  out: Quaternion,
): Quaternion {
  _qA.copy(mixamoBindLocal).invert().multiply(mixamoPoseLocal)
  return out.copy(targetBindLocal).multiply(_qA)
}

function sampleMixamoCoreBones(
  mixamoRoot: Object3D,
  clip: AnimationClip,
  sampleTime: number,
): Map<MixamoCore, BoneSample> | null {
  const clone = mixamoRoot.clone(true)
  const pack = buildMixamoSourcePack(clone)
  if (!pack) return null

  const coreMap = buildCoreBoneMap(pack.bones)
  pack.source.skeleton.pose()
  clone.updateMatrixWorld(true)

  const out = new Map<MixamoCore, BoneSample>()
  for (const [core, bone] of coreMap) {
    out.set(core, {
      bindLocalQ: bone.quaternion.clone(),
      bindLocalPos: bone.position.clone(),
      poseLocalQ: new Quaternion(),
      poseLocalPos: new Vector3(),
    })
  }

  const mixer = new AnimationMixer(clone)
  const action = mixer.clipAction(clip)
  action.play()
  mixer.setTime(sampleTime)
  clone.updateMatrixWorld(true)

  for (const [core, bone] of coreMap) {
    const row = out.get(core)
    if (!row) continue
    row.poseLocalQ.copy(bone.quaternion)
    row.poseLocalPos.copy(bone.position)
  }

  mixer.stopAllAction()
  mixer.uncacheRoot(clone)
  return out
}

function sampleTargetBind(
  skin: SkinnedMesh,
): Map<MixamoCore, { bone: Bone; bindLocalQ: Quaternion; bindLocalPos: Vector3 }> | null {
  skin.skeleton.pose()
  skin.updateMatrixWorld(true)

  const coreMap = buildCoreBoneMap(skin.skeleton.bones)
  const out = new Map<
    MixamoCore,
    { bone: Bone; bindLocalQ: Quaternion; bindLocalPos: Vector3 }
  >()

  for (const [core, bone] of coreMap) {
    out.set(core, {
      bone,
      bindLocalQ: bone.quaternion.clone(),
      bindLocalPos: bone.position.clone(),
    })
  }
  return out
}

type CoreMotionSample = {
  bindLocalQ: Quaternion
  bindLocalPos: Vector3
  frames: Array<{ poseLocalQ: Quaternion; poseLocalPos: Vector3 }>
}

function sampleMixamoCoreMotion(
  mixamoRoot: Object3D,
  clip: AnimationClip,
  sampleTimes: number[],
): Map<MixamoCore, CoreMotionSample> | null {
  if (!sampleTimes.length) return null

  const clone = mixamoRoot.clone(true)
  const pack = buildMixamoSourcePack(clone)
  if (!pack) return null

  const coreMap = buildCoreBoneMap(pack.bones)
  pack.source.skeleton.pose()
  clone.updateMatrixWorld(true)

  const out = new Map<MixamoCore, CoreMotionSample>()
  for (const [core, bone] of coreMap) {
    out.set(core, {
      bindLocalQ: bone.quaternion.clone(),
      bindLocalPos: bone.position.clone(),
      frames: sampleTimes.map(() => ({
        poseLocalQ: new Quaternion(),
        poseLocalPos: new Vector3(),
      })),
    })
  }

  const mixer = new AnimationMixer(clone)
  const action = mixer.clipAction(clip)
  action.play()

  for (let i = 0; i < sampleTimes.length; i++) {
    mixer.setTime(sampleTimes[i]!)
    clone.updateMatrixWorld(true)
    for (const [core, bone] of coreMap) {
      const row = out.get(core)
      if (!row) continue
      const frame = row.frames[i]!
      frame.poseLocalQ.copy(bone.quaternion)
      frame.poseLocalPos.copy(bone.position)
    }
  }

  mixer.stopAllAction()
  mixer.uncacheRoot(clone)
  return out
}

function buildSampleTimes(duration: number, fps = 30): number[] {
  const frameCount = Math.max(2, Math.ceil(duration * fps))
  const times: number[] = []
  for (let i = 0; i < frameCount; i++) {
    times.push(frameCount <= 1 ? 0 : (i / (frameCount - 1)) * duration)
  }
  return times
}

export function createHunyuanMotionClip(
  targetRoot: Object3D,
  mixamoAnimRoot: Object3D,
  sourceClip: AnimClip,
  clipName: string,
  fps = 30,
): { clip: AnimationClip; bindRoot: SkinnedMesh } | null {
  const skin = findPrimarySkinnedMesh(targetRoot)
  if (!skin?.skeleton?.bones?.length) return null

  const duration = Math.max(sourceClip.duration, 1 / fps)
  const sampleTimes = buildSampleTimes(duration, fps)
  const mixamoMotion = sampleMixamoCoreMotion(mixamoAnimRoot, sourceClip, sampleTimes)
  const targetBind = sampleTargetBind(skin)
  if (!mixamoMotion || !targetBind) return null

  const quatData = new Map<string, { times: number[]; values: number[] }>()
  const posData = new Map<string, { times: number[]; values: number[] }>()
  let mapped = 0

  for (const core of MIXAMO_CORE) {
    const src = mixamoMotion.get(core)
    const dst = targetBind.get(core)
    if (!src || !dst) continue

    const qTrack = { times: [] as number[], values: [] as number[] }
    quatData.set(dst.bone.name, qTrack)

    let pTrack: { times: number[]; values: number[] } | null = null
    if (core === 'Hips') {
      pTrack = { times: [], values: [] }
      posData.set(dst.bone.name, pTrack)
    }

    for (let i = 0; i < sampleTimes.length; i++) {
      const frame = src.frames[i]!
      const t = sampleTimes[i]!

      applyLocalRotDelta(src.bindLocalQ, frame.poseLocalQ, dst.bindLocalQ, _qA)
      qTrack.times.push(t)
      qTrack.values.push(_qA.x, _qA.y, _qA.z, _qA.w)

      if (pTrack) {
        _vA.copy(frame.poseLocalPos).sub(src.bindLocalPos).add(dst.bindLocalPos)
        pTrack.times.push(t)
        pTrack.values.push(_vA.x, _vA.y, _vA.z)
      }
    }

    mapped += 1
  }

  skin.skeleton.pose()
  skin.updateMatrixWorld(true)

  if (mapped < 8) return null

  const tracks: Array<QuaternionKeyframeTrack | VectorKeyframeTrack> = []
  for (const [boneName, data] of quatData) {
    tracks.push(new QuaternionKeyframeTrack(`.bones[${boneName}].quaternion`, data.times, data.values))
  }
  for (const [boneName, data] of posData) {
    tracks.push(new VectorKeyframeTrack(`.bones[${boneName}].position`, data.times, data.values))
  }

  if (import.meta.env?.DEV) {
    console.info('[homeBuild] 混元内置动作烘焙', {
      clip: clipName,
      mapped,
      frames: sampleTimes.length,
      duration: Number(duration.toFixed(3)),
      tracks: tracks.length,
    })
  }

  return {
    clip: new AnimationClip(`${clipName}-hunyuan-motion`, duration, tracks),
    bindRoot: skin,
  }
}

export function createHunyuanMotionClipById(
  targetRoot: Object3D,
  mixamoAnimRoot: Object3D,
  sourceClip: AnimClip,
  id: HunyuanMotionClipId,
): { clip: AnimationClip; bindRoot: SkinnedMesh } | null {
  return createHunyuanMotionClip(targetRoot, mixamoAnimRoot, sourceClip, id)
}

export function createHunyuanPoseClip(
  targetRoot: Object3D,
  mixamoAnimRoot: Object3D,
  sourceClip: AnimClip,
  when: PoseSampleTime,
  clipName: string,
  duration = 0.12,
): { clip: AnimationClip; bindRoot: SkinnedMesh } | null {
  const skin = findPrimarySkinnedMesh(targetRoot)
  if (!skin?.skeleton?.bones?.length) return null

  const t = resolveSampleTime(sourceClip, when)
  const mixamoSamples = sampleMixamoCoreBones(mixamoAnimRoot, sourceClip, t)
  const targetBind = sampleTargetBind(skin)
  if (!mixamoSamples || !targetBind) return null

  const tracks: Array<QuaternionKeyframeTrack | VectorKeyframeTrack> = []
  let mapped = 0
  let maxDeltaDeg = 0

  for (const core of MIXAMO_CORE) {
    const src = mixamoSamples.get(core)
    const dst = targetBind.get(core)
    if (!src || !dst) continue

    applyLocalRotDelta(src.bindLocalQ, src.poseLocalQ, dst.bindLocalQ, _qA)
    maxDeltaDeg = Math.max(maxDeltaDeg, dst.bindLocalQ.angleTo(_qA) * (180 / Math.PI))

    tracks.push(
      new QuaternionKeyframeTrack(
        `.bones[${dst.bone.name}].quaternion`,
        [0, duration],
        [_qA.x, _qA.y, _qA.z, _qA.w, _qA.x, _qA.y, _qA.z, _qA.w],
      ),
    )

    if (core === 'Hips') {
      _vA.copy(src.poseLocalPos).sub(src.bindLocalPos).add(dst.bindLocalPos)
      tracks.push(
        new VectorKeyframeTrack(
          `.bones[${dst.bone.name}].position`,
          [0, duration],
          [_vA.x, _vA.y, _vA.z, _vA.x, _vA.y, _vA.z],
        ),
      )
    }

    mapped += 1
  }

  skin.skeleton.pose()
  skin.updateMatrixWorld(true)

  if (mapped < 8) return null

  if (import.meta.env?.DEV) {
    console.info('[homeBuild] 混元内置姿势烘焙', {
      clip: clipName,
      mapped,
      sampleTime: Number(t.toFixed(4)),
      tracks: tracks.length,
      maxDeltaDeg: Number(maxDeltaDeg.toFixed(1)),
    })
  }

  return {
    clip: new AnimationClip(`${clipName}-hunyuan-pose`, duration, tracks),
    bindRoot: skin,
  }
}

export function createHunyuanPoseClipById(
  targetRoot: Object3D,
  mixamoAnimRoot: Object3D,
  sourceClip: AnimClip,
  id: HunyuanPoseClipId,
): { clip: AnimationClip; bindRoot: SkinnedMesh } | null {
  return createHunyuanPoseClip(
    targetRoot,
    mixamoAnimRoot,
    sourceClip,
    POSE_SAMPLE[id],
    id,
    id === 'picked-up' ? 0.12 : 0.2,
  )
}

export function isHunyuanPoseClipId(id: string): id is HunyuanPoseClipId {
  return (HUNYUAN_POSE_CLIP_IDS as readonly string[]).includes(id)
}

export function isHunyuanMotionClipId(id: string): id is HunyuanMotionClipId {
  return (HUNYUAN_MOTION_CLIP_IDS as readonly string[]).includes(id)
}
