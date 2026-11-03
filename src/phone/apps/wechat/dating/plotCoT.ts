/**
 * 约会剧情：从模型整段返回中拆分「思维链 / 规划摘要 / 正文」。
 * 供存盘（DatingContext）与展示兜底（DatingStoryPage）共用。
 */

import { applyActiveCotRegexForScene } from '../../thinkingChain/cotApplyRegex'
import {
  applyStSoftTagFallbackBeautify,
  normalizeStVueBeautifyInText,
  unwrapBeautifyMarkdownFences,
} from '../../../../storyRpg/utils/stTavernHelperCompat'
import { stripVnVoiceParamsPayload } from './vnVoiceParamsStrip'

import type { PlotItem } from './types'
import { extractAndStripPlotHtmlVisual } from './datingPlotHtmlVisual'
import { extractAndStripReaderComments, stripReaderCommentAnchors } from './datingReaderComments'
import {
  extractDatingTaggedBlocks,
  promotePlotBodyFromThinkingBlob,
} from './datingPlotTaggedBlocks'
import { extractPlotSynopsisTail } from './plotSummaryTitle'
import { getAiPlotVersionSlices } from './plotVersions'

export const DATING_COT_TAG_PATTERNS: RegExp[] = [
  /<thinking\b[^>]*>([\s\S]*?)<\/thinking>/i,
  /** 少数网关/模型误用短闭合标签 */
  /<thinking\b[^>]*>([\s\S]*?)<\/think>/i,
  /<redacted_thinking\b[^>]*>([\s\S]*?)<\/redacted_thinking>/i,
  /** DeepSeek 等：think … think（与 <thinking> 区分：\<think\b 不会匹配 \<thinking） */
  /<think\b[^>]*>([\s\S]*?)<\/think>/i,
  /<logicpass\b[^>]*>([\s\S]*?)<\/logicpass>/i,
  /<reasoning\b[^>]*>([\s\S]*?)<\/reasoning>/i,
]

/** 全角尖括号、常见误输入，避免整段无法匹配 */
function normalizeCoTAngleBrackets(s: string): string {
  return s.replace(/\uFF1C/g, '<').replace(/\uFF1E/g, '>').replace(/＜/g, '<').replace(/＞/g, '>')
}

/**
 * 去掉「内心 OS」里仅有省略号/语气占位的 **…** 块（如 **我……**），避免固定前缀与旁白断裂。
 * 星号内一旦出现叙事汉字（呃、好、别等以外的实质内容）即保留。
 */
function stripEllipsisOnlyOsSpans(s: string): string {
  return String(s || '').replace(/\*\*([\s\S]*?)\*\*/g, (full, inner: string) => {
    const t = String(inner ?? '').trim()
    if (!t) return ''
    const withoutLeadingWo = t.replace(/^我\s*/, '')
    const substantive = withoutLeadingWo.replace(/[.。⋯…\s\d，,、；;:!！?？…]/gu, '')
    if (substantive.length === 0 && t.length <= 20) return ''
    return full
  })
}

function stripHtmlComments(s: string): string {
  return s.replace(/<!--[\s\S]*?-->/g, '').trim()
}

function stripFirstCoTBlock(src: string): { inner: string; rest: string } | null {
  for (const re of DATING_COT_TAG_PATTERNS) {
    const m = src.match(re)
    if (m && m.index !== undefined) {
      return {
        inner: (m[1] || '').trim(),
        rest: (src.slice(0, m.index) + src.slice(m.index + m[0].length)).trim(),
      }
    }
  }
  return null
}

/**
 * 接口截断或模型漏写闭合标签时，非贪婪正则匹配不到，`stripFirstCoTBlock` 会跳过。
 * 旧逻辑：把 `<thinking>` 之后**整段**当思维链 → 正文恒为空，界面变成「剧情进思维链、字数 0」。
 * 现改为：仅在与「典型分册思维链」体量一致时才吞掉；过长或不像分册结构则放弃本条路径，避免误吞正文。
 */
