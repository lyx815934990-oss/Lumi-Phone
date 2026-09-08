import { OrbitControls } from '@react-three/drei'
import { Canvas, useThree } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
  Box3,
  Color,
  Group,
  PerspectiveCamera,
  SkeletonHelper,
  SkinnedMesh,
  Vector3,
  type Object3D,
} from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { computeReliableObjectBounds } from '../avatarBounds'
import { analyzeAvatarMeshRig } from '../avatarMeshAnalyze'
import { prepareCustomAvatarMesh } from '../avatarMeshPrep'
import { loadOcModelGroup } from '../loadOcModel'
import { clearFurnitureGltf } from '../loadFurnitureGltf'
import { subscribeOcModelChange } from '../ocModelEvents'
import {
  getOcModelBlobUrl,
  getOcModelMeta,
  updateOcModelRigKind,
  type OcModelFormat,
} from '../ocModelStore'

const _box = new Box3()
const _size = new Vector3()
const _center = new Vector3()

function friendlyLoadError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err || '')
  const lower = raw.toLowerCase()
  if (lower.includes('load failed') || lower.includes('failed to fetch') || lower.includes('networkerror')) {
    return '预览加载失败，请稍后再试或点「替换模型」重新导入'
  }
  return raw || '模型预览加载失败'
}
function centerObjectXZ(root: Object3D): void {
  root.updateWorldMatrix(true, true)
  computeReliableObjectBounds(root, _box)
  _box.getCenter(_center)
  root.position.x -= _center.x
  root.position.z -= _center.z
}

function fitPreviewCamera(camera: PerspectiveCamera, root: Object3D, controls?: OrbitControlsImpl | null): void {
  root.updateWorldMatrix(true, true)
  computeReliableObjectBounds(root, _box)
  _box.getSize(_size)
  _box.getCenter(_center)
  // 至少按身高约 1.6m 构图，避免错盒把镜头贴脸上
  const maxDim = Math.max(_size.x, _size.y, _size.z, 1.6)
  const dist = maxDim * 2.4
  camera.position.set(_center.x + dist * 0.55, _center.y + dist * 0.22, _center.z + dist * 0.95)
  camera.near = Math.max(0.05, dist / 100)
  camera.far = Math.max(80, dist * 40)
  camera.lookAt(_center)
  camera.updateProjectionMatrix()
  if (controls) {
    controls.target.copy(_center)
    controls.minDistance = Math.max(0.6, maxDim * 0.35)
    controls.maxDistance = Math.max(8, maxDim * 8)
    controls.update()
  }
}

/** 在带蒙皮模型上叠加骨骼辅助线 */
function attachSkeletonHelpers(root: Group): { helpers: SkeletonHelper[]; boneCount: number; skinned: boolean } {
  const helpers: SkeletonHelper[] = []
  let boneCount = 0
  let skinned = false
  const seen = new Set<object>()

  root.traverse((obj) => {
    if (!(obj instanceof SkinnedMesh) || !obj.skeleton?.bones?.length) return
    skinned = true
    boneCount = Math.max(boneCount, obj.skeleton.bones.length)
    const key = obj.skeleton
    if (seen.has(key)) return
    seen.add(key)
    const helper = new SkeletonHelper(obj)
    helper.visible = true
    // SkeletonHelper 需要挂到场景里，跟模型同空间
    root.add(helper)
    helpers.push(helper)
  })

  return { helpers, boneCount, skinned }
}

type PreviewMeshProps = {
  url: string
  format: OcModelFormat
  scale: number
  characterId: string
  controlsRef: React.RefObject<OrbitControlsImpl | null>
  onReady: (info: { skinned: boolean; boneCount: number; rigKind: ReturnType<typeof analyzeAvatarMeshRig> }) => void
  onError: (message: string) => void
}

function PreviewMesh({ url, format, scale, characterId, controlsRef, onReady, onError }: PreviewMeshProps) {
  const { camera, invalidate } = useThree()
  const [root, setRoot] = useState<Group | null>(null)
  const onReadyRef = useRef(onReady)
  const onErrorRef = useRef(onError)
  onReadyRef.current = onReady
  onErrorRef.current = onError

  useEffect(() => {
    let cancelled = false
    setRoot(null)

    void loadOcModelGroup(url, format)
      .then(async (loaded) => {
        if (cancelled) return
        const kind = analyzeAvatarMeshRig(loaded.group)
        if (kind === 'skinned' || kind === 'mixamo') {
          await updateOcModelRigKind(characterId, kind)
        }
        const prepared = prepareCustomAvatarMesh(loaded.group, scale, loaded.clips)
        centerObjectXZ(prepared.root)
        const { boneCount, skinned } = attachSkeletonHelpers(prepared.root)
        setRoot(prepared.root)
        invalidate()
        onReadyRef.current({
          skinned: skinned || kind === 'skinned' || kind === 'mixamo',
          boneCount,
          rigKind: kind,
        })
      })
      .catch((err) => {
        if (!cancelled) {
          onErrorRef.current(friendlyLoadError(err))
        }
      })

    return () => {
      cancelled = true
      // 预览卸载时不要 clearAvatarFbx：会和摆放共用缓存抢跑，Safari 常报 Load failed
      if (format === 'glb') clearFurnitureGltf(url)
    }
  }, [url, format, scale, characterId, invalidate])

  useLayoutEffect(() => {
    if (!root || !(camera instanceof PerspectiveCamera)) return
    fitPreviewCamera(camera, root, controlsRef.current)
    invalidate()
  }, [root, camera, controlsRef, invalidate])

  if (!root) return null
  return <primitive object={root} />
}

