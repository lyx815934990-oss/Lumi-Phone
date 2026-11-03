/**
 * 酒馆式美化正则产出的 HTML 片段识别 / 与旁白分段。
 * 渲染层再走 sanitize + sandbox iframe。
 */

export type BeautifySegment = { type: 'prose' | 'html'; text: string }

/** 正则替换串里常见的 ```html … ``` 围栏 */
export function unwrapHtmlFenceInText(text: string): string {
  let s = String(text ?? '')
  if (!s.includes('```')) return s
  s = s.replace(/```(?:html|HTML)\s*\r?\n?([\s\S]*?)```/g, '\n$1\n')
  return s
}

function isSelfClosing(tag: string, full: string): boolean {
  if (/\/\s*>$/.test(full)) return true
  return /^(br|hr|img|input|meta|link|source|wbr|area|base|col|embed|param|track)$/i.test(
    tag,
  )
}

/** 从 openTag 起点做同名标签平衡截取，返回结束下标（不含之后字符） */
function consumeBalanced(src: string, openIdx: number, tagName: string): number {
  const tag = tagName.toLowerCase()
  const openRe = new RegExp(`<${tag}\\b[^>]*>`, 'gi')
  const closeRe = new RegExp(`</${tag}\\s*>`, 'gi')
  openRe.lastIndex = openIdx
  const first = openRe.exec(src)
  if (!first || first.index !== openIdx) {
    const next = src.indexOf('\n\n', openIdx + 1)
    return next === -1 ? src.length : next
  }
  let i = first.index + first[0].length
  if (isSelfClosing(tag, first[0])) return i

  let depth = 1
  while (i < src.length && depth > 0) {
    openRe.lastIndex = i
    closeRe.lastIndex = i
    const nextOpen = openRe.exec(src)
    const nextClose = closeRe.exec(src)
    if (!nextClose) return src.length
    if (nextOpen && nextOpen.index < nextClose.index) {
      if (!isSelfClosing(tag, nextOpen[0])) depth += 1
      i = nextOpen.index + nextOpen[0].length
    } else {
      depth -= 1
      i = nextClose.index + nextClose[0].length
    }
  }
  return i
}

function consumeDoctypeOrHtml(src: string, idx: number): number {
  const slice = src.slice(idx)
  const close = slice.search(/<\/html\s*>/i)
  if (close >= 0) {
    const m = slice.slice(close).match(/<\/html\s*>/i)
    return idx + close + (m ? m[0].length : 0)
  }
  return src.length
}

