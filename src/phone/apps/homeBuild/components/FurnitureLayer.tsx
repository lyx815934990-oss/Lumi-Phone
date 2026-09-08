import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { TransformControls } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import type { Group } from 'three'
import { findCatalogItem, loadHomeCatalog } from '../catalog'
import {
  floorBaseY,
  isFurnitureOnFloor,
} from '../scene3dUtils'
import { useHomeBuildStore } from '../store'
import type { CatalogItem, HomeBuildMode, PlacedFurniture } from '../types'
import { FurnitureMesh, preloadFurnitureModel } from './FurnitureMesh'

type Props = {
  mode: HomeBuildMode
}

function gizmoModeToControls(mode: 'move' | 'rotate' | 'scale'): 'translate' | 'rotate' | 'scale' {
  if (mode === 'rotate') return 'rotate'
  if (mode === 'scale') return 'scale'
  return 'translate'
}

function PlacedFurnitureNode({
  item,
  selected,
  editable,
}: {
  item: PlacedFurniture
  selected: boolean
  editable: boolean
}) {
  const rootRef = useRef<Group>(null)
  const draggingRef = useRef(false)
  const [controlsTarget, setControlsTarget] = useState<Group | null>(null)
  const selectFurniture = useHomeBuildStore((s) => s.selectFurniture)
  const updateFurniture = useHomeBuildStore((s) => s.updateFurniture)
  const pushHistory = useHomeBuildStore((s) => s.pushHistory)
  const setGizmoDragging = useHomeBuildStore((s) => s.setGizmoDragging)
  const gizmoMode = useHomeBuildStore((s) => s.gizmoMode)

  const applyPose = (g: Group) => {
    g.position.set(item.position.x, item.position.y, item.position.z)
    g.rotation.set(item.rotation.x, item.rotation.y, item.rotation.z)
    g.scale.set(item.scale.x, item.scale.y, item.scale.z)
  }

  useLayoutEffect(() => {
    const g = rootRef.current
    if (!g || draggingRef.current) return
    applyPose(g)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.position, item.rotation, item.scale])

  const syncFromObject = () => {
    const g = rootRef.current
    if (!g) return
    updateFurniture(item.id, {
      position: { x: g.position.x, y: g.position.y, z: g.position.z },
      rotation: { x: g.rotation.x, y: g.rotation.y, z: g.rotation.z },
      scale: { x: g.scale.x, y: g.scale.y, z: g.scale.z },
    })
  }

  const showGizmo = editable && selected && !item.locked && controlsTarget

  return (
    <>
      <group
        ref={(node) => {
          rootRef.current = node
          if (node) {
            if (!draggingRef.current) applyPose(node)
            setControlsTarget((prev) => (prev === node ? prev : node))
          } else {
            setControlsTarget(null)
          }
        }}
        onClick={(e) => {
          if (!editable) return
          e.stopPropagation()
          selectFurniture(item.id)
        }}
      >
        <FurnitureMesh item={item} selected={selected && editable} rootRef={rootRef} />
      </group>

      {showGizmo ? (
        <TransformControls
          object={controlsTarget}
          mode={gizmoModeToControls(gizmoMode)}
          size={0.85}
          onMouseDown={() => {
            draggingRef.current = true
            pushHistory()
            setGizmoDragging(true)
          }}
          onMouseUp={() => {
            draggingRef.current = false
            setGizmoDragging(false)
            syncFromObject()
          }}
          onObjectChange={() => {
            syncFromObject()
          }}
        />
      ) : null}
    </>
  )
}

function PlacementPlane({
  floorY,
  onPlace,
  onHover,
}: {
  floorY: number
  onPlace: (x: number, z: number) => void
  onHover?: (x: number, z: number) => void
}) {
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[4, floorY + 0.01, 3]}
      onClick={(e) => {
        e.stopPropagation()
        onPlace(e.point.x, e.point.z)
      }}
      onPointerMove={(e) => {
        e.stopPropagation()
        onHover?.(e.point.x, e.point.z)
      }}
    >
      <planeGeometry args={[80, 80]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  )
}

