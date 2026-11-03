import { ArrowLeft, Construction, Languages } from 'lucide-react'
import { LS } from './langStudyTheme'

export type LangStudyUnderDevProps = {
  onBack: () => void
  className?: string
}

/** 外语 · 开发中占位（保留返回桌面） */
export function LangStudyUnderDev({ onBack, className = '' }: LangStudyUnderDevProps) {
  return (
    <div
      className={`relative flex h-full min-h-0 flex-col ${className}`}
      style={{ fontFamily: 'var(--phone-font)', background: LS.pageBg }}
      data-phone-page="app"
      data-app-id="langStudy"
    >
      <header
        className="shrink-0 border-b backdrop-blur-sm"
        style={{
          borderColor: LS.hairline,
          backgroundColor: 'rgba(244,247,245,0.95)',
          paddingTop: 'max(0px, env(safe-area-inset-top, 0px))',
        }}
      >
        <div className="relative flex min-h-[52px] items-center justify-center px-12">
          <button
            type="button"
            onClick={onBack}
            className="absolute left-3 flex size-9 items-center justify-center rounded-full transition-colors hover:bg-black/[0.04]"
            style={{ color: `${LS.ink}B3` }}
            aria-label="返回桌面"
          >
            <ArrowLeft className="size-5" strokeWidth={1.5} />
          </button>
          <div className="pointer-events-none w-full text-center">
            <h1 className="text-[17px] font-semibold tracking-[0.02em]" style={{ color: LS.ink }}>
              外语
            </h1>
            <p
              className="mt-0.5 text-[10px] tracking-[0.18em]"
              style={{ color: LS.mist }}
            >
              Lang Study · Under Construction
            </p>
          </div>
        </div>
      </header>

      <main className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 py-10">
        <div
          className="w-full max-w-[320px] rounded-2xl border px-6 py-10 text-center shadow-[0_8px_32px_-12px_rgba(26,46,36,0.12)]"
          style={{ borderColor: LS.hairline, background: LS.card }}
        >
          <div
            className="mx-auto flex h-14 w-14 items-center justify-center rounded-full"
            style={{ background: LS.accentSoft, color: LS.accent }}
          >
            <Construction className="size-7" strokeWidth={1.5} aria-hidden />
          </div>
          <div className="mt-4 flex items-center justify-center gap-1.5" style={{ color: `${LS.mist}CC` }}>
            <Languages className="size-3.5" strokeWidth={1.5} aria-hidden />
            <span className="text-[11px] tracking-[0.14em]">COMING SOON</span>
          </div>
          <p className="mt-4 text-[17px] font-semibold tracking-[0.04em]" style={{ color: LS.ink }}>
            功能开发中
          </p>
          <p className="mt-2 text-[14px] leading-relaxed" style={{ color: LS.mist }}>
            词书、背诵与复习流程仍在打磨，完成后将在此接入。
          </p>
          <p className="mt-4 text-[13px] tracking-[0.12em]" style={{ color: `${LS.mist}BF` }}>
            敬请期待
          </p>
        </div>
      </main>
    </div>
  )
}
