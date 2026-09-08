import type { ReactNode } from 'react'
import { parsePlotRichText } from '../../phone/apps/wechat/dating/plotRichText'

/** 剧情正文：旁白 + 对白（引号）+ 内心 OS（**） */
export function renderStoryPlotContent(source: string): ReactNode[] {
  const text = String(source || '').trim()
  if (!text) return []
  return parsePlotRichText(text)
}
