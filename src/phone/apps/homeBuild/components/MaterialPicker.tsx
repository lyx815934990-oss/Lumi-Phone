import { useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { Pressable } from '../../../components/Pressable'
import {
  FLOOR_MATERIAL_FAMILIES,
  floorMaterialsByFamily,
  type FloorMaterialFamily,
  LEGACY_FLOOR_MATERIAL_IDS,
  WALL_MATERIALS,
} from '../defaults'
import { HOME_BUILD } from '../theme'
import { useHomeBuildStore } from '../store'

function resolveFloorMaterialId(id?: string): string | undefined {
  if (!id) return id
  return LEGACY_FLOOR_MATERIAL_IDS[id] ?? id
}

export function MaterialPicker() {
  const materialOpen = useHomeBuildStore((s) => s.materialOpen)
  const materialTarget = useHomeBuildStore((s) => s.materialTarget)
  const selectedFloorTiles = useHomeBuildStore((s) => s.selectedFloorTiles)
  const selectedWallSegments = useHomeBuildStore((s) => s.selectedWallSegments)
  const draft = useHomeBuildStore((s) => s.draft)
  const setMaterialOpen = useHomeBuildStore((s) => s.setMaterialOpen)
  const applyFloorTileMaterial = useHomeBuildStore((s) => s.applyFloorTileMaterial)
  const applyWallSegmentMaterial = useHomeBuildStore((s) => s.applyWallSegmentMaterial)
  const clearFloorTileSelection = useHomeBuildStore((s) => s.clearFloorTileSelection)
  const clearWallSegmentSelection = useHomeBuildStore((s) => s.clearWallSegmentSelection)
  const save = useHomeBuildStore((s) => s.save)

  const [floorFamily, setFloorFamily] = useState<FloorMaterialFamily>('wood')

  const floor = draft.floors.find((f) => f.id === draft.activeFloorId)

  const floorMode = materialTarget === 'floor' && selectedFloorTiles.length > 0
  const wallMode = materialTarget === 'wall' && selectedWallSegments.length > 0
  const canShow = materialOpen && (floorMode || wallMode)

  const familySwatches = useMemo(() => floorMaterialsByFamily(floorFamily), [floorFamily])

  const activeFloorId = useMemo(() => {
    if (!floorMode || !selectedFloorTiles.length || !floor) return undefined
    const first = selectedFloorTiles[0]!
    const painted = floor.floorTileMaterials?.find((t) => t.x === first.x && t.z === first.z)
    return resolveFloorMaterialId(painted?.materialId)
  }, [floor, floorMode, selectedFloorTiles])

  const activeWallId = useMemo(() => {
    if (!wallMode || !selectedWallSegments.length || !floor) return undefined
    const first = selectedWallSegments[0]!
    const painted = floor.wallSegmentMaterials?.find(
      (s) => s.wallId === first.wallId && s.t0 === first.t0 && s.t1 === first.t1,
    )
    return painted?.materialId
  }, [floor, wallMode, selectedWallSegments])

  if (!canShow) return null

  const pickFloor = (materialId: string) => {
    applyFloorTileMaterial(materialId)
    save()
  }

  const pickWall = (materialId: string) => {
    applyWallSegmentMaterial(materialId)
    save()
  }

  const close = () => {
    setMaterialOpen(false)
    clearFloorTileSelection()
    clearWallSegmentSelection()
  }

  return (
    <div className="absolute inset-0 z-40 flex flex-col justify-end">
      <Pressable className="absolute inset-0 bg-black/40" onClick={close} aria-label="关闭">
        <span className="sr-only">关闭</span>
      </Pressable>
      <div className="hb-drawer relative max-h-[70vh] overflow-y-auto px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-1">
        <div className="hb-drawer-handle" />
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-[14px] font-semibold" style={{ color: HOME_BUILD.ink }}>
              {materialTarget === 'floor'
                ? `地板装修 · ${selectedFloorTiles.length} 格`
                : `墙面装修 · ${selectedWallSegments.length} 段`}
            </p>
            <p className="text-[11px]" style={{ color: HOME_BUILD.mist }}>
              {materialTarget === 'floor'
                ? '选择材质与颜色，应用到已选地砖'
                : '选择墙面材质，应用到已选墙段'}
            </p>
          </div>
          <Pressable className="hb-toolbar-btn" onClick={close}>
            <X className="size-4" />
          </Pressable>
        </div>

        {materialTarget === 'wall' ? (
          <div className="grid grid-cols-3 gap-3">
            {WALL_MATERIALS.map((s) => (
              <Pressable key={s.id} className="flex flex-col gap-1.5" onClick={() => pickWall(s.id)}>
                <div
                  className="aspect-square rounded-xl border-2"
                  style={{
                    background: s.preview,
                    borderColor: activeWallId === s.id ? HOME_BUILD.blueprint : 'transparent',
                  }}
                />
                <span className="text-center text-[11px]" style={{ color: HOME_BUILD.mist }}>
                  {s.name}
                </span>
              </Pressable>
            ))}
          </div>
        ) : (
          <>
            <div className="mb-3 flex flex-wrap gap-2">
              {FLOOR_MATERIAL_FAMILIES.map((f) => (
                <Pressable
                  key={f.id}
                  className="rounded-full px-3 py-1.5 text-[12px] font-medium"
                  style={{
                    background: floorFamily === f.id ? HOME_BUILD.blueprint : HOME_BUILD.blueprintSoft,
                    color: floorFamily === f.id ? '#fff' : HOME_BUILD.blueprint,
                  }}
                  onClick={() => setFloorFamily(f.id)}
                >
                  {f.label}
                </Pressable>
              ))}
            </div>

            <div className="grid grid-cols-4 gap-2.5">
              {familySwatches.map((s) => (
                <Pressable key={s.id} className="flex flex-col gap-1" onClick={() => pickFloor(s.id)}>
                  <div
                    className="aspect-square rounded-xl border-2"
                    style={{
                      background: s.preview,
                      borderColor: activeFloorId === s.id ? HOME_BUILD.blueprint : 'transparent',
                    }}
                  />
                  <span className="text-center text-[10px] leading-tight" style={{ color: HOME_BUILD.mist }}>
                    {s.name}
                  </span>
                </Pressable>
              ))}
            </div>

            <p className="mt-3 text-[10px] leading-relaxed text-white/45">
              提示：单点或框选地砖后在此选材质；「草地」适合户外，「水池」适合泳池/景观水景区域。
            </p>
          </>
        )}

        {materialTarget === 'wall' ? (
          <p className="mt-3 text-[10px] leading-relaxed text-white/45">
            提示：点击或沿墙体拖动选择 1m 墙段，再选材质；未单独刷的墙段沿用相邻房间默认色。
          </p>
        ) : null}
      </div>
    </div>
  )
}
