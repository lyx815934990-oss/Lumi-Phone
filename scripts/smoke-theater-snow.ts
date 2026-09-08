/**
 * Smoke: snow 解析 + script 放行 + 旧片段兼容
 * 用法：npx tsx scripts/smoke-theater-snow.ts
 */
import {
  extractAndStripPlotHtmlVisual,
  isCompleteHtmlDocument,
  sanitizePlotHtmlVisualHtml,
} from '../src/phone/apps/wechat/dating/datingPlotHtmlVisual'

const sample = `正文一段。

【小剧场】
<snow>
<!-- 小剧场构思：测试 -->
<details>
<summary>⋯♡⋯☔ 未发送的雨 ⋯♡⋯</summary>
<p style="text-align:center;font-size:0.8em;font-style:italic">别先走。</p>
\`\`\`html
<!DOCTYPE html>
<html>
<head>
<style>
body{margin:0}
.title-custom{font-weight:700}
</style>
</head>
<body>
<div>
<p class="title-custom">草稿</p>
<button type="button" id="b">点我</button>
<span id="o">0</span>
</div>
<script>
document.getElementById("b").addEventListener("click",function(){
var o=document.getElementById("o");
o.textContent=String(Number(o.textContent||0)+1);
});
</script>
</body>
</html>
\`\`\`
</details>
</snow>
【小剧场结束】
`

const { content, visual } = extractAndStripPlotHtmlVisual(sample)
if (!visual) throw new Error('visual null')
if (!content.includes('正文一段')) throw new Error('content strip failed')
if (!visual.title.includes('未发送')) throw new Error(`title=${visual.title}`)
if (visual.emoji !== '☔') throw new Error(`emoji=${visual.emoji}`)
if (!isCompleteHtmlDocument(visual.html)) throw new Error('not complete doc')
if (!visual.html.includes('<script>')) throw new Error('script stripped')
if (visual.html.includes('<iframe')) throw new Error('iframe should stay stripped')

const legacy = extractAndStripPlotHtmlVisual(`x\n【小剧场】\n标题：旧卡\n\`\`\`html\n<div class="a">hi</div>\n\`\`\`\n【小剧场结束】`)
if (!legacy.visual || legacy.visual.title !== '旧卡') throw new Error('legacy fail')
if (legacy.visual.html.includes('<script')) {
  /* ok if not */
}

const blocked = sanitizePlotHtmlVisualHtml(
  `<div></div><script src="https://evil.test/x.js"></script><iframe src="x"></iframe>`,
)
if (/<iframe/i.test(blocked)) throw new Error('iframe not stripped')
if (/script src/i.test(blocked) && /evil/.test(blocked)) throw new Error('ext script not blocked')

console.log('smoke ok', { title: visual.title, emoji: visual.emoji, htmlLen: visual.html.length })
