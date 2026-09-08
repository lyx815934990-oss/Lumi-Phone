import { ArrowLeft, Construction, LayoutGrid } from 'lucide-react'

export type BeadCraftUnderDevProps = {
  onBack: () => void
  className?: string
}

/** 一起拼豆 · 开发中占位（保留返回发现页） */
export function BeadCraftUnderDev({ onBack, className = '' }: BeadCraftUnderDevProps) {
  return (
    <div
      className={`relative flex h-full min-h-0 flex-col bg-[#FFF8F4] ${className}`}
      style={{ fontFamily: 'var(--phone-font)' }}
      data-phone-page="app"
      data-app-id="beadCraft"
    >
      <header
        className="shrink-0 border-b border-[#f0e4dc]/90 backdrop-blur-sm"
        style={{
          backgroundColor: 'rgba(255,248,244,0.95)',
          paddingTop: 'max(0px, env(safe-area-inset-top, 0px))',
        }}
      >
        <div className="relative flex min-h-[52px] items-center justify-center px-12">
          <button
            type="button"
            onClick={onBack}
            className="absolute left-3 flex size-9 items-center justify-center rounded-full text-[#2a2220]/70 transition-colors hover:bg-black/[0.04]"
            aria-label="返回发现"
          >
            <ArrowLeft className="size-5" strokeWidth={1.5} />
          </button>
          <div className="pointer-events-none w-full text-center">
            <h1 className="text-[17px] font-semibold tracking-[0.02em] text-[#2a2220]">一起拼豆</h1>
            <p className="mt-0.5 text-[10px] tracking-[0.18em] text-[#9a8f8a]">Bead Craft · Under Construction</p>
          </div>
        </div>
      </header>

      <main className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 py-10">
        <div className="w-full max-w-[320px] rounded-2xl border border-[#f0e4dc] bg-white/90 px-6 py-10 text-center shadow-[0_8px_32px_-12px_rgba(42,34,32,0.12)]">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#F5E6DE] text-[#B07A62]">
            <Construction className="size-7" strokeWidth={1.5} aria-hidden />
          </div>
          <div className="mt-4 flex items-center justify-center gap-1.5 text-[#9a8f8a]/80">
            <LayoutGrid className="size-3.5" strokeWidth={1.5} aria-hidden />
            <span className="text-[11px] tracking-[0.14em]">COMING SOON</span>
          </div>
          <p className="mt-4 text-[17px] font-semibold tracking-[0.04em] text-[#2a2220]">功能开发中</p>
          <p className="mt-2 text-[14px] leading-relaxed text-[#9a8f8a]">
            图样广场、双人拼豆与 3D 成品展示仍在打磨，完成后将在此接入。
          </p>
          <p className="mt-4 text-[13px] tracking-[0.12em] text-[#9a8f8a]/75">敬请期待</p>
        </div>
      </main>
    </div>
  )
}
