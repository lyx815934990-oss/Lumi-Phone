import type { ReactNode } from 'react'

/** 轻量 Markdown → React（段落、加粗、斜体、引用） */
export function renderSimpleMarkdown(source: string): ReactNode[] {
  const blocks = String(source || '')
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean)

  return blocks.map((block, bi) => {
    if (block.startsWith('> ')) {
      return (
        <blockquote key={bi}>
          {inlineMarkdown(block.replace(/^>\s?/, ''))}
        </blockquote>
      )
    }
    return <p key={bi}>{inlineMarkdown(block)}</p>
  })
}

function inlineMarkdown(text: string): ReactNode[] {
  const parts: ReactNode[] = []
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*)/g
  let last = 0
  let m: RegExpExecArray | null
  let i = 0
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index))
    const token = m[0]
    if (token.startsWith('**')) {
      parts.push(<strong key={i++}>{token.slice(2, -2)}</strong>)
    } else {
      parts.push(<em key={i++}>{token.slice(1, -1)}</em>)
    }
    last = m.index + token.length
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts.length ? parts : [text]
}
