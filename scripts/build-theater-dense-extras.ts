/**
 * 为每张样卡追加高密度次要面板（按预设定制，避免千篇一律）
 * 用法：npx tsx scripts/build-theater-dense-extras.ts
 */
import fs from 'node:fs'
import {
  PLOT_HTML_VISUAL_PRESETS,
  type PlotHtmlVisualPreset,
} from '../src/phone/apps/wechat/dating/datingPlotHtmlVisualPresetsData'

const ANCHOR = ['雨', '伞', '便利店', '关东煮', '灯坏了', '别先走', '靠过来一点', '祁洵']

function darkOf(p: PlotHtmlVisualPreset) {
  return p.tags.includes('NSFW') || p.category === 'D' || p.category === 'E' || p.category === 'F'
}

function clueLines(p: PlotHtmlVisualPreset): string[] {
  const n = Number(p.id)
  const a = ANCHOR[n % ANCHOR.length]
  const b = ANCHOR[(n + 3) % ANCHOR.length]
  return [
    `【${p.shortTitle}】打开瞬间命中关键词「${a}」· 关联「${b}」`,
    `23:${String(10 + (n % 49)).padStart(2, '0')} 南门便利店旁停留 · 关东煮柜温检测：仍热`,
    `雨夜日志：路口灯坏了 · 伞面往中间挪了约 12cm · 有人说「靠过来一点」`,
    `未发送草稿残留：「其实不是没事」· 已改 ${5 + (n % 9)} 次 · 收件人：祁洵`,
    `${p.name} · 仪式点「${p.ritualHook.slice(0, 18)}…」待触发`,
    `同步：弱网重试 ${1 + (n % 3)} 次 · 会话置顶仍在 · 相册冲突 3 张未合并`,
    `地理：便利店站异常停留 26 分 · 出站小区口 · 雨未停`,
    `物件链：折叠伞 / 双人关东煮小票 / 取件码 8821 / 停车过夜小票`,
    `舆论碎片：树洞墙有人写「灯坏了也站着算不算表白」· 热评 ${20 + n}`,
    `系统注记：样卡 #${p.id} · ${p.category}类 · 标签 ${p.tags.join('·')}`,
    `时间戳对照：你删 / 对方留 · 「别删这张」备注来自祁洵 23:52`,
    `收束句候选：「你别先走」被删又粘贴 ${2 + (n % 4)} 次 · 光标停在句末`,
  ]
}

function comments(p: PlotHtmlVisualPreset): string[] {
  const n = Number(p.id)
  const base = [
    `匿名#${100 + n}：看完「${p.shortTitle}」只想说——关东煮点两份的人很少只是路过。`,
    `路人：雨里灯坏了还站着，伞再往中间一点就好了。`,
    `同事乙：会议室看板又撞了吧？日历重叠这事迟早上墙。`,
    `祁洵？：别删伞下那张。别先走三个字我看见了。`,
    `店员备忘：那位先生问了三次关东煮够不够热，又问灯什么时候修。`,
    `你（自言）：草稿还在。其实想说的不是没事。`,
    `系统：本区为「${p.name}」番外旁观串，点击无跳转。`,
    `雨声：靠过来一点——打完又怕太近。`,
  ]
  if (p.tags.includes('NSFW')) {
    base[1] = `匿名成人区：#${p.id} 的物证味比直球更狠，像真的被翻到了。`
    base[4] = `审查备注：意象化呈现通过 · 禁止外链真图 · 仅剧情戏仿。`
  }
  if (p.category === 'B') {
    base[2] = `吃瓜位：公开处刑味儿有了，但「别先走」三个字才是刀。`
  }
  if (p.category === 'C') {
    base[0] = `温虐党：仪式感到位，「${p.shortTitle}」打开的那一下手是抖的。`
  }
  if (p.category === 'D') {
    base[6] = `玩家：好感度 / 存档 / 成就面板叠在一起，像关系真的被系统化了。`
  }
  return base
}

