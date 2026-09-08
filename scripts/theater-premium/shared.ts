/** 共享：叙事锚点、材质 CSS 片段、顶格输出 */
export const N = {
  name: '祁洵',
  rain: '雨夜',
  umbrella: '伞',
  store: '便利店',
  food: '关东煮',
  closer: '靠过来一点',
  stay: '别先走',
  lamp: '灯坏了',
}

export function flat(html: string): string {
  return html
    .split('\n')
    .map((l) => l.replace(/^\s+/, ''))
    .filter((l) => l.length)
    .join('\n')
}

export function page(opts: {
  id: string
  title: string
  emoji: string
  foreword: string
  css: string
  body: string
  script: string
  prev?: string
  next?: string
}): string {
  const nav = `<div class="egg-nav"><a href="../index.html">目录</a>${
    opts.prev ? `<a href="./${opts.prev}.html">上一张</a>` : `<span>上一张</span>`
  }<b>#${opts.id} ${opts.title}</b>${
    opts.next ? `<a href="./${opts.next}.html">下一张</a>` : `<span>下一张</span>`
  }</div>`

  return flat(`<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>#${opts.id} ${opts.title} · 小剧场</title>
<style>
*{box-sizing:border-box}
html,body{margin:0;padding:0;height:auto;overflow:auto;font-family:"PingFang SC","Microsoft YaHei","Segoe UI",sans-serif}
.egg-nav{position:sticky;top:0;z-index:50;display:flex;flex-wrap:wrap;gap:10px;align-items:center;padding:8px 12px;background:rgba(20,18,16,.92);color:#f0e6d8;font-size:12px;backdrop-filter:blur(8px)}
.egg-nav a{color:#f5d78a;text-decoration:none}
.egg-nav b{flex:1;text-align:center;font-weight:650;letter-spacing:.04em}
.egg-nav span{opacity:.4}
.fore{max-width:800px;margin:0 auto;padding:10px 16px 0;text-align:center;font-size:12px;font-style:italic;opacity:.75;line-height:1.5}
.title-custom{margin:0;font-weight:700}
${opts.css}
</style>
</head>
<body>
${nav}
<p class="fore">${opts.foreword}</p>
${opts.body}
<script>
${opts.script}
</script>
</body>
</html>`)
}

/** 纸张噪点 */
export const PAPER = `background-color:#f4efe6;background-image:radial-gradient(rgba(90,70,40,.06) 0.6px,transparent 0.6px),linear-gradient(180deg,#f7f2e8,#efe6d6);background-size:3px 3px,auto;`

export const TICKET = `background:
repeating-linear-gradient(90deg,transparent,transparent 11px,rgba(0,0,0,.04) 11px,rgba(0,0,0,.04) 12px),
linear-gradient(180deg,#fff8ee,#f3e6d2);`

export const VELVET = `background:radial-gradient(ellipse at 30% 20%,#3a2438,#140e18 70%);color:#f3e6f0;`

export const TERMINAL = `background:#0b0f14;color:#9dffc2;font-family:ui-monospace,Consolas,"PingFang SC",monospace;`
