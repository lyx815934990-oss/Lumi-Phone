import { Fragment, useCallback, useRef, useState, type MutableRefObject, type ReactNode } from 'react'
import {
  DatingDialogueTranslationBubble,
  MISSING_PLOT_TRANSLATION_HINT,
} from './DatingDialogueTranslationBubble'
import type { PlotDialogueTranslation } from './types'

export { MISSING_PLOT_TRANSLATION_HINT }

const QL = '\u201C'
const QR = '\u201D'
/** 少数排版/导出用弯引号变体 */
const Q_OPEN_ALT = '\u201F'
/** 闭合侧：优先标准右弯引号；若无再兜底全角直引号（少数输入法） */
function indexOfClosingCurve(t: string, from: number): number {
  const jR = t.indexOf(QR, from)
  if (jR !== -1) return jR
  return t.indexOf('\uFF02', from)
}

/** 闭合直角引号：支持对白内嵌套「书名/引语」 */
function indexOfClosingCorner(t: string, from: number): number {
  let depth = 0
  for (let i = from; i < t.length; i += 1) {
    const ch = t[i]
    if (ch === '「') depth += 1
    else if (ch === '」') {
      if (depth === 0) return i
      depth -= 1
    }
  }
  return -1
}

/** 内心 OS：浅灰字，无衬底、无描边 */
const osCls = 'text-[15px] font-normal italic leading-[1.75] text-[#b8b8bc]'
const osClickableCls = `${osCls} cursor-pointer underline decoration-dotted decoration-[#c8c8cc] underline-offset-2`

/**
 * 对白样式：不用圆角+clone 底纹（多行时会碎成多块药丸）。
 * 以字重 + 暖底色条区分旁白，换行后仍读作同一句。
 */
const dialogueCls =
  'inline not-italic bg-[#f7f3ec] px-[0.12em] font-medium tracking-[0.02em] text-[#3f3a33] shadow-[inset_0_-1px_0_0_rgba(235,227,215,0.95)]'

const dialogueClickableCls = `${dialogueCls} cursor-pointer transition-colors hover:bg-[#f0ebe3]`

function normalizeRichTextSource(s: string): string {
  return String(s || '')
    .replace(/\uFEFF/g, '')
    .replace(/\uFF0A/g, '*')
}

/** 平行事件等 plain 模式：旧稿「」统一成半角双引号，且不再套对白底纹 */
function normalizePlainDialogueSource(s: string): string {
  return normalizeRichTextSource(s).replace(/「([^」\n]*)」/g, '"$1"')
}

type Match = { end: number; node: ReactNode }

export type ParsePlotRichTextOpts = {
  plainDialogue?: boolean
  /** 对白点击（index 为正文中对白出现顺序） */
  onDialogueClick?: (index: number, sourceText: string, el: HTMLElement) => void
  /** 可点对白时从 0 递增的计数器（由调用方持有 ref 对象） */
  dialogueIndexRef?: MutableRefObject<number>
  /** 内心 OS 点击 */
  onInnerOsClick?: (index: number, sourceText: string, el: HTMLElement) => void
  innerOsIndexRef?: MutableRefObject<number>
}

/**
 * 三种语义：**内心**、对白（「」/弯引号/英文引号）、其余为旁白。
 * 对白：柔和轻奢底纹 + 细描边区分旁白（非 VN 气泡卡片）。
 * 优先级：** → * → 「」 → “” / ‟ → 半角 ""
 * 半角直引号对白在展示层映射为弯引号并套用 dialogueCls；顶层将全角＊规范为半角 * 以便 **内心** 命中。
 */
