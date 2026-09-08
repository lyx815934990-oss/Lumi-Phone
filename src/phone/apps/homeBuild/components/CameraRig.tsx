import { useEffect, useRef } from 'react'
import { OrbitControls } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { lerpPose } from '../cameraTransition'
import { cameraPoseForDraft, orbitDistanceLimits } from '../scene3dUtils'
import { useHomeBuildStore } from '../store'
import type { HomeBuildDraft, HomeBuildMode } from '../types'

type Props = {
  mode: HomeBuildMode
  draft: HomeBuildDraft
  enablePan?: boolean
}

export function CameraRig({ mode, draft, enablePan = true }: Props) {
  const controlsRef = useRef<OrbitControlsImpl>(null)
  const { camera } = useThree()
  const fromPose = useRef(cameraPoseForDraft(draft, mode))
  const animRef = useRef(1)
  const gizmoDragging = useHomeBuildStore((s) => s.gizmoDragging)
  const ocPicking = useHomeBuildStore((s) => s.ocPicking)
  const controlsLocked = gizmoDragging || ocPicking

  const limits = orbitDistanceLimits(draft)
  const targetPose = cameraPoseForDraft(draft, mode)

  useEffect(() => {
    const controls = controlsRef.current
    fromPose.current = {
      position: [camera.position.x, camera.position.y, camera.position.z],
      target: controls
        ? [controls.target.x, controls.target.y, controls.target.z]
        : [...targetPose.target],
    }
    animRef.current = 0
  }, [mode, draft.activeFloorId, draft.updatedAt])

  useFrame((_, dt) => {
    if (animRef.current >= 1) return
    animRef.current = Math.min(1, animRef.current + dt * 2.2)
    const next = lerpPose(fromPose.current, targetPose, animRef.current)
    camera.position.set(...next.position)
    controlsRef.current?.target.set(...next.target)
    controlsRef.current?.update()
    if (animRef.current >= 1) fromPose.current = next
  })

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enabled={!controlsLocked}
      enablePan={enablePan && !controlsLocked}
      enableZoom={!controlsLocked}
      enableRotate={!controlsLocked}
      minDistance={limits.min}
      maxDistance={limits.max}
      maxPolarAngle={Math.PI * 0.49}
      minPolarAngle={0.15}
    />
  )
}
