import { useFrame } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef } from 'react'
import {
  DynamicDrawUsage,
  InstancedMesh,
  Object3D,
  type DirectionalLight,
  type LineSegments,
  type Points,
} from 'three'
import { findVerticalRainHit, findWallRainHit, type RainHit } from '../rainCollision'
import {
  RAIN_SIZE_DEFAULT,
  type HomeBuildDraft,
  type OutdoorWeather,
} from '../types'

const RAIN_STREAK_MAX = 1400
const SPLASH_COUNT = 280
const SNOW_COUNT = 600
const RAIN_TOP = 22
const RAIN_SPAWN_HALF = 28
const ORIGIN_X = 4
const ORIGIN_Z = 3

const SPLASH_LIFE = 0.14
const MAX_SPLASH_EVENTS_PER_FRAME = 28

const _obj = new Object3D()

function rainVisualParams(sizeRaw: number) {
  const size = Math.max(1, Math.min(5, Math.round(sizeRaw)))
  const t = (size - 1) / 4
  return {
    size,
    activeCount: Math.round(380 + t * 1000),
    streakLen: 0.28 + t * 0.55,
    fallSpeed: 11 + t * 9,
    slantX: 0.32 + t * 0.22,
    slantZ: 0.04 + t * 0.04,
    splashScale: 0.007 + t * 0.02,
    splashSpeed: 0.45 + t * 0.55,
    splashPerHit: size >= 4 ? 3 : 2,
    lineOpacity: 0.28 + t * 0.14,
  }
}

type RainDrop = {
  headX: number
  headY: number
  headZ: number
}

type Splash = {
  x: number
  y: number
  z: number
  birthY: number
  vx: number
  vy: number
  vz: number
  age: number
  alive: boolean
}

function randomGlobalXZ(): { x: number; z: number } {
  return {
    x: (Math.random() * 2 - 1) * RAIN_SPAWN_HALF,
    z: (Math.random() * 2 - 1) * RAIN_SPAWN_HALF,
  }
}

function initRainDrop(): RainDrop {
  const p = randomGlobalXZ()
  return {
    headX: p.x,
    headY: 10 + Math.random() * RAIN_TOP,
    headZ: p.z,
  }
}

type RainProps = {
  draft: HomeBuildDraft
  rainSize: number
}

