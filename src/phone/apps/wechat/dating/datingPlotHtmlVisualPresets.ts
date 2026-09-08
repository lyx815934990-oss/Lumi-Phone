/**
 * 小剧场 · 预设提示词组装（A–F · 50 条）
 * 输出壳对齐酒馆 snow 格式：完整 HTML+CSS+JS 文档。
 */

import {
  PLOT_HTML_VISUAL_CATEGORY_LABELS,
  PLOT_HTML_VISUAL_PRESETS,
  type PlotHtmlVisualCategory,
  type PlotHtmlVisualPreset,
  type PlotHtmlVisualPresetTag,
} from './datingPlotHtmlVisualPresetsData'
export type {
  PlotHtmlVisualCategory,
  PlotHtmlVisualPreset,
  PlotHtmlVisualPresetTag,
}
export {
  PLOT_HTML_VISUAL_CATEGORY_LABELS,
  PLOT_HTML_VISUAL_PRESETS,
  getPlotHtmlVisualPresetsByCategory,
} from './datingPlotHtmlVisualPresetsData'

const PRODUCT_NAME = '小剧场'

export type PlotHtmlVisualPresetMode = 'random' | 'auto' | string

export type PlotHtmlVisualCastGender = 'male' | 'female' | 'other' | null | undefined

function castGenderZh(g: PlotHtmlVisualCastGender): string {
  if (g === 'male') return '男'
  if (g === 'female') return '女'
  if (g === 'other') return '其他'
  return '未知'
}

function castPronounRule(who: string, g: PlotHtmlVisualCastGender): string {
  if (g === 'male') return `${who}第三人称须用「他/他的」，**禁止**「她」`
  if (g === 'female') return `${who}第三人称须用「她/她的」，**禁止**「他」`
  if (g === 'other') return `${who}性别为其他：人称须中性或跟正文已用称呼，禁止擅自改成默认女/男`
  return `${who}性别未标注：勿默认写成女性；以正文已出现人称为准`
}

/** 小剧场须读取并锁死 char / user 性别（防默认女玩家） */
export function buildPlotHtmlVisualCastGenderBlock(opts?: {
  characterName?: string
  characterGender?: PlotHtmlVisualCastGender
  playerName?: string
  playerGender?: PlotHtmlVisualCastGender
}): string {
  const char = String(opts?.characterName || '').trim() || '角色'
  const user = String(opts?.playerName || '').trim() || '玩家'
  const cg = opts?.characterGender
  const pg = opts?.playerGender
  const maleUserHard =
    pg === 'male'
      ? `玩家「${user}」为**男**：文案/按钮/对话框/称谓（先生等）与形象描写一律按男性；**禁止**写成她、女士、女朋友、女主视角。`
      : pg === 'female'
        ? `玩家「${user}」为**女**：文案与称谓按女性；**禁止**写成他、先生（除非正文另有男性他人）。`
        : ''
  return (
    `【${PRODUCT_NAME}·性别锁定｜强制】` +
    `约会对象「${char}」性别=${castGenderZh(cg)}；玩家「${user}」性别=${castGenderZh(pg)}。` +
    `${castPronounRule(`对象「${char}」`, cg)}；${castPronounRule(`玩家「${user}」`, pg)}。` +
    (maleUserHard ? `${maleUserHard}` : '') +
    `HTML 内所有指称须与上表一致。金标/示范 HTML 仅供学布局与互动密度，**禁止照抄示范里的人称性别**。\n`
  )
}

/** 主轮瘦身：保留硬规则，砍掉重复铺陈（完整长规范会挤掉同轮评论块） */
export const SHARED_RULES_COMPACT = `## ${PRODUCT_NAME}·精简规范
手机优先短 HTML；有 \`title-custom\` + 少量标签即可（篇幅紧时**不必**完整文档/大段 script）。
禁外链/iframe。简体中文，贴本轮细节≥1处，落实 ritualHook。优先闭合【小剧场】标记，勿为堆交互挤掉读者评论。`

