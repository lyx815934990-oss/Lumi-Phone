import { useMemo, type ReactNode } from 'react'
import type { OutdoorScenery } from '../types'

/** 与 Grid / 户型中心对齐 */
const SCENERY_CENTER: [number, number, number] = [4, 0, 3]
const SCENERY_DISTANCE = 20

function seeded(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}

function FourSideScenery({ render }: { render: (sideIndex: number) => ReactNode }) {
  const sides: Array<{ position: [number, number, number]; rotationY: number }> = [
    { position: [SCENERY_CENTER[0], 0, SCENERY_CENTER[2] - SCENERY_DISTANCE], rotationY: 0 },
    { position: [SCENERY_CENTER[0], 0, SCENERY_CENTER[2] + SCENERY_DISTANCE], rotationY: Math.PI },
    { position: [SCENERY_CENTER[0] + SCENERY_DISTANCE, 0, SCENERY_CENTER[2]], rotationY: -Math.PI / 2 },
    { position: [SCENERY_CENTER[0] - SCENERY_DISTANCE, 0, SCENERY_CENTER[2]], rotationY: Math.PI / 2 },
  ]

  return (
    <>
      {sides.map((side, i) => (
        <group key={i} position={side.position} rotation={[0, side.rotationY, 0]}>
          {render(i)}
        </group>
      ))}
    </>
  )
}

function SideGround({ color, width = 44, depth = 10 }: { color: string; width?: number; depth?: number }) {
  return (
    <mesh position={[0, -0.35, -depth / 2 + 1]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[width, depth]} />
      <meshStandardMaterial color={color} roughness={1} />
    </mesh>
  )
}

function CityScenery({ sideIndex }: { sideIndex: number }) {
  const seed = sideIndex * 100
  const buildings = useMemo(() => {
    return Array.from({ length: 18 }, (_, i) => ({
      x: (i - 9) * 2.4 + (seeded(i + seed) - 0.5) * 1.2,
      h: 3 + seeded(i + seed + 7) * 14,
      w: 1.2 + seeded(i + seed + 13) * 1.8,
      d: 1 + seeded(i + seed + 19) * 0.8,
      tone: seeded(i + seed + 3) > 0.5 ? '#4a5568' : '#3d4858',
    }))
  }, [seed])

  return (
    <group>
      <SideGround color="#3a4048" />
      {buildings.map((b, i) => (
        <mesh key={i} position={[b.x, b.h / 2, -1]}>
          <boxGeometry args={[b.w, b.h, b.d]} />
          <meshStandardMaterial color={b.tone} roughness={0.92} />
        </mesh>
      ))}
      {buildings.slice(0, 12).map((b, i) => (
        <mesh key={`win-${i}`} position={[b.x, b.h * 0.35 + (i % 4) * 1.8, -1 + b.d / 2 + 0.02]}>
          <planeGeometry args={[b.w * 0.55, 0.35]} />
          <meshBasicMaterial color="#ffe8a0" transparent opacity={0.35 + seeded(i + seed) * 0.35} />
        </mesh>
      ))}
    </group>
  )
}

function MountainScenery({ sideIndex }: { sideIndex: number }) {
  const seed = sideIndex * 100
  const peaks = useMemo(() => {
    return Array.from({ length: 8 }, (_, i) => ({
      x: (i - 4) * 5,
      h: 6 + seeded(i + seed + 2) * 10,
      w: 5 + seeded(i + seed + 5) * 4,
      tone: seeded(i + seed) > 0.4 ? '#4a6a58' : '#3a5a48',
    }))
  }, [seed])

  return (
    <group>
      <SideGround color="#5a7a50" />
      {peaks.map((p, i) => (
        <mesh key={i} position={[p.x, p.h / 2 - 1, -3]}>
          <coneGeometry args={[p.w / 2, p.h, 4]} />
          <meshStandardMaterial color={p.tone} roughness={0.96} flatShading />
        </mesh>
      ))}
    </group>
  )
}