export function parsePlotRichText(
  s: string,
  depth = 0,
  opts?: ParsePlotRichTextOpts,
): ReactNode[] {
  const t =
    depth === 0
      ? opts?.plainDialogue
        ? normalizePlainDialogueSource(s)
        : normalizeRichTextSource(s)
      : s
  if (!t) return []
  if (depth > 24) return [<Fragment key="deep">{t}</Fragment>]

  const out: ReactNode[] = []
  let plainStart = 0
  let i = 0
  let key = 0
  const nextKey = () => {
    key += 1
    return `k-${depth}-${key}`
  }

  const emitPlain = (from: number, to: number) => {
    if (from >= to) return
    const chunk = t.slice(from, to)
    out.push(<Fragment key={nextKey()}>{chunk}</Fragment>)
  }

  const wrapDialogue = (k: string, children: ReactNode, sourceText: string) => {
    if (opts?.plainDialogue) {
      return <Fragment key={k}>{children}</Fragment>
    }
    const canClick = typeof opts?.onDialogueClick === 'function'
    const idx = opts?.dialogueIndexRef ? opts.dialogueIndexRef.current++ : -1
    if (!canClick || idx < 0) {
      return (
        <span key={k} className={dialogueCls} style={{ fontFamily: 'var(--dating-font-dialogue)' }}>
          {children}
        </span>
      )
    }
    return (
      <span
        key={k}
        role="button"
        tabIndex={0}
        className={dialogueClickableCls}
        style={{ fontFamily: 'var(--dating-font-dialogue)' }}
        title="点击查看译文"
        onClick={(e) => {
          e.stopPropagation()
          opts.onDialogueClick?.(idx, sourceText, e.currentTarget)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            e.stopPropagation()
            opts.onDialogueClick?.(idx, sourceText, e.currentTarget)
          }
        }}
      >
        {children}
      </span>
    )
  }

  const wrapInnerOs = (k: string, children: ReactNode, sourceText: string) => {
    const canClick = typeof opts?.onInnerOsClick === 'function'
    const idx = opts?.innerOsIndexRef ? opts.innerOsIndexRef.current++ : -1
    if (!canClick || idx < 0) {
      return (
        <span key={k} className={osCls} style={{ fontFamily: 'var(--dating-font-inner-os)' }}>
          {children}
        </span>
      )
    }
    return (
      <span
        key={k}
        role="button"
        tabIndex={0}
        className={osClickableCls}
        style={{ fontFamily: 'var(--dating-font-inner-os)' }}
        title="点击查看译文"
        onClick={(e) => {
          e.stopPropagation()
          opts.onInnerOsClick?.(idx, sourceText, e.currentTarget)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            e.stopPropagation()
            opts.onInnerOsClick?.(idx, sourceText, e.currentTarget)
          }
        }}
      >
        {children}
      </span>
    )
  }

  const tryOs = (): Match | null => {
    if (!t.slice(i).startsWith('**')) return null
    const end = t.indexOf('**', i + 2)
    if (end === -1) return null
    const inner = t.slice(i + 2, end)
    const k = nextKey()
    return {
      end: end + 2,
      node: wrapInnerOs(
        k,
        parsePlotRichText(inner, depth + 1, {
          ...opts,
          onDialogueClick: undefined,
          onInnerOsClick: undefined,
        }),
        inner,
      ),
    }
  }

  const trySingleOs = (): Match | null => {
    if (t[i] !== '*') return null
    // 双星号由 tryOs 处理；这里只兜底单星号。
    if (t[i + 1] === '*') return null
    const end = t.indexOf('*', i + 1)
    if (end === -1) return null
    const inner = t.slice(i + 1, end)
    if (!inner.trim()) return null
    const k = nextKey()
    return {
      end: end + 1,
      node: wrapInnerOs(
        k,
        parsePlotRichText(inner, depth + 1, {
          ...opts,
          onDialogueClick: undefined,
          onInnerOsClick: undefined,
        }),
        inner,
      ),
    }
  }

  const tryCorner = (): Match | null => {
    if (t[i] !== '「') return null
    const end = indexOfClosingCorner(t, i + 1)
    if (end === -1) return null
    const inner = t.slice(i + 1, end)
    const k = nextKey()
    return {
      end: end + 1,
      node: wrapDialogue(
        k,
        opts?.plainDialogue ? (
          <>
            {QL}
            {parsePlotRichText(inner, depth + 1, { ...opts, onDialogueClick: undefined })}
            {QR}
          </>
        ) : (
          <>
            「{parsePlotRichText(inner, depth + 1, { ...opts, onDialogueClick: undefined })}」
          </>
        ),
        inner,
      ),
    }
  }

  const tryCurve = (): Match | null => {
    if (t[i] !== QL && t[i] !== Q_OPEN_ALT) return null
    const end = indexOfClosingCurve(t, i + 1)
    if (end === -1) return null
    const inner = t.slice(i + 1, end)
    const k = nextKey()
    return {
      end: end + 1,
      node: wrapDialogue(
        k,
        <>
          {QL}
          {parsePlotRichText(inner, depth + 1, { ...opts, onDialogueClick: undefined })}
          {QR}
        </>,
        inner,
      ),
    }
  }

  const tryAscii = (): Match | null => {
    if (t[i] !== '"') return null
    const end = t.indexOf('"', i + 1)
    if (end === -1 || end === i + 1) return null
    const inner = t.slice(i + 1, end)
    const k = nextKey()
    return {
      end: end + 1,
      node: wrapDialogue(
        k,
        <>
          {QL}
          {parsePlotRichText(inner, depth + 1, { ...opts, onDialogueClick: undefined })}
          {QR}
        </>,
        inner,
      ),
    }
  }

  while (i < t.length) {
    const m = opts?.plainDialogue
      ? tryOs() ?? trySingleOs()
      : tryOs() ?? trySingleOs() ?? tryCorner() ?? tryCurve() ?? tryAscii()
    if (m) {
      emitPlain(plainStart, i)
      out.push(m.node)
      i = m.end
      plainStart = i
      continue
    }
    i += 1
  }
  emitPlain(plainStart, t.length)
  return out
}

