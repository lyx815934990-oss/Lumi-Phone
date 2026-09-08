import * as THREE from 'three'
import {
  HOME_AVATAR_BASE_MESH,
  HOME_AVATAR_WALK_CLIPS,
  homeAvatarClipUrl,
  type HomeAvatarClipId,
} from './avatarAnimations'
import {
  analyzeAvatarMeshRig,
  usesBuiltinSkeletonForAnim,
  type AvatarMeshRigKind,
} from './avatarMeshAnalyze'
import {
  isUsefulAvatarClip,
  isUsefulPickedUpClip,
} from './avatarPickedUpClip'
import {
  createHunyuanPoseClipById,
  isHunyuanMotionClipId,
  isHunyuanPoseClipId,
} from './avatarPoseLibrary'
import { prepareCustomAvatarMesh, groundAvatarRoot, restoreAvatarBaseRotation, forceUprightByMeshAabb } from './avatarMeshPrep'
import { loadOcModelGroup, pickEmbeddedClip } from './loadOcModel'
import { firstAnimationClip, loadAvatarFbx } from './loadAvatarFbx'
import { getOcModelBlobUrl, getOcModelMeta } from './ocModelStore'
import { findPrimarySkinnedMesh, retargetMixamoClipToTarget } from './avatarRetarget'
import { clone as cloneSkinnedHierarchy } from 'three/examples/jsm/utils/SkeletonUtils.js'

export const AVATAR_SCALE = 0.012

/** 场景中实际播放动作的来源 */
export type AvatarRigSource = 'builtin' | 'custom-mixamo' | 'auto-rigged' | 'static'

export type AvatarRig = {
  root: THREE.Group
  /** 动画 Mixer 挂在主 SkinnedMesh 上，轨 `.bones[…]` 才能生效 */
  animRoot: THREE.SkinnedMesh | null
  mixer: THREE.AnimationMixer
  actions: Partial<Record<HomeAvatarClipId | 'idle', THREE.AnimationAction>>
  current: HomeAvatarClipId | 'idle'
  /** 动作由谁驱动 */
  rigSource: AvatarRigSource
  /** 上传模型的骨骼检测结果（若有） */
  customRigKind: AvatarMeshRigKind | null
  clipReady: Partial<Record<HomeAvatarClipId | 'idle', boolean>>
  /** 无 Mixamo clip 时的程序姿态（仅 custom 且无 fallback 时） */
  needsProceduralPose: boolean
}

export function prepareBaseMesh(group: THREE.Group): THREE.Group {
  const root = new THREE.Group()
  const model = cloneSkinnedHierarchy(group) as THREE.Group
  model.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.castShadow = false
      obj.receiveShadow = false
      obj.frustumCulled = false
    }
  })
  model.scale.setScalar(AVATAR_SCALE)
  root.add(model)
  groundAvatarRoot(root)
  return root
}

const CLIPS_TO_LOAD: HomeAvatarClipId[] = [
  ...HOME_AVATAR_WALK_CLIPS,
  'picked-up',
  'fall-air',
  'fall-land',
]

export type CreateAvatarRigOptions = {
  characterId?: string
  /** 摆放：可跳过部分动作准备（仍加载同一份模型） */
  staticMeshOnly?: boolean
}

function bindClip(
  mixer: THREE.AnimationMixer,
  clip: THREE.AnimationClip,
  loopOnce: boolean,
): THREE.AnimationAction {
  const action = mixer.clipAction(clip)
  action.setLoop(loopOnce ? THREE.LoopOnce : THREE.LoopRepeat, loopOnce ? 1 : Infinity)
  if (loopOnce) action.clampWhenFinished = true
  return action
}

async function loadBuiltinRoot(): Promise<THREE.Group> {
  const baseGroup = await loadAvatarFbx(HOME_AVATAR_BASE_MESH)
  return prepareBaseMesh(baseGroup)
}

type MeshLoadResult = {
  root: THREE.Group
  rigSource: AvatarRigSource
  customRigKind: AvatarMeshRigKind | null
  embeddedClips: THREE.AnimationClip[]
}