function RainStreaks({ draft, rainSize }: RainProps) {
  const streakRef = useRef<LineSegments>(null)
  const splashMeshRef = useRef<InstancedMesh>(null)
  const dropsRef = useRef<RainDrop[]>([])
  const splashesRef = useRef<Splash[]>([])
  const splashCursorRef = useRef(0)
  const eventsThisFrameRef = useRef(0)
  const paramsRef = useRef(rainVisualParams(rainSize))

  useLayoutEffect(() => {
    paramsRef.current = rainVisualParams(rainSize)
  }, [rainSize])

  const streakPositions = useMemo(() => {
    const arr = new Float32Array(RAIN_STREAK_MAX * 2 * 3)
    const drops: RainDrop[] = []
    for (let i = 0; i < RAIN_STREAK_MAX; i++) drops.push(initRainDrop())
    const p0 = rainVisualParams(RAIN_SIZE_DEFAULT)
    for (let i = 0; i < RAIN_STREAK_MAX; i++) {
      const d = drops[i]!
      const o = i * 6
      arr[o] = d.headX - p0.slantX * p0.streakLen
      arr[o + 1] = d.headY + p0.streakLen * 0.92
      arr[o + 2] = d.headZ - p0.slantZ * p0.streakLen
      arr[o + 3] = d.headX
      arr[o + 4] = d.headY
      arr[o + 5] = d.headZ
    }
    return { arr, drops }
  }, [])

  useLayoutEffect(() => {
    dropsRef.current = streakPositions.drops
  }, [streakPositions])

  useLayoutEffect(() => {
    const splashes: Splash[] = []
    for (let i = 0; i < SPLASH_COUNT; i++) {
      splashes.push({
        x: 0,
        y: -40,
        z: 0,
        birthY: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        age: SPLASH_LIFE,
        alive: false,
      })
    }
    splashesRef.current = splashes

    const mesh = splashMeshRef.current
    if (!mesh) return
    mesh.instanceMatrix.setUsage(DynamicDrawUsage)
    for (let i = 0; i < SPLASH_COUNT; i++) {
      _obj.position.set(0, -40, 0)
      _obj.scale.setScalar(0)
      _obj.updateMatrix()
      mesh.setMatrixAt(i, _obj.matrix)
    }
    mesh.instanceMatrix.needsUpdate = true
    mesh.frustumCulled = false
  }, [])

  const spawnSplashAtHit = (hit: RainHit) => {
    if (eventsThisFrameRef.current >= MAX_SPLASH_EVENTS_PER_FRAME) return
    eventsThisFrameRef.current += 1

    const params = paramsRef.current
    const localX = hit.x - ORIGIN_X
    const localZ = hit.z - ORIGIN_Z
    const surfaceY = hit.y + (hit.kind === 'wall' ? 0.01 : 0.02)
    const splashes = splashesRef.current

    for (let n = 0; n < params.splashPerHit; n++) {
      const i = splashCursorRef.current % SPLASH_COUNT
      splashCursorRef.current = i + 1
      const s = splashes[i]!

      if (hit.kind === 'wall' && hit.nx != null && hit.nz != null) {
        const tangentAng = Math.atan2(hit.nz, hit.nx) + Math.PI / 2
        const spread = (Math.random() - 0.5) * 0.7
        const speed = params.splashSpeed * (0.45 + Math.random() * 0.4)
        s.vx = hit.nx * speed * 0.9 + Math.cos(tangentAng) * spread * 0.25
        s.vz = hit.nz * speed * 0.9 + Math.sin(tangentAng) * spread * 0.25
        s.vy = 0.25 + Math.random() * 0.35
      } else {
        const ang = Math.random() * Math.PI * 2
        const speed = params.splashSpeed * (0.3 + Math.random() * 0.4)
        s.vx = Math.cos(ang) * speed
        s.vz = Math.sin(ang) * speed
        s.vy = 0.35 + Math.random() * 0.4
      }

      s.x = localX
      s.y = surfaceY
      s.z = localZ
      s.birthY = surfaceY
      s.age = 0
      s.alive = true
    }
  }

  const respawnDrop = (drop: RainDrop) => {
    const next = initRainDrop()
    drop.headX = next.headX
    drop.headY = next.headY
    drop.headZ = next.headZ
  }

  useFrame((_, delta) => {
    const streakMesh = streakRef.current
    if (!streakMesh) return
    const dt = Math.min(delta, 0.05)
    eventsThisFrameRef.current = 0
    const params = paramsRef.current
    const active = Math.min(params.activeCount, RAIN_STREAK_MAX)

    const mat = streakMesh.material as { opacity?: number }
    if (mat && typeof mat.opacity === 'number') mat.opacity = params.lineOpacity

    const attr = streakMesh.geometry.attributes.position
    const arr = attr.array as Float32Array

    for (let i = 0; i < RAIN_STREAK_MAX; i++) {
      const drop = dropsRef.current[i]!
      const o = i * 6

      if (i >= active) {
        arr[o + 1] = -50
        arr[o + 4] = -50
        continue
      }

      const prevY = drop.headY
      const prevWorldX = drop.headX + ORIGIN_X
      const prevWorldZ = drop.headZ + ORIGIN_Z

      drop.headY -= params.fallSpeed * dt
      drop.headX += params.slantX * params.fallSpeed * dt * 0.22
      drop.headZ += params.slantZ * params.fallSpeed * dt * 0.22

      const worldX = drop.headX + ORIGIN_X
      const worldZ = drop.headZ + ORIGIN_Z
      const worldY = drop.headY

      const outOfBounds =
        Math.abs(drop.headX) > RAIN_SPAWN_HALF + 4 ||
        Math.abs(drop.headZ) > RAIN_SPAWN_HALF + 4

      if (outOfBounds) {
        respawnDrop(drop)
      } else {
        const wallHit = findWallRainHit(draft, worldX, worldY, worldZ)
        if (wallHit) {
          spawnSplashAtHit(wallHit)
          respawnDrop(drop)
        } else {
          const hit =
            findVerticalRainHit(draft, worldX, worldZ, prevY, drop.headY) ??
            findVerticalRainHit(draft, prevWorldX, prevWorldZ, prevY, drop.headY)
          if (hit) {
            spawnSplashAtHit(hit)
            respawnDrop(drop)
          }
        }
      }

      arr[o] = drop.headX - params.slantX * params.streakLen
      arr[o + 1] = drop.headY + params.streakLen * 0.92
      arr[o + 2] = drop.headZ - params.slantZ * params.streakLen
      arr[o + 3] = drop.headX
      arr[o + 4] = drop.headY
      arr[o + 5] = drop.headZ
    }
    attr.needsUpdate = true

    const splashMesh = splashMeshRef.current
    if (!splashMesh) return
    const splashes = splashesRef.current

    for (let i = 0; i < SPLASH_COUNT; i++) {
      const s = splashes[i]!
      if (!s.alive) {
        _obj.position.set(0, -40, 0)
        _obj.scale.setScalar(0)
        _obj.updateMatrix()
        splashMesh.setMatrixAt(i, _obj.matrix)
        continue
      }

      s.age += dt
      if (s.age >= SPLASH_LIFE) {
        s.alive = false
        _obj.position.set(0, -40, 0)
        _obj.scale.setScalar(0)
        _obj.updateMatrix()
        splashMesh.setMatrixAt(i, _obj.matrix)
        continue
      }

      s.vy -= 20 * dt
      s.x += s.vx * dt
      s.y += s.vy * dt
      s.z += s.vz * dt
      if (s.y < s.birthY) {
        s.y = s.birthY
        s.vy = 0
        s.vx *= 0.45
        s.vz *= 0.45
      }
      s.vx *= 1 - dt * 6
      s.vz *= 1 - dt * 6

      const lifeT = 1 - s.age / SPLASH_LIFE
      const scale = params.splashScale * (0.55 + lifeT * 0.45)
      _obj.position.set(s.x, s.y, s.z)
      _obj.scale.setScalar(scale)
      _obj.updateMatrix()
      splashMesh.setMatrixAt(i, _obj.matrix)
    }

    splashMesh.instanceMatrix.needsUpdate = true
  })

  return (
    <group position={[ORIGIN_X, 0, ORIGIN_Z]}>
      <lineSegments ref={streakRef} frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[streakPositions.arr, 3]} />
        </bufferGeometry>
        <lineBasicMaterial
          color="#c8dce8"
          transparent
          opacity={0.34}
          depthTest
          depthWrite={false}
        />
      </lineSegments>

      <instancedMesh ref={splashMeshRef} args={[undefined, undefined, SPLASH_COUNT]} frustumCulled={false}>
        <sphereGeometry args={[1, 5, 5]} />
        <meshBasicMaterial
          color="#c5d8e6"
          transparent
          opacity={0.72}
          depthTest
          depthWrite
          toneMapped={false}
        />
      </instancedMesh>
    </group>
  )
}

