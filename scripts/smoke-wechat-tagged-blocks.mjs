/**
 * Smoke: wechat online tagged msg/tr expand + format-lock / peel discard / wrong-lang.
 * Lecture/peel/lock patterns mirrored from wechatChatLanguage (no Vite asset imports).
 * Run: npx tsx scripts/smoke-wechat-tagged-blocks.mjs
 */
import { expandWechatTaggedReplyToPlain } from '../src/phone/apps/wechat/wechatTaggedBlocks.ts'

function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg)
    process.exitCode = 1
    throw new Error(msg)
  }
  console.log('ok:', msg)
}

/** Mirror of looksLikeScriptMetaAnalysisNotTranslation (lecture subset + core) */
function looksLikeLecture(text) {
  const t = String(text ?? '').trim()
  if (!t) return false
  if (/^\*{0,2}第\s*[\d０-９]+(?:\s*[、，,～~\-－]\s*[\d０-９]+)*\s*条/.test(t)) return true
  if (/日文对话翻译|方便参考语气/.test(t)) return true
  if (
    /自然口语版|拆解参考|强调突然感|几种译法|多种译法|翻译选项|译法对比|参考语气|语气拆解|字词拆解/.test(
      t,
    )
  )
    return true
  if (/傲娇\s*[／/]\s*害羞|害羞版|傲娇版/.test(t) && /译|翻译|版/.test(t)) return true
  if (/Here are a few (?:natural )?ways to translate|Key Nuances/i.test(t)) return true
  return false
}

function looksLikeWrongTargetZh(text) {
  const t = String(text ?? '').trim()
  if (!t) return true
  const han = (t.match(/[\u4e00-\u9fff]/g) || []).length
  const latin = (t.match(/[A-Za-z]/g) || []).length
  if (latin >= 14 && han < 4) return true
  if (/^(?:Here |The |This |Key |Casual |Playful |Direct |Translation |Nuance )/i.test(t))
    return true
  if (/\b(?:ways to translate|Key Nuances|Most Common)\b/i.test(t)) return true
  return false
}

function stripTrMarker(text) {
  let t = String(text ?? '').trim()
  for (let i = 0; i < 6 && t; i += 1) {
    const next = t.replace(/^(?:\[译\]|【译】|\[翻译\]|【翻译】)\s*/u, '').trim()
    if (next === t) break
    t = next
  }
  return t
}

function stripChannelLeak(text) {
  let t = String(text ?? '').trim()
  const re =
    /^(?:[（(]\s*(?:对方|用户|自己|角色|联系人)?\s*语音(?:\s*[，,、]\s*情绪[：:][^）)]*)?\s*[）)]|[（(]\s*语音(?:\s*[，,、]\s*情绪[：:][^）)]*)?\s*[）)]|\[语音\]|【语音】)\s*/u
  for (let i = 0; i < 4 && t; i += 1) {
    const next = t.replace(re, '').trim()
    if (next === t) break
    t = next
  }
  for (let i = 0; i < 2 && t; i += 1) {
    const next = t
      .replace(/^[（(]\s*[^\s）)]{1,24}语音(?:\s*[，,、]\s*情绪[：:][^）)]*)?\s*[）)]\s*/u, '')
      .trim()
    if (next === t) break
    t = next
  }
  return t
}

function sanitizeTr(text, opts) {
  const t = stripChannelLeak(stripTrMarker(text))
  if (!t) return null
  if (looksLikeLecture(t)) return null
  if (opts?.targetLanguage === 'zh-CN' && looksLikeWrongTargetZh(t)) return null
  return t
}

function peelSyncTr(lines, opts) {
  const outLines = []
  const translations = []
  const discard = opts?.discardTranslations === true
  for (const raw of lines) {
    const line = String(raw ?? '')
    const m = line.trim().match(/^(?:\[译\]|【译】|\[翻译\]|【翻译】)\s*(.*)$/u)
    if (m) {
      if (!discard) {
        const tr = sanitizeTr(stripTrMarker(String(m[1] ?? '')), {
          targetLanguage: opts?.targetLanguage,
        })
        if (tr && outLines.length > 0) {
          translations[outLines.length - 1] = tr
        }
      }
      continue
    }
    if (looksLikeLecture(line.trim())) continue
    outLines.push(line)
    translations.push(undefined)
  }
  return { lines: outLines, translations }
}

