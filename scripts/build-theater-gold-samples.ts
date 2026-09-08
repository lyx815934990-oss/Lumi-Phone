/**
 * 从 theater-premium 完整页提取「金标示范 HTML」，写入 src 供剧情附录注入
 * 用法：npx tsx scripts/build-theater-gold-samples.ts
 */
import fs from 'node:fs'
import path from 'node:path'
import { THEATER_PREMIUM_PAGES } from './theater-premium/index.ts'
import { PLOT_HTML_VISUAL_PRESETS } from '../src/phone/apps/wechat/dating/datingPlotHtmlVisualPresetsData'

const OUT = path.resolve('src/phone/apps/wechat/dating/datingPlotHtmlVisualGoldSamples.generated.ts')
const MAX = 3200

function stripForPrompt(html: string): string {
  let s = String(html || '')
  // 去掉预览导航条
  s = s.replace(/<div class="egg-nav">[\s\S]*?<\/div>/i, '')
  s = s.replace(/\.egg-nav\{[^}]*\}/g, '')
  s = s.replace(/\.egg-nav [^{]*\{[^}]*\}/g, '')
  // 去掉过长关联碎片区（保留主 UI）
  s = s.replace(/<div class="dense">[\s\S]*?<\/div>\s*(?=<script>)/i, '')
  s = s.replace(/<div class="dense-extra[^"]*">[\s\S]*?<\/div>\s*(?=<script>)/i, '')
  // 去掉外链大图（省 token；模型仍须自备 pollinations）
  s = s.replace(/<img\b[^>]*pollinations[^>]*>/gi, '')
  // 压缩空白
  s = s
    .split('\n')
    .map((l) => l.replace(/^\s+/, ''))
    .filter((l) => l.length)
    .join('\n')
  if (s.length > MAX) {
    const scriptIdx = s.search(/<script>/i)
    if (scriptIdx > 0 && scriptIdx < s.length - 200) {
      const headBudget = Math.floor(MAX * 0.7)
      const tailBudget = MAX - headBudget - 40
      const head = s.slice(0, headBudget)
      const tail = s.slice(Math.max(scriptIdx, s.length - tailBudget))
      s = `${head}\n<!-- gold-truncated -->\n${tail}`
    } else {
      s = `${s.slice(0, MAX)}\n<!-- gold-truncated -->`
    }
  }
  return s.trim()
}

const map: Record<string, string> = {}
const meta: Record<string, { title: string; chars: number }> = {}

for (const p of PLOT_HTML_VISUAL_PRESETS) {
  const raw = THEATER_PREMIUM_PAGES[p.id]
  if (!raw) continue
  const gold = stripForPrompt(raw)
  map[p.id] = gold
  meta[p.id] = { title: p.shortTitle, chars: gold.length }
}

const file = `/**
 * 小剧场 · 金标示范 HTML（由 scripts/build-theater-gold-samples.ts 生成）
 * 注入剧情附录：质感/互动基准；模型须贴本轮剧情改写，禁止原样照搬文案。
 */
export const PLOT_HTML_VISUAL_GOLD_SAMPLES: Record<string, string> = ${JSON.stringify(map, null, 2)}

export const PLOT_HTML_VISUAL_GOLD_META: Record<string, { title: string; chars: number }> = ${JSON.stringify(meta, null, 2)}

export function getPlotHtmlVisualGoldSample(id: string): string | undefined {
  return PLOT_HTML_VISUAL_GOLD_SAMPLES[String(id || '').trim()]
}
`

fs.writeFileSync(OUT, file, 'utf8')
const lens = Object.values(map).map((s) => s.length)
console.log(
  JSON.stringify({
    out: OUT,
    count: Object.keys(map).length,
    min: Math.min(...lens),
    avg: Math.round(lens.reduce((a, b) => a + b, 0) / lens.length),
    max: Math.max(...lens),
  }),
)