function SnowParticles() {
  const ref = useRef<Points>(null)

  const positions = useMemo(() => {
    const arr = new Float32Array(SNOW_COUNT * 3)
    for (let i = 0; i < SNOW_COUNT; i++) {
      const p = randomGlobalXZ()
      arr[i * 3] = p.x
      arr[i * 3 + 1] = 4 + Math.random() * 18
      arr[i * 3 + 2] = p.z
    }
    return arr
  }, [])

  useFrame((_, delta) => {
    const mesh = ref.current
    if (!mesh) return
    const dt = Math.min(delta, 0.05)
    const attr = mesh.geometry.attributes.position
    const arr = attr.array as Float32Array

    for (let i = 0; i < SNOW_COUNT; i++) {
      arr[i * 3] += Math.sin(arr[i * 3 + 1]! * 0.4) * dt * 0.35
      arr[i * 3 + 1]! -= dt * 1.8
      if (
        arr[i * 3 + 1]! < 0 ||
        Math.abs(arr[i * 3]!) > RAIN_SPAWN_HALF + 4 ||
        Math.abs(arr[i * 3 + 2]!) > RAIN_SPAWN_HALF + 4
      ) {
        const p = randomGlobalXZ()
        arr[i * 3] = p.x
        arr[i * 3 + 1] = 14 + Math.random() * 6
        arr[i * 3 + 2] = p.z
      }
    }
    attr.needsUpdate = true
  })

  return (
    <points ref={ref} position={[ORIGIN_X, 0, ORIGIN_Z]} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.08}
        color="#f0f4ff"
        transparent
        opacity={0.75}
        depthTest
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  )
}

