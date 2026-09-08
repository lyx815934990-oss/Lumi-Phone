/**
 * 生成可双击预览的「高质感可交互」小剧场 HTML 包
 * 每张 html/XX.html 即为完整文档（含 JS），打开即可点按互动
 * 用法：npx tsx scripts/gen-theater-egg-html.ts
 */
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import {
  PLOT_HTML_VISUAL_CATEGORY_LABELS,
  PLOT_HTML_VISUAL_PRESETS,
} from '../src/phone/apps/wechat/dating/datingPlotHtmlVisualPresetsData'
import { THEATER_PREMIUM_PAGES, assertPremiumComplete } from './theater-premium/index.ts'

const ROOT = path.resolve('小剧场彩蛋')
const HTML_DIR = path.join(ROOT, 'html')

function esc(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function indexPage(): string {
  const cats = ['A', 'B', 'C', 'D', 'E', 'F'] as const
  const sections = cats
    .map((c) => {
      const items = PLOT_HTML_VISUAL_PRESETS.filter((p) => p.category === c)
      return `<h2 class="sec" id="cat-${c}">${c}. ${esc(PLOT_HTML_VISUAL_CATEGORY_LABELS[c])}（${items.length}）</h2>
<div class="grid">${items
        .map((p) => {
          const live = !!THEATER_PREMIUM_PAGES[p.id]
          return `<a class="card" href="./html/${p.id}.html">
  <div class="id">#${p.id}${live ? ' · LIVE' : ''}</div>
  <h3>${esc(p.name)}</h3>
  <div class="meta">${esc(p.shortTitle)} · ${esc(p.tags.join(' / '))}</div>
  <div class="hook">${esc(p.ritualHook)}</div>
</a>`
        })
        .join('')}</div>`
    })
    .join('\n')

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>小剧场彩蛋 · 高质感预览</title>
<style>
*{box-sizing:border-box}
body{margin:0;font-family:"PingFang SC","Microsoft YaHei",sans-serif;background:#ebe4d8;color:#2a2622;line-height:1.55}
a{color:#8a6b28;text-decoration:none}
.wrap{max-width:960px;margin:0 auto;padding:20px 16px 56px}
.hero h1{margin:6px 0 8px;font-size:22px}
.hero p{margin:0;color:#6a6056;font-size:13px}
.chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}
.chip{display:inline-block;padding:6px 12px;border-radius:999px;border:1px solid #ddd4c4;background:#fff;font-size:12px}
.sec{margin:28px 0 12px;font-size:14px;color:#5a5046}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px}
.card{display:block;padding:14px;border-radius:12px;background:#fff;border:1px solid #e8e0d4;box-shadow:0 8px 20px rgba(0,0,0,.06);color:inherit}
.card:hover{border-color:#c9a24b}
.card .id{font-family:ui-monospace,Consolas,monospace;font-size:11px;color:#8a7a60}
.card h3{margin:4px 0;font-size:15px}
.card .meta{font-size:11px;color:#8a7a60}
.card .hook{margin-top:8px;font-size:12px;color:#5a5046}
.muted{opacity:.55;font-size:12px}
</style>
</head>
<body>
<div class="wrap">
  <div class="hero">
    <div class="muted">THEATER EGG · PREMIUM INTERACTIVE</div>
    <h1>小剧场彩蛋 · 50 张可交互高质感预览</h1>
    <p>每张都是完整 HTML+CSS+JS：票纸/书信/金属柜/丝绒面板等材质，点按即可互动。对齐当前提示词的最优成品观感。</p>
    <div class="chips">
      <a class="chip" href="#top">全部 ${PLOT_HTML_VISUAL_PRESETS.length}</a>
      ${cats.map((c) => `<a class="chip" href="#cat-${c}">${c}</a>`).join('')}
    </div>
  </div>
  ${sections}
</div>
</body>
</html>`
}

const missing = assertPremiumComplete()
if (missing.length) {
  console.error('缺少高级样卡:', missing.join(', '))
  process.exit(1)
}

fs.mkdirSync(HTML_DIR, { recursive: true })
fs.writeFileSync(path.join(ROOT, 'index.html'), indexPage(), 'utf8')

let bytes = 0
for (const p of PLOT_HTML_VISUAL_PRESETS) {
  const html = THEATER_PREMIUM_PAGES[p.id]!
  fs.writeFileSync(path.join(HTML_DIR, `${p.id}.html`), html, 'utf8')
  bytes += html.length
}

fs.writeFileSync(
  path.join(ROOT, 'README.txt'),
  `小剧场彩蛋 · 高质感可交互预览
==============================
打开 index.html → 点任意卡片

每张 html/XX.html 均为完整文档：
- 材质质感（票纸/纸张/金属/丝绒/终端等）
- 可点击按钮与状态切换（原生 JS）
- 内容密度对齐产品提示词最优成品

重新生成：npx tsx scripts/gen-theater-egg-html.ts
`,
  'utf8',
)

console.log(
  JSON.stringify({
    ok: true,
    count: PLOT_HTML_VISUAL_PRESETS.length,
    avgChars: Math.round(bytes / PLOT_HTML_VISUAL_PRESETS.length),
    root: ROOT,
  }),
)

const gold = spawnSync(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['tsx', 'scripts/build-theater-gold-samples.ts'],
  { stdio: 'inherit', shell: true },
)
if (gold.status !== 0) {
  console.warn('gold samples rebuild failed', gold.status)
}
