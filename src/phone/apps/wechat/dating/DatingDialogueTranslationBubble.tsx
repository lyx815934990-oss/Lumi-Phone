import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

/** 与 plotRichText 缺译提示同源，用于识别缺译气泡 */
export const MISSING_PLOT_TRANSLATION_HINT = '未找到该句译文'

type Props = {
  text: string
  anchor: HTMLElement | null
  onClose: () => void
  /** 缺译时：补全本段缺失译文 */
  onBackfillMissing?: () => void
  /** 缺译时：整段重新生成（通常仅末条 AI） */
  onRegeneratePlot?: () => void
  backfillBusy?: boolean
}

/** 锚点对白上方的悬浮译文气泡（须高于平行/IF 等 z-[1280] 弹层） */
export function DatingDialogueTranslationBubble({
  text,
  anchor,
  onClose,
  onBackfillMissing,
  onRegeneratePlot,
  backfillBusy = false,
}: Props) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [pos, setPos] = useState<{
    left: number
    top: number
    width: number
    preferAbove: boolean
  } | null>(null)

  const isMissing = text.trim().startsWith(MISSING_PLOT_TRANSLATION_HINT)
  const hasActions = isMissing && Boolean(onBackfillMissing || onRegeneratePlot)

  useLayoutEffect(() => {
    if (!anchor) {
      setPos(null)
      return
    }
    const place = () => {
      const r = anchor.getBoundingClientRect()
      const width = Math.min(Math.min(360, window.innerWidth - 24), Math.max(200, r.width + 48))
      const left = Math.max(8, Math.min(r.left + r.width / 2 - width / 2, window.innerWidth - width - 8))
      // 尽量贴在锚点上方；若顶边不够则改到下方，避免被视口裁切
      const preferAbove = r.top > 72
      const top = preferAbove ? Math.max(8, r.top - 8) : Math.min(window.innerHeight - 8, r.bottom + 8)
      setPos({ left, top, width, preferAbove })
    }
    place()
    window.addEventListener('scroll', place, true)
    window.addEventListener('resize', place)
    return () => {
      window.removeEventListener('scroll', place, true)
      window.removeEventListener('resize', place)
    }
  }, [anchor, text, hasActions])

  useEffect(() => {
    // 延后挂载「点外侧关闭」，避免与打开浮窗的同一次点击打架
    let remove: (() => void) | undefined
    const timer = window.setTimeout(() => {
      const onDoc = (e: MouseEvent) => {
        const t = e.target as Node
        if (ref.current?.contains(t) || anchor?.contains(t)) return
        onClose()
      }
      document.addEventListener('pointerdown', onDoc, true)
      remove = () => document.removeEventListener('pointerdown', onDoc, true)
    }, 0)
    return () => {
      window.clearTimeout(timer)
      remove?.()
    }
  }, [anchor, onClose])

  if (!pos || !text.trim()) return null

  return createPortal(
    <div
      ref={ref}
      role="dialog"
      aria-label="对白译文"
      className="pointer-events-auto fixed z-[1400] max-h-[min(42vh,280px)] overflow-y-auto overscroll-contain rounded-xl border border-stone-200/90 bg-[#f5f5f7]/97 px-3 py-2 text-[13px] leading-relaxed text-[#3f3a33] shadow-[0_8px_28px_rgba(0,0,0,0.12)] backdrop-blur-sm"
      style={{
        left: pos.left,
        top: pos.top,
        width: pos.width,
        transform: pos.preferAbove ? 'translateY(-100%)' : 'translateY(0)',
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation()
        if (!hasActions) onClose()
      }}
    >
      {isMissing ? (
        <div className="space-y-2">
          <p className="text-[13px] leading-relaxed text-stone-600">
            未找到该句译文。可能是生成时未写入、翻译接口失败，或正文改过后原文对不上。
          </p>
          {hasActions ? (
            <div className="flex flex-wrap gap-1.5">
              {onBackfillMissing ? (
                <button
                  type="button"
                  disabled={backfillBusy}
                  className="rounded-lg bg-stone-900 px-2.5 py-1 text-[12px] font-medium text-white disabled:opacity-50"
                  onClick={(e) => {
                    e.stopPropagation()
                    onBackfillMissing()
                  }}
                >
                  {backfillBusy ? '补译中…' : '补全缺失译文'}
                </button>
              ) : null}
              {onRegeneratePlot ? (
                <button
                  type="button"
                  disabled={backfillBusy}
                  className="rounded-lg border border-stone-300 bg-white px-2.5 py-1 text-[12px] font-medium text-stone-700 disabled:opacity-50"
                  onClick={(e) => {
                    e.stopPropagation()
                    onClose()
                    onRegeneratePlot()
                  }}
                >
                  重新生成本段
                </button>
              ) : null}
            </div>
          ) : (
            <p className="text-[11px] leading-snug text-stone-400">
              可长按本段剧情 →「重新回复」，或在语言设置中确认已开启同步翻译后再补译。
            </p>
          )}
        </div>
      ) : (
        text
      )}
      {pos.preferAbove ? (
        <span
          className="absolute left-1/2 top-full h-0 w-0 -translate-x-1/2 border-x-[6px] border-t-[7px] border-x-transparent border-t-[#f5f5f7]/97"
          aria-hidden
        />
      ) : (
        <span
          className="absolute bottom-full left-1/2 h-0 w-0 -translate-x-1/2 border-x-[6px] border-b-[7px] border-x-transparent border-b-[#f5f5f7]/97"
          aria-hidden
        />
      )}
    </div>,
    document.body,
  )
}
