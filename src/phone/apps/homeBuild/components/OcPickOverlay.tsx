import { useHomeBuildStore } from '../store'

/** 摆放模式：放置 OC 时的顶部提示 */
export function OcPickOverlay() {
  const ocPicking = useHomeBuildStore((s) => s.ocPicking)

  if (!ocPicking) return null

  return (
    <div className="hb-oc-pick-hint pointer-events-none absolute inset-x-0 top-[max(72px,env(safe-area-inset-top))] z-40 flex justify-center px-4">
      <p className="rounded-full bg-black/60 px-4 py-2.5 text-[12px] font-medium text-white shadow-lg backdrop-blur-sm">
        按住拖动 · 被拎起姿势 · 松手约 2m 下落着地
      </p>
    </div>
  )
}