function lookupTranslation(
  translations: PlotDialogueTranslation[] | undefined,
  index: number,
  sourceText: string,
): string | undefined {
  if (!translations?.length) return undefined
  const src = normalizeDialogueKey(sourceText)
  if (!src) return undefined

  // 必须优先按原文匹配；按序号会在「部分句无译 / 过滤空译」后严重错位
  const bySource = translations.find((t) => normalizeDialogueKey(t.source) === src)
  if (bySource?.translatedText?.trim()) {
    const tr = bySource.translatedText.trim()
    if (!isCrossContaminatedTranslation(src, tr, translations)) return tr
  }

  const byIndex = translations[index]
  if (
    byIndex &&
    normalizeDialogueKey(byIndex.source) === src &&
    byIndex.translatedText?.trim()
  ) {
    const tr = byIndex.translatedText.trim()
    if (!isCrossContaminatedTranslation(src, tr, translations)) return tr
  }
  return undefined
}

function normalizeDialogueKey(s: string): string {
  return String(s ?? '')
    .replace(/\s+/g, '')
    .replace(/[「」""''『』]/g, '')
    .trim()
}

/** 译文若几乎等于另一句对白原文，视为错挂（常见：把上一句中文对白塞进日文的 [译]） */
function isCrossContaminatedTranslation(
  source: string,
  translation: string,
  all: PlotDialogueTranslation[],
): boolean {
  const tr = normalizeDialogueKey(translation)
  const src = normalizeDialogueKey(source)
  if (!tr || tr === src) return false
  for (const row of all) {
    const other = normalizeDialogueKey(row.source)
    if (!other || other === src) continue
    if (other === tr || (tr.length >= 4 && other.includes(tr)) || (other.length >= 4 && tr.includes(other))) {
      return true
    }
  }
  return false
}

