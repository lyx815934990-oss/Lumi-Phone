import { useCallback, useEffect, useLayoutEffect, useRef, type RefObject } from 'react'

import { computeWeChatStyleKeyboardInset, measureComposerOverlapPx } from './keyboardInset'

type ComposerKeyboardInsetOptions = {
  /** 键盘弹起时，在 scrollPaddingAnchor 之上追加 inset */
  scrollPaddingAnchor?: string
  /** @deprecated 用 scrollPaddingAnchor */
  scrollPaddingBasePx?: number
  /** 键盘关闭时输入栏 padding-bottom（须含 safe-area） */
  inputBarSafePadding?: string
  /** 键盘弹起时输入栏 padding-bottom */
  inputBarActivePadding?: string
}

/**
 * 聊天室底栏软键盘抬升（与 Lumi-Phone 仓库一致：max(vv缺口, overlap)）。
 */
export function useComposerKeyboardInset(
  scrollRef: RefObject<HTMLElement | null>,
  inputBarRef: RefObject<HTMLElement | null>,
  fillRef?: RefObject<HTMLElement | null>,
  options?: ComposerKeyboardInsetOptions,
) {
  const keyboardInsetRef = useRef(0)
  const keyboardBaselineRef = useRef({ current: 0 })
  const scrollPaddingAnchor =
    options?.scrollPaddingAnchor ??
    (options?.scrollPaddingBasePx ? `${options.scrollPaddingBasePx}px` : '0px')
  const inputBarSafePadding =
    options?.inputBarSafePadding ?? 'max(12px, env(safe-area-inset-bottom, 0px))'
  const inputBarActivePadding = options?.inputBarActivePadding ?? '12px'

  const applyComposerInsetDom = useCallback(
    (insetPx: number) => {
      const scroll = scrollRef.current
      const bar = inputBarRef.current
      const fill = fillRef?.current

      if (scroll) {
        if (insetPx > 0) {
          scroll.style.paddingBottom = `calc(${scrollPaddingAnchor} + ${insetPx}px)`
        } else {
          scroll.style.paddingBottom = ''
        }
      }
      if (bar) {
        bar.style.transition = 'none'
        if (insetPx > 0) {
          bar.style.transform = `translate3d(0, -${insetPx}px, 0)`
          bar.style.willChange = 'transform'
          bar.style.paddingBottom = inputBarActivePadding
        } else {
          bar.style.transform = ''
          bar.style.willChange = ''
          bar.style.paddingBottom = inputBarSafePadding
        }
      }
      if (fill) {
        if (insetPx > 0 && bar) {
          const bg = window.getComputedStyle(bar).backgroundColor
          fill.style.display = 'block'
          fill.style.height = `${insetPx}px`
          fill.style.backgroundColor = bg || 'transparent'
        } else {
          fill.style.display = 'none'
          fill.style.height = '0px'
          fill.style.backgroundColor = ''
        }
      }
    },
    [scrollRef, inputBarRef, fillRef, scrollPaddingAnchor, inputBarSafePadding, inputBarActivePadding],
  )

  const syncComposerInsetFromRefs = useCallback(() => {
    applyComposerInsetDom(keyboardInsetRef.current)
  }, [applyComposerInsetDom])

  useLayoutEffect(() => {
    syncComposerInsetFromRefs()
  })

  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return

    const nav = navigator as Navigator & {
      virtualKeyboard?: {
        addEventListener?: (type: 'geometrychange', listener: () => void) => void
        removeEventListener?: (type: 'geometrychange', listener: () => void) => void
      }
    }
    const virtualKeyboard = nav.virtualKeyboard

    let rafId: number | null = null

    const measureAndCommit = () => {
      rafId = null
      const fromVv = computeWeChatStyleKeyboardInset(keyboardBaselineRef.current)
      const overlap = measureComposerOverlapPx(inputBarRef.current)
      const inset = Math.max(0, Math.round(Math.max(fromVv, overlap)))
      const prevInset = keyboardInsetRef.current
      const insetStable = Math.abs(prevInset - inset) < 4
      if (insetStable && !(prevInset <= 0 && inset > 0)) return
      keyboardInsetRef.current = inset
      syncComposerInsetFromRefs()
    }

    const scheduleMeasure = () => {
      if (rafId != null) return
      rafId = window.requestAnimationFrame(measureAndCommit)
    }

    measureAndCommit()
    vv.addEventListener('resize', scheduleMeasure)
    vv.addEventListener('scroll', scheduleMeasure)
    virtualKeyboard?.addEventListener?.('geometrychange', scheduleMeasure)
    window.addEventListener('orientationchange', scheduleMeasure)

    return () => {
      if (rafId != null) window.cancelAnimationFrame(rafId)
      vv.removeEventListener('resize', scheduleMeasure)
      vv.removeEventListener('scroll', scheduleMeasure)
      virtualKeyboard?.removeEventListener?.('geometrychange', scheduleMeasure)
      window.removeEventListener('orientationchange', scheduleMeasure)
    }
  }, [inputBarRef, syncComposerInsetFromRefs])

  return { syncComposerInsetFromRefs, keyboardInsetRef }
}