async function loadMeshForCharacter(
  characterId: string,
  _staticMeshOnly = false,
): Promise<MeshLoadResult> {
  const cid = characterId.trim()

  // 无角色时用内置人型；'default' 也可绑用户导入的模型
  if (!cid) {
    return {
      root: await loadBuiltinRoot(),
      rigSource: 'builtin',
      customRigKind: null,
      embeddedClips: [],
    }
  }

  const meta = await getOcModelMeta(cid)
  const blobUrl = meta ? await getOcModelBlobUrl(cid) : null

  if (meta && blobUrl) {
    const loaded = await loadOcModelGroup(blobUrl, meta.format)
    const rigKind = meta.rigKind ?? analyzeAvatarMeshRig(loaded.group)
    const prepared = prepareCustomAvatarMesh(loaded.group, meta.scale, loaded.clips)

    // Mixamo / 已有蒙皮：直接用用户模型播动作
    if (!usesBuiltinSkeletonForAnim(rigKind)) {
      return {
        root: prepared.root,
        rigSource: 'custom-mixamo',
        customRigKind: rigKind,
        embeddedClips: prepared.embeddedClips,
      }
    }

    // 纯网格：原模展示（不再做手动关节自动绑骨）
    return {
      root: prepared.root,
      rigSource: 'static',
      customRigKind: rigKind,
      embeddedClips: prepared.embeddedClips,
    }
  }

  return {
    root: await loadBuiltinRoot(),
    rigSource: 'builtin',
    customRigKind: null,
    embeddedClips: [],
  }
}

async function loadMixamoClips(
  mixer: THREE.AnimationMixer,
  root: THREE.Group,
  _preferGeneratedPickedUp: boolean,
): Promise<{ actions: AvatarRig['actions']; clipReady: AvatarRig['clipReady'] }> {
  const actions: AvatarRig['actions'] = {}
  const clipReady: AvatarRig['clipReady'] = {}

  if (!hasMixamoBoneTree(root) && !hasSkinnedMesh(root)) {
    return { actions, clipReady }
  }

  const isNativeMixamo = hasMixamoBoneTree(root)
  const useRuntimeRetarget = !isNativeMixamo && hasSkinnedMesh(root)

  await Promise.all(
    CLIPS_TO_LOAD.map(async (id) => {
      try {
        const animGroup = await loadAvatarFbx(homeAvatarClipUrl(id))
        const clip = firstAnimationClip(animGroup)
        if (!clip) return

        if (id === 'picked-up' && !isUsefulPickedUpClip(clip)) return
        if (id !== 'picked-up' && !isUsefulAvatarClip(clip)) return

        const once = id === 'picked-up' || id === 'turn-left' || id === 'fall-land'

        if (isNativeMixamo) {
          actions[id] = bindClip(mixer, clip, once)
          clipReady[id] = true
          return
        }

        if (!useRuntimeRetarget) return

        // 混元摆放动作走内置姿势库（HomeOcAvatar）；禁止 retarget/烘焙这些 clip
        if (isHunyuanPoseClipId(id) || isHunyuanMotionClipId(id)) return

        // walk 等仍可尝试 retarget；失败则跳过
        const retargeted = retargetMixamoClipToTarget(root, animGroup, clip)
        if (!retargeted) return
        actions[id] = bindClip(mixer, retargeted.clip, once)
        clipReady[id] = true
      } catch {
        /* 缺动画文件或重定向失败 */
      }
    }),
  )

  // 原生 Mixamo 且 FBX 缺失：同样走内置姿势烘焙
  if (isNativeMixamo && !clipReady['picked-up']) {
    const animGroup = await loadAvatarFbx(homeAvatarClipUrl('picked-up')).catch(() => null)
    const clip = animGroup ? firstAnimationClip(animGroup) : null
    if (animGroup && clip) {
      const generated = createHunyuanPoseClipById(root, animGroup, clip, 'picked-up')
      if (generated) {
        actions['picked-up'] = bindClip(mixer, generated.clip, true)
        clipReady['picked-up'] = true
      }
    }
  }

  return { actions, clipReady }
}

export async function createAvatarRig(options: CreateAvatarRigOptions = {}): Promise<AvatarRig> {
  const staticMeshOnly = Boolean(options.staticMeshOnly)
  const { root, rigSource, customRigKind, embeddedClips } = await loadMeshForCharacter(
    options.characterId ?? '',
    staticMeshOnly,
  )
  const animRoot = findPrimarySkinnedMesh(root)
  const mixer = new THREE.AnimationMixer(animRoot ?? root)

  const { actions, clipReady } = await loadMixamoClips(
    mixer,
    root,
    rigSource === 'auto-rigged',
  )

  const tryEmbedded = (id: 'picked-up' | 'sleep', prefer: 'picked-up' | 'sleep') => {
    if (clipReady[id]) return
    const embedded = pickEmbeddedClip(embeddedClips, prefer)
    if (!embedded) return
    actions[id] = bindClip(mixer, embedded, false)
    clipReady[id] = true
  }

  if (rigSource === 'custom-mixamo') {
    tryEmbedded('picked-up', 'picked-up')
    // 不套用 sleep 内嵌轨，避免落地平躺
  }

  const needsProceduralPose =
    rigSource === 'static' || (!hasMixamoBoneTree(root) && !hasSkinnedMesh(root))

  const rig: AvatarRig = {
    root,
    animRoot,
    mixer,
    actions,
    current: 'idle',
    rigSource,
    customRigKind,
    clipReady,
    needsProceduralPose,
  }
  // 必须立刻进入站立定格：若只标 current=idle，首帧 playAvatarClip 会 early-return，绑定姿会一直躺着
  playAvatarStandingIdle(rig)
  return rig
}

