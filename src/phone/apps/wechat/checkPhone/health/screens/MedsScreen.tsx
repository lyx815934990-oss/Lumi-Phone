import type { Medication } from '../types'

export function MedsScreen({ meds }: { meds: Medication[] }) {
  if (!meds.length) return <div className="health-empty">暂无用药记录</div>
  return (
    <div className="px-4 pb-10 pt-1">
      <p className="mb-3 text-[12px] leading-relaxed" style={{ color: '#8b8b8f' }}>
        处方式用药清单，仅供查阅，不可核销或改剂量。
      </p>
      <ul className="flex flex-col gap-3">
        {meds.map((m, i) => (
          <li key={m.id} className="health-rx-card">
            <div className="hl-num text-[10px] font-semibold" style={{ color: '#5A6B7A' }}>
              #{String(i + 1).padStart(2, '0')}
            </div>
            <div className="mt-1 text-[16px] font-semibold">{m.name}</div>
            <div className="mt-2 text-[13px] leading-relaxed" style={{ color: '#8b8b8f' }}>
              <span style={{ color: '#5A6B7A', fontWeight: 600 }}>用法 </span>
              {m.dose}
            </div>
            {m.note ? (
              <div
                className="mt-3 rounded-[8px] px-2.5 py-2 text-[12px] leading-relaxed"
                style={{ background: 'rgba(90,107,122,0.08)', color: '#5A6B7A' }}
              >
                {m.note}
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  )
}
