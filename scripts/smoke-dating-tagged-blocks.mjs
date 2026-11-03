/**
 * Smoke: dating plot tagged-block extract / promote (no Vite deps).
 * Run: npx tsx scripts/smoke-dating-tagged-blocks.mjs
 */
import {
  extractDatingTaggedBlocks,
  promotePlotBodyFromThinkingBlob,
  stripDatingTaggedKind,
} from '../src/phone/apps/wechat/dating/datingPlotTaggedBlocks.ts'

function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg)
    process.exitCode = 1
    throw new Error(msg)
  }
  console.log('ok:', msg)
}

/** Mirror of plotCoT content-first path (enough to assert 0W rescue) */
function splitLike(raw) {
  const tagged = extractDatingTaggedBlocks(String(raw || '').trim())
  let logicPass = tagged.thinking.trim()
  let planSummary = tagged.synopsis.trim().replace(/\s+/g, ' ').slice(0, 48)
  if (tagged.hadContentTag || tagged.content.trim()) {
    let content = tagged.content
    if (!content.trim() && logicPass.trim()) {
      const promoted = promotePlotBodyFromThinkingBlob(logicPass)
      if (promoted) {
        content = promoted.content
        logicPass = promoted.leftoverThinking
      }
    }
    return { logicPass, planSummary, content: content.trim() }
  }
  let content = tagged.rest
  if (!content.trim() && logicPass.trim()) {
    const promoted = promotePlotBodyFromThinkingBlob(logicPass)
    if (promoted) {
      content = promoted.content
      logicPass = promoted.leftoverThinking
    }
  }
  return { logicPass, planSummary, content: content.trim() }
}

{
  const r = extractDatingTaggedBlocks(`<thinking>场记</thinking>
<content>【旁白】雨还在下。</content>
<synopsis>雨夜重逢</synopsis>`)
  assert(r.thinking.includes('场记'), 'xml thinking')
  assert(r.content.includes('雨还在下'), 'xml content')
  assert(r.synopsis.includes('雨夜重逢'), 'xml synopsis')
  assert(r.hadContentTag, 'xml hadContentTag')
}

{
  const r = extractDatingTaggedBlocks(`【正文】
【对白｜他】你好。
【/正文】
【读者评论】
#1
★|路人|12|甜
【读者评论结束】
【小剧场】
<details><summary>x</summary></details>
【小剧场结束】
【本节梗概】见面打招呼
`)
  assert(r.content.includes('你好'), 'bracket content')
  assert(r.comments.includes('★|路人'), 'bracket comments')
  assert(r.theater.includes('<details>'), 'bracket theater')
  assert(
    r.synopsis.includes('见面打招呼') || r.rest.includes('见面打招呼'),
    'bracket synopsis or rest',
  )
}

{
  const r = extractDatingTaggedBlocks(`<thinking>计划</thinking>
<content>【旁白】他推开门。
<synopsis>推门</synopsis>`)
  assert(r.content.includes('推开门'), 'unclosed content rescued')
  assert(r.synopsis.includes('推门'), 'synopsis after unclosed content')
  assert(!r.content.includes('<synopsis'), 'synopsis not inside content')
}

{
  const r = extractDatingTaggedBlocks(`＜content＞正文Ａ＜/content＞`)
  assert(r.content.includes('正文Ａ'), 'fullwidth angles')
}

{
  const p = promotePlotBodyFromThinkingBlob(`【总控】短
【旁白】月亮升起来了。
【对白｜她】走吧。`)
  assert(!!p && p.content.includes('月亮升起来了'), 'promote VN from thinking')
  assert(!!p && p.leftoverThinking.includes('总控'), 'leftover keeps cot')
}

{
  const a = splitLike(`<thinking>【总控】ok</thinking>
<content>【旁白】咖啡馆里很安静。</content>
<synopsis>咖啡馆</synopsis>`)
  assert(a.content.includes('咖啡馆'), 'split content tag')
  assert(a.logicPass.includes('总控'), 'split thinking')
  assert(a.planSummary.includes('咖啡馆'), 'split synopsis')
}

{
  const b = splitLike(`<thinking>
【总控】只写了场记却没闭合 content
【旁白】他把伞递给她。
【对白｜他】拿着。
</thinking>`)
  assert(b.content.includes('把伞递给她'), 'rescue VN from thinking when no content tag')
}

{
  // Classic blank-plot: unclosed thinking, then <content> — must not be 0W
  const c = splitLike(`<thinking>
【总控】a
【情感协议】b
【主轴】c
【时空】d
【线上事实】e
【知情边界】f
【关系温度】g
【创作自检】h
【推进】i
【代写边界】j
【落笔】k
【终检】l
<content>【旁白】真正的正文在这里，有足够的汉字保证不是空壳剧情。</content>
`)
  assert(
    c.content.includes('真正的正文'),
    'content after unclosed thinking extracted: ' + JSON.stringify(c).slice(0, 280),
  )
  assert(c.content.length > 10, 'content not empty (0W)')
}

{
  const s = stripDatingTaggedKind(`<content>A</content><comments>B</comments>`, 'comments')
  assert(s.includes('A') && !s.includes('B'), 'strip comments')
}

console.log('\nAll smoke cases passed.')