/** Mirror of buildWechatTurnFormatLockAppendix core phrases */
function buildTurnLock(opts) {
  const syncOn = opts.translationSyncEnabled === true
  if (!syncOn) {
    return (
      `【本轮输出格式锁 · 最高优先 · 压过上下文】` +
      `**同步翻译：关**。` +
      `历史里即使用户开过翻译、出现过 \`[译]\`，**本轮禁止**输出 \`[译]\`。` +
      `只按本轮格式指令；上下文仅供剧情事实，不得覆盖本锁。`
    )
  }
  return (
    `【本轮输出格式锁 · 最高优先 · 压过上下文】` +
    `**同步翻译：开（模型同轮）**；\`[译]\` 内必须是 **简体中文** 的一句忠实译文。` +
    `禁止英文讲义。历史旧译格式以**本轮**为准。`
  )
}

{
  const { text, hadTags } = expandWechatTaggedReplyToPlain(`<msg>你好呀</msg>
<tr>Hi there</tr>
表情包 捂脸
<msg>晚安</msg>`)
  assert(hadTags, 'had tags')
  const peeled = peelSyncTr(text.split(/\n/).filter(Boolean))
  assert(peeled.lines.includes('你好呀'), 'msg body')
  assert(peeled.lines.includes('表情包 捂脸'), 'sticker line kept')
  assert(peeled.lines.includes('晚安'), 'second msg')
  assert(peeled.translations[0] === 'Hi there', 'tr attached to first msg')
}

{
  const { text } = expandWechatTaggedReplyToPlain(`<wechat_reply>
<msg>第一句</msg>
【动描】他按灭了屏幕
</wechat_reply>`)
  assert(text.includes('第一句'), 'shell peel msg')
  assert(text.includes('【动描】'), 'shell peel action')
}

{
  const { text, hadTags } = expandWechatTaggedReplyToPlain(`短句一
短句二`)
  assert(!hadTags, 'legacy no tags')
  assert(text.includes('短句一') && text.includes('短句二'), 'legacy passthrough')
}

{
  const { text } = expandWechatTaggedReplyToPlain(`<msg>未闭合日文
<tr>一句译文</tr>`)
  assert(text.includes('未闭合日文'), 'unclosed msg rescued')
  assert(text.includes('[译]一句译文'), 'tr after unclosed msg')
}

{
  assert(looksLikeLecture('自然口语版：你干嘛突然提起这茬'), 'lecture 自然口语版')
  assert(looksLikeLecture('拆解参考：なにを＝什么'), 'lecture 拆解参考')
  assert(!looksLikeLecture('你干嘛突然提起这茬啊……！？'), 'plain translation ok')
}

{
  const peeled = peelSyncTr([
    'なにを急に思い返して言い出してるの......っ',
    '[译]自然口语版：你干嘛突然提起这茬\n拆解参考：なにを＝什么',
  ])
  assert(peeled.lines.length === 1, 'fake [译] dropped, bubble kept')
  assert(peeled.translations[0] == null, 'no fake translation attached')
}

{
  const expanded = expandWechatTaggedReplyToPlain(`日文对白一行
自然口语版：假翻译讲义
拆解参考：xxx`)
  const peeled = peelSyncTr(expanded.text.split(/\n/).filter(Boolean))
  assert(
    peeled.lines.every((b) => !/自然口语版|拆解参考/.test(b)),
    'lecture lines dropped: ' + JSON.stringify(peeled.lines),
  )
  assert(peeled.lines.some((b) => b.includes('日文对白')), 'keep dialogue')
}

{
  const off = buildTurnLock({ translationSyncEnabled: false, translationLanguage: 'zh-CN' })
  assert(/同步翻译：关/.test(off), 'lock says sync off')
  assert(/禁止/.test(off) && /\[译\]/.test(off), 'lock forbids [译] when off')
  assert(/压过上下文/.test(off), 'lock beats context')

  const on = buildTurnLock({
    translationSyncEnabled: true,
    translationLanguage: 'zh-CN',
  })
  assert(/同步翻译：开/.test(on), 'lock says sync on')
  assert(/简体中文/.test(on), 'lock pins zh-CN target')
}