function generateLightningBolt(
  startX: number,
  startY: number,
  startZ: number,
  endX: number,
  endY: number,
  endZ: number,
  segments = 12,
): Float32Array {
  const lines: number[] = []
  const pushSeg = (ax: number, ay: number, az: number, bx: number, by: number, bz: number) => {
    lines.push(ax, ay, az, bx, by, bz)
  }

  const pts: Array<[number, number, number]> = [[startX, startY, startZ]]
  for (let i = 1; i < segments; i++) {
    const t = i / segments
    const jitter = (1 - t) * (1.8 + Math.random() * 2.2)
    pts.push([
      startX + (endX - startX) * t + (Math.random() - 0.5) * jitter,
      startY + (endY - startY) * t,
      startZ + (endZ - startZ) * t + (Math.random() - 0.5) * jitter,
    ])
  }
  pts.push([endX, endY, endZ])

  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i]!
    const b = pts[i + 1]!
    pushSeg(a[0], a[1], a[2], b[0], b[1], b[2])
  }

  const branchCount = 1 + Math.floor(Math.random() * 2)
  for (let b = 0; b < branchCount; b++) {
    const from = 2 + Math.floor(Math.random() * Math.max(1, segments - 4))
    const origin = pts[from]!
    let bx = origin[0]
    let by = origin[1]
    let bz = origin[2]
    const steps = 3 + Math.floor(Math.random() * 3)
    for (let s = 0; s < steps; s++) {
      const nx = bx + (Math.random() - 0.5) * 2.4
      const ny = by - (0.8 + Math.random() * 1.4)
      const nz = bz + (Math.random() - 0.5) * 2.4
      pushSeg(bx, by, bz, nx, ny, nz)
      bx = nx
      by = ny
      bz = nz
    }
  }

  return new Float32Array(lines)
}

const BOLT_CENTER_X = 4
const BOLT_CENTER_Z = 3
const BOLT_MAX_FLOATS = 80 * 6

function syncBoltBuffer(
  mesh: LineSegments | null,
  src: Float32Array,
  floatCount: number,
) {
  if (!mesh) return
  const attr = mesh.geometry.attributes.position as import('three').BufferAttribute
  const arr = attr.array as Float32Array
  arr.fill(0)
  arr.set(src.subarray(0, floatCount))
  attr.needsUpdate = true
  mesh.geometry.setDrawRange(0, floatCount / 3)
}

