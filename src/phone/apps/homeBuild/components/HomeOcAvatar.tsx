import { Suspense, useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'
import {
  hasAvatarClip,
  playAvatarClip,
  playAvatarStandingIdle,
  stopAvatarActions,
  tickAvatarMixer,
  usesProceduralOcAnim,
} from '../avatarRig'
import { clearPickedUpRootLean, resetBoneQuaternionsToIdentity } from '../avatarPickedUpClip'
import {
  applyHunyuanPoseIfChanged,
  clearHunyuanPose,
  type HunyuanPoseId,
} from '../avatarHunyuanPoseLib'
import { resetProceduralPose } from '../avatarProceduralPose'
import { enforceAvatarHouseScale, getAvatarFeetLift } from '../avatarMeshPrep'
import {
  advanceOcDrop,
  beginOcDrop,
  clearOcDrop,
  getOcDropState,
  isOcDropActive,
  OC_DROP_HEIGHT_M,
} from '../ocDropAnim'
import { getOcPickWorld, getOcPickingActive, OC_PICK_LIFT } from '../ocPickInput'
import { resolveOcPlacement } from '../ocPlacement'
import { floorBaseY } from '../scene3dUtils'
import { useHomeBuildStore } from '../store'
import { useAvatarRig } from '../useAvatarRig'

/** 摆放：混元 = 原生姿势库（按混元骨轴）；原生 Mixamo = FBX clip */
function HomeOcAvatarInner() {
  const characterId = useHomeBuildStore((s) => s.characterId)
  const rig = useAvatarRig(characterId, { staticMeshOnly: false })
  const groupRef = useRef<Group>(null)
  const draft = useHomeBuildStore((s) => s.draft)
  const ocPicking = useHomeBuildStore((s) => s.ocPicking)
  const wasPickingRef = useRef(false)
  const dropBootstrappedRef = useRef(false)
  const feetYRef = useRef(0)
  const hunyuanPoseRef = useRef<{ current: HunyuanPoseId | null }>({ current: null })

  const placement = useMemo(() => resolveOcPlacement(draft), [draft])

  useEffect(() => {
    const g = groupRef.current
    if (!g || !rig) return
    enforceAvatarHouseScale(rig.root)
    clearPickedUpRootLean(rig.root)
    resetProceduralPose(rig.root)
    clearHunyuanPose(rig.root)
    hunyuanPoseRef.current.current = null
    clearOcDrop()
    g.add(rig.root)
    feetYRef.current = getAvatarFeetLift(rig.root)
    if (rig.current === 'idle') rig.current = 'walk-slow'
    playAvatarClip(rig, 'idle', 0)
    rig.root.traverse((obj) => {
      obj.raycast = () => null
    })
    return () => {
      resetBoneQuaternionsToIdentity(rig.root)
      clearPickedUpRootLean(rig.root)
      clearHunyuanPose(rig.root)
      resetProceduralPose(rig.root)
      clearOcDrop()
      g.remove(rig.root)
    }
  }, [rig])

  useFrame((_, dt) => {
    const g = groupRef.current
    if (!g || !rig) return

    const floorY = floorBaseY(draft, draft.activeFloorId)
    const feet = feetYRef.current
    const onActiveFloor = placement?.floorId === draft.activeFloorId
    const picking = getOcPickingActive() || ocPicking
    const hunyuan = usesProceduralOcAnim(rig)

    if (isOcDropActive()) {
      wasPickingRef.current = false
      const drop = getOcDropState()
      if (!dropBootstrappedRef.current) {
        const endY = floorBaseY(draft, drop.floorId || draft.activeFloorId) + feet
        drop.endY = endY
        drop.startY = endY + OC_DROP_HEIGHT_M
        if (drop.y < drop.endY) drop.y = drop.startY
        dropBootstrappedRef.current = true
        clearPickedUpRootLean(rig.root)
      }

      const phase = advanceOcDrop(dt)
      g.visible = true
      g.position.set(drop.x, drop.y, drop.z)
      g.rotation.y = 0
      resetProceduralPose(rig.root)
      clearPickedUpRootLean(rig.root)

      if (hunyuan) {
        stopAvatarActions(rig)
        if (phase === 'air') {
          applyHunyuanPoseIfChanged(rig.root, 'fall-air', hunyuanPoseRef.current)
        } else if (phase === 'land') {
          applyHunyuanPoseIfChanged(rig.root, 'fall-land', hunyuanPoseRef.current)
        } else {
          clearHunyuanPose(rig.root)
          hunyuanPoseRef.current.current = null
          playAvatarStandingIdle(rig)
          dropBootstrappedRef.current = false
        }
      } else if (phase === 'air') {
        if (hasAvatarClip(rig, 'fall-air')) playAvatarClip(rig, 'fall-air', 0.12)
        else playAvatarClip(rig, 'idle', 0)
        tickAvatarMixer(rig, dt)
      } else if (phase === 'land') {
        if (hasAvatarClip(rig, 'fall-land')) playAvatarClip(rig, 'fall-land', 0.08)
        else playAvatarClip(rig, 'idle', 0.15)
        tickAvatarMixer(rig, dt)
      } else {
        playAvatarClip(rig, 'idle', 0)
        dropBootstrappedRef.current = false
      }
      return
    }
    dropBootstrappedRef.current = false

    if (picking) {
      const pick = getOcPickWorld()
      const lift = OC_PICK_LIFT
      if (pick.ready) {
        g.position.set(pick.x, Math.max(pick.y + feet, floorY + feet + lift), pick.z)
      } else if (placement) {
        g.position.set(placement.x, floorY + feet + lift, placement.z)
      } else {
        g.position.set(4.5, floorY + feet + lift, 3.5)
      }
      g.rotation.y = 0
      g.visible = true

      resetProceduralPose(rig.root)
      clearPickedUpRootLean(rig.root)
      if (hunyuan) {
        stopAvatarActions(rig)
        applyHunyuanPoseIfChanged(rig.root, 'picked-up', hunyuanPoseRef.current)
      } else if (hasAvatarClip(rig, 'picked-up')) {
        playAvatarClip(rig, 'picked-up', 0.12)
        tickAvatarMixer(rig, dt)
      } else {
        playAvatarClip(rig, 'idle', 0)
      }
      wasPickingRef.current = true
      return
    }

    if (wasPickingRef.current) {
      clearPickedUpRootLean(rig.root)
      clearHunyuanPose(rig.root)
      hunyuanPoseRef.current.current = null
      resetProceduralPose(rig.root)
    }

    if (wasPickingRef.current && placement && onActiveFloor && !isOcDropActive()) {
      beginOcDrop({
        x: placement.x,
        z: placement.z,
        floorId: placement.floorId,
        feetY: feet,
        floorBaseY: floorY,
        dropHeight: OC_DROP_HEIGHT_M,
      })
      wasPickingRef.current = false
      return
    }
    wasPickingRef.current = false

    if (!placement || !onActiveFloor) {
      g.visible = false
      return
    }

    g.visible = true
    g.position.set(placement.x, floorY + feet, placement.z)
    g.rotation.y = placement.rotationY ?? 0
    clearPickedUpRootLean(rig.root)
    if (hunyuanPoseRef.current.current) {
      clearHunyuanPose(rig.root)
      hunyuanPoseRef.current.current = null
    }
    resetProceduralPose(rig.root)
    playAvatarClip(rig, 'idle', 0.2)
    if (!hunyuan) tickAvatarMixer(rig, dt)
  })

  return <group ref={groupRef} />
}

export function HomeOcAvatar() {
  return (
    <Suspense fallback={null}>
      <HomeOcAvatarInner />
    </Suspense>
  )
}
