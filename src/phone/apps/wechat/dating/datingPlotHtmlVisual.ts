/**
 * 剧情可视化 HTML 块：与正文同轮输出，客户端折叠展示。
 * 产品名：**小剧场**（兼容旧标记「物证映像」「剧情可视化」）
 * 输出壳对齐酒馆 snow：完整 HTML+CSS+JS；消毒放行 script。
 */

import { extractDatingTaggedBlocks, stripDatingTaggedKind } from './datingPlotTaggedBlocks'
import { buildPlotHtmlVisualPresetAppendix } from './datingPlotHtmlVisualPresets'

/** 场控面板 · 功能显示名 */
export const PLOT_ARTIFACT_VISUAL_NAME = '小剧场'

/** 场控面板 · 功能说明（一行） */
export const PLOT_ARTIFACT_VISUAL_HINT =
  '开启后同轮生成可折叠的互动小剧场，可贴合当轮情节；可随机抽取或指定类型'

const DEFAULT_TITLE = PLOT_ARTIFACT_VISUAL_NAME
/** 小剧场默认上限；IF「本地 HTML」可更长，避免消毒硬截断把 </style> 砍掉变成裸文字 */
const HTML_MAX_CHARS = 96_000
const HTML_MAX_CHARS_BROWSER_PREVIEW = 480_000

export type PlotHtmlVisual = {
  title: string
  html: string
  /** summary 中的 emoji，可选 */
  emoji?: string
  updatedAt?: number
}

const MEMORY_DELIMITER_MARKERS = ['<<<DATING_UNIFIED_MEMORY>>>', '<<<DATING_UNIFIED_MEMORY_JSON>>>']

const BLOCK_NAME = String.raw`(?:小剧场|剧情可视化|物证映像)`

const BLOCK_RE = new RegExp(
  String.raw`【\s*${BLOCK_NAME}\s*】\s*([\s\S]*?)【\s*${BLOCK_NAME}\s*结束\s*】`,
  'iu',
)
const BLOCK_OPEN_RE = new RegExp(String.raw`【\s*${BLOCK_NAME}\s*】\s*([\s\S]*)$`, 'iu')
const BLOCK_XML_RE =
  /<plot_html\b(?:[^>]*\btitle=["']([^"']*)["'])?[^>]*>([\s\S]*?)<\/plot_html>/i
const THEATER_XML_RE = /<theater\b[^>]*>([\s\S]*?)<\/theater>/i
const SNOW_RE = /<snow\b[^>]*>([\s\S]*?)<\/snow>/i

/** 仍禁止嵌套逃逸类标签；script 单独放行；stylesheet link 见下白名单 */
const FORBIDDEN_TAG_RE =
  /<\s*\/?\s*(iframe|object|embed|base|form|frame|frameset|applet)\b[^>]*>/gi
/** 浏览器预览级：保留 form（表格/美化页常用），只剥可逃逸嵌套 */
const FORBIDDEN_TAG_BROWSER_PREVIEW_RE =
  /<\s*\/?\s*(iframe|object|embed|base|frame|frameset|applet)\b[^>]*>/gi