function SuburbScenery({ sideIndex }: { sideIndex: number }) {
  const seed = sideIndex * 100
  const houses = useMemo(() => {
    return Array.from({ length: 8 }, (_, i) => ({
      x: (i - 4) * 4,
      h: 1.8 + seeded(i + seed) * 1.2,
      w: 2 + seeded(i + seed + 4) * 0.8,
      tone: seeded(i + seed + 8) > 0.5 ? '#8a7868' : '#9a8878',
    }))
  }, [seed])

  const trees = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => ({
      x: (i - 6) * 2.6 + (seeded(i + seed + 20) - 0.5),
      z: -1.5 - seeded(i + seed + 30) * 2,
      s: 0.7 + seeded(i + seed + 40) * 0.8,
    }))
  }, [seed])

  return (
    <group>
      <SideGround color="#6a8a58" />
      {houses.map((h, i) => (
        <group key={i} position={[h.x, 0, -1]}>
          <mesh position={[0, h.h / 2, 0]}>
            <boxGeometry args={[h.w, h.h, 1.4]} />
            <meshStandardMaterial color={h.tone} roughness={0.9} />
          </mesh>
          <mesh position={[0, h.h + 0.55, 0]} rotation={[0, Math.PI / 4, 0]}>
            <coneGeometry args={[h.w * 0.72, 1.1, 4]} />
            <meshStandardMaterial color="#6a5048" roughness={0.95} flatShading />
          </mesh>
        </group>
      ))}
      {trees.map((t, i) => (
        <group key={`t-${i}`} position={[t.x, 0, t.z]}>
          <mesh position={[0, 0.5 * t.s, 0]}>
            <cylinderGeometry args={[0.12 * t.s, 0.16 * t.s, 1 * t.s, 6]} />
            <meshStandardMaterial color="#5a4030" roughness={1} />
          </mesh>
          <mesh position={[0, 1.35 * t.s, 0]}>
            <sphereGeometry args={[0.65 * t.s, 8, 8]} />
            <meshStandardMaterial color="#4a8a50" roughness={0.95} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

function CoastScenery({ sideIndex }: { sideIndex: number }) {
  const seed = sideIndex * 100
  const islets = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => ({
      x: (i - 3) * 5.5,
      h: 3 + seeded(i + seed + 2) * 5,
      w: 2.5 + seeded(i + seed + 4) * 2,
    }))
  }, [seed])

  return (
    <group>
      <mesh position={[0, -0.2, 2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[46, 14]} />
        <meshStandardMaterial color="#3a7aa8" roughness={0.35} metalness={0.08} />
      </mesh>
      {islets.map((p, i) => (
        <mesh key={i} position={[p.x, p.h / 2, -2]}>
          <coneGeometry args={[p.w, p.h, 5]} />
          <meshStandardMaterial color="#5a8a70" roughness={0.96} flatShading />
        </mesh>
      ))}
    </group>
  )
}

function ForestScenery({ sideIndex }: { sideIndex: number }) {
  const seed = sideIndex * 100
  const trees = useMemo(() => {
    return Array.from({ length: 20 }, (_, i) => ({
      x: (i - 10) * 2.2 + (seeded(i + seed + 1) - 0.5) * 1.4,
      z: -1.2 - seeded(i + seed + 2) * 4.5,
      s: 0.75 + seeded(i + seed + 3) * 1.4,
      foliage: seeded(i + seed + 4) > 0.45 ? '#2a6a38' : '#3a7a48',
      trunk: seeded(i + seed + 5) > 0.5 ? '#4a3020' : '#5a4030',
    }))
  }, [seed])

  return (
    <group>
      <SideGround color="#3a5a38" />
      {trees.map((t, i) => (
        <group key={i} position={[t.x, 0, t.z]}>
          <mesh position={[0, 0.55 * t.s, 0]}>
            <cylinderGeometry args={[0.14 * t.s, 0.2 * t.s, 1.1 * t.s, 6]} />
            <meshStandardMaterial color={t.trunk} roughness={1} />
          </mesh>
          <mesh position={[0, 1.5 * t.s, 0]}>
            <coneGeometry args={[0.85 * t.s, 2.2 * t.s, 7]} />
            <meshStandardMaterial color={t.foliage} roughness={0.96} flatShading />
          </mesh>
          {seeded(i + seed + 6) > 0.65 && (
            <mesh position={[0, 2.1 * t.s, 0]}>
              <coneGeometry args={[0.55 * t.s, 1.4 * t.s, 7]} />
              <meshStandardMaterial color={t.foliage} roughness={0.96} flatShading />
            </mesh>
          )}
        </group>
      ))}
    </group>
  )
}

function FieldScenery({ sideIndex }: { sideIndex: number }) {
  const seed = sideIndex * 100
  const hills = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => ({
      x: (i - 3) * 6,
      h: 1.2 + seeded(i + seed + 1) * 2.5,
      w: 5 + seeded(i + seed + 2) * 3,
      tone: seeded(i + seed + 3) > 0.5 ? '#8a9a48' : '#7a8a40',
    }))
  }, [seed])

  const patches = useMemo(() => {
    return Array.from({ length: 24 }, (_, i) => ({
      x: (i - 12) * 1.8 + (seeded(i + seed + 10) - 0.5),
      z: -0.5 - seeded(i + seed + 11) * 5,
      tone: seeded(i + seed + 12) > 0.5 ? '#c8a848' : '#b89838',
    }))
  }, [seed])

  return (
    <group>
      <SideGround color="#9aaa58" />
      {hills.map((h, i) => (
        <mesh key={i} position={[h.x, h.h / 2 - 0.5, -3]} scale={[1, 0.45, 1]}>
          <sphereGeometry args={[h.w / 2, 8, 6]} />
          <meshStandardMaterial color={h.tone} roughness={1} flatShading />
        </mesh>
      ))}
      {patches.map((p, i) => (
        <mesh key={`p-${i}`} position={[p.x, -0.28, p.z]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.35 + seeded(i + seed + 13) * 0.25, 6]} />
          <meshStandardMaterial color={p.tone} roughness={1} />
        </mesh>
      ))}
    </group>
  )
}

