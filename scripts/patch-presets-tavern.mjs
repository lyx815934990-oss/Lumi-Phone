import fs from 'node:fs'

const p = 'src/phone/apps/wechat/dating/datingPlotHtmlVisualPresetsData.ts'
let t = fs.readFileSync(p, 'utf8')

t = t.replace(
  '参考极光小剧场拟真 UI 番外气质；输出走本项目 HTML 片段（禁 script/on*）。',
  '参考酒馆 snow + 拟真 UI 番外；输出完整 HTML+CSS+JS 文档（禁 createElement 动态拼 DOM）。',
)
t = t.replace(/可用 :checked 揭晓/g, '可用 JS 切换揭晓')
t = t.replace(/转盘\/密码位用 :checked 模拟开锁/g, '转盘/密码位用 JS 模拟开锁')
t = t.replace(/可用:checked示意已过期/g, '可用 JS 示意已过期')
t = t.replace(/禁 script；用 :checked 示意勾选。/g, '用 JS 示意勾选与结算确认。')
t = t.replace(/密码位 :checked 示意/g, '密码位 JS 示意')
t = t.replace(/:checked/g, 'JS')

const EXTRA = [
  "      '【酒馆】完整 HTML 文档 + 内联 style/script；标题用 title-custom',",
  "      '【酒馆】至少 1 处 JS 互动；禁 createElement/innerHTML 拼结构',",
  "      '【酒馆】emoji 圆框头像或符号位 + 旁观 NPC 吐槽 + pollinations 场景图 1 张',",
]

if (!t.includes('【酒馆】完整 HTML')) {
  let n = 0
  t = t.replace(/structure: \[([\s\S]*?)\n    \],/g, (m, body) => {
    if (body.includes('【酒馆】')) return m
    n++
    return 'structure: [' + body.replace(/\s*$/, '') + '\n' + EXTRA.join('\n') + '\n    ],'
  })
  console.log('tavern lines', n)
} else {
  console.log('already has tavern lines')
}

fs.writeFileSync(p, t)
console.log('禁 script left?', /禁\s*script/.test(t))
console.log(':checked left?', t.includes(':checked'))
