import { motion } from 'framer-motion'
import {
  ChevronRight,
  ClipboardList,
  FileHeart,
  MessageSquare,
  Pill,
  Stethoscope,
} from 'lucide-react'
import type { HealthDataset, HealthScreen } from '../types'

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
}

const item = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const },
  },
}

const QUICK: Array<{
  screen: Extract<HealthScreen, { kind: 'visits' | 'consults' | 'body' | 'checkups' | 'meds' }>
  title: string
  desc: string
  Icon: typeof Stethoscope
}> = [
  { screen: { kind: 'visits' }, title: '就诊记录', desc: '门诊与检查明细', Icon: Stethoscope },
  { screen: { kind: 'consults' }, title: '面诊记录', desc: '病案单与问诊对话', Icon: MessageSquare },
  { screen: { kind: 'body' }, title: '全身健康册', desc: '十系统手风琴评估', Icon: FileHeart },
  { screen: { kind: 'checkups' }, title: '体检报告', desc: '指标与总检结论', Icon: ClipboardList },
  { screen: { kind: 'meds' }, title: '用药医嘱', desc: '处方与备注', Icon: Pill },
]

export function HomeScreen({
  data,
  characterName,
  onNavigate,
}: {
  data: HealthDataset
  characterName?: string
  onNavigate: (screen: HealthScreen) => void
}) {
  const who = characterName?.trim() || 'TA'
  const latest =
    (data.latestVisitId && data.visits.find((v) => v.id === data.latestVisitId)) || data.visits[0] || null

  const chips = [
    data.profile.age ? { label: '年龄', value: data.profile.age } : null,
    data.profile.height ? { label: '身高', value: data.profile.height } : null,
    data.profile.weight ? { label: '体重', value: data.profile.weight } : null,
    data.profile.bmi ? { label: 'BMI', value: data.profile.bmi } : null,
    data.profile.bloodType ? { label: '血型', value: data.profile.bloodType } : null,
    data.profile.allergies ? { label: '过敏', value: data.profile.allergies } : null,
    data.profile.emergencyContact ? { label: '紧急联系', value: data.profile.emergencyContact } : null,
  ].filter(Boolean) as Array<{ label: string; value: string }>

  return (
    <motion.div
      className="px-4 pb-10 pt-2"
      variants={stagger}
      initial="hidden"
      animate="show"
    >
      <motion.div className="health-dossier-hero" variants={item}>
        <div className="hl-en text-[10px] font-semibold" style={{ color: '#5A6B7A' }}>
          Health dossier
        </div>
        <h1 className="relative z-[1] mt-2 text-[22px] font-semibold tracking-tight">{who}的健康档案</h1>
        <p className="relative z-[1] mt-1.5 text-[12px] leading-relaxed" style={{ color: '#8b8b8f' }}>
          电子病历夹 · 就诊 / 面诊 / 体检 / 全身评估 · 仅供查阅
        </p>
        <div className="relative z-[1] mt-4 flex flex-wrap gap-2 text-[11px]" style={{ color: '#5A6B7A' }}>
          {[
            `就诊 ${data.visits.length}`,
            `面诊 ${data.consults?.length ?? 0}`,
            `体检 ${data.checkups.length}`,
            `用药 ${data.medications.length}`,
          ].map((label) => (
            <motion.span
              key={label}
              className="rounded-full border px-2.5 py-0.5"
              style={{ borderColor: 'rgba(90,107,122,0.25)' }}
              whileTap={{ scale: 0.96 }}
            >
              {label}
            </motion.span>
          ))}
        </div>
      </motion.div>

      {chips.length ? (
        <motion.div variants={item}>
          <button
            type="button"
            className="health-section-label health-section-label--link"
            onClick={() => onNavigate({ kind: 'profile' })}
          >
            <span>基本信息</span>
            <i className="health-section-rule" aria-hidden />
            <em>
              查看信息单
              <ChevronRight size={14} strokeWidth={1.8} aria-hidden />
            </em>
          </button>
          <button
            type="button"
            className="health-profile-strip health-profile-strip--tap"
            style={{
              gridTemplateColumns: `repeat(${Math.min(4, Math.max(2, chips.length))}, minmax(0, 1fr))`,
            }}
            onClick={() => onNavigate({ kind: 'profile' })}
            aria-label="查看基本信息单"
          >
            {chips.map((c, i) => (
              <motion.div
                key={c.label}
                className="health-profile-chip"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.12 + i * 0.04, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              >
                <small>{c.label}</small>
                <strong title={c.value}>{c.value}</strong>
              </motion.div>
            ))}
          </button>
        </motion.div>
      ) : null}

      {latest ? (
        <motion.div variants={item}>
          <div className="health-section-label">
            <span>最近就诊</span>
          </div>
          <motion.button
            type="button"
            className="health-case-card"
            onClick={() => onNavigate({ kind: 'visit', visitId: latest.id })}
            whileTap={{ scale: 0.985 }}
            transition={{ type: 'spring', stiffness: 420, damping: 28 }}
          >
            <div className="health-case-bar" />
            <div className="health-case-body">
              <div className="health-case-kicker">Latest visit</div>
              <div className="mt-2 text-[16px] font-semibold leading-snug">{latest.hospital}</div>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className="health-dept-tag">{latest.department}</span>
                <span className="hl-num text-[11px]" style={{ color: '#8b8b8f' }}>
                  {latest.visitedAtLabel}
                </span>
              </div>
              <div
                className="mt-3 rounded-[10px] px-3 py-2 text-[12px] leading-relaxed"
                style={{ background: 'rgba(90,107,122,0.08)' }}
              >
                <span style={{ color: '#5A6B7A', fontWeight: 600 }}>诊断 </span>
                {latest.diagnosis}
              </div>
            </div>
            <ChevronRight size={16} className="mr-3 self-center shrink-0" style={{ color: '#8b8b8f' }} />
          </motion.button>
        </motion.div>
      ) : null}

      <motion.div variants={item}>
        <div className="health-section-label">
          <span>档案目录</span>
        </div>
        <div className="health-quick-row">
          {QUICK.map(({ screen, title, desc, Icon }, i) => (
            <motion.button
              key={screen.kind}
              type="button"
              className="health-quick-item"
              onClick={() => onNavigate(screen)}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18 + i * 0.045, duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
              whileTap={{ scale: 0.97 }}
              whileHover={{ y: -1 }}
            >
              <span className="health-quick-icon">
                <Icon size={18} strokeWidth={1.6} />
              </span>
              <strong>{title}</strong>
              <em>{desc}</em>
            </motion.button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  )
}
