/**
 * 剧情可视化 HTML 块：与正文同轮输出，客户端折叠展示。
 * 产品名：**小剧场**（兼容旧标记「物证映像」「剧情可视化」）
 * 输出壳对齐酒馆 snow：完整 HTML+CSS+JS；消毒放行 script。
 */

import { buildPlotHtmlVisualPresetAppendix } from './datingPlotHtmlVisualPresets'

/** 场控面板 · 功能显示名 */
export const PLOT_ARTIFACT_VISUAL_NAME = '小剧场'

/** 场控面板 · 功能说明（一行） */
export const PLOT_ARTIFACT_VISUAL_HINT =
  '开启后同轮生成可折叠的互动小剧场，可贴合当轮情节；可随机抽取或指定类型'

const DEFAULT_TITLE = PLOT_ARTIFACT_VISUAL_NAME
const HTML_MAX_CHARS = 96_000

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
const SNOW_RE = /<snow\b[^>]*>([\s\S]*?)<\/snow>/i

/** 仍禁止嵌套逃逸类标签；script 单独放行 */
const FORBIDDEN_TAG_RE =
  /<\s*\/?\s*(iframe|object|embed|link|base|form|frame|frameset|applet)\b[^>]*>/gi
/** meta 仅保留 charset / viewport */
const META_STRIP_RE =
  /<\s*meta\b(?![^>]*\bcharset\b)(?![^>]*\bname\s*=\s*["']viewport["'])[^>]*>/gi
const EVENT_ATTR_RE = /\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi
const JS_URL_RE = /(?:href|src|xlink:href)\s*=\s*("|')\s*javascript:[^"']*\1/gi
const DATA_URL_SCRIPT_RE = /(?:href|src)\s*=\s*("|')\s*data:text\/html[^"']*\1/gi
const SCRIPT_SRC_RE = /<\s*script\b[^>]*\bsrc\s*=/gi

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
  const fenced = s.match(/```(?:html|HTML)?\s*\r?\n?([\s\S]*?)```/u)
  if (fenced?.[1]) return fenced[1].trim()
  const openFence = s.match(/```(?:html|HTML)?\s*\r?\n?([\s\S]*)$/u)
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

export function sanitizePlotHtmlVisualHtml(raw: string): string {
  let html = String(raw || '').trim()
  if (!html) return ''
  // 保留「小剧场构思」类注释以外的普通注释可剥；构思已在壳外解析
  html = html.replace(/<!--(?!\s*小剧场构思)[\s\S]*?-->/g, '')
  html = html.replace(FORBIDDEN_TAG_RE, '')
  html = html.replace(META_STRIP_RE, '')
  // 内联事件仍剥：互动应走 <script>，降低 XSS 面
  html = html.replace(EVENT_ATTR_RE, '')
  html = html.replace(JS_URL_RE, '')
  html = html.replace(DATA_URL_SCRIPT_RE, '')
  // 禁止外链 script
  html = html.replace(/<\s*script\b[^>]*\bsrc\s*=[^>]*>[\s\S]*?<\/script>/gi, '')
  html = html.replace(SCRIPT_SRC_RE, '<script data-blocked-src ')
  html = html.replace(/@import\b[^;]*;/gi, '')
  if (html.length > HTML_MAX_CHARS) html = `${html.slice(0, HTML_MAX_CHARS)}<!-- truncated -->`
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
  const detailsOnly = src.match(/<details\b[^>]*>[\s\S]*?<\/details>/i)
  if (
    detailsOnly &&
    detailsOnly.index !== undefined &&
    /<summary\b/i.test(detailsOnly[0]) &&
    (/```(?:html)?/i.test(detailsOnly[0]) || /<!DOCTYPE\s+html/i.test(detailsOnly[0]))
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
  const content = (text.slice(0, block.start) + text.slice(block.end)).trim()
  if (!visual) return { content, visual: null }
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
