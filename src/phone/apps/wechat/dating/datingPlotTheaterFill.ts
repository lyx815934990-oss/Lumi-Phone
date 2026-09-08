/**
 * 小剧场二次补生：正文落库后单独请求，按高质量完整 HTML+CSS+JS 出块（不限行数）。
 */

import type { ApiConfig } from '../../api/types'
import { openAiCompatibleChatLenient } from '../newFriendsPersona/ai'
import {
  extractAndStripPlotHtmlVisual,
  type PlotHtmlVisual,
} from './datingPlotHtmlVisual'
import {
  buildPlotHtmlVisualCastGenderBlock,
  formatPlotHtmlVisualPresetCard,
  resolvePlotHtmlVisualPreset,
  type PlotHtmlVisualCastGender,
} from './datingPlotHtmlVisualPresets'
import { getPlotHtmlVisualGoldSample } from './datingPlotHtmlVisualGoldSamples.generated'

const FILL_MAX_ATTEMPTS = 2
const PRODUCT = '小剧场'

/** 独立补生用：高质量完整规范，禁止「短片段 / 十几行」敷衍 */
const SHARED_RULES_QUALITY = `## ${PRODUCT}·高质量规范（独立生成，不限行数）
- 输出**完整可交互** HTML 文档（建议含 \`<!DOCTYPE html>\` + \`<html>\` + \`<head><meta charset>+viewport+<style>\` + \`<body>\` + 必要 \`<script>\`）。
- 手机优先自包含；**禁外链 / iframe / 远程图床**；禁 createElement/innerHTML 动态拼 DOM（结构写在静态 HTML 里）。
- 标题用 \`<p class="title-custom">\` 或等价醒目标题。
- 简体中文；贴本轮剧情细节 **≥3 处**；必须落实本轮预设的「仪式感母题」。
- 须有可点/可填/可切换的互动（按钮、开关、折叠、输入等至少一类），禁止只有静态一句文案的空壳。
- 视觉质感对齐酒馆 snow / 金标示范：层次、间距、阴影、状态反馈齐全；**禁止**为省字数砍掉样式与互动。
- **不要**限制 HTML 行数或字符数；写满写精，直到互动与仪式感完整。`

const OUTPUT_FORMAT_QUALITY = `## 强制输出格式
只输出一个块（禁止解释、禁止剧情正文、禁止 JSON）：

【小剧场】
<details>
<summary>{{emoji}} {{标题}}</summary>
\`\`\`html
（完整高质量 HTML 文档）
\`\`\`
</details>
【小剧场结束】`

function wrapTheaterBlock(inner: string): string {
  const t = String(inner || '').trim()
  if (/【\s*小剧场\s*】/u.test(t) && /【\s*小剧场\s*结束\s*】/u.test(t)) return t
  return `【小剧场】\n${t}\n【小剧场结束】`
}

/** 把小剧场块插到记忆分隔符 / VN 语音参数之前；若已有读者评论则插在评论块之后 */
export function appendPlotHtmlVisualBlockToAiText(aiText: string, block: string): string {
  const src = String(aiText || '')
  const theater = wrapTheaterBlock(block).trim()
  if (!theater) return src
  if (extractAndStripPlotHtmlVisual(src).visual?.html?.trim()) return src

  const commentEnd = /【\s*读者评论\s*结束\s*】/u.exec(src)
  if (commentEnd && commentEnd.index !== undefined) {
    const at = commentEnd.index + commentEnd[0].length
    return `${src.slice(0, at)}\n\n${theater}\n${src.slice(at)}`
  }

  const markers = [/<<<DATING_UNIFIED_MEMORY(?:_JSON)?>>>/u, /【\s*VN\s*语音参数\s*】/iu]
  let cut = -1
  for (const re of markers) {
    const m = re.exec(src)
    if (m && m.index !== undefined && (cut < 0 || m.index < cut)) cut = m.index
  }
  if (cut >= 0) {
    const head = src.slice(0, cut).trimEnd()
    const tail = src.slice(cut)
    return `${head}\n\n${theater}\n\n${tail}`
  }
  return `${src.trimEnd()}\n\n${theater}\n`
}