function LightningStorm() {
  const flashRef = useRef(0)
  const lightRef = useRef<DirectionalLight>(null)
  const pointRef = useRef<import('three').PointLight>(null)
  const coreRef = useRef<LineSegments>(null)
  const glowRef = useRef<LineSegments>(null)
  const coolDownRef = useRef(1.2)

  const corePositions = useMemo(() => new Float32Array(BOLT_MAX_FLOATS), [])
  const glowPositions = useMemo(() => new Float32Array(BOLT_MAX_FLOATS), [])

  const strike = () => {
    const ang = Math.random() * Math.PI * 2
    const dist = 16 + Math.random() * 12
    const tipX = BOLT_CENTER_X + Math.cos(ang) * dist
    const tipZ = BOLT_CENTER_Z + Math.sin(ang) * dist
    const tipY = 1.2 + Math.random() * 7
    const topX = tipX + (Math.random() - 0.5) * 5
    const topY = 20 + Math.random() * 12
    const topZ = tipZ + (Math.random() - 0.5) * 5

    const path = generateLightningBolt(topX, topY, topZ, tipX, tipY, tipZ)
    const n = Math.min(path.length, BOLT_MAX_FLOATS)
    corePositions.set(path.subarray(0, n))
    glowPositions.set(path.subarray(0, n))
    syncBoltBuffer(coreRef.current, corePositions, n)
    syncBoltBuffer(glowRef.current, glowPositions, n)

    if (lightRef.current) {
      lightRef.current.position.set(topX, topY, topZ)
    }
    if (pointRef.current) {
      pointRef.current.position.set((topX + tipX) * 0.5, (topY + tipY) * 0.5, (topZ + tipZ) * 0.5)
    }

    flashRef.current = 1
    coolDownRef.current = 0.45 + Math.random() * 1.1
  }

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05)
    coolDownRef.current = Math.max(0, coolDownRef.current - dt)

    if (flashRef.current > 0.18 && flashRef.current < 0.5 && Math.random() < 0.1) {
      flashRef.current = Math.min(1, flashRef.current + 0.65)
    }

    if (coolDownRef.current <= 0 && Math.random() < 0.007) {
      strike()
    }

    flashRef.current = Math.max(0, flashRef.current - dt * 5.8)
    const f = flashRef.current

    if (lightRef.current) lightRef.current.intensity = f * 1.45
    if (pointRef.current) pointRef.current.intensity = f * 5.2

    const coreMat = coreRef.current?.material as import('three').LineBasicMaterial | undefined
    const glowMat = glowRef.current?.material as import('three').LineBasicMaterial | undefined
    if (coreMat) {
      coreMat.opacity = f * 0.98
      coreMat.visible = f > 0.02
    }
    if (glowMat) {
      glowMat.opacity = f * 0.4
      glowMat.visible = f > 0.02
    }
  })

  return (
    <group>
      <directionalLight ref={lightRef} position={[8, 28, 4]} intensity={0} color="#d8e8ff" />
      <pointLight
        ref={pointRef}
        position={[BOLT_CENTER_X, 20, BOLT_CENTER_Z]}
        intensity={0}
        distance={60}
        decay={2}
        color="#e8f2ff"
      />

      {/* 外层柔光 */}
      <lineSegments ref={glowRef} frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[glowPositions, 3]} count={BOLT_MAX_FLOATS / 3} />
        </bufferGeometry>
        <lineBasicMaterial
          color="#8eb0ff"
          transparent
          opacity={0}
          depthTest
          depthWrite={false}
          toneMapped={false}
        />
      </lineSegments>

      {/* 核心亮线 */}
      <lineSegments ref={coreRef} frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[corePositions, 3]} count={BOLT_MAX_FLOATS / 3} />
        </bufferGeometry>
        <lineBasicMaterial
          color="#f7faff"
          transparent
          opacity={0}
          depthTest
          depthWrite={false}
          toneMapped={false}
        />
      </lineSegments>
    </group>
  )
}

type Props = {
  weather: OutdoorWeather
  draft: HomeBuildDraft
}

export function OutdoorWeatherEffects({ weather, draft }: Props) {
  const rainSize = draft.outdoorRainSize ?? RAIN_SIZE_DEFAULT
  const rainThunder = draft.outdoorRainThunder ?? false

  if (weather === 'rain') {
    return (
      <>
        <RainStreaks draft={draft} rainSize={rainSize} />
        {rainThunder ? <LightningStorm /> : null}
      </>
    )
  }
  if (weather === 'snow') return <SnowParticles />
  return null
}