function GhostPlacementPreview({
  catalog,
  x,
  z,
  floorY,
}: {
  catalog: CatalogItem
  x: number
  z: number
  floorY: number
}) {
  const rootRef = useRef<Group>(null)
  const ghostItem = useMemo<PlacedFurniture>(
    () => ({
      id: '__ghost_preview__',
      catalogId: catalog.id,
      name: catalog.name,
      modelPath: catalog.modelPath,
      position: { x, y: floorY, z },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
    }),
    [catalog.id, catalog.name, catalog.modelPath, x, z, floorY],
  )

  return (
    <group position={[x, floorY, z]} raycast={() => null}>
      <FurnitureMesh item={ghostItem} selected={false} ghost trackAabb={false} rootRef={rootRef} />
    </group>
  )
}

export function FurnitureLayer({ mode }: Props) {
  const draft = useHomeBuildStore((s) => s.draft)
  const selectedFurnitureId = useHomeBuildStore((s) => s.selectedFurnitureId)
  const pendingCatalogId = useHomeBuildStore((s) => s.pendingCatalogId)
  const placeFurniture = useHomeBuildStore((s) => s.placeFurniture)
  const selectFurniture = useHomeBuildStore((s) => s.selectFurniture)
  const { gl } = useThree()

  const editable = mode === 'ghost'
  const floorY = floorBaseY(draft, draft.activeFloorId)

  const [pendingItem, setPendingItem] = useState<CatalogItem | null>(null)
  const [hoverXZ, setHoverXZ] = useState<{ x: number; z: number } | null>(null)

  useEffect(() => {
    if (!pendingCatalogId) {
      setPendingItem(null)
      setHoverXZ(null)
      return
    }
    let cancelled = false
    void loadHomeCatalog().then((items) => {
      if (cancelled) return
      const item = findCatalogItem(items, pendingCatalogId)
      setPendingItem(item ?? null)
      if (item) preloadFurnitureModel(item.modelPath)
    })
    return () => {
      cancelled = true
    }
  }, [pendingCatalogId])

  useEffect(() => {
    if (!editable) return
    const el = gl.domElement
    const onMiss = () => {
      /* keep selection; empty click handled by plane only when pending */
    }
    el.addEventListener('pointermissed', onMiss)
    return () => el.removeEventListener('pointermissed', onMiss)
  }, [editable, gl])

  const handlePlace = (x: number, z: number) => {
    const catalogId = pendingCatalogId
    if (!catalogId) {
      selectFurniture(null)
      return
    }
    void loadHomeCatalog().then((items) => {
      const cat = findCatalogItem(items, catalogId)
      if (!cat) return
      const placed: Omit<PlacedFurniture, 'id'> = {
        catalogId: cat.id,
        name: cat.name,
        modelPath: cat.modelPath,
        position: { x, y: floorY, z },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
        floorId: draft.activeFloorId,
      }
      placeFurniture(placed)
    })
  }

  return (
    <>
      {draft.furniture.map((item) => {
        if ((mode === 'ghost' || mode === 'avatar') && !isFurnitureOnFloor(draft, item, draft.activeFloorId)) return null
        return (
          <PlacedFurnitureNode
            key={item.id}
            item={item}
            selected={item.id === selectedFurnitureId}
            editable={editable}
          />
        )
      })}

      {editable && pendingItem && hoverXZ ? (
        <GhostPlacementPreview catalog={pendingItem} x={hoverXZ.x} z={hoverXZ.z} floorY={floorY} />
      ) : null}

      {editable ? (
        <PlacementPlane
          floorY={floorY}
          onPlace={(x, z) => {
            if (pendingCatalogId) handlePlace(x, z)
            else selectFurniture(null)
          }}
          onHover={pendingCatalogId ? (x, z) => setHoverXZ({ x, z }) : undefined}
        />
      ) : null}
    </>
  )
}
