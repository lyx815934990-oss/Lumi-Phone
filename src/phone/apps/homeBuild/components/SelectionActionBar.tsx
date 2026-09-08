import { Grid3x3, Hammer, X } from 'lucide-react'
import { worldToScreen, type PlanView } from '../floorPlanView'
import { Pressable } from '../../../components/Pressable'

type Rect = { x: number; z: number; w: number; h: number }

type Props = {
  rect: Rect
  view: PlanView
  onBuildWalls: () => void
  onDemolish: () => void
  onCancel: () => void
}

export function SelectionActionBar({ rect, view, onBuildWalls, onDemolish, onCancel }: Props) {
  const center = worldToScreen({ x: rect.x + rect.w / 2, z: rect.z }, view)
  const top = center.y - 12

  return (
    <div
      className="absolute z-30 flex -translate-x-1/2 -translate-y-full items-center gap-2 rounded-full px-2 py-1.5 shadow-lg"
      style={{
        left: center.x,
        top: Math.max(8, top),
        background: 'rgba(30, 30, 34, 0.95)',
        border: '1px solid rgba(255,255,255,0.12)',
      }}
    >
      <Pressable
        className="flex items-center gap-1.5 rounded-full px-3 py-2 text-[12px] font-medium text-white"
        style={{ background: 'rgba(44, 111, 173, 0.55)' }}
        onClick={onBuildWalls}
      >
        <Grid3x3 className="size-3.5" strokeWidth={1.75} />
        画墙
      </Pressable>
      <Pressable
        className="flex items-center gap-1.5 rounded-full px-3 py-2 text-[12px] font-medium text-white"
        style={{ background: 'rgba(229, 72, 77, 0.55)' }}
        onClick={onDemolish}
      >
        <Hammer className="size-3.5" strokeWidth={1.75} />
        拆墙/地板
      </Pressable>
      <Pressable
        className="flex size-8 items-center justify-center rounded-full"
        style={{ background: 'rgba(255,255,255,0.08)' }}
        onClick={onCancel}
        aria-label="取消"
      >
        <X className="size-3.5 text-white/70" />
      </Pressable>
    </div>
  )
}