/** VN/普通约会剧情标签，不应计入 Lumi 分册思维链的【】计数 */
const VN_OR_PLOT_SCENE_BRACKET_RE =
  /^【\s*(?:旁白|对白|内心|心声|OS|os|VN语音参数|VN语音参数结束)(?:\s*[｜|][^】]*)?\s*】$/u

function countLumiStyleCoTMarkers(text: string): number {
  const brackets = text.match(/【[^】]{2,120}】/g) || []
  return brackets.filter((b) => !VN_OR_PLOT_SCENE_BRACKET_RE.test(String(b).trim())).length
}

function stripUnclosedThinkingBlock(src: string): { inner: string; rest: string } | null {
  if (/<\/thinking>/i.test(src)) return null
  const open = /<thinking\b[^>]*>/i.exec(src)
  if (!open || open.index === undefined) return null
  const after = src.slice(open.index + open[0].length).trim()
  if (!after) return null
  if (after.length > 4200) return null
  const lumiMarkers = countLumiStyleCoTMarkers(after)
  const plotSceneTags = (after.match(/【\s*(?:旁白|对白|内心|心声|OS|os)(?=\s*[｜|】])/gu) || []).length
  /** 未闭合 thinking 里若是 VN 剧情（旁白/对白等），整段当正文，避免主区域空白、字数只在折叠里 */
  if (plotSceneTags >= 1 && lumiMarkers < 2) return null
  if (after.length > 700 && lumiMarkers < 2) return null
  if (lumiMarkers < 2 && after.length < 4500) return null
  return { inner: after, rest: '' }
}

/** 是否像 Lumi 分册式思维链（用于区分「真思维链」与误塞进 thinking 的正文） */
function looksLikeStructuredCoT(s: string): boolean {
  const t = String(s || '').trim()
  if (!t) return false
  const lumiMarkers = countLumiStyleCoTMarkers(t)
  const plotSceneTags = (t.match(/【\s*(?:旁白|对白|内心|心声|OS|os)(?=\s*[｜|】])/gu) || []).length
  if (plotSceneTags >= 2 && lumiMarkers < 2) return false
  if (t.length < 160) return lumiMarkers >= 1
  if (lumiMarkers >= 3) return true
  if (/【\s*Lumi终检单\s*】|终检单】|【\s*篇幅/.test(t)) return true
  return false
}

function stripLeadingMarkdownCoT(src: string): { inner: string; rest: string } | null {
  const m = src.match(/^\s*```(?:thinking|reasoning|cot)?\s*\n([\s\S]*?)```\s*/i)
  if (!m || m.index === undefined) return null
  return {
    inner: (m[1] || '').trim(),
    rest: (src.slice(0, m.index) + src.slice(m.index + m[0].length)).trim(),
  }
}

/**
 * @returns logicPass 思维链正文（无外层标签）；planSummary 旧版一行摘要；content 纯剧情正文
 */
