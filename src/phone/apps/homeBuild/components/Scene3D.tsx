import { useEffect, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { resetWalkInput } from '../walkInput'
import { useHomeBuildStore } from '../store'
import type { HomeBuildMode } from '../types'
import { CameraRig } from './CameraRig'
import { FirstPersonCamera } from './FirstPersonCamera'
import { FurnitureThumbBaker } from './FurnitureThumbBaker'
import { HomeBuildScene } from './HomeBuildScene'
import { WalkModeOverlay } from './WalkModeOverlay'
import { WalkPaperDoll } from './WalkPaperDoll'
import { HomeAvatar3D } from './HomeAvatar3D'
import { HomeOcAvatar } from './HomeOcAvatar'
import { OcPickLayer } from './OcPickLayer'
import { OcPickOverlay } from './OcPickOverlay'
import { OutdoorEnvironmentPanel } from './OutdoorEnvironmentPanel'
import { FurnitureCatalogPanel } from './FurnitureCatalogPanel'
import { FurniturePropPanel } from './FurniturePropPanel'
import { GhostHistoryButtons } from './GhostHistoryButtons'

type Props = {
  mode: Exclude<HomeBuildMode, 'floorplan' | 'avatar'>
  className?: string
}

function resolveCanvasDpr(): [number, number] {
  if (typeof window === 'undefined') return [1, 1.5]
  const coarse = window.matchMedia('(pointer: coarse)').matches
  const dpr = window.devicePixelRatio || 1
  if (coarse) return [1, Math.min(1.5, dpr)]
  return [1, Math.min(2, dpr)]
}

function SceneContent({ mode }: { mode: Props['mode'] }) {
  const draft = useHomeBuildStore((s) => s.draft)
  return (
    <>
      <HomeBuildScene draft={draft} mode={mode} />
      <FurnitureThumbBaker />
      {mode === 'walk' ? (
        <>
          <FirstPersonCamera draft={draft} />
          <WalkPaperDoll />
          <HomeAvatar3D />
        </>
      ) : (
        <>
          <CameraRig mode={mode} draft={draft} />
          {mode === 'ghost' ? (
            <>
              <HomeOcAvatar />
              <OcPickLayer />
            </>
          ) : null}
        </>
      )}
    </>
  )
}

export function Scene3D({ mode, className = '' }: Props) {
  const dpr = useMemo(() => resolveCanvasDpr(), [])

  useEffect(() => {
    if (mode !== 'walk') resetWalkInput()
  }, [mode])

  const hint =
    mode === 'walk'
      ? '左手移动 · 右手转视角 · OC 在摆放落点（移动时慢走）'
      : mode === 'ghost'
        ? '点「放置 OC」拖到高亮格松手 · 或开家具目录'
        : '俯视角预览'

  return (
    <div className={`hb-scene3d relative min-h-0 flex-1 ${className}`}>
      <Canvas
        dpr={dpr}
        camera={{ fov: 75, near: 0.1, far: 120 }}
        style={{ width: '100%', height: '100%' }}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
        }}
      >
        <SceneContent mode={mode} />
      </Canvas>

      {mode === 'walk' ? <WalkModeOverlay /> : null}
      {mode === 'ghost' ? (
        <>
          <GhostHistoryButtons />
          <FurnitureCatalogPanel />
          <FurniturePropPanel />
          <OcPickOverlay />
        </>
      ) : null}

      <OutdoorEnvironmentPanel />

      {hint ? (
        <p className="pointer-events-none absolute inset-x-0 bottom-[max(10px,env(safe-area-inset-bottom))] text-center text-[11px] text-white/45">
          {hint}
        </p>
      ) : null}
    </div>
  )
}
