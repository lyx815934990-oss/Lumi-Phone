import {
  Component,
  Suspense,
  useEffect,
  useLayoutEffect,
  useMemo,
  type ErrorInfo,
  type ReactNode,
} from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group, Mesh, MeshStandardMaterial, Object3D } from 'three'
import {
  cacheLocalBoundsFromObject,
  clearLocalBoundsCache,
  markFurnitureClimbable,
  refreshFurnitureAabbFromObject,
  removeFurnitureAabb,
} from '../furnitureBounds'
import { clearFurnitureGltf, preloadFurnitureGltf, useFurnitureGltf } from '../loadFurnitureGltf'
import { applyAutoUnitScale } from '../modelUnitScale'
import { isStairFurniture, refreshClimbVolumeFromObject, removeClimbVolume } from '../stairClimb'
import { floorBaseYByIndex, floorIndexAtWorldY, wallHeightOf } from '../scene3dUtils'
import { useHomeBuildStore } from '../store'
import type { PlacedFurniture } from '../types'

/** 深拷贝：几何可共享，材质必须独立；超大模型自动单位归一 */
function cloneFurnitureScene(scene: Object3D): Object3D {
  const clone = scene.clone(true)
  clone.traverse((obj) => {
    const mesh = obj as Mesh
    if (!mesh.isMesh) return
    if (Array.isArray(mesh.material)) {
      mesh.material = mesh.material.map((m) => m.clone())
    } else if (mesh.material) {
      mesh.material = mesh.material.clone()
    }
  })
  applyAutoUnitScale(clone)
  return clone
}

type ModelProps = {
  item: PlacedFurniture
  selected: boolean
  ghost?: boolean
  trackAabb?: boolean
  rootRef: React.RefObject<Group | null>
}

function FurnitureModelInner({ item, selected, ghost, trackAabb = true, rootRef }: ModelProps) {
  const gltf = useFurnitureGltf(item.modelPath)
  const clone = useMemo(() => cloneFurnitureScene(gltf.scene), [gltf.scene])

  const bounds = useMemo(() => {
    // 每次用当前 clone 重算，避免旧缓存把模型甩出视野
    clearLocalBoundsCache(item.modelPath)
    return cacheLocalBoundsFromObject(item.modelPath, clone)
  }, [clone, item.modelPath])

  useLayoutEffect(() => {
    clone.traverse((obj) => {
      const mesh = obj as Mesh
      if (!mesh.isMesh) return
      mesh.castShadow = false
      mesh.receiveShadow = false
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      for (const mat of mats) {
        const std = mat as MeshStandardMaterial
        if (ghost) {
          if ('transparent' in std) {
            std.transparent = true
            std.opacity = 0.55
            std.depthWrite = false
          }
          if (std.emissive) {
            std.emissive.setHex(0x2c6fad)
            std.emissiveIntensity = 0.18
          }
        } else if (selected) {
          if ('transparent' in std) {
            std.transparent = false
            std.opacity = 1
            std.depthWrite = true
          }
          if (std.emissive) {
            std.emissive.setHex(0x2c6fad)
            std.emissiveIntensity = 0.22
          }
        } else {
          if ('transparent' in std) {
            std.transparent = false
            std.opacity = 1
            std.depthWrite = true
          }
          if (std.emissive) {
            std.emissive.setHex(0x000000)
            std.emissiveIntensity = 0
          }
        }
        std.needsUpdate = true
      }
    })
  }, [clone, selected, ghost])

  useEffect(() => {
    if (!trackAabb) return
    return () => {
      removeFurnitureAabb(item.id)
      removeClimbVolume(item.id)
      markFurnitureClimbable(item.id, false)
    }
  }, [item.id, trackAabb])

  useFrame(() => {
    if (!trackAabb) return
    const root = rootRef.current
    if (!root) return
    refreshFurnitureAabbFromObject(item.id, root)
    if (isStairFurniture(item)) {
      const draft = useHomeBuildStore.getState().draft
      const idx = floorIndexAtWorldY(draft, root.position.y + 0.05)
      const vol = refreshClimbVolumeFromObject(item, root, {
        floorY: floorBaseYByIndex(draft, idx),
        wallHeight: wallHeightOf(draft.floors[idx]),
      })
      markFurnitureClimbable(item.id, Boolean(vol))
    } else {
      removeClimbVolume(item.id)
      markFurnitureClimbable(item.id, false)
    }
  })

  return (
    <group position={[-bounds.centerX, -bounds.minY, -bounds.centerZ]}>
      <primitive object={clone} />
    </group>
  )
}

function FurnitureFallback({ ghost, error }: { ghost?: boolean; error?: string | null }) {
  return (
    <group>
      <mesh position={[0, 0.25, 0]} castShadow={false}>
        <boxGeometry args={[0.45, 0.5, 0.45]} />
        <meshStandardMaterial color="#c45c26" transparent opacity={ghost ? 0.35 : 0.85} />
      </mesh>
      {/* 占位：加载中或失败；失败时控制台有详情 */}
      {error ? null : null}
    </group>
  )
}

class FurnitureLoadBoundary extends Component<
  { children: ReactNode; fallback: ReactNode; resetKey: string },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn('[HomeBuild] furniture model failed', this.props.resetKey, error.message, info.componentStack)
    clearFurnitureGltf(this.props.resetKey)
  }

  componentDidUpdate(prev: { resetKey: string }) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null })
    }
  }

  render() {
    if (this.state.error) {
      return (
        <FurnitureFallback error={this.state.error.message} />
      )
    }
    return this.props.children
  }
}

type Props = {
  item: PlacedFurniture
  selected: boolean
  ghost?: boolean
  trackAabb?: boolean
  rootRef: React.RefObject<Group | null>
}

/** 仅渲染模型内容（底对齐 + 水平居中），世界变换由外层 group 负责 */
export function FurnitureMesh({ item, selected, ghost, trackAabb = true, rootRef }: Props) {
  const fallback = <FurnitureFallback ghost={ghost} />
  return (
    <FurnitureLoadBoundary resetKey={item.modelPath} fallback={fallback}>
      <Suspense fallback={fallback}>
        <FurnitureModelInner
          item={item}
          selected={selected}
          ghost={ghost}
          trackAabb={trackAabb}
          rootRef={rootRef}
        />
      </Suspense>
    </FurnitureLoadBoundary>
  )
}

export function preloadFurnitureModel(modelPath: string) {
  preloadFurnitureGltf(modelPath)
}
