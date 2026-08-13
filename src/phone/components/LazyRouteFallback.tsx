import { useEffect, useState } from 'react'

/** 路由级 lazy 加载占位：开屏同款进度条；不超时弹重试，避免打断未下完的 chunk */
export function LazyRouteFallback({ label = '加载中' }: { label?: string }) {
  const [pct, setPct] = useState(6)

  useEffect(() => {
    const start = Date.now()
    const id = window.setInterval(() => {
      const t = (Date.now() - start) / 1000
      // 渐进逼近 92%，真实加载完成由 Suspense 卸掉本组件
      const next = Math.min(92, Math.round(6 + 86 * (1 - Math.exp(-t / 9))))
      setPct(next)
    }, 180)
    return () => window.clearInterval(id)
  }, [label])

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col items-center justify-center bg-[#f2f2f4] px-8">
      <div className="w-[min(260px,78vw)]">
        <div
          className="h-[2px] w-full overflow-hidden rounded-full"
          style={{ background: 'rgba(28, 28, 30, 0.08)' }}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          aria-label={label}
        >
          <div
            className="h-full rounded-full transition-[width] duration-300 ease-out"
            style={{
              width: `${pct}%`,
              background: 'linear-gradient(90deg, #c5a880 0%, #d4af37 55%, #e8d5a3 100%)',
              boxShadow: '0 0 10px rgba(212, 175, 55, 0.28)',
            }}
          />
        </div>
        <div
          className="mt-3.5 flex items-center justify-between text-[11px] tracking-[0.12em]"
          style={{ color: 'rgba(28, 28, 30, 0.42)', fontFamily: '"Songti SC", "STSong", "SimSun", serif' }}
        >
          <span className="min-w-0 truncate">{label}</span>
          <span
            className="ml-3 shrink-0 tabular-nums tracking-[0.08em]"
            style={{
              color: 'rgba(28, 28, 30, 0.55)',
              fontFamily: '"SF Pro Text", "Helvetica Neue", sans-serif',
            }}
          >
            {pct}%
          </span>
        </div>
      </div>
    </div>
  )
}
