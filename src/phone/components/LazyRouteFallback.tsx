/** 路由级 lazy 加载占位：只表示「还在下」，不超时弹出重试（避免打断未完成的 chunk） */
export function LazyRouteFallback({ label = '加载中' }: { label?: string }) {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col items-center justify-center bg-[#f2f2f4] text-[13px] text-black/35">
      <div className="mb-3 size-8 animate-pulse rounded-full bg-black/8" aria-hidden />
      <span>{label}</span>
    </div>
  )
}
