import { Fragment, type ReactNode } from 'react'
import {
  applyBuiltinEmotionStatusBeautify,
  splitEmotionStatusSegments,
  stripDisplayWrapperTagShells,
} from '../../phone/apps/wechat/dating/plotCoT'
import { parsePlotRichText } from '../../phone/apps/wechat/dating/plotRichText'
import { EmotionStatusCard } from '../components/feed/EmotionStatusCard'
import { PlotDirectionCard } from '../components/feed/PlotDirectionCard'
import { SandboxedHtmlFrame } from '../components/feed/SandboxedHtmlFrame'
import {
  coalesceAdjacentBeautifyHtml,
  isStyleOnlyBeautifyHtml,
  looksLikeCotBeautifyHtml,
  splitProseAndBeautifyHtml,
  stripOrphanStylesheetLinks,
} from './cotBeautifyHtml'

/** 若 HTML 被误转成实体，还原常见美化标签以便分流渲染 */
function unescapeBeautifyEntities(text: string): string {
  let s = String(text || '')
  if (!/&lt;\s*(?:details|style|summary|div|span)\b/i.test(s)) return s
  s = s.replace(/&lt;/gi, '<').replace(/&gt;/gi, '>')
  s = s.replace(/&quot;/gi, '"').replace(/&#39;/g, "'")
  return s
}

function renderProseOrHtml(source: string, keyPrefix: string): ReactNode[] {
  let text = unescapeBeautifyEntities(stripDisplayWrapperTagShells(String(source || '')))
  // 围栏已在上层拆成 EmotionStatusCard；此处只处理剩余 HTML / 旁白
  text = applyBuiltinEmotionStatusBeautify(text)
  text = unescapeBeautifyEntities(text)
  if (!text.trim()) return []

  let parts = coalesceAdjacentBeautifyHtml(splitProseAndBeautifyHtml(text))
  // 分裂器漏检但正文含标签 → 整段走 HTML，避免 <details> 当纯文字
  if (
    parts.length === 1 &&
    parts[0]!.type === 'prose' &&
    /<\/?(?:details|style|summary|div|head|html)\b/i.test(text)
  ) {
    parts = [{ type: 'html', text }]
  } else if (
    parts.every((p) => p.type === 'prose') &&
    looksLikeCotBeautifyHtml(text)
  ) {
    parts = [{ type: 'html', text }]
  }

  if (parts.length === 1 && parts[0]!.type === 'prose') {
    return parsePlotRichText(parts[0]!.text)
  }

  const nodes: ReactNode[] = []
  parts.forEach((part, i) => {
    if (part.type === 'html') {
      if (isStyleOnlyBeautifyHtml(part.text)) return
      nodes.push(
        <SandboxedHtmlFrame
          key={`${keyPrefix}-html-${i}`}
          html={stripDisplayWrapperTagShells(part.text)}
          title={`美化块 ${i + 1}`}
        />,
      )
      return
    }
    const prose = stripOrphanStylesheetLinks(part.text)
    if (!prose.trim()) return
    nodes.push(
      <Fragment key={`${keyPrefix}-prose-${i}`}>{parsePlotRichText(prose)}</Fragment>,
    )
  })
  return nodes
}

/** 剧情正文：情感状态卡（React）+ 旁白/对白 + 其它美化 HTML */
export function renderStoryPlotContent(source: string): ReactNode[] {
  const raw = String(source || '')
  if (!raw.trim()) return []

  const emotionParts = splitEmotionStatusSegments(raw)
  const nodes: ReactNode[] = []

  emotionParts.forEach((part, i) => {
    if (part.type === 'emotion') {
      nodes.push(
        <EmotionStatusCard
          key={`emotion-${i}`}
          title={part.title}
          body={part.body}
        />,
      )
      return
    }
    if (part.type === 'plotDirection') {
      nodes.push(
        <PlotDirectionCard
          key={`plot-dir-${i}`}
          title={part.title}
          body={part.body}
        />,
      )
      return
    }
    nodes.push(...renderProseOrHtml(part.text, `seg-${i}`))
  })

  return nodes
}
