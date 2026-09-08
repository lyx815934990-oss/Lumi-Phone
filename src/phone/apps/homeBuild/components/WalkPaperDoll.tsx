import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useLoader } from '@react-three/fiber'
import { Billboard } from '@react-three/drei'
import * as THREE from 'three'
import { useHomeBuildStore } from '../store'
import { resolvePaperDollImageUrl } from '../paperDoll'
import {
  keyHexToRgb01,
  registerPaperDollCornerSampler,
  sampleCornerAverageHex,
} from '../paperDollChroma'
import { getWalkPaperDollChroma, getWalkPaperDollEnabled, getWalkAvatar3dEnabled } from '../walkInput'
import { getWalkPose } from '../walkPose'

const DOLL_HEIGHT = 1.55

const chromaVert = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const chromaFrag = /* glsl */ `
precision mediump float;
uniform sampler2D map;
uniform vec3 keyColor;
uniform float similarity;
uniform float softness;
uniform float spill;
uniform float chromaEnabled;
varying vec2 vUv;

void main() {
  vec4 tex = texture2D(map, vUv);
  if (chromaEnabled < 0.5) {
    if (tex.a < 0.12) discard;
    gl_FragColor = tex;
    return;
  }

  float d = distance(tex.rgb, keyColor);
  float soft = max(softness, 0.001);
  float edge0 = max(0.0, similarity - soft);
  float edge1 = similarity + soft;
  float keep = smoothstep(edge0, edge1, d);
  float alpha = keep * tex.a;

  float luma = dot(tex.rgb, vec3(0.299, 0.587, 0.114));
  float prox = 1.0 - smoothstep(max(0.0, similarity * 0.45), edge1, d);
  vec3 rgb = mix(tex.rgb, vec3(luma), clamp(spill, 0.0, 1.0) * prox);

  if (alpha < 0.08) discard;
  gl_FragColor = vec4(rgb, alpha);
}
`

function PaperDollSprite({ url }: { url: string }) {
  const texture = useLoader(THREE.TextureLoader, url)
  const matRef = useRef<THREE.ShaderMaterial>(null)
  const meshRef = useRef<THREE.Mesh>(null)

  useMemo(() => {
    texture.colorSpace = THREE.SRGBColorSpace
    texture.anisotropy = 4
    texture.needsUpdate = true
  }, [texture])

  useEffect(() => {
    registerPaperDollCornerSampler(() => {
      const img = texture.image as CanvasImageSource | undefined
      if (!img) return null
      return sampleCornerAverageHex(img)
    })
    return () => registerPaperDollCornerSampler(null)
  }, [texture])

  const uniforms = useMemo(
    () => ({
      map: { value: texture },
      keyColor: { value: new THREE.Color(0x00e676) },
      similarity: { value: 0.32 },
      softness: { value: 0.12 },
      spill: { value: 0.4 },
      chromaEnabled: { value: 0 },
    }),
    [texture],
  )

  const img = texture.image as HTMLImageElement | undefined
  const aspect =
    img && img.height > 0
      ? Math.max(0.35, Math.min(1.15, img.width / img.height))
      : 0.55

  useFrame(() => {
    const chroma = getWalkPaperDollChroma()
    const mat = matRef.current
    if (mat) {
      const [r, g, b] = keyHexToRgb01(chroma.keyHex)
      mat.uniforms.keyColor!.value.setRGB(r, g, b)
      mat.uniforms.similarity!.value = chroma.similarity
      mat.uniforms.softness!.value = chroma.softness
      mat.uniforms.spill!.value = chroma.spill
      mat.uniforms.chromaEnabled!.value = chroma.enabled ? 1 : 0
    }
    const mesh = meshRef.current
    if (mesh) {
      const h = DOLL_HEIGHT * chroma.heightScale
      const w = h * aspect
      mesh.scale.set(w, h, 1)
      mesh.position.y = h / 2
    }
  })

  return (
    <Billboard follow>
      <mesh ref={meshRef} castShadow={false} receiveShadow={false} raycast={() => null}>
        <planeGeometry args={[1, 1]} />
        <shaderMaterial
          ref={matRef}
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
          uniforms={uniforms}
          vertexShader={chromaVert}
          fragmentShader={chromaFrag}
        />
      </mesh>
    </Billboard>
  )
}

/** 同住 OC 纸片人：漫游时侧后跟随（人物页为独立 UI，不进此组件） */
export function WalkPaperDoll() {
  const characterId = useHomeBuildStore((s) => s.characterId)
  const [url, setUrl] = useState<string>('')
  const groupRef = useRef<THREE.Group>(null)
  const dollX = useRef(0)
  const dollZ = useRef(0)
  const dollY = useRef(0)
  const inited = useRef(false)

  useEffect(() => {
    let cancelled = false
    void resolvePaperDollImageUrl(characterId).then((next) => {
      if (!cancelled) setUrl(next)
    })
    return () => {
      cancelled = true
    }
  }, [characterId])

  useEffect(() => {
    inited.current = false
  }, [characterId])

  useFrame((_, dt) => {
    const g = groupRef.current
    if (!g) return
    if (!getWalkPaperDollEnabled() || getWalkAvatar3dEnabled()) {
      g.visible = false
      return
    }
    if (!url) {
      g.visible = false
      return
    }

    const pose = getWalkPose()
    if (!pose.ready) {
      g.visible = false
      return
    }

    const sin = Math.sin(pose.yaw)
    const cos = Math.cos(pose.yaw)
    const forwardX = -sin
    const forwardZ = -cos
    const rightX = cos
    const rightZ = -sin
    const FOLLOW_BACK = 1.25
    const FOLLOW_SIDE = 0.95
    const targetX = pose.x - forwardX * FOLLOW_BACK + rightX * FOLLOW_SIDE
    const targetZ = pose.z - forwardZ * FOLLOW_BACK + rightZ * FOLLOW_SIDE
    const targetY = pose.feetY

    if (!inited.current) {
      dollX.current = targetX
      dollZ.current = targetZ
      dollY.current = targetY
      inited.current = true
    } else {
      const t = 1 - Math.exp(-Math.min(dt, 0.05) * 5.5)
      dollX.current += (targetX - dollX.current) * t
      dollZ.current += (targetZ - dollZ.current) * t
      dollY.current += (targetY - dollY.current) * t
    }

    g.visible = true
    g.position.set(dollX.current, dollY.current, dollZ.current)
  })

  if (!url) return null

  return (
    <group ref={groupRef}>
      <Suspense fallback={null}>
        <PaperDollSprite url={url} />
      </Suspense>
    </group>
  )
}