function consumeHtmlFence(src: string, idx: number): { end: number; inner: string } | null {
  const open = src.slice(idx).match(/^```(?:html|HTML)\s*\r?\n?/)
  if (!open) return null
  const innerStart = idx + open[0].length
  const closeRel = src.slice(innerStart).indexOf('```')
  if (closeRel < 0) {
    return { end: src.length, inner: src.slice(innerStart) }
  }
  return {
    end: innerStart + closeRel + 3,
    inner: src.slice(innerStart, innerStart + closeRel),
  }
}

export function looksLikeCotBeautifyHtml(text: string): boolean {
  const t = String(text || '').trim()
  if (t.length < 6) return false
  if (/```html/i.test(t)) return true
  if (/<!DOCTYPE\s+html/i.test(t) || /<html[\s>]/i.test(t)) return true
  // 酒馆 Vue 美化：常以 <head><script> 开头（无 html 外壳）
  if (/<head\b/i.test(t) && /<script\b/i.test(t)) return true
  if (/<style\b/i.test(t) && /<\/style>/i.test(t)) return true
  if (/<\s*(script|link)\b/i.test(t)) return true
  // 常见美化碎片：p/span/div/details…
  if (
    /<\s*(p|span|div|details|section|article|table|main|ul|ol|header|footer)\b/i.test(t) &&
    /<\/\s*(p|span|div|details|section|article|table|main|ul|ol|header|footer)\s*>/i.test(t)
  ) {
    return true
  }
  // 带 style= 的单标签行
  if (/<\s*(p|span|div)\b[^>]*\bstyle\s*=/i.test(t)) return true
  return false
}

/**
 * 把旁白与美化 HTML 块切开。无 HTML 时整段 prose。
 * 支持完整文档、```html 围栏、div/details/p/span 等碎片。
 */
export function splitProseAndBeautifyHtml(source: string): BeautifySegment[] {
  const src = unwrapHtmlFenceInText(String(source ?? ''))
  if (!src.trim()) return []
  if (!looksLikeCotBeautifyHtml(src)) {
    return [{ type: 'prose', text: src }]
  }

  const out: BeautifySegment[] = []
  let pos = 0
  const re =
    /```(?:html|HTML)\b|<!DOCTYPE\s+html\b[^>]*>|<html\b[^>]*>|<head\b[^>]*>|<link\b[^>]*>|<(style|details|div|section|article|table|main|p|span)\b[^>]*>/gi

  const pushProse = (from: number, to: number) => {
    if (to <= from) return
    const chunk = stripOrphanStylesheetLinks(src.slice(from, to))
    if (!chunk.trim()) return
    out.push({ type: 'prose', text: chunk })
  }

  let m: RegExpExecArray | null
  while ((m = re.exec(src)) !== null) {
    if (m.index < pos) continue
    const full = m[0]

    if (/^```/i.test(full)) {
      pushProse(pos, m.index)
      const fenced = consumeHtmlFence(src, m.index)
      if (fenced) {
        const inner = fenced.inner.trim()
        if (inner) out.push({ type: 'html', text: inner })
        pos = fenced.end
        re.lastIndex = pos
        continue
      }
    }

    const name = (
      m[1] ||
      (/^<!DOCTYPE/i.test(full) || /^<html/i.test(full)
        ? 'html'
        : /^<head/i.test(full)
          ? 'head'
          : /^<link/i.test(full)
            ? 'link'
            : '')
    ).toLowerCase()
    let start = m.index
    let end: number
    if (name === 'html' || /^<!DOCTYPE/i.test(full)) {
      end = consumeDoctypeOrHtml(src, m.index)
    } else if (name === 'head') {
      // 酒馆 Vue：<head>…</head><body>…</body>（可能无 <html>）
      const fromHead = src.slice(m.index)
      const bodyClose = fromHead.search(/<\/body\s*>/i)
      if (bodyClose >= 0) {
        const closeM = fromHead.slice(bodyClose).match(/<\/body\s*>/i)
        end = m.index + bodyClose + (closeM ? closeM[0].length : 0)
      } else {
        end = consumeDoctypeOrHtml(src, m.index)
      }
    } else if (name === 'link') {
      // 月读标题美化：<link> + <style> + <div>，link 必须跟后面的块走
      end = m.index + full.length
      end = extendWithTrailingLinks(src, end)
      end = extendWithTrailingMarkup(src, end, 'follow')
    } else if (name === 'style') {
      // 先回溯 <link>，再 pushProse，避免 link 先被当成旁白
      start = rewindPrecedingStylesheetLinks(src, pos, m.index)
      end = consumeBalanced(src, m.index, 'style')
      end = extendWithTrailingMarkup(src, end, 'follow')
    } else {
      end = consumeBalanced(src, m.index, name || 'div')
      // details/section 后紧跟的 <style> 并入同一块（用户美化正则常见顺序）
      end = extendWithTrailingMarkup(src, end, 'style')
    }
    pushProse(pos, start)
    const htmlChunk = src.slice(start, end)
    if (htmlChunk.trim()) out.push({ type: 'html', text: htmlChunk })
    pos = end
    re.lastIndex = end
  }
  pushProse(pos, src.length)

  if (!out.length) return [{ type: 'prose', text: src }]
  if (!out.some((s) => s.type === 'html')) return [{ type: 'prose', text: src }]
  return coalesceAdjacentBeautifyHtml(out)
}

/** 仅含 style/link/空白的片段：单独 iframe 会变成空白白卡 */
export function isStyleOnlyBeautifyHtml(html: string): boolean {
  const stripped = String(html || '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<link\b[^>]*>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .trim()
  if (!stripped) return true
  return !/<[a-zA-Z!]/.test(stripped)
}

/** 旁白里漏网的 stylesheet link（月读美化碎片）直接丢掉，不当正文显示 */
export function stripOrphanStylesheetLinks(text: string): string {
  return String(text || '')
    .replace(
      /<link\b[^>]*\brel\s*=\s*["'][^"']*stylesheet[^"']*["'][^>]*>/gi,
      '',
    )
    .replace(
      /<link\b[^>]*\bhref\s*=\s*["']https?:\/\/[^"']+["'][^>]*>/gi,
      '',
    )
}

/**
 * 合并相邻 html 段，避免 `<details/>` 与其后 `<style/>` 分进两个 iframe。
 * 若旁白只剩 stylesheet link，并入下一块 html。
 */
export function coalesceAdjacentBeautifyHtml(parts: BeautifySegment[]): BeautifySegment[] {
  const out: BeautifySegment[] = []
  for (const part of parts) {
    const last = out[out.length - 1]
    if (part.type === 'html' && last?.type === 'html') {
      out[out.length - 1] = {
        type: 'html',
        text: `${last.text}\n${part.text}`,
      }
      continue
    }
    // prose 几乎只是 <link> → 并入下一段 html
    if (
      part.type === 'html' &&
      last?.type === 'prose' &&
      isMostlyStylesheetLinks(last.text)
    ) {
      out[out.length - 1] = {
        type: 'html',
        text: `${last.text}\n${part.text}`,
      }
      continue
    }
    if (part.type === 'prose') {
      const cleaned = stripOrphanStylesheetLinks(part.text)
      if (!cleaned.trim()) continue
      out.push({ type: 'prose', text: cleaned })
      continue
    }
    out.push(part)
  }
  return out
}

function isMostlyStylesheetLinks(text: string): boolean {
  const stripped = stripOrphanStylesheetLinks(text).replace(/\s+/g, '')
  return !stripped
}

function extendWithTrailingLinks(src: string, end: number): number {
  let cursor = end
  for (let guard = 0; guard < 6; guard++) {
    const rest = src.slice(cursor)
    const m = rest.match(/^\s*(<link\b[^>]*>)/i)
    if (!m?.[1]) break
    cursor += rest.indexOf(m[1]) + m[1].length
  }
  return cursor
}

/** 把 start 前回溯并入紧邻的 <link stylesheet> */
function rewindPrecedingStylesheetLinks(
  src: string,
  floor: number,
  start: number,
): number {
  let cursor = start
  const before = src.slice(floor, start)
  const m = before.match(/(?:(?:\s*)<link\b[^>]*>)+$/i)
  if (m) cursor = start - m[0].length
  return cursor
}

/** 从 end 起吞并紧随的 style，或 style 后的容器标签 */
function extendWithTrailingMarkup(
  src: string,
  end: number,
  mode: 'style' | 'follow',
): number {
  let cursor = end
  for (let guard = 0; guard < 8; guard++) {
    const rest = src.slice(cursor)
    if (mode === 'style' || mode === 'follow') {
      const styleM = rest.match(/^\s*(<style\b[^>]*>)/i)
      if (styleM?.[1]) {
        const styleIdx = cursor + rest.indexOf(styleM[1])
        cursor = consumeBalanced(src, styleIdx, 'style')
        continue
      }
    }
    if (mode === 'follow') {
      const follow = rest.match(
        /^\s*(<(?:details|div|section|article|table|main|p)\b[^>]*>)/i,
      )
      if (follow?.[1]) {
        const followIdx = cursor + rest.indexOf(follow[1])
        const tag = follow[1].match(/^<([a-zA-Z][\w:-]*)/)?.[1] || 'div'
        cursor = consumeBalanced(src, followIdx, tag)
        continue
      }
    }
    break
  }
  return cursor
}
