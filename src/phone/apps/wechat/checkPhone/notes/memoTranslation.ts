import type { MemoBlock, PrivateMemo } from './memoTypes'

export type MemoTranslationSegment =
  | { kind: 'title'; text: string }
  | { kind: 'h1'; text: string }
  | { kind: 'h2'; text: string }
  | { kind: 'text'; text: string }
  | { kind: 'voice'; text: string; duration?: string }
  | { kind: 'image'; text: string }

/** 是否有可展示的整篇译文 */
export function memoHasTranslation(memo: PrivateMemo): boolean {
  if (memo.titleTranslation?.trim()) return true
  return memo.blocks.some((b) => blockTranslation(b)?.trim())
}

function blockTranslation(block: MemoBlock): string | undefined {
  if (block.type === 'file') return undefined
  return block.translation
}

/** 汇总标题与各块译文，供全屏翻译页展示 */
export function collectMemoTranslationSegments(memo: PrivateMemo): MemoTranslationSegment[] {
  const out: MemoTranslationSegment[] = []
  const titleTr = memo.titleTranslation?.trim()
  if (titleTr) out.push({ kind: 'title', text: titleTr })
  for (const block of memo.blocks) {
    const tr = blockTranslation(block)?.trim()
    if (!tr) continue
    if (block.type === 'h1') out.push({ kind: 'h1', text: tr })
    else if (block.type === 'h2') out.push({ kind: 'h2', text: tr })
    else if (block.type === 'text') out.push({ kind: 'text', text: tr })
    else if (block.type === 'voice') out.push({ kind: 'voice', text: tr, duration: block.duration })
    else if (block.type === 'image') out.push({ kind: 'image', text: tr })
  }
  return out
}
