/**
 * 约会剧情 · 系统默认写作板块元数据（与档案室分离）
 *
 * 仅在「系统默认」激活时由
 * `offlineDatingMustInjectPrompts.buildDatingWritingPresetsPrompt` 按 id 拼接。
 * 自定义预设的条目与正文见 `datingWritingPresetStore`。
 */

export type DatingWritingPresetId =
  | 'channelAlign'
  | 'expressionDemeanor'
  | 'proseForbidden'
  | 'zeroMetaphor'
  | 'antiBeastMetaphor'
  | 'antiPerspectiveSpoilerTwist'
  | 'antiSublimationDespair'
  | 'leaveOutletNoConspiracy'

export type DatingWritingPresetToggles = Partial<Record<DatingWritingPresetId, boolean>>

export type DatingWritingPresetMeta = {
  id: DatingWritingPresetId
  title: string
  description: string
  /** 与改造前「默认总是注入」对齐，首期默认全开 */
  defaultOn: boolean
}

/** 列表 / 注入顺序 */
export const DATING_WRITING_PRESETS: DatingWritingPresetMeta[] = [
  {
    id: 'channelAlign',
    title: '通道对齐·人际核心',
    description: '线下沿用微信核心层：Char–User 平等、反下头、边界与同意等（IM 气泡格式忽略）。',
    defaultOn: true,
  },
  {
    id: 'expressionDemeanor',
    title: '神态与情绪外化',
    description: '可见神态/微反应、Show don’t tell、内心 OS 篇幅与平等铁律。',
    defaultOn: true,
  },
  {
    id: 'proseForbidden',
    title: '写作禁词表',
    description: '线下/VN 文风与完整程序扫描词表、抽象隐喻黑名单、唯二范文句法。',
    defaultOn: true,
  },
  {
    id: 'zeroMetaphor',
    title: '零比喻·去像似滤镜',
    description: '总规则原「禁比喻与像似滤镜」：禁止像/仿佛/宛如等搭桥句。',
    defaultOn: true,
  },
  {
    id: 'antiBeastMetaphor',
    title: '禁猎物野兽隐喻',
    description: '总规则原条：猎人猎物、小兽困兽、捕食目光、动物拟声等一律不用。',
    defaultOn: true,
  },
  {
    id: 'antiPerspectiveSpoilerTwist',
    title: '防透视·防剧透·防硬拗',
    description: '总规则原第七节：只认已说已做、秘密渐进、禁无故硬切换场。',
    defaultOn: true,
  },
  {
    id: 'antiSublimationDespair',
    title: '防升华·防绝望',
    description: '总规则原第八节：禁文末鸡汤收束；默认不逼入无解死局。',
    defaultOn: true,
  },
  {
    id: 'leaveOutletNoConspiracy',
    title: '留出路·反阴谋死局',
    description: '总规则原第六节相关：禁永久重伤死亡硬拗、禁无铺垫恶意阴谋操控日常恋爱。',
    defaultOn: true,
  },
]

export function defaultDatingWritingPresetToggles(): Record<DatingWritingPresetId, boolean> {
  const out = {} as Record<DatingWritingPresetId, boolean>
  for (const p of DATING_WRITING_PRESETS) out[p.id] = p.defaultOn
  return out
}

export function resolveDatingWritingPresetToggles(
  raw?: DatingWritingPresetToggles | null,
): Record<DatingWritingPresetId, boolean> {
  const out = defaultDatingWritingPresetToggles()
  if (!raw) return out
  for (const p of DATING_WRITING_PRESETS) {
    if (typeof raw[p.id] === 'boolean') out[p.id] = raw[p.id]!
  }
  return out
}

export function applyDatingWritingPresetToggle(
  current: DatingWritingPresetToggles,
  id: DatingWritingPresetId,
  enabled: boolean,
): Record<DatingWritingPresetId, boolean> {
  const next = { ...resolveDatingWritingPresetToggles(current) }
  next[id] = enabled
  return next
}
