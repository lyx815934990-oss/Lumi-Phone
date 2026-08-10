import { useEffect, useRef } from 'react'
import { finishBootOverlay, markBootProgress } from '../boot/lumiBootBridge'
import {
  isMobileBootClient,
  preloadNonJubenshaResources,
} from '../boot/warmShellCache'

type BootResourceGateProps = {
  /** false 时立刻关掉 HTML 加载层（如 OAuth 跳过开屏） */
  enabled: boolean
  onReady: () => void
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

/**
 * 接管 index.html 里的 #lumi-boot。
 * 先 onReady 再淡出加载层，避免出现「加载完 → 白屏空窗」。
 */
export function BootResourceGate({ enabled, onReady }: BootResourceGateProps) {
  const onReadyRef = useRef(onReady)
  onReadyRef.current = onReady
  const sealedRef = useRef(false)

  useEffect(() => {
    if (!enabled) {
      if (!sealedRef.current) {
        sealedRef.current = true
        onReadyRef.current()
        finishBootOverlay()
      }
      return
    }

    let cancelled = false
    const mobile = isMobileBootClient()

    const sealReady = () => {
      // 不看 cancelled：StrictMode 清理不能吞掉唯一一次进桌面
      if (sealedRef.current) return
      sealedRef.current = true
      markBootProgress(100, '准备就绪')
      // 先进入桌面，再拆加载层，底下已有内容就不会白
      try {
        onReadyRef.current()
      } catch (err) {
        console.error('[Lumi] boot onReady failed', err)
      }
      finishBootOverlay()
    }

    const onBootTimeout = () => {
      sealReady()
    }
    window.addEventListener('lumi-boot-timeout', onBootTimeout)

    const run = async () => {
      try {
        markBootProgress(78, '核心模块就绪…')

        if (mobile) {
          markBootProgress(96, '即将进入…')
          sealReady()
          return
        }

        await Promise.race([
          typeof document !== 'undefined' && document.fonts?.ready
            ? document.fonts.ready.catch(() => undefined)
            : Promise.resolve(),
          sleep(600),
        ])
        if (cancelled || sealedRef.current) return

        markBootProgress(82, '正在准备应用资源…')
        await Promise.race([
          preloadNonJubenshaResources((p) => {
            if (sealedRef.current) return
            const pct = 82 + Math.round(p.ratio * 13)
            markBootProgress(Math.min(pct, 95), p.label)
          }),
          sleep(16_000),
        ])
        if (sealedRef.current) return

        markBootProgress(98, '即将进入…')
        sealReady()
      } catch (err) {
        console.warn('[Lumi] boot gate failed, force enter', err)
        sealReady()
      }
    }

    void run()
    return () => {
      cancelled = true
      window.removeEventListener('lumi-boot-timeout', onBootTimeout)
    }
  }, [enabled])

  return null
}
