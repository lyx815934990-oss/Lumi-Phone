import { motion } from 'framer-motion'
import type { HealthProfile } from '../types'

const EASE = [0.22, 1, 0.36, 1] as const

const FIELD_META: Array<{ key: keyof HealthProfile; label: string; hint?: string }> = [
  { key: 'age', label: '年龄', hint: '岁' },
  { key: 'height', label: '身高', hint: 'cm / 描述' },
  { key: 'weight', label: '体重', hint: 'kg / 描述' },
  { key: 'bmi', label: 'BMI', hint: '体质指数' },
  { key: 'bloodType', label: '血型', hint: 'ABO / Rh' },
  { key: 'allergies', label: '过敏史', hint: '药物 / 食物等' },
  { key: 'emergencyContact', label: '紧急联系人', hint: '姓名与电话' },
]

export function ProfileScreen({
  profile,
  patientName,
}: {
  profile: HealthProfile
  patientName?: string
}) {
  const who = patientName?.trim() || '患者'
  const rows = FIELD_META.map((f) => ({
    ...f,
    value: String(profile[f.key] ?? '').trim(),
  })).filter((r) => r.value)

  if (!rows.length) {
    return <div className="health-empty">暂无基本信息</div>
  }

  return (
    <motion.div
      className="px-4 pb-12 pt-2"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.36, ease: EASE }}
    >
      <div className="health-info-sheet">
        <div className="health-info-sheet-head">
          <div className="hl-en text-[10px] font-semibold" style={{ color: '#5A6B7A' }}>
            Patient information
          </div>
          <h1 className="mt-2 text-[20px] font-semibold tracking-tight">{who}</h1>
          <p className="mt-1.5 text-[12px] leading-relaxed" style={{ color: '#8b8b8f' }}>
            基本信息单 · 仅供查阅，不可编辑
          </p>
        </div>

        <div className="health-info-sheet-body">
          {rows.map((r, i) => (
            <motion.div
              key={r.key}
              className="health-info-row"
              initial={{ opacity: 0, x: 6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.08 + i * 0.04, duration: 0.28, ease: EASE }}
            >
              <div className="health-info-row-label">
                <span>{r.label}</span>
                {r.hint ? <small>{r.hint}</small> : null}
              </div>
              <div className="health-info-row-value hl-num">{r.value}</div>
            </motion.div>
          ))}
        </div>

        <div className="health-info-sheet-foot">
          <span className="hl-en">CONFIDENTIAL · MEDICAL USE ONLY</span>
        </div>
      </div>
    </motion.div>
  )
}
