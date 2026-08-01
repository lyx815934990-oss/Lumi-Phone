import { useEffect } from 'react'
import { finishBootOverlay, markBootProgress } from '../boot/lumiBootBridge'

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
 * 接管 index.html 里的 #lumi-boot：等字体/短暂稳定后收起进度条，再进入开屏动画。
 */
export function BootResourceGate({ enabled, onReady }: BootResourceGateProps) {
  useEffect(() => {
    if (!enabled) {
      finishBootOverlay(() => onReady())
      return
    }

    let cancelled = false

    const run = async () => {
      markBootProgress(84, '界面准备中…')

      await Promise.race([
        typeof document !== 'undefined' && document.fonts?.ready
          ? document.fonts.ready.catch(() => undefined)
          : Promise.resolve(),
        sleep(1400),
      ])
      if (cancelled) return

      markBootProgress(94, '即将进入…')
      await sleep(220)
      if (cancelled) return

      markBootProgress(100, '准备就绪')
      await sleep(160)
      if (cancelled) return

      finishBootOverlay(() => {
        if (!cancelled) onReady()
      })
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [enabled, onReady])

  return null
}