{
  const discarded = peelSyncTr(
    ['なにを急に', '[译]你干嘛突然', '第二句', '[译]second'],
    { discardTranslations: true },
  )
  assert(discarded.lines.join('|') === 'なにを急に|第二句', 'sync-off discards [译] lines')
  assert(discarded.translations.every((t) => t == null), 'sync-off attaches nothing')
}

{
  assert(
    sanitizeTr(
      'Here are a few natural ways to translate this depending on the context',
      { targetLanguage: 'zh-CN' },
    ) == null,
    'English lecture rejected for zh-CN target',
  )
  assert(
    sanitizeTr('你干嘛突然提起这茬啊', { targetLanguage: 'zh-CN' }) === '你干嘛突然提起这茬啊',
    'Chinese translation kept for zh-CN',
  )
}

{
  const { text } = expandWechatTaggedReplyToPlain(
    `<msg>ちょ、ちょっと</msg>\n<tr>[译]等、等一下</tr>`,
  )
  assert(text.includes('[译]等、等一下'), 'tr inner [译] stripped once before prefix')
  assert(!text.includes('[译][译]'), 'no doubled [译] marker')
  const peeled = peelSyncTr(text.split(/\n/).filter(Boolean))
  assert(peeled.translations[0] === '等、等一下', 'stored translation has no [译] prefix')
}

{
  // 模型在单个 msg 内软换行（「笑」另起一行 / 长句断行）时，不得拆成多气泡，否则 tr 错绑重复
  const raw = `<msg>盛亦くんがそうやって真っ直ぐに褒めてくれるからだよ
笑</msg>
<tr>盛亦你总是那样直率地夸我，我才会变这样的呀笑</tr>


<msg>僕も、盛亦くんのこと可愛くて仕方ないから……これからもたくさん、僕の全部を
盛亦くんに見せてあげるね笑</msg>
<tr>我也是，觉得盛亦可爱得不行……所以以后也要
把我的全部，全都展示给盛亦看哦笑</tr>


<msg>[表情包] 喜欢你呀
</msg>`
  const { text, hadTags } = expandWechatTaggedReplyToPlain(raw)
  assert(hadTags, 'soft-wrap case had tags')
  const rows = text.split(/\n/).filter(Boolean)
  assert(rows.length === 5, `soft-wrap → 2 msg + 2 tr + sticker, got ${rows.length}: ${JSON.stringify(rows)}`)
  assert(
    rows[0] === '盛亦くんがそうやって真っ直ぐに褒めてくれるからだよ 笑',
    'first msg soft-wrap collapsed to one bubble',
  )
  assert(rows[1] === '[译]盛亦你总是那样直率地夸我，我才会变这样的呀笑', 'tr1 after first msg')
  assert(
    rows[2] ===
      '僕も、盛亦くんのこと可愛くて仕方ないから……これからもたくさん、僕の全部を 盛亦くんに見せてあげるね笑',
    'second msg soft-wrap collapsed',
  )
  assert(rows[3].startsWith('[译]我也是'), 'tr2 after second msg')
  assert(rows[4] === '[表情包] 喜欢你呀', 'sticker msg kept')
  const peeled = peelSyncTr(rows)
  assert(peeled.lines.length === 3, 'peel keeps 2 text + sticker')
  assert(peeled.translations[0]?.includes('直率地夸我'), 'tr1 on first bubble only')
  assert(peeled.translations[1]?.includes('可爱得不行'), 'tr2 on second bubble only')
  assert(peeled.translations[2] == null, 'sticker has no tr')
}

{
  assert(
    sanitizeTr('[译][译] 打电话的时候被你恶作剧', { targetLanguage: 'zh-CN' }) ===
      '打电话的时候被你恶作剧',
    'sanitize strips nested [译] prefixes',
  )
}

{
  assert(
    sanitizeTr('（对方语音）被你这么一说，下次见面我都没法正视盛亦的脸了啦……', {
      targetLanguage: 'zh-CN',
    }) === '被你这么一说，下次见面我都没法正视盛亦的脸了啦……',
    'sanitize strips （对方语音） channel leak',
  )
  assert(
    sanitizeTr('（花村恒语音）下次见面……', { targetLanguage: 'zh-CN' }) === '下次见面……',
    'sanitize strips name+语音 channel leak',
  )
}

console.log('\nAll wechat tagged-block smoke cases passed.')