/** 非样式表的 <link> 仍剥（防导航/prefetch 逃逸） */
const LINK_STRIP_RE =
  /<\s*link\b(?![^>]*\brel\s*=\s*["'][^"']*stylesheet[^"']*["'])[^>]*>/gi
/** meta 仅保留 charset / viewport */
const META_STRIP_RE =
  /<\s*meta\b(?![^>]*\bcharset\b)(?![^>]*\bname\s*=\s*["']viewport["'])[^>]*>/gi
const EVENT_ATTR_RE = /\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi
const JS_URL_RE = /(?:href|src|xlink:href)\s*=\s*("|')\s*javascript:[^"']*\1/gi
const DATA_URL_SCRIPT_RE = /(?:href|src)\s*=\s*("|')\s*data:text\/html[^"']*\1/gi
/** 样式表仅放行 https CDN（月读标题美化 / Font Awesome） */
const STYLESHEET_HREF_RE =
  /<\s*link\b([^>]*\brel\s*=\s*["'][^"']*stylesheet[^"']*["'][^>]*)>/gi

function trimBeforeMemoryDelimiter(text: string): string {
  let s = String(text || '')
  for (const marker of MEMORY_DELIMITER_MARKERS) {
    const idx = s.indexOf(marker)
    if (idx >= 0) s = s.slice(0, idx)
  }
  return s.trim()
}

function parseTitleLine(raw: string): { title: string; rest: string } {
  const lines = String(raw || '').split(/\r?\n/)
  if (!lines.length) return { title: DEFAULT_TITLE, rest: '' }
  const first = lines[0]!.trim()
  const m =
    first.match(/^标题\s*[：:]\s*(.+)$/u) ||
    first.match(/^title\s*[：:]\s*(.+)$/iu) ||
    first.match(/^【\s*(.+?)\s*】$/u)
  if (m?.[1]?.trim()) {
    return {
      title: m[1].trim().slice(0, 48),
      rest: lines.slice(1).join('\n').trim(),
    }
  }
  return { title: DEFAULT_TITLE, rest: String(raw || '').trim() }
}

function unwrapHtmlFence(raw: string): string {
  let s = String(raw || '').trim()
  // 仅 ```html；不要把 ```text（剧情走向）当成 HTML 围栏
  const fenced = s.match(/```(?:html|HTML)\s*\r?\n?([\s\S]*?)```/u)
  if (fenced?.[1]) return fenced[1].trim()
  const openFence = s.match(/```(?:html|HTML)\s*\r?\n?([\s\S]*)$/u)
  if (openFence?.[1]) {
    return openFence[1]
      .replace(/【\s*(?:小剧场|剧情可视化|物证映像)\s*结束\s*】[\s\S]*$/u, '')
      .replace(/<\/details>[\s\S]*$/iu, '')
      .replace(/<\/snow>[\s\S]*$/iu, '')
      .replace(/<<<DATING_UNIFIED_MEMORY[\s\S]*$/u, '')
      .trim()
  }
  if (/<[a-zA-Z!][\s\S]*>/.test(s)) return s
  return s
}

/** 从 snow / details 壳提取 title、emoji、html 源 */
function parseSnowShell(raw: string): { title: string; emoji?: string; htmlSource: string } | null {
  let s = String(raw || '').trim()
  const snow = s.match(SNOW_RE)
  if (snow?.[1]) s = snow[1].trim()

  let emoji: string | undefined
  let title = DEFAULT_TITLE

  const summary = s.match(/<summary\b[^>]*>([\s\S]*?)<\/summary>/i)
  if (summary?.[1]) {
    const plain = summary[1]
      .replace(/<[^>]+>/g, '')
      .replace(/[⋯…♡·\s]+/g, ' ')
      .trim()
    const em = plain.match(
      /^([\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]+)\s*(.+)$/u,
    )
    if (em) {
      emoji = em[1]
      title = em[2]!.trim().slice(0, 48) || DEFAULT_TITLE
    } else if (plain) {
      title = plain.slice(0, 48)
    }
  }

  const afterSummary = summary
    ? s.slice((summary.index ?? 0) + summary[0].length)
    : s

  const htmlSource = unwrapHtmlFence(afterSummary)
  if (!htmlSource || htmlSource.length < 8) return null
  return { title, emoji, htmlSource }
}

/** 酒馆助手 third_party 同系 CDN（允许 script src） */
const TRUSTED_SCRIPT_CDN_RE =
  /cdn\.jsdelivr\.net|testingcf\.jsdelivr\.net|cdnjs\.cloudflare\.com|unpkg\.com/i

export type SanitizePlotHtmlOptions = {
  /**
   * 仅用于沙箱 iframe（无 allow-same-origin）场景：保留 onclick 等内联事件。
   * IF 线小游戏模型常把逻辑写在 onclick 上；剥掉会导致「看得见点不了」。
   * 小剧场默认仍剥内联事件，逼走 `<script>`。
   */
  allowInlineHandlers?: boolean
  /**
   * 接近「本地打开 .html」：保留 form / onclick，只剥嵌套逃逸标签。
   * 隐含 allowInlineHandlers。
   */
  browserPreview?: boolean
}

export function sanitizePlotHtmlVisualHtml(raw: string, opts?: SanitizePlotHtmlOptions): string {
  let html = String(raw || '').trim()
  if (!html) return ''
  const browserPreview = opts?.browserPreview === true
  const keepHandlers = browserPreview || opts?.allowInlineHandlers === true
  // 保留「小剧场构思」/ 助手兼容标记；其它注释可剥
  html = html.replace(
    /<!--(?!\s*(?:小剧场构思|LUMI_VUE_RUNTIME|LUMI_TH_LIBS))[\s\S]*?-->/g,
    '',
  )
  html = html.replace(browserPreview ? FORBIDDEN_TAG_BROWSER_PREVIEW_RE : FORBIDDEN_TAG_RE, '')
  // 非 stylesheet 的 link 剥掉
  html = html.replace(LINK_STRIP_RE, '')
  // stylesheet 仅放行 https（cdnjs / fonts / jsdelivr 等）
  html = html.replace(STYLESHEET_HREF_RE, (full, attrs: string) => {
    const href = String(attrs).match(/\bhref\s*=\s*("|')(https:\/\/[^"']+)\1/i)?.[2]
    if (href) return full
    return ''
  })
  html = html.replace(META_STRIP_RE, '')
  // 默认剥内联事件；浏览器预览 / 可玩沙箱保留
  if (!keepHandlers) {
    html = html.replace(EVENT_ATTR_RE, '')
  }
  html = html.replace(JS_URL_RE, '')
  html = html.replace(DATA_URL_SCRIPT_RE, '')
  // 外链 script：仅放行助手同系 CDN（jQuery / Vue）；其余整段剥掉
  html = html.replace(/<\s*script\b([^>]*)>([\s\S]*?)<\/script>/gi, (full, attrs: string) => {
    const src = String(attrs).match(/\bsrc\s*=\s*("|')(https:\/\/[^"']+)\1/i)?.[2]
    if (!src) return full
    if (TRUSTED_SCRIPT_CDN_RE.test(src)) return full
    return ''
  })
  // 残留未闭合的 src= 开标签（非受信 CDN）打标废掉
  html = html.replace(/<\s*script\b[^>]*\bsrc\s*=/gi, (full) => {
    if (TRUSTED_SCRIPT_CDN_RE.test(full)) return full
    return '<script data-blocked-src '
  })
  // 危险 @import 剥掉；放行 https 字体（酒馆状态栏常用外链字体）
  html = html.replace(/@import\b[^;]*;/gi, (stmt) =>
    /https?:\/\//i.test(stmt) ? stmt : '',
  )
  // 月读 / IF 浏览器预览可更大；硬截断会砍断 style → 预览变成无样式裸标签
  const maxChars = browserPreview
    ? HTML_MAX_CHARS_BROWSER_PREVIEW
    : /LUMI_VUE_RUNTIME|LUMI_TH_LIBS|__vccOpts/i.test(html)
      ? Math.max(HTML_MAX_CHARS, 320_000)
      : HTML_MAX_CHARS
  if (html.length > maxChars) html = `${html.slice(0, maxChars)}<!-- truncated -->`
  return html.trim()
}

/** 是否已是完整 HTML 文档（供展示层决定是否二次包壳） */
export function isCompleteHtmlDocument(html: string): boolean {
  const s = String(html || '').trim()
  return /<!DOCTYPE\s+html/i.test(s) || /<html[\s>]/i.test(s)
}

function isUsableTheaterHtml(html: string): boolean {
  const s = String(html || '').trim()
  if (s.length < 24) return false
  // 须有真实标签，拒绝「稍后补充」类纯文本占位
  if (!/<[a-zA-Z!][\s\S]*>/.test(s)) return false
  if (/^(?:稍后补充|待补充|暂无|placeholder|TODO)[\s.。]*$/i.test(s.replace(/<[^>]+>/g, '').trim())) {
    return false
  }
  // 至少有一点结构：完整文档 / style / 常见容器 / 标题段落（模型常只出 title-custom）
  return (
    /<!DOCTYPE\s+html/i.test(s) ||
    /<html[\s>]/i.test(s) ||
    /<style\b/i.test(s) ||
    /<(div|section|main|article|button|input|label|ul|table|p|span|header|footer|nav|aside|pre|code)\b/i.test(
      s,
    )
  )
}

/** 模型偶发把小剧场写成 JSON：抢救 html 字段（仍应优先用【小剧场】+ HTML） */
function tryParseTheaterFromJsonBlob(inner: string): PlotHtmlVisual | null {
  let s = String(inner || '').trim()
  if (!s) return null
  const fenced = s.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fenced?.[1]) s = fenced[1].trim()
  const start = s.search(/[{[]/)
  if (start < 0) return null
  s = s.slice(start)
  let data: unknown
  try {
    data = JSON.parse(s)
  } catch {
    const end = Math.max(s.lastIndexOf('}'), s.lastIndexOf(']'))
    if (end <= 0) return null
    try {
      data = JSON.parse(s.slice(0, end + 1))
    } catch {
      return null
    }
  }
  const o = (Array.isArray(data) ? data[0] : data) as Record<string, unknown> | null
  if (!o || typeof o !== 'object') return null
  const htmlRaw = String(o.html ?? o.content ?? o.source ?? o.body ?? '').trim()
  const html = sanitizePlotHtmlVisualHtml(unwrapHtmlFence(htmlRaw))
  if (!isUsableTheaterHtml(html)) return null
  const title = String(o.title ?? o.name ?? o.summary ?? '').trim().slice(0, 48) || DEFAULT_TITLE
  const emoji = String(o.emoji ?? o.icon ?? '').trim().slice(0, 8) || undefined
  return { title, html, emoji }
}

function parseHtmlVisualInner(inner: string): PlotHtmlVisual | null {
  const trimmed = String(inner || '').trim()

  // 优先酒馆 snow / details
  if (/<snow\b/i.test(trimmed) || /<details\b/i.test(trimmed) || /<summary\b/i.test(trimmed)) {
    const snow = parseSnowShell(trimmed)
    if (snow) {
      const html = sanitizePlotHtmlVisualHtml(snow.htmlSource)
      if (isUsableTheaterHtml(html)) {
        return { title: snow.title || DEFAULT_TITLE, html, emoji: snow.emoji }
      }
    }
  }

  // 裸完整文档 / fence（无 details）
  const fencedOrDoc = sanitizePlotHtmlVisualHtml(unwrapHtmlFence(trimmed))
  if (isUsableTheaterHtml(fencedOrDoc)) {
    const { title } = parseTitleLine(trimmed)
    return { title: title || DEFAULT_TITLE, html: fencedOrDoc }
  }

  // 旧格式：标题行 + fence / 片段
  const { title, rest } = parseTitleLine(trimmed)
  const html = sanitizePlotHtmlVisualHtml(unwrapHtmlFence(rest))
  if (isUsableTheaterHtml(html)) {
    return { title: title || DEFAULT_TITLE, html }
  }

  // JSON 兜底（禁止当规范格式）
  return tryParseTheaterFromJsonBlob(trimmed)
}

function findHtmlVisualBlock(text: string): { inner: string; start: number; end: number } | null {
  const src = String(text || '')
  const tagged = extractDatingTaggedBlocks(src)
  if (tagged.theater.trim()) {
    return { inner: tagged.theater, start: -1, end: -1 }
  }
  const theaterXml = src.match(THEATER_XML_RE)
  if (theaterXml && theaterXml.index !== undefined) {
    return {
      inner: theaterXml[1] || '',
      start: theaterXml.index,
      end: theaterXml.index + theaterXml[0].length,
    }
  }
  const xml = src.match(BLOCK_XML_RE)
  if (xml && xml.index !== undefined) {
    const title = xml[1]?.trim() || DEFAULT_TITLE
    const body = xml[2] || ''
    return {
      inner: `标题：${title}\n${body}`,
      start: xml.index,
      end: xml.index + xml[0].length,
    }
  }
  const closed = src.match(BLOCK_RE)
  if (closed && closed.index !== undefined) {
    return { inner: closed[1] || '', start: closed.index, end: closed.index + closed[0].length }
  }
  // 裸 snow 块（无【小剧场】外层）
  const snowOnly = src.match(SNOW_RE)
  if (snowOnly && snowOnly.index !== undefined) {
    return {
      inner: snowOnly[0],
      start: snowOnly.index,
      end: snowOnly.index + snowOnly[0].length,
    }
  }
  // 裸 details+summary（模型常漏【小剧场】壳）
  // 必须是 ```html / 完整文档；勿匹配 ```text（剧情走向等叙事折叠也会被误抽走）
  const detailsOnly = src.match(/<details\b[^>]*>[\s\S]*?<\/details>/i)
  if (
    detailsOnly &&
    detailsOnly.index !== undefined &&
    /<summary\b/i.test(detailsOnly[0]) &&
    (/```html\b/i.test(detailsOnly[0]) || /<!DOCTYPE\s+html/i.test(detailsOnly[0])) &&
    !/剧情走向/u.test(detailsOnly[0])
  ) {
    return {
      inner: detailsOnly[0],
      start: detailsOnly.index,
      end: detailsOnly.index + detailsOnly[0].length,
    }
  }
  const open = src.match(BLOCK_OPEN_RE)
  if (open && open.index !== undefined) {
    let inner = String(open[1] || '')
    const cutRes =
      /【\s*读者评论\s*】/u.exec(inner) ||
      /<<<DATING_UNIFIED_MEMORY/u.exec(inner) ||
      /【\s*VN\s*语音参数\s*】/iu.exec(inner)
    let end = src.length
    if (cutRes && cutRes.index !== undefined) {
      end = open.index + open[0].length - inner.length + cutRes.index
      inner = inner.slice(0, cutRes.index)
    }
    inner = trimBeforeMemoryDelimiter(inner)
    if (!inner.trim()) return null
    return { inner, start: open.index, end }
  }
  return null
}

/** 从模型正文拆出 HTML 可视化块；返回去掉该块后的正文 */
export function extractAndStripPlotHtmlVisual(raw: string): {
  content: string
  visual: PlotHtmlVisual | null
} {
  const text = String(raw || '')
  const block = findHtmlVisualBlock(text)
  if (!block) return { content: text.trim(), visual: null }
  const visual = parseHtmlVisualInner(block.inner)
  // 认出来却解析不成可用小剧场时，绝不删原文（否则「剧情走向」details 会直接消失）
  if (!visual) return { content: text.trim(), visual: null }
  const content =
    block.start < 0
      ? stripDatingTaggedKind(text, 'theater')
      : (text.slice(0, block.start) + text.slice(block.end)).trim()
  return { content, visual: { ...visual, updatedAt: Date.now() } }
}

export function buildDatingPlotHtmlVisualAppendix(opts?: {
  presetId?: string | null
  plotHint?: string
  characterName?: string
  characterGender?: 'male' | 'female' | 'other' | null
  playerName?: string
  playerGender?: 'male' | 'female' | 'other' | null
}): string {
  return buildPlotHtmlVisualPresetAppendix(opts)
}

export function normalizePlotHtmlVisual(raw: unknown): PlotHtmlVisual | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const o = raw as Record<string, unknown>
  const title = String(o.title ?? '').trim().slice(0, 48) || DEFAULT_TITLE
  const html = sanitizePlotHtmlVisualHtml(String(o.html ?? ''))
  if (!html) return undefined
  const emoji = String(o.emoji ?? '').trim().slice(0, 8) || undefined
  return {
    title,
    html,
    emoji,
    updatedAt: typeof o.updatedAt === 'number' ? o.updatedAt : undefined,
  }
}

/**
 * 从任意模型输出中抽出可渲染 HTML（```html 围栏 / 完整文档 / 片段）。
 * 供 IF 线等旁支复用小剧场同款消毒与可用性判定。
 */
export function tryNormalizeRenderablePlotHtml(
  raw: string,
  opts?: SanitizePlotHtmlOptions,
): string | null {
  const trimmed = String(raw || '').trim()
  if (!trimmed) return null
  // snow / details 壳
  if (/<snow\b/i.test(trimmed) || /<details\b/i.test(trimmed) || /<summary\b/i.test(trimmed)) {
    const snow = parseSnowShell(trimmed)
    if (snow) {
      const html = sanitizePlotHtmlVisualHtml(snow.htmlSource, opts)
      if (isUsableTheaterHtml(html)) return html
    }
  }
  const html = sanitizePlotHtmlVisualHtml(unwrapHtmlFence(trimmed), opts)
  if (isUsableTheaterHtml(html)) return html
  return null
}

/** 粗判：是否像可交互 / 完整 HTML（展示层决定 iframe 还是散文） */
export function looksLikeRenderablePlotHtml(raw: string): boolean {
  return tryNormalizeRenderablePlotHtml(raw) != null
}

/** 是否像「只有皮肤、没有可运行逻辑」的空壳（无 script / 无内联事件） */
export function isHollowInteractiveHtml(html: string): boolean {
  const s = String(html || '')
  if (!s.trim()) return true
  if (/<\s*script\b/i.test(s)) return false
  if (/\son[a-z]+\s*=/i.test(s)) return false
  return true
}

/** 可见文本中 emoji 占比过高（竖排水果壳常见） */
export function isEmojiHeavyHtmlShell(html: string): boolean {
  const text = String(html || '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, '')
  if (text.length < 12) return false
  const emojiMatches =
    text.match(
      /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu,
    ) ?? []
  // 按码点近似：连续水果竖排时 emoji 占比很高
  const emojiChars = emojiMatches.join('').length
  return emojiChars / text.length >= 0.35 && emojiMatches.length >= 12
}

/** 是否有可点交互面（按钮 / canvas / 明显网格） */
export function hasInteractiveHtmlSurface(html: string): boolean {
  const s = String(html || '')
  if (/<\s*button\b/i.test(s)) return true
  if (/<\s*canvas\b/i.test(s)) return true
  if (/<\s*input\b[^>]*\btype\s*=\s*["']?button/i.test(s)) return true
  if (/\bid\s*=\s*["'][^"']*board[^"']*["']/i.test(s)) return true
  if (/\bclass\s*=\s*["'][^"']*\b(board|grid|tiles?|cells?)\b/i.test(s)) return true
  // 较多同类可点格子
  const cellLike =
    (s.match(/<\s*(?:button|div|span)\b[^>]*(?:data-cell|data-tile|data-row|data-col|role\s*=\s*["']gridcell)/gi)
      ?.length ?? 0) +
    (s.match(/<\s*button\b/gi)?.length ?? 0)
  return cellLike >= 8
}

/** script 或内联事件是否像真有游戏/交互逻辑（非空壳 toast） */
export function hasPlayableHtmlLogic(html: string): boolean {
  const s = String(html || '')
  const onCount = (s.match(/\son[a-z]+\s*=/gi) ?? []).length
  if (onCount >= 2) return true
  const scripts = [...s.matchAll(/<\s*script\b[^>]*>([\s\S]*?)<\/script>/gi)].map((m) =>
    String(m[1] || ''),
  )
  const joined = scripts.join('\n')
  if (!joined.trim()) return onCount >= 1
  // 拒绝只有几行空脚本
  if (joined.replace(/\s+/g, '').length < 40) return false
  return /addEventListener|onclick|querySelector|getElementById|createElement|classList|innerHTML|textContent|setInterval|requestAnimationFrame|\.map\s*\(|for\s*\(|while\s*\(/i.test(
    joined,
  )
}

/** 消消乐/棋盘启发式：足够格子或 script 含交换/消除/计分 */
export function hasMatchBoardHeuristic(html: string): boolean {
  const s = String(html || '')
  const buttons = s.match(/<\s*button\b/gi)?.length ?? 0
  const cellDivs =
    s.match(
      /<\s*(?:div|span)\b[^>]*(?:data-cell|data-tile|data-row|data-col|gridcell|class\s*=\s*["'][^"']*\b(?:cell|tile)\b)/gi,
    )?.length ?? 0
  if (buttons + cellDivs >= 20) return true
  if (/\bid\s*=\s*["'][^"']*board[^"']*["']/i.test(s) && (buttons >= 8 || cellDivs >= 8)) {
    return true
  }
  const scripts = [...s.matchAll(/<\s*script\b[^>]*>([\s\S]*?)<\/script>/gi)]
    .map((m) => String(m[1] || ''))
    .join('\n')
  return /board|grid|swap|match|score|tiles?|cells?|消除|交换|三消|棋盘/i.test(scripts)
}

/**
 * 是否具备「本地 .html 文件」级文档壳：
 * <!DOCTYPE html> + <html> + <head> + <body> + </html>
 * （缺任一项双击打开都会怪，或只能靠客户端临时包壳）
 */
export function hasFullHtmlDocumentShell(html: string): boolean {
  const s = String(html || '').trim()
  if (!s) return false
  if (!/<!DOCTYPE\s+html/i.test(s)) return false
  if (!/<html\b/i.test(s)) return false
  if (!/<head\b/i.test(s)) return false
  if (!/<body\b/i.test(s)) return false
  if (!/<\/html\s*>/i.test(s)) return false
  return true
}

/** 抽出 body 里用到的 class 名（返工清单 / 碎片补壳） */
export function extractCssClassNames(html: string): string[] {
  const names = new Set<string>()
  const re = /\bclass\s*=\s*("|')([^"']*)\1/gi
  let m: RegExpExecArray | null
  const s = String(html || '')
  while ((m = re.exec(s))) {
    for (const part of String(m[2] || '').split(/\s+/)) {
      const n = part.trim()
      if (n && /^[a-zA-Z_][\w-]*$/.test(n)) names.add(n)
    }
  }
  return [...names].sort()
}

/**
 * 模型常无视格式提示词，只交 <div class="container">…</div>+script。
 * 在碎片外补完整文档壳 + 真实可用 CSS（禁止空注释占位），否则预览永远裸奔。
 */
export function wrapIfHtmlFragmentWithDocumentShell(raw: string): string {
  let s = String(raw || '').trim()
  if (!s) return s
  s = s
    .replace(/^```(?:html|HTML)?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim()

  // 已是完整可玩文档则不动
  if (hasFullHtmlDocumentShell(s) && hasRealStyleBlock(s) && !isIncompleteHtmlDocument(s)) {
    return s
  }

  // 抽出已有 style / script / body 内层
  const styles: string[] = []
  const scripts: string[] = []
  let rest = s
  rest = rest.replace(/<\s*style\b[^>]*>([\s\S]*?)<\/\s*style\s*>/gi, (_full, css: string) => {
    const c = String(css || '').trim()
    if (c) styles.push(c)
    return ''
  })
  rest = rest.replace(/<\s*script\b([^>]*)>([\s\S]*?)<\/\s*script\s*>/gi, (full, attrs: string, code: string) => {
    if (/\bsrc\s*=/i.test(String(attrs || ''))) {
      scripts.push(full)
    } else {
      scripts.push(`<script>${String(code || '')}</script>`)
    }
    return ''
  })
  const bodyInner =
    rest.match(/<body\b[^>]*>([\s\S]*?)<\/body\s*>/i)?.[1] ??
    rest
      .replace(/<!DOCTYPE\s+html[^>]*>/gi, '')
      .replace(/<\/?(?:html|head|body)\b[^>]*>/gi, '')
      .trim()

  const classes = extractCssClassNames(s)
  const cssRules = buildHeuristicCssForClasses(classes)
  const mergedStyle = [...styles, cssRules].filter(Boolean).join('\n')

  return (
    `<!DOCTYPE html>\n<html lang="zh-CN">\n<head>\n` +
    `<meta charset="utf-8">\n` +
    `<meta name="viewport" content="width=device-width, initial-scale=1.0">\n` +
    `<style data-lumi-wrap="1">\n${mergedStyle}\n</style>\n` +
    `</head>\n<body>\n${bodyInner}\n${scripts.join('\n')}\n</body>\n</html>`
  )
}

/** 按 class 名启发式生成真实布局 CSS（绝不写空注释占位） */
function buildHeuristicCssForClasses(classes: string[]): string {
  const known: Record<string, string> = {
    container:
      'max-width:720px;width:92%;margin:12px auto;box-shadow:0 4px 6px rgba(0,0,0,.25);border-radius:14px;overflow:hidden;background:linear-gradient(165deg,#3b0f1c,#1a0a12 55%,#2a1420);color:#f5e6d3;position:relative',
    'phone-container':
      'max-width:390px;margin:12px auto;min-height:720px;border-radius:28px;overflow:hidden;position:relative;background:linear-gradient(180deg,#1b3d2f,#0e241c);color:#e8f5e9;box-shadow:0 18px 40px rgba(0,0,0,.35)',
    'title-custom':
      'margin:0;padding:14px 16px 8px;font-size:18px;font-weight:700;color:#ffd700;text-align:center;letter-spacing:.04em',
    page: 'display:none;padding:8px 14px 18px',
    active: 'display:block !important',
    'ancient-card':
      'margin:10px 0;padding:12px;border-radius:12px;background:rgba(255,255,255,.06);border:1px solid rgba(255,215,0,.28)',
    badge:
      'display:inline-block;margin:0 0 8px;padding:2px 10px;border-radius:999px;background:rgba(255,215,0,.18);color:#ffd700;font-size:11px',
    'info-row': 'display:flex;gap:8px;align-items:flex-start;margin:6px 0;font-size:13px;line-height:1.45',
    'info-label': 'flex:0 0 auto;opacity:.75;color:#e6c594',
    'info-val': 'flex:1;color:#fff5e6',
    'info-value': 'flex:1;color:#fff5e6',
    'profile-row': 'display:flex;gap:8px;margin:6px 0;font-size:13px;line-height:1.45',
    'profile-label': 'opacity:.75;color:#e6c594',
    'highlight-box':
      'margin:10px 0;padding:10px 12px;border-radius:10px;background:rgba(255,77,109,.12);border:1px solid rgba(255,77,109,.35);font-size:12px;line-height:1.55',
    'comment-box':
      'margin:8px 0;padding:8px 10px;border-radius:10px;background:rgba(0,0,0,.22);border:1px solid rgba(255,255,255,.12);font-size:12px;line-height:1.5',
    'comment-user': 'font-weight:700;margin-bottom:4px;color:#ffb6c1',
    note: 'margin:8px 0;padding:8px 10px;border-radius:8px;background:rgba(255,255,255,.06);font-size:12px;line-height:1.5',
    'note-hl':
      'margin:8px 0;padding:8px 10px;border-radius:8px;background:rgba(255,215,0,.1);border:1px solid rgba(255,215,0,.35);font-size:12px;line-height:1.5',
    'btn-row': 'display:flex;justify-content:flex-end;gap:8px;padding:8px 0 4px',
    'nav-container': 'display:flex;justify-content:center;gap:10px;padding:10px 14px 16px',
    'nav-btn':
      'border:0;border-radius:999px;padding:8px 16px;cursor:pointer;background:linear-gradient(135deg,#c9a227,#8a6a12);color:#1a1008;font-weight:700;font-size:13px',
    'page-indicator': 'text-align:center;font-size:12px;opacity:.8;padding:4px 0 0;color:#e6c594',
    'info-box': 'padding:4px 0',
  }

  const rules: string[] = [
    '*{box-sizing:border-box}',
    'body{margin:0;padding:12px;overflow:auto;height:auto;background:transparent;font-family:system-ui,"PingFang SC","Microsoft YaHei",sans-serif;color:#f5e6d3}',
    '.page{display:none}',
    '.page.active{display:block}',
    'button:active,.nav-btn:active{transform:scale(.95)}',
  ]

  for (const name of classes) {
    if (name === 'active' || name === 'show') continue
    if (known[name]) {
      rules.push(`.${name}{${known[name]}}`)
      continue
    }
    // 启发式：按名字猜布局，保证每条都有真实声明
    if (/container|frame|wrapper|shell/i.test(name)) {
      rules.push(
        `.${name}{max-width:720px;width:92%;margin:12px auto;box-shadow:0 4px 6px rgba(0,0,0,.25);border-radius:14px;overflow:hidden;background:#1a0a12;color:#f5e6d3}`,
      )
    } else if (/page|panel|view|screen/i.test(name)) {
      rules.push(`.${name}{display:none;padding:8px 12px}`)
      rules.push(`.${name}.active{display:block}`)
    } else if (/title|heading|header/i.test(name)) {
      rules.push(`.${name}{margin:0 0 8px;font-size:16px;font-weight:700;color:#ffd700}`)
    } else if (/card|box|panel|block/i.test(name)) {
      rules.push(
        `.${name}{margin:8px 0;padding:10px 12px;border-radius:12px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1)}`,
      )
    } else if (/btn|button|nav/i.test(name)) {
      rules.push(
        `.${name}{display:inline-flex;align-items:center;justify-content:center;border:0;border-radius:999px;padding:8px 14px;cursor:pointer;background:#c9a227;color:#1a1008;font-weight:600}`,
      )
    } else if (/row|line/i.test(name)) {
      rules.push(`.${name}{display:flex;gap:8px;align-items:flex-start;margin:6px 0;font-size:13px;line-height:1.45}`)
    } else if (/label/i.test(name)) {
      rules.push(`.${name}{opacity:.75;color:#e6c594}`)
    } else if (/badge|tag|pill/i.test(name)) {
      rules.push(
        `.${name}{display:inline-block;padding:2px 8px;border-radius:999px;background:rgba(255,215,0,.18);color:#ffd700;font-size:11px}`,
      )
    } else if (/grid/i.test(name)) {
      rules.push(`.${name}{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}`)
    } else {
      rules.push(`.${name}{display:block}`)
    }
  }

  return rules.join('\n')
}

function hasRealStyleBlock(html: string): boolean {
  const blocks = [...String(html || '').matchAll(/<\s*style\b[^>]*>([\s\S]*?)<\/\s*style\s*>/gi)].map(
    (m) => String(m[1] || '').replace(/\/\*[\s\S]*?\*\//g, '').trim(),
  )
  const css = blocks.join('\n')
  return css.length >= 40 && /[{;:]/.test(css)
}

/**
 * <style> 是否缺失/空。
 * 铁律：body 里用了 class=，head 就必须有非空 <style> 写对应选择器。
 * 少量 inline 救不了 .phone-frame / .app-grid 这类布局 class。
 */
export function hasEmptyOrMissingStyleBlock(html: string): boolean {
  const s = String(html || '')
  if (hasRealStyleBlock(s)) return false
  const classN = countClassAttrs(s)
  // 用了 class 却没有有效 <style> → 一律不合格（正是空 head + 一堆 class 的翻车）
  if (classN >= 1) return true
  if (/id\s*=\s*["']board["']/i.test(s)) return true
  // 完全不用 class：允许纯 inline 美化
  return !hasSubstantialInlineStyles(s) && s.length > 80
}

/** 拒收原因（给用户看）；空串表示可通过 */
export function diagnoseIfHtmlRejectReason(html: string): string {
  const s = String(html || '').trim()
  if (!s) return '模型未返回 HTML'
  if (/<!--\s*truncated\s*-->/i.test(s)) return '消毒长度截断，页面不完整'
  if (!hasFullHtmlDocumentShell(s) && !/<!DOCTYPE\s+html|<html\b/i.test(s)) {
    return '缺少 <!DOCTYPE html> / <html> / <head> / <body> 文档壳'
  }
  if (/<!DOCTYPE\s+html|<html\b/i.test(s) && !hasFullHtmlDocumentShell(s)) {
    return '文档壳不完整（缺 head/body 或未闭合 </html>）'
  }
  const openStyle = (s.match(/<\s*style\b/gi) ?? []).length
  const closeStyle = (s.match(/<\/\s*style\s*>/gi) ?? []).length
  if (openStyle > closeStyle) return '<style> 未闭合（半截 CSS）'
  if (hasEmptyOrMissingStyleBlock(s)) {
    const n = countClassAttrs(s)
    if (n > 0) {
      return `用了 ${n} 处 class 但 <head> 里没有有效 <style>（空 head 会导致布局全塌）`
    }
    return '缺少有效 <style>（空 head / 无 CSS，浏览器也会裸排）'
  }
  const openScript = (s.match(/<\s*script\b/gi) ?? []).length
  const closeScript = (s.match(/<\/\s*script\s*>/gi) ?? []).length
  if (openScript > closeScript) return '<script> 未闭合（疑似输出截断）'
  if (isEmojiHeavyHtmlShell(s)) return '竖排表情空壳，无可用页面结构'
  return ''
}

/** HTML 是否像被截断（style/script 未闭合、缺 </html>）——会导致裸文字无样式 */
export function isIncompleteHtmlDocument(html: string): boolean {
  const s = String(html || '').trim()
  if (!s) return true
  if (/<!--\s*truncated\s*-->/i.test(s)) return true
  // 宣称是完整文档却缺壳/缺闭合
  if (/<!DOCTYPE\s+html|<html[\s>]/i.test(s) && !hasFullHtmlDocumentShell(s)) return true
  const openStyle = (s.match(/<\s*style\b/gi) ?? []).length
  const closeStyle = (s.match(/<\/\s*style\s*>/gi) ?? []).length
  if (openStyle > closeStyle) return true
  const openScript = (s.match(/<\s*script\b/gi) ?? []).length
  const closeScript = (s.match(/<\/\s*script\s*>/gi) ?? []).length
  if (openScript > closeScript) return true
  // 注意：不要用「script 里出现 <div」判截断——合法 JS 常有 innerHTML='<div…>'，会误杀整页
  return false
}

/** style 里是否声明了多列网格（≥4 列） */
export function hasMultiColumnGridCss(html: string): boolean {
  const styles = [...String(html || '').matchAll(/<\s*style\b[^>]*>([\s\S]*?)<\/\s*style\s*>/gi)]
    .map((m) => String(m[1] || ''))
    .join('\n')
  if (/grid-template-columns\s*:\s*repeat\s*\(\s*(?:[4-9]|[1-9]\d+)/i.test(styles)) return true
  // 显式多列：1fr 1fr 1fr 1fr …
  const m = styles.match(/grid-template-columns\s*:\s*([^;}{]+)/i)
  if (m?.[1]) {
    const frs = m[1].match(/1fr|minmax\s*\(/gi)?.length ?? 0
    if (frs >= 4) return true
  }
  return false
}

/**
 * 棋盘塌成「单列竖排 emoji」：大量几乎纯 emoji 的块级格子。
 * 对应用户截图里消消乐变成一竖条小动物。
 */
export function looksLikeCollapsedEmojiColumnBoard(html: string): boolean {
  const s = String(html || '')
  const body = s
    .replace(/<\s*script\b[^>]*>[\s\S]*?<\/\s*script\s*>/gi, ' ')
    .replace(/<\s*style\b[^>]*>[\s\S]*?<\/\s*style\s*>/gi, ' ')
  const blocks =
    body.match(
      /<\s*(?:div|span|button|li|td|p)\b[^>]*>\s*([\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}\s]*)\s*<\/\s*(?:div|span|button|li|td|p)\s*>/gu,
    ) ?? []
  let soloEmojiBlocks = 0
  for (const b of blocks) {
    const inner = b.replace(/<[^>]+>/g, '').replace(/\s+/g, '')
    if (
      inner.length > 0 &&
      inner.length <= 8 &&
      /^[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]+$/u.test(inner)
    ) {
      soloEmojiBlocks += 1
    }
  }
  if (soloEmojiBlocks < 12) return false
  // 没有多列 grid，或根本没有 board 容器 → 视为塌缩
  if (!hasMultiColumnGridCss(s)) return true
  if (!/#board\b|\.board\b|data-board/i.test(s)) return true
  return soloEmojiBlocks >= 24
}
