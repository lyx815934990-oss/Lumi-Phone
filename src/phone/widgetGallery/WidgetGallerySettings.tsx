import {
  ADDABLE_WIDGET_KINDS,
  MULTI_INSTANCE_WIDGET_KINDS,
  WIDGET_META,
} from './storage'
import { useWidgetGallery } from './WidgetGalleryContext'
import { DecoText } from './DecoText'

export function WidgetGallerySettings() {
  const { state, setPlacementEnabled, resetToDefault } = useWidgetGallery()

  return (
    <div className="space-y-4">
      <div>
        <DecoText preset="stars" className="text-[12px] text-[#2c2c2e]">
          Dreamcore Widgets
        </DecoText>
        <p className="mt-1 text-[12px] leading-relaxed text-black/50">
          主屏右滑到组件页，长按进入编辑后点右上角 + 即可添加。2×2：拍立得/便签/超级唱片/播放器小号；4×2：三张拍立得、纪念日、相机、播放器中号、黑胶唱机。
        </p>
      </div>

      <div className="space-y-2">
        {ADDABLE_WIDGET_KINDS.length === 0 ? (
          <p className="rounded-[16px] border border-dashed border-black/10 bg-white/50 px-3 py-4 text-center text-[12px] text-black/40">
            暂无已注册组件
          </p>
        ) : null}
        {ADDABLE_WIDGET_KINDS.map((kind) => {
          const meta = WIDGET_META[kind]
          const multi = MULTI_INSTANCE_WIDGET_KINDS.includes(kind)
          const placements = state.placements.filter((p) => p.kind === kind)
          if (!placements.length) return null

          return (
            <div key={kind} className="space-y-2">
              {placements.map((placement, index) => (
                <div
                  key={placement.id}
                  className="rounded-[16px] border border-black/8 bg-white/70 px-3 py-3 shadow-sm backdrop-blur-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-[#2c2c2e]">
                        {meta.title}
                        {multi && placements.length > 1 ? ` · ${index + 1}` : ''}
                      </p>
                      <p className="mt-0.5 text-[11px] text-black/45">{meta.subtitle}</p>
                      <DecoText preset="butterfly" className="mt-1 text-[10px] text-black/40">
                        {meta.decoLabel}
                      </DecoText>
                    </div>
                    <label className="flex shrink-0 items-center gap-1.5 text-[11px] text-black/55">
                      <input
                        type="checkbox"
                        checked={placement.enabled}
                        onChange={(e) => setPlacementEnabled(placement.id, e.target.checked)}
                      />
                      桌面上
                    </label>
                  </div>
                  <div className="mt-2 text-[11px] text-black/40">
                    尺寸 · {placement.size}
                  </div>
                </div>
              ))}
            </div>
          )
        })}
      </div>

      <button
        type="button"
        className="w-full rounded-[14px] border border-black/10 bg-white/80 py-2.5 text-[13px] text-[#2c2c2e]"
        onClick={resetToDefault}
      >
        清空桌面组件（恢复默认）
      </button>
    </div>
  )
}