export function splitDatingAssistantOutput(raw: string): {
  logicPass: string
  planSummary: string
  content: string
} {
  const original = String(raw || '').trim()
  const tagged = extractDatingTaggedBlocks(original)

  let logicPass = tagged.thinking.trim()
  let planSummary = tagged.synopsis.trim().replace(/\s+/g, ' ').slice(0, 48)
  let text = normalizeCoTAngleBrackets(original)

  // 已有 <content>/【正文】等：正文以标签为准；其余块留给评论/小剧场提取器
  if (tagged.hadContentTag || tagged.content.trim()) {
    let finalContentBody = stripEllipsisOnlyOsSpans(stripHtmlComments(tagged.content))
    if (!logicPass) {
      // content 外若仍夹 thinking 标签，再剥一层
      const peel = stripFirstCoTBlock(text)
      if (peel?.inner) logicPass = peel.inner
    }
    if (!finalContentBody.trim() && logicPass.trim()) {
      const promoted = promotePlotBodyFromThinkingBlob(logicPass)
      if (promoted) {
        finalContentBody = stripEllipsisOnlyOsSpans(stripHtmlComments(promoted.content))
        logicPass = promoted.leftoverThinking
      } else if (!looksLikeStructuredCoT(logicPass) && logicPass.length > 35) {
        finalContentBody = stripEllipsisOnlyOsSpans(stripHtmlComments(logicPass))
        logicPass = ''
      }
    }
    if (!planSummary.trim()) {
      const syn = extractPlotSynopsisTail(finalContentBody)
      if (syn.summary) {
        planSummary = syn.summary
        finalContentBody = syn.content
      }
    }
    return { logicPass, planSummary, content: finalContentBody.trim() }
  }

  // 无 content 标签：走旧路径（thinking 剥离 + 裸正文）
  const first = stripFirstCoTBlock(text)
  if (first) {
    logicPass = first.inner
    text = first.rest
  }
  if (!logicPass) {
    const md = stripLeadingMarkdownCoT(text)
    if (md?.inner) {
      logicPass = md.inner
      text = md.rest
    }
  }
  if (!logicPass) {
    const unclosed = stripUnclosedThinkingBlock(text)
    if (unclosed) {
      logicPass = unclosed.inner
      text = unclosed.rest
    }
  }

  // 标签抽出的 thinking 优先
  if (tagged.thinking.trim() && !logicPass) logicPass = tagged.thinking.trim()

  const legacy = text.match(/^\s*【规划摘要】\s*([^\n]{1,160})\s*(?:\r?\n)+([\s\S]*)$/)
  let content = text
  if (legacy) {
    if (!planSummary) planSummary = legacy[1].trim()
    content = (legacy[2] || '').trim() || text
  } else {
    content = text
  }
  // rest 里可能还有未标签化正文
  if (!content.trim() && tagged.rest.trim()) content = tagged.rest

  let bodyTrim = stripEllipsisOnlyOsSpans(stripHtmlComments(content))
  let finalContentBody = bodyTrim || (logicPass || planSummary ? '' : original)

  // 空正文救援：thinking 内含 VN 剧情标签 → 提升为正文
  if (!finalContentBody.trim() && logicPass.trim()) {
    const promoted = promotePlotBodyFromThinkingBlob(logicPass)
    if (promoted) {
      finalContentBody = stripEllipsisOnlyOsSpans(stripHtmlComments(promoted.content))
      logicPass = promoted.leftoverThinking
    } else if (!looksLikeStructuredCoT(logicPass) && logicPass.length > 35) {
      finalContentBody = stripEllipsisOnlyOsSpans(stripHtmlComments(logicPass))
      logicPass = ''
    }
  }

  if (!planSummary.trim()) {
    const syn = extractPlotSynopsisTail(finalContentBody)
    if (syn.summary) {
      planSummary = syn.summary
      finalContentBody = syn.content
    }
  } else {
    const syn = extractPlotSynopsisTail(finalContentBody)
    if (syn.summary) finalContentBody = syn.content
  }

  return { logicPass, planSummary, content: finalContentBody.trim() }
}

/** 注入 prompt / 游标前原文向量索引：剥离全部思维链块（含正文中间的 `<thinking>`） */
export function stripAllCoTBlocksFromDatingText(text: string): string {
  let s = normalizeCoTAngleBrackets(String(text || '').trim())
  if (!s) return ''
  for (let i = 0; i < 16; i++) {
    const first = stripFirstCoTBlock(s)
    if (first) {
      s = first.rest.trim()
      continue
    }
    const unclosed = stripUnclosedThinkingBlock(s)
    if (unclosed) {
      s = unclosed.rest.trim()
      continue
    }
    break
  }
  return stripEllipsisOnlyOsSpans(stripHtmlComments(s)).trim()
}