export const OUTPUT_FORMAT_COMPACT = `## 强制输出格式（精简·同轮必出）
正文与读者评论写完后、记忆分隔符之前**必须同轮**追加（禁止省略、禁止指望另开请求补写）：

【小剧场】
<details>
<summary>{{emoji}} {{标题}}</summary>
\`\`\`html
（可交互 HTML：须含标签结构，勿空壳）
\`\`\`
</details>
【小剧场结束】

禁止放进 <thinking>；不要多个小剧场。篇幅紧也须先闭合标记并写出可解析 HTML（可短片段），**禁止**整段省略。
**禁止**用 JSON / JSON 对象 / \`\`\`json 输出小剧场；只能是上述中文标记 + HTML（或 details+html 围栏）。`


function formatStructure(lines: string[]): string {
  return lines.map((l, i) => `${i + 1}. ${l}`).join('\n')
}

function formatTags(tags: PlotHtmlVisualPresetTag[]): string {
  return tags.join(' · ')
}

export function formatPlotHtmlVisualPresetCard(preset: PlotHtmlVisualPreset): string {
  const cat = PLOT_HTML_VISUAL_CATEGORY_LABELS[preset.category]
  return (
    `[${preset.name}]\n` +
    `分类：${preset.category}. ${cat}\n` +
    `标签：${formatTags(preset.tags)}\n` +
    `短标题建议：${preset.shortTitle}\n` +
    `仪式感母题：${preset.ritualHook}\n\n` +
    `## 类型定义：\n` +
    `${preset.typeDef}\n\n` +
    `## 核心功能结构：\n` +
    `${formatStructure(preset.structure)}\n`
  )
}

/** 同轮主回复专用：砍掉冗长结构/密度条，避免挤掉评论块与收尾 HTML */
export function formatPlotHtmlVisualPresetCardSlim(preset: PlotHtmlVisualPreset): string {
  const cat = PLOT_HTML_VISUAL_CATEGORY_LABELS[preset.category]
  const structureHead = preset.structure.slice(0, 4)
  return (
    `[${preset.name}]\n` +
    `分类：${preset.category}. ${cat}｜短标题：${preset.shortTitle}\n` +
    `仪式感：${preset.ritualHook}\n` +
    `类型要点：${preset.typeDef}\n` +
    (structureHead.length ? `结构提纲：\n${formatStructure(structureHead)}\n` : '') +
    `篇幅紧时：输出可解析短 HTML（约 15～40 行）即可，优先闭合【小剧场】标记，勿为堆密度丢评论块。\n`
  )
}

export function getPlotHtmlVisualPresetById(id: string): PlotHtmlVisualPreset | undefined {
  const key = String(id || '').trim()
  if (!key || key === 'auto' || key === 'random') return undefined
  return PLOT_HTML_VISUAL_PRESETS.find(
    (p) => p.id === key || p.name === key || p.shortTitle === key,
  )
}

export function pickRandomPlotHtmlVisualPreset(
  category?: PlotHtmlVisualCategory | null,
): PlotHtmlVisualPreset | undefined {
  const list = category
    ? PLOT_HTML_VISUAL_PRESETS.filter((p) => p.category === category)
    : PLOT_HTML_VISUAL_PRESETS
  const pool = list.length ? list : PLOT_HTML_VISUAL_PRESETS
  if (!pool.length) return undefined
  return pool[Math.floor(Math.random() * pool.length)]
}

/** @deprecated */
export function pickPlotHtmlVisualPresetForPlot(_plotHint: string): PlotHtmlVisualPreset | undefined {
  return pickRandomPlotHtmlVisualPreset()
}

export function normalizePlotHtmlVisualPresetId(raw: string | null | undefined): string {
  const key = String(raw || '').trim()
  if (!key || key === 'auto' || key === 'random') return 'random'
  if (getPlotHtmlVisualPresetById(key)) return getPlotHtmlVisualPresetById(key)!.id
  return 'random'
}

export function resolvePlotHtmlVisualPreset(opts?: {
  presetId?: PlotHtmlVisualPresetMode | null
  plotHint?: string
  category?: PlotHtmlVisualCategory | null
}): PlotHtmlVisualPreset | undefined {
  const locked = getPlotHtmlVisualPresetById(String(opts?.presetId || ''))
  if (locked) return locked
  return pickRandomPlotHtmlVisualPreset(opts?.category)
}