function DesertScenery({ sideIndex }: { sideIndex: number }) {
  const seed = sideIndex * 100
  const dunes = useMemo(() => {
    return Array.from({ length: 8 }, (_, i) => ({
      x: (i - 4) * 5.5,
      h: 1.5 + seeded(i + seed + 1) * 3,
      w: 6 + seeded(i + seed + 2) * 4,
      tone: seeded(i + seed + 3) > 0.5 ? '#c8a868' : '#b89858',
    }))
  }, [seed])

  const cacti = useMemo(() => {
    return Array.from({ length: 10 }, (_, i) => ({
      x: (i - 5) * 3.2 + (seeded(i + seed + 20) - 0.5) * 1.5,
      z: -1.5 - seeded(i + seed + 21) * 3.5,
      s: 0.6 + seeded(i + seed + 22) * 0.9,
    }))
  }, [seed])

  return (
    <group>
      <SideGround color="#d4b878" />
      {dunes.map((d, i) => (
        <mesh key={i} position={[d.x, d.h / 2 - 0.6, -2.5]} scale={[1, 0.35, 1]}>
          <sphereGeometry args={[d.w / 2, 8, 6]} />
          <meshStandardMaterial color={d.tone} roughness={0.98} flatShading />
        </mesh>
      ))}
      {cacti.map((c, i) => (
        <group key={`c-${i}`} position={[c.x, 0, c.z]}>
          <mesh position={[0, 0.7 * c.s, 0]}>
            <cylinderGeometry args={[0.18 * c.s, 0.22 * c.s, 1.4 * c.s, 6]} />
            <meshStandardMaterial color="#3a7a48" roughness={0.9} />
          </mesh>
          <mesh position={[0.35 * c.s, 0.9 * c.s, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.12 * c.s, 0.14 * c.s, 0.55 * c.s, 6]} />
            <meshStandardMaterial color="#3a7a48" roughness={0.9} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

type Props = {
  scenery: OutdoorScenery
}

export function OutdoorSceneryBackdrop({ scenery }: Props) {
  if (scenery === 'none') return null

  const wrap = (render: (sideIndex: number) => ReactNode) => (
    <FourSideScenery render={render} />
  )

  if (scenery === 'city') return wrap((i) => <CityScenery sideIndex={i} />)
  if (scenery === 'mountain') return wrap((i) => <MountainScenery sideIndex={i} />)
  if (scenery === 'suburb') return wrap((i) => <SuburbScenery sideIndex={i} />)
  if (scenery === 'coast') return wrap((i) => <CoastScenery sideIndex={i} />)
  if (scenery === 'forest') return wrap((i) => <ForestScenery sideIndex={i} />)
  if (scenery === 'field') return wrap((i) => <FieldScenery sideIndex={i} />)
  if (scenery === 'desert') return wrap((i) => <DesertScenery sideIndex={i} />)
  return null
}
