import { ChevronRight } from 'lucide-react'
import type { CheckupReport, CheckupVitals } from '../types'
import { LAB_FLAG_LABEL } from '../types'

export function CheckupsScreen({
  checkups,
  onOpen,
}: {
  checkups: CheckupReport[]
  onOpen: (id: string) => void
}) {
  if (!checkups.length) return <div className="health-empty">暂无体检报告</div>
  return (
    <div className="px-4 pb-10 pt-1">
      <p className="mb-3 text-[12px] leading-relaxed" style={{ color: '#8b8b8f' }}>
        体检机构出具的报告封面，点开查看基础体征与指标明细。
      </p>
      <ul className="flex flex-col gap-3">
        {checkups.map((c) => {
          const v = c.vitals
          const tip = [v?.bmi ? `BMI ${v.bmi}` : null, v?.bloodSugar ? `血糖 ${v.bloodSugar}` : null]
            .filter(Boolean)
            .join(' · ')
          return (
            <li key={c.id}>
              <button type="button" className="health-checkup-card" onClick={() => onOpen(c.id)}>
                <div className="health-checkup-mark">LAB</div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14px] font-semibold">{c.orgName}</div>
                  <div className="mt-1 text-[12px]" style={{ color: '#8b8b8f' }}>
                    {c.packageName}
                  </div>
                  <div className="hl-num mt-1 text-[11px]" style={{ color: '#5A6B7A' }}>
                    {c.dateLabel} · {c.labs.length} 项
                    {tip ? ` · ${tip}` : ''}
                  </div>
                </div>
                <ChevronRight size={16} style={{ color: '#8b8b8f' }} />
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function vitalsEntries(v: CheckupVitals | undefined): Array<{ label: string; value: string }> {
  if (!v) return []
  return [
    v.age ? { label: '年龄', value: v.age } : null,
    v.height ? { label: '身高', value: v.height } : null,
    v.weight ? { label: '体重', value: v.weight } : null,
    v.bmi ? { label: 'BMI', value: v.bmi } : null,
    v.bloodSugar ? { label: '血糖', value: v.bloodSugar } : null,
    v.bodyFat ? { label: '体脂率', value: v.bodyFat } : null,
    v.bloodPressure ? { label: '血压', value: v.bloodPressure } : null,
  ].filter(Boolean) as Array<{ label: string; value: string }>
}

export function CheckupDetailScreen({ report }: { report: CheckupReport }) {
  const abnormal = report.labs.filter((l) => l.flag !== 'normal').length
  const vitals = vitalsEntries(report.vitals)

  return (
    <div className="px-4 pb-12 pt-2">
      <div className="health-report-cover">
        <div className="hl-en text-[10px] font-semibold" style={{ color: '#5A6B7A' }}>
          Health checkup
        </div>
        <h1 className="mt-2 text-[20px] font-semibold leading-snug">{report.orgName}</h1>
        <div className="mt-4 health-meta-grid">
          <div className="health-meta-cell">
            <div className="health-meta-label">套餐</div>
            <div className="health-meta-value">{report.packageName}</div>
          </div>
          <div className="health-meta-cell">
            <div className="health-meta-label">日期</div>
            <div className="health-meta-value hl-num">{report.dateLabel}</div>
          </div>
          <div className="health-meta-cell">
            <div className="health-meta-label">指标数</div>
            <div className="health-meta-value hl-num">{report.labs.length}</div>
          </div>
          <div className="health-meta-cell">
            <div className="health-meta-label">需关注</div>
            <div className="health-meta-value hl-num">{abnormal}</div>
          </div>
        </div>
      </div>

      {vitals.length ? (
        <>
          <div className="health-section-label">
            <span>基础体征</span>
          </div>
          <div className="health-vitals-grid">
            {vitals.map((item) => (
              <div key={item.label} className="health-vital-chip">
                <small>{item.label}</small>
                <strong className="hl-num">{item.value}</strong>
              </div>
            ))}
          </div>
        </>
      ) : null}

      <div className="health-section-label">
        <span>检验明细</span>
      </div>
      <div className="health-lab-wrap">
        <div className="health-lab-row health-lab-head">
          <span>项目</span>
          <span>结果</span>
          <span>参考</span>
          <span>提示</span>
        </div>
        {report.labs.map((lab, i) => (
          <div key={`${lab.name}-${i}`} className="health-lab-row">
            <span>{lab.name}</span>
            <span className="hl-num font-medium">{lab.value}</span>
            <span className="hl-num" style={{ color: '#8b8b8f' }}>
              {lab.refRange}
            </span>
            <span className="health-flag" data-flag={lab.flag}>
              {LAB_FLAG_LABEL[lab.flag]}
            </span>
          </div>
        ))}
      </div>

      <div className="health-section-label">
        <span>总检意见</span>
      </div>
      <div className="health-chart">
        <div className="health-chart-head">
          <strong>结论与建议</strong>
          <span>Summary</span>
        </div>
        <div className="health-chart-pad">
          <div className="health-field">
            <div className="health-field-label">总检结论</div>
            <div className="health-field-value">{report.summary}</div>
          </div>
          <div className="health-field">
            <div className="health-field-label">建议</div>
            <div className="health-field-value">{report.advice}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
