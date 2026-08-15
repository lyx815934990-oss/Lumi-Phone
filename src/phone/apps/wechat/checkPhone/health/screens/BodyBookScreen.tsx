import type { BodySection } from '../types'
import { BodyAccordion } from '../components/BodyAccordion'

export function BodyBookScreen({ sections }: { sections: BodySection[] }) {
  if (!sections.length) return <div className="health-empty">暂无全身健康册</div>
  return (
    <div className="px-4 pb-10 pt-1">
      <div className="health-report-cover mb-4">
        <div className="hl-en text-[10px] font-semibold" style={{ color: '#5A6B7A' }}>
          Systemic assessment
        </div>
        <h2 className="mt-2 text-[17px] font-semibold">全身健康评估册</h2>
        <p className="mt-1.5 text-[12px] leading-relaxed" style={{ color: '#8b8b8f' }}>
          共 {sections.length} 个系统章节。点选展开详细评估；手风琴模式，同时仅打开一节。
        </p>
      </div>
      <BodyAccordion sections={sections} />
    </div>
  )
}