export function PlotRichParagraph({
  content,
  className,
  plainDialogue,
  dialogueTranslations,
  innerOsTranslations,
  dialogueIndexRef: externalIndexRef,
  innerOsIndexRef: externalOsIndexRef,
  onBackfillMissingTranslations,
  onRegenerateForMissingTranslation,
  backfillBusy,
}: {
  content: string
  className?: string
  /** 为 true 时不解析对白标记、不套底纹框，引号按原文显示（平行/IF 面板） */
  plainDialogue?: boolean
  /** 有译文时对白可点，上方悬浮气泡 */
  dialogueTranslations?: PlotDialogueTranslation[]
  /** 有译文时内心 OS 可点 */
  innerOsTranslations?: PlotDialogueTranslation[]
  /** 杂志分段时由父级传入以跨段连续编号 */
  dialogueIndexRef?: MutableRefObject<number>
  innerOsIndexRef?: MutableRefObject<number>
  /** 缺译气泡：补全本段缺失译文 */
  onBackfillMissingTranslations?: () => void
  /** 缺译气泡：重新生成本段 */
  onRegenerateForMissingTranslation?: () => void
  backfillBusy?: boolean
}) {
  const merged = [
    'whitespace-pre-wrap break-words',
    className,
  ]
    .filter(Boolean)
    .join(' ')
  // 正文旁白：继承 CSS 变量；对白/内心 OS 由 parsePlotRichText 内联指定
  const rootStyle = { fontFamily: 'var(--dating-font-narrative)' } as const
  const localIndexRef = useRef(0)
  const localOsIndexRef = useRef(0)
  const indexRef = externalIndexRef ?? localIndexRef
  const osIndexRef = externalOsIndexRef ?? localOsIndexRef
  const [bubble, setBubble] = useState<{
    kind: 'dialogue' | 'os'
    index: number
    text: string
    anchor: HTMLElement
  } | null>(null)

  const onDialogueClick = useCallback(
    (index: number, sourceText: string, el: HTMLElement) => {
      const tr =
        lookupTranslation(dialogueTranslations, index, sourceText) ||
        dialogueTranslations?.[index]?.translatedText?.trim() ||
        MISSING_PLOT_TRANSLATION_HINT
      setBubble((prev) =>
        prev && prev.kind === 'dialogue' && prev.index === index
          ? null
          : { kind: 'dialogue', index, text: tr, anchor: el },
      )
    },
    [dialogueTranslations],
  )

  const onInnerOsClick = useCallback(
    (index: number, sourceText: string, el: HTMLElement) => {
      const tr =
        lookupTranslation(innerOsTranslations, index, sourceText) ||
        innerOsTranslations?.[index]?.translatedText?.trim() ||
        MISSING_PLOT_TRANSLATION_HINT
      setBubble((prev) =>
        prev && prev.kind === 'os' && prev.index === index
          ? null
          : { kind: 'os', index, text: tr, anchor: el },
      )
    },
    [innerOsTranslations],
  )

  if (!externalIndexRef) localIndexRef.current = 0
  if (!externalOsIndexRef) localOsIndexRef.current = 0
  // 只要落库过译文数组（含部分空译），整段可点，便于点开缺译句并补译
  const enableDialogueClick = Boolean(dialogueTranslations?.length)
  const enableOsClick = Boolean(innerOsTranslations?.length)

  return (
    <>
      <span className={merged} style={rootStyle}>
        {parsePlotRichText(content, 0, {
          plainDialogue,
          onDialogueClick: enableDialogueClick ? onDialogueClick : undefined,
          dialogueIndexRef: enableDialogueClick ? indexRef : undefined,
          onInnerOsClick: enableOsClick ? onInnerOsClick : undefined,
          innerOsIndexRef: enableOsClick ? osIndexRef : undefined,
        })}
      </span>
      {bubble ? (
        <DatingDialogueTranslationBubble
          text={bubble.text}
          anchor={bubble.anchor}
          onClose={() => setBubble(null)}
          onBackfillMissing={
            bubble.text.trim().startsWith(MISSING_PLOT_TRANSLATION_HINT) &&
            onBackfillMissingTranslations
              ? () => {
                  setBubble(null)
                  onBackfillMissingTranslations()
                }
              : undefined
          }
          onRegeneratePlot={
            bubble.text.trim().startsWith(MISSING_PLOT_TRANSLATION_HINT)
              ? onRegenerateForMissingTranslation
              : undefined
          }
          backfillBusy={backfillBusy}
        />
      ) : null}
    </>
  )
}
