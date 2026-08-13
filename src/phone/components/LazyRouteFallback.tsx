import { useEffect, useState } from 'react'

import { recoverLazyRouteSoft } from './lazyRouteRecover'

/** 路由级 lazy 加载时的轻量占位；过久未完成则给出清缓存重进，避免「打开微信…」永久卡住 */
export function LazyRouteFallback({
  label = '加载中',
  /** 毫秒；超时后展示自救按钮（默认 12s，覆盖弱网大 chunk） */
  stallMs = 12_000,
}: {
  label?: string
  stallMs?: number
}) {
  const [stalled, setStalled] = useState(false)
  const [recovering, setRecovering] = useState(false)

  useEffect(() => {
    setStalled(false)
    setRecovering(false)
    const id = window.setTimeout(() => setStalled(true), Math.max(4000, stallMs))
    return () => window.clearTimeout(id)
  }, [label, stallMs])

  const handleRecover = () => {
    setRecovering(true)
    void recoverLazyRouteSoft().catch(() => {
      setRecovering(false)
      window.location.reload()
    })
  }

  if (stalled) {
    return (
      <div className="relative flex h-full min-h-0 flex-1 flex-col items-center justify-center gap-3 bg-[#f2f2f4] px-6 text-center">
        <p className="text-[15px] font-medium text-black/75">
          {recovering ? '正在清理缓存并重新进入…' : `${label.replace(/…$/, '')}太久了`}
        </p>
        <p className="max-w-[280px] text-[12px] leading-relaxed text-black/45">
          多半是刚更新后旧缓存和新技术包对不上。请优先用 www.lumiphone.cn；点下方会清缓存并重进（不会立刻卸掉
          Service Worker，避免 iPhone 报「丢失网络连接」）。
        </p>
        <button
          type="button"
          onClick={handleRecover}
          disabled={recovering}
          className="mt-1 rounded-full bg-black/85 px-4 py-2 text-[13px] text-white disabled:opacity-50"
        >
          清理缓存并重试
        </button>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col items-center justify-center bg-[#f2f2f4] text-[13px] text-black/35">
      <div className="mb-3 size-8 animate-pulse rounded-full bg-black/8" aria-hidden />
      <span>{label}</span>
    </div>
  )
}
