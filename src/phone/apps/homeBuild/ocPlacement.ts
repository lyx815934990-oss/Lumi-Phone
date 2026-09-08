import { floorPlanCenter } from './floorPlanGeometry'
import type { HomeBuildDraft, OcPlacement } from './types'

/**
 * 解析 OC 在「当前预览层」的位置。
 * 若存档位置不在当前层，则回落到当前层户型中心——保证摆放页一定能看见 OC。
 */
export function resolveOcPlacement(draft: HomeBuildDraft): OcPlacement | null {
  const floor = draft.floors.find((f) => f.id === draft.activeFloorId) ?? draft.floors[0]
  if (!floor) return null

  const center = floorPlanCenter(floor)
  const raw = draft.ocPlacement

  if (
    raw &&
    raw.floorId === floor.id &&
    Number.isFinite(raw.x) &&
    Number.isFinite(raw.z)
  ) {
    return {
      x: raw.x,
      z: raw.z,
      floorId: floor.id,
      rotationY: Number.isFinite(raw.rotationY) ? raw.rotationY : 0,
    }
  }

  return {
    x: center.x,
    z: center.z,
    floorId: floor.id,
    rotationY: 0,
  }
}
