import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import type { Group, Points } from 'three'
import type { OutdoorEnvironmentConfig } from '../outdoorEnvironment'
import { OutdoorSunModel } from './OutdoorSunModel'

const SKY_CENTER: [number, number, number] = [4, 0, 3]
const CLOUD_LAYOUT = [
  { x: -8, y: 16, z: -6, s: 2.2 },
  { x: 6, y: 18, z: -10, s: 2.8 },
  { x: 14, y: 15, z: 2, s: 2.0 },
  { x: -4, y: 17, z: 8, s: 2.5 },
  { x: 10, y: 19, z: -4, s: 3.1 },
  { x: -12, y: 14, z: 0, s: 1.8 },
  { x: 2, y: 16, z: -14, s: 2.4 },
]

function lightToVisual(pos: [number, number, number], dist = 50): [number, number, number] {
  const len = Math.hypot(pos[0], pos[1], pos[2])
  if (len < 0.01) return [SKY_CENTER[0], dist, SKY_CENTER[2]]
  return [
    SKY_CENTER[0] + (pos[0] / len) * dist,
    Math.max(4, (pos[1] / len) * dist),
    SKY_CENTER[2] + (pos[2] / len) * dist,
  ]
}

function MoonDisc({ env }: { env: OutdoorEnvironmentConfig }) {
  if (!env.sky.showMoon) return null
  const pos = lightToVisual(env.moonPosition)
  return (
    <group position={pos}>
      <mesh>
        <sphereGeometry args={[1.6, 24, 24]} />
        <meshBasicMaterial color={env.sky.moonColor} toneMapped={false} />
      </mesh>
      <mesh position={[0.35, 0.15, 0.2]}>
        <sphereGeometry args={[1.45, 24, 24]} />
        <meshBasicMaterial color={env.background} toneMapped={false} />
      </mesh>
    </group>
  )
}

function StarField({ env }: { env: OutdoorEnvironmentConfig }) {
  const ref = useRef<Points>(null)
  const positions = useMemo(() => {
    const count = 280
    const arr = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.random() * Math.PI * 0.42
      const r = 42 + Math.random() * 8
      arr[i * 3] = SKY_CENTER[0] + Math.cos(theta) * Math.cos(phi) * r
      arr[i * 3 + 1] = 8 + Math.sin(phi) * r
      arr[i * 3 + 2] = SKY_CENTER[2] + Math.sin(theta) * Math.cos(phi) * r
    }
    return arr
  }, [])

  if (!env.sky.showStars) return null

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.14} color="#f0f4ff" transparent opacity={0.85} sizeAttenuation depthWrite={false} />
    </points>
  )
}

function CloudPuff({
  offset,
  scale,
  opacity,
}: {
  offset: [number, number, number]
  scale: number
  opacity: number
}) {
  const blobs: [number, number, number][] = [
    [0, 0, 0],
    [scale * 0.55, scale * 0.08, 0],
    [-scale * 0.5, scale * 0.05, scale * 0.15],
    [scale * 0.2, scale * 0.12, -scale * 0.35],
    [-scale * 0.15, -scale * 0.05, scale * 0.3],
  ]
  return (
    <group position={offset}>
      {blobs.map((p, i) => (
        <mesh key={i} position={p}>
          <sphereGeometry args={[scale * (i === 0 ? 0.55 : 0.38), 10, 10]} />
          <meshStandardMaterial
            color="#f4f6fa"
            transparent
            opacity={opacity}
            roughness={0.95}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  )
}

function CloudLayer({ density, weather }: { density: number; weather: string }) {
  const groupRef = useRef<Group>(null)
  const opacity = weather === 'rain' ? 0.72 : weather === 'snow' ? 0.82 : 0.58

  useFrame((_, delta) => {
    const g = groupRef.current
    if (!g) return
    g.position.x += delta * 0.35
    if (g.position.x > 3) g.position.x = -3
  })

  if (density < 0.05) return null

  const count = Math.max(2, Math.round(CLOUD_LAYOUT.length * density))
  return (
    <group ref={groupRef} position={[SKY_CENTER[0], 0, SKY_CENTER[2]]}>
      {CLOUD_LAYOUT.slice(0, count).map((c, i) => (
        <CloudPuff
          key={i}
          offset={[c.x, c.y, c.z]}
          scale={c.s * (0.85 + density * 0.25)}
          opacity={opacity * (0.75 + (i % 3) * 0.08)}
        />
      ))}
    </group>
  )
}

type Props = {
  env: OutdoorEnvironmentConfig
}

export function OutdoorSkyDecor({ env }: Props) {
  return (
    <>
      <OutdoorSunModel env={env} />
      <MoonDisc env={env} />
      <StarField env={env} />
      <CloudLayer density={env.sky.cloudDensity} weather={env.weather} />
    </>
  )
}