type SceneProps = {
  url: string
  format: OcModelFormat
  scale: number
  characterId: string
  onReady: (info: { skinned: boolean; boneCount: number; rigKind: ReturnType<typeof analyzeAvatarMeshRig> }) => void
  onError: (message: string) => void
}

function PreviewScene({ url, format, scale, characterId, onReady, onError }: SceneProps) {
  const controlsRef = useRef<OrbitControlsImpl | null>(null)

  return (
    <>
      <color attach="background" args={[new Color('#e8e6e2')]} />
      <ambientLight intensity={0.9} />
      <directionalLight position={[4, 6, 3]} intensity={1.05} />
      <directionalLight position={[-3, 2.5, -4]} intensity={0.4} />
      <PreviewMesh
        url={url}
        format={format}
        scale={scale}
        characterId={characterId}
        controlsRef={controlsRef}
        onReady={onReady}
        onError={onError}
      />
      <OrbitControls
        ref={controlsRef}
        makeDefault
        enablePan={false}
        minDistance={0.8}
        maxDistance={18}
      />
    </>
  )
}

type Props = {
  characterId: string
  scale: number
  onRigKind?: (kind: 'skinned' | 'mixamo' | 'static' | 'none') => void
}

/** 人物页：导入 OC 后的可交互 3D 预览（有绑骨则叠加骨骼线） */
export function OcModelPreview({ characterId, scale, onRigKind }: Props) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [format, setFormat] = useState<OcModelFormat | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [rigInfo, setRigInfo] = useState<{ skinned: boolean; boneCount: number } | null>(null)
  const onRigKindRef = useRef(onRigKind)
  onRigKindRef.current = onRigKind

  const reload = async () => {
    const cid = characterId.trim()
    if (!cid) {
      setBlobUrl(null)
      setFormat(null)
      setLoading(false)
      setError('')
      setRigInfo(null)
      return
    }

    setLoading(true)
    setError('')
    setRigInfo(null)
    try {
      const meta = await getOcModelMeta(cid)
      if (!meta) {
        setBlobUrl(null)
        setFormat(null)
        setLoading(false)
        return
      }
      const url = await getOcModelBlobUrl(cid)
      if (!url) throw new Error('无法读取已导入模型')
      setFormat(meta.format)
      setBlobUrl(url)
    } catch (err) {
      setBlobUrl(null)
      setFormat(null)
      setError(err instanceof Error ? err.message : '预览加载失败')
      setLoading(false)
    }
  }

  useEffect(() => {
    void reload()
  }, [characterId])

  useEffect(() => {
    return subscribeOcModelChange((cid) => {
      if (cid === characterId.trim()) void reload()
    })
  }, [characterId])

  if (!blobUrl || !format) {
    if (error) {
      return <p className="mb-3 text-[10px] text-red-600">{error}</p>
    }
    return null
  }

  return (
    <div className="hb-oc-model-preview mb-3">
      <Canvas
        frameloop="demand"
        camera={{ fov: 40, position: [0.8, 1.1, 2.4], near: 0.01, far: 80 }}
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => {
          gl.setClearColor('#e8e6e2')
        }}
      >
        <PreviewScene
          key={`${blobUrl}:${scale}`}
          url={blobUrl}
          format={format}
          scale={scale}
          characterId={characterId}
          onReady={(info) => {
            setRigInfo(info)
            setLoading(false)
            if (info.rigKind === 'skinned' || info.rigKind === 'mixamo') {
              onRigKindRef.current?.(info.rigKind)
            }
          }}
          onError={(message) => {
            setError(message)
            setLoading(false)
          }}
        />
      </Canvas>
      {loading ? (
        <p className="hb-oc-model-preview-overlay text-[10px] text-[var(--hb-mist)]">加载预览…</p>
      ) : null}
      {!loading && !error && rigInfo ? (
        <p className="hb-oc-model-preview-hint">
          {rigInfo.skinned
            ? `已识别绑骨蒙皮（约 ${rigInfo.boneCount} 根骨），绿色线为骨骼`
            : '未检测到骨骼蒙皮：请导入混元「绑骨蒙皮」后的 FBX'}
        </p>
      ) : null}
      {error ? <p className="hb-oc-model-preview-overlay text-[10px] text-red-600">{error}</p> : null}
    </div>
  )
}
