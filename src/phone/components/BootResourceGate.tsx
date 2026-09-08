import { useEffect, useRef } from 'react'
import { finishBootOverlay, markBootProgress } from '../boot/lumiBootBridge'
import {
  isMobileBootClient,
  preloadAllNonJubenshaBootResources,
  scheduleBackgroundAppWarm,
} from '../boot/warmShellCache'
import { isQixiEnvelopeEventDay } from '../apps/qixi/qixiEnvelopeStorage'
import { ensureQixiLetterFontLoaded, warmQixiLetterFont } from '../apps/qixi/qixiFont'

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
    let stuckWatch = 0

    const sealReady = () => {
      // 不看 cancelled：StrictMode 清理不能吞掉唯一一次进桌面
      if (sealedRef.current) return
      sealedRef.current = true
      if (stuckWatch) {
        window.clearInterval(stuckWatch)
        stuckWatch = 0
      }
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
        // 须高于 main.tsx 的 82，否则 Math.max 进度条看起来一直不动
        markBootProgress(84, '核心模块就绪…')

        // 七夕当天：一进开屏就开下信纸字库（约 7MB），与后续预热并行
        const qixiDay = isQixiEnvelopeEventDay()
        if (qixiDay) {
          warmQixiLetterFont()
          markBootProgress(85, '正在准备七夕信纸…')
        }

        // 系统字体最多等 400ms；七夕手写体另算
        await Promise.race([
          typeof document !== 'undefined' && document.fonts?.ready
            ? document.fonts.ready.catch(() => undefined)
            : Promise.resolve(),
          sleep(400),
        ])
        if (cancelled || sealedRef.current) return

        markBootProgress(86, mobile ? '正在准备微信与常用应用…' : '正在准备全部应用资源…')

        let lastProgressAt = Date.now()
        let lastRatio = 0
        stuckWatch = window.setInterval(() => {
          if (sealedRef.current) return
          // 预加载长时间无进展：先提示，再强制进桌面（后台继续暖包）
          if (Date.now() - lastProgressAt < 18_000) return
          markBootProgress(96, '资源较慢，先进入桌面…')
          sealReady()
        }, 2500)

        const bootWarm = preloadAllNonJubenshaBootResources((p) => {
          if (sealedRef.current) return
          if (p.ratio > lastRatio + 0.01 || (p.label && p.ratio !== lastRatio)) {
            lastProgressAt = Date.now()
            lastRatio = p.ratio
          }
          const pct = 86 + Math.round(p.ratio * 12)
          markBootProgress(Math.min(pct, 98), p.label || '正在准备应用资源…')
        })
        // 七夕日额外等信纸（最多约 50s），尽量进信封前就就绪
        if (qixiDay) {
          void ensureQixiLetterFontLoaded()
        }
        await Promise.race([
          bootWarm,
          // 手机上别干等近两分钟；超时后进桌面，剩余 chunk 后台继续
          sleep(mobile ? 55_000 : 75_000),
        ])
        if (stuckWatch) {
          window.clearInterval(stuckWatch)
          stuckWatch = 0
        }
        if (sealedRef.current) return

        if (qixiDay && !cancelled) {
          markBootProgress(98, '正在铺开七夕信纸…')
          await Promise.race([ensureQixiLetterFontLoaded(), sleep(mobile ? 20_000 : 18_000)])
        }
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
      if (stuckWatch) {
        window.clearInterval(stuckWatch)
        stuckWatch = 0
      }
      window.removeEventListener('lumi-boot-timeout', onBootTimeout)
    }
  }, [enabled])

  return null
}
