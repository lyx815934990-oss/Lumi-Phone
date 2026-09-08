import { FlipHorizontal2, RotateCw } from 'lucide-react'
import { Pressable } from '../../../components/Pressable'
import { HOME_BUILD } from '../theme'
import { useHomeBuildStore } from '../store'

type Props = {
  onSwitch3D?: () => void
}

export function FloorPlanSidebar({ onSwitch3D }: Props) {
  const rotateFloorPlan = useHomeBuildStore((s) => s.rotateFloorPlan)
  const flipFloorPlan = useHomeBuildStore((s) => s.flipFloorPlan)

  return (
    <div className="hb-plan-sidebar absolute left-2 top-1/2 z-20 flex -translate-y-1/2 flex-col gap-2">
      <Pressable
        className="hb-plan-side-btn"
        onClick={() => rotateFloorPlan('cw')}
        aria-label="旋转户型"
      >
        <RotateCw className="size-5" strokeWidth={1.5} />
        <span>旋转</span>
      </Pressable>
      <Pressable
        className="hb-plan-side-btn"
        onClick={() => flipFloorPlan('x')}
        aria-label="翻转户型"
      >
        <FlipHorizontal2 className="size-5" strokeWidth={1.5} />
        <span>翻转</span>
      </Pressable>
      <Pressable className="hb-plan-side-btn" onClick={onSwitch3D} aria-label="切换3D">
        <span className="text-[13px] font-bold tracking-tight">3D</span>
        <span>预览</span>
      </Pressable>
    </div>
  )
}

export function FloorPlanHint() {
  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-[18%] z-10 text-center text-[15px] font-medium tracking-wide"
      style={{ color: HOME_BUILD.planLabel, textShadow: '0 1px 12px rgba(0,0,0,0.5)' }}
    >
      不仅能自由创建户型
    </div>
  )
}
