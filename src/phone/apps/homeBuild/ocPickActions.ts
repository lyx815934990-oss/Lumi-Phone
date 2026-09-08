import { floorPlanCenter } from './floorPlanGeometry'
import { OC_PICK_LIFT, setOcPickWorld, snapOcToCellCenter } from './ocPickInput'
import { floorBaseY } from './scene3dUtils'
import type { HomeBuildDraft } from './types'

/** 开始拎起 OC 放置（悬空 + 跟手） */
export function beginOcPickPlacement(
  draft: HomeBuildDraft,
  setOcPicking: (active: boolean) => void,
): void {
  const floor = draft.floors.find((f) => f.id === draft.activeFloorId) ?? draft.floors[0]
  if (!floor) return
  const floorY = floorBaseY(draft, floor.id)
  const placement = draft.ocPlacement
  const rawX = placement?.floorId === floor.id ? placement.x : floorPlanCenter(floor).x
  const rawZ = placement?.floorId === floor.id ? placement.z : floorPlanCenter(floor).z
  const snapped = snapOcToCellCenter(rawX, rawZ)
  setOcPickWorld(snapped.x, floorY + OC_PICK_LIFT, snapped.z)
  setOcPicking(true)
}
