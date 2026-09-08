import { useEffect, useRef, useState } from 'react'
import { useThree } from '@react-three/fiber'
import { Plane, Raycaster, Vector2, Vector3 } from 'three'
import { useHomeBuildStore } from '../store'
import { floorPlanCenter } from '../floorPlanGeometry'
import { FLOOR_TILE_SIZE } from '../roomFloorRender'
import { floorBaseY } from '../scene3dUtils'
import { setOcPickWorld, snapOcToCellCenter, OC_PICK_LIFT } from '../ocPickInput'


const _ndc = new Vector2()
const _hit = new Vector3()
const _raycaster = new Raycaster()
const _floorPlane = new Plane()

/** 放置 OC：按住拖动跟手悬空，吸附 1×1 格 + 落点高亮 */
export function OcPickLayer() {
  const ocPicking = useHomeBuildStore((s) => s.ocPicking)
  const draft = useHomeBuildStore((s) => s.draft)
  const setOcPlacement = useHomeBuildStore((s) => s.setOcPlacement)
  const setOcPicking = useHomeBuildStore((s) => s.setOcPicking)
  const { gl, camera } = useThree()
  const [tile, setTile] = useState<{ x: number; z: number } | null>(null)
  const draggingRef = useRef(false)
  const cleanupRef = useRef<(() => void) | null>(null)
  const tileRef = useRef(tile)
  tileRef.current = tile

  const floorY = floorBaseY(draft, draft.activeFloorId)
  const floorId = draft.activeFloorId
  const center = floorPlanCenter(
    draft.floors.find((f) => f.id === draft.activeFloorId) ?? draft.floors[0]!,
  )

  const seedPick = (x: number, z: number) => {
    const snapped = snapOcToCellCenter(x, z)
    setOcPickWorld(snapped.x, floorY + OC_PICK_LIFT, snapped.z)
    setTile({ x: snapped.x, z: snapped.z })
  }

  const hitFloor = (clientX: number, clientY: number): { x: number; z: number } | null => {
    const el = gl.domElement
    const rect = el.getBoundingClientRect()
    if (rect.width < 1 || rect.height < 1) return null
    _ndc.set(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    )
    _raycaster.setFromCamera(_ndc, camera)
    _floorPlane.setFromNormalAndCoplanarPoint(
      new Vector3(0, 1, 0),
      new Vector3(0, floorY, 0),
    )
    if (!_raycaster.ray.intersectPlane(_floorPlane, _hit)) return null
    return { x: _hit.x, z: _hit.z }
  }

  // 进入放置：先落在当前格，方便立刻拖
  useEffect(() => {
    if (!ocPicking) {
      setTile(null)
      draggingRef.current = false
      cleanupRef.current?.()
      cleanupRef.current = null
      return
    }
    const placement = draft.ocPlacement
    const rawX = placement?.floorId === floorId ? placement.x : center.x
    const rawZ = placement?.floorId === floorId ? placement.z : center.z
    seedPick(rawX, rawZ)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ocPicking])

  useEffect(() => () => cleanupRef.current?.(), [])

  if (!ocPicking) return null

  const tileX = tile?.x ?? center.x
  const tileZ = tile?.z ?? center.z

  const startDrag = (clientX: number, clientY: number, pointerId: number) => {
    cleanupRef.current?.()
    draggingRef.current = true
    const hit = hitFloor(clientX, clientY)
    if (hit) seedPick(hit.x, hit.z)

    const el = gl.domElement
    try {
      el.setPointerCapture(pointerId)
    } catch {
      /* ignore */
    }

    const onMove = (ev: PointerEvent) => {
      if (!draggingRef.current) return
      ev.preventDefault()
      const p = hitFloor(ev.clientX, ev.clientY)
      if (p) seedPick(p.x, p.z)
    }

    const endDrag = (ev: PointerEvent) => {
      if (!draggingRef.current) return
      draggingRef.current = false
      cleanupRef.current?.()
      cleanupRef.current = null
      try {
        el.releasePointerCapture(pointerId)
      } catch {
        /* ignore */
      }
      const p = hitFloor(ev.clientX, ev.clientY)
      const cur = tileRef.current
      const x = p?.x ?? cur?.x ?? center.x
      const z = p?.z ?? cur?.z ?? center.z
      const snapped = snapOcToCellCenter(x, z)
      // 只写落点；下落由 HomeOcAvatar 统一 beginOcDrop，避免播两遍着地
      setOcPlacement({
        x: snapped.x,
        z: snapped.z,
        floorId,
        rotationY: 0,
      })
      setOcPicking(false)
      setTile(null)
    }

    window.addEventListener('pointermove', onMove, { passive: false })
    window.addEventListener('pointerup', endDrag)
    window.addEventListener('pointercancel', endDrag)
    cleanupRef.current = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', endDrag)
      window.removeEventListener('pointercancel', endDrag)
    }
  }

  return (
    <>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[tileX, floorY + 0.025, tileZ]}
        raycast={() => null}
      >
        <planeGeometry args={[FLOOR_TILE_SIZE * 0.96, FLOOR_TILE_SIZE * 0.96]} />
        <meshBasicMaterial color="#f59f00" transparent opacity={0.45} depthWrite={false} />
      </mesh>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[tileX, floorY + 0.028, tileZ]}
        raycast={() => null}
      >
        <planeGeometry args={[FLOOR_TILE_SIZE * 0.98, FLOOR_TILE_SIZE * 0.98]} />
        <meshBasicMaterial
          color="#ffd43b"
          transparent
          opacity={0.95}
          depthWrite={false}
          wireframe
        />
      </mesh>

      {/* 透明大平面接收拖动；抬高并关掉 depthTest，避免被 OC 挡住 */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[center.x, floorY + 0.2, center.z]}
        renderOrder={100}
        onPointerDown={(e) => {
          e.stopPropagation()
          e.nativeEvent.preventDefault()
          startDrag(e.nativeEvent.clientX, e.nativeEvent.clientY, e.pointerId)
        }}
      >
        <planeGeometry args={[120, 120]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} depthTest={false} />
      </mesh>
    </>
  )
}
