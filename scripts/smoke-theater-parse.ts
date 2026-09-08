import { extractAndStripPlotHtmlVisual } from '../src/phone/apps/wechat/dating/datingPlotHtmlVisual.ts'
import { buildPlotHtmlVisualPresetAppendix } from '../src/phone/apps/wechat/dating/datingPlotHtmlVisualPresets.ts'

const appendix = buildPlotHtmlVisualPresetAppendix({ presetId: '01' })
console.log('appendix', appendix.length)

const cases: [string, string][] = [
  [
    'wrapped-snow',
    `正文一段。\n【小剧场】\n<snow>\n<details>\n<summary>⋯♡⋯☔ 测试标题 ⋯♡⋯</summary>\n<p style="text-align:center;font-size:0.8em;font-style:italic">前言</p>\n\`\`\`html\n<div class="wrap"><p class="title-custom">ok</p></div>\n\`\`\`\n</details>\n</snow>\n【小剧场结束】`,
  ],
  [
    'legacy',
    `正文\n【小剧场】\n标题：旧卡\n\`\`\`html\n<div>hello world ok</div>\n\`\`\`\n【小剧场结束】`,
  ],
  ['open-only', `正文\n【小剧场】\n标题：空`],
]

for (const [name, raw] of cases) {
  const { visual, content } = extractAndStripPlotHtmlVisual(raw)
  console.log(name, {
    has: !!visual?.html,
    title: visual?.title,
    htmlLen: visual?.html?.length ?? 0,
    contentHead: content.slice(0, 20),
  })
}
