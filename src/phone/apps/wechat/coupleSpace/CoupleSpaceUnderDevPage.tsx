import { ChevronLeft, Construction, Heart } from 'lucide-react'

import './coupleSpaceTheme.css'

/** 情侣空间未开放玩法 · 开发中占位（贴合空间樱粉奶油视觉） */
export function CoupleSpaceUnderDevPage({
  title,
  hint,
  onBack,
}: {
  title: string
  hint?: string
  onBack: () => void
}) {
  return (
    <div className="couple-space-root relative">
      <header className="couple-space-header" style={{ paddingLeft: 18, paddingRight: 18 }}>
        <button
          type="button"
          onClick={onBack}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-[#FBEFEA] active:opacity-80"
          aria-label="返回"
        >
          <ChevronLeft className="h-[19px] w-[19px] text-[#4A3A35]" strokeWidth={1.75} />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="couple-space-title truncate text-[16px] text-[#4A3A35]">{title}</h1>
          <p className="truncate text-[11px] text-[#B99A8E]">情侣空间 · 开发中</p>
        </div>
        <span className="h-9 w-9 shrink-0" aria-hidden />
      </header>

      <main className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 py-10">
        <div className="cs-under-dev-card w-full max-w-[300px] px-6 py-9 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#FBEFEA] text-[#D9A9A0]">
            <Construction className="size-7" strokeWidth={1.5} aria-hidden />
          </div>
          <div className="mt-4 flex items-center justify-center gap-1.5 text-[#C9A99C]">
            <Heart className="size-3.5" strokeWidth={1.5} aria-hidden />
            <span className="text-[11px] tracking-[0.14em]">COMING SOON</span>
          </div>
          <p className="mt-4 text-[17px] font-semibold tracking-[0.04em] text-[#4A3A35]">功能开发中</p>
          {hint?.trim() ? (
            <p className="mt-2 text-[14px] leading-relaxed text-[#B99A8E]">{hint.trim()}</p>
          ) : (
            <p className="mt-2 text-[14px] leading-relaxed text-[#B99A8E]">
              这一块玩法还在打磨，完成后会在此接入。
            </p>
          )}
          <p className="mt-4 text-[13px] tracking-[0.12em] text-[#C9A99C]/80">敬请期待</p>
        </div>
      </main>
    </div>
  )
}
