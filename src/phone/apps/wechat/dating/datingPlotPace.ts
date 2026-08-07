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

/** 界面是否锁定了非「自动」的时间跨度（须强制遵守） */
export function isDatingPlotPaceLocked(settings?: DatingPlotPaceSettings | null): boolean {
  return normalizeDatingPlotPaceSettings(settings).preset !== 'auto'
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

/**
 * 时间推进后的正文结构（间隔带过 → 主事件落点）。
 * 锁定跨度时为硬约束；自动模式仅作「若主动跳时」的写法参考。
 */
export function buildDatingPlotPaceBridgeStructureRule(locked: boolean): string {
  const head = locked
    ? `【时间推进·正文结构｜硬｜禁止硬切空白｜禁止整段流水账】`
    : `【时间推进·正文结构｜若本轮主动跨时段则遵守】`
  return (
    `${head}` +
    `正文须分两层，**篇幅重心在第 2 层**：` +
    `1) **间隔带过（短）**：用少量旁白/对白简要交代这段时间里发生了什么——可点几个时间节点（如「4月时…」「过后几天…」「5月时…」），写关系/生活的可感知变化；**禁止**只写「三个月过去了 / 过了很久」空壳后硬切到新场；也**禁止**把中间三个月写成整章流水账。` +
    `2) **主事件落点（长｜戏核）**：带过之后，**必须**落到「这一天 / 这一刻」的一件重要、可立刻开演的事件上展开（约见、对峙、告白节点、分别等），把当场动作与对白演开；本轮戏核在此，不在流水账。` +
    `结构示例（自定义约三个月）：「时间过去了三个月，这三个月来，{{char}}和{{user}}的关系也发生了一点点小改变。4月时，{{char}}因为……，过后的几天里……，5月时……。（主事件→）这天，{{char}}约了{{user}}出来单独见面……」然后把见面当场演开。`
  )
}

/** 注入 system/user：本轮故事时间可推进的跨度（界面锁定时须强制遵守） */
export function buildDatingPlotPaceAppendix(settings?: DatingPlotPaceSettings | null): string {
  const s = normalizeDatingPlotPaceSettings(settings)
  const locked = s.preset !== 'auto'
  let span: string
  let detail: string
  if (s.preset === 'auto') {
    span = '自动（由模型自行把握）'
    detail =
      '界面**未锁定**固定跨度。请按最近剧情节奏、关系张力与玩家/导演意图，**自行决定**本轮故事时间推进多少（可仍停在同一时段细写，也可推进数小时/数天/更久）。须在思维链【时空场记卡】写明本轮拟跨越的时段与理由；有导演目的地（分别/换场/换日等）时优先服务目的地。若主动跨时段，须遵守下方「间隔带过→主事件」结构；禁止无交代的瞬移。'
  } else if (s.preset === 'slow') {
    span = '慢速（数小时～一天内）'
    detail =
      '**【必须遵守】**本轮故事时间跨度**必须**落在数小时到一天内（可含「当天下午→傍晚」「晚饭后→睡前」等）。禁止仍锁在上一拍同一分钟原地磨；也禁止无因跨到数天/数周。若导演要求分别/换场，须在该短跨度内抵达。'
  } else if (s.preset === 'fast') {
    span = '快速（数月～数年）'
    detail =
      '**【必须遵守】**本轮故事时间**必须**推进到数月乃至数年量级（禁止整段仍停在上一拍同一小时）。间隔内须可见生活/关系变化痕迹；抵达落点后展开一件重要当场事件。'
  } else if (s.preset === 'custom') {
    const phrase = unitPhrase(s.customAmount ?? 1, s.customUnit ?? 'day')
    span = `自定义（用户指定跨度：${phrase}）`
    detail = `**【必须遵守】**本轮故事时间推进目标约为 **${phrase}**（可略弹性，数量级须贴近）。禁止远小于该跨度原地磨，也禁止无交代地远超该跨度；须先带过间隔，再落到主事件。`
  } else {
    span = '中速（数天～约一个月内）'
    detail =
      '**【必须遵守】**本轮故事时间跨度**必须**落在数天到约一个月内（可含周末、下周、半个月等）。禁止无因把整段锁在同一小时内，也禁止无交代地跳到数月/数年。'
  }
  const hardOrSoft = locked
    ? `本条为**界面生成设置·最高优先级硬约束**之一（与人称/上帝视角/导演模式/目标字数同级）：` +
      `不得因「最近剧情」旧稿节奏、笼统「禁跳时」、或想少写过渡而擅自缩小/取消跨度。` +
      `字数管篇幅，本条管**故事内时间跨度**。思维链【时空场记卡】须写明拟跨越的时段；【推进落点卡】须写「间隔带过要点 + 主事件落点」。`
    : `与「目标字数」无关：字数管篇幅，本条表示**推进速度交由模型发挥**（非强制某一数量级）。`
  return (
    `【剧情推进速度·当轮｜${locked ? '硬约束·必须遵守' : '自动'}】界面已选：${span}。\n` +
    `${detail}\n` +
    `${hardOrSoft}\n` +
    `${buildDatingPlotPaceBridgeStructureRule(locked)}`
  )
}
