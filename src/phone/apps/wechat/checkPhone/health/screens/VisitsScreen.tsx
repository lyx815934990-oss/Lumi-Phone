import { ChevronRight } from 'lucide-react'
import type { HealthVisit } from '../types'

/** 从文案里尽量抽出可展示的短日期；失败则用序号感占位 */
function dateBits(label: string, index: number): { day: string; sub: string } {
  const m = label.match(/(\d{1,2})\s*[月/.-]\s*(\d{1,2})/)
  if (m) return { day: m[2]!.padStart(2, '0'), sub: `${m[1]}月` }
  const d = label.match(/(\d{1,2})\s*日/)
  if (d) return { day: d[1]!.padStart(2, '0'), sub: '日' }
  if (/今天|今日/.test(label)) return { day: '今', sub: '天' }
  if (/昨天|昨日/.test(label)) return { day: '昨', sub: '天' }
  return { day: String(index + 1).padStart(2, '0'), sub: '次' }
}

export function VisitsScreen({
  visits,
  onOpen,
}: {
  visits: HealthVisit[]
  onOpen: (id: string) => void
}) {
  if (!visits.length) return <div className="health-empty">暂无就诊记录</div>
  return (
    <div className="px-4 pb-10 pt-1">
      <p className="mb-3 text-[12px] leading-relaxed" style={{ color: '#8b8b8f' }}>
        按时间排列的门诊病历封面，点开查看完整记录。
      </p>
      <div className="health-visit-list">
        {visits.map((v, i) => {
          const bits = dateBits(v.visitedAtLabel, i)
          return (
            <button key={v.id} type="button" className="health-visit-card" onClick={() => onOpen(v.id)}>
              <div className="health-visit-date">
                <span className="hl-num">{bits.day}</span>
                <small>{bits.sub}</small>
              </div>
              <div className="health-visit-main">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-[14px] font-semibold">{v.hospital}</div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <span className="health-dept-tag">{v.department}</span>
                      <span className="hl-num text-[11px]" style={{ color: '#8b8b8f' }}>
                        {v.visitedAtLabel}
                      </span>
                    </div>
                  </div>
                  <ChevronRight size={16} className="mt-0.5 shrink-0" style={{ color: '#8b8b8f' }} />
                </div>
                <div className="mt-2.5 line-clamp-2 text-[12px] leading-relaxed" style={{ color: '#5A6B7A' }}>
                  {v.diagnosis}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function VisitDetailScreen({ visit }: { visit: HealthVisit }) {
  return (
    <div className="px-4 pb-12 pt-2">
      <div className="health-dossier-hero">
        <div className="hl-en text-[10px] font-semibold" style={{ color: '#5A6B7A' }}>
          Outpatient chart
        </div>
        <h1 className="relative z-[1] mt-2 text-[20px] font-semibold leading-snug">{visit.hospital}</h1>
        <div className="relative z-[1] mt-4 health-meta-grid">
          <div className="health-meta-cell">
            <div className="health-meta-label">科室</div>
            <div className="health-meta-value">{visit.department}</div>
          </div>
          <div className="health-meta-cell">
            <div className="health-meta-label">就诊时间</div>
            <div className="health-meta-value hl-num">{visit.visitedAtLabel}</div>
          </div>
          <div className="health-meta-cell">
            <div className="health-meta-label">医生</div>
            <div className="health-meta-value">{visit.doctor || '未注明'}</div>
          </div>
          <div className="health-meta-cell">
            <div className="health-meta-label">记录类型</div>
            <div className="health-meta-value">门诊病历</div>
          </div>
        </div>
      </div>

      <div className="health-section-label">
        <span>病历正文</span>
      </div>
      <div className="health-chart">
        <div className="health-chart-head">
          <strong>临床记录</strong>
          <span>Clinical note</span>
        </div>
        <div className="health-chart-pad">
          <div className="health-field">
            <div className="health-field-label">主诉</div>
            <div className="health-field-value">{visit.chiefComplaint}</div>
          </div>

          <div className="health-field">
            <div className="health-field-label">检查项目</div>
            {visit.exams.length ? (
              <div className="health-exam-table">
                {visit.exams.map((e, i) => (
                  <div key={`${e.name}-${i}`} className="health-exam-row">
                    <strong>{e.name}</strong>
                    <span>{e.result || '—'}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="health-field-value" style={{ color: '#8b8b8f' }}>
                未记录检查
              </div>
            )}
          </div>

          <div className="health-field" style={{ borderBottom: 0, paddingBottom: 0 }}>
            <div className="health-dx-box">
              <div className="health-dx-stamp">诊断</div>
              <div className="health-field-label">诊断印象</div>
              <div className="health-field-value pr-10">{visit.diagnosis}</div>
            </div>
          </div>

          <div className="health-field">
            <div className="health-field-label">医嘱 / 建议</div>
            <div className="health-field-value">{visit.advice}</div>
          </div>

          {visit.followUp ? (
            <div className="health-field">
              <div className="health-field-label">复诊</div>
              <div className="health-field-value">{visit.followUp}</div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
