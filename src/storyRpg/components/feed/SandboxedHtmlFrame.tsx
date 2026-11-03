import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  isCompleteHtmlDocument,
  sanitizePlotHtmlVisualHtml,
} from '../../../phone/apps/wechat/dating/datingPlotHtmlVisual'
import { isStyleOnlyBeautifyHtml } from '../../utils/cotBeautifyHtml'
import {
  finalizeStVueBeautifyDocument,
  isThFrontendContent,
  wrapStVueBeautifyDocument,
} from '../../utils/stTavernHelperCompat'

type Props = {
  html: string
  className?: string
  /** 无障碍标题 */
  title?: string
  minHeight?: number
}

/**
 * 对齐酒馆本体 + 酒馆助手（https://github.com/N0VI028/JS-Slash-Runner）：
 * - 无 script 的美化碎片：同页内联（对齐酒馆 mes_text）
 * - 助手式前端（html/head/body/script、月读 Vue）：sandbox iframe + jQuery/Vue/FA
 */

const HEIGHT_BRIDGE = `<script>(function(){function h(){try{var b=document.body,e=document.documentElement;var n=Math.max(b?b.scrollHeight:0,b?b.offsetHeight:0,e?e.scrollHeight:0,e?e.offsetHeight:0,1);parent.postMessage({source:"plot-html-visual",type:"height",height:n},"*")}catch(x){}}h();if(typeof ResizeObserver!=="undefined"&&document.body){new ResizeObserver(h).observe(document.body)}document.addEventListener("toggle",h,true);window.addEventListener("load",h);setTimeout(h,40);setTimeout(h,200);setTimeout(h,600);setTimeout(h,1200)})();</script>`

const IFRAME_SHELL_CSS = `html,body{margin:0;padding:4px 2px 8px;box-sizing:border-box;font-family:Georgia,"Noto Serif SC","Songti SC","PingFang SC","Microsoft YaHei",serif;background:transparent;color:#2a2622;line-height:1.55;overflow:visible;height:auto;min-height:0;}
*,*::before,*::after{box-sizing:border-box;max-width:100%;}
img,video,svg{max-width:100%;height:auto;}
table{border-collapse:collapse;}
a{color:#3b6fd9;text-decoration:none;}
details{margin:.35em 0;}
summary{cursor:pointer;}
`

function injectHeightBridge(doc: string): string {
  if (doc.includes('plot-html-visual')) return doc
  if (/<\/body>/i.test(doc)) return doc.replace(/<\/body>/i, `${HEIGHT_BRIDGE}</body>`)
  return `${doc}${HEIGHT_BRIDGE}`
}

function hoistStyleTags(html: string): { styles: string; body: string } {
  const styles: string[] = []
  const body = String(html || '').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, (block) => {
    styles.push(block)
    return ''
  })
  return { styles: styles.join('\n'), body: body.trim() }
}

function stripScripts(html: string): string {
  return String(html || '').replace(/<\s*script\b[^>]*>[\s\S]*?<\/script>/gi, '')
}

/** details 包完整文档时抽出内层（对齐助手：只把代码块进 iframe） */
function extractEmbeddedHtmlDocument(html: string): string | null {
  const m = String(html || '').match(/<!DOCTYPE\s+html[\s\S]*?<\/html\s*>/i)
  if (m?.[0] && isThFrontendContent(m[0])) return m[0]
  const htmlOnly = String(html || '').match(/<html\b[\s\S]*?<\/html\s*>/i)
  if (htmlOnly?.[0] && isThFrontendContent(htmlOnly[0])) return htmlOnly[0]
  return null
}

function needsScriptIframe(html: string): boolean {
  const s = String(html || '')
  if (!s) return false
  if (isCompleteHtmlDocument(s)) return true
  if (isThFrontendContent(s)) return true
  if (/LUMI_VUE_RUNTIME|LUMI_TH_LIBS/i.test(s)) return true
  if (/<\s*script\b/i.test(s)) return true
  if (/<head\b/i.test(s) && /<\/body>/i.test(s)) return true
  if (extractEmbeddedHtmlDocument(s)) return true
  return false
}

