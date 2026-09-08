import { ArrowLeft, Construction, Home } from 'lucide-react'

import { HOME_BUILD, HOME_BUILD_FONT } from './theme'

export type HomeBuildUnderDevProps = {
  onBack: () => void
  className?: string
}

/** 3D家园 · 开发中占位（保留返回发现页） */
export function HomeBuildUnderDev({ onBack, className = '' }: HomeBuildUnderDevProps) {
  return (
    <div
      className={`relative flex h-full min-h-0 flex-col ${className}`}
      style={{ backgroundColor: HOME_BUILD.paper, fontFamily: HOME_BUILD_FONT }}
      data-phone-page="app"
      data-app-id="homeBuild"
    >
      <header
        className="shrink-0 border-b backdrop-blur-sm"
        style={{
          borderColor: HOME_BUILD.hairline,
          backgroundColor: 'rgba(252,252,252,0.95)',
          paddingTop: 'max(0px, env(safe-area-inset-top, 0px))',
        }}
      >
        <div className="relative flex min-h-[52px] items-center justify-center px-12">
          <button
            type="button"
            onClick={onBack}
            className="absolute left-3 flex size-9 items-center justify-center rounded-full text-[#1C1C1E]/70 transition-colors hover:bg-black/[0.04]"
            aria-label="返回发现"
          >
            <ArrowLeft className="size-5" strokeWidth={1.5} />
          </button>
          <div className="pointer-events-none w-full text-center">
            <h1 className="text-[17px] font-semibold tracking-[0.02em] text-[#1C1C1E]">3D家园</h1>
            <p className="mt-0.5 text-[10px] tracking-[0.18em] text-[#9CA3AF]">Home Build · Under Construction</p>
          </div>
        </div>
      </header>

      <main className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 py-10">
        <div
          className="w-full max-w-[320px] rounded-2xl border px-6 py-10 text-center"
          style={{
            borderColor: HOME_BUILD.hairline,
            backgroundColor: HOME_BUILD.card,
            boxShadow: '0 8px 32px -12px rgba(28,28,30,0.08)',
          }}
        >
          <div
            className="mx-auto flex h-14 w-14 items-center justify-center rounded-full"
            style={{ backgroundColor: HOME_BUILD.blueprintSoft, color: HOME_BUILD.blueprint }}
          >
            <Construction className="size-7" strokeWidth={1.5} aria-hidden />
          </div>
          <div className="mt-4 flex items-center justify-center gap-1.5 text-[#9CA3AF]">
            <Home className="size-3.5" strokeWidth={1.5} aria-hidden />
            <span className="text-[11px] tracking-[0.14em]">COMING SOON</span>
          </div>
          <p className="mt-4 text-[17px] font-semibold tracking-[0.04em] text-[#1C1C1E]">功能开发中</p>
          <p className="mt-2 text-[14px] leading-relaxed text-[#9CA3AF]">
            户型编辑、家具摆放与室内漫游仍在打磨，完成后将在此接入。
          </p>
          <p className="mt-4 text-[13px] tracking-[0.12em] text-[#9CA3AF]/80">敬请期待</p>
        </div>
      </main>
    </div>
  )
}
