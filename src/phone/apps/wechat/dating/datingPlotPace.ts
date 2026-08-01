/** 线下约会：本轮剧情时间推进跨度（非字数、非语速） */

export type DatingPlotPacePreset = 'auto' | 'slow' | 'medium' | 'fast' | 'custom'
export type DatingPlotPaceUnit = 'hour' | 'day' | 'month' | 'year'

export type DatingPlotPaceSettings = {
  preset: DatingPlotPacePreset
  /** 仅 custom：数值（正数） */
  customAmount?: number
  customUnit?: DatingPlotPaceUnit
}

export const DATING_PLOT_PACE_PRESET_OPTIONS: Array<{
  id: DatingPlotPacePreset
  label: string
  hint: string
}> = [
  { id: 'auto', label: '自动', hint: '由模型按剧情自行把握' },
  { id: 'slow', label: '慢速', hint: '数小时～一天内' },
  { id: 'medium', label: '中速', hint: '数天～约一个月内' },
  { id: 'fast', label: '快速', hint: '数月～数年' },
  { id: 'custom', label: '自定义', hint: '自定跨度' },
]

export const DATING_PLOT_PACE_UNIT_OPTIONS: Array<{ id: DatingPlotPaceUnit; label: string }> = [
  { id: 'hour', label: '小时' },
  { id: 'day', label: '天' },
  { id: 'month', label: '月' },
  { id: 'year', label: '年' },
]

export function createDefaultDatingPlotPaceSettings(): DatingPlotPaceSettings {
  return { preset: 'auto', customAmount: 3, customUnit: 'day' }
}

function clampCustomAmount(n: unknown): number {
  const x = typeof n === 'number' ? n : Number(n)
  if (!Number.isFinite(x) || x <= 0) return 1
  return Math.min(9999, Math.round(x * 100) / 100)
}

function normalizeUnit(u: unknown): DatingPlotPaceUnit {
  if (u === 'hour' || u === 'day' || u === 'month' || u === 'year') return u
  return 'day'
}

export function normalizeDatingPlotPaceSettings(
  raw?: Partial<DatingPlotPaceSettings> | null,
): DatingPlotPaceSettings {
  const d = createDefaultDatingPlotPaceSettings()
  const preset =
    raw?.preset === 'auto' ||
    raw?.preset === 'slow' ||
    raw?.preset === 'medium' ||
    raw?.preset === 'fast' ||
    raw?.preset === 'custom'
      ? raw.preset
      : d.preset
  return {
    preset,
    customAmount: clampCustomAmount(raw?.customAmount ?? d.customAmount),
    customUnit: normalizeUnit(raw?.customUnit ?? d.customUnit),
  }
}

export function datingPlotPaceLabel(settings: DatingPlotPaceSettings): string {
  const s = normalizeDatingPlotPaceSettings(settings)
  if (s.preset === 'custom') {
    const unit = DATING_PLOT_PACE_UNIT_OPTIONS.find((u) => u.id === s.customUnit)?.label ?? '天'
    return `自定义 · 约 ${s.customAmount}${unit}`
  }
  return DATING_PLOT_PACE_PRESET_OPTIONS.find((p) => p.id === s.preset)?.label ?? '自动'
}

function unitPhrase(amount: number, unit: DatingPlotPaceUnit): string {
  const n = clampCustomAmount(amount)
  switch (unit) {
    case 'hour':
      return `约 ${n} 小时`
    case 'day':
      return `约 ${n} 天`
    case 'month':
      return `约 ${n} 个月`
    case 'year':
      return `约 ${n} 年`
  }
}

/** 注入 system/user：本轮故事时间可推进的跨度 */
export function buildDatingPlotPaceAppendix(settings?: DatingPlotPaceSettings | null): string {
  const s = normalizeDatingPlotPaceSettings(settings)
  let span: string
  let detail: string
  if (s.preset === 'auto') {
    span = '自动（由模型自行把握）'
    detail =
      '界面**未锁定**固定跨度。请按最近剧情节奏、关系张力与玩家/导演意图，**自行决定**本轮故事时间推进多少（可仍停在同一时段细写，也可推进数小时/数天/更久）。须在思维链【时空场记卡】写明本轮拟跨越的时段与理由；有导演目的地（分别/换场/换日等）时优先服务目的地。禁止无交代的瞬移；换场仍须一两句过渡。'
  } else if (s.preset === 'slow') {
    span = '慢速（数小时～一天内）'
    detail =
      '本轮故事时间跨度宜落在**数小时到一天内**（可含「当天下午→傍晚」「晚饭后→睡前」等短过渡）。禁止无因跨过数天、数周或更久；若导演指令要求抵达分别/换场，须在该短跨度内完成，勿借「慢速」原地空转也不要跳到几天后。'
  } else if (s.preset === 'fast') {
    span = '快速（数月～数年）'
    detail =
      '本轮允许故事时间推进到**数月乃至数年**量级（须用旁白/对白交代间隔与生活变化痕迹：季节、学业工作、外貌习惯等）。禁止整段仍锁死在上一拍的同一小时内原地磨蹭；若导演给出目的地，可在快跨度内抵达。'
  } else if (s.preset === 'custom') {
    const phrase = unitPhrase(s.customAmount ?? 1, s.customUnit ?? 'day')
    span = `自定义（用户指定跨度：${phrase}）`
    detail = `本轮故事时间推进目标约为 **${phrase}**（可略弹性，但数量级须贴近）。须用可见过渡交代间隔；禁止远小于该跨度原地磨、也禁止无交代地远超该跨度。`
  } else {
    span = '中速（数天～约一个月内）'
    detail =
      '本轮故事时间跨度宜落在**数天到约一个月内**（可含周末、下周、半个月等）。禁止无因把整段锁在同一小时内，也禁止无交代地跳到数月/数年；若导演要求分别/换场，在该中等跨度内推进即可。'
  }
  const hardOrSoft =
    s.preset === 'auto'
      ? `与「目标字数」无关：字数管篇幅，本条表示**推进速度交由模型发挥**（非强制某一数量级）。`
      : `与「目标字数」无关：字数管篇幅，本条管**故事内时间跨度**。思维链【时空场记卡】须写明本轮拟跨越的时段；【推进落点卡】须与该跨度一致。`
  return `【剧情推进速度·当轮】界面已选：${span}。\n${detail}\n${hardOrSoft}`
}
