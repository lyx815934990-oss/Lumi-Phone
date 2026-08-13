import { useEffect, useRef } from 'react'
import { finishBootOverlay, markBootProgress } from '../boot/lumiBootBridge'
import {
  isMobileBootClient,
  preloadAllNonJubenshaBootResources,
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
 * 开屏阶段尽量拉齐非剧本杀 App / 发现页资源后再进桌面。
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
      // 若开屏被总超时打断，进桌面后再补一轮
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

        markBootProgress(82, mobile ? '正在准备微信与常用应用…' : '正在准备全部应用资源…')
        await Promise.race([
          preloadAllNonJubenshaBootResources((p) => {
            if (sealedRef.current) return
            // 82% → 98% 跟真实任务进度
            const pct = 82 + Math.round(p.ratio * 16)
            markBootProgress(Math.min(pct, 98), p.label)
          }),
          // 给足弱网时间；真超时再进桌面，剩余由后台补暖
          sleep(300_000),
        ])
        if (sealedRef.current) return

        markBootProgress(99, '即将进入…')
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
