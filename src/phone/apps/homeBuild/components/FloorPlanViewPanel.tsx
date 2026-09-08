import { Hand, Maximize2, Minus, Plus, RotateCcw, Ruler } from 'lucide-react'
import {
  clampPlanGridSize,
  PLAN_GRID_DEFAULT,
  PLAN_GRID_MAX,
} from '../defaults'
import { formatAreaM2, floorAreaM2, homeAreaM2, roomAreaM2 } from '../floorPlanArea'
import { clampZoom, PLAN_ZOOM_DEFAULT, zoomPercentLabel, type PlanView } from '../floorPlanView'
import { WALL_HEIGHT_MAX, WALL_HEIGHT_MIN } from '../sceneConstants'
import { wallHeightOf } from '../scene3dUtils'
import { activeFloor, useHomeBuildStore } from '../store'

type Props = {
  view: PlanView
  panMode: boolean
  onTogglePanMode: () => void
  onZoom: (scale: number) => void
  onResetView: () => void
}

export function FloorPlanViewPanel({ view, panMode, onTogglePanMode, onZoom, onResetView }: Props) {
  const draft = useHomeBuildStore((s) => s.draft)
  const expandPlanGrid = useHomeBuildStore((s) => s.expandPlanGrid)
  const setActiveFloorWallHeight = useHomeBuildStore((s) => s.setActiveFloorWallHeight)
  const pushHistory = useHomeBuildStore((s) => s.pushHistory)
  const selectedRoomId = useHomeBuildStore((s) => s.selectedRoomId)
  const floor = activeFloor(draft)
  const floorArea = floorAreaM2(floor)
  const totalArea = homeAreaM2(draft)
  const selectedRoom = floor.rooms.find((r) => r.id === selectedRoomId)
  const gridSize = clampPlanGridSize(draft.planGridSize ?? PLAN_GRID_DEFAULT)
  const canExpand = gridSize < PLAN_GRID_MAX
  const wallHeight = wallHeightOf(floor)

  return (
    <div className="hb-plan-view-panel pointer-events-auto absolute right-2 top-2 z-30 flex flex-col gap-2">
      <div className="hb-plan-area-card rounded-2xl px-3 py-2.5">
        <div className="mb-1.5 flex items-center gap-1.5 text-[10px] text-white/50">
          <Ruler className="size-3" strokeWidth={1.75} />
          建筑面积
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-[18px] font-semibold tabular-nums text-white">{formatAreaM2(floorArea)}</span>
          <span className="text-[11px] text-white/55">㎡ 本层</span>
        </div>
        {draft.floors.length > 1 ? (
          <p className="mt-0.5 text-[10px] tabular-nums text-white/45">全楼 {formatAreaM2(totalArea)} ㎡</p>
        ) : null}
        {selectedRoom ? (
          <p className="mt-1 border-t border-white/10 pt-1 text-[10px] text-white/60">
            {selectedRoom.name} {formatAreaM2(roomAreaM2(selectedRoom))} ㎡
          </p>
        ) : null}
      </div>

      <div className="hb-plan-area-card rounded-2xl px-3 py-2.5">
        <div className="mb-1.5 flex items-center justify-between text-[10px] text-white/50">
          <span>{floor.label} 墙高</span>
          <span className="tabular-nums text-white/70">{wallHeight.toFixed(2)} m</span>
        </div>
        <input
          type="range"
          min={WALL_HEIGHT_MIN}
          max={WALL_HEIGHT_MAX}
          step={0.05}
          value={wallHeight}
          className="hb-walk-speed-slider w-full"
          aria-label={`${floor.label}墙体高度`}
          title="仅影响当前选中楼层；上层楼板会随下层墙高抬升"
          onPointerDown={() => pushHistory()}
          onChange={(e) => setActiveFloorWallHeight(Number.parseFloat(e.target.value))}
        />
        <p className="mt-1 text-[9px] leading-relaxed text-white/35">
          每层可单独设置 · 切换顶部楼层后再调
        </p>
      </div>

      <button
        type="button"
        className="hb-plan-area-card flex items-center justify-between gap-2 rounded-2xl px-3 py-2 text-left disabled:opacity-45"
        disabled={!canExpand}
        onClick={() => expandPlanGrid()}
        title={canExpand ? '扩大可建造网格' : '已达最大网格'}
      >
        <span className="flex items-center gap-1.5 text-[11px] text-white/80">
          <Maximize2 className="size-3.5 text-sky-300" strokeWidth={2} />
          扩建场地
        </span>
        <span className="text-[10px] tabular-nums text-white/45">
          {gridSize}×{gridSize}m
          {canExpand ? ' · +4' : ' · 最大'}
        </span>
      </button>

      <div className="hb-plan-zoom-card flex items-center gap-1 rounded-2xl px-2 py-1.5">
        <button
          type="button"
          className="hb-plan-zoom-btn"
          data-active={panMode}
          onClick={onTogglePanMode}
          aria-label="移动画面"
          title="单指拖动画布"
        >
          <Hand className="size-4" strokeWidth={2} />
        </button>
        <button
          type="button"
          className="hb-plan-zoom-btn"
          onClick={() => onZoom(clampZoom(view.scale / 1.2))}
          aria-label="缩小"
        >
          <Minus className="size-4" strokeWidth={2} />
        </button>
        <button
          type="button"
          className="hb-plan-zoom-label min-w-[44px] text-center text-[11px] tabular-nums text-white/75"
          onClick={onResetView}
          title="重置缩放"
        >
          {zoomPercentLabel(view.scale)}
        </button>
        <button
          type="button"
          className="hb-plan-zoom-btn"
          onClick={() => onZoom(clampZoom(view.scale * 1.2))}
          aria-label="放大"
        >
          <Plus className="size-4" strokeWidth={2} />
        </button>
        {view.scale !== PLAN_ZOOM_DEFAULT || view.panX !== 0 || view.panY !== 0 ? (
          <button type="button" className="hb-plan-zoom-btn ml-0.5" onClick={onResetView} aria-label="重置视图">
            <RotateCcw className="size-3.5" strokeWidth={2} />
          </button>
        ) : null}
      </div>
    </div>
  )
}
