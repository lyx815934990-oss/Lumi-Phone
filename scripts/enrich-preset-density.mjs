import fs from 'node:fs'

const p = 'src/phone/apps/wechat/dating/datingPlotHtmlVisualPresetsData.ts'
let t = fs.readFileSync(p, 'utf8')
if (t.includes('【密度】主区块')) {
  console.log('already enriched')
  process.exit(0)
}
const EXTRA = [
  "      '【密度】主区块≥4；列表/评论≥8条（含时间或副标）',",
  "      '【密度】须含统计条/提示条/页脚备注至少两类次要层',",
  "      '【密度】贴本轮≥3处细节；正文信息量对标真机长截图',",
]
let n = 0
t = t.replace(/structure: \[([\s\S]*?)\n    \],/g, (m, body) => {
  if (body.includes('【密度】')) return m
  n++
  return 'structure: [' + body.replace(/\s*$/, '') + '\n' + EXTRA.join('\n') + '\n    ],'
})
fs.writeFileSync(p, t)
console.log('enriched', n)
