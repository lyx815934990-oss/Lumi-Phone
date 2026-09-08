import { Suspense, useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import {
  Box3,
  Color,
  Group,
  Material,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  Vector3,
} from 'three'
import sunGlbUrl from '../assets/sun.glb?url'
import type { OutdoorEnvironmentConfig } from '../outdoorEnvironment'

const SKY_CENTER: [number, number, number] = [4, 0, 3]
const TARGET_VISUAL_SIZE = 7.5

useGLTF.preload(sunGlbUrl)

function lightToVisual(pos: [number, number, number], dist = 48): [number, number, number] {
  const len = Math.hypot(pos[0], pos[1], pos[2])
  if (len < 0.01) return [SKY_CENTER[0], dist, SKY_CENTER[2]]
  return [
    SKY_CENTER[0] + (pos[0] / len) * dist,
    Math.max(8, (pos[1] / len) * dist),
    SKY_CENTER[2] + (pos[2] / len) * dist,
  ]
}

function applySunMaterial(mat: Material, emissive: Color, core: Color): Material {
  if (mat instanceof MeshStandardMaterial) {
    const next = mat.clone()
    next.color.lerp(core, 0.35)
    next.emissive.copy(emissive)
    next.emissiveIntensity = 6
    next.toneMapped = false
    next.metalness = 0
    next.roughness = 0.22
    next.needsUpdate = true
    return next
  }
  return new MeshBasicMaterial({ color: emissive, toneMapped: false })
}

function prepareSunScene(source: Object3D, sunColor: string): Group {
  const clone = source.clone(true)
  const emissive = new Color(sunColor)
  const core = new Color('#fff8e8')

  clone.traverse((obj) => {
    if (!(obj instanceof Mesh)) return
    const srcMats = Array.isArray(obj.material) ? obj.material : [obj.material]
    const cloned = srcMats.map((mat) => applySunMaterial(mat, emissive, core))
    obj.material = cloned.length === 1 ? cloned[0]! : cloned
    obj.castShadow = false
    obj.receiveShadow = false
    obj.frustumCulled = false
  })

  const box = new Box3().setFromObject(clone)
  const size = box.getSize(new Vector3())
  const maxDim = Math.max(size.x, size.y, size.z, 0.001)
  const scale = Math.min(TARGET_VISUAL_SIZE / maxDim, 20)
  clone.scale.setScalar(scale)
  box.setFromObject(clone)
  clone.position.sub(box.getCenter(new Vector3()))
  return clone as Group
}

function SunGlowHalos({ color, time }: { color: string; time: OutdoorEnvironmentConfig['time'] }) {
  const outerOpacity = time === 'dusk' ? 0.16 : 0.24
  const haloOpacity = time === 'dusk' ? 0.07 : 0.11
  return (
    <>
      <mesh renderOrder={10} raycast={() => null}>
        <sphereGeometry args={[4.6, 20, 20]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={outerOpacity}
          toneMapped={false}
          depthWrite={false}
        />
      </mesh>
      <mesh renderOrder={9} raycast={() => null}>
        <sphereGeometry args={[7.0, 16, 16]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={haloOpacity}
          toneMapped={false}
          depthWrite={false}
        />
      </mesh>
    </>
  )
}

function SunGlbModel({
  env,
  pos,
}: {
  env: OutdoorEnvironmentConfig
  pos: [number, number, number]
}) {
  const { scene } = useGLTF(sunGlbUrl)
  const model = useMemo(
    () => prepareSunScene(scene, env.sunLightColor),
    [scene, env.sunLightColor],
  )

  return (
    <group position={pos}>
      <primitive object={model} raycast={() => null} />
      <SunGlowHalos color={env.sunLightColor} time={env.time} />
    </group>
  )
}

type Props = {
  env: OutdoorEnvironmentConfig
}

/** 太阳 GLB 建模 — 仅本地 assets 资源，Suspense 只包住太阳自身，不影响建筑渲染。 */
export function OutdoorSunModel({ env }: Props) {
  const pos = useMemo(() => lightToVisual(env.sunPosition), [env.sunPosition])

  if (!env.sky.showSun) return null

  return (
    <Suspense fallback={null}>
      <SunGlbModel env={env} pos={pos} />
    </Suspense>
  )
}