/** 同分类邻近选项，供构思注释「可激活列表」 */
function siblingPresetLabels(preset: PlotHtmlVisualPreset, limit = 6): string {
  const same = PLOT_HTML_VISUAL_PRESETS.filter((p) => p.category === preset.category)
  const pool = same.length >= 3 ? same : PLOT_HTML_VISUAL_PRESETS
  const labels = pool.map((p) => `${p.id}.${p.shortTitle}`)
  const idx = pool.findIndex((p) => p.id === preset.id)
  if (idx < 0) return labels.slice(0, limit).join('、')
  const out: string[] = []
  for (let i = 0; i < pool.length && out.length < limit; i++) {
    const p = pool[(idx + i) % pool.length]!
    out.push(`${p.id}.${p.shortTitle}`)
  }
  return out.join('、')
}

/** 预设库为空时返回空串，调用方不应再要求模型输出小剧场。 */
export function buildPlotHtmlVisualPresetAppendix(opts?: {
  presetId?: PlotHtmlVisualPresetMode | null
  plotHint?: string
  category?: PlotHtmlVisualCategory | null
  characterName?: string
  characterGender?: PlotHtmlVisualCastGender
  playerName?: string
  playerGender?: PlotHtmlVisualCastGender
}): string {
  if (!PLOT_HTML_VISUAL_PRESETS.length) {
    return (
      `【${PRODUCT_NAME}·预设｜暂缓】预设库已清空待重做。` +
      `本轮**不要**输出【小剧场】HTML 块；即使场控开关仍开着也一律跳过。\n`
    )
  }

  const mode = normalizePlotHtmlVisualPresetId(opts?.presetId)
  const preset = resolvePlotHtmlVisualPreset({
    presetId: mode,
    plotHint: opts?.plotHint,
    category: opts?.category,
  })
  if (!preset) {
    return (
      `【${PRODUCT_NAME}·预设｜暂缓】未解析到可用预设。本轮**不要**输出【小剧场】HTML 块。\n`
    )
  }

  const pickLabel = mode === 'random' ? '随机抽取' : '指定类型'
  const options = siblingPresetLabels(preset)
  const poolHint =
    `本库共 ${PLOT_HTML_VISUAL_PRESETS.length} 种；` +
    `本轮：${pickLabel} → **已指定**「${preset.name}」（${preset.shortTitle} / #${preset.id} / ${preset.category}类），` +
    `不要改选其它类型，不要输出多个小剧场。` +
    `必须落实仪式感：${preset.ritualHook}` +
    `构思注释中「可激活的小剧场」可写：${options}（实际仍只做本指定类型）。`
  const genderBlock = buildPlotHtmlVisualCastGenderBlock({
    characterName: opts?.characterName,
    characterGender: opts?.characterGender,
    playerName: opts?.playerName,
    playerGender: opts?.playerGender,
  })

  return (
    `【${PRODUCT_NAME}·预设｜强制·同轮】本轮已开启「${PRODUCT_NAME}」。` +
    `须在**同一次回复**内、剧情正文（及读者评论，若有）之后追加【小剧场】…【小剧场结束】；` +
    `与思维链开关无关。**禁止**省略、**禁止**指望二次请求补写、**禁止** JSON 格式、**禁止**写进 thinking / 记忆 JSON。篇幅吃紧时优先保证闭合标记与可解析 HTML（可短片段）。\n` +
    `${genderBlock}` +
    `${poolHint}\n\n` +
    `${formatPlotHtmlVisualPresetCardSlim(preset)}\n` +
    `${SHARED_RULES_COMPACT}\n` +
    `${OUTPUT_FORMAT_COMPACT}\n`
  )
}

export function listPlotHtmlVisualPresetLabels(): string {
  if (!PLOT_HTML_VISUAL_PRESETS.length) return '（预设库为空）'
  return PLOT_HTML_VISUAL_PRESETS.map((p) => `${p.id}.${p.shortTitle}`).join(' / ')
}

export function listPlotHtmlVisualPresetsByCategorySummary(): string {
  if (!PLOT_HTML_VISUAL_PRESETS.length) return '（预设库为空，待重做）'
  return (['A', 'B', 'C', 'D', 'E', 'F'] as PlotHtmlVisualCategory[])
    .map((c) => {
      const items = PLOT_HTML_VISUAL_PRESETS.filter((p) => p.category === c)
      return `${c}. ${PLOT_HTML_VISUAL_CATEGORY_LABELS[c]}（${items.length}）：${items.map((p) => p.id + p.shortTitle).join('、')}`
    })
    .join('\n')
}
