import { useEffect, useRef } from 'react'
import { finishBootOverlay, markBootProgress } from '../boot/lumiBootBridge'
import {
  isMobileBootClient,
  preloadCriticalBootResources,
  scheduleBackgroundAppWarm,
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
 * 只等 critical chunk（微信/账号/外观/API）后进桌面；其余 idle 后台预热。
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
        scheduleBackgroundAppWarm()
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
      try {
        onReadyRef.current()
      } catch (err) {
        console.error('[Lumi] boot onReady failed', err)
      }
      finishBootOverlay()
      // 进桌面后再暖其余 App，不挡首屏
      scheduleBackgroundAppWarm()
    }

    const onBootTimeout = () => {
      sealReady()
    }
    window.addEventListener('lumi-boot-timeout', onBootTimeout)

    const run = async () => {
      try {
        markBootProgress(78, '核心模块就绪…')

        // 字体最多等 400ms，不等 Google Fonts 拖死开屏
        await Promise.race([
          typeof document !== 'undefined' && document.fonts?.ready
            ? document.fonts.ready.catch(() => undefined)
            : Promise.resolve(),
          sleep(400),
        ])
        if (cancelled || sealedRef.current) return

        markBootProgress(84, mobile ? '正在准备常用应用…' : '正在准备核心应用…')
        await Promise.race([
          preloadCriticalBootResources((p) => {
            if (sealedRef.current) return
            const pct = 84 + Math.round(p.ratio * 12)
            markBootProgress(Math.min(pct, 96), p.label)
          }),
          sleep(mobile ? 7_500 : 9_500),
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
