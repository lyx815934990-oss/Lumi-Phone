import {
  extractAndStripPlotHtmlVisual,
  sanitizePlotHtmlVisualHtml,
  normalizePlotHtmlVisual,
} from '../src/phone/apps/wechat/dating/datingPlotHtmlVisual.ts'
import { getPlotHtmlVisualGoldSample } from '../src/phone/apps/wechat/dating/datingPlotHtmlVisualGoldSamples.generated.ts'
import { buildPlotHtmlVisualPresetAppendix } from '../src/phone/apps/wechat/dating/datingPlotHtmlVisualPresets.ts'
import { PLOT_HTML_VISUAL_PRESETS } from '../src/phone/apps/wechat/dating/datingPlotHtmlVisualPresetsData.ts'

const g = getPlotHtmlVisualGoldSample('01')!
console.log('gold', g.length, 'sanitized', sanitizePlotHtmlVisualHtml(g).length)

const wrapped = [
  '他自嘲地扯了下嘴角。',
  '【小剧场】',
  '<snow>',
  '<!-- 小剧场构思：测试 -->',
  '<details>',
  '<summary>⋯♡⋯☔ 未发送的雨 ⋯♡⋯</summary>',
  '<p style="text-align:center;font-size:0.8em;font-style:italic">前言</p>',
  '```html',
  g,
  '```',
  '</details>',
  '</snow>',
  '【小剧场结束】',
  '<<<DATING_UNIFIED_MEMORY>>>',
  'memory stuff',
].join('\n')

const r = extractAndStripPlotHtmlVisual(wrapped)
console.log('extract', {
  has: !!r.visual,
  title: r.visual?.title,
  emoji: r.visual?.emoji,
  htmlLen: r.visual?.html?.length,
})
const n = normalizePlotHtmlVisual(r.visual)
console.log('normalize', { has: !!n, len: n?.html?.length })

// 模型常见偷懒：只写开标签或把 HTML 放在围栏外
const lazyCases = [
  ['only-open', '正文\n【小剧场】\n标题：x\n<div>abc</div>'],
  ['no-fence-full-doc', `正文\n【小剧场】\n标题：票\n${g}\n【小剧场结束】`],
  ['wrong-name', '正文\n【剧场】\n```html\n<div>x</div>\n```\n【剧场结束】'],
  ['english', '正文\n【Theater】\n```html\n<div>hello xx</div>\n```\n【Theater结束】'],
]
for (const [name, raw] of lazyCases) {
  const x = extractAndStripPlotHtmlVisual(raw)
  console.log(name, !!x.visual, x.visual?.html?.length ?? 0)
}

console.log('presets', PLOT_HTML_VISUAL_PRESETS.length)
console.log('appendix01', buildPlotHtmlVisualPresetAppendix({ presetId: '01' }).length)
