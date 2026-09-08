import { motion } from 'framer-motion'
import { ChevronDown, Clapperboard } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { StoryHtmlVisual } from '../../types'
import {
  isCompleteHtmlDocument,
  PLOT_ARTIFACT_VISUAL_NAME,
} from '../../../phone/apps/wechat/dating/datingPlotHtmlVisual'

type Props = {
  open: boolean
  onToggle: () => void
  visual?: StoryHtmlVisual | null
  pendingHint?: boolean
}

const spring = { type: 'spring' as const, stiffness: 420, damping: 34 }

const HEIGHT_BRIDGE = `<script>(function(){function h(){try{var b=document.body,e=document.documentElement;var n=Math.max(b?b.scrollHeight:0,b?b.offsetHeight:0,e?e.scrollHeight:0,e?e.offsetHeight:0,120);parent.postMessage({source:"plot-html-visual",type:"height",height:n},"*")}catch(x){}}h();if(typeof ResizeObserver!=="undefined"&&document.body){new ResizeObserver(h).observe(document.body)}window.addEventListener("load",h);setTimeout(h,80);setTimeout(h,320);setTimeout(h,900)})();</script>`

const FRAGMENT_SHELL_CSS = `html,body{margin:0;padding:14px 12px 18px;box-sizing:border-box;font-family:Georgia,"Noto Serif SC","Songti SC","PingFang SC","Microsoft YaHei",serif;background:linear-gradient(165deg,#f6f3ee 0%,#eef2f6 48%,#f7f0f2 100%);color:#2a2622;line-height:1.5;overflow:auto;height:auto;}
*,*::before,*::after{box-sizing:border-box;max-width:100%;}
img,video,svg{max-width:100%;height:auto;}
table{border-collapse:collapse;}
a{color:#3b6fd9;text-decoration:none;}
input,label,button{cursor:pointer;}
.title-custom{font-size:1.15em;font-weight:700;margin:0 0 .6em;text-align:center;}
`

function injectHeightBridge(doc: string): string {
  if (doc.includes('plot-html-visual')) return doc
  if (/<\/body>/i.test(doc)) return doc.replace(/<\/body>/i, `${HEIGHT_BRIDGE}</body>`)
  return `${doc}${HEIGHT_BRIDGE}`
}

export function buildPlotHtmlVisualSrcDoc(html: string): string {
  const raw = String(html || '').trim()
  if (!raw) return ''
  if (isCompleteHtmlDocument(raw)) {
    return injectHeightBridge(raw)
  }
  return injectHeightBridge(
    `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${FRAGMENT_SHELL_CSS}</style></head><body>${raw}</body></html>`,
  )
}

/** 剧情结尾 · 小剧场折叠条 */
export function PlotHtmlVisualAccordion({ open, onToggle, visual, pendingHint }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [frameHeight, setFrameHeight] = useState(200)
  const html = visual?.html?.trim() ?? ''
  const title = visual?.title?.trim() || PLOT_ARTIFACT_VISUAL_NAME
  const emoji = visual?.emoji?.trim()
  const hasContent = html.length > 0
  const srcDoc = useMemo(() => (hasContent ? buildPlotHtmlVisualSrcDoc(html) : ''), [html, hasContent])

  const onMessage = useCallback(
    (ev: MessageEvent) => {
      const data = ev.data
      if (!data || typeof data !== 'object') return
      const d = data as { source?: string; type?: string; height?: number }
      if (d.source !== 'plot-html-visual' || d.type !== 'height') return
      if (iframeRef.current && ev.source && ev.source !== iframeRef.current.contentWindow) return
      const h = Number(d.height)
      if (!Number.isFinite(h) || h < 80) return
      setFrameHeight(Math.max(Math.ceil(h) + 8, 140))
    },
    [],
  )

  useEffect(() => {
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [onMessage])

  useEffect(() => {
    if (!open || !hasContent) return
    // 展开时再催一次测高（桥脚本内已有定时器）
    const t = window.setTimeout(() => {
      try {
        iframeRef.current?.contentWindow?.postMessage(
          { source: 'plot-html-visual-host', type: 'ping' },
          '*',
        )
      } catch {
        /* sandbox */
      }
    }, 100)
    return () => window.clearTimeout(t)
  }, [open, hasContent, srcDoc])

  if (!hasContent && !pendingHint) return null

  const displayTitle = emoji ? `${emoji} ${title}` : title

  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-dashed border-[var(--sr-gold)]/45 bg-[var(--sr-panel-elevated)]">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          if (!hasContent) return
          onToggle()
        }}
        onPointerDown={(e) => e.stopPropagation()}
        disabled={!hasContent}
        className={`flex w-full items-center gap-2.5 px-3.5 py-3 text-left transition ${
          hasContent ? 'hover:bg-[var(--sr-panel)]/50' : 'cursor-default opacity-80'
        }`}
      >
        <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-[var(--sr-gold)]/12 text-[var(--sr-gold)]">
          <Clapperboard className="size-3.5" strokeWidth={1.75} aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-semibold tracking-wide text-[var(--sr-text)]">
            {hasContent ? displayTitle : `${PLOT_ARTIFACT_VISUAL_NAME} · 待生成`}
          </span>
          <span className="mt-0.5 block text-[10px] leading-snug text-[var(--sr-text-faint)]">
            {hasContent
              ? open
                ? '点击收起小剧场画面'
                : '点击展开小剧场画面'
              : '本段尚未附带小剧场画面。请对本段点「重新生成」；新生成会自动补写小剧场（仅开开关不会给旧段落补内容）。'}
          </span>
        </span>
        {hasContent ? (
          <ChevronDown
            className={`size-4 shrink-0 text-[var(--sr-text-muted)] transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
            aria-hidden
          />
        ) : null}
      </button>
      {hasContent ? (
        <motion.div
          initial={false}
          animate={{ height: open ? 'auto' : 0, opacity: open ? 1 : 0 }}
          transition={spring}
          className="overflow-hidden"
        >
          <div className="border-t border-[var(--sr-border)]/80 px-3 pb-3 pt-2">
            <iframe
              ref={iframeRef}
              sandbox="allow-scripts"
              referrerPolicy="no-referrer"
              title={title}
              srcDoc={srcDoc}
              className="w-full rounded-lg border border-[var(--sr-border)] bg-white"
              style={{ height: frameHeight, display: 'block' }}
            />
          </div>
        </motion.div>
      ) : null}
    </div>
  )
}
