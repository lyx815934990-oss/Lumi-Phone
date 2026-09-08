import { Suspense, useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'
import { hasAvatarClip, playAvatarClip, tickAvatarMixer } from '../avatarRig'
import { avatarFeetOffsetY, enforceAvatarHouseScale } from '../avatarMeshPrep'
import { floorBaseY } from '../scene3dUtils'
import { useHomeBuildStore } from '../store'
import { useAvatarRig } from '../useAvatarRig'
import { getWalkAvatar3dEnabled, getWalkInput } from '../walkInput'

/** 漫游：OC 停在摆放落点；玩家移动时播慢走骨骼动画 */
function HomeAvatar3DInner() {
  const characterId = useHomeBuildStore((s) => s.characterId)
  const draft = useHomeBuildStore((s) => s.draft)
  const placement = draft.ocPlacement
  const rig = useAvatarRig(characterId, { staticMeshOnly: false })
  const groupRef = useRef<Group>(null)
  const feetYRef = useRef(0)

  const floorY = useMemo(() => {
    if (!placement) return 0
    return floorBaseY(draft, placement.floorId)
  }, [draft, placement])

  useEffect(() => {
    const g = groupRef.current
    if (!g || !rig) return
    enforceAvatarHouseScale(rig.root)
    g.add(rig.root)
    feetYRef.current = avatarFeetOffsetY(rig.root)
    return () => {
      g.remove(rig.root)
    }
  }, [rig])

  useFrame((_, dt) => {
    const g = groupRef.current
    if (!g || !rig) return

    if (!placement || !getWalkAvatar3dEnabled()) {
      g.visible = false
      return
    }

    const feet = feetYRef.current
    g.visible = true
    g.position.set(placement.x, floorY + feet, placement.z)
    g.rotation.y = placement.rotationY ?? 0

    // 原模 / 无可用轨：站定即可
    if (rig.needsProceduralPose) {
      playAvatarClip(rig, 'idle', 0)
      return
    }

    const input = getWalkInput()
    const moving = Math.hypot(input.moveX, input.moveZ) > 0.08

    if (moving && hasAvatarClip(rig, 'walk-slow')) {
      playAvatarClip(rig, 'walk-slow', 0.2)
      tickAvatarMixer(rig, dt)
    } else {
      playAvatarClip(rig, 'idle', 0.25)
      tickAvatarMixer(rig, dt)
    }
  })

  return <group ref={groupRef} />
}

export function HomeAvatar3D() {
  return (
    <Suspense fallback={null}>
      <HomeAvatar3DInner />
    </Suspense>
  )
}