export async function requestDatingTheaterHtmlFill(params: {
  apiConfig: ApiConfig
  characterName: string
  characterGender?: PlotHtmlVisualCastGender
  playerName?: string
  playerGender?: PlotHtmlVisualCastGender
  presetId?: string | null
  plotBody: string
  plotHint?: string
}): Promise<PlotHtmlVisual | null> {
  const cfg = params.apiConfig
  if (!cfg?.apiUrl || !cfg?.apiKey || !cfg?.modelId) return null

  const preset = resolvePlotHtmlVisualPreset({
    presetId: params.presetId,
    plotHint: params.plotHint || params.plotBody,
  })
  const char = params.characterName.trim() || '角色'
  const user = (params.playerName || '用户').trim() || '用户'
  const bodyClip = String(params.plotBody || '')
    .replace(/<thinking>[\s\S]*?<\/thinking>/gi, '')
    .trim()
    .slice(-2800)

  const gold = preset ? getPlotHtmlVisualGoldSample(preset.id) : undefined
  const goldHint = gold
    ? `\n【金标质感参考（同预设示范·勿照抄文案与人称性别，学结构/样式/互动密度）】\n\`\`\`html\n${gold.slice(0, 3500)}\n\`\`\`\n`
    : '\n【质感要求】完整文档 + 丰富 CSS + 可点互动；勿输出十几行空壳。\n'

  const genderBlock = buildPlotHtmlVisualCastGenderBlock({
    characterName: char,
    characterGender: params.characterGender,
    playerName: user,
    playerGender: params.playerGender,
  })

  const system =
    `你是约会剧情「${PRODUCT}」**高质量**专用生成器。只输出一个【小剧场】…【小剧场结束】块。` +
    `禁止输出剧情正文、思维链、读者评论、记忆 JSON。` +
    `角色=${char}；玩家=${user}。简体中文。` +
    `${genderBlock}` +
    `本轮为独立请求，**不限 HTML 行数/字数**，须写完整可交互页面。`

  const presetBlock = preset
    ? `${formatPlotHtmlVisualPresetCard(preset)}\n${SHARED_RULES_QUALITY}\n${OUTPUT_FORMAT_QUALITY}\n`
    : `${SHARED_RULES_QUALITY}\n${OUTPUT_FORMAT_QUALITY}\n`

  const userMsg =
    `根据下列本轮剧情，生成**高质量**可贴剧情的小剧场 HTML。\n` +
    `${genderBlock}` +
    `${presetBlock}` +
    `${goldHint}` +
    `【本轮剧情摘录】\n${bodyClip || '（无）'}\n\n` +
    `现在只输出【小剧场】…【小剧场结束】，顶格，不要解释；HTML 须完整、可互动、有仪式感，且人称性别须与上方性别锁定一致。`

  let last: PlotHtmlVisual | null = null
  for (let i = 0; i < FILL_MAX_ATTEMPTS; i++) {
    try {
      const raw = await openAiCompatibleChatLenient(
        cfg as any,
        [
          { role: 'system', content: system },
          {
            role: 'user',
            content:
              i === 0
                ? userMsg
                : `上一则质量不足或未解析。请重写完整【小剧场】块：须含完整 HTML 文档、\`<style>\`、可点互动与 title-custom；禁止空壳短片段。\n${OUTPUT_FORMAT_QUALITY}`,
          },
        ],
        { temperature: 0.7, max_tokens: 12000 },
      )
      const wrapped = wrapTheaterBlock(raw)
      const { visual } = extractAndStripPlotHtmlVisual(wrapped)
      if (visual?.html && visual.html.length >= 80 && /<[a-z]/i.test(visual.html)) {
        return visual
      }
      const bare = extractAndStripPlotHtmlVisual(
        wrapTheaterBlock(`\`\`\`html\n${String(raw || '').trim()}\n\`\`\``),
      ).visual
      if (bare?.html && bare.html.length >= 80) {
        last = bare
        return bare
      }
      last = visual
    } catch (e) {
      console.warn('[dating] theater fill attempt failed', i + 1, e)
    }
  }
  return last?.html?.trim() ? last : null
}
