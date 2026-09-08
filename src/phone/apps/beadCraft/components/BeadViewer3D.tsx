import { useLayoutEffect, useMemo, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import type { InstancedMesh } from 'three'
import { Matrix4 } from 'three'

import { BEAD_EMPTY } from '../types'

type Props = {
  width: number
  height: number
  palette: string[]
  cells: number[]
  className?: string
}

type BeadLayer = {
  color: string
  positions: { x: number; z: number }[]
}

function groupBeadsByColor(
  width: number,
  height: number,
  palette: string[],
  cells: number[],
): BeadLayer[] {
  const buckets = new Map<string, { x: number; z: number }[]>()
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x
      const colorIndex = cells[idx]
      if (colorIndex === undefined || colorIndex === BEAD_EMPTY) continue
      const color = palette[colorIndex] ?? '#ff6b6b'
      const list = buckets.get(color) ?? []
      list.push({ x: x - width / 2 + 0.5, z: y - height / 2 + 0.5 })
      buckets.set(color, list)
    }
  }
  return [...buckets.entries()].map(([color, positions]) => ({ color, positions }))
}

/** 同色豆子一批渲染：纯色材质，避免 instanceColor 在部分设备上全黑 */
function BeadColorLayer({ color, positions }: BeadLayer) {
  const meshRef = useRef<InstancedMesh>(null)
  const matrix = useMemo(() => new Matrix4(), [])

  useLayoutEffect(() => {
    const mesh = meshRef.current
    if (!mesh) return
    positions.forEach((bead, i) => {
      matrix.makeTranslation(bead.x, 0.15, bead.z)
      mesh.setMatrixAt(i, matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
  }, [matrix, positions])

  if (!positions.length) return null

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, positions.length]} frustumCulled={false}>
      <boxGeometry args={[0.82, 0.3, 0.82]} />
      <meshLambertMaterial color={color} />
    </instancedMesh>
  )
}

function Scene(props: Omit<Props, 'className'>) {
  const span = Math.max(props.width, props.height)
  const layers = useMemo(
    () => groupBeadsByColor(props.width, props.height, props.palette, props.cells),
    [props.cells, props.height, props.palette, props.width],
  )

  return (
    <>
      <ambientLight intensity={0.92} />
      <directionalLight position={[3, 6, 4]} intensity={0.55} />
      <directionalLight position={[-2, 3, -2]} intensity={0.22} />
      {layers.map((layer) => (
        <BeadColorLayer key={layer.color} color={layer.color} positions={layer.positions} />
      ))}
      <OrbitControls
        enablePan={false}
        enableZoom
        minDistance={span * 0.65}
        maxDistance={span * 2.2}
        makeDefault
      />
    </>
  )
}

function resolveCanvasDpr(): [number, number] {
  if (typeof window === 'undefined') return [1, 1.5]
  const coarse = window.matchMedia('(pointer: coarse)').matches
  const dpr = window.devicePixelRatio || 1
  if (coarse) return [1, Math.min(1.5, dpr)]
  return [1, Math.min(2, dpr)]
}

export function BeadViewer3D({ className = '', ...props }: Props) {
  const span = Math.max(props.width, props.height)
  const dpr = useMemo(() => resolveCanvasDpr(), [])

  return (
    <div className={`bc-viewer-3d relative overflow-hidden rounded-2xl ${className}`}>
      <Canvas
        dpr={dpr}
        camera={{ position: [0, span * 0.82, span * 1.28], fov: 42 }}
        style={{ width: '100%', height: '100%' }}
        gl={{
          antialias: false,
          alpha: true,
          powerPreference: 'high-performance',
          stencil: false,
          depth: true,
        }}
      >
        <Scene {...props} />
      </Canvas>
      <p className="pointer-events-none absolute inset-x-0 bottom-3 text-center text-[11px] text-[#9a8f8a]">
        拖动旋转 · 双指缩放
      </p>
    </div>
  )
}
