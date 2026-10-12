/**
 * 全局挂载：经期自动关心调度（不依赖情侣空间 / 经期页打开）
 */

import { useEffect, useRef } from 'react'

import { useCurrentApiConfig } from '../../api/ApiSettingsContext'
import { runDuePeriodAutoCareJobs } from './couplePeriodAutoCare'

const POLL_MS = 45_000

export function CouplePeriodAutoCareRunner({ enabled = true }: { enabled?: boolean }) {
  const apiConfig = useCurrentApiConfig('chatCard')
  const busyRef = useRef(false)

  useEffect(() => {
    if (!enabled) return

    let cancelled = false

    const tick = () => {
      if (cancelled || busyRef.current) return
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
      busyRef.current = true
      void runDuePeriodAutoCareJobs({
        apiConfig:
          apiConfig?.apiUrl?.trim() && apiConfig?.apiKey?.trim() ? apiConfig : null,
      })
        .catch(() => {
          /* ignore */
        })
        .finally(() => {
          busyRef.current = false
        })
    }

    // 首屏稍晚一点，避开启动高峰；之后定时 + 回前台 / 上线补扫
    const boot = window.setTimeout(tick, 2500)
    const interval = window.setInterval(tick, POLL_MS)

    const onVisible = () => {
      if (document.visibilityState === 'visible') tick()
    }
    const onOnline = () => tick()
    const onFocus = () => tick()

    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('online', onOnline)
    window.addEventListener('focus', onFocus)

    return () => {
      cancelled = true
      window.clearTimeout(boot)
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('online', onOnline)
      window.removeEventListener('focus', onFocus)
    }
  }, [enabled, apiConfig])

  return null
}