function buildIframeSrcDoc(html: string): string {
  let raw = String(html || '').trim()
  if (!raw) return ''

  // details/碎片里嵌套的完整前端文档 → 只渲染内层（助手同款）
  const embedded = extractEmbeddedHtmlDocument(raw)
  if (embedded) raw = embedded

  const th =
    isThFrontendContent(raw) ||
    /LUMI_VUE_RUNTIME|LUMI_TH_LIBS/i.test(raw) ||
    (/<\s*script\b/i.test(raw) && /<!DOCTYPE\s+html|<html[\s>]|<head\b/i.test(raw))

  if (th) {
    if (!isCompleteHtmlDocument(raw)) {
      raw = wrapStVueBeautifyDocument(raw)
    } else if (!/LUMI_TH_LIBS|data-lumi-th-libs/i.test(raw)) {
      // 已是完整文档（叽喳/手机等）仍注入助手同系库
      raw = raw.replace(/<\/head>/i, '<!--LUMI_TH_LIBS--></head>')
    }
    raw = finalizeStVueBeautifyDocument(raw)
    return injectHeightBridge(raw)
  }

  if (isCompleteHtmlDocument(raw)) return injectHeightBridge(raw)
  const { styles, body } = hoistStyleTags(raw)
  if (!body) return ''
  return injectHeightBridge(
    `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${IFRAME_SHELL_CSS}</style>${styles}</head><body>${body}</body></html>`,
  )
}

/**
 * 酒馆式美化 HTML：
 * - 碎片 → 同页内联（对齐酒馆楼层）
 * - 助手前端 / 完整文档 → sandbox iframe + TH 全局库
 */
export function SandboxedHtmlFrame({
  html,
  className,
  title = '美化内容',
  minHeight = 36,
}: Props) {
  const cleaned = useMemo(() => sanitizePlotHtmlVisualHtml(html), [html])
  const useIframe = Boolean(cleaned && needsScriptIframe(cleaned))

  if (!cleaned || isStyleOnlyBeautifyHtml(cleaned)) return null

  if (useIframe) {
    return (
      <BeautifyIframeFrame
        html={cleaned}
        className={className}
        title={title}
        minHeight={minHeight}
      />
    )
  }

  return <BeautifyInlineHost html={cleaned} className={className} title={title} />
}

function BeautifyInlineHost({
  html,
  className,
  title,
}: {
  html: string
  className?: string
  title: string
}) {
  const payload = useMemo(() => {
    const safe = stripScripts(html)
    const { styles, body } = hoistStyleTags(safe)
    if (!body) return ''
    const withOpen = body.replace(/<details(\s[^>]*)?>/gi, (_full, attrs: string = '') => {
      if (/\bopen\b/i.test(attrs)) return `<details${attrs}>`
      return `<details open${attrs}>`
    })
    return `${styles}${withOpen}`
  }, [html])

  if (!payload) return null

  return (
    <div
      className={
        className ??
        'lumi-bf-inline my-2 w-full [&_details]:my-2 [&_img]:max-w-full'
      }
      title={title}
      role="region"
      aria-label={title}
      dangerouslySetInnerHTML={{ __html: payload }}
    />
  )
}

function BeautifyIframeFrame({
  html,
  className,
  title,
  minHeight,
}: {
  html: string
  className?: string
  title: string
  minHeight: number
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [frameHeight, setFrameHeight] = useState(Math.max(minHeight, 48))
  const srcDoc = useMemo(() => buildIframeSrcDoc(html), [html])

  const onMessage = useCallback(
    (ev: MessageEvent) => {
      const data = ev.data
      if (!data || typeof data !== 'object') return
      const d = data as { source?: string; type?: string; height?: number }
      if (d.source !== 'plot-html-visual' || d.type !== 'height') return
      if (iframeRef.current && ev.source && ev.source !== iframeRef.current.contentWindow) return
      const h = Number(d.height)
      if (!Number.isFinite(h) || h < 8) return
      setFrameHeight(Math.max(Math.ceil(h) + 6, minHeight))
    },
    [minHeight],
  )

  useEffect(() => {
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [onMessage])

  useEffect(() => {
    if (!srcDoc) return
    setFrameHeight(Math.max(minHeight, 48))
  }, [srcDoc, minHeight])

  if (!srcDoc) return null

  return (
    <iframe
      ref={iframeRef}
      sandbox="allow-scripts"
      referrerPolicy="no-referrer"
      title={title}
      srcDoc={srcDoc}
      className={className ?? 'my-1.5 block w-full border-0 bg-transparent'}
      style={{ height: frameHeight, maxWidth: '100%', background: 'transparent' }}
    />
  )
}
