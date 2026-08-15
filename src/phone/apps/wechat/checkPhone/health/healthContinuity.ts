import { hasHealthContent, type HealthDataset, type HealthProfile } from './types'

/** 压缩既有档案，供再生成时锚定 */
export function formatHealthContinuityBrief(data: HealthDataset | null | undefined): string {
  if (!data) return ''
  const hasProfile = Object.values(data.profile || {}).some((v) => String(v || '').trim())
  if (!hasHealthContent(data) && !hasProfile) return ''

  const lines: string[] = [
    '【既有健康档案·连续性锚定】',
    '下列为已生成过的档案摘要。新一轮必须延续这些硬事实，禁止无故改写冲突（尤其血型、过敏、身高体重量级、已出现的确诊/用药）。',
    '可以：按近期剧情**新增**后续就诊/面诊/用药/体检；微调表述；推进随访。',
    '不可以：把血型换成另一种、否认已有过敏、把已有就诊诊断改成完全无关的另一套病史。',
  ]

  const p = data.profile || {}
  const profileBits = [
    p.age ? `年龄=${p.age}` : '',
    p.height ? `身高=${p.height}` : '',
    p.weight ? `体重=${p.weight}` : '',
    p.bmi ? `BMI=${p.bmi}` : '',
    p.bloodType ? `血型=${p.bloodType}` : '',
    p.allergies ? `过敏=${p.allergies}` : '',
    p.emergencyContact ? `紧急联系=${p.emergencyContact}` : '',
  ].filter(Boolean)
  if (profileBits.length) {
    lines.push(`基本信息（须保持一致）：${profileBits.join('；')}`)
  }

  const visits = (data.visits || []).slice(0, 8)
  if (visits.length) {
    lines.push('既有就诊（保留核心事实，可增新条）：')
    for (const v of visits) {
      lines.push(
        `- ${v.visitedAtLabel}｜${v.hospital}/${v.department}｜诊断：${v.diagnosis.slice(0, 40)}${v.diagnosis.length > 40 ? '…' : ''}`,
      )
    }
  }

  const meds = (data.medications || []).slice(0, 10)
  if (meds.length) {
    lines.push(
      `既有用药：${meds.map((m) => `${m.name}${m.dose ? `(${m.dose})` : ''}`).join('、')}`,
    )
  }

  const consults = (data.consults || []).slice(0, 5)
  if (consults.length) {
    lines.push(
      `既有面诊主题：${consults.map((c) => `${c.consultedAtLabel} ${c.topic.slice(0, 24)}`).join('；')}`,
    )
  }

  const checkups = (data.checkups || []).slice(0, 3)
  if (checkups.length) {
    lines.push(
      `既有体检：${checkups.map((c) => `${c.dateLabel} ${c.orgName}/${c.packageName}`).join('；')}`,
    )
  }

  return lines.join('\n')
}

function lockProfileField(
  next: HealthProfile,
  prev: HealthProfile,
  key: keyof HealthProfile,
): void {
  const old = String(prev[key] ?? '').trim()
  if (old) next[key] = old
}

/**
 * 程序侧锁定体质硬字段，避免模型偶发改写血型等。
 * 就诊/用药仍以模型新稿为主（提示词已要求参考历史）。
 */
export function applyHealthContinuityLock(
  next: HealthDataset,
  prev: HealthDataset | null | undefined,
): HealthDataset {
  if (!prev) return next
  const profile: HealthProfile = { ...next.profile }
  lockProfileField(profile, prev.profile, 'bloodType')
  lockProfileField(profile, prev.profile, 'allergies')
  lockProfileField(profile, prev.profile, 'emergencyContact')
  lockProfileField(profile, prev.profile, 'age')
  lockProfileField(profile, prev.profile, 'height')
  lockProfileField(profile, prev.profile, 'weight')
  lockProfileField(profile, prev.profile, 'bmi')
  return { ...next, profile }
}
