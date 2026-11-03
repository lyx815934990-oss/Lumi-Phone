/**
 * 对齐「酒馆本体正则 + 酒馆助手渲染器」的前端美化兼容层。
 *
 * 参考：
 * - SillyTavern：display 正则写入楼层
 * - JS-Slash-Runner（酒馆助手）：识别含 html/head/body 的代码块 → iframe
 *   @see https://github.com/N0VI028/JS-Slash-Runner/blob/main/src/util/is_frontend.ts
 *   @see https://n0vi028.github.io/JS-Slash-Runner-Doc/guide/基本用法/渲染器.html
 * - Gemini/月读预设：``` / ```html 包住完整文档或 Vue 打包（依赖页内 Vue/$/FA）
 *
 * Lumi：展示正则后按同样条件切出前端块，iframe 注入与助手相近的全局库。
 */

import vueGlobalProd from '../vendor/vue.global.prod.js?raw'

/** 对齐酒馆助手 isFrontend（略放宽：含 script 的 Vue 碎片） */
export function isThFrontendContent(content: string): boolean {
  const c = String(content ?? '')
  if (!c.trim()) return false
  // 助手原文：['html>', '<head>', '<body']
  if (c.includes('html>') || c.includes('<head>') || c.includes('<body')) return true
  // 月读「ta的物品」：无完整 html 外壳，但有 Vue 打包
  if (/__vccOpts/i.test(c) || (/const\s+\w+\s*=\s*Vue\b/.test(c) && /<script\b/i.test(c))) {
    return true
  }
  if (/createApp\s*\(/i.test(c) && /mount\s*\(\s*['"]#app['"]/.test(c)) return true
  return false
}

export function isStVueFrontendHtml(html: string): boolean {
  return isThFrontendContent(html) && /<script\b|__vccOpts|createApp\s*\(/i.test(html)
}

const JQUERY_READY_SHIM = `window.$=window.$||function(fn){if(typeof fn!=="function")return;if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",fn);else fn();};window.jQuery=window.jQuery||window.$;`

/** 与助手 third_party_message.html 同系 CDN（sandbox 可加载外链 script） */
const TH_THIRD_PARTY_HEAD = `
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.5.1/css/all.min.css" crossorigin="anonymous"/>
<script src="https://cdn.jsdelivr.net/npm/jquery@3.7.1/dist/jquery.min.js" crossorigin="anonymous"><\/script>
<script src="https://cdn.jsdelivr.net/npm/vue@3.5.13/dist/vue.global.prod.js" crossorigin="anonymous"><\/script>
<script src="https://cdn.jsdelivr.net/npm/vue-router@4.5.0/dist/vue-router.global.prod.js" crossorigin="anonymous"><\/script>
`

const VUE_RUNTIME_MARKER = '<!--LUMI_VUE_RUNTIME-->'
const TH_LIBS_MARKER = '<!--LUMI_TH_LIBS-->'

/** 剥 ``` / ```html：仅当内部是前端块或 HTML 美化时 */
export function unwrapBeautifyMarkdownFences(text: string): string {
  let s = String(text ?? '')
  if (!s.includes('```')) return s
  s = s.replace(/```(?:html|HTML)\s*\r?\n?([\s\S]*?)```/g, '\n$1\n')
  s = s.replace(/```\s*\r?\n?([\s\S]*?)```/g, (full, inner: string) => {
    const t = String(inner || '').trim()
    if (
      isThFrontendContent(t) ||
      /^<(?:!DOCTYPE|html|head|body|style|div|details|section|link)\b/i.test(t) ||
      /<\/(?:html|head|body|style|div|details)\s*>/i.test(t)
    ) {
      return `\n${inner}\n`
    }
    return full
  })
  return s
}

function splitHeadBody(raw: string): { head: string; body: string } {
  const src = String(raw || '').trim()
  const headM = src.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)
  const bodyM = src.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)
  if (headM || bodyM) {
    const head = headM?.[1] ?? ''
    let body = bodyM?.[1] ?? ''
    if (!body) {
      body = src
        .replace(/<head\b[^>]*>[\s\S]*?<\/head>/i, '')
        .replace(/<\/?body\b[^>]*>/gi, '')
        .trim()
    }
    return { head, body: body || '<div id="app"></div>' }
  }
  return { head: '', body: src || '<div id="app"></div>' }
}

function demoteModuleScripts(doc: string): string {
  return doc.replace(
    /<script([^>]*?)\btype\s*=\s*(["'])module\2([^>]*)>/gi,
    '<script$1$3>',
  )
}

function ensureAppMount(doc: string): string {
  if (/id\s*=\s*["']app["']/i.test(doc)) return doc
  if (/<\/body>/i.test(doc)) {
    return doc.replace(/<\/body>/i, '<div id="app"></div></body>')
  }
  return `${doc}<div id="app"></div>`
}

/**
 * 把助手式前端碎片收成完整文档骨架（库在 iframe 阶段注入，避免消毒截断）。
 */
export function wrapStVueBeautifyDocument(fragment: string): string {
  const raw = unwrapBeautifyMarkdownFences(String(fragment || '')).trim()
  if (!raw) return ''

  let html: string
  if (/<!DOCTYPE\s+html/i.test(raw) || /<html[\s>]/i.test(raw)) {
    html = raw
  } else {
    const { head, body } = splitHeadBody(raw)
    html = `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${head}</head><body>${body}</body></html>`
  }

  html = demoteModuleScripts(html)
  if (/__vccOpts|const\s+\w+\s*=\s*Vue\b|createApp\s*\(/i.test(html)) {
    html = ensureAppMount(html)
  }

  if (!html.includes(TH_LIBS_MARKER) && !/data-lumi-th-libs/i.test(html)) {
    if (/<\/head>/i.test(html)) {
      html = html.replace(/<\/head>/i, `${TH_LIBS_MARKER}</head>`)
    } else {
      html = `${TH_LIBS_MARKER}${html}`
    }
  }
  // Vue 打包若 CDN 加载失败，仍可回退内联运行时
  if (
    /__vccOpts|const\s+\w+\s*=\s*Vue\b/i.test(html) &&
    !html.includes(VUE_RUNTIME_MARKER) &&
    !/data-lumi-vue-runtime/i.test(html)
  ) {
    if (/<\/head>/i.test(html)) {
      html = html.replace(/<\/head>/i, `${VUE_RUNTIME_MARKER}</head>`)
    }
  }
  return html
}

/**
 * iframe srcDoc：注入与酒馆助手相近的全局库。
 * CDN 优先；Vue 打包额外内联一份作为兜底（sandbox/离线）。
 */
export function finalizeStVueBeautifyDocument(doc: string): string {
  let html = String(doc || '')
  if (!html) return ''

  const libs = `<span data-lumi-th-libs hidden></span>${TH_THIRD_PARTY_HEAD}<script data-lumi-th-libs>${JQUERY_READY_SHIM}<\/script>`
  if (html.includes(TH_LIBS_MARKER)) {
    html = html.replace(TH_LIBS_MARKER, libs)
  } else if (!/data-lumi-th-libs/i.test(html) && isThFrontendContent(html)) {
    if (/<\/head>/i.test(html)) html = html.replace(/<\/head>/i, `${libs}</head>`)
    else html = `${libs}${html}`
  }

  // CDN Vue 通常够用；内联仅在标记存在时（离线兜底，体积大）
  if (html.includes(VUE_RUNTIME_MARKER)) {
    if (/data-lumi-vue-runtime/i.test(html)) {
      html = html.replace(VUE_RUNTIME_MARKER, '')
    } else {
      const runtime = `<script data-lumi-vue-runtime>${vueGlobalProd}\n${JQUERY_READY_SHIM}<\/script>`
      html = html.replace(VUE_RUNTIME_MARKER, runtime)
    }
  }

  html = demoteModuleScripts(html)
  return html
}

/** @deprecated 使用 finalizeStVueBeautifyDocument */
export const finalizeThFrontendDocument = finalizeStVueBeautifyDocument

/**
 * 展示流：把文中的助手式前端块收成完整文档（便于分段进 iframe）。
 * details 外壳保留（对齐助手：summary 仍在楼层，前端进 iframe）。
 */
export function normalizeStVueBeautifyInText(text: string): string {
  let s = unwrapBeautifyMarkdownFences(String(text ?? ''))
  if (!isThFrontendContent(s)) return s

  // details > summary + 完整文档 → 内层包壳，外壳留给分段
  s = s.replace(
    /(<details\b[^>]*>[\s\S]*?<summary\b[^>]*>[\s\S]*?<\/summary>\s*)(<!DOCTYPE\s+html[\s\S]*?<\/html\s*>)/gi,
    (_m, open: string, doc: string) => `${open}\n${wrapStVueBeautifyDocument(doc)}\n`,
  )

  // 独立完整文档
  if (
    (/<!DOCTYPE\s+html/i.test(s) || /<html[\s>]/i.test(s)) &&
    !/<details\b/i.test(s)
  ) {
    return wrapStVueBeautifyDocument(s)
  }

  // `<head>…</head><body>…` Vue 碎片（ta的物品）
  const headBody = s.match(/<head\b[\s\S]*?<\/body>/i)
  if (headBody?.[0] && isThFrontendContent(headBody[0]) && !/<details\b/i.test(s)) {
    const before = s.slice(0, headBody.index ?? 0)
    const after = s.slice((headBody.index ?? 0) + headBody[0].length)
    return `${before}\n${wrapStVueBeautifyDocument(headBody[0])}\n${after}`
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  }

  return s
}

/** 无对应美化规则的软标签：内联兑底（giggle 等） */
export function applyStSoftTagFallbackBeautify(text: string): string {
  let s = String(text ?? '')
  if (!s) return s

  const soft: Array<{ tag: string; style: string }> = [
    {
      tag: 'giggle',
      style:
        'display:block;margin:.55em 0;padding:.65em .9em;border-radius:12px;background:linear-gradient(135deg,#f3f8ff,#fff5f8);border:1px solid #e4ecf5;color:#3a4553;line-height:1.65;white-space:pre-wrap',
    },
    {
      tag: 'ice',
      style:
        'display:block;margin:.55em 0;padding:.65em .9em;border-radius:12px;background:#f4f8fb;border:1px solid #d9e6ef;color:#2f4a5a;line-height:1.65;white-space:pre-wrap',
    },
    {
      tag: 'danmu',
      style:
        'display:inline-block;margin:.15em .25em;padding:.15em .55em;border-radius:999px;background:#111827;color:#f9fafb;font-size:.92em',
    },
  ]

  for (const { tag, style } of soft) {
    const re = new RegExp(
      `<\\s*${tag}\\b[^>]*>([\\s\\S]*?)<\\s*\\/\\s*${tag}\\s*>`,
      'gi',
    )
    s = s.replace(
      re,
      `<span class="lumi-st-${tag}" data-st-tag="${tag}" style="${style}">$1</span>`,
    )
  }

  s = s.replace(/<\s*echo\b[^>]*>([\s\S]*?)<\s*\/\s*echo\s*>/gi, '$1')
  return s
}