function block(p: PlotHtmlVisualPreset): string {
  const dark = darkOf(p)
  const ls = clueLines(p)
  const cs = comments(p)
  const list = ls
    .map(
      (t, i) =>
        `<div class="dx-row"><span class="dx-t">${String(i + 1).padStart(2, '0')}</span><span>${t}</span></div>`,
    )
    .join('')
  const cms = cs.map((c) => `<div class="dx-c">${c}</div>`).join('')
  const log = [
    `${p.structure[0] ?? '顶栏'} → 已渲染`,
    `${p.structure[1] ?? '主体'} → 信息密度检查：通过`,
    `次要层：统计条 / 提示 / 页脚 / 旁观评论 → 已插入`,
    `贴本轮细节：${ANCHOR.slice(0, 4).join(' · ')} → 命中`,
    `typeDef 摘要：${p.typeDef.slice(0, 42)}…`,
  ]
    .map((t) => `<div class="dx-log">${t}</div>`)
    .join('')

  return `
<div class="dense-extra${dark ? ' dark' : ''}">
  <div class="dx-h">关联碎片 · ${p.shortTitle} · #${p.id}</div>
  <div class="dx-sub">${p.name} · ${p.ritualHook}</div>
  <div class="dx-stats"><span>线索 <b>${ls.length}</b></span><span>旁观 <b>${cs.length}</b></span><span>结构 <b>${p.structure.length}</b></span><span>未读 <b>${(nSafe(p.id) % 5) + 1}</b></span></div>
  <div class="dx-list">${list}</div>
  <div class="dx-h2">渲染日志</div>
  <div class="dx-logs">${log}</div>
  <div class="dx-h2">旁观区</div>
  <div class="dx-comments">${cms}</div>
  <div class="dx-para">长注：本轮「${p.shortTitle}」不是一张空壳 UI。雨还在下，便利店的灯坏了一盏，关东煮的蒸汽糊在玻璃上。有人把伞往中间挪，有人把「别先走」写进草稿又删掉。祁洵的名字在置顶栏发着不明显的光——像所有未发送的句子一样，等一个愿意点开的人。</div>
  <div class="dx-foot">小剧场番外预览 · 锚点：${ANCHOR.join(' / ')} · 禁止当作真实系统截图外传</div>
</div>`
}

function nSafe(id: string) {
  return Number(id) || 0
}

const css = `
.dense-extra{margin:14px 0 0;padding:14px;border-radius:14px;background:#f6f1e8;border:1px solid #e5dccb;font-size:12px;text-align:left;color:#2a2622;line-height:1.55}
.dense-extra.dark{background:#1e2630;border-color:#2a3848;color:#e8eef4}
.dx-h{font-weight:700;font-size:14px}
.dx-sub{margin:4px 0 10px;font-size:11px;opacity:.75;line-height:1.45}
.dx-h2{font-weight:700;font-size:12px;margin:14px 0 6px;opacity:.92}
.dx-stats{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:10px;font-size:11px;opacity:.88}
.dx-stats b{font-weight:700}
.dx-list,.dx-logs{border-radius:8px;overflow:hidden;background:rgba(0,0,0,.03)}
.dense-extra.dark .dx-list,.dense-extra.dark .dx-logs{background:rgba(255,255,255,.04)}
.dx-row,.dx-log{display:flex;gap:8px;padding:8px 10px;border-bottom:1px dashed rgba(0,0,0,.08);line-height:1.45}
.dense-extra.dark .dx-row,.dense-extra.dark .dx-log{border-bottom-color:rgba(255,255,255,.08)}
.dx-t{font-family:ui-monospace,Consolas,monospace;opacity:.55;flex-shrink:0}
.dx-comments{display:flex;flex-direction:column;gap:6px}
.dx-c{padding:8px 10px;border-radius:8px;background:rgba(255,255,255,.65);line-height:1.5}
.dense-extra.dark .dx-c{background:rgba(255,255,255,.06)}
.dx-para{margin-top:12px;padding:10px;border-radius:8px;background:rgba(201,162,75,.12);font-size:12px;line-height:1.65}
.dense-extra.dark .dx-para{background:rgba(232,160,191,.08)}
.dx-foot{margin-top:10px;font-size:10px;opacity:.55;line-height:1.4}
`

const map: Record<string, string> = {}
for (const p of PLOT_HTML_VISUAL_PRESETS) {
  map[p.id] = block(p)
}

const out = `/** Auto-generated — run: npx tsx scripts/build-theater-dense-extras.ts */
export const DENSE_EXTRA_CSS = ${JSON.stringify(css)}

export const THEATER_EGG_DENSE_EXTRAS: Record<string, string> = ${JSON.stringify(map, null, 2)}
`

fs.writeFileSync('scripts/theater-egg-dense-extras.ts', out)

let min = Infinity
let max = 0
let sum = 0
for (const id of Object.keys(map)) {
  const n = map[id].length
  min = Math.min(min, n)
  max = Math.max(max, n)
  sum += n
}
console.log(
  JSON.stringify({
    count: Object.keys(map).length,
    extraMin: min,
    extraAvg: Math.round(sum / Object.keys(map).length),
    extraMax: max,
  }),
)
