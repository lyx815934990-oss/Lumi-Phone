import { ChevronRight, Globe } from 'lucide-react'
import { INK_KICKER, INK_SECTION, INK_TITLE } from './personaEditorTabs'

export function WorldBackgroundTab({
  wbCardName,
  enabled,
  onToggleEnabled,
  onOpenPicker,
  literaturePreview,
}: {
  wbCardName: string
  enabled: boolean
  onToggleEnabled: () => void
  onOpenPicker: () => void
  /** 用于沉浸阅读的设定正文摘要（可为空） */
  literaturePreview: string
}) {
  const preview = literaturePreview.trim()

  return (
    <section className={`${INK_SECTION} px-4 pb-8 pt-5`}>
      <header className="mb-6 border-b border-[#D2D0CB] pb-4">
        <p className={INK_KICKER}>09 WORLD · 叙事场域</p>
        <h2 className={INK_TITLE}>世界背景</h2>
      </header>

      <div className="mb-6 flex items-center justify-between gap-3">
        <span className="text-[12px] text-[#6A6E76]">注入 AI 上下文</span>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          onClick={onToggleEnabled}
          className={`relative h-7 w-[46px] shrink-0 rounded-full p-1 transition-colors ${enabled ? 'bg-[#1E2024]' : 'bg-[#D2D0CB]'}`}
        >
          <span
            className={`block h-5 w-5 rounded-full bg-[#F8F7F4] transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0'}`}
          />
        </button>
      </div>

      <button
        type="button"
        onClick={onOpenPicker}
        disabled={!enabled}
        className="flex w-full items-center rounded-[12px] border border-[#D2D0CB] bg-[#EDEBE7] px-4 py-4 text-left transition-colors hover:bg-[#E2E5EA] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Globe className="size-5 shrink-0 text-[#1E2024]" strokeWidth={1.5} />
        <div className="ml-3 min-w-0 flex-1">
          <p className="text-[14px] font-medium text-[#1E2024]">当前世界背景</p>
          <p className="mt-0.5 truncate text-[12px] text-[#6A6E76]">{wbCardName}</p>
        </div>
        <ChevronRight className="ml-2 size-4 shrink-0 text-[#9AA0A8]" />
      </button>

      <article
        className="mt-8 border-t border-[#D2D0CB] pt-6 text-[14px] leading-loose text-[#1E2024]"
        style={{ fontFamily: 'Georgia, "Noto Serif SC", "Songti SC", serif' }}
      >
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.24em] text-[#5A6574]">Reading Room · 设定摘录</p>
        {preview ? (
          <p className="mt-4 whitespace-pre-wrap">{preview}</p>
        ) : (
          <p className="mt-4 text-[#9AA0A8]">启用世界背景并选择卡片后，此处以衬线体呈现叙事节选。</p>
        )}
      </article>
    </section>
  )
}