/** 约会 plot 写入 prompt / 语义召回索引的正文（玩家原文保留；AI 去思维链、VN 语音参数、读者评论与 HTML 可视化块） */
export function datingPlotBodyForPromptInjection(raw: string, plotType: 'player' | 'ai'): string {
  const rawStr = String(raw || '').trim()
  if (!rawStr) return ''
  if (plotType === 'player') return rawStr
  const prose = splitDatingAssistantOutput(rawStr).content.trim()
  const sansVn = stripVnVoiceParamsPayload(prose).trim()
  const stripped = stripAllCoTBlocksFromDatingText(sansVn)
  const { content: withoutHtml } = extractAndStripPlotHtmlVisual(stripped || sansVn)
  const { content } = extractAndStripReaderComments(withoutHtml)
  return stripReaderCommentAnchors(content) || sansVn
}

/** 模型常把正文包进 ```text … ```，展示时剥掉围栏（保留内部正文） */
function unwrapMarkdownProseFences(text: string): string {
  let s = String(text ?? '')
  if (!s.includes('```')) return s
  // 成对围栏：```text / ```plaintext / 无语言
  s = s.replace(/```(?:text|plaintext|md|markdown)?\s*\r?\n?([\s\S]*?)```/gi, '$1')
  // 残留的孤立开头/结尾围栏行
  s = s.replace(/^\s*```(?:text|plaintext|md|markdown)?\s*$/gim, '')
  s = s.replace(/^\s*```\s*$/gim, '')
  return s.replace(/\n{3,}/g, '\n\n').trim()
}

/** 美化正则产出的 ```html / 裸 ``` 围栏 → 裸 HTML，便于网页渲染 */
function unwrapHtmlBeautifyFences(text: string): string {
  return unwrapBeautifyMarkdownFences(text)
}

/**
 * 隐藏展示用包装标签字样（如 &lt;content&gt;），保留标签中间正文。
 * 只剥外壳，不删内部剧情。
 */
export function stripDisplayWrapperTagShells(text: string): string {
  let s = String(text ?? '')
  if (!s) return s
  // 成对 / 自闭合 / 残缺开闭 —— 只去掉标签本身
  s = s.replace(/<\s*content\b[^>]*\/\s*>/gi, '')
  s = s.replace(/<\s*content\b[^>]*>/gi, '')
  s = s.replace(/<\s*\/\s*content\s*>/gi, '')
  // 少数模型会把标签写成转义实体露在正文里
  s = s.replace(/&lt;\s*\/?\s*content\b[^&]*&gt;/gi, '')
  return s
}

function escapeHtmlText(s: string): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * 内置兜底：:::emotion_status 标题 # 正文 ::: → 可折叠美化卡。
 * 预设正则未命中 / 转义损坏时仍能出卡片（对齐酒馆楼层内联 HTML）。
 */
const EMOTION_STATUS_CARD_CSS = `<style>
.lumi-emotion-status{width:100%;margin:14px 0;padding:10px 6px 14px;text-align:center;background:#F7F9F7;border:1px solid #DCE3DC;border-radius:12px;color:#2C3E2D;}
.lumi-emotion-status>.zd-header{list-style:none;cursor:pointer;display:inline-block;opacity:.92;padding:6px 14px;border-bottom:1px dotted #7A8B7B;color:#7A8B7B;}
.lumi-emotion-status>.zd-header::-webkit-details-marker{display:none;}
.lumi-emotion-status .zd-title{font-weight:700;font-size:13px;letter-spacing:.14em;}
.lumi-emotion-status .zd-body{margin-top:12px;}
.lumi-emotion-status .zd-line-top{width:40px;height:1px;background:#7A8B7B;margin:0 auto 12px;opacity:.4;}
.lumi-emotion-status .zd-content{text-align:left;font-size:14px;line-height:1.75;padding:0 12px;color:#2C3E2D;white-space:pre-wrap;}
.lumi-emotion-status .zd-line-bottom{width:10px;height:1px;background:#7A8B7B;margin:12px auto 0;opacity:.35;}
</style>`

function buildEmotionStatusCardHtml(title: string, body: string): string {
  const t = escapeHtmlText(title.trim() || '多维情感状态')
  const b = escapeHtmlText(body.trim())
  return `${EMOTION_STATUS_CARD_CSS}<details class="lumi-emotion-status style-zen-divider" open>
<summary class="zd-header"><span class="zd-title">${t}</span></summary>
<div class="zd-body"><div class="zd-line-top"></div><div class="zd-content">${b}</div><div class="zd-line-bottom"></div></div>
</details>`
}

