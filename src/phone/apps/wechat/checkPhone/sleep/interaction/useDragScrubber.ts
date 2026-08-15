import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { clamp, clientXToLocalX } from './timeMap'
import { sleepHaptic } from './haptics'

export type ScrubberHandlers = {
  /** 短按（未达长按阈值） */
  onTap?: (ratio: number, localX: number) => void
  /** 长按扫描开始 */
  onScrubStart?: (ratio: number, localX: number) => void
  /** 扫描移动（已平滑） */
  onScrubMove?: (ratio: number, localX: number) => void
  /** 扫描结束（松手） */
  onScrubEnd?: () => void
}

export type UseDragScrubberOptions = ScrubberHandlers & {
  /** 长按阈值 ms，默认 360 */
  longPressMs?: number
  /** 是否启用长按扫描，默认 true */
  enableScrub?: boolean
  /** 禁用时不响应 */
  disabled?: boolean
}

/**
 * 通用拖动扫描 Hook：区分点击 / 长按拖动，兼容 touch + mouse。
 * 返回绑定到交互区域的 props，以及当前 scrub 状态。
 *
 * 后续步数曲线、心情时间轴等可直接复用。
 */
export function useDragScrubber(options: UseDragScrubberOptions) {
  const {
    longPressMs = 360,
    enableScrub = true,
    disabled = false,
    onTap,
    onScrubStart,
    onScrubMove,
    onScrubEnd,
  } = options

  const [scrubbing, setScrubbing] = useState(false)
  const [ratio, setRatio] = useState<number | null>(null)

  const elRef = useRef<HTMLElement | null>(null)
  const longTimerRef = useRef<number | null>(null)
  const scrubbingRef = useRef(false)
  const pointerIdRef = useRef<number | null>(null)
  const startXRef = useRef(0)
  const movedRef = useRef(false)
  const rafRef = useRef<number | null>(null)
  const pendingRatioRef = useRef<number | null>(null)
  const handlersRef = useRef({ onTap, onScrubStart, onScrubMove, onScrubEnd })
  handlersRef.current = { onTap, onScrubStart, onScrubMove, onScrubEnd }

  const clearLongTimer = () => {
    if (longTimerRef.current != null) {
      window.clearTimeout(longTimerRef.current)
      longTimerRef.current = null
    }
  }

  const flushRatio = useCallback(() => {
    rafRef.current = null
    const r = pendingRatioRef.current
    if (r == null) return
    setRatio(r)
    const el = elRef.current
    const localX = el ? r * el.getBoundingClientRect().width : 0
    handlersRef.current.onScrubMove?.(r, localX)
  }, [])

  const scheduleRatio = useCallback(
    (r: number) => {
      pendingRatioRef.current = clamp(r, 0, 1)
      if (rafRef.current == null) {
        rafRef.current = requestAnimationFrame(flushRatio)
      }
    },
    [flushRatio],
  )

  const ratioFromClientX = (clientX: number) => {
    const el = elRef.current
    if (!el) return 0
    const w = el.getBoundingClientRect().width || 1
    return clamp(clientXToLocalX(clientX, el) / w, 0, 1)
  }

  const endScrub = useCallback(() => {
    clearLongTimer()
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    const wasScrubbing = scrubbingRef.current
    scrubbingRef.current = false
    pointerIdRef.current = null
    setScrubbing(false)
    if (wasScrubbing) {
      handlersRef.current.onScrubEnd?.()
      setRatio(null)
      pendingRatioRef.current = null
    }
  }, [])

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLElement>) => {
      if (disabled) return
      if (e.pointerType === 'mouse' && e.button !== 0) return
      const el = e.currentTarget
      elRef.current = el
      try {
        el.setPointerCapture(e.pointerId)
      } catch {
        // ignore
      }
      pointerIdRef.current = e.pointerId
      startXRef.current = e.clientX
      movedRef.current = false
      scrubbingRef.current = false
      clearLongTimer()

      const r0 = ratioFromClientX(e.clientX)

      if (enableScrub) {
        longTimerRef.current = window.setTimeout(() => {
          scrubbingRef.current = true
          setScrubbing(true)
          sleepHaptic(14)
          scheduleRatio(r0)
          const localX = el.getBoundingClientRect().width * r0
          handlersRef.current.onScrubStart?.(r0, localX)
        }, longPressMs)
      }
    },
    [disabled, enableScrub, longPressMs, scheduleRatio],
  )

  const onPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLElement>) => {
      if (pointerIdRef.current !== e.pointerId) return
      if (Math.abs(e.clientX - startXRef.current) > 8) movedRef.current = true
      if (!scrubbingRef.current) {
        if (movedRef.current && Math.abs(e.clientX - startXRef.current) > 12) {
          clearLongTimer()
        }
        return
      }
      e.preventDefault()
      scheduleRatio(ratioFromClientX(e.clientX))
    },
    [scheduleRatio],
  )

  const onPointerUp = useCallback(
    (e: ReactPointerEvent<HTMLElement>) => {
      if (pointerIdRef.current !== e.pointerId) return
      const wasScrubbing = scrubbingRef.current
      clearLongTimer()

      if (!wasScrubbing && !movedRef.current) {
        const r = ratioFromClientX(e.clientX)
        sleepHaptic(10)
        handlersRef.current.onTap?.(r, (elRef.current?.getBoundingClientRect().width ?? 0) * r)
      }

      try {
        e.currentTarget.releasePointerCapture(e.pointerId)
      } catch {
        // ignore
      }
      endScrub()
    },
    [endScrub],
  )

  const onPointerCancel = useCallback(
    (e: ReactPointerEvent<HTMLElement>) => {
      if (pointerIdRef.current !== e.pointerId) return
      endScrub()
    },
    [endScrub],
  )

  useEffect(() => {
    return () => {
      clearLongTimer()
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  const bind = {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    style: { touchAction: 'none' as const },
  }

  return { scrubbing, ratio, bind, setRatio }
}