function hasSkinnedMesh(root: THREE.Group): boolean {
  let found = false
  root.traverse((obj) => {
    if (obj instanceof THREE.SkinnedMesh) found = true
  })
  return found
}

function hasMixamoBoneTree(root: THREE.Group): boolean {
  let found = false
  root.traverse((obj) => {
    if (found) return
    if (obj instanceof THREE.Bone && /mixamorig/i.test(obj.name)) found = true
  })
  return found
}

export function hasAvatarClip(rig: AvatarRig, id: HomeAvatarClipId): boolean {
  return Boolean(rig.clipReady[id] && rig.actions[id])
}

/** 停掉动作影响，恢复蒙皮绑定姿态（站立 T/A 姿），避免着地末帧平躺残留 */
export function resetAvatarToBindPose(root: THREE.Object3D): void {
  const seen = new Set<THREE.Skeleton>()
  root.traverse((obj) => {
    if (!(obj instanceof THREE.SkinnedMesh) || !obj.skeleton) return
    if (seen.has(obj.skeleton)) return
    seen.add(obj.skeleton)
    obj.skeleton.pose()
    obj.skeleton.update()
  })
  root.updateMatrixWorld(true)
}

export function stopAvatarActions(rig: AvatarRig): void {
  for (const action of Object.values(rig.actions)) {
    if (!action) continue
    action.stop()
    action.setEffectiveWeight(0)
  }
}

/** 混元等非 Mixamo 骨：摆放交互不播 Mixamo 烘焙 clip，改程序骨骼姿 */
export function usesProceduralOcAnim(rig: AvatarRig): boolean {
  if (rig.rigSource === 'static' || rig.needsProceduralPose) return true
  let mixamo = false
  rig.root.traverse((obj) => {
    if (mixamo) return
    if (obj instanceof THREE.Bone && /mixamorig/i.test(obj.name)) mixamo = true
  })
  return !mixamo
}

/**
 * 静止：绑定姿 + 扶正角（导出供摆放模式程序姿态使用）
 */
export function playAvatarStandingIdle(rig: AvatarRig): void {
  for (const action of Object.values(rig.actions)) {
    if (!action) continue
    action.stop()
    action.reset()
    action.setEffectiveWeight(0)
  }
  resetAvatarToBindPose(rig.root)
  restoreAvatarBaseRotation(rig.root)
  forceUprightByMeshAabb(rig.root)
  rig.root.position.x = 0
  rig.root.position.z = 0
  rig.root.position.y = 0
}

export function playAvatarClip(
  rig: AvatarRig,
  next: HomeAvatarClipId | 'idle',
  fade = 0.2,
): void {
  if (rig.current === next) return

  for (const [id, action] of Object.entries(rig.actions)) {
    if (id === next || !action) continue
    action.fadeOut(Math.min(fade, 0.1))
  }

  if (next === 'idle') {
    playAvatarStandingIdle(rig)
    rig.current = 'idle'
    return
  }

  const action = rig.actions[next]
  if (!action) {
    playAvatarStandingIdle(rig)
    rig.current = 'idle'
    return
  }

  const clip = action.getClip()
  action.reset().setEffectiveWeight(1).play()
  action.paused = false

  if ((next === 'picked-up' || next === 'fall-land') && clip.duration <= 0.25) {
    action.time = Math.max(0, clip.duration - 1e-4)
    action.clampWhenFinished = true
  } else {
    action.time = 0
  }

  rig.current = next
}

/** 推进 Mixer 并刷新蒙皮矩阵 */
export function tickAvatarMixer(rig: AvatarRig, dt: number): void {
  if (!Object.keys(rig.actions).length) return
  rig.mixer.update(dt)
  const seen = new Set<THREE.Skeleton>()
  rig.root.traverse((obj) => {
    if (!(obj instanceof THREE.SkinnedMesh) || !obj.skeleton) return
    if (seen.has(obj.skeleton)) return
    seen.add(obj.skeleton)
    obj.skeleton.update()
  })
}