/** 半角/全角 # */
const EMOTION_HASH = String.raw`[#＃]`
/** :::emotion_status 标题 # 正文 :::（与文心美化查找同形，兼容全角＃） */
const EMOTION_FENCE_RE = new RegExp(
  String.raw`:::emotion_status\s*([\s\S]*?)\s*${EMOTION_HASH}\s*([\s\S]*?)\s*:::`,
  'gi',
)
const BARE_EMOTION_RE =
  /🌠\s*【主要角色】[\s\S]*?(?:⭐️|⭐)\s*【综合判断】[^\n]*(?:\n(?!\n)[^\n]*)*/g

export type EmotionStatusSegment =
  | { type: 'prose'; text: string }
  | { type: 'emotion'; title: string; body: string }
  | { type: 'plotDirection'; title: string; body: string }

/** 剥 ```text / ``` 围栏，保留段落 */
function unwrapTextFencesForDisplay(s: string): string {
  let out = String(s ?? '')
  if (!out.includes('```')) return out.trim()
  out = out.replace(/```(?:text|plaintext|md|markdown)?\s*\r?\n?([\s\S]*?)```/gi, '\n$1\n')
  return out.replace(/\n{3,}/g, '\n\n').trim()
}

function stripHtmlToPlain(s: string): string {
  return String(s || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function extractEmotionFromDetailsHtml(
  detailsHtml: string,
): { title: string; body: string } | null {
  const titleInner =
    detailsHtml.match(/class=["'][^"']*zd-title[^"']*["'][^>]*>([\s\S]*?)<\/span>/i)?.[1] ??
    detailsHtml.match(/<summary\b[^>]*>([\s\S]*?)<\/summary>/i)?.[1]
  const bodyInner =
    detailsHtml.match(/class=["'][^"']*zd-content[^"']*["'][^>]*>([\s\S]*?)<\/div>/i)?.[1]
  if (titleInner == null && bodyInner == null) return null
  return {
    title: stripHtmlToPlain(titleInner || '') || '多维情感状态',
    body: stripHtmlToPlain(bodyInner || ''),
  }
}

/**
 * 从正文拆出情感状态 / 剧情走向 / 旁白，供 React 卡片渲染。
 * 不依赖旁白层解释 HTML，避免 &lt;details&gt; 被当成纯文字或默认折叠藏掉。
 */
export function splitEmotionStatusSegments(text: string): EmotionStatusSegment[] {
  let src = String(text ?? '')
  if (!src.trim()) return []
  // 实体还原后再拆
  if (/&lt;\s*(?:details|style|summary)\b/i.test(src)) {
    src = src.replace(/&lt;/gi, '<').replace(/&gt;/gi, '>')
  }

  const out: EmotionStatusSegment[] = []
  const pushProse = (chunk: string) => {
    if (!chunk) return
    const cleaned = chunk
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/^\s*:::emotion_status[^\n]*$/gim, '')
      .replace(/^\s*:::\s*$/gim, '')
      .replace(/\n{3,}/g, '\n\n')
    if (cleaned.trim()) out.push({ type: 'prose', text: cleaned })
  }

  // 剧情走向 details（常含 ```text，勿当小剧场/情感卡）
  if (/<details\b/i.test(src) && /剧情走向/u.test(src)) {
    let last = 0
    const re = /<details\b[^>]*>\s*<summary\b[^>]*>([\s\S]*?)<\/summary>([\s\S]*?)<\/details>/gi
    let m: RegExpExecArray | null
    let hit = false
    while ((m = re.exec(src)) !== null) {
      const summary = stripHtmlToPlain(m[1] || '')
      if (!/剧情走向/u.test(summary)) continue
      pushProse(src.slice(last, m.index))
      out.push({
        type: 'plotDirection',
        title: summary || '剧情走向',
        body: stripHtmlToPlain(unwrapTextFencesForDisplay(m[2] || '')),
      })
      last = m.index + m[0].length
      hit = true
    }
    if (hit) {
      pushProse(src.slice(last))
      // 继续往下拆剩余 prose 里的情感块：把已推入的段再展开太复杂，
      // 对剩余 prose 递归拆情感即可
      const merged: EmotionStatusSegment[] = []
      for (const seg of out) {
        if (seg.type !== 'prose') {
          merged.push(seg)
          continue
        }
        const sub = splitEmotionStatusSegmentsWithoutPlotDirection(seg.text)
        merged.push(...sub)
      }
      return merged.length ? merged : [{ type: 'prose', text: src }]
    }
  }

  return splitEmotionStatusSegmentsWithoutPlotDirection(src)
}

function splitEmotionStatusSegmentsWithoutPlotDirection(text: string): EmotionStatusSegment[] {
  const src = String(text ?? '')
  if (!src.trim()) return []

  const out: EmotionStatusSegment[] = []
  const pushProse = (chunk: string) => {
    if (!chunk) return
    const cleaned = chunk
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/^\s*:::emotion_status[^\n]*$/gim, '')
      .replace(/^\s*:::\s*$/gim, '')
      .replace(/\n{3,}/g, '\n\n')
    if (cleaned.trim()) out.push({ type: 'prose', text: cleaned })
  }

  if (/:::emotion_status/i.test(src)) {
    let last = 0
    const re = new RegExp(EMOTION_FENCE_RE.source, 'gi')
    let m: RegExpExecArray | null
    while ((m = re.exec(src)) !== null) {
      pushProse(src.slice(last, m.index))
      out.push({
        type: 'emotion',
        title: String(m[1] || '').trim() || '多维情感状态',
        body: String(m[2] || '').trim(),
      })
      last = m.index + m[0].length
    }
    pushProse(src.slice(last))
    if (out.some((s) => s.type === 'emotion')) return out
  }

  // 预设正则 / 内置已换成 details 时：抽回 title/body → React 卡
  if (/style-zen-divider|lumi-emotion-status/i.test(src) && /<details\b/i.test(src)) {
    let last = 0
    const re =
      /<details\b[^>]*>[\s\S]*?<\/details>/gi
    let m: RegExpExecArray | null
    let hit = false
    while ((m = re.exec(src)) !== null) {
      const block = m[0]
      if (!/style-zen-divider|lumi-emotion-status|zd-content|zd-title/i.test(block)) {
        continue
      }
      const parsed = extractEmotionFromDetailsHtml(block)
      if (!parsed) continue
      pushProse(src.slice(last, m.index))
      out.push({ type: 'emotion', title: parsed.title, body: parsed.body })
      last = m.index + m[0].length
      hit = true
    }
    if (hit) {
      pushProse(src.slice(last))
      return out.length ? out : [{ type: 'prose', text: src }]
    }
  }

  if (/🌠\s*【主要角色】/.test(src)) {
    let last = 0
    const re = new RegExp(BARE_EMOTION_RE.source, 'g')
    let m: RegExpExecArray | null
    while ((m = re.exec(src)) !== null) {
      pushProse(src.slice(last, m.index))
      out.push({
        type: 'emotion',
        title: '多维情感状态',
        body: String(m[0] || '').trim(),
      })
      last = m.index + m[0].length
    }
    pushProse(src.slice(last))
    if (out.some((s) => s.type === 'emotion')) return out
  }

  return [{ type: 'prose', text: src }]
}

export function applyBuiltinEmotionStatusBeautify(text: string): string {
  let src = String(text ?? '')
  // 与文心/酒馆美化规则同形：:::emotion_status 标题 # 正文 :::
  if (/:::emotion_status/i.test(src)) {
    src = src.replace(EMOTION_FENCE_RE, (_full, titleRaw: string, bodyRaw: string) =>
      buildEmotionStatusCardHtml(String(titleRaw || ''), String(bodyRaw || '')),
    )
  }
  // 已是卡片则跳过；否则把裸 🌠【主要角色】…⭐【综合判断】收成卡（模型常漏围栏）
  if (/lumi-emotion-status|style-zen-divider/i.test(src)) return src
  if (!/🌠\s*【主要角色】/.test(src)) return src
  src = src.replace(BARE_EMOTION_RE, (block) =>
    buildEmotionStatusCardHtml('多维情感状态', block),
  )
  return src
}

function prepareAssistantBodyCore(
  raw: string,
  opts: { keepReaderAnchors: boolean },
): { thinkingText: string; body: string } {
  const sp = splitDatingAssistantOutput(raw)
  let thinkingText = (sp.logicPass || sp.planSummary || '').trim()
  let body = stripVnVoiceParamsPayload(sp.content)
  if (!body.trim() && thinkingText.trim()) {
    const lp = thinkingText.trim()
    if (!looksLikeStructuredCoT(lp) && lp.length > 35) {
      body = stripVnVoiceParamsPayload(lp)
      thinkingText = ''
    }
  }
  body = extractAndStripPlotHtmlVisual(body).content
  body = extractAndStripReaderComments(body).content
  if (!opts.keepReaderAnchors) {
    body = stripReaderCommentAnchors(body)
  }
  // 先只剥旁白围栏；美化 ``` 交给展示正则 + 助手兼容层（对齐 ST→助手）
  body = unwrapMarkdownProseFences(body)
  // 展示阶段正则（月读等 markdownOnly 美化）
  body = applyActiveCotRegexForScene(body, 'offline', 'display')
  // 正则替换串里的 ```html / 裸 ``` → 裸 HTML，再按助手规则包壳
  body = unwrapHtmlBeautifyFences(body)
  body = normalizeStVueBeautifyInText(body)
  // 预设未命中时仍把 :::emotion_status 围栏收成卡片
  body = applyBuiltinEmotionStatusBeautify(body)
  // giggle 等无独立美化规则的软标签兑底
  body = applyStSoftTagFallbackBeautify(body)
  body = stripDisplayWrapperTagShells(body)
  return { thinkingText, body }
}

/** 思维溯源 / 主界面展示：与 split 规则一致，并剥离 VN 语音参数 / 读者评论 / 物证 HTML 块 */
export function resolveDatingAssistantDisplayText(raw: string): {
  thinkingText: string
  displayBody: string
} {
  const { thinkingText, body } = prepareAssistantBodyCore(raw, { keepReaderAnchors: false })
  return { thinkingText, displayBody: body }
}

/**
 * 故事流卡片正文：应用预设正则 / 去围栏，但保留【读者讨论位】锚点供穿插评论。
 */
export function prepareDatingFeedBody(raw: string): string {
  return prepareAssistantBodyCore(raw, { keepReaderAnchors: true }).body
}

/** StoryBlock 展示：优先当前版本正文，并与 resolveDatingAssistantDisplayText 对齐 */
export function resolveDatingPlotDisplayFromItem(plot: PlotItem): {
  thinkingText: string
  displayBody: string
} {
  if (plot.type !== 'ai') {
    return { thinkingText: '', displayBody: String(plot.content || '') }
  }
  const slices = getAiPlotVersionSlices(plot)
  const raw = String(slices.body || plot.content || '').trim()
  const storedCoT = (slices.logicPass || plot.logicPass || '').trim()
  const resolved = resolveDatingAssistantDisplayText(raw)
  let thinkingText =
    (storedCoT || resolved.thinkingText || plot.planSummary?.trim() || '').trim()
  let displayBody = resolved.displayBody
  if (!displayBody.trim() && thinkingText.trim()) {
    const promoted = resolveDatingAssistantDisplayText(thinkingText)
    if (promoted.displayBody.trim()) {
      displayBody = promoted.displayBody
      if (!looksLikeStructuredCoT(thinkingText)) thinkingText = promoted.thinkingText
    }
  }
  return { thinkingText, displayBody }
}
